# HealingMart Converter v3.55.1 Final Auto-Link Release

이 저장소는 **빈 폴더에서도 빌드·검증·실행 가능한 전체 GitHub 배포본**입니다. 기존 저장소에 전체 파일을 덮어써도 되며, 새 저장소에 그대로 업로드해도 됩니다.

## 자동 연동 구조

컨버터 원본 레지스트리를 수정하고 빌드하면 다음 파일이 자동 생성됩니다.

- 통합 카탈로그: `dist/data/hm-converters-data.v1.js`
- 공식 외부 검색 카탈로그: `dist/data/hm-converter-search-index.v1.js`
- 주소 맵: `dist/data/hm-converter-routes.v1.js`
- 외부 경량 매니페스트: `dist/catalog/hm-converter-public-manifest.v1.js`

블로그 메인과 웹도구 모음은 고정 클라이언트 하나만 연결합니다.

```html
<script defer src="https://healingmart.github.io/healingmart-converter/dist/js/hm-converter-search-client.v1.js"></script>
```

```js
window.HM_CONVERTER_SEARCH.loadLatest().then(function (catalog) {
  // catalog은 published + searchVisible 조건을 만족하는 외부 검색용 목록입니다.
  console.log(catalog.length);
});
```

- `HM_CONVERTER_SEARCH.all()` : 전체 등록 항목
- `HM_CONVERTER_SEARCH.publicItems()` : 공개·실행 가능하고 검색 노출되는 항목
- `HM_CONVERTER_SEARCH.loadLatest()` : 최신 매니페스트와 해시를 확인한 뒤 `publicItems()` 반환
- `hm:converter-catalog-ready` 이벤트의 `detail.catalog` : `publicItems()`와 동일

## 현재 생성 통계

- 등록: 1,128개
- 공개: 1,126개
- 준비 중: 2개
- 전체 `searchVisible`: 1,109개
- 기본 외부 통합검색: 1,107개
- 검색 숨김 중복: 19개

이 숫자는 테스트 기대값으로 고정되지 않습니다. 원본 레지스트리와 생성 산출물 사이의 계약 비교로 검증됩니다.

## 연비 오류 수정

연비 단위의 실제 ID인 `l100`을 사용하도록 앱 3개 복사본과 Blogger 2개 파일을 수정했습니다.

회귀 테스트 항목:

- 20 km/L = 5 L/100km
- 5 L/100km = 20 km/L
- 30 mpg US ≈ 7.84049 L/100km
- 40 mpg UK ≈ 7.06207 L/100km

## 빌드와 검증

기존 생성 파일을 그대로 확인할 때:

```bash
npm test
npm run release:check
```

원본 레지스트리를 수정한 뒤 전체 산출물과 체크섬을 다시 만들 때:

```bash
npm run release:write
```

내부 순서:

```text
build:catalog
→ catalog/manifest/latest-loader/fuel/expansion tests
→ release-manifest 실제값 동기화
→ converter-catalog-manifest 및 CHECKSUMS 재생성
→ 최종 검증
```

## 릴리스 검증 범위

- `release-files-v3.55.1.json` 선언 파일: 62개
- 자동 생성 내부 검증 매니페스트: 1개
- 최종 체크섬·릴리스 검증 대상: 63개

## 주의

구형 `dist/public/` 별도 공개 피드 구조는 사용하지 않습니다.

최종 외부 자동연동은 다음 파일만 사용합니다.

```text
dist/js/hm-converter-search-client.v1.js
dist/catalog/hm-converter-public-manifest.v1.js
dist/data/hm-converter-search-index.v1.js
```

변환 공식·파일 변환 엔진·단위 계수·canonical ID·구 주소 호환·`?tool=` 주소·단위 `from/to`·중복 숨김 규칙은 유지됩니다.
