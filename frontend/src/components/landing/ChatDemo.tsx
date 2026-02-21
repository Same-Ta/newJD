import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronRight, MessageSquare, X } from 'lucide-react';

/* ─────────── Types ─────────── */
interface DemoMessage {
  role: 'ai' | 'user';
  text: string;
  options?: string[];
  selectedOption?: number;
  delay: number;
  jdUpdate?: Partial<DemoJD>;
}

interface DemoJD {
  title: string;
  teamName: string;
  jobRole: string;
  image: string;
  location: string;
  scale: string;
  description: string;
  requirements: string[];
  preferred: string[];
}

const INITIAL_JD: DemoJD = {
  title: '',
  teamName: '',
  jobRole: '',
  image: '',
  location: '',
  scale: '',
  description: '',
  requirements: [],
  preferred: [],
};

/* ─────────── Scenario ─────────── */
const DEMO_SCENARIO: DemoMessage[] = [
  {
    role: 'ai',
    text: '안녕하세요! WINNOW 채용 마스터입니다 🎯\n어떤 유형의 공고를 만들어 볼까요?',
    options: ['회사 채용공고', '동아리 모집공고'],
    selectedOption: 1,
    delay: 800,
  },
  {
    role: 'user',
    text: '동아리 모집공고',
    delay: 1400,
  },
  {
    role: 'ai',
    text: '동아리 모집공고를 만들어 볼게요! 🎯\n동아리의 정체성을 브랜딩하고, 최고의 신입 부원을 찾는 공고를 함께 만들어볼게요!\n\n먼저, 어떤 동아리이신가요?',
    delay: 1500,
  },
  {
    role: 'user',
    text: 'winnow라는 이름의 동아리로 개발동아리야',
    delay: 2200,
    jdUpdate: {
      teamName: 'Winnow',
      jobRole: '개발 동아리',
      image: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&h=400&fit=crop',
    },
  },
  {
    role: 'ai',
    text: '네, \'Winnow\'는 개발 동아리군요! 정말 멋진 활동 분야네요. Winnow 동아리가 어떤 종류의 개발 활동을 하는지 (예: 웹, 앱, AI, 게임 등), 그리고 동아리 분위기는 어떤지 궁금해요! 동아리의 특별한 강점이나 자랑거리도 알려주세요.',
    options: [
      '주로 하는 개발 분야를 알려줄게요.',
      '동아리 분위기와 특징을 설명할게요.',
      'Winnow의 비전과 미션을 알려주고 싶어요.',
      '기타',
    ],
    selectedOption: 0,
    delay: 2000,
  },
  {
    role: 'user',
    text: '주로 하는 개발 분야를 알려줄게요.',
    delay: 1800,
    jdUpdate: {
      location: '캠퍼스 내',
      scale: '대학 동아리',
      description: 'Winnow는 다양한 개발 프로젝트를 통해 함께 성장하는 개발 동아리입니다. 우리는 기술을 배우고, 아이디어를 현실로 만들며, 개발 역량을 키워나가는 것에 중점을 둡니다.',
    },
  },
  {
    role: 'ai',
    text: '좋아요! 개발 분야에 대한 정보를 다 받았어요. 이제 지원자 체크리스트를 만들어 볼까요? 🚀',
    delay: 1500,
    jdUpdate: {
      title: 'Winnow 개발 동아리 신입 부원 모집',
      requirements: [
        '프로그래밍 기초 지식 보유',
        '주 1회 오프라인 모임 참석 가능',
        '팀 프로젝트 참여 의지',
      ],
      preferred: [
        'Git/GitHub 사용 경험',
        '웹/앱 프로젝트 경험',
        '개발 스터디 참여 경험',
      ],
    },
  },
];

