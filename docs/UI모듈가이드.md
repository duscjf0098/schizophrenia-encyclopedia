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
- 색·글꼴은 `css/style.css` 의 토큰만 써요: `--paper --paper-2 --paper-3 --ink --ink-2 --muted --rule --rule-2 --accent --accent-2 --accent-soft --accent-ink --mark --bad --bad-soft --warn --warn-soft --ok --ok-soft --calm --calm-soft --calm-ink --serif --sans --fs-body --top-h --shadow-pop`. 어두운 화면은 토큰이 알아서 바뀌어요.
- **위기 안내 색은 `--calm` 계열**(차분한 청록빛 남색): `--calm` 글자·띠·테두리·전화 버튼, `--calm-soft` 바탕, `--calm-ink` 꽉 찬 전화 버튼의 글자. 지금 문서 위기 배너(`.crisis`)·본문 위기 콜아웃(`.callout-crisis`)·찾기 위기 카드(`.crisis-card`)와 길잡이·종이·신호 한 장 화면의 위기 줄이 써요. `--bad`(빨강)는 **오류 표시에만** 써요(`css/style.css` 의 규칙에는 `var(--bad)` 가 하나도 없어요. `tests/core.test.cjs` K3-3 이 지켜요). 몸의 응급 줄(`.emergency`)은 `--warn` 이에요. 인쇄에서는 `css/ui/print.css` 가 `--calm` 셋도 밝은 값으로 정해요(3-1).
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
| `notice` | | 고지 종류: `general`(늘 붙음, 뺄 수 없음) · `device`(기기 안 기록 화면) · `emergency` · `dated` · `revised` · `crisis`(적어도 위기 줄은 `crisisLine` 하나로 **한 번만** 붙어요. 정리 때 notice 에서 빠져요). 날짜가 붙는 두 종류는 아래 표 |
| `updated` | | 실제 있는 `YYYY-MM-DD`(`2026-02-30` 은 검사 오류, `progress.isDay`). `dated` 고지의 날짜(늘 이것), 사이트맵 lastmod 와 `revised` 고지의 날짜(아래 `lastmod` 가 없거나, 그 자료에서 날짜를 찾지 못할 때) |
| `lastmod` | | 날짜를 자료에서 읽을 때만: `"kb:<data/kb 이름>:<날짜 경로>"`. 경로는 점으로 이어요. 자료가 배열이면 항목마다 경로를 따라가고(예: 고침 기록 `"kb:changes:date"` = `data/kb/changes.json` 항목들의 `date` 가운데 가장 최근), 배열이 아닌 자료는 그 객체에서 따라가요(예: `"kb:red-flags:source.updated"`). 경로 중간의 배열도 펼쳐 봐요. 실제 있는 `YYYY-MM-DD` 만 세요(`2026-02-30`·시각이 붙은 글자는 건너뜀). 자료가 배열·객체가 아니거나 파일이 없으면 검사 오류, 날짜가 하나도 없으면 경고와 함께 `updated` 를 써요. 이 날짜가 **사이트맵 lastmod 와 `revised` 고지에 함께** 쓰여요(빌드 `tools/lib/assets.cjs` 의 `resolveLastmod`·`resolveNoticeDate` 와 앱 `js/app.js` 가 같은 순수 함수 `js/progress.js` 의 `latestDate`·`pageDate`·`noticeDate` 를 써요). `dated` 고지는 이 날짜를 쓰지 않아요. 빌드는 이 항목이 있는 화면만 자료를 읽어요(자료 모양으로 짐작하지 않음) |

날짜가 붙는 고지 두 종류(K8). 문구는 `js/md.js` 의 `NOTICE`, 날짜 규칙은 `js/progress.js` 의 `noticeDate(종류, 선언, 자료)` 한 곳이에요(앱과 정적 HTML 이 같은 글자).

| 종류 | 문구 | 날짜 | 뜻·쓰는 곳 | 선언 검사 |
|---|---|---|---|---|
| `dated` | "YYYY년 M월 D일에 확인한 내용이에요. 그 뒤에 바뀌었을 수 있어요." | 언제나 선언의 `updated`(`lastmod` 를 따르지 않아요) | **사람이 화면 내용을 원천과 대조해 확인한 날.** 화면 내용 전체(표·연락처 모두)를 원천과 다시 확인했을 때만 `updated` 를 올려요. 글 하나를 고쳤다고 올리지 않아요. 지금 `guide`(연락처를 확인한 날) | `updated` 가 꼭 있어야 해요(`lastmod` 로 대신할 수 없음) |
| `revised` | "YYYY년 M월 D일에 마지막으로 고쳤어요. 그 뒤에 바뀌었을 수 있어요." | 사이트맵과 같은 날: `lastmod` 자료의 가장 최근 날짜 → 없으면(자료를 못 받음·깨짐·날짜 없음) `updated` | **자료에서 구한 "마지막으로 고친 날".** 여러 글에서 모은 화면처럼 사람이 한날 전체를 대조했다고 말할 수 없을 때. 지금 `meds`(약 글 12편의 가장 최근 고친 날, `kb:meds:updated`)·`red-flags`(원천 글 부작용 총론의 고친 날, `kb:red-flags:source.updated`) | `updated` 나 `lastmod` 가 있어야 해요. `lastmod` 만 있으면 경고(자료를 못 받으면 날짜가 빠지니 `updated` 도 적어요) |

둘을 함께 써도 돼요(일반 → 선언 순서 → 위기 줄). 고친 날을 "확인한 내용"이라고 쓰지 않아요(글 하나만 고쳐도 표 전체를 그날 확인한 것처럼 보이지 않게).

`node tools/build-kb.cjs` 가 선언을 모두 검사해요(규칙 위반·중복·summary 초과·깨진 JSON·없는 data 파일·`lastmod` 가 가리키는 자료 없음 → 종료 코드 1). 형식 한 쪽 요약은 `data/pages/README.md`.

