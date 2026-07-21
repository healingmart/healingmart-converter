(function (w) {
  "use strict";

  var NS = w.HM_CONVERTER_ENGINES = w.HM_CONVERTER_ENGINES || {};
  var MAX_FILE_BYTES = 30 * 1024 * 1024;

  function addStyle(d) {
    if (d.getElementById("hmEngineDocumentStyle")) return;
    var s = d.createElement("style");
    s.id = "hmEngineDocumentStyle";
    s.textContent = [
      ".hm-doc-upload{position:relative;min-height:180px;padding:28px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:9px;border:2px dashed #b9c9dc;border-radius:20px;background:linear-gradient(135deg,#fbfdff,#f5f9ff);text-align:center;cursor:pointer;transition:.16s ease}",
      ".hm-doc-upload:hover,.hm-doc-upload.is-drag{border-color:#2f7cf6;background:#f0f6ff}",
      ".hm-doc-upload-icon{width:62px;height:62px;display:grid;place-items:center;border-radius:18px;background:#eaf2ff;color:#2f7cf6;font-size:30px;font-weight:950}",
      ".hm-doc-upload strong{color:#111827;font-size:20px;font-weight:950}.hm-doc-upload p{max-width:660px;margin:0;color:#53657d;font-size:14px;font-weight:700;line-height:1.65}",
      ".hm-doc-file{display:none;margin-top:14px;padding:14px 16px;border:1px solid #dce5ef;border-radius:14px;background:#f8fbff;color:#34465f;font-size:14px;font-weight:800;word-break:break-all}",
      ".hm-doc-file.is-show{display:block}",
      ".hm-doc-result{display:none;margin-top:20px}.hm-doc-result.is-show{display:block}",
      ".hm-doc-result-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:10px}",
      ".hm-doc-result-head strong{color:#111827;font-size:19px;font-weight:950}.hm-doc-result-head span{color:#66758b;font-size:13px;font-weight:750}",
      ".hm-doc-output{width:100%;min-height:320px;padding:17px;border:1.5px solid #dbe4ef;border-radius:16px;background:#fff;color:#111827;font:600 15px/1.7 ui-monospace,SFMono-Regular,Consolas,monospace;resize:vertical;outline:none}",
      ".hm-doc-output:focus{border-color:#2f7cf6;box-shadow:0 0 0 4px rgba(47,124,246,.08)}",
      ".hm-doc-limit{margin-top:12px;padding:13px 15px;border-radius:13px;background:#fff8e9;color:#795413;font-size:13px;font-weight:750;line-height:1.65}",
      ".hm-doc-meta{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.hm-doc-meta span{padding:7px 10px;border-radius:999px;background:#eef5ff;color:#31527b;font-size:12px;font-weight:850}",
      "@media(max-width:760px){.hm-doc-upload{min-height:150px;padding:22px 13px}.hm-doc-upload strong{font-size:18px}.hm-doc-output{min-height:250px;font-size:14px}.hm-doc-result-head{align-items:flex-start;flex-direction:column;gap:4px}}"
    ].join("");
    d.head.appendChild(s);
  }

  function safeBase(name) {
    return String(name || "converted").replace(/\.[^.]+$/, "").replace(/[\\/:*?\"<>|]+/g, "-") || "converted";
  }

  function fmtBytes(n) {
    if (!isFinite(n)) return "";
    if (n < 1024) return n + " B";
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
    return (n / 1024 / 1024).toFixed(1) + " MB";
  }


  function loadScriptOnce(ctx, url, globalName, message) {
    if (w[globalName]) return Promise.resolve(w[globalName]);
    return ctx.loadScript(url).then(function () {
      if (!w[globalName]) throw new Error(message);
      return w[globalName];
    });
  }

  function ensureJSZip(ctx) {
    return loadScriptOnce(
      ctx,
      "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js",
      "JSZip",
      "문서 압축 구조를 읽는 기능을 불러오지 못했습니다."
    );
  }

  function ensureMammoth(ctx) {
    return loadScriptOnce(
      ctx,
      "https://cdn.jsdelivr.net/npm/mammoth@1.12.0/mammoth.browser.min.js",
      "mammoth",
      "DOCX 처리 기능을 불러오지 못했습니다."
    );
  }

  function parserError(doc) {
    return doc && doc.getElementsByTagName && doc.getElementsByTagName("parsererror").length > 0;
  }

  function parseXml(text) {
    var doc = new DOMParser().parseFromString(text, "application/xml");
    if (parserError(doc)) throw new Error("문서 내부 XML을 읽지 못했습니다.");
    return doc;
  }

  function localName(node) {
    return String(node && (node.localName || node.nodeName) || "").replace(/^.*:/, "");
  }

  function cleanText(text) {
    return String(text || "")
      .replace(/\r\n?/g, "\n")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function sanitizeMammothHtml(html) {
    var doc = new DOMParser().parseFromString("<body>" + String(html || "") + "</body>", "text/html");
    Array.prototype.forEach.call(doc.querySelectorAll("script,iframe,object,embed,form,link,meta[http-equiv]"), function (el) {
      el.remove();
    });
    Array.prototype.forEach.call(doc.body.querySelectorAll("*"), function (el) {
      Array.prototype.slice.call(el.attributes || []).forEach(function (a) {
        var n = String(a.name || "").toLowerCase();
        var v = String(a.value || "").trim();
        if (/^on/.test(n)) el.removeAttribute(a.name);
        if ((n === "href" || n === "src") && v) {
          var ok = /^(https?:|mailto:|tel:|#|data:image\/)/i.test(v);
          if (!ok) el.removeAttribute(a.name);
        }
      });
    });
    return doc.body.innerHTML;
  }

  async function validateZipFile(file, expected, ctx) {
    await ensureJSZip(ctx);
    var buf = await file.arrayBuffer();
    var zip;
    try {
      zip = await w.JSZip.loadAsync(buf);
    } catch (e) {
      throw new Error(expected + " 파일 구조를 확인해 주세요.");
    }
    if (expected === "DOCX" && !zip.file("word/document.xml")) throw new Error("정상적인 DOCX 파일이 아닙니다.");
    if (expected === "PPTX" && !Object.keys(zip.files).some(function (n) { return /^ppt\/slides\/slide\d+\.xml$/i.test(n); })) throw new Error("정상적인 PPTX 파일이 아닙니다.");
    if (expected === "ODT" && !zip.file("content.xml")) throw new Error("정상적인 ODT 파일이 아닙니다.");
    return { zip: zip, buffer: buf };
  }

  async function docxToText(file, ctx) {
    var checked = await validateZipFile(file, "DOCX", ctx);
    await ensureMammoth(ctx);
    var result = await w.mammoth.extractRawText({ arrayBuffer: checked.buffer });
    return {
      text: cleanText(result.value),
      warnings: result.messages ? result.messages.length : 0
    };
  }

  async function docxToHtml(file, ctx) {
    var checked = await validateZipFile(file, "DOCX", ctx);
    await ensureMammoth(ctx);
    var options = {};
    if (w.mammoth.images && w.mammoth.images.imgElement) {
      options.convertImage = w.mammoth.images.imgElement(function (image) {
        return image.read("base64").then(function (data) {
          return { src: "data:" + image.contentType + ";base64," + data };
        });
      });
    }
    var result = await w.mammoth.convertToHtml({ arrayBuffer: checked.buffer }, options);
    var body = sanitizeMammothHtml(result.value);
    var full = '<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>Converted Document</title>\n<style>body{max-width:900px;margin:40px auto;padding:0 20px;color:#111827;font:16px/1.75 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}img{max-width:100%;height:auto}table{border-collapse:collapse;max-width:100%}td,th{border:1px solid #d1d5db;padding:8px}</style>\n</head>\n<body>\n' + body + '\n</body>\n</html>\n';
    return {
      text: full,
      warnings: result.messages ? result.messages.length : 0
    };
  }

  function odtInlineText(node) {
    if (!node) return "";
    if (node.nodeType === 3 || node.nodeType === 4) return node.nodeValue || "";
    if (node.nodeType !== 1) return "";
    var ln = localName(node);
    if (ln === "tab") return "\t";
    if (ln === "line-break") return "\n";
    if (ln === "soft-page-break") return "\n";
    if (ln === "s") {
      var count = Number(node.getAttribute("text:c") || node.getAttribute("c") || 1);
      if (!isFinite(count) || count < 1) count = 1;
      return new Array(count + 1).join(" ");
    }
    var out = "";
    Array.prototype.forEach.call(node.childNodes || [], function (c) { out += odtInlineText(c); });
    return out;
  }

  async function odtToText(file, ctx) {
    var checked = await validateZipFile(file, "ODT", ctx);
    var xml = await checked.zip.file("content.xml").async("string");
    var doc = parseXml(xml);
    var lines = [];
    var all = doc.getElementsByTagName("*");
    Array.prototype.forEach.call(all, function (el) {
      var ln = localName(el);
      var ns = String(el.namespaceURI || "");
      if ((ln === "p" || ln === "h") && (ns.indexOf("opendocument:xmlns:text") >= 0 || /^text:/i.test(el.nodeName || ""))) {
        lines.push(odtInlineText(el).replace(/[ \t]+$/g, ""));
      }
    });
    return { text: cleanText(lines.join("\n")), warnings: 0 };
  }

  function slideNumber(name) {
    var m = String(name).match(/slide(\d+)\.xml$/i);
    return m ? Number(m[1]) : 0;
  }

  async function pptxToText(file, ctx) {
    var checked = await validateZipFile(file, "PPTX", ctx);
    var names = Object.keys(checked.zip.files)
      .filter(function (n) { return /^ppt\/slides\/slide\d+\.xml$/i.test(n); })
      .sort(function (a, b) { return slideNumber(a) - slideNumber(b); });
    var parts = [];
    for (var i = 0; i < names.length; i += 1) {
      var xml = await checked.zip.file(names[i]).async("string");
      var doc = parseXml(xml);
      var paras = doc.getElementsByTagNameNS ? doc.getElementsByTagNameNS("*", "p") : doc.getElementsByTagName("a:p");
      var lines = [];
      Array.prototype.forEach.call(paras, function (p) {
        var t = String(p.textContent || "").replace(/\s+/g, " ").trim();
        if (t) lines.push(t);
      });
      parts.push("[슬라이드 " + slideNumber(names[i]) + "]\n" + lines.join("\n"));
    }
    return { text: cleanText(parts.join("\n\n")), warnings: 0, slides: names.length };
  }

  function encodingForCodePage(cp) {
    cp = Number(cp || 1252);
    if (cp === 949 || cp === 1361 || cp === 51949) return "euc-kr";
    if (cp === 65001) return "utf-8";
    if (cp === 932) return "shift_jis";
    if (cp === 936) return "gbk";
    if (cp === 950) return "big5";
    if (cp === 874) return "windows-874";
    if (cp >= 1250 && cp <= 1258) return "windows-" + cp;
    return "windows-1252";
  }

  function decodeBytes(bytes, cp) {
    if (!bytes.length) return "";
    try {
      return new TextDecoder(encodingForCodePage(cp), { fatal: false }).decode(new Uint8Array(bytes));
    } catch (e) {
      return new TextDecoder("windows-1252", { fatal: false }).decode(new Uint8Array(bytes));
    }
  }

  function parseRtf(raw) {
    var dest = {
      fonttbl:1,colortbl:1,stylesheet:1,info:1,pict:1,object:1,header:1,footer:1,
      headerl:1,headerr:1,footerl:1,footerr:1,footnote:1,annotation:1,fldinst:1,
      xmlnstbl:1,listtable:1,listoverridetable:1,generator:1,datafield:1,datastore:1,
      themedata:1,colorschememapping:1,latentstyles:1,filetbl:1,revtbl:1,rsidtbl:1
    };
    var symbols = {
      emdash:"—",endash:"–",bullet:"•",lquote:"‘",rquote:"’",ldblquote:"“",rdblquote:"”"
    };
    var stack = [];
    var state = { skip:false, uc:1 };
    var out = [];
    var hex = [];
    var codePage = 1252;
    var fallback = 0;

    function flushHex() {
      if (hex.length) {
        if (!state.skip) out.push(decodeBytes(hex, codePage));
        hex = [];
      }
    }

    for (var i = 0; i < raw.length; i += 1) {
      var ch = raw[i];
      if (ch === "{") {
        flushHex();
        stack.push({ skip:state.skip, uc:state.uc });
        continue;
      }
      if (ch === "}") {
        flushHex();
        state = stack.pop() || { skip:false, uc:1 };
        continue;
      }
      if (ch !== "\\") {
        flushHex();
        if (ch === "\r" || ch === "\n") continue;
        if (fallback > 0) { fallback -= 1; continue; }
        if (!state.skip) out.push(ch);
        continue;
      }

      var n = raw[i + 1] || "";
      if (n === "\\" || n === "{" || n === "}") {
        flushHex();
        i += 1;
        if (fallback > 0) fallback -= 1;
        else if (!state.skip) out.push(n);
        continue;
      }
      if (n === "'") {
        var hx = raw.substr(i + 2, 2);
        if (/^[0-9a-fA-F]{2}$/.test(hx)) {
          i += 3;
          if (fallback > 0) fallback -= 1;
          else if (!state.skip) hex.push(parseInt(hx, 16));
        }
        continue;
      }
      flushHex();
      if (n === "*") {
        state.skip = true;
        i += 1;
        continue;
      }
      if (n === "~") {
        i += 1;
        if (fallback > 0) fallback -= 1;
        else if (!state.skip) out.push(" ");
        continue;
      }
      if (n === "_") {
        i += 1;
        if (fallback > 0) fallback -= 1;
        else if (!state.skip) out.push("‑");
        continue;
      }
      if (n === "-") {
        i += 1;
        if (fallback > 0) fallback -= 1;
        continue;
      }

      var j = i + 1;
      var word = "";
      while (j < raw.length && /[A-Za-z]/.test(raw[j])) { word += raw[j]; j += 1; }
      if (!word) {
        i += 1;
        continue;
      }
      var sign = 1;
      if (raw[j] === "-") { sign = -1; j += 1; }
      var num = "";
      while (j < raw.length && /\d/.test(raw[j])) { num += raw[j]; j += 1; }
      var param = num ? sign * Number(num) : null;
      if (raw[j] === " ") j += 1;
      i = j - 1;
      word = word.toLowerCase();

      if (dest[word]) { state.skip = true; continue; }
      if (word === "ansicpg" && param != null) { codePage = param; continue; }
      if (word === "uc" && param != null) { state.uc = Math.max(0, param); continue; }
      if (word === "u" && param != null) {
        if (!state.skip) out.push(String.fromCharCode(param < 0 ? param + 65536 : param));
        fallback = state.uc;
        continue;
      }
      if (state.skip) continue;
      if (word === "par" || word === "line" || word === "page" || word === "sect") out.push("\n");
      else if (word === "tab") out.push("\t");
      else if (symbols[word]) out.push(symbols[word]);
    }
    flushHex();
    return cleanText(out.join(""));
  }

  async function rtfToText(file) {
    var buf = await file.arrayBuffer();
    var raw;
    try {
      raw = new TextDecoder("windows-1252").decode(new Uint8Array(buf));
    } catch (e) {
      raw = String.fromCharCode.apply(null, Array.prototype.slice.call(new Uint8Array(buf), 0, Math.min(buf.byteLength, 1000000)));
    }
    if (!/^\s*\{\\rtf/i.test(raw)) throw new Error("정상적인 RTF 파일이 아닙니다.");
    return { text: parseRtf(raw), warnings: 0 };
  }

  function limitationFor(x) {
    var id = String(x.id || "");
    if (id === "doc-docx-html") return "DOCX의 제목·문단·목록·표 등 내용 구조 중심 변환입니다. 복잡한 페이지 배치, 일부 글꼴·도형·특수 효과는 원본과 동일하게 재현되지 않을 수 있습니다.";
    if (id === "doc-pptx-txt") return "슬라이드 안의 텍스트를 순서대로 추출합니다. 이미지·차트·도형의 시각적 배치와 발표자 노트는 포함하지 않습니다.";
    if (id === "doc-odt-txt") return "ODT의 본문·제목·표 안의 텍스트를 추출합니다. 문서 서식과 페이지 배치는 TXT에 포함되지 않습니다.";
    if (id === "doc-rtf-txt") return "일반적인 RTF 텍스트와 Unicode/주요 코드페이지를 읽습니다. 매우 오래된 특수 RTF 확장이나 포함 개체는 제외될 수 있습니다.";
    return "DOCX의 본문 텍스트를 추출합니다. 글꼴·이미지·표 모양 같은 서식은 TXT에 포함되지 않습니다.";
  }

  function acceptsFor(x) {
    var fmt = String(x.fromFormat || "").toUpperCase();
    if (fmt === "DOCX") return ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    if (fmt === "PPTX") return ".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation";
    if (fmt === "ODT") return ".odt,application/vnd.oasis.opendocument.text";
    if (fmt === "RTF") return ".rtf,application/rtf,text/rtf";
    return "";
  }

  function extMatches(file, fmt) {
    var name = String(file && file.name || "").toLowerCase();
    return name.endsWith("." + String(fmt || "").toLowerCase());
  }

  async function transform(x, file, ctx) {
    var engine = String(x.engine || "");
    if (engine === "docx-txt") return docxToText(file, ctx);
    if (engine === "docx-html") return docxToHtml(file, ctx);
    if (engine === "pptx-txt") return pptxToText(file, ctx);
    if (engine === "odt-txt") return odtToText(file, ctx);
    if (engine === "rtf-txt") return rtfToText(file, ctx);
    throw new Error("지원하지 않는 문서 변환입니다.");
  }

  NS.document = {
    version: "1.0.0",
    open: function (x, ctx) {
      var d = ctx.document, stage = ctx.stage;
      addStyle(d);
      var inputAccept = x.accept || acceptsFor(x);
      stage.innerHTML = '<div class="hm-fx-detail">' +
        '<div class="hm-fx-toolbar"><a class="hm-fx-back" href="' + ctx.route({ category:x.category }) + '" data-route>← ' + ctx.esc(ctx.cat(x.category).name) + '</a></div>' +
        ctx.titleBlock(x) +
        '<div class="hm-fx-workbox">' +
          '<label class="hm-doc-upload" data-drop>' +
            '<input type="file" data-file hidden accept="' + ctx.esc(inputAccept) + '">' +
            '<span class="hm-doc-upload-icon" aria-hidden="true">DOC</span>' +
            '<strong>' + ctx.esc(x.fromFormat) + ' 파일을 선택하거나 끌어놓으세요.</strong>' +
            '<p>파일은 외부 서버로 업로드하지 않고 현재 브라우저에서 처리합니다. 최대 30MB까지 권장합니다.</p>' +
          '</label>' +
          '<div class="hm-doc-file" data-filemeta></div>' +
          '<div class="hm-fx-actions">' +
            '<button class="hm-fx-btn primary" type="button" data-run disabled>변환하기</button>' +
            '<button class="hm-fx-btn" type="button" data-reset>다른 파일 선택</button>' +
          '</div>' +
          '<div class="hm-doc-result" data-result>' +
            '<div class="hm-doc-result-head"><strong>변환 결과 · ' + ctx.esc(x.toFormat) + '</strong><span data-summary></span></div>' +
            '<textarea class="hm-doc-output" data-output readonly spellcheck="false"></textarea>' +
            '<div class="hm-fx-actions">' +
              '<a class="hm-fx-btn primary" data-download href="#" download>결과 다운로드</a>' +
              '<button class="hm-fx-btn" type="button" data-copy>결과 복사</button>' +
            '</div>' +
          '</div>' +
          '<div class="hm-doc-limit">' + ctx.esc(limitationFor(x)) + '</div>' +
          '<div class="hm-fx-note" data-msg>파일을 선택하면 변환을 시작할 수 있습니다.</div>' +
        '</div>' +
      '</div>';

      var fileInput = stage.querySelector('[data-file]');
      var drop = stage.querySelector('[data-drop]');
      var fileMeta = stage.querySelector('[data-filemeta]');
      var runBtn = stage.querySelector('[data-run]');
      var resetBtn = stage.querySelector('[data-reset]');
      var resultBox = stage.querySelector('[data-result]');
      var output = stage.querySelector('[data-output]');
      var summary = stage.querySelector('[data-summary]');
      var download = stage.querySelector('[data-download]');
      var copy = stage.querySelector('[data-copy]');
      var msg = stage.querySelector('[data-msg]');
      var selected = null;
      var objectUrl = "";

      function revoke() {
        if (objectUrl) {
          try { URL.revokeObjectURL(objectUrl); } catch (e) {}
          objectUrl = "";
        }
      }

      function selectFile(file) {
        revoke();
        resultBox.classList.remove("is-show");
        output.value = "";
        selected = null;
        runBtn.disabled = true;
        if (!file) {
          fileMeta.classList.remove("is-show");
          fileMeta.textContent = "";
          msg.textContent = "파일을 선택하면 변환을 시작할 수 있습니다.";
          return;
        }
        if (file.size > MAX_FILE_BYTES) {
          fileMeta.classList.add("is-show");
          fileMeta.textContent = file.name + " · " + fmtBytes(file.size);
          msg.textContent = "30MB보다 큰 파일입니다. 모바일 안정성을 위해 더 작은 파일을 사용해 주세요.";
          return;
        }
        if (!extMatches(file, x.fromFormat)) {
          fileMeta.classList.add("is-show");
          fileMeta.textContent = file.name + " · " + fmtBytes(file.size);
          msg.textContent = x.fromFormat + " 파일을 선택해 주세요.";
          return;
        }
        selected = file;
        fileMeta.classList.add("is-show");
        fileMeta.textContent = file.name + " · " + fmtBytes(file.size) + " · " + x.fromFormat;
        runBtn.disabled = false;
        msg.textContent = "파일이 준비되었습니다. 변환하기를 눌러 주세요.";
      }

      drop.addEventListener("dragover", function (e) { e.preventDefault(); drop.classList.add("is-drag"); });
      drop.addEventListener("dragleave", function () { drop.classList.remove("is-drag"); });
      drop.addEventListener("drop", function (e) {
        e.preventDefault();
        drop.classList.remove("is-drag");
        selectFile(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]);
      });
      fileInput.addEventListener("change", function () { selectFile(fileInput.files && fileInput.files[0]); });
      resetBtn.addEventListener("click", function () {
        fileInput.value = "";
        selectFile(null);
        fileInput.click();
      });

      runBtn.addEventListener("click", async function () {
        if (!selected) return;
        runBtn.disabled = true;
        msg.textContent = "문서를 읽고 있습니다. 잠시만 기다려 주세요.";
        revoke();
        try {
          var result = await transform(x, selected, ctx);
          var text = String(result.text || "");
          if (!text.trim()) throw new Error("추출할 텍스트를 찾지 못했습니다.");
          output.value = text;
          var ext = String(x.toFormat || "txt").toLowerCase();
          var mime = ext === "html" ? "text/html;charset=utf-8" : "text/plain;charset=utf-8";
          var blobText = ext === "txt" ? "\ufeff" + text : text;
          objectUrl = URL.createObjectURL(new Blob([blobText], { type:mime }));
          download.href = objectUrl;
          download.download = safeBase(selected.name) + "." + ext;
          var extras = [];
          extras.push(text.length.toLocaleString("ko-KR") + "자");
          if (result.slides) extras.push(result.slides + "슬라이드");
          if (result.warnings) extras.push("확인 메시지 " + result.warnings + "건");
          summary.textContent = extras.join(" · ");
          resultBox.classList.add("is-show");
          msg.textContent = "변환이 완료되었습니다. 결과를 확인한 뒤 다운로드할 수 있습니다.";
          resultBox.scrollIntoView({ behavior:"smooth", block:"nearest" });
        } catch (e) {
          resultBox.classList.remove("is-show");
          output.value = "";
          msg.textContent = e && e.message ? e.message : String(e);
        } finally {
          runBtn.disabled = !selected;
        }
      });

      copy.addEventListener("click", function () {
        if (!output.value) return;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(output.value).then(function () {
            msg.textContent = "결과를 복사했습니다.";
          }).catch(function () {
            output.focus(); output.select();
            msg.textContent = "결과 영역을 선택했습니다. 복사해 주세요.";
          });
        } else {
          output.focus(); output.select();
          msg.textContent = "결과 영역을 선택했습니다. 복사해 주세요.";
        }
      });
    }
  };
})(window);
