#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(root, 'release-config.json'), 'utf8'));
let pass = 0;
let fail = 0;
function test(name, condition, detail) {
  if (condition) { pass += 1; console.log('PASS', name); }
  else { fail += 1; console.error('FAIL', name, detail || ''); }
}
function loadWindowScripts(files) {
  const context = { window: {}, document: {}, URL, console, Object, setTimeout, clearTimeout, Promise, Date, CustomEvent: function CustomEvent(type, init) { this.type = type; this.detail = init && init.detail; } };
  context.window.window = context.window;
  context.window.location = { href: 'https://example.com/p/converter.html' };
  context.window.setTimeout = setTimeout;
  context.window.clearTimeout = clearTimeout;
  context.window.CustomEvent = context.CustomEvent;
  context.window.dispatchEvent = function () {};
  vm.createContext(context);
  files.forEach(file => vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file }));
  return context.window;
}

const registryWindow = loadWindowScripts(['dist/data/hm-converter-registry.v2.js', 'dist/data/hm-unit-registry.v1.js']);
const platform = registryWindow.HM_CONVERTER_PLATFORM;
const units = registryWindow.HM_UNIT_CONVERTER_DATA;
const data = JSON.parse(fs.readFileSync(path.join(root, 'dist/data/hm-converters-data.v1.json'), 'utf8'));
const index = JSON.parse(fs.readFileSync(path.join(root, 'dist/data/hm-converter-search-index.v1.json'), 'utf8'));
const routes = JSON.parse(fs.readFileSync(path.join(root, 'dist/data/hm-converter-routes.v1.json'), 'utf8'));
const manifestWindow = loadWindowScripts(['dist/catalog/hm-converter-public-manifest.v1.js']);
const publicManifest = manifestWindow.HM_CONVERTER_PUBLIC_MANIFEST;
const ids = data.items.map(item => item.id);
const indexIds = index.items.map(item => item.i);
const routeIds = Object.keys(routes.items);
const sourceTotal = platform.converters.length + units.converters.length;
const published = data.items.filter(item => item.status === 'published').length;
const coming = data.items.filter(item => item.status !== 'published').length;
const searchVisible = data.items.filter(item => item.searchVisible !== false).length;
const publishedSearchVisible = data.items.filter(item => item.status === 'published' && item.searchVisible !== false).length;
const searchHidden = data.items.filter(item => item.searchVisible === false).length;

// 일반 계약: 고정 개수가 아니라 원본·생성물 상호 일치만 검사한다.
test('release-config release 일치', data.release === config.release, data.release);
test('원본 합계 = 통합 카탈로그', sourceTotal === data.items.length, `${sourceTotal}/${data.items.length}`);
test('원본 platform 개수 일치', data.stats.platform === platform.converters.length, data.stats.platform);
test('원본 unit 개수 일치', data.stats.unit === units.converters.length, data.stats.unit);
test('등록 통계 일치', data.stats.registered === data.items.length, data.stats.registered);
test('공개 통계 일치', data.stats.published === published, data.stats.published);
test('준비 중 통계 일치', data.stats.coming === coming, data.stats.coming);
test('전체 검색 노출 통계 일치', data.stats.searchVisible === searchVisible, data.stats.searchVisible);
test('공개 검색 노출 통계 일치', data.stats.publishedSearchVisible === publishedSearchVisible, data.stats.publishedSearchVisible);
test('검색 숨김 통계 일치', data.stats.searchHidden === searchHidden, data.stats.searchHidden);
test('종류 합계 일치', data.stats.file + data.stats.text + data.stats.unitKind + data.stats.special === data.items.length, JSON.stringify(data.stats));
test('canonical 중복 없음', new Set(ids).size === ids.length);
test('canonical 소문자 규칙', ids.every(id => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)));
test('검색 ID = 카탈로그 ID', indexIds.length === ids.length && ids.every(id => indexIds.includes(id)));
test('주소 ID = 카탈로그 ID', routeIds.length === ids.length && ids.every(id => routes.items[id]));
test('duplicateOf 대상 유효', data.items.filter(item => item.duplicateOf).every(item => ids.includes(item.duplicateOf)));
test('검색 인덱스 generatedAt 없음', !Object.prototype.hasOwnProperty.call(index, 'generatedAt'));
test('검색 인덱스 contentHash 있음', /^[0-9a-f]{64}$/.test(index.contentHash || ''), index.contentHash);
test('공개 매니페스트 등록 개수 일치', publicManifest.registeredCount === data.items.length, publicManifest.registeredCount);
test('공개 매니페스트 공개 개수 일치', publicManifest.publishedCount === published, publicManifest.publishedCount);
test('공개 매니페스트 기본 검색 개수 일치', publicManifest.publishedSearchVisibleCount === publishedSearchVisible, publicManifest.publishedSearchVisibleCount);
test('공개 매니페스트 해시 일치', publicManifest.searchIndexHash === index.contentHash, publicManifest.searchIndexHash);
test('신규 항목 addedAt 보유', data.items.filter(item => item.addedIn).every(item => /^\d{4}-\d{2}-\d{2}$/.test(item.addedAt || '')));

