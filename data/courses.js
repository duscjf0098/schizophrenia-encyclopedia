/* 조현병 백과 · 읽기 코스 (손으로 관리). 상황별로 글을 읽는 순서를 안내한다.
   slug 는 data/toc.js 에 있는 글만 쓴다. 검사: node tests/run.cjs (tests/courses.test.cjs).
   형식: { id, title, who: '당사자' | '가족' | '모두' | '주변 사람', intro, steps: [{ slug, why }] }
   '주변 사람' 은 친구·동료·교사처럼 가족이 아닌 가까운 사람이에요.
   steps 는 8~12개, 기초 → 구체 → 실천 순. why 는 60자 이내. intro 는 2문장 안팎.
   id 는 다른 모듈(첫 화면 역할 등)이 쓰니 바꾸지 않는다. 새 코스는 뒤에 붙인다. */
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
      { slug: 'medical-records-privacy', why: '진료 기록이 어디에 남고 누가 볼 수 있는지 알아 걱정을 줄여요.' },
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
      { slug: 'anger-irritability', why: '화와 짜증의 원인을 알고 그 자리에서 열을 낮추는 법을 익혀요.' },
      { slug: 'emergency-response', why: '위험이 보일 때 어디에 어떤 순서로 연락할지 알아요.' },
      { slug: 'family-intervention', why: '가족 교육이 재발을 줄인다는 근거와 받는 곳을 알아요.' },
      { slug: 'mental-health-center', why: '가족도 먼저 상담받을 수 있는 지역 기관을 찾아요.' },
      { slug: 'partner-caregiving', why: '배우자가 돌볼 때 다른 점과 관계를 지키는 법을 알아요.' },
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
      { slug: 'missed-dose', why: '약을 깜빡했을 때 어떻게 할지 미리 알아 두어요.' },
      { slug: 'smoking-caffeine-alcohol', why: '생활 습관이 약 농도를 바꾼다는 걸 알고 의사에게 알려요.' },
      { slug: 'drug-costs-coverage', why: '약값과 급여 적용을 알아 비용 걱정을 줄여요.' },
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
      { slug: 'arts-music-therapy', why: '음악·미술 활동이 음성 증상에 도움이 될 수 있다는 근거를 봐요.' },
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
      { slug: 'symptom-diary-tools', why: '증상과 잠을 기록해 패턴을 보고 진료에 가져가요.' },
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
      { slug: 'first-month-after-discharge', why: '위험이 가장 높은 퇴원 후 첫 한 달을 어떻게 보낼지 알아요.' },
      { slug: 'relapse-signs', why: '재발 몇 주 전 신호와 약 중단의 위험 수치를 알아요.' },
      { slug: 'faq-relapse-or-not', why: '나만의 신호 순서를 알아보는 법을 익혀요.' },
      { slug: 'medication-adherence', why: '약을 거르는 이유를 찾고 맞는 도구를 골라요.' },
      { slug: 'faq-stop-when-well', why: '좋아졌을 때 끊고 싶은 마음을 다루는 근거를 봐요.' },
      { slug: 'lai', why: '주사제라는 선택지의 장단점을 알아 둬요.' },
      { slug: 'daily-rhythm', why: '수면과 하루 리듬이 재발을 막는 뼈대임을 알아요.' },
      { slug: 'stress-management', why: '내 스트레스 신호 지도를 그려 문턱을 지켜요.' },
      { slug: 'relapse-prevention-plan', why: '배운 것을 한 장짜리 계획으로 써 두어요.' },
      { slug: 'after-relapse', why: '재발했더라도 실패가 아니며 다시 세우는 법이 있음을 알아요.' },
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
      { slug: 'fee-reductions', why: '장애 등록 뒤 받을 수 있는 요금 감면과 할인을 챙겨요.' },
      { slug: 'livelihood-pension', why: '소득이 끊겼을 때 기댈 급여와 연금을 알아요.' },
      { slug: 'housing-support', why: '살 곳 걱정이 있을 때 쓸 수 있는 주거 지원을 알아요.' },
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
      { slug: 'korea-research-landscape', why: '한국 연구가 어디까지 왔는지 국내 지도를 봐요.' },
      { slug: 'controversies', why: '남은 논쟁의 양쪽 근거를 보고 스스로 생각해요.' }
    ]
  },
  {
    id: 'near-first',
    title: '주변 사람이 조현병일 때',
    who: '주변 사람',
    intro: '친구·동료·학생처럼 가까운 사람이 조현병이라는 걸 알게 됐거나 요즘 달라 보여 걱정되는 분을 위해 묶었어요. 병과 오해를 먼저 바로잡고, 관계마다 할 수 있는 일과 대화법, 위기 때 연락할 곳까지 이어져요.',
    steps: [
      { slug: 'what-is-schizophrenia', why: '병이 무엇이고 치료하면 많은 사람이 좋아진다는 것부터 알아요.' },
      { slug: 'myths', why: '다중인격·위험하다 같은 흔한 오해를 근거로 바로잡아요.' },
      { slug: 'faq-dangerous', why: '대부분은 폭력과 관계없고 오히려 피해를 입기 쉽다는 걸 알아요.' },
      { slug: 'faq-recovery-real', why: '회복한 사람이 실제로 있고 상당한 호전은 흔하다는 걸 봐요.' },
      { slug: 'stigma-self-stigma', why: '편견이 당사자 안의 목소리가 되는 과정을 알고 쓰는 말을 골라요.' },
      { slug: 'for-friends', why: '친구로서 할 수 있는 일과 친구의 몫이 아닌 일을 나눠요.' },
      { slug: 'for-coworkers-managers', why: '동료가 털어놓았을 때 비밀을 지키고 정당한 편의를 의논해요.' },
      { slug: 'for-teachers', why: '학생이 달라 보일 때 진단 대신 본 것을 적고 연결해요.' },
      { slug: 'leap-communication', why: '믿기 어려운 이야기 앞에서 반박하지 않고 대화하는 법을 익혀요.' },
      { slug: 'media-reporting-guidelines', why: '범죄 기사의 진단명이 낙인이 되는 이유와 독자가 할 일을 봐요.' },
      { slug: 'crisis-hotlines', why: '위험할 때 걸 번호와 전화할 때 말할 것을 알아 둬요.' }
    ]
  },
  {
    id: 'confusing-diagnosis',
    title: '진단이 헷갈릴 때',
    who: '모두',
    intro: '진단명이 낯설거나 바뀌어서 혼란스러운 당사자와 가족을 위해 묶었어요. 진단이 만들어지는 과정과 기준에서 시작해 헷갈리기 쉬운 다른 진단과의 차이, 의문이 들 때 할 수 있는 일까지 이어져요.',
    steps: [
      { slug: 'psychosis-what-is', why: '정신증이라는 말이 진단의 끝이 아니라 평가의 시작임을 알아요.' },
      { slug: 'diagnostic-process', why: '확진 검사 없이 면담과 병력으로 진단을 다듬는 과정을 이해해요.' },
      { slug: 'dsm5-criteria', why: '어떤 증상이 얼마나 오래 있었는지 보는 진단 기준을 읽어요.' },
      { slug: 'icd11', why: '진단서의 F20 같은 코드가 무엇을 뜻하는지 알아요.' },
      { slug: 'spectrum', why: '있다·없다가 아닌 연속선이라는 관점으로 진단을 봐요.' },
      { slug: 'rule-out-conditions', why: '정신병 증상으로 시작해도 치료가 다른 몸의 병을 거르는 검사를 봐요.' },
      { slug: 'vs-brief-psychotic', why: '기간으로 나뉜 진단명이라 시간이 지나 바뀔 수 있음을 알아요.' },
      { slug: 'vs-schizoaffective', why: '기분 삽화가 겹칠 때 진단명이 자주 바뀌는 이유를 봐요.' },
      { slug: 'vs-bipolar', why: '정신병 증상과 기분 삽화가 함께 오가는지가 열쇠임을 알아요.' },
      { slug: 'vs-delusional-disorder', why: '망상 하나만 이어지고 다른 기능은 유지되는 병과 구분해요.' },
      { slug: 'vs-substance-induced', why: '대마·각성제·처방약이 일으킨 증상과 어떻게 구분하는지 알아요.' },
      { slug: 'misdiagnosis', why: '진단이 바뀌는 이유와 세컨드 오피니언 받는 법을 알아요.' }
    ]
  },
  {
    id: 'symptoms-remain',
    title: '약을 먹어도 증상이 남을 때',
    who: '당사자',
    intro: '약을 먹어도 환청·망상이 남아 힘든 당사자를 위해 묶었어요. 약이 증상에 어떻게 듣는지 아는 데서 시작해 몸에 충분히 들어가는지 확인하기, 치료저항성 평가, 클로자핀과 다른 치료, 증상과 함께 지내는 법까지 이어져요.',
    steps: [
      { slug: 'positive-medication-response', why: '약은 증상을 지우기보다 힘을 빼는 쪽에 가깝다는 걸 먼저 알아요.' },
      { slug: 'faq-voices-persist', why: '목소리가 남을 때 확인할 순서를 단계별로 봐요.' },
      { slug: 'drug-level-test', why: '약이 몸에 충분히 들어가는지 재는 검사가 언제 쓰이는지 알아요.' },
      { slug: 'treatment-resistant', why: '치료저항성의 기준과 먼저 걸러야 할 가짜 저항성을 알아요.' },
      { slug: 'clozapine', why: '저항성에 효과가 확인된 약과 혈액검사를 하며 쓰는 이유를 알아요.' },
      { slug: 'clozapine-hypersalivation', why: '흔한 침 흘림을 가볍게 보지 않고 의사와 다루는 법을 봐요.' },
      { slug: 'adjunct-medications', why: '더하는 약마다 근거 수준이 다르다는 걸 표로 확인해요.' },
      { slug: 'ect', why: '영화 속 모습과 다른 지금의 ECT가 언제 고려되는지 알아요.' },
      { slug: 'rtms-tdcs', why: '뇌 자극 치료의 근거가 엇갈린다는 점을 정직하게 봐요.' },
      { slug: 'cbtp', why: '괴로움과 확신을 다루는 심리치료와 한국에서 받는 법을 알아요.' },
      { slug: 'shared-decision-making', why: '다음 치료를 고를 때 피하고 싶은 부작용을 적어 가 함께 정해요.' },
      { slug: 'living-with-voices', why: '목소리 일기와 일상 대처 도구로 목소리와의 관계를 바꿔 봐요.' }
    ]
  },
  {
    id: 'body-health',
    title: '몸 건강 챙기기',
    who: '당사자',
    intro: '약을 먹으며 몸 건강까지 챙기고 싶은 당사자를 위해 묶었어요. 왜 몸을 챙기는 것이 치료인지에서 시작해 약이 몸에 주는 영향, 바로 연락해야 할 신호, 오늘 할 수 있는 생활 습관까지 이어져요.',
    steps: [
      { slug: 'physical-health', why: '몸을 챙기는 것이 치료인 이유와 챙길 검진 항목을 알아요.' },
      { slug: 'life-expectancy', why: '수명 격차의 큰 원인이 심장과 폐의 병임을 알고 줄일 길을 봐요.' },
      { slug: 'metabolic-side-effects', why: '약이 체중·혈당·지질을 바꾸는 이유와 검사 일정을 알아요.' },
      { slug: 'faq-weight-gain', why: '살이 찐 게 의지 탓이 아님을 알고 의사와 대응을 의논해요.' },
      { slug: 'heart-and-antipsychotics', why: '심전도를 언제 찍는지와 바로 119에 연락할 신호를 알아요.' },
      { slug: 'neuroleptic-malignant-syndrome', why: '드물지만 응급인 고열·굳음·의식 변화 신호를 알아 둬요.' },
      { slug: 'polydipsia-hyponatremia', why: '물을 지나치게 마실 때 위험한 신호와 연락할 때를 알아요.' },
      { slug: 'heat-and-medication', why: '약이 더위를 견디기 어렵게 할 수 있어 여름 수칙을 챙겨요.' },
      { slug: 'womens-health', why: '생리·피임·폐경의 변화를 숨기지 않고 진료 때 말해요.' },
      { slug: 'other-medical-care', why: '수술·치과·약국에서 먹는 약 전체를 알리는 법을 알아요.' },
      { slug: 'smoking-caffeine-alcohol', why: '담배·카페인이 약 농도를 바꾸니 생활이 바뀌면 의사에게 알려요.' },
      { slug: 'diet-exercise', why: '당분 음료부터 줄이고 운동은 작게, 혼자보다 함께 시작해요.' }
    ]
  },
  {
    id: 'work-school',
    title: '일과 학업으로 돌아가기',
    who: '당사자',
    intro: '일터나 학교로 돌아가고 싶은 당사자를 위해 묶었어요. 일할 수 있다는 근거와 인지 증상 이해에서 시작해 알릴지 정하기, 차별과 기록 걱정, 고용 지원 제도, 일터에서 증상이 올 때의 대처까지 이어져요.',
    steps: [
      { slug: 'faq-work', why: '일할 수 있고, 적절한 일이 회복을 도울 수 있다는 연구를 봐요.' },
      { slug: 'work-study', why: '일과 공부를 다시 시작하는 큰 그림과 복학 준비 단계를 알아요.' },
      { slug: 'cognitive-overview', why: '집중·기억이 흔들리는 인지 증상이 일에 주는 영향을 이해해요.' },
      { slug: 'cognitive-remediation', why: '인지 훈련이 직업재활과 묶일 때 효과가 커진다는 걸 알아요.' },
      { slug: 'disclosure', why: '말할지 말지 득실을 따져 보고 말하는 문장을 준비해요.' },
      { slug: 'faq-tell-employer', why: '말할 의무는 없고, 말하면 근무 조정 같은 편의를 요청할 수 있어요.' },
      { slug: 'faq-record-employment', why: '진료 기록이 회사가 들여다볼 수 있는 기록이 아님을 확인해요.' },
      { slug: 'insurance-employment', why: '취업 차별을 막는 법과 인권위 결정을 확인된 범위로 봐요.' },
      { slug: 'supported-employment', why: '먼저 일자리를 구하고 일하며 지원받는 방식의 근거를 알아요.' },
      { slug: 'vocational-rehab', why: '장애인고용공단·국민취업지원제도 같은 한국 제도를 찾아요.' },
      { slug: 'coping-at-work', why: '일터에서 증상이 올 때 그 자리 대처와 복귀 계획을 세워요.' },
      { slug: 'daily-rhythm', why: '일어나는 시간을 고정하는 것부터 하루 리듬의 뼈대를 세워요.' }
    ]
  },
  {
    id: 'teens-twenties',
    title: '10대·20대에 시작됐을 때',
    who: '모두',
    intro: '10대·20대에 증상이 시작됐거나 달라진 모습이 걱정되는 당사자와 가족을 위해 묶었어요. 초기 변화와 첫 삽화에서 시작해 대마·잠 같은 생활, 학교·복학·병역, 위기 때 연락할 곳까지 이어져요.',
    steps: [
      { slug: 'faq-early-signs', why: '먼저 올 수 있는 변화와 스스로 판단할 수 없는 이유를 알아요.' },
      { slug: 'prodrome', why: '뚜렷한 증상 전에 달라지는 시기와 조기 개입의 근거를 봐요.' },
      { slug: 'adolescent-onset', why: '사춘기 변화와 어떻게 구분하는지, 학교와 가족이 할 일을 알아요.' },
      { slug: 'first-episode', why: '치료를 일찍 시작할수록 결과가 좋은 첫 삽화의 의미를 알아요.' },
      { slug: 'diagnosis-emotions', why: '진단 뒤 충격과 슬픔은 흔하니 혼자 견디지 말고 말해요.' },
      { slug: 'cannabis', why: '대마가 청소년기에 정신병 위험을 높이는 근거를 봐요.' },
      { slug: 'sleep', why: '잠이 무너지면 증상이 커지니 수면 습관부터 챙겨요.' },
      { slug: 'for-teachers', why: '학교 안 위(Wee) 클래스와 밖의 1388 같은 연결 창구를 알아요.' },
      { slug: 'work-study', why: '복학과 대학 장애학생지원센터 이용을 단계적으로 준비해요.' },
      { slug: 'faq-military', why: '진단이 있을 때 병역판정검사에서 무엇을 보고 등급을 정하는지 알아요.' },
      { slug: 'crisis-hotlines', why: '청소년상담 1388과 위기 때 걸 번호를 저장해 두어요.' }
    ]
  },
  {
    id: 'hospital-stay',
    title: '입원 전후',
    who: '모두',
    intro: '입원을 앞두고 있거나 입원 중이거나 막 퇴원한 당사자와 가족을 위해 묶었어요. 급성기와 입원의 종류·권리에서 시작해 병동 생활과 비용, 퇴원 뒤 첫 한 달과 지역에서 이어지는 돌봄까지 따라가요.',
    steps: [
      { slug: 'acute-phase', why: '증상이 가장 심할 때 안전과 권리를 지키는 것이 핵심임을 알아요.' },
      { slug: 'psychiatric-emergency-system', why: '위기 때 상담 전화 다음에 움직이는 공공 장치를 알아요.' },
      { slug: 'hospital-day-hospital', why: '입원이 필요한 때와 낮에만 다니는 낮병원이라는 선택지를 봐요.' },
      { slug: 'admission-types', why: '입원 다섯 종류의 요건과 퇴원 절차를 표로 확인해요.' },
      { slug: 'faq-forced-admission', why: '본인 뜻과 다른 입원의 조건과 입원 뒤에도 남는 권리를 알아요.' },
      { slug: 'shared-decision-making', why: '원하는 도움을 미리 적어 두고 입원·퇴원 때 뜻을 전하는 길을 알아요.' },
      { slug: 'hospital-stay-life', why: '병동의 하루, 준비물, 휴대폰·면회 규칙을 미리 알아 둬요.' },
      { slug: 'habeas-corpus-relief', why: '본인 뜻과 다른 입원이 법에 맞는지 법원에 묻는 길을 알아요.' },
      { slug: 'treatment-cost-support', why: '응급입원·행정입원 치료비를 덜어 주는 사업과 신청 순서를 봐요.' },
      { slug: 'trauma-and-psychosis', why: '입원이 남긴 상처도 진료 때 말해도 된다는 걸 알아요.' },
      { slug: 'first-month-after-discharge', why: '위험이 높은 퇴원 직후를 주차별 체크리스트로 준비해요.' },
      { slug: 'case-management-act', why: '병원 밖에서 치료와 생활을 이어 주는 사례관리를 이용해요.' }
    ]
  },
  {
    id: 'partners-parents',
    title: '연인·배우자·부모로 살기',
    who: '당사자',
    intro: '연애하고 결혼하고 부모가 되는 삶을 생각하는 당사자를 위해 묶었어요. 관계와 공개에서 시작해 약과 성·피임, 유전과 임신, 아이와 파트너가 알면 좋은 것까지 이어져요.',
    steps: [
      { slug: 'loneliness-relationships', why: '외로움이 증상과 함께 움직임을 알고 작은 접촉부터 늘려요.' },
      { slug: 'faq-love-marriage', why: '연애와 결혼이 회복의 목표가 될 수 있음을 확인해요.' },
      { slug: 'dating-marriage', why: '언제 어떻게 말할지와 건강한 관계의 신호를 알아요.' },
      { slug: 'disclosure', why: '누구에게 얼마나 말할지 상대별로 따져 보고 문장을 준비해요.' },
      { slug: 'sexual-side-effects', why: '말하기 어려운 성기능 문제를 의사에게 꺼내는 법을 익혀요.' },
      { slug: 'womens-health', why: '약이 바뀌면 피임과 임신 가능성이 달라질 수 있음을 알아요.' },
      { slug: 'faq-inheritance', why: '아이에게 유전될까 하는 걱정을 숫자와 유전 상담으로 덜어요.' },
      { slug: 'genetic-counseling', why: '유전 상담이 돕는 것과 유전자 검사로 알 수 없는 것을 알아요.' },
      { slug: 'pregnancy-parenting', why: '임신 전에 의사와 약을 함께 정하고 부모 역할 지원을 찾아요.' },
      { slug: 'siblings-children', why: '아이에게 나이에 맞게 병을 설명하는 법을 알아요.' },
      { slug: 'partner-caregiving', why: '파트너가 겪는 역할 변화와 돌봄의 무게를 파트너 쪽에서 봐요.' }
    ]
  },
  {
    id: 'after-parents',
    title: '부모가 떠난 뒤를 준비하기',
    who: '가족',
    intro: '"내가 없으면 이 아이는 어떻게 되나" 하는 걱정을 안고 있는 부모와 가족을 위해 묶었어요. 돈·주거·결정 지원·사람이라는 준비의 틀에서 시작해 후견과 급여, 집과 돌봄 서비스, 함께할 사람과 단체까지 이어져요.',
    steps: [
      { slug: 'parents-future-planning', why: '돈·주거·결정 지원·사람의 네 기둥으로 준비할 일을 나눠요.' },
      { slug: 'guardian-duties', why: '보호의무자가 누구이고 부모가 떠난 뒤엔 어떤 제도를 쓰는지 알아요.' },
      { slug: 'public-guardianship', why: '네 가지 후견의 차이와 후견이 제한하지 않는 것을 알아요.' },
      { slug: 'money-management', why: '결정을 줄이는 장치로 돈이 흔들리지 않게 미리 만들어 둬요.' },
      { slug: 'livelihood-pension', why: '소득이 끊겼을 때 기댈 급여와 연금의 차이를 알아요.' },
      { slug: 'housing-support', why: '주거급여·공공임대·지원주택을 어디부터 신청할지 알아요.' },
      { slug: 'housing-independent-living', why: '혼자 살기를 단계로 준비하고 재발 신호를 나눌 체계를 만들어요.' },
      { slug: 'activity-support-service', why: '활동지원사 방문과 긴급돌봄 같은 돌봄 서비스를 알아요.' },
      { slug: 'mental-health-center', why: '무료 상담과 사례관리를 받는 지역 기관에 미리 연결해요.' },
      { slug: 'late-life', why: '나이 들며 몸과 돌봄·주거가 새 과제가 되는 것을 알아요.' },
      { slug: 'siblings-children', why: '돌봄 계획에 형제자매의 생각도 묻도록 그 마음을 먼저 알아요.' },
      { slug: 'advocacy-groups', why: '혼자가 아니라는 걸 확인할 당사자·가족 단체를 찾아요.' }
    ]
  },
  {
    id: 'money-rights',
    title: '돈과 권리',
    who: '모두',
    intro: '치료비 부담을 덜고, 기록·보험·입원·수사 같은 상황에서 지켜지는 권리를 알고 싶은 당사자와 가족을 위해 묶었어요. 진료비를 줄이는 제도에서 시작해 큰 병원비 안전망, 기록과 정보, 법이 보장하는 권리까지 이어져요.',
    steps: [
      { slug: 'faq-cost', why: '치료비가 어떻게 줄어드는지 전체 그림부터 봐요.' },
      { slug: 'special-calculation', why: '진료비 본인부담을 줄이는 산정특례의 신청과 재등록을 알아요.' },
      { slug: 'medical-cost-safety-net', why: '병원비가 크게 나왔을 때 기댈 제도를 사다리 순서로 봐요.' },
      { slug: 'treatment-cost-support', why: '응급입원·발병 초기 치료비를 덜어 주는 사업의 유형과 신청 순서를 알아요.' },
      { slug: 'drug-costs-coverage', why: '약값이 정해지는 원리와 부담될 때 상담할 곳을 알아요.' },
      { slug: 'family-care-leave', why: '회사에 다니는 가족이 쓰는 돌봄휴가·휴직과 대상 가족의 범위를 알아요.' },
      { slug: 'faq-insurance', why: '보험 가입 때 사실대로 답하고 거절되면 할 수 있는 일을 알아요.' },
      { slug: 'medical-records-privacy', why: '진료 기록을 누가 볼 수 있는지와 열람·정정할 권리를 알아요.' },
      { slug: 'faq-family-talk-doctor', why: '가족이 변화를 전할 수는 있지만 기록은 본인 동의가 필요함을 알아요.' },
      { slug: 'habeas-corpus-relief', why: '뜻과 다른 수용이 법에 맞는지 법원에 판단을 구하는 제도를 알아요.' },
      { slug: 'justice-system', why: '경찰 조사·재판에서 쓸 수 있는 권리와 물어볼 곳을 알아요.' }
    ]
  }
];
