import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Sparkles, CheckCircle2 } from 'lucide-react';
import { TUTORIAL_STEPS } from './mockData';

interface InteractiveTutorialProps {
  onComplete: () => void;
  onNavigate: (page: string) => void;
}

interface HighlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export const InteractiveTutorial = ({ onComplete, onNavigate }: InteractiveTutorialProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightRect, setHighlightRect] = useState<HighlightRect | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [isTransitioning, setIsTransitioning] = useState(false);
  const animFrameRef = useRef<number | null>(null);

  const steps = TUTORIAL_STEPS;
  const step = steps[currentStep];

  // 타겟 요소 위치 계산
  const updateHighlight = useCallback(() => {
    if (!step) return;
    
    const target = document.querySelector(step.targetSelector);
    if (target) {
      const rect = target.getBoundingClientRect();
      const padding = 6;
      const newRect = {
        top: rect.top - padding,
        left: rect.left - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
      };

      setHighlightRect(newRect);

      // 툴팁 위치 계산
      const tooltipWidth = 320;
      const tooltipHeight = 180;
      let tTop = 0;
      let tLeft = 0;

      switch (step.position) {
        case 'right':
          tTop = rect.top + rect.height / 2 - tooltipHeight / 2;
          tLeft = rect.right + 16;
          break;
        case 'bottom':
          tTop = rect.bottom + 16;
          tLeft = rect.left + rect.width / 2 - tooltipWidth / 2;
          break;
        case 'left':
          tTop = rect.top + rect.height / 2 - tooltipHeight / 2;
          tLeft = rect.left - tooltipWidth - 16;
          break;
        case 'top':
          tTop = rect.top - tooltipHeight - 16;
          tLeft = rect.left + rect.width / 2 - tooltipWidth / 2;
          break;
      }

      // 화면 밖으로 나가지 않도록 보정
      tTop = Math.max(16, Math.min(window.innerHeight - tooltipHeight - 16, tTop));
      tLeft = Math.max(16, Math.min(window.innerWidth - tooltipWidth - 16, tLeft));

      setTooltipPosition({ top: tTop, left: tLeft });
    } else {
      setHighlightRect(null);
    }
  }, [step]);

  useEffect(() => {
    // 요소 찾기 재시도 (페이지 전환 후 요소가 렌더링 될 때까지)
    let retryCount = 0;
    const maxRetries = 20;

    const tryFindTarget = () => {
      updateHighlight();
      retryCount++;
      if (!highlightRect && retryCount < maxRetries) {
        animFrameRef.current = requestAnimationFrame(tryFindTarget);
      }
    };

    // 약간 딜레이 후 시작 (페이지 이동 후 렌더링 대기)
    const timer = setTimeout(() => {
      tryFindTarget();
      setIsTransitioning(false);
    }, 300);

    return () => {
      clearTimeout(timer);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [currentStep, updateHighlight]);

  // 윈도우 리사이즈 대응
  useEffect(() => {
    const handleResize = () => updateHighlight();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [updateHighlight]);

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setIsTransitioning(true);
      const nextStep = steps[currentStep + 1];
      // 다음 스텝의 페이지로 이동이 필요하면 이동
      if (nextStep.action) {
        onNavigate(nextStep.targetPage);
      }
      setCurrentStep((prev) => prev + 1);
    } else {
      onComplete();
    }
  }, [currentStep, steps, onNavigate, onComplete]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setIsTransitioning(true);
      const prevStep = steps[currentStep - 1];
      if (prevStep.action) {
        onNavigate(prevStep.targetPage);
      }
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep, steps, onNavigate]);

  const handleSkip = useCallback(() => {
    onComplete();
  }, [onComplete]);

  // 하이라이트 영역 클릭 시 해당 페이지로 이동
  const handleHighlightClick = useCallback(() => {
    if (step?.action) {
      onNavigate(step.action);
      // 자동으로 다음 스텝으로 이동
      setTimeout(() => {
        if (currentStep < steps.length - 1) {
          setCurrentStep((prev) => prev + 1);
        } else {
          onComplete();
        }
      }, 800);
    }
  }, [step, onNavigate, currentStep, steps.length, onComplete]);

  return (
    <div className="fixed inset-0 z-[9998] pointer-events-none">
      {/* 오버레이 (하이라이트 영역 제외) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-auto" style={{ zIndex: 9998 }}>
        <defs>
          <mask id="tutorial-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {highlightRect && (
              <motion.rect
                initial={{ opacity: 0 }}
                animate={{
                  x: highlightRect.left,
                  y: highlightRect.top,
                  width: highlightRect.width,
                  height: highlightRect.height,
                  opacity: 1,
                }}
                transition={{ duration: 0.3 }}
                rx="12"
                ry="12"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.55)"
          mask="url(#tutorial-mask)"
        />
      </svg>

      {/* 하이라이트 테두리 (펄스 효과) */}
      {highlightRect && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute pointer-events-auto cursor-pointer"
          style={{
            top: highlightRect.top,
            left: highlightRect.left,
            width: highlightRect.width,
            height: highlightRect.height,
            zIndex: 9999,
          }}
          onClick={handleHighlightClick}
        >
          <motion.div
            animate={{
              boxShadow: [
                '0 0 0 0 rgba(59,130,246,0.4)',
                '0 0 0 8px rgba(59,130,246,0)',
              ],
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-full h-full rounded-xl border-2 border-blue-500"
          />
        </motion.div>
      )}

      {/* 툴팁 카드 */}
      <AnimatePresence mode="wait">
        {!isTransitioning && highlightRect && (
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="absolute pointer-events-auto"
            style={{
              top: tooltipPosition.top,
              left: tooltipPosition.left,
              zIndex: 10000,
              width: 320,
            }}
          >
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
              {/* 카드 헤더 */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-blue-200" />
                  <span className="text-white font-bold text-[13px]">가이드 투어</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-blue-200 text-[11px] font-semibold">
                    {currentStep + 1} / {steps.length}
                  </span>
                  <button
                    onClick={handleSkip}
                    className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                    title="건너뛰기"
                  >
                    <X size={14} className="text-white/70" />
                  </button>
                </div>
              </div>

              {/* 카드 내용 */}
              <div className="p-5">
                <h3 className="font-extrabold text-base text-gray-900 mb-1.5">
                  {step.title}
                </h3>
                <p className="text-[13px] text-gray-500 leading-relaxed mb-4">
                  {step.description}
                </p>

                {/* 클릭 안내 */}
                <div className="bg-blue-50 rounded-xl px-3 py-2 mb-4 flex items-center gap-2">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                      <ChevronRight size={12} className="text-white" />
                    </div>
                  </motion.div>
                  <span className="text-[11px] text-blue-700 font-medium">
                    하이라이트된 영역을 클릭하여 직접 체험해보세요
                  </span>
                </div>

                {/* 진행 인디케이터 */}
                <div className="flex gap-1.5 mb-4">
                  {steps.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 rounded-full flex-1 transition-all duration-300 ${
                        i <= currentStep ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>

                {/* 버튼 그룹 */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={handleSkip}
                    className="text-[12px] text-gray-400 hover:text-gray-600 transition-colors font-medium"
                  >
                    건너뛰기
                  </button>
                  <div className="flex items-center gap-2">
                    {currentStep > 0 && (
                      <button
                        onClick={handlePrev}
                        className="flex items-center gap-1 px-3 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors text-[12px] font-semibold"
                      >
                        <ChevronLeft size={14} />
                        이전
                      </button>
                    )}
                    <button
                      onClick={handleNext}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-bold transition-colors ${
                        currentStep === steps.length - 1
                          ? 'bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/20'
                          : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20'
                      }`}
                    >
                      {currentStep === steps.length - 1 ? (
                        <>
                          <CheckCircle2 size={14} />
                          완료
                        </>
                      ) : (
                        <>
                          다음
                          <ChevronRight size={14} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 화살표 포인터 */}
            {step.position === 'right' && highlightRect && (
              <div
                className="absolute w-3 h-3 bg-white border-l border-b border-gray-100 rotate-45"
                style={{
                  top: '50%',
                  left: -6,
                  marginTop: -6,
                }}
              />
            )}
            {step.position === 'left' && highlightRect && (
              <div
                className="absolute w-3 h-3 bg-white border-r border-t border-gray-100 rotate-45"
                style={{
                  top: '50%',
                  right: -6,
                  marginTop: -6,
                }}
              />
            )}
            {step.position === 'bottom' && highlightRect && (
              <div
                className="absolute w-3 h-3 bg-white border-l border-t border-gray-100 rotate-45"
                style={{
                  top: -6,
                  left: '50%',
                  marginLeft: -6,
                }}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 우측 상단 건너뛰기 버튼 (항상 표시) */}
      <div className="fixed top-4 right-4 pointer-events-auto" style={{ zIndex: 10001 }}>
        <button
          onClick={handleSkip}
          className="px-4 py-2 bg-white/90 backdrop-blur-sm hover:bg-white rounded-xl text-[12px] font-bold text-gray-600 shadow-lg border border-gray-100 transition-colors flex items-center gap-1.5"
        >
          <X size={14} />
          투어 종료
        </button>
      </div>
    </div>
  );
};
