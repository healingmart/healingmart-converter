/*
 * HealingMart Converter PDF Engine v1.0.0
 * Multi-image to PDF / all PDF pages to JPG or PNG
 */
(function (w) {
  "use strict";

  var d = w.document;
  var NS = w.HM_CONVERTER_ENGINES = w.HM_CONVERTER_ENGINES || {};

  function injectStyle() {
    if (d.getElementById("hm-engine-pdf-style-v1")) return;
    var style = d.createElement("style");
    style.id = "hm-engine-pdf-style-v1";
    style.textContent = [
      ".hm-pdf-box{padding:22px;border:1px solid #dfe6ef;border-radius:20px;background:#fff;box-shadow:0 12px 34px rgba(15,23,42,.07)}",
      ".hm-pdf-drop{padding:34px 18px;border:2px dashed #aebff0;border-radius:17px;background:#f8fbff;text-align:center;cursor:pointer;transition:.16s ease}",
      ".hm-pdf-drop:hover,.hm-pdf-drop.is-drag{border-color:#2f7cf6;background:#fff}",
      ".hm-pdf-drop strong{display:block;color:#13253a;font-size:18px;font-weight:950}",
      ".hm-pdf-drop span{display:block;margin-top:5px;color:#6d7b90;font-size:12px}",
      ".hm-pdf-options{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:15px}",
      ".hm-pdf-field label{display:block;margin-bottom:5px;color:#536176;font-size:11px;font-weight:850}",
      ".hm-pdf-field input,.hm-pdf-field select{width:100%;height:42px;padding:0 10px;border:1px solid #d7e0ea;border-radius:10px;background:#fff;color:#172033;outline:none}",
      ".hm-pdf-list{display:grid;gap:8px;margin-top:14px}",
      ".hm-pdf-item{display:grid;grid-template-columns:50px minmax(0,1fr) auto;align-items:center;gap:10px;padding:9px;border:1px solid #e0e7ef;border-radius:12px;background:#fbfdff}",
      ".hm-pdf-thumb{width:50px;height:50px;object-fit:cover;border-radius:8px;background:#eef3f8}",
      ".hm-pdf-name{overflow:hidden;color:#1a2b3e;font-size:12px;font-weight:900;text-overflow:ellipsis;white-space:nowrap}",
      ".hm-pdf-meta{margin-top:3px;color:#718095;font-size:10px}",
      ".hm-pdf-controls{display:flex;gap:4px}",
      ".hm-pdf-controls button{width:31px;height:31px;border:1px solid #d8e1eb;border-radius:8px;background:#fff;color:#526176;font-weight:900;cursor:pointer}",
      ".hm-pdf-actions{display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin-top:16px}",
      ".hm-pdf-btn{min-height:44px;padding:0 17px;border:1px solid #d6e0ea;border-radius:11px;background:#fff;color:#223248;font-size:12px;font-weight:900;cursor:pointer}",
      ".hm-pdf-btn.primary{color:#fff;border-color:#4d69e8;background:linear-gradient(135deg,#6d5dfc,#2f7cf6);box-shadow:0 8px 20px rgba(71,91,229,.22)}",
      ".hm-pdf-btn:disabled{opacity:.48;cursor:not-allowed}",
      ".hm-pdf-status{margin-top:13px;padding:11px 12px;border-radius:11px;background:#f4f7fb;color:#58677d;font-size:11px;line-height:1.6}",
      ".hm-pdf-results{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin-top:15px}",
      ".hm-pdf-result{min-width:0;padding:9px;border:1px solid #dfe7ef;border-radius:11px;background:#fff}",
      ".hm-pdf-result img{width:100%;height:135px;object-fit:contain;border-radius:7px;background:#f3f6fa}",
      ".hm-pdf-result strong{display:block;margin-top:7px;overflow:hidden;color:#23354a;font-size:10px;text-overflow:ellipsis;white-space:nowrap}",
      ".hm-pdf-download{display:flex;align-items:center;justify-content:center;min-height:35px;margin-top:7px;border-radius:8px;background:#0e8a69;color:#fff!important;font-size:10px;font-weight:900;text-decoration:none}",
      ".hm-pdf-version{margin-top:10px;color:#8a97a8;font-size:9px;text-align:right}",
      "@media(max-width:760px){.hm-pdf-box{padding:13px 9px;border-radius:15px}.hm-pdf-options{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.hm-pdf-results{grid-template-columns:repeat(2,minmax(0,1fr))}.hm-pdf-result img{height:110px}}"
    ].join("");
    d.head.appendChild(style);
  }

  function niceBytes(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + " KB";
    return (bytes / 1024 / 1024).toFixed(2) + " MB";
  }

  function safeBaseName(name) {
    return String(name || "file").replace(/\.[^.]+$/, "").replace(/[\\/:*?"<>|]+/g, "_");
  }

  function loadImage(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.decoding = "async";
      img.onload = function () { resolve({ img: img, url: url }); };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error(file.name + " 파일을 읽지 못했습니다."));
      };
      img.src = url;
    });
  }

  function parseRange(value, total) {
    var input = String(value || "").trim();
    if (!input) {
      return Array.from({ length: Math.min(total, 100) }, function (_, i) { return i + 1; });
    }
    var set = {};
    input.split(",").forEach(function (part) {
      part = part.trim();
      if (!part) return;
      var range = part.match(/^(\d+)\s*-\s*(\d+)$/);
      if (range) {
        var a = Number(range[1]);
        var b = Number(range[2]);
        var start = Math.min(a, b);
        var end = Math.max(a, b);
        for (var i = start; i <= end && i <= total; i += 1) {
          if (i >= 1) set[i] = true;
        }
      } else if (/^\d+$/.test(part)) {
        var n = Number(part);
        if (n >= 1 && n <= total) set[n] = true;
      }
    });
    var pages = Object.keys(set).map(Number).sort(function (a, b) { return a - b; });
    if (pages.length > 100) pages = pages.slice(0, 100);
    return pages;
  }

  async function ensureJsPdf(ctx) {
    if (!w.jspdf) {
      await ctx.loadScript("https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js");
    }
    if (!w.jspdf || !w.jspdf.jsPDF) throw new Error("PDF 생성 라이브러리를 불러오지 못했습니다.");
    return w.jspdf.jsPDF;
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

  async function ensureZip(ctx) {
    if (!w.JSZip) {
      await ctx.loadScript("https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js");
    }
    if (!w.JSZip) throw new Error("ZIP 라이브러리를 불러오지 못했습니다.");
    return w.JSZip;
  }

  function autoOrientation(width, height) {
    return width >= height ? "landscape" : "portrait";
  }

  function fixedPage(format, orientation) {
    var portrait = orientation !== "landscape";
    if (format === "letter") return portrait ? [215.9, 279.4] : [279.4, 215.9];
    return portrait ? [210, 297] : [297, 210];
  }

  async function openImagePdf(x, ctx) {
    ctx.stage.innerHTML =
      '<div class="hm-fx-detail">' +
        '<div class="hm-fx-toolbar"><a class="hm-fx-back" href="' +
          ctx.route({ category: x.category }) +
          '" data-route>\u2190 ' + ctx.esc(ctx.cat(x.category).name) + '</a></div>' +
        ctx.titleBlock(x) +
        '<div class="hm-pdf-box">' +
          '<div class="hm-pdf-drop" data-pdf-drop>' +
            '<strong>이미지를 여러 장 선택하세요</strong>' +
            '<span>목록 순서대로 한 개의 PDF를 만듭니다.</span>' +
            '<input type="file" hidden multiple data-pdf-file accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp">' +
          '</div>' +
          '<div class="hm-pdf-options">' +
            '<div class="hm-pdf-field"><label>페이지 크기</label><select data-pdf-size><option value="auto">이미지 크기</option><option value="a4">A4</option><option value="letter">Letter</option></select></div>' +
            '<div class="hm-pdf-field"><label>방향</label><select data-pdf-orient><option value="auto">자동</option><option value="portrait">세로</option><option value="landscape">가로</option></select></div>' +
            '<div class="hm-pdf-field"><label>여백</label><select data-pdf-margin><option value="0">없음</option><option value="10">10 mm</option><option value="20">20 mm</option></select></div>' +
            '<div class="hm-pdf-field"><label>파일 이름</label><input type="text" value="healingmart-images" data-pdf-name></div>' +
          '</div>' +
          '<div class="hm-pdf-list" data-pdf-list></div>' +
          '<div class="hm-pdf-actions"><button class="hm-pdf-btn" type="button" data-pdf-clear disabled>전체 지우기</button><button class="hm-pdf-btn primary" type="button" data-pdf-run disabled>PDF 만들기</button></div>' +
          '<div class="hm-pdf-status" data-pdf-status>여러 장을 선택한 뒤 순서를 조정할 수 있습니다.</div>' +
          '<div class="hm-pdf-version">PDF Engine v1.0.0</div>' +
        '</div>' +
      '</div>';

    var drop = ctx.stage.querySelector("[data-pdf-drop]");
    var input = ctx.stage.querySelector("[data-pdf-file]");
    var list = ctx.stage.querySelector("[data-pdf-list]");
    var clear = ctx.stage.querySelector("[data-pdf-clear]");
    var run = ctx.stage.querySelector("[data-pdf-run]");
    var status = ctx.stage.querySelector("[data-pdf-status]");
    var pageSize = ctx.stage.querySelector("[data-pdf-size]");
    var orient = ctx.stage.querySelector("[data-pdf-orient]");
    var margin = ctx.stage.querySelector("[data-pdf-margin]");
    var fileName = ctx.stage.querySelector("[data-pdf-name]");
    var items = [];

    function sync() {
      run.disabled = items.length === 0;
      clear.disabled = items.length === 0;
    }

    function renderList() {
      list.innerHTML = "";
      items.forEach(function (item, index) {
        var row = d.createElement("div");
        row.className = "hm-pdf-item";

        var thumb = d.createElement("img");
        thumb.className = "hm-pdf-thumb";
        thumb.src = item.url;
        thumb.alt = "";

        var copy = d.createElement("div");
        var name = d.createElement("div");
        name.className = "hm-pdf-name";
        name.textContent = item.file.name;
        var meta = d.createElement("div");
        meta.className = "hm-pdf-meta";
        meta.textContent = niceBytes(item.file.size);
        copy.appendChild(name);
        copy.appendChild(meta);

        var controls = d.createElement("div");
        controls.className = "hm-pdf-controls";

        var up = d.createElement("button");
        up.type = "button";
        up.textContent = "↑";
        up.disabled = index === 0;
        up.onclick = function () {
          var prev = items[index - 1];
          items[index - 1] = items[index];
          items[index] = prev;
          renderList();
        };

        var down = d.createElement("button");
        down.type = "button";
        down.textContent = "↓";
        down.disabled = index === items.length - 1;
        down.onclick = function () {
          var next = items[index + 1];
          items[index + 1] = items[index];
          items[index] = next;
          renderList();
        };

        var remove = d.createElement("button");
        remove.type = "button";
        remove.textContent = "×";
        remove.onclick = function () {
          URL.revokeObjectURL(item.url);
          items.splice(index, 1);
          renderList();
        };

        controls.appendChild(up);
        controls.appendChild(down);
        controls.appendChild(remove);

        row.appendChild(thumb);
        row.appendChild(copy);
        row.appendChild(controls);
        list.appendChild(row);
      });
      sync();
    }

    function addFiles(files) {
      Array.prototype.forEach.call(files || [], function (file) {
        if (!/^image\/(jpeg|png|webp)$/i.test(file.type) &&
            !/\.(jpe?g|png|webp)$/i.test(file.name)) return;
        items.push({ file: file, url: URL.createObjectURL(file) });
      });
      renderList();
      status.textContent = items.length + "개 이미지가 준비되었습니다.";
    }

    drop.onclick = function () { input.click(); };
    drop.ondragover = function (e) { e.preventDefault(); drop.classList.add("is-drag"); };
    drop.ondragleave = function () { drop.classList.remove("is-drag"); };
    drop.ondrop = function (e) {
      e.preventDefault();
      drop.classList.remove("is-drag");
      addFiles(e.dataTransfer.files);
    };
    input.onchange = function () {
      addFiles(input.files);
      input.value = "";
    };

    clear.onclick = function () {
      items.forEach(function (item) { URL.revokeObjectURL(item.url); });
      items = [];
      list.innerHTML = "";
      status.textContent = "파일 목록을 비웠습니다.";
      sync();
    };

    run.onclick = async function () {
      if (!items.length) return;
      run.disabled = true;
      clear.disabled = true;
      try {
        var JsPDF = await ensureJsPdf(ctx);
        var pdf = null;
        var selectedSize = pageSize.value;
        var selectedOrientation = orient.value;
        var marginMm = Number(margin.value) || 0;

        for (var i = 0; i < items.length; i += 1) {
          status.textContent = (i + 1) + " / " + items.length + " 페이지 처리 중...";
          var loaded = await loadImage(items[i].file);
          try {
            var img = loaded.img;
            var pageOrientation = selectedOrientation === "auto" ?
              autoOrientation(img.naturalWidth, img.naturalHeight) :
              selectedOrientation;

            var pageW;
            var pageH;
            var unit;
            var drawX;
            var drawY;
            var drawW;
            var drawH;

            if (selectedSize === "auto") {
              unit = "px";
              pageW = img.naturalWidth;
              pageH = img.naturalHeight;
              if (pageOrientation === "portrait" && pageW > pageH) {
                var swap1 = pageW; pageW = pageH; pageH = swap1;
              }
              if (pageOrientation === "landscape" && pageW < pageH) {
                var swap2 = pageW; pageW = pageH; pageH = swap2;
              }
              var marginPx = marginMm * 3.7795275591;
              var scaleAuto = Math.min(
                (pageW - marginPx * 2) / img.naturalWidth,
                (pageH - marginPx * 2) / img.naturalHeight
              );
              drawW = img.naturalWidth * scaleAuto;
              drawH = img.naturalHeight * scaleAuto;
              drawX = (pageW - drawW) / 2;
              drawY = (pageH - drawH) / 2;
            } else {
              unit = "mm";
              var dims = fixedPage(selectedSize, pageOrientation);
              pageW = dims[0];
              pageH = dims[1];
              var scaleFixed = Math.min(
                (pageW - marginMm * 2) / img.naturalWidth,
                (pageH - marginMm * 2) / img.naturalHeight
              );
              drawW = img.naturalWidth * scaleFixed;
              drawH = img.naturalHeight * scaleFixed;
              drawX = (pageW - drawW) / 2;
              drawY = (pageH - drawH) / 2;
            }

            if (!pdf) {
              pdf = new JsPDF({
                orientation: pageOrientation,
                unit: unit,
                format: [pageW, pageH],
                hotfixes: ["px_scaling"]
              });
            } else {
              pdf.addPage([pageW, pageH], pageOrientation);
            }

            var format = /png/i.test(items[i].file.type) || /\.png$/i.test(items[i].file.name) ? "PNG" : "JPEG";
            pdf.addImage(img, format, drawX, drawY, drawW, drawH, undefined, "FAST");
          } finally {
            URL.revokeObjectURL(loaded.url);
          }
        }

        var outName = safeBaseName(fileName.value || "healingmart-images") + ".pdf";
        pdf.save(outName);
        status.textContent = items.length + "페이지 PDF 다운로드를 시작했습니다.";
      } catch (error) {
        status.textContent = "PDF 생성 중 오류가 발생했습니다: " + (error.message || error);
      } finally {
        run.disabled = false;
        clear.disabled = false;
      }
    };
  }

  async function openPdfImage(x, ctx) {
    ctx.stage.innerHTML =
      '<div class="hm-fx-detail">' +
        '<div class="hm-fx-toolbar"><a class="hm-fx-back" href="' +
          ctx.route({ category: x.category }) +
          '" data-route>\u2190 ' + ctx.esc(ctx.cat(x.category).name) + '</a></div>' +
        ctx.titleBlock(x) +
        '<div class="hm-pdf-box">' +
          '<div class="hm-pdf-drop" data-pdf-drop>' +
            '<strong>PDF 파일을 선택하세요</strong>' +
            '<span>전체 페이지 또는 원하는 페이지만 ' + ctx.esc(x.toFormat) + '로 변환합니다.</span>' +
            '<input type="file" hidden data-pdf-file accept=".pdf,application/pdf">' +
          '</div>' +
          '<div class="hm-pdf-options">' +
            '<div class="hm-pdf-field"><label>페이지 범위</label><input type="text" placeholder="비우면 전체 · 예: 1-3,5" data-pdf-range></div>' +
            '<div class="hm-pdf-field"><label>해상도</label><select data-pdf-scale><option value="1.5">보통</option><option value="2" selected>고화질</option><option value="3">매우 높음</option></select></div>' +
            '<div class="hm-pdf-field"><label>JPG 품질</label><select data-pdf-quality ' + (x.toFormat === "JPG" ? "" : "disabled") + '><option value="0.8">80%</option><option value="0.92" selected>92%</option><option value="1">100%</option></select></div>' +
            '<div class="hm-pdf-field"><label>PDF 정보</label><input type="text" readonly value="파일을 선택하세요" data-pdf-info></div>' +
          '</div>' +
          '<div class="hm-pdf-actions"><button class="hm-pdf-btn primary" type="button" data-pdf-run disabled>페이지 변환</button><button class="hm-pdf-btn" type="button" data-pdf-zip hidden>ZIP으로 받기</button></div>' +
          '<div class="hm-pdf-status" data-pdf-status>PDF는 서버로 전송하지 않고 브라우저에서 처리합니다. 최대 100페이지까지 한 번에 변환합니다.</div>' +
          '<div class="hm-pdf-results" data-pdf-results></div>' +
          '<div class="hm-pdf-version">PDF Engine v1.0.0</div>' +
        '</div>' +
      '</div>';

    var drop = ctx.stage.querySelector("[data-pdf-drop]");
    var input = ctx.stage.querySelector("[data-pdf-file]");
    var range = ctx.stage.querySelector("[data-pdf-range]");
    var scale = ctx.stage.querySelector("[data-pdf-scale]");
    var quality = ctx.stage.querySelector("[data-pdf-quality]");
    var info = ctx.stage.querySelector("[data-pdf-info]");
    var run = ctx.stage.querySelector("[data-pdf-run]");
    var zipBtn = ctx.stage.querySelector("[data-pdf-zip]");
    var status = ctx.stage.querySelector("[data-pdf-status]");
    var resultsBox = ctx.stage.querySelector("[data-pdf-results]");
    var selectedFile = null;
    var pageCount = 0;
    var results = [];

    async function inspect(file) {
      selectedFile = file;
      run.disabled = true;
      status.textContent = "PDF 정보를 확인하는 중입니다...";
      try {
        var pdfjs = await ensurePdfJs(ctx);
        var data = await file.arrayBuffer();
        var pdf = await pdfjs.getDocument({ data: data }).promise;
        pageCount = pdf.numPages;
        info.value = pageCount + "페이지 · " + niceBytes(file.size);
        status.textContent = "PDF가 준비되었습니다. 변환할 페이지를 확인해 주세요.";
        run.disabled = false;
        if (pdf.destroy) await pdf.destroy();
      } catch (error) {
        selectedFile = null;
        pageCount = 0;
        info.value = "PDF 읽기 실패";
        status.textContent = "PDF를 읽지 못했습니다: " + (error.message || error);
      }
    }

    drop.onclick = function () { input.click(); };
    drop.ondragover = function (e) { e.preventDefault(); drop.classList.add("is-drag"); };
    drop.ondragleave = function () { drop.classList.remove("is-drag"); };
    drop.ondrop = function (e) {
      e.preventDefault();
      drop.classList.remove("is-drag");
      var file = e.dataTransfer.files[0];
      if (file && (/\.pdf$/i.test(file.name) || file.type === "application/pdf")) inspect(file);
    };
    input.onchange = function () {
      if (input.files[0]) inspect(input.files[0]);
      input.value = "";
    };

    run.onclick = async function () {
      if (!selectedFile || !pageCount) return;
      run.disabled = true;
      zipBtn.hidden = true;
      resultsBox.innerHTML = "";
      results = [];

      try {
        var pages = parseRange(range.value, pageCount);
        if (!pages.length) throw new Error("올바른 페이지 범위를 입력해 주세요.");
        if (!range.value.trim() && pageCount > 100) {
          status.textContent = "페이지가 많아 앞의 100페이지만 변환합니다.";
        }

        var pdfjs = await ensurePdfJs(ctx);
        var data = await selectedFile.arrayBuffer();
        var pdf = await pdfjs.getDocument({ data: data }).promise;
        var outputMime = x.toFormat === "PNG" ? "image/png" : "image/jpeg";
        var outputExt = x.toFormat.toLowerCase();
        var baseName = safeBaseName(selectedFile.name);

        for (var i = 0; i < pages.length; i += 1) {
          var pageNumber = pages[i];
          status.textContent = (i + 1) + " / " + pages.length + " 페이지 변환 중...";
          var page = await pdf.getPage(pageNumber);
          var viewport = page.getViewport({ scale: Number(scale.value) || 2 });
          var canvas = d.createElement("canvas");
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          var g = canvas.getContext("2d", { alpha: x.toFormat === "PNG" });
          if (x.toFormat === "JPG") {
            g.fillStyle = "#ffffff";
            g.fillRect(0, 0, canvas.width, canvas.height);
          }
          await page.render({ canvasContext: g, viewport: viewport }).promise;
          var blob = await new Promise(function (resolve, reject) {
            canvas.toBlob(function (value) {
              if (value) resolve(value);
              else reject(new Error("페이지 이미지를 생성하지 못했습니다."));
            }, outputMime, Number(quality.value) || 0.92);
          });
          var name = baseName + "-page-" + String(pageNumber).padStart(3, "0") + "." + outputExt;
          results.push({ blob: blob, name: name });

          var url = URL.createObjectURL(blob);
          var card = d.createElement("div");
          card.className = "hm-pdf-result";
          var img = d.createElement("img");
          img.src = url;
          img.alt = pageNumber + "페이지 미리보기";
          var title = d.createElement("strong");
          title.textContent = name;
          var link = d.createElement("a");
          link.className = "hm-pdf-download";
          link.href = url;
          link.download = name;
          link.textContent = "다운로드";
          card.appendChild(img);
          card.appendChild(title);
          card.appendChild(link);
          resultsBox.appendChild(card);
          if (page.cleanup) page.cleanup();
        }

        if (pdf.destroy) await pdf.destroy();
        zipBtn.hidden = results.length < 2;
        status.textContent = results.length + "페이지 변환을 완료했습니다.";
      } catch (error) {
        status.textContent = "PDF 변환 중 오류가 발생했습니다: " + (error.message || error);
      } finally {
        run.disabled = false;
      }
    };

    zipBtn.onclick = async function () {
      if (results.length < 2) return;
      zipBtn.disabled = true;
      status.textContent = "ZIP 파일을 만드는 중입니다...";
      try {
        var JSZip = await ensureZip(ctx);
        var zip = new JSZip();
        results.forEach(function (result) { zip.file(result.name, result.blob); });
        var blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
        var url = URL.createObjectURL(blob);
        var a = d.createElement("a");
        a.href = url;
        a.download = safeBaseName(selectedFile.name) + "-" + x.toFormat.toLowerCase() + ".zip";
        d.body.appendChild(a);
        a.click();
        a.remove();
        w.setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
        status.textContent = "ZIP 다운로드를 시작했습니다.";
      } catch (error) {
        status.textContent = "ZIP 생성 중 오류가 발생했습니다: " + (error.message || error);
      } finally {
        zipBtn.disabled = false;
      }
    };
  }

  NS.pdf = {
    version: "1.0.0",

    open: function (x, ctx) {
      injectStyle();
      if (x.engine === "image-pdf") return openImagePdf(x, ctx);
      if (x.engine === "pdf-image") return openPdfImage(x, ctx);
      throw new Error("지원하지 않는 PDF 엔진입니다.");
    }
  };
})(window);
