HealingMart Converter v3.28.0

[규모]
- 파일 변환 도구: 222개
- 브라우저 사용 가능: 220개
- 서버 필요: 2개
- 기존 단위변환: 228개
- 플랫폼 전체: 450개

[이번 추가 30개]
- HEIC → WebP
- AVIF → WebP
- BMP → WebP
- TIFF → WebP
- GIF → WebP
- ICO → JPG
- ICO → WebP
- WebP → BMP
- WebP → GIF
- WebP → ICO
- AVIF → BMP
- AVIF → GIF
- BMP → GIF
- TIFF → GIF
- GIF → BMP
- GIF → ICO
- 텍스트 → HEX
- HEX → 텍스트
- 텍스트 → 2진수
- 2진수 → 텍스트
- 텍스트 → JSON 문자열
- JSON 문자열 → 텍스트
- 줄 목록 → JSON 배열
- JSON 배열 → 줄 목록
- 10진수 → 8진수
- 8진수 → 10진수
- 2진수 → 16진수
- 16진수 → 2진수
- 2진수 → 8진수
- 8진수 → 2진수

[서버형으로 유지]
- EPUB → MOBI
- EPUB → AZW3

[적용]
1. 이 ZIP의 dist/data/hm-converter-registry.v2.js를 GitHub 저장소 루트에 덮어씁니다.
2. test/hm-converter-self-test.v1.1.0.js을 같은 경로로 업로드합니다.
3. Blogger 게시물 HTML을 HealingMart_변환기_Blogger_222개확장_v3.28.0.html 내용으로 전체 교체합니다.
4. GitHub Pages 반영 뒤 Self-Test v1.1.0을 실행합니다.

[검증 범위]
Registry 구조, 라우팅, 엔진 파일 SHA-256, JavaScript 문법, Blogger 통합 마커를 검사했습니다.
새 이미지 변환 16개는 기존 Image Engine v1.3.0이 이미 지원하는 입력 디코더와 출력 인코더 조합을 Registry에 연결한 것입니다.
모든 사용자 파일 조합을 브라우저에서 전수 E2E 변환했다는 뜻은 아닙니다.
