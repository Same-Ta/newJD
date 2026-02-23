import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Sparkles,
  Share2,
  Brain,
  ChevronRight,
  ChevronLeft,
  Play,
  CheckCircle2,
  FileText,
  Users,
  Link2,
  Copy,
  BarChart3,
  Zap,
  ArrowRight,
  MessageSquare,
  Eye,
} from 'lucide-react';
import {
  ONBOARDING_STEPS,
  MOCK_JD,
  MOCK_APPLICANTS,
  MOCK_AI_ANALYSIS,
} from './mockData';

interface OnboardingModalProps {
  onClose: () => void;
  onStartTutorial: () => void;
  onDontShowAgain: () => void;
}

// ─── Step 1: AI 공고 생성 애니메이션 ───
const Step1Animation = () => {
  const [phase, setPhase] = useState(0); // 0: 유형 선택, 1: 기본 정보, 2: AI 생성 중, 3: 완성
  const [showSections, setShowSections] = useState<number[]>([]);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 1800);
    const t2 = setTimeout(() => setPhase(2), 3600);
    const t3 = setTimeout(() => setPhase(3), 5400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  useEffect(() => {
    if (phase === 3) {
      [0, 1, 2, 3].forEach((i) => {
        setTimeout(() => {
          setShowSections((prev) => [...prev, i]);
        }, 400 * (i + 1));
      });
    }
  }, [phase]);

  const sectionLabels = ['동아리 소개', '필수 체크리스트', '우대 체크리스트', '활동 혜택'];
  const sectionIcons = [FileText, CheckCircle2, Sparkles, Zap];
  const sectionData = [
    MOCK_JD.description,
    MOCK_JD.requirements.slice(0, 2).join(' · '),
    MOCK_JD.preferred.slice(0, 2).join(' · '),
    MOCK_JD.benefits.slice(0, 2).join(' · '),
  ];

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div className="w-full max-w-lg">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden"
        >
          {/* 헤더 */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <MessageSquare size={16} className="text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">WINNOW AI</p>
              <p className="text-blue-100 text-[11px]">공고 생성 매니저</p>
            </div>
            <div className="ml-auto flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-200 text-[10px]">활성</span>
            </div>
          </div>

          {/* 내용 영역 */}
          <div className="p-5 space-y-4 min-h-[260px]">
            {/* Step 0: 유형 선택 */}
            <AnimatePresence>
              {phase === 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                  <p className="text-[13px] text-gray-600 font-medium text-center mb-2">어떤 유형의 공고를 만드시나요?</p>
                  <div className="grid grid-cols-2 gap-3">
                    <motion.div
                      animate={{ scale: [1, 1.03, 1], borderColor: ['#e5e7eb', '#3b82f6', '#3b82f6'] }}
                      transition={{ delay: 0.8, duration: 0.6 }}
                      className="p-3 rounded-xl border-2 border-gray-200 text-center cursor-pointer"
                    >
                      <p className="font-bold text-[13px] text-gray-900">동아리 모집공고</p>
                      <p className="text-[10px] text-gray-400 mt-1">신입 부원 모집</p>
                    </motion.div>
                    <div className="p-3 rounded-xl border-2 border-gray-200 text-center">
                      <p className="font-bold text-[13px] text-gray-900">기업 채용공고</p>
                      <p className="text-[10px] text-gray-400 mt-1">인재 채용</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Step 1: 기본 정보 입력 */}
            <AnimatePresence>
              {phase === 1 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <motion.div
                        initial={{ width: '50%' }}
                        animate={{ width: '100%' }}
                        transition={{ delay: 1, duration: 0.5 }}
                        className="h-full bg-blue-500 rounded-full"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-gray-500 w-16 flex-shrink-0">이름</span>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: '100%' }}
                        transition={{ delay: 0.3, duration: 0.8 }}
                        className="h-8 bg-blue-50 border border-blue-200 rounded-lg flex items-center px-3 overflow-hidden"
                      >
                        <span className="text-[12px] text-blue-700 whitespace-nowrap">코딩하는 사람들</span>
                      </motion.div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-gray-500 w-16 flex-shrink-0">분야</span>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8 }}
                        className="px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-lg text-[11px] text-blue-700 font-medium"
                      >
                        프로그래밍/IT
                      </motion.div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-gray-500 w-16 flex-shrink-0">분류</span>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.2 }}
                        className="px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-lg text-[11px] text-blue-700 font-medium"
                      >
                        중앙동아리
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Step 2: AI 생성 중 */}
            <AnimatePresence>
              {phase === 2 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-6 gap-3">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full"
                  />
                  <p className="text-[13px] text-blue-600 font-semibold">AI가 공고 초안을 작성하고 있어요...</p>
                  <p className="text-[11px] text-gray-400">기본 정보를 바탕으로 최적화된 공고를 생성합니다</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Step 3: 결과 */}
            <AnimatePresence>
              {phase === 3 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2.5">
                  <p className="text-[13px] text-gray-800 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-green-500" />
                    공고 초안이 완성되었습니다!
                  </p>
                  <div className="bg-white rounded-xl border border-gray-100 p-3 space-y-2">
                    <p className="font-bold text-[13px] text-gray-900">{MOCK_JD.title}</p>
                    <p className="text-[11px] text-gray-400">{MOCK_JD.company} · {MOCK_JD.location}</p>
                    {sectionLabels.map((label, i) => {
                      const Icon = sectionIcons[i];
                      return showSections.includes(i) ? (
                        <motion.div
                          key={label}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-start gap-2 bg-gray-50 rounded-lg p-2"
                        >
                          <Icon size={12} className="text-blue-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-[11px] font-semibold text-gray-700">{label}</p>
                            <p className="text-[10px] text-gray-500 line-clamp-1">{sectionData[i]}</p>
                          </div>
                        </motion.div>
                      ) : null;
                    })}
                  </div>
                  <p className="text-[10px] text-gray-400 text-center">채팅 또는 편집 모드로 세부 수정 가능</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// ─── Step 2: 공고 관리 & 공유 애니메이션 ───
const Step2Animation = () => {
  const [phase, setPhase] = useState(0); // 0: 카드 표시, 1: 수정 하이라이트, 2: 공유 플로우
  const [showSharePopup, setShowSharePopup] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editHighlight, setEditHighlight] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => { setPhase(1); setEditHighlight(true); }, 1500);
    const t2 = setTimeout(() => setEditHighlight(false), 3000);
    const t3 = setTimeout(() => setPhase(2), 3500);
    const t4 = setTimeout(() => setShowSharePopup(true), 4000);
    const t5 = setTimeout(() => setCopied(true), 5500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); };
  }, []);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div className="w-full max-w-lg space-y-4">
        {/* 공고 카드 */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden"
        >
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-gray-900">내 공고 목록</h3>
              <span className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full text-[11px] font-semibold">1건</span>
            </div>

            {/* 공고 아이템 */}
            <motion.div
              className={`relative p-4 rounded-xl border transition-all duration-300 ${
                editHighlight ? 'border-blue-400 shadow-[0_0_0_3px_rgba(59,130,246,0.15)]' : 'border-gray-100'
              }`}
            >
              {editHighlight && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute -top-3 left-4 px-2 py-0.5 bg-blue-600 text-white rounded text-[10px] font-bold"
                >
                  ✏️ 클릭하여 수정 가능
                </motion.div>
              )}

              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="px-2 py-0.5 bg-blue-600 text-white rounded text-[10px] font-bold">채용중</span>
                    <span className="text-[10px] text-gray-400">{MOCK_JD.recruitmentPeriod}</span>
                  </div>
                  <p className="font-bold text-[14px] text-gray-900 mb-1">{MOCK_JD.title}</p>
                  <p className="text-[11px] text-gray-500">{MOCK_JD.company} · {MOCK_JD.location}</p>

                  <div className="flex items-center gap-3 mt-3">
                    <div className="flex items-center gap-1 text-[11px] text-gray-400">
                      <Users size={12} /> 지원자 <span className="font-bold text-blue-600">4명</span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-gray-400">
                      <Eye size={12} /> 조회 <span className="font-semibold text-gray-600">128</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 공유 버튼 */}
              <div className="mt-3 flex gap-2">
                <motion.button
                  animate={phase >= 2 ? { scale: [1, 1.08, 1], boxShadow: ['0 0 0 0 rgba(59,130,246,0)', '0 0 0 6px rgba(59,130,246,0.25)', '0 0 0 0 rgba(59,130,246,0)'] } : {}}
                  transition={{ duration: 1.2, repeat: phase >= 2 && !showSharePopup ? Infinity : 0 }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[11px] font-semibold hover:bg-blue-100 transition-colors"
                >
                  <Link2 size={12} />
                  링크 공유
                </motion.button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-600 rounded-lg text-[11px] font-semibold">
                  <FileText size={12} />
                  편집
                </button>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* 링크 공유 팝업 */}
        <AnimatePresence>
          {showSharePopup && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white rounded-2xl shadow-xl border border-gray-100 p-5"
            >
              <div className="flex items-center gap-2 mb-3">
                <Share2 size={16} className="text-blue-600" />
                <h4 className="font-bold text-sm text-gray-900">공유 링크</h4>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2.5 text-[12px] text-gray-600 font-mono truncate border border-gray-100">
                  https://winnow.app/jd/mock-jd-001
                </div>
                <motion.button
                  animate={copied ? {} : { scale: [1, 1.05, 1] }}
                  transition={{ duration: 0.8, repeat: copied ? 0 : Infinity }}
                  className={`px-3 py-2.5 rounded-lg text-[12px] font-bold flex items-center gap-1.5 transition-all ${
                    copied ? 'bg-green-500 text-white' : 'bg-blue-600 text-white'
                  }`}
                >
                  {copied ? (
                    <>
                      <CheckCircle2 size={13} />
                      복사됨!
                    </>
                  ) : (
                    <>
                      <Copy size={13} />
                      복사
                    </>
                  )}
                </motion.button>
              </div>
              {copied && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-[11px] text-green-600 mt-2 flex items-center gap-1"
                >
                  <CheckCircle2 size={11} />
                  링크가 복사되었습니다! 지원자에게 공유하세요.
                </motion.p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// ─── Step 3: 지원자 AI 분석 애니메이션 ───
const Step3Animation = () => {
  const [phase, setPhase] = useState(0); // 0: 목록, 1: 선택, 2: AI 분석
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showSections, setShowSections] = useState<number[]>([]);

  useEffect(() => {
    const t1 = setTimeout(() => { setPhase(1); setSelectedIdx(0); }, 1800);
    const t2 = setTimeout(() => { setPhase(2); setAnalyzing(true); }, 2800);
    const t3 = setTimeout(() => { setAnalyzing(false); setShowAnalysis(true); }, 4500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  useEffect(() => {
    if (showAnalysis) {
      [0, 1, 2].forEach((i) => {
        setTimeout(() => setShowSections((prev) => [...prev, i]), 300 * (i + 1));
      });
    }
  }, [showAnalysis]);

  const statusColor = (status: string) => {
    switch (status) {
      case '서류합격': return 'bg-green-500 text-white';
      case '검토중': return 'bg-yellow-500 text-white';
      case '불합격': return 'bg-red-400 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div className="w-full max-w-lg space-y-4">
        {/* 지원자 목록 */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden"
        >
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-blue-600" />
                <h3 className="font-bold text-sm text-gray-900">지원자 관리</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-purple-50 text-purple-600 rounded-full text-[11px] font-semibold">
                  {MOCK_JD.title.split(' ')[0]}
                </span>
                <span className="text-[11px] text-gray-400 font-semibold">{MOCK_APPLICANTS.length}명</span>
              </div>
            </div>

            <div className="space-y-2">
              {MOCK_APPLICANTS.map((app, i) => (
                <motion.div
                  key={app.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 * i }}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                    selectedIdx === i
                      ? 'border-blue-400 bg-blue-50/50 shadow-[0_0_0_3px_rgba(59,130,246,0.12)]'
                      : 'border-gray-50 hover:border-gray-100'
                  }`}
                >
                  {/* 아바타 */}
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-[11px] flex-shrink-0">
                    {app.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-[13px] text-gray-900">{app.name}</p>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${statusColor(app.status)}`}>
                        {app.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 truncate">{app.university} · {app.major}</p>
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-1.5">
                    {app.matchTags.slice(0, 2).map((tag) => (
                      <span key={tag} className="px-1.5 py-0.5 bg-gray-50 text-gray-500 rounded text-[9px] font-medium border border-gray-100">
                        {tag}
                      </span>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* AI 분석 버튼 */}
            {phase >= 1 && selectedIdx !== null && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 flex justify-center"
              >
                <motion.button
                  animate={!analyzing && !showAnalysis
                    ? { scale: [1, 1.05, 1], boxShadow: ['0 0 0 0 rgba(124,58,237,0)', '0 0 0 6px rgba(124,58,237,0.2)', '0 0 0 0 rgba(124,58,237,0)'] }
                    : {}
                  }
                  transition={{ duration: 1.2, repeat: !analyzing && !showAnalysis ? Infinity : 0 }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-[12px] font-bold shadow-lg shadow-purple-500/20"
                >
                  {analyzing ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                      />
                      AI 분석 중...
                    </>
                  ) : showAnalysis ? (
                    <>
                      <CheckCircle2 size={14} />
                      분석 완료
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      AI 분석 시작
                    </>
                  )}
                </motion.button>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* AI 분석 결과 카드 */}
        <AnimatePresence>
          {showAnalysis && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="bg-white rounded-2xl shadow-xl border border-gray-100 p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Brain size={16} className="text-purple-600" />
                  <h4 className="font-bold text-sm text-gray-900">AI 분석 리포트</h4>
                </div>
                <div className="flex items-center gap-1 px-2.5 py-1 bg-green-50 rounded-full">
                  <BarChart3 size={12} className="text-green-600" />
                  <span className="text-green-700 font-bold text-[12px]">{MOCK_AI_ANALYSIS.summary}</span>
                </div>
              </div>

              <div className="space-y-3">
                {/* 강점 */}
                {showSections.includes(0) && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-green-50 rounded-xl p-3">
                    <p className="text-[11px] font-bold text-green-700 mb-1.5">✅ 강점</p>
                    <ul className="space-y-1">
                      {MOCK_AI_ANALYSIS.strengths.map((s, i) => (
                        <li key={i} className="text-[11px] text-green-600 flex items-center gap-1.5">
                          <CheckCircle2 size={10} className="flex-shrink-0" /> {s}
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}
                {/* 약점 */}
                {showSections.includes(1) && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-yellow-50 rounded-xl p-3">
                    <p className="text-[11px] font-bold text-yellow-700 mb-1.5">⚠️ 보완점</p>
                    <ul className="space-y-1">
                      {MOCK_AI_ANALYSIS.weaknesses.map((w, i) => (
                        <li key={i} className="text-[11px] text-yellow-600">{w}</li>
                      ))}
                    </ul>
                  </motion.div>
                )}
                {/* 추천 */}
                {showSections.includes(2) && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-blue-50 rounded-xl p-3 flex items-center gap-2"
                  >
                    <Zap size={14} className="text-blue-600 flex-shrink-0" />
                    <p className="text-[12px] font-bold text-blue-700">
                      AI 추천: {MOCK_AI_ANALYSIS.recommendation}
                    </p>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// ─── 메인 온보딩 모달 컴포넌트 ───
export const OnboardingModal = ({ onClose, onStartTutorial, onDontShowAgain }: OnboardingModalProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [dontShow, setDontShow] = useState(false);
  const [direction, setDirection] = useState(1); // 1=forward, -1=backward

  const steps = ONBOARDING_STEPS;
  const stepIcons = [Sparkles, Share2, Brain];

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setDirection(1);
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep, steps.length]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const handleClose = useCallback(() => {
    if (dontShow) {
      onDontShowAgain();
    }
    onClose();
  }, [dontShow, onClose, onDontShowAgain]);

  const handleStartTutorial = useCallback(() => {
    if (dontShow) {
      onDontShowAgain();
    }
    onStartTutorial();
  }, [dontShow, onStartTutorial, onDontShowAgain]);

  const renderStepAnimation = () => {
    switch (currentStep) {
      case 0: return <Step1Animation key="step1" />;
      case 1: return <Step2Animation key="step2" />;
      case 2: return <Step3Animation key="step3" />;
      default: return null;
    }
  };

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 40 }}
        transition={{ type: 'spring', duration: 0.5 }}
        className="relative w-[95vw] max-w-[900px] max-h-[92vh] bg-gradient-to-b from-slate-50 to-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 닫기 버튼 */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-50 p-2 hover:bg-gray-100 rounded-xl transition-colors group"
          title="닫기"
        >
          <X size={20} className="text-gray-400 group-hover:text-gray-600" />
        </button>

        {/* 상단 프로그레스 */}
        <div className="px-8 pt-6 pb-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="WINNOW" className="w-8 h-8 object-contain" />
              <span className="font-extrabold text-lg text-gray-900 tracking-tight">WINNOW 시작 가이드</span>
            </div>
            <span className="text-[12px] text-gray-400 font-semibold">
              {currentStep + 1} / {steps.length}
            </span>
          </div>

          {/* 스텝 인디케이터 */}
          <div className="flex gap-2">
            {steps.map((step, i) => {
              const StepIcon = stepIcons[i];
              return (
                <button
                  key={step.id}
                  onClick={() => { setDirection(i > currentStep ? 1 : -1); setCurrentStep(i); }}
                  className={`flex-1 relative group`}
                >
                  <div className={`h-1.5 rounded-full transition-all duration-500 ${
                    i <= currentStep ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                  <div className={`mt-2 flex items-center gap-1.5 transition-colors ${
                    i === currentStep ? 'text-blue-600' : i < currentStep ? 'text-gray-500' : 'text-gray-300'
                  }`}>
                    <StepIcon size={12} />
                    <span className="text-[11px] font-semibold hidden sm:inline">{step.title}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 메인 컨텐츠 영역 */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          {/* 좌측: 설명 */}
          <div className="md:w-[320px] flex-shrink-0 p-6 md:p-8 flex flex-col justify-center">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={currentStep}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${
                  currentStep === 0 ? 'bg-blue-100 text-blue-600' :
                  currentStep === 1 ? 'bg-green-100 text-green-600' :
                  'bg-purple-100 text-purple-600'
                }`}>
                  {currentStep === 0 && <Sparkles size={24} />}
                  {currentStep === 1 && <Share2 size={24} />}
                  {currentStep === 2 && <Brain size={24} />}
                </div>
                <h2 className="text-xl font-extrabold text-gray-900 mb-2">
                  {steps[currentStep].title}
                </h2>
                <p className="text-[13px] text-blue-600 font-semibold mb-3">
                  {steps[currentStep].subtitle}
                </p>
                <p className="text-[13px] text-gray-500 leading-relaxed mb-5">
                  {steps[currentStep].description}
                </p>
                <div className="space-y-2">
                  {steps[currentStep].highlights.map((h, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * i + 0.2 }}
                      className="flex items-center gap-2"
                    >
                      <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" />
                      <span className="text-[12px] text-gray-600">{h}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* 우측: 애니메이션 */}
          <div className="flex-1 bg-gradient-to-br from-slate-100/80 to-blue-50/50 p-4 md:p-6 overflow-y-auto rounded-tl-3xl border-l border-gray-100">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="h-full"
              >
                {renderStepAnimation()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* 하단 컨트롤 */}
        <div className="px-6 md:px-8 py-5 border-t border-gray-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* 다시 보지 않기 */}
            <label className="flex items-center gap-2 cursor-pointer select-none group">
              <input
                type="checkbox"
                checked={dontShow}
                onChange={(e) => setDontShow(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-[12px] text-gray-400 group-hover:text-gray-600 transition-colors">
                다시 보지 않기
              </span>
            </label>
          </div>

          <div className="flex items-center gap-3">
            {/* 이전 */}
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="flex items-center gap-1.5 px-4 py-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-xl transition-colors text-[13px] font-semibold"
              >
                <ChevronLeft size={16} />
                이전
              </button>
            )}

            {/* 다음 / 완료 */}
            {currentStep < steps.length - 1 ? (
              <button
                onClick={handleNext}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors text-[13px] font-bold shadow-lg shadow-blue-500/20"
              >
                다음
                <ChevronRight size={16} />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleStartTutorial}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl transition-all text-[13px] font-bold shadow-lg shadow-purple-500/20"
                >
                  <Play size={14} />
                  직접 체험하기
                </button>
                <button
                  onClick={handleClose}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors text-[13px] font-bold"
                >
                  시작하기
                  <ArrowRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
