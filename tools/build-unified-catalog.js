#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const CONFIG_PATH = path.join(ROOT, 'release-config.json');
const CONFIG = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
const RELEASE = String(CONFIG.release || '').trim();
const CATALOG_VERSION = String(CONFIG.catalogVersion || '').trim();
const RELEASE_DATE = String(CONFIG.releaseDate || '').trim();
const PUBLIC_BASE_URL = String(CONFIG.publicBaseUrl || '').replace(/\/+$/, '') + '/';
const NEW_ITEM_DAYS = Math.max(0, Number(CONFIG.newItemDays) || 30);
const RELEASE_DATES = Object.freeze(Object.assign({
  '3.51.0': '2026-07-20',
  '3.52.0': '2026-07-21',
  '3.53.0': '2026-07-22',
  '3.54.0': '2026-07-23'
}, CONFIG.releaseDates || {}));
if (!RELEASE || !CATALOG_VERSION || !RELEASE_DATE || !/^https?:\/\//.test(PUBLIC_BASE_URL)) {
  throw new Error('release-config.json 설정이 올바르지 않습니다.');
}
function kstIso(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) throw new Error('빌드 시각이 올바르지 않습니다.');
  return new Date(date.getTime() + 9 * 60 * 60 * 1000).toISOString().replace('Z', '+09:00');
}
const generatedAt = process.env.HM_GENERATED_AT || kstIso();
const buildDate = process.env.HM_BUILD_DATE || generatedAt.slice(0, 10);


const UNIT_CANONICAL_IDS = {
  'GB-GiB': 'unit-gigabyte-gibibyte',
  'GB-TB': 'unit-gigabyte-terabyte',
  'gbps-MBps': 'unit-gigabit-per-second-megabyte-per-second',
  'MB-GB': 'unit-megabyte-gigabyte',
  'MB-MiB': 'unit-megabyte-mebibyte',
  'MBps-mbps': 'unit-megabyte-per-second-megabit-per-second',
  'mbps-MBps': 'unit-megabit-per-second-megabyte-per-second',
  'MiB-GiB': 'unit-mebibyte-gibibyte',
  'MiBps-mbps': 'unit-mebibyte-per-second-megabit-per-second',
  'kB-MB': 'unit-kilobyte-megabyte',
  'kbps-kBps': 'unit-kilobit-per-second-kilobyte-per-second',
  'Lmin-m3h': 'unit-liter-per-minute-cubic-meter-per-hour',
  'Ls-Lmin': 'unit-liter-per-second-liter-per-minute',
  'gpm-Lmin': 'unit-us-gallon-per-minute-liter-per-minute',
  'kgL-gmL': 'unit-kilogram-per-liter-gram-per-milliliter',
  'm3s-Ls': 'unit-cubic-meter-per-second-liter-per-second',
  'kohm-Mohm': 'unit-kiloohm-megaohm'
};

// 기존 주소는 유지하고 통합검색에서만 대표 항목 하나를 노출한다.
const DUPLICATE_OF_RUNTIME = {
  'doc-xlsx-csv': 'xlsx-csv',
  'doc-csv-xlsx': 'csv-xlsx',
  'decimal-binary-number': 'dec-bin',
  'binary-decimal-number': 'bin-dec',
  'decimal-hex-number': 'dec-hex',
  'hex-decimal-number': 'hex-dec',
  'decimal-octal-number': 'dec-oct',
  'octal-decimal-number': 'oct-dec',
  'binary-hex-number': 'bin-hex',
  'hex-binary-number': 'hex-bin',
  'binary-octal-number': 'bin-oct',
  'octal-binary-number': 'oct-bin',
  'token-authorization-bearer': 'bearer-token-header',
  'accept-language-header-json': 'accept-language-json',
  'json-accept-language-header': 'json-accept-language',
  'content-disposition-header-json': 'content-disposition-json',
  'json-content-disposition-header': 'json-content-disposition',
  'ml-uscup-kitchen': 'ml-uscup',
  'mbps-MBps': 'MBps-mbps'
};

