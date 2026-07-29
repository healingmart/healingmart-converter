/* HealingMart Converter Browser Self-Test v1.28.0 */
(function (w, d) {
  "use strict";

  var EXPECTED = {
    release: "3.55.1",
    app: "3.34.1",
    registry: "3.33.0",
    catalog: "1.1.0"
  };
  var current = d.currentScript;
  var base = current && current.src ? current.src.replace(/\/test\/[^/?#]+(?:[?#].*)?$/, "") : "";

  function load(src, globalName) {
    if (globalName && w[globalName]) return Promise.resolve(w[globalName]);
    return new Promise(function (resolve, reject) {
      var script = d.createElement("script");
      script.async = true;
      script.src = base + "/" + src + "?selftest=" + Date.now();
      script.onload = function () {
        if (globalName && !w[globalName]) reject(new Error(globalName + " 미등록"));
        else resolve(globalName ? w[globalName] : true);
      };
      script.onerror = function () { reject(new Error(src + " 로딩 실패")); };
      d.head.appendChild(script);
    });
  }

  function equalIds(a, b) {
    if (a.length !== b.length) return false;
    var set = new Set(b);
    return a.every(function (id) { return set.has(id); });
  }

  function run() {
    var rows = [];
    var pass = 0;
    var fail = 0;
    function check(name, ok, detail) {
      rows.push({ result: ok ? "PASS" : "FAIL", test: name, detail: detail == null ? "" : String(detail) });
      if (ok) pass += 1; else fail += 1;
    }

    return Promise.all([
      load("dist/data/hm-converter-registry.v2.js", "HM_CONVERTER_PLATFORM"),
      load("dist/data/hm-unit-registry.v1.js", "HM_UNIT_CONVERTER_DATA"),
      load("dist/data/hm-converters-data.v1.js", "HM_CONVERTERS_DATA"),
      load("dist/data/hm-converter-search-index.v1.js", "HM_CONVERTER_SEARCH_INDEX"),
      load("dist/data/hm-converter-routes.v1.js", "HM_CONVERTER_ROUTES"),
      load("dist/catalog/hm-converter-public-manifest.v1.js", "HM_CONVERTER_PUBLIC_MANIFEST"),
      load("dist/js/hm-converter-search-client.v1.js", "HM_CONVERTER_SEARCH"),
      load("dist/js/hm-converter-validator.v1.js", "HM_CONVERTER_VALIDATOR")
    ]).then(function () {
      var platform = w.HM_CONVERTER_PLATFORM;
      var units = w.HM_UNIT_CONVERTER_DATA;
      var data = w.HM_CONVERTERS_DATA;
      var index = w.HM_CONVERTER_SEARCH_INDEX;
      var routes = w.HM_CONVERTER_ROUTES;
      var manifest = w.HM_CONVERTER_PUBLIC_MANIFEST;
      var search = w.HM_CONVERTER_SEARCH;
      var ids = data.items.map(function (item) { return item.id; });
      var indexIds = index.items.map(function (item) { return item.i; });
      var routeIds = Object.keys(routes.items);
      var sourceTotal = platform.converters.length + units.converters.length;
      var published = data.items.filter(function (item) { return item.status === "published"; }).length;
      var coming = data.items.filter(function (item) { return item.status !== "published"; }).length;
      var hidden = data.items.filter(function (item) { return item.searchVisible === false; }).length;
      var newItems = data.items.filter(function (item) { return item.isNew; }).length;
      var publicCount = data.items.filter(function (item) {
        return item.status === "published" && item.searchVisible !== false;
      }).length;
      var validation = w.HM_CONVERTER_VALIDATOR.validate(data, index, routes);

      check("Release", data.release === EXPECTED.release, data.release);
      check("App", w.HM_CONVERTER_APP_API && w.HM_CONVERTER_APP_API.version === EXPECTED.app,
        w.HM_CONVERTER_APP_API && w.HM_CONVERTER_APP_API.version);
      check("Registry", platform && platform.version === EXPECTED.registry, platform && platform.version);
      check("Catalog", data.version === EXPECTED.catalog, data.version);

      check("원본 레지스트리 합계와 통합 데이터 개수 일치", data.items.length === sourceTotal,
        sourceTotal + "/" + data.items.length);
      check("통합 데이터와 검색 인덱스 개수 일치", index.items.length === data.items.length,
        data.items.length + "/" + index.items.length);
      check("통합 데이터와 주소 맵 개수 일치", routeIds.length === data.items.length,
        data.items.length + "/" + routeIds.length);
      check("통합 데이터와 공개 매니페스트 등록 개수 일치", manifest.registeredCount === data.items.length,
        data.items.length + "/" + manifest.registeredCount);

      check("공개 개수 일치", data.stats.published === published && manifest.publishedCount === published, published);
      check("준비 중 개수 일치", data.stats.coming === coming && manifest.comingCount === coming, coming);
      check("플랫폼 원본 개수 일치", data.stats.platform === platform.converters.length, data.stats.platform);
      check("단위 원본 개수 일치", data.stats.unit === units.converters.length, data.stats.unit);
      check("검색 숨김 개수 일치", data.stats.searchHidden === hidden && manifest.searchHiddenCount === hidden, hidden);
      check("신규 메타 개수 일치", data.stats.newItems === newItems, newItems);
      check("공개 검색 개수 일치",
        data.stats.publishedSearchVisible === publicCount &&
        manifest.publishedSearchVisibleCount === publicCount &&
        search.publicItems().length === publicCount,
        publicCount);

      check("데이터/검색 ID 일치", equalIds(ids, indexIds));
      check("데이터/주소 ID 일치", equalIds(ids, routeIds));
      check("canonical 중복 없음", new Set(ids).size === ids.length);
      check("canonical 소문자 규칙", ids.every(function (id) { return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id); }));
      check("통합 검증기", validation.ok, validation.errors.join(" | "));

      var pdf = search.find("pdf-jpg");
      var pdfUrl = search.buildUrl(w.location.href, pdf);
      check("?tool= 직접 주소", pdfUrl.indexOf("tool=pdf-jpg") >= 0, pdfUrl);
      var unit = search.find("unit-cm-inch");
      var unitUrl = search.buildUrl(w.location.href, unit, { from: "cm", to: "in" });
      check("단위 from/to", unitUrl.indexOf("tool=unit-cm-inch") >= 0 &&
        unitUrl.indexOf("from=cm") >= 0 && unitUrl.indexOf("to=in") >= 0, unitUrl);
      check("대문자 구 ID 호환", search.find("unit-MB-GB") &&
        search.find("unit-MB-GB").id === "unit-megabyte-gigabyte");
      check("기존 주소 대상 유지", routes.aliases.platform["pdf-jpg"] === "pdf-jpg" &&
        routes.aliases.unit["cm-inch"] === "unit-cm-inch");

      var query = search.search("평방미터", { limit: 5 });
      check("별칭 순위", query.items[0] && query.items[0].id === "unit-m2-pyeong",
        query.items.map(function (item) { return item.id; }).join(","));
      query = search.search("㎡", { limit: 10 });
      check("㎡와 m²/s 구분", !query.items.some(function (item) {
        return item.id === "unit-viscosity-kinematic-converter";
      }), query.items.map(function (item) { return item.id; }).join(","));
      query = search.search("MB GB", { limit: 5 });
      check("MB 바이트 구분", query.items[0] && query.items[0].id === "unit-megabyte-gigabyte",
        query.items.map(function (item) { return item.id; }).join(","));
      query = search.search("Mb", { limit: 20 });
      check("Mb 비트 구분", !query.items.some(function (item) {
        return item.id === "unit-megabyte-gigabyte";
      }), query.items.map(function (item) { return item.id; }).join(","));
      query = search.search("XLSX CSV", { limit: 20 });
      check("중복 검색 제거", query.items.some(function (item) { return item.id === "xlsx-csv"; }) &&
        !query.items.some(function (item) { return item.id === "doc-xlsx-csv"; }),
        query.items.map(function (item) { return item.id; }).join(","));

      console.group("HealingMart Converter Self-Test v1.28.0");
      console.table(rows);
      console.log("PASS " + pass + " / FAIL " + fail);
      console.groupEnd();
      var result = { version: "1.28.0", expected: EXPECTED, pass: pass, fail: fail, rows: rows, ok: fail === 0 };
      w.HM_CONVERTER_SELF_TEST_RESULT = result;
      return result;
    }).catch(function (error) {
      console.error("[HealingMart Self-Test]", error);
      var result = { version: "1.28.0", pass: 0, fail: 1, ok: false, error: error.message };
      w.HM_CONVERTER_SELF_TEST_RESULT = result;
      return result;
    });
  }

  w.HM_CONVERTER_SELF_TEST = { version: "1.28.0", run: run };
  run();
})(window, document);
