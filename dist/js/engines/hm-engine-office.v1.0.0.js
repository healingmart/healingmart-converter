/*
 * HealingMart Converter Office Render Engine v1.0.0
 *
 * PDF -> XLSX
 * XLSX -> PDF
 * PDF -> PPTX
 * PPTX -> PDF / JPG / PNG
 *
 * Browser-side only.
 */
(function (w) {
  "use strict";

  var d = w.document;
  var NS = w.HM_CONVERTER_ENGINES = w.HM_CONVERTER_ENGINES || {};
  var pptxSvgModulePromise = null;

  function injectStyle() {
    if (d.getElementById("hm-engine-office-style-v1")) return;
    var style = d.createElement("style");
    style.id = "hm-engine-office-style-v1";
    style.textContent = [
      ".hm-of-box{padding:22px;border:1px solid #dfe6ef;border-radius:20px;background:#fff;box-shadow:0 12px 34px rgba(15,23,42,.07)}",
      ".hm-of-drop{padding:34px 18px;border:2px dashed #aebff0;border-radius:17px;background:#f8fbff;text-align:center;cursor:pointer;transition:.16s ease}",
      ".hm-of-drop:hover,.hm-of-drop.is-drag{border-color:#2f7cf6;background:#fff}",
      ".hm-of-drop strong{display:block;color:#13253a;font-size:18px;font-weight:950}",
      ".hm-of-drop span{display:block;margin-top:5px;color:#5d6d83;font-size:13px;line-height:1.55}",
      ".hm-of-file{display:none;margin-top:12px;padding:12px;border:1px solid #e0e7ef;border-radius:12px;background:#fbfdff}",
      ".hm-of-file strong{display:block;overflow:hidden;color:#24364b;font-size:14px;font-weight:950;text-overflow:ellipsis;white-space:nowrap}",
      ".hm-of-file span{display:block;margin-top:3px;color:#718095;font-size:11px}",
      ".hm-of-options{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:14px}",
      ".hm-of-field label{display:block;margin-bottom:5px;color:#536176;font-size:12px;font-weight:850}",
      ".hm-of-field input,.hm-of-field select{width:100%;height:46px;padding:0 10px;border:1px solid #d7e0ea;border-radius:10px;background:#fff;color:#172033;font-size:13px;font-weight:750;outline:none}",
      ".hm-of-field input:focus,.hm-of-field select:focus{border-color:#4f7df1;box-shadow:0 0 0 4px rgba(79,125,241,.10)}",
      ".hm-of-actions{display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin-top:16px}",
      ".hm-of-btn{min-height:46px;padding:0 17px;border:1px solid #d6e0ea;border-radius:11px;background:#fff;color:#223248;font-size:13px;font-weight:900;cursor:pointer}",
      ".hm-of-btn.primary{color:#fff;border-color:#4d69e8;background:linear-gradient(135deg,#6d5dfc,#2f7cf6);box-shadow:0 8px 20px rgba(71,91,229,.22)}",
      ".hm-of-btn:disabled{opacity:.48;cursor:not-allowed}",
      ".hm-of-progress{display:none;margin-top:14px}",
      ".hm-of-progress.is-show{display:block}",
      ".hm-of-track{height:12px;overflow:hidden;border-radius:999px;background:#e9eef5}",
      ".hm-of-bar{height:100%;width:0;border-radius:999px;background:linear-gradient(90deg,#5d6cf4,#2f7cf6);transition:width .15s ease}",
      ".hm-of-progressline{display:flex;justify-content:space-between;gap:10px;margin-top:7px;color:#627188;font-size:11px;font-weight:850}",
      ".hm-of-status{margin-top:13px;padding:12px;border-radius:11px;background:#f4f7fb;color:#4d5d73;font-size:12px;line-height:1.65}",
      ".hm-of-note{margin-top:12px;padding:11px 12px;border:1px solid #e4eaf1;border-radius:11px;background:#fbfdff;color:#607087;font-size:11px;line-height:1.7}",
      ".hm-of-result{display:none;margin-top:14px;padding:14px;border:1px solid #dce5ee;border-radius:13px;background:#fff}",
      ".hm-of-result.is-show{display:block}",
      ".hm-of-result strong{display:block;color:#1f3045;font-size:14px;font-weight:950}",
      ".hm-of-result span{display:block;margin-top:4px;color:#68778c;font-size:11px}",
      ".hm-of-download{display:flex;align-items:center;justify-content:center;min-height:45px;margin-top:11px;border-radius:10px;background:#0e8a69;color:#fff!important;font-size:12px;font-weight:950;text-decoration:none}",
      ".hm-of-version{margin-top:10px;color:#8a97a8;font-size:10px;text-align:right}",
      "@media(max-width:760px){.hm-of-box{padding:13px 9px;border-radius:15px}.hm-of-drop{padding:27px 10px}.hm-of-options{grid-template-columns:1fr}.hm-of-btn{min-height:48px}}"
    ].join("");
    d.head.appendChild(style);
  }

  function safeBaseName(name) {
    return String(name || "converted")
      .replace(/\.[^.]+$/, "")
      .replace(/[\\/:*?"<>|]+/g, "_");
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

  async function ensurePdfJs(ctx) {
    if (!w.pdfjsLib) {
      await ctx.loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js");
    }
    if (!w.pdfjsLib) throw new Error("PDF 읽기 라이브러리를 불러오지 못했습니다.");
    w.pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    return w.pdfjsLib;
  }

  async function ensureXlsx(ctx) {
    if (!w.XLSX) {
      await ctx.loadScript("https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js");
    }
    if (!w.XLSX) throw new Error("XLSX 변환 라이브러리를 불러오지 못했습니다.");
    return w.XLSX;
  }

  async function ensureJsPdf(ctx) {
    if (!(w.jspdf && w.jspdf.jsPDF)) {
      await ctx.loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js");
    }
    if (!(w.jspdf && w.jspdf.jsPDF)) throw new Error("PDF 생성 라이브러리를 불러오지 못했습니다.");
    return w.jspdf.jsPDF;
  }

  async function ensureJsZip(ctx) {
    if (!w.JSZip) {
      await ctx.loadScript("https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js");
    }
    if (!w.JSZip) throw new Error("ZIP 라이브러리를 불러오지 못했습니다.");
    return w.JSZip;
  }

  async function ensurePptxGen(ctx) {
    if (!w.PptxGenJS) {
      try {
        await ctx.loadScript("https://cdn.jsdelivr.net/npm/pptxgenjs@4.0.1/dist/pptxgen.bundle.js");
      } catch (e) {
        await ctx.loadScript("https://cdn.jsdelivr.net/gh/gitbrent/PptxGenJS@v4.0.1/dist/pptxgen.bundle.js");
      }
    }
    if (!w.PptxGenJS) throw new Error("PowerPoint 생성 라이브러리를 불러오지 못했습니다.");
    return w.PptxGenJS;
  }

  async function ensurePptxSvg() {
    if (!pptxSvgModulePromise) {
      pptxSvgModulePromise = import("https://cdn.jsdelivr.net/npm/pptx-svg@0.6.4/dist/index.js");
    }
    var mod = await pptxSvgModulePromise;
    if (!mod || !mod.PptxRenderer) throw new Error("PPTX 렌더링 라이브러리를 불러오지 못했습니다.");
    return mod;
  }

  function percent(done, total) {
    if (!total) return 0;
    return Math.max(0, Math.min(1, done / total));
  }

  function pageRowsFromTextContent(content) {
    var items = ((content && content.items) || []).map(function (item) {
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

    items.sort(function (a, b) {
      var dy = b.y - a.y;
      if (Math.abs(dy) > 2.8) return dy;
      return a.x - b.x;
    });

    var lines = [];

    items.forEach(function (item) {
      var line = null;

      for (var i = lines.length - 1; i >= 0; i -= 1) {
        if (Math.abs(lines[i].y - item.y) <= 2.8) {
          line = lines[i];
          break;
        }
        if (lines[i].y - item.y > 10) break;
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

      var cells = [];
      var current = "";
      var prevEnd = null;

      line.items.forEach(function (item) {
        var gap = prevEnd === null ? 0 : item.x - prevEnd;
        var newCell = prevEnd !== null && gap > 14;

        if (newCell) {
          cells.push(current.trim());
          current = item.text;
        } else {
          if (current && !/\s$/.test(current) && !/^\s/.test(item.text) && gap > 2) current += " ";
          current += item.text;
        }

        prevEnd = item.x + item.width;
      });

      if (current.trim() || !cells.length) cells.push(current.trim());
      return cells;
    }).filter(function (row) {
      return row.some(function (cell) { return String(cell || "").trim(); });
    });
  }

  async function pdfToXlsx(file, ctx, setProgress, setStatus) {
    if (file.size > 60 * 1024 * 1024) throw new Error("PDF는 60MB 이하 파일만 처리할 수 있습니다.");

    var pdfjs = await ensurePdfJs(ctx);
    var XLSX = await ensureXlsx(ctx);
    var pdf = await pdfjs.getDocument({ data:await file.arrayBuffer() }).promise;

    if (pdf.numPages > 300) {
      if (pdf.destroy) await pdf.destroy();
      throw new Error("PDF → XLSX는 최대 300페이지까지 처리할 수 있습니다.");
    }

    var wb = XLSX.utils.book_new();
    var totalRows = 0;

    for (var i = 1; i <= pdf.numPages; i += 1) {
      setStatus(i + " / " + pdf.numPages + " 페이지의 텍스트 행을 분석하는 중입니다...");
      setProgress(percent(i - 1, pdf.numPages));

      var page = await pdf.getPage(i);
      var tc = await page.getTextContent({ normalizeWhitespace:true });
      var rows = pageRowsFromTextContent(tc);
      totalRows += rows.length;

      if (totalRows > 50000) {
        if (pdf.destroy) await pdf.destroy();
        throw new Error("추출된 행이 5만 개를 넘습니다. 파일을 나누어 변환해 주세요.");
      }

      if (!rows.length) rows = [[""]];

      var ws = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, ("Page " + i).slice(0, 31));

      if (page.cleanup) page.cleanup();
    }

    if (pdf.destroy) await pdf.destroy();

    setProgress(1);
    XLSX.writeFile(wb, safeBaseName(file.name) + ".xlsx", { compression:true });

    return {
      text:pdf.numPages + "페이지 · 약 " + totalRows.toLocaleString() + "행",
      downloaded:true
    };
  }

  function normalizeSheetRows(XLSX, sheet) {
    var rows = XLSX.utils.sheet_to_json(sheet, {
      header:1,
      raw:false,
      defval:"",
      blankrows:true
    });

    while (rows.length && !rows[rows.length - 1].some(function (v) { return String(v || "").trim(); })) {
      rows.pop();
    }

    var maxCols = 0;
    rows.forEach(function (row) {
      maxCols = Math.max(maxCols, row.length);
    });

    maxCols = Math.min(maxCols, 100);

    return rows.map(function (row) {
      return row.slice(0, maxCols).map(function (v) {
        var s = String(v == null ? "" : v);
        return s.length > 120 ? s.slice(0, 117) + "..." : s;
      });
    });
  }

  function tablePageCanvas(sheetName, rows, rowStart, rowEnd, colStart, colEnd) {
    var pageW = 1600;
    var pageH = 1131;
    var margin = 58;
    var titleH = 70;
    var headerH = 48;
    var rowH = 46;
    var cols = Math.max(1, colEnd - colStart);
    var tableW = pageW - margin * 2;
    var cellW = tableW / cols;

    var canvas = d.createElement("canvas");
    canvas.width = pageW;
    canvas.height = pageH;
    var g = canvas.getContext("2d");

    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, pageW, pageH);

    g.fillStyle = "#10233b";
    g.font = '700 30px "Noto Sans KR","Malgun Gothic",Arial,sans-serif';
    g.fillText(sheetName, margin, 45);

    var y = margin + titleH;
    g.textBaseline = "middle";

    for (var r = rowStart; r < rowEnd; r += 1) {
      var isHeader = r === 0;

      for (var c = colStart; c < colEnd; c += 1) {
        var x = margin + (c - colStart) * cellW;

        g.fillStyle = isHeader ? "#eef5ff" : "#ffffff";
        g.fillRect(x, y, cellW, isHeader ? headerH : rowH);

        g.strokeStyle = "#cfd9e5";
        g.lineWidth = 1;
        g.strokeRect(x, y, cellW, isHeader ? headerH : rowH);

        var value = rows[r] && rows[r][c] != null ? String(rows[r][c]) : "";
        var maxChars = Math.max(5, Math.floor(cellW / 13));
        if (value.length > maxChars) value = value.slice(0, Math.max(2, maxChars - 3)) + "...";

        g.fillStyle = "#24364b";
        g.font = (isHeader ? '700 ' : '500 ') + '18px "Noto Sans KR","Malgun Gothic",Arial,sans-serif';
        g.fillText(value, x + 8, y + (isHeader ? headerH : rowH) / 2);
      }

      y += isHeader ? headerH : rowH;
    }

    g.fillStyle = "#7b8899";
    g.font = '500 15px "Noto Sans KR","Malgun Gothic",Arial,sans-serif';
    g.textAlign = "right";
    g.fillText(
      "행 " + (rowStart + 1) + "-" + rowEnd + " · 열 " + (colStart + 1) + "-" + colEnd,
      pageW - margin,
      pageH - 34
    );

    g.textAlign = "left";
    g.textBaseline = "alphabetic";
    return canvas;
  }

  async function xlsxToPdf(file, ctx, setProgress, setStatus) {
    if (file.size > 30 * 1024 * 1024) throw new Error("XLSX는 30MB 이하 파일만 처리할 수 있습니다.");

    var XLSX = await ensureXlsx(ctx);
    var JsPDF = await ensureJsPdf(ctx);

    var wb = XLSX.read(await file.arrayBuffer(), {
      type:"array",
      cellDates:true
    });

    var sheetNames = wb.SheetNames.slice(0, 20);
    if (!sheetNames.length) throw new Error("XLSX에서 워크시트를 찾지 못했습니다.");

    var prepared = [];
    var totalDataRows = 0;
    var estimatedPages = 0;

    sheetNames.forEach(function (name) {
      var rows = normalizeSheetRows(XLSX, wb.Sheets[name]);

      if (!rows.length) rows = [[""]];
      totalDataRows += rows.length;

      if (totalDataRows > 5000) {
        throw new Error("전체 워크시트 행이 5,000개를 넘습니다. 큰 파일은 시트를 나누어 변환해 주세요.");
      }

      var cols = Math.max(1, rows.reduce(function (m, row) { return Math.max(m, row.length); }, 0));
      var colChunk = 9;
      var rowChunk = 19;
      estimatedPages += Math.ceil(cols / colChunk) * Math.ceil(rows.length / rowChunk);

      prepared.push({ name:name, rows:rows, cols:cols });
    });

    if (estimatedPages > 300) throw new Error("결과 PDF가 300페이지를 넘습니다.");

    var pdf = null;
    var pageNo = 0;

    for (var s = 0; s < prepared.length; s += 1) {
      var sheet = prepared[s];
      var colChunk = 9;
      var rowChunk = 19;

      for (var c = 0; c < sheet.cols; c += colChunk) {
        var cEnd = Math.min(sheet.cols, c + colChunk);

        for (var r = 0; r < sheet.rows.length; r += rowChunk) {
          var rEnd = Math.min(sheet.rows.length, r + rowChunk);
          pageNo += 1;

          setStatus(
            sheet.name + " · " + pageNo + " / " + estimatedPages + " PDF 페이지 만드는 중..."
          );
          setProgress(percent(pageNo - 1, estimatedPages));

          var canvas = tablePageCanvas(sheet.name, sheet.rows, r, rEnd, c, cEnd);

          if (!pdf) {
            pdf = new JsPDF({
              orientation:"landscape",
              unit:"mm",
              format:"a4",
              compress:true
            });
          } else {
            pdf.addPage("a4", "landscape");
          }

          pdf.addImage(
            canvas.toDataURL("image/jpeg", 0.92),
            "JPEG",
            0,
            0,
            297,
            210,
            undefined,
            "FAST"
          );
        }
      }
    }

    setProgress(1);
    pdf.save(safeBaseName(file.name) + ".pdf");

    return {
      text:sheetNames.length + "개 시트 · " + estimatedPages + " PDF 페이지",
      downloaded:true
    };
  }

  function containRect(srcW, srcH, dstW, dstH) {
    var scale = Math.min(dstW / srcW, dstH / srcH);
    var w2 = srcW * scale;
    var h2 = srcH * scale;

    return {
      x:(dstW - w2) / 2,
      y:(dstH - h2) / 2,
      w:w2,
      h:h2
    };
  }

  async function pdfToPptx(file, ctx, setProgress, setStatus) {
    if (file.size > 60 * 1024 * 1024) throw new Error("PDF는 60MB 이하 파일만 처리할 수 있습니다.");

    var pdfjs = await ensurePdfJs(ctx);
    var PptxGenJS = await ensurePptxGen(ctx);

    var pdf = await pdfjs.getDocument({ data:await file.arrayBuffer() }).promise;
    if (pdf.numPages > 100) {
      if (pdf.destroy) await pdf.destroy();
      throw new Error("PDF → PPTX는 최대 100페이지까지 처리할 수 있습니다.");
    }

    var pptx = new PptxGenJS();
    pptx.layout = "LAYOUT_WIDE";
    pptx.author = "HealingMart Converter";
    pptx.subject = "PDF to PPTX";
    pptx.title = safeBaseName(file.name);
    pptx.company = "HealingMart";

    var slideW = 13.333;
    var slideH = 7.5;

    for (var i = 1; i <= pdf.numPages; i += 1) {
      setStatus(i + " / " + pdf.numPages + " 페이지를 PowerPoint 슬라이드로 만드는 중...");
      setProgress(percent(i - 1, pdf.numPages));

      var page = await pdf.getPage(i);
      var viewport = page.getViewport({ scale:1.5 });
      var canvas = d.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);

      await page.render({
        canvasContext:canvas.getContext("2d"),
        viewport:viewport
      }).promise;

      var rect = containRect(canvas.width, canvas.height, slideW, slideH);
      var slide = pptx.addSlide();

      slide.addImage({
        data:canvas.toDataURL("image/jpeg", 0.9),
        x:rect.x,
        y:rect.y,
        w:rect.w,
        h:rect.h
      });

      if (page.cleanup) page.cleanup();
    }

    if (pdf.destroy) await pdf.destroy();

    setProgress(0.98);
    setStatus("PPTX 파일을 압축해 다운로드하는 중입니다...");

    await pptx.writeFile({
      fileName:safeBaseName(file.name) + ".pptx",
      compression:true
    });

    setProgress(1);

    return {
      text:pdf.numPages + "개 슬라이드 · 페이지 이미지 기반 PPTX",
      downloaded:true
    };
  }

  function svgDimensions(svgText) {
    try {
      var doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
      var root = doc.documentElement;
      var vb = String(root.getAttribute("viewBox") || "").trim().split(/\s+/).map(Number);

      if (vb.length === 4 && vb[2] > 0 && vb[3] > 0) {
        return { width:vb[2], height:vb[3] };
      }

      var width = parseFloat(root.getAttribute("width")) || 1280;
      var height = parseFloat(root.getAttribute("height")) || 720;
      return { width:width, height:height };
    } catch (e) {
      return { width:1280, height:720 };
    }
  }

  async function svgToCanvas(svgText, targetWidth, background) {
    var dims = svgDimensions(svgText);
    var ratio = dims.width / dims.height;
    if (!(ratio > 0)) ratio = 16 / 9;

    var width = Math.max(640, Number(targetWidth) || 1600);
    var height = Math.max(360, Math.round(width / ratio));

    var blob = new Blob([svgText], { type:"image/svg+xml;charset=utf-8" });
    var url = URL.createObjectURL(blob);

    try {
      var img = await new Promise(function (resolve, reject) {
        var el = new Image();
        el.onload = function () { resolve(el); };
        el.onerror = function () { reject(new Error("렌더링한 슬라이드 SVG를 이미지로 읽지 못했습니다.")); };
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

  function canvasBlob(canvas, type, quality) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        if (!blob) reject(new Error("슬라이드 이미지 파일을 만들지 못했습니다."));
        else resolve(blob);
      }, type, quality);
    });
  }

  async function pptxRender(file, x, ctx, opts, setProgress, setStatus) {
    if (file.size > 40 * 1024 * 1024) {
      throw new Error("PPTX는 40MB 이하 파일만 처리할 수 있습니다.");
    }

    var mod = await ensurePptxSvg();
    var renderer = new mod.PptxRenderer({ logLevel:"error" });

    setStatus("PowerPoint 렌더링 엔진을 준비하는 중입니다...");
    await renderer.init();

    setStatus("PPTX 구조를 읽는 중입니다...");
    await renderer.loadPptx(await file.arrayBuffer());

    var total = renderer.getSlideCount();

    if (!total) throw new Error("PPTX에서 슬라이드를 찾지 못했습니다.");
    if (total > 100) throw new Error("PPTX는 최대 100슬라이드까지 처리할 수 있습니다.");

    var indexes = [];

    for (var i = 0; i < total; i += 1) {
      if (!opts.includeHidden && renderer.isSlideHidden(i)) continue;
      indexes.push(i);
    }

    if (!indexes.length) throw new Error("변환할 슬라이드가 없습니다.");

    var output = String(x.toFormat || "").toUpperCase();
    var targetWidth = Number(opts.width) || 1600;

    if (output === "PDF") {
      var JsPDF = await ensureJsPdf(ctx);
      var pdf = null;

      for (var p = 0; p < indexes.length; p += 1) {
        var idx = indexes[p];

        setStatus((p + 1) + " / " + indexes.length + " 슬라이드를 PDF로 렌더링하는 중...");
        setProgress(percent(p, indexes.length));

        var svg = renderer.renderSlideSvg(idx);
        var rendered = await svgToCanvas(svg, targetWidth, "#ffffff");
        var canvas = rendered.canvas;
        var pageW = 960;
        var pageH = pageW / rendered.ratio;

        if (!pdf) {
          pdf = new JsPDF({
            orientation:rendered.ratio >= 1 ? "landscape" : "portrait",
            unit:"pt",
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
          canvas.toDataURL("image/jpeg", 0.92),
          "JPEG",
          0,
          0,
          pageW,
          pageH,
          undefined,
          "FAST"
        );
      }

      setProgress(1);
      pdf.save(safeBaseName(file.name) + ".pdf");

      return {
        text:indexes.length + "개 슬라이드 · 정적 렌더링 PDF",
        downloaded:true
      };
    }

    var mime = output === "PNG" ? "image/png" : "image/jpeg";
    var ext = output === "PNG" ? "png" : "jpg";
    var blobs = [];

    for (var j = 0; j < indexes.length; j += 1) {
      var slideIdx = indexes[j];

      setStatus((j + 1) + " / " + indexes.length + " 슬라이드 이미지 만드는 중...");
      setProgress(percent(j, indexes.length));

      var svgText = renderer.renderSlideSvg(slideIdx);
      var r = await svgToCanvas(
        svgText,
        targetWidth,
        output === "JPG" ? "#ffffff" : null
      );

      var blob = await canvasBlob(
        r.canvas,
        mime,
        output === "JPG" ? 0.92 : 1
      );

      blobs.push({
        name:"slide-" + String(slideIdx + 1).padStart(3, "0") + "." + ext,
        blob:blob
      });
    }

    setProgress(0.96);

    if (blobs.length === 1) {
      downloadBlob(blobs[0].blob, safeBaseName(file.name) + "-" + blobs[0].name);
    } else {
      setStatus("슬라이드 이미지를 ZIP으로 묶는 중입니다...");
      var JSZip = await ensureJsZip(ctx);
      var zip = new JSZip();

      blobs.forEach(function (item) {
        zip.file(item.name, item.blob);
      });

      var zipBlob = await zip.generateAsync({
        type:"blob",
        compression:"DEFLATE"
      });

      downloadBlob(
        zipBlob,
        safeBaseName(file.name) + "-" + ext + "-slides.zip"
      );
    }

    setProgress(1);

    return {
      text:indexes.length + "개 슬라이드 · " + output,
      downloaded:true
    };
  }

  function limitation(x) {
    var id = String(x.id || "");

    if (id === "pdf-xlsx") {
      return "PDF의 글자 위치를 기준으로 행과 셀을 추정해 각 페이지를 별도 Excel 시트로 만듭니다. 원본이 실제 표 구조를 가진 PDF라도 병합 셀·테두리·수식까지 복원하는 기능은 아닙니다.";
    }

    if (id === "xlsx-pdf") {
      return "셀 값을 시트별 표로 렌더링합니다. Excel 차트·그림·피벗·조건부 서식과 인쇄 영역을 완전히 재현하지는 않습니다. 한글 안정성을 위해 결과 PDF는 표 이미지 기반입니다.";
    }

    if (id === "pdf-pptx") {
      return "PDF 각 페이지를 이미지로 렌더링해 PowerPoint 한 슬라이드씩 배치합니다. 결과 슬라이드의 글자와 도형은 개별 편집 객체가 아니라 페이지 이미지입니다.";
    }

    if (id === "pptx-pdf") {
      return "PPTX의 정적인 슬라이드 화면을 PDF로 변환합니다. 애니메이션과 전환 효과는 포함하지 않으며, 설치되지 않은 글꼴은 대체 글꼴로 렌더링될 수 있습니다.";
    }

    return "PPTX의 정적인 슬라이드 화면을 이미지로 렌더링합니다. 애니메이션과 전환 효과는 이미지에 포함되지 않습니다. 여러 슬라이드는 ZIP으로 다운로드합니다.";
  }

  NS.office = {
    version:"1.0.0",

    open:function (x, ctx) {
      injectStyle();

      var selectedFile = null;
      var objectUrl = "";
      var from = String(x.fromFormat || "").toUpperCase();
      var to = String(x.toFormat || "").toUpperCase();
      var pptxInput = from === "PPTX";

      ctx.stage.innerHTML =
        '<div class="hm-fx-detail">' +
          '<div class="hm-fx-toolbar"><a class="hm-fx-back" href="' +
            ctx.route({ category:x.category }) +
            '" data-route>← ' + ctx.esc(ctx.cat(x.category).name) + '</a></div>' +
          ctx.titleBlock(x) +
          '<div class="hm-of-box">' +
            '<div class="hm-of-drop" data-of-drop>' +
              '<strong>' + ctx.esc(from) + ' 파일을 선택하거나 끌어다 놓으세요</strong>' +
              '<span>파일은 외부 변환 서버로 전송하지 않고 브라우저에서 처리합니다.</span>' +
              '<input type="file" hidden data-of-file accept="' + ctx.esc(x.accept || "") + '">' +
            '</div>' +
            '<div class="hm-of-file" data-of-fileinfo><strong data-of-name></strong><span data-of-meta></span></div>' +
            '<div class="hm-of-options">' +
              (pptxInput
                ? '<div class="hm-of-field"><label>출력 해상도</label><select data-of-width><option value="1280">1280px</option><option value="1600" selected>1600px</option><option value="1920">1920px</option></select></div>' +
                  '<div class="hm-of-field"><label>숨김 슬라이드</label><select data-of-hidden><option value="no" selected>제외</option><option value="yes">포함</option></select></div>'
                : '<div class="hm-of-field"><label>처리 방식</label><select disabled><option>브라우저 로컬 변환</option></select></div>' +
                  '<div class="hm-of-field"><label>출력 형식</label><select disabled><option>' + ctx.esc(to) + '</option></select></div>') +
              '<div class="hm-of-field"><label>파일 전송</label><select disabled><option>서버 업로드 없음</option></select></div>' +
            '</div>' +
            '<div class="hm-of-actions"><button class="hm-of-btn primary" type="button" data-of-run disabled>변환 시작</button></div>' +
            '<div class="hm-of-progress" data-of-progress><div class="hm-of-track"><div class="hm-of-bar" data-of-bar></div></div>' +
              '<div class="hm-of-progressline"><span data-of-progress-label>준비 중</span><span data-of-percent>0%</span></div></div>' +
            '<div class="hm-of-status" data-of-status>파일을 선택해 주세요.</div>' +
            '<div class="hm-of-result" data-of-result><strong data-of-result-title>변환 완료</strong><span data-of-result-meta></span></div>' +
            '<div class="hm-of-note">' + ctx.esc(limitation(x)) + '</div>' +
            '<div class="hm-of-version">Office Render Engine v1.0.0</div>' +
          '</div>' +
        '</div>';

      var drop = ctx.stage.querySelector("[data-of-drop]");
      var input = ctx.stage.querySelector("[data-of-file]");
      var fileInfo = ctx.stage.querySelector("[data-of-fileinfo]");
      var nameEl = ctx.stage.querySelector("[data-of-name]");
      var metaEl = ctx.stage.querySelector("[data-of-meta]");
      var widthEl = ctx.stage.querySelector("[data-of-width]");
      var hiddenEl = ctx.stage.querySelector("[data-of-hidden]");
      var run = ctx.stage.querySelector("[data-of-run]");
      var progressWrap = ctx.stage.querySelector("[data-of-progress]");
      var bar = ctx.stage.querySelector("[data-of-bar]");
      var progressLabel = ctx.stage.querySelector("[data-of-progress-label]");
      var pct = ctx.stage.querySelector("[data-of-percent]");
      var status = ctx.stage.querySelector("[data-of-status]");
      var result = ctx.stage.querySelector("[data-of-result]");
      var resultMeta = ctx.stage.querySelector("[data-of-result-meta]");

      function setProgress(value, label) {
        value = Math.max(0, Math.min(1, Number(value) || 0));
        var p = Math.round(value * 100);
        bar.style.width = p + "%";
        pct.textContent = p + "%";
        if (label) progressLabel.textContent = label;
      }

      function setStatus(message) {
        status.textContent = message;
      }

      function validExt(file) {
        var name = String(file && file.name || "").toLowerCase();
        if (from === "PDF") return name.endsWith(".pdf");
        if (from === "XLSX") return name.endsWith(".xlsx");
        if (from === "PPTX") return name.endsWith(".pptx");
        return false;
      }

      function choose(file) {
        result.classList.remove("is-show");

        if (!file || !validExt(file)) {
          selectedFile = null;
          run.disabled = true;
          setStatus(from + " 파일을 선택해 주세요.");
          return;
        }

        selectedFile = file;
        fileInfo.style.display = "block";
        nameEl.textContent = file.name;
        metaEl.textContent = niceBytes(file.size) + " · " + from + " → " + to;
        run.disabled = false;
        setStatus("준비되었습니다. 변환 시작을 눌러 주세요.");
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
        result.classList.remove("is-show");
        progressWrap.classList.add("is-show");
        setProgress(0.01, "준비");

        try {
          var info;

          if (x.id === "pdf-xlsx") {
            info = await pdfToXlsx(selectedFile, ctx, setProgress, setStatus);
          } else if (x.id === "xlsx-pdf") {
            info = await xlsxToPdf(selectedFile, ctx, setProgress, setStatus);
          } else if (x.id === "pdf-pptx") {
            info = await pdfToPptx(selectedFile, ctx, setProgress, setStatus);
          } else if (x.id === "pptx-pdf" || x.id === "doc-pptx-jpg" || x.id === "doc-pptx-png") {
            info = await pptxRender(
              selectedFile,
              x,
              ctx,
              {
                width:widthEl ? Number(widthEl.value) : 1600,
                includeHidden:hiddenEl ? hiddenEl.value === "yes" : false
              },
              setProgress,
              setStatus
            );
          } else {
            throw new Error("지원하지 않는 Office 변환입니다.");
          }

          resultMeta.textContent = info && info.text ? info.text : "변환이 완료되었습니다.";
          result.classList.add("is-show");
          setProgress(1, "완료");
          setStatus("변환을 완료했습니다. 다운로드가 시작되지 않았다면 브라우저의 다운로드 허용 상태를 확인해 주세요.");
        } catch (error) {
          setProgress(0, "오류");
          setStatus("변환 중 오류가 발생했습니다: " + (error.message || error));
        } finally {
          run.disabled = false;
        }
      };
    }
  };
})(window);
