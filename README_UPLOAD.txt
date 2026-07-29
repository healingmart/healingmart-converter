HealingMart Converter v3.55.1 전체 GitHub 업로드 안내

이 패키지는 UPDATE/PATCH 전용이 아니라 전체 GitHub 배포본입니다.
빈 폴더 또는 새 저장소에서도 검증할 수 있습니다.

업로드 방법

1. ZIP을 풉니다.
2. 기존 healingmart-converter 저장소의 같은 경로에 전체 파일을 덮어쓰거나 새 저장소에 전체 파일을 업로드합니다.
3. 기존 `dist/public/` 구형 AutoSync 파일이 남아 있다면 삭제합니다.
4. Node.js 환경에서 다음을 실행합니다.

   npm test
   npm run release:check

5. 원본 레지스트리를 변경했다면 다음을 실행합니다.

   npm run release:write

6. GitHub Pages 배포 후 아래 경로가 HTTP 200인지 확인합니다.

   /dist/js/hm-converter-search-client.v1.js
   /dist/catalog/hm-converter-public-manifest.v1.js
   /dist/data/hm-converter-search-index.v1.js
   /dist/data/hm-converter-routes.v1.js

7. 브라우저에서 다음을 확인합니다.

   - 변환기 홈
   - ?tool=pdf-jpg
   - ?tool=unit-cm-inch&from=cm&to=in
   - 연비 20 km/L → 5 L/100km
   - 연비 5 L/100km → 20 km/L
   - 뒤로 가기·앞으로 가기
   - 모바일 320px 가로 스크롤
   - MB, Mb, MB/s, Mbps 검색

릴리스 검증 대상

- 선언 파일 62개
- 자동 생성 converter-catalog-manifest.json 1개
- CHECKSUMS.txt가 검증하는 총 대상 63개

블로그와 웹도구 모음은 버전 주소나 개수를 직접 수정하지 않습니다.
고정 search client가 최신 공개 매니페스트와 검색 인덱스 해시를 자동 확인합니다.
