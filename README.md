# HealingMart Converter v1.0.0

Blogger 단일 앱 + GitHub 정적 파일 구조의 변환기 허브입니다.

- 카테고리: 21개
- 변환기: 228개
- GitHub Pages 개발 주소(예정): https://healingmart.github.io/healingmart-converter/
- 실제 서비스: Blogger의 healing-mart.com 페이지 내부에서 실행

## 배포
이 ZIP의 내용을 `healingmart-converter` 저장소 루트에 업로드합니다.
Blogger에는 `HealingMart_변환기_Blogger_단일앱_v1.0.0.html` 내용을 붙여넣습니다.

## 구조
- `dist/data/hm-converter-registry.v1.js`: 카테고리·변환기·단위 정의
- `dist/js/hm-converter-app.v1.js`: 허브·카테고리·변환 화면·라우팅
- `dist/css/hm-converter.v1.css`: 공통 디자인·모바일 반응형
- `index.html`: GitHub 개발 테스트
- `blogger-converter.html`: Blogger 운영 셸
