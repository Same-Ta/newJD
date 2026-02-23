import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronRight, MessageSquare, Users, Building2, Sparkles, Upload, FileText, CheckCircle2, GripVertical } from 'lucide-react';

/* ─────────── Types ─────────── */
interface DemoSection {
  label: string;
  icon: string;
  items: string[];
}

interface DemoJD {
  title: string;
  teamName: string;
  description: string;
  sections: DemoSection[];
}

interface ChatMsg {
  role: 'ai' | 'user';
  text: string;
}

const INITIAL_JD: DemoJD = {
  title: '',
  teamName: '',
  description: '',
  sections: [],
};

const COMPLETED_JD: DemoJD = {
  title: 'Winnow 개발 동아리 신입 부원 모집',
  teamName: 'Winnow',
  description: 'Winnow는 다양한 개발 프로젝트를 통해 함께 성장하는 개발 동아리입니다. 혁신적인 아이디어를 현실로 만들고, 기술 역량을 키워나갑니다.',
  sections: [
    {
      label: '동아리 소개',
      icon: '📝',
      items: ['웹/앱/AI 등 다양한 프로젝트 진행', '매주 정기 모임 및 코드리뷰', '현업 개발자 멘토링 프로그램'],
    },
    {
      label: '지원자격 (필수)',
      icon: '✅',
      items: ['프로그래밍 기초 지식 보유', '주 1회 오프라인 모임 참석 가능', '팀 프로젝트 참여 의지'],
    },
    {
      label: '지원자격 (우대)',
      icon: '⭐',
      items: ['Git/GitHub 사용 경험', '웹/앱 프로젝트 경험', '개발 스터디 참여 경험'],
    },
    {
      label: '활동 혜택',
      icon: '🎁',
      items: ['포트폴리오 완성 지원', '우수 부원 장학금', '수료증 발급'],
    },
  ],
};

/*
 * Phases:
 *  0 – 유형 선택 (동아리/기업)
 *  1 – 방식 선택 (PDF/새로운 공고)
 *  2 – 기본 정보 입력 (progress bar)
 *  3 – AI 초안 생성 중 (spinner)
 *  4 – 초안 완성 + 섹션 목록
 *  5 – 섹션 선택 → AI 대화
 *  6 – 공고 게시
 */

