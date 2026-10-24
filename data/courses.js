/* 조현병 백과 · 읽기 코스 (손으로 관리). 상황별로 글을 읽는 순서를 안내한다.
   slug 는 data/toc.js 에 있는 글만 쓴다. 검사: node tests/run.cjs (tests/courses.test.cjs).
   형식: { id, title, who: '당사자' | '가족' | '모두', intro, steps: [{ slug, why }] }
   steps 는 8~10개, 기초 → 구체 → 실천 순. why 는 60자 이내. */
window.JHB = window.JHB || {};
JHB.courses = [
  {
    id: 'first-diagnosis',
    title: '처음 진단받았어요',
    who: '당사자',
    intro: '진단을 처음 들은 당사자가 병이 무엇인지, 지금 무엇을 하면 좋은지 차근차근 알 수 있도록 묶었어요. 첫 삽화는 치료 반응이 가장 좋은 시기라는 사실부터 시작해요.',
    steps: [
      { slug: 'what-is-schizophrenia', why: '병이 무엇인지 한 장으로 먼저 잡아요.' },
      { slug: 'first-episode', why: '첫 삽화가 왜 가장 좋아질 수 있는 시기인지 알아요.' },
      { slug: 'myths', why: '들었던 말 가운데 오해를 먼저 걷어 내요.' },
      { slug: 'faq-whose-fault', why: '누구의 잘못도 아니라는 걸 확인하고 넘어가요.' },
      { slug: 'diagnostic-process', why: '받은 검사와 면담이 무엇을 위한 것이었는지 알아요.' },
      { slug: 'antipsychotic-basics', why: '처방받은 약이 뇌에서 하는 일을 이해해요.' },
      { slug: 'faq-choosing-doctor', why: '오래 다닐 병원과 의사를 고르는 기준을 세워요.' },
      { slug: 'suicide-warning-signs', why: '발병 초기에 높아지는 위험을 미리 알고 대비해요.' },
      { slug: 'special-calculation', why: '치료비 부담을 줄이는 제도를 바로 신청해요.' },
      { slug: 'recovery', why: '회복이 실제로 무엇을 뜻하는지 알고 희망을 가져요.' }
    ]
  },
  {
    id: 'family-first',
    title: '가족이 진단받았어요',
    who: '가족',
    intro: '가족이 조현병 진단을 받은 분이 충격을 추스르고, 대화와 돌봄의 방법을 익히도록 묶었어요. 가족 탓이 아니라는 것에서 출발해 응급 상황과 자신을 돌보는 법까지 이어져요.',
    steps: [
      { slug: 'family-first-steps', why: '첫 몇 주에 할 일과 하지 않아도 되는 일을 정리해요.' },
      { slug: 'what-is-schizophrenia', why: '병에 대한 기본 그림을 가족도 같이 갖춰요.' },
      { slug: 'faq-whose-fault', why: '죄책감을 내려놓아야 다음 글이 들어와요.' },
      { slug: 'leap-communication', why: '설득 대신 관계를 지키는 대화법을 익혀요.' },
      { slug: 'faq-family-refuses', why: '치료를 거부할 때 가족이 할 수 있는 일을 알아요.' },
      { slug: 'family-during-symptoms', why: '증상이 심할 때 증상별 대응을 구체적으로 봐요.' },
      { slug: 'emergency-response', why: '위험이 보일 때 어디에 어떤 순서로 연락할지 알아요.' },
      { slug: 'family-intervention', why: '가족 교육이 재발을 줄인다는 근거와 받는 곳을 알아요.' },
      { slug: 'mental-health-center', why: '가족도 먼저 상담받을 수 있는 지역 기관을 찾아요.' },
      { slug: 'caregiver-burnout', why: '돌보는 사람이 지치지 않도록 자신을 챙겨요.' }
    ]
  },
  {
    id: 'starting-medication',
    title: '약을 시작했어요 · 부작용이 힘들어요',
    who: '당사자',
    intro: '항정신병약을 처음 먹기 시작한 분, 부작용 때문에 계속 먹을지 고민하는 분을 위해 묶었어요. 약의 원리에서 시작해 부작용의 종류와 의사에게 말하는 법, 중단의 위험까지 순서대로 봐요.',
    steps: [
      { slug: 'antipsychotic-basics', why: '약이 무엇을 고치고 무엇은 못 고치는지 먼저 알아요.' },
      { slug: 'positive-medication-response', why: '첫 2주에 어떤 변화를 기대할지 알아요.' },
      { slug: 'second-generation', why: '약을 고르는 기준이 부작용 프로파일임을 이해해요.' },
      { slug: 'side-effects-overview', why: '부작용 8가지 묶음을 한눈에 정리해요.' },
      { slug: 'metabolic-side-effects', why: '체중·혈당 변화를 미리 알고 검사 항목을 챙겨요.' },
      { slug: 'eps', why: '떨림·뻣뻣함·정좌불능을 구분해 설명할 수 있게 돼요.' },
      { slug: 'sedation-anticholinergic', why: '졸림·입마름이 왜 생기고 줄어드는지 알아요.' },
      { slug: 'managing-side-effects', why: '부작용 일기와 진료실 대화 스크립트를 실제로 써요.' },
      { slug: 'smoking-caffeine-alcohol', why: '생활 습관이 약 농도를 바꾼다는 걸 알고 의사에게 알려요.' },
      { slug: 'switching-reducing-stopping', why: '끊고 싶을 때 혼자 결정하지 않고 의사와 나누는 법이에요.' }
    ]
  },
  {
    id: 'negative-symptoms',
    title: '음성 증상이 힘들어요',
    who: '모두',
    intro: '의욕과 즐거움이 사라지고 말과 표정이 줄어 힘든 당사자와, 그것을 게으름으로 오해하기 쉬운 가족을 위해 묶었어요. 증상의 정체를 이해한 뒤 우울·약 부작용과 구분하고, 실제로 해 볼 수 있는 방법으로 이어져요.',
    steps: [
      { slug: 'negative-overview', why: '음성 증상이 무엇이고 왜 눈에 안 띄는지 먼저 알아요.' },
      { slug: 'avolition', why: '시작이 안 되는 이유가 게으름이 아님을 확인해요.' },
      { slug: 'anhedonia', why: '즐거움을 기대하는 힘이 줄어든 것임을 이해해요.' },
      { slug: 'primary-secondary-negative', why: '약·우울 때문에 생긴 이차 증상은 고칠 수 있음을 알아요.' },
      { slug: 'negative-vs-depression', why: '우울과 구분해야 치료가 달라진다는 걸 알아요.' },
      { slug: 'faq-dull-feeling', why: '멍함의 원인을 나눠 의사에게 말할 준비를 해요.' },
      { slug: 'negative-treatment-latest', why: '약과 비약물 치료가 어디까지 도울 수 있는지 봐요.' },
      { slug: 'negative-self-help', why: '5분 규칙처럼 오늘 할 수 있는 크기로 쪼개 실천해요.' },
      { slug: 'exercise', why: '운동이 음성 증상에 효과가 있다는 근거로 시작을 도와요.' },
      { slug: 'negative-family-misunderstanding', why: '가족이 재촉 대신 할 수 있는 말과 행동을 익혀요.' }
    ]
  },
  {
    id: 'living-with-positive',
    title: '환청·망상과 지내기',
    who: '당사자',
    intro: '약을 먹어도 목소리나 의심이 남는 당사자가 증상을 이해하고 거리를 두는 법을 익히도록 묶었어요. 증상이 생기는 과정에서 시작해 자가 대처, 인지행동치료, 다음 단계 치료까지 이어져요.',
    steps: [
      { slug: 'positive-overview', why: '양성 증상이 무엇이고 약에 어떻게 반응하는지 알아요.' },
      { slug: 'auditory-hallucination', why: '가장 흔한 환청의 내용과 느낌이 사람마다 다름을 알아요.' },
      { slug: 'delusion-overview', why: '망상이 만들어지는 과정을 알면 대처의 실마리가 보여요.' },
      { slug: 'persecutory-delusion', why: '불안·불면이 의심을 키우는 고리를 이해해요.' },
      { slug: 'sleep', why: '잠이 무너지면 증상이 커진다는 걸 알고 먼저 챙겨요.' },
      { slug: 'positive-self-help', why: '현실 검증과 환청 대처 목록을 직접 만들어요.' },
      { slug: 'faq-checking-thoughts', why: '내 생각이 증상인지 가려 보는 방법을 익혀요.' },
      { slug: 'living-with-voices', why: '목소리와의 관계를 바꾸는 일상 도구를 써 봐요.' },
      { slug: 'cbtp', why: '괴로움과 확신을 다루는 심리치료가 있음을 알아요.' },
      { slug: 'faq-voices-persist', why: '약이 안 들을 때의 다음 단계를 의사와 이야기해요.' }
    ]
  },
  {
    id: 'preventing-relapse',
    title: '재발을 막고 안정을 지키고 싶어요',
    who: '모두',
    intro: '증상이 가라앉은 뒤 안정을 오래 지키고 싶은 당사자와 가족을 위해 묶었어요. 재발 신호를 알아보는 법에서 약·수면·스트레스 관리, 한 장짜리 재발 예방 계획 쓰기까지 이어져요.',
    steps: [
      { slug: 'stable-phase', why: '안정기에 무엇을 해야 하는지 큰 그림을 먼저 봐요.' },
      { slug: 'relapse-signs', why: '재발 몇 주 전 신호와 약 중단의 위험 수치를 알아요.' },
      { slug: 'faq-relapse-or-not', why: '나만의 신호 순서를 알아보는 법을 익혀요.' },
      { slug: 'medication-adherence', why: '약을 거르는 이유를 찾고 맞는 도구를 골라요.' },
      { slug: 'faq-stop-when-well', why: '좋아졌을 때 끊고 싶은 마음을 다루는 근거를 봐요.' },
      { slug: 'lai', why: '주사제라는 선택지의 장단점을 알아 둬요.' },
      { slug: 'daily-rhythm', why: '수면과 하루 리듬이 재발을 막는 뼈대임을 알아요.' },
      { slug: 'stress-management', why: '내 스트레스 신호 지도를 그려 문턱을 지켜요.' },
      { slug: 'relapse-prevention-plan', why: '배운 것을 한 장짜리 계획으로 써 두어요.' },
      { slug: 'suicide-warning-signs', why: '퇴원 직후 높아지는 위험 신호도 계획에 넣어요.' }
    ]
  },
  {
    id: 'system-support',
    title: '제도와 지원을 알아보고 싶어요',
    who: '모두',
    intro: '한국에서 조현병이 있는 사람과 가족이 쓸 수 있는 법·비용·기관·복지 제도를 순서대로 묶었어요. 법의 뼈대에서 시작해 치료비, 지역 기관, 일자리와 소득, 입원과 위기 연락처까지 이어져요.',
    steps: [
      { slug: 'mental-health-welfare-act', why: '제도의 뿌리인 법과 내 권리 조항을 먼저 알아요.' },
      { slug: 'special-calculation', why: '진료비 본인부담을 10%로 줄이는 제도를 신청해요.' },
      { slug: 'faq-cost', why: '치료비가 실제로 얼마나 드는지 전체 그림을 봐요.' },
      { slug: 'mental-health-center', why: '무료 상담·사례관리를 받는 지역 기관을 찾아요.' },
      { slug: 'rehab-facilities', why: '낮 재활·공동생활·직업훈련 시설의 종류를 알아요.' },
      { slug: 'vocational-rehab', why: '일하고 싶을 때 쓸 수 있는 고용 지원을 알아요.' },
      { slug: 'disability-registration', why: '정신장애 등록의 기준과 혜택, 고민할 점을 봐요.' },
      { slug: 'livelihood-pension', why: '소득이 끊겼을 때 기댈 급여와 연금을 알아요.' },
      { slug: 'admission-types', why: '입원 다섯 종류와 퇴원 심사 청구 권리를 알아요.' },
      { slug: 'crisis-hotlines', why: '지금 위험할 때 걸 번호를 저장해 두어요.' }
    ]
  },
  {
    id: 'research-curious',
    title: '연구와 역사가 궁금해요',
    who: '모두',
    intro: '조현병이라는 진단이 어떻게 만들어지고 치료가 어떻게 바뀌어 왔는지, 지금 연구가 어디까지 왔는지 알고 싶은 분을 위해 묶었어요. 100년 전 개념의 탄생에서 유전체·뇌 영상·신약, 그리고 남은 논쟁까지 이어져요.',
    steps: [
      { slug: 'kraepelin-bleuler', why: '진단 개념이 어디서 왔는지부터 시작해요.' },
      { slug: 'early-treatments', why: '약 이전의 치료가 왜 쓰였고 무엇이 문제였는지 봐요.' },
      { slug: 'chlorpromazine-revolution', why: '1952년 이후 정신약물학이 바뀐 흐름을 따라가요.' },
      { slug: 'deinstitutionalization', why: '병원 밖으로 나온 역사의 빛과 그늘을 봐요.' },
      { slug: 'causes-overview', why: '원인을 보는 틀인 스트레스-취약성 모델을 잡아요.' },
      { slug: 'dopamine-evolution', why: '50년 된 가설이 어떻게 정밀해졌는지 봐요.' },
      { slug: 'genomics', why: '유전체 연구가 밝힌 것과 한계를 알아요.' },
      { slug: 'neuroimaging', why: '뇌 영상이 아직 진단 도구가 아닌 이유를 알아요.' },
      { slug: 'drug-pipeline', why: '신약 개발의 성공과 실패를 큰 흐름으로 봐요.' },
      { slug: 'controversies', why: '남은 논쟁의 양쪽 근거를 보고 스스로 생각해요.' }
    ]
  }
];
