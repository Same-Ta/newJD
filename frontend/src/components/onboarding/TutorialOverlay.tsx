import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, X, CheckCircle2 } from 'lucide-react';
import {
  TUTORIAL_STEPS,
  PHASE_TITLES,
  PHASE_DESCRIPTIONS,
  dismissTutorial,
  useDemoMode,
  type TutorialPhase,
  type TutorialStepDef,
} from './DemoModeContext';

interface TutorialOverlayProps {
  onComplete: () => void;
  onNavigate: (page: string) => void;
}

export default function TutorialOverlay({ onComplete, onNavigate }: TutorialOverlayProps) {
  const [stepIdx, setStepIdx] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [showPhaseTransition, setShowPhaseTransition] = useState(true); // 처음에 Phase 1 부터 표시
  const [showComplete, setShowComplete] = useState(false); // 완료 화면
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const goNextRef = useRef<() => void>(() => {});
  const {
    setShouldSimulateAI,
    aiSimulationComplete,
    setAiSimulationComplete,
    setOnDemoAction,
    setCurrentStepId,
  } = useDemoMode();

  const steps = TUTORIAL_STEPS;
  const total = steps.length;
  const step = steps[stepIdx] as TutorialStepDef | undefined;
  const currentPhase = step?.phase ?? 1;
  const prevPhaseRef = useRef<TutorialPhase>(1);

  // 스텝 ID 동기화 (다른 컴포넌트에서 드롭다운 닫기 등에 사용)
  useEffect(() => {
    setCurrentStepId(step?.id ?? null);
    // 스텝 전환 시 열린 드롭다운 강제 닫기 (커스텀 이벤트 방식 - React state 직접 연동)
    window.dispatchEvent(new CustomEvent('tutorial:close-menus'));
    // fallback: 50ms 후에도 한 번 더
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('tutorial:close-menus'));
    }, 80);
  }, [stepIdx, step]);

  // ── 페이즈 전환 감지 ──
  useEffect(() => {
    if (step && step.phase !== prevPhaseRef.current) {
      prevPhaseRef.current = step.phase;
      setShowPhaseTransition(true);
    }
  }, [step]);

  // ── 페이즈 전환 자동 닫기 ──
  useEffect(() => {
    if (showPhaseTransition) {
      const t = setTimeout(() => setShowPhaseTransition(false), 2000);
      return () => clearTimeout(t);
    }
  }, [showPhaseTransition]);

  // ── goNextRef 업데이트 ──
  const goNext = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (stepIdx < total - 1) {
      const nextStep = steps[stepIdx + 1];
      if (nextStep.page !== step?.page && nextStep.action) {
        onNavigate(nextStep.action);
      } else if (nextStep.page !== step?.page) {
        onNavigate(nextStep.page);
      }
      setStepIdx(stepIdx + 1);
    } else {
      handleComplete();
    }
  }, [stepIdx, total, steps, step, onNavigate]);

  useEffect(() => {
    goNextRef.current = goNext;
  }, [goNext]);

  // ── 단계 변경 시 대상 요소 스크롤 인뷰 ──
  useEffect(() => {
    if (!step || showPhaseTransition) return;
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    if (el) {
      setTimeout(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      }, 400);
    }
  }, [stepIdx]);

  // ── 초기 네비게이션 ──
  useEffect(() => {
    if (step && step.action && stepIdx === 0) {
      // 첫 단계는 dashboard에서 시작
    }
  }, []);

  // ── onDemoAction 콜백 등록 ──
  useEffect(() => {
    setOnDemoAction((action: string) => {
      if (!step) return;
      // 유형 선택 완료 (사용자가 동아리 카드 클릭)
      if (action === 'demo-type-selected' && step.id === 'p1-type-select') {
        goNextRef.current();
      }
      // 방식 선택 완료 (사용자가 새로운 공고 작성 클릭)
      if (action === 'demo-method-selected' && step.id === 'p1-method-select') {
        goNextRef.current();
      }
      // 기본 정보 제출 완료 (데모 자동 진행)
      if (action === 'demo-basic-info-submitted' && step.id === 'p1-basic-info') {
        goNextRef.current();
      }
      // AI 시뮬레이션 완료 알림
      if (action === 'ai-simulation-complete' && step.id === 'p1-ai-typing') {
        goNextRef.current();
      }
      // 섹션 클릭 → 채팅 영역으로 하이라이트 이동
      if (action === 'demo-section-clicked' && step.id === 'p1-section-click') {
        goNextRef.current();
      }
      // 섹션 집중 수정 AI 응답 완료 → 게시 단계로
      if (action === 'demo-section-edit-complete' && step.id === 'p1-section-chat') {
        goNextRef.current();
      }
      // 공고 게시 완료 알림
      if (action === 'jd-published' && step.id === 'p1-publish-jd') {
        goNextRef.current();
      }
      // 내 공고 목록에서 카드 클릭
      if (action === 'jd-card-clicked' && step.id === 'p2-jd-card') {
        goNextRef.current();
      }
      // 드래그 데모 완료 (섹션 순서 변경 시연)
      if (action === 'drag-demo-complete' && step.id === 'p2-drag-demo') {
        goNextRef.current();
      }
      // 공고 저장 완료 (데모 모드)
      if (action === 'jd-save-complete' && step.id === 'p2-edit-save') {
        goNextRef.current();
      }
      // 공유 링크 복사 완료
      if (action === 'link-copied' && step.id === 'p2-share-link') {
        goNextRef.current();
      }
      // 지원자 AI 분석 모달 표시
      if (action === 'ai-analysis-opened' && step.id === 'p4-ai-analysis-btn') {
        goNextRef.current();
      }
      // AI 분석 모달 준비 완료 (결과 표시됨)
      if (action === 'ai-modal-ready' && step.id === 'p4-analysis-result') {
        // autoAdvanceMs로 자동 진행하므로 여기서는 아무것도 안 함
      }
      // 팀 초대 완료
      if (action === 'team-invited' && step.id === 'p3-invite-complete') {
        goNextRef.current();
      }
    });
  }, [step, setOnDemoAction]);

  // ── DOM 요소 위치 추적 ──
  useEffect(() => {
    if (!step || showPhaseTransition) {
      setRect(null);
      return;
    }

    const findEl = () => {
      // CSS-hidden (예: hidden lg:block 동료 엘리먼트) 를 건너맰고 실제 보이는 요소만 선택
      const els = document.querySelectorAll(`[data-tour="${step.target}"]`);
      const visibleEl = Array.from(els).find((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      });
      if (visibleEl) {
        setRect(visibleEl.getBoundingClientRect());
      } else {
        setRect(null);
      }
    };

    // 첫 시도
    findEl();

    // 페이지 전환 후 DOM이 준비되기까지 약간의 지연
    const retryIntervals = [100, 300, 600, 1000, 2000];
    const retryTimers = retryIntervals.map((ms) =>
      setTimeout(findEl, ms)
    );

    // 리사이즈/스크롤 추적
    const handleResize = () => findEl();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);

    return () => {
      retryTimers.forEach(clearTimeout);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [step, stepIdx, showPhaseTransition]);

  // ── AI 타이핑 단계 처리 ──
  useEffect(() => {
    if (step?.id === 'p1-ai-typing') {
      setShouldSimulateAI(true);
    }
  }, [step, setShouldSimulateAI]);

  // AI 시뮬레이션 완료 감지
  useEffect(() => {
    if (aiSimulationComplete && step?.id === 'p1-ai-typing') {
      setAiSimulationComplete(false);
      goNextRef.current();
    }
  }, [aiSimulationComplete, step, setAiSimulationComplete]);

  // ── 자동 진행 타이머 ──
  useEffect(() => {
    if (!step || showPhaseTransition) return;
    if (step.autoAdvanceMs && !step.waitForClick) {
      timerRef.current = setTimeout(() => goNextRef.current(), step.autoAdvanceMs);
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }
  }, [step, stepIdx, showPhaseTransition]);

  // ── 이벤트 핸들러 ──
  const handleHighlightClick = () => {
    if (!step) return;
    if (step.waitForClick) {
      // 하이라이트 영역 클릭 시 원래 요소도 클릭
      const el = document.querySelector(`[data-tour="${step.target}"]`) as HTMLElement;
      if (el) el.click();
      
      // action이 있으면 페이지 이동
      if (step.action) {
        setTimeout(() => onNavigate(step.action!), 50);
      }
      
      // onDemoAction 콜백으로 goNext가 호출되는 스텝은 여기서 goNext 중복 호출 방지
      const demoActionSteps = ['p1-type-select', 'p1-method-select', 'p1-section-click', 'p4-ai-analysis-btn', 'p3-invite-complete', 'p2-edit-save'];
      if (!demoActionSteps.includes(step.id)) {
        setTimeout(() => goNextRef.current(), 200);
      }
    }
  };

  const handleComplete = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setShowComplete(true);
  };

  const handleStartUsing = () => {
    setShowComplete(false);
    onComplete();
  };

  const handlePrev = () => {
    if (stepIdx > 0) {
      const prevStep = steps[stepIdx - 1];
      onNavigate(prevStep.page);
      setStepIdx(stepIdx - 1);
    }
  };

  // ── 툴팁 위치 계산 ──
  const getTooltipStyle = (): React.CSSProperties => {
    // rect가 없으면 아래쁜터 고정 표시 (fallback)
    if (!rect || !step) {
      return {
        bottom: '80px',
        left: '50%',
        transform: 'translateX(-50%)',
      };
    }

    const margin = 16;
    const tooltipWidth = 320;
    const pos = step.position || 'bottom';

    // transform 없이 절대좌표로 직접 계산 (짤림 방지)
    const absLeft = (centerX: number) =>
      Math.min(Math.max(margin, centerX - tooltipWidth / 2), window.innerWidth - tooltipWidth - margin);

    switch (pos) {
      case 'top': {
        const top = rect.top - margin - 10; // 고정 높이 추정 (10px 여백)
        // 위 공간이 잘리면 아래로 표시
        if (top < 120) {
          return { top: `${rect.bottom + margin}px`, left: `${absLeft(rect.left + rect.width / 2)}px` };
        }
        return { bottom: `${window.innerHeight - rect.top + margin}px`, left: `${absLeft(rect.left + rect.width / 2)}px` };
      }
      case 'bottom': {
        const topVal = rect.bottom + margin;
        if (topVal + 240 > window.innerHeight) {
          return { bottom: `${window.innerHeight - rect.top + margin}px`, left: `${absLeft(rect.left + rect.width / 2)}px` };
        }
        return { top: `${topVal}px`, left: `${absLeft(rect.left + rect.width / 2)}px` };
      }
      case 'left': {
        const leftVal = rect.left - tooltipWidth - margin;
        if (leftVal < margin) {
          // 왼쪽 공간 부족 시 오른쪽으로
          return { top: `${rect.top + rect.height / 2}px`, left: `${Math.min(rect.right + margin, window.innerWidth - tooltipWidth - margin)}px`, transform: 'translateY(-50%)' };
        }
        return { top: `${rect.top + rect.height / 2}px`, left: `${leftVal}px`, transform: 'translateY(-50%)' };
      }
      case 'right': {
        const rightLeft = rect.right + margin;
        const rawTop = rect.top + rect.height / 2;
        const clampedTop = Math.min(rawTop, window.innerHeight - 300);
        if (rightLeft + tooltipWidth > window.innerWidth - margin) {
          return { top: `${clampedTop}px`, left: `${Math.max(margin, rect.left - tooltipWidth - margin)}px`, transform: 'translateY(-50%)' };
        }
        return { top: `${clampedTop}px`, left: `${rightLeft}px`, transform: 'translateY(-50%)' };
      }
      default:
        return { top: `${rect.bottom + margin}px`, left: `${absLeft(rect.left)}px` };
    }
  };

  // ── 페이즈 진행률 ──
  const phaseSteps = steps.filter(s => s.phase === currentPhase);
  const phaseStepIdx = phaseSteps.findIndex(s => s.id === step?.id);
  const globalProgress = ((stepIdx + 1) / total) * 100;

  if (!step && !showComplete) return null;

  // ── 완료 화면 ──
  if (showComplete) {
    // step은 이 블록에서 사용하지 않으므로 undefined여도 무방
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 200 }}
          className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-sm w-full mx-4"
        >
          {/* 완료 아이콘 */}
          <div className="flex justify-center mb-5">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <CheckCircle2 className="w-9 h-9 text-white" />
            </div>
          </div>

          {/* 타이틀 */}
          <h2 className="text-xl font-extrabold text-gray-900 mb-1.5">모든 체험 완료!</h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-6">
            WINNOW의 4가지 핵심 기능을 모두 체험하셨습니다.<br />
            이제 실제 서비스를 사용하여 채용을 시작해보세요.
          </p>

          {/* 4가지 완료 항목 */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            {([
              { phase: 1, title: 'AI 공고 생성', bg: 'bg-violet-50', text: 'text-violet-700', sub: 'text-violet-400' },
              { phase: 2, title: '공고 관리 & 공유', bg: 'bg-indigo-50', text: 'text-indigo-700', sub: 'text-indigo-400' },
              { phase: 3, title: '팀 관리', bg: 'bg-blue-50', text: 'text-blue-700', sub: 'text-blue-400' },
              { phase: 4, title: '지원자 AI 분석', bg: 'bg-cyan-50', text: 'text-cyan-700', sub: 'text-cyan-400' },
            ] as const).map(item => (
              <div key={item.phase} className={`flex items-center gap-2 ${item.bg} rounded-xl px-3 py-2.5`}>
                <div className="text-left min-w-0 flex-1">
                  <p className={`text-[10px] ${item.sub} font-medium`}>STEP {item.phase}</p>
                  <p className={`text-[11px] font-bold ${item.text} truncate`}>{item.title}</p>
                </div>
                <div className="ml-auto shrink-0">
                  <CheckCircle2 className={`w-4 h-4 ${item.text}`} />
                </div>
              </div>
            ))}
          </div>

          {/* 사용하러 가기 버튼 */}
          <button
            onClick={handleStartUsing}
            className="w-full py-3.5 bg-indigo-600 text-white font-bold text-sm rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/35 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
          >
            <ChevronRight className="w-4 h-4" />
            서비스 사용하러 가기
          </button>
          <button
            onClick={() => { dismissTutorial(); handleStartUsing(); }}
            className="mt-3 text-[12px] text-gray-400 hover:text-gray-600 transition-colors"
          >
            다시 보지 않기
          </button>
        </motion.div>
      </div>
    );
  }

  // showComplete가 false인 경우 step은 반드시 정의됨 (위 가드 통과) — TypeScript narrowing
  if (!step) return null;

  return (
    <>
      {/* 반투명 배경: 하이라이트가 표시될 때는 하이라이트의 box-shadow가 어둥운 오버레이를 담당. 하이라이트가 없을 때만 이 배경을 표시 */}
      {(!rect || showPhaseTransition) && (
        <div
          className="fixed inset-0 z-[9990]"
          style={{
            backgroundColor: 'rgba(0,0,0,0.55)',
            pointerEvents: 'auto',
          }}
        />
      )}

      {/* 하이라이트 영역 */}
      {rect && !showPhaseTransition && (
        <div
          onClick={handleHighlightClick}
          className="fixed z-[9991] rounded-xl transition-all duration-300"
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
            backgroundColor: 'transparent',
            cursor: step.waitForClick ? 'pointer' : 'default',
            // input 또는 click(비waitForClick) 단계는 클릭 통과, waitForClick은 오버레이가 인터셈트
            pointerEvents: (step.interaction === 'input' || (!step.waitForClick && step.interaction === 'click')) ? 'none' : (step.waitForClick ? 'auto' : 'none'),
            animation: (step.waitForClick || (!step.waitForClick && step.interaction === 'click')) ? 'tutorial-pulse 2s infinite' : undefined,
          }}
        />
      )}

      {/* 페이즈 전환 화면 */}
      <AnimatePresence mode="wait">
        {showPhaseTransition && (
          <motion.div
            key={`phase-${currentPhase}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[9995] flex items-center justify-center"
            style={{ pointerEvents: 'none' }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.1, opacity: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 200 }}
              className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-10 text-center max-w-md"
            >
              {/* 페이즈 인디케이터 */}
              <div className="flex items-center justify-center gap-2 mb-6">
                {([1, 2, 3, 4] as TutorialPhase[]).map((p) => (
                  <div
                    key={p}
                    className={`w-10 h-1.5 rounded-full transition-colors ${
                      p < currentPhase ? 'bg-indigo-500' : p === currentPhase ? 'bg-indigo-500' : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>

              <div className="text-indigo-500 text-sm font-bold mb-2">
                STEP {currentPhase} / 4
              </div>
              <h2 className="text-2xl font-extrabold text-gray-900 mb-3">
                {PHASE_TITLES[currentPhase]}
              </h2>
              <p className="text-gray-500 text-sm leading-relaxed">
                {PHASE_DESCRIPTIONS[currentPhase]}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 툴팁: rect가 없어도 (element 아직 로딩 중) fallback 위치로 표시 */}
      <AnimatePresence mode="wait">
        {!showPhaseTransition && (
          <motion.div
            key={`tooltip-${step.id}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="fixed z-[9996] w-[320px] max-w-[90vw]"
            style={{ ...getTooltipStyle(), pointerEvents: 'auto' }}
          >
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
              {/* 페이지 진행 바 */}
              <div className="h-1 bg-gray-100">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                  style={{ width: `${globalProgress}%` }}
                />
              </div>

              {/* 헤더: 페이즈 + 스텝 */}
              <div className="px-5 pt-4 pb-2 flex items-center gap-2">
                <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">
                  {PHASE_TITLES[currentPhase]}
                </span>
                <span className="text-[10px] text-gray-400">
                  {phaseStepIdx + 1} / {phaseSteps.length}
                </span>
              </div>

              {/* 내용 */}
              <div className="px-5 pb-3">
                <h3 className="text-[15px] font-bold text-gray-900 mb-1.5">{step.title}</h3>
                <p className="text-[13px] text-gray-500 leading-relaxed whitespace-pre-line">
                  {step.description}
                </p>
              </div>

              {/* 인터랙션 힌트 */}
              {step.interaction === 'wait' && (
                <div className="px-5 pb-3">
                  <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="animate-spin w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full" />
                    <span className="text-[11px] text-blue-700 font-medium">AI가 작업 중입니다...</span>
                  </div>
                </div>
              )}
              {step.waitForClick && (
                <div className="px-5 pb-3">
                  <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <span className="text-[11px] text-blue-700 font-medium">하이라이트된 영역을 클릭하세요</span>
                  </div>
                </div>
              )}
              {!step.waitForClick && step.interaction === 'click' && (
                <div className="px-5 pb-3">
                  <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <span className="text-[11px] text-blue-700 font-medium">하이라이트된 버튼을 클릭하세요</span>
                  </div>
                </div>
              )}

              {/* 네비게이션 */}
              <div className="px-5 pb-4 flex items-center justify-between">
                {stepIdx > 0 ? (
                  <button
                    onClick={handlePrev}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors rounded-lg hover:bg-gray-100"
                  >
                    <ChevronLeft className="w-3 h-3" />이전
                  </button>
                ) : (
                  <div />
                )}
                {!step.waitForClick && step.interaction !== 'wait' && (
                  <button
                    onClick={() => goNextRef.current()}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors font-medium"
                  >
                    {stepIdx < total - 1 ? '다음' : '완료'}
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 스크롤 안내 인디케이터 - AI 분석 결과 확인 단계에서 항상 표시 */}
      {!showPhaseTransition && ['p4-analysis-result', 'p4-comments'].includes(step.id) && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[9998] flex flex-col items-center gap-1.5 pointer-events-none">
          <span className="text-white/90 text-[11px] font-medium bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">아래로 스크롤하세요</span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 1.1, ease: 'easeInOut' }}
            className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </motion.div>
        </div>
      )}

      {/* 하단 — 다시 보지 않기 / 건너뛰기 */}
      {!showPhaseTransition && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 z-[9997]"
          style={{ pointerEvents: 'auto' }}
        >
          <button
            onClick={() => { dismissTutorial(); handleComplete(); }}
            className="px-4 py-2 text-xs text-white/80 hover:text-white bg-black/30 hover:bg-black/50 backdrop-blur-sm rounded-full transition-all"
          >
            다시 보지 않기
          </button>
          <button
            onClick={handleComplete}
            className="px-4 py-2 text-xs text-white/80 hover:text-white bg-black/30 hover:bg-black/50 backdrop-blur-sm rounded-full transition-all flex items-center gap-1"
          >
            건너뛰기 <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* 상단 진행 표시 */}
      {!showPhaseTransition && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[9997] flex items-center gap-3 px-5 py-2.5 bg-white/90 backdrop-blur-sm rounded-full shadow-lg border border-gray-100"
          style={{ pointerEvents: 'none' }}
        >
          {([1, 2, 3, 4] as TutorialPhase[]).map((p) => (
            <div key={p} className="flex items-center gap-1.5">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                  p < currentPhase
                    ? 'bg-indigo-500 text-white'
                    : p === currentPhase
                    ? 'bg-indigo-100 text-indigo-600 ring-2 ring-indigo-500'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {p < currentPhase ? '✓' : p}
              </div>
              {p < 4 && (
                <div className={`w-6 h-0.5 rounded-full ${p < currentPhase ? 'bg-indigo-500' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* CSS 애니메이션 */}
      <style>{`
        @keyframes tutorial-pulse {
          0%, 100% {
            box-shadow: 0 0 0 9999px rgba(0,0,0,0.55),
                        0 0 0 3px #6366f1,
                        0 0 0 6px rgba(99,102,241,0.35),
                        0 0 28px 4px rgba(99,102,241,0.9);
          }
          50% {
            box-shadow: 0 0 0 9999px rgba(0,0,0,0.55),
                        0 0 0 3px #818cf8,
                        0 0 0 10px rgba(129,140,248,0.25),
                        0 0 44px 8px rgba(129,140,248,1);
          }
        }
      `}</style>
    </>
  );
}
