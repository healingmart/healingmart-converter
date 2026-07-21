HealingMart Converter v3.27.0
Browser-Safe Release Candidate

[이번 ZIP의 특징]
이전처럼 업데이트된 엔진 한두 개만 들어 있는 ZIP이 아니라,
현재 Blogger v3.27.0이 사용하는 최신 외부 엔진 12개를 모두 포함한 FULL DEPLOY ZIP입니다.

[GitHub 루트에 업로드]
dist/js/engines/
dist/data/hm-converter-registry.v2.js

[현재 상태]
전체 파일 변환기: 192
브라우저 사용 가능: 190
서버 필요/준비 중: 2

[준비 중]
EPUB → MOBI
EPUB → AZW3

[적용 순서]
1. ZIP 내용을 healingmart-converter 저장소 루트에 덮어쓰기
2. GitHub Pages에서 Registry 및 엔진 JS가 정상적으로 열리는지 확인
3. Blogger HTML을 HealingMart_변환기_Blogger_브라우저안전_RC_v3.27.0.html 로 전체 교체
4. 대표 Smoke Test 진행

[대표 Smoke Test 권장]
이미지: PNG → AVIF
PDF: PDF → DOCX
문서: DOCX → ODT
HWP: HWP → HTML
HWPX: DOCX → HWPX
Office: PPTX → PNG
미디어: WAV → MP3
압축: ZIP → 7Z
전자책: MOBI → EPUB
폰트: TTF → WOFF2
자막: SUB → SRT
데이터: XLSX → CSV

[전체 정적 감사]
FULL_STATIC_AUDIT_v3.27.0.txt 참고
