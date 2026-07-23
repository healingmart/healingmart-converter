/*
 * HealingMart Converter Self Test v1.12.0
 * Target release: HealingMart Converter v3.39.0
 *
 * Purpose:
 * - Batch-check registry structure
 * - Verify 550 active / 2 server-required
 * - Verify engine file existence, exact SHA-256, JS syntax, and registration
 * - Verify active routing coverage
 * - Verify Blogger integration markers
 * - Compare embedded Blogger registry with deployed registry
 *
 * This test does NOT claim to re-run all 550 file conversions end-to-end.
 * It automates static and integration checks after deployment.
 */
(function (w, d) {
  "use strict";

  var CONFIG = {"selfTestVersion":"1.12.0","release":"3.39.0","registryVersion":"3.18.0","appVersion":"3.18.0","baseUrl":"https://healingmart.github.io/healingmart-converter","expected":{"total":552,"active":550,"coming":2,"comingIds":["epub-mobi","epub-azw3"],"newIds":["iso-kst-datetime","kst-datetime-iso","iso-rfc2822-date","rfc2822-iso-date","iso-http-date","http-date-iso","iso-date-only","date-compact","compact-date","date-korean","korean-date","date-weekday-ko","date-day-of-year","date-iso-week","date-quarter","date-month-start","date-month-end","date-lines-sort-asc","date-lines-sort-desc","seconds-hms","hms-seconds","milliseconds-hms","hms-milliseconds","seconds-iso-duration","iso-duration-seconds","timezone-offset-minutes","minutes-timezone-offset","json-toml","toml-json","jsonc-json"],"serverBackend":"Calibre ebook-convert","categoryCounts":{"pdf":{"total":17,"active":17,"coming":0},"document":{"total":16,"active":16,"coming":0},"image":{"total":44,"active":44,"coming":0},"video":{"total":16,"active":16,"coming":0},"audio":{"total":16,"active":16,"coming":0},"hwp":{"total":10,"active":10,"coming":0},"data":{"total":76,"active":76,"coming":0},"subtitle":{"total":10,"active":10,"coming":0},"ebook":{"total":12,"active":10,"coming":2},"archive":{"total":10,"active":10,"coming":0},"font":{"total":10,"active":10,"coming":0},"developer":{"total":290,"active":290,"coming":0},"color":{"total":12,"active":12,"coming":0},"other":{"total":13,"active":13,"coming":0},"unit":{"total":0,"active":0,"coming":0}},"stats":{"fileConverters":552,"unitConverters":228,"totalConverters":780}},"files":{"dist/data/hm-converter-registry.v2.js":"cdec3427dfb2e7679d8113b85bfa9836c3a250b83f13eb51c78f69782898a0c3","dist/js/hm-converter-app.v3.18.0.js":"2961d5353667cf9b678214f89bbb0618d660ed66f7b37e9164ff665e482504f9","dist/js/engines/hm-engine-archive.v1.1.0.js":"d3d5fa0b1ea6a1d2f27fac53d584cbe3c0e4392737d5b9ddbdd756341b658399","dist/js/engines/hm-engine-color.v1.0.0.js":"e55f93ad35ed3ff78098df9ef563886b5824002f79ed4644f76a3933bd733c70","dist/js/engines/hm-engine-data.v1.2.0.js":"971b4dbb7516f64556b405039f9fb166c237159510504bdc68ec63d12d198e38","dist/js/engines/hm-engine-document.v1.1.0.js":"f1fbe18821be52a193d9cfb074773060a3597ce7ed74e77696f4044281bf3198","dist/js/engines/hm-engine-ebook.v1.2.1.js":"dd2f8353aabe23cb5fbded006cfeb534c1c0649d3054d2f44551df901ed24433","dist/js/engines/hm-engine-font.v1.1.0.js":"1531f9b92bda78a2009b59f07700c9c11fc8a9529473735d1e404915b7818fde","dist/js/engines/hm-engine-hwpx.v1.2.0.js":"9f20609301fc8a93fc731a36f3253f742dbdd1b4b43f0205779d38fd8db4c779","dist/js/engines/hm-engine-image.v1.3.0.js":"dc728911856ad886b96e29c664e2dcc1d4aab675c1c63c2b895bf7b117e7ad7d","dist/js/engines/hm-engine-media.v1.0.0.js":"9a34989c6bd179fa14435201e6af82ccc633130a7f5a14e66065694b72a87930","dist/js/engines/hm-engine-office.v1.0.0.js":"977476322e4aa66425922dfa641c87fce62939071c56ed2ca770128e1ab057e9","dist/js/engines/hm-engine-pdf.v1.2.0.js":"5027362220c64c59884e171a8e88a9ac66b95749e457579eb742933c05c8116a","dist/js/engines/hm-engine-subtitle.v1.1.0.js":"378baba839d34217d078dceb1fae34f305691d056548e9f8f2d3ff599c273f2c"},"engines":{"archive":"dist/js/engines/hm-engine-archive.v1.1.0.js","color":"dist/js/engines/hm-engine-color.v1.0.0.js","data":"dist/js/engines/hm-engine-data.v1.2.0.js","document":"dist/js/engines/hm-engine-document.v1.1.0.js","ebook":"dist/js/engines/hm-engine-ebook.v1.2.1.js","font":"dist/js/engines/hm-engine-font.v1.1.0.js","hwp":"dist/js/engines/hm-engine-hwpx.v1.2.0.js","image":"dist/js/engines/hm-engine-image.v1.3.0.js","media":"dist/js/engines/hm-engine-media.v1.0.0.js","office":"dist/js/engines/hm-engine-office.v1.0.0.js","pdf":"dist/js/engines/hm-engine-pdf.v1.2.0.js","subtitle":"dist/js/engines/hm-engine-subtitle.v1.1.0.js"},"blogger":{"appId":"healingMartConverterApp","toolVersion":"3.39.0","representativeImageFragment":"ChatGPT%20Image%202026","adsenseClient":"ca-pub-8341470683891223","adsenseSlot":"5437512125","bottomBoundarySelector":"[data-hm-converter-bottom-boundary]","requiredCodeMarkers":["function jumpToApp(fixedTop)","setTimeout(run,120)","function repairRenderedEntities(root)","MutationObserver","y.status==='active'","if(x.engine==='office')return runConverterEngine('office',x);","if(x.category==='pdf')return runConverterEngine('pdf',x);","if(x.category==='video'||x.category==='audio')return runConverterEngine('media',x);","hm-engine-data.v1.2.0.js?v=3.39.0","hm-converter-registry.v2.js?v=3.39.0","if(e==='query-json')","if(e==='text-base32')","if(e==='text-urls-extract')","if(e==='decimal-binary-number')","if(e==='iso-kst-datetime')","if(e==='date-iso-week')","if(e==='seconds-iso-duration')","if(e==='json-toml')","if(e==='toml-json')","if(e==='jsonc-json')","body:has(#healingMartConverterApp) .tocify-wrap","body:has(#healingMartConverterApp) .tocify-inner","body:has(#healingMartConverterApp) .tocify-title"],"forbiddenStaleText":["HWP·Office·영상·오디오 변환은 정확성과 파일 보안을 확인한 뒤 순차적으로 열 예정입니다.","?v=3.35.0","?v=3.38.0"],"tocSelectors":["#toc",".toc","#auto-toc",".auto-toc",".post-toc",".toc-container",".table-of-contents","#toc-container","#toc_container",".tocify-wrap",".tocify-inner",".tocify-title"]},"engineVersions":{"archive":"1.1.0","color":"1.0.0","data":"1.2.0","document":"1.1.0","ebook":"1.2.1","font":"1.1.0","hwp":"1.2.0","image":"1.3.0","media":"1.0.0","office":"1.0.0","pdf":"1.2.0","subtitle":"1.1.0"}};
  var apiName = "HMConverterSelfTest";
  var old = w[apiName];

  if (old && old.version === CONFIG.selfTestVersion && typeof old.run === "function") {
    old.run();
    return;
  }

  var state = {
    results: [],
    startedAt: 0,
    finishedAt: 0,
    running: false,
    panel: null,
    shadow: null,
    progressLabel: null,
    progressBar: null,
    summary: null,
    list: null,
    fetched: {},
    deployedRegistry: null
  };

  function nowIso() {
    return new Date().toISOString();
  }

  function msSince(start) {
    return Math.max(0, Math.round(performance.now() - start));
  }

  function timeoutPromise(promise, ms, label) {
    var timer;
    return Promise.race([
      promise,
      new Promise(function (_, reject) {
        timer = setTimeout(function () {
          reject(new Error((label || "작업") + " 시간 초과 (" + ms + "ms)"));
        }, ms);
      })
    ]).finally(function () {
      clearTimeout(timer);
    });
  }

  function joinUrl(base, path) {
    return String(base || "").replace(/\/+$/, "") + "/" + String(path || "").replace(/^\/+/, "");
  }

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function canonical(value) {
    if (Array.isArray(value)) {
      return value.map(canonical);
    }
    if (value && typeof value === "object") {
      var out = {};
      Object.keys(value).sort().forEach(function (key) {
        out[key] = canonical(value[key]);
      });
      return out;
    }
    return value;
  }

  function sameJson(a, b) {
    try {
      return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
    } catch (e) {
      return false;
    }
  }

  function add(section, name, status, detail, data) {
    var row = {
      section: section,
      name: name,
      status: status,
      detail: String(detail || ""),
      data: data || null,
      time: nowIso()
    };
    state.results.push(row);
    renderResults();
    return row;
  }

  function pass(section, name, detail, data) {
    return add(section, name, "PASS", detail, data);
  }

  function fail(section, name, detail, data) {
    return add(section, name, "FAIL", detail, data);
  }

  function warn(section, name, detail, data) {
    return add(section, name, "WARN", detail, data);
  }

  function info(section, name, detail, data) {
    return add(section, name, "INFO", detail, data);
  }

  function setProgress(value, label) {
    value = Math.max(0, Math.min(1, Number(value) || 0));
    if (state.progressBar) state.progressBar.style.width = Math.round(value * 100) + "%";
    if (state.progressLabel) state.progressLabel.textContent = label || "";
  }

  function sha256Hex(buffer) {
    if (!(w.crypto && w.crypto.subtle)) {
      return Promise.reject(new Error("Web Crypto API를 사용할 수 없습니다."));
    }
    return w.crypto.subtle.digest("SHA-256", buffer).then(function (digest) {
      return Array.from(new Uint8Array(digest)).map(function (b) {
        return b.toString(16).padStart(2, "0");
      }).join("");
    });
  }

  async function fetchBuffer(path) {
    if (state.fetched[path]) return state.fetched[path];

    var url = joinUrl(CONFIG.baseUrl, path) + "?hm-self-test=" + Date.now();
    var response = await timeoutPromise(
      fetch(url, { cache: "no-store", mode: "cors" }),
      15000,
      path
    );

    if (!response.ok) {
      throw new Error("HTTP " + response.status + " " + response.statusText);
    }

    var buffer = await response.arrayBuffer();
    state.fetched[path] = {
      url: url,
      buffer: buffer,
      type: response.headers.get("content-type") || "",
      size: buffer.byteLength
    };
    return state.fetched[path];
  }

  function decodeUtf8(buffer) {
    return new TextDecoder("utf-8").decode(buffer);
  }

  function parseRegistrySource(source) {
    var marker = "w.HM_CONVERTER_PLATFORM=";
    var start = source.indexOf(marker);
    if (start < 0) throw new Error("Registry 시작 마커가 없습니다.");
    start += marker.length;

    var end = source.lastIndexOf(";})(window);");
    if (end < 0 || end <= start) throw new Error("Registry 종료 마커가 없습니다.");

    return JSON.parse(source.slice(start, end));
  }

  function routeTarget(x) {
    if (x.engine === "unit") return "inline-unit";
    if (x.status !== "active") return "coming";
    if (x.engine === "image" || x.engine === "heic-image") return "image";
    if (x.engine === "office") return "office";
    if (x.category === "pdf") return "pdf";
    if (x.category === "ebook") return "ebook";
    if (x.category === "hwp") return "hwp";
    if (x.category === "document") return "document";
    if (x.category === "data" || ["xlsx-csv","csv-xlsx","xlsx-tsv"].indexOf(x.engine) >= 0) return "data";
    if (x.category === "subtitle") return "subtitle";
    if (x.category === "archive") return "archive";
    if (x.category === "font") return "font";
    if (x.category === "video" || x.category === "audio") return "media";
    if (x.category === "developer") return "inline-developer";
    if (x.category === "color") return "color";
    if (x.category === "other") return "inline-other";
    return "coming";
  }

  function engineNameFromPath(path) {
    var m = String(path).match(/hm-engine-([^.]+)\.v/i);
    return m ? m[1] : "";
  }

  function createSandbox() {
    var iframe = d.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.position = "fixed";
    iframe.style.left = "-10000px";
    iframe.style.top = "-10000px";
    iframe.style.width = "1px";
    iframe.style.height = "1px";
    iframe.style.border = "0";
    d.body.appendChild(iframe);
    return iframe;
  }

  function loadScriptInSandbox(iframe, url) {
    return new Promise(function (resolve, reject) {
      var doc = iframe.contentDocument;
      var script = doc.createElement("script");
      script.async = true;
      script.src = url + (url.indexOf("?") >= 0 ? "&" : "?") + "hm-load=" + Date.now();
      script.onload = function () { resolve(); };
      script.onerror = function () { reject(new Error("script load 실패")); };
      doc.head.appendChild(script);
    });
  }

  function syntaxCompile(source) {
    try {
      // Compile only; do not execute.
      new Function(source);
      return { ok: true, detail: "브라우저 JavaScript parser 컴파일 PASS" };
    } catch (error) {
      if (/unsafe-eval|Content Security Policy|CSP/i.test(String(error && error.message || error))) {
        return { ok: null, detail: "CSP가 new Function 컴파일 검사를 차단했습니다. SHA-256/등록 검사는 계속합니다." };
      }
      return { ok: false, detail: String(error && error.message || error) };
    }
  }

  async function testReleaseFiles() {
    var section = "배포 파일";
    var entries = Object.keys(CONFIG.files);
    var sandbox = createSandbox();

    try {
      for (var i = 0; i < entries.length; i += 1) {
        var path = entries[i];
        var expectedHash = CONFIG.files[path];
        var baseProgress = 0.08 + (i / entries.length) * 0.34;
        setProgress(baseProgress, "배포 파일 확인 · " + path.split("/").pop());

        var fetched = null;
        try {
          fetched = await fetchBuffer(path);
          pass(section, path + " HTTP", fetched.size.toLocaleString() + " bytes · " + (fetched.type || "content-type 없음"));
        } catch (error) {
          fail(section, path + " HTTP", error.message || error);
        }

        if (fetched) {
          try {
            var actualHash = await sha256Hex(fetched.buffer);
            if (actualHash === expectedHash) {
              pass(section, path + " SHA-256", "검증된 v" + CONFIG.release + " 파일과 정확히 일치");
            } else {
              fail(section, path + " SHA-256", "불일치 · expected " + expectedHash + " · actual " + actualHash);
            }
          } catch (error2) {
            warn(section, path + " SHA-256", error2.message || error2);
          }

          if (/\.js$/i.test(path)) {
            var source = decodeUtf8(fetched.buffer);
            var compiled = syntaxCompile(source);
            if (compiled.ok === true) pass(section, path + " syntax", compiled.detail);
            else if (compiled.ok === null) warn(section, path + " syntax", compiled.detail);
            else fail(section, path + " syntax", compiled.detail);
          }
        }

        if (path.indexOf("/engines/") >= 0) {
          var key = Object.keys(CONFIG.engines).find(function (name) {
            return CONFIG.engines[name] === path;
          });

          if (key) {
            try {
              await timeoutPromise(
                loadScriptInSandbox(sandbox, joinUrl(CONFIG.baseUrl, path)),
                12000,
                key + " engine registration"
              );

              var engineObj =
                sandbox.contentWindow.HM_CONVERTER_ENGINES &&
                sandbox.contentWindow.HM_CONVERTER_ENGINES[key];

              if (engineObj && typeof engineObj.open === "function") {
                pass(section, key + " engine registration", "HM_CONVERTER_ENGINES." + key + ".open() 확인" + (engineObj.version ? " · v" + engineObj.version : ""));

                var expectedEngineVersion =
                  CONFIG.engineVersions && CONFIG.engineVersions[key];

                if (expectedEngineVersion) {
                  if (String(engineObj.version || "") === expectedEngineVersion) {
                    pass(section, key + " engine version", "내부 version " + expectedEngineVersion + " 일치");
                  } else {
                    fail(
                      section,
                      key + " engine version",
                      "expected " + expectedEngineVersion +
                      " / actual " + String(engineObj.version || "없음")
                    );
                  }
                }
              } else {
                fail(section, key + " engine registration", "스크립트는 로드됐지만 engine.open() 등록을 찾지 못했습니다.");
              }
            } catch (error3) {
              fail(section, key + " engine registration", error3.message || error3);
            }
          }
        }
      }
    } finally {
      sandbox.remove();
    }
  }

  async function testRegistry() {
    var section = "Registry";
    setProgress(0.44, "Registry 구조 검사");

    var deployed = null;

    try {
      var fetched = await fetchBuffer("dist/data/hm-converter-registry.v2.js");
      deployed = parseRegistrySource(decodeUtf8(fetched.buffer));
      state.deployedRegistry = deployed;
      pass(section, "외부 Registry 파싱", "version " + deployed.version);
    } catch (error) {
      fail(section, "외부 Registry 파싱", error.message || error);
      return;
    }

    var converters = Array.isArray(deployed.converters) ? deployed.converters : [];
    var categories = Array.isArray(deployed.categories) ? deployed.categories : [];

    if (deployed.version === CONFIG.registryVersion) pass(section, "Registry 버전", deployed.version);
    else fail(section, "Registry 버전", "expected " + CONFIG.registryVersion + " / actual " + deployed.version);

    var active = converters.filter(function (x) { return x.status === "active"; });
    var coming = converters.filter(function (x) { return x.status === "coming"; });

    converters.length === CONFIG.expected.total
      ? pass(section, "전체 변환기 수", converters.length + "개")
      : fail(section, "전체 변환기 수", "expected " + CONFIG.expected.total + " / actual " + converters.length);

    active.length === CONFIG.expected.active
      ? pass(section, "active 수", active.length + "개")
      : fail(section, "active 수", "expected " + CONFIG.expected.active + " / actual " + active.length);

    coming.length === CONFIG.expected.coming
      ? pass(section, "coming 수", coming.length + "개")
      : fail(section, "coming 수", "expected " + CONFIG.expected.coming + " / actual " + coming.length);

    sameJson(deployed.stats || {}, CONFIG.expected.stats || {})
      ? pass(section, "Registry stats", JSON.stringify(deployed.stats))
      : fail(section, "Registry stats", "expected " + JSON.stringify(CONFIG.expected.stats || {}) + " / actual " + JSON.stringify(deployed.stats || {}));

    var ids = converters.map(function (x) { return x.id; });
    var dup = ids.filter(function (id, idx) { return ids.indexOf(id) !== idx; });
    dup.length
      ? fail(section, "중복 ID", Array.from(new Set(dup)).join(", "))
      : pass(section, "중복 ID", "없음");

    var catSet = new Set(categories.map(function (c) { return c.id; }));
    var badCats = converters.filter(function (x) { return !catSet.has(x.category); }).map(function (x) { return x.id; });
    badCats.length
      ? fail(section, "잘못된 카테고리 참조", badCats.join(", "))
      : pass(section, "잘못된 카테고리 참조", "없음");

    var badStatus = converters.filter(function (x) {
      return x.status !== "active" && x.status !== "coming";
    }).map(function (x) { return x.id + ":" + x.status; });
    badStatus.length
      ? fail(section, "알 수 없는 status", badStatus.join(", "))
      : pass(section, "알 수 없는 status", "없음");

    var requiredFields = ["id","category","fromFormat","toFormat","status"];
    var missing = [];
    converters.forEach(function (x) {
      requiredFields.forEach(function (f) {
        if (x[f] == null || String(x[f]).trim() === "") missing.push(x.id + "." + f);
      });
    });
    missing.length
      ? fail(section, "필수 필드", missing.slice(0, 30).join(", ") + (missing.length > 30 ? " 외 " + (missing.length - 30) + "건" : ""))
      : pass(section, "필수 필드", "모든 변환기 필수 필드 확인");

    var comingIds = coming.map(function (x) { return x.id; }).sort();
    var expectedComing = CONFIG.expected.comingIds.slice().sort();
    sameJson(comingIds, expectedComing)
      ? pass(section, "마지막 준비 중 ID", comingIds.join(", "))
      : fail(section, "마지막 준비 중 ID", "expected " + expectedComing.join(", ") + " / actual " + comingIds.join(", "));

    var serverBad = coming.filter(function (x) {
      return x.serverRequired !== true || x.recommendedBackend !== CONFIG.expected.serverBackend;
    });
    serverBad.length
      ? fail(section, "서버형 플래그", serverBad.map(function (x) { return x.id; }).join(", "))
      : pass(section, "서버형 플래그", "2개 모두 serverRequired=true · " + CONFIG.expected.serverBackend);

    var missingNewIds = (CONFIG.expected.newIds || []).filter(function (id) {
      return ids.indexOf(id) < 0;
    });
    missingNewIds.length
      ? fail(section, "신규 30개 등록", missingNewIds.join(", "))
      : pass(section, "신규 30개 등록", (CONFIG.expected.newIds || []).length + "개 ID 모두 확인");

    var activeRouteFailures = active.filter(function (x) {
      return routeTarget(x) === "coming";
    });
    activeRouteFailures.length
      ? fail(section, "active 라우팅 누락", activeRouteFailures.map(function (x) { return x.id; }).join(", "))
      : pass(section, "active 라우팅 누락", active.length + "개 모두 detail() 대상 확인");

    var external = new Set(Object.keys(CONFIG.engines));
    var missingEngineRoute = active.filter(function (x) {
      var target = routeTarget(x);
      return external.has(target) && !CONFIG.engines[target];
    });
    missingEngineRoute.length
      ? fail(section, "외부 엔진 매핑", missingEngineRoute.map(function (x) { return x.id; }).join(", "))
      : pass(section, "외부 엔진 매핑", "모든 외부 엔진 라우팅 매핑 확인");

    Object.keys(CONFIG.expected.categoryCounts).forEach(function (cid) {
      var expected = CONFIG.expected.categoryCounts[cid];
      var rows = converters.filter(function (x) { return x.category === cid; });
      var actual = {
        total: rows.length,
        active: rows.filter(function (x) { return x.status === "active"; }).length,
        coming: rows.filter(function (x) { return x.status === "coming"; }).length
      };

      if (sameJson(actual, expected)) {
        pass(section, "카테고리 " + cid, actual.active + "/" + actual.total + " active" + (actual.coming ? " · " + actual.coming + " coming" : ""));
      } else {
        fail(section, "카테고리 " + cid, "expected " + JSON.stringify(expected) + " / actual " + JSON.stringify(actual));
      }
    });

    var embedded = w.HM_CONVERTER_PLATFORM;
    if (embedded) {
      sameJson(embedded, deployed)
        ? pass(section, "Blogger 내장 Registry 일치", "GitHub Registry와 완전히 동일")
        : fail(section, "Blogger 내장 Registry 일치", "현재 페이지 내장 Registry와 GitHub Registry가 다릅니다.");
    } else {
      warn(section, "Blogger 내장 Registry 일치", "window.HM_CONVERTER_PLATFORM을 찾지 못했습니다. Converter 페이지에서 실행했는지 확인하세요.");
    }
  }

  function getPageScriptText() {
    return Array.from(d.scripts || []).map(function (s) {
      return s.textContent || "";
    }).join("\n");
  }

  async function testBloggerPage() {
    var section = "Blogger 통합";
    setProgress(0.66, "Blogger 통합 검사");

    var app = d.getElementById(CONFIG.blogger.appId);
    if (app) {
      pass(section, "Converter App", "#" + CONFIG.blogger.appId + " 존재");
      var toolVersion = app.getAttribute("data-tool-version") || "";
      toolVersion === CONFIG.blogger.toolVersion
        ? pass(section, "Blogger Tool Version", toolVersion)
        : fail(section, "Blogger Tool Version", "expected " + CONFIG.blogger.toolVersion + " / actual " + (toolVersion || "없음"));
    } else {
      fail(section, "Converter App", "#" + CONFIG.blogger.appId + "를 찾지 못했습니다.");
    }

    var domHtml = d.documentElement ? d.documentElement.outerHTML : "";

    domHtml.indexOf(CONFIG.blogger.representativeImageFragment) >= 0
      ? pass(section, "대표 이미지", "대표 이미지 URL 포함")
      : fail(section, "대표 이미지", "대표 이미지 URL을 찾지 못했습니다.");

    domHtml.indexOf(CONFIG.blogger.adsenseClient) >= 0 &&
    domHtml.indexOf(CONFIG.blogger.adsenseSlot) >= 0
      ? pass(section, "AdSense", "client + slot 확인")
      : fail(section, "AdSense", "client 또는 slot 누락");

    d.querySelector(CONFIG.blogger.bottomBoundarySelector)
      ? pass(section, "Bottom Boundary", CONFIG.blogger.bottomBoundarySelector + " 존재")
      : fail(section, "Bottom Boundary", "하단 경계 마커 누락");

    var tocSelectorText = (CONFIG.blogger.tocSelectors || []).join(",");
    var tocNodes = tocSelectorText
      ? Array.from(d.querySelectorAll(tocSelectorText))
      : [];

    var visibleTocNodes = tocNodes.filter(function (node) {
      if (!node || node.closest("#" + CONFIG.blogger.appId)) return false;
      var style = w.getComputedStyle(node);
      var rect = node.getBoundingClientRect();
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity || 1) !== 0 &&
        rect.width > 0 &&
        rect.height > 0
      );
    });

    visibleTocNodes.length === 0
      ? pass(
          section,
          "자동목차 비표시",
          tocNodes.length
            ? "TOC 요소 " + tocNodes.length + "개가 존재하지만 모두 숨김 처리됨"
            : "표시 가능한 TOC 요소 없음"
        )
      : fail(
          section,
          "자동목차 비표시",
          "화면에 보이는 TOC 요소 " + visibleTocNodes.length + "개 발견: " +
          visibleTocNodes.slice(0, 5).map(function (node) {
            return node.id
              ? "#" + node.id
              : "." + String(node.className || "").trim().replace(/\s+/g, ".");
          }).join(", ")
        );

    /*
     * 중요:
     * Blogger/테마/최적화 스크립트는 실행 후 inline <script> 노드를 제거하거나
     * textContent를 비우는 경우가 있다.
     * v1.0.0은 document.scripts[].textContent만 검사해서 실제 코드가 정상인데도
     * Blogger 코드 마커와 ENGINE_FILES를 FAIL로 오판할 수 있었다.
     *
     * v1.0.1은 현재 페이지 원본 HTML을 same-origin fetch로 다시 받아 검사한다.
     */
    var sourceHtml = "";
    try {
      var sourceUrl = location.href.split("#")[0];
      var response = await timeoutPromise(
        fetch(sourceUrl + (sourceUrl.indexOf("?") >= 0 ? "&" : "?") + "hm-source-test=" + Date.now(), {
          cache: "no-store",
          credentials: "same-origin"
        }),
        15000,
        "Blogger 원본 HTML"
      );

      if (!response.ok) throw new Error("HTTP " + response.status + " " + response.statusText);

      sourceHtml = await response.text();
      sourceHtml
        ? pass(section, "Blogger 원본 HTML", sourceHtml.length.toLocaleString() + " chars · same-origin fetch PASS")
        : fail(section, "Blogger 원본 HTML", "응답은 성공했지만 HTML이 비어 있습니다.");
    } catch (error) {
      warn(section, "Blogger 원본 HTML", "원본 HTML 재조회 실패 · DOM 기반 검사로 대체: " + (error.message || error));
      sourceHtml = domHtml;
    }

    // Blogger가 HTML 엔티티로 변환한 경우도 검색할 수 있도록 완화된 소스 생성
    var normalizedSource = String(sourceHtml || "")
      .replace(/&#39;|&apos;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&");

    CONFIG.blogger.requiredCodeMarkers.forEach(function (marker) {
      normalizedSource.indexOf(marker) >= 0
        ? pass(section, "코드 마커", marker)
        : fail(section, "코드 마커", "원본 HTML에서도 누락: " + marker);
    });

    CONFIG.blogger.forbiddenStaleText.forEach(function (staleText) {
      normalizedSource.indexOf(staleText) < 0
        ? pass(section, "오래된 안내 제거", "stale text 없음")
        : fail(section, "오래된 안내 제거", "예전 준비 중 문구가 남아 있습니다.");
    });

    Object.keys(CONFIG.engines).forEach(function (key) {
      var relPath = CONFIG.engines[key];
      var expectedWithVersion = relPath + "?v=" + CONFIG.release;
      var expectedNoLeadingSlash = expectedWithVersion.replace(/^\/+/, "");

      (
        normalizedSource.indexOf(expectedWithVersion) >= 0 ||
        normalizedSource.indexOf(expectedNoLeadingSlash) >= 0
      )
        ? pass(section, "ENGINE_FILES " + key, expectedWithVersion)
        : fail(section, "ENGINE_FILES " + key, "현재 Blogger 원본 코드에서 " + expectedWithVersion + "를 찾지 못했습니다.");
    });

    // 런타임 Registry는 이미 별도 Registry 검사에서 GitHub와 완전 비교한다.
    // 이 항목은 raw source 검사의 정상 작동 자체를 확인한다.
    normalizedSource.indexOf("HM_CONVERTER_PLATFORM") >= 0
      ? pass(section, "원본 Registry 코드", "HM_CONVERTER_PLATFORM 마커 확인")
      : warn(section, "원본 Registry 코드", "원본 HTML에서 Registry 마커를 직접 찾지 못했습니다. 런타임 Registry 비교 결과를 우선하세요.");

    if (/healing-mart\.com$/i.test(location.hostname) || /(^|\.)healing-mart\.com$/i.test(location.hostname)) {
      pass(section, "실행 위치", location.hostname);
    } else {
      warn(section, "실행 위치", "현재 호스트는 " + location.hostname + " 입니다. HealingMart Converter 실제 페이지에서 실행하면 Blogger 통합 검사가 가장 정확합니다.");
    }
  }

  function testBrowserFeatures() {
    var section = "브라우저 환경";
    setProgress(0.76, "브라우저 기능 검사");

    "fetch" in w ? pass(section, "Fetch API", "지원") : fail(section, "Fetch API", "미지원");
    w.crypto && w.crypto.subtle ? pass(section, "Web Crypto", "SHA-256 사용 가능") : warn(section, "Web Crypto", "미지원 · hash 검사가 제한됩니다.");
    "WebAssembly" in w ? pass(section, "WebAssembly", "지원") : fail(section, "WebAssembly", "미지원");
    "TextDecoder" in w ? pass(section, "TextDecoder", "지원") : fail(section, "TextDecoder", "미지원");
    "DOMParser" in w ? pass(section, "DOMParser", "지원") : fail(section, "DOMParser", "미지원");
    "URL" in w && typeof URL.createObjectURL === "function"
      ? pass(section, "Blob URL", "지원")
      : fail(section, "Blob URL", "미지원");
    "Worker" in w ? pass(section, "Web Worker", "지원") : warn(section, "Web Worker", "미지원");
    d.createElement("canvas").getContext
      ? pass(section, "Canvas", "지원")
      : fail(section, "Canvas", "미지원");

    var mobile = w.matchMedia && w.matchMedia("(max-width:760px)").matches;
    info(section, "화면 모드", mobile ? "모바일 폭" : "PC/태블릿 폭");
    info(section, "User Agent", navigator.userAgent);
  }

  function buildTextReport() {
    var counts = countStatuses();
    var lines = [
      "HealingMart Converter Self Test v" + CONFIG.selfTestVersion,
      "Target Converter v" + CONFIG.release,
      "Run: " + new Date(state.startedAt).toISOString(),
      "Location: " + location.href,
      "",
      "SUMMARY",
      "PASS: " + counts.PASS,
      "FAIL: " + counts.FAIL,
      "WARN: " + counts.WARN,
      "INFO: " + counts.INFO,
      ""
    ];

    var sections = Array.from(new Set(state.results.map(function (r) { return r.section; })));
    sections.forEach(function (section) {
      lines.push("[" + section + "]");
      state.results.filter(function (r) { return r.section === section; }).forEach(function (r) {
        lines.push(r.status + " | " + r.name + " | " + r.detail);
      });
      lines.push("");
    });

    lines.push(
      "NOTE",
      "이 테스트는 Registry/라우팅/배포 파일 무결성/엔진 등록/Blogger 원본 HTML 통합을 한꺼번에 검사합니다.",
      "220개 변환 조합에 실제 사용자 파일을 넣어 모두 변환하는 E2E 테스트를 대체하지는 않습니다."
    );

    return lines.join("\n");
  }

  function countStatuses() {
    var counts = { PASS:0, FAIL:0, WARN:0, INFO:0 };
    state.results.forEach(function (r) {
      if (counts[r.status] == null) counts[r.status] = 0;
      counts[r.status] += 1;
    });
    return counts;
  }

  function download(name, content, type) {
    var blob = new Blob([content], { type:type || "text/plain;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = d.createElement("a");
    a.href = url;
    a.download = name;
    d.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 30000);
  }

  function downloadTxt() {
    download(
      "HealingMart_Converter_Self_Test_v" + CONFIG.release + ".txt",
      "\ufeff" + buildTextReport(),
      "text/plain;charset=utf-8"
    );
  }

  function downloadJson() {
    var payload = {
      selfTestVersion: CONFIG.selfTestVersion,
      targetRelease: CONFIG.release,
      location: location.href,
      startedAt: new Date(state.startedAt).toISOString(),
      finishedAt: state.finishedAt ? new Date(state.finishedAt).toISOString() : null,
      summary: countStatuses(),
      results: state.results
    };
    download(
      "HealingMart_Converter_Self_Test_v" + CONFIG.release + ".json",
      JSON.stringify(payload, null, 2),
      "application/json;charset=utf-8"
    );
  }

  async function copyReport() {
    var text = buildTextReport();
    try {
      await navigator.clipboard.writeText(text);
      info("테스트 도구", "결과 복사", "클립보드에 복사했습니다.");
    } catch (e) {
      warn("테스트 도구", "결과 복사", "자동 복사 실패 · TXT 저장을 사용하세요.");
    }
  }

  function statusClass(status) {
    return "hmst-" + String(status || "").toLowerCase();
  }

  function renderResults() {
    if (!state.list || !state.summary) return;

    var counts = countStatuses();
    state.summary.innerHTML =
      '<span class="hmst-pass">PASS ' + counts.PASS + '</span>' +
      '<span class="hmst-fail">FAIL ' + counts.FAIL + '</span>' +
      '<span class="hmst-warn">WARN ' + counts.WARN + '</span>' +
      '<span class="hmst-info">INFO ' + counts.INFO + '</span>';

    var sections = Array.from(new Set(state.results.map(function (r) { return r.section; })));

    state.list.innerHTML = sections.map(function (section) {
      var rows = state.results.filter(function (r) { return r.section === section; });
      var failures = rows.filter(function (r) { return r.status === "FAIL"; }).length;
      var warnings = rows.filter(function (r) { return r.status === "WARN"; }).length;

      return (
        '<section class="hmst-section">' +
          '<div class="hmst-section-title">' +
            '<strong>' + esc(section) + '</strong>' +
            '<span>' + rows.length + '건' +
              (failures ? ' · FAIL ' + failures : '') +
              (warnings ? ' · WARN ' + warnings : '') +
            '</span>' +
          '</div>' +
          rows.map(function (r) {
            return (
              '<div class="hmst-row">' +
                '<span class="hmst-badge ' + statusClass(r.status) + '">' + esc(r.status) + '</span>' +
                '<div class="hmst-row-body">' +
                  '<strong>' + esc(r.name) + '</strong>' +
                  '<p>' + esc(r.detail) + '</p>' +
                '</div>' +
              '</div>'
            );
          }).join("") +
        '</section>'
      );
    }).join("");
  }

  function ensurePanel() {
    if (state.panel && state.panel.isConnected) return;

    var host = d.createElement("div");
    host.id = "hm-converter-self-test-host";
    host.style.position = "fixed";
    host.style.zIndex = "2147483647";
    host.style.inset = "0";
    host.style.pointerEvents = "none";
    d.documentElement.appendChild(host);

    var shadow = host.attachShadow({ mode:"open" });

    shadow.innerHTML = `
      <style>
        *{box-sizing:border-box}
        .hmst-panel{
          pointer-events:auto;position:fixed;top:12px;right:12px;width:min(620px,calc(100vw - 24px));
          max-height:calc(100vh - 24px);display:flex;flex-direction:column;background:#fff;color:#172033;
          border:1px solid #dce5ee;border-radius:18px;box-shadow:0 22px 70px rgba(15,23,42,.24);
          overflow:hidden;font-family:Pretendard,"Noto Sans KR","Malgun Gothic",system-ui,sans-serif
        }
        .hmst-head{padding:15px 16px 12px;background:linear-gradient(135deg,#eef8ff,#f7fbff);border-bottom:1px solid #e2eaf2}
        .hmst-headline{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
        .hmst-head h2{margin:0;font-size:18px;font-weight:950;letter-spacing:-.02em}
        .hmst-head p{margin:4px 0 0;color:#627188;font-size:12px;line-height:1.5}
        .hmst-close{width:34px;height:34px;border:1px solid #d8e1ea;border-radius:10px;background:#fff;font-size:18px;cursor:pointer}
        .hmst-progress{height:8px;margin-top:12px;background:#dde7f1;border-radius:999px;overflow:hidden}
        .hmst-progress>i{display:block;width:0;height:100%;background:linear-gradient(90deg,#4f7df1,#25a8e0);transition:width .18s ease}
        .hmst-progress-label{margin-top:7px;color:#52667d;font-size:11px;font-weight:800}
        .hmst-summary{display:flex;gap:7px;flex-wrap:wrap;padding:10px 16px;border-bottom:1px solid #edf1f5;background:#fff}
        .hmst-summary span,.hmst-badge{display:inline-flex;align-items:center;justify-content:center;border-radius:999px;font-size:10px;font-weight:950}
        .hmst-summary span{padding:6px 9px}
        .hmst-pass{color:#08775d;background:#eaf9f4}
        .hmst-fail{color:#b3261e;background:#fff0ef}
        .hmst-warn{color:#9b6100;background:#fff7df}
        .hmst-info{color:#355d8a;background:#eef6ff}
        .hmst-actions{display:flex;gap:7px;flex-wrap:wrap;padding:10px 16px;border-bottom:1px solid #edf1f5}
        .hmst-actions button{min-height:36px;padding:0 11px;border:1px solid #d7e1ea;border-radius:9px;background:#fff;color:#26384e;font-size:11px;font-weight:900;cursor:pointer}
        .hmst-actions button.primary{color:#fff;border-color:#3d74e5;background:#3d74e5}
        .hmst-list{overflow:auto;padding:10px 12px 18px;background:#f6f9fc}
        .hmst-section{margin:0 0 10px;padding:11px;background:#fff;border:1px solid #e1e8ef;border-radius:12px}
        .hmst-section-title{display:flex;justify-content:space-between;gap:12px;padding:0 2px 8px;border-bottom:1px solid #edf1f5}
        .hmst-section-title strong{font-size:13px;font-weight:950}
        .hmst-section-title span{color:#77869a;font-size:10px;font-weight:800}
        .hmst-row{display:grid;grid-template-columns:52px minmax(0,1fr);gap:9px;padding:9px 2px;border-bottom:1px dashed #e9eef3}
        .hmst-row:last-child{border-bottom:0}
        .hmst-badge{height:23px;padding:0 6px;margin-top:1px}
        .hmst-row-body strong{display:block;font-size:11px;font-weight:900;line-height:1.45;word-break:break-word}
        .hmst-row-body p{margin:3px 0 0;color:#68778b;font-size:10px;line-height:1.55;word-break:break-word}
        @media(max-width:760px){
          .hmst-panel{top:5px;right:5px;width:calc(100vw - 10px);max-height:calc(100vh - 10px);border-radius:14px}
          .hmst-head{padding:12px}
          .hmst-summary,.hmst-actions{padding:8px 12px}
          .hmst-list{padding:8px}
          .hmst-row{grid-template-columns:48px minmax(0,1fr)}
        }
      </style>
      <aside class="hmst-panel">
        <div class="hmst-head">
          <div class="hmst-headline">
            <div>
              <h2>HealingMart Converter 통합 테스트</h2>
              <p>Self Test v${CONFIG.selfTestVersion} · Converter v${CONFIG.release}</p>
            </div>
            <button class="hmst-close" type="button" aria-label="닫기">×</button>
          </div>
          <div class="hmst-progress"><i></i></div>
          <div class="hmst-progress-label">대기 중</div>
        </div>
        <div class="hmst-summary"></div>
        <div class="hmst-actions">
          <button class="primary" type="button" data-action="rerun">전체 재검사</button>
          <button type="button" data-action="copy">결과 복사</button>
          <button type="button" data-action="txt">TXT 저장</button>
          <button type="button" data-action="json">JSON 저장</button>
        </div>
        <div class="hmst-list"></div>
      </aside>
    `;

    state.panel = host;
    state.shadow = shadow;
    state.progressBar = shadow.querySelector(".hmst-progress>i");
    state.progressLabel = shadow.querySelector(".hmst-progress-label");
    state.summary = shadow.querySelector(".hmst-summary");
    state.list = shadow.querySelector(".hmst-list");

    shadow.querySelector(".hmst-close").onclick = function () {
      host.remove();
    };
    shadow.querySelector('[data-action="rerun"]').onclick = function () {
      run();
    };
    shadow.querySelector('[data-action="copy"]').onclick = copyReport;
    shadow.querySelector('[data-action="txt"]').onclick = downloadTxt;
    shadow.querySelector('[data-action="json"]').onclick = downloadJson;
  }

  async function run() {
    if (state.running) return;

    ensurePanel();

    state.running = true;
    state.results = [];
    state.fetched = {};
    state.deployedRegistry = null;
    state.startedAt = Date.now();
    state.finishedAt = 0;

    renderResults();
    setProgress(0.01, "통합 테스트 시작");

    var t0 = performance.now();

    try {
      info("테스트 도구", "대상 릴리스", "Converter v" + CONFIG.release + " · Registry v" + CONFIG.registryVersion);
      info("테스트 도구", "배포 기준", CONFIG.baseUrl);

      testBrowserFeatures();

      await testReleaseFiles();
      await testRegistry();
      await testBloggerPage();

      var counts = countStatuses();
      state.finishedAt = Date.now();

      if (counts.FAIL === 0) {
        setProgress(1, "완료 · FAIL 0 · " + msSince(t0) + "ms");
      } else {
        setProgress(1, "완료 · FAIL " + counts.FAIL + " · " + msSince(t0) + "ms");
      }

      info(
        "테스트 도구",
        "검사 범위 안내",
        "정적/통합 검사를 자동화한 테스트입니다. 550개 변환기에 실제 파일을 넣는 전수 E2E 변환 테스트는 별도입니다."
      );
    } catch (error) {
      fail("테스트 도구", "테스트 실행 오류", error && error.stack ? error.stack : error);
      setProgress(1, "테스트 실행 중 오류");
    } finally {
      state.running = false;
      renderResults();
    }

    return {
      config: CONFIG,
      summary: countStatuses(),
      results: state.results.slice()
    };
  }

  w[apiName] = {
    version: CONFIG.selfTestVersion,
    config: CONFIG,
    run: run,
    getResults: function () { return state.results.slice(); },
    getTextReport: buildTextReport,
    downloadTxt: downloadTxt,
    downloadJson: downloadJson
  };

  if (d.readyState === "loading") {
    d.addEventListener("DOMContentLoaded", function () {
      setTimeout(run, 0);
    }, { once:true });
  } else {
    setTimeout(run, 0);
  }
})(window, document);