const PRIMARY_PAIR_ALIASES = {
  'm2-pyeong': ['평방미터', '제곱미터', '㎡', 'm2', 'm²', '평수 계산', '아파트 면적'],
  'c-f': ['섭씨 화씨', '섭씨를 화씨로', '화씨를 섭씨로'],
  'MBps-mbps': ['MB/s Mbps', '메가바이트 초 메가비트 초']
};

function loadRegistries() {
  const context = { window: {} };
  context.window.window = context.window;
  vm.createContext(context);
  for (const file of ['dist/data/hm-converter-registry.v2.js', 'dist/data/hm-unit-registry.v1.js']) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), context, { filename: file });
  }
  return { platform: context.window.HM_CONVERTER_PLATFORM, units: context.window.HM_UNIT_CONVERTER_DATA };
}

function loadReleaseManifest() {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'release-manifest.json'), 'utf8')); }
  catch (_) { return { newConverters: [] }; }
}

function uniq(values, caseSensitive = false) {
  const out = [];
  const seen = new Set();
  for (const value of values.flat(Infinity)) {
    const text = String(value == null ? '' : value).trim();
    const key = caseSensitive ? text : text.toLocaleLowerCase('ko-KR');
    if (!text || seen.has(key)) continue;
    seen.add(key); out.push(text);
  }
  return out;
}

