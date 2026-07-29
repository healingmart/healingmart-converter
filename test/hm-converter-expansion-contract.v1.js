#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const child = require('child_process');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
let pass = 0;
let fail = 0;

function test(name, condition, detail) {
  if (condition) {
    pass += 1;
    console.log('PASS', name);
  } else {
    fail += 1;
    console.error('FAIL', name, detail || '');
  }
}

function sha(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function quietConsole() {
  return {
    log() {}, error() {}, warn() {}, info() {}, group() {}, groupEnd() {}, table() {}
  };
}

async function runBrowserSelfTest(repoRoot) {
  const selfManifest = JSON.parse(fs.readFileSync(path.join(repoRoot, 'self-test-manifest.json'), 'utf8'));
  const context = {
    console: quietConsole(),
    URL,
    Promise,
    Date,
    Object,
    Set,
    Array,
    Math,
    JSON,
    String,
    Number,
    RegExp,
    setTimeout,
    clearTimeout,
    setImmediate,
    window: {},
    document: {}
  };
  context.CustomEvent = function CustomEvent(type, init) {
    this.type = type;
    this.detail = init && init.detail;
  };
  Object.assign(context.window, {
    window: context.window,
    location: { href: 'https://www.healing-mart.com/p/converter.html' },
    setTimeout,
    clearTimeout,
    CustomEvent: context.CustomEvent,
    dispatchEvent() {},
    HM_CONVERTER_APP_API: { version: selfManifest.appVersion }
  });
  context.document.currentScript = {
    src: 'https://local.test/test/hm-converter-self-test.v1.28.0.js'
  };
  context.document.createElement = function createElement() {
    return { async: false, src: '', onload: null, onerror: null };
  };
  vm.createContext(context);
  context.document.head = {
    appendChild(script) {
      setImmediate(() => {
        try {
          const url = new URL(script.src, 'https://local.test/');
          const rel = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
          const file = path.join(repoRoot, rel);
          vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: rel });
          if (script.onload) script.onload();
        } catch (error) {
          if (script.onerror) script.onerror(error);
        }
      });
    }
  };
  vm.runInContext(
    fs.readFileSync(path.join(repoRoot, 'test/hm-converter-self-test.v1.28.0.js'), 'utf8'),
    context,
    { filename: 'test/hm-converter-self-test.v1.28.0.js' }
  );
  const deadline = Date.now() + 5000;
  while (!context.window.HM_CONVERTER_SELF_TEST_RESULT && Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  if (!context.window.HM_CONVERTER_SELF_TEST_RESULT) {
    throw new Error('브라우저 Self-Test 결과 대기 시간 초과');
  }
  return context.window.HM_CONVERTER_SELF_TEST_RESULT;
}

