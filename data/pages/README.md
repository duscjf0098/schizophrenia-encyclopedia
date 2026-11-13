# 특집 화면 선언 (`data/pages/<id>.json`)

새 주소의 화면(`<id>/`) 하나 = 이 폴더의 JSON 파일 하나. 코드는 `js/pages/<id>.js`, 스타일은 `css/pages/<id>.css`, 데이터는 `data/kb/<이름>.json`. 자세한 규칙과 화면 코드 틀은 `docs/UI모듈가이드.md` 2장.

```json
{
  "id": "guide",
  "title": "상황별 길잡이",
  "label": "길잡이",
  "summary": "검색 결과에 보일 설명. 155자 이하.",
  "lead": "화면 머리 소개(선택).",
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

| 항목 | 규칙 |
|---|---|
| `id` (필수) | 파일 이름과 같게. 영어 소문자로 시작, 소문자·숫자·- 로 2~20자. 예약어 금지: a, s, fav, glossary, about, courses, course, random, css, js, data, content, docs, tools, tests, notfound (search 는 허용) |
| `title` (필수) | 화면 제목 |
| `summary` (필수) | 155자 이하 설명(검색 결과·미리보기) |
| `group` (필수) | `안내` · `지식` · `도구` · `기록` |
| `label` | 짧은 이름(상단 링크·팔레트). 기본 title |
| `lead` | 제목 아래 소개 |
| `order` | 묶음 안 순서, 기본 100 |
| `nav` | `top`·`side`·`home`·`palette` 의 부분집합. 기본 `["side","palette"]`. `palette` 는 Ctrl+K 팔레트의 동작 목록에 보여요(label·keywords 로 찾음), `home` 은 home 모듈 몫 |
| `keywords` | 찾을 말 목록 |
| `data` | 미리 받을 `data/kb/<이름>.json` 이름 목록(파일이 있어야 해요) |
| `robots` | `index`(기본, 사이트맵) · `noindex`(기기 안 기록 화면) |
| `crisisLine` | 기본 true(109·1577-0199·119 줄). false 는 검사 오류(총괄이 `tools/lib/assets.cjs` 의 `CRISIS_LINE_OFF_OK` 에 넣은 id 만 예외) |
| `notice` | `general`(늘 붙음) · `device` · `emergency` · `dated`("○○에 확인한 내용이에요". updated 필요, 날짜는 늘 updated) · `revised`("○○에 마지막으로 고쳤어요". updated 나 lastmod 필요, 날짜는 사이트맵과 같은 날) · `crisis`(위기 줄은 crisisLine 으로 한 번만 붙어요) |
| `updated` | `YYYY-MM-DD`(달력에 있는 날). `dated` 고지의 날짜(늘 이것. 화면 내용 전체를 원천과 다시 대조했을 때만 올려요), `lastmod` 가 없을 때의 사이트맵·`revised` 날짜 |
| `lastmod` | 사이트맵 날짜(와 `revised` 고지 날짜)를 자료에서 읽을 때만: `"kb:<data/kb 이름>:<날짜 항목>"`. 예: 고침 기록 `"lastmod": "kb:changes:date"` → `data/kb/changes.json` 항목들의 `date` 가운데 가장 최근. 자료가 객체면 점 경로로 읽어요(`"kb:red-flags:source.updated"`). 파일이 없거나 배열·객체가 아니면 검사 오류, 날짜가 하나도 없으면 경고하고 `updated` |

- 사이트맵 날짜 순서: `lastmod` 가 가리키는 자료의 가장 최근 날짜 → `updated` → 빌드한 날. `robots: "noindex"` 화면은 사이트맵에 넣지 않아요.
- 검사: `node tools/build-kb.cjs` (어기면 종료 코드 1). 빌드 없이 보기: `node serve.cjs` 후 `http://localhost:5174/<id>/`.
- `data/pages.js` 는 이 폴더로 **자동 생성**되는 파일이라 손으로 고치지 않아요.