function normalizeSearch(value) {
  let text = String(value == null ? '' : value);
  if (text.normalize) text = text.normalize('NFKC');
  return text.toLowerCase()
    .replace(/㎡/g, ' m2 ').replace(/㎢/g, ' km2 ').replace(/㎠/g, ' cm2 ').replace(/㎟/g, ' mm2 ')
    .replace(/[²]/g, '2').replace(/[³]/g, '3').replace(/[μµ]/g, 'u')
    .replace(/[→↔⇄⇆/·,;:_\-]+/g, ' ')
    .replace(/[^0-9a-z가-힣+#.%]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeExactToken(value) {
  let text = String(value == null ? '' : value);
  if (text.normalize) text = text.normalize('NFKC');
  return text.replace(/\s+/g, '').trim();
}

const FORMAT_ALIASES = {
  JPG: ['jpg','jpeg','제이피지','사진','이미지'], JPEG: ['jpg','jpeg','제이피지','사진','이미지'],
  PNG: ['png','피엔지','투명 이미지','이미지'], WEBP: ['webp','웹피','웹 이미지','이미지'],
  HEIC: ['heic','아이폰 사진','아이폰 이미지'], AVIF: ['avif','에이비아이에프','이미지'],
  GIF: ['gif','움짤','움직이는 이미지'], SVG: ['svg','벡터 이미지'], BMP: ['bmp','비트맵'], TIFF: ['tiff','tif','고해상도 이미지'],
  PDF: ['pdf','피디에프','문서'], DOC: ['doc','word','워드','워드 문서'], DOCX: ['docx','word','워드','워드 문서'],
  XLS: ['xls','excel','엑셀','엑셀 파일'], XLSX: ['xlsx','excel','엑셀','엑셀 파일'],
  PPT: ['ppt','powerpoint','파워포인트','프레젠테이션'], PPTX: ['pptx','powerpoint','파워포인트','프레젠테이션'],
  HWP: ['hwp','한글','한글 문서'], HWPX: ['hwpx','한글','한글 문서'], TXT: ['txt','텍스트','메모장'], HTML: ['html','htm','웹 문서'],
  CSV: ['csv','쉼표 데이터','표 데이터'], TSV: ['tsv','탭 데이터','표 데이터'], JSON: ['json','제이슨','데이터'],
  XML: ['xml','엑스엠엘','데이터'], YAML: ['yaml','yml','야믈','데이터'], ZIP: ['zip','압축','압축 파일'], '7Z': ['7z','세븐집','압축'],
  RAR: ['rar','압축'], MP4: ['mp4','동영상','영상'], MOV: ['mov','동영상','아이폰 영상'], MKV: ['mkv','동영상'], AVI: ['avi','동영상'],
  WEBM: ['webm','웹 동영상'], MP3: ['mp3','음원','오디오'], WAV: ['wav','웨이브','오디오'], M4A: ['m4a','오디오'],
  AAC: ['aac','오디오'], FLAC: ['flac','무손실 음원'], SRT: ['srt','자막'], VTT: ['vtt','웹 자막'],
  EPUB: ['epub','전자책'], MOBI: ['mobi','킨들','전자책'], AZW3: ['azw3','킨들','전자책'],
  TTF: ['ttf','폰트','글꼴'], OTF: ['otf','폰트','글꼴'], WOFF: ['woff','웹폰트'], WOFF2: ['woff2','웹폰트']
};

const CATEGORY_KEYWORDS = {
  pdf:['pdf 변환','피디에프 변환'],document:['문서 변환','오피스 변환'],image:['이미지 변환','사진 변환'],video:['동영상 변환','영상 변환'],
  audio:['오디오 변환','음원 변환'],hwp:['한글 문서 변환'],data:['데이터 변환','표 변환'],subtitle:['자막 변환'],ebook:['전자책 변환'],
  archive:['압축 변환'],font:['폰트 변환','글꼴 변환'],developer:['텍스트 변환','개발자 도구','코드 변환'],color:['색상 코드 변환','컬러 변환'],
  other:['기타 변환'],unit:['단위 변환','단위 계산']
};

const UNIT_KEYWORDS = {
  pyeong:['평수','아파트 면적','부동산 면적'], m2:['㎡','m²','제곱미터','평방미터'], km2:['㎢','km²','제곱킬로미터'],
  cm2:['㎠','cm²','제곱센티미터'], mm2:['㎟','mm²','제곱밀리미터'], kg:['킬로그램','키로그램','키로그람'],
  g:['그램'],lb:['파운드','lbs'],oz:['온스'],c:['섭씨','celsius','°C'],f:['화씨','fahrenheit','°F'],k:['켈빈','kelvin'],
  l:['리터','liter','litre'],ml:['밀리리터'],km:['킬로미터'],m:['미터'],cm:['센티미터'],mm:['밀리미터'],in:['인치','inch'],
  ft:['피트','feet','foot'],mi:['마일','mile'],kph:['km/h','킬로미터 매 시'],mph:['mile per hour','마일 매 시']
};

function formatTerms(format) { const raw=String(format||'').trim(); return uniq([raw, FORMAT_ALIASES[raw.toUpperCase()]||[]]); }
function converterKind(item) { if(item.category==='developer')return'text';if(item.category==='color'||item.category==='other')return'special';return'file'; }
function categoryNameMap(platform){return Object.fromEntries(platform.categories.map(c=>[c.id,c.name]));}
function unitLookup(group){return new Map(group&&Array.isArray(group.units)?group.units.map(u=>[u.id,u]):[]);}
function unitTerms(unit){if(!unit)return[];return uniq([unit.id,unit.name,unit.symbol,UNIT_KEYWORDS[unit.id]||[],String(unit.symbol||'').replace(/²/g,'2').replace(/³/g,'3').replace(/[μµ]/g,'u')]);}
function unitExactTokens(item, fromUnit, toUnit){return uniq(uniq([item.from,item.to,fromUnit&&fromUnit.symbol,toUnit&&toUnit.symbol],true).map(normalizeExactToken).filter(Boolean),true);}
function canonicalUnitId(runtimeId){return UNIT_CANONICAL_IDS[runtimeId]||`unit-${String(runtimeId).toLowerCase()}`;}
function canonicalForRuntime(runtimeId, source){return source==='unit'?canonicalUnitId(runtimeId):runtimeId;}

function daysBetween(fromDate, toDate) {
  if (!fromDate || !toDate) return Infinity;
  const from = new Date(`${fromDate}T00:00:00Z`);
  const to = new Date(`${toDate}T00:00:00Z`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return Infinity;
  return Math.floor((to.getTime() - from.getTime()) / 86400000);
}

function releaseMetadata(sourceItem, manifest){
  const id = sourceItem.id;
  const list=Array.isArray(manifest.newConverters)?manifest.newConverters:[];
  const index=list.indexOf(id);
  let addedIn=sourceItem.addedIn||null;
  if(!addedIn && index>=0) addedIn=index<30?'3.51.0':index<60?'3.52.0':index<90?'3.53.0':'3.54.0';
  const addedAt=sourceItem.addedAt||RELEASE_DATES[addedIn]||null;
  const updatedAt=sourceItem.updatedAt||addedAt||null;
  const age=daysBetween(addedAt,buildDate);
  return{addedIn,addedAt,updatedAt,isNew:Boolean(addedAt&&age>=0&&age<NEW_ITEM_DAYS)};
}

function applySearchFields(item){
  item.normalizedName=normalizeSearch(item.name);
  item.normalizedShortName=normalizeSearch(item.shortName);
  item.normalizedAliases=uniq(item.aliases.map(normalizeSearch));
  item.normalizedKeywords=uniq(item.keywords.map(normalizeSearch));
  item.normalizedFrom=normalizeSearch(item.from);
  item.normalizedTo=normalizeSearch(item.to);
  item.searchText=normalizeSearch([item.id,item.runtimeId,item.legacyIds||[],item.name,item.shortName,item.category,item.subcategory,item.aliases,item.keywords,item.from,item.to].flat(Infinity).join(' '));
  return item;
}

function buildCatalog(platform, units, manifest){
  const categoryNames=categoryNameMap(platform);const mainByPair=new Map();
  platform.converters.forEach(item=>{const key=`${String(item.fromFormat||'').toUpperCase()}::${String(item.toFormat||'').toUpperCase()}`;if(!mainByPair.has(key))mainByPair.set(key,[]);mainByPair.get(key).push(item);});
  let featuredOrder=0;
  const mainItems=platform.converters.map((item,index)=>{
    const fromTerms=formatTerms(item.fromFormat),toTerms=formatTerms(item.toFormat),reverseKey=`${String(item.toFormat||'').toUpperCase()}::${String(item.fromFormat||'').toUpperCase()}`;
    const reverse=(mainByPair.get(reverseKey)||[]).find(candidate=>candidate.id!==item.id);
    const aliases=uniq([`${item.fromFormat}를 ${item.toFormat}로`,`${item.fromFormat} ${item.toFormat} 변환`,`${item.fromFormat}에서 ${item.toFormat}`,item.tags||[]]);
    const keywords=uniq([CATEGORY_KEYWORDS[item.category]||[],categoryNames[item.category]||item.category,item.engine,fromTerms,toTerms]);
    const meta=releaseMetadata(item,manifest),duplicateRuntime=DUPLICATE_OF_RUNTIME[item.id]||null;
    const result={id:item.id,runtimeId:item.id,source:'platform',type:'converter',converterKind:converterKind(item),name:item.name,shortName:`${item.fromFormat} → ${item.toFormat}`,
      category:item.category,subcategory:item.engine,description:item.description,aliases,keywords,from:item.fromFormat,to:item.toFormat,inputUnit:null,outputUnit:null,
      exactTokens:[],supportedDirections:[{from:item.fromFormat,to:item.toFormat,runtimeId:item.id}],pairId:`${item.category}-${[String(item.fromFormat||'').toLowerCase(),String(item.toFormat||'').toLowerCase()].sort().join('-')}`.replace(/[^a-z0-9-]+/g,'-').replace(/-+/g,'-'),
      reverseId:reverse?reverse.id:null,route:`?tool=${encodeURIComponent(item.id)}`,legacyRoute:`?category=${encodeURIComponent(item.category)}&convert=${encodeURIComponent(item.id)}`,
      legacyIds:[item.id],status:item.status==='active'?'published':'coming',featured:Boolean(item.popular),featuredOrder:item.popular?++featuredOrder:0,
      addedIn:meta.addedIn,addedAt:meta.addedAt,updatedAt:meta.updatedAt,isNew:meta.isNew,searchVisible:!duplicateRuntime,duplicateOf:duplicateRuntime?canonicalForRuntime(duplicateRuntime,'platform'):null,
      serverRequired:Boolean(item.serverRequired),accept:item.accept||'',output:item.output||'',engine:item.engine,order:index+1};
    return applySearchFields(result);
  });

  const unitItems=units.converters.map((item,index)=>{
    const group=units.groups[item.group],lookup=unitLookup(group),fromUnit=lookup.get(item.from),toUnit=lookup.get(item.to);
    const fromTerms=unitTerms(fromUnit),toTerms=unitTerms(toUnit),canonicalId=canonicalUnitId(item.id),oldCanonical=`unit-${item.id}`;
    const primaryAliases=PRIMARY_PAIR_ALIASES[item.id]||[];
    const aliases=uniq([`${fromUnit?fromUnit.name:item.from}를 ${toUnit?toUnit.name:item.to}로`,`${toUnit?toUnit.name:item.to}를 ${fromUnit?fromUnit.name:item.from}로`,
      `${fromUnit?fromUnit.symbol:item.from} ${toUnit?toUnit.symbol:item.to} 변환`,item.name.replace(/\s*변환기\s*$/,''),primaryAliases]);
    const keywords=uniq(['단위 변환',units.categories.find(c=>c.id===item.category)?.name||item.category,group?group.name:item.group,group?group.note:'',fromTerms,toTerms]);
    const duplicateRuntime=DUPLICATE_OF_RUNTIME[item.id]||null;
    const result={id:canonicalId,runtimeId:item.id,source:'unit',type:'converter',converterKind:item.toolType==='unit'?'unit':'special',name:item.name,
      shortName:`${fromUnit?fromUnit.symbol:item.from} ↔ ${toUnit?toUnit.symbol:item.to}`,category:'unit',subcategory:item.category,description:item.description,
      aliases,keywords,from:item.from,to:item.to,inputUnit:item.from,outputUnit:item.to,exactTokens:unitExactTokens(item,fromUnit,toUnit),
      supportedDirections:[{from:item.from,to:item.to,runtimeId:item.id},{from:item.to,to:item.from,runtimeId:item.id}],pairId:canonicalId,reverseId:canonicalId,
      route:`?tool=${encodeURIComponent(canonicalId)}&from=${encodeURIComponent(item.from)}&to=${encodeURIComponent(item.to)}`,
      legacyRoute:`?category=unit&convert=${encodeURIComponent(item.id)}`,legacyIds:uniq([item.id,oldCanonical],true),status:item.enabled&&item.published?'published':'coming',
      featured:Boolean(item.popular),featuredOrder:item.popular?++featuredOrder:0,addedIn:item.addedIn||null,addedAt:item.addedAt||null,updatedAt:item.updatedAt||null,isNew:Boolean(item.addedAt&&daysBetween(item.addedAt,buildDate)>=0&&daysBetween(item.addedAt,buildDate)<NEW_ITEM_DAYS),searchVisible:!duplicateRuntime,
      duplicateOf:duplicateRuntime?canonicalForRuntime(duplicateRuntime,'unit'):null,serverRequired:false,accept:'',output:'',engine:item.toolType,order:mainItems.length+index+1};
    return applySearchFields(result);
  });

  const items=mainItems.concat(unitItems);
  const categories=platform.categories.map(category=>({id:category.id,name:category.name,description:category.description,order:category.order,tone:category.tone,
    count:category.id==='unit'?unitItems.length:mainItems.filter(item=>item.category===category.id).length}));
  return{items,categories};
}

function validate(catalog,platform,units){
  const errors=[],warnings=[],canonicalIds=new Set(),mainIds=new Set(),unitIds=new Set();
  for(const item of catalog.items){
    if(!item.id)errors.push('canonical ID 누락');
    if(canonicalIds.has(item.id))errors.push(`canonical ID 중복: ${item.id}`);canonicalIds.add(item.id);
    if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id))errors.push(`canonical ID 규칙 위반: ${item.id}`);
    if(!item.name)errors.push(`이름 누락: ${item.id}`);if(!item.category)errors.push(`카테고리 누락: ${item.id}`);if(!item.searchText)errors.push(`검색 데이터 누락: ${item.id}`);
    if(!Array.isArray(item.supportedDirections)||!item.supportedDirections.length)errors.push(`변환 방향 누락: ${item.id}`);
    if(item.duplicateOf&&!catalog.items.some(x=>x.id===item.duplicateOf))errors.push(`duplicateOf 대상 없음: ${item.id} -> ${item.duplicateOf}`);
  }
  platform.converters.forEach(item=>{if(mainIds.has(item.id))errors.push(`메인 레지스트리 ID 중복: ${item.id}`);mainIds.add(item.id);});
  units.converters.forEach(item=>{if(unitIds.has(item.id))errors.push(`단위 레지스트리 ID 중복: ${item.id}`);unitIds.add(item.id);const group=units.groups[item.group];if(item.toolType==='unit'){
    if(!group){errors.push(`단위 그룹 없음: ${item.id} -> ${item.group}`);return;}const ids=new Set(group.units.map(unit=>unit.id));if(!ids.has(item.from))errors.push(`입력 단위 없음: ${item.id} -> ${item.from}`);if(!ids.has(item.to))errors.push(`출력 단위 없음: ${item.id} -> ${item.to}`);
  }else if(item.group&&!group)errors.push(`특수 변환 그룹 없음: ${item.id} -> ${item.group}`);});
  const crossSourceDuplicates=units.converters.filter(item=>mainIds.has(item.id)).map(item=>item.id).sort();
  if(crossSourceDuplicates.length)warnings.push(`원본 레지스트리 간 ID 충돌 ${crossSourceDuplicates.length}개: ${crossSourceDuplicates.join(', ')}`);
  return{errors,warnings,crossSourceDuplicates};
}

function csvEscape(value){const text=String(value==null?'':value);return/[",\n\r]/.test(text)?`"${text.replace(/"/g,'""')}"`:text;}
function writeJson(file,value,space=2){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,`${JSON.stringify(value,null,space)}\n`,'utf8');}
function writeJs(file,banner,globalName,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,`${banner}\n(function(w){"use strict";w.${globalName}=${JSON.stringify(value)};})(window);\n`,'utf8');}
function writeFrozenJs(file,banner,globalName,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,`${banner}\n(function(w){"use strict";w.${globalName}=Object.freeze(${JSON.stringify(value)});})(window);\n`,'utf8');}

function main(){
  const{platform,units}=loadRegistries(),manifest=loadReleaseManifest();if(!platform||!units)throw new Error('기존 레지스트리를 불러오지 못했습니다.');
  const catalog=buildCatalog(platform,units,manifest),validation=validate(catalog,platform,units);
  const stats={registered:catalog.items.length,published:catalog.items.filter(x=>x.status==='published').length,coming:catalog.items.filter(x=>x.status!=='published').length,
    platform:platform.converters.length,unit:units.converters.length,file:catalog.items.filter(x=>x.converterKind==='file').length,text:catalog.items.filter(x=>x.converterKind==='text').length,
    unitKind:catalog.items.filter(x=>x.converterKind==='unit').length,special:catalog.items.filter(x=>x.converterKind==='special').length,serverRequired:catalog.items.filter(x=>x.serverRequired).length,
    searchVisible:catalog.items.filter(x=>x.searchVisible).length,publishedSearchVisible:catalog.items.filter(x=>x.status==='published'&&x.searchVisible).length,
    comingSearchVisible:catalog.items.filter(x=>x.status!=='published'&&x.searchVisible).length,searchHidden:catalog.items.filter(x=>!x.searchVisible).length,newItems:catalog.items.filter(x=>x.isNew).length,
    canonicalIdDuplicates:validation.errors.filter(line=>line.startsWith('canonical ID 중복')).length,uppercaseCanonicalIds:catalog.items.filter(x=>/[A-Z]/.test(x.id)).length,sourceIdConflicts:validation.crossSourceDuplicates.length};
  const fullCatalog={version:CATALOG_VERSION,release:RELEASE,generatedAt,sourceVersions:{platform:platform.version,unit:units.version},stats,categories:catalog.categories,items:catalog.items};
  const compactCategories=catalog.categories.map(({id,name,count})=>({i:id,n:name,c:count}));
  const compactItems=catalog.items.map(item=>({
    i:item.id,r:item.runtimeId,s:item.source==='unit'?'u':'p',k:({file:'f',text:'t',unit:'u',special:'s'})[item.converterKind]||item.converterKind,n:item.name,h:item.shortName,
    c:item.category,b:item.subcategory,d:item.description,f:item.from,t:item.to,p:item.status==='published'?1:0,x:item.featured?1:0,o:item.featuredOrder||0,
    z:item.normalizedName,y:item.normalizedShortName,a:item.normalizedAliases.join('|'),j:item.normalizedKeywords.join(' '),q:item.searchText,u:(item.exactTokens||[]).join('|'),
    v:item.searchVisible?1:0,g:item.duplicateOf||'',L:(item.legacyIds||[]).join('|'),A:item.addedIn||'',B:item.addedAt||'',D:item.updatedAt||'',N:item.isNew?1:0
  }));
  const hashPayload={schema:'compact-v2',catalogVersion:CATALOG_VERSION,stats,categories:compactCategories,items:compactItems};
  const searchIndexHash=crypto.createHash('sha256').update(JSON.stringify(hashPayload)).digest('hex');
  const searchIndex={schemaVersion:1,version:CATALOG_VERSION,catalogVersion:CATALOG_VERSION,release:RELEASE,schema:'compact-v2',contentHash:searchIndexHash,stats,categories:compactCategories,items:compactItems};
  const publicManifest={schemaVersion:1,release:RELEASE,catalogVersion:CATALOG_VERSION,generatedAt,
    registeredCount:stats.registered,publishedCount:stats.published,comingCount:stats.coming,
    searchVisibleCount:stats.searchVisible,publishedSearchVisibleCount:stats.publishedSearchVisible,searchHiddenCount:stats.searchHidden,
    baseUrl:PUBLIC_BASE_URL,searchIndexUrl:`${PUBLIC_BASE_URL}dist/data/hm-converter-search-index.v1.js`,searchIndexHash};
  const aliases={platform:{},unit:{},direct:{}};const routeItems={};
  catalog.items.forEach(item=>{routeItems[item.id]={runtimeId:item.runtimeId,source:item.source,category:item.category,from:item.from,to:item.to,legacyRoute:item.legacyRoute,legacyIds:item.legacyIds||[]};
    aliases[item.source][item.runtimeId]=item.id;(item.legacyIds||[]).forEach(id=>{if(id!==item.runtimeId)aliases.direct[id]=item.id;});});
  const routes={version:CATALOG_VERSION,release:RELEASE,legacyConflicts:validation.crossSourceDuplicates,canonicalUnitOverrides:UNIT_CANONICAL_IDS,aliases,items:routeItems};
  writeJson(path.join(ROOT,'dist/data/hm-converters-data.v1.json'),fullCatalog);writeJs(path.join(ROOT,'dist/data/hm-converters-data.v1.js'),'/* HealingMart Unified Converter Catalog v1.1.0 */','HM_CONVERTERS_DATA',fullCatalog);
  writeJson(path.join(ROOT,'dist/data/hm-converter-search-index.v1.json'),searchIndex);writeJs(path.join(ROOT,'dist/data/hm-converter-search-index.v1.js'),'/* HealingMart Converter Search Index v1.1.0 */','HM_CONVERTER_SEARCH_INDEX',searchIndex);
  writeFrozenJs(path.join(ROOT,'dist/catalog/hm-converter-public-manifest.v1.js'),'/* HealingMart Converter Public Manifest v1 */','HM_CONVERTER_PUBLIC_MANIFEST',publicManifest);
  writeJson(path.join(ROOT,'dist/data/hm-converter-routes.v1.json'),routes);writeJs(path.join(ROOT,'dist/data/hm-converter-routes.v1.js'),'/* HealingMart Converter Route Map v1.1.0 */','HM_CONVERTER_ROUTES',routes);
  const headers=['canonical_id','runtime_id','source','kind','name','category','subcategory','from','to','status','search_visible','duplicate_of','added_in','added_at','updated_at','is_new','featured','featured_order','route','legacy_route','legacy_ids','aliases','keywords','exact_tokens'];
  const rows=[headers.join(',')];catalog.items.forEach(item=>rows.push([item.id,item.runtimeId,item.source,item.converterKind,item.name,item.category,item.subcategory,item.from,item.to,item.status,item.searchVisible,item.duplicateOf||'',item.addedIn||'',item.addedAt||'',item.updatedAt||'',item.isNew,item.featured,item.featuredOrder,item.route,item.legacyRoute,(item.legacyIds||[]).join(' | '),item.aliases.join(' | '),item.keywords.join(' | '),(item.exactTokens||[]).join(' | ')].map(csvEscape).join(',')));
  fs.mkdirSync(path.join(ROOT,'audit'),{recursive:true});fs.writeFileSync(path.join(ROOT,`audit/converter-inventory-v${RELEASE}.csv`),`${rows.join('\n')}\n`,'utf8');
  const report=`HealingMart Converter v${RELEASE} 통합 구조화 보고서\n\n생성 시각: ${generatedAt}\n\n`+
    `- 통합 등록: ${stats.registered}개\n- 공개: ${stats.published}개\n- 준비 중: ${stats.coming}개\n- 전체 검색 노출: ${stats.searchVisible}개\n- 공개 검색 노출: ${stats.publishedSearchVisible}개\n- 준비 중 검색 노출: ${stats.comingSearchVisible}개\n- 검색 숨김 중복: ${stats.searchHidden}개\n`+
    `- 파일형: ${stats.file}개\n- 텍스트형: ${stats.text}개\n- 단위형: ${stats.unitKind}개\n- 특수형: ${stats.special}개\n- 신규 메타데이터: ${stats.newItems}개\n`+
    `- canonical ID 중복: ${stats.canonicalIdDuplicates}개\n- 대문자 canonical ID: ${stats.uppercaseCanonicalIds}개\n- 원본 레지스트리 충돌: ${stats.sourceIdConflicts}개(단위 canonical 격리)\n`+
    `- 오류: ${validation.errors.length}개\n- 경고: ${validation.warnings.length}개\n`+(validation.errors.map(x=>`ERROR: ${x}`).join('\n')||'오류 없음')+'\n'+(validation.warnings.map(x=>`WARN: ${x}`).join('\n')||'경고 없음')+'\n';
  fs.writeFileSync(path.join(ROOT,`audit/CONVERTER_AUDIT_v${RELEASE}.txt`),report,'utf8');
  if(validation.errors.length){console.error(report);process.exitCode=1;return;}console.log(JSON.stringify({release:RELEASE,catalog:CATALOG_VERSION,searchIndexHash,stats,warnings:validation.warnings},null,2));
}
main();
