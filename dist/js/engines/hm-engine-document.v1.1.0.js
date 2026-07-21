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


  function xmlEscape(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  function htmlBlocks(html) {
    var doc = new DOMParser().parseFromString(String(html || ""), "text/html");
    Array.prototype.forEach.call(
      doc.querySelectorAll("script,style,link,iframe,frame,object,embed,form,input,button,textarea,select,option,video,audio,canvas,noscript,template"),
      function (el) { el.remove(); }
    );

    var blocks = [];

    function normText(node) {
      return cleanText(String(node && node.textContent || "").replace(/\u00a0/g, " "));
    }

    function tableBlock(table) {
      var rows = [];
      Array.prototype.forEach.call(table.querySelectorAll("tr"), function (tr) {
        var cells = [];
        Array.prototype.forEach.call(tr.children || [], function (cell) {
          var tag = String(cell.tagName || "").toLowerCase();
          if (tag === "td" || tag === "th") cells.push(normText(cell));
        });
        if (cells.length) rows.push(cells);
      });
      if (rows.length) blocks.push({ type:"table", rows:rows });
    }

    Array.prototype.forEach.call(doc.body.children || [], function (el) {
      var tag = String(el.tagName || "").toLowerCase();
      if (tag === "table") {
        tableBlock(el);
        return;
      }
      if (tag === "ul" || tag === "ol") {
        Array.prototype.forEach.call(el.children || [], function (li) {
          if (String(li.tagName || "").toLowerCase() === "li") {
            var text = normText(li);
            if (text) blocks.push({ type:"p", text:(tag === "ol" ? "1. " : "• ") + text });
          }
        });
        return;
      }
      var text = normText(el);
      if (text) blocks.push({ type:"p", text:text });
      Array.prototype.forEach.call(el.querySelectorAll ? el.querySelectorAll(":scope > table") : [], tableBlock);
    });

    if (!blocks.length) {
      var all = normText(doc.body);
      if (all) blocks.push({ type:"p", text:all });
    }
    return blocks;
  }

  function textBlocks(text) {
    return String(text || "")
      .replace(/\r\n?/g, "\n")
      .split(/\n{2,}/)
      .map(function (part) { return cleanText(part); })
      .filter(Boolean)
      .map(function (part) { return { type:"p", text:part }; });
  }

  async function docxToBlocks(file, ctx) {
    var checked = await validateZipFile(file, "DOCX", ctx);
    await ensureMammoth(ctx);
    var result = await w.mammoth.convertToHtml({ arrayBuffer: checked.buffer });
    return {
      blocks: htmlBlocks(result.value || ""),
      warnings: result.messages ? result.messages.length : 0
    };
  }

  function odtCellText(cell) {
    var parts = [];
    Array.prototype.forEach.call(cell.getElementsByTagName("*"), function (el) {
      var ln = localName(el);
      if (ln === "p" || ln === "h") {
        var t = cleanText(odtInlineText(el));
        if (t) parts.push(t);
      }
    });
    return parts.join("\n");
  }

  async function odtToBlocks(file, ctx) {
    var checked = await validateZipFile(file, "ODT", ctx);
    var xml = await checked.zip.file("content.xml").async("string");
    var doc = parseXml(xml);
    var blocks = [];
    var body = null;

    Array.prototype.forEach.call(doc.getElementsByTagName("*"), function (el) {
      if (!body && localName(el) === "text" && String(el.namespaceURI || "").indexOf("office") >= 0) body = el;
    });
    body = body || doc.documentElement;

    function walk(node) {
      if (!node || node.nodeType !== 1) return;
      var ln = localName(node);

      if (ln === "table") {
        var rows = [];
        Array.prototype.forEach.call(node.childNodes || [], function (tr) {
          if (tr.nodeType !== 1 || localName(tr) !== "table-row") return;
          var row = [];
          Array.prototype.forEach.call(tr.childNodes || [], function (tc) {
            if (tc.nodeType !== 1) return;
            var cn = localName(tc);
            if (cn === "table-cell" || cn === "covered-table-cell") row.push(odtCellText(tc));
          });
          if (row.length) rows.push(row);
        });
        if (rows.length) blocks.push({ type:"table", rows:rows });
        return;
      }

      if (ln === "p" || ln === "h") {
        var text = cleanText(odtInlineText(node));
        if (text) blocks.push({ type:"p", text:text });
        return;
      }

      Array.prototype.forEach.call(node.childNodes || [], walk);
    }

    walk(body);
    return { blocks:blocks, warnings:0 };
  }

  function rtfEscapeText(text) {
    var out = "";
    Array.from(String(text || "")).forEach(function (ch) {
      var code = ch.codePointAt(0);
      if (ch === "\\") out += "\\\\";
      else if (ch === "{") out += "\\{";
      else if (ch === "}") out += "\\}";
      else if (ch === "\n") out += "\\line ";
      else if (code >= 32 && code <= 126) out += ch;
      else if (code <= 0xFFFF) {
        var signed = code > 32767 ? code - 65536 : code;
        out += "\\u" + signed + "?";
      } else {
        var cp = code - 0x10000;
        var high = 0xD800 + (cp >> 10);
        var low = 0xDC00 + (cp & 0x3FF);
        out += "\\u" + (high > 32767 ? high - 65536 : high) + "?";
        out += "\\u" + (low > 32767 ? low - 65536 : low) + "?";
      }
    });
    return out;
  }

  function blocksToPlainText(blocks) {
    return blocks.map(function (block) {
      if (block.type === "table") {
        return block.rows.map(function (row) {
          return row.map(function (cell) {
            return String(cell || "").replace(/\n+/g, " / ");
          }).join("\t");
        }).join("\n");
      }
      return String(block.text || "");
    }).join("\n\n");
  }

  function blocksToRtf(blocks) {
    var body = blocks.map(function (block) {
      if (block.type === "table") {
        return block.rows.map(function (row) {
          return rtfEscapeText(row.join("\t")) + "\\par";
        }).join("\n");
      }
      return rtfEscapeText(block.text || "") + "\\par";
    }).join("\n");
    return "{\\rtf1\\ansi\\ansicpg65001\\deff0\\uc1\n" +
      "{\\fonttbl{\\f0\\fnil Malgun Gothic;}}\n" +
      "\\viewkind4\\pard\\f0\\fs22\n" + body + "\n}";
  }

  function docxParagraph(text) {
    var parts = String(text || "").split("\n");
    var runs = parts.map(function (part, index) {
      var run = '<w:r><w:t xml:space="preserve">' + xmlEscape(part) + '</w:t></w:r>';
      if (index < parts.length - 1) run += '<w:r><w:br/></w:r>';
      return run;
    }).join("");
    return "<w:p>" + runs + "</w:p>";
  }

  function blocksToDocumentXml(blocks) {
    var body = blocks.map(function (block) {
      if (block.type === "table") {
        var rows = block.rows.map(function (row) {
          return "<w:tr>" + row.map(function (cell) {
            return '<w:tc><w:tcPr><w:tcW w:w="2400" w:type="dxa"/></w:tcPr>' +
              docxParagraph(cell || "") + "</w:tc>";
          }).join("") + "</w:tr>";
        }).join("");
        return '<w:tbl><w:tblPr><w:tblBorders>' +
          '<w:top w:val="single" w:sz="4" w:color="B7C2D0"/>' +
          '<w:left w:val="single" w:sz="4" w:color="B7C2D0"/>' +
          '<w:bottom w:val="single" w:sz="4" w:color="B7C2D0"/>' +
          '<w:right w:val="single" w:sz="4" w:color="B7C2D0"/>' +
          '<w:insideH w:val="single" w:sz="4" w:color="D6DEE8"/>' +
          '<w:insideV w:val="single" w:sz="4" w:color="D6DEE8"/>' +
          '</w:tblBorders></w:tblPr>' + rows + "</w:tbl>";
      }
      return docxParagraph(block.text || "");
    }).join("");

    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      "<w:body>" + body +
      '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>' +
      "</w:body></w:document>";
  }

  async function createDocxBlob(blocks, ctx) {
    await ensureJSZip(ctx);
    var zip = new w.JSZip();

    zip.file("[Content_Types].xml",
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
      '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
      "</Types>");

    zip.file("_rels/.rels",
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
      "</Relationships>");

    zip.file("word/document.xml", blocksToDocumentXml(blocks));
    zip.file("word/styles.xml",
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:docDefaults><w:rPrDefault><w:rPr>' +
      '<w:rFonts w:ascii="Malgun Gothic" w:eastAsia="맑은 고딕" w:hAnsi="Malgun Gothic"/>' +
      '<w:sz w:val="22"/><w:szCs w:val="22"/>' +
      "</w:rPr></w:rPrDefault></w:docDefaults></w:styles>");
    zip.file("word/_rels/document.xml.rels",
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>');

    return await zip.generateAsync({
      type:"blob",
      mimeType:"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      compression:"DEFLATE"
    });
  }

  function blocksToOdtContent(blocks) {
    var content = blocks.map(function (block) {
      if (block.type === "table") {
        var rows = block.rows.map(function (row) {
          return "<table:table-row>" + row.map(function (cell) {
            return '<table:table-cell office:value-type="string"><text:p>' +
              xmlEscape(String(cell || "")).replace(/\n/g, "<text:line-break/>") +
              "</text:p></table:table-cell>";
          }).join("") + "</table:table-row>";
        }).join("");
        return '<table:table table:name="Table">' + rows + "</table:table>";
      }
      return "<text:p>" + xmlEscape(block.text || "").replace(/\n/g, "<text:line-break/>") + "</text:p>";
    }).join("");

    return '<?xml version="1.0" encoding="UTF-8"?>' +
      '<office:document-content ' +
      'xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" ' +
      'xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" ' +
      'xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" ' +
      'office:version="1.2">' +
      "<office:body><office:text>" + content + "</office:text></office:body></office:document-content>";
  }

  async function createOdtBlob(blocks, ctx) {
    await ensureJSZip(ctx);
    var zip = new w.JSZip();
    zip.file("mimetype", "application/vnd.oasis.opendocument.text", { compression:"STORE" });
    zip.file("content.xml", blocksToOdtContent(blocks));
    zip.file("styles.xml",
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<office:document-styles xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" office:version="1.2"></office:document-styles>');
    zip.file("META-INF/manifest.xml",
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2">' +
      '<manifest:file-entry manifest:full-path="/" manifest:media-type="application/vnd.oasis.opendocument.text"/>' +
      '<manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>' +
      '<manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/>' +
      "</manifest:manifest>");
    return await zip.generateAsync({
      type:"blob",
      mimeType:"application/vnd.oasis.opendocument.text",
      compression:"DEFLATE"
    });
  }

  async function txtToDocx(file, ctx) {
    var text = new TextDecoder("utf-8").decode(await file.arrayBuffer());
    var blocks = textBlocks(text);
    if (!blocks.length) throw new Error("TXT에서 변환할 내용을 찾지 못했습니다.");
    return {
      blob: await createDocxBlob(blocks, ctx),
      ext:"docx",
      mime:"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      preview: blocksToPlainText(blocks),
      warnings:0
    };
  }

  async function htmlToDocx(file, ctx) {
    var html = new TextDecoder("utf-8").decode(await file.arrayBuffer());
    var blocks = htmlBlocks(html);
    if (!blocks.length) throw new Error("HTML에서 변환할 내용을 찾지 못했습니다.");
    return {
      blob: await createDocxBlob(blocks, ctx),
      ext:"docx",
      mime:"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      preview: blocksToPlainText(blocks),
      warnings:0
    };
  }

  async function docxToRtf(file, ctx) {
    var result = await docxToBlocks(file, ctx);
    if (!result.blocks.length) throw new Error("DOCX에서 변환할 내용을 찾지 못했습니다.");
    var rtf = blocksToRtf(result.blocks);
    return {
      text:rtf,
      ext:"rtf",
      mime:"application/rtf;charset=utf-8",
      preview:blocksToPlainText(result.blocks),
      warnings:result.warnings
    };
  }

  async function rtfToDocx(file, ctx) {
    var result = await rtfToText(file);
    var blocks = textBlocks(result.text);
    if (!blocks.length) throw new Error("RTF에서 변환할 내용을 찾지 못했습니다.");
    return {
      blob:await createDocxBlob(blocks, ctx),
      ext:"docx",
      mime:"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      preview:blocksToPlainText(blocks),
      warnings:0
    };
  }

  async function docxToOdt(file, ctx) {
    var result = await docxToBlocks(file, ctx);
    if (!result.blocks.length) throw new Error("DOCX에서 변환할 내용을 찾지 못했습니다.");
    return {
      blob:await createOdtBlob(result.blocks, ctx),
      ext:"odt",
      mime:"application/vnd.oasis.opendocument.text",
      preview:blocksToPlainText(result.blocks),
      warnings:result.warnings
    };
  }

  async function odtToDocx(file, ctx) {
    var result = await odtToBlocks(file, ctx);
    if (!result.blocks.length) throw new Error("ODT에서 변환할 내용을 찾지 못했습니다.");
    return {
      blob:await createDocxBlob(result.blocks, ctx),
      ext:"docx",
      mime:"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      preview:blocksToPlainText(result.blocks),
      warnings:0
    };
  }

  function limitationFor(x) {
    var id = String(x.id || "");
    if (id === "doc-docx-html") return "DOCX의 제목·문단·목록·표 등 내용 구조 중심 변환입니다. 복잡한 페이지 배치, 일부 글꼴·도형·특수 효과는 원본과 동일하게 재현되지 않을 수 있습니다.";
    if (id === "doc-pptx-txt") return "슬라이드 안의 텍스트를 순서대로 추출합니다. 이미지·차트·도형의 시각적 배치와 발표자 노트는 포함하지 않습니다.";
    if (id === "doc-odt-txt") return "ODT의 본문·제목·표 안의 텍스트를 추출합니다. 문서 서식과 페이지 배치는 TXT에 포함되지 않습니다.";
    if (id === "doc-rtf-txt") return "일반적인 RTF 텍스트와 Unicode/주요 코드페이지를 읽습니다. 매우 오래된 특수 RTF 확장이나 포함 개체는 제외될 수 있습니다.";
    if (id === "doc-txt-docx") return "TXT의 문단과 줄바꿈을 기본 DOCX로 만듭니다. 원본 TXT에는 서식 정보가 없으므로 기본 글꼴과 문단 구조를 사용합니다.";
    if (id === "doc-html-docx") return "HTML의 제목·문단·목록·표 등 기본 구조를 DOCX로 옮깁니다. CSS, 스크립트, 외부 리소스와 복잡한 웹 레이아웃은 포함하지 않습니다.";
    if (id === "doc-docx-rtf") return "DOCX의 내용 구조를 기본 RTF 텍스트로 변환합니다. 이미지·도형·정밀한 페이지 레이아웃은 단순화되거나 제외됩니다.";
    if (id === "doc-rtf-docx") return "RTF의 텍스트를 읽어 기본 DOCX 문단으로 만듭니다. 오래된 RTF 개체·이미지·고급 서식은 포함하지 않을 수 있습니다.";
    if (id === "doc-docx-odt") return "DOCX의 문단과 표 중심으로 ODT를 만듭니다. 세밀한 Word 스타일과 페이지 배치는 동일하게 재현되지 않을 수 있습니다.";
    if (id === "doc-odt-docx") return "ODT의 문단과 표 중심으로 DOCX를 만듭니다. 세밀한 스타일·도형·쪽 배치는 단순화될 수 있습니다.";
    return "DOCX의 본문 텍스트를 추출합니다. 글꼴·이미지·표 모양 같은 서식은 TXT에 포함되지 않습니다.";
  }

  function acceptsFor(x) {
    var fmt = String(x.fromFormat || "").toUpperCase();
    if (fmt === "DOCX") return ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    if (fmt === "PPTX") return ".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation";
    if (fmt === "ODT") return ".odt,application/vnd.oasis.opendocument.text";
    if (fmt === "RTF") return ".rtf,application/rtf,text/rtf";
    if (fmt === "TXT") return ".txt,text/plain";
    if (fmt === "HTML") return ".html,.htm,text/html";
    return "";
  }

  function extMatches(file, fmt) {
    var name = String(file && file.name || "").toLowerCase();
    var f = String(fmt || "").toLowerCase();
    if (f === "html") return name.endsWith(".html") || name.endsWith(".htm");
    return name.endsWith("." + f);
  }

  async function transform(x, file, ctx) {
    var engine = String(x.engine || "");
    if (engine === "docx-txt") return docxToText(file, ctx);
    if (engine === "docx-html") return docxToHtml(file, ctx);
    if (engine === "pptx-txt") return pptxToText(file, ctx);
    if (engine === "odt-txt") return odtToText(file, ctx);
    if (engine === "rtf-txt") return rtfToText(file, ctx);
    if (engine === "txt-docx") return txtToDocx(file, ctx);
    if (engine === "html-docx") return htmlToDocx(file, ctx);
    if (engine === "docx-rtf") return docxToRtf(file, ctx);
    if (engine === "rtf-docx") return rtfToDocx(file, ctx);
    if (engine === "docx-odt") return docxToOdt(file, ctx);
    if (engine === "odt-docx") return odtToDocx(file, ctx);
    throw new Error("지원하지 않는 문서 변환입니다.");
  }

  NS.document = {
    version: "1.1.0",
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
          var text = String(result.text || result.preview || "");
          if (!text.trim() && !result.blob) throw new Error("변환할 내용을 찾지 못했습니다.");
          output.value = text || "파일 변환이 완료되었습니다.";
          var ext = String(result.ext || x.toFormat || "txt").toLowerCase();
          var mime = result.mime || (ext === "html" ? "text/html;charset=utf-8" : ext === "rtf" ? "application/rtf;charset=utf-8" : "text/plain;charset=utf-8");
          var blob;
          if (result.blob) blob = result.blob;
          else {
            var blobText = ext === "txt" ? "\ufeff" + String(result.text || "") : String(result.text || "");
            blob = new Blob([blobText], { type:mime });
          }
          objectUrl = URL.createObjectURL(blob);
          download.href = objectUrl;
          download.download = safeBase(selected.name) + "." + ext;
          copy.disabled = !output.value;
          var extras = [];
          if (text) extras.push(text.length.toLocaleString("ko-KR") + "자");
          extras.push(fmtBytes(blob.size));
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
