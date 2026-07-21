/*
 * HealingMart Converter Media Engine v1.0.0
 * Video / Audio conversion with ffmpeg.wasm
 *
 * Wrapper: @ffmpeg/ffmpeg 0.12.15
 * Core:    @ffmpeg/core 0.12.10 (single-thread)
 */
(function (w) {
  "use strict";

  var d = w.document;
  var NS = w.HM_CONVERTER_ENGINES = w.HM_CONVERTER_ENGINES || {};

  var MEDIA = {
    ffmpeg: null,
    loaded: false,
    loading: null,
    progressHandler: null,
    logHandler: null,
    coreBlobUrls: []
  };

  var WRAPPER_URL = "https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.15/dist/umd/ffmpeg.js";
  var CORE_BASE = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd";

  function injectStyle() {
    if (d.getElementById("hm-engine-media-style-v1")) return;

    var style = d.createElement("style");
    style.id = "hm-engine-media-style-v1";
    style.textContent = [
      ".hm-md-box{padding:22px;border:1px solid #dfe6ef;border-radius:20px;background:#fff;box-shadow:0 12px 34px rgba(15,23,42,.07)}",
      ".hm-md-drop{padding:34px 18px;border:2px dashed #aebff0;border-radius:17px;background:#f8fbff;text-align:center;cursor:pointer;transition:.16s ease}",
      ".hm-md-drop:hover,.hm-md-drop.is-drag{border-color:#2f7cf6;background:#fff}",
      ".hm-md-drop strong{display:block;color:#13253a;font-size:18px;font-weight:950}",
      ".hm-md-drop span{display:block;margin-top:5px;color:#5d6d83;font-size:13px;line-height:1.55}",
      ".hm-md-file{display:none;margin-top:12px;padding:12px;border:1px solid #e0e7ef;border-radius:12px;background:#fbfdff}",
      ".hm-md-file strong{display:block;overflow:hidden;color:#24364b;font-size:14px;font-weight:950;text-overflow:ellipsis;white-space:nowrap}",
      ".hm-md-file span{display:block;margin-top:3px;color:#718095;font-size:11px}",
      ".hm-md-options{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:14px}",
      ".hm-md-field label{display:block;margin-bottom:5px;color:#536176;font-size:12px;font-weight:850}",
      ".hm-md-field select{width:100%;height:46px;padding:0 10px;border:1px solid #d7e0ea;border-radius:10px;background:#fff;color:#172033;font-size:13px;font-weight:750;outline:none}",
      ".hm-md-field select:focus{border-color:#4f7df1;box-shadow:0 0 0 4px rgba(79,125,241,.10)}",
      ".hm-md-actions{display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin-top:16px}",
      ".hm-md-btn{min-height:46px;padding:0 17px;border:1px solid #d6e0ea;border-radius:11px;background:#fff;color:#223248;font-size:13px;font-weight:900;cursor:pointer}",
      ".hm-md-btn.primary{color:#fff;border-color:#4d69e8;background:linear-gradient(135deg,#6d5dfc,#2f7cf6);box-shadow:0 8px 20px rgba(71,91,229,.22)}",
      ".hm-md-btn.danger{border-color:#f1c7c7;color:#a33;background:#fff8f8}",
      ".hm-md-btn:disabled{opacity:.48;cursor:not-allowed}",
      ".hm-md-progress-wrap{display:none;margin-top:14px}",
      ".hm-md-progress-wrap.is-show{display:block}",
      ".hm-md-progress-track{height:12px;overflow:hidden;border-radius:999px;background:#e9eef5}",
      ".hm-md-progress-bar{width:0;height:100%;border-radius:999px;background:linear-gradient(90deg,#5d6cf4,#2f7cf6);transition:width .15s ease}",
      ".hm-md-progress-text{display:flex;justify-content:space-between;gap:10px;margin-top:7px;color:#627188;font-size:11px;font-weight:800}",
      ".hm-md-status{margin-top:13px;padding:12px;border-radius:11px;background:#f4f7fb;color:#4d5d73;font-size:12px;line-height:1.65}",
      ".hm-md-note{margin-top:12px;padding:11px 12px;border:1px solid #e4eaf1;border-radius:11px;background:#fbfdff;color:#607087;font-size:11px;line-height:1.7}",
      ".hm-md-result{display:none;margin-top:14px;padding:14px;border:1px solid #dce5ee;border-radius:13px;background:#fff}",
      ".hm-md-result.is-show{display:block}",
      ".hm-md-result strong{display:block;color:#1f3045;font-size:14px;font-weight:950}",
      ".hm-md-result span{display:block;margin-top:4px;color:#68778c;font-size:11px}",
      ".hm-md-preview{width:100%;max-height:340px;margin-top:12px;border-radius:11px;background:#0f172a}",
      ".hm-md-download{display:flex;align-items:center;justify-content:center;min-height:45px;margin-top:11px;border-radius:10px;background:#0e8a69;color:#fff!important;font-size:12px;font-weight:950;text-decoration:none}",
      ".hm-md-log{display:none;max-height:130px;overflow:auto;margin-top:10px;padding:10px;border-radius:10px;background:#0f172a;color:#c9d3e4;font:500 10px/1.55 ui-monospace,SFMono-Regular,Consolas,monospace;white-space:pre-wrap;word-break:break-word}",
      ".hm-md-log.is-show{display:block}",
      ".hm-md-version{margin-top:10px;color:#8a97a8;font-size:10px;text-align:right}",
      "@media(max-width:760px){.hm-md-box{padding:13px 9px;border-radius:15px}.hm-md-drop{padding:27px 10px}.hm-md-options{grid-template-columns:1fr}.hm-md-btn{min-height:48px}.hm-md-preview{max-height:260px}}"
    ].join("");
    d.head.appendChild(style);
  }

  function safeBaseName(name) {
    return String(name || "media").replace(/\.[^.]+$/, "").replace(/[\\/:*?"<>|]+/g, "_");
  }

  function niceBytes(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + " KB";
    return (bytes / 1024 / 1024).toFixed(2) + " MB";
  }

  function extension(name) {
    var m = String(name || "").toLowerCase().match(/\.([a-z0-9]+)$/);
    return m ? m[1] : "";
  }

  function expectedExt(format) {
    return String(format || "").toLowerCase();
  }

  function mediaMime(format) {
    var map = {
      mp4:"video/mp4",
      mov:"video/quicktime",
      mkv:"video/x-matroska",
      avi:"video/x-msvideo",
      webm:"video/webm",
      gif:"image/gif",
      mp3:"audio/mpeg",
      wav:"audio/wav",
      m4a:"audio/mp4",
      aac:"audio/aac",
      flac:"audio/flac",
      ogg:"audio/ogg",
      opus:"audio/opus"
    };
    return map[String(format || "").toLowerCase()] || "application/octet-stream";
  }

  async function toBlobURL(url, type) {
    var res = await fetch(url, { mode:"cors" });
    if (!res.ok) throw new Error("미디어 변환 모듈을 내려받지 못했습니다. HTTP " + res.status);
    var blob = await res.blob();
    var typed = new Blob([blob], { type:type });
    var blobUrl = URL.createObjectURL(typed);
    MEDIA.coreBlobUrls.push(blobUrl);
    return blobUrl;
  }

  function resetMediaState() {
    try {
      if (MEDIA.ffmpeg && typeof MEDIA.ffmpeg.terminate === "function") MEDIA.ffmpeg.terminate();
    } catch (e) {}

    MEDIA.coreBlobUrls.forEach(function (url) {
      try { URL.revokeObjectURL(url); } catch (e) {}
    });

    MEDIA.ffmpeg = null;
    MEDIA.loaded = false;
    MEDIA.loading = null;
    MEDIA.progressHandler = null;
    MEDIA.logHandler = null;
    MEDIA.coreBlobUrls = [];
  }

  async function ensureFFmpeg(ctx, status) {
    if (MEDIA.loaded && MEDIA.ffmpeg) return MEDIA.ffmpeg;
    if (MEDIA.loading) return MEDIA.loading;

    MEDIA.loading = (async function () {
      if (status) status("FFmpeg 브라우저 엔진을 준비하는 중입니다...");

      if (!w.FFmpegWASM || !w.FFmpegWASM.FFmpeg) {
        await ctx.loadScript(WRAPPER_URL);
      }

      if (!w.FFmpegWASM || !w.FFmpegWASM.FFmpeg) {
        throw new Error("FFmpeg 실행 모듈을 불러오지 못했습니다.");
      }

      var ffmpeg = new w.FFmpegWASM.FFmpeg();

      ffmpeg.on("progress", function (event) {
        if (MEDIA.progressHandler) MEDIA.progressHandler(event || {});
      });

      ffmpeg.on("log", function (event) {
        if (MEDIA.logHandler) MEDIA.logHandler(event || {});
      });

      if (status) status("FFmpeg 코어 약 32MB를 처음 한 번 불러오는 중입니다...");

      var coreURL = await toBlobURL(CORE_BASE + "/ffmpeg-core.js", "text/javascript");
      var wasmURL = await toBlobURL(CORE_BASE + "/ffmpeg-core.wasm", "application/wasm");

      await ffmpeg.load({
        coreURL: coreURL,
        wasmURL: wasmURL
      });

      MEDIA.ffmpeg = ffmpeg;
      MEDIA.loaded = true;
      return ffmpeg;
    })();

    try {
      return await MEDIA.loading;
    } catch (error) {
      resetMediaState();
      throw error;
    } finally {
      MEDIA.loading = null;
    }
  }

  function qualityArgs(level) {
    if (level === "high") return { crf:"21", preset:"medium", audio:"256k" };
    if (level === "fast") return { crf:"30", preset:"ultrafast", audio:"128k" };
    return { crf:"25", preset:"veryfast", audio:"192k" };
  }

  function videoScaleArg(maxWidth) {
    var n = Number(maxWidth) || 0;
    if (!n) return "";
    return "scale='min(" + n + ",iw)':-2:flags=lanczos";
  }

  function standardMp4Args(input, output, opts, noAudio) {
    var q = qualityArgs(opts.quality);
    var args = ["-i", input, "-map", "0:v:0?"];
    if (!noAudio) args.push("-map", "0:a:0?");
    var vf = videoScaleArg(opts.maxWidth);
    if (vf) args.push("-vf", vf);
    args.push("-c:v", "libx264", "-preset", q.preset, "-crf", q.crf, "-pix_fmt", "yuv420p");
    if (noAudio) args.push("-an");
    else args.push("-c:a", "aac", "-b:a", q.audio);
    args.push("-movflags", "+faststart", output);
    return args;
  }

  function fallbackMp4Args(input, output, opts, noAudio) {
    var q = qualityArgs(opts.quality);
    var args = ["-i", input, "-map", "0:v:0?"];
    if (!noAudio) args.push("-map", "0:a:0?");
    var vf = videoScaleArg(opts.maxWidth);
    if (vf) args.push("-vf", vf);
    args.push("-c:v", "mpeg4", "-q:v", opts.quality === "high" ? "3" : opts.quality === "fast" ? "7" : "5");
    if (noAudio) args.push("-an");
    else args.push("-c:a", "aac", "-b:a", q.audio);
    args.push("-movflags", "+faststart", output);
    return args;
  }

  function mp3Args(input, output, bitrate) {
    return [
      ["-i", input, "-vn", "-c:a", "libmp3lame", "-b:a", bitrate, output],
      ["-i", input, "-vn", "-c:a", "mp3", "-b:a", bitrate, output]
    ];
  }

  function buildPlan(x, input, output, opts) {
    var id = String(x.id || "");
    var q = qualityArgs(opts.quality);
    var plans = [];

    if (id === "mp4-mp3") return { commands:mp3Args(input, output, q.audio), mime:"audio/mpeg" };

    if (["mov-mp4","mkv-mp4","avi-mp4","webm-mp4","flv-mp4","3gp-mp4"].indexOf(id) >= 0) {
      plans.push(standardMp4Args(input, output, opts, false));
      plans.push(fallbackMp4Args(input, output, opts, false));
      return { commands:plans, mime:"video/mp4" };
    }

    if (id === "m4v-mp4") {
      plans.push(["-i", input, "-map", "0:v:0?", "-map", "0:a:0?", "-c", "copy", "-movflags", "+faststart", output]);
      plans.push(standardMp4Args(input, output, opts, false));
      plans.push(fallbackMp4Args(input, output, opts, false));
      return { commands:plans, mime:"video/mp4" };
    }

    if (id === "gif-mp4") {
      plans.push(standardMp4Args(input, output, opts, true));
      plans.push(fallbackMp4Args(input, output, opts, true));
      return { commands:plans, mime:"video/mp4" };
    }

    if (id === "mp4-webm") {
      var vfWebm = videoScaleArg(opts.maxWidth);
      var a1 = ["-i", input];
      if (vfWebm) a1.push("-vf", vfWebm);
      a1.push("-c:v", "libvpx-vp9", "-crf", opts.quality === "high" ? "28" : opts.quality === "fast" ? "40" : "34", "-b:v", "0", "-c:a", "libopus", "-b:a", q.audio, output);
      plans.push(a1);

      var a2 = ["-i", input];
      if (vfWebm) a2.push("-vf", vfWebm);
      a2.push("-c:v", "libvpx", "-crf", "12", "-b:v", "1M", "-c:a", "libvorbis", "-q:a", "4", output);
      plans.push(a2);

      return { commands:plans, mime:"video/webm" };
    }

    if (["mp4-gif","mov-gif","webm-gif"].indexOf(id) >= 0) {
      var maxW = Number(opts.maxWidth) || 720;
      var fps = opts.quality === "high" ? 15 : opts.quality === "fast" ? 8 : 10;
      var filter = "fps=" + fps + ",scale='min(" + maxW + ",iw)':-2:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=192[p];[s1][p]paletteuse=dither=sierra2_4a";
      return { commands:[["-i", input, "-filter_complex", filter, "-loop", "0", output]], mime:"image/gif" };
    }

    if (id === "mkv-avi") {
      plans.push(["-i", input, "-c:v", "mpeg4", "-q:v", opts.quality === "high" ? "3" : "5", "-c:a", "libmp3lame", "-b:a", q.audio, output]);
      plans.push(["-i", input, "-c:v", "mpeg4", "-q:v", "5", "-c:a", "mp3", "-b:a", q.audio, output]);
      return { commands:plans, mime:"video/x-msvideo" };
    }

    if (id === "avi-mkv") {
      plans.push(["-i", input, "-c:v", "libx264", "-preset", q.preset, "-crf", q.crf, "-c:a", "aac", "-b:a", q.audio, output]);
      plans.push(["-i", input, "-c:v", "mpeg4", "-q:v", "5", "-c:a", "mp3", "-b:a", q.audio, output]);
      return { commands:plans, mime:"video/x-matroska" };
    }

    if (id === "mp4-mov") {
      plans.push(["-i", input, "-map", "0:v:0?", "-map", "0:a:0?", "-c", "copy", output]);
      plans.push(["-i", input, "-c:v", "libx264", "-preset", q.preset, "-crf", q.crf, "-c:a", "aac", "-b:a", q.audio, output]);
      return { commands:plans, mime:"video/quicktime" };
    }

    if (id === "mp3-wav") {
      return { commands:[["-i", input, "-vn", "-c:a", "pcm_s16le", "-ar", "44100", output]], mime:"audio/wav" };
    }

    if (id === "wav-mp3" || id === "m4a-mp3" || id === "aac-mp3" || id === "flac-mp3" || id === "ogg-mp3" || id === "opus-mp3" || id === "wma-mp3") {
      return { commands:mp3Args(input, output, q.audio), mime:"audio/mpeg" };
    }

    if (id === "mp3-m4a") {
      return { commands:[["-i", input, "-vn", "-c:a", "aac", "-b:a", q.audio, "-movflags", "+faststart", output]], mime:"audio/mp4" };
    }

    if (id === "mp3-aac") {
      return { commands:[["-i", input, "-vn", "-c:a", "aac", "-b:a", q.audio, "-f", "adts", output]], mime:"audio/aac" };
    }

    if (id === "mp3-flac" || id === "wav-flac") {
      return { commands:[["-i", input, "-vn", "-c:a", "flac", output]], mime:"audio/flac" };
    }

    if (id === "mp3-ogg") {
      return {
        commands:[
          ["-i", input, "-vn", "-c:a", "libvorbis", "-q:a", opts.quality === "high" ? "7" : opts.quality === "fast" ? "3" : "5", output],
          ["-i", input, "-vn", "-c:a", "libopus", "-b:a", q.audio, output]
        ],
        mime:"audio/ogg"
      };
    }

    if (id === "flac-wav" || id === "m4a-wav" || id === "aac-wav") {
      return { commands:[["-i", input, "-vn", "-c:a", "pcm_s16le", "-ar", "44100", output]], mime:"audio/wav" };
    }

    throw new Error("현재 미디어 엔진에 등록되지 않은 변환입니다.");
  }

  async function deleteQuiet(ffmpeg, name) {
    try { await ffmpeg.deleteFile(name); } catch (e) {}
  }

  async function runPlans(ffmpeg, commands, output) {
    var lastError = null;

    for (var i = 0; i < commands.length; i += 1) {
      await deleteQuiet(ffmpeg, output);

      try {
        var code = await ffmpeg.exec(commands[i]);
        if (code === 0) return commands[i];
        lastError = new Error("FFmpeg 종료 코드 " + code);
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error("미디어 변환에 실패했습니다.");
  }

  function practicalLimit(category) {
    var mobile = w.matchMedia && w.matchMedia("(max-width:760px)").matches;
    if (category === "video") return mobile ? 120 * 1024 * 1024 : 300 * 1024 * 1024;
    return mobile ? 80 * 1024 * 1024 : 180 * 1024 * 1024;
  }

  function formatLimit(category) {
    var mobile = w.matchMedia && w.matchMedia("(max-width:760px)").matches;
    if (category === "video") return mobile ? "모바일 120MB" : "PC 300MB";
    return mobile ? "모바일 80MB" : "PC 180MB";
  }

  NS.media = {
    version: "1.0.0",

    open: function (x, ctx) {
      injectStyle();

      var selectedFile = null;
      var resultUrl = "";
      var running = false;
      var lastLog = [];
      var isVideo = x.category === "video";

      ctx.stage.innerHTML =
        '<div class="hm-fx-detail">' +
          '<div class="hm-fx-toolbar"><a class="hm-fx-back" href="' +
            ctx.route({ category:x.category }) +
            '" data-route>← ' + ctx.esc(ctx.cat(x.category).name) + '</a></div>' +
          ctx.titleBlock(x) +
          '<div class="hm-md-box">' +
            '<div class="hm-md-drop" data-md-drop>' +
              '<strong>' + ctx.esc(String(x.fromFormat || "")) + ' 파일을 선택하거나 끌어다 놓으세요</strong>' +
              '<span>' + ctx.esc(formatLimit(x.category)) + ' 이하를 권장합니다. 파일은 서버로 업로드하지 않습니다.</span>' +
              '<input type="file" hidden data-md-file accept="' + ctx.esc(x.accept || "") + '">' +
            '</div>' +
            '<div class="hm-md-file" data-md-fileinfo><strong data-md-name></strong><span data-md-meta></span></div>' +
            '<div class="hm-md-options">' +
              '<div class="hm-md-field"><label>변환 품질</label><select data-md-quality><option value="fast">빠르게</option><option value="balanced" selected>균형</option><option value="high">고화질</option></select></div>' +
              (isVideo
                ? '<div class="hm-md-field"><label>최대 가로 크기</label><select data-md-width><option value="0">원본 유지</option><option value="1280" selected>최대 1280px</option><option value="1920">최대 1920px</option><option value="854">최대 854px</option></select></div>'
                : '<div class="hm-md-field"><label>오디오 기준</label><select disabled><option>44.1kHz / 형식별 최적화</option></select></div>') +
              '<div class="hm-md-field"><label>처리 방식</label><select disabled><option>브라우저 FFmpeg · 단일 스레드</option></select></div>' +
            '</div>' +
            '<div class="hm-md-actions">' +
              '<button class="hm-md-btn primary" type="button" data-md-run disabled>변환 시작</button>' +
              '<button class="hm-md-btn danger" type="button" data-md-cancel hidden>변환 중지</button>' +
              '<button class="hm-md-btn" type="button" data-md-log-toggle>처리 로그</button>' +
            '</div>' +
            '<div class="hm-md-progress-wrap" data-md-progress-wrap>' +
              '<div class="hm-md-progress-track"><div class="hm-md-progress-bar" data-md-progress-bar></div></div>' +
              '<div class="hm-md-progress-text"><span data-md-progress-label>준비 중</span><span data-md-progress-percent>0%</span></div>' +
            '</div>' +
            '<div class="hm-md-status" data-md-status>첫 변환 때 FFmpeg 코어 약 32MB를 한 번 불러옵니다. 이후 같은 페이지에서는 다시 사용합니다.</div>' +
            '<div class="hm-md-log" data-md-log></div>' +
            '<div class="hm-md-result" data-md-result>' +
              '<strong data-md-result-name></strong><span data-md-result-meta></span>' +
              (isVideo || String(x.toFormat || "").toUpperCase() === "GIF"
                ? '<video class="hm-md-preview" controls playsinline data-md-video hidden></video><img class="hm-md-preview" alt="GIF 미리보기" data-md-image hidden>'
                : '<audio class="hm-md-preview" controls data-md-audio hidden></audio>') +
              '<a class="hm-md-download" href="#" data-md-download>변환 파일 다운로드</a>' +
            '</div>' +
            '<div class="hm-md-note">FFmpeg.wasm은 실제 FFmpeg를 WebAssembly로 실행하기 때문에 작은 파일은 편리하지만, 긴 영상이나 고해상도 영상은 PC용 FFmpeg보다 훨씬 느릴 수 있습니다. 변환 중에는 이 페이지를 닫지 마세요.</div>' +
            '<div class="hm-md-note">원본 내부 코덱이 매우 특수하거나 손상된 파일, DRM이 적용된 파일은 확장자가 맞아도 변환되지 않을 수 있습니다.</div>' +
            '<div class="hm-md-version">Media Engine v1.0.0 · ffmpeg.wasm</div>' +
          '</div>' +
        '</div>';

      var drop = ctx.stage.querySelector("[data-md-drop]");
      var input = ctx.stage.querySelector("[data-md-file]");
      var info = ctx.stage.querySelector("[data-md-fileinfo]");
      var nameEl = ctx.stage.querySelector("[data-md-name]");
      var metaEl = ctx.stage.querySelector("[data-md-meta]");
      var quality = ctx.stage.querySelector("[data-md-quality]");
      var width = ctx.stage.querySelector("[data-md-width]");
      var run = ctx.stage.querySelector("[data-md-run]");
      var cancel = ctx.stage.querySelector("[data-md-cancel]");
      var status = ctx.stage.querySelector("[data-md-status]");
      var progressWrap = ctx.stage.querySelector("[data-md-progress-wrap]");
      var progressBar = ctx.stage.querySelector("[data-md-progress-bar]");
      var progressLabel = ctx.stage.querySelector("[data-md-progress-label]");
      var progressPercent = ctx.stage.querySelector("[data-md-progress-percent]");
      var logToggle = ctx.stage.querySelector("[data-md-log-toggle]");
      var logBox = ctx.stage.querySelector("[data-md-log]");
      var result = ctx.stage.querySelector("[data-md-result]");
      var resultName = ctx.stage.querySelector("[data-md-result-name]");
      var resultMeta = ctx.stage.querySelector("[data-md-result-meta]");
      var download = ctx.stage.querySelector("[data-md-download]");
      var video = ctx.stage.querySelector("[data-md-video]");
      var image = ctx.stage.querySelector("[data-md-image]");
      var audio = ctx.stage.querySelector("[data-md-audio]");

      function clearResult() {
        result.classList.remove("is-show");
        if (resultUrl) {
          URL.revokeObjectURL(resultUrl);
          resultUrl = "";
        }
        [video, image, audio].forEach(function (el) {
          if (!el) return;
          el.hidden = true;
          try { el.removeAttribute("src"); } catch (e) {}
        });
      }

      function setProgress(p, label) {
        var value = Math.max(0, Math.min(1, Number(p) || 0));
        var pct = Math.round(value * 100);
        progressBar.style.width = pct + "%";
        progressPercent.textContent = pct + "%";
        if (label) progressLabel.textContent = label;
      }

      function pushLog(message) {
        message = String(message || "").trim();
        if (!message) return;
        lastLog.push(message);
        if (lastLog.length > 70) lastLog.shift();
        logBox.textContent = lastLog.join("\n");
        logBox.scrollTop = logBox.scrollHeight;
      }

      function choose(file) {
        clearResult();

        if (!file) return;
        var expected = expectedExt(x.fromFormat);
        if (extension(file.name) !== expected) {
          selectedFile = null;
          run.disabled = true;
          status.textContent = String(x.fromFormat || "") + " 파일을 선택해 주세요.";
          return;
        }

        var limit = practicalLimit(x.category);
        if (file.size > limit) {
          selectedFile = null;
          run.disabled = true;
          status.textContent = "현재 기기에서는 " + formatLimit(x.category) + " 이하 파일을 사용해 주세요.";
          return;
        }

        selectedFile = file;
        info.style.display = "block";
        nameEl.textContent = file.name;
        metaEl.textContent = niceBytes(file.size) + " · " + String(x.fromFormat || "") + " → " + String(x.toFormat || "");
        run.disabled = false;
        status.textContent = "준비되었습니다. 변환 시작을 눌러 주세요.";
      }

      drop.onclick = function () {
        if (!running) input.click();
      };

      drop.ondragover = function (e) {
        e.preventDefault();
        if (!running) drop.classList.add("is-drag");
      };

      drop.ondragleave = function () {
        drop.classList.remove("is-drag");
      };

      drop.ondrop = function (e) {
        e.preventDefault();
        drop.classList.remove("is-drag");
        if (!running && e.dataTransfer.files[0]) choose(e.dataTransfer.files[0]);
      };

      input.onchange = function () {
        if (input.files[0]) choose(input.files[0]);
        input.value = "";
      };

      logToggle.onclick = function () {
        logBox.classList.toggle("is-show");
      };

      cancel.onclick = function () {
        if (!running) return;
        status.textContent = "변환을 중지하고 엔진을 초기화하는 중입니다...";
        resetMediaState();
        running = false;
        run.disabled = !selectedFile;
        cancel.hidden = true;
        setProgress(0, "중지됨");
        status.textContent = "변환을 중지했습니다. 다시 시작하면 FFmpeg 코어를 다시 준비합니다.";
      };

      run.onclick = async function () {
        if (!selectedFile || running) return;

        clearResult();
        running = true;
        run.disabled = true;
        cancel.hidden = false;
        progressWrap.classList.add("is-show");
        setProgress(0.01, "엔진 준비");
        lastLog = [];
        logBox.textContent = "";

        var ffmpeg = null;
        var inputName = "input." + expectedExt(x.fromFormat);
        var outputName = "output." + expectedExt(x.toFormat);

        try {
          ffmpeg = await ensureFFmpeg(ctx, function (message) {
            status.textContent = message;
          });

          MEDIA.progressHandler = function (event) {
            var p = Number(event.progress);
            if (Number.isFinite(p)) setProgress(p, "변환 중");
          };

          MEDIA.logHandler = function (event) {
            pushLog(event.message || "");
          };

          setProgress(0.03, "파일 준비");
          status.textContent = "원본 파일을 브라우저 변환 영역으로 복사하는 중입니다...";

          await deleteQuiet(ffmpeg, inputName);
          await deleteQuiet(ffmpeg, outputName);
          await ffmpeg.writeFile(inputName, new Uint8Array(await selectedFile.arrayBuffer()));

          var opts = {
            quality: quality.value,
            maxWidth: width ? Number(width.value) || 0 : 0
          };

          var plan = buildPlan(x, inputName, outputName, opts);

          setProgress(0.05, "FFmpeg 변환");
          status.textContent = "미디어를 변환하고 있습니다. 파일 크기와 기기 성능에 따라 시간이 걸릴 수 있습니다.";

          var usedCommand = await runPlans(ffmpeg, plan.commands, outputName);
          pushLog("SUCCESS COMMAND: ffmpeg " + usedCommand.join(" "));

          setProgress(0.96, "결과 읽기");
          var data = await ffmpeg.readFile(outputName);
          var bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
          if (!bytes.byteLength) throw new Error("변환 결과가 비어 있습니다.");

          var blob = new Blob([bytes], { type:plan.mime || mediaMime(x.toFormat) });
          resultUrl = URL.createObjectURL(blob);

          var outFileName = safeBaseName(selectedFile.name) + "." + expectedExt(x.toFormat);
          resultName.textContent = outFileName;
          resultMeta.textContent = niceBytes(blob.size) + " · " + String(x.toFormat || "");

          download.href = resultUrl;
          download.download = outFileName;

          var to = String(x.toFormat || "").toUpperCase();
          if (to === "GIF" && image) {
            image.src = resultUrl;
            image.hidden = false;
          } else if (x.category === "video" && to !== "MP3" && video) {
            video.src = resultUrl;
            video.hidden = false;
          } else if (audio) {
            audio.src = resultUrl;
            audio.hidden = false;
          }

          result.classList.add("is-show");
          setProgress(1, "완료");
          status.textContent = "변환이 완료되었습니다. 미리보기 후 파일을 다운로드하세요.";
        } catch (error) {
          if (running) {
            setProgress(0, "오류");
            status.textContent = "변환 중 오류가 발생했습니다: " + (error.message || error);
            pushLog("ERROR: " + (error && error.stack ? error.stack : error));
          }
        } finally {
          if (ffmpeg && MEDIA.loaded) {
            await deleteQuiet(ffmpeg, inputName);
            await deleteQuiet(ffmpeg, outputName);
          }
          MEDIA.progressHandler = null;
          MEDIA.logHandler = null;

          if (running) {
            running = false;
            run.disabled = !selectedFile;
            cancel.hidden = true;
          }
        }
      };
    }
  };
})(window);
