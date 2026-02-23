import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

// ── localStorage 유틸리티 ──
const TUTORIAL_DISMISSED_KEY = 'winnow_tutorial_dismissed';

export const isTutorialDismissed = (): boolean => {
  try {
    return localStorage.getItem(TUTORIAL_DISMISSED_KEY) === 'true';
  } catch {
    return false;
  }
};

export const dismissTutorial = (): void => {
  try {
    localStorage.setItem(TUTORIAL_DISMISSED_KEY, 'true');
  } catch {}
};

export const resetTutorial = (): void => {
  try {
    localStorage.removeItem(TUTORIAL_DISMISSED_KEY);
  } catch {}
};

// ── 튜토리얼 페이즈 / 단계 정의 ──

export type TutorialPhase = 1 | 2 | 3 | 4;

export const PHASE_TITLES: Record<TutorialPhase, string> = {
  1: 'AI 공고 생성',
  2: '공고 관리 & 공유',
  3: '팀 관리',
  4: '지원자 AI 분석',
};

export const PHASE_DESCRIPTIONS: Record<TutorialPhase, string> = {
  1: '유형 선택 → 작성 방식 선택 → 기본 정보 입력 → AI 초안 생성 → 섹션 집중 수정 → 공고 게시',
  2: '생성한 공고를 확인하고 공유 링크를 복사하세요',
  3: '팀원을 초대하여 함께 채용을 관리하세요',
  4: '가상 지원자들의 AI 분석 결과를 확인하고 코멘트를 남겨보세요',
};

export interface TutorialStepDef {
  id: string;
  phase: TutorialPhase;
  page: string;
  target: string;
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  waitForClick?: boolean;
  action?: string;
  autoAdvanceMs?: number;
  interaction?: 'click' | 'input' | 'wait' | 'auto';
  group: string;
}

