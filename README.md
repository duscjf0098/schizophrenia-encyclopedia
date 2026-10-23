# 조현병 백과

조현병을 제대로 알기 위한 한국어 백과 웹앱(PWA). 서버 없이 정적 파일만으로 동작하고, 글은 Markdown으로 쓴다.

## 실행

```
node serve.cjs
```

http://localhost:5174 을 연다. (launch.json 항목 "jhb")

## 구조

- 페이지는 모두 `tools/shell.html` 틀로 **생성**한다: `index.html`, `a/<slug>/index.html`, `s/<id>/index.html`, `glossary/`, `about/`, `search/`, `fav/`, `random/`, `404.html`, `app-shell.html`(서비스 워커가 오프라인에서 채워 쓰는 틀), `sitemap.xml`. 각 페이지에 본문이 미리 들어 있어 검색엔진이 읽을 수 있고, `<html data-base data-route>`로 앱이 위치를 안다. 이 파일들은 직접 고치지 않는다.
- `css/style.css` 토큰 기반. 밝음/어두움 모두 지원(`prefers-color-scheme` 기본, `<html data-theme>`로 수동). 글자 크기는 `<html data-fs="s|l">`. 섹션 색은 `.tinted`에 `--h`(색상각)를 주면 계산된다.
- `js/md.js` 소형 Markdown 렌더러. frontmatter, `##`/`###`, 굵게·기울임·코드, 링크, `[^n]` 각주(출처 번호), 목록, 인용, 표, `::: 종류 제목 … :::` 콜아웃(tip/warn/crisis/note/research/fact/exp). node에서도 쓴다.
- `js/search.js` 제목·태그·요약·본문 부분일치 점수 검색. `data/search-index.json`을 쓴다.
- `js/app.js` 화면. 실제 경로 주소(`a/<slug>/` 등)를 쓰고, 옛 해시 주소(`#/a/…`)로 들어오면 새 주소로 옮긴다. 화면을 만들 때 쓰는 `#/…` 링크는 `js/paths.js`가 실제 경로로 바꿔 끼운다.
- `js/paths.js` 주소 규칙(옛 해시 → 경로, 깊이별 `../` 기준). `js/gloss.js` 본문 속 용어 찾기. `data/about.js` 소개 페이지 본문.
- `tools/site-verify.json` 검색엔진 소유 확인 코드(구글·네이버 HTML 태그의 content 값). 넣고 다시 빌드하면 첫 화면에만 들어간다. 등록 순서는 `docs/검색엔진_등록_안내.md`.
- `data/sections.js` 섹션 16개(손으로 관리). `data/glossary.js` 용어 사전(손으로 관리, `{term, en, def, related}`, 2026-10-23 기준 158개). check-content가 사전도 검사한다(중복, 160자 초과, 없는 글 링크, 금지 표현).
- 현재 글 221편(2026-10-23). 섹션 14는 글이 아니라 용어 사전이다. `data/toc.js`, `data/search-index.json`, `data/precache.json`은 **자동 생성**.
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
tags: 양성, 환각, 환청        (위기 글은 "위기" 태그 → 상담 전화 배너)
updated: 2026-10-23
evidence: 가이드라인 | 연구 | 초기연구 | 경험
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
node tools/check-content.cjs && node tools/build-index.cjs && node tools/build-pages.cjs
```

- `check-content.cjs`: 필수 항목, 출처·각주 범위, 금지 표현(용량 지시, 임의 중단 권유, 옛 병명, "조현병 환자", 단정적 완치), 위기 글의 109·1577-0199, 600자 미만 검사.
- `build-index.cjs`: toc·검색 색인·프리캐시 목록 생성.

## 테스트

```
node tests/run.cjs
```

## 원칙

- 모든 글에 출처. 근거 수준 배지(가이드라인/연구/초기연구/경험).
- 용량·중단 같은 개인별 지시 금지. 글마다 "담당 의사와 상의" 고지.
- 낙인 없는 표현: "조현병이 있는 사람". 옛 병명은 역사 설명에서만.