### 2-2. 화면 코드 `js/pages/<id>.js` (브라우저·node 겸용 한 파일)
```js
(function (root) {
  const page = {
    id: 'guide',
    /* 선택. 검색엔진·자바스크립트 꺼진 환경용 HTML 문자열. document 를 쓰지 않아요.
       ctx = { data: {이름: json}, esc(s), articles: bySlug, sections, glossary: 용어 사전 배열, courses: 읽기 코스 배열, page: 선언 }
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
- `staticHtml` 문맥(`ctx`)은 빌드(`tools/build-pages.cjs` 의 `staticCtx`)와 앱(`render` 가 없는 화면을 브라우저에서 그릴 때, `js/app.js` 의 `drawFeature`)이 같은 이름을 줘요. 문맥은 `{ data, esc, articles, sections, glossary, courses, page }` 이고, 앱의 `drawFeature` 도 `glossary`(용어 사전 배열)·`courses`(읽기 코스 배열)를 넘겨요. 옛 판 대비 코드(`ctx.glossary || (window.JHB && JHB.app && JHB.app.glossary) || []`, `js/pages/browse.js` 의 `glossaryOf`)는 그대로 둬도 돼요. 새 코드에는 꼭 필요하지 않아요.
- 화면 전용 스타일은 `css/pages/<id>.css`(선택), 선택자 접두어는 `.pg-<id>-`.
- 화면 데이터는 `data/kb/<이름>.json`(JSON 만). 선언의 `data` 에 적으면 앱이 미리 받아 `ctx.data` 로 넘겨요. 다른 화면 데이터가 필요하면 `JHB.app.loadData(이름)`.
- `render` 가 없고 `staticHtml` 만 있으면 앱이 브라우저에서도 `staticHtml` 결과를 그대로 보여요(정적 HTML 이 없는 app-shell 에서도 같은 내용). js 파일이 아예 없으면(정적 전용) 본문은 비고 제목·lead·고지만 보여요(빌드·개발 서버가 경고). 본문 내용은 늘 `js/pages/<id>.js` 의 `staticHtml`/`render` 로 만들어요.
- 그릴 것이 아무것도 없으면(js 가 있는데 `render`·`staticHtml` 결과가 비었거나, js 도 lead 도 없음) 빈 몸통 대신 "화면 내용을 불러오지 못했어요" 안내가 나와요.
- 이벤트 처리기·타이머는 `ctx.onCleanup(fn)` 으로 정리해요(다음 화면을 그리기 직전에 불림).

### 2-3. 앱이 하는 일(순서)
1. `data/pages.js`(빌드가 만든 `JHB.pages`)를 `app.js` 보다 먼저 실어요. `route()` 는 기존 화면을 다 본 뒤 `JHB.pages` 에 있는 id 면 특집 화면으로 가요(그래서 "그런 문서가 없어요"가 깜빡이지 않아요).
2. 제목·왼쪽 목차를 그리고, `#app` 에 정적 내용(`.fp-body[data-page=id]`)이 있으면 그대로 둔 채, 없으면 "화면을 불러오고 있어요."를 보인 채 기다려요(이 자리 문구는 `jhb:page` 를 보내지 않아요).
3. `css/pages/<id>.css`·`js/pages/<id>.js` 를 `JHB.app.load()` 로 받고, 스크립트가 실행된 뒤 `registerPage` 가 불렸는지 봐요. 등록이 없으면(문법 오류·최상위 예외) 바로 실패해요. `data` 의 kb 파일도 받아요. `notice` 에 `revised` 가 있고 `lastmod` 가 있으면 그 자료도 함께 받아요(`js/app.js` 의 `noticeJob`, 고를 자료는 `progress.noticeRef`. 받지 못하거나 3초(`NOTICE_WAIT`) 안에 오지 않아도 실패가 아니고, 그때 날짜는 `updated`. 늦게 와도 이미 그린 날짜는 바꾸지 않아요). `dated` 는 자료를 기다리지 않아요. 10초가 넘거나 파일을 받지 못하면 실패예요.
4. `show([빵부스러기, h1.page-title, p.page-lead, div.fp-body[data-page=id], div.fp-notices])`(여기서 `jhb:page` 한 번) → `page.render(mount, ctx)` → `window` 에 `jhb:pageready`.
5. **고지는 장치가 강제로 붙여요.** `notice` 종류마다 한 줄(`general` 은 늘 맨 앞) + 위기 줄 한 줄. 화면 작성자가 뺄 수 없어요. 날짜는 `js/progress.js` 의 `noticeDate(종류, 선언, 자료)`(정적 HTML 과 같은 규칙, 2-1 의 고지 표): `dated` 는 선언의 `updated`, `revised` 는 `pageDate(선언, 자료)`(사이트맵과 같은 날). 자료를 3번에서 미리 받아 두니 고지가 그려진 뒤 날짜가 바뀌지 않아요. 실패 안내와 함께 그릴 때(자료 404 등)도 고지는 그대로 붙고, 날짜는 `updated` 예요.
6. 실패 안내는 원인에 따라 달라요(정적 내용이 있으면 그대로 남기고 그 아래에):
   - 파일을 받지 못함·시간 초과: "화면을 불러오지 못했어요(…). 인터넷 연결을 확인하고 새로고침해 주세요. 첫 화면 · 찾기"
   - 등록 안 됨·`render`/`staticHtml` 예외(코드 문제): "화면을 그리는 중에 문제가 생겼어요. 새로고침해 보거나 첫 화면 · 찾기로 가세요."
   - 그릴 것이 아무것도 없음(js 가 있는데 render·staticHtml 결과가 비었거나, js 도 lead 도 없음. 정적 HTML 없이 app-shell 로 열린 빌드 전 개발 서버·오프라인 첫 방문 포함): "화면 내용을 불러오지 못했어요. 새로고침해 보거나 첫 화면 · 찾기로 가세요."
   - 자료 파일(`data/kb/*.json`)이 404 이거나 JSON 이 깨짐(배포·코드 문제): "화면 자료를 찾지 못했어요. 새로고침해 보거나 첫 화면 · 찾기로 가세요."(reason `data`)
   - 어느 경우든 `jhb:pageready` 는 한 번 와요. `detail.ok` 가 false 면 `reason`(`net`·`data`·`code`·`empty`)과 `error` 가 붙어요.
   - 배포 직후 옛 캐시의 `data/pages.js` 에 아직 없는 화면인데 정적 내용(`.fp-body[data-page=id]`)이 있으면 지우지 않고 "새로 올라온 화면이에요. 새로 고치면 다 보여요" 안내만 붙여요(`jhb:page`·`jhb:pageready` 없음). 문서 화면도 같아요.
   - 정적 내용이 있던 화면은 실제 화면을 그릴 때 스크롤 위치를 그대로 둬요.

### 2-4. 빌드가 하는 일
- `build-gen`: `tools/gen/*.cjs`(생성기)를 이름순으로 돌려요. 생성기는 글(`content/`)에서 화면 데이터를 뽑아 `data/kb/<이름>.json` 을 써요(인자 없이 실행, 같은 입력이면 같은 출력, 실패하면 종료 코드 1). 생성된 json 은 손으로 고치지 않아요. 개발 서버는 생성기를 돌리지 않으니 미리 보려면 `node tools/gen/<이름>.cjs` 를 직접 돌려요. 지금 있는 생성기 두 개는 2-6.
- `build-kb`: 선언 검사 → `data/pages.js`(묶음 안내→지식→도구→기록, 그 안에서 order·id 순, 항목마다 `hasJs`·`hasCss`).
- `build-pages`: 선언마다 `<id>/index.html`(제목·설명·robots·canonical, 본문 = 빵부스러기 + h1 + lead + `.fp-body` 안에 `staticHtml(ctx)` + 고지). `index` 화면은 사이트맵에(날짜는 `lastmod` → `updated` → 빌드한 날 순). 정적 고지(`featureNoticesHtml`)의 날짜는 `assets.resolveNoticeDate(선언, 종류)`(앱과 같은 `progress.noticeDate`: `dated` = `updated`, `revised` = 사이트맵과 같은 `resolveLastmod` 값)라 앱이 다시 그려도 같은 글자예요. `staticHtml` 에서 예외가 나면 어느 화면인지 알리고 멈춰요. 선언이 사라진 화면의 옛 폴더(빌드가 만든 `index.html` 하나만 든 폴더)는 지워요.
  - 분류 글 순서는 앱과 같은 `js/paths.js` 의 `sectionArticles(articles, id)` 한 곳(order 오름차순, 없거나 0 이면 맨 뒤 → 제목 가나다). 빌드에도 앱에도 정렬 규칙 사본이 없어요(`tests/core.test.cjs` K3-7·K5-4).
  - 분류 `s/<id>/`: `data/kb/groups.json` 이 있으면 `js/ui/hub.js` 의 `arrange()` 를 그대로 써서 앱과 같은 "먼저 읽을 글"·묶음 제목·글 순서로 그려요(hub 모듈과 같은 마크업 `.hb`, 같은 css). 없는 slug 는 건너뛰고 빠진 글은 "그 밖의 글". 자료가 없거나 `js/ui/hub.js` 가 없으면 평평한 목록(빌드는 hub 모듈 없이도 멈추지 않아요). 머리 문장은 앱과 같은 "설명. 문서 N개."
  - 읽기 코스 `courses/`: 머리 문장은 앱(`coursesPage`)과 같아요. 코스 수(`data/courses.js` 에서 셈)는 설명(meta description)에만 넣어요.
  - 문서 `a/<slug>/`: 근거 줄(`p.doc-meta-s`)은 `md.docMetaHtml` 에 `reviewed` 까지 넘겨서 "출처 확인 YYYY.MM.DD"(`span.doc-reviewed`)가 정적 HTML 에도 보여요. 맨 앞에 화면에서는 숨고 인쇄에서만 보이는 한 줄 `p.prt-static`(사이트 이름 + 정식 글 주소. 스타일은 `tools/shell.html` 의 `<style>`. 인쇄 모듈 머리 `.prt-head` 가 있으면 인쇄에서도 숨음)이 있어요. 자바스크립트가 꺼졌거나 앱이 다시 그리기 전에 인쇄해도 첫머리에 출처가 남아요.
  - 바닥글 링크 줄(`<!--foot:start-->…<!--foot:end-->`): "이 백과에 대해" + `changes` 화면이 있으면 "고침 기록". 개발 서버도 같은 함수(`assets.footLinksHtml`)로 바꿔 보내요. 이 줄은 `p.foot-links` 이고, 화면에서는 링크의 누르는 높이가 44px(글자 크기는 그대로, 인쇄에는 적용 안 함)예요. 위기 줄은 앱 고지(`md.noticeHtml('crisis')`)와 같은 뜻으로 109·1577-0199·119와 "전화가 어렵다면 109로 문자를 보낼 수 있어요."를 실어요(`tests/pages.test.cjs` 가 두 곳의 문자 안내를 맞대요).
  - 머리 스크립트는 첫 그리기 전에 `<html class="js">` 를 달아요. 자바스크립트가 꺼진 화면(`html:not(.js)`)에서는 눌러도 동작하지 않는 상단 버튼(`#btn-nav`·`#btn-fs`·`#btn-theme`)을 감춰요("지금 도움"은 링크라 그대로). 모듈이 JS 없는 화면만 따로 꾸밀 때도 `html:not(.js)` 를 쓰면 돼요. 첫 화면 자리 표시 `data-hm-start` 는 **쓰지 않아요**: 머리 스크립트가 달지 않고, 그 속성을 읽던 `css/ui/home.css` 규칙(72px 예약)도 지웠어요(K4). 코어가 다시 온 사람의 첫 화면을 처음부터 이어서 읽기·코스·오늘의 문서 순으로 그려서 속성 없이도 CLS 가 1280 0.014~0.017, 390 0.002~0.003 이에요(잰 값은 `tests/pages.test.cjs` 의 '머리 스크립트' 테스트 주석).