export const TUTORIAL_STEPS: TutorialStepDef[] = [
  // ─── Phase 1: AI 공고 생성 ───
  {
    id: 'p1-sidebar-chat',
    phase: 1,
    page: 'dashboard',
    target: 'sidebar-chat',
    title: '① AI로 공고를 만들어보세요',
    description: '"공고 생성 (AI)" 메뉴를 클릭하세요.\n유형 선택 → 작성 방식 → 기본 정보 입력 순서로 진행됩니다.',
    position: 'right',
    waitForClick: true,
    action: 'chat',
    interaction: 'click',
    group: 'AI 공고 생성',
  },
  {
    id: 'p1-type-select',
    phase: 1,
    page: 'chat',
    target: 'type-select-club',
    title: '② 동아리 모집공고를 선택하세요',
    description: '동아리 모집공고와 기업 채용공고 중 선택할 수 있어요.\n하이라이트된 "동아리 모집공고"를 클릭해보세요!',
    position: 'bottom',
    waitForClick: true,
    interaction: 'click',
    group: 'AI 공고 생성',
  },
  {
    id: 'p1-method-select',
    phase: 1,
    page: 'chat',
    target: 'method-select-new',
    title: '③ 새로운 공고 작성을 선택하세요',
    description: 'PDF 업로드 또는 새로운 공고 작성을 선택할 수 있어요.\n하이라이트된 "새로운 공고 작성"을 클릭해보세요!',
    position: 'bottom',
    waitForClick: true,
    interaction: 'click',
    group: 'AI 공고 생성',
  },
  {
    id: 'p1-basic-info',
    phase: 1,
    page: 'chat',
    target: 'basic-info-form',
    title: '기본 정보를 입력하세요',
    description: '이름과 분야만 입력하면 AI가 공고 초안을 자동으로 생성해줘요.\n데모에서는 자동으로 입력됩니다.',
    position: 'right',
    waitForClick: false,
    interaction: 'wait',
    group: 'AI 공고 생성',
  },
  {
    id: 'p1-ai-typing',
    phase: 1,
    page: 'chat',
    target: 'chat-preview',
    title: 'AI가 공고 초안을 작성 중입니다',
    description: '기본 정보를 바탕으로 AI가 공고 초안을 자동 생성합니다.\n완료되면 채팅으로 수정하거나, 편집 버튼으로 직접 수정할 수 있어요.',
    position: 'left',
    waitForClick: false,
    interaction: 'wait',
    group: 'AI 공고 생성',
  },
  {
    id: 'p1-section-click',
    phase: 1,
    page: 'chat',
    target: 'preview-section-description',
    title: '⑥ 섹션을 클릭해 선택하세요',
    description: '오른쪽 미리보기에서 섹션을 클릭하면 해당 부분만 AI와 집중적으로 수정할 수 있어요.\n하이라이트된 "소개" 섹션을 클릭해보세요!',
    position: 'left',
    waitForClick: true,
    interaction: 'click',
    group: 'AI 공고 생성',
  },
  {
    id: 'p1-section-chat',
    phase: 1,
    page: 'chat',
    target: 'chat-input',
    title: '⑥ 섹션 집중 수정 모드',
    description: '선택한 섹션에 대해 AI와 대화하면 해당 부분만 집중적으로 수정됩니다.\n예: "소개 내용을 좀 더 열정적으로 바꾸줘"',
    position: 'top',
    waitForClick: false,
    interaction: 'wait',
    group: 'AI 공고 생성',
  },
  {
    id: 'p1-publish-jd',
    phase: 1,
    page: 'chat',
    target: 'chat-publish-btn',
    title: '⑦ 공고를 게시하세요',
    description: '초안이 마음에 드시면 게시 버튼을 클릭하세요.\n게시 전 지원 양식도 설정할 수 있습니다.',
    position: 'top',
    waitForClick: true,
    interaction: 'click',
    group: 'AI 공고 생성',
  },

  // ─── Phase 2: 공고 관리 & 공유 ───
  {
    id: 'p2-sidebar-myjds',
    phase: 2,
    page: 'chat',
    target: 'sidebar-myjds',
    title: '② 내 공고 목록으로 이동',
    description: '저장한 공고를 확인하러 가볼까요?\n"내 공고 목록"을 클릭하세요.',
    position: 'right',
    waitForClick: true,
    action: 'my-jds',
    interaction: 'click',
    group: '공고 관리 & 공유',
  },
  {
    id: 'p2-jd-card',
    phase: 2,
    page: 'my-jds',
    target: 'jd-card-first',
    title: '생성된 공고를 확인하세요',
    description: '방금 만든 공고가 목록에 추가되었습니다.\n클릭하면 상세 페이지로 이동합니다.',
    position: 'bottom',
    waitForClick: false,
    interaction: 'click',
    group: '공고 관리 & 공유',
  },
  {
    id: 'p2-edit-btn',
    phase: 2,
    page: 'jd-detail',
    target: 'jd-edit-btn',
    title: '공고를 수정해보세요',
    description: '공고 내용은 언제든지 자유롭게 수정할 수 있습니다.\n하이라이트된 "수정" 버튼을 클릭하세요.',
    position: 'bottom',
    waitForClick: true,
    interaction: 'click',
    group: '공고 관리 & 공유',
  },
  {
    id: 'p2-edit-save',
    phase: 2,
    page: 'jd-detail',
    target: 'jd-save-btn',
    title: '수정을 완료하세요',
    description: '수정한 내용을 확인하고 "저장" 버튼을 눌러 완료해보세요.',
    position: 'bottom',
    waitForClick: true,
    interaction: 'click',
    group: '공고 관리 & 공유',
  },
  {
    id: 'p2-share-link',
    phase: 2,
    page: 'jd-detail',
    target: 'jd-share-link',
    title: '공유 링크를 복사하세요',
    description: '이 링크를 공유하면 누구나 공고를 확인하고 지원할 수 있습니다.',
    position: 'bottom',
    waitForClick: false,
    interaction: 'click',
    group: '공고 관리 & 공유',
  },

  // ─── Phase 3: 팀 관리 ───
  {
    id: 'p3-sidebar-team',
    phase: 3,
    page: 'jd-detail',
    target: 'sidebar-team',
    title: '③ 팀원을 초대해보세요',
    description: '팀 관리 페이지에서 협업자를 초대할 수 있습니다.\n"팀 관리"를 클릭하세요.',
    position: 'right',
    waitForClick: true,
    action: 'team',
    interaction: 'click',
    group: '팀 관리',
  },
  {
    id: 'p3-select-jd',
    phase: 3,
    page: 'team',
    target: 'team-jd-first',
    title: '공고를 선택하세요',
    description: '팀원을 초대할 공고를 선택하세요.',
    position: 'right',
    waitForClick: true,
    interaction: 'click',
    group: '팀 관리',
  },
  {
    id: 'p3-invite-btn',
    phase: 3,
    page: 'team',
    target: 'team-invite-btn',
    title: '초대 버튼 클릭',
    description: '"초대" 버튼을 클릭하여 팀원을 추가하세요.',
    position: 'bottom',
    waitForClick: true,
    interaction: 'click',
    group: '팀 관리',
  },
  {
    id: 'p3-invite-complete',
    phase: 3,
    page: 'team',
    target: 'team-invite-input',
    title: '이메일을 입력하세요',
    description: '팀원의 이메일 주소를 입력하고 초대해보세요.\n데모에서는 아무 이메일이나 입력 가능합니다.',
    position: 'bottom',
    waitForClick: false,
    interaction: 'input',
    group: '팀 관리',
  },

  // ─── Phase 4: 지원자 AI 분석 & 협업 ───
  {
    id: 'p4-sidebar-applicants',
    phase: 4,
    page: 'team',
    target: 'sidebar-applicants',
    title: '④ 지원자를 확인해보세요',
    description: '공고별 지원자를 확인하고 AI 분석을 실행해보세요.\n"지원자 관리"를 클릭하세요.',
    position: 'right',
    waitForClick: true,
    action: 'applicants',
    interaction: 'click',
    group: '지원자 AI 분석',
  },
  {
    id: 'p4-jd-filter',
    phase: 4,
    page: 'applicants',
    target: 'applicant-jd-filter',
    title: '공고별 지원자 확인',
    description: '공고 필터를 사용하면 특정 공고의 지원자만 모아볼 수 있습니다.\n각 공고의 지원 현황을 한눈에 파악하세요.',
    position: 'right',
    waitForClick: false,
    interaction: 'auto',
    autoAdvanceMs: 3500,
    group: '지원자 AI 분석',
  },
  {
    id: 'p4-ai-analysis-btn',
    phase: 4,
    page: 'applicants',
    target: 'ai-analysis-btn-first',
    title: 'AI 분석을 실행해보세요',
    description: '지원자의 역량을 AI가 자동으로 분석합니다.\n하이라이트 영역을 클릭하여 AI 스크리닝 리포트를 확인하세요.',
    position: 'left',
    waitForClick: true,
    interaction: 'click',
    group: '지원자 AI 분석',
  },
  {
    id: 'p4-analysis-result',
    phase: 4,
    page: 'applicant-detail',
    target: 'applicant-ai-analysis',
    title: 'AI 스크리닝 리포트',
    description: '역량 점수, 강점, 보완점 등을 한눈에 확인할 수 있습니다.\n실제 서비스에서는 실시간 AI가 분석합니다.',
    position: 'bottom',
    waitForClick: false,
    autoAdvanceMs: 5000,
    interaction: 'auto',
    group: '지원자 AI 분석',
  },
  {
    id: 'p4-comments',
    phase: 4,
    page: 'applicant-detail',
    target: 'applicant-comments',
    title: '팀원과 코멘트 공유',
    description: '팀원들이 지원자에 대한 의견을 코멘트로 남길 수 있습니다.\n함께 채용 결정을 내려보세요!',
    position: 'top',
    waitForClick: false,
    autoAdvanceMs: 7000,
    interaction: 'auto',
    group: '지원자 AI 분석',
  },
];

