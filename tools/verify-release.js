#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');
const child = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const WRITE = process.argv.includes('--write');
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'release-config.json'), 'utf8'));
const release = String(config.release);
const catalogVersion = String(config.catalogVersion);
const listFile = path.join(ROOT, `release-files-v${release}.json`);
const releaseList = JSON.parse(fs.readFileSync(listFile, 'utf8'));
if (releaseList.release !== release) throw new Error('release-files release 불일치');
const paths = releaseList.files;
const bloggerFile = `HealingMart_Converter_Blogger_v${release}.html`;
const inventoryFile = `audit/converter-inventory-v${release}.csv`;

function walkFiles(dir, predicate, out = []) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
    if (entry.name === '.git' || entry.name === 'node_modules') return;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, predicate, out);
    else if (predicate(full)) out.push(full);
  });
  return out;
}
function testCounts(rel) {
  const result = child.spawnSync(process.execPath, [path.join(ROOT, rel)], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`${rel} 실패\n${result.stdout}\n${result.stderr}`);
  const lines = result.stdout.trim().split(/\r?\n/);
  return {
    pass: lines.filter(line => line.startsWith('PASS ')).length,
    fail: lines.filter(line => line.startsWith('FAIL ')).length
  };
}
function actualReleaseMetadata() {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'dist/data/hm-converters-data.v1.json'), 'utf8'));
  const indexData = JSON.parse(fs.readFileSync(path.join(ROOT, 'dist/data/hm-converter-search-index.v1.json'), 'utf8'));
  const catalogCounts = testCounts('test/hm-converter-catalog-test.v1.1.0.js');
  const fuelCounts = testCounts('test/hm-converter-fuel-regression.v1.js');
  return {
    releaseType: 'full-github-autolink-release',
    javascriptSyntaxFiles: walkFiles(ROOT, file => file.endsWith('.js')).length,
    catalogTestPass: catalogCounts.pass,
    catalogTestFail: catalogCounts.fail,
    fuelRegressionPass: fuelCounts.pass,
    fuelRegressionFail: fuelCounts.fail,
    catalogSearchIndexBytes: fs.statSync(path.join(ROOT, 'dist/data/hm-converter-search-index.v1.js')).size,
    unifiedCatalogBytes: fs.statSync(path.join(ROOT, 'dist/data/hm-converters-data.v1.js')).size,
    routeMapBytes: fs.statSync(path.join(ROOT, 'dist/data/hm-converter-routes.v1.js')).size,
    platformRegistryItems: data.stats.platform,
    unitRegistryItems: data.stats.unit,
    catalogItems: data.stats.registered,
    publishedCatalogItems: data.stats.published,
    comingCatalogItems: data.stats.coming,
    searchVisibleItems: data.stats.searchVisible,
    publishedSearchVisibleItems: data.stats.publishedSearchVisible,
    searchHiddenDuplicates: data.stats.searchHidden,
    requiredRepositoryFiles: paths.length + 1,
    repositoryChecksumFiles: paths.length + 1,
    patchArchiveFiles: 0,
    publicManifest: 'dist/catalog/hm-converter-public-manifest.v1.js',
    latestLoader: 'HM_CONVERTER_SEARCH.loadLatest',
    browserSelfTestDynamicCounts: true,
    loadLatestReturnsPublicItems: true,
    publicCatalogItems: data.stats.publishedSearchVisible,
    publicSearchIndexHash: indexData.contentHash
  };
}
function syncOrCheckReleaseManifest() {
  const rel = path.join(ROOT, 'release-manifest.json');
  const current = JSON.parse(fs.readFileSync(rel, 'utf8'));
  const actual = actualReleaseMetadata();
  if (WRITE) {
    Object.assign(current, actual);
    current.catalogContractTests = [
      'test/hm-converter-catalog-test.v1.1.0.js',
      'test/hm-converter-public-manifest-contract.v1.js',
      'test/hm-converter-latest-loader-contract.v1.js',
      'test/hm-converter-fuel-regression.v1.js',
      'test/hm-converter-expansion-contract.v1.js'
    ];
    fs.writeFileSync(rel, JSON.stringify(current, null, 2) + '\n');
  } else {
    Object.keys(actual).forEach(key => {
      if (JSON.stringify(current[key]) !== JSON.stringify(actual[key])) {
        throw new Error(`release-manifest 실제값 불일치: ${key} (${JSON.stringify(current[key])} != ${JSON.stringify(actual[key])})`);
      }
    });
  }
}

syncOrCheckReleaseManifest();

