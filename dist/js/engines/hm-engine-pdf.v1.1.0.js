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


  function injectTextPdfStyle() {
    if (d.getElementById("hm-engine-pdf-text-style-v11")) return;
    var style = d.createElement("style");
    style.id = "hm-engine-pdf-text-style-v11";
    style.textContent = [
      ".hm-pdf-textarea{width:100%;min-height:260px;margin-top:14px;padding:15px;border:1px solid #d9e2ec;border-radius:12px;background:#fbfdff;color:#18283c;font:500 14px/1.75 ui-monospace,SFMono-Regular,Consolas,monospace;resize:vertical;outline:none}",
      ".hm-pdf-textarea:focus{border-color:#4f7df1;box-shadow:0 0 0 4px rgba(79,125,241,.10)}",
      ".hm-pdf-check{display:flex;align-items:center;gap:7px;min-height:42px;padding:0 10px;border:1px solid #d7e0ea;border-radius:10px;background:#fff;color:#34455b;font-size:12px;font-weight:800}",
      ".hm-pdf-check input{width:17px;height:17px}",
      ".hm-pdf-help{margin-top:12px;padding:12px 13px;border:1px solid #e1e8ef;border-radius:11px;background:#fbfdff;color:#5c6c82;font-size:11px;line-height:1.7}",
      ".hm-pdf-output-actions{display:flex;justify-content:flex-end;gap:7px;flex-wrap:wrap;margin-top:9px}",
      ".hm-pdf-output-actions button,.hm-pdf-output-actions a{display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:0 13px;border:1px solid #d7e0ea;border-radius:10px;background:#fff;color:#32455c!important;font-size:11px;font-weight:900;text-decoration:none;cursor:pointer}",
      ".hm-pdf-output-actions .primary{border-color:#0e8a69;background:#0e8a69;color:#fff!important}",
      ".hm-pdf-html-preview{margin-top:14px;padding:16px;border:1px solid #dfe7ef;border-radius:12px;background:#fff;color:#24364b;font-size:14px;line-height:1.75;white-space:pre-wrap;word-break:break-word}",
      ".hm-pdf-fileinfo{display:none;margin-top:12px;padding:11px 12px;border:1px solid #e0e7ef;border-radius:11px;background:#fbfdff;color:#405269;font-size:12px;font-weight:800}",
      "@media(max-width:760px){.hm-pdf-textarea{min-height:220px;font-size:13px}.hm-pdf-output-actions{justify-content:stretch}.hm-pdf-output-actions button,.hm-pdf-output-actions a{flex:1 1 auto}}"
    ].join("");
    d.head.appendChild(style);
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
    return new Promise(function (resolve, reject) {
      try {
        var ta = d.createElement("textarea");
        ta.value = value;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        d.body.appendChild(ta);
        ta.select();
        d.execCommand("copy");
        ta.remove();
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  function escapeTextHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function parsePageRangeLong(value, total, limit) {
    var input = String(value || "").trim();
    var maxPages = Number(limit) || 300;
    if (!input) {
      return Array.from({ length: Math.min(total, maxPages) }, function (_, i) { return i + 1; });
    }
    var set = {};
    input.split(",").forEach(function (part) {
      part = part.trim();
      if (!part) return;
      var range = part.match(/^(\d+)\s*-\s*(\d+)$/);
      if (range) {
        var a = Number(range[1]);
        var b = Number(range[2]);
        var first = Math.max(1, Math.min(a, b));
        var last = Math.min(total, Math.max(a, b));
        for (var i = first; i <= last && Object.keys(set).length < maxPages; i += 1) set[i] = true;
      } else if (/^\d+$/.test(part)) {
        var n = Number(part);
        if (n >= 1 && n <= total) set[n] = true;
      }
    });
    return Object.keys(set).map(Number).sort(function (a, b) { return a - b; }).slice(0, maxPages);
  }

  function pageTextFromContent(content) {
    var raw = (content && content.items) || [];
    var items = raw.map(function (item) {
      var tr = item.transform || [1, 0, 0, 1, 0, 0];
      return {
        text: String(item.str || ""),
        x: Number(tr[4]) || 0,
        y: Number(tr[5]) || 0,
        width: Number(item.width) || 0,
        hasEOL: !!item.hasEOL
      };
    }).filter(function (item) {
      return item.text.length > 0;
    });

    items.sort(function (a, b) {
      var dy = b.y - a.y;
      if (Math.abs(dy) > 2.5) return dy;
      return a.x - b.x;
    });

    var lines = [];
    items.forEach(function (item) {
      var line = null;
      for (var i = lines.length - 1; i >= 0; i -= 1) {
        if (Math.abs(lines[i].y - item.y) <= 2.5) {
          line = lines[i];
          break;
        }
        if (lines[i].y - item.y > 8) break;
      }
      if (!line) {
        line = { y: item.y, items: [] };
        lines.push(line);
      }
      line.items.push(item);
    });

    lines.sort(function (a, b) { return b.y - a.y; });

    return lines.map(function (line) {
      line.items.sort(function (a, b) { return a.x - b.x; });
      var out = "";
      var prevEnd = null;
      line.items.forEach(function (item) {
        var text = item.text;
        if (!text) return;
        if (prevEnd !== null) {
          var gap = item.x - prevEnd;
          if (gap > 2 && !/^\s/.test(text) && !/\s$/.test(out)) out += " ";
        }
        out += text;
        prevEnd = item.x + item.width;
      });
      return out.replace(/[ \t]+$/g, "");
    }).join("\n");
  }

  async function extractPdfPages(file, rangeValue, ctx, onProgress) {
    if (!file) throw new Error("PDF 파일을 선택해 주세요.");
    if (file.size > 60 * 1024 * 1024) throw new Error("PDF는 60MB 이하 파일만 처리할 수 있습니다.");

    var pdfjs = await ensurePdfJs(ctx);
    var data = await file.arrayBuffer();
    var pdf = await pdfjs.getDocument({ data: data }).promise;
    var pages = parsePageRangeLong(rangeValue, pdf.numPages, 300);
    if (!pages.length) {
      if (pdf.destroy) await pdf.destroy();
      throw new Error("올바른 페이지 범위를 입력해 주세요.");
    }

    var result = [];
    for (var i = 0; i < pages.length; i += 1) {
      var pageNo = pages[i];
      if (onProgress) onProgress(i + 1, pages.length, pageNo, pdf.numPages);
      var page = await pdf.getPage(pageNo);
      var textContent = await page.getTextContent({ normalizeWhitespace: true });
      result.push({
        page: pageNo,
        text: pageTextFromContent(textContent)
      });
      if (page.cleanup) page.cleanup();
    }

    var total = pdf.numPages;
    if (pdf.destroy) await pdf.destroy();
    return { pages: result, totalPages: total };
  }

  function pdfTextToTxt(extracted, includeHeaders) {
    return extracted.pages.map(function (page) {
      var head = includeHeaders ? "===== " + page.page + "페이지 =====\n" : "";
      return head + page.text;
    }).join("\n\n");
  }

  function pdfTextToHtml(extracted, sourceName) {
    var sections = extracted.pages.map(function (page) {
      return '<section class="pdf-page"><h2>' + page.page + '페이지</h2><pre>' +
        escapeTextHtml(page.text) + '</pre></section>';
    }).join("\n");
    return '<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
      '<title>' + escapeTextHtml(safeBaseName(sourceName)) + '</title>\n' +
      '<style>body{max-width:900px;margin:40px auto;padding:0 20px;color:#172033;font-family:Arial,"Noto Sans KR",sans-serif;line-height:1.7}.pdf-page{margin:0 0 42px;padding:24px;border:1px solid #e2e8f0;border-radius:14px}.pdf-page h2{margin:0 0 16px;font-size:20px}.pdf-page pre{margin:0;white-space:pre-wrap;word-break:break-word;font:inherit}</style>\n' +
      '</head>\n<body>\n' + sections + '\n</body>\n</html>';
  }

  async function inspectPdfFile(file, ctx) {
    if (!file || (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf")) {
      throw new Error("PDF 파일을 선택해 주세요.");
    }
    if (file.size > 60 * 1024 * 1024) throw new Error("PDF는 60MB 이하 파일만 처리할 수 있습니다.");
    var pdfjs = await ensurePdfJs(ctx);
    var data = await file.arrayBuffer();
    var pdf = await pdfjs.getDocument({ data: data }).promise;
    var count = pdf.numPages;
    if (pdf.destroy) await pdf.destroy();
    return count;
  }

  async function openPdfText(x, ctx) {
    injectTextPdfStyle();
    var isHtml = x.toFormat === "HTML";
    var selectedFile = null;
    var pageCount = 0;
    var outputValue = "";

    ctx.stage.innerHTML =
      '<div class="hm-fx-detail">' +
        '<div class="hm-fx-toolbar"><a class="hm-fx-back" href="' +
          ctx.route({ category: x.category }) +
          '" data-route>\u2190 ' + ctx.esc(ctx.cat(x.category).name) + '</a></div>' +
        ctx.titleBlock(x) +
        '<div class="hm-pdf-box">' +
          '<div class="hm-pdf-drop" data-pdf-text-drop>' +
            '<strong>PDF 파일을 선택하거나 끌어다 놓으세요</strong>' +
            '<span>선택 가능한 텍스트를 읽어 ' + ctx.esc(x.toFormat) + ' 파일로 변환합니다.</span>' +
            '<input type="file" hidden data-pdf-text-file accept=".pdf,application/pdf">' +
          '</div>' +
          '<div class="hm-pdf-fileinfo" data-pdf-text-info></div>' +
          '<div class="hm-pdf-options">' +
            '<div class="hm-pdf-field"><label>페이지 범위</label><input type="text" placeholder="예: 1-5,8,10 · 비우면 전체" data-pdf-text-range></div>' +
            '<div class="hm-pdf-field"><label>최대 처리</label><select disabled><option>최대 300페이지</option></select></div>' +
            '<label class="hm-pdf-check"><input type="checkbox" checked data-pdf-text-header> 페이지 번호 구분 포함</label>' +
            '<div class="hm-pdf-field"><label>출력 형식</label><select disabled><option>' + ctx.esc(x.toFormat) + '</option></select></div>' +
          '</div>' +
          '<div class="hm-pdf-actions"><button class="hm-pdf-btn primary" type="button" data-pdf-text-run disabled>텍스트 추출하기</button></div>' +
          '<div class="hm-pdf-status" data-pdf-text-status>스캔 이미지로만 된 PDF는 OCR 기능이 필요하므로 텍스트가 나오지 않을 수 있습니다.</div>' +
          '<textarea class="hm-pdf-textarea" readonly data-pdf-text-output placeholder="변환 결과가 여기에 표시됩니다."></textarea>' +
          '<div class="hm-pdf-output-actions"><button type="button" data-pdf-text-copy disabled>결과 복사</button><button class="primary" type="button" data-pdf-text-download disabled>파일 다운로드</button></div>' +
          '<div class="hm-pdf-help">' +
            (isHtml
              ? 'PDF의 실제 페이지 디자인을 그대로 복원하는 방식이 아니라, 선택 가능한 텍스트를 페이지별 HTML 구조로 정리합니다.'
              : 'PDF 안에 실제 텍스트 레이어가 있어야 추출됩니다. 사진이나 스캔본만 있는 PDF는 별도 OCR이 필요합니다.') +
          '</div>' +
          '<div class="hm-pdf-version">PDF Engine v1.1.0</div>' +
        '</div>' +
      '</div>';

    var drop = ctx.stage.querySelector("[data-pdf-text-drop]");
    var input = ctx.stage.querySelector("[data-pdf-text-file]");
    var info = ctx.stage.querySelector("[data-pdf-text-info]");
    var range = ctx.stage.querySelector("[data-pdf-text-range]");
    var header = ctx.stage.querySelector("[data-pdf-text-header]");
    var run = ctx.stage.querySelector("[data-pdf-text-run]");
    var status = ctx.stage.querySelector("[data-pdf-text-status]");
    var output = ctx.stage.querySelector("[data-pdf-text-output]");
    var copy = ctx.stage.querySelector("[data-pdf-text-copy]");
    var download = ctx.stage.querySelector("[data-pdf-text-download]");

    async function choose(file) {
      try {
        status.textContent = "PDF 정보를 확인하는 중입니다...";
        pageCount = await inspectPdfFile(file, ctx);
        selectedFile = file;
        info.style.display = "block";
        info.textContent = file.name + " · " + niceBytes(file.size) + " · " + pageCount + "페이지";
        run.disabled = false;
        status.textContent = "준비되었습니다. 필요한 페이지 범위를 입력한 뒤 변환하세요.";
      } catch (error) {
        selectedFile = null;
        pageCount = 0;
        run.disabled = true;
        info.style.display = "none";
        status.textContent = error.message || error;
      }
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
      copy.disabled = true;
      download.disabled = true;
      output.value = "";
      outputValue = "";
      try {
        var extracted = await extractPdfPages(selectedFile, range.value, ctx, function (done, total, pageNo) {
          status.textContent = done + " / " + total + " · " + pageNo + "페이지 텍스트 읽는 중...";
        });

        if (isHtml) {
          outputValue = pdfTextToHtml(extracted, selectedFile.name);
        } else {
          outputValue = pdfTextToTxt(extracted, header.checked);
        }

        output.value = outputValue.length > 200000 ? outputValue.slice(0, 200000) + "\n\n[미리보기는 앞 20만 자까지만 표시됩니다. 다운로드 파일에는 전체 결과가 들어 있습니다.]" : outputValue;
        var visibleChars = extracted.pages.reduce(function (sum, p) { return sum + p.text.replace(/\s/g, "").length; }, 0);

        status.textContent = visibleChars < 10
          ? "변환은 완료했지만 추출된 글자가 거의 없습니다. 스캔 이미지 PDF라면 OCR이 필요합니다."
          : extracted.pages.length + "페이지 변환을 완료했습니다.";
        copy.disabled = !outputValue;
        download.disabled = !outputValue;
      } catch (error) {
        status.textContent = "변환 중 오류가 발생했습니다: " + (error.message || error);
      } finally {
        run.disabled = false;
      }
    };

    copy.onclick = async function () {
      if (!outputValue) return;
      try {
        await copyText(outputValue);
        status.textContent = "변환 결과를 클립보드에 복사했습니다.";
      } catch (error) {
        status.textContent = "복사하지 못했습니다. 결과 영역에서 직접 복사해 주세요.";
      }
    };

    download.onclick = function () {
      if (!outputValue || !selectedFile) return;
      var mime = isHtml ? "text/html;charset=utf-8" : "text/plain;charset=utf-8";
      var extension = isHtml ? ".html" : ".txt";
      downloadBlob(new Blob([outputValue], { type: mime }), safeBaseName(selectedFile.name) + extension);
      status.textContent = "다운로드를 시작했습니다.";
    };
  }

  function decodeTextFile(buffer, encoding) {
    if (encoding === "utf-8") return new TextDecoder("utf-8").decode(buffer);
    if (encoding === "euc-kr") return new TextDecoder("euc-kr").decode(buffer);
    try {
      return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    } catch (error) {
      try {
        return new TextDecoder("euc-kr").decode(buffer);
      } catch (error2) {
        return new TextDecoder("utf-8").decode(buffer);
      }
    }
  }

  function wrapCanvasLine(g, text, maxWidth) {
    var value = String(text || "").replace(/\t/g, "    ");
    if (!value) return [""];
    var chars = Array.from(value);
    var lines = [];
    var current = "";
    var width = 0;
    for (var i = 0; i < chars.length; i += 1) {
      var ch = chars[i];
      var chWidth = g.measureText(ch).width;
      if (current && width + chWidth > maxWidth) {
        lines.push(current);
        current = ch;
        width = chWidth;
      } else {
        current += ch;
        width += chWidth;
      }
    }
    if (current || !lines.length) lines.push(current);
    return lines;
  }

  async function createTextPdf(text, options, ctx, onProgress) {
    if (text.length > 800000) throw new Error("TXT 내용은 80만 자 이하만 처리할 수 있습니다.");

    var JsPDF = await ensureJsPdf(ctx);
    var pageW = 1240;
    var pageH = 1754;
    var marginX = 92;
    var marginTop = 105;
    var marginBottom = 105;
    var fontPt = Number(options.fontSize) || 14;
    var fontPx = Math.round(fontPt * 150 / 72);
    var lineHeight = Math.round(fontPx * 1.55);
    var maxWidth = pageW - marginX * 2;

    var measureCanvas = d.createElement("canvas");
    var mg = measureCanvas.getContext("2d");
    mg.font = fontPx + 'px "Noto Sans KR","Malgun Gothic","Apple SD Gothic Neo",Arial,sans-serif';

    var wrapped = [];
    String(text || "").replace(/\r\n?/g, "\n").split("\n").forEach(function (line) {
      wrapCanvasLine(mg, line, maxWidth).forEach(function (part) { wrapped.push(part); });
    });

    var linesPerPage = Math.max(1, Math.floor((pageH - marginTop - marginBottom) / lineHeight));
    var totalPages = Math.ceil(wrapped.length / linesPerPage) || 1;
    if (totalPages > 300) throw new Error("PDF가 300페이지를 넘습니다. TXT 내용을 나누어 변환해 주세요.");

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

      var startLine = pageIndex * linesPerPage;
      var endLine = Math.min(wrapped.length, startLine + linesPerPage);
      var y = marginTop;
      for (var i = startLine; i < endLine; i += 1) {
        g.fillText(wrapped[i], marginX, y);
        y += lineHeight;
      }

      g.fillStyle = "#8a97a8";
      g.font = '18px Arial,sans-serif';
      g.textAlign = "center";
      g.fillText(String(pageIndex + 1), pageW / 2, pageH - 55);

      var jpeg = canvas.toDataURL("image/jpeg", 0.94);
      pdf.addImage(jpeg, "JPEG", 0, 0, 210, 297, undefined, "FAST");
    }

    return pdf;
  }

  async function openTextPdf(x, ctx) {
    injectTextPdfStyle();
    var selectedFile = null;
    var textValue = "";

    ctx.stage.innerHTML =
      '<div class="hm-fx-detail">' +
        '<div class="hm-fx-toolbar"><a class="hm-fx-back" href="' +
          ctx.route({ category: x.category }) +
          '" data-route>\u2190 ' + ctx.esc(ctx.cat(x.category).name) + '</a></div>' +
        ctx.titleBlock(x) +
        '<div class="hm-pdf-box">' +
          '<div class="hm-pdf-drop" data-txt-pdf-drop>' +
            '<strong>TXT 파일을 선택하거나 끌어다 놓으세요</strong>' +
            '<span>한글을 포함한 텍스트를 A4 PDF로 만듭니다.</span>' +
            '<input type="file" hidden data-txt-pdf-file accept=".txt,text/plain">' +
          '</div>' +
          '<div class="hm-pdf-options">' +
            '<div class="hm-pdf-field"><label>문자 인코딩</label><select data-txt-pdf-encoding><option value="auto">자동 감지</option><option value="utf-8">UTF-8</option><option value="euc-kr">EUC-KR / CP949 계열</option></select></div>' +
            '<div class="hm-pdf-field"><label>글자 크기</label><select data-txt-pdf-size><option value="12">12 pt</option><option value="14" selected>14 pt</option><option value="16">16 pt</option><option value="18">18 pt</option></select></div>' +
            '<div class="hm-pdf-field"><label>페이지</label><select disabled><option>A4 세로</option></select></div>' +
            '<div class="hm-pdf-field"><label>처리 한도</label><select disabled><option>80만 자 · 최대 300쪽</option></select></div>' +
          '</div>' +
          '<div class="hm-pdf-fileinfo" data-txt-pdf-info></div>' +
          '<textarea class="hm-pdf-textarea" readonly data-txt-pdf-preview placeholder="TXT 파일을 선택하면 앞부분을 미리 볼 수 있습니다."></textarea>' +
          '<div class="hm-pdf-actions"><button class="hm-pdf-btn primary" type="button" data-txt-pdf-run disabled>PDF 만들기</button></div>' +
          '<div class="hm-pdf-status" data-txt-pdf-status>파일은 외부 변환 서버로 전송하지 않고 브라우저에서 처리합니다.</div>' +
          '<div class="hm-pdf-help">한글 표시 안정성을 위해 브라우저가 화면에 글자를 그린 뒤 PDF 페이지로 저장합니다. 따라서 결과 PDF의 본문은 이미지 기반이며 텍스트 선택이나 검색이 제한될 수 있습니다.</div>' +
          '<div class="hm-pdf-version">PDF Engine v1.1.0</div>' +
        '</div>' +
      '</div>';

    var drop = ctx.stage.querySelector("[data-txt-pdf-drop]");
    var input = ctx.stage.querySelector("[data-txt-pdf-file]");
    var encoding = ctx.stage.querySelector("[data-txt-pdf-encoding]");
    var size = ctx.stage.querySelector("[data-txt-pdf-size]");
    var info = ctx.stage.querySelector("[data-txt-pdf-info]");
    var preview = ctx.stage.querySelector("[data-txt-pdf-preview]");
    var run = ctx.stage.querySelector("[data-txt-pdf-run]");
    var status = ctx.stage.querySelector("[data-txt-pdf-status]");

    async function choose(file) {
      if (!file || (!/\.txt$/i.test(file.name) && file.type !== "text/plain")) {
        status.textContent = "TXT 파일을 선택해 주세요.";
        return;
      }
      if (file.size > 3 * 1024 * 1024) {
        status.textContent = "TXT 파일은 3MB 이하만 처리할 수 있습니다.";
        return;
      }
      selectedFile = file;
      var buffer = await file.arrayBuffer();
      textValue = decodeTextFile(buffer, encoding.value);
      if (textValue.length > 800000) {
        selectedFile = null;
        run.disabled = true;
        status.textContent = "TXT 내용은 80만 자 이하만 처리할 수 있습니다.";
        return;
      }
      info.style.display = "block";
      info.textContent = file.name + " · " + niceBytes(file.size) + " · 약 " + textValue.length.toLocaleString() + "자";
      preview.value = textValue.slice(0, 120000) + (textValue.length > 120000 ? "\n\n[미리보기는 앞 12만 자까지만 표시됩니다.]" : "");
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

    encoding.onchange = async function () {
      if (selectedFile) choose(selectedFile);
    };

    run.onclick = async function () {
      if (!selectedFile || !textValue) return;
      run.disabled = true;
      try {
        var pdf = await createTextPdf(textValue, { fontSize: size.value }, ctx, function (page, total) {
          status.textContent = page + " / " + total + " 페이지 만드는 중...";
        });
        pdf.save(safeBaseName(selectedFile.name) + ".pdf");
        status.textContent = "PDF 다운로드를 시작했습니다.";
      } catch (error) {
        status.textContent = "PDF 생성 중 오류가 발생했습니다: " + (error.message || error);
      } finally {
        run.disabled = false;
      }
    };
  }

  function sanitizeBasicHtml(html) {
    var parsed = new DOMParser().parseFromString(String(html || ""), "text/html");

    parsed.querySelectorAll("script,style,link,iframe,frame,object,embed,form,input,button,textarea,select,option,video,audio,canvas,noscript,template").forEach(function (node) {
      node.remove();
    });

    parsed.querySelectorAll("img,picture,source").forEach(function (node) {
      var alt = node.getAttribute && node.getAttribute("alt");
      if (alt) node.replaceWith(d.createTextNode("[이미지: " + alt + "]"));
      else node.remove();
    });

    parsed.querySelectorAll("*").forEach(function (node) {
      Array.from(node.attributes || []).forEach(function (attr) {
        node.removeAttribute(attr.name);
      });
    });

    return parsed.body.innerHTML;
  }

  async function ensureHtml2Canvas(ctx) {
    if (!w.html2canvas) {
      await ctx.loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js");
    }
    if (!w.html2canvas) throw new Error("HTML 렌더링 라이브러리를 불러오지 못했습니다.");
    return w.html2canvas;
  }

  async function openHtmlPdf(x, ctx) {
    injectTextPdfStyle();
    var selectedFile = null;
    var sanitizedHtml = "";

    ctx.stage.innerHTML =
      '<div class="hm-fx-detail">' +
        '<div class="hm-fx-toolbar"><a class="hm-fx-back" href="' +
          ctx.route({ category: x.category }) +
          '" data-route>\u2190 ' + ctx.esc(ctx.cat(x.category).name) + '</a></div>' +
        ctx.titleBlock(x) +
        '<div class="hm-pdf-box">' +
          '<div class="hm-pdf-drop" data-html-pdf-drop>' +
            '<strong>HTML 파일을 선택하거나 끌어다 놓으세요</strong>' +
            '<span>기본 제목·문단·목록·표 구조를 A4 PDF로 변환합니다.</span>' +
            '<input type="file" hidden data-html-pdf-file accept=".html,.htm,text/html">' +
          '</div>' +
          '<div class="hm-pdf-fileinfo" data-html-pdf-info></div>' +
          '<div class="hm-pdf-actions"><button class="hm-pdf-btn primary" type="button" data-html-pdf-run disabled>PDF 만들기</button></div>' +
          '<div class="hm-pdf-status" data-html-pdf-status>보안을 위해 스크립트·외부 스타일·폼·외부 이미지 등은 제거한 뒤 변환합니다.</div>' +
          '<div class="hm-pdf-help">웹페이지를 픽셀 단위로 완전히 복제하는 기능이 아니라 문서의 기본 구조를 안전하게 PDF로 만드는 기능입니다. 복잡한 CSS와 외부 리소스는 결과에서 제외됩니다.</div>' +
          '<div class="hm-pdf-version">PDF Engine v1.1.0</div>' +
        '</div>' +
      '</div>';

    var drop = ctx.stage.querySelector("[data-html-pdf-drop]");
    var input = ctx.stage.querySelector("[data-html-pdf-file]");
    var info = ctx.stage.querySelector("[data-html-pdf-info]");
    var run = ctx.stage.querySelector("[data-html-pdf-run]");
    var status = ctx.stage.querySelector("[data-html-pdf-status]");

    async function choose(file) {
      if (!file || (!/\.html?$/i.test(file.name) && file.type !== "text/html")) {
        status.textContent = "HTML 파일을 선택해 주세요.";
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        status.textContent = "HTML 파일은 2MB 이하만 처리할 수 있습니다.";
        return;
      }
      selectedFile = file;
      var html = new TextDecoder("utf-8").decode(await file.arrayBuffer());
      sanitizedHtml = sanitizeBasicHtml(html);
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
      var host = null;
      try {
        status.textContent = "HTML 문서를 준비하는 중입니다...";
        var JsPDF = await ensureJsPdf(ctx);
        var h2c = await ensureHtml2Canvas(ctx);

        host = d.createElement("div");
        host.style.position = "fixed";
        host.style.left = "-10000px";
        host.style.top = "0";
        host.style.width = "794px";
        host.style.padding = "48px";
        host.style.boxSizing = "border-box";
        host.style.background = "#ffffff";
        host.style.color = "#172033";
        host.style.fontFamily = '"Noto Sans KR","Malgun Gothic","Apple SD Gothic Neo",Arial,sans-serif';
        host.style.fontSize = "16px";
        host.style.lineHeight = "1.7";
        host.style.wordBreak = "break-word";
        host.innerHTML =
          '<style>' +
          'h1{font-size:30px;margin:0 0 22px}h2{font-size:24px;margin:28px 0 14px}h3{font-size:20px;margin:24px 0 12px}' +
          'p{margin:0 0 14px}ul,ol{margin:0 0 16px;padding-left:28px}li{margin:5px 0}' +
          'table{width:100%;border-collapse:collapse;margin:18px 0}th,td{border:1px solid #d9e1ea;padding:8px;text-align:left;vertical-align:top}' +
          'blockquote{margin:16px 0;padding:12px 16px;border-left:4px solid #8ca9e8;background:#f7f9fc}' +
          'pre,code{white-space:pre-wrap;word-break:break-word;font-family:Consolas,monospace}' +
          '</style>' + sanitizedHtml;
        d.body.appendChild(host);

        if (host.scrollHeight > 12000) {
          throw new Error("HTML 문서가 너무 깁니다. 내용을 나누어 변환해 주세요.");
        }

        status.textContent = "문서를 PDF 페이지로 렌더링하는 중입니다...";
        var canvas = await h2c(host, {
          scale: 2,
          backgroundColor: "#ffffff",
          logging: false,
          useCORS: false,
          allowTaint: false
        });

        var pagePixelHeight = Math.floor(canvas.width * 297 / 210);
        var totalPages = Math.ceil(canvas.height / pagePixelHeight);
        if (totalPages > 100) throw new Error("PDF가 100페이지를 넘습니다. HTML 내용을 나누어 주세요.");

        var pdf = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });

        for (var i = 0; i < totalPages; i += 1) {
          status.textContent = (i + 1) + " / " + totalPages + " 페이지 만드는 중...";
          if (i > 0) pdf.addPage("a4", "portrait");

          var sliceHeight = Math.min(pagePixelHeight, canvas.height - i * pagePixelHeight);
          var pageCanvas = d.createElement("canvas");
          pageCanvas.width = canvas.width;
          pageCanvas.height = pagePixelHeight;
          var g = pageCanvas.getContext("2d");
          g.fillStyle = "#ffffff";
          g.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          g.drawImage(
            canvas,
            0, i * pagePixelHeight, canvas.width, sliceHeight,
            0, 0, canvas.width, sliceHeight
          );
          var img = pageCanvas.toDataURL("image/jpeg", 0.94);
          pdf.addImage(img, "JPEG", 0, 0, 210, 297, undefined, "FAST");
        }

        pdf.save(safeBaseName(selectedFile.name) + ".pdf");
        status.textContent = "PDF 다운로드를 시작했습니다.";
      } catch (error) {
        status.textContent = "PDF 생성 중 오류가 발생했습니다: " + (error.message || error);
      } finally {
        if (host && host.parentNode) host.remove();
        run.disabled = false;
      }
    };
  }

  NS.pdf = {
    version: "1.1.0",

    open: function (x, ctx) {
      injectStyle();
      if (x.engine === "image-pdf") return openImagePdf(x, ctx);
      if (x.engine === "pdf-image") return openPdfImage(x, ctx);
      if (x.engine === "pdf-text") return openPdfText(x, ctx);
      if (x.engine === "text-pdf") return openTextPdf(x, ctx);
      if (x.engine === "html-pdf") return openHtmlPdf(x, ctx);
      throw new Error("지원하지 않는 PDF 엔진입니다.");
    }
  };
})(window);