// ── 데모 데이터 ──

export const DEMO_JD_LIST = [
  {
    id: 'demo-jd-001',
    title: '프론트엔드 개발자 (React/TypeScript)',
    jobRole: 'Frontend Developer',
    company: 'WINNOW Demo',
    status: 'published',
    createdAt: new Date().toISOString(),
    recruitmentPeriod: `${new Date().toISOString().slice(0, 10).replace(/-/g, '.')} ~ ${new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10).replace(/-/g, '.')}`,
    bannerImage: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=800',
  },
  {
    id: 'demo-jd-002',
    title: '백엔드 엔지니어 (Python/FastAPI)',
    jobRole: 'Backend Engineer',
    company: 'WINNOW Demo',
    status: 'published',
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    recruitmentPeriod: `${new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10).replace(/-/g, '.')} ~ ${new Date(Date.now() + 23 * 86400000).toISOString().slice(0, 10).replace(/-/g, '.')}`,
    bannerImage: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=800',
  },
];

const now = Math.floor(Date.now() / 1000);
export const DEMO_APPLICANTS = [
  {
    id: 'demo-app-001',
    applicantName: '김민수',
    applicantEmail: 'minsu.kim@example.com',
    applicantPhone: '010-1234-5678',
    applicantGender: '남',
    jdId: 'demo-jd-001',
    jdTitle: '프론트엔드 개발자 (React/TypeScript)',
    status: '검토중',
    appliedAt: { seconds: now - 86400, nanoseconds: 0 },
    requirementAnswers: [
      { question: 'React 2년 이상 경험', checked: true, detail: '3년 경력 보유', answer: 'Y' },
      { question: 'TypeScript 능숙', checked: true, detail: '주력 언어로 사용', answer: 'Y' },
      { question: 'Git 협업 경험', checked: true, detail: 'GitHub Flow 사용', answer: 'Y' },
    ],
    preferredAnswers: [
      { question: 'Next.js 경험', checked: true, detail: '프로젝트 2건', answer: 'Y' },
      { question: 'CI/CD 구축 경험', checked: false, detail: '', answer: 'N' },
    ],
    portfolio: 'https://github.com/demo-minsu',
  },
  {
    id: 'demo-app-002',
    applicantName: '이서연',
    applicantEmail: 'seoyeon.lee@example.com',
    applicantPhone: '010-2345-6789',
    applicantGender: '여',
    jdId: 'demo-jd-001',
    jdTitle: '프론트엔드 개발자 (React/TypeScript)',
    status: '검토중',
    appliedAt: { seconds: now - 172800, nanoseconds: 0 },
    requirementAnswers: [
      { question: 'React 2년 이상 경험', checked: true, detail: '5년 경력 보유', answer: 'Y' },
      { question: 'TypeScript 능숙', checked: true, detail: '팀 내 TS Migration 리드', answer: 'Y' },
      { question: 'Git 협업 경험', checked: true, detail: 'GitLab 사용', answer: 'Y' },
    ],
    preferredAnswers: [
      { question: 'Next.js 경험', checked: true, detail: 'SSR, ISR 등 적용', answer: 'Y' },
      { question: 'CI/CD 구축 경험', checked: true, detail: 'GitHub Actions 구축', answer: 'Y' },
    ],
    portfolio: 'https://seoyeon-portfolio.vercel.app',
  },
  {
    id: 'demo-app-003',
    applicantName: '박지훈',
    applicantEmail: 'jihoon.park@example.com',
    applicantPhone: '010-3456-7890',
    applicantGender: '남',
    jdId: 'demo-jd-001',
    jdTitle: '프론트엔드 개발자 (React/TypeScript)',
    status: '검토중',
    appliedAt: { seconds: now - 259200, nanoseconds: 0 },
    requirementAnswers: [
      { question: 'React 2년 이상 경험', checked: true, detail: '1.5년 경력 (인턴 포함)', answer: 'Y' },
      { question: 'TypeScript 능숙', checked: false, detail: '학습 중', answer: 'N' },
      { question: 'Git 협업 경험', checked: true, detail: 'GitHub 사용', answer: 'Y' },
    ],
    preferredAnswers: [
      { question: 'Next.js 경험', checked: false, detail: '', answer: 'N' },
      { question: 'CI/CD 구축 경험', checked: false, detail: '', answer: 'N' },
    ],
  },
  {
    id: 'demo-app-004',
    applicantName: '최유진',
    applicantEmail: 'yujin.choi@example.com',
    applicantPhone: '010-4567-8901',
    applicantGender: '여',
    jdId: 'demo-jd-002',
    jdTitle: '백엔드 엔지니어 (Python/FastAPI)',
    status: '검토중',
    appliedAt: { seconds: now - 345600, nanoseconds: 0 },
    requirementAnswers: [
      { question: 'Python 3년 이상 경험', checked: true, detail: '4년 경력', answer: 'Y' },
      { question: 'FastAPI/Django 경험', checked: true, detail: 'FastAPI 주력', answer: 'Y' },
      { question: 'SQL 능숙', checked: true, detail: 'PostgreSQL, MySQL', answer: 'Y' },
    ],
    preferredAnswers: [
      { question: 'Docker/K8s 경험', checked: true, detail: 'Docker Compose 사용', answer: 'Y' },
      { question: 'AWS 경험', checked: true, detail: 'EC2, S3, RDS', answer: 'Y' },
    ],
  },
  {
    id: 'demo-app-005',
    applicantName: '정현우',
    applicantEmail: 'hyunwoo.jung@example.com',
    applicantPhone: '010-5678-9012',
    applicantGender: '남',
    jdId: 'demo-jd-002',
    jdTitle: '백엔드 엔지니어 (Python/FastAPI)',
    status: '검토중',
    appliedAt: { seconds: now - 432000, nanoseconds: 0 },
    requirementAnswers: [
      { question: 'Python 3년 이상 경험', checked: true, detail: '2년 경력', answer: 'Y' },
      { question: 'FastAPI/Django 경험', checked: false, detail: 'Flask만 사용', answer: 'N' },
      { question: 'SQL 능숙', checked: true, detail: 'MySQL 사용', answer: 'Y' },
    ],
    preferredAnswers: [
      { question: 'Docker/K8s 경험', checked: false, detail: '', answer: 'N' },
      { question: 'AWS 경험', checked: false, detail: '', answer: 'N' },
    ],
  },
];