/* ─────────── Component ─────────── */
export const ChatDemo = () => {
  const [phase, setPhase] = useState(-1);
  const [subPhase, setSubPhase] = useState(0);
  const [jd, setJd] = useState<DemoJD>({ ...INITIAL_JD });
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [visibleSections, setVisibleSections] = useState<number[]>([]);
  const [selectedSection, setSelectedSection] = useState(-1);
  const [isTyping, setIsTyping] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const [height] = useState(typeof window !== 'undefined' && window.innerWidth < 768 ? 480 : 750);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const autoScrollRAF = useRef<number | null>(null);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const hasStarted = useRef(false);

  const addTimeout = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timeoutsRef.current.push(t);
    return t;
  }, []);

  const clearAll = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }, []);

  const reset = useCallback(() => {
    clearAll();
    setPhase(-1);
    setSubPhase(0);
    setJd({ ...INITIAL_JD });
    setChatMessages([]);
    setVisibleSections([]);
    setSelectedSection(-1);
    setIsTyping(false);
    setShowPublish(false);
    setDraggedIdx(null);
    setDragOverIdx(null);
    if (autoScrollRAF.current) { cancelAnimationFrame(autoScrollRAF.current); autoScrollRAF.current = null; }
  }, [clearAll]);

  const scrollChat = useCallback(() => {
    requestAnimationFrame(() => {
      if (chatScrollRef.current) {
        chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
      }
    });
  }, []);

  useEffect(() => { scrollChat(); }, [chatMessages, isTyping, scrollChat]);

  /* ─── Drag & Drop ─── */
  const handleDragStart = (idx: number) => (e: React.DragEvent) => {
    setDraggedIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIdx !== idx) setDragOverIdx(idx);
    // auto-scroll right panel
    const container = rightPanelRef.current;
    if (container && container.contains(e.target as Node)) {
      const rect = container.getBoundingClientRect();
      const EDGE = 80, SPEED = 18;
      if (autoScrollRAF.current) cancelAnimationFrame(autoScrollRAF.current);
      const topDist = e.clientY - rect.top;
      const bottomDist = rect.bottom - e.clientY;
      if (topDist < EDGE) {
        const factor = 1 - topDist / EDGE;
        const scroll = () => { container.scrollTop -= SPEED * factor; autoScrollRAF.current = requestAnimationFrame(scroll); };
        autoScrollRAF.current = requestAnimationFrame(scroll);
      } else if (bottomDist < EDGE) {
        const factor = 1 - bottomDist / EDGE;
        const scroll = () => { container.scrollTop += SPEED * factor; autoScrollRAF.current = requestAnimationFrame(scroll); };
        autoScrollRAF.current = requestAnimationFrame(scroll);
      } else {
        if (autoScrollRAF.current) { cancelAnimationFrame(autoScrollRAF.current); autoScrollRAF.current = null; }
      }
    }
  };

  const handleDrop = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedIdx !== null && draggedIdx !== idx) {
      setJd(prev => {
        const arr = [...prev.sections];
        const [moved] = arr.splice(draggedIdx, 1);
        arr.splice(idx, 0, moved);
        return { ...prev, sections: arr };
      });
    }
    setDraggedIdx(null);
    setDragOverIdx(null);
    if (autoScrollRAF.current) { cancelAnimationFrame(autoScrollRAF.current); autoScrollRAF.current = null; }
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
    setDragOverIdx(null);
    if (autoScrollRAF.current) { cancelAnimationFrame(autoScrollRAF.current); autoScrollRAF.current = null; }
  };

  /* ─── Timeline ─── */
  const play = useCallback(() => {
    // Phase 0: Type selection
    setPhase(0); setSubPhase(0);
    addTimeout(() => setSubPhase(1), 1200);          // select 동아리

    // Phase 1: Method selection
    addTimeout(() => { setPhase(1); setSubPhase(0); }, 2500);
    addTimeout(() => setSubPhase(1), 3700);           // select 새로운 공고

    // Phase 2: Basic info form
    addTimeout(() => { setPhase(2); setSubPhase(0); }, 5000);
    addTimeout(() => setSubPhase(1), 5600);           // name fills
    addTimeout(() => setSubPhase(2), 6300);           // field selects
    addTimeout(() => setSubPhase(3), 7000);           // location fills, submit ready

    // Phase 3: AI generating
    addTimeout(() => { setPhase(3); setSubPhase(0); }, 7800);

    // Phase 4: Draft complete
    addTimeout(() => {
      setPhase(4); setSubPhase(0);
      setJd({ ...COMPLETED_JD });
    }, 10300);
    addTimeout(() => setVisibleSections([0]), 10800);
    addTimeout(() => setVisibleSections([0, 1]), 11100);
    addTimeout(() => setVisibleSections([0, 1, 2]), 11400);
    addTimeout(() => setVisibleSections([0, 1, 2, 3]), 11700);

    // Phase 5: Section chat
    addTimeout(() => { setPhase(5); setSelectedSection(0); }, 12800);
    addTimeout(() => setIsTyping(true), 13300);
    addTimeout(() => {
      setIsTyping(false);
      setChatMessages([{ role: 'ai', text: '동아리 소개 섹션을 선택하셨네요!\n어떤 부분을 수정하면 좋을까요?' }]);
    }, 14500);
    addTimeout(() => {
      setChatMessages(prev => [...prev, { role: 'user', text: '좀 더 열정적인 톤으로 바꿔줘' }]);
    }, 16000);
    addTimeout(() => setIsTyping(true), 16500);
    addTimeout(() => {
      setIsTyping(false);
      setChatMessages(prev => [...prev, { role: 'ai', text: '열정적인 톤으로 수정 완료! 🔥\n"함께 코드로 세상을 바꿀 동료를 찾습니다!"' }]);
    }, 18000);

    // Phase 6: Publish
    addTimeout(() => { setPhase(6); setShowPublish(true); }, 20000);

    // Reset & restart
    addTimeout(() => { reset(); addTimeout(() => play(), 1500); }, 23000);
  }, [addTimeout, reset]);

  /* 화면에 보이면 자동 시작 */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !hasStarted.current) {
        hasStarted.current = true;
        addTimeout(() => play(), 200);
      }
    }, { threshold: 0.05, rootMargin: '0px 0px 100px 0px' });
    obs.observe(el);
    return () => { obs.disconnect(); clearAll(); };
  }, [addTimeout, clearAll, play]);

  /* step dots active state */
  const stepActive = [phase >= 0, phase >= 1, phase >= 2, phase >= 3, phase >= 5];

  /* ─────────── Left Panel Content ─────────── */
  const renderLeftContent = () => {
    /* Phase 0: 유형 선택 */
    if (phase === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full px-6 demo-phase-enter pointer-events-none">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-50 rounded-2xl flex items-center justify-center mb-4 shadow-sm border border-blue-200/60">
            <Sparkles size={22} className="text-blue-600" />
          </div>
          <h3 className="text-[16px] font-bold text-gray-900 mb-1.5">어떤 유형의 공고를 만드시나요?</h3>
          <p className="text-[12px] text-gray-400 mb-6">공고 유형을 선택해주세요</p>
          <div className="grid grid-cols-2 gap-3 w-full max-w-[260px]">
            <div className={`p-4 rounded-xl border-2 text-center transition-all duration-500 ${
              subPhase >= 1
                ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-500/10 scale-[1.02]'
                : 'border-gray-200 bg-white'
            }`}>
              <div className="w-10 h-10 bg-blue-100 rounded-xl mx-auto mb-2 flex items-center justify-center">
                <Users size={20} className="text-blue-600" />
              </div>
              <p className="font-bold text-[13px] text-gray-900">동아리</p>
              <p className="text-[10px] text-gray-400 mt-0.5">모집공고</p>
              {subPhase >= 1 && (
                <div className="mt-2 demo-fade-in">
                  <CheckCircle2 size={16} className="text-blue-500 mx-auto" />
                </div>
              )}
            </div>
            <div className="p-4 rounded-xl border-2 border-gray-200 bg-white text-center">
              <div className="w-10 h-10 bg-gray-100 rounded-xl mx-auto mb-2 flex items-center justify-center">
                <Building2 size={20} className="text-gray-500" />
              </div>
              <p className="font-bold text-[13px] text-gray-900">기업</p>
              <p className="text-[10px] text-gray-400 mt-0.5">채용공고</p>
            </div>
          </div>
        </div>
      );
    }

    /* Phase 1: 방식 선택 */
    if (phase === 1) {
      return (
        <div className="flex flex-col items-center justify-center h-full px-6 demo-phase-enter pointer-events-none">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-50 rounded-2xl flex items-center justify-center mb-4 shadow-sm border border-blue-200/60">
            <FileText size={22} className="text-blue-600" />
          </div>
          <h3 className="text-[16px] font-bold text-gray-900 mb-1.5">어떤 방식으로 만드시겠어요?</h3>
          <p className="text-[12px] text-gray-400 mb-6">작성 방식을 선택해주세요</p>
          <div className="w-full max-w-[280px] space-y-3">
            <div className="p-4 rounded-xl border-2 border-gray-200 bg-white flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Upload size={18} className="text-gray-500" />
              </div>
              <div>
                <p className="font-bold text-[13px] text-gray-900">PDF 업로드</p>
                <p className="text-[10px] text-gray-400">기존 공고 PDF를 분석합니다</p>
              </div>
            </div>
            <div className={`p-4 rounded-xl border-2 flex items-center gap-3 transition-all duration-500 ${
              subPhase >= 1
                ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-500/10'
                : 'border-gray-200 bg-white'
            }`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors duration-500 ${
                subPhase >= 1 ? 'bg-blue-100' : 'bg-gray-100'
              }`}>
                <Sparkles size={18} className={subPhase >= 1 ? 'text-blue-600' : 'text-gray-500'} />
              </div>
              <div className="flex-1">
                <p className="font-bold text-[13px] text-gray-900">새로운 공고</p>
                <p className="text-[10px] text-gray-400">AI와 함께 새로 작성합니다</p>
              </div>
              {subPhase >= 1 && (
                <CheckCircle2 size={16} className="text-blue-500 demo-fade-in flex-shrink-0" />
              )}
            </div>
          </div>
        </div>
      );
    }

    /* Phase 2: 기본 정보 입력 */
    if (phase === 2) {
      return (
        <div className="flex flex-col h-full px-6 py-5 demo-phase-enter pointer-events-none">
          <h3 className="text-[15px] font-bold text-gray-900 mb-1">기본 정보 입력</h3>
          <p className="text-[11px] text-gray-400 mb-3">공고에 필요한 기본 정보를 입력해주세요</p>

          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex justify-between text-[10px] font-semibold mb-1.5">
              <span className="text-blue-600">1. 필수 정보</span>
              <span className={subPhase >= 3 ? 'text-blue-600' : 'text-gray-400'}>2. 선택 정보</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-700 ease-out"
                style={{ width: subPhase >= 3 ? '100%' : subPhase >= 1 ? '50%' : '10%' }}
              />
            </div>
            <p className="text-[10px] text-gray-400 text-right mt-1">{subPhase >= 3 ? '2' : '1'} / 2</p>
          </div>

          <div className="space-y-3 flex-1">
            <div>
              <label className="text-[11px] font-bold text-gray-500 mb-1 block">동아리 이름 *</label>
              <div className={`h-9 rounded-xl border flex items-center px-3 transition-all duration-500 ${
                subPhase >= 1 ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-gray-50'
              }`}>
                {subPhase >= 1 && <span className="text-[13px] text-blue-700 font-medium demo-type-in">Winnow</span>}
              </div>
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-500 mb-1 block">활동 분야 *</label>
              <div className="flex gap-2 flex-wrap">
                {['디자인', '프로그래밍/IT', '마케팅', '기획'].map((tag, i) => (
                  <div key={tag} className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all duration-500 ${
                    subPhase >= 2 && i === 1
                      ? 'border-blue-400 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-500'
                  }`}>
                    {tag}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-500 mb-1 block">활동 위치</label>
              <div className={`h-9 rounded-xl border flex items-center px-3 transition-all duration-500 ${
                subPhase >= 3 ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-gray-50'
              }`}>
                {subPhase >= 3 && <span className="text-[13px] text-blue-700 font-medium demo-type-in">서울 캠퍼스</span>}
              </div>
            </div>
          </div>

          {/* Submit button */}
          <div className="mt-4">
            <div className={`w-full py-3 rounded-xl text-center text-[13px] font-bold transition-all duration-500 ${
              subPhase >= 3
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                : 'bg-gray-100 text-gray-400'
            }`}>
              AI 초안 생성하기
            </div>
          </div>
        </div>
      );
    }

    /* Phase 3: AI 생성 중 */
    if (phase === 3) {
      return (
        <div className="flex flex-col items-center justify-center h-full px-6 demo-phase-enter pointer-events-none">
          <div className="w-14 h-14 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-5" />
          <h3 className="text-[16px] font-bold text-gray-900 mb-2">AI가 초안을 작성하고 있어요</h3>
          <p className="text-[12px] text-gray-400 text-center leading-relaxed">
            입력하신 정보를 바탕으로<br />최적화된 공고를 생성하고 있습니다...
          </p>
          <div className="mt-5 flex gap-1.5">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '200ms' }} />
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '400ms' }} />
          </div>
        </div>
      );
    }

    /* Phase 4: 초안 완성 + 섹션 목록 */
    if (phase === 4) {
      return (
        <div className="flex flex-col h-full px-5 py-5 demo-phase-enter">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 size={20} className="text-green-500" />
            <h3 className="text-[15px] font-bold text-gray-900">초안이 완성되었습니다!</h3>
          </div>
          <p className="text-[12px] text-gray-400 mb-4">섹션을 드래그하여 순서를 변경해보세요</p>

          <div className="space-y-2.5 flex-1 overflow-y-auto scrollbar-hide" onDragOver={(e) => e.preventDefault()}>
            {jd.sections.map((section, i) => (
              <div
                key={section.label}
                draggable
                onDragStart={handleDragStart(i)}
                onDragOver={handleDragOver(i)}
                onDrop={handleDrop(i)}
                onDragEnd={handleDragEnd}
                className={`p-3.5 rounded-xl border transition-all duration-300 cursor-grab active:cursor-grabbing select-none ${
                  visibleSections.includes(i)
                    ? 'opacity-100 translate-y-0 border-gray-200 bg-white'
                    : 'opacity-0 translate-y-3 border-transparent'
                } ${draggedIdx === i ? '!opacity-50 scale-[0.97] shadow-lg' : ''} ${
                  dragOverIdx === i && draggedIdx !== null && draggedIdx !== i
                    ? 'ring-2 ring-blue-400 bg-blue-50/30 !border-blue-200' : ''
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <GripVertical size={14} className="text-gray-300 flex-shrink-0" />
                  <span className="text-[16px]">{section.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-gray-800">{section.label}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5 truncate">{section.items[0]}</p>
                  </div>
                  <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    /* Phase 5~6: 섹션 선택 + AI 대화 */
    if (phase >= 5) {
      return (
        <div className="flex flex-col h-full demo-phase-enter pointer-events-none">
          {/* Section indicator */}
          <div className="px-5 py-3 bg-blue-50 border-b border-blue-100 flex items-center gap-2 flex-shrink-0">
            <span className="text-[14px]">{COMPLETED_JD.sections[selectedSection]?.icon}</span>
            <span className="text-[12px] font-bold text-blue-700">{COMPLETED_JD.sections[selectedSection]?.label}</span>
            <span className="text-[10px] text-blue-400 ml-auto">섹션 수정 중</span>
          </div>

          {/* Chat */}
          <div ref={chatScrollRef} className="flex-1 px-5 py-4 space-y-4 overflow-y-auto bg-gradient-to-b from-[#F8FAFC] to-[#F1F5F9] scrollbar-hide">
            {chatMessages.map((msg, idx) => (
              <div key={idx} className="flex gap-2.5 flex-col demo-chat-enter">
                <div className="flex gap-2.5">
                  {msg.role === 'ai' && (
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl flex-shrink-0 flex items-center justify-center text-[10px] font-extrabold text-blue-600 border border-blue-200/80 shadow-sm">
                      AI
                    </div>
                  )}
                  <div className={`max-w-[85%] ${msg.role === 'user' ? 'ml-auto' : ''}`}>
                    <div
                      className={`px-3.5 py-2.5 rounded-2xl text-[13px] shadow-md border leading-relaxed ${
                        msg.role === 'ai'
                          ? 'bg-white rounded-tl-sm text-gray-700 border-gray-200/60'
                          : 'bg-gradient-to-br from-blue-600 to-blue-700 rounded-tr-sm text-white border-blue-600 shadow-blue-500/20'
                      }`}
                      style={{ whiteSpace: 'pre-wrap' }}
                    >
                      {msg.text}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-2.5 demo-chat-enter">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl flex-shrink-0 flex items-center justify-center text-[10px] font-extrabold text-blue-600 border border-blue-200/80">
                  AI
                </div>
                <div className="bg-white px-3.5 py-2.5 rounded-2xl rounded-tl-sm text-[13px] text-gray-400 shadow-md border border-gray-200/60">
                  응답 생성 중...
                </div>
              </div>
            )}
          </div>

          {/* Input / Publish */}
          <div className="p-4 bg-white border-t border-gray-100 flex-shrink-0">
            {showPublish ? (
              <div className="py-3 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl text-center text-white text-[14px] font-bold shadow-lg shadow-blue-500/30 demo-pulse-glow">
                🎉 공고 게시하기
              </div>
            ) : (
              <div className="relative">
                <input type="text" placeholder="수정 사항을 입력하세요..." disabled
                  className="w-full pl-4 pr-12 py-3 rounded-xl bg-gray-50 border border-gray-200 text-[13px] placeholder:text-gray-400 outline-none cursor-default" />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center text-white shadow-md shadow-blue-500/30">
                  <ChevronRight size={16} />
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  /* ─────────── Right Panel Content ─────────── */
  const renderRightContent = () => {
    /* Phase 0~2: 빈 상태 */
    if (phase < 3) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-center px-6 pointer-events-none">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <FileText size={28} className="text-gray-300" />
          </div>
          <h4 className="font-bold text-gray-400 mb-2 text-[14px]">공고 미리보기</h4>
          <p className="text-[12px] text-gray-400 max-w-[200px] leading-relaxed">
            기본 정보를 입력하면 AI가 공고를 자동으로 작성합니다
          </p>
        </div>
      );
    }

    /* Phase 3: 로딩 shimmer */
    if (phase === 3) {
      return (
        <div className="p-6 space-y-4 pointer-events-none">
          <div className="h-6 bg-gray-100 rounded-lg demo-shimmer w-3/4" />
          <div className="h-4 bg-gray-100 rounded demo-shimmer w-1/2" style={{ animationDelay: '0.2s' }} />
          <div className="mt-6 space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="p-4 rounded-xl border border-gray-100">
                <div className="h-4 bg-gray-100 rounded demo-shimmer w-2/3 mb-2" style={{ animationDelay: `${i * 0.15}s` }} />
                <div className="h-3 bg-gray-50 rounded demo-shimmer w-full" style={{ animationDelay: `${i * 0.15 + 0.1}s` }} />
              </div>
            ))}
          </div>
        </div>
      );
    }

    /* Phase 4+: 전체 JD 미리보기 */
    return (
      <div ref={rightPanelRef} className="flex-1 overflow-y-auto px-6 py-5 space-y-5 scrollbar-hide demo-phase-enter">
        {/* Title */}
        <div>
          <h1 className="text-[20px] font-bold text-gray-900 mb-1">{jd.title}</h1>
          <p className="text-[12px] text-gray-400 mb-2">{jd.teamName} · 개발 동아리 · 서울 캠퍼스</p>
          <p className="text-[12px] text-gray-600 leading-relaxed">{jd.description}</p>
        </div>

        {/* Sections - Draggable */}
        <div className="space-y-4" onDragOver={(e) => e.preventDefault()}>
          {jd.sections.map((section, i) => (
            <div
              key={section.label}
              draggable
              onDragStart={handleDragStart(i)}
              onDragOver={handleDragOver(i)}
              onDrop={handleDrop(i)}
              onDragEnd={handleDragEnd}
              className={`space-y-2 rounded-xl p-3.5 border transition-all duration-300 cursor-grab active:cursor-grabbing select-none
                ${visibleSections.includes(i) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
                ${draggedIdx === i ? '!opacity-50 scale-[0.97] shadow-lg' : ''}
                ${dragOverIdx === i && draggedIdx !== null && draggedIdx !== i
                  ? 'ring-2 ring-blue-400 bg-blue-50/50 border-blue-200'
                  : 'border-gray-100 bg-white hover:border-gray-200'}
                ${selectedSection === i && phase >= 5 ? 'ring-2 ring-blue-400 bg-blue-50/30' : ''}
              `}
            >
              <div className="flex items-center gap-2">
                <GripVertical size={14} className="text-gray-300 flex-shrink-0" />
                <span className="text-[14px]">{section.icon}</span>
                <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{section.label}</h4>
              </div>
              <div className="space-y-1.5 pl-6">
                {section.items.map((item, j) => (
                  <div
                    key={j}
                    className="flex items-start gap-2.5 p-1.5 rounded-lg"
                  >
                    {section.label.includes('필수') || section.label.includes('우대') ? (
                      <input type="checkbox" className="mt-0.5 w-3.5 h-3.5 text-blue-600 border-gray-300 rounded pointer-events-none" readOnly />
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                    )}
                    <span className="text-[12px] text-gray-700 leading-relaxed">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Selected section highlight */}
        {selectedSection === 0 && phase >= 5 && (
          <div className="ring-2 ring-blue-400 rounded-xl p-3 bg-blue-50/30 -mt-3 transition-all duration-500 demo-phase-enter">
            <p className="text-[11px] font-bold text-blue-600 mb-1">✏️ 수정 중: {jd.sections[0]?.label || '동아리 소개'}</p>
            <p className="text-[12px] text-gray-600 leading-relaxed italic">
              "함께 코드로 세상을 바꿀 동료를 찾습니다! Winnow는 열정 넘치는 개발자들이 모여..."
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="pt-4 border-t border-gray-100 flex justify-end items-center gap-2 pointer-events-none">
          <span className="px-3.5 py-2 border border-red-300 text-red-600 rounded-lg text-[12px] font-bold cursor-default">초기화</span>
          <span className="px-3.5 py-2 border border-blue-500 text-blue-600 rounded-lg text-[12px] font-bold cursor-default">편집</span>
          <span className={`px-3.5 py-2 bg-blue-600 text-white rounded-lg text-[12px] font-bold shadow-lg cursor-default transition-all duration-500 ${
            showPublish ? 'shadow-blue-500/40 scale-105' : 'shadow-blue-500/20'
          }`}>공고 게시</span>
        </div>
      </div>
    );
  };

  /* ─────────── Render ─────────── */
  return (
    <div className="relative w-full select-none">
      <div
        ref={containerRef}
        className="flex bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-3xl border border-gray-200/80 shadow-2xl overflow-hidden w-full gap-0"
        style={{ height: `${height}px` }}
      >
        {/* ========== Left Panel ========== */}
        <div className="w-full md:w-[40%] flex flex-col bg-white rounded-3xl md:rounded-l-3xl md:rounded-r-none shadow-sm overflow-hidden pointer-events-auto">
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-white to-gray-50/50 flex justify-between items-center h-[72px] flex-shrink-0 pointer-events-none">
            <div className="flex items-center gap-3 font-bold text-[15.5px] text-gray-900">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-500/30">
                <MessageSquare size={15} fill="white" />
              </div>
              공고 생성 매니저
            </div>
            {/* Step dots */}
            <div className="flex items-center gap-1.5">
              {stepActive.map((active, i) => (
                <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${
                  active ? 'bg-blue-500 scale-110' : 'bg-gray-200'
                }`} />
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {renderLeftContent()}
          </div>
        </div>

        {/* ========== Right Panel (hidden on mobile) ========== */}
        <div className="hidden md:flex flex-1 flex-col bg-white relative overflow-hidden rounded-r-3xl shadow-sm pointer-events-auto">
          {renderRightContent()}
        </div>
      </div>

      {/* Animations */}
      <style>{`
        .demo-phase-enter {
          animation: demoPhaseIn 0.4s ease-out both;
        }
        .demo-chat-enter {
          animation: demoChatIn 0.35s ease-out both;
        }
        .demo-fade-in {
          animation: demoFadeIn 0.3s ease-out both;
        }
        .demo-type-in {
          animation: demoTypeIn 0.5s ease-out both;
        }
        .demo-pulse-glow {
          animation: demoPulseGlow 1.5s ease-in-out infinite;
        }
        .demo-shimmer {
          animation: demoShimmerAnim 1.5s ease-in-out infinite;
        }
        @keyframes demoPhaseIn {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes demoChatIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes demoFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes demoTypeIn {
          from { opacity: 0; transform: translateX(-5px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes demoPulseGlow {
          0%, 100% { box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3); }
          50% { box-shadow: 0 4px 25px rgba(59, 130, 246, 0.5); transform: scale(1.02); }
        }
        @keyframes demoShimmerAnim {
          0% { opacity: 0.5; }
          50% { opacity: 1; }
          100% { opacity: 0.5; }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};
