# 조현병 백과

조현병을 제대로 알기 위한 한국어 백과 웹앱(PWA). 서버 없이 정적 파일만으로 동작하고, 글은 Markdown으로 쓴다.

## 실행

```
node serve.cjs
```

http://localhost:5174 을 연다. (launch.json 항목 "jhb")

## 구조

- 페이지는 모두 `tools/shell.html` 틀로 **생성**한다: `index.html`, `a/<slug>/index.html`, `s/<id>/index.html`, `glossary/`, `about/`, `search/`, `fav/`, `random/`, 특집 화면 `<id>/`, `404.html`, `app-shell.html`(서비스 워커가 오프라인에서 채워 쓰는 틀), `sitemap.xml`. 각 페이지에 본문이 미리 들어 있어 검색엔진이 읽을 수 있고, `<html data-base data-route>`로 앱이 위치를 안다. 이 파일들은 직접 고치지 않는다.
- 특집 화면(글·분류·용어 사전이 아닌 새 화면): `data/pages/<id>.json` 선언 + `js/pages/<id>.js` 화면 코드 + `css/pages/<id>.css` + `data/kb/<이름>.json` 데이터. 선언 형식은 `data/pages/README.md`, 만드는 법·공개 API·문서 확장 자리는 `docs/UI모듈가이드.md`. `data/pages.js` 는 자동 생성.
- 화면 확장 모듈 스크립트 줄(`<!--ui:start-->`), 상단 도구 링크(`<!--top:start-->`), 바닥글 링크 줄(`<!--foot:start-->`: "이 백과에 대해", 고침 기록 화면이 있으면 "고침 기록")은 빌드가 채운다(`tools/lib/assets.cjs`, 모듈 순서는 `tools/ui-order.json`). `serve.cjs` 는 같은 함수로 `css/ui.css`·`data/pages.js`·이 세 줄을 즉석에서 만들어, 빌드 없이도 새 파일이 보인다. 단 틀(`tools/shell.html`)의 다른 부분과 정적 본문은 빌드해야 바뀐다.
- 바닥글의 위기 줄은 세 번호(자살예방상담 109, 정신건강위기상담 1577-0199, 생명이 위급하면 119)를 모두 전화 링크로 둔다.
- `css/style.css` 토큰 기반. 밝음/어두움 모두 지원(`prefers-color-scheme` 기본, `<html data-theme>`로 수동). 글자 크기는 `<html data-fs="s|l">`. 섹션 색은 `.tinted`에 `--h`(색상각)를 주면 계산된다.
- `js/md.js` 소형 Markdown 렌더러. frontmatter, `##`/`###`, 굵게·기울임·코드, 링크, `[^n]` 각주(출처 번호), 목록, 인용, 표, `::: 종류 제목 … :::` 콜아웃(tip/warn/crisis/note/research/fact/exp). node에서도 쓴다.
- `js/search.js` 제목·태그·요약·본문 부분일치 점수 검색. `data/search-index.json`을 쓴다.
- `js/app.js` 화면. 실제 경로 주소(`a/<slug>/` 등)를 쓰고, 옛 해시 주소(`#/a/…`)로 들어오면 새 주소로 옮긴다. 화면을 만들 때 쓰는 `#/…` 링크는 `js/paths.js`가 실제 경로로 바꿔 끼운다.
- `js/paths.js` 주소 규칙(옛 해시 → 경로, 깊이별 `../` 기준). `js/gloss.js` 본문 속 용어 찾기. `data/about.js` 소개 페이지 본문.
- `tools/site-verify.json` 검색엔진 소유 확인 코드(구글·네이버 HTML 태그의 content 값). 넣고 다시 빌드하면 첫 화면에만 들어간다. 등록 순서는 `docs/검색엔진_등록_안내.md`.
- `data/sections.js` 섹션 16개(손으로 관리). `data/glossary.js` 용어 사전(손으로 관리, `{term, en, def, related}`, 2026-11-14 기준 257개). check-content가 사전도 검사한다(중복, 160자 초과, 없는 글 링크, 금지 표현). `data/courses.js` 읽기 코스(손으로 관리, 2026-11-14 기준 18개).
- 현재 글 284편(2026-11-14). 섹션 14는 글이 아니라 용어 사전이다. `data/toc.js`(글 목록. 출처 확인일 `reviewed` 는 있는 글만), `data/search-index.json`, `data/precache.json`은 **자동 생성**.
- 손으로 관리하는 화면 데이터 `data/kb/*.json`: `groups.json`(분류 소묶음·먼저 읽을 글), `nextsteps.json`(글 끝 다음 걸음 손 지정), `changes.json`(고침 기록). 모양은 `docs/UI모듈가이드.md` 2-5.
- `content/<섹션폴더>/<slug>.md` 글. slug는 전체에서 유일해야 한다.
- `sw.js` 오프라인 캐시. `build-index.cjs`가 `BUILD` 상수를 새 버전으로 바꿔 넣고, 브라우저는 sw.js가 바뀌면 새 캐시를 설치하고 옛 캐시를 지운다. 글을 추가한 뒤 화면에 안 보이면 새로고침 두 번.
- `docs/집필가이드.md` 글 형식·출처·문체·안전 규칙. 새 글을 쓰기 전에 읽는다.

## 글 쓰기

