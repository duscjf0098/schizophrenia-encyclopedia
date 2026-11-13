# 화면 확장 가이드 (모듈·특집 화면·문서 자리)

앱 본체(`js/app.js`)와 틀(`tools/shell.html`)을 고치지 않고 화면을 넓히는 방법이에요. 작업자는 **자기 새 파일만** 만들고, 아래 공개 API(`JHB.app`)와 이벤트로 앱에 붙어요. 빌드 도구가 새 파일을 알아서 찾아 넣어요.

| 하고 싶은 일 | 만드는 파일 | 붙는 방법 |
|---|---|---|
| 모든 화면에 기능 더하기(버튼, 시트, 첫 화면 묶음 등) | `js/ui/<이름>.js` + `css/ui/<이름>.css` | 스크립트 줄이 모든 페이지에 자동으로 들어가요 |
| 새 주소의 화면 만들기(길잡이, 내 서재 등) | `data/pages/<id>.json` + `js/pages/<id>.js` + `css/pages/<id>.css` (+ `data/kb/<이름>.json`) | 선언만 있으면 `<id>/` 주소·목차·정적 HTML·사이트맵이 생겨요 |
| 문서 화면 안에 상자 끼우기 | 모듈 안에서 `JHB.app.mount('lead', 노드, 순서)` | 문서 화면의 정해진 자리에 순서대로 들어가요 |

## 1. 화면 확장 모듈 (`js/ui/*.js`)

### 파일 규칙
- 코드: `js/ui/<이름>.js` — 즉시 실행 함수 하나. 전역은 만들지 않고, 필요하면 `JHB.ui = JHB.ui || {}; JHB.ui.<이름> = {...}` 에만 노출해요.
- 스타일: `css/ui/<이름>.css` — `node tools/build-ui-css.cjs` 가 `css/ui.css` 로 이어 붙여요(이름순). 선택자는 모두 자기 모듈 접두어(`.pal-`, `.pv-`, `.mb-`, `.stk-`, `.rd-`, `.set-`, `.pol-`, `.hm-`, `.sh-` 처럼)로 시작해 서로 겹치지 않게 해요.
- **스크립트 줄은 손으로 넣지 않아요.** `tools/shell.html` 의 `<!--ui:start-->{{UI_SCRIPTS}}<!--ui:end-->` 를 `build-pages` 가 채워요. 순서는 `tools/ui-order.json`(기존 9개: palette → preview → mobile → sticky → reading → settings → polish → home → shelf, 바꾸지 않음) 다음에 나머지 `js/ui/*.js` 가 이름순이에요. 순서에 기대야 하면 이름으로 정하지 말고 이벤트로 기다려요.
- 색·글꼴은 `css/style.css` 의 토큰만 써요: `--paper --paper-2 --paper-3 --ink --ink-2 --muted --rule --rule-2 --accent --accent-2 --accent-soft --accent-ink --mark --bad --bad-soft --warn --warn-soft --ok --ok-soft --serif --sans --fs-body --top-h --shadow-pop`. 어두운 화면은 토큰이 알아서 바뀌어요.
- 외부 라이브러리·CDN·분석 도구·외부 API 금지. 움직임은 `JHB.app.reducedMotion()` 이 true 면 꺼요. 키보드로 전부 쓸 수 있어야 하고(Tab·Enter·Esc), 포커스 표시는 `:focus-visible`.
- 저장은 `JHB.app.store.get(key, fallback)` / `.set(key, val)` / `.remove(key)`(localStorage 래퍼). 키 규칙은 6장.
- 한국어 해요체. 문구는 짧고 구체적으로("저장됨", "주소 복사됨").
- 모듈 스크립트는 `app.js` 뒤에 실행돼서 첫 `jhb:page` 를 놓칠 수 있어요 → 모듈 시작 때 `JHB.app.where()` 로 한 번 직접 처리해요.

## 2. 특집 화면 만드는 법 (`data/pages/<id>.json` + `js/pages/<id>.js`)

글·분류·용어 사전이 아닌 새 화면은 **파일 세 종류**만 떨어뜨리면 생겨요. `<id>` 는 주소(`<id>/`)이자 파일 이름이에요.

