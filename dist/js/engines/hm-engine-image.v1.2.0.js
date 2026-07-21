/*
 * HealingMart Converter Image Engine v1.2.0
 * JPG / PNG / WebP / HEIC / SVG / AVIF / BMP / TIFF / GIF / ICO
 * Browser-side conversion
 */
(function (w) {
  "use strict";

  var d = w.document;
  var NS = w.HM_CONVERTER_ENGINES = w.HM_CONVERTER_ENGINES || {};

  function injectStyle() {
    if (d.getElementById("hm-engine-image-style-v11")) return;
    var style = d.createElement("style");
    style.id = "hm-engine-image-style-v11";
    style.textContent = [
      ".hm-eng-box{padding:22px;border:1px solid #dfe6ef;border-radius:20px;background:#fff;box-shadow:0 12px 34px rgba(15,23,42,.07)}",
      ".hm-eng-drop{padding:34px 18px;border:2px dashed #aebff0;border-radius:17px;background:#f8fbff;text-align:center;cursor:pointer;transition:.16s ease}",
      ".hm-eng-drop:hover,.hm-eng-drop.is-drag{border-color:#2f7cf6;background:#fff}",
      ".hm-eng-drop strong{display:block;color:#13253a;font-size:18px;font-weight:950}",
      ".hm-eng-drop span{display:block;margin-top:5px;color:#5d6d83;font-size:13px;line-height:1.55}",
      ".hm-eng-options{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:15px}",
      ".hm-eng-field{min-width:0}",
      ".hm-eng-field label{display:block;margin-bottom:5px;color:#536176;font-size:12px;font-weight:850}",
      ".hm-eng-field input,.hm-eng-field select{width:100%;height:44px;padding:0 10px;border:1px solid #d7e0ea;border-radius:10px;background:#fff;color:#172033;outline:none;font-size:14px}",
      ".hm-eng-field input[type=color]{padding:4px}",
      ".hm-eng-range{display:grid;grid-template-columns:1fr 48px;align-items:center;gap:8px}",
      ".hm-eng-range output{color:#245fd4;font-size:12px;font-weight:900;text-align:right}",
      ".hm-eng-files{display:grid;gap:8px;margin-top:14px}",
      ".hm-eng-file{display:grid;grid-template-columns:54px minmax(0,1fr) auto;align-items:center;gap:10px;padding:9px;border:1px solid #e0e7ef;border-radius:12px;background:#fbfdff}",
      ".hm-eng-thumb{width:54px;height:54px;object-fit:cover;border-radius:9px;background:#eef3f8}",
      ".hm-eng-file-name{overflow:hidden;color:#1a2b3e;font-size:13px;font-weight:900;text-overflow:ellipsis;white-space:nowrap}",
      ".hm-eng-file-meta{margin-top:3px;color:#718095;font-size:11px}",
      ".hm-eng-remove{min-width:34px;height:34px;border:1px solid #d8e1eb;border-radius:9px;background:#fff;color:#526176;font-weight:900;cursor:pointer}",
      ".hm-eng-actions{display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin-top:16px}",
      ".hm-eng-btn{min-height:46px;padding:0 17px;border:1px solid #d6e0ea;border-radius:11px;background:#fff;color:#223248;font-size:13px;font-weight:900;cursor:pointer}",
      ".hm-eng-btn.primary{color:#fff;border-color:#4d69e8;background:linear-gradient(135deg,#6d5dfc,#2f7cf6);box-shadow:0 8px 20px rgba(71,91,229,.22)}",
      ".hm-eng-btn:disabled{opacity:.48;cursor:not-allowed}",
      ".hm-eng-status{margin-top:13px;padding:12px;border-radius:11px;background:#f4f7fb;color:#4d5d73;font-size:12px;line-height:1.65}",
      ".hm-eng-note{margin-top:12px;padding:11px 12px;border:1px solid #e4eaf1;border-radius:11px;background:#fbfdff;color:#607087;font-size:11px;line-height:1.65}",
      ".hm-eng-results{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:15px}",
      ".hm-eng-result{min-width:0;padding:10px;border:1px solid #dfe7ef;border-radius:12px;background:#fff}",
      ".hm-eng-result img{width:100%;height:130px;object-fit:contain;border-radius:8px;background:#f3f6fa}",
      ".hm-eng-result strong{display:block;margin-top:8px;overflow:hidden;color:#23354a;font-size:12px;text-overflow:ellipsis;white-space:nowrap}",
      ".hm-eng-download{display:flex;align-items:center;justify-content:center;min-height:39px;margin-top:8px;border-radius:9px;background:#0e8a69;color:#fff!important;font-size:12px;font-weight:900;text-decoration:none}",
      ".hm-eng-version{margin-top:10px;color:#8a97a8;font-size:10px;text-align:right}",
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
      SVG: ".svg,image/svg+xml",
      AVIF: ".avif,image/avif",
      BMP: ".bmp,image/bmp",
      TIFF: ".tif,.tiff,image/tiff",
      GIF: ".gif,image/gif",
      ICO: ".ico,image/x-icon,image/vnd.microsoft.icon"
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
      SVG: ["svg"],
      AVIF: ["avif"],
      BMP: ["bmp"],
      TIFF: ["tif", "tiff"],
      GIF: ["gif"],
      ICO: ["ico"]
    };
    if (map[f] && map[f].indexOf(e) >= 0) return true;
    if (f === "JPG" && mime === "image/jpeg") return true;
    if (f === "PNG" && mime === "image/png") return true;
    if (f === "WEBP" && mime === "image/webp") return true;
    if (f === "HEIC" && /image\/hei[cf]/.test(mime)) return true;
    if (f === "SVG" && mime === "image/svg+xml") return true;
    if (f === "AVIF" && mime === "image/avif") return true;
    if (f === "BMP" && mime === "image/bmp") return true;
    if (f === "TIFF" && mime === "image/tiff") return true;
    if (f === "GIF" && mime === "image/gif") return true;
    if (f === "ICO" && (mime === "image/x-icon" || mime === "image/vnd.microsoft.icon")) return true;
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
        if (!blob) return reject(new Error("이미지 파일을 생성하지 못했습니다."));
        if (mime === "image/webp" && blob.type && blob.type !== "image/webp") {
          return reject(new Error("현재 브라우저가 WebP 출력을 지원하지 않습니다."));
        }
        resolve(blob);
      }, mime, quality);
    });
  }

  function imageFromBlob(blob, format) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(blob);
      var img = new Image();
      img.decoding = "async";
      img.onload = function () {
        resolve({ img: img, url: url });
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        var f = String(format || "").toUpperCase();
        if (f === "AVIF") {
          reject(new Error("현재 브라우저가 AVIF 파일을 읽지 못했거나 파일이 손상되었습니다."));
        } else if (f === "ICO") {
          reject(new Error("ICO 파일을 읽지 못했습니다. 일부 오래된 ICO 형식은 브라우저에서 지원되지 않을 수 있습니다."));
        } else {
          reject(new Error("이미지 파일을 읽지 못했습니다."));
        }
      };
      img.src = url;
    });
  }

  async function normalizeHeic(file, x, ctx) {
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

  async function normalizeTiff(file, ctx) {
    if (!w.UTIF) {
      await ctx.loadScript("https://cdn.jsdelivr.net/npm/utif@3.1.0/UTIF.js");
    }
    if (!w.UTIF) throw new Error("TIFF 변환 라이브러리를 불러오지 못했습니다.");

    var buffer = await file.arrayBuffer();
    var ifds = w.UTIF.decode(buffer);
    if (!ifds || !ifds.length) throw new Error("TIFF 페이지를 찾지 못했습니다.");

    var ifd = ifds[0];
    w.UTIF.decodeImage(buffer, ifd);
    var rgba = w.UTIF.toRGBA8(ifd);
    var width = ifd.width;
    var height = ifd.height;
    if (!width || !height || !rgba) throw new Error("TIFF 이미지를 해석하지 못했습니다.");

    var canvas = d.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    var g = canvas.getContext("2d");
    if (!g) throw new Error("브라우저가 Canvas 변환을 지원하지 않습니다.");
    var imageData = g.createImageData(width, height);
    imageData.data.set(rgba);
    g.putImageData(imageData, 0, 0);
    return await blobFromCanvas(canvas, "image/png", 1);
  }

  async function normalizeGifFirstFrame(file) {
    if (!w.ImageDecoder) return file;
    try {
      var supported = !w.ImageDecoder.isTypeSupported || await w.ImageDecoder.isTypeSupported("image/gif");
      if (!supported) return file;
      var decoder = new w.ImageDecoder({ data: file.stream(), type: "image/gif" });
      var decoded = await decoder.decode({ frameIndex: 0 });
      var frame = decoded.image;
      var canvas = d.createElement("canvas");
      canvas.width = frame.displayWidth || frame.codedWidth;
      canvas.height = frame.displayHeight || frame.codedHeight;
      var g = canvas.getContext("2d");
      g.drawImage(frame, 0, 0);
      frame.close();
      decoder.close();
      return await blobFromCanvas(canvas, "image/png", 1);
    } catch (e) {
      return file;
    }
  }

  async function normalizeInput(file, x, ctx) {
    var f = String(x.fromFormat || "").toUpperCase();
    if (x.engine === "heic-image" || f === "HEIC") return normalizeHeic(file, x, ctx);
    if (f === "TIFF") return normalizeTiff(file, ctx);
    if (f === "GIF") return normalizeGifFirstFrame(file);
    return file;
  }


  function parseHexColor(value) {
    var s = String(value || "#ffffff").replace("#", "");
    if (s.length === 3) s = s.split("").map(function (c) { return c + c; }).join("");
    var n = parseInt(s, 16);
    if (!Number.isFinite(n)) n = 0xffffff;
    return {
      r: (n >> 16) & 255,
      g: (n >> 8) & 255,
      b: n & 255
    };
  }

  function canvasToBmpBlob(canvas, background) {
    var width = canvas.width;
    var height = canvas.height;
    var g = canvas.getContext("2d");
    if (!g) throw new Error("BMP 변환용 Canvas를 사용할 수 없습니다.");

    var rgba = g.getImageData(0, 0, width, height).data;
    var rowSize = Math.ceil((width * 3) / 4) * 4;
    var pixelSize = rowSize * height;
    var fileSize = 54 + pixelSize;
    var buffer = new ArrayBuffer(fileSize);
    var view = new DataView(buffer);
    var bytes = new Uint8Array(buffer);
    var bg = parseHexColor(background || "#ffffff");

    view.setUint8(0, 0x42);
    view.setUint8(1, 0x4d);
    view.setUint32(2, fileSize, true);
    view.setUint32(10, 54, true);

    view.setUint32(14, 40, true);
    view.setInt32(18, width, true);
    view.setInt32(22, height, true);
    view.setUint16(26, 1, true);
    view.setUint16(28, 24, true);
    view.setUint32(30, 0, true);
    view.setUint32(34, pixelSize, true);
    view.setInt32(38, 2835, true);
    view.setInt32(42, 2835, true);
    view.setUint32(46, 0, true);
    view.setUint32(50, 0, true);

    for (var y = 0; y < height; y += 1) {
      var srcY = height - 1 - y;
      var out = 54 + y * rowSize;

      for (var x = 0; x < width; x += 1) {
        var src = (srcY * width + x) * 4;
        var a = rgba[src + 3] / 255;
        var r = Math.round(rgba[src] * a + bg.r * (1 - a));
        var gg = Math.round(rgba[src + 1] * a + bg.g * (1 - a));
        var b = Math.round(rgba[src + 2] * a + bg.b * (1 - a));

        bytes[out++] = b;
        bytes[out++] = gg;
        bytes[out++] = r;
      }

      while (out < 54 + (y + 1) * rowSize) bytes[out++] = 0;
    }

    return new Blob([buffer], { type: "image/bmp" });
  }

  async function canvasToIcoBlob(canvas) {
    var maxSize = 256;
    var scale = Math.min(1, maxSize / canvas.width, maxSize / canvas.height);
    var width = Math.max(1, Math.round(canvas.width * scale));
    var height = Math.max(1, Math.round(canvas.height * scale));

    var icoCanvas = d.createElement("canvas");
    icoCanvas.width = width;
    icoCanvas.height = height;
    var g = icoCanvas.getContext("2d");
    if (!g) throw new Error("ICO 변환용 Canvas를 사용할 수 없습니다.");
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = "high";
    g.clearRect(0, 0, width, height);
    g.drawImage(canvas, 0, 0, width, height);

    var pngBlob = await blobFromCanvas(icoCanvas, "image/png", 1);
    var pngBytes = new Uint8Array(await pngBlob.arrayBuffer());

    var header = new ArrayBuffer(22);
    var view = new DataView(header);

    view.setUint16(0, 0, true);
    view.setUint16(2, 1, true);
    view.setUint16(4, 1, true);

    view.setUint8(6, width === 256 ? 0 : width);
    view.setUint8(7, height === 256 ? 0 : height);
    view.setUint8(8, 0);
    view.setUint8(9, 0);
    view.setUint16(10, 1, true);
    view.setUint16(12, 32, true);
    view.setUint32(14, pngBytes.byteLength, true);
    view.setUint32(18, 22, true);

    return {
      blob: new Blob([header, pngBytes], { type: "image/x-icon" }),
      width: width,
      height: height
    };
  }

  var gifModulePromise = null;

  async function ensureGifEnc() {
    if (!gifModulePromise) {
      gifModulePromise = import("https://esm.sh/gifenc@1.0.3?bundle");
    }
    var mod = await gifModulePromise;
    if (!mod || !mod.GIFEncoder || !mod.quantize || !mod.applyPalette) {
      throw new Error("GIF 변환 모듈을 불러오지 못했습니다.");
    }
    return mod;
  }

  async function canvasToGifBlob(canvas) {
    var g = canvas.getContext("2d");
    if (!g) throw new Error("GIF 변환용 Canvas를 사용할 수 없습니다.");

    if (canvas.width * canvas.height > 16000000) {
      throw new Error("GIF 변환은 1,600만 픽셀 이하 이미지에서 사용할 수 있습니다.");
    }

    var mod = await ensureGifEnc();
    var imageData = g.getImageData(0, 0, canvas.width, canvas.height);
    var rgba = imageData.data;

    var hasAlpha = false;
    for (var i = 3; i < rgba.length; i += 4) {
      if (rgba[i] < 128) {
        hasAlpha = true;
        break;
      }
    }

    var format = hasAlpha ? "rgba4444" : "rgb565";
    var palette = mod.quantize(rgba, 256, hasAlpha ? {
      format: format,
      oneBitAlpha: true
    } : {
      format: format
    });

    var indexed = mod.applyPalette(rgba, palette, format);
    var transparentIndex = -1;

    if (hasAlpha) {
      for (var p = 0; p < palette.length; p += 1) {
        if (palette[p].length > 3 && palette[p][3] === 0) {
          transparentIndex = p;
          break;
        }
      }
    }

    var gif = mod.GIFEncoder();
    var opts = { palette: palette, repeat: -1, delay: 0 };

    if (transparentIndex >= 0) {
      opts.transparent = true;
      opts.transparentIndex = transparentIndex;
    }

    gif.writeFrame(indexed, canvas.width, canvas.height, opts);
    gif.finish();

    var output = gif.bytes();
    if (!output || !output.byteLength) throw new Error("GIF 파일을 만들지 못했습니다.");

    return new Blob([output], { type: "image/gif" });
  }

  async function convertOne(file, x, options, ctx) {
    if (file.size > 80 * 1024 * 1024) {
      throw new Error("이미지 한 개는 80MB 이하만 처리할 수 있습니다.");
    }

    var inputBlob = await normalizeInput(file, x, ctx);
    var loaded = await imageFromBlob(inputBlob, x.fromFormat);

    try {
      var img = loaded.img;
      var naturalWidth = img.naturalWidth || img.width;
      var naturalHeight = img.naturalHeight || img.height;

      if (!naturalWidth || !naturalHeight) {
        throw new Error("이미지 크기를 확인하지 못했습니다.");
      }

      if (naturalWidth * naturalHeight > 90000000) {
        throw new Error("이미지 해상도가 너무 큽니다. 9천만 픽셀 이하 이미지를 사용해 주세요.");
      }

      var maxWidth = options.maxWidth;
      var maxHeight = options.maxHeight;

      if (x.toFormat === "ICO") {
        maxWidth = maxWidth ? Math.min(maxWidth, 256) : 256;
        maxHeight = maxHeight ? Math.min(maxHeight, 256) : 256;
      }

      var size = targetSize(naturalWidth, naturalHeight, maxWidth, maxHeight);
      var canvas = d.createElement("canvas");
      canvas.width = size.width;
      canvas.height = size.height;

      var alphaOutput = x.toFormat !== "JPG" && x.toFormat !== "BMP";
      var g = canvas.getContext("2d", { alpha: alphaOutput });
      if (!g) throw new Error("브라우저가 Canvas 변환을 지원하지 않습니다.");

      g.imageSmoothingEnabled = true;
      g.imageSmoothingQuality = "high";

      if (x.toFormat === "JPG" || x.toFormat === "BMP") {
        g.fillStyle = options.background || "#ffffff";
        g.fillRect(0, 0, canvas.width, canvas.height);
      }

      g.drawImage(img, 0, 0, canvas.width, canvas.height);

      var blob;
      var outWidth = canvas.width;
      var outHeight = canvas.height;

      if (x.toFormat === "PNG") {
        blob = await blobFromCanvas(canvas, "image/png", 1);
      } else if (x.toFormat === "WEBP") {
        blob = await blobFromCanvas(canvas, "image/webp", options.quality);
      } else if (x.toFormat === "JPG") {
        blob = await blobFromCanvas(canvas, "image/jpeg", options.quality);
      } else if (x.toFormat === "BMP") {
        blob = canvasToBmpBlob(canvas, options.background);
      } else if (x.toFormat === "ICO") {
        var ico = await canvasToIcoBlob(canvas);
        blob = ico.blob;
        outWidth = ico.width;
        outHeight = ico.height;
      } else if (x.toFormat === "GIF") {
        blob = await canvasToGifBlob(canvas);
      } else {
        throw new Error("현재 이미지 엔진이 " + x.toFormat + " 출력을 지원하지 않습니다.");
      }

      return {
        blob: blob,
        name: safeBaseName(file.name) + "." + x.toFormat.toLowerCase(),
        width: outWidth,
        height: outHeight
      };
    } finally {
      URL.revokeObjectURL(loaded.url);
    }
  }

  function formatNote(x) {
    var from = String(x.fromFormat || "").toUpperCase();
    var to = String(x.toFormat || "").toUpperCase();

    if (to === "GIF") {
      return "JPG 또는 PNG 한 장을 정지 GIF 한 프레임으로 변환합니다. GIF는 최대 256색이며 PNG의 반투명 픽셀은 1비트 투명도로 단순화될 수 있습니다.";
    }
    if (to === "ICO") {
      return "ICO는 최대 256×256으로 생성합니다. 원본이 더 크면 비율을 유지해 축소하며 PNG 기반 아이콘 데이터를 사용합니다.";
    }
    if (to === "BMP") {
      return "BMP는 호환성을 위해 24비트 비압축 방식으로 생성합니다. 투명 영역은 선택한 배경색으로 합성됩니다.";
    }
    if (from === "GIF") {
      return "움직이는 GIF는 첫 프레임을 기준으로 정지 이미지로 변환합니다.";
    }
    if (from === "TIFF") {
      return "여러 페이지가 들어 있는 TIFF는 첫 번째 페이지를 기준으로 변환합니다.";
    }
    if (from === "AVIF") {
      return "AVIF 읽기 지원은 브라우저에 따라 다를 수 있습니다. 최신 Chrome·Edge·Safari·Firefox 사용을 권장합니다.";
    }
    if (from === "ICO") {
      return "ICO에 여러 크기의 아이콘이 들어 있으면 브라우저가 선택한 대표 이미지를 PNG로 변환합니다.";
    }
    if (from === "SVG") {
      return "SVG 내부에 외부 이미지나 외부 폰트가 연결된 경우 브라우저 보안 정책에 따라 일부 요소가 표시되지 않을 수 있습니다.";
    }
    return "파일은 외부 변환 서버로 전송하지 않고 현재 브라우저에서 처리합니다.";
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
    version: "1.2.0",

    open: function (x, ctx) {
      injectStyle();

      var qualityVisible = x.toFormat === "JPG" || x.toFormat === "WEBP";
      var backgroundVisible = x.toFormat === "JPG" || x.toFormat === "BMP";

      ctx.stage.innerHTML =
        '<div class="hm-fx-detail">' +
          '<div class="hm-fx-toolbar"><a class="hm-fx-back" href="' +
            ctx.route({ category: x.category }) +
            '" data-route>← ' + ctx.esc(ctx.cat(x.category).name) + '</a></div>' +
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
              '<div class="hm-eng-field" ' + (backgroundVisible ? "" : "hidden") + '><label>투명 영역 배경색</label><input type="color" value="#ffffff" data-eng-bg></div>' +
            '</div>' +
            '<div class="hm-eng-files" data-eng-files></div>' +
            '<div class="hm-eng-actions">' +
              '<button class="hm-eng-btn" type="button" data-eng-clear disabled>전체 지우기</button>' +
              '<button class="hm-eng-btn primary" type="button" data-eng-run disabled>모두 변환</button>' +
              '<button class="hm-eng-btn" type="button" data-eng-zip hidden>ZIP으로 받기</button>' +
            '</div>' +
            '<div class="hm-eng-status" data-eng-status>파일은 서버로 전송하지 않고 브라우저 안에서 처리합니다.</div>' +
            '<div class="hm-eng-note">' + ctx.esc(formatNote(x)) + '</div>' +
            '<div class="hm-eng-results" data-eng-results></div>' +
            '<div class="hm-eng-version">Image Engine v1.2.0</div>' +
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
        var rejected = 0;
        Array.prototype.forEach.call(list || [], function (file) {
          if (!validFor(file, x.fromFormat)) {
            rejected += 1;
            return;
          }
          if (file.size > 80 * 1024 * 1024) {
            rejected += 1;
            return;
          }
          var previewAllowed = ["HEIC", "TIFF"].indexOf(String(x.fromFormat).toUpperCase()) < 0;
          items.push({
            file: file,
            previewUrl: previewAllowed ? URL.createObjectURL(file) : ""
          });
          added += 1;
        });
        renderFiles();
        status.textContent = added ?
          added + "개 파일을 추가했습니다." + (rejected ? " · " + rejected + "개 파일은 형식 또는 크기 제한으로 제외했습니다." : "") :
          x.fromFormat + " 형식의 80MB 이하 파일을 선택해 주세요.";
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
