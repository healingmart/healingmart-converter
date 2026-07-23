(function (w) {
  "use strict";

  var NS = w.HM_CONVERTER_ENGINES = w.HM_CONVERTER_ENGINES || {};

  function addStyle(d) {
    if (d.getElementById("hmEngineDataStyle")) return;
    var s = d.createElement("style");
    s.id = "hmEngineDataStyle";
    s.textContent = [
      ".hm-data-grid{display:grid;grid-template-columns:minmax(0,1fr) 54px minmax(0,1fr);gap:14px;align-items:stretch}",
      ".hm-data-pane{min-width:0;display:flex;flex-direction:column;gap:10px}",
      ".hm-data-pane h3{margin:0;color:#111827;font-size:17px;font-weight:900}",
      ".hm-data-text{width:100%;min-height:340px;padding:16px;border:1.5px solid #dbe4ef;border-radius:16px;background:#fff;color:#111827;font:600 15px/1.65 ui-monospace,SFMono-Regular,Consolas,monospace;resize:vertical;outline:none}",
      ".hm-data-text:focus{border-color:#2f7cf6;box-shadow:0 0 0 4px rgba(47,124,246,.09)}",
      ".hm-data-mid{display:grid;place-items:center;color:#2f7cf6;font-size:27px;font-weight:950}",
      ".hm-data-upload{padding:14px;border:1.5px dashed #b8c8dc;border-radius:15px;background:#f8fbff;text-align:center;cursor:pointer}",
      ".hm-data-upload strong{display:block;color:#22324a;font-size:15px}.hm-data-upload small{display:block;margin-top:4px;color:#66758b;font-size:13px}",
      ".hm-data-result-download{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:340px;padding:28px;border:1px solid #dbe4ef;border-radius:16px;background:#f8fbff;text-align:center}",
      ".hm-data-result-download strong{color:#111827;font-size:20px}.hm-data-result-download p{margin:8px 0 18px;color:#52627a;font-size:14px;line-height:1.6}",
      ".hm-data-result-download a{min-height:50px;padding:0 20px;display:inline-flex;align-items:center;justify-content:center;border-radius:13px;background:#2f7cf6;color:#fff;font-size:15px;font-weight:900;text-decoration:none}",
      ".hm-data-filemeta{padding:10px 12px;border-radius:12px;background:#eef5ff;color:#31527b;font-size:13px;font-weight:750}",
      ".hm-data-options{display:flex;gap:10px;flex-wrap:wrap;align-items:center}",
      ".hm-data-options label{display:flex;align-items:center;gap:8px;color:#42536b;font-size:13px;font-weight:800}",
      ".hm-data-options select{height:40px;padding:0 10px;border:1px solid #d9e2ec;border-radius:10px;background:#fff;color:#1f2937;font-weight:750}",
      "@media(max-width:760px){.hm-data-grid{grid-template-columns:1fr}.hm-data-mid{min-height:34px;transform:rotate(90deg)}.hm-data-text{min-height:260px;font-size:14px}.hm-data-result-download{min-height:220px}}"
    ].join("");
    d.head.appendChild(s);
  }

  function safeBase(name) {
    return String(name || "converted").replace(/\.[^.]+$/, "").replace(/[\\/:*?\"<>|]+/g, "-") || "converted";
  }

  function mimeFor(fmt) {
    var f = String(fmt || "").toUpperCase();
    if (f.indexOf("JSON") >= 0) return "application/json;charset=utf-8";
    if (f.indexOf("CSV") >= 0) return "text/csv;charset=utf-8";
    if (f.indexOf("TSV") >= 0) return "text/tab-separated-values;charset=utf-8";
    if (f.indexOf("MARKDOWN") >= 0) return "text/markdown;charset=utf-8";
    if (f.indexOf("HTML") >= 0) return "text/html;charset=utf-8";
    if (f === "XML") return "application/xml;charset=utf-8";
    if (f === "YAML") return "text/yaml;charset=utf-8";
    return "text/plain;charset=utf-8";
  }

  function extFor(fmt) {
    var f = String(fmt || "").toUpperCase();
    if (f.indexOf("JSON") >= 0) return "json";
    if (f.indexOf("CSV") >= 0) return "csv";
    if (f.indexOf("TSV") >= 0) return "tsv";
    if (f.indexOf("MARKDOWN") >= 0) return "md";
    if (f.indexOf("HTML") >= 0) return "html";
    if (f === "YAML") return "yaml";
    if (f === "XLSX") return "xlsx";
    return "txt";
  }

  async function ensurePapa(ctx) {
    if (!w.Papa) await ctx.loadScript("https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js");
    if (!w.Papa) throw new Error("CSV 처리 라이브러리를 불러오지 못했습니다.");
  }

  async function ensureYaml(ctx) {
    if (!w.jsyaml) await ctx.loadScript("https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.min.js");
    if (!w.jsyaml) throw new Error("YAML 처리 라이브러리를 불러오지 못했습니다.");
  }

  async function ensureXlsx(ctx) {
    if (!w.XLSX) await ctx.loadScript("https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js");
    if (!w.XLSX) throw new Error("Excel 처리 라이브러리를 불러오지 못했습니다.");
  }

  function rowsToObjects(rows) {
    if (!rows || !rows.length) return [];
    var head = rows[0].map(function (x, i) { return String(x == null || x === "" ? "column" + (i + 1) : x); });
    return rows.slice(1).filter(function (r) {
      return r.some(function (v) { return String(v == null ? "" : v).trim() !== ""; });
    }).map(function (r) {
      var o = {};
      head.forEach(function (k, i) { o[k] = r[i] == null ? "" : r[i]; });
      return o;
    });
  }

  function normalizeJsonRows(value) {
    if (Array.isArray(value)) {
      if (value.every(function (v) { return v && typeof v === "object" && !Array.isArray(v); })) return value;
      return value.map(function (v) { return { value: typeof v === "object" ? JSON.stringify(v) : v }; });
    }
    if (value && typeof value === "object") return [value];
    return [{ value: value }];
  }

  function sanitizeTag(name) {
    var s = String(name == null ? "item" : name).trim().replace(/[^A-Za-z0-9_.:-]+/g, "_");
    if (!s) s = "item";
    if (!/^[A-Za-z_]/.test(s)) s = "n_" + s;
    return s;
  }

  function escXml(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  function valueToXml(name, value, depth) {
    var tag = sanitizeTag(name);
    var pad = new Array(depth + 1).join("  ");
    if (Array.isArray(value)) {
      return value.map(function (v) { return valueToXml(tag, v, depth); }).join("\n");
    }
    if (value && typeof value === "object") {
      var keys = Object.keys(value);
      if (!keys.length) return pad + "<" + tag + "></" + tag + ">";
      return pad + "<" + tag + ">\n" + keys.map(function (k) {
        return valueToXml(k, value[k], depth + 1);
      }).join("\n") + "\n" + pad + "</" + tag + ">";
    }
    return pad + "<" + tag + ">" + escXml(value) + "</" + tag + ">";
  }

  function jsonToXml(value) {
    var rootName = "root", rootValue = value;
    if (value && !Array.isArray(value) && typeof value === "object") {
      var keys = Object.keys(value);
      if (keys.length === 1) {
        rootName = sanitizeTag(keys[0]);
        rootValue = value[keys[0]];
      }
    }
    if (Array.isArray(rootValue)) {
      return '<?xml version="1.0" encoding="UTF-8"?>\n<' + rootName + '>\n' +
        rootValue.map(function (v) { return valueToXml("item", v, 1); }).join("\n") +
        '\n</' + rootName + '>';
    }
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + valueToXml(rootName, rootValue, 0);
  }

  function elementToValue(el) {
    var attrs = {};
    Array.prototype.forEach.call(el.attributes || [], function (a) { attrs[a.name] = a.value; });
    var children = Array.prototype.filter.call(el.childNodes || [], function (n) { return n.nodeType === 1; });
    var text = Array.prototype.filter.call(el.childNodes || [], function (n) { return n.nodeType === 3 || n.nodeType === 4; })
      .map(function (n) { return n.nodeValue; }).join("").trim();

    if (!children.length) {
      if (!Object.keys(attrs).length) return text;
      var leaf = { "@attributes": attrs };
      if (text) leaf["#text"] = text;
      return leaf;
    }

    var out = {};
    if (Object.keys(attrs).length) out["@attributes"] = attrs;
    children.forEach(function (c) {
      var v = elementToValue(c);
      if (Object.prototype.hasOwnProperty.call(out, c.tagName)) {
        if (!Array.isArray(out[c.tagName])) out[c.tagName] = [out[c.tagName]];
        out[c.tagName].push(v);
      } else {
        out[c.tagName] = v;
      }
    });
    if (text) out["#text"] = text;
    return out;
  }

  function xmlToJsonObject(text) {
    var parser = new DOMParser();
    var doc = parser.parseFromString(text, "application/xml");
    var err = doc.querySelector("parsererror");
    if (err) throw new Error("XML 문법을 확인해 주세요.");
    var root = doc.documentElement;
    var obj = {};
    obj[root.tagName] = elementToValue(root);
    return obj;
  }

  function flattenRow(obj) {
    var out = {};
    Object.keys(obj || {}).forEach(function (k) {
      var v = obj[k];
      if (v == null || typeof v !== "object") out[k] = v == null ? "" : v;
      else out[k] = JSON.stringify(v);
    });
    return out;
  }

  function rowsFromXmlObject(obj) {
    if (!obj || typeof obj !== "object") return [{ value: obj }];
    var rootKeys = Object.keys(obj);
    var root = rootKeys.length === 1 ? obj[rootKeys[0]] : obj;
    if (Array.isArray(root)) return root.map(function (x) { return flattenRow(x); });
    if (root && typeof root === "object") {
      var keys = Object.keys(root);
      for (var i = 0; i < keys.length; i += 1) {
        if (Array.isArray(root[keys[i]])) return root[keys[i]].map(function (x) { return flattenRow(x); });
      }
      return [flattenRow(root)];
    }
    return [{ value: root }];
  }

  function objectsToXmlRows(rows) {
    return jsonToXml({ rows: rows.map(function (r) { return { row: r }; }) });
  }

  function parseDelimited(text, delimiter) {
    var input = String(text == null ? "" : text).replace(/^\uFEFF/, "");
    var rows = [], row = [], field = "", quoted = false, i = 0;
    while (i < input.length) {
      var ch = input.charAt(i);
      if (quoted) {
        if (ch === '"') {
          if (input.charAt(i + 1) === '"') { field += '"'; i += 2; continue; }
          quoted = false; i += 1; continue;
        }
        field += ch; i += 1; continue;
      }
      if (ch === '"' && field === "") { quoted = true; i += 1; continue; }
      if (ch === delimiter) { row.push(field); field = ""; i += 1; continue; }
      if (ch === "\r" || ch === "\n") {
        row.push(field); field = "";
        if (ch === "\r" && input.charAt(i + 1) === "\n") i += 1;
        rows.push(row); row = []; i += 1; continue;
      }
      field += ch; i += 1;
    }
    if (quoted) throw new Error("따옴표가 닫히지 않은 표 데이터입니다.");
    if (field !== "" || row.length || !rows.length) { row.push(field); rows.push(row); }
    return rows.filter(function (r) {
      return r.some(function (v) { return String(v == null ? "" : v).trim() !== ""; });
    });
  }

  function stringifyDelimited(rows, delimiter) {
    return (rows || []).map(function (row) {
      return (row || []).map(function (value) {
        var s = String(value == null ? "" : value);
        return s.indexOf(delimiter) >= 0 || /["\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      }).join(delimiter);
    }).join("\r\n");
  }

  async function parseCsv(text, delimiter) {
    return parseDelimited(text, delimiter);
  }

  async function unparseObjects(rows, delimiter) {
    var list = Array.isArray(rows) ? rows : [];
    if (!list.length) return "";
    var keys = [];
    list.forEach(function (obj) {
      Object.keys(obj || {}).forEach(function (key) { if (keys.indexOf(key) < 0) keys.push(key); });
    });
    return stringifyDelimited([keys].concat(list.map(function (obj) {
      return keys.map(function (key) { return obj && obj[key] != null ? obj[key] : ""; });
    })), delimiter);
  }

  function normalizeWidth(rows) {
    var width = (rows || []).reduce(function (m, r) { return Math.max(m, (r || []).length); }, 0);
    return (rows || []).map(function (r) {
      var out = (r || []).slice();
      while (out.length < width) out.push("");
      return out;
    });
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function rowsToMarkdown(rows) {
    var data = normalizeWidth(rows);
    if (!data.length) return "";
    var width = data[0].length;
    if (!width) return "";
    function cell(value) {
      return String(value == null ? "" : value).replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>");
    }
    var header = data[0];
    var sep = new Array(width).fill("---");
    return [header, sep].concat(data.slice(1)).map(function (row) {
      return "| " + row.map(cell).join(" | ") + " |";
    }).join("\n");
  }

  function splitMarkdownRow(line) {
    var s = String(line || "").trim();
    if (s.charAt(0) === "|") s = s.slice(1);
    if (s.charAt(s.length - 1) === "|") s = s.slice(0, -1);
    var cells = [], buf = "", escaped = false;
    for (var i = 0; i < s.length; i += 1) {
      var ch = s.charAt(i);
      if (escaped) { buf += ch; escaped = false; continue; }
      if (ch === "\\") { escaped = true; continue; }
      if (ch === "|") { cells.push(buf.trim().replace(/<br\s*\/?\s*>/gi, "\n")); buf = ""; continue; }
      buf += ch;
    }
    if (escaped) buf += "\\";
    cells.push(buf.trim().replace(/<br\s*\/?\s*>/gi, "\n"));
    return cells;
  }

  function markdownToRows(text) {
    var lines = String(text || "").split(/\r?\n/).filter(function (line) { return line.trim() !== ""; });
    if (!lines.length) return [];
    var rows = lines.map(splitMarkdownRow);
    if (rows.length > 1 && rows[1].every(function (cell) { return /^:?-{3,}:?$/.test(String(cell).trim()); })) rows.splice(1, 1);
    return normalizeWidth(rows);
  }

  function rowsToHtmlTable(rows) {
    var data = normalizeWidth(rows);
    if (!data.length) return "<table></table>";
    var head = data[0], body = data.slice(1);
    return "<table>\n  <thead>\n    <tr>" + head.map(function (v) { return "<th>" + escapeHtml(v) + "</th>"; }).join("") + "</tr>\n  </thead>" +
      (body.length ? "\n  <tbody>\n" + body.map(function (row) { return "    <tr>" + row.map(function (v) { return "<td>" + escapeHtml(v) + "</td>"; }).join("") + "</tr>"; }).join("\n") + "\n  </tbody>" : "") + "\n</table>";
  }

  function htmlTableToRows(text) {
    var doc = new DOMParser().parseFromString(String(text || ""), "text/html");
    var table = doc.querySelector("table");
    if (!table) throw new Error("HTML table 요소를 찾지 못했습니다.");
    var rows = Array.prototype.map.call(table.querySelectorAll("tr"), function (tr) {
      return Array.prototype.map.call(tr.querySelectorAll("th,td"), function (cell) { return cell.textContent.trim(); });
    }).filter(function (row) { return row.length; });
    return normalizeWidth(rows);
  }

  function transposeRows(rows) {
    var data = normalizeWidth(rows);
    if (!data.length) return [];
    return data[0].map(function (_, col) { return data.map(function (row) { return row[col]; }); });
  }

  function cleanRows(rows) {
    return (rows || []).filter(function (row) { return row.some(function (v) { return String(v == null ? "" : v).trim() !== ""; }); });
  }

  function sortFirstColumn(rows, direction) {
    if (!rows.length) return [];
    var head = rows[0], body = rows.slice(1).sort(function (a, b) {
      return String(a[0] == null ? "" : a[0]).localeCompare(String(b[0] == null ? "" : b[0]), "ko", { numeric: true, sensitivity: "base" }) * direction;
    });
    return [head].concat(body);
  }

  function deduplicateRows(rows) {
    var seen = Object.create(null);
    return (rows || []).filter(function (row) {
      var key = JSON.stringify(row);
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  function rowsToColumnJson(rows) {
    var data = normalizeWidth(rows);
    if (!data.length) return {};
    var head = data[0].map(function (v, i) { return String(v || ("column" + (i + 1))); });
    var out = {};
    head.forEach(function (key) { out[key] = []; });
    data.slice(1).forEach(function (row) { head.forEach(function (key, i) { out[key].push(row[i] == null ? "" : row[i]); }); });
    return out;
  }

  function columnJsonToRows(value) {
    if (!value || Array.isArray(value) || typeof value !== "object") throw new Error("배열 값을 가진 JSON 객체를 입력해 주세요.");
    var keys = Object.keys(value);
    if (!keys.length) return [];
    keys.forEach(function (key) { if (!Array.isArray(value[key])) throw new Error("모든 JSON 속성 값은 배열이어야 합니다."); });
    var length = keys.reduce(function (m, key) { return Math.max(m, value[key].length); }, 0);
    var rows = [keys];
    for (var i = 0; i < length; i += 1) rows.push(keys.map(function (key) { return value[key][i] == null ? "" : value[key][i]; }));
    return rows;
  }

  function sortJsonKeys(value) {
    if (Array.isArray(value)) return value.map(sortJsonKeys);
    if (value && typeof value === "object") {
      var out = {};
      Object.keys(value).sort(function (a, b) { return a.localeCompare(b, "ko", { numeric: true, sensitivity: "base" }); }).forEach(function (key) { out[key] = sortJsonKeys(value[key]); });
      return out;
    }
    return value;
  }

  function escapePathKey(key) {
    return String(key).replace(/\\/g, "\\\\").replace(/\./g, "\\.").replace(/\[/g, "\\[").replace(/\]/g, "\\]");
  }

  function flattenJson(value) {
    var out = {};
    function walk(current, path) {
      if (Array.isArray(current)) {
        if (!current.length) { out[path || "$"] = []; return; }
        current.forEach(function (item, index) { walk(item, (path || "") + "[" + index + "]"); });
        return;
      }
      if (current && typeof current === "object") {
        var keys = Object.keys(current);
        if (!keys.length) { out[path || "$"] = {}; return; }
        keys.forEach(function (key) { walk(current[key], path ? path + "." + escapePathKey(key) : escapePathKey(key)); });
        return;
      }
      out[path || "$"] = current;
    }
    walk(value, "");
    return out;
  }

  function parseFlatPath(path) {
    if (path === "$") return ["$"];
    var tokens = [], buf = "", escaped = false;
    for (var i = 0; i < path.length; i += 1) {
      var ch = path.charAt(i);
      if (escaped) { buf += ch; escaped = false; continue; }
      if (ch === "\\") { escaped = true; continue; }
      if (ch === ".") { if (buf !== "") { tokens.push(buf); buf = ""; } continue; }
      if (ch === "[") {
        var end = path.indexOf("]", i + 1);
        if (end > i && /^\d+$/.test(path.slice(i + 1, end))) {
          if (buf !== "") { tokens.push(buf); buf = ""; }
          tokens.push(Number(path.slice(i + 1, end))); i = end; continue;
        }
      }
      buf += ch;
    }
    if (escaped) buf += "\\";
    if (buf !== "") tokens.push(buf);
    return tokens;
  }

  function unflattenJson(flat) {
    if (!flat || Array.isArray(flat) || typeof flat !== "object") throw new Error("평면 JSON 객체를 입력해 주세요.");
    if (Object.keys(flat).length === 1 && Object.prototype.hasOwnProperty.call(flat, "$")) return flat.$;
    var paths = Object.keys(flat).map(function (key) { return { key: key, tokens: parseFlatPath(key) }; });
    var first = paths.length && paths[0].tokens[0];
    var root = typeof first === "number" ? [] : {};
    paths.forEach(function (entry) {
      var tokens = entry.tokens;
      if (!tokens.length) return;
      var current = root;
      for (var i = 0; i < tokens.length; i += 1) {
        var token = tokens[i], last = i === tokens.length - 1, next = tokens[i + 1];
        if (last) { current[token] = entry.key === "$" ? flat.$ : flat[entry.key]; break; }
        if (current[token] == null || typeof current[token] !== "object") current[token] = typeof next === "number" ? [] : {};
        current = current[token];
      }
    });
    return root;
  }


  function trimCells(rows) {
    return (rows || []).map(function (row) {
      return (row || []).map(function (value) { return String(value == null ? "" : value).trim(); });
    });
  }

  function removeEmptyColumns(rows) {
    var data = normalizeWidth(rows);
    if (!data.length) return [];
    var keep = [];
    for (var col = 0; col < data[0].length; col += 1) {
      if (data.some(function (row) { return String(row[col] == null ? "" : row[col]).trim() !== ""; })) keep.push(col);
    }
    return data.map(function (row) { return keep.map(function (col) { return row[col]; }); });
  }

  function addRowNumbers(rows) {
    var data = normalizeWidth(rows);
    if (!data.length) return [["row_number"]];
    return [["row_number"].concat(data[0])].concat(data.slice(1).map(function (row, index) {
      return [String(index + 1)].concat(row);
    }));
  }

  function reverseBodyRows(rows) {
    if (!rows || !rows.length) return [];
    return [rows[0]].concat(rows.slice(1).reverse());
  }

  function transformHeaders(rows, mode) {
    var data = normalizeWidth(rows);
    if (!data.length) return [];
    data[0] = data[0].map(function (value) {
      var s = String(value == null ? "" : value);
      return mode === "upper" ? s.toUpperCase() : s.toLowerCase();
    });
    return data;
  }

  function sortColumnsByHeader(rows) {
    var data = normalizeWidth(rows);
    if (!data.length) return [];
    var order = data[0].map(function (value, index) { return { value: String(value == null ? "" : value), index: index }; });
    order.sort(function (a, b) { return a.value.localeCompare(b.value, "ko", { numeric: true, sensitivity: "base" }); });
    return data.map(function (row) { return order.map(function (item) { return row[item.index]; }); });
  }

  function rowsToKeyedJson(rows) {
    var data = normalizeWidth(rows);
    if (data.length < 2) return {};
    var head = data[0].map(function (v, i) { return String(v == null || v === "" ? "column" + (i + 1) : v); });
    var out = {};
    data.slice(1).forEach(function (row) {
      var key = String(row[0] == null ? "" : row[0]);
      if (!key) throw new Error("첫 열에 비어 있는 키가 있습니다.");
      if (Object.prototype.hasOwnProperty.call(out, key)) throw new Error("첫 열의 키가 중복되었습니다: " + key);
      var value = {};
      for (var i = 1; i < head.length; i += 1) value[head[i]] = row[i] == null ? "" : row[i];
      out[key] = value;
    });
    return out;
  }

  function keyedJsonToRows(value) {
    if (!value || Array.isArray(value) || typeof value !== "object") throw new Error("키 기반 JSON 객체를 입력해 주세요.");
    var objectKeys = Object.keys(value), columns = [];
    objectKeys.forEach(function (key) {
      var item = value[key];
      if (item && typeof item === "object" && !Array.isArray(item)) {
        Object.keys(item).forEach(function (column) { if (columns.indexOf(column) < 0) columns.push(column); });
      } else if (columns.indexOf("value") < 0) columns.push("value");
    });
    return [["key"].concat(columns)].concat(objectKeys.map(function (key) {
      var item = value[key];
      return [key].concat(columns.map(function (column) {
        if (column === "value" && (!item || typeof item !== "object" || Array.isArray(item))) return item == null ? "" : item;
        return item && typeof item === "object" && item[column] != null ? item[column] : "";
      }));
    }));
  }

  function valueJsonToRows(value) {
    if (!Array.isArray(value) || !value.every(function (row) { return Array.isArray(row); })) throw new Error("2차원 JSON 배열을 입력해 주세요.");
    return normalizeWidth(value);
  }

  async function textTransform(engine, text, ctx) {
    if (engine === "json-csv") return unparseObjects(normalizeJsonRows(JSON.parse(text)), ",", ctx);
    if (engine === "csv-json") return JSON.stringify(rowsToObjects(await parseCsv(text, ",", ctx)), null, 2);
    if (engine === "csv-tsv") return stringifyDelimited(await parseCsv(text, ",", ctx), "\t");
    if (engine === "tsv-csv") return stringifyDelimited(await parseCsv(text, "\t", ctx), ",");
    if (engine === "json-yaml") { await ensureYaml(ctx); return w.jsyaml.dump(JSON.parse(text), { noRefs: true, lineWidth: 120 }); }
    if (engine === "yaml-json") { await ensureYaml(ctx); return JSON.stringify(w.jsyaml.load(text), null, 2); }
    if (engine === "json-xml") return jsonToXml(JSON.parse(text));
    if (engine === "xml-json") return JSON.stringify(xmlToJsonObject(text), null, 2);
    if (engine === "csv-xml") return objectsToXmlRows(rowsToObjects(await parseCsv(text, ",", ctx)));
    if (engine === "xml-csv") return unparseObjects(rowsFromXmlObject(xmlToJsonObject(text)), ",", ctx);
    if (engine === "yaml-xml") { await ensureYaml(ctx); return jsonToXml(w.jsyaml.load(text)); }
    if (engine === "xml-yaml") { await ensureYaml(ctx); return w.jsyaml.dump(xmlToJsonObject(text), { noRefs: true, lineWidth: 120 }); }

    if (engine === "csv-markdown-table") return rowsToMarkdown(await parseCsv(text, ",", ctx));
    if (engine === "markdown-table-csv") return stringifyDelimited(markdownToRows(text), ",");
    if (engine === "tsv-markdown-table") return rowsToMarkdown(await parseCsv(text, "\t", ctx));
    if (engine === "markdown-table-tsv") return stringifyDelimited(markdownToRows(text), "\t");
    if (engine === "csv-html-table") return rowsToHtmlTable(await parseCsv(text, ",", ctx));
    if (engine === "html-table-csv") return stringifyDelimited(htmlTableToRows(text), ",");
    if (engine === "tsv-html-table") return rowsToHtmlTable(await parseCsv(text, "\t", ctx));
    if (engine === "html-table-tsv") return stringifyDelimited(htmlTableToRows(text), "\t");
    if (engine === "csv-semicolon") return stringifyDelimited(await parseCsv(text, ",", ctx), ";");
    if (engine === "semicolon-csv") return stringifyDelimited(await parseCsv(text, ";", ctx), ",");
    if (engine === "csv-pipe-table") return stringifyDelimited(await parseCsv(text, ",", ctx), "|");
    if (engine === "pipe-table-csv") return stringifyDelimited(await parseCsv(text, "|", ctx), ",");
    if (engine === "csv-json-columns") return JSON.stringify(rowsToColumnJson(await parseCsv(text, ",", ctx)), null, 2);
    if (engine === "json-columns-csv") return stringifyDelimited(columnJsonToRows(JSON.parse(text)), ",");
    if (engine === "csv-transpose") return stringifyDelimited(transposeRows(await parseCsv(text, ",", ctx)), ",");
    if (engine === "tsv-transpose") return stringifyDelimited(transposeRows(await parseCsv(text, "\t", ctx)), "\t");
    if (engine === "csv-remove-empty-rows") return stringifyDelimited(cleanRows(parseDelimited(text, ",")), ",");
    if (engine === "tsv-remove-empty-rows") return stringifyDelimited(cleanRows(parseDelimited(text, "\t")), "\t");
    if (engine === "csv-sort-first-asc") return stringifyDelimited(sortFirstColumn(await parseCsv(text, ",", ctx), 1), ",");
    if (engine === "csv-sort-first-desc") return stringifyDelimited(sortFirstColumn(await parseCsv(text, ",", ctx), -1), ",");
    if (engine === "tsv-sort-first-asc") return stringifyDelimited(sortFirstColumn(await parseCsv(text, "\t", ctx), 1), "\t");
    if (engine === "tsv-sort-first-desc") return stringifyDelimited(sortFirstColumn(await parseCsv(text, "\t", ctx), -1), "\t");
    if (engine === "csv-deduplicate-rows") return stringifyDelimited(deduplicateRows(await parseCsv(text, ",", ctx)), ",");
    if (engine === "tsv-deduplicate-rows") return stringifyDelimited(deduplicateRows(await parseCsv(text, "\t", ctx)), "\t");
    if (engine === "csv-header-lines") { var headerRows = await parseCsv(text, ",", ctx); return headerRows.length ? headerRows[0].join("\n") : ""; }

    if (engine === "csv-trim-cells") return stringifyDelimited(trimCells(await parseCsv(text, ",", ctx)), ",");
    if (engine === "tsv-trim-cells") return stringifyDelimited(trimCells(await parseCsv(text, "\t", ctx)), "\t");
    if (engine === "csv-remove-empty-columns") return stringifyDelimited(removeEmptyColumns(await parseCsv(text, ",", ctx)), ",");
    if (engine === "tsv-remove-empty-columns") return stringifyDelimited(removeEmptyColumns(await parseCsv(text, "\t", ctx)), "\t");
    if (engine === "csv-normalize-columns") return stringifyDelimited(normalizeWidth(await parseCsv(text, ",", ctx)), ",");
    if (engine === "tsv-normalize-columns") return stringifyDelimited(normalizeWidth(await parseCsv(text, "\t", ctx)), "\t");
    if (engine === "csv-add-row-numbers") return stringifyDelimited(addRowNumbers(await parseCsv(text, ",", ctx)), ",");
    if (engine === "tsv-add-row-numbers") return stringifyDelimited(addRowNumbers(await parseCsv(text, "\t", ctx)), "\t");
    if (engine === "csv-reverse-rows") return stringifyDelimited(reverseBodyRows(await parseCsv(text, ",", ctx)), ",");
    if (engine === "tsv-reverse-rows") return stringifyDelimited(reverseBodyRows(await parseCsv(text, "\t", ctx)), "\t");
    if (engine === "csv-uppercase-headers") return stringifyDelimited(transformHeaders(await parseCsv(text, ",", ctx), "upper"), ",");
    if (engine === "tsv-uppercase-headers") return stringifyDelimited(transformHeaders(await parseCsv(text, "\t", ctx), "upper"), "\t");
    if (engine === "csv-lowercase-headers") return stringifyDelimited(transformHeaders(await parseCsv(text, ",", ctx), "lower"), ",");
    if (engine === "tsv-lowercase-headers") return stringifyDelimited(transformHeaders(await parseCsv(text, "\t", ctx), "lower"), "\t");
    if (engine === "csv-sort-headers") return stringifyDelimited(sortColumnsByHeader(await parseCsv(text, ",", ctx)), ",");
    if (engine === "tsv-sort-headers") return stringifyDelimited(sortColumnsByHeader(await parseCsv(text, "\t", ctx)), "\t");
    if (engine === "csv-json-keyed") return JSON.stringify(rowsToKeyedJson(await parseCsv(text, ",", ctx)), null, 2);
    if (engine === "json-keyed-csv") return stringifyDelimited(keyedJsonToRows(JSON.parse(text)), ",");
    if (engine === "tsv-json-columns") return JSON.stringify(rowsToColumnJson(await parseCsv(text, "\t", ctx)), null, 2);
    if (engine === "json-columns-tsv") return stringifyDelimited(columnJsonToRows(JSON.parse(text)), "\t");
    if (engine === "csv-json-values") return JSON.stringify(normalizeWidth(await parseCsv(text, ",", ctx)), null, 2);
    if (engine === "json-values-csv") return stringifyDelimited(valueJsonToRows(JSON.parse(text)), ",");
    if (engine === "tsv-json-values") return JSON.stringify(normalizeWidth(await parseCsv(text, "\t", ctx)), null, 2);
    if (engine === "json-values-tsv") return stringifyDelimited(valueJsonToRows(JSON.parse(text)), "\t");
    if (engine === "tsv-json") return JSON.stringify(rowsToObjects(await parseCsv(text, "\t", ctx)), null, 2);
    if (engine === "json-tsv") return unparseObjects(normalizeJsonRows(JSON.parse(text)), "\t", ctx);
    if (engine === "csv-yaml") { await ensureYaml(ctx); return w.jsyaml.dump(rowsToObjects(await parseCsv(text, ",", ctx)), { noRefs: true, lineWidth: 120 }); }
    if (engine === "yaml-csv") { await ensureYaml(ctx); return unparseObjects(normalizeJsonRows(w.jsyaml.load(text)), ",", ctx); }
    if (engine === "tsv-yaml") { await ensureYaml(ctx); return w.jsyaml.dump(rowsToObjects(await parseCsv(text, "\t", ctx)), { noRefs: true, lineWidth: 120 }); }
    if (engine === "yaml-tsv") { await ensureYaml(ctx); return unparseObjects(normalizeJsonRows(w.jsyaml.load(text)), "\t", ctx); }
    if (engine === "json-sort-keys") return JSON.stringify(sortJsonKeys(JSON.parse(text)), null, 2);
    if (engine === "json-flatten") return JSON.stringify(flattenJson(JSON.parse(text)), null, 2);
    if (engine === "json-unflatten") return JSON.stringify(unflattenJson(JSON.parse(text)), null, 2);
    if (engine === "json-markdown-table") {
      var jsonRows = normalizeJsonRows(JSON.parse(text));
      var keys = [];
      jsonRows.forEach(function (obj) { Object.keys(obj || {}).forEach(function (key) { if (keys.indexOf(key) < 0) keys.push(key); }); });
      return rowsToMarkdown([keys].concat(jsonRows.map(function (obj) { return keys.map(function (key) { var value = obj[key]; return value != null && typeof value === "object" ? JSON.stringify(value) : (value == null ? "" : value); }); })));
    }
    if (engine === "markdown-table-json") return JSON.stringify(rowsToObjects(markdownToRows(text)), null, 2);
    throw new Error("지원하지 않는 데이터 변환입니다.");
  }

  async function xlsxInputTransform(engine, file, ctx) {
    await ensureXlsx(ctx);
    var buf = await file.arrayBuffer();
    var wb = w.XLSX.read(buf, { type: "array" });
    if (!wb.SheetNames.length) throw new Error("Excel 시트를 찾지 못했습니다.");
    var ws = wb.Sheets[wb.SheetNames[0]];
    if (engine === "xlsx-json") return { text: JSON.stringify(w.XLSX.utils.sheet_to_json(ws, { defval: "" }), null, 2), format: "JSON" };
    if (engine === "xlsx-csv" || engine === "doc-xlsx-csv") return { text: w.XLSX.utils.sheet_to_csv(ws), format: "CSV" };
    if (engine === "xlsx-tsv" || engine === "doc-xlsx-tsv") return { text: w.XLSX.utils.sheet_to_csv(ws, { FS: "\t" }), format: "TSV" };
    throw new Error("지원하지 않는 Excel 입력 변환입니다.");
  }

  async function xlsxOutputTransform(engine, text, ctx) {
    await ensureXlsx(ctx);
    var rows;
    if (engine === "json-xlsx") rows = normalizeJsonRows(JSON.parse(text));
    else if (engine === "csv-xlsx" || engine === "doc-csv-xlsx") rows = rowsToObjects(await parseCsv(text, ",", ctx));
    else throw new Error("지원하지 않는 Excel 출력 변환입니다.");
    var ws = w.XLSX.utils.json_to_sheet(rows);
    var wb = w.XLSX.utils.book_new();
    w.XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    var arr = w.XLSX.write(wb, { bookType: "xlsx", type: "array" });
    return new Blob([arr], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  }

  function makeDownload(d, holder, blob, name) {
    holder.innerHTML = "";
    var url = URL.createObjectURL(blob);
    var box = d.createElement("div");
    box.className = "hm-data-result-download";
    var strong = d.createElement("strong");
    strong.textContent = "변환이 완료되었습니다.";
    var p = d.createElement("p");
    p.textContent = name + " 파일을 저장할 수 있습니다.";
    var a = d.createElement("a");
    a.href = url;
    a.download = name;
    a.textContent = "변환 파일 다운로드";
    box.appendChild(strong); box.appendChild(p); box.appendChild(a); holder.appendChild(box);
    return url;
  }

  NS.data = {
    version: "1.2.0",
    transformText: function (engine, text, ctx) { return textTransform(engine, text, ctx || {}); },
    open: function (x, ctx) {
      var d = ctx.document, stage = ctx.stage;
      addStyle(d);
      var isXlsxIn = String(x.fromFormat).toUpperCase() === "XLSX";
      var isXlsxOut = String(x.toFormat).toUpperCase() === "XLSX";
      var inputPlaceholder = String(x.fromFormat).toUpperCase() + " 내용을 붙여넣으세요.";
      var accept = isXlsxIn ? ".xlsx,.xls" : ".json,.csv,.tsv,.yaml,.yml,.xml,.txt,.md,.markdown,.html,.htm,text/*";

      stage.innerHTML = '<div class="hm-fx-detail">' +
        '<div class="hm-fx-toolbar"><a class="hm-fx-back" href="' + ctx.route({ category: x.category }) + '" data-route>← ' + ctx.esc(ctx.cat(x.category).name) + '</a></div>' +
        ctx.titleBlock(x) +
        '<div class="hm-fx-workbox">' +
          '<div class="hm-data-options"><span class="hm-fx-note">표 형식은 첫 행을 열 이름으로 사용합니다. CSV 따옴표·줄바꿈을 지원하며 Excel은 첫 번째 시트를 처리합니다.</span></div>' +
          '<div class="hm-data-grid">' +
            '<div class="hm-data-pane"><h3>변환 전 · ' + ctx.esc(x.fromFormat) + '</h3>' +
              '<div class="hm-data-upload" data-upload><strong>파일을 선택하거나 끌어놓기</strong><small>' + ctx.esc(x.fromFormat) + ' 파일을 불러올 수 있습니다.</small><input type="file" hidden data-file accept="' + accept + '"></div>' +
              '<div class="hm-data-filemeta" data-filemeta hidden></div>' +
              (isXlsxIn ? '<div class="hm-fx-note">Excel 파일을 선택한 뒤 변환 시작을 누르세요.</div>' : '<textarea class="hm-data-text" data-in placeholder="' + ctx.esc(inputPlaceholder) + '"></textarea>') +
            '</div>' +
            '<div class="hm-data-mid">→</div>' +
            '<div class="hm-data-pane"><h3>변환 후 · ' + ctx.esc(x.toFormat) + '</h3>' +
              (isXlsxOut ? '<div data-download-holder><div class="hm-data-result-download"><strong>Excel 파일로 변환</strong><p>왼쪽에 내용을 입력한 뒤 변환 시작을 누르세요.</p></div></div>' : '<textarea class="hm-data-text" data-out readonly placeholder="변환 결과가 여기에 표시됩니다."></textarea>') +
            '</div>' +
          '</div>' +
          '<div class="hm-fx-actions"><button class="hm-fx-btn primary" type="button" data-run>변환 시작</button><button class="hm-fx-btn" type="button" data-copy' + (isXlsxOut ? ' hidden' : '') + '>결과 복사</button><button class="hm-fx-btn" type="button" data-save' + (isXlsxOut ? ' hidden' : '') + '>결과 파일 저장</button></div>' +
          '<div class="hm-fx-note" data-msg>파일과 입력 내용은 브라우저 안에서 처리합니다.</div>' +
        '</div></div>';

      var upload = stage.querySelector("[data-upload]");
      var fileInput = stage.querySelector("[data-file]");
      var meta = stage.querySelector("[data-filemeta]");
      var input = stage.querySelector("[data-in]");
      var output = stage.querySelector("[data-out]");
      var run = stage.querySelector("[data-run]");
      var copy = stage.querySelector("[data-copy]");
      var save = stage.querySelector("[data-save]");
      var msg = stage.querySelector("[data-msg]");
      var holder = stage.querySelector("[data-download-holder]");
      var chosen = null, downloadUrl = null;

      function setFile(file) {
        chosen = file;
        meta.hidden = false;
        meta.textContent = file.name + " · " + Math.max(1, Math.round(file.size / 1024)) + "KB";
        if (!isXlsxIn && input) {
          file.text().then(function (t) { input.value = t; msg.textContent = "파일 내용을 불러왔습니다."; })
            .catch(function () { msg.textContent = "파일 내용을 읽지 못했습니다."; });
        }
      }

      upload.onclick = function () { fileInput.click(); };
      upload.ondragover = function (e) { e.preventDefault(); };
      upload.ondrop = function (e) { e.preventDefault(); if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]); };
      fileInput.onchange = function () { if (fileInput.files[0]) setFile(fileInput.files[0]); };

      run.onclick = async function () {
        run.disabled = true;
        msg.textContent = "변환 중입니다...";
        try {
          if (downloadUrl) { URL.revokeObjectURL(downloadUrl); downloadUrl = null; }
          if (isXlsxIn) {
            if (!chosen) throw new Error("Excel 파일을 먼저 선택해 주세요.");
            var xr = await xlsxInputTransform(x.engine, chosen, ctx);
            output.value = xr.text;
            msg.textContent = "첫 번째 Excel 시트 변환을 완료했습니다.";
          } else if (isXlsxOut) {
            if (!input.value.trim()) throw new Error("변환할 내용을 입력해 주세요.");
            var blob = await xlsxOutputTransform(x.engine, input.value, ctx);
            var name = (chosen ? safeBase(chosen.name) : "healingmart-data") + ".xlsx";
            downloadUrl = makeDownload(d, holder, blob, name);
            msg.textContent = "Excel 파일 변환을 완료했습니다.";
          } else {
            if (!input.value.trim()) throw new Error("변환할 내용을 입력해 주세요.");
            output.value = await textTransform(x.engine, input.value, ctx);
            msg.textContent = "변환이 완료되었습니다.";
          }
        } catch (error) {
          if (output) output.value = "";
          msg.textContent = error.message || String(error);
        } finally {
          run.disabled = false;
        }
      };

      if (copy) copy.onclick = function () {
        if (!output || !output.value) return;
        if (navigator.clipboard) navigator.clipboard.writeText(output.value);
        msg.textContent = "결과를 복사했습니다.";
      };

      if (save) save.onclick = function () {
        if (!output || !output.value) return;
        var blob = new Blob([output.value], { type: mimeFor(x.toFormat) });
        var url = URL.createObjectURL(blob);
        var a = d.createElement("a");
        a.href = url;
        a.download = (chosen ? safeBase(chosen.name) : "healingmart-data") + "." + extFor(x.toFormat);
        d.body.appendChild(a); a.click(); a.remove();
        w.setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
        msg.textContent = "결과 파일 다운로드를 시작했습니다.";
      };
    }
  };
})(window);