### 2-1. 선언 `data/pages/<id>.json`
```json
{
  "id": "guide",
  "title": "상황별 길잡이",
  "label": "길잡이",
  "summary": "검색 결과에 보일 설명. 155자 이하.",
  "lead": "화면 머리에 보일 소개 한두 문장(선택).",
  "group": "안내",
  "order": 10,
  "nav": ["top", "side", "home", "palette"],
  "keywords": ["어디에 연락", "도움"],
  "data": ["guide", "contacts"],
  "robots": "index",
  "crisisLine": true,
  "notice": ["general"],
  "updated": "2026-11-13"
}
```
| 항목 | 필수 | 뜻 |
|---|---|---|
| `id` | 예 | 파일 이름과 같아야 하고 `/^[a-z][a-z0-9-]{1,19}$/`. 예약어 금지: a, s, fav, glossary, about, courses, course, random, css, js, data, content, docs, tools, tests, notfound (`search` 는 허용) |
| `title` | 예 | 화면 제목(h1, 탭 제목 "title - 조현병 백과", 왼쪽 목차) |
| `label` | | 짧은 이름(상단 도구 링크·팔레트). 없으면 title |
| `summary` | 예 | 검색 결과·미리보기 설명, 155자 이하 |
| `lead` | | 제목 아래 소개(`p.page-lead`) |
| `group` | 예 | `안내` · `지식` · `도구` · `기록` — 왼쪽 목차 "살펴보기"의 묶음 |
| `order` | | 묶음 안 순서(작을수록 앞, 기본 100) |
| `nav` | | 링크를 보일 곳: `top`(상단 도구 줄), `side`(왼쪽 목차), `home`(첫 화면, home 모듈이 읽어야 보여요), `palette`(Ctrl+K 명령 팔레트의 동작 목록. label·keywords 로 찾아요). 기본 `["side","palette"]`. `top`·`side` 는 장치가 바로 그려요 |
| `keywords` | | 팔레트 등에서 찾을 말 |
| `data` | | 그리기 전에 받아 넘겨 줄 `data/kb/<이름>.json` 목록 |
| `robots` | | `index`(기본, 사이트맵에 들어감) · `noindex`(기기 안 기록 화면: me·ask·plan, 찾기) |
| `crisisLine` | | 기본 true(위기 줄 109·1577-0199·119). **false 는 검사 오류**예요(위기 안내는 빠지지 않아요). 꼭 빼야 하는 화면은 총괄이 `tools/lib/assets.cjs` 의 `CRISIS_LINE_OFF_OK` 에 id 를 더해야 해요 |
| `notice` | | 고지 종류: `general`(늘 붙음, 뺄 수 없음) · `device`(기기 안 기록 화면) · `emergency` · `dated`(`updated` 날짜로 "○○에 확인한 내용") · `crisis`(적어도 위기 줄은 `crisisLine` 하나로 **한 번만** 붙어요. 정리 때 notice 에서 빠져요) |
| `updated` | | `YYYY-MM-DD`. 사이트맵 lastmod, `dated` 고지 |

`node tools/build-kb.cjs` 가 선언을 모두 검사해요(규칙 위반·중복·summary 초과·깨진 JSON·없는 data 파일 → 종료 코드 1). 형식 한 쪽 요약은 `data/pages/README.md`.

### 2-2. 화면 코드 `js/pages/<id>.js` (브라우저·node 겸용 한 파일)
```js
(function (root) {
  const page = {
    id: 'guide',
    /* 선택. 검색엔진·자바스크립트 꺼진 환경용 HTML 문자열. document 를 쓰지 않아요.
       ctx = { data: {이름: json}, esc(s), articles: bySlug, sections, page: 선언 }
       글 링크는 href="#/a/slug" 꼴로(빌드가 실제 경로로 바꿈). 사용자 글자는 꼭 ctx.esc() */
    staticHtml: function (ctx) { return ''; },
    /* 브라우저에서만. mount(빈 div.fp-body)에 그려요.
       ctx = { data, query, path, app: JHB.app, el, page: 선언, onCleanup(fn) }
       ctx.query·검색어 같은 사용자 입력은 textContent 나 el() 로만 넣고, innerHTML·staticHtml 문자열에 쓸 때는 반드시 ctx.app.esc() 를 거쳐요 */
    render: function (mount, ctx) { }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = page;
  else root.JHB.app.registerPage(page);
})(typeof window !== 'undefined' ? window : this);
```
- 화면 전용 스타일은 `css/pages/<id>.css`(선택), 선택자 접두어는 `.pg-<id>-`.
- 화면 데이터는 `data/kb/<이름>.json`(JSON 만). 선언의 `data` 에 적으면 앱이 미리 받아 `ctx.data` 로 넘겨요. 다른 화면 데이터가 필요하면 `JHB.app.loadData(이름)`.
- `render` 가 없고 `staticHtml` 만 있으면 앱이 브라우저에서도 `staticHtml` 결과를 그대로 보여요(정적 HTML 이 없는 app-shell 에서도 같은 내용). js 파일이 아예 없으면(정적 전용) 본문은 비고 제목·lead·고지만 보여요(빌드·개발 서버가 경고). 본문 내용은 늘 `js/pages/<id>.js` 의 `staticHtml`/`render` 로 만들어요.
- 그릴 것이 아무것도 없으면(js 가 있는데 `render`·`staticHtml` 결과가 비었거나, js 도 lead 도 없음) 빈 몸통 대신 "화면 내용을 불러오지 못했어요" 안내가 나와요.
- 이벤트 처리기·타이머는 `ctx.onCleanup(fn)` 으로 정리해요(다음 화면을 그리기 직전에 불림).