export const DEMO_AI_ANALYSIS = `[0. 지원자 프로필]
지원 트랙: 프론트엔드 개발자 (React/TypeScript)
전공 정보: 컴퓨터공학 / 한국대학교
인적 사항: 27세 / 남성
현재 상태: 구직 중 (현재 스타트업 재직, 이직 준비)

[1. 요약 판정]
최종 분류 : [면접 권장]
역량 (Skill) : [높음]
의지 (Will) : [높음]

[2. 역량 평가]
직무 역량 | [높음]
근거: React 3년, TypeScript 2년 경력 보유. 실무 프로젝트 4건(전자상거래/SaaS/대시보드/사내 툴)에서 프론트엔드 리드 역할 수행. Next.js App Router 기반 프로젝트 경험 명시.
판정: 핵심 기술 스택에서 즉시 투입 가능한 수준의 역량을 확인함

문제 해결 | [높음]
근거: Redux → Zustand 마이그레이션으로 번들 사이즈 32% 감소 달성. Lighthouse 성능 점수 68→91 개선 경험. 문제 정의부터 해결책 구현까지 구체적 수치로 기술.
판정: 단순 구현을 넘어 성능 병목을 분석하고 해결하는 역량이 우수함

성장 잠재력 | [높음]
근거: 개인 기술 블로그 월 5회 이상 포스팅, GitHub 오픈소스 기여 3회, 사내 스터디 주도. 자기 주도적 학습 습관이 일관되게 관찰됨.
판정: 빠른 성장이 기대되며 팀의 기술 문화 향상에도 기여할 것으로 판단됨

협업 태도 | [보통]
근거: 코드 리뷰 경험 있으나 5인 이하 소규모 팀 경험만 있음. 원격/하이브리드 환경의 대규모 협업 경험이 제한적.
판정: 소규모 협업 경험은 검증됨. 더 큰 조직에서의 적응력은 입사 후 확인 필요

[3. 조직 문화 적합성]
[ ] 자기 주도 학습 : [확인됨]
(기술 블로그와 오픈소스 기여를 통해 지속적인 자기 계발 의지가 명확히 확인됩니다)
[ ] 데이터 기반 의사결정 : [확인됨]
(성능 개선 수치를 구체적으로 기술하는 등 수치와 근거로 의사결정하는 문화에 적합합니다)
[ ] 팀 기여 의지 : [확인됨]
(사내 스터디 주도, 코드 리뷰 참여 등 팀 전체의 역량 향상을 위해 노력한 정황이 보입니다)
[ ] 대규모 서비스 경험 : [미흡]
(스타트업 규모 서비스 경험 위주로, 대규모 트래픽 및 복잡한 시스템 운영 경험이 부족합니다)

[4. 채용 가이드]
💡 핵심 강점
1. React/TypeScript 기반의 실무 검증된 프론트엔드 역량
2. 성능 최적화 경험 및 수치 기반의 문제 해결 능력
3. 기술 블로그·오픈소스 활동을 통한 자기 주도 학습 문화

⚠️ 주의 사항
대규모 협업 경험 부족: 5인 이하 팀 경험만 있어 대규모 조직 적응에 시간이 필요할 수 있음
CI/CD 구축 경험 제한: 파이프라인 설계 경험은 없으나, 사용 경험은 있어 온보딩 지원 시 빠른 적응 가능

🙋 면접 질문
Q1: "성능 점수를 68에서 91로 올린 구체적인 과정과 사용한 기법을 설명해주세요"
Q2: "상태 관리 라이브러리 마이그레이션을 결정할 때 어떤 기준으로 판단하셨나요?"
Q3: "팀에서 기술적 의견 충돌이 발생했을 때 어떻게 해결하는 편인가요?"
`;

