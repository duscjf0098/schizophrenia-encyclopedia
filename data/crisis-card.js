/* 조현병 백과 · 검색창에 자해·자살을 암시하는 말이 들어왔을 때 검색 결과보다 먼저 보이는 안내 카드
   js/crisis.js의 detect()가 돌려주는 level('high' | 'watch')로 고른다.
   문서 링크는 '#/a/<slug>' 꼴로 적는다(앱이 js/paths.js로 실제 경로로 바꿔 끼운다).
   109(자살예방상담)·1577-0199(정신건강위기상담)는 24시간. */
window.JHB = window.JHB || {};
JHB.crisisCard = {
  high: {
    title: '지금 바로 이야기할 수 있는 곳이 있어요',
    body: '많이 힘든 마음을 혼자 견디고 있다면, 검색을 멈추고 먼저 전화해도 괜찮아요. 자살예방상담 109와 정신건강위기상담 1577-0199는 24시간 받고, "오늘 너무 힘들어요" 한마디로 시작해도 상담사가 다 알아들어요. 당장 위험하다면 119나 가까운 응급실로 가세요.',
    actions: [
      { label: '109 자살예방상담 (24시간)', href: 'tel:109' },
      { label: '1577-0199 정신건강위기상담 (24시간)', href: 'tel:1577-0199' },
      { label: '119 구급 (생명이 위급할 때)', href: 'tel:119' },
      { label: '위기 상담 전화와 기관', href: '#/a/crisis-hotlines' },
      { label: '자살 위험 신호와 대처', href: '#/a/suicide-warning-signs' },
      { label: '재발 예방 계획 쓰기', href: '#/a/relapse-prevention-plan' }
    ]
  },
  watch: {
    title: '도움이 필요하면 바로 연락할 수 있어요',
    body: '자살이나 자해에 대해 찾아보고 있다면, 본인의 일이든 주변 사람의 일이든 지금 이야기할 곳이 있어요. 자살예방상담 109와 정신건강위기상담 1577-0199는 24시간 받아요. 아래 글에 위험 신호와 대처, 전화할 때 말할 것을 정리해 두었어요.',
    actions: [
      { label: '109 자살예방상담 (24시간)', href: 'tel:109' },
      { label: '1577-0199 정신건강위기상담 (24시간)', href: 'tel:1577-0199' },
      { label: '119 구급 (생명이 위급할 때)', href: 'tel:119' },
      { label: '자살 위험 신호와 대처', href: '#/a/suicide-warning-signs' },
      { label: '위기 상담 전화와 기관', href: '#/a/crisis-hotlines' },
      { label: '재발 예방 계획 쓰기', href: '#/a/relapse-prevention-plan' }
    ]
  }
};
