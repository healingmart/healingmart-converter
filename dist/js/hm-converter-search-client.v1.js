/* HealingMart Converter Search Client v1.2.0 */
(function (w, d) {
  "use strict";

  var VERSION = "1.2.0";
  var BASE_URL = "https://healingmart.github.io/healingmart-converter/";
  var MANIFEST_URL = BASE_URL + "dist/catalog/hm-converter-public-manifest.v1.js";
  var DEFAULT_INDEX = BASE_URL + "dist/data/hm-converter-search-index.v1.js";
  var loading = null;
  var directLoading = null;
  var expandedItems = null;

  var aliases = {
    jpeg: "jpg", jpe: "jpg", tif: "tiff", htm: "html", yml: "yaml",
    word: "docx", "워드": "docx", "워드문서": "docx",
    excel: "xlsx", "엑셀": "xlsx", powerpoint: "pptx", "파워포인트": "pptx",
    "한글": "hwp", "한글문서": "hwp", "사진": "image", "그림": "image",
    "동영상": "video", "영상": "video", "음원": "audio", "소리": "audio",
    "음성": "audio", "자막": "subtitle", "전자책": "ebook", "압축": "archive",
    "폰트": "font", "색상": "color", "색깔": "color", "단위": "unit",
    "평방미터": "m2", "제곱미터": "m2", "㎡": "m2", "m²": "m2"
  };
  var EXACT_DIMENSION = { m2: 1, km2: 1, cm2: 1, mm2: 1, m3: 1, cm3: 1, mm3: 1 };
  var CASE_UNITS = {
    kb: 1, kB: 1, Mb: 1, MB: 1, Gb: 1, GB: 1, Tb: 1, TB: 1,
    KiB: 1, MiB: 1, GiB: 1, TiB: 1, kbps: 1, Mbps: 1, Gbps: 1,
    kBps: 1, MBps: 1, GBps: 1, KiBps: 1, MiBps: 1, GiBps: 1,
    "MB/s": 1, "Mb/s": 1, "GB/s": 1, "Gb/s": 1, "kB/s": 1, "kb/s": 1
  };

  function normalize(value) {
    var s = String(value == null ? "" : value);
    if (s.normalize) s = s.normalize("NFKC");
    return s.toLowerCase()
      .replace(/㎡/g, " m2 ").replace(/㎢/g, " km2 ").replace(/㎠/g, " cm2 ").replace(/㎟/g, " mm2 ")
      .replace(/[²]/g, "2").replace(/[³]/g, "3").replace(/[μµ]/g, "u")
      .replace(/[→↔⇄⇆/·,;:_\-]+/g, " ").replace(/[^0-9a-z가-힣+#.%]+/g, " ")
      .replace(/\s+/g, " ").trim();
  }

  function tokens(value) {
    var out = [];
    normalize(value).split(" ").filter(Boolean).forEach(function (token) {
      var mapped = aliases[token] || token;
      if (out.indexOf(mapped) < 0) out.push(mapped);
    });
    return out;
  }

  function exactTokens(value) {
    var s = String(value == null ? "" : value);
    if (s.normalize) s = s.normalize("NFKC");
    var matches = s.match(/[A-Za-z]+(?:\/[A-Za-z]+)?/g) || [];
    var out = [];
    matches.forEach(function (token) {
      if (CASE_UNITS[token] && out.indexOf(token) < 0) out.push(token);
    });
    return out;
  }

  function strictExactToken(value) {
    var s = String(value == null ? "" : value);
    if (s.normalize) s = s.normalize("NFKC");
    s = s.trim();
    return CASE_UNITS[s] ? s : "";
  }

  function index() { return w.HM_CONVERTER_SEARCH_INDEX || null; }
  function manifest() { return w.HM_CONVERTER_PUBLIC_MANIFEST || null; }

  function addQuery(url, key, value) {
    return url + (url.indexOf("?") >= 0 ? "&" : "?") + key + "=" + encodeURIComponent(value);
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      if (!d || !d.createElement || !d.head || !d.head.appendChild) {
        reject(new Error("스크립트 로더를 사용할 수 없습니다."));
        return;
      }
      var script = d.createElement("script");
      var done = false;
      var timer;
      function finish(error) {
        if (done) return;
        done = true;
        w.clearTimeout(timer);
        script.onload = null;
        script.onerror = null;
        if (error) reject(error); else resolve();
      }
      script.async = true;
      script.src = src;
      script.onload = function () { finish(); };
      script.onerror = function () { finish(new Error("컨버터 카탈로그를 불러오지 못했습니다: " + src)); };
      timer = w.setTimeout(function () { finish(new Error("컨버터 카탈로그 로딩 시간이 초과되었습니다.")); }, 15000);
      d.head.appendChild(script);
    });
  }

  function split(value) { return String(value || "").split("|").filter(Boolean); }

  function hmExpand(row) {
    if (!row) return row;
    if (row.id) {
      if (!row.type) row.type = "converter";
      return row;
    }
    var kind = { f: "file", t: "text", u: "unit", s: "special" }[row.k] || row.k;
    return {
      id: row.i,
      type: "converter",
      runtimeId: row.r,
      legacyIds: split(row.L),
      source: row.s === "u" ? "unit" : "platform",
      kind: kind,
      name: row.n,
      shortName: row.h,
      category: row.c,
      subcategory: row.b,
      description: row.d,
      from: row.f,
      to: row.t,
      status: row.p ? "published" : "coming",
      featured: !!row.x,
      featuredOrder: Number(row.o) || 0,
      normalizedName: row.z || normalize(row.n),
      normalizedShortName: row.y || normalize(row.h),
      normalizedAliases: split(row.a),
      normalizedKeywords: String(row.j || ""),
      searchText: row.q || "",
      exactTokens: split(row.u),
      searchVisible: row.v !== 0,
      duplicateOf: row.g || null,
      addedIn: row.A || null,
      addedAt: row.B || null,
      updatedAt: row.D || null,
      isNew: !!row.N
    };
  }

  function all() {
    var data = index();
    if (!data || !Array.isArray(data.items)) return [];
    if (expandedItems) return expandedItems;
    expandedItems = data.items.map(hmExpand);
    return expandedItems;
  }

  function publicItems() {
    return all().filter(function (item) {
      return item.status === "published" && item.searchVisible !== false;
    });
  }

  function dispatchReady() {
    if (!w.dispatchEvent || typeof w.CustomEvent !== "function") return;
    w.dispatchEvent(new w.CustomEvent("hm:converter-catalog-ready", {
      detail: { manifest: manifest(), catalog: publicItems() }
    }));
  }

  function acceptLoadedIndex(expectedHash) {
    var data = index();
    if (!data || !Array.isArray(data.items)) throw new Error("검색 인덱스가 등록되지 않았습니다.");
    if (expectedHash && data.contentHash !== expectedHash) {
      throw new Error("검색 인덱스 해시가 공개 매니페스트와 일치하지 않습니다.");
    }
    expandedItems = null;
    return data;
  }

  function load(src) {
    if (index()) return Promise.resolve(index());
    if (directLoading) return directLoading;
    directLoading = loadScript(src || DEFAULT_INDEX).then(function () {
      var data = acceptLoadedIndex();
      dispatchReady();
      return data;
    }).catch(function (error) {
      directLoading = null;
      throw error;
    });
    return directLoading;
  }

  function loadLatest() {
    if (loading) return loading;
    loading = loadScript(addQuery(MANIFEST_URL, "t", Date.now())).then(function () {
      var latest = manifest();
      if (!latest || !latest.searchIndexUrl || !latest.searchIndexHash) {
        throw new Error("공개 컨버터 매니페스트가 올바르지 않습니다.");
      }
      var current = index();
      if (current && current.contentHash === latest.searchIndexHash) return current;
      w.HM_CONVERTER_SEARCH_INDEX = null;
      expandedItems = null;
      return loadScript(addQuery(latest.searchIndexUrl, "v", latest.searchIndexHash)).then(function () {
        return acceptLoadedIndex(latest.searchIndexHash);
      });
    }).then(function () {
      var catalog = publicItems();
      dispatchReady();
      return catalog;
    });
    loading = loading.then(function (catalog) {
      loading = null;
      return catalog;
    }, function (error) {
      loading = null;
      throw error;
    });
    return loading;
  }

  function caseConflict(item, queryExact) {
    if (item.source !== "unit" || !queryExact.length) return false;
    var itemExact = item.exactTokens || [];
    return queryExact.some(function (q) {
      var fold = q.toLowerCase();
      var same = itemExact.filter(function (v) { return String(v).toLowerCase() === fold; });
      return same.length > 0 && same.indexOf(q) < 0;
    });
  }

  function score(item, queryTokens, compact, queryExact, strictExact) {
    if (item.source === "unit" && EXACT_DIMENSION[compact] && (item.exactTokens || []).map(normalize).indexOf(compact) < 0) return -1;
    if (strictExact && (item.exactTokens || []).indexOf(strictExact) < 0) return -1;
    var text = item.searchText || normalize([item.id, item.name, item.shortName, item.description, item.from, item.to].join(" "));
    if (!queryTokens.every(function (token) { return text.indexOf(token) >= 0; })) return -1;
    if (caseConflict(item, queryExact)) return -1;
    var name = item.normalizedName || normalize(item.name);
    var shortName = item.normalizedShortName || normalize(item.shortName);
    var id = normalize(String(item.id || "").replace(/-/g, " "));
    var from = normalize(item.from);
    var to = normalize(item.to);
    var aliasList = item.normalizedAliases || [];
    var keywordText = item.normalizedKeywords || "";
    var scoreValue = 0;
    if (id === compact) scoreValue += 1700;
    if (name === compact) scoreValue += 1600;
    if (shortName === compact) scoreValue += 1500;
    if (from + " " + to === compact) scoreValue += 1420;
    if (to + " " + from === compact && item.source === "unit") scoreValue += 1390;
    if (aliasList.indexOf(compact) >= 0) scoreValue += 1300;
    if (name.indexOf(compact) === 0) scoreValue += 680;
    if (shortName.indexOf(compact) === 0) scoreValue += 640;
    queryExact.forEach(function (token) { if ((item.exactTokens || []).indexOf(token) >= 0) scoreValue += 520; });
    queryTokens.forEach(function (token) {
      if (from === token) scoreValue += 210;
      if (to === token) scoreValue += 195;
      if (name.split(" ").indexOf(token) >= 0) scoreValue += 90;
      if (aliasList.some(function (alias) { return alias === token; })) scoreValue += 160;
      else if (aliasList.some(function (alias) { return alias.indexOf(token) >= 0; })) scoreValue += 55;
      if (keywordText.split(" ").indexOf(token) >= 0) scoreValue += 20;
    });
    if (item.featured) scoreValue += 40;
    if (item.featuredOrder) scoreValue += Math.max(0, 30 - Math.min(30, item.featuredOrder));
    if (item.status === "published") scoreValue += 10;
    return scoreValue;
  }

  function search(query, options) {
    options = options || {};
    var queryTokens = tokens(query);
    if (!queryTokens.length) return { total: 0, items: [], query: String(query || "") };
    var compact = queryTokens.join(" ");
    var queryExact = exactTokens(query);
    var strictExact = strictExactToken(query);
    var limit = Math.max(1, Number(options.limit) || 20);
    var category = options.category || "";
    var kind = options.kind || "";
    var rows = [];
    all().forEach(function (item, indexValue) {
      if (!options.includeComing && item.status !== "published") return;
      if (!options.includeHidden && !item.searchVisible) return;
      if (category && item.category !== category) return;
      if (kind && item.kind !== kind) return;
      var value = score(item, queryTokens, compact, queryExact, strictExact);
      if (value < 0) return;
      rows.push({ item: item, score: value, index: indexValue });
    });
    rows.sort(function (a, b) {
      return b.score - a.score || Number(!!b.item.featured) - Number(!!a.item.featured) ||
        (a.item.featuredOrder || 9999) - (b.item.featuredOrder || 9999) ||
        String(a.item.name || "").localeCompare(String(b.item.name || ""), "ko", { numeric: true, sensitivity: "base" }) || a.index - b.index;
    });
    return { total: rows.length, items: rows.slice(0, limit).map(function (row) { return row.item; }), query: String(query || "") };
  }

  function find(id) {
    var key = String(id || "");
    return all().find(function (item) {
      return item.id === key || item.runtimeId === key || (item.legacyIds || []).indexOf(key) >= 0;
    }) || null;
  }

  function buildUrl(baseUrl, itemOrId, direction) {
    var item = typeof itemOrId === "string" ? find(itemOrId) : itemOrId;
    if (!item) return "";
    var fallback = w.location && w.location.href ? w.location.href : BASE_URL;
    var base = baseUrl || fallback;
    var u = new URL(base, fallback);
    ["category", "convert", "tool", "from", "to"].forEach(function (key) { u.searchParams.delete(key); });
    u.searchParams.set("tool", item.id);
    var from = direction && direction.from || item.from;
    var to = direction && direction.to || item.to;
    if (item.source === "unit" && from && to) {
      u.searchParams.set("from", from);
      u.searchParams.set("to", to);
    }
    u.hash = "";
    return u.toString();
  }

  function featured(limit) {
    return all().filter(function (item) { return item.searchVisible && item.featured && item.status === "published"; })
      .sort(function (a, b) { return (a.featuredOrder || 9999) - (b.featuredOrder || 9999); })
      .slice(0, Math.max(1, Number(limit) || 12));
  }

  function newest(limit) {
    return all().filter(function (item) { return item.searchVisible && item.isNew && item.status === "published"; })
      .sort(function (a, b) { return String(b.addedAt || "").localeCompare(String(a.addedAt || "")) || String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")); })
      .slice(0, Math.max(1, Number(limit) || 12));
  }

  function recent(limit) {
    return all().filter(function (item) { return item.searchVisible && item.updatedAt && item.status === "published"; })
      .sort(function (a, b) { return String(b.updatedAt).localeCompare(String(a.updatedAt)) || (b.featuredOrder || 0) - (a.featuredOrder || 0); })
      .slice(0, Math.max(1, Number(limit) || 12));
  }

  function stats() { var data = index(); return data ? data.stats : null; }

  w.HM_CONVERTER_SEARCH = Object.freeze({
    version: VERSION,
    baseUrl: BASE_URL,
    load: load,
    loadLatest: loadLatest,
    index: index,
    manifest: manifest,
    normalize: normalize,
    tokens: tokens,
    exactTokens: exactTokens,
    strictExactToken: strictExactToken,
    search: search,
    find: find,
    buildUrl: buildUrl,
    featured: featured,
    newest: newest,
    recent: recent,
    stats: stats,
    all: all,
    publicItems: publicItems
  });
})(window, document);
