# HealingMart Converter 자동연동 운영 가이드

## 외부에서 고정 연결할 파일

```html
<script defer src="https://healingmart.github.io/healingmart-converter/dist/js/hm-converter-search-client.v1.js"></script>
```

블로그와 웹도구 저장소는 컨버터 버전이나 검색 인덱스 URL을 직접 관리하지 않습니다.

## 최신 공개 목록 로딩

```js
window.HM_CONVERTER_SEARCH.loadLatest().then(function (catalog) {
  registerConverters(catalog);
});
```

`catalog`에는 다음 조건을 모두 만족하는 항목만 들어갑니다.

```js
item.status === "published" && item.searchVisible !== false
```

현재 기준 1,107개입니다.

## 전체 목록과 외부 목록

```js
HM_CONVERTER_SEARCH.all();         // 전체 등록 항목
HM_CONVERTER_SEARCH.publicItems(); // 외부 기본 검색 항목
```

준비 중 항목까지 검색할 때만 다음 옵션을 사용합니다.

```js
HM_CONVERTER_SEARCH.search("EPUB MOBI", {
  includeComing: true
});
```

## 준비 이벤트

```js
window.addEventListener("hm:converter-catalog-ready", function (event) {
  registerConverters(event.detail.catalog);
});
```

`event.detail.catalog`는 `publicItems()`와 동일합니다.

## 개별 주소

```js
const url = HM_CONVERTER_SEARCH.buildUrl(
  "https://www.healing-mart.com/p/converter.html",
  converter
);
```

단위 컨버터는 `from`과 `to`가 자동 포함됩니다.

## 컨버터 추가 절차

1. 플랫폼 또는 단위 원본 레지스트리에 항목을 추가합니다.
2. `npm run release:write`를 실행합니다.
3. 생성 파일과 체크섬을 커밋합니다.
4. GitHub Pages 배포 결과를 확인합니다.

블로그 XML과 웹도구 저장소는 수정하지 않습니다.

## 생성·검증 파일

- `dist/data/hm-converters-data.v1.js`
- `dist/data/hm-converter-search-index.v1.js`
- `dist/data/hm-converter-routes.v1.js`
- `dist/catalog/hm-converter-public-manifest.v1.js`
- `converter-catalog-manifest.json`
- `CHECKSUMS.txt`

구형 `dist/public/hm-tools-source.converter.*` 피드는 사용하지 않습니다.