- `build-index`: `data/toc.js` 글 항목에 frontmatter 의 `reviewed`(YYYY-MM-DD)를 있을 때만 넣어요(`JHB.app.articles[i].reviewed`). 프리캐시에 `data/pages.js`, `js/pages/*.js`, `css/pages/*.css`, `data/kb/*.json`, 모든 `js/ui/*.js` 를 넣어요(오프라인에서도 열림).
- 상단 도구 줄: "용어 사전" + `nav` 에 `top` 이 있는 화면(label). `me` 가 없으면 "저장한 문서", `browse` 가 없으면 "아무 문서" 링크가 남아요.
- 왼쪽 목차: 분류 아래 "살펴보기" 묶음(`side` 화면, 묶음 작은 제목과 함께). 화면이 0개면 그리지 않아요. `me` 가 있으면 아래 "저장한 문서" 줄 대신 `me` 의 제목(내 서재)이 보이고, 살펴보기에는 넣지 않아요.

### 2-5. 손으로 관리하는 지식 데이터(`data/kb/*.json`)
새 글을 쓰는 사람도 여기에 한 줄 더하면 화면에 반영돼요. 모양은 테스트가 지켜요.

| 파일 | 모양 | 쓰는 곳 | 검사 |
|---|---|---|---|
| `groups.json` | `[{ "section": "7", "first": [slug…(최대 3)], "groups": [{ "title": "약의 원리", "slugs": [slug…] }] }]` — 용어 사전(14)을 뺀 분류마다 한 항목. 그 분류의 모든 글이 묶음 하나에 정확히 한 번 | 분류 화면(`JHB.ui.hub`, 정적 `s/<id>/`도 같은 규칙), 둘러보기 지도(`js/pages/browse.js`), 다음 걸음의 "같은 묶음의 다음 글" | `tests/groups.test.cjs` |
| `nextsteps.json` | `{ "<slug>": { "self": [slug…], "family": […], "near": […], "any": [slug…] } }` — 글 끝 "다음 걸음" 손 지정(30~50편, 지금 49편. 테스트가 30~50 을 지켜요). `any`(역할을 정하지 않았을 때)는 꼭 있어야 하고, 목록마다 질문 글을 빼면 3편 이하. 15분류(자주 묻는 질문) 글은 다음 걸음이 아니라 "이 주제의 자주 묻는 질문"으로 가요. 위기 글의 목록에는 회복·도움 글을 섞어요. 고르는 규칙은 아래 표 다음 줄 | `JHB.ui.nextsteps` | `tests/nextsteps.test.cjs` |
| `contacts.json` | `[{ "id": "rescue-119", "name", "tel", "hours"(글자나 null), "checked": "YYYY-MM-DD", "source": "https://…", "alsoIn": [slug…], "note"(글자나 null), 선택: "needsArea": true, "hoursSource", "noteSource" }]` — 화면에 보이는 공공 연락처 번호의 한 곳(레지스트리). **id 는 바꾸지 않아요**(다른 화면·테스트가 id 로 찾아요). `checked`(확인한 날)와 `source`(공식 기관 https 주소: go.kr·or.kr·korea.kr)는 꼭 있어야 해요. `alsoIn` 글 본문에 그 번호가 실제로 있어야 하고, 병원·의원·의사 이름은 싣지 않아요. 운영 시간을 공식 페이지에서 확인하지 못했으면 `hours` 를 null 로 둬요 | 상황별 길잡이(`guide/`, 선언 `data` 에 `contacts`), 바로 연락할 신호 한 장(`red-flags/`, 맨 위 119 가 `rescue-119` 와 같은 번호인지 테스트가 견줘요) | `tests/guide.test.cjs`, `tests/red-flags.test.cjs` |
| `changes.json` | `[{ "date": "YYYY-MM-DD", "kind": "new"\|"enrich"\|"fix"\|"feature", "slug" 또는 "title"(둘 중 하나만. feature 는 title), "what": "…요." }]`(what 은 100자 이하 한 줄) | 고침 기록 화면(`changes/`), 글의 "이 글의 고친 내역"(`JHB.ui.trust`), 사이트맵 날짜(선언에 `"lastmod": "kb:changes:date"` 가 있을 때) | `tests/changes.test.cjs` |

다음 걸음 고르기(`js/ui/nextsteps.js`, 손 지정 표를 더하는 사람이 알아둘 것):
- 손 지정은 본문 끝 "더 읽을 글"과 겹쳐도 자동 규칙(코스·본문 링크·묶음)보다 앞이에요.
- 폭력·응급이 주제인 글은 `js/ui/nextsteps.js` 의 `HEAVY` 목록에 있어요(태그가 아니라 목록. `위기` 태그는 자살·자해를 한 소절이라도 다루면 붙어서 일상 글에도 있어요). 새 글이 이런 주제면 그 목록에 더해요(`tests/nextsteps.test.cjs` 가 slug 를 검사). `HEAVY` 글은 그런 글이 아닌 글 끝에서 자동 규칙으로는 맨 앞에 두지 않고 한 편까지만 써요(손 지정은 그대로).
- 낙인을 다루는 글 끝에서는 범죄·재판 글(`CRIME`)도 자동 규칙으로는 맨 앞에 두지 않아요. 폭력·응급 글이 아닌 글 끝에서는 폭력·분노 질문을 "이 주제의 자주 묻는 질문" 맨 앞에 두지 않아요.
- 폭력·응급 글이 아닌 글 끝에서는 위기·응급 태그 카드의 요약을 감추고 제목만 보여요(`quiet`). 세 편이 모두 위기·응급 글이면 마지막 자리를 위기·응급이 아닌 글로 바꿔요.
- 질문 아래 답 줄은 `answerOf`(요약 첫 문장 + 다만·하지만… 같은 균형 문장 + 의사·혼자·스스로가 든 문장)로 만들어요.

### 2-6. 생성기가 만드는 지식 데이터(`tools/gen/*.cjs`)
생성기가 만드는 json 은 손으로 고치지 않아요. 원천 글을 고친 뒤 미리 보려면 **그 생성기를 직접 돌려요**(개발 서버는 생성기를 돌리지 않아요). 원천 글이 아래 약속을 어기면 생성기가 이유를 알리고 **종료 코드 1** 로 멈추고, 그러면 `node tools/build-all.cjs` 도 `build-gen` 에서 멈춰요(파일은 쓰지 않아요).

| 생성기 | 만드는 것 | 원천 | 멈추는 경우(글과 이어진 약속) | 검사 |
|---|---|---|---|---|
| `tools/gen/red-flags.cjs` | `data/kb/red-flags.json` → 바로 연락할 신호 한 장(`red-flags/`) | 부작용 총론(`side-effects-overview.md`)의 `## 바로 연락할 신호` 소절에 있는 표 하나 | 소절·표가 없음 · 열 이름이 `신호 \| 의심되는 상태 \| 할 일 \| 자세한 글` 이 아님 · 칸 수가 다르거나 빈 칸 · 할 일의 첫 마디가 `바로 119` 나 `오늘 안에 … 연락` 이 아님 · 자세한 글 칸에 `[제목](#/a/slug)` 링크가 없거나 없는 글 · **표 바로 뒤 문단**이 "약을 스스로 끊지 말고 … 연락" 문장이 아님(표와 그 문장 사이에 다른 문단을 넣으면 멈춰요) · **표 앞 첫 문단**이 선언 `data/pages/red-flags.json` 의 `lead` 와 글자까지 같지 않음 | `tests/red-flags.test.cjs`(생성물이 다시 돌린 결과와 같은지도) |
| `tools/gen/meds.cjs` | `data/kb/meds.json` → 항정신병약 한눈에(`meds/`) | `content/07-medication/` 의 약 글(12편)마다 있는 `## 약 카드` 표(`\| 항목 \| 내용 \|` 2열) | 행 빠짐·겹침·모르는 행 · 빈 칸 · 부작용 칸이 적은 편·중간·많은 편·자료 부족으로 시작하지 않거나, 자료 부족이 아닌데 각주가 없음 · 없는 출처를 가리키는 각주 · **표에 넣지 않는 낱말**(용량·용량 단위(mg 등)·복용 횟수·추천·순위·별점·"이런 사람에게"·가격·약값·임신·상호작용·상품명·®·™, 목록 `FORBIDDEN`) · **칸 길이**(꼭 알아둘 것 140자, 나머지 60자, 띄어쓰기 없이 이어진 글자 24자까지) · frontmatter 의 title·updated 형식 | `tests/meds.test.cjs` |