### 2-3. 앱이 하는 일(순서)
1. `data/pages.js`(빌드가 만든 `JHB.pages`)를 `app.js` 보다 먼저 실어요. `route()` 는 기존 화면을 다 본 뒤 `JHB.pages` 에 있는 id 면 특집 화면으로 가요(그래서 "그런 문서가 없어요"가 깜빡이지 않아요).
2. 제목·왼쪽 목차를 그리고, `#app` 에 정적 내용(`.fp-body[data-page=id]`)이 있으면 그대로 둔 채, 없으면 "화면을 불러오고 있어요."를 보인 채 기다려요(이 자리 문구는 `jhb:page` 를 보내지 않아요).
3. `css/pages/<id>.css`·`js/pages/<id>.js` 를 `JHB.app.load()` 로 받고, 스크립트가 실행된 뒤 `registerPage` 가 불렸는지 봐요. 등록이 없으면(문법 오류·최상위 예외) 바로 실패해요. `data` 의 kb 파일도 받아요. 10초가 넘거나 파일을 받지 못하면 실패예요.
4. `show([빵부스러기, h1.page-title, p.page-lead, div.fp-body[data-page=id], div.fp-notices])`(여기서 `jhb:page` 한 번) → `page.render(mount, ctx)` → `window` 에 `jhb:pageready`.
5. **고지는 장치가 강제로 붙여요.** `notice` 종류마다 한 줄(`general` 은 늘 맨 앞) + 위기 줄 한 줄. 화면 작성자가 뺄 수 없어요.
6. 실패 안내는 원인에 따라 달라요(정적 내용이 있으면 그대로 남기고 그 아래에):
   - 파일을 받지 못함·시간 초과: "화면을 불러오지 못했어요(…). 인터넷 연결을 확인하고 새로고침해 주세요. 첫 화면 · 찾기"
   - 등록 안 됨·`render`/`staticHtml` 예외(코드 문제): "화면을 그리는 중에 문제가 생겼어요. 새로고침해 보거나 첫 화면 · 찾기로 가세요."
   - 그릴 것이 아무것도 없음(js 가 있는데 render·staticHtml 결과가 비었거나, js 도 lead 도 없음. 정적 HTML 없이 app-shell 로 열린 빌드 전 개발 서버·오프라인 첫 방문 포함): "화면 내용을 불러오지 못했어요. 새로고침해 보거나 첫 화면 · 찾기로 가세요."
   - 자료 파일(`data/kb/*.json`)이 404 이거나 JSON 이 깨짐(배포·코드 문제): "화면 자료를 찾지 못했어요. 새로고침해 보거나 첫 화면 · 찾기로 가세요."(reason `data`)
   - 어느 경우든 `jhb:pageready` 는 한 번 와요. `detail.ok` 가 false 면 `reason`(`net`·`data`·`code`·`empty`)과 `error` 가 붙어요.
   - 배포 직후 옛 캐시의 `data/pages.js` 에 아직 없는 화면인데 정적 내용(`.fp-body[data-page=id]`)이 있으면 지우지 않고 "새로 올라온 화면이에요. 새로 고치면 다 보여요" 안내만 붙여요(`jhb:page`·`jhb:pageready` 없음). 문서 화면도 같아요.
   - 정적 내용이 있던 화면은 실제 화면을 그릴 때 스크롤 위치를 그대로 둬요.