```
---
title: 환청
section: 2
order: 3
summary: 한두 문장 요약
tags: 양성, 환각, 환청        (위기 글은 "위기" 태그 → 상담 전화 배너, 몸의 응급 신호 글은 "응급" 태그 → 119 줄)
updated: 2026-10-23
reviewed: 2026-11-14           (선택, 모든 출처를 다시 열어 본문과 대조한 날만 → "출처 확인 2026.11.14")
evidence: 가이드라인 | 연구 | 초기연구 | 경험
points:                        (선택, 2~4줄 → 글 머리 "핵심 3가지" 상자)
  - 핵심 한 줄
sources:
  - 기관 | 제목 | 연도 | URL
---
## 본문은 ## 부터 (h1은 title로)
문장 끝에 출처 번호[^1]
::: research
최신 연구 콜아웃
:::
```

글을 추가·수정한 뒤:

```
node tools/build-all.cjs
```

`build-all.cjs` 는 아래를 차례로 돌리고 하나라도 실패하면 멈춘다: check-content → build-gen → build-kb → build-index → build-links → build-ui-css → build-pages.

- `check-content.cjs`: 필수 항목, 출처·각주 범위, 금지 표현(용량 지시, 임의 중단 권유, 옛 병명, "조현병 환자", 단정적 완치), 위기 글의 109·1577-0199, 600자 미만 검사.
- `build-gen.cjs`: 생성기(`tools/gen/*.cjs`, 지금은 없음)를 돌려 `data/kb/*.json` 을 만든다.
- `build-kb.cjs`: 특집 화면 선언(`data/pages/*.json`)·지식 데이터(`data/kb/*.json`) 검사, `data/pages.js` 생성.
- `build-index.cjs`: toc·검색 색인·프리캐시 목록 생성(모듈·특집 화면·지식 데이터까지 자동으로 모음). toc 글 항목에 `reviewed` 를 있을 때만 넣는다.
- `build-links.cjs`: 문서 간 링크 지도(`data/links.js`, 역링크·고아 문서 통계).
- `build-pages.cjs`: 검색엔진용 정적 페이지와 sitemap. 문서에는 위기 배너·응급 줄·핵심 3가지·근거 한 줄(출처 확인일 포함)·문서 고지, 그리고 인쇄에서만 보이는 사이트 이름·정식 주소 한 줄(`.prt-static`)을 넣는다. 분류 페이지는 `data/kb/groups.json` 이 있으면 앱(`js/ui/hub.js` 의 `arrange`)과 같은 "먼저 읽을 글"·묶음 순서로 만든다. 특집 화면은 `staticHtml(ctx)` 결과(문맥에 `glossary`·`courses` 포함)와 고지. 사이트맵 날짜는 선언의 `lastmod`(예: `"kb:changes:date"`) → `updated` 순. `require` 하면 파일을 쓰지 않고 도우미만 내보낸다(`tests/pages.test.cjs`).
- `build-ui-css.cjs`: `css/ui/*.css` 를 `css/ui.css` 하나로 이어 붙임. `build-og.cjs`: 공유 배너 `og.png`(tools/og-template.html, 책등형).
- 화면 확장 모듈 `js/ui/*.js` + `css/ui/*.css`(앱 본체는 안 건드리고 `JHB.app` 공개 API와 `jhb:page`·`jhb:article` 이벤트로 붙음, 공개 API 는 `docs/UI모듈가이드.md` 4-1): palette(Ctrl+K 명령 팔레트), preview(링크 미리보기 카드), mobile(휴대폰 하단 바: 760px 이하 모든 화면·차례/용어 시트·스와이프), sticky(따라오는 제목 줄·남은 시간), reading(요약/전체 보기·읽던 자리), settings(보기 설정 패널: 글자·폭·글꼴·움직임·테마), polish(화면 전환·자리표시·토스트·분류 색), home(역할 4갈래 첫 화면·새로 올라온 글·홈 화면에 추가), shelf(배너와 같은 책꽂이), ask(글의 "담당 의사에게 물어볼 것"을 진료 질문 바구니에 담기), hub(분류 화면 소묶음), nextsteps(글 끝 다음 걸음·관련 질문), nowhelp(상단 "지금 도움" 시트: 109·1577-0199·119), print(인쇄 버튼·인쇄 머리와 꼬리·인쇄 모양), trust(출처 확인일·글별 고친 내역). 모두 없어도 앱은 동작한다.
- 특집 화면(`data/pages/*.json`): search(찾기), browse(둘러보기), changes(고침 기록), ask(진료 질문 바구니), me(내 서재: 기기 안 기록 보기·지우기·기록 쉼).
- 앱에 붙은 선택 모듈: `data/synonyms.js`+`js/synonyms.js`(일상 말 → 문서), `js/crisis.js`+`data/crisis-card.js`(위기 검색어 안내), `data/courses.js`(읽기 코스), `js/progress.js`(읽은 문서·이어 읽기, localStorage `jhb.read`), `data/links.js`(역링크). 모두 없어도 앱은 동작한다.

## 테스트

```
node tests/run.cjs
```

## 원칙

- 모든 글에 출처. 근거 수준 배지(가이드라인/연구/초기연구/경험).
- 용량·중단 같은 개인별 지시 금지. 글마다 "담당 의사와 상의" 고지.
- 낙인 없는 표현: "조현병이 있는 사람". 옛 병명은 역사 설명에서만.
