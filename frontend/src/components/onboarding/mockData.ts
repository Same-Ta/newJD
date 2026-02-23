// 온보딩 시뮬레이션에 사용되는 Mock 데이터
// 실제 데이터를 생성하지 않고 안전하게 시연합니다.

export const MOCK_JD = {
  id: 'mock-jd-001',
  title: '프론트엔드 개발자 (React/TypeScript)',
  company: 'WINNOW Corp.',
  jobRole: '프론트엔드 개발',
  department: '개발팀',
  location: '서울 강남구',
  status: '채용중',
  recruitmentPeriod: '2026.02.21 ~ 2026.03.21',
  description: 'WINNOW의 핵심 프로덕트를 함께 만들어갈 프론트엔드 개발자를 찾습니다.',
  responsibilities: [
    'React/TypeScript 기반 웹 서비스 개발',
    'UI/UX 개선 및 성능 최적화',
    '디자인 시스템 구축 및 컴포넌트 개발',
    'RESTful API 연동 및 상태 관리',
  ],
  requirements: [
    'React 프레임워크 2년 이상 실무 경험',
    'TypeScript 능숙 사용',
    'Git 기반 협업 경험',
    '반응형 웹 개발 경험',
  ],
  preferred: [
    'Next.js 또는 Vite 프로젝트 경험',
    'Tailwind CSS 경험',
    'CI/CD 파이프라인 경험',
  ],
  benefits: [
    '유연근무제 (코어타임 11-16시)',
    '점심·저녁 식대 지원',
    '최신 장비 지급 (맥북 프로/모니터)',
    '교육비 및 도서 구입비 지원',
  ],
  createdAt: new Date().toISOString(),
};

export const MOCK_APPLICANTS = [
  {
    id: 'mock-app-001',
    name: '김서연',
    email: 'seoyeon@example.com',
    status: '검토중',
    score: 92,
    university: '서울대학교',
    major: '컴퓨터공학',
    appliedAt: '2026-02-20',
    matchTags: ['React 3년', 'TypeScript', 'Tailwind'],
  },
  {
    id: 'mock-app-002',
    name: '이준호',
    email: 'junho@example.com',
    status: '서류합격',
    score: 87,
    university: '카이스트',
    major: '전산학',
    appliedAt: '2026-02-19',
    matchTags: ['React 2년', 'Next.js', 'Git'],
  },
  {
    id: 'mock-app-003',
    name: '박지은',
    email: 'jieun@example.com',
    status: '검토중',
    score: 78,
    university: '연세대학교',
    major: '소프트웨어학',
    appliedAt: '2026-02-18',
    matchTags: ['React 1년', 'Vue.js', 'JavaScript'],
  },
  {
    id: 'mock-app-004',
    name: '최민수',
    email: 'minsu@example.com',
    status: '불합격',
    score: 54,
    university: '고려대학교',
    major: '정보통신학',
    appliedAt: '2026-02-17',
    matchTags: ['jQuery', 'HTML/CSS'],
  },
];

export const MOCK_AI_KEYWORDS = [
  'React',
  'TypeScript',
  '프론트엔드',
  '3년 경력',
  '성능 최적화',
];

export const MOCK_AI_ANALYSIS = {
  summary: '92점 - 매우 적합',
  strengths: [
    'React 3년 이상 실무 경험 보유',
    'TypeScript 및 Tailwind CSS 능숙',
    '대규모 프로젝트 리딩 경험',
  ],
  weaknesses: [
    'CI/CD 경험 미기재',
  ],
  recommendation: '1차 면접 추천',
};

// 타이핑 애니메이션에 사용될 키워드 시퀀스
export const TYPING_KEYWORDS = [
  '프론트엔드 개발자',
  'React/TypeScript',
  '2년 이상 경력',
];

// 온보딩 스텝 정의
export interface OnboardingStep {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  icon: string; // lucide icon name
  highlights: string[];
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 1,
    title: '공고 생성 매니저',
    subtitle: 'AI가 자동으로 공고를 작성합니다',
    description: '동아리/기업 유형을 선택하고 기본 정보만 입력하면, AI가 자격요건, 우대사항, 혜택까지 최적화된 공고 초안을 자동 생성합니다. 채팅으로 세부 수정도 가능합니다.',
    icon: 'sparkles',
    highlights: [
      '동아리 · 기업 유형별 맞춤 공고 생성',
      '기본 정보 입력만으로 AI 초안 자동 생성',
      '채팅 & 편집 모드로 실시간 수정',
    ],
  },
  {
    id: 2,
    title: '내 공고 관리',
    subtitle: '수정하고 공유하여 지원자를 모으세요',
    description: '생성된 공고를 언제든 수정할 수 있고, 링크 공유 버튼 하나로 지원자들에게 빠르게 배포할 수 있습니다.',
    icon: 'share',
    highlights: [
      '실시간 공고 수정 및 관리',
      '원클릭 링크 공유로 빠른 배포',
      '지원자 현황 실시간 확인',
    ],
  },
  {
    id: 3,
    title: '지원자 AI 분석',
    subtitle: 'AI로 최적의 인재를 찾아냅니다',
    description: '공고별 지원자 목록을 확인하고, AI 분석을 통해 이력서·답변 데이터를 기반으로 합격 적합도를 자동 평가합니다.',
    icon: 'brain',
    highlights: [
      'AI 기반 지원자 적합도 자동 분석',
      '이력서 & 답변 데이터 종합 평가',
      '효율적인 지원자 필터링 & 관리',
    ],
  },
];

// 인터랙티브 튜토리얼 스텝 정의
export interface TutorialStep {
  id: number;
  targetSelector: string; // CSS selector or data attribute
  targetPage: string; // 해당 페이지
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  action?: string; // 클릭 시 수행할 액션
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 1,
    targetSelector: '[data-tour="sidebar-chat"]',
    targetPage: 'dashboard',
    title: '공고 생성 (AI)',
    description: '이 버튼을 클릭하면 동아리/기업 유형을 선택하고, 기본 정보를 입력한 후 AI가 공고 초안을 자동 생성해줘요.',
    position: 'right',
    action: 'chat',
  },
  {
    id: 2,
    targetSelector: '[data-tour="sidebar-myjds"]',
    targetPage: 'dashboard',
    title: '내 공고 목록',
    description: '생성된 공고를 확인하고, 수정하거나 링크를 공유하여 지원자를 모을 수 있어요.',
    position: 'right',
    action: 'my-jds',
  },
  {
    id: 3,
    targetSelector: '[data-tour="sidebar-applicants"]',
    targetPage: 'dashboard',
    title: '지원자 관리',
    description: '공고별 지원자 목록을 확인하고, AI 분석 버튼으로 적합도를 평가해보세요.',
    position: 'right',
    action: 'applicants',
  },
];
