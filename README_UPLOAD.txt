HealingMart Converter v3.12.0
자막 + 압축·파일 브라우저 엔진 확장

[GitHub 업로드]
압축을 풀고 아래 경로를 기존 healingmart-converter 저장소 루트에 그대로 업로드하세요.

dist/js/engines/hm-engine-subtitle.v1.0.0.js
dist/js/engines/hm-engine-archive.v1.0.0.js
dist/data/hm-converter-registry.v2.js

[업로드 후 확인]
https://healingmart.github.io/healingmart-converter/dist/js/engines/hm-engine-subtitle.v1.0.0.js
https://healingmart.github.io/healingmart-converter/dist/js/engines/hm-engine-archive.v1.0.0.js
https://healingmart.github.io/healingmart-converter/dist/data/hm-converter-registry.v2.js

세 주소가 코드로 정상 표시된 뒤 Blogger HTML 전체를
HealingMart_변환기_Blogger_자막압축엔진확장_v3.12.0.html
파일로 교체합니다.

[이번 활성화]
자막:
- ASS → SRT
- SSA → SRT
- SRT → ASS
- SRT → SSA
- TXT → SRT
기존 SRT ↔ VTT, SRT → TXT, VTT → TXT도 새 자막 엔진에서 처리

압축·파일:
- ZIP → TAR
- TAR → ZIP
- TAR → GZ (.tar.gz)
- GZ → ZIP

[유지되는 준비 중 항목]
- SUB → SRT: .sub가 MicroDVD 텍스트와 VobSub 바이너리 등 여러 계열이라 현재는 자동 활성화하지 않음
- ZIP ↔ 7Z, RAR → ZIP, BZ2 → ZIP, XZ → ZIP: 별도 WASM/전용 엔진 필요
- ZIP → GZ: 여러 파일 ZIP을 단일 스트림 GZ로 바꾸는 의미가 모호하므로 현재 비활성

[현재 레지스트리]
전체 파일 변환기: 192
사용 가능: 83
준비 중: 109