export const DEMO_TEAM_MEMBERS = [
  { uid: 'demo-team-001', email: 'sarah.kim@company.com', name: '김사라', role: 'editor', addedAt: { seconds: now - 604800, nanoseconds: 0 } },
  { uid: 'demo-team-002', email: 'james.lee@company.com', name: '이재민', role: 'viewer', addedAt: { seconds: now - 432000, nanoseconds: 0 } },
];

// AI 타이핑 시뮬레이션용 JD 응답
export const DEMO_AI_JD_RESPONSE = {
  title: '프론트엔드 개발자 (React/TypeScript)',
  type: 'company' as const,
  company: 'WINNOW',
  companyName: 'WINNOW',
  teamName: '',
  jobRole: 'Frontend Developer',
  location: '서울특별시 강남구',
  scale: '50-100명',
  description: 'WINNOW에서 혁신적인 채용 플랫폼의 프론트엔드를 함께 만들어갈 개발자를 찾고 있습니다. 최신 기술 스택을 활용하여 사용자 경험을 극대화하는 서비스를 만듭니다.',
  vision: '채용의 미래를 혁신하는 AI 기반 플랫폼',
  mission: '최고의 인재와 기업을 연결하는 스마트 채용 솔루션',
  techStacks: [
    { name: 'React', level: 5 },
    { name: 'TypeScript', level: 5 },
    { name: 'Tailwind CSS', level: 4 },
    { name: 'Vite', level: 3 },
  ],
  responsibilities: [
    'React/TypeScript 기반 웹 애플리케이션 개발 및 유지보수',
    'UI/UX 디자인 시스템 구축 및 컴포넌트 라이브러리 관리',
    'RESTful API 연동 및 상태 관리 최적화',
    '코드 리뷰 참여 및 기술 문서 작성',
  ],
  requirements: [
    'React 2년 이상 경험',
    'TypeScript 능숙',
    'Git 기반 협업 경험',
    'HTML/CSS에 대한 깊은 이해',
  ],
  preferred: [
    'Next.js 프로젝트 경험',
    'CI/CD 파이프라인 구축 경험',
    'Figma 등 디자인 툴 활용 능력',
  ],
  benefits: [
    '유연한 근무 시간 및 재택근무',
    '최신 장비 지급',
    '교육비 및 컨퍼런스 참가비 지원',
    '스톡 옵션 부여',
  ],
  recruitmentPeriod: '',
  recruitmentTarget: '',
  recruitmentCount: '',
  recruitmentProcess: [] as string[],
  activitySchedule: '',
  membershipFee: '',
};