function sha(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function info(rel) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) throw new Error('누락: ' + rel);
  return { bytes: fs.statSync(file).size, sha256: sha(file) };
}
function checkJs(rel) { new vm.Script(fs.readFileSync(path.join(ROOT, rel), 'utf8'), { filename: rel }); }
function embeddedApp() {
  const html = fs.readFileSync(path.join(ROOT, bloggerFile), 'utf8');
  const marker = '<!-- ===== Embedded converter app core v3.34.1 ===== -->';
  const start = html.indexOf(marker);
  if (start < 0) throw new Error('Blogger app marker 없음');
  const open = html.indexOf('//<![CDATA[', start) + '//<![CDATA['.length;
  const close = html.indexOf('//]]>', open);
  return html.slice(open, close).trim();
}
function runTest(rel) {
  const result = child.spawnSync(process.execPath, [path.join(ROOT, rel)], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`${rel} 실패\n${result.stdout}\n${result.stderr}`);
  return result.stdout.trim().split(/\r?\n/).slice(-6);
}

const files = {};
paths.forEach(rel => { files[rel] = info(rel); });
const jsFiles = paths.filter(rel => rel.endsWith('.js'));
jsFiles.forEach(checkJs);
const copies = ['dist/js/hm-converter-app.v3.34.1.js', 'js/hm-converter-app.v3.34.1.js', 'hm-converter-app.v3.34.1.js']
  .map(rel => fs.readFileSync(path.join(ROOT, rel), 'utf8'));
if (!(copies[0] === copies[1] && copies[1] === copies[2])) throw new Error('App 3개 복사본 불일치');
if (embeddedApp() !== copies[0].trim()) throw new Error('Blogger 내장 app 불일치');
const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
if (!indexHtml.includes(`hm-converter-app.v3.34.1.js?v=${release}`)) throw new Error('index 캐시 버전 불일치');

const testFiles = [
  'test/hm-converter-catalog-test.v1.1.0.js',
  'test/hm-converter-public-manifest-contract.v1.js',
  'test/hm-converter-latest-loader-contract.v1.js',
  'test/hm-converter-fuel-regression.v1.js',
  'test/hm-converter-expansion-contract.v1.js'
];
const testResults = Object.fromEntries(testFiles.map(rel => [rel, runTest(rel)]));
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'dist/data/hm-converters-data.v1.json'), 'utf8'));
const indexData = JSON.parse(fs.readFileSync(path.join(ROOT, 'dist/data/hm-converter-search-index.v1.json'), 'utf8'));
const routes = JSON.parse(fs.readFileSync(path.join(ROOT, 'dist/data/hm-converter-routes.v1.json'), 'utf8'));
const manifest = {
  release,
  catalogVersion,
  generatedAt: new Date().toISOString(),
  counts: data.stats,
  publicSearchIndexHash: indexData.contentHash,
  files: Object.fromEntries(Object.entries(files).filter(([rel]) =>
    rel.startsWith('dist/data/') || rel.startsWith('dist/catalog/') ||
    rel.startsWith('dist/js/hm-converter-') || rel === bloggerFile ||
    rel === inventoryFile || rel.startsWith('test/hm-converter-') || rel === 'release-config.json'
  ))
};
if (WRITE) {
  fs.writeFileSync(path.join(ROOT, 'converter-catalog-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  const finalPaths = paths.concat(['converter-catalog-manifest.json']).filter((value, index, array) => array.indexOf(value) === index).sort();
  const lines = finalPaths.map(rel => sha(path.join(ROOT, rel)) + '  ' + rel);
  fs.writeFileSync(path.join(ROOT, 'CHECKSUMS.txt'), lines.join('\n') + '\n');
} else {
  const checksum = fs.readFileSync(path.join(ROOT, 'CHECKSUMS.txt'), 'utf8').trim().split(/\r?\n/).filter(Boolean);
  const map = new Map(checksum.map(line => {
    const match = line.match(/^([0-9a-f]{64})\s{2}(.+)$/);
    if (!match) throw new Error('CHECKSUMS 형식 오류: ' + line);
    return [match[2], match[1]];
  }));
  paths.concat(['converter-catalog-manifest.json']).forEach(rel => {
    if (map.get(rel) !== sha(path.join(ROOT, rel))) throw new Error('체크섬 불일치: ' + rel);
  });
}
console.log(JSON.stringify({
  ok: true,
  release,
  files: paths.length + 1,
  javascript: jsFiles.length,
  catalogItems: data.items.length,
  publishedSearchVisible: data.stats.publishedSearchVisible,
  searchItems: indexData.items.length,
  searchIndexHash: indexData.contentHash,
  routeItems: Object.keys(routes.items).length,
  tests: testResults
}, null, 2));
