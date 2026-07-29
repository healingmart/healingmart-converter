#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
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
    console.error('FAIL', name, detail == null ? '' : detail);
  }
}

function extractNamedFunction(source, name) {
  const marker = 'function ' + name + '(';
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(name + ' 함수를 찾을 수 없습니다.');
  const brace = source.indexOf('{', start);
  if (brace < 0) throw new Error(name + ' 함수 본문을 찾을 수 없습니다.');
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let i = brace; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(name + ' 함수 끝을 찾을 수 없습니다.');
}

function nearly(actual, expected, tolerance = 1e-4) {
  return Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance;
}

const appPaths = [
  'dist/js/hm-converter-app.v3.34.1.js',
  'js/hm-converter-app.v3.34.1.js',
  'hm-converter-app.v3.34.1.js'
];
const browserPaths = appPaths.concat([
  'HealingMart_Converter_Blogger_v3.55.1.html',
  'blogger-converter.html'
]);
const appSources = appPaths.map(rel => fs.readFileSync(path.join(root, rel), 'utf8'));

test('앱 3개 복사본 동일', appSources[0] === appSources[1] && appSources[1] === appSources[2]);
test('배포 대상에 l100km 잘못된 ID 없음', browserPaths.every(rel => !fs.readFileSync(path.join(root, rel), 'utf8').includes("u.id==='l100km'")));
test('배포 대상이 l100 ID 사용', browserPaths.every(rel => fs.readFileSync(path.join(root, rel), 'utf8').includes("u.id==='l100'")));

const registryContext = { window: {} };
vm.createContext(registryContext);
vm.runInContext(fs.readFileSync(path.join(root, 'dist/data/hm-unit-registry.v1.js'), 'utf8'), registryContext, {
  filename: 'hm-unit-registry.v1.js'
});
const unitData = registryContext.window.HM_UNIT_CONVERTER_DATA;
const fuel = unitData && unitData.groups && unitData.groups.fuel;
const units = fuel && fuel.units || [];
function unit(id) { return units.find(item => item.id === id); }

test('연비 레지스트리에 l100 존재', !!unit('l100'));
test('연비 레지스트리에 l100km 미존재', !unit('l100km'));

const functionSource = extractNamedFunction(appSources[0], 'convertReciprocal');
const functionContext = {};
vm.createContext(functionContext);
vm.runInContext(functionSource + '\nthis.convertReciprocal = convertReciprocal;', functionContext, {
  filename: 'convertReciprocal-extracted.js'
});
const convert = functionContext.convertReciprocal;

const kmpl = unit('kmpl');
const l100 = unit('l100');
const mpgus = unit('mpgus');
const mpguk = unit('mpguk');

test('20 km/L = 5 L/100km', nearly(convert(fuel, 20, kmpl, l100), 5), convert(fuel, 20, kmpl, l100));
test('5 L/100km = 20 km/L', nearly(convert(fuel, 5, l100, kmpl), 20), convert(fuel, 5, l100, kmpl));
test('30 mpg US ≈ 7.84049 L/100km', nearly(convert(fuel, 30, mpgus, l100), 7.84049), convert(fuel, 30, mpgus, l100));
test('40 mpg UK ≈ 7.06207 L/100km', nearly(convert(fuel, 40, mpguk, l100), 7.06207), convert(fuel, 40, mpguk, l100));

console.log(JSON.stringify({ pass, fail }, null, 2));
process.exitCode = fail ? 1 : 0;