// ── Context ──

interface DemoModeContextValue {
  isDemoMode: boolean;
  enableDemoMode: () => void;
  disableDemoMode: () => void;
  demoJDs: typeof DEMO_JD_LIST;
  demoApplicants: typeof DEMO_APPLICANTS;
  demoAiAnalysis: string;
  demoTeamMembers: typeof DEMO_TEAM_MEMBERS;
  // AI 시뮬레이션 플래그
  shouldSimulateAI: boolean;
  setShouldSimulateAI: (v: boolean) => void;
  aiSimulationComplete: boolean;
  setAiSimulationComplete: (v: boolean) => void;
  // 데모에서 생성된 JD 추적
  demoCreatedJDId: string | null;
  setDemoCreatedJDId: (id: string | null) => void;
  // 현재 튜토리얼 단계 ID (드롭다운 닫기 등 타 컴포넌트에서 사용)
  currentStepId: string | null;
  setCurrentStepId: (id: string | null) => void;
  // 튜토리얼 단계 진행 알림용 콜백
  onDemoAction: (action: string) => void;
  setOnDemoAction: (fn: (action: string) => void) => void;
}

const DemoModeContext = createContext<DemoModeContextValue | null>(null);

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [shouldSimulateAI, setShouldSimulateAI] = useState(false);
  const [aiSimulationComplete, setAiSimulationComplete] = useState(false);
  const [demoCreatedJDId, setDemoCreatedJDId] = useState<string | null>(null);
  const [currentStepId, setCurrentStepId] = useState<string | null>(null);
  const [onDemoAction, setOnDemoActionState] = useState<(action: string) => void>(() => () => {});

  const enableDemoMode = useCallback(() => setIsDemoMode(true), []);
  const disableDemoMode = useCallback(() => {
    setIsDemoMode(false);
    setShouldSimulateAI(false);
    setAiSimulationComplete(false);
    setDemoCreatedJDId(null);
    setCurrentStepId(null);
  }, []);

  const setOnDemoAction = useCallback((fn: (action: string) => void) => {
    setOnDemoActionState(() => fn);
  }, []);

  return (
    <DemoModeContext.Provider
      value={{
        isDemoMode,
        enableDemoMode,
        disableDemoMode,
        demoJDs: DEMO_JD_LIST,
        demoApplicants: DEMO_APPLICANTS,
        demoAiAnalysis: DEMO_AI_ANALYSIS,
        demoTeamMembers: DEMO_TEAM_MEMBERS,
        shouldSimulateAI,
        setShouldSimulateAI,
        aiSimulationComplete,
        setAiSimulationComplete,
        demoCreatedJDId,
        setDemoCreatedJDId,
        currentStepId,
        setCurrentStepId,
        onDemoAction,
        setOnDemoAction,
      }}
    >
      {children}
    </DemoModeContext.Provider>
  );
}

export function useDemoMode() {
  const ctx = useContext(DemoModeContext);
  if (!ctx) throw new Error('useDemoMode must be used within DemoModeProvider');
  return ctx;
}
