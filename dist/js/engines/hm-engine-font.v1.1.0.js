/*
 * HealingMart Converter Font Engine v1.1.0
 * TTF / OTF / WOFF / WOFF2 / EOT
 * Browser-side conversion with fonteditor-core 2.6.3 + opentype.js 2.0.0
 */
(function (w) {
  "use strict";

  var d = w.document;
  var NS = w.HM_CONVERTER_ENGINES = w.HM_CONVERTER_ENGINES || {};
  var modulePromise = null;
  var pakoPromise = null;
  var woff2Ready = null;
  var openTypePromise = null;

  function injectStyle() {
    if (d.getElementById("hm-engine-font-style-v1")) return;
    var style = d.createElement("style");
    style.id = "hm-engine-font-style-v1";
    style.textContent = [
      ".hm-ft-box{padding:22px;border:1px solid #dfe6ef;border-radius:20px;background:#fff;box-shadow:0 12px 34px rgba(15,23,42,.07)}",
      ".hm-ft-drop{padding:34px 18px;border:2px dashed #aebff0;border-radius:17px;background:#f8fbff;text-align:center;cursor:pointer;transition:.16s ease}",
      ".hm-ft-drop:hover,.hm-ft-drop.is-drag{border-color:#2f7cf6;background:#fff}",
      ".hm-ft-drop strong{display:block;color:#13253a;font-size:18px;font-weight:950}",
      ".hm-ft-drop span{display:block;margin-top:5px;color:#5d6d83;font-size:13px;line-height:1.55}",
      ".hm-ft-file{display:none;margin-top:12px;padding:12px;border:1px solid #e0e7ef;border-radius:12px;background:#fbfdff}",
      ".hm-ft-file strong{display:block;overflow:hidden;color:#24364b;font-size:14px;font-weight:950;text-overflow:ellipsis;white-space:nowrap}",
      ".hm-ft-file span{display:block;margin-top:3px;color:#718095;font-size:11px}",
      ".hm-ft-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:14px}",
      ".hm-ft-info{padding:11px 12px;border:1px solid #dce5ee;border-radius:11px;background:#fff;color:#42536a;font-size:12px;font-weight:800}",
      ".hm-ft-actions{display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin-top:16px}",
      ".hm-ft-btn{min-height:46px;padding:0 17px;border:1px solid #d6e0ea;border-radius:11px;background:#fff;color:#223248;font-size:13px;font-weight:900;cursor:pointer}",
      ".hm-ft-btn.primary{color:#fff;border-color:#4d69e8;background:linear-gradient(135deg,#6d5dfc,#2f7cf6);box-shadow:0 8px 20px rgba(71,91,229,.22)}",
      ".hm-ft-btn:disabled{opacity:.48;cursor:not-allowed}",
      ".hm-ft-status{margin-top:13px;padding:12px;border-radius:11px;background:#f4f7fb;color:#4d5d73;font-size:12px;line-height:1.65}",
      ".hm-ft-note{margin-top:12px;padding:11px 12px;border:1px solid #e4eaf1;border-radius:11px;background:#fbfdff;color:#607087;font-size:11px;line-height:1.7}",
      ".hm-ft-result{display:none;margin-top:14px;padding:14px;border:1px solid #dce5ee;border-radius:13px;background:#fff}",
      ".hm-ft-result.is-show{display:block}",
      ".hm-ft-result strong{display:block;color:#1f3045;font-size:14px;font-weight:950}",
      ".hm-ft-result span{display:block;margin-top:4px;color:#68778c;font-size:11px}",
      ".hm-ft-download{display:flex;align-items:center;justify-content:center;min-height:43px;margin-top:11px;border-radius:10px;background:#0e8a69;color:#fff!important;font-size:12px;font-weight:950;text-decoration:none}",
      ".hm-ft-version{margin-top:10px;color:#8a97a8;font-size:10px;text-align:right}",
      "@media(max-width:760px){.hm-ft-box{padding:13px 9px;border-radius:15px}.hm-ft-drop{padding:27px 10px}.hm-ft-options{grid-template-columns:1fr}}"
    ].join("");
    d.head.appendChild(style);
  }

  function safeBaseName(name) {
    return String(name || "font").replace(/\.[^.]+$/, "").replace(/[\\/:*?"<>|]+/g, "_");
  }

  function niceBytes(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + " KB";
    return (bytes / 1024 / 1024).toFixed(2) + " MB";
  }

  function ext(name) {
    var m = String(name || "").toLowerCase().match(/\.([a-z0-9]+)$/);
    return m ? m[1] : "";
  }

  function mimeFor(type) {
    var map = {
      ttf: "font/ttf",
      otf: "font/otf",
      woff: "font/woff",
      woff2: "font/woff2",
      eot: "application/vnd.ms-fontobject"
    };
    return map[String(type || "").toLowerCase()] || "application/octet-stream";
  }

  async function loadModules() {
    if (!modulePromise) {
      modulePromise = import("https://esm.sh/fonteditor-core@2.6.3?bundle");
    }
    if (!pakoPromise) {
      pakoPromise = import("https://esm.sh/pako@2.1.0?bundle");
    }
    var result = await Promise.all([modulePromise, pakoPromise]);
    return {
      font: result[0],
      pako: result[1]
    };
  }

  async function ensureWoff2(mod) {
    if (!woff2Ready) {
      var api = mod.woff2 || (mod.default && mod.default.woff2);
      if (!api || !api.init) throw new Error("WOFF2 처리 모듈을 찾지 못했습니다.");
      woff2Ready = api.init("https://cdn.jsdelivr.net/npm/fonteditor-core@2.6.3/woff2/woff2.wasm");
    }
    await woff2Ready;
  }

  function getCreateFont(mod) {
    return mod.createFont ||
      (mod.default && mod.default.createFont) ||
      (mod.Font && mod.Font.create ? function (buffer, options) { return mod.Font.create(buffer, options); } : null) ||
      (mod.default && mod.default.Font && mod.default.Font.create ? function (buffer, options) { return mod.default.Font.create(buffer, options); } : null);
  }


  async function ensureOpenType() {
    if (!openTypePromise) {
      openTypePromise = import("https://esm.sh/opentype.js@2.0.0?bundle").then(function (mod) {
        var api = mod.default || mod;
        var parse = mod.parse || (api && api.parse);

        if (typeof parse !== "function") {
          throw new Error("OpenType 변환 라이브러리를 불러오지 못했습니다.");
        }

        return {
          module:mod,
          api:api,
          parse:parse
        };
      }).catch(function (error) {
        openTypePromise = null;
        throw error;
      });
    }

    return openTypePromise;
  }

  function fontSignature(bytes) {
    if (!bytes || bytes.length < 4) return "";

    return String.fromCharCode(
      bytes[0],
      bytes[1],
      bytes[2],
      bytes[3]
    );
  }

  async function ttfToOtf(file, onStatus) {
    if (file.size > 20 * 1024 * 1024) {
      throw new Error("폰트 파일은 20MB 이하만 처리할 수 있습니다.");
    }

    if (onStatus) onStatus("opentype.js 2.0.0을 준비하는 중입니다...");
    var ot = await ensureOpenType();

    if (onStatus) onStatus("TTF 글리프와 메타데이터를 읽는 중입니다...");

    var font;

    try {
      font = ot.parse(await file.arrayBuffer());
    } catch (error) {
      throw new Error("TTF 파일을 읽지 못했습니다. 손상되었거나 지원하지 않는 글꼴 구조일 수 있습니다.");
    }

    if (!font || typeof font.toArrayBuffer !== "function") {
      throw new Error("OpenType 출력 객체를 만들지 못했습니다.");
    }

    if (onStatus) onStatus("OpenType/CFF 파일을 생성하는 중입니다...");

    var output;

    try {
      output = font.toArrayBuffer();
    } catch (error2) {
      throw new Error("OTF 파일을 생성하지 못했습니다. 특수 글꼴 테이블이나 글리프 구조가 지원되지 않을 수 있습니다.");
    }

    var bytes = new Uint8Array(output);

    if (!bytes.byteLength) {
      throw new Error("생성된 OTF 파일이 비어 있습니다.");
    }

    var sig = fontSignature(bytes);

    if (sig !== "OTTO") {
      throw new Error(
        "출력 데이터가 CFF 기반 OTF 시그니처(OTTO)가 아니어서 다운로드를 중단했습니다. " +
        "이 글꼴은 브라우저에서 안전하게 TTF → OTF로 재작성할 수 없습니다."
      );
    }

    return new Blob([bytes], {
      type:"font/otf"
    });
  }

  async function convertFont(file, from, to, onStatus) {
    if (file.size > 20 * 1024 * 1024) {
      throw new Error("폰트 파일은 20MB 이하만 처리할 수 있습니다.");
    }

    if (from === "ttf" && to === "otf") {
      return ttfToOtf(file, onStatus);
    }

    if (to === "otf") {
      throw new Error("현재 이 입력 형식에서는 OTF 쓰기를 지원하지 않습니다.");
    }

    if (onStatus) onStatus("폰트 변환 모듈을 준비하는 중입니다...");
    var modules = await loadModules();
    var mod = modules.font;
    var pakoModule = modules.pako;
    var pako = pakoModule.default || pakoModule;

    if (from === "woff2" || to === "woff2") {
      if (onStatus) onStatus("WOFF2 압축 모듈을 준비하는 중입니다...");
      await ensureWoff2(mod);
    }

    var createFont = getCreateFont(mod);
    if (!createFont) throw new Error("폰트 변환 API를 불러오지 못했습니다.");

    var buffer = await file.arrayBuffer();

    if (onStatus) onStatus("폰트 구조를 읽는 중입니다...");
    var readOptions = {
      type: from,
      hinting: true,
      kerning: true,
      compound2simple: from === "otf"
    };
    if (from === "woff" && pako && pako.inflate) readOptions.inflate = pako.inflate;

    var font;
    try {
      font = createFont(buffer, readOptions);
    } catch (error) {
      throw new Error("폰트 파일을 읽지 못했습니다. 파일이 손상되었거나 지원하지 않는 글꼴 구조일 수 있습니다.");
    }

    if (!font || typeof font.write !== "function") {
      throw new Error("폰트 변환 객체를 만들지 못했습니다.");
    }

    if (onStatus) onStatus(String(to).toUpperCase() + " 파일을 생성하는 중입니다...");
    var writeOptions = {
      type: to,
      hinting: true,
      kerning: true,
      writeZeroContoursGlyfData: true
    };
    if (to === "woff" && pako && pako.deflate) writeOptions.deflate = pako.deflate;

    var output;
    try {
      output = font.write(writeOptions);
    } catch (error2) {
      throw new Error("출력 폰트를 생성하지 못했습니다. 변환 과정에서 지원되지 않는 글꼴 테이블이 발견되었을 수 있습니다.");
    }

    var bytes;
    if (output instanceof ArrayBuffer) bytes = new Uint8Array(output);
    else if (ArrayBuffer.isView(output)) bytes = new Uint8Array(output.buffer, output.byteOffset, output.byteLength);
    else throw new Error("출력 폰트 데이터를 만들지 못했습니다.");

    if (!bytes.byteLength) throw new Error("출력 폰트가 비어 있습니다.");

    return new Blob([bytes], { type: mimeFor(to) });
  }

  function limitation(from, to) {
    if (from === "ttf" && to === "otf") {
      return "opentype.js 2.0.0으로 TTF 글리프를 읽은 뒤 OpenType/CFF OTF로 다시 작성합니다. 출력의 OTTO 시그니처를 확인한 경우에만 다운로드합니다. 가변 폰트·컬러 폰트·고급 OpenType 레이아웃·원본 힌팅 등 일부 특수 테이블은 손실되거나 단순화될 수 있습니다.";
    }
    if (from === "otf") {
      return "OTF는 내부 CFF/OpenType 구조를 읽어 TTF 기반 구조로 변환한 뒤 출력합니다. 가변 폰트, 컬러 폰트, 특수 OpenType 테이블 등 고급 기능은 일부 손실될 수 있습니다.";
    }
    if (from === "eot") {
      return "EOT는 오래된 웹폰트 형식입니다. 일반 글리프와 기본 메타데이터 중심으로 변환되며 EOT 전용 정보는 유지되지 않을 수 있습니다.";
    }
    if (from === "woff2" || to === "woff2") {
      return "WOFF2 변환에는 Google WOFF2 기반 WebAssembly 모듈을 사용합니다. 첫 실행 시 약 1MB 안팎의 변환 모듈을 추가로 불러올 수 있습니다.";
    }
    return "폰트의 기본 글리프와 주요 메타데이터를 변환합니다. 가변 폰트·컬러 폰트·특수 힌팅/레이아웃 테이블은 형식에 따라 일부 달라질 수 있습니다.";
  }

  NS.font = {
    version: "1.1.0",

    open: function (x, ctx) {
      injectStyle();

      var selectedFile = null;
      var objectUrl = "";
      var from = String(x.fromFormat || "").toLowerCase();
      var to = String(x.toFormat || "").toLowerCase();

      ctx.stage.innerHTML =
        '<div class="hm-fx-detail">' +
          '<div class="hm-fx-toolbar"><a class="hm-fx-back" href="' +
            ctx.route({ category: x.category }) +
            '" data-route>← ' + ctx.esc(ctx.cat(x.category).name) + '</a></div>' +
          ctx.titleBlock(x) +
          '<div class="hm-ft-box">' +
            '<div class="hm-ft-drop" data-ft-drop>' +
              '<strong>' + ctx.esc(String(x.fromFormat || "")) + ' 폰트 파일을 선택하거나 끌어다 놓으세요</strong>' +
              '<span>파일은 외부 변환 서버로 업로드하지 않고 현재 브라우저에서 처리합니다.</span>' +
              '<input type="file" hidden data-ft-file accept="' + ctx.esc(x.accept || "") + '">' +
            '</div>' +
            '<div class="hm-ft-file" data-ft-fileinfo><strong data-ft-name></strong><span data-ft-meta></span></div>' +
            '<div class="hm-ft-options">' +
              '<div class="hm-ft-info">입력 형식 · <strong>' + ctx.esc(String(x.fromFormat || "")) + '</strong></div>' +
              '<div class="hm-ft-info">출력 형식 · <strong>' + ctx.esc(String(x.toFormat || "")) + '</strong></div>' +
            '</div>' +
            '<div class="hm-ft-actions">' +
              '<button class="hm-ft-btn primary" type="button" data-ft-run disabled>폰트 변환하기</button>' +
            '</div>' +
            '<div class="hm-ft-status" data-ft-status>20MB 이하 폰트 파일을 선택해 주세요.</div>' +
            '<div class="hm-ft-result" data-ft-result>' +
              '<strong data-ft-result-name></strong>' +
              '<span data-ft-result-meta></span>' +
              '<a class="hm-ft-download" href="#" data-ft-download>변환된 폰트 다운로드</a>' +
            '</div>' +
            '<div class="hm-ft-note">' + ctx.esc(limitation(from, to)) + '</div>' +
            '<div class="hm-ft-note"><strong>폰트 라이선스 안내</strong><br>파일 형식을 변환해도 원래 폰트의 저작권·배포·웹폰트 사용 조건은 바뀌지 않습니다. 변환과 사용이 허용된 폰트만 이용해 주세요.</div>' +
            '<div class="hm-ft-version">Font Engine v1.1.0</div>' +
          '</div>' +
        '</div>';

      var drop = ctx.stage.querySelector("[data-ft-drop]");
      var input = ctx.stage.querySelector("[data-ft-file]");
      var fileInfo = ctx.stage.querySelector("[data-ft-fileinfo]");
      var fileName = ctx.stage.querySelector("[data-ft-name]");
      var fileMeta = ctx.stage.querySelector("[data-ft-meta]");
      var run = ctx.stage.querySelector("[data-ft-run]");
      var status = ctx.stage.querySelector("[data-ft-status]");
      var result = ctx.stage.querySelector("[data-ft-result]");
      var resultName = ctx.stage.querySelector("[data-ft-result-name]");
      var resultMeta = ctx.stage.querySelector("[data-ft-result-meta]");
      var download = ctx.stage.querySelector("[data-ft-download]");

      function clearResult() {
        result.classList.remove("is-show");
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
          objectUrl = "";
        }
        download.removeAttribute("href");
      }

      function choose(file) {
        clearResult();

        if (!file) return;
        if (ext(file.name) !== from) {
          selectedFile = null;
          run.disabled = true;
          status.textContent = String(x.fromFormat || "") + " 파일을 선택해 주세요.";
          return;
        }
        if (file.size > 20 * 1024 * 1024) {
          selectedFile = null;
          run.disabled = true;
          status.textContent = "폰트 파일은 20MB 이하만 처리할 수 있습니다.";
          return;
        }

        selectedFile = file;
        fileInfo.style.display = "block";
        fileName.textContent = file.name;
        fileMeta.textContent = niceBytes(file.size) + " · " + String(x.fromFormat || "") + " → " + String(x.toFormat || "");
        run.disabled = false;
        status.textContent = "준비되었습니다. 변환 버튼을 눌러 주세요.";
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
        clearResult();

        try {
          var blob = await convertFont(selectedFile, from, to, function (message) {
            status.textContent = message;
          });

          objectUrl = URL.createObjectURL(blob);
          var outName = safeBaseName(selectedFile.name) + "." + to;

          resultName.textContent = outName;
          resultMeta.textContent = niceBytes(blob.size) + " · " + String(x.toFormat || "");
          download.href = objectUrl;
          download.download = outName;
          result.classList.add("is-show");
          status.textContent = "폰트 변환을 완료했습니다.";
        } catch (error) {
          status.textContent = "변환 중 오류가 발생했습니다: " + (error.message || error);
        } finally {
          run.disabled = false;
        }
      };
    }
  };
})(window);
