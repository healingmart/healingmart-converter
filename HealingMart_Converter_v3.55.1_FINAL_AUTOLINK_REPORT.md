# HealingMart Converter v3.55.1 최종 자동연동 수정 보고서

## 완료된 필수 수정

1. 연비 계산에서 존재하지 않는 `l100km` 대신 실제 단위 ID `l100` 사용
2. 실제 앱 함수 기반 연비 회귀 테스트 추가
3. 브라우저 Self-Test의 고정 개수 제거
4. 1개 증가 시뮬레이션에서 브라우저 Self-Test 실행
5. `loadLatest()` 및 준비 이벤트가 외부 공개 목록만 반환하도록 수정
6. README·업로드·배포·Self-Test·QA 문서 통일
7. release-manifest 실제 파일 수·테스트 수·파일 크기 자동 동기화
8. 전체 빌드·테스트·체크섬 재생성

## 외부 목록 계약

- `all()` : 전체 등록 항목
- `publicItems()` : `published && searchVisible` 항목
- `loadLatest()` : `publicItems()` 반환
- `hm:converter-catalog-ready`의 `detail.catalog` : `publicItems()` 반환

현재 기본 외부 통합검색 항목은 1,107개입니다. 준비 중 2개와 검색 숨김 중복 19개는 기본 외부 목록에서 제외됩니다.

## 연비 회귀값

- 20 km/L = 5 L/100km
- 5 L/100km = 20 km/L
- 30 mpg US ≈ 7.84049 L/100km
- 40 mpg UK ≈ 7.06207 L/100km

## 테스트

- 일반 카탈로그: 43/43
- 공개 매니페스트: 27/27
- 최신 로더: 20/20
- 연비 회귀: 9/9
- 자동 확장·브라우저 Self-Test: 10/10

## 릴리스 형태

이 ZIP은 단독 검증 가능한 전체 GitHub 배포본입니다.

- release-files 선언: 62개
- 내부 생성 `converter-catalog-manifest.json`: 1개
- 총 체크섬·검증 대상: 63개

실제 GitHub Pages에서 정적 파일 HTTP 200, 연비 화면값, 모바일 레이아웃과 브라우저 이동 동작을 확인한 뒤 main에 병합해야 합니다.