### 2-4. 빌드가 하는 일
- `build-kb`: 선언 검사 → `data/pages.js`(묶음 안내→지식→도구→기록, 그 안에서 order·id 순, 항목마다 `hasJs`·`hasCss`).
- `build-pages`: 선언마다 `<id>/index.html`(제목·설명·robots·canonical, 본문 = 빵부스러기 + h1 + lead + `.fp-body` 안에 `staticHtml(ctx)` + 고지). `index` 화면은 사이트맵에. `staticHtml` 에서 예외가 나면 어느 화면인지 알리고 멈춰요. 선언이 사라진 화면의 옛 폴더(빌드가 만든 `index.html` 하나만 든 폴더)는 지워요.
- `build-index`: 프리캐시에 `data/pages.js`, `js/pages/*.js`, `css/pages/*.css`, `data/kb/*.json`, 모든 `js/ui/*.js` 를 넣어요(오프라인에서도 열림).
- 상단 도구 줄: "용어 사전" + `nav` 에 `top` 이 있는 화면(label). `me` 가 없으면 "저장한 문서", `browse` 가 없으면 "아무 문서" 링크가 남아요.
- 왼쪽 목차: 분류 아래 "살펴보기" 묶음(`side` 화면, 묶음 작은 제목과 함께). 화면이 0개면 그리지 않아요. `me` 가 있으면 아래 "저장한 문서" 줄 대신 `me` 의 제목(내 서재)이 보이고, 살펴보기에는 넣지 않아요.

## 3. 문서 화면의 자리와 `mount`

문서 화면(`a/<slug>/`)에는 비어 있는 확장 자리 4개가 있어요(`div.doc-slot[data-slot=…]`, 비어 있으면 보이지 않음).

| 자리 | 위치 |
|---|---|
| `lead` | 문서 머리(`.doc-head`)·위기 배너·응급 줄 다음, 본문 위. 핵심 3가지 상자가 맨 앞(순서 -1000000) |
| `after-body` | 본문 바로 뒤, 출처 위 |
| `end` | 앞뒤 문서(`.pager`) 아래, 문서 맨 끝 |
| `margin` | 오른쪽 여백의 문서 정보 아래·용어 풀이 위(1080px 이하에서는 여백 전체가 숨어요 → 휴대폰용은 다른 자리에도) |

- `JHB.app.mount(이름, 노드, 순서)`: 같은 자리에서 `순서`(숫자, 기본 0) 오름차순으로 끼워요(같은 순서면 먼저 온 것이 앞). 노드에 `data-order` 가 붙어요. 끼운 뒤 `jhb:layout` 을 발행해 여백 주석이 다시 놓여요. 문서 화면이 아니면 null.
- 보통 `jhb:article` 에서 끼워요: `window.addEventListener('jhb:article', function (e) { JHB.app.mount('after-body', 내상자, 10); });`
- `JHB.app.slot(이름)` 은 자리 요소(문서 화면이 아니면 null).
- 요약 보기(reading 모듈)에서 접힌 소절로 뛰는 차례·버튼은 이동 전에 `JHB.ui.reading && JHB.ui.reading.reveal(id)` 를 불러 펼쳐요. 첫 소절, 위기 연락처(109·1577-0199·119·112·1393, `JHB.crisis.hasContact`)가 든 소절, `위기`·`응급` 태그 글은 접히지 않아요.

글 frontmatter 와 이어진 표시(앱과 정적 HTML 이 같은 마크업):
- `points:` 목록(2~4줄)이 있으면 `lead` 맨 앞에 `section.keypoints`(제목 "핵심 3가지", 줄 수가 3이 아니면 "핵심 정리"). `위기` 태그 글이면 상자 끝에 "지금 힘들면 109 · 1577-0199".
- `tags` 에 `응급` 이 있으면 위기 배너 자리 근처에 `div.emergency`(role=note, 119 tel 링크, 경고 노랑 계열). `위기` 와 함께면 둘 다.
- 정적 문서 HTML 에도 위기 배너, 응급 줄, 핵심 3가지, 근거·읽는 시간·고친 날 한 줄(`p.doc-meta-s`: 근거 칩 · "약 N분" · "2026.10.25 고침". 앱의 휴대폰 머리 줄 `.doc-meta-m` 과 같은 글자, `md.docMetaText`·`md.docMetaHtml`), 문서 고지(`p.disclaimer`)가 들어가요.
- 본문 전화번호: `**109**` 처럼 굵게 싼 공공 번호(109·112·119·129·13xx 등)와 `1577-0199` 꼴(15xx~18xx-xxxx)은 `tel:` 링크가 돼요. "109명", "제119조", 연도 범위("1650-1750 사이", "1990-2017년"), ISSN·ISBN 뒤 번호, DOI 속 숫자, 링크·코드 안은 그대로예요.
- 콜아웃(`::: 종류 제목`)은 `div.callout.callout-<종류>[role=note][aria-label=제목]` 이에요(예전 `aside` 아님, 클래스는 같음).