(async () => {
  const tempParent = fs.mkdtempSync(path.join(os.tmpdir(), 'hm-converter-expand-'));
  const temp = path.join(tempParent, 'repo');
  try {
    fs.cpSync(root, temp, {
      recursive: true,
      filter(source) {
        const rel = path.relative(root, source);
        return !rel.startsWith('.git') && !rel.includes('node_modules') && !rel.endsWith('.zip');
      }
    });
    const before = JSON.parse(fs.readFileSync(path.join(temp, 'dist/data/hm-converters-data.v1.json'), 'utf8'));
    const protectedFiles = ['examples/blogger-main-search.html', 'blogger-converter.html'];
    const protectedBefore = Object.fromEntries(protectedFiles.map(file => [file, sha(path.join(temp, file))]));
    const registryPath = path.join(temp, 'dist/data/hm-converter-registry.v2.js');
    fs.appendFileSync(registryPath,
      '\n(function(w){"use strict";w.HM_CONVERTER_PLATFORM.converters.push({' +
      'id:"contract-test-alpha-beta",name:"ALPHA → BETA",category:"developer",' +
      'fromFormat:"ALPHA",toFormat:"BETA",engine:"contract-test",status:"active",popular:false,' +
      'description:"자동 확장 계약 검사용 임시 변환기입니다.",accept:"",output:"txt",tags:["contract"],' +
      'addedIn:"3.55.1",addedAt:"2026-07-30",updatedAt:"2026-07-30"});})(window);\n',
      'utf8'
    );

    const build = child.spawnSync(process.execPath, ['tools/build-unified-catalog.js'], {
      cwd: temp,
      encoding: 'utf8',
      env: { ...process.env, HM_GENERATED_AT: '2026-07-30T01:00:00+09:00', HM_BUILD_DATE: '2026-07-30' }
    });
    test('임시 1개 추가 후 빌드 통과', build.status === 0, build.stdout + build.stderr);

    const after = JSON.parse(fs.readFileSync(path.join(temp, 'dist/data/hm-converters-data.v1.json'), 'utf8'));
    const index = JSON.parse(fs.readFileSync(path.join(temp, 'dist/data/hm-converter-search-index.v1.json'), 'utf8'));
    const manifestSource = fs.readFileSync(path.join(temp, 'dist/catalog/hm-converter-public-manifest.v1.js'), 'utf8');
    test('등록 개수 자동 +1', after.items.length === before.items.length + 1,
      before.items.length + '/' + after.items.length);
    test('통계 자동 +1', after.stats.registered === after.items.length, after.stats.registered);
    test('검색 인덱스 자동 추가', index.items.some(item => item.i === 'contract-test-alpha-beta'));
    test('공개 매니페스트 개수 자동 변경', manifestSource.includes('"registeredCount":' + after.items.length));

    const contract = child.spawnSync(process.execPath, ['test/hm-converter-catalog-test.v1.1.0.js'], {
      cwd: temp,
      encoding: 'utf8'
    });
    test('일반 테스트 코드 수정 없이 통과', contract.status === 0, contract.stdout + contract.stderr);

    const loaderTestSource = `const fs=require('fs'),vm=require('vm');const c={window:{},document:{},URL,console,setTimeout,clearTimeout,Promise,Date,CustomEvent:function(){}};Object.assign(c.window,{window:c.window,location:{href:'https://www.healing-mart.com/p/converter.html'},setTimeout,clearTimeout,CustomEvent:c.CustomEvent,dispatchEvent:function(){}});vm.createContext(c);vm.runInContext(fs.readFileSync('dist/data/hm-converter-search-index.v1.js','utf8'),c);vm.runInContext(fs.readFileSync('dist/js/hm-converter-search-client.v1.js','utf8'),c);const item=c.window.HM_CONVERTER_SEARCH.find('contract-test-alpha-beta');if(!item)process.exit(2);const url=c.window.HM_CONVERTER_SEARCH.buildUrl('https://www.healing-mart.com/p/converter.html',item);if(!url.includes('tool=contract-test-alpha-beta'))process.exit(3);`;
    const urlCheck = child.spawnSync(process.execPath, ['-e', loaderTestSource], { cwd: temp, encoding: 'utf8' });
    test('개별 주소 자동 생성', urlCheck.status === 0, urlCheck.stdout + urlCheck.stderr);

    const selfTestResult = await runBrowserSelfTest(temp);
    test('증가 시뮬레이션 브라우저 Self-Test 통과', selfTestResult.ok,
      selfTestResult.error || (selfTestResult.rows || []).filter(row => row.result === 'FAIL').map(row => row.test).join(', '));
    test('브라우저 Self-Test가 증가된 개수 사용',
      (selfTestResult.rows || []).some(row => row.test === '원본 레지스트리 합계와 통합 데이터 개수 일치' && row.result === 'PASS'));

    test('블로그 예제 파일 수정 없음', protectedFiles.every(file => protectedBefore[file] === sha(path.join(temp, file))));

    console.log(JSON.stringify({ pass, fail, before: before.items.length, after: after.items.length }, null, 2));
    process.exitCode = fail ? 1 : 0;
  } finally {
    fs.rmSync(tempParent, { recursive: true, force: true });
  }
})().catch(error => {
  console.error(error && error.stack || error);
  process.exitCode = 1;
});
