import { useEffect, useRef, useCallback } from 'react';

interface SessionTimeoutOptions {
  /** 비활동 후 경고를 표시할 시간 (ms). 기본값: 30분 */
  idleTimeout?: number;
  /** 경고 후 자동 로그아웃까지의 시간 (ms). 기본값: 2분 */
  warningDuration?: number;
  /** 로그인 상태일 때만 타이머 동작 */
  isLoggedIn: boolean;
  /** 경고창을 띄울 때 호출되는 콜백 */
  onWarning: () => void;
  /** 자동 로그아웃 시 호출되는 콜백 */
  onTimeout: () => void;
}

const ACTIVITY_EVENTS: string[] = [
  'mousemove',
  'mousedown',
  'keydown',
  'touchstart',
  'scroll',
  'click',
];

export function useSessionTimeout({
  idleTimeout = 30 * 60 * 1000,    // 30분
  warningDuration = 2 * 60 * 1000, // 2분
  isLoggedIn,
  onWarning,
  onTimeout,
}: SessionTimeoutOptions) {
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isWarnedRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
  }, []);

  const startLogoutTimer = useCallback(() => {
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    logoutTimerRef.current = setTimeout(() => {
      onTimeout();
    }, warningDuration);
  }, [warningDuration, onTimeout]);

  const resetTimer = useCallback(() => {
    // 경고창이 떠 있는 동안은 활동 감지로 타이머를 초기화하지 않음
    if (isWarnedRef.current) return;

    clearTimers();
    idleTimerRef.current = setTimeout(() => {
      isWarnedRef.current = true;
      onWarning();
      startLogoutTimer();
    }, idleTimeout);
  }, [idleTimeout, onWarning, startLogoutTimer, clearTimers]);

  /** 경고창에서 "계속 사용" 클릭 시 외부에서 호출 */
  const extendSession = useCallback(() => {
    isWarnedRef.current = false;
    clearTimers();
    resetTimer();
  }, [clearTimers, resetTimer]);

  useEffect(() => {
    if (!isLoggedIn) {
      clearTimers();
      isWarnedRef.current = false;
      return;
    }

    resetTimer();

    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, resetTimer, { passive: true });
    });

    return () => {
      clearTimers();
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [isLoggedIn, resetTimer, clearTimers]);

  return { extendSession };
}
