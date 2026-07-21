HealingMart Converter v3.22.0
Office Render 엔진 확장

[GitHub 업로드]
dist/js/engines/hm-engine-office.v1.0.0.js
dist/data/hm-converter-registry.v2.js

[업로드 후 확인]
https://healingmart.github.io/healingmart-converter/dist/js/engines/hm-engine-office.v1.0.0.js
https://healingmart.github.io/healingmart-converter/dist/data/hm-converter-registry.v2.js

두 주소가 코드로 정상 표시되면 Blogger HTML 전체를
HealingMart_변환기_Blogger_오피스렌더엔진확장_v3.22.0.html
파일로 교체하세요.

[신규 활성화]
PDF → XLSX
XLSX → PDF
PDF → PPTX
PPTX → PDF
PPTX → JPG
PPTX → PNG

[현재 레지스트리]
전체: 192
사용 가능: 171
준비 중: 21

[PPTX 렌더링]
pptx-svg 0.6.4를 사용합니다.
첫 실행 시 라이브러리와 약 280KB 수준의 WebAssembly 모듈을 추가로 불러올 수 있습니다.

[중요]
Office 변환은 원본 프로그램의 전체 렌더링 엔진을 복제하는 방식이 아닙니다.
PDF → XLSX는 표 구조 추정,
PDF → PPTX는 페이지 이미지 기반,
PPTX → PDF/JPG/PNG는 정적 슬라이드 렌더링 방식입니다.