약 카드의 행 이름·금지 낱말·칸 길이 규칙은 검사기 `tools/checks/drug-card.cjs` 에 있고 생성기가 가져다 써요(자세한 글쓰기 규칙은 `docs/집필가이드.md` 의 약 카드 절). 부작용 총론 표의 약속도 집필가이드에 있어요.

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

### 3-1. 인쇄 약속(`js/ui/print.js`, `css/ui/print.css`)
- **자리 상자**: 인쇄에서 `after-body`·`end`·`margin` 자리에 끼운 상자는 숨고 `lead` 자리는 남아요. 상자에 `data-print="keep"` 을 달면 남고(`after-body`·`end` 자리), `data-print="hide"` 를 달면 어디서든 빠져요. `margin` 자리는 통째로 숨으니 종이에 남길 것은 `end` 자리에도 두어요(예: `js/ui/trust.js` 의 출처 확인 줄 `section.trust-end[data-print=keep]`).
- **body 바로 아래**: 인쇄에서는 `.shell`(본문 틀)과 `.sitefoot` 만 남고 나머지(상단 바·하단 바·시트·토스트 등 모듈이 body 에 붙인 것)는 이름과 상관없이 숨어요.
- **색 토큰**: 인쇄할 때 `print.css` 가 밝은 토큰을 `html:root:not([data-print-tokens="own"])`(특이도 0,2,1)로 정해요. 특집 화면이 자기 인쇄 색을 정하려면 `:root:has(.fp-body[data-page="<id>"])`(0,3,0)처럼 더 구체적인 선택자로 덮어요. `!important` 는 쓰지 않아요. 공통 인쇄 토큰을 아예 끄려면 `<html data-print-tokens="own">`.
- **글자 크기**: 인쇄 본문 `--fs-body` 는 보기 설정을 따라 10.5pt(작게)·11.5pt(보통)·12pt(크게)·13pt(더 크게·아주 크게)예요.
- **머리·꼬리**: 문서 화면에는 인쇄에서만 보이는 머리 `.prt-head`(사이트 이름·분류·인쇄한 날·주소, `위기` 글은 109·1577-0199·119, `응급` 글은 119 줄)와 꼬리 `.prt-foot`(위기 고지)가 붙어요. 머리가 있으면 바로 뒤 빵부스러기는 인쇄에서 숨어요. 자바스크립트 없이 인쇄한 정적 문서에는 `p.prt-static`(2-4)이 그 자리를 맡아요. 주소는 쿼리·조각을 뺀 경로만 적어요.
- **바닥 고지**: 문서 꼬리가 있는 문서 화면(`html.prt-doc`)과 고지 줄(`.fp-notices`)이 있는 특집 화면에서는 바닥글(`.sitefoot`)을 종이에 겹쳐 싣지 않아요.
- 특집 화면이 자기 인쇄 버튼을 두면 `JHB.ui.print.print()` 를 불러요(4-1). 찾기 입력 줄(`#app .searchbar`, `input[type=search]`)은 입력한 말이 종이에 남지 않게 인쇄에서 숨어요.

글 frontmatter 와 이어진 표시(앱과 정적 HTML 이 같은 마크업):
- `points:` 목록(2~4줄)이 있으면 `lead` 맨 앞에 `section.keypoints`(제목 "핵심 3가지", 줄 수가 3이 아니면 "핵심 정리"). `위기` 태그 글이면 상자 끝에 "지금 힘들면 109 · 1577-0199".
- `tags` 에 `응급` 이 있으면 위기 배너 자리 근처에 `div.emergency`(role=note, 119 tel 링크, 경고 노랑 계열). `위기` 와 함께면 둘 다.
- 정적 문서 HTML 에도 위기 배너, 응급 줄, 핵심 3가지, 근거·읽는 시간·고친 날 한 줄(`p.doc-meta-s`: 근거 칩 · "약 N분" · "2026.10.25 고침" · `reviewed` 가 있으면 "출처 확인 2026.11.14". 앱의 휴대폰 머리 줄 `.doc-meta-m` 과 같은 글자, `md.docMetaText`·`md.docMetaHtml`), 문서 고지(`p.disclaimer`), 인쇄용 한 줄(`p.prt-static`)이 들어가요.
- 본문 전화번호: `**109**` 처럼 굵게 싼 공공 번호(109·112·119·129·13xx 등)와 `1577-0199` 꼴(15xx~18xx-xxxx)은 `tel:` 링크가 돼요. "109명", "제119조", 연도 범위("1650-1750 사이", "1990-2017년"), ISSN·ISBN 뒤 번호, DOI 속 숫자, 링크·코드 안은 그대로예요. 규칙은 `js/md.js` 의 `telLinks` 한 곳이에요:
  - 굵게 싼 짧은 번호 뒤에 단위가 붙으면 번호가 아니에요(`TEL_UNITS`: 명·개·년·조·항·호·세·살·%·번째·만·천·억·원·회·건·곳·일·시간·분·위·차·쪽·mg·kg·ml·cm 등). 주·점은 붙여 쓴 것만("**12**주", "**120**점". "**109** 주 7일"처럼 띄우면 번호).
  - 15xx~18xx-xxxx 꼴은 굵게 싸지 않아도 링크예요. 앞 글자가 숫자·영문·`-./`(주소·DOI 속 숫자), 뒤가 숫자·`-`·"년"이면 아니에요.
  - 연도 범위 예외(굵게 싸지 않았고, 뒤 묶음이 1500~2099 이면서 앞 묶음보다 클 때만): 뒤에 사이·까지·년대·세기·에 걸쳐가 오거나, 경·무렵·동안·년간이 낱말로 끝날 때("1800-1900경에"는 범위, "경기·경찰·동안구"처럼 낱말의 일부면 아님. "에" 하나만으로는 범위로 보지 않음), 앞에 년·~ 가 있을 때. 그리고 괄호 속 생몰·시기 "(1820-1899)"(두 해 차이 110 이하, 바로 뒤 `)`)는 범위인데, 번호 바로 앞에 전화·상담·문의·번호·센터·연락처·ARS·☎ 가 붙어 있으면 번호예요("상담(1588-1600)"). 뜻이 넓은 대표·안내·연락은 괄호 안에 그 낱말 하나만 있을 때("(대표 1588-1600)")나, 바로 앞에 붙고 앞 묶음이 1700 보다 작을 때("대표(1544-1600)")만 번호예요(그래서 "연구 안내(1856-1926)"는 생몰년).
  - 굵게 싼 번호(`**1588-1600**`)는 늘 링크예요.