const searchWindow = loadWindowScripts(['dist/data/hm-converter-search-index.v1.js', 'dist/js/hm-converter-search-client.v1.js']);
const search = searchWindow.HM_CONVERTER_SEARCH;
let result = search.search('평방미터', { limit: 5 });
test('평방미터 1위', result.items[0] && result.items[0].id === 'unit-m2-pyeong', result.items.map(item => item.id).join(','));
result = search.search('㎡', { limit: 10 });
test('㎡ 동점도 제외', !result.items.some(item => item.id === 'unit-viscosity-kinematic-converter'), result.items.map(item => item.id).join(','));
result = search.search('MB GB', { limit: 5 });
test('MB 바이트 우선', result.items[0] && result.items[0].id === 'unit-megabyte-gigabyte', result.items.map(item => item.id).join(','));
result = search.search('Mb', { limit: 100 });
test('Mb와 MB 구분', !result.items.some(item => item.id === 'unit-megabyte-gigabyte'), result.items.map(item => item.id).join(','));
function exactUnitOnly(query, requireResult) {
  const found = search.search(query, { limit: 100 });
  return (!requireResult || found.items.length > 0) && found.items.every(item => (item.exactTokens || []).includes(query));
}
test('Mb exactTokens 완전 일치', exactUnitOnly('Mb', true));
test('Mb roman-number·MBq 오탐 제거', !result.items.some(item => item.id === 'roman-number' || item.id === 'unit-radioactivity-converter' || item.id === 'unit-mci-mbq'));
test('MB exactTokens 완전 일치', exactUnitOnly('MB'));
test('GB exactTokens 완전 일치', exactUnitOnly('GB'));
test('Gb exactTokens 완전 일치', exactUnitOnly('Gb'));
test('kB exactTokens 완전 일치', exactUnitOnly('kB'));
test('kb exactTokens 완전 일치', exactUnitOnly('kb'));
test('MB/s exactTokens 완전 일치', exactUnitOnly('MB/s'));
test('Mbps exactTokens 완전 일치', exactUnitOnly('Mbps'));
result = search.search('XLSX CSV', { limit: 20 });
test('XLSX 중복 숨김', result.items.filter(item => item.id === 'xlsx-csv').length === 1 && !result.items.some(item => item.id === 'doc-xlsx-csv'), result.items.map(item => item.id).join(','));
const comingIds = data.items.filter(item => item.status !== 'published').map(item => item.id);
const comingQuery = data.items.find(item => item.status !== 'published');
if (comingQuery) {
  result = search.search(`${comingQuery.from} ${comingQuery.to}`, { limit: 100 });
  test('기본 검색에서 coming 제외', !result.items.some(item => comingIds.includes(item.id)), result.items.map(item => item.id).join(','));
  result = search.search(`${comingQuery.from} ${comingQuery.to}`, { limit: 100, includeComing: true });
  test('includeComing에서 coming 노출', result.items.some(item => item.id === comingQuery.id), result.items.map(item => item.id).join(','));
}
const sample = search.all()[0];
test('외부 공통 type=converter', sample && sample.type === 'converter', sample && sample.type);
const legacy = search.find('unit-MB-GB');
test('구 canonical 검색 호환', legacy && legacy.id === 'unit-megabyte-gigabyte');
const url = search.buildUrl('https://example.com/p/converter.html', 'unit-megabyte-gigabyte', { from: 'MB', to: 'GB' });
test('단위 from/to 주소', url.includes('tool=unit-megabyte-gigabyte') && url.includes('from=MB') && url.includes('to=GB'), url);
const appSource = fs.readFileSync(path.join(root, 'dist/js/hm-converter-app.v3.34.1.js'), 'utf8');
test('앱 단독 단위 exactTokens 필터 유지', appSource.includes('function hmStrictExactUnitToken') && appSource.includes('if(strictExact&&hmUnitExactTokens(x).indexOf(strictExact)<0)return-1'));

console.log(JSON.stringify({ pass, fail, sourceTotal, publishedSearchVisible }, null, 2));
process.exitCode = fail ? 1 : 0;