## 4. 공개 API: `JHB.app`

| 이름 | 뜻 |
|---|---|
| `BASE` | 현재 페이지에서 사이트 루트까지 상대 경로(`''`, `'../'`, `'../../'`) |
| `L(h)` | `'#/a/slug'` 같은 옛 해시 링크를 실제 경로로. 링크 href 를 만들 때 사용(화면에 붙는 `#/…` 링크는 자동으로 바뀌기도 해요) |
| `go(h)` | 그 주소로 이동 |
| `where()` | `{ path: ['a','slug'], query: {...} }` 현재 위치. `path[0]`: `''`(첫 화면)·`a`·`s`·`search`·`glossary`·`fav`·`about`·`courses`·`course`·`random`·특집 화면 id |
| `articles` | 문서 목록 `[{slug, section, order, title, summary, tags, updated, evidence, minutes}]` |
| `bySlug`, `secById`, `sections`, `glossary`, `courses` | 색인 |
| `sectionArticles(id)` | 그 분류의 문서(순서대로) |
| `progress` | 읽음 기록 인스턴스(`isRead`, `markRead`, `sectionProgress`, `continueReading`, `courseProgress`) 또는 null |
| `isFav(slug)`, `toggleFav(slug)`, `favs()` | 저장. `toggleFav` 는 `jhb:fav` 를 발행해요 |
| `openPop(anchor, nodes)`, `closePop(refocus)` | 공용 팝오버(#pop). nodes 는 DOM 노드 배열 |
| `announce(text)` | 스크린 리더용 알림(aria-live) |
| `effectiveTheme()` | `'light'`/`'dark'` |
| `setNav(open)` | 좁은 화면 서랍 목차 열고 닫기 |
| `el(spec, attrs, children)`, `esc(s)` | DOM 헬퍼(`el('a.cls', {href, onclick}, ['text'])`), 이스케이프 |
| `nav`, `main` | `#sidenav`, `#app` 요소 |
| `row(article)` | 문서 행(`li.row`) 만들기 |
| `spine(section)` | 분류 색 막대 |
| `search()` | 검색 색인 로드(Promise → index; `JHB.search.query(index, q, {limit})`) |
| **`goSearch(q, {section})`** | 찾기 화면으로 가기. 검색어는 `sessionStorage['jhb.q']` 로 한 번만 넘기고 주소는 쿼리 없는 `search/`(검색어를 주소·서버·캐시·탭 제목에 남기지 않음). **검색 이동은 꼭 이것으로**(`'#/search?q='` 금지). 이미 찾기 화면이면 그 자리에서 찾아요 |
| `store` | localStorage 래퍼 `get(key, fallback)`·`set(key, val)`(실패하면 false)·`remove(key)` |
| **`pages`**, **`pageById`** | 특집 화면 선언 배열(정렬됨)과 색인 |
| **`registerPage(page)`** | `js/pages/<id>.js` 가 불러요 |
| **`load(src)`** | `.js`·`.css` 를 한 번만 붙이고 Promise(실패 시 reject). src 는 사이트 루트 기준 상대 경로(`'js/pages/guide.js'`). 이미 페이지에 있는 파일이면 바로 resolve |
| **`loadData(name)`** | `data/kb/<name>.json` 을 받아 Promise(한 번만 받음) |
| **`loadArticle(slug)`** | 글 원문을 받아 `Promise<{meta, body}>`(frontmatter·본문 Markdown, 앱 캐시 사용). 없는 글이면 reject |
| **`md`**, **`links`** | `JHB.md`(렌더러·고정 안내 문구), `JHB.links`(없으면 null) |
| **`show(nodes, opts)`** | `#app` 을 그 노드들로 바꿔요(정리 함수 실행 → 그리기 → `jhb:page`). `opts.silent` 면 `jhb:page` 를 보내지 않고, `opts.loading` 이면 detail 에 `loading: true` 를 붙여요(자리 문구용) |
| **`setTitle(t)`** | 탭 제목 "t - 조현병 백과"(빈 값이면 "조현병 백과") |
| **`crumb(parts)`** | 빵부스러기 `nav.crumb`. `crumb([{href:'#/', text:'첫 화면'}, '길잡이'])` |
| **`notFound()`** | "그런 문서가 없어요" 화면 |
| **`onCleanup(fn)`** | 다음 `show()` 직전에 한 번 불림 |
| **`slot(name)`**, **`mount(slotName, node, order)`** | 문서 화면 확장 자리(3장) |
| **`notice(kind, arg)`** | 공용 고지 DOM(`div.notice.notice-<kind>[role=note]`). `general`(일반 정보·담당 의사와·AI 초안·감수 없음), `crisis`(109·1577-0199·119 tel 링크), `emergency`(몸의 응급 119), `device`("이 기기의 브라우저에만 저장돼요…"), `dated`(arg = 'YYYY-MM-DD' → "○○에 확인한 내용이에요"). 모르는 종류면 null |
| **`privacy`** | 기기 안 기록(6장) |
| **`reducedMotion()`** | 운영체제의 움직임 줄이기 설정이거나 `<html data-motion="reduce">` 면 true |

고정 안내 문구는 `js/md.js` 한 곳에 있어요: `md.noticeHtml(kind, arg)`, `md.crisisHtml()`(문서 위기 배너), `md.emergencyHtml()`, `md.keypointsHtml(points, isCrisis)`, `md.DISCLAIMER`(문서 고지). 정적 HTML(`build-pages`)도 같은 함수를 써서 문구가 같아요.

## 5. 이벤트 (`window`)

| 이벤트 | 언제 | `detail` |
|---|---|---|
| `jhb:page` | 화면을 새로 그린 직후(`show()`) — 첫 로드에도 와요 | `{ kind, id, query, loading? }`. kind 는 `home`·`a`·`s`·`glossary`·… 또는 특집 화면 id(찾기 `search` 포함, 모르는 kind 는 무시하세요). id 는 문서면 slug, 분류면 분류 id, **특집 화면이면 kind 와 같은 화면 id**, 그 밖에는 null. **문서 화면은 두 번 와요**: "문서를 불러오고 있어요" 자리 문구 때 `loading: true` 로 한 번, 실제 문서를 그릴 때 한 번(다 그린 뒤에는 `jhb:article`). 특집 화면은 실제 화면(또는 실패 안내)을 그릴 때 한 번이에요 |
| `jhb:article` | 문서를 다 그린 직후 | `{ slug, article, meta, toc:[{id,text,level}], prev, next, minutes, body, points }`(body 는 `.body` 요소, points 는 frontmatter 핵심 줄 배열 또는 null) |
| `jhb:pageready` | 특집 화면이 `render` 까지 끝났거나 실패한 뒤(화면마다 한 번) | `{ id, ok }` — 실패면 `ok: false` 와 `reason`(`net` 파일을 받지 못함·시간 초과, `data` 자료 파일 404·JSON 오류, `code` 등록 안 됨·그리기 예외, `empty` 그릴 내용 없음), `error`(있으면 메시지) |
| `jhb:search` | 찾기 화면이 결과를 그린 뒤(입력이 바뀔 때마다) | `{ query, section, results:[slug…](보여 준 것), total, offline }`. 검색어가 들어 있으니 저장·전송하지 마세요 |
| `jhb:gosearch` | `goSearch()` 직전(취소 가능). 찾기 화면이 `preventDefault()` 하면 이동 없이 그 자리에서 찾아요 | `{ q, s }` |
| `jhb:update` | 새 서비스 워커가 이 페이지를 넘겨받음(새 판 설치, 첫 설치는 아님). 토스트가 있으면 "새 판이 준비됐어요. 새로 고치면 보여요." | 없음 |

- 특집 화면에 반응하는 모듈(기록·포커스 이동·알림 등)은 `jhb:page` 대신 **`jhb:pageready`** 를 쓰고 `ok` 를 확인해요. `jhb:page` 로 반응해야 하면 `detail.loading` 이 true 인 것은 건너뛰어요(같은 일을 두 번 하지 않게).
| `jhb:layout` | 글자 크기 등 레이아웃이 바뀜, 자리에 `mount` 함 | 없음 |
| `jhb:fav` | 저장을 켜거나 끔(`toggleFav`) | `{ slug, on }` |
| `jhb:privacy` | 기록 쉼·최근 검색 설정을 바꾸거나 기록을 지움 | `{ action, value, ids }` — action 은 `paused`·`recentq`·`clear` |

이벤트 모양은 필드를 **더하기만** 해요(빼거나 이름을 바꾸지 않음).

## 6. 저장 키와 기록 쉼

- 기존 키: `jhb.fav`(저장한 글), `jhb.read`(읽은 글), `jhb.recent`(최근 읽은 글), `jhb.theme`·`jhb.fs`·`jhb.ui.settings`(보기 설정), `jhb.ui.reading.mode`·`jhb.ui.reading.pos`(요약 모드·읽던 자리), `jhb.ui.palette.recentq`(최근 검색), `jhb.ui.home.role`(역할: `self`·`family`·`near`·`curious`), `jhb.ui.home.installHidden`
- 개인정보 설정: `jhb.privacy.paused`(true = 기록 남기지 않기), `jhb.privacy.recentq`(true = 최근 검색 저장 켬, **기본 꺼짐**)
- 화면용: `jhb.ui.ask.keep`·`jhb.ui.ask.items`(질문 바구니를 이 기기에 저장할 때만), `jhb.ui.plan.keep`·`jhb.ui.plan.data`(종이 양식, **기본 꺼짐**)
- sessionStorage: `jhb.q`(검색어를 검색 화면으로 한 번 넘길 때만), `jhb.q.cleared`(최근 검색을 지운 시각. 검색어는 아님. 찾기 화면이 그보다 오래된 `history.state` 검색어를 되살리지 않음), `jhb.ui.ask.session`. 찾기 화면의 `history.state {q, s, at}` 는 그 탭의 기록에만 있고 탭을 닫으면 사라져요
- 새 키는 `jhb.ui.<모듈>.<항목>`. 기록 종류를 새로 만들면 **반드시** `JHB.app.privacy.register({ id, label, keys: [...], session: [...] })` 로 등록해 내 서재에서 보이고 지워지게 해요.

`JHB.app.privacy`:

| 이름 | 뜻 |
|---|---|
| `paused()`, `setPaused(b)` | 기록 쉼. true 면 코어는 읽음 표시(`jhb.read`)와 `jhb.recent` 를, reading 모듈은 읽던 자리(`jhb.ui.reading.pos`)를, 팔레트는 최근 검색을 쓰지 않아요. 기록을 남기는 모듈도 이 값을 보고 쓰지 않아야 해요 |
| `recentq()`, `setRecentq(b)` | 최근 검색 저장(기본 false). 끄면 저장된 최근 검색도 지워요 |
| `kinds` | 등록된 기록 종류 `[{id, label, keys:[…], session:[…]}]`의 **읽기 전용 복사본**(읽을 때마다 새 배열. 바꿔도 등록 목록은 그대로). 기본: read, recent, pos, recentq(`jhb.ui.palette.recentq`, 세션 `jhb.q`), fav, role, settings(`jhb.theme`, `jhb.fs`, `jhb.ui.settings`, `jhb.ui.reading.mode`, `jhb.ui.home.installHidden`) |
| `register(kind)` | 종류 등록(같은 id 면 바꿔 씀). 등록된 내용의 복사본을 돌려줘요 |
| `has(id)` | 그 종류의 기록이 이 기기에 하나라도 있으면 true |
| `clear(idsOrAll)` | 글자 `'all'` 일 때만 등록된 키 전부 + `jhb.privacy.*` 를 지워요(**단 기록 쉼 `paused` 는 남겨요**: 전부 지운 뒤 조용히 기록이 다시 시작되지 않게. 최근 검색 저장은 꺼져요). id(문자열이나 배열)를 주면 그 키만. **인자를 빠뜨리면(undefined·null·빈 배열) 아무것도 지우지 않아요.** 지운 id 목록을 돌려주고 `jhb:privacy` 를 발행해요(인자를 빠뜨린 경우는 빈 목록, 이벤트 없음) |

### G9. 건강과 관련된 입력을 받는 모듈·화면(메모, 계획, 질문 목록 등)
1. 저장 기본 꺼짐.
2. 켤 때 "이 기기의 브라우저에만 저장돼요. 같은 기기를 쓰는 사람이 볼 수 있어요" 안내(`JHB.app.notice('device')`).
3. 저장 중이면 화면에 "이 기기에 저장 중 · 지우기" 상시 표시와 한 번에 전부 지우기.
4. 입력을 주소(쿼리·조각)·공유·외부로 보내지 않기.
5. 109·1577-0199·119 고정 줄(특집 화면은 장치가 붙여요, 모듈은 `notice('crisis')`).
6. 입력을 분석해 점수·판정·다른 안내를 내지 않기.
7. `JHB.app.privacy.register()` 로 기록 종류 등록, `privacy.paused()` 존중.

## 7. 화면 구조(선택자)

- 상단 `.topbar` (`#btn-nav`, `.brand`, `.qs`/`#q`(포커스만으로는 아무것도 열지 않아요. 글자 입력·클릭·Enter·아래 화살표에서 팔레트가 열리고, 팔레트가 없으면 Enter → `goSearch`. 한글 조합 입력은 조합이 끊기지 않게 #q 에서 치다가 0.5초 멈추면 그 값으로 열려요), `.tools` 안에 `#btn-help.tool-help`(지금 도움, 자바스크립트 없이도 위기 상담 전화 글로 감), `.tool-link[data-r]`(상단 링크), `#btn-fs`, `#btn-theme`), 진행 막대 `#progress`
- 왼쪽 `#sidenav`(≤1080px 서랍, `.open`): 분류 → `.nav-pages`(살펴보기, `.nav-group-h` 묶음 제목) → `.nav-extra`
- 본문 `#app`. 문서 `article.doc > .doc-main`(`.doc-head`, `.crisis`, `.emergency`, `.doc-slot[data-slot=lead]`(`.keypoints`), `.toc-m`, `.body`, `.doc-slot[data-slot=after-body]`, `.sources`, `.disclaimer`, `.course-nav`, `.backlinks`, `.see-also`, `.pager`, `.doc-slot[data-slot=end]`) + `.doc-margin`(`.infobox`, `.doc-slot[data-slot=margin]`, `.notes`)
- 특집 화면 `#app > .crumb, h1.page-title, p.page-lead, .fp-body[data-page=<id>], .fp-notices > .notice.notice-<종류>`
- 첫 화면 `.portal` 의 섹션들은 `section[data-sec]` = `today`·`continue`·`courses`·`recent`·`index`·`terms`(모듈이 더함: `shelf`, `start`, `new`)
- 본문 소제목 `.body h2[data-key="core"|"detail"]`, 용어 버튼 `.body .term`, 출처 번호 `.body .fn a`, 콜아웃 `.callout.callout-<종류>`
- 팝오버 `#pop`, 위기 배너 `.crisis`, 바닥 `.sitefoot`

## 8. 시험하는 법

- **빌드 없이 보기**: `node serve.cjs`(기본 5174, 다른 포트는 `PORT=5175 node serve.cjs`). 개발 서버는 `css/ui.css` 와 `data/pages.js` 를 즉석에서 만들고, 모든 HTML 의 모듈 줄·상단 링크를 지금 파일 기준으로 바꿔 보내요. `<id>/` 폴더가 아직 없어도 `data/pages/<id>.json` 이 있으면 그 주소가 열려요(정적 본문 없이 앱이 그림). 선언 오류는 서버 터미널에 나와요.
- 브라우저 확인: 1280×800 과 390×844 에서 실제로 눌러 보고 콘솔 오류 0, 가로 넘침 0, 밝은·어두운 화면을 확인해요. Playwright 를 여럿이 함께 쓰면 공유 page 를 건드리지 말고 자기 컨텍스트(`browser.newContext({ viewport, serviceWorkers: 'block' })`)를 만들어 쓰고 닫아요.
- `node tests/run.cjs` 는 깨지지 않아야 해요. 선언 검사만: `node tools/build-kb.cjs`.
- 전체 빌드(통합 담당): `node tools/build-all.cjs` = check-content → build-kb → build-index → build-links → build-ui-css → build-pages(하나라도 실패하면 멈춤).
