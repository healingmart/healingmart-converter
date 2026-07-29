# HealingMart Converter v3.55.1 수정·검토 결과

## 최종 판정

v3.55.0에서 지적됐던 핵심 문제는 대부분 정상적으로 수정됐고, 이번 추가 수정으로 문서 성격·검증 순서·짧은 단위 검색 오탐도 정리됐다. 기존 컨버터 저장소에 업데이트 파일을 같은 경로로 덮어쓰는 방식이면 배포 가능한 상태다.

## 정상 확인

기존 전체 저장소에 v3.55.1 UPDATE를 적용한 상태를 기준으로 확인했다.

- 통합 등록: 1,128개
- 공개: 1,126개
- 준비 중: 2개
- 검색 노출: 1,109개
- 검색 중복 숨김: 19개
- canonical ID 중복: 0개
- 대문자 canonical ID: 0개
- 신규 메타데이터: 108개
- 앱 파일 3개 내용 동일
- Blogger 내장 앱과 배포 앱 동일
- Catalog Test v1.1.0: 34/34 통과
- JavaScript 파일 151개 문법 검사 통과
- 기존 저장소에 UPDATE 적용 후 verify-release.js 통과

## 반영된 검색 수정

- 평방미터, ㎡ 검색 시 ㎡ ↔ 평 변환기 우선
- ㎡ 검색에서 동점도 m²/s 오탐 제거
- MB와 Mb 구분
- kB와 kb 구분
- MB/s와 Mbps 구분
- XLSX → CSV 같은 중복 검색 결과 숨김
- 대문자 canonical ID 17개를 소문자 ID로 변경하고 구 주소 호환 유지
- 신규 108개에 addedIn, updatedAt, isNew 추가
- 단독 단위 검색은 exactTokens 완전 일치 적용
- Mb 검색의 roman-number 및 MBq 부분 일치 오탐 제거

## 반드시 알아야 할 배포 방식

이번 ZIP은 단독 배포본이 아니라 기존 저장소용 UPDATE/PATCH다.

release-files-v3.55.1.json에는 전체 저장소 완성 상태에 필요한 50개 파일이 정의돼 있다. UPDATE ZIP에는 변경·추가 파일만 들어 있으므로 다음 기존 파일을 삭제하면 안 된다.

- THIRD_PARTY_NOTICES.txt
- css/hm-converter.v3.7.1.css
- dist/data/hm-converter-registry.v2.js
- dist/data/hm-unit-registry.v1.js
- dist/js/engines/ 아래 엔진 12개

빈 폴더나 새 저장소에 UPDATE ZIP만 올리면 verify-release 실패, 카탈로그 재생성 실패, index.html 실행 실패가 발생한다.

GitHub 적용 원칙은 다음과 같다.

```text
기존 저장소 파일 유지
→ UPDATE 파일만 같은 경로에 덮어쓰기
→ 기존 CSS·레지스트리·엔진 삭제 금지
```

## 검증 명령

단순히 UPDATE 파일을 기존 Git 저장소에 덮어썼다면 카탈로그를 다시 만들지 않고 다음만 실행한다.

```bash
node test/hm-converter-catalog-test.v1.1.0.js
node tools/verify-release.js
```

카탈로그를 다시 생성한 경우에는 generatedAt과 체크섬이 바뀌므로 다음 순서를 사용한다.

```bash
node tools/build-unified-catalog.js
node test/hm-converter-catalog-test.v1.1.0.js
node tools/verify-release.js --write
node tools/verify-release.js
```

## 실제 브라우저 최종 확인

코드·데이터·정적 테스트와 release 검증은 통과했지만 실제 배포 화면은 GitHub Pages에서 다음을 확인해야 한다.

1. 변환기 홈
2. `?tool=pdf-jpg`
3. URL 인코딩
4. `?tool=unit-cm-inch&from=cm&to=in`
5. JPG → PDF 파일 선택
6. 뒤로 가기·앞으로 가기
7. 모바일 320px 가로 스크롤
8. 기존 주소 `?category=unit&convert=MB-GB`
9. 구 주소 `?tool=unit-MB-GB`
10. MB, Mb, MB/s, Mbps 검색

## 결론

새 저장소를 만들지 말고 기존 컨버터 Git 작업 브랜치에 UPDATE 파일을 덮어쓴 뒤 검사한다. main 병합 전에는 GitHub Pages에서 실제 브라우저 점검만 마무리하면 된다.
