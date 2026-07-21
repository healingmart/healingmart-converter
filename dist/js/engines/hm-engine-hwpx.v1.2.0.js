/*
 * HealingMart Converter HWP/HWPX Engine v1.2.0
 * HWPX -> TXT / HTML / PDF / DOCX
 */
(function (w) {
  "use strict";

  var d = w.document;
  var NS = w.HM_CONVERTER_ENGINES = w.HM_CONVERTER_ENGINES || {};

  function injectStyle() {
    if (d.getElementById("hm-engine-hwpx-style-v1")) return;
    var style = d.createElement("style");
    style.id = "hm-engine-hwpx-style-v1";
    style.textContent = [
      ".hm-hx-box{padding:22px;border:1px solid #dfe6ef;border-radius:20px;background:#fff;box-shadow:0 12px 34px rgba(15,23,42,.07)}",
      ".hm-hx-drop{padding:34px 18px;border:2px dashed #aebff0;border-radius:17px;background:#f8fbff;text-align:center;cursor:pointer;transition:.16s ease}",
      ".hm-hx-drop:hover,.hm-hx-drop.is-drag{border-color:#2f7cf6;background:#fff}",
      ".hm-hx-drop strong{display:block;color:#13253a;font-size:18px;font-weight:950}",
      ".hm-hx-drop span{display:block;margin-top:5px;color:#5d6d83;font-size:13px;line-height:1.55}",
      ".hm-hx-file{display:none;margin-top:12px;padding:11px 12px;border:1px solid #e0e7ef;border-radius:11px;background:#fbfdff;color:#405269;font-size:12px;font-weight:850}",
      ".hm-hx-actions{display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin-top:16px}",
      ".hm-hx-btn{min-height:46px;padding:0 17px;border:1px solid #d6e0ea;border-radius:11px;background:#fff;color:#223248;font-size:13px;font-weight:900;cursor:pointer}",
      ".hm-hx-btn.primary{color:#fff;border-color:#4d69e8;background:linear-gradient(135deg,#6d5dfc,#2f7cf6);box-shadow:0 8px 20px rgba(71,91,229,.22)}",
      ".hm-hx-btn:disabled{opacity:.48;cursor:not-allowed}",
      ".hm-hx-status{margin-top:13px;padding:12px;border-radius:11px;background:#f4f7fb;color:#4d5d73;font-size:12px;line-height:1.65}",
      ".hm-hx-note{margin-top:12px;padding:11px 12px;border:1px solid #e4eaf1;border-radius:11px;background:#fbfdff;color:#607087;font-size:11px;line-height:1.65}",
      ".hm-hx-output{width:100%;min-height:260px;margin-top:14px;padding:15px;border:1px solid #d9e2ec;border-radius:12px;background:#fbfdff;color:#18283c;font:500 14px/1.75 ui-monospace,SFMono-Regular,Consolas,monospace;resize:vertical;outline:none}",
      ".hm-hx-output-actions{display:flex;justify-content:flex-end;gap:7px;flex-wrap:wrap;margin-top:9px}",
      ".hm-hx-output-actions button{display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:0 13px;border:1px solid #d7e0ea;border-radius:10px;background:#fff;color:#32455c;font-size:11px;font-weight:900;cursor:pointer}",
      ".hm-hx-version{margin-top:10px;color:#8a97a8;font-size:10px;text-align:right}",
      "@media(max-width:760px){.hm-hx-box{padding:13px 9px;border-radius:15px}.hm-hx-drop{padding:27px 10px}.hm-hx-output{min-height:220px;font-size:13px}.hm-hx-output-actions{justify-content:stretch}.hm-hx-output-actions button{flex:1 1 auto}}"
    ].join("");
    d.head.appendChild(style);
  }

  function safeBaseName(name) {
    return String(name || "document").replace(/\.[^.]+$/, "").replace(/[\\/:*?"<>|]+/g, "_");
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

  async function ensureJsZip(ctx) {
    if (!w.JSZip) {
      await ctx.loadScript("https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js");
    }
    if (!w.JSZip) throw new Error("HWPX 압축 해제 라이브러리를 불러오지 못했습니다.");
    return w.JSZip;
  }

  async function ensureJsPdf(ctx) {
    if (!(w.jspdf && w.jspdf.jsPDF)) {
      await ctx.loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js");
    }
    if (!(w.jspdf && w.jspdf.jsPDF)) throw new Error("PDF 생성 라이브러리를 불러오지 못했습니다.");
    return w.jspdf.jsPDF;
  }

  function localName(node) {
    return String((node && (node.localName || node.tagName)) || "").split(":").pop().toLowerCase();
  }

  function parseXml(text, label) {
    var xml = new DOMParser().parseFromString(String(text || ""), "application/xml");
    if (xml.querySelector("parsererror")) {
      throw new Error((label || "XML") + "을 해석하지 못했습니다.");
    }
    return xml;
  }

  function attrLocal(node, name) {
    if (!node || !node.attributes) return "";
    for (var i = 0; i < node.attributes.length; i += 1) {
      var a = node.attributes[i];
      if (a.localName === name || a.name === name) return a.value;
    }
    return "";
  }

  function descendantsByLocal(root, name) {
    return Array.from(root.getElementsByTagName("*")).filter(function (node) {
      return localName(node) === name;
    });
  }

  function normalizePath(baseFile, href) {
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

  function textNodesInside(node, skipTables) {
    var out = [];
    function walk(n) {
      if (!n) return;
      if (n.nodeType === 1 && skipTables && localName(n) === "tbl") return;
      if (n.nodeType === 1 && localName(n) === "t") {
        out.push(String(n.textContent || ""));
        return;
      }
      Array.from(n.childNodes || []).forEach(walk);
    }
    walk(node);
    return out.join("");
  }

  function paragraphText(node) {
    return textNodesInside(node, true)
      .replace(/\u0000/g, "")
      .replace(/[ \t]+\n/g, "\n")
      .trim();
  }

  function cellText(tc) {
    var paragraphs = descendantsByLocal(tc, "p");
    var values = paragraphs.map(function (p) {
      return textNodesInside(p, false).replace(/\u0000/g, "").trim();
    }).filter(Boolean);
    if (values.length) return values.join("\n");
    return textNodesInside(tc, false).replace(/\u0000/g, "").trim();
  }

  function parseTable(tbl) {
    var rows = [];
    var trs = descendantsByLocal(tbl, "tr");
    trs.forEach(function (tr) {
      var cells = Array.from(tr.children || []).filter(function (child) {
        return localName(child) === "tc";
      });
      if (!cells.length) {
        cells = descendantsByLocal(tr, "tc");
      }
      var row = cells.map(cellText);
      if (row.length) rows.push(row);
    });
    return rows;
  }

  function sectionBlocks(xml) {
    var blocks = [];

    function processTable(tbl) {
      var rows = parseTable(tbl);
      if (rows.length) blocks.push({ type: "table", rows: rows });
    }

    function walk(node, inTable) {
      if (!node || node.nodeType !== 1) return;
      var tag = localName(node);

      if (tag === "tbl") {
        processTable(node);
        return;
      }

      if (tag === "p" && !inTable) {
        var text = paragraphText(node);
        if (text) blocks.push({ type: "p", text: text });

        Array.from(node.children || []).forEach(function (child) {
          if (localName(child) === "tbl") processTable(child);
          else descendantsByLocal(child, "tbl").forEach(processTable);
        });
        return;
      }

      Array.from(node.children || []).forEach(function (child) {
        walk(child, inTable || tag === "tbl");
      });
    }

    walk(xml.documentElement, false);
    return blocks;
  }

  async function sectionPaths(zip) {
    var hpfEntry = zip.file("Contents/content.hpf");
    if (hpfEntry) {
      try {
        var hpf = parseXml(await hpfEntry.async("text"), "content.hpf");
        var manifest = {};
        descendantsByLocal(hpf, "item").forEach(function (item) {
          var id = attrLocal(item, "id");
          var href = attrLocal(item, "href");
          var media = attrLocal(item, "media-type");
          if (id && href) manifest[id] = { href: href, media: media };
        });

        var ordered = [];
        descendantsByLocal(hpf, "itemref").forEach(function (ref) {
          var idref = attrLocal(ref, "idref");
          var item = manifest[idref];
          if (!item) return;
          var path = normalizePath("Contents/content.hpf", item.href);
          if (/^Contents\/section\d+\.xml$/i.test(path) && zip.file(path)) ordered.push(path);
        });

        if (ordered.length) return ordered;
      } catch (e) {}
    }

    return Object.keys(zip.files || {})
      .filter(function (name) { return /^Contents\/section\d+\.xml$/i.test(name); })
      .sort(function (a, b) {
        var an = Number((a.match(/section(\d+)/i) || [0,0])[1]);
        var bn = Number((b.match(/section(\d+)/i) || [0,0])[1]);
        return an - bn;
      });
  }

  async function parseHwpx(file, ctx, onProgress) {
    if (!file || !/\.hwpx$/i.test(file.name)) throw new Error("HWPX 파일을 선택해 주세요.");
    if (file.size > 50 * 1024 * 1024) throw new Error("HWPX는 50MB 이하 파일만 처리할 수 있습니다.");

    var JSZip = await ensureJsZip(ctx);
    var zip = await JSZip.loadAsync(file);
    var names = Object.keys(zip.files || {});
    if (names.length > 2000) throw new Error("HWPX 내부 파일이 너무 많습니다.");

    var mimetype = zip.file("mimetype");
    if (mimetype) {
      var mime = String(await mimetype.async("text")).trim();
      if (mime && mime !== "application/hwp+zip") {
        throw new Error("HWPX mimetype 정보가 올바르지 않습니다.");
      }
    }

    var paths = await sectionPaths(zip);
    if (!paths.length) {
      var preview = zip.file("Preview/PrvText.txt");
      if (preview) {
        var fallback = await preview.async("text");
        if (fallback.trim()) {
          return {
            blocks: fallback.replace(/\r\n?/g, "\n").split(/\n{2,}/).map(function (t) {
              return { type: "p", text: t.trim() };
            }).filter(function (b) { return b.text; }),
            sections: 0,
            fallback: true
          };
        }
      }
      throw new Error("HWPX 본문 section XML을 찾지 못했습니다.");
    }

    if (paths.length > 100) throw new Error("HWPX 구역이 너무 많습니다.");

    var blocks = [];
    for (var i = 0; i < paths.length; i += 1) {
      if (onProgress) onProgress(i + 1, paths.length);
      var text = await zip.file(paths[i]).async("text");
      if (text.length > 15 * 1024 * 1024) throw new Error("HWPX의 한 구역 XML이 너무 큽니다.");
      var xml = parseXml(text, paths[i]);
      sectionBlocks(xml).forEach(function (b) { blocks.push(b); });
    }

    if (!blocks.length) {
      var previewFile = zip.file("Preview/PrvText.txt");
      if (previewFile) {
        var previewText = await previewFile.async("text");
        if (previewText.trim()) {
          blocks = previewText.replace(/\r\n?/g, "\n").split(/\n{2,}/).map(function (t) {
            return { type: "p", text: t.trim() };
          }).filter(function (b) { return b.text; });
        }
      }
    }

    var chars = blocks.reduce(function (sum, block) {
      if (block.type === "p") return sum + block.text.length;
      return sum + block.rows.reduce(function (s, row) {
        return s + row.join("").length;
      }, 0);
    }, 0);

    if (chars > 1000000) throw new Error("HWPX 본문이 100만 자를 넘습니다.");
    if (!blocks.length) throw new Error("HWPX에서 읽을 수 있는 본문을 찾지 못했습니다.");

    return { blocks: blocks, sections: paths.length, fallback: false };
  }

  function blocksToText(blocks) {
    return blocks.map(function (block) {
      if (block.type === "table") {
        return block.rows.map(function (row) {
          return row.map(function (cell) {
            return String(cell || "").replace(/\n+/g, " / ");
          }).join("\t");
        }).join("\n");
      }
      return block.text;
    }).join("\n\n");
  }

  function blocksToHtml(blocks, title) {
    var body = blocks.map(function (block) {
      if (block.type === "table") {
        var rows = block.rows.map(function (row) {
          return "<tr>" + row.map(function (cell) {
            return "<td>" + xmlEscape(String(cell || "")).replace(/\n/g, "<br/>") + "</td>";
          }).join("") + "</tr>";
        }).join("");
        return "<table><tbody>" + rows + "</tbody></table>";
      }
      return "<p>" + xmlEscape(block.text).replace(/\n/g, "<br/>") + "</p>";
    }).join("\n");

    return '<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
      '<title>' + xmlEscape(title) + '</title>\n' +
      '<style>body{max-width:900px;margin:40px auto;padding:0 20px;color:#172033;font-family:Arial,"Noto Sans KR",sans-serif;line-height:1.75}p{margin:0 0 1em}table{width:100%;border-collapse:collapse;margin:1.25em 0}td{border:1px solid #d7dee8;padding:.55em;vertical-align:top}</style>\n' +
      '</head><body>\n' + body + '\n</body></html>';
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

  async function textToPdf(text, ctx, onProgress) {
    if (text.length > 700000) throw new Error("PDF 변환은 70만 자 이하 문서만 지원합니다.");

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

  function wText(value) {
    return '<w:r><w:t xml:space="preserve">' + xmlEscape(value) + '</w:t></w:r>';
  }

  function docxParagraph(text) {
    var parts = String(text || "").split("\n");
    return '<w:p>' + parts.map(function (part, index) {
      return wText(part) + (index < parts.length - 1 ? '<w:r><w:br/></w:r>' : '');
    }).join("") + '</w:p>';
  }

  function blocksToDocumentXml(blocks) {
    var body = blocks.map(function (block) {
      if (block.type === "table") {
        var rows = block.rows.map(function (row) {
          return '<w:tr>' + row.map(function (cell) {
            return '<w:tc><w:tcPr><w:tcW w:w="2400" w:type="dxa"/></w:tcPr>' +
              docxParagraph(cell || "") + '</w:tc>';
          }).join("") + '</w:tr>';
        }).join("");
        return '<w:tbl><w:tblPr><w:tblBorders>' +
          '<w:top w:val="single" w:sz="4" w:color="B7C2D0"/>' +
          '<w:left w:val="single" w:sz="4" w:color="B7C2D0"/>' +
          '<w:bottom w:val="single" w:sz="4" w:color="B7C2D0"/>' +
          '<w:right w:val="single" w:sz="4" w:color="B7C2D0"/>' +
          '<w:insideH w:val="single" w:sz="4" w:color="D6DEE8"/>' +
          '<w:insideV w:val="single" w:sz="4" w:color="D6DEE8"/>' +
          '</w:tblBorders></w:tblPr>' + rows + '</w:tbl>';
      }
      return docxParagraph(block.text);
    }).join("");

    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:body>' + body +
      '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>' +
      '</w:body></w:document>';
  }

  async function createDocx(blocks, ctx) {
    var JSZip = await ensureJsZip(ctx);
    var zip = new JSZip();

    zip.file("[Content_Types].xml",
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
      '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
      '</Types>');

    zip.file("_rels/.rels",
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
      '</Relationships>');

    zip.file("word/document.xml", blocksToDocumentXml(blocks));

    zip.file("word/styles.xml",
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:docDefaults><w:rPrDefault><w:rPr>' +
      '<w:rFonts w:ascii="Malgun Gothic" w:eastAsia="맑은 고딕" w:hAnsi="Malgun Gothic"/>' +
      '<w:sz w:val="22"/><w:szCs w:val="22"/>' +
      '</w:rPr></w:rPrDefault></w:docDefaults>' +
      '</w:styles>');

    zip.file("word/_rels/document.xml.rels",
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>');

    return await zip.generateAsync({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      compression: "DEFLATE"
    });
  }

  function noteFor(to) {
    if (to === "TXT") return "HWPX의 본문 텍스트와 표 셀 내용을 추출합니다. 머리글·바닥글·도형·수식·이미지 배치는 TXT에 포함되지 않을 수 있습니다.";
    if (to === "HTML") return "문단과 표 중심의 기본 HTML로 변환합니다. 한/글의 세밀한 글자 모양·쪽 배치·개체 위치는 그대로 재현하지 않습니다.";
    if (to === "DOCX") return "문단과 표 내용을 기본 DOCX 구조로 옮깁니다. 원본 HWPX의 복잡한 서식과 페이지 배치는 동일하게 유지되지 않을 수 있습니다.";
    return "HWPX의 본문과 표 내용을 읽어 A4 PDF로 만듭니다. 한/글 화면을 그대로 렌더링하는 기능이 아니며 결과 PDF 본문은 이미지 기반입니다.";
  }


  var rhwpPromise = null;

  async function ensureRhwp() {
    if (!rhwpPromise) {
      rhwpPromise = (async function () {
        var mod = await import("https://esm.sh/@rhwp/core@0.7.19?bundle");

        if (!mod || !mod.HwpDocument || typeof mod.default !== "function") {
          throw new Error("HWP WebAssembly 모듈을 불러오지 못했습니다.");
        }

        if (typeof w.measureTextWidth !== "function") {
          var measureCanvas = d.createElement("canvas");
          var measureCtx = measureCanvas.getContext("2d");
          var lastFont = "";

          w.measureTextWidth = function (font, text) {
            if (!measureCtx) return String(text || "").length * 8;
            if (font !== lastFont) {
              measureCtx.font = font || "16px sans-serif";
              lastFont = font;
            }
            return measureCtx.measureText(String(text || "")).width;
          };
        }

        await mod.default({
          module_or_path:"https://cdn.jsdelivr.net/npm/@rhwp/core@0.7.19/rhwp_bg.wasm"
        });

        return mod;
      })().catch(function (error) {
        rhwpPromise = null;
        throw error;
      });
    }

    return rhwpPromise;
  }

  function extractTextFromSvg(svg) {
    var doc = new DOMParser().parseFromString(String(svg || ""), "image/svg+xml");
    if (doc.querySelector("parsererror")) return "";

    var texts = Array.from(doc.getElementsByTagName("text")).map(function (node) {
      return String(node.textContent || "").replace(/\s+/g, " ").trim();
    }).filter(Boolean);

    if (texts.length) return texts.join("\n");

    return String(doc.documentElement.textContent || "")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function svgSize(svg) {
    try {
      var doc = new DOMParser().parseFromString(String(svg || ""), "image/svg+xml");
      var root = doc.documentElement;
      var vb = String(root.getAttribute("viewBox") || "").trim().split(/\s+/).map(Number);

      if (vb.length === 4 && vb[2] > 0 && vb[3] > 0) {
        return { width:vb[2], height:vb[3] };
      }

      var width = parseFloat(root.getAttribute("width")) || 794;
      var height = parseFloat(root.getAttribute("height")) || 1123;
      return { width:width, height:height };
    } catch (error) {
      return { width:794, height:1123 };
    }
  }

  async function svgPageToCanvas(svg, targetWidth, background) {
    var size = svgSize(svg);
    var ratio = size.width / size.height;
    if (!(ratio > 0)) ratio = 0.707;

    var width = Math.max(700, Number(targetWidth) || 1400);
    var height = Math.max(900, Math.round(width / ratio));

    if (width * height > 22000000) {
      var scale = Math.sqrt(22000000 / (width * height));
      width = Math.max(1, Math.floor(width * scale));
      height = Math.max(1, Math.floor(height * scale));
    }

    var blob = new Blob([svg], { type:"image/svg+xml;charset=utf-8" });
    var url = URL.createObjectURL(blob);

    try {
      var img = await new Promise(function (resolve, reject) {
        var el = new Image();
        el.onload = function () { resolve(el); };
        el.onerror = function () { reject(new Error("HWP 페이지 SVG를 이미지로 렌더링하지 못했습니다.")); };
        el.src = url;
      });

      var canvas = d.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      var g = canvas.getContext("2d");

      if (background) {
        g.fillStyle = background;
        g.fillRect(0, 0, width, height);
      }

      g.drawImage(img, 0, 0, width, height);

      return {
        canvas:canvas,
        ratio:ratio
      };
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function parseHwpBinary(file, onProgress) {
    if (!file || !/\.hwp$/i.test(file.name)) {
      throw new Error("HWP 파일을 선택해 주세요.");
    }

    if (file.size > 50 * 1024 * 1024) {
      throw new Error("HWP 파일은 50MB 이하만 처리할 수 있습니다.");
    }

    var mod = await ensureRhwp();
    var doc = null;

    try {
      doc = new mod.HwpDocument(new Uint8Array(await file.arrayBuffer()));
      var total = Number(doc.pageCount());

      if (!Number.isFinite(total) || total < 1) {
        throw new Error("HWP 문서의 페이지 수를 확인하지 못했습니다.");
      }

      if (total > 200) {
        throw new Error("브라우저 변환은 최대 200페이지 HWP까지 지원합니다.");
      }

      var pages = [];

      for (var i = 0; i < total; i += 1) {
        if (onProgress) onProgress(i + 1, total);

        var svg = String(doc.renderPageSvg(i) || "");
        if (!svg.trim()) throw new Error((i + 1) + "페이지를 렌더링하지 못했습니다.");

        pages.push({
          page:i + 1,
          svg:svg,
          text:extractTextFromSvg(svg)
        });
      }

      return {
        pages:pages,
        totalPages:total
      };
    } finally {
      if (doc && typeof doc.free === "function") {
        try { doc.free(); } catch (e) {}
      }
    }
  }

  function hwpPagesText(parsed) {
    return parsed.pages.map(function (page) {
      return "===== " + page.page + "페이지 =====\n" + String(page.text || "");
    }).join("\n\n");
  }

  function hwpPagesHtml(parsed, title) {
    var pageHtml = parsed.pages.map(function (page) {
      return '<section class="hwp-page" data-page="' + page.page + '">' +
        '<div class="hwp-page-label">' + page.page + '페이지</div>' +
        page.svg +
        '</section>';
    }).join("\n");

    return '<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
      '<title>' + xmlEscape(title) + '</title>\n' +
      '<style>body{margin:0;padding:28px;background:#eef2f7;color:#172033;font-family:Arial,"Noto Sans KR",sans-serif}.hwp-page{max-width:1000px;margin:0 auto 28px;padding:18px;background:#fff;border:1px solid #dce4ee;border-radius:12px;box-shadow:0 8px 24px rgba(15,23,42,.08)}.hwp-page-label{margin:0 0 10px;color:#6a788d;font-size:13px;font-weight:700}.hwp-page svg{display:block;width:100%;height:auto}</style>\n' +
      '</head><body>\n' + pageHtml + '\n</body></html>';
  }

  async function hwpPagesPdf(parsed, ctx, onProgress) {
    var JsPDF = await ensureJsPdf(ctx);
    var pdf = null;

    for (var i = 0; i < parsed.pages.length; i += 1) {
      if (onProgress) onProgress(i + 1, parsed.pages.length);

      var rendered = await svgPageToCanvas(parsed.pages[i].svg, 1500, "#ffffff");
      var pageW = 210;
      var pageH = pageW / rendered.ratio;

      if (!pdf) {
        pdf = new JsPDF({
          orientation:rendered.ratio >= 1 ? "landscape" : "portrait",
          unit:"mm",
          format:[pageW, pageH],
          compress:true
        });
      } else {
        pdf.addPage(
          [pageW, pageH],
          rendered.ratio >= 1 ? "landscape" : "portrait"
        );
      }

      pdf.addImage(
        rendered.canvas.toDataURL("image/jpeg", 0.93),
        "JPEG",
        0,
        0,
        pageW,
        pageH,
        undefined,
        "FAST"
      );
    }

    return pdf;
  }

  function hwpTextBlocks(parsed) {
    var blocks = [];

    parsed.pages.forEach(function (page, index) {
      blocks.push({ type:"p", text:(index + 1) + "페이지" });

      String(page.text || "").split("\n").forEach(function (line) {
        line = line.trim();
        if (line) blocks.push({ type:"p", text:line });
      });
    });

    return blocks;
  }

  function hwpNote(to) {
    if (to === "HTML") {
      return "HWP 각 페이지를 @rhwp/core가 SVG로 렌더링한 결과를 HTML에 그대로 담습니다. 설치 글꼴 차이로 일부 줄바꿈·페이지 배치가 원본 한/글과 다를 수 있습니다.";
    }
    if (to === "PDF") {
      return "HWP 페이지를 SVG로 렌더링한 뒤 PDF 페이지에 삽입합니다. 애플리케이션 자체의 인쇄 엔진이 아니라 브라우저 WebAssembly 렌더링 결과를 사용합니다.";
    }
    if (to === "DOCX") {
      return "렌더링된 HWP 페이지의 텍스트를 추출해 기본 Word 문단으로 만듭니다. 표·도형·쪽 배치가 편집 가능한 Word 객체로 복원되는 기능은 아닙니다.";
    }
    return "렌더링된 HWP 페이지에서 텍스트를 추출합니다. 표·도형·수식의 시각적 위치 정보는 TXT에 포함되지 않습니다.";
  }

  function openHwpBinary(x, ctx) {
    injectStyle();

    var selectedFile = null;
    var parsed = null;
    var outputValue = "";
    var to = String(x.toFormat || "").toUpperCase();

    ctx.stage.innerHTML =
      '<div class="hm-fx-detail">' +
        '<div class="hm-fx-toolbar"><a class="hm-fx-back" href="' +
          ctx.route({ category:x.category }) +
          '" data-route>← ' + ctx.esc(ctx.cat(x.category).name) + '</a></div>' +
        ctx.titleBlock(x) +
        '<div class="hm-hx-box">' +
          '<div class="hm-hx-drop" data-hwp-drop><strong>HWP 파일을 선택하거나 끌어다 놓으세요</strong>' +
            '<span>Rust + WebAssembly HWP 렌더러로 문서를 읽어 ' + ctx.esc(to) + '로 변환합니다.</span>' +
            '<input type="file" hidden data-hwp-file accept=".hwp,application/x-hwp,application/octet-stream"></div>' +
          '<div class="hm-hx-file" data-hwp-info></div>' +
          '<div class="hm-hx-actions"><button class="hm-hx-btn primary" type="button" data-hwp-run disabled>' +
            (to === "TXT" || to === "HTML" ? "내용 변환하기" : to + " 만들기") +
          '</button></div>' +
          '<div class="hm-hx-status" data-hwp-status>첫 실행 시 @rhwp/core WebAssembly 모듈을 불러옵니다. 파일은 외부 변환 서버로 업로드하지 않습니다.</div>' +
          (to === "TXT" || to === "HTML"
            ? '<textarea class="hm-hx-output" readonly data-hwp-output placeholder="변환 결과가 여기에 표시됩니다."></textarea>' +
              '<div class="hm-hx-output-actions"><button type="button" data-hwp-copy disabled>결과 복사</button><button type="button" data-hwp-download disabled>파일 다운로드</button></div>'
            : '') +
          '<div class="hm-hx-note">' + ctx.esc(hwpNote(to)) + '</div>' +
          '<div class="hm-hx-note">브라우저의 시스템 글꼴 접근 범위와 설치 글꼴에 따라 한/글 원본과 줄바꿈 또는 페이지 수가 달라질 수 있습니다. 중요한 공문서의 최종 인쇄 검증은 한/글 원본 프로그램에서 확인하는 것이 안전합니다.</div>' +
          '<div class="hm-hx-version">HWP/HWPX Engine v1.2.0 · @rhwp/core 0.7.19</div>' +
        '</div>' +
      '</div>';

    var drop = ctx.stage.querySelector("[data-hwp-drop]");
    var input = ctx.stage.querySelector("[data-hwp-file]");
    var info = ctx.stage.querySelector("[data-hwp-info]");
    var run = ctx.stage.querySelector("[data-hwp-run]");
    var status = ctx.stage.querySelector("[data-hwp-status]");
    var output = ctx.stage.querySelector("[data-hwp-output]");
    var copy = ctx.stage.querySelector("[data-hwp-copy]");
    var download = ctx.stage.querySelector("[data-hwp-download]");

    function choose(file) {
      if (!file || !/\.hwp$/i.test(file.name)) {
        selectedFile = null;
        run.disabled = true;
        status.textContent = "HWP 파일을 선택해 주세요.";
        return;
      }

      if (file.size > 50 * 1024 * 1024) {
        selectedFile = null;
        run.disabled = true;
        status.textContent = "HWP 파일은 50MB 이하만 처리할 수 있습니다.";
        return;
      }

      selectedFile = file;
      parsed = null;
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

      try {
        status.textContent = "HWP WebAssembly 렌더러를 준비하는 중입니다...";

        parsed = await parseHwpBinary(selectedFile, function (done, total) {
          status.textContent = done + " / " + total + " HWP 페이지 렌더링 중...";
        });

        var base = safeBaseName(selectedFile.name);

        if (to === "TXT") {
          outputValue = hwpPagesText(parsed);

          output.value = outputValue.length > 200000
            ? outputValue.slice(0, 200000) + "\n\n[미리보기는 앞 20만 자까지만 표시됩니다. 다운로드 파일에는 전체 결과가 들어 있습니다.]"
            : outputValue;

          copy.disabled = !outputValue;
          download.disabled = !outputValue;

          status.textContent = parsed.totalPages + "페이지의 텍스트를 추출했습니다.";
        } else if (to === "HTML") {
          outputValue = hwpPagesHtml(parsed, base);

          output.value = outputValue.length > 200000
            ? outputValue.slice(0, 200000) + "\n\n<!-- 미리보기는 앞 20만 자까지만 표시됩니다. -->"
            : outputValue;

          copy.disabled = false;
          download.disabled = false;

          status.textContent = parsed.totalPages + "페이지를 SVG 기반 HTML로 변환했습니다.";
        } else if (to === "DOCX") {
          status.textContent = "DOCX 파일을 만드는 중입니다...";

          var docx = await createDocx(hwpTextBlocks(parsed), ctx);
          downloadBlob(docx, base + ".docx");

          status.textContent = parsed.totalPages + "페이지의 텍스트를 DOCX로 변환했습니다.";
        } else if (to === "PDF") {
          var pdf = await hwpPagesPdf(parsed, ctx, function (done, total) {
            status.textContent = done + " / " + total + " PDF 페이지 만드는 중...";
          });

          pdf.save(base + ".pdf");
          status.textContent = parsed.totalPages + "페이지 PDF 다운로드를 시작했습니다.";
        } else {
          throw new Error("지원하지 않는 HWP 출력 형식입니다.");
        }
      } catch (error) {
        status.textContent = "변환 중 오류가 발생했습니다: " + (error.message || error);
      } finally {
        run.disabled = false;
      }
    };

    if (copy) {
      copy.onclick = async function () {
        try {
          await copyText(outputValue);
          status.textContent = "변환 결과를 복사했습니다.";
        } catch (error) {
          status.textContent = "자동 복사를 지원하지 않는 환경입니다. 결과 영역에서 직접 복사해 주세요.";
        }
      };
    }

    if (download) {
      download.onclick = function () {
        if (!selectedFile || !outputValue) return;

        var isHtml = to === "HTML";

        downloadBlob(
          new Blob(
            [isHtml ? outputValue : "\ufeff" + outputValue],
            { type:isHtml ? "text/html;charset=utf-8" : "text/plain;charset=utf-8" }
          ),
          safeBaseName(selectedFile.name) + (isHtml ? ".html" : ".txt")
        );

        status.textContent = (isHtml ? "HTML" : "TXT") + " 다운로드를 시작했습니다.";
      };
    }
  }


  var hwpxWriterModulePromise = null;

  async function ensureHwpxWriterModule() {
    if (!hwpxWriterModulePromise) {
      hwpxWriterModulePromise = import(
        "https://cdn.jsdelivr.net/npm/@ssabrojs/hwpxjs@0.4.0/dist/browser/hwpxjs.browser.mjs"
      ).then(function (mod) {
        if (!mod || typeof mod.htmlToHwpx !== "function") {
          throw new Error("HWPX 작성 모듈을 불러오지 못했습니다.");
        }
        return mod;
      }).catch(function (error) {
        hwpxWriterModulePromise = null;
        throw error;
      });
    }
    return hwpxWriterModulePromise;
  }

  async function ensureMammoth(ctx) {
    if (!w.mammoth) {
      await ctx.loadScript("https://cdn.jsdelivr.net/npm/mammoth@1.12.0/mammoth.browser.min.js");
    }
    if (!w.mammoth) throw new Error("DOCX 읽기 라이브러리를 불러오지 못했습니다.");
    return w.mammoth;
  }

  async function ensurePdfJsForHwpx(ctx) {
    if (!w.pdfjsLib) {
      await ctx.loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js");
    }
    if (!w.pdfjsLib) throw new Error("PDF 읽기 라이브러리를 불러오지 못했습니다.");

    w.pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

    return w.pdfjsLib;
  }

  function sanitizeHwpxHtml(html) {
    var doc = new DOMParser().parseFromString(String(html || ""), "text/html");

    doc.querySelectorAll(
      "script,style,link,iframe,frame,object,embed,form,input,button,textarea,select,option,video,audio,canvas,noscript,template"
    ).forEach(function (node) {
      node.remove();
    });

    doc.querySelectorAll("img").forEach(function (img) {
      var src = String(img.getAttribute("src") || "");
      if (!/^data:image\//i.test(src)) {
        var alt = String(img.getAttribute("alt") || "").trim();
        img.replaceWith(d.createTextNode(alt ? "[이미지: " + alt + "]" : ""));
      }
    });

    return doc.body.innerHTML;
  }

  function pdfItemsToHwpxText(items) {
    var rows = (items || []).map(function (item) {
      var tr = item.transform || [1,0,0,1,0,0];
      return {
        text:String(item.str || ""),
        x:Number(tr[4]) || 0,
        y:Number(tr[5]) || 0,
        width:Number(item.width) || 0
      };
    }).filter(function (item) {
      return item.text.trim().length > 0;
    });

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

      var text = "";
      var prevEnd = null;

      line.items.forEach(function (item) {
        var gap = prevEnd === null ? 0 : item.x - prevEnd;

        if (
          prevEnd !== null &&
          gap > 2 &&
          text &&
          !/\s$/.test(text) &&
          !/^\s/.test(item.text)
        ) {
          text += " ";
        }

        text += item.text;
        prevEnd = item.x + item.width;
      });

      return text.trim();
    }).filter(Boolean).join("\n");
  }

  function textPageToHtml(text, pageNo) {
    var body = String(text || "")
      .split(/\n{2,}/)
      .map(function (block) {
        block = block.trim();
        if (!block) return "";
        return "<p>" + xmlEscape(block).replace(/\n/g, "<br/>") + "</p>";
      })
      .join("");

    return "<h2>" + pageNo + "페이지</h2>" + body;
  }

  async function docxToHwpx(file, ctx, onStatus) {
    if (file.size > 30 * 1024 * 1024) {
      throw new Error("DOCX 파일은 30MB 이하만 처리할 수 있습니다.");
    }

    if (onStatus) onStatus("DOCX 내용을 읽는 중입니다...");
    var mammoth = await ensureMammoth(ctx);

    var result = await mammoth.convertToHtml({
      arrayBuffer:await file.arrayBuffer()
    });

    var html = sanitizeHwpxHtml(result.value || "");

    if (!html.trim()) {
      throw new Error("DOCX에서 변환할 내용을 찾지 못했습니다.");
    }

    if (html.length > 3000000) {
      throw new Error("DOCX 내용이 너무 큽니다. 문서를 나누어 변환해 주세요.");
    }

    if (onStatus) onStatus("HWPX 문서 패키지를 만드는 중입니다...");
    var mod = await ensureHwpxWriterModule();
    var bytes = await mod.htmlToHwpx(html);

    if (!bytes || !bytes.byteLength) {
      throw new Error("HWPX 파일을 만들지 못했습니다.");
    }

    return {
      blob:new Blob([bytes], { type:"application/hwp+zip" }),
      warnings:result.messages ? result.messages.length : 0
    };
  }

  async function pdfToHwpx(file, ctx, onStatus) {
    if (file.size > 60 * 1024 * 1024) {
      throw new Error("PDF 파일은 60MB 이하만 처리할 수 있습니다.");
    }

    var pdfjs = await ensurePdfJsForHwpx(ctx);
    var pdf = await pdfjs.getDocument({
      data:await file.arrayBuffer()
    }).promise;

    if (pdf.numPages > 300) {
      if (pdf.destroy) await pdf.destroy();
      throw new Error("PDF → HWPX는 최대 300페이지까지 지원합니다.");
    }

    var html = "";
    var chars = 0;

    try {
      for (var i = 1; i <= pdf.numPages; i += 1) {
        if (onStatus) onStatus(i + " / " + pdf.numPages + " PDF 페이지 텍스트 읽는 중...");

        var page = await pdf.getPage(i);
        var tc = await page.getTextContent({
          normalizeWhitespace:true
        });

        var text = pdfItemsToHwpxText(tc.items);
        chars += text.replace(/\s/g, "").length;
        html += textPageToHtml(text, i);

        if (page.cleanup) page.cleanup();

        if (chars > 1000000) {
          throw new Error("PDF 본문이 100만 자를 넘습니다.");
        }
      }
    } finally {
      if (pdf.destroy) await pdf.destroy();
    }

    if (chars < 10) {
      throw new Error("추출된 텍스트가 거의 없습니다. 스캔 PDF라면 OCR이 필요합니다.");
    }

    if (onStatus) onStatus("HWPX 문서 패키지를 만드는 중입니다...");
    var mod = await ensureHwpxWriterModule();
    var bytes = await mod.htmlToHwpx(html);

    if (!bytes || !bytes.byteLength) {
      throw new Error("HWPX 파일을 만들지 못했습니다.");
    }

    return {
      blob:new Blob([bytes], { type:"application/hwp+zip" }),
      pages:pdf.numPages
    };
  }

  function hwpxWriteNote(x) {
    if (x.engine === "docx-hwpx") {
      return "DOCX의 제목·문단·강조·목록·표 등 기본 문서 구조를 HWPX로 옮깁니다. Mammoth가 읽은 HTML 구조를 HWPX 작성 엔진에 전달하며, Word의 머리글·바닥글·도형·정밀한 페이지 배치는 단순화될 수 있습니다.";
    }

    return "PDF에서 선택 가능한 텍스트를 페이지 순서대로 읽어 HWPX 본문으로 만듭니다. PDF 화면을 HWPX 페이지 레이아웃으로 그대로 복원하는 기능이 아니며, 스캔 PDF는 OCR이 필요합니다.";
  }

  function openHwpxWriter(x, ctx) {
    injectStyle();

    var selectedFile = null;
    var from = String(x.fromFormat || "").toUpperCase();

    ctx.stage.innerHTML =
      '<div class="hm-fx-detail">' +
        '<div class="hm-fx-toolbar"><a class="hm-fx-back" href="' +
          ctx.route({ category:x.category }) +
          '" data-route>← ' + ctx.esc(ctx.cat(x.category).name) + '</a></div>' +
        ctx.titleBlock(x) +
        '<div class="hm-hx-box">' +
          '<div class="hm-hx-drop" data-hw-drop><strong>' + ctx.esc(from) + ' 파일을 선택하거나 끌어다 놓으세요</strong>' +
            '<span>브라우저에서 문서 내용을 읽어 표준 HWPX 패키지로 만듭니다.</span>' +
            '<input type="file" hidden data-hw-file accept="' + ctx.esc(x.accept || "") + '"></div>' +
          '<div class="hm-hx-file" data-hw-info></div>' +
          '<div class="hm-hx-actions"><button class="hm-hx-btn primary" type="button" data-hw-run disabled>HWPX 만들기</button></div>' +
          '<div class="hm-hx-status" data-hw-status>파일은 외부 변환 서버로 전송하지 않고 현재 브라우저에서 처리합니다.</div>' +
          '<div class="hm-hx-note">' + ctx.esc(hwpxWriteNote(x)) + '</div>' +
          '<div class="hm-hx-note">HWPX 작성에는 @ssabrojs/hwpxjs 0.4.0 브라우저 ESM 번들을 사용합니다. 생성된 HWPX는 OWPML ZIP 패키지 규칙을 따릅니다.</div>' +
          '<div class="hm-hx-version">HWP/HWPX Engine v1.2.0</div>' +
        '</div>' +
      '</div>';

    var drop = ctx.stage.querySelector("[data-hw-drop]");
    var input = ctx.stage.querySelector("[data-hw-file]");
    var info = ctx.stage.querySelector("[data-hw-info]");
    var run = ctx.stage.querySelector("[data-hw-run]");
    var status = ctx.stage.querySelector("[data-hw-status]");

    function valid(file) {
      if (!file) return false;
      var name = String(file.name || "").toLowerCase();

      if (from === "DOCX") return name.endsWith(".docx");
      if (from === "PDF") return name.endsWith(".pdf");

      return false;
    }

    function choose(file) {
      if (!valid(file)) {
        selectedFile = null;
        run.disabled = true;
        status.textContent = from + " 파일을 선택해 주세요.";
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

      try {
        var result;

        if (x.engine === "docx-hwpx") {
          result = await docxToHwpx(selectedFile, ctx, function (message) {
            status.textContent = message;
          });
        } else if (x.engine === "pdf-hwpx") {
          result = await pdfToHwpx(selectedFile, ctx, function (message) {
            status.textContent = message;
          });
        } else {
          throw new Error("지원하지 않는 HWPX 작성 변환입니다.");
        }

        downloadBlob(
          result.blob,
          safeBaseName(selectedFile.name) + ".hwpx"
        );

        var extra = [];
        if (result.pages) extra.push(result.pages + "페이지");
        if (result.warnings) extra.push("확인 메시지 " + result.warnings + "건");

        status.textContent =
          "HWPX 다운로드를 시작했습니다." +
          (extra.length ? " · " + extra.join(" · ") : "");
      } catch (error) {
        status.textContent = "HWPX 생성 중 오류가 발생했습니다: " + (error.message || error);
      } finally {
        run.disabled = false;
      }
    };
  }

  NS.hwp = {
    version: "1.2.0",

    open: function (x, ctx) {
      if (x.engine === "docx-hwpx" || x.engine === "pdf-hwpx") {
        return openHwpxWriter(x, ctx);
      }

      if (String(x.fromFormat || "").toUpperCase() === "HWP") {
        return openHwpBinary(x, ctx);
      }

      injectStyle();

      var selectedFile = null;
      var parsed = null;
      var outputValue = "";
      var to = String(x.toFormat || "").toUpperCase();

      ctx.stage.innerHTML =
        '<div class="hm-fx-detail">' +
          '<div class="hm-fx-toolbar"><a class="hm-fx-back" href="' +
            ctx.route({ category: x.category }) +
            '" data-route>← ' + ctx.esc(ctx.cat(x.category).name) + '</a></div>' +
          ctx.titleBlock(x) +
          '<div class="hm-hx-box">' +
            '<div class="hm-hx-drop" data-hx-drop><strong>HWPX 파일을 선택하거나 끌어다 놓으세요</strong>' +
              '<span>XML 기반 HWPX 문서의 본문과 표 내용을 읽어 ' + ctx.esc(to) + '로 변환합니다.</span>' +
              '<input type="file" hidden data-hx-file accept=".hwpx,application/hwp+zip,application/octet-stream"></div>' +
            '<div class="hm-hx-file" data-hx-info></div>' +
            '<div class="hm-hx-actions"><button class="hm-hx-btn primary" type="button" data-hx-run disabled>' +
              (to === "TXT" || to === "HTML" ? "내용 변환하기" : to + " 만들기") +
            '</button></div>' +
            '<div class="hm-hx-status" data-hx-status>파일은 외부 서버로 전송하지 않고 브라우저에서 처리합니다.</div>' +
            (to === "TXT" || to === "HTML"
              ? '<textarea class="hm-hx-output" readonly data-hx-output placeholder="변환 결과가 여기에 표시됩니다."></textarea>' +
                '<div class="hm-hx-output-actions"><button type="button" data-hx-copy disabled>결과 복사</button><button type="button" data-hx-download disabled>파일 다운로드</button></div>'
              : '') +
            '<div class="hm-hx-note">' + ctx.esc(noteFor(to)) + '</div>' +
            '<div class="hm-hx-version">HWP/HWPX Engine v1.2.0</div>' +
          '</div>' +
        '</div>';

      var drop = ctx.stage.querySelector("[data-hx-drop]");
      var input = ctx.stage.querySelector("[data-hx-file]");
      var info = ctx.stage.querySelector("[data-hx-info]");
      var run = ctx.stage.querySelector("[data-hx-run]");
      var status = ctx.stage.querySelector("[data-hx-status]");
      var output = ctx.stage.querySelector("[data-hx-output]");
      var copy = ctx.stage.querySelector("[data-hx-copy]");
      var download = ctx.stage.querySelector("[data-hx-download]");

      function choose(file) {
        if (!file || !/\.hwpx$/i.test(file.name)) {
          status.textContent = "HWPX 파일을 선택해 주세요.";
          return;
        }
        if (file.size > 50 * 1024 * 1024) {
          status.textContent = "HWPX는 50MB 이하 파일만 처리할 수 있습니다.";
          return;
        }
        selectedFile = file;
        parsed = null;
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
          parsed = await parseHwpx(selectedFile, ctx, function (done, total) {
            status.textContent = done + " / " + total + " 구역 읽는 중...";
          });

          var base = safeBaseName(selectedFile.name);
          if (to === "TXT") {
            outputValue = blocksToText(parsed.blocks);
            output.value = outputValue.length > 200000
              ? outputValue.slice(0, 200000) + "\n\n[미리보기는 앞 20만 자까지만 표시됩니다. 다운로드 파일에는 전체 결과가 들어 있습니다.]"
              : outputValue;
            copy.disabled = false;
            download.disabled = false;
            status.textContent = "HWPX 본문을 TXT로 변환했습니다.";
          } else if (to === "HTML") {
            outputValue = blocksToHtml(parsed.blocks, base);
            output.value = outputValue.length > 200000
              ? outputValue.slice(0, 200000) + "\n\n<!-- 미리보기는 앞 20만 자까지만 표시됩니다. -->"
              : outputValue;
            copy.disabled = false;
            download.disabled = false;
            status.textContent = "HWPX 본문을 HTML로 변환했습니다.";
          } else if (to === "DOCX") {
            status.textContent = "DOCX 파일을 만드는 중입니다...";
            var docx = await createDocx(parsed.blocks, ctx);
            downloadBlob(docx, base + ".docx");
            status.textContent = "DOCX 다운로드를 시작했습니다.";
          } else if (to === "PDF") {
            var text = blocksToText(parsed.blocks);
            var pdf = await textToPdf(text, ctx, function (page, total) {
              status.textContent = page + " / " + total + " PDF 페이지 만드는 중...";
            });
            pdf.save(base + ".pdf");
            status.textContent = "PDF 다운로드를 시작했습니다.";
          } else {
            throw new Error("지원하지 않는 HWPX 출력 형식입니다.");
          }
        } catch (error) {
          status.textContent = "변환 중 오류가 발생했습니다: " + (error.message || error);
        } finally {
          run.disabled = false;
        }
      };

      if (copy) {
        copy.onclick = async function () {
          try {
            await copyText(outputValue);
            status.textContent = "변환 결과를 복사했습니다.";
          } catch (error) {
            status.textContent = "자동 복사를 지원하지 않는 환경입니다. 결과 영역에서 직접 복사해 주세요.";
          }
        };
      }

      if (download) {
        download.onclick = function () {
          if (!outputValue || !selectedFile) return;
          var isHtml = to === "HTML";
          downloadBlob(
            new Blob([outputValue], { type: isHtml ? "text/html;charset=utf-8" : "text/plain;charset=utf-8" }),
            safeBaseName(selectedFile.name) + (isHtml ? ".html" : ".txt")
          );
          status.textContent = (isHtml ? "HTML" : "TXT") + " 다운로드를 시작했습니다.";
        };
      }
    }
  };
})(window);
