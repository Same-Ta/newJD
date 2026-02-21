import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Play, X } from 'lucide-react';

interface WelcomeDialogProps {
  isOpen: boolean;
  onStart: () => void;   // "체험하기" 클릭
  onSkip: () => void;    // "건너뛰기" 클릭
  onDismiss: () => void; // "다시 보지 않기" 클릭
}

export default function WelcomeDialog({ isOpen, onStart, onSkip, onDismiss }: WelcomeDialogProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9998] flex items-center justify-center">
        {/* 배경 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onSkip}
        />

        {/* 다이얼로그 카드 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-[420px] max-w-[90vw] bg-white rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* 상단 그라디언트 */}
          <div className="relative h-40 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center overflow-hidden">
            {/* 데코레이션 요소 */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-4 left-8 w-16 h-16 bg-white rounded-full blur-xl" />
              <div className="absolute bottom-6 right-12 w-24 h-24 bg-white rounded-full blur-2xl" />
              <div className="absolute top-12 right-6 w-8 h-8 bg-white rounded-full blur-lg" />
            </div>
            
            <div className="relative text-center">
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl mb-3"
              >
                <Sparkles className="w-8 h-8 text-white" />
              </motion.div>
              <h2 className="text-xl font-bold text-white">WINNOW에 오신 것을 환영합니다!</h2>
            </div>

            {/* 닫기 */}
            <button
              onClick={onSkip}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 본문 */}
          <div className="px-8 py-6">
            <p className="text-gray-600 text-sm leading-relaxed text-center">
              WINNOW의 핵심 기능을 <strong className="text-indigo-600">실제 화면</strong>을 통해 직접 체험해보세요.
              <br />
              약 <strong className="text-indigo-600">1분</strong>이면 모든 기능을 파악할 수 있습니다.
            </p>

            {/* 기능 목록 */}
            <div className="mt-5 space-y-2.5">
              {[
                { num: '01', text: 'AI 공고 자동 생성', color: 'bg-indigo-50 text-indigo-600' },
                { num: '02', text: '공고 관리 & 링크 공유', color: 'bg-purple-50 text-purple-600' },
                { num: '03', text: '지원자 AI 분석', color: 'bg-pink-50 text-pink-600' },
                { num: '04', text: '팀 관리 & 협업 초대', color: 'bg-amber-50 text-amber-600' },
              ].map(item => (
                <div key={item.num} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                  <span className={`flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold ${item.color}`}>
                    {item.num}
                  </span>
                  <span className="text-sm font-medium text-gray-700">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="px-8 pb-6 space-y-3">
            <button
              onClick={onStart}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-semibold text-sm hover:from-indigo-600 hover:to-purple-600 transition-all shadow-lg shadow-indigo-200"
            >
              <Play className="w-4 h-4" />
              서비스 체험하기
            </button>

            <div className="flex items-center justify-center gap-4">
              <button
                onClick={onSkip}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                나중에 할게요
              </button>
              <span className="text-gray-200">|</span>
              <button
                onClick={onDismiss}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                다시 보지 않기
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
