/*
 * HealingMart Converter Image Engine v1.0.0
 * JPG / PNG / WebP / HEIC / SVG browser-side conversion
 */
(function (w) {
  "use strict";

  var d = w.document;
  var NS = w.HM_CONVERTER_ENGINES = w.HM_CONVERTER_ENGINES || {};

  function injectStyle() {
    if (d.getElementById("hm-engine-image-style-v1")) return;
    var style = d.createElement("style");
    style.id = "hm-engine-image-style-v1";
    style.textContent = [
      ".hm-eng-box{padding:22px;border:1px solid #dfe6ef;border-radius:20px;background:#fff;box-shadow:0 12px 34px rgba(15,23,42,.07)}",
      ".hm-eng-drop{padding:34px 18px;border:2px dashed #aebff0;border-radius:17px;background:#f8fbff;text-align:center;cursor:pointer;transition:.16s ease}",
      ".hm-eng-drop:hover,.hm-eng-drop.is-drag{border-color:#2f7cf6;background:#fff}",
      ".hm-eng-drop strong{display:block;color:#13253a;font-size:18px;font-weight:950}",
      ".hm-eng-drop span{display:block;margin-top:5px;color:#6d7b90;font-size:12px}",
      ".hm-eng-options{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:15px}",
      ".hm-eng-field{min-width:0}",
      ".hm-eng-field label{display:block;margin-bottom:5px;color:#536176;font-size:11px;font-weight:850}",
      ".hm-eng-field input,.hm-eng-field select{width:100%;height:42px;padding:0 10px;border:1px solid #d7e0ea;border-radius:10px;background:#fff;color:#172033;outline:none}",
      ".hm-eng-field input[type=color]{padding:4px}",
      ".hm-eng-range{display:grid;grid-template-columns:1fr 44px;align-items:center;gap:8px}",
      ".hm-eng-range output{color:#245fd4;font-size:12px;font-weight:900;text-align:right}",
      ".hm-eng-files{display:grid;gap:8px;margin-top:14px}",
      ".hm-eng-file{display:grid;grid-template-columns:54px minmax(0,1fr) auto;align-items:center;gap:10px;padding:9px;border:1px solid #e0e7ef;border-radius:12px;background:#fbfdff}",
      ".hm-eng-thumb{width:54px;height:54px;object-fit:cover;border-radius:9px;background:#eef3f8}",
      ".hm-eng-file-name{overflow:hidden;color:#1a2b3e;font-size:12px;font-weight:900;text-overflow:ellipsis;white-space:nowrap}",
      ".hm-eng-file-meta{margin-top:3px;color:#718095;font-size:10px}",
      ".hm-eng-remove,.hm-eng-order{min-width:34px;height:34px;border:1px solid #d8e1eb;border-radius:9px;background:#fff;color:#526176;font-weight:900;cursor:pointer}",
      ".hm-eng-actions{display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin-top:16px}",
      ".hm-eng-btn{min-height:44px;padding:0 17px;border:1px solid #d6e0ea;border-radius:11px;background:#fff;color:#223248;font-size:12px;font-weight:900;cursor:pointer}",
      ".hm-eng-btn.primary{color:#fff;border-color:#4d69e8;background:linear-gradient(135deg,#6d5dfc,#2f7cf6);box-shadow:0 8px 20px rgba(71,91,229,.22)}",
      ".hm-eng-btn:disabled{opacity:.48;cursor:not-allowed}",
      ".hm-eng-status{margin-top:13px;padding:11px 12px;border-radius:11px;background:#f4f7fb;color:#58677d;font-size:11px;line-height:1.6}",
      ".hm-eng-results{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:15px}",
      ".hm-eng-result{min-width:0;padding:10px;border:1px solid #dfe7ef;border-radius:12px;background:#fff}",
      ".hm-eng-result img{width:100%;height:130px;object-fit:contain;border-radius:8px;background:#f3f6fa}",
      ".hm-eng-result strong{display:block;margin-top:8px;overflow:hidden;color:#23354a;font-size:11px;text-overflow:ellipsis;white-space:nowrap}",
      ".hm-eng-download{display:flex;align-items:center;justify-content:center;min-height:37px;margin-top:8px;border-radius:9px;background:#0e8a69;color:#fff!important;font-size:11px;font-weight:900;text-decoration:none}",
      ".hm-eng-version{margin-top:10px;color:#8a97a8;font-size:9px;text-align:right}",
      "@media(max-width:760px){.hm-eng-box{padding:13px 9px;border-radius:15px}.hm-eng-drop{padding:27px 10px}.hm-eng-options{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.hm-eng-results{grid-template-columns:repeat(2,minmax(0,1fr))}.hm-eng-result img{height:105px}}",
      "@media(max-width:430px){.hm-eng-file{grid-template-columns:46px minmax(0,1fr) auto}.hm-eng-thumb{width:46px;height:46px}.hm-eng-results{grid-template-columns:1fr 1fr}}"
    ].join("");
    d.head.appendChild(style);
  }

  function ext(name) {
    var m = String(name || "").toLowerCase().match(/\.([a-z0-9]+)$/);
    return m ? m[1] : "";
  }

  function acceptFor(format) {
    var map = {
      JPG: ".jpg,.jpeg,image/jpeg",
      PNG: ".png,image/png",
      WEBP: ".webp,image/webp",
      HEIC: ".heic,.heif,image/heic,image/heif",
      SVG: ".svg,image/svg+xml"
    };
    return map[String(format || "").toUpperCase()] || "image/*";
  }

  function validFor(file, format) {
    var f = String(format || "").toUpperCase();
    var e = ext(file.name);
    var mime = String(file.type || "").toLowerCase();
    var map = {
      JPG: ["jpg", "jpeg"],
      PNG: ["png"],
      WEBP: ["webp"],
      HEIC: ["heic", "heif"],
      SVG: ["svg"]
    };
    if (map[f] && map[f].indexOf(e) >= 0) return true;
    if (f === "JPG" && mime === "image/jpeg") return true;
    if (f === "PNG" && mime === "image/png") return true;
    if (f === "WEBP" && mime === "image/webp") return true;
    if (f === "HEIC" && /image\/hei[cf]/.test(mime)) return true;
    if (f === "SVG" && mime === "image/svg+xml") return true;
    return false;
  }

  function niceBytes(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + " KB";
    return (bytes / 1024 / 1024).toFixed(2) + " MB";
  }

  function safeBaseName(name) {
    return String(name || "image").replace(/\.[^.]+$/, "").replace(/[\\/:*?"<>|]+/g, "_");
  }

  function targetSize(width, height, maxWidth, maxHeight) {
    maxWidth = Number(maxWidth) || width;
    maxHeight = Number(maxHeight) || height;
    var ratio = Math.min(1, maxWidth / width, maxHeight / height);
    return {
      width: Math.max(1, Math.round(width * ratio)),
      height: Math.max(1, Math.round(height * ratio))
    };
  }

  function blobFromCanvas(canvas, mime, quality) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        if (blob) resolve(blob);
        else reject(new Error("이미지 파일을 생성하지 못했습니다."));
      }, mime, quality);
    });
  }

  function imageFromBlob(blob) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(blob);
      var img = new Image();
      img.decoding = "async";
      img.onload = function () {
        resolve({ img: img, url: url });
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error("이미지 파일을 읽지 못했습니다."));
      };
      img.src = url;
    });
  }

  async function normalizeInput(file, x, ctx) {
    if (x.engine !== "heic-image") return file;
    if (!w.heic2any) {
      await ctx.loadScript("https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js");
    }
    if (!w.heic2any) throw new Error("HEIC 변환 라이브러리를 불러오지 못했습니다.");
    var result = await w.heic2any({
      blob: file,
      toType: x.toFormat === "PNG" ? "image/png" : "image/jpeg",
      quality: 0.96
    });
    return Array.isArray(result) ? result[0] : result;
  }

  async function convertOne(file, x, options, ctx) {
    var inputBlob = await normalizeInput(file, x, ctx);
    var loaded = await imageFromBlob(inputBlob);
    try {
      var img = loaded.img;
      var size = targetSize(
        img.naturalWidth || img.width,
        img.naturalHeight || img.height,
        options.maxWidth,
        options.maxHeight
      );
      var canvas = d.createElement("canvas");
      canvas.width = size.width;
      canvas.height = size.height;
      var g = canvas.getContext("2d", { alpha: x.toFormat !== "JPG" });
      if (!g) throw new Error("브라우저가 Canvas 변환을 지원하지 않습니다.");

      g.imageSmoothingEnabled = true;
      g.imageSmoothingQuality = "high";

      if (x.toFormat === "JPG") {
        g.fillStyle = options.background || "#ffffff";
        g.fillRect(0, 0, canvas.width, canvas.height);
      }
      g.drawImage(img, 0, 0, canvas.width, canvas.height);

      var mime =
        x.toFormat === "PNG" ? "image/png" :
        x.toFormat === "WEBP" ? "image/webp" :
        "image/jpeg";

      var blob = await blobFromCanvas(canvas, mime, options.quality);
      return {
        blob: blob,
        name: safeBaseName(file.name) + "." + x.toFormat.toLowerCase(),
        width: canvas.width,
        height: canvas.height
      };
    } finally {
      URL.revokeObjectURL(loaded.url);
    }
  }

  function addDownload(result, resultBox) {
    var url = URL.createObjectURL(result.blob);
    var card = d.createElement("div");
    card.className = "hm-eng-result";

    var img = d.createElement("img");
    img.src = url;
    img.alt = result.name + " 미리보기";

    var title = d.createElement("strong");
    title.textContent = result.name;

    var meta = d.createElement("div");
    meta.className = "hm-eng-file-meta";
    meta.textContent = result.width + " × " + result.height + " · " + niceBytes(result.blob.size);

    var link = d.createElement("a");
    link.className = "hm-eng-download";
    link.href = url;
    link.download = result.name;
    link.textContent = "다운로드";

    card.appendChild(img);
    card.appendChild(title);
    card.appendChild(meta);
    card.appendChild(link);
    resultBox.appendChild(card);
  }

  NS.image = {
    version: "1.0.0",

    open: function (x, ctx) {
      injectStyle();

      var qualityVisible = x.toFormat === "JPG" || x.toFormat === "WEBP";
      var backgroundVisible = x.toFormat === "JPG";

      ctx.stage.innerHTML =
        '<div class="hm-fx-detail">' +
          '<div class="hm-fx-toolbar"><a class="hm-fx-back" href="' +
            ctx.route({ category: x.category }) +
            '" data-route>\u2190 ' + ctx.esc(ctx.cat(x.category).name) + '</a></div>' +
          ctx.titleBlock(x) +
          '<div class="hm-eng-box">' +
            '<div class="hm-eng-drop" data-eng-drop>' +
              '<strong>이미지 파일을 선택하거나 끌어다 놓으세요</strong>' +
              '<span>' + ctx.esc(x.fromFormat) + ' 파일을 여러 장 한꺼번에 변환할 수 있습니다.</span>' +
              '<input type="file" hidden multiple data-eng-file accept="' + acceptFor(x.fromFormat) + '">' +
            '</div>' +
            '<div class="hm-eng-options">' +
              '<div class="hm-eng-field" ' + (qualityVisible ? "" : "hidden") + '>' +
                '<label>출력 품질</label>' +
                '<div class="hm-eng-range"><input type="range" min="60" max="100" value="92" data-eng-quality><output data-eng-quality-out>92%</output></div>' +
              '</div>' +
              '<div class="hm-eng-field"><label>최대 너비</label><input type="number" min="0" step="1" value="0" placeholder="원본 유지" data-eng-maxw></div>' +
              '<div class="hm-eng-field"><label>최대 높이</label><input type="number" min="0" step="1" value="0" placeholder="원본 유지" data-eng-maxh></div>' +
              '<div class="hm-eng-field" ' + (backgroundVisible ? "" : "hidden") + '><label>JPG 배경색</label><input type="color" value="#ffffff" data-eng-bg></div>' +
            '</div>' +
            '<div class="hm-eng-files" data-eng-files></div>' +
            '<div class="hm-eng-actions">' +
              '<button class="hm-eng-btn" type="button" data-eng-clear disabled>전체 지우기</button>' +
              '<button class="hm-eng-btn primary" type="button" data-eng-run disabled>모두 변환</button>' +
              '<button class="hm-eng-btn" type="button" data-eng-zip hidden>ZIP으로 받기</button>' +
            '</div>' +
            '<div class="hm-eng-status" data-eng-status>파일은 서버로 전송하지 않고 브라우저 안에서 처리합니다.</div>' +
            '<div class="hm-eng-results" data-eng-results></div>' +
            '<div class="hm-eng-version">Image Engine v1.0.0</div>' +
          '</div>' +
        '</div>';

      var drop = ctx.stage.querySelector("[data-eng-drop]");
      var input = ctx.stage.querySelector("[data-eng-file]");
      var filesBox = ctx.stage.querySelector("[data-eng-files]");
      var resultBox = ctx.stage.querySelector("[data-eng-results]");
      var status = ctx.stage.querySelector("[data-eng-status]");
      var runBtn = ctx.stage.querySelector("[data-eng-run]");
      var clearBtn = ctx.stage.querySelector("[data-eng-clear]");
      var zipBtn = ctx.stage.querySelector("[data-eng-zip]");
      var quality = ctx.stage.querySelector("[data-eng-quality]");
      var qualityOut = ctx.stage.querySelector("[data-eng-quality-out]");
      var maxW = ctx.stage.querySelector("[data-eng-maxw]");
      var maxH = ctx.stage.querySelector("[data-eng-maxh]");
      var background = ctx.stage.querySelector("[data-eng-bg]");

      var items = [];
      var results = [];

      function syncButtons() {
        runBtn.disabled = items.length === 0;
        clearBtn.disabled = items.length === 0;
      }

      function renderFiles() {
        filesBox.innerHTML = "";
        items.forEach(function (item, index) {
          var row = d.createElement("div");
          row.className = "hm-eng-file";

          var thumb = d.createElement("img");
          thumb.className = "hm-eng-thumb";
          thumb.alt = "";
          if (item.previewUrl) thumb.src = item.previewUrl;

          var copy = d.createElement("div");
          var name = d.createElement("div");
          name.className = "hm-eng-file-name";
          name.textContent = item.file.name;
          var meta = d.createElement("div");
          meta.className = "hm-eng-file-meta";
          meta.textContent = niceBytes(item.file.size);
          copy.appendChild(name);
          copy.appendChild(meta);

          var remove = d.createElement("button");
          remove.type = "button";
          remove.className = "hm-eng-remove";
          remove.textContent = "×";
          remove.setAttribute("aria-label", item.file.name + " 제거");
          remove.onclick = function () {
            if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
            items.splice(index, 1);
            renderFiles();
          };

          row.appendChild(thumb);
          row.appendChild(copy);
          row.appendChild(remove);
          filesBox.appendChild(row);
        });
        syncButtons();
      }

      function addFiles(list) {
        var added = 0;
        Array.prototype.forEach.call(list || [], function (file) {
          if (!validFor(file, x.fromFormat)) return;
          items.push({
            file: file,
            previewUrl: x.fromFormat === "HEIC" ? "" : URL.createObjectURL(file)
          });
          added += 1;
        });
        renderFiles();
        status.textContent = added ?
          added + "개 파일을 추가했습니다." :
          x.fromFormat + " 형식의 파일을 선택해 주세요.";
      }

      drop.onclick = function () { input.click(); };
      drop.ondragover = function (event) {
        event.preventDefault();
        drop.classList.add("is-drag");
      };
      drop.ondragleave = function () { drop.classList.remove("is-drag"); };
      drop.ondrop = function (event) {
        event.preventDefault();
        drop.classList.remove("is-drag");
        addFiles(event.dataTransfer.files);
      };
      input.onchange = function () {
        addFiles(input.files);
        input.value = "";
      };

      quality.oninput = function () {
        qualityOut.textContent = quality.value + "%";
      };

      clearBtn.onclick = function () {
        items.forEach(function (item) {
          if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
        });
        items = [];
        results = [];
        filesBox.innerHTML = "";
        resultBox.innerHTML = "";
        zipBtn.hidden = true;
        status.textContent = "파일 목록을 비웠습니다.";
        syncButtons();
      };

      runBtn.onclick = async function () {
        if (!items.length) return;

        runBtn.disabled = true;
        clearBtn.disabled = true;
        zipBtn.hidden = true;
        resultBox.innerHTML = "";
        results = [];

        var options = {
          quality: Number(quality.value) / 100,
          maxWidth: Number(maxW.value) || 0,
          maxHeight: Number(maxH.value) || 0,
          background: background.value || "#ffffff"
        };

        try {
          for (var i = 0; i < items.length; i += 1) {
            status.textContent = (i + 1) + " / " + items.length + " 변환 중...";
            var result = await convertOne(items[i].file, x, options, ctx);
            results.push(result);
            addDownload(result, resultBox);
          }
          status.textContent = results.length + "개 이미지 변환을 완료했습니다.";
          zipBtn.hidden = results.length < 2;
        } catch (error) {
          status.textContent = "변환 중 오류가 발생했습니다: " + (error.message || error);
        } finally {
          runBtn.disabled = false;
          clearBtn.disabled = false;
        }
      };

      zipBtn.onclick = async function () {
        if (results.length < 2) return;
        zipBtn.disabled = true;
        status.textContent = "ZIP 파일을 만드는 중입니다...";
        try {
          if (!w.JSZip) {
            await ctx.loadScript("https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js");
          }
          if (!w.JSZip) throw new Error("ZIP 라이브러리를 불러오지 못했습니다.");
          var zip = new w.JSZip();
          results.forEach(function (result) {
            zip.file(result.name, result.blob);
          });
          var blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
          var url = URL.createObjectURL(blob);
          var a = d.createElement("a");
          a.href = url;
          a.download = "healingmart-" + x.id + "-converted.zip";
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
  };
})(window);
