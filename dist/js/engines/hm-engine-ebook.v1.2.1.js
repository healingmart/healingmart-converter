/*
 * HealingMart Converter E-book Engine v1.2.1
 * TXT / HTML / DOCX -> EPUB
 * EPUB -> TXT / PDF
 */
(function (w) {
  "use strict";

  var d = w.document;
  var NS = w.HM_CONVERTER_ENGINES = w.HM_CONVERTER_ENGINES || {};

  function injectStyle() {
    if (d.getElementById("hm-engine-ebook-style-v1")) return;
    var style = d.createElement("style");
    style.id = "hm-engine-ebook-style-v1";
    style.textContent = [
      ".hm-eb-box{padding:22px;border:1px solid #dfe6ef;border-radius:20px;background:#fff;box-shadow:0 12px 34px rgba(15,23,42,.07)}",
      ".hm-eb-drop{padding:34px 18px;border:2px dashed #aebff0;border-radius:17px;background:#f8fbff;text-align:center;cursor:pointer;transition:.16s ease}",
      ".hm-eb-drop:hover,.hm-eb-drop.is-drag{border-color:#2f7cf6;background:#fff}",
      ".hm-eb-drop strong{display:block;color:#13253a;font-size:18px;font-weight:950}",
      ".hm-eb-drop span{display:block;margin-top:5px;color:#5d6d83;font-size:13px;line-height:1.55}",
      ".hm-eb-file{display:none;margin-top:12px;padding:11px 12px;border:1px solid #e0e7ef;border-radius:11px;background:#fbfdff;color:#405269;font-size:12px;font-weight:850}",
      ".hm-eb-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:14px}",
      ".hm-eb-field label{display:block;margin-bottom:5px;color:#536176;font-size:12px;font-weight:850}",
      ".hm-eb-field input,.hm-eb-field select{width:100%;height:46px;padding:0 11px;border:1px solid #d7e0ea;border-radius:10px;background:#fff;color:#172033;outline:none;font-size:14px}",
      ".hm-eb-field input:focus,.hm-eb-field select:focus{border-color:#4f7df1;box-shadow:0 0 0 4px rgba(79,125,241,.10)}",
      ".hm-eb-actions{display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin-top:16px}",
      ".hm-eb-btn{min-height:46px;padding:0 17px;border:1px solid #d6e0ea;border-radius:11px;background:#fff;color:#223248;font-size:13px;font-weight:900;cursor:pointer}",
      ".hm-eb-btn.primary{color:#fff;border-color:#4d69e8;background:linear-gradient(135deg,#6d5dfc,#2f7cf6);box-shadow:0 8px 20px rgba(71,91,229,.22)}",
      ".hm-eb-btn:disabled{opacity:.48;cursor:not-allowed}",
      ".hm-eb-status{margin-top:13px;padding:12px;border-radius:11px;background:#f4f7fb;color:#4d5d73;font-size:12px;line-height:1.65}",
      ".hm-eb-note{margin-top:12px;padding:11px 12px;border:1px solid #e4eaf1;border-radius:11px;background:#fbfdff;color:#607087;font-size:11px;line-height:1.65}",
      ".hm-eb-output{width:100%;min-height:260px;margin-top:14px;padding:15px;border:1px solid #d9e2ec;border-radius:12px;background:#fbfdff;color:#18283c;font:500 14px/1.75 ui-monospace,SFMono-Regular,Consolas,monospace;resize:vertical;outline:none}",
      ".hm-eb-output-actions{display:flex;justify-content:flex-end;gap:7px;flex-wrap:wrap;margin-top:9px}",
      ".hm-eb-output-actions button{display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:0 13px;border:1px solid #d7e0ea;border-radius:10px;background:#fff;color:#32455c;font-size:11px;font-weight:900;cursor:pointer}",
      ".hm-eb-version{margin-top:10px;color:#8a97a8;font-size:10px;text-align:right}",
      "@media(max-width:760px){.hm-eb-box{padding:13px 9px;border-radius:15px}.hm-eb-drop{padding:27px 10px}.hm-eb-options{grid-template-columns:1fr}.hm-eb-output{min-height:220px;font-size:13px}.hm-eb-output-actions{justify-content:stretch}.hm-eb-output-actions button{flex:1 1 auto}}"
    ].join("");
    d.head.appendChild(style);
  }

  function safeBaseName(name) {
    return String(name || "ebook").replace(/\.[^.]+$/, "").replace(/[\\/:*?"<>|]+/g, "_");
  }

  function niceBytes(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + " KB";
    return (bytes / 1024 / 1024).toFixed(2) + " MB";
  }

  function downloadBlob(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = d.createElement("a");
    a.href = url;
    a.download = name;
    d.body.appendChild(a);
    a.click();
    a.remove();
    w.setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
  }

  function copyText(value) {
    if (w.navigator && w.navigator.clipboard && w.navigator.clipboard.writeText) {
      return w.navigator.clipboard.writeText(value);
    }
    return Promise.reject(new Error("클립보드를 사용할 수 없습니다."));
  }

  function xmlEscape(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  function htmlTextToXhtml(html) {
    var parsed = new DOMParser().parseFromString(String(html || ""), "text/html");
    parsed.querySelectorAll("script,style,link,iframe,frame,object,embed,form,input,button,textarea,select,option,video,audio,canvas,noscript,template,picture,source").forEach(function (node) {
      node.remove();
    });
    parsed.querySelectorAll("img").forEach(function (node) {
      var alt = node.getAttribute("alt");
      node.replaceWith(d.createTextNode(alt ? "[이미지: " + alt + "]" : ""));
    });

    var allowed = {
      h1:1,h2:1,h3:1,h4:1,h5:1,h6:1,p:1,ul:1,ol:1,li:1,blockquote:1,
      pre:1,code:1,strong:1,em:1,b:1,i:1,table:1,thead:1,tbody:1,tfoot:1,
      tr:1,th:1,td:1,br:1,hr:1,div:1,span:1
    };

    function walk(node) {
      if (node.nodeType === 3) return xmlEscape(node.nodeValue || "");
      if (node.nodeType !== 1) return "";
      var tag = String(node.tagName || "").toLowerCase();
      var inner = Array.from(node.childNodes || []).map(walk).join("");
      if (!allowed[tag]) return inner;
      if (tag === "br" || tag === "hr") return "<" + tag + "/>";
      if (tag === "div" || tag === "span") return inner;
      if (tag === "b") tag = "strong";
      if (tag === "i") tag = "em";
      return "<" + tag + ">" + inner + "</" + tag + ">";
    }

    var body = Array.from(parsed.body.childNodes || []).map(walk).join("");
    return body || "<p></p>";
  }

  function txtToXhtml(text) {
    var normalized = String(text || "").replace(/\r\n?/g, "\n");
    var blocks = normalized.split(/\n{2,}/);
    return blocks.map(function (block) {
      var lines = block.split("\n").map(function (line) { return xmlEscape(line); });
      return "<p>" + lines.join("<br/>") + "</p>";
    }).join("\n");
  }

  function crc32(bytes) {
    if (!crc32.table) {
      var table = [];
      for (var n = 0; n < 256; n += 1) {
        var c = n;
        for (var k = 0; k < 8; k += 1) {
          c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        }
        table[n] = c >>> 0;
      }
      crc32.table = table;
    }
    var crc = 0 ^ (-1);
    for (var i = 0; i < bytes.length; i += 1) {
      crc = (crc >>> 8) ^ crc32.table[(crc ^ bytes[i]) & 0xFF];
    }
    return (crc ^ (-1)) >>> 0;
  }

  function u16(view, offset, value) {
    view.setUint16(offset, value & 0xFFFF, true);
  }

  function u32(view, offset, value) {
    view.setUint32(offset, value >>> 0, true);
  }

  function concatArrays(arrays) {
    var total = arrays.reduce(function (sum, a) { return sum + a.length; }, 0);
    var out = new Uint8Array(total);
    var offset = 0;
    arrays.forEach(function (a) {
      out.set(a, offset);
      offset += a.length;
    });
    return out;
  }

  function buildStoredZip(entries) {
    var enc = new TextEncoder();
    var localParts = [];
    var centralParts = [];
    var offset = 0;

    entries.forEach(function (entry) {
      var nameBytes = enc.encode(entry.name);
      var dataBytes = entry.data instanceof Uint8Array ? entry.data : enc.encode(String(entry.data || ""));
      var crc = crc32(dataBytes);

      var local = new Uint8Array(30 + nameBytes.length);
      var lv = new DataView(local.buffer);
      u32(lv, 0, 0x04034b50);
      u16(lv, 4, 20);
      u16(lv, 6, 0x0800);
      u16(lv, 8, 0);
      u16(lv, 10, 0);
      u16(lv, 12, 0);
      u32(lv, 14, crc);
      u32(lv, 18, dataBytes.length);
      u32(lv, 22, dataBytes.length);
      u16(lv, 26, nameBytes.length);
      u16(lv, 28, 0);
      local.set(nameBytes, 30);

      var central = new Uint8Array(46 + nameBytes.length);
      var cv = new DataView(central.buffer);
      u32(cv, 0, 0x02014b50);
      u16(cv, 4, 20);
      u16(cv, 6, 20);
      u16(cv, 8, 0x0800);
      u16(cv, 10, 0);
      u16(cv, 12, 0);
      u16(cv, 14, 0);
      u32(cv, 16, crc);
      u32(cv, 20, dataBytes.length);
      u32(cv, 24, dataBytes.length);
      u16(cv, 28, nameBytes.length);
      u16(cv, 30, 0);
      u16(cv, 32, 0);
      u16(cv, 34, 0);
      u16(cv, 36, 0);
      u32(cv, 38, 0);
      u32(cv, 42, offset);
      central.set(nameBytes, 46);

      localParts.push(local, dataBytes);
      centralParts.push(central);
      offset += local.length + dataBytes.length;
    });

    var centralSize = centralParts.reduce(function (sum, a) { return sum + a.length; }, 0);
    var end = new Uint8Array(22);
    var ev = new DataView(end.buffer);
    u32(ev, 0, 0x06054b50);
    u16(ev, 4, 0);
    u16(ev, 6, 0);
    u16(ev, 8, entries.length);
    u16(ev, 10, entries.length);
    u32(ev, 12, centralSize);
    u32(ev, 16, offset);
    u16(ev, 20, 0);

    return concatArrays(localParts.concat(centralParts, [end]));
  }

  function uuidLike() {
    if (w.crypto && w.crypto.randomUUID) return w.crypto.randomUUID();
    return "hm-" + Date.now() + "-" + Math.random().toString(16).slice(2);
  }

  function createEpubBlob(title, author, bodyXhtml) {
    title = String(title || "새 전자책").trim() || "새 전자책";
    author = String(author || "HealingMart").trim() || "HealingMart";
    var id = uuidLike();

    var container = '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">' +
      '<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>' +
      '</container>';

    var opf = '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">' +
      '<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">' +
      '<dc:identifier id="bookid">' + xmlEscape(id) + '</dc:identifier>' +
      '<dc:title>' + xmlEscape(title) + '</dc:title>' +
      '<dc:creator>' + xmlEscape(author) + '</dc:creator>' +
      '<dc:language>ko</dc:language>' +
      '<meta property="dcterms:modified">2026-07-22T00:00:00Z</meta>' +
      '</metadata>' +
      '<manifest>' +
      '<item id="content" href="content.xhtml" media-type="application/xhtml+xml"/>' +
      '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>' +
      '</manifest>' +
      '<spine><itemref idref="content"/></spine>' +
      '</package>';

    var content = '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<!DOCTYPE html>\n' +
      '<html xmlns="http://www.w3.org/1999/xhtml" lang="ko"><head>' +
      '<meta charset="UTF-8"/><title>' + xmlEscape(title) + '</title>' +
      '<style>body{font-family:serif;line-height:1.75;margin:6%;color:#172033}h1,h2,h3{line-height:1.35}table{border-collapse:collapse;width:100%}th,td{border:1px solid #bbb;padding:.45em}pre{white-space:pre-wrap}</style>' +
      '</head><body><h1>' + xmlEscape(title) + '</h1>' +
      bodyXhtml +
      '</body></html>';

    var nav = '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<!DOCTYPE html>\n' +
      '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="ko">' +
      '<head><meta charset="UTF-8"/><title>목차</title></head><body>' +
      '<nav epub:type="toc"><h1>목차</h1><ol><li><a href="content.xhtml">' + xmlEscape(title) + '</a></li></ol></nav>' +
      '</body></html>';

    var zipBytes = buildStoredZip([
      { name: "mimetype", data: "application/epub+zip" },
      { name: "META-INF/container.xml", data: container },
      { name: "OEBPS/content.opf", data: opf },
      { name: "OEBPS/content.xhtml", data: content },
      { name: "OEBPS/nav.xhtml", data: nav }
    ]);

    return new Blob([zipBytes], { type: "application/epub+zip" });
  }

  async function ensureJsZip(ctx) {
    if (!w.JSZip) {
      await ctx.loadScript("https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js");
    }
    if (!w.JSZip) throw new Error("EPUB 압축 해제 라이브러리를 불러오지 못했습니다.");
    return w.JSZip;
  }

  async function ensureMammoth(ctx) {
    if (!w.mammoth) {
      await ctx.loadScript("https://cdn.jsdelivr.net/npm/mammoth@1.12.0/mammoth.browser.min.js");
    }
    if (!w.mammoth) throw new Error("DOCX 읽기 라이브러리를 불러오지 못했습니다.");
    return w.mammoth;
  }

  async function ensureJsPdf(ctx) {
    if (!(w.jspdf && w.jspdf.jsPDF)) {
      await ctx.loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js");
    }
    if (!(w.jspdf && w.jspdf.jsPDF)) throw new Error("PDF 생성 라이브러리를 불러오지 못했습니다.");
    return w.jspdf.jsPDF;
  }

  function resolvePath(baseFile, href) {
    href = String(href || "").split("#")[0].split("?")[0];
    if (!href) return "";
    var base = String(baseFile || "").split("/");
    base.pop();
    var parts = base.concat(href.split("/"));
    var out = [];
    parts.forEach(function (part) {
      if (!part || part === ".") return;
      if (part === "..") out.pop();
      else out.push(part);
    });
    return out.join("/");
  }

  function xmlAttrByLocalName(node, name) {
    if (!node || !node.attributes) return "";
    for (var i = 0; i < node.attributes.length; i += 1) {
      if (node.attributes[i].localName === name || node.attributes[i].name === name) {
        return node.attributes[i].value;
      }
    }
    return "";
  }

  function textFromMarkup(markup) {
    var parsed = new DOMParser().parseFromString(String(markup || ""), "application/xhtml+xml");
    if (parsed.querySelector("parsererror")) {
      parsed = new DOMParser().parseFromString(String(markup || ""), "text/html");
    }

    var root = parsed.body || parsed.documentElement;
    var block = {
      p:1,div:1,h1:1,h2:1,h3:1,h4:1,h5:1,h6:1,li:1,blockquote:1,
      pre:1,tr:1,table:1,section:1,article:1,header:1,footer:1
    };

    function walk(node) {
      if (node.nodeType === 3) return node.nodeValue || "";
      if (node.nodeType !== 1) return "";
      var tag = String(node.localName || node.tagName || "").toLowerCase();
      if (tag === "script" || tag === "style" || tag === "nav") return "";
      var inner = Array.from(node.childNodes || []).map(walk).join("");
      if (tag === "br") return "\n";
      if (tag === "td" || tag === "th") return inner + "\t";
      if (block[tag]) return "\n" + inner + "\n";
      return inner;
    }

    return walk(root)
      .replace(/\t+\n/g, "\n")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  async function extractEpub(file, ctx, onProgress) {
    if (!file || (!/\.epub$/i.test(file.name) && file.type !== "application/epub+zip")) {
      throw new Error("EPUB 파일을 선택해 주세요.");
    }
    if (file.size > 50 * 1024 * 1024) throw new Error("EPUB은 50MB 이하 파일만 처리할 수 있습니다.");

    var JSZip = await ensureJsZip(ctx);
    var zip = await JSZip.loadAsync(file);
    var names = Object.keys(zip.files || {});
    if (names.length > 1500) throw new Error("EPUB 내부 파일이 너무 많습니다.");

    var containerFile = zip.file("META-INF/container.xml");
    if (!containerFile) throw new Error("정상적인 EPUB 구조를 찾지 못했습니다.");
    var containerText = await containerFile.async("text");
    if (containerText.length > 1024 * 1024) throw new Error("EPUB 컨테이너 정보가 비정상적으로 큽니다.");

    var containerXml = new DOMParser().parseFromString(containerText, "application/xml");
    var rootfile = Array.from(containerXml.getElementsByTagName("*")).find(function (node) {
      return node.localName === "rootfile";
    });
    var opfPath = xmlAttrByLocalName(rootfile, "full-path");
    if (!opfPath || !zip.file(opfPath)) throw new Error("EPUB 패키지 파일을 찾지 못했습니다.");

    var opfText = await zip.file(opfPath).async("text");
    if (opfText.length > 5 * 1024 * 1024) throw new Error("EPUB 패키지 정보가 너무 큽니다.");
    var opf = new DOMParser().parseFromString(opfText, "application/xml");
    if (opf.querySelector("parsererror")) throw new Error("EPUB 패키지 XML을 해석하지 못했습니다.");

    var manifest = {};
    Array.from(opf.getElementsByTagName("*")).forEach(function (node) {
      if (node.localName !== "item") return;
      var id = xmlAttrByLocalName(node, "id");
      var href = xmlAttrByLocalName(node, "href");
      var media = xmlAttrByLocalName(node, "media-type");
      if (id && href) manifest[id] = { href: href, media: media };
    });

    var spine = [];
    Array.from(opf.getElementsByTagName("*")).forEach(function (node) {
      if (node.localName !== "itemref") return;
      var idref = xmlAttrByLocalName(node, "idref");
      if (idref) spine.push(idref);
    });
    if (!spine.length) throw new Error("EPUB 읽기 순서를 찾지 못했습니다.");
    if (spine.length > 500) throw new Error("EPUB 챕터가 너무 많습니다.");

    var titleNode = Array.from(opf.getElementsByTagName("*")).find(function (node) {
      return node.localName === "title";
    });
    var title = titleNode ? String(titleNode.textContent || "").trim() : safeBaseName(file.name);

    var chapters = [];
    var totalChars = 0;

    for (var i = 0; i < spine.length; i += 1) {
      if (onProgress) onProgress(i + 1, spine.length);
      var item = manifest[spine[i]];
      if (!item) continue;
      var path = resolvePath(opfPath, item.href);
      var entry = zip.file(path);
      if (!entry) continue;
      var markup = await entry.async("text");
      if (markup.length > 8 * 1024 * 1024) throw new Error("EPUB의 한 챕터가 너무 큽니다.");
      var text = textFromMarkup(markup);
      totalChars += text.length;
      if (totalChars > 1000000) throw new Error("EPUB 본문이 100만 자를 넘습니다.");
      if (text) chapters.push({ path: path, text: text });
    }

    if (!chapters.length) throw new Error("EPUB에서 읽을 수 있는 본문을 찾지 못했습니다.");
    return { title: title || safeBaseName(file.name), chapters: chapters };
  }

  function epubText(result) {
    return result.chapters.map(function (chapter, index) {
      return "===== " + (index + 1) + "장 =====\n" + chapter.text;
    }).join("\n\n");
  }

  function wrapCanvasLine(g, text, maxWidth) {
    var value = String(text || "").replace(/\t/g, "    ");
    if (!value) return [""];
    var chars = Array.from(value);
    var lines = [];
    var current = "";
    var width = 0;
    chars.forEach(function (ch) {
      var cw = g.measureText(ch).width;
      if (current && width + cw > maxWidth) {
        lines.push(current);
        current = ch;
        width = cw;
      } else {
        current += ch;
        width += cw;
      }
    });
    if (current || !lines.length) lines.push(current);
    return lines;
  }

  async function textToPdf(text, title, ctx, onProgress) {
    if (text.length > 700000) throw new Error("PDF 변환은 70만 자 이하 EPUB만 지원합니다.");
    var JsPDF = await ensureJsPdf(ctx);
    var pageW = 1240;
    var pageH = 1754;
    var marginX = 92;
    var marginTop = 105;
    var marginBottom = 105;
    var fontPx = 29;
    var lineHeight = 45;
    var maxWidth = pageW - marginX * 2;

    var measure = d.createElement("canvas");
    var mg = measure.getContext("2d");
    mg.font = fontPx + 'px "Noto Sans KR","Malgun Gothic","Apple SD Gothic Neo",Arial,sans-serif';

    var wrapped = [];
    String(text || "").replace(/\r\n?/g, "\n").split("\n").forEach(function (line) {
      wrapCanvasLine(mg, line, maxWidth).forEach(function (part) { wrapped.push(part); });
    });

    var linesPerPage = Math.max(1, Math.floor((pageH - marginTop - marginBottom) / lineHeight));
    var totalPages = Math.ceil(wrapped.length / linesPerPage) || 1;
    if (totalPages > 300) throw new Error("결과 PDF가 300페이지를 넘습니다.");

    var pdf = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });

    for (var pageIndex = 0; pageIndex < totalPages; pageIndex += 1) {
      if (onProgress) onProgress(pageIndex + 1, totalPages);
      if (pageIndex > 0) pdf.addPage("a4", "portrait");

      var canvas = d.createElement("canvas");
      canvas.width = pageW;
      canvas.height = pageH;
      var g = canvas.getContext("2d");
      g.fillStyle = "#ffffff";
      g.fillRect(0, 0, pageW, pageH);
      g.fillStyle = "#111827";
      g.font = fontPx + 'px "Noto Sans KR","Malgun Gothic","Apple SD Gothic Neo",Arial,sans-serif';
      g.textBaseline = "top";

      var from = pageIndex * linesPerPage;
      var to = Math.min(wrapped.length, from + linesPerPage);
      var y = marginTop;
      for (var i = from; i < to; i += 1) {
        g.fillText(wrapped[i], marginX, y);
        y += lineHeight;
      }

      g.fillStyle = "#8a97a8";
      g.font = "18px Arial,sans-serif";
      g.textAlign = "center";
      g.fillText(String(pageIndex + 1), pageW / 2, pageH - 55);

      pdf.addImage(canvas.toDataURL("image/jpeg", 0.93), "JPEG", 0, 0, 210, 297, undefined, "FAST");
    }

    return pdf;
  }

  async function sourceToEpubXhtml(file, x, ctx) {
    var from = String(x.fromFormat || "").toUpperCase();
    if (from === "TXT") {
      if (file.size > 3 * 1024 * 1024) throw new Error("TXT 파일은 3MB 이하만 처리할 수 있습니다.");
      var text = new TextDecoder("utf-8").decode(await file.arrayBuffer());
      if (text.length > 800000) throw new Error("TXT 내용은 80만 자 이하만 처리할 수 있습니다.");
      return txtToXhtml(text);
    }

    if (from === "HTML") {
      if (file.size > 2 * 1024 * 1024) throw new Error("HTML 파일은 2MB 이하만 처리할 수 있습니다.");
      var html = new TextDecoder("utf-8").decode(await file.arrayBuffer());
      return htmlTextToXhtml(html);
    }

    if (from === "DOCX") {
      if (file.size > 30 * 1024 * 1024) throw new Error("DOCX 파일은 30MB 이하만 처리할 수 있습니다.");
      var mammoth = await ensureMammoth(ctx);
      var result = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
      return htmlTextToXhtml(result.value || "");
    }

    throw new Error("지원하지 않는 EPUB 입력 형식입니다.");
  }

  function openMakeEpub(x, ctx) {
    injectStyle();
    var selectedFile = null;
    var defaultTitle = "";

    ctx.stage.innerHTML =
      '<div class="hm-fx-detail">' +
        '<div class="hm-fx-toolbar"><a class="hm-fx-back" href="' +
          ctx.route({ category: x.category }) +
          '" data-route>← ' + ctx.esc(ctx.cat(x.category).name) + '</a></div>' +
        ctx.titleBlock(x) +
        '<div class="hm-eb-box">' +
          '<div class="hm-eb-drop" data-eb-drop><strong>' + ctx.esc(x.fromFormat) + ' 파일을 선택하거나 끌어다 놓으세요</strong>' +
            '<span>문서 내용을 EPUB 전자책으로 정리합니다.</span><input type="file" hidden data-eb-file accept="' + ctx.esc(x.accept || "") + '"></div>' +
          '<div class="hm-eb-file" data-eb-info></div>' +
          '<div class="hm-eb-options">' +
            '<div class="hm-eb-field"><label>전자책 제목</label><input type="text" maxlength="120" placeholder="책 제목" data-eb-title></div>' +
            '<div class="hm-eb-field"><label>저자</label><input type="text" maxlength="80" value="HealingMart" data-eb-author></div>' +
          '</div>' +
          '<div class="hm-eb-actions"><button class="hm-eb-btn primary" type="button" data-eb-run disabled>EPUB 만들기</button></div>' +
          '<div class="hm-eb-status" data-eb-status>파일은 외부 변환 서버로 전송하지 않고 브라우저에서 처리합니다.</div>' +
          '<div class="hm-eb-note">' +
            (x.fromFormat === "HTML"
              ? "보안을 위해 스크립트·폼·외부 스타일·외부 이미지 등은 제외하고 기본 문서 구조 중심으로 EPUB을 만듭니다."
              : x.fromFormat === "DOCX"
              ? "DOCX의 복잡한 페이지 배치나 머리글·바닥글을 그대로 재현하는 것이 아니라 제목·문단·목록·표 등 내용 구조 중심으로 변환합니다."
              : "TXT의 빈 줄을 문단 구분으로 사용해 EPUB 본문을 만듭니다.") +
          '</div><div class="hm-eb-version">E-book Engine v1.2.1</div>' +
        '</div></div>';

    var drop = ctx.stage.querySelector("[data-eb-drop]");
    var input = ctx.stage.querySelector("[data-eb-file]");
    var info = ctx.stage.querySelector("[data-eb-info]");
    var title = ctx.stage.querySelector("[data-eb-title]");
    var author = ctx.stage.querySelector("[data-eb-author]");
    var run = ctx.stage.querySelector("[data-eb-run]");
    var status = ctx.stage.querySelector("[data-eb-status]");

    function valid(file) {
      var ext = (file.name.match(/\.([^.]+)$/) || [,""])[1].toLowerCase();
      var from = String(x.fromFormat || "").toLowerCase();
      if (from === "html") return ext === "html" || ext === "htm" || file.type === "text/html";
      return ext === from;
    }

    function choose(file) {
      if (!file || !valid(file)) {
        status.textContent = x.fromFormat + " 파일을 선택해 주세요.";
        return;
      }
      selectedFile = file;
      defaultTitle = safeBaseName(file.name);
      title.value = defaultTitle;
      info.style.display = "block";
      info.textContent = file.name + " · " + niceBytes(file.size);
      run.disabled = false;
      status.textContent = "준비되었습니다.";
    }

    drop.onclick = function () { input.click(); };
    drop.ondragover = function (e) { e.preventDefault(); drop.classList.add("is-drag"); };
    drop.ondragleave = function () { drop.classList.remove("is-drag"); };
    drop.ondrop = function (e) { e.preventDefault(); drop.classList.remove("is-drag"); if (e.dataTransfer.files[0]) choose(e.dataTransfer.files[0]); };
    input.onchange = function () { if (input.files[0]) choose(input.files[0]); input.value = ""; };

    run.onclick = async function () {
      if (!selectedFile) return;
      run.disabled = true;
      try {
        status.textContent = "문서 내용을 읽는 중입니다...";
        var body = await sourceToEpubXhtml(selectedFile, x, ctx);
        status.textContent = "EPUB 파일을 만드는 중입니다...";
        var blob = createEpubBlob(title.value || defaultTitle, author.value, body);
        downloadBlob(blob, safeBaseName(title.value || defaultTitle) + ".epub");
        status.textContent = "EPUB 다운로드를 시작했습니다.";
      } catch (error) {
        status.textContent = "EPUB 생성 중 오류가 발생했습니다: " + (error.message || error);
      } finally {
        run.disabled = false;
      }
    };
  }

  function openReadEpub(x, ctx) {
    injectStyle();
    var selectedFile = null;
    var extracted = null;
    var outputValue = "";
    var toPdf = String(x.toFormat || "").toUpperCase() === "PDF";

    ctx.stage.innerHTML =
      '<div class="hm-fx-detail">' +
        '<div class="hm-fx-toolbar"><a class="hm-fx-back" href="' +
          ctx.route({ category: x.category }) +
          '" data-route>← ' + ctx.esc(ctx.cat(x.category).name) + '</a></div>' +
        ctx.titleBlock(x) +
        '<div class="hm-eb-box">' +
          '<div class="hm-eb-drop" data-eb-drop><strong>EPUB 파일을 선택하거나 끌어다 놓으세요</strong>' +
            '<span>전자책의 읽기 순서에 따라 본문을 추출합니다.</span><input type="file" hidden data-eb-file accept=".epub,application/epub+zip"></div>' +
          '<div class="hm-eb-file" data-eb-info></div>' +
          '<div class="hm-eb-actions"><button class="hm-eb-btn primary" type="button" data-eb-run disabled>' +
            (toPdf ? "PDF 만들기" : "텍스트 추출하기") + '</button></div>' +
          '<div class="hm-eb-status" data-eb-status>DRM이 적용되지 않은 일반 EPUB 파일을 대상으로 합니다.</div>' +
          (toPdf ? "" : '<textarea class="hm-eb-output" readonly data-eb-output placeholder="추출 결과가 여기에 표시됩니다."></textarea>' +
          '<div class="hm-eb-output-actions"><button type="button" data-eb-copy disabled>결과 복사</button><button type="button" data-eb-download disabled>TXT 다운로드</button></div>') +
          '<div class="hm-eb-note">' +
            (toPdf
              ? "EPUB의 원래 글꼴·레이아웃을 그대로 재현하는 방식이 아니라 읽기 순서대로 본문 텍스트를 추출해 A4 PDF로 만듭니다. 결과 PDF의 본문은 이미지 기반입니다."
              : "목차 순서가 아니라 EPUB 패키지의 spine 읽기 순서를 기준으로 본문을 추출합니다. DRM 전자책은 처리할 수 없습니다.") +
          '</div><div class="hm-eb-version">E-book Engine v1.2.1</div>' +
        '</div></div>';

    var drop = ctx.stage.querySelector("[data-eb-drop]");
    var input = ctx.stage.querySelector("[data-eb-file]");
    var info = ctx.stage.querySelector("[data-eb-info]");
    var run = ctx.stage.querySelector("[data-eb-run]");
    var status = ctx.stage.querySelector("[data-eb-status]");
    var output = ctx.stage.querySelector("[data-eb-output]");
    var copy = ctx.stage.querySelector("[data-eb-copy]");
    var download = ctx.stage.querySelector("[data-eb-download]");

    function choose(file) {
      if (!file || (!/\.epub$/i.test(file.name) && file.type !== "application/epub+zip")) {
        status.textContent = "EPUB 파일을 선택해 주세요.";
        return;
      }
      selectedFile = file;
      extracted = null;
      outputValue = "";
      info.style.display = "block";
      info.textContent = file.name + " · " + niceBytes(file.size);
      run.disabled = false;
      if (output) output.value = "";
      if (copy) copy.disabled = true;
      if (download) download.disabled = true;
      status.textContent = "준비되었습니다.";
    }

    drop.onclick = function () { input.click(); };
    drop.ondragover = function (e) { e.preventDefault(); drop.classList.add("is-drag"); };
    drop.ondragleave = function () { drop.classList.remove("is-drag"); };
    drop.ondrop = function (e) { e.preventDefault(); drop.classList.remove("is-drag"); if (e.dataTransfer.files[0]) choose(e.dataTransfer.files[0]); };
    input.onchange = function () { if (input.files[0]) choose(input.files[0]); input.value = ""; };

    run.onclick = async function () {
      if (!selectedFile) return;
      run.disabled = true;
      try {
        extracted = await extractEpub(selectedFile, ctx, function (done, total) {
          status.textContent = done + " / " + total + " 챕터 읽는 중...";
        });
        outputValue = epubText(extracted);

        if (toPdf) {
          var pdf = await textToPdf(outputValue, extracted.title, ctx, function (page, total) {
            status.textContent = page + " / " + total + " PDF 페이지 만드는 중...";
          });
          pdf.save(safeBaseName(extracted.title || selectedFile.name) + ".pdf");
          status.textContent = "PDF 다운로드를 시작했습니다.";
        } else {
          output.value = outputValue.length > 200000
            ? outputValue.slice(0, 200000) + "\n\n[미리보기는 앞 20만 자까지만 표시됩니다. 다운로드 파일에는 전체 결과가 들어 있습니다.]"
            : outputValue;
          copy.disabled = false;
          download.disabled = false;
          status.textContent = extracted.chapters.length + "개 챕터의 텍스트를 추출했습니다.";
        }
      } catch (error) {
        status.textContent = "변환 중 오류가 발생했습니다: " + (error.message || error);
      } finally {
        run.disabled = false;
      }
    };

    if (copy) copy.onclick = async function () {
      try {
        await copyText(outputValue);
        status.textContent = "추출 결과를 복사했습니다.";
      } catch (error) {
        status.textContent = "자동 복사를 지원하지 않는 환경입니다. 결과 영역에서 직접 복사해 주세요.";
      }
    };

    if (download) download.onclick = function () {
      if (!outputValue || !selectedFile) return;
      downloadBlob(new Blob([outputValue], { type: "text/plain;charset=utf-8" }), safeBaseName(extracted && extracted.title ? extracted.title : selectedFile.name) + ".txt");
      status.textContent = "TXT 다운로드를 시작했습니다.";
    };
  }


  async function ensurePdfJs(ctx) {
    if (!w.pdfjsLib) {
      await ctx.loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js");
    }
    if (!w.pdfjsLib) throw new Error("PDF 읽기 라이브러리를 불러오지 못했습니다.");
    w.pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    return w.pdfjsLib;
  }

  function pdfItemsToText(items) {
    var rows = (items || []).map(function (item) {
      var tr = item.transform || [1,0,0,1,0,0];
      return {
        text: String(item.str || ""),
        x: Number(tr[4]) || 0,
        y: Number(tr[5]) || 0,
        width: Number(item.width) || 0
      };
    }).filter(function (item) { return item.text; });

    rows.sort(function (a, b) {
      var dy = b.y - a.y;
      if (Math.abs(dy) > 2.5) return dy;
      return a.x - b.x;
    });

    var lines = [];
    rows.forEach(function (item) {
      var line = null;
      for (var i = lines.length - 1; i >= 0; i -= 1) {
        if (Math.abs(lines[i].y - item.y) <= 2.5) {
          line = lines[i];
          break;
        }
        if (lines[i].y - item.y > 8) break;
      }
      if (!line) {
        line = { y:item.y, items:[] };
        lines.push(line);
      }
      line.items.push(item);
    });

    lines.sort(function (a, b) { return b.y - a.y; });

    return lines.map(function (line) {
      line.items.sort(function (a, b) { return a.x - b.x; });
      var out = "";
      var prev = null;
      line.items.forEach(function (item) {
        if (prev !== null && item.x - prev > 2 && !/\s$/.test(out) && !/^\s/.test(item.text)) out += " ";
        out += item.text;
        prev = item.x + item.width;
      });
      return out.trim();
    }).filter(Boolean).join("\n");
  }

  async function openPdfEpub(x, ctx) {
    injectStyle();

    var selectedFile = null;

    ctx.stage.innerHTML =
      '<div class="hm-fx-detail">' +
        '<div class="hm-fx-toolbar"><a class="hm-fx-back" href="' +
          ctx.route({ category:x.category }) +
          '" data-route>← ' + ctx.esc(ctx.cat(x.category).name) + '</a></div>' +
        ctx.titleBlock(x) +
        '<div class="hm-eb-box">' +
          '<div class="hm-eb-drop" data-pe-drop><strong>PDF 파일을 선택하거나 끌어다 놓으세요</strong>' +
            '<span>선택 가능한 텍스트를 읽어 EPUB 전자책으로 만듭니다.</span>' +
            '<input type="file" hidden data-pe-file accept=".pdf,application/pdf"></div>' +
          '<div class="hm-eb-file" data-pe-info></div>' +
          '<div class="hm-eb-options">' +
            '<div class="hm-eb-field"><label>전자책 제목</label><input type="text" maxlength="120" placeholder="책 제목" data-pe-title></div>' +
            '<div class="hm-eb-field"><label>저자</label><input type="text" maxlength="80" value="HealingMart" data-pe-author></div>' +
          '</div>' +
          '<div class="hm-eb-actions"><button class="hm-eb-btn primary" type="button" data-pe-run disabled>EPUB 만들기</button></div>' +
          '<div class="hm-eb-status" data-pe-status>스캔 이미지 PDF는 OCR이 필요하므로 텍스트가 추출되지 않을 수 있습니다.</div>' +
          '<div class="hm-eb-note">PDF의 페이지 레이아웃을 EPUB에서 그대로 복제하는 방식이 아니라, 선택 가능한 텍스트를 페이지 순서대로 전자책 본문으로 구성합니다.</div>' +
          '<div class="hm-eb-version">E-book Engine v1.2.1</div>' +
        '</div></div>';

    var drop = ctx.stage.querySelector("[data-pe-drop]");
    var input = ctx.stage.querySelector("[data-pe-file]");
    var info = ctx.stage.querySelector("[data-pe-info]");
    var title = ctx.stage.querySelector("[data-pe-title]");
    var author = ctx.stage.querySelector("[data-pe-author]");
    var run = ctx.stage.querySelector("[data-pe-run]");
    var status = ctx.stage.querySelector("[data-pe-status]");

    function choose(file) {
      if (!file || !/\.pdf$/i.test(file.name)) {
        selectedFile = null;
        run.disabled = true;
        status.textContent = "PDF 파일을 선택해 주세요.";
        return;
      }
      if (file.size > 60 * 1024 * 1024) {
        selectedFile = null;
        run.disabled = true;
        status.textContent = "PDF 파일은 60MB 이하만 처리할 수 있습니다.";
        return;
      }
      selectedFile = file;
      title.value = safeBaseName(file.name);
      info.style.display = "block";
      info.textContent = file.name + " · " + niceBytes(file.size);
      run.disabled = false;
      status.textContent = "준비되었습니다.";
    }

    drop.onclick = function () { input.click(); };
    drop.ondragover = function (e) { e.preventDefault(); drop.classList.add("is-drag"); };
    drop.ondragleave = function () { drop.classList.remove("is-drag"); };
    drop.ondrop = function (e) {
      e.preventDefault();
      drop.classList.remove("is-drag");
      if (e.dataTransfer.files[0]) choose(e.dataTransfer.files[0]);
    };
    input.onchange = function () {
      if (input.files[0]) choose(input.files[0]);
      input.value = "";
    };

    run.onclick = async function () {
      if (!selectedFile) return;
      run.disabled = true;

      try {
        var pdfjs = await ensurePdfJs(ctx);
        var pdf = await pdfjs.getDocument({ data:await selectedFile.arrayBuffer() }).promise;

        if (pdf.numPages > 300) {
          if (pdf.destroy) await pdf.destroy();
          throw new Error("PDF는 최대 300페이지까지 EPUB으로 변환할 수 있습니다.");
        }

        var body = "";
        var chars = 0;

        for (var i = 1; i <= pdf.numPages; i += 1) {
          status.textContent = i + " / " + pdf.numPages + " 페이지 텍스트 읽는 중...";
          var page = await pdf.getPage(i);
          var tc = await page.getTextContent({ normalizeWhitespace:true });
          var text = pdfItemsToText(tc.items);
          chars += text.replace(/\s/g, "").length;

          body += "<h2>" + i + "페이지</h2>";
          String(text || "").split(/\n{2,}/).forEach(function (part) {
            if (part.trim()) body += "<p>" + xmlEscape(part.trim()).replace(/\n/g, "<br/>") + "</p>";
          });

          if (page.cleanup) page.cleanup();
        }

        if (pdf.destroy) await pdf.destroy();

        if (chars < 10) throw new Error("추출된 텍스트가 거의 없습니다. 스캔 PDF라면 OCR이 필요합니다.");
        if (chars > 1000000) throw new Error("PDF 본문이 100만 자를 넘습니다.");

        status.textContent = "EPUB 패키지를 만드는 중입니다...";
        var blob = createEpubBlob(title.value || safeBaseName(selectedFile.name), author.value, body);
        downloadBlob(blob, safeBaseName(title.value || selectedFile.name) + ".epub");
        status.textContent = "EPUB 다운로드를 시작했습니다.";
      } catch (error) {
        status.textContent = "EPUB 생성 중 오류가 발생했습니다: " + (error.message || error);
      } finally {
        run.disabled = false;
      }
    };
  }


  var mobiParserPromise = null;

  async function ensureMobiParser() {
    if (!mobiParserPromise) {
      mobiParserPromise = import(
        "https://esm.sh/@lingo-reader/mobi-parser@0.4.6?bundle"
      ).then(function (mod) {
        if (
          !mod ||
          typeof mod.initMobiFile !== "function" ||
          typeof mod.initKf8File !== "function"
        ) {
          throw new Error("Kindle 전자책 파서를 불러오지 못했습니다.");
        }
        return mod;
      }).catch(function (error) {
        mobiParserPromise = null;
        throw error;
      });
    }

    return mobiParserPromise;
  }

  function kindleMimeExt(type) {
    type = String(type || "").toLowerCase();
    if (type.indexOf("png") >= 0) return { ext:"png", mime:"image/png" };
    if (type.indexOf("webp") >= 0) return { ext:"webp", mime:"image/webp" };
    if (type.indexOf("gif") >= 0) return { ext:"gif", mime:"image/gif" };
    if (type.indexOf("svg") >= 0) return { ext:"svg", mime:"image/svg+xml" };
    return { ext:"jpg", mime:"image/jpeg" };
  }

  function kindleMetadata(parser, file) {
    var meta = {};
    try { meta = parser.getMetadata() || {}; } catch (e) {}

    return {
      title:String(meta.title || safeBaseName(file.name) || "Kindle 전자책").trim(),
      author:Array.isArray(meta.author) ? meta.author.filter(Boolean).join(", ") : String(meta.author || ""),
      language:String(meta.language || "ko").trim() || "ko",
      publisher:String(meta.publisher || "").trim(),
      description:String(meta.description || "").trim()
    };
  }

  async function initKindleParser(file, format) {
    if (!file) throw new Error(format + " 파일을 선택해 주세요.");
    if (file.size > 80 * 1024 * 1024) {
      throw new Error("Kindle 전자책은 80MB 이하 파일만 처리할 수 있습니다.");
    }

    var name = String(file.name || "").toLowerCase();
    if (format === "MOBI" && !name.endsWith(".mobi")) {
      throw new Error("MOBI 파일을 선택해 주세요.");
    }
    if (format === "AZW3" && !name.endsWith(".azw3")) {
      throw new Error("AZW3 파일을 선택해 주세요.");
    }

    var mod = await ensureMobiParser();

    try {
      return format === "AZW3"
        ? await mod.initKf8File(file)
        : await mod.initMobiFile(file);
    } catch (error) {
      throw new Error(
        "전자책을 읽지 못했습니다. 파일이 손상되었거나 DRM/암호화가 적용된 Kindle 파일일 수 있습니다."
      );
    }
  }

  function cleanKindleTextHtml(html) {
    var doc = new DOMParser().parseFromString(String(html || ""), "text/html");

    doc.querySelectorAll(
      "script,style,link,iframe,frame,object,embed,form,input,button,textarea,select,option,video,audio,canvas,noscript,template"
    ).forEach(function (node) {
      node.remove();
    });

    return doc.body ? doc.body.innerHTML : String(html || "");
  }

  function kindleChapterText(html) {
    return textFromMarkup(cleanKindleTextHtml(html));
  }

  async function readKindleBook(file, format, onProgress) {
    var parser = await initKindleParser(file, format);

    try {
      var spine = parser.getSpine ? parser.getSpine() : [];

      if (!Array.isArray(spine) || !spine.length) {
        throw new Error("전자책의 읽기 순서를 찾지 못했습니다.");
      }
      if (spine.length > 500) {
        throw new Error("전자책 챕터가 500개를 넘습니다.");
      }

      var meta = kindleMetadata(parser, file);
      var chapters = [];
      var totalChars = 0;

      for (var i = 0; i < spine.length; i += 1) {
        if (onProgress) onProgress(i + 1, spine.length);

        var item = spine[i];
        var processed = parser.loadChapter(item.id);

        if (!processed || !String(processed.html || "").trim()) continue;

        var html = cleanKindleTextHtml(processed.html);
        var text = kindleChapterText(html);

        totalChars += text.length;
        if (totalChars > 1200000) {
          throw new Error("전자책 본문이 120만 자를 넘습니다.");
        }

        chapters.push({
          id:String(item.id || "chapter-" + (i + 1)),
          html:html,
          text:text
        });
      }

      if (!chapters.length) {
        throw new Error("전자책에서 읽을 수 있는 본문을 찾지 못했습니다.");
      }

      return {
        parser:parser,
        metadata:meta,
        chapters:chapters
      };
    } catch (error) {
      try { if (parser && parser.destroy) parser.destroy(); } catch (e) {}
      throw error;
    }
  }

  function kindleBookText(book) {
    return book.chapters.map(function (chapter, index) {
      return "===== " + (index + 1) + "장 =====\n" + String(chapter.text || "");
    }).join("\n\n");
  }

  function sanitizeKindleElement(node, resourceMap) {
    if (!node) return "";

    if (node.nodeType === 3) {
      return xmlEscape(node.nodeValue || "");
    }

    if (node.nodeType !== 1) return "";

    var tag = String(node.tagName || "").toLowerCase();

    if (
      tag === "script" || tag === "style" || tag === "link" ||
      tag === "iframe" || tag === "frame" || tag === "object" ||
      tag === "embed" || tag === "form" || tag === "input" ||
      tag === "button" || tag === "textarea" || tag === "select" ||
      tag === "option" || tag === "video" || tag === "audio" ||
      tag === "canvas" || tag === "noscript" || tag === "template"
    ) {
      return "";
    }

    if (tag === "img") {
      var src = String(node.getAttribute("src") || "");
      var alt = String(node.getAttribute("alt") || "").trim();
      var mapped = resourceMap[src];

      if (mapped) {
        return '<img src="../images/' + mapped.name + '" alt="' + xmlEscape(alt) + '"/>';
      }

      return alt ? "<p>[이미지: " + xmlEscape(alt) + "]</p>" : "";
    }

    var allowed = {
      h1:1,h2:1,h3:1,h4:1,h5:1,h6:1,
      p:1,ul:1,ol:1,li:1,blockquote:1,pre:1,code:1,
      strong:1,em:1,b:1,i:1,table:1,thead:1,tbody:1,tfoot:1,
      tr:1,th:1,td:1,br:1,hr:1,section:1,article:1,div:1,span:1,a:1
    };

    var inner = Array.from(node.childNodes || []).map(function (child) {
      return sanitizeKindleElement(child, resourceMap);
    }).join("");

    if (!allowed[tag]) return inner;
    if (tag === "div" || tag === "span" || tag === "section" || tag === "article") return inner;
    if (tag === "b") tag = "strong";
    if (tag === "i") tag = "em";

    if (tag === "br" || tag === "hr") return "<" + tag + "/>";

    if (tag === "a") {
      return "<span>" + inner + "</span>";
    }

    return "<" + tag + ">" + inner + "</" + tag + ">";
  }

  async function collectKindleImages(book, onProgress) {
    var urls = {};

    book.chapters.forEach(function (chapter) {
      var doc = new DOMParser().parseFromString(String(chapter.html || ""), "text/html");
      doc.querySelectorAll("img").forEach(function (img) {
        var src = String(img.getAttribute("src") || "");
        if (/^(blob:|data:image\/)/i.test(src)) urls[src] = true;
      });
    });

    var list = Object.keys(urls).slice(0, 200);
    var map = {};
    var resources = [];
    var totalBytes = 0;

    for (var i = 0; i < list.length; i += 1) {
      if (onProgress) onProgress(i + 1, list.length);

      var src = list[i];

      try {
        var response = await fetch(src);
        var blob = await response.blob();

        if (!blob || !blob.size) continue;

        totalBytes += blob.size;
        if (totalBytes > 60 * 1024 * 1024) {
          throw new Error("전자책 이미지 리소스가 60MB를 넘습니다.");
        }

        var info = kindleMimeExt(blob.type);
        var name = "image-" + String(resources.length + 1).padStart(3, "0") + "." + info.ext;

        var item = {
          name:name,
          blob:blob,
          mime:info.mime,
          id:"img" + (resources.length + 1)
        };

        resources.push(item);
        map[src] = item;
      } catch (error) {
        if (/60MB/.test(String(error && error.message || error))) throw error;
      }
    }

    return {
      map:map,
      resources:resources
    };
  }

  async function createKindleEpub(book, ctx, onProgress) {
    var JSZip = await ensureJsZip(ctx);
    var zip = new JSZip();

    var imagePack = await collectKindleImages(book, function (done, total) {
      if (onProgress) onProgress("이미지 " + done + " / " + total + " 처리 중...");
    });

    var chapters = [];

    for (var i = 0; i < book.chapters.length; i += 1) {
      if (onProgress) onProgress((i + 1) + " / " + book.chapters.length + " EPUB 챕터 만드는 중...");

      var doc = new DOMParser().parseFromString(book.chapters[i].html, "text/html");
      var body = Array.from((doc.body || doc.documentElement).childNodes || []).map(function (node) {
        return sanitizeKindleElement(node, imagePack.map);
      }).join("");

      if (!body.trim()) {
        body = "<p>" + xmlEscape(book.chapters[i].text || "") + "</p>";
      }

      var fileName = "chapter-" + String(i + 1).padStart(3, "0") + ".xhtml";

      var xhtml =
        '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<!DOCTYPE html>\n' +
        '<html xmlns="http://www.w3.org/1999/xhtml" lang="' + xmlEscape(book.metadata.language || "ko") + '">' +
        '<head><meta charset="UTF-8"/><title>' +
        xmlEscape(book.metadata.title || "전자책") +
        '</title><style>body{font-family:serif;line-height:1.75;margin:6%;color:#172033}img{max-width:100%;height:auto}table{border-collapse:collapse;width:100%}th,td{border:1px solid #bbb;padding:.45em}pre{white-space:pre-wrap}</style></head>' +
        '<body>' + body + '</body></html>';

      chapters.push({
        id:"c" + (i + 1),
        fileName:fileName,
        xhtml:xhtml
      });
    }

    var id = uuidLike();
    var title = book.metadata.title || "Kindle 전자책";
    var author = book.metadata.author || "Unknown";
    var language = book.metadata.language || "ko";

    var manifestChapters = chapters.map(function (c) {
      return '<item id="' + c.id + '" href="text/' + c.fileName + '" media-type="application/xhtml+xml"/>';
    }).join("");

    var manifestImages = imagePack.resources.map(function (r) {
      return '<item id="' + r.id + '" href="images/' + r.name + '" media-type="' + r.mime + '"/>';
    }).join("");

    var spine = chapters.map(function (c) {
      return '<itemref idref="' + c.id + '"/>';
    }).join("");

    var navItems = chapters.map(function (c, index) {
      return '<li><a href="text/' + c.fileName + '">' + (index + 1) + '장</a></li>';
    }).join("");

    var container =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">' +
      '<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>' +
      '</container>';

    var opf =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">' +
      '<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">' +
      '<dc:identifier id="bookid">' + xmlEscape(id) + '</dc:identifier>' +
      '<dc:title>' + xmlEscape(title) + '</dc:title>' +
      '<dc:creator>' + xmlEscape(author) + '</dc:creator>' +
      '<dc:language>' + xmlEscape(language) + '</dc:language>' +
      '<meta property="dcterms:modified">2026-07-22T00:00:00Z</meta>' +
      '</metadata><manifest>' +
      manifestChapters +
      manifestImages +
      '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>' +
      '</manifest><spine>' + spine + '</spine></package>';

    var nav =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="' +
      xmlEscape(language) +
      '"><head><meta charset="UTF-8"/><title>목차</title></head><body>' +
      '<nav epub:type="toc"><h1>목차</h1><ol>' + navItems + '</ol></nav>' +
      '</body></html>';

    zip.file("mimetype", "application/epub+zip", { compression:"STORE" });
    zip.file("META-INF/container.xml", container);
    zip.file("OEBPS/content.opf", opf);
    zip.file("OEBPS/nav.xhtml", nav);

    chapters.forEach(function (c) {
      zip.file("OEBPS/text/" + c.fileName, c.xhtml);
    });

    imagePack.resources.forEach(function (r) {
      zip.file("OEBPS/images/" + r.name, r.blob);
    });

    return await zip.generateAsync({
      type:"blob",
      mimeType:"application/epub+zip",
      compression:"DEFLATE",
      compressionOptions:{ level:6 }
    });
  }

  function kindleReadNote(format, output) {
    if (output === "EPUB") {
      return format + "의 읽기 순서와 기본 이미지 리소스를 읽어 EPUB3으로 다시 구성합니다. 원본의 Kindle 전용 CSS·고급 고정 레이아웃·특수 기능은 단순화될 수 있습니다. DRM/암호화 전자책은 처리하지 않습니다.";
    }

    return format + "의 본문을 읽기 순서대로 추출해 A4 PDF로 만듭니다. Kindle 원본 화면을 그대로 인쇄하는 방식이 아니며 결과 PDF 본문은 이미지 기반입니다. DRM/암호화 전자책은 처리하지 않습니다.";
  }

  function openKindleRead(x, ctx) {
    injectStyle();

    var selectedFile = null;
    var format = String(x.fromFormat || "").toUpperCase();
    var output = String(x.toFormat || "").toUpperCase();

    ctx.stage.innerHTML =
      '<div class="hm-fx-detail">' +
        '<div class="hm-fx-toolbar"><a class="hm-fx-back" href="' +
          ctx.route({ category:x.category }) +
          '" data-route>← ' + ctx.esc(ctx.cat(x.category).name) + '</a></div>' +
        ctx.titleBlock(x) +
        '<div class="hm-eb-box">' +
          '<div class="hm-eb-drop" data-kr-drop><strong>' + ctx.esc(format) + ' 파일을 선택하거나 끌어다 놓으세요</strong>' +
            '<span>DRM이 없는 Kindle 전자책의 읽기 순서와 본문을 브라우저에서 분석합니다.</span>' +
            '<input type="file" hidden data-kr-file accept="' + ctx.esc(x.accept || "") + '"></div>' +
          '<div class="hm-eb-file" data-kr-info></div>' +
          '<div class="hm-eb-actions"><button class="hm-eb-btn primary" type="button" data-kr-run disabled>' +
            ctx.esc(output + " 만들기") +
          '</button></div>' +
          '<div class="hm-eb-status" data-kr-status>첫 실행 시 @lingo-reader/mobi-parser 0.4.6 브라우저 모듈을 불러옵니다. 파일은 외부 변환 서버로 업로드하지 않습니다.</div>' +
          '<div class="hm-eb-note">' + ctx.esc(kindleReadNote(format, output)) + '</div>' +
          '<div class="hm-eb-note">Amazon DRM을 제거하거나 우회하는 기능은 포함하지 않습니다. DRM이 적용된 파일은 변환하지 못합니다.</div>' +
          '<div class="hm-eb-version">E-book Engine v1.2.1 · mobi-parser 0.4.6</div>' +
        '</div>' +
      '</div>';

    var drop = ctx.stage.querySelector("[data-kr-drop]");
    var input = ctx.stage.querySelector("[data-kr-file]");
    var info = ctx.stage.querySelector("[data-kr-info]");
    var run = ctx.stage.querySelector("[data-kr-run]");
    var status = ctx.stage.querySelector("[data-kr-status]");

    function valid(file) {
      var name = String(file && file.name || "").toLowerCase();
      if (format === "MOBI") return name.endsWith(".mobi");
      if (format === "AZW3") return name.endsWith(".azw3");
      return false;
    }

    function choose(file) {
      if (!valid(file)) {
        selectedFile = null;
        run.disabled = true;
        status.textContent = format + " 파일을 선택해 주세요.";
        return;
      }

      if (file.size > 80 * 1024 * 1024) {
        selectedFile = null;
        run.disabled = true;
        status.textContent = "Kindle 전자책은 80MB 이하 파일만 처리할 수 있습니다.";
        return;
      }

      selectedFile = file;
      info.style.display = "block";
      info.textContent = file.name + " · " + niceBytes(file.size);
      run.disabled = false;
      status.textContent = "준비되었습니다.";
    }

    drop.onclick = function () { input.click(); };
    drop.ondragover = function (e) {
      e.preventDefault();
      drop.classList.add("is-drag");
    };
    drop.ondragleave = function () {
      drop.classList.remove("is-drag");
    };
    drop.ondrop = function (e) {
      e.preventDefault();
      drop.classList.remove("is-drag");
      if (e.dataTransfer.files[0]) choose(e.dataTransfer.files[0]);
    };
    input.onchange = function () {
      if (input.files[0]) choose(input.files[0]);
      input.value = "";
    };

    run.onclick = async function () {
      if (!selectedFile) return;

      run.disabled = true;
      var book = null;

      try {
        status.textContent = "Kindle 전자책 파서를 준비하는 중입니다...";

        book = await readKindleBook(selectedFile, format, function (done, total) {
          status.textContent = done + " / " + total + " 챕터 읽는 중...";
        });

        var base = safeBaseName(book.metadata.title || selectedFile.name);

        if (output === "EPUB") {
          status.textContent = "EPUB 리소스를 구성하는 중입니다...";

          var epubBlob = await createKindleEpub(book, ctx, function (message) {
            status.textContent = message;
          });

          downloadBlob(epubBlob, base + ".epub");
          status.textContent = book.chapters.length + "개 챕터를 EPUB으로 변환했습니다.";
        } else if (output === "PDF") {
          var text = kindleBookText(book);

          var pdf = await textToPdf(text, book.metadata.title, ctx, function (page, total) {
            status.textContent = page + " / " + total + " PDF 페이지 만드는 중...";
          });

          pdf.save(base + ".pdf");
          status.textContent = "PDF 다운로드를 시작했습니다.";
        } else {
          throw new Error("지원하지 않는 Kindle 출력 형식입니다.");
        }
      } catch (error) {
        status.textContent = "변환 중 오류가 발생했습니다: " + (error.message || error);
      } finally {
        if (book && book.parser && book.parser.destroy) {
          try { book.parser.destroy(); } catch (e) {}
        }
        run.disabled = false;
      }
    };
  }

  NS.ebook = {
    version: "1.2.1",
    open: function (x, ctx) {
      if (x.engine === "kindle-read") return openKindleRead(x, ctx);
      if (x.engine === "pdf-epub-text") return openPdfEpub(x, ctx);
      if (String(x.toFormat || "").toUpperCase() === "EPUB") return openMakeEpub(x, ctx);
      if (String(x.fromFormat || "").toUpperCase() === "EPUB") return openReadEpub(x, ctx);
      throw new Error("지원하지 않는 전자책 변환입니다.");
    }
  };
})(window);