/* ─────────── Component ─────────── */
export const ChatDemo = () => {
  const [messages, setMessages] = useState<DemoMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [jd, setJd] = useState<DemoJD>({ ...INITIAL_JD });
  const [selectedOptions, setSelectedOptions] = useState<Record<number, number>>({});
  const [height] = useState(typeof window !== 'undefined' && window.innerWidth < 768 ? 480 : 750);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasStarted = useRef(false);

  /* 채팅 컨테이너 내부만 스크롤 */
  const scrollChat = useCallback(() => {
    requestAnimationFrame(() => {
      if (chatScrollRef.current) {
        chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
      }
    });
  }, []);

  useEffect(() => { scrollChat(); }, [messages, isTyping, scrollChat]);

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
    setMessages([]);
    setIsTyping(false);
    setSelectedOptions({});
    setJd({ ...INITIAL_JD });
  }, [clearAll]);

  const play = useCallback((step: number) => {
    if (step >= DEMO_SCENARIO.length) {
      addTimeout(() => { reset(); addTimeout(() => play(0), 1500); }, 6000);
      return;
    }
    const msg = DEMO_SCENARIO[step];

    if (msg.role === 'ai') {
      setIsTyping(true);
      addTimeout(() => {
        setIsTyping(false);
        setMessages(prev => [...prev, msg]);
        if (msg.jdUpdate) setJd(prev => ({ ...prev, ...msg.jdUpdate }));

        if (msg.options && msg.selectedOption !== undefined) {
          addTimeout(() => {
            setMessages(prev => {
              setSelectedOptions(old => ({ ...old, [prev.length - 1]: msg.selectedOption! }));
              return prev;
            });
            addTimeout(() => play(step + 1), 900);
          }, 1500);
        } else {
          addTimeout(() => play(step + 1), msg.delay);
        }
      }, 1400);
    } else {
      setMessages(prev => [...prev, msg]);
      if (msg.jdUpdate) addTimeout(() => setJd(prev => ({ ...prev, ...msg.jdUpdate })), 500);
      addTimeout(() => play(step + 1), msg.delay);
    }
  }, [addTimeout, reset]);

  /* 화면에 보이면 자동 시작 */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !hasStarted.current) {
        hasStarted.current = true;
        addTimeout(() => play(0), 600);
      }
    }, { threshold: 0.2 });
    obs.observe(el);
    return () => { obs.disconnect(); clearAll(); };
  }, [addTimeout, clearAll, play]);

  const ts = (i: number) => {
    const d = new Date(); d.setMinutes(d.getMinutes() + i * 2);
    return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };



  /* ─────────── Render ─────────── */
  return (
    <div className="relative w-full select-none pointer-events-none">
      <div
        ref={containerRef}
        className="flex bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-3xl border border-gray-200/80 shadow-2xl overflow-hidden w-full gap-0 md:gap-4"
        style={{ height: `${height}px` }}
      >
      {/* ========== Chat Area – Left (full on mobile, 40% on desktop) ========== */}
      <div className="w-full md:w-[40%] flex flex-col bg-white rounded-3xl md:rounded-l-3xl md:rounded-r-none shadow-sm">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-white to-gray-50/50 flex justify-between items-center h-[72px] flex-shrink-0">
          <div className="flex items-center gap-3 font-bold text-[15.5px] text-gray-900">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-500/30">
              <MessageSquare size={15} fill="white" />
            </div>
            공고 생성 매니저
          </div>
          <span className="text-gray-400 cursor-default hover:text-gray-600 transition-colors"><X size={18} /></span>
        </div>

        {/* Messages */}
        <div
          ref={chatScrollRef}
          className="flex-1 px-5 py-6 space-y-6 overflow-y-auto bg-gradient-to-b from-[#F8FAFC] to-[#F1F5F9] scrollbar-hide"
        >
          {messages.map((msg, idx) => (
            <div key={idx} className="flex gap-3 flex-col chat-enter">
              <div className="flex gap-3">
                {msg.role === 'ai' && (
                  <div className="w-9 h-9 bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl flex-shrink-0 flex items-center justify-center text-[10.5px] font-extrabold text-blue-600 border border-blue-200/80 shadow-sm">
                    AI
                  </div>
                )}
                <div className={`space-y-1 max-w-[85%] md:max-w-[270px] ${msg.role === 'user' ? 'ml-auto' : ''}`}>
                  <div
                    className={`px-4 py-3 rounded-2xl text-[13.5px] shadow-md border leading-relaxed ${
                      msg.role === 'ai'
                        ? 'bg-white rounded-tl-sm text-gray-700 border-gray-200/60'
                        : 'bg-gradient-to-br from-blue-600 to-blue-700 rounded-tr-sm text-white border-blue-600 shadow-blue-500/20'
                    }`}
                    style={{ whiteSpace: 'pre-wrap' }}
                  >
                    {msg.text}
                  </div>
                  <div className={`text-[10px] text-gray-400 ${msg.role === 'user' ? 'text-right pr-1' : 'pl-1'}`}>
                    {ts(idx)}
                  </div>
                </div>
              </div>

              {/* 옵션 버튼 */}
              {msg.role === 'ai' && msg.options && (
                <div className="flex flex-col gap-2.5 ml-12">
                  {msg.options.map((opt, oi) => {
                    const isSelected = selectedOptions[idx] === oi;
                    return (
                      <div
                        key={oi}
                        className={`px-4 py-3 border rounded-xl text-[13px] font-semibold text-left transition-all duration-300 cursor-default shadow-sm ${
                          isSelected
                            ? 'bg-gradient-to-r from-blue-50 to-blue-100/50 border-blue-400 text-blue-700 shadow-blue-200/50'
                            : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {opt}
                      </div>
                    );
                  })}
                  <div className="px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-[13px] font-semibold text-gray-500 text-center cursor-default shadow-sm">
                    건너뛰기
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* 로딩 */}
          {isTyping && (
            <div className="flex gap-3 chat-enter">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl flex-shrink-0 flex items-center justify-center text-[10.5px] font-extrabold text-blue-600 border border-blue-200/80 shadow-sm">
                AI
              </div>
              <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-sm text-[13.5px] text-gray-400 shadow-md border border-gray-200/60">
                응답 생성 중...
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-5 bg-white border-t border-gray-100 flex-shrink-0">
          <div className="relative">
            <input
              type="text"
              placeholder="답변을 입력하세요..."
              disabled
              className="w-full pl-5 pr-14 py-4 rounded-xl bg-gray-50 border border-gray-200 text-[14px] font-medium placeholder:text-gray-400 shadow-inner outline-none cursor-default"
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
              <ChevronRight size={18} />
            </div>
          </div>
        </div>
      </div>

      {/* ========== Preview Area – Right 60% (hidden on mobile) ========== */}
      <div className="hidden md:flex flex-1 bg-white relative overflow-hidden rounded-r-3xl shadow-sm">

        {/* ── Left Profile Sidebar ── */}
        <div className="w-[210px] border-r border-gray-100 flex flex-col bg-gradient-to-b from-[#FAFBFC] to-[#F8FAFC] overflow-y-auto flex-shrink-0 scrollbar-hide">
          <div className="px-5 flex flex-col items-center pt-7">
            {/* Profile Image */}
            <div className={`w-20 h-20 rounded-2xl mb-3.5 shadow-lg overflow-hidden transition-all duration-700 ${
              jd.image ? 'bg-gradient-to-br from-blue-400 to-purple-500' : 'bg-gray-100 border-2 border-gray-200'
            }`}>
              {jd.image ? (
                <img src={jd.image} alt="" className="w-full h-full object-cover jd-img-in" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                </div>
              )}
            </div>
            {/* Name */}
            <h3 className={`font-bold text-[16px] mb-1 transition-all duration-500 ${jd.teamName ? 'text-gray-900' : 'text-gray-400'}`}>
              {jd.teamName || '그룹 이름'}
            </h3>
            <p className={`text-[11.5px] font-semibold mb-5 transition-all duration-500 ${jd.jobRole ? 'text-gray-500' : 'text-gray-400'}`}>
              {jd.jobRole || '모집 분야'}
            </p>
          </div>

          {/* Location & Scale */}
          <div className="px-5 space-y-4 mb-6">
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">LOCATION</div>
              <div className="flex items-center gap-2 text-[13px]">
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className={`transition-all duration-500 ${jd.location ? 'text-gray-700' : 'text-gray-400'}`}>
                  {jd.location || '아직 설정되지 않았습니다'}
                </span>
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">SCALE</div>
              <div className="flex items-center gap-2 text-[13px]">
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className={`transition-all duration-500 ${jd.scale ? 'text-gray-700' : 'text-gray-400'}`}>
                  {jd.scale || '아직 설정되지 않았습니다'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Content ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-7 py-6 space-y-7 scrollbar-hide">
            {!jd.title && jd.requirements.length === 0 && !jd.description ? (
              /* 빈 상태 */
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <polyline points="14,2 14,8 20,8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10,9 9,9 8,9" />
                  </svg>
                </div>
                <h4 className="font-bold text-gray-400 mb-2">아직 작성된 내용이 없습니다.</h4>
                <p className="text-[13px] text-gray-400 max-w-xs leading-relaxed">
                  왼쪽 채팅창에서 AI 매니저와 대화를 나누면, 이곳에 채용 공고가 실시간으로 완성됩니다.
                </p>
              </div>
            ) : (
              <>
                {/* 공고 제목 */}
                <div>
                  <h1 className={`text-2xl font-bold mb-4 transition-all duration-500 ${jd.title ? 'text-gray-900' : 'text-gray-300'}`}>
                    {jd.title || (jd.teamName ? `${jd.teamName}` : '공고 제목이 여기에 표시됩니다')}
                  </h1>
                </div>

                {/* 동아리 소개 */}
                {jd.description && (
                  <div className="space-y-3 jd-section-in">
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100 rounded-lg p-5">
                      <h4 className="text-[11px] font-bold text-blue-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 2a8 8 0 100 16 8 8 0 000-16zM9 9a1 1 0 112 0v4a1 1 0 11-2 0V9zm1-5a1 1 0 100 2 1 1 0 000-2z" />
                        </svg>
                        그룹 소개
                      </h4>
                      <p className="text-[14px] text-gray-700 leading-relaxed">{jd.description}</p>
                    </div>
                  </div>
                )}

                {/* 지원자 체크리스트 (필수) */}
                <div className="space-y-3 jd-section-in" style={{ animationDelay: '0.15s' }}>
                  <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    지원자 체크리스트 (필수)
                  </h4>
                  <div className="space-y-2">
                    {jd.requirements.length > 0 ? (
                      jd.requirements.map((item, i) => (
                        <label
                          key={i}
                          className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-default transition-colors group jd-item-in"
                          style={{ animationDelay: `${0.2 + i * 0.08}s` }}
                        >
                          <input type="checkbox" className="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 rounded pointer-events-none" readOnly />
                          <span className="text-[13px] text-gray-700 leading-relaxed">{item}</span>
                        </label>
                      ))
                    ) : (
                      <p className="text-[13px] text-gray-400 p-3">아직 설정되지 않았습니다.</p>
                    )}
                  </div>
                </div>

                {/* 지원자 체크리스트 (우대) */}
                <div className="space-y-3 jd-section-in" style={{ animationDelay: '0.3s' }}>
                  <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    지원자 체크리스트 (우대)
                  </h4>
                  <div className="space-y-2">
                    {jd.preferred.length > 0 ? (
                      jd.preferred.map((item, i) => (
                        <label
                          key={i}
                          className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-default transition-colors group jd-item-in"
                          style={{ animationDelay: `${0.35 + i * 0.08}s` }}
                        >
                          <input type="checkbox" className="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 rounded pointer-events-none" readOnly />
                          <span className="text-[13px] text-gray-700 leading-relaxed">{item}</span>
                        </label>
                      ))
                    ) : (
                      <p className="text-[13px] text-gray-400 p-3">아직 설정되지 않았습니다.</p>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="pt-6 border-t border-gray-100 flex justify-end items-center gap-2">
                  <span className="px-4 py-2.5 border border-red-300 text-red-600 rounded-lg text-[13px] font-bold cursor-default">초기화</span>
                  <span className="px-4 py-2.5 border border-blue-500 text-blue-600 rounded-lg text-[13px] font-bold cursor-default">편집</span>
                  <span className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-[13px] font-bold shadow-lg shadow-blue-500/20 cursor-default">공고 게시</span>
                </div>

                <div className="text-right pt-4">
                  <p className="text-[11px] font-bold text-gray-400">WINNOW Recruiting Team</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Animations */}
      <style>{`
        .chat-enter {
          animation: chatIn 0.35s ease-out both;
        }
        .jd-img-in {
          animation: imgIn 0.5s ease-out both;
        }
        .jd-section-in {
          animation: sectionIn 0.5s ease-out both;
        }
        .jd-item-in {
          animation: itemIn 0.4s ease-out both;
        }
        @keyframes chatIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes imgIn {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes sectionIn {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes itemIn {
          from { opacity: 0; transform: translateX(-8px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      </div>
    </div>
  );
};