- 콜아웃(`::: 종류 제목`)은 `div.callout.callout-<종류>[role=note][aria-label=제목]` 이에요(예전 `aside` 아님, 클래스는 같음).
- 글에서 특집 화면으로 가는 링크는 `[미리 써 두는 종이](#/plan)` 처럼 `#/<화면 id>` 로 써요(글은 `#/a/<slug>`). 앱(화면에 붙는 `#/…` 링크)과 빌드(`P.rewriteHtml`)가 `js/paths.js` 의 `hashToPath` 로 `plan/` 같은 실제 경로로 바꾸고, 뒤의 조각은 경로 뒤로 옮겨요(`#/about#privacy` → `about/#privacy`). 미리 써 두는 종이는 `#/plan#safety-card`(→ `plan/#safety-card`)로 그 양식 탭을 바로 열 수 있고, 화면이 양식을 고른 뒤 `history.replaceState` 로 조각을 걷고 고른 양식을 이 탭의 기록 state(`planForm`)에 둬요(`dropHash`. 경로·쿼리와 state 의 다른 값은 그대로, 기록을 늘리지 않음. 탭을 바꿀 때·처음 그릴 때·이미 그 화면에서 조각만 바뀔 때 모두 이 함수). 그래서 주소창과 이 탭의 뒤로 가기 목록에는 양식 이름이 남지 않고, 새로 고침·뒤로·앞으로 와도 고른 양식이 다시 열려요(state 가 없으면 첫 양식). 조각이 양식 id 일 때만(끝의 `/` 하나는 봐줌) 그렇게 하고, 양식 id 가 아닌 조각(`#app` 등)은 처음 그릴 때도 건드리지 않아요. 한계: 페이지 스크립트가 돌기 전에 브라우저가 확정한 이동이라, 브라우저 전체 방문 기록(예: chrome://history)과 주소창 자동 완성에는 `plan/#safety-card` 가 남을 수 있어요(이 탭의 목록은 바뀌어도 그쪽은 페이지가 지울 수 없어요). 이미 그 화면에서 주소창에 조각을 직접 바꾸면 브라우저가 쌓은 기록 하나가 남아 뒤로 가기 목록에 `plan/` 가 하나 늘어요. 그 기록의 state 에 앞 양식이 있어서 뒤로 가면 앞 양식 탭으로 돌아가요(`popstate`). 흔적을 아예 없애려면 글 링크에서 조각을 빼고 양식 선택을 sessionStorage 로 한 번만 넘기는 방식이 다음 판 후보예요.

## 4. 공개 API: `JHB.app`

| 이름 | 뜻 |
|---|---|
| `BASE` | 현재 페이지에서 사이트 루트까지 상대 경로(`''`, `'../'`, `'../../'`) |
| `L(h)` | `'#/a/slug'` 같은 옛 해시 링크를 실제 경로로. 링크 href 를 만들 때 사용(화면에 붙는 `#/…` 링크는 자동으로 바뀌기도 해요) |
| `go(h)` | 그 주소로 이동 |
| `where()` | `{ path: ['a','slug'], query: {...} }` 현재 위치. `path[0]`: `''`(첫 화면)·`a`·`s`·`search`·`glossary`·`fav`·`about`·`courses`·`course`·`random`·특집 화면 id |
| `articles` | 문서 목록 `[{slug, section, order, title, summary, tags, updated, evidence, minutes}]` |
| `bySlug`, `secById`, `sections`, `glossary`, `courses` | 색인 |
| `sectionArticles(id)` | 그 분류의 문서(순서대로). 규칙은 `JHB.paths.sectionArticles(articles, id)` 한 곳(빌드도 같은 함수) |
| `progress` | 읽음 기록 인스턴스(`isRead`, `markRead`, `sectionProgress`, `continueReading`, `courseProgress`, `markCourse`, `enteredCourses`) 또는 null. 아래 "이어서 읽기" |
| `isFav(slug)`, `toggleFav(slug)`, `favs()` | 저장. `toggleFav` 는 `jhb:fav` 를 발행해요 |
| `openPop(anchor, nodes)`, `closePop(refocus)` | 공용 팝오버(#pop). nodes 는 DOM 노드 배열. 760px 이하에서는 아래 시트(`.sheet`). 열면 팝오버로 포커스가 가고 anchor 에 `aria-expanded="true"`·`aria-controls="pop"`, 닫으면 `aria-expanded="false"`. **키보드**: 마지막 요소 다음 Tab·첫 요소(또는 팝오버 자신) 앞 Shift+Tab·Esc 면 닫고 anchor 로 돌아가요(다음 Tab 은 anchor 의 다음 요소). 그 밖에 포커스가 키보드·프로그램으로 팝오버 밖의 요소로 옮겨 가도 닫고 anchor 로 돌아가요. 다만 마우스·터치로 누른 곳, 글을 칠 칸(input·textarea·select·contenteditable), 다른 모듈의 대화상자(`dialog`·`[role=dialog]`·`[aria-modal=true]`)로 간 포커스는 빼앗지 않고 닫기만 해요(판정은 `js/progress.js` 의 `popTabOut`·`popLeave`, 테스트 `tests/progress.test.cjs`). 화면을 바꿀 때는 닫기만 하고 옛 anchor 로 포커스를 돌리지 않아요(새 화면의 포커스는 라우터 몫). 닫을 때 포커스가 팝오버 안이었으면(`closePop()` 이라도) BODY 대신 anchor 로, anchor 가 안 보이면(display:none·inert) 본문 `h1`(없으면 `#app`)로 가요(화면은 옮기지 않음). **창 크기**: 너비가 바뀌거나 화면을 돌리면 다시 자리 잡고(넓은 화면 ↔ 아래 시트), anchor 가 안 보이게 됐으면 닫아요. 높이만 바뀌면(휴대폰 주소창) 그대로. 마우스로 다른 곳을 누르면 닫혀요 |
| `announce(text)` | 스크린 리더용 알림(aria-live) |
| `effectiveTheme()` | `'light'`/`'dark'` |
| `setNav(open)` | 좁은 화면 서랍 목차 열고 닫기 |
| `el(spec, attrs, children)`, `esc(s)` | DOM 헬퍼(`el('a.cls', {href, onclick}, ['text'])`), 이스케이프 |
| `nav`, `main` | `#sidenav`, `#app` 요소 |
| `row(article)` | 문서 행(`li.row`) 만들기 |
| `courseCard(course)` | 읽기 코스 카드(`a.course`, 첫 화면·코스 목록과 같은 마크업. 진도 막대 포함) |
| `spine(section)` | 분류 색 막대 |
| `search()` | 검색 색인 로드(Promise → index; `JHB.search.query(index, q, {limit})`) |
| **`goSearch(q, {section})`** | 찾기 화면으로 가기. 검색어는 `sessionStorage['jhb.q']` 로 한 번만 넘기고 주소는 쿼리 없는 `search/`(검색어를 주소·서버·캐시·탭 제목에 남기지 않음). **검색 이동은 꼭 이것으로**(`'#/search?q='` 금지). 이미 찾기 화면이면 그 자리에서 찾아요 |
| `store` | localStorage 래퍼 `get(key, fallback)`·`set(key, val)`(실패하면 false)·`remove(key)` |
| **`pages`**, **`pageById`** | 특집 화면 선언 배열(정렬됨)과 색인 |
| **`registerPage(page)`** | `js/pages/<id>.js` 가 불러요 |
| **`load(src)`** | `.js`·`.css` 를 한 번만 붙이고 Promise(실패 시 reject). src 는 사이트 루트 기준 상대 경로(`'js/pages/guide.js'`). 이미 페이지에 같은 주소의 태그가 있으면 **바로 resolve** 해요(그 스크립트가 벌써 실행됐는지·실패했는지는 보지 않아요). 그래서 화면 코드에서 모듈 API(`JHB.ui.*`)를 `load('js/ui/…')` 로 기다릴 수 없어요 → **모듈 API 는 `DOMContentLoaded` 뒤에 확인**해요(`document.readyState === 'loading'` 이면 그 이벤트를 기다림). 앱이 특집 화면 코드를 모듈 스크립트보다 먼저 붙일 수 있어서예요 |
| **`loadData(name)`** | `data/kb/<name>.json` 을 받아 Promise(한 번만 받음) |
| **`loadArticle(slug)`** | 글 원문을 받아 `Promise<{meta, body}>`(frontmatter·본문 Markdown, 앱 캐시 사용). 없는 글이면 reject |
| **`md`**, **`links`** | `JHB.md`(렌더러·고정 안내 문구), `JHB.links`(없으면 null) |
| **`show(nodes, opts)`** | `#app` 을 그 노드들로 바꿔요(정리 함수 실행 → 그리기 → `jhb:page`). `opts.silent` 면 `jhb:page` 를 보내지 않고, `opts.loading` 이면 detail 에 `loading: true` 를 붙여요(자리 문구용) |
| **`setTitle(t)`** | 탭 제목 "t - 조현병 백과"(빈 값이면 "조현병 백과") |
| **`crumb(parts)`** | 빵부스러기 `nav.crumb`. `crumb([{href:'#/', text:'첫 화면'}, '길잡이'])` |
| **`notFound()`** | "그런 문서가 없어요" 화면 |
| **`onCleanup(fn)`** | 다음 `show()` 직전에 한 번 불림 |
| **`slot(name)`**, **`mount(slotName, node, order)`** | 문서 화면 확장 자리(3장) |
| **`notice(kind, arg)`** | 공용 고지 DOM(`div.notice.notice-<kind>[role=note]`). `general`(일반 정보·담당 의사와·AI 초안·감수 없음), `crisis`(109·1577-0199·119 tel 링크), `emergency`(몸의 응급 119), `device`("이 기기의 브라우저에만 저장돼요…"), `dated`(arg = 'YYYY-MM-DD' → "○○에 확인한 내용이에요". 사람이 원천과 대조해 확인한 날에만), `revised`(arg = 'YYYY-MM-DD' → "○○에 마지막으로 고쳤어요". 고친 날). 날짜가 없거나 꼴이 틀리면 날짜 고지는 null, 모르는 종류면 null |
| **`privacy`** | 기기 안 기록(6장) |
| **`reducedMotion()`** | 운영체제의 움직임 줄이기 설정이거나 `<html data-motion="reduce">` 면 true |

고정 안내 문구는 `js/md.js` 한 곳에 있어요: `md.noticeHtml(kind, arg)`, `md.crisisHtml()`(문서 위기 배너), `md.emergencyHtml()`, `md.keypointsHtml(points, isCrisis)`, `md.DISCLAIMER`(문서 고지), `md.docMetaText(minutes, updated, reviewed)`·`md.docMetaHtml({evidence, ev, minutes, updated, reviewed})`(문서 머리 한 줄). 정적 HTML(`build-pages`)도 같은 함수를 써서 문구가 같아요. 바닥글(`tools/shell.html` 의 `.sitefoot`)의 위기 줄도 같은 세 번호(109·1577-0199·119, 전화 링크)예요.

**이어서 읽기**(첫 화면, `progress.continueReading(articles, courses, { entered, hideTags })`, 코어는 `entered: enteredCourses()`·`hideTags: ['위기', '응급']` 으로 불러요):
- 코스 이름·진도는 **들어간 코스**(코스 화면을 열었거나 `?course=` 로 글을 연 기록 `jhb.course`)에만 붙어요. 읽은 글이 여러 코스에 겹친다고 코스를 짐작하지 않아요.
- 들어간 코스의 다음 단계가 위기·응급 태그 글이면 그 글의 제목·slug 를 싣지 않고 `{ kind: 'course', course, article: null, hidden: true, onlyHidden, read, total, reason }` 을 돌려줘요(첫 화면은 제목 없이 코스 화면 링크). 다음 일반 단계로 건너뛰지 않아요(코스 순서 그대로). 남은 단계가 모두 숨길 글이면(`onlyHidden: true`) "코스에 아직 안 연 글이 N개 있어요"로 알려요.
- 그 밖에는 `{ kind: 'section', article, reason }`(같은 분류에서 아직 안 읽은 다음 글). 위기·응급 글은 제안하지 않고, 기준 글이 위기·응급 글이면 이유 문구에 그 제목을 내지 않아요. `hideTags` 를 주지 않는 옛 호출은 예전 그대로예요.
- 그 밖의 순수 함수(`JHB.progress`, node 에서도 `require('js/progress.js')`): `planClear`(기록 지우기 계획, 6장), `isReturning`·`homeOrder`·`HOME_ROLES`(첫 화면 순서: 다시 온 사람은 이어서 읽기·코스·오늘의 문서 순), `visibleRecent`(첫 화면 최근 목록에서 위기·응급 글 빼기), `lastmodRef`·`latestDate`·`pageDate`(특집 화면 날짜, 2-1 의 `lastmod`), `noticeDate(종류, 선언, 자료)`·`noticeRef(선언)`(고지 날짜와 그리기 전에 받을 자료, 2-1 의 고지 표).

### 4-1. 모듈 공개 API (`JHB.ui.*`)
모듈이 없으면 그 이름도 없어요. 쓰기 전에 `JHB.ui && JHB.ui.<이름>` 을 확인하고, 화면 코드라면 `DOMContentLoaded` 뒤에 확인해요(위 `load` 참고).

| 이름 | 파일 | 뜻 |
|---|---|---|
| `nowhelp.open(from?)` → `true`/`false` | `js/ui/nowhelp.js` | "지금 도움" 시트를 열어요. 보여 줄 전화번호 자료(`data/crisis-card.js`)가 없으면 열지 않고 `false` — 그때는 원래 링크(위기 상담 전화 글)대로 가게 두세요. `from` 은 닫을 때 포커스를 돌려줄 요소 |
| `nowhelp.close()`, `nowhelp.isOpen()` | | 닫기(포커스를 연 곳으로), 열림 여부 |
| `mobile.openToc()`, `mobile.openTerms()`, `mobile.close(refocus)` | `js/ui/mobile.js` | 휴대폰 하단 바의 차례·용어 바텀시트(문서 화면, 760px 이하) |
| `print.print()`, `print.prepare()`, `print.restore()` | `js/ui/print.js` | 인쇄(접힌 것 펴고 `window.print`), 인쇄 준비·되돌리기만(특집 화면이 자기 인쇄 버튼에서 써요). 3-1 |
| `nextsteps.pick(o)`, `nextsteps.refresh()`, `nextsteps.role()` | `js/ui/nextsteps.js` | 글 끝 "다음 걸음"(최대 3편)·"이 주제의 자주 묻는 질문"(최대 4개) 고르기(순수 함수, node 에서도 `require`), 다시 그리기, 지금 역할. 고르는 근거는 손 지정(`data/kb/nextsteps.json`, 2-5)·코스·본문 링크·묶음뿐이고 읽은 기록으로 사람을 짐작하지 않아요. node 에서 `require` 하면 `{ pick, courseFor, normRole, firstSentence, answerOf, quiet, isAlarm, isHeavy, ROLES, HELP, HEAVY, CRIME }`(규칙은 2-5 아래) |
| `hub.arrange(entry, list)` → `{ first, groups:[{title, items, extra?}], total }` 또는 `null` | `js/ui/hub.js` | 분류 소묶음 계획(순수 함수, node 에서도). `entry` 는 `data/kb/groups.json` 의 그 분류 항목, `list` 는 그 분류 글(순서대로). 정적 분류 페이지·둘러보기도 이것을 써요 |
| `hub.refresh()` | | 지금 분류 화면을 묶음으로 다시 짜요 |
| `ask.state()` → `{ keep, items, paused, held }`, `ask.has(item)`, `ask.add(item)`, `ask.remove(id)`, `ask.toggle(item)`, `ask.moveItem(id, dir)`, `ask.moveGroup(key, dir)`, `ask.canKeep()`, `ask.setKeep(on)`, `ask.clearAll()`, `ask.restore(snap)`, `ask.core` | `js/ui/ask.js` | 진료 질문 바구니(`item` = `{ slug, title, text }`, 질문 글자는 글에 있는 그대로). 기본은 이 탭(sessionStorage)에만, `setKeep(true)` 일 때만 이 기기에. 기록 쉼이면 `setKeep(true)` 는 `{ refused: 'paused' }`. 바뀔 때마다 `jhb:ask`(5장). 글 화면 안내 줄의 저장 위치 문구는 순수 함수 `ask.core.barText(state)` 하나에서 만들어요("이 탭에만 있어요. 브라우저의 닫은 탭 다시 열기로 돌아올 수 있어요" / "이 기기에 저장 중" / 기록 쉼·이 탭에만 있는 질문 수. "탭을 닫으면 사라진다"고 하지 않아요) |
| `trust.reviewedOf(meta)`, `trust.reviewedLine(d)`, `trust.historyFor(list, slug)`, `trust.fmtDot(d)`, `trust.KIND_LABEL`, `trust.TEXT`, `trust.LIMIT` | `js/ui/trust.js` | 출처 확인일(`reviewed`, 실제 있는 날짜만)·글별 고친 내역(최근 5개). 저장·외부 요청 없음 |
| `home.role()`, `home.setRole(r)` → `{ role, ok, tab }`, `home.refresh()`, `home.roles`, `home.roleName(r)` | `js/ui/home.js` | 첫 화면 역할(`self`·`family`·`near`·`curious`). 기록 쉼이면 이 탭에만 기억(`tab: true`) |
| `reading.mode()`, `reading.setMode(m)`, `reading.savePos()`, `reading.reveal(id)` | `js/ui/reading.js` | 요약/전체 보기, 읽던 자리, 접힌 소절 펴기(3장) |
| `settings.get()`, `settings.set(key, value)`, `settings.open()`, `settings.close()` | `js/ui/settings.js` | 보기 설정 패널 |
| `palette.open(q?)`, `palette.close()`, `palette.toggle()`, `palette.isOpen()` | `js/ui/palette.js` | Ctrl+K 명령 팔레트 |
| `toast(text, opts)`, `polish.toast`, `polish.setSection(sec)` | `js/ui/polish.js` | 짧은 알림 줄(`JHB.ui.toast`, opts 예: `{ kind, duration }`), 분류 색 |
| `preview.hide()`, `preview.isOpen()` · `sticky.update()`, `sticky.openToc()`, `sticky.close()` · `shelf.refresh()` | `preview.js` · `sticky.js` · `shelf.js` | 링크 미리보기 카드 · 따라오는 제목 줄 · 첫 화면 책꽂이 |

## 5. 이벤트 (`window`)

| 이벤트 | 언제 | `detail` |
|---|---|---|
| `jhb:page` | 화면을 새로 그린 직후(`show()`) — 첫 로드에도 와요 | `{ kind, id, query, loading? }`. kind 는 `home`·`a`·`s`·`glossary`·… 또는 특집 화면 id(찾기 `search` 포함, 모르는 kind 는 무시하세요). id 는 문서면 slug, 분류면 분류 id, **특집 화면이면 kind 와 같은 화면 id**, 그 밖에는 null. **문서 화면은 두 번 와요**: "문서를 불러오고 있어요" 자리 문구 때 `loading: true` 로 한 번, 실제 문서를 그릴 때 한 번(다 그린 뒤에는 `jhb:article`). 특집 화면은 실제 화면(또는 실패 안내)을 그릴 때 한 번이에요 |
| `jhb:article` | 문서를 다 그린 직후 | `{ slug, article, meta, toc:[{id,text,level}], prev, next, minutes, body, points }`(body 는 `.body` 요소, points 는 frontmatter 핵심 줄 배열 또는 null) |
| `jhb:pageready` | 특집 화면이 `render` 까지 끝났거나 실패한 뒤(화면마다 한 번) | `{ id, ok }` — 실패면 `ok: false` 와 `reason`(`net` 파일을 받지 못함·시간 초과, `data` 자료 파일 404·JSON 오류, `code` 등록 안 됨·그리기 예외, `empty` 그릴 내용 없음), `error`(있으면 메시지) |
| `jhb:search` | 찾기 화면이 결과를 그린 뒤(입력이 바뀔 때마다) | `{ query, section, results:[slug…](보여 준 것), total, offline }`. 검색어가 들어 있으니 저장·전송하지 마세요 |
| `jhb:gosearch` | `goSearch()` 직전(취소 가능). 찾기 화면이 `preventDefault()` 하면 이동 없이 그 자리에서 찾아요 | `{ q, s }` |
| `jhb:update` | 새 서비스 워커가 이 페이지를 넘겨받음(새 판 설치, 첫 설치는 아님). 토스트가 있으면 "새 판이 준비됐어요. 새로 고치면 보여요." | 없음 |
| `jhb:layout` | 글자 크기 등 레이아웃이 바뀜, 자리에 `mount` 함 | 없음 |
| `jhb:fav` | 저장을 켜거나 끔(`toggleFav`) | `{ slug, on }` |
| `jhb:privacy` | 기록 쉼·최근 검색 설정을 바꾸거나 기록을 지움 | `{ action, value, ids }` — action 은 `paused`·`recentq`·`clear`. `clear` 의 ids 는 `'all'` 이나 지운 id 배열. 일부 종류를 남긴 전부 지우기(`clear('all', { keep: [...] })`)는 `ids` 가 실제로 지운 id 배열이고 `all: true`, `keep: [...]` 가 붙어요 |
| `jhb:ask` | 진료 질문 바구니가 바뀜(담기·빼기·순서·기기 저장 켜고 끄기·지우기) | `{ count, keep }`(질문 글자는 싣지 않음) |

- 특집 화면에 반응하는 모듈(기록·포커스 이동·알림 등)은 `jhb:page` 대신 **`jhb:pageready`** 를 쓰고 `ok` 를 확인해요. `jhb:page` 로 반응해야 하면 `detail.loading` 이 true 인 것은 건너뛰어요(같은 일을 두 번 하지 않게).
- 이벤트 모양은 필드를 **더하기만** 해요(빼거나 이름을 바꾸지 않음).

## 6. 저장 키와 기록 쉼

지금 코드가 쓰는 키 전부예요(`js/**`·`sw.js`·`tools/shell.html` 을 grep 해서 모음. 새 키를 더하면 이 표도 고쳐요).

| 저장소 | 키 | 무엇 | 쓰는 곳 | 기록 종류(`privacy.kinds`) |
|---|---|---|---|---|
| localStorage | `jhb.fav` | 저장한 글 | app | fav |
| | `jhb.read` | 읽은 글 `{ slug: 시각 }` | app·progress | read |
| | `jhb.course` | 들어간 읽기 코스 `{ 코스id: 시각 }`(코스 화면이나 `?course=` 로 연 기록. 이어서 읽기의 코스 이름은 이 기록이 있을 때만) | app·progress | read |
| | `jhb.recent` | 최근 읽은 글 | app | recent |
| | `jhb.ui.reading.pos` | 읽던 자리 | reading | pos |
| | `jhb.ui.palette.recentq` | 최근 검색(켰을 때만) | palette | recentq |
| | `jhb.ui.home.role` | 고른 역할 `self`·`family`·`near`·`curious` | home·me(nextsteps 가 읽음) | role |
| | `jhb.theme`, `jhb.fs`, `jhb.ui.settings`, `jhb.ui.reading.mode`, `jhb.ui.home.installHidden`, `jhb.ui.home.recentHidden` | 보기 설정(테마·글자 크기·설정 패널·요약 모드·홈 화면에 추가 안내 숨김·첫 화면 기록 가리기) | app·settings·reading·home | settings |
| | `jhb.privacy.paused` | true = 기록 쉼 | app | (설정) |
| | `jhb.privacy.recentq` | true = 최근 검색 저장 켬(**기본 꺼짐**) | app | (설정) |
| | `jhb.ui.ask.keep`, `jhb.ui.ask.items` | 질문 바구니를 이 기기에 저장할 때만 | ask | ask(모듈이 등록) |
| | `jhb.ui.plan.keep`, `jhb.ui.plan.data` | 미리 써 두는 종이를 이 기기에 저장할 때만(**기본 꺼짐**. `keep` = true, `data` = `{ v: 1, at, forms: { 양식id: { 칸id: 글 } } }`. 저장을 켜지 않으면 적은 글은 화면 메모리에만 있고 떠나면 사라져요) | `js/pages/plan.js`(내 서재는 있어요·없어요만. 장 수·양식 이름·적은 글은 보이지 않음) | plan(코어 기본 종류, 모든 화면) |
| sessionStorage | `jhb.q` | 검색어를 찾기 화면으로 한 번 넘길 때만 | app·search | recentq |
| | `jhb.q.cleared` | 최근 검색을 지운 시각(검색어는 아님. 찾기 화면이 그보다 오래된 `history.state` 검색어를 되살리지 않음) | app·search | — |
| | `jhb.ui.ask.session` | 이 탭의 질문 바구니(기본) | ask | ask |
| | `jhb.ui.home.role` | 기록 쉼 중에 이 탭에서만 고른 역할 | home | role(모듈이 session 에 더함) |
| Cache Storage | `jhb-<판>` | 오프라인용 파일과 **열어 본 화면의 HTML**(쿼리를 뗀 주소로). 기록 쉼 중에는 새로 쌓지 않아요. 내 서재에서 읽은 글·최근 읽은 글·읽던 자리를 지우면 열어 본 화면도 함께 지워요 | sw.js·me | — |
| | `jhb.state` | 서비스 워커가 기록 쉼 여부만 기억하는 곳(글·검색어 없음). 항목 `__jhb-state/paused` 의 값은 `'1'`(쉼)·`'0'`(쉼 아님) 둘 다 남겨요. 판이 바뀌어도 activate 가 지우지 않는 이름이에요 | sw.js | — |
| | `jhb-<판>` 안의 `__jhb-state/known` | 페이지가 기록 쉼 여부를 한 번이라도 알려 줬다는 표시(값 `'1'`). 상태 항목은 없는데 이 표시는 있으면 "알림을 받은 뒤 상태만 사라짐"으로 보고 모르는 것으로 쳐요 | sw.js | — |

- 서비스 워커의 기록 쉼(`sw.js`): 페이지(`js/app.js` 의 `tellWorker`)가 열릴 때, 쉼을 바꿀 때, 다른 탭에서 쉼이 바뀌었을 때(storage 이벤트) `postMessage({ jhb: 'privacy', paused })` 로 알려요. 쉼이면 워커는 새 캐시 항목을 만들지 않아요(연 화면의 HTML 은 이미 있는 것도 새로 쓰지 않고, 그 밖의 파일은 이미 있는 항목만 새로 받아 둠). 워커가 다시 떠서 메모리 값이 없으면 `jhb.state` 를 읽고, 읽지 못하거나 값이 `'1'`·`'0'` 이 아니거나 `__jhb-state/known` 표시만 남았으면 페이지가 다시 알려 줄 때까지 쉼처럼 다뤄요(보수적 기본값). 한 번도 알림을 받지 않은 워커(처음 설치 직후, 표시도 없음)는 쉼 아님으로 봐요(페이지가 열리자마자 알려 줌).
- 새 키는 `jhb.ui.<모듈>.<항목>`. 기록 종류를 새로 만들면 **반드시** `JHB.app.privacy.register({ id, label, keys: [...], session: [...] })` 로 등록해 내 서재에서 보이고 지워지게 해요.
- **정직한 한계**(사용자에게 하는 말도 이렇게): sessionStorage 와 찾기 화면의 `history.state {q, s, at}` 는 "탭을 닫으면 사라진다"고 말하지 않아요. 브라우저의 "닫은 탭 다시 열기"·세션 복원으로 그 탭이 돌아오면 함께 돌아올 수 있어요. 탭의 방문 기록(뒤로 가기 목록)은 웹 페이지가 지울 수 없으니, 함께 쓰는 기기라면 브라우저 방문 기록도 지우라고 안내해요(내 서재의 문구가 기준).

`JHB.app.privacy`:

| 이름 | 뜻 |
|---|---|
| `paused()`, `setPaused(b)` | 기록 쉼. true 면 코어는 읽음 표시(`jhb.read`)와 `jhb.recent` 를, reading 모듈은 읽던 자리(`jhb.ui.reading.pos`)를, 팔레트는 최근 검색을 쓰지 않아요. 미리 써 두는 종이(`js/pages/plan.js`)는 기기 저장을 켜지도 새로 저장하지도 않고, 진료 질문 바구니(`js/ui/ask.js`)는 기기 저장을 켤 수 없고 새로 담은 질문은 이 탭에만 둬요(이미 저장한 것은 그대로. 내 서재의 스위치 설명도 이렇게 말해요). 기록을 남기는 모듈도 이 값을 보고 쓰지 않아야 해요 |
| `recentq()`, `setRecentq(b)` | 최근 검색 저장(기본 false). 끄면 저장된 최근 검색도 지워요 |
| `kinds` | 등록된 기록 종류 `[{id, label, keys:[…], session:[…]}]`의 **읽기 전용 복사본**(읽을 때마다 새 배열. 바꿔도 등록 목록은 그대로). 기본: read(`jhb.read`, `jhb.course`), recent, pos, recentq(`jhb.ui.palette.recentq`, 세션 `jhb.q`), fav, role, settings(`jhb.theme`, `jhb.fs`, `jhb.ui.settings`, `jhb.ui.reading.mode`, `jhb.ui.home.installHidden`, `jhb.ui.home.recentHidden`), plan(`jhb.ui.plan.keep`, `jhb.ui.plan.data`, 미리 써 두는 종이). 기본 종류는 `js/app.js` 의 `BASE_KINDS` 에 있고 **어느 화면에서든** 등록돼요(그래서 다른 화면에서 `clear('all')` 을 불러도 지워지고, 내 서재에 이름으로 보여요). 모듈이 더함: ask, role 의 세션 키. 특정 화면에서만 쓰는 기록이라도 그 화면을 연 페이지에서만 등록하면 다른 화면의 내 서재·`clear('all')` 이 모르니, 모든 화면에서 등록되게 해요(코어 기본 종류나 `js/ui/*.js` 모듈) |
| `register(kind)` | 종류 등록(같은 id 면 바꿔 씀). 등록된 내용의 복사본을 돌려줘요 |
| `has(id)` | 그 종류의 기록이 이 기기에 하나라도 있으면 true |
| `clear(idsOrAll, opts)` | 글자 `'all'` 일 때만 등록된 키 전부 + `jhb.privacy.*`(등록되지 않은 것 포함)를 지워요(**단 기록 쉼 `paused` 는 남겨요**: 전부 지운 뒤 조용히 기록이 다시 시작되지 않게. 최근 검색 저장은 꺼져요). `opts.keep`(종류 id 배열)을 주면 그 종류의 키는 남겨요 — 예: `clear('all', { keep: ['settings'] })` = 보기 설정만 남기고 전부. id(문자열이나 배열)를 주면 그 종류만. **인자를 빠뜨리면(undefined·null·빈 배열) 아무것도 지우지 않아요.** 지운 id 목록을 돌려주고 `jhb:privacy` 를 발행해요(인자를 빠뜨린 경우는 빈 목록, 이벤트 없음). 지우는 계획은 `js/progress.js` 의 `planClear`(순수 함수) |

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
- 팝오버 `#pop`, 위기 배너 `.crisis`, 바닥 `.sitefoot`(일반 고지·AI 초안 고지·위기 줄 109·1577-0199·119·"이 백과에 대해 · 고침 기록" 링크 줄)
- 분류 화면 소묶음 `#app > .hb[data-section]`(`.hb-help`, `.hb-first`, `.hb-jump`, `.hb-group#hb-g-N > .hb-gh + ul.rows.hb-rows > li.row[data-slug]`). 정적 HTML 도 같은 마크업
- 인쇄 `.prt-head`·`.prt-foot`·`.prt-btn`(print 모듈), `.prt-static`(정적 문서), `html.prt-doc`(문서 꼬리가 있음), `html.prt-printing`(인쇄 준비 중)

**지금 도움 시트와 휴대폰 하단 바**(아래쪽·위에 뜨는 요소를 더하는 모듈은 이것과 겹치지 않게):
- 지금 도움: 상단 `#btn-help` 를 누르면 `JHB.ui.nowhelp.open()`(4-1). 시트 `section.nh-sheet#nh-sheet[role=dialog]`(z-index 111)와 막 `.nh-scrim`(110). 열린 동안 `html.nh-lock`(스크롤 잠금)이고 뒤 화면은 inert. 휴대폰 뒤로 가기는 시트만 닫아요. 자바스크립트가 없으면 `#btn-help` 링크대로 위기 상담 전화 글로 가요.
- 휴대폰 하단 바: 760px 이하에서는 **모든 화면**에 `.mb-bar`(position fixed, z-index 45, 높이 약 63px + 안전 영역)가 있어요. 문서 화면은 [차례][저장][용어][위로], 그 밖의 화면은 빠른 이동 칸 [찾기][분류][길잡이(guide 가 있을 때)][내 서재(없으면 저장한 문서)]. 바가 있는 동안 `body.mb-has-bar` 에 아래 여백 `64px + env(safe-area-inset-bottom)`, `html` 에 `scroll-padding-bottom` 이 붙어요. 스크롤을 내리면 바가 숨어요(`.mb-hidden`). 차례·용어 바텀시트 `.mb-sheet`(z-index 85)·`.mb-scrim`(84). 아래에 고정 요소를 더하면 `body.mb-has-bar` 일 때 바 위로 올리고, 키보드 포커스가 바 밑에 숨지 않게 해요.
- 다른 고정 요소 높이: 상단 바 `--top-h`. 토스트(`.pol-toast`)와 링크 미리보기 카드도 위에 떠요.

**콘텐츠 계약**: 지금 도움 시트는 `crisis-hotlines` 글에서 제목에 `전화가 어렵·전화 말고·글로·문자·채팅·SNS` 가 든 소절을 찾아 연결해요("전화가 어렵다면" 링크). 그 소절 제목을 바꾸면 `tests/nowhelp.test.cjs` 가 알려 줘요.

## 8. 시험하는 법

- **빌드 없이 보기**: `node serve.cjs`(기본 5174, 다른 포트는 `PORT=5175 node serve.cjs`). 개발 서버는 `css/ui.css` 와 `data/pages.js` 를 즉석에서 만들고, 모든 HTML 의 모듈 줄·상단 링크를 지금 파일 기준으로 바꿔 보내요. `<id>/` 폴더가 아직 없어도 `data/pages/<id>.json` 이 있으면 그 주소가 열려요(정적 본문 없이 앱이 그림). 선언 오류는 서버 터미널에 나와요. 개발 서버는 `tools/lib/assets.cjs` 와 그 파일이 불러오는 `js/progress.js` 를 켤 때 한 번 읽어서, 그 파일(선언 정리·검사 규칙·`lastmod` 날짜 규칙)을 고친 뒤에는 서버를 다시 켜야 `data/pages.js` 에 반영돼요(브라우저가 받는 `js/progress.js` 는 새로 고치면 바로 바뀌어서, 그 사이에는 앱과 `data/pages.js` 가 다른 규칙일 수 있어요). 새 고지 종류(예: `revised`)처럼 검사 규칙이 넓어진 선언은 다시 켜기 전의 서버가 오류로 보고 `data/pages.js` 에서 빼서, 그 화면이 개발 서버에서 "그런 문서가 없어요"가 될 수 있어요. 생성기(2-6)는 돌리지 않아요.
- 브라우저 확인: 1280×800 과 390×844 에서 실제로 눌러 보고 콘솔 오류 0, 가로 넘침 0, 밝은·어두운 화면을 확인해요. Playwright 를 여럿이 함께 쓰면 공유 page 를 건드리지 말고 자기 컨텍스트(`browser.newContext({ viewport, serviceWorkers: 'block' })`)를 만들어 쓰고 닫아요.
- `node tests/run.cjs` 는 깨지지 않아야 해요. 테스트 파일을 불러오다 예외가 나면(모듈 없음·문법 오류·최상위에서 던짐) 그 파일을 FAIL 1건으로 세고 파일 이름과 예외 글을 보여 준 뒤 다음 파일로 넘어가요(마지막 줄에 "불러오지 못한 파일"). 선언 검사만: `node tools/build-kb.cjs`.
- 전체 빌드(통합 담당): `node tools/build-all.cjs` = check-content → build-gen → build-kb → build-index → build-links → build-ui-css → build-pages(하나라도 실패하면 멈춤).
