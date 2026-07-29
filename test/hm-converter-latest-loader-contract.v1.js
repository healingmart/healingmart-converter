#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
let pass = 0;
let fail = 0;
function test(name, condition, detail) {
  if (condition) { pass += 1; console.log('PASS', name); }
  else { fail += 1; console.error('FAIL', name, detail || ''); }
}

function createBrowser(options) {
  options = options || {};
  const requests = [];
  const events = [];
  let failManifestOnce = !!options.failManifestOnce;
  const context = {
    console,
    URL,
    Promise,
    Date,
    Object,
    setTimeout,
    clearTimeout,
    window: {},
    document: {}
  };
  context.CustomEvent = function CustomEvent(type, init) { this.type = type; this.detail = init && init.detail; };
  Object.assign(context.window, {
    window: context.window,
    location: { href: 'https://www.healing-mart.com/p/converter.html' },
    setTimeout,
    clearTimeout,
    CustomEvent: context.CustomEvent,
    dispatchEvent(event) { events.push(event); }
  });
  context.document.createElement = function () { return { async: false, src: '', onload: null, onerror: null }; };
  vm.createContext(context);
  context.document.head = {
    appendChild(script) {
      requests.push(script.src);
      setImmediate(() => {
        try {
          if (script.src.includes('hm-converter-public-manifest.v1.js')) {
            if (failManifestOnce) {
              failManifestOnce = false;
              if (script.onerror) script.onerror(new Error('simulated manifest failure'));
              return;
            }
            vm.runInContext(fs.readFileSync(path.join(root, 'dist/catalog/hm-converter-public-manifest.v1.js'), 'utf8'), context);
          } else if (script.src.includes('hm-converter-search-index.v1.js')) {
            vm.runInContext(fs.readFileSync(path.join(root, 'dist/data/hm-converter-search-index.v1.js'), 'utf8'), context);
          } else {
            throw new Error('unexpected URL: ' + script.src);
          }
          if (script.onload) script.onload();
        } catch (error) {
          if (script.onerror) script.onerror(error);
        }
      });
    }
  };
  vm.runInContext(fs.readFileSync(path.join(root, 'dist/js/hm-converter-search-client.v1.js'), 'utf8'), context, { filename: 'hm-converter-search-client.v1.js' });
  return { window: context.window, requests, events };
}

(async () => {
  const browser = createBrowser();
  const api = browser.window.HM_CONVERTER_SEARCH;
  const first = api.loadLatest();
  const second = api.loadLatest();
  test('동시 loadLatest 동일 Promise', first === second);
  const catalogs = await Promise.all([first, second]);
  const catalog = catalogs[0];
  const manifestRequests = browser.requests.filter(url => url.includes('hm-converter-public-manifest.v1.js'));
  const indexRequests = browser.requests.filter(url => url.includes('hm-converter-search-index.v1.js'));
  test('공개 매니페스트 한 번 로딩', manifestRequests.length === 1, manifestRequests.length);
  test('매니페스트 캐시 방지값 적용', /[?&]t=\d+/.test(manifestRequests[0] || ''), manifestRequests[0]);
  test('검색 인덱스 한 번 로딩', indexRequests.length === 1, indexRequests.length);
  test('해시가 인덱스 URL에 적용', indexRequests[0] && indexRequests[0].includes('v=' + encodeURIComponent(api.manifest().searchIndexHash)), indexRequests[0]);
  test('loadLatest가 공개 검색 카탈로그 반환', Array.isArray(catalog) && catalog.length === api.stats().publishedSearchVisible, catalog && catalog.length);
  test('all()은 전체 등록 항목 반환', api.all().length === api.stats().registered, api.all().length);
  test('publicItems()는 공개 검색 항목 반환', api.publicItems().length === api.stats().publishedSearchVisible, api.publicItems().length);
  test('loadLatest 반환에 준비 중 없음', !catalog.some(item => item.status !== 'published'));
  test('loadLatest 반환에 검색 숨김 없음', !catalog.some(item => item.searchVisible === false));
  test('반환 항목 type=converter', catalog.every(item => item.type === 'converter'));
  const ready = browser.events.filter(event => event.type === 'hm:converter-catalog-ready');
  test('준비 완료 이벤트 발생', ready.length === 1, ready.length);
  test('이벤트 manifest 전달', ready[0] && ready[0].detail.manifest === api.manifest());
  test('이벤트 catalog에 공개 검색 목록 전달', ready[0] && ready[0].detail.catalog.length === catalog.length && !ready[0].detail.catalog.some(item => item.status !== 'published' || item.searchVisible === false), ready[0] && ready[0].detail.catalog.length);

  let result = api.search('EPUB MOBI', { limit: 100 });
  test('기본 검색 coming 제외', !result.items.some(item => item.id === 'epub-mobi'), result.items.map(item => item.id).join(','));
  result = api.search('EPUB MOBI', { limit: 100, includeComing: true });
  test('includeComing에서 coming 노출', result.items.some(item => item.id === 'epub-mobi'), result.items.map(item => item.id).join(','));
  const url = api.buildUrl('https://www.healing-mart.com/p/converter.html', 'unit-m2-pyeong');
  test('buildUrl 단위 주소 정상', url.includes('tool=unit-m2-pyeong') && url.includes('from=m2') && url.includes('to=pyeong'), url);

  const retryBrowser = createBrowser({ failManifestOnce: true });
  let firstFailed = false;
  try { await retryBrowser.window.HM_CONVERTER_SEARCH.loadLatest(); }
  catch (_) { firstFailed = true; }
  test('첫 로딩 실패 명확히 reject', firstFailed);
  const retryCatalog = await retryBrowser.window.HM_CONVERTER_SEARCH.loadLatest();
  test('실패 후 재시도 성공', Array.isArray(retryCatalog) && retryCatalog.length === retryBrowser.window.HM_CONVERTER_SEARCH.stats().publishedSearchVisible, retryCatalog && retryCatalog.length);
  test('실패 후 매니페스트 재요청', retryBrowser.requests.filter(url => url.includes('hm-converter-public-manifest.v1.js')).length === 2, retryBrowser.requests.join('\n'));

  console.log(JSON.stringify({ pass, fail, requests: browser.requests.length, catalog: catalog.length }, null, 2));
  process.exitCode = fail ? 1 : 0;
})().catch(error => {
  console.error(error && error.stack || error);
  process.exitCode = 1;
});
