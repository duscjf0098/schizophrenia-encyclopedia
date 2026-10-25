# 화면 확장 모듈 가이드 (js/ui/*.js)

앱 본체(js/app.js)를 고치지 않고 화면을 확장하는 방법이에요. 각 모듈은 자기 파일만 만들고, 아래 공개 API와 이벤트로 앱에 붙어요.

## 파일 규칙

- 코드: `js/ui/<이름>.js` — 즉시 실행 함수 하나. 전역은 만들지 않고, 필요하면 `JHB.ui = JHB.ui || {}; JHB.ui.<이름> = {...}` 에만 노출.
- 스타일: `css/ui/<이름>.css` — `node tools/build-ui-css.cjs` 가 `css/ui.css` 로 이어 붙인다. 선택자는 모두 자기 모듈 접두어(`.pal-`, `.pv-`, `.mb-`, `.stk-`, `.rd-`, `.set-`, `.pol-`, `.hm-`, `.sh-`)로 시작해 서로 겹치지 않게.
- 색·글꼴은 css/style.css 의 토큰만 쓴다: `--paper --paper-2 --paper-3 --ink --ink-2 --muted --rule --rule-2 --accent --accent-2 --accent-soft --accent-ink --mark --bad --bad-soft --warn --warn-soft --ok --ok-soft --serif --sans --fs-body --top-h --shadow-pop`. 어두운 화면은 토큰이 알아서 바뀐다.
- 외부 라이브러리 금지. `prefers-reduced-motion: reduce` 에서는 움직임을 끈다. 키보드로 전부 쓸 수 있어야 하고(Tab·Enter·Esc), 포커스 표시는 `:focus-visible`.
- 저장은 `JHB.app.store.get(key, fallback)` / `.set(key, val)` (localStorage 래퍼). 키는 `jhb.ui.<모듈>.<항목>`.
- 한국어 해요체. 문구는 짧고 구체적으로("저장됨", "주소 복사됨").

## 공개 API: `JHB.app`

| 이름 | 뜻 |
|---|---|
| `BASE` | 현재 페이지에서 사이트 루트까지 상대 경로(`''`, `'../'`, `'../../'`) |
| `L(h)` | `'#/a/slug'` 같은 옛 해시 링크를 실제 경로로. 링크 href 를 만들 때 반드시 사용 |
| `go(h)` | 그 주소로 이동 |
| `where()` | `{ path: ['a','slug'], query: {...} }` 현재 위치. `path[0]`: `''`(첫 화면)·`a`·`s`·`search`·`glossary`·`fav`·`about`·`courses`·`course`·`random` |
| `articles` | 문서 목록 `[{slug, section, order, title, summary, tags, updated, evidence, minutes}]` |
| `bySlug`, `secById`, `sections`, `glossary`, `courses` | 색인 |
| `sectionArticles(id)` | 그 분류의 문서(순서대로) |
| `progress` | 읽음 기록 인스턴스(`isRead`, `markRead`, `sectionProgress`, `continueReading`, `courseProgress`) 또는 null |
| `isFav(slug)`, `toggleFav(slug)`, `favs()` | 저장 |
| `openPop(anchor, nodes)`, `closePop(refocus)` | 공용 팝오버(#pop). nodes 는 DOM 노드 배열 |
| `announce(text)` | 스크린 리더용 알림(aria-live) |
| `effectiveTheme()` | `'light'`/`'dark'` |
| `setNav(open)` | 좁은 화면 서랍 목차 열고 닫기 |
| `el(spec, attrs, children)`, `esc(s)` | DOM 헬퍼(`el('a.cls', {href, onclick}, ['text'])`), 이스케이프 |
| `nav`, `main` | `#sidenav`, `#app` 요소 |
| `row(article)` | 문서 행(`li.row`) 만들기 |
| `spine(section)` | 분류 색 막대 |
| `search()` | 검색 색인 로드(Promise → index; `JHB.search.query(index, q, {limit})`) |

## 이벤트

- `window` 의 `jhb:page` — 화면을 새로 그린 직후. `e.detail = { kind, id, query }`. 모듈은 여기서 자기 UI 를 붙인다(첫 로드에도 한 번 온다. 단 모듈 스크립트는 app.js 뒤에 실행되므로 첫 이벤트를 놓칠 수 있다 → 모듈 시작 때 `JHB.app.where()` 로 한 번 직접 처리할 것).
- `window` 의 `jhb:article` — 문서를 다 그린 직후. `e.detail = { slug, article, meta, toc:[{id,text,level}], prev, next, minutes, body }`(body 는 `.body` 요소).
- `window` 의 `jhb:layout` — 글자 크기 등 레이아웃이 바뀜.

## 화면 구조(선택자)

- 상단 `.topbar` (`#btn-nav`, `.brand`, `.qs`/`#q`/`#qs-list`, `.tools`, `#btn-fs`, `#btn-theme`), 진행 막대 `#progress`
- 왼쪽 `#sidenav`(≤1080px 서랍, `.open`), 본문 `#app`, 문서 `article.doc > .doc-main`(`.doc-head`, `.body`, `.sources`, `.see-also`, `.pager`) + `.doc-margin`(`.infobox`, `.notes`)
- 첫 화면 `.portal` 의 섹션들은 `section[data-sec]` = `today`·`continue`·`courses`·`recent`·`index`·`terms`(모듈이 더함: `shelf` 책꽂이, `start` 처음 온 사람, `new` 새 글)
- 본문 소제목 `.body h2[data-key="core"|"detail"]` (core = 한 문장으로·짧은 답·나에게 의미하는 것·할 수 있는 것·주변 사람이 알아둘 것·담당 의사에게 물어볼 것·더 읽을 글)
- 용어 버튼 `.body .term`, 출처 번호 `.body .fn a`, 콜아웃 `.callout.callout-<종류>`
- 팝오버 `#pop`, 위기 배너 `.crisis`, 바닥 `.sitefoot`

## 확인

로컬 서버 http://localhost:5174/ (없으면 프로젝트 루트에서 `node serve.cjs` 백그라운드). Playwright MCP 도구로 1280×800 과 390×844 에서 실제로 눌러 보고 콘솔 오류 0 을 확인한다. `node tests/run.cjs` 는 깨지지 않아야 한다.
