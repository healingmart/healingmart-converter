#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const os = require('os');
const child = require('child_process');

const root = path.resolve(__dirname, '..');
let pass = 0;
let fail = 0;
function test(name, condition, detail) {
  if (condition) { pass += 1; console.log('PASS', name); }
  else { fail += 1; console.error('FAIL', name, detail || ''); }
}
function loadGlobal(file, globalName) {
  const context = { window: {}, Object };
  context.window.window = context.window;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
  return context.window[globalName];
}


function verifyTwoBuildStability() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'hm-converter-hash-'));
  try {
    fs.mkdirSync(path.join(temp, 'tools'), { recursive: true });
    fs.mkdirSync(path.join(temp, 'dist/data'), { recursive: true });
    [
      ['tools/build-unified-catalog.js', 'tools/build-unified-catalog.js'],
      ['release-config.json', 'release-config.json'],
      ['release-manifest.json', 'release-manifest.json'],
      ['dist/data/hm-converter-registry.v2.js', 'dist/data/hm-converter-registry.v2.js'],
      ['dist/data/hm-unit-registry.v1.js', 'dist/data/hm-unit-registry.v1.js']
    ].forEach(([source, target]) => {
      const destination = path.join(temp, target);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.copyFileSync(path.join(root, source), destination);
    });
    function run(generatedAt) {
      const result = child.spawnSync(process.execPath, ['tools/build-unified-catalog.js'], {
        cwd: temp,
        encoding: 'utf8',
        env: { ...process.env, HM_GENERATED_AT: generatedAt, HM_BUILD_DATE: '2026-07-30' }
      });
      if (result.status !== 0) throw new Error(result.stdout + result.stderr);
      const file = fs.readFileSync(path.join(temp, 'dist/data/hm-converter-search-index.v1.js'));
      const json = JSON.parse(fs.readFileSync(path.join(temp, 'dist/data/hm-converter-search-index.v1.json'), 'utf8'));
      return { sha: crypto.createHash('sha256').update(file).digest('hex'), hash: json.contentHash };
    }
    const first = run('2026-07-30T00:00:00+09:00');
    const second = run('2026-07-30T12:34:56+09:00');
    return first.sha === second.sha && first.hash === second.hash;
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}
const config = JSON.parse(fs.readFileSync(path.join(root, 'release-config.json'), 'utf8'));
const data = JSON.parse(fs.readFileSync(path.join(root, 'dist/data/hm-converters-data.v1.json'), 'utf8'));
const index = JSON.parse(fs.readFileSync(path.join(root, 'dist/data/hm-converter-search-index.v1.json'), 'utf8'));
const manifestPath = 'dist/catalog/hm-converter-public-manifest.v1.js';
const manifest = loadGlobal(manifestPath, 'HM_CONVERTER_PUBLIC_MANIFEST');
const hashPayload = {
  schema: index.schema,
  catalogVersion: index.catalogVersion,
  stats: index.stats,
  categories: index.categories,
  items: index.items
};
const calculatedHash = crypto.createHash('sha256').update(JSON.stringify(hashPayload)).digest('hex');
const clientSource = fs.readFileSync(path.join(root, 'dist/js/hm-converter-search-client.v1.js'), 'utf8');
const buildSource = fs.readFileSync(path.join(root, 'tools/build-unified-catalog.js'), 'utf8');

const published = data.items.filter(item => item.status === 'published').length;
const coming = data.items.filter(item => item.status !== 'published').length;
const visible = data.items.filter(item => item.searchVisible !== false).length;
const publishedVisible = data.items.filter(item => item.status === 'published' && item.searchVisible !== false).length;
const hidden = data.items.filter(item => item.searchVisible === false).length;

test('공개 매니페스트 파일 생성', fs.existsSync(path.join(root, manifestPath)));
test('공개 매니페스트 전역 이름', manifest && manifest.schemaVersion === 1);
test('공개 매니페스트 Object.freeze', Object.isFrozen(manifest));
test('release-config release 일치', manifest.release === config.release, manifest.release);
test('catalogVersion 일치', manifest.catalogVersion === config.catalogVersion, manifest.catalogVersion);
test('등록 개수 자동 일치', manifest.registeredCount === data.items.length, manifest.registeredCount);
test('공개 개수 자동 일치', manifest.publishedCount === published, manifest.publishedCount);
test('준비 중 개수 자동 일치', manifest.comingCount === coming, manifest.comingCount);
test('전체 검색 노출 자동 일치', manifest.searchVisibleCount === visible, manifest.searchVisibleCount);
test('공개 검색 노출 자동 일치', manifest.publishedSearchVisibleCount === publishedVisible, manifest.publishedSearchVisibleCount);
test('검색 숨김 자동 일치', manifest.searchHiddenCount === hidden, manifest.searchHiddenCount);
test('baseUrl 설정값 일치', manifest.baseUrl === config.publicBaseUrl, manifest.baseUrl);
test('검색 인덱스 URL 고정 경로', manifest.searchIndexUrl === config.publicBaseUrl.replace(/\/+$/, '/') + 'dist/data/hm-converter-search-index.v1.js', manifest.searchIndexUrl);
test('검색 인덱스 URL 로컬 파일 존재', fs.existsSync(path.join(root, new URL(manifest.searchIndexUrl).pathname.split('/healingmart-converter/')[1])));
test('순수 데이터 해시 일치', manifest.searchIndexHash === calculatedHash && index.contentHash === calculatedHash, `${manifest.searchIndexHash}/${calculatedHash}`);
test('검색 인덱스 generatedAt 제거', !Object.prototype.hasOwnProperty.call(index, 'generatedAt'));
const hashAgain = crypto.createHash('sha256').update(JSON.stringify(hashPayload)).digest('hex');
test('동일 내용 재해시 안정성', hashAgain === calculatedHash);
test('빌드 시각 변경 후 실제 인덱스·해시 동일', verifyTwoBuildStability());
test('클라이언트 release 쿼리 하드코딩 없음', !/hm-converter-search-index\.v1\.js\?v=\d/.test(clientSource));
test('클라이언트 loadLatest 제공', clientSource.includes('function loadLatest()') && clientSource.includes('loadLatest: loadLatest'));
test('클라이언트 publicItems 제공', clientSource.includes('function publicItems()') && clientSource.includes('publicItems: publicItems'));
test('준비 이벤트는 공개 검색 목록 사용', clientSource.includes('catalog: publicItems()'));
test('loadLatest는 공개 검색 목록 반환', /var catalog = publicItems\(\);/.test(clientSource));
test('빌드 release 상수 하드코딩 제거', !/const RELEASE\s*=\s*['"]\d/.test(buildSource));
test('빌드 catalogVersion 상수 하드코딩 제거', !/const CATALOG_VERSION\s*=\s*['"]\d/.test(buildSource));
test('출력 파일명 release 동적 생성', buildSource.includes('converter-inventory-v${RELEASE}.csv') && buildSource.includes('CONVERTER_AUDIT_v${RELEASE}.txt'));
test('별도 대형 공개 피드 빌드 없음', !fs.existsSync(path.join(root, 'tools/build-public-tools-feed.js')) && !fs.existsSync(path.join(root, 'dist/public/hm-tools-source.converter.v1.js')));

console.log(JSON.stringify({ pass, fail, registered: data.items.length, publishedVisible, hash: calculatedHash }, null, 2));
process.exitCode = fail ? 1 : 0;
