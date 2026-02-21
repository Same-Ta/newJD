// ── 새 라이브 시뮬레이션 온보딩 시스템 ──
export { DemoModeProvider, useDemoMode, isTutorialDismissed, dismissTutorial, resetTutorial, DEMO_AI_JD_RESPONSE, DEMO_APPLICANTS, DEMO_AI_ANALYSIS } from './DemoModeContext';
export { default as TutorialOverlay } from './TutorialOverlay';
export { default as WelcomeDialog } from './WelcomeDialog';

// ── 레거시 (하위 호환용, 추후 제거 가능) ──
export { OnboardingModal } from './OnboardingModal';
export { InteractiveTutorial } from './InteractiveTutorial';

// 온보딩 상태 관리 유틸리티 (레거시)
const ONBOARDING_STORAGE_KEY = 'winnow_onboarding_dismissed';
const ONBOARDING_COMPLETED_KEY = 'winnow_onboarding_completed';

export const isOnboardingDismissed = (): boolean => {
  try {
    return localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};

export const dismissOnboarding = (): void => {
  try {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
  } catch {}
};

export const markOnboardingCompleted = (): void => {
  try {
    localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
  } catch {}
};

export const isOnboardingCompleted = (): boolean => {
  try {
    return localStorage.getItem(ONBOARDING_COMPLETED_KEY) === 'true';
  } catch {
    return false;
  }
};

export const resetOnboarding = (): void => {
  try {
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    localStorage.removeItem(ONBOARDING_COMPLETED_KEY);
  } catch {}
};
