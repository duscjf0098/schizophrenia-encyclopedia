/* 조현병 백과 · 섹션 정의 (손으로 관리). 글 목록(data/toc.js)은 tools/build-index.cjs 가 content/ 에서 만든다.
   dir = content/ 아래 폴더 이름. hue = 섹션 색(0~360). */
window.JHB = window.JHB || {};
JHB.sections = [
  { id: '1',  dir: '01-basics',    title: '이해하기',            desc: '조현병이 무엇인지, 왜 생기는지, 어떻게 흘러가는지', hue: 255 },
  { id: '2',  dir: '02-positive',  title: '양성 증상',           desc: '환청·환각, 망상, 사고 장애, 와해된 행동을 하나씩', hue: 20 },
  { id: '3',  dir: '03-negative',  title: '음성 증상',           desc: '의욕·즐거움·말·표정·관계가 줄어드는 증상의 모든 것', hue: 200 },
  { id: '4',  dir: '04-cognitive', title: '인지·정서·몸',        desc: '기억과 집중, 병식, 우울과 불안, 수면, 신체 건강', hue: 160 },
  { id: '5',  dir: '05-course',    title: '경과와 단계',         desc: '전구기부터 회복까지, 재발 신호와 장기 경과', hue: 45 },
  { id: '6',  dir: '06-diagnosis', title: '진단',                desc: '진단 기준, 검사 과정, 비슷한 질환과 구분하기', hue: 290 },
  { id: '7',  dir: '07-medication', title: '약물 치료',          desc: '항정신병약의 원리, 약물별 특징, 부작용과 대처', hue: 340 },
  { id: '8',  dir: '08-therapy',   title: '비약물 치료',         desc: '인지행동치료, 가족 교육, 재활, 운동, 뇌자극 치료', hue: 120 },
  { id: '9',  dir: '09-living',    title: '함께 살아가기',       desc: '약 꾸준히 먹기, 재발 예방, 일과 관계, 낙인 다루기', hue: 30 },
  { id: '10', dir: '10-family',    title: '가족과 주변',         desc: '처음 알게 됐을 때부터 대화법, 응급 상황, 돌봄의 지침', hue: 185 },
  { id: '11', dir: '11-system',    title: '제도와 도움',         desc: '한국의 법·입원·산정특례·장애 등록·상담 전화', hue: 220 },
  { id: '12', dir: '12-research',  title: '연구 최전선',         desc: '가설의 진화, 유전·면역·뇌 영상, 신약, 디지털 치료', hue: 265 },
  { id: '13', dir: '13-facts',     title: '잘 알려지지 않은 사실', desc: '문화별 환청, 니코틴, 출생 계절처럼 의외의 발견들', hue: 5 },
  { id: '14', dir: '14-glossary',  title: '용어 사전',           desc: '가나다순으로 찾는 짧은 정의', hue: 100, glossary: true },
  { id: '15', dir: '15-faq',       title: '자주 묻는 질문',      desc: '당사자와 가족이 가장 많이 묻는 것들', hue: 60 },
  { id: '16', dir: '16-history',   title: '역사와 문화',         desc: '진단 개념의 역사, 이름 변경, 탈원화, 작품 속 묘사', hue: 320 }
];
JHB.EVIDENCE = {
  '가이드라인': { label: '가이드라인', desc: '국내외 진료 지침·공공기관 자료에 근거' },
  '연구': { label: '연구', desc: '메타분석·무작위 대조 시험 등 비교적 확립된 연구' },
  '초기연구': { label: '초기 연구', desc: '아직 재현·검증이 더 필요한 연구나 가설' },
  '경험': { label: '경험', desc: '당사자·가족·임상 경험에 바탕' }
};
