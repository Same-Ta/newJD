import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Check,
  Search,
  Filter,
  FileText,
  Users,
  Calendar,
  Download,
  Trash2,
  Sparkles,
  Copy,
  Link2,
  ExternalLink,
  Globe,
} from 'lucide-react';

/* ─────────── 체크리스트 항목 (스크린샷 1 기반) ─────────── */
const REQUIRED_ITEMS = [
  {
    label: '머신러닝 모델 구현 경험 (이론을 넘어 실제 모델을 구현해 본 경험)',
    hasTextarea: true,
    textareaPlaceholder: '관련 경험이나 역량을 구체적으로 작성해주세요',
    typedAnswer:
      'TensorFlow와 PyTorch를 활용하여 이미지 분류 모델을 구현하고 배포한 경험이 있습니다. 특히 CNN 기반의 모델을 직접 설계하고 학습시켜 95% 이상의 정확도를 달성했습니다.',
  },
  {
    label: '특정 클라우드 플랫폼(AWS, GCP, Azure 등) 사용 경험 (클라우드 환경에서 서비스를 배포하거나 관리해 본 경험)',
    hasTextarea: false,
  },
  {
    label: '본인 역할에만 집중하기보다 팀 목표 달성을 위해 적극적으로 아이디어를 공유하고 협력하는 분',
    hasTextarea: false,
  },
];

const PREFERRED_ITEMS = [
  {
    label: '코드 리뷰에 적극적인 참여 (본인의 코드를 공유하고, 동료의 코드를 분석하며 함께 성장하는 것에 즐거움을 느끼시는 분)',
    hasTextarea: false,
  },
];

/* ─────────── 지원자 데이터 (스크린샷 2 기반) ─────────── */
const APPLICANT = {
  name: '최형균',
  email: 'gudrbs14@naver.com',
  phone: '01025781445',
  gender: '남성',
  position: '세상을 바꿀 AI 서비스를 함께 만들 AI Developer를 찾습니다! (WINNOW)',
  date: '2026.02.07',
};

const DEMO_URL = 'winnow.app/apply/ai-developer-winnow';

/* ─────────── 애니메이션 단계 ─────────── */
type Phase =
  // 1단계: 공고 게시 + URL 공유
  | 'idle'
  | 'publish-click'   // 공고 게시 버튼 클릭
  | 'publishing'      // 게시 중
  | 'published'       // 게시 완료
  | 'show-url'        // URL 표시
  | 'copy-url'        // URL 복사
  | 'url-copied'      // 복사 완료
  // 2단계: 지원자가 URL 클릭 → 지원서 작성
  | 'url-click'       // URL 클릭 전환
  | 'open-form'       // 지원서 폼 오픈
  | 'check-1'         // 체크 1
  | 'typing'          // 답변 타이핑
  | 'check-2'         // 체크 2
  | 'check-3'         // 체크 3
  | 'check-pref'      // 우대 체크
  | 'submit-hover'    // 지원하기 호버
  | 'submitting'      // 지원 중
  | 'submitted'       // 지원 완료
  // 3단계: 지원자 관리 테이블
  | 'transition'      // 전환
  | 'show-table'      // 테이블
  | 'show-row'        // 행 등장
  | 'done';           // 완료

/* ─────────── 현재 보여줄 화면 ─────────── */
type View = 'publish' | 'form' | 'table';

export const ApplicationFlowDemo = () => {
  const [phase, setPhase] = useState<Phase>('idle');
  const [view, setView] = useState<View>('publish');
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [typedText, setTypedText] = useState('');
  const [showRow, setShowRow] = useState(false);
  const [applicantCount, setApplicantCount] = useState(0);
  const [urlTyped, setUrlTyped] = useState('');
  const [urlCopied, setUrlCopied] = useState(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasStarted = useRef(false);

  const addTimeout = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timeoutsRef.current.push(t);
  }, []);

  const clearAll = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }, []);

  /* ─── 타이핑 효과 ─── */
  const typeText = useCallback(
    (text: string, setter: (v: string) => void, speed: number, onDone: () => void) => {
      let i = 0;
      const doType = () => {
        if (i < text.length) {
          setter(text.slice(0, i + 1));
          i++;
          addTimeout(doType, speed);
        } else {
          addTimeout(onDone, 400);
        }
      };
      doType();
    },
    [addTimeout],
  );

  /* ─── 전체 초기화 ─── */
  const resetAll = useCallback(() => {
    setPhase('idle');
    setView('publish');
    setCheckedItems(new Set());
    setTypedText('');
    setShowRow(false);
    setApplicantCount(0);
    setUrlTyped('');
    setUrlCopied(false);
  }, []);

  /* ═══════════════════════════════════════════
     메인 시나리오
     ═══════════════════════════════════════════ */
  const runSequence = useCallback(() => {
    clearAll();
    resetAll();

    // ── 1단계: 공고 게시 ──
    addTimeout(() => {
      setPhase('publish-click');

      addTimeout(() => {
        setPhase('publishing');

        addTimeout(() => {
          setPhase('published');

          addTimeout(() => {
            // URL 타이핑
            setPhase('show-url');
            typeText(DEMO_URL, setUrlTyped, 30, () => {
              addTimeout(() => {
                // URL 복사
                setPhase('copy-url');

                addTimeout(() => {
                  setPhase('url-copied');
                  setUrlCopied(true);

                  addTimeout(() => {
                    // ── 2단계: URL 클릭 → 지원서 ──
                    setPhase('url-click');

                    addTimeout(() => {
                      setView('form');
                      setPhase('open-form');

                      addTimeout(() => {
                        // 체크 1
                        setPhase('check-1');
                        setCheckedItems(new Set(['req-0']));

                        addTimeout(() => {
                          // 텍스트 입력
                          setPhase('typing');
                          typeText(REQUIRED_ITEMS[0].typedAnswer!, setTypedText, 20, () => {
                            addTimeout(() => {
                              // 체크 2
                              setPhase('check-2');
                              setCheckedItems((p) => new Set([...p, 'req-1']));

                              addTimeout(() => {
                                // 체크 3
                                setPhase('check-3');
                                setCheckedItems((p) => new Set([...p, 'req-2']));

                                addTimeout(() => {
                                  // 우대
                                  setPhase('check-pref');
                                  setCheckedItems((p) => new Set([...p, 'pref-0']));

                                  addTimeout(() => {
                                    setPhase('submit-hover');

                                    addTimeout(() => {
                                      setPhase('submitting');

                                      addTimeout(() => {
                                        setPhase('submitted');

                                        addTimeout(() => {
                                          // ── 3단계: 지원자 관리 ──
                                          setPhase('transition');
                                          setView('table');

                                          addTimeout(() => {
                                            setPhase('show-table');
                                            setApplicantCount(1);

                                            addTimeout(() => {
                                              setPhase('show-row');
                                              setShowRow(true);

                                              addTimeout(() => {
                                                setPhase('done');
                                                // 5초 후 리셋 & 재시작
                                                addTimeout(() => {
                                                  resetAll();
                                                  addTimeout(() => runSequence(), 800);
                                                }, 5000);
                                              }, 1000);
                                            }, 600);
                                          }, 800);
                                        }, 1500);
                                      }, 1200);
                                    }, 800);
                                  }, 700);
                                }, 700);
                              }, 700);
                            }, 500);
                          });
                        }, 800);
                      }, 800);
                    }, 800);
                  }, 1200);
                }, 600);
              }, 600);
            });
          }, 800);
        }, 900);
      }, 600);
    }, 400);
  }, [addTimeout, clearAll, resetAll, typeText]);

  /* ─── IntersectionObserver ─── */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted.current) {
          hasStarted.current = true;
          runSequence();
        }
      },
      { threshold: 0.05, rootMargin: '0px 0px 100px 0px' },
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      clearAll();
    };
  }, [runSequence, clearAll]);

  /* ═══════════════════════════════════════════
     뷰 1: 공고 게시 + URL 공유
     ═══════════════════════════════════════════ */
  const renderPublishView = () => {
    const isActive = view === 'publish';
    return (
      <div
        className={`absolute inset-0 transition-all duration-700 ${
          isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
        }`}
      >
        <div className="h-full flex flex-col items-center justify-center bg-white rounded-2xl border border-gray-200 shadow-lg px-8">
          {/* 공고 카드 미리보기 */}
          <div className="w-full max-w-[500px] bg-white border border-gray-200 rounded-xl shadow-sm p-6 mb-8">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-14 h-14 rounded-full overflow-hidden ring-2 ring-gray-100 flex-shrink-0">
                <img
                  src="https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?w=200&h=200&fit=crop"
                  alt="profile"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h3 className="font-bold text-base text-gray-900 mb-1">
                  세상을 바꿀 AI 서비스를 함께 만들 AI Developer를 찾습니다!
                </h3>
                <p className="text-sm text-gray-500">WINNOW · 개발 동아리</p>
              </div>
            </div>

            <div className="flex gap-2 mb-5">
              <span className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded-full">AI/ML</span>
              <span className="px-3 py-1 bg-purple-50 text-purple-600 text-xs font-medium rounded-full">개발</span>
              <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">서울</span>
            </div>

            {/* 게시 버튼 */}
            <div className="flex justify-end">
              <button
                className={`px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-500 ${
                  phase === 'publish-click'
                    ? 'bg-blue-700 text-white scale-105 shadow-xl shadow-blue-300/40'
                    : phase === 'publishing'
                      ? 'bg-blue-500 text-white'
                      : phase === 'published' ||
                          phase === 'show-url' ||
                          phase === 'copy-url' ||
                          phase === 'url-copied' ||
                          phase === 'url-click'
                        ? 'bg-green-500 text-white'
                        : 'bg-blue-600 text-white shadow-md'
                }`}
              >
                {phase === 'publishing' ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    게시 중...
                  </span>
                ) : ['published', 'show-url', 'copy-url', 'url-copied', 'url-click'].includes(phase) ? (
                  <span className="flex items-center gap-2">
                    <Check size={16} />
                    게시 완료!
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Globe size={16} />
                    공고 게시
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* URL 공유 영역 */}
          <div
            className={`w-full max-w-[500px] transition-all duration-700 ${
              ['show-url', 'copy-url', 'url-copied', 'url-click'].includes(phase)
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-6 pointer-events-none'
            }`}
          >
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Link2 size={16} className="text-blue-600" />
                <span className="text-sm font-semibold text-gray-700">공유 링크</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-blue-600 font-medium truncate">
                  {urlTyped || DEMO_URL}
                  {phase === 'show-url' && (
                    <span className="inline-block w-0.5 h-4 bg-blue-600 ml-0.5 animate-pulse align-middle" />
                  )}
                </div>
                <button
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-500 ${
                    urlCopied
                      ? 'bg-green-500 text-white'
                      : phase === 'copy-url'
                        ? 'bg-blue-700 text-white scale-105'
                        : 'bg-blue-600 text-white'
                  }`}
                >
                  {urlCopied ? (
                    <>
                      <Check size={14} />
                      복사됨
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      복사
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* URL 클릭 애니메이션 */}
            {phase === 'url-click' && (
              <div className="mt-4 flex items-center justify-center gap-3 animate-pulse">
                <ExternalLink size={18} className="text-blue-500" />
                <span className="text-sm font-medium text-blue-600">지원자가 링크를 클릭하여 접속합니다...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  /* ═══════════════════════════════════════════
     뷰 2: 지원서 폼 (스크린샷 1)
     ═══════════════════════════════════════════ */
  const renderApplicationForm = () => {
    const isActive = view === 'form';
    return (
      <div
        className={`absolute inset-0 transition-all duration-700 ${
          isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-105 pointer-events-none'
        }`}
      >
        <div className="h-full flex bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-lg">
          {/* ── 왼쪽 프로필 사이드바 ── */}
          <div className="w-[180px] flex-shrink-0 border-r border-gray-100 flex flex-col items-center pt-10 pb-6 bg-white">
            <div className="w-[100px] h-[100px] rounded-full overflow-hidden mb-4 ring-2 ring-gray-100">
              <img
                src="https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?w=200&h=200&fit=crop"
                alt="profile"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="font-bold text-base text-gray-900 mb-1">WINNOW</div>
            <div className="text-xs text-gray-400">모집 분야</div>
          </div>

          {/* ── 오른쪽 콘텐츠 ── */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* 상단 */}
            <div className="flex items-center justify-between px-8 pt-6 pb-4">
              <h3 className="font-bold text-lg text-gray-900">공고 상세</h3>
              <button className="px-4 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600">
                목록으로
              </button>
            </div>

            {/* 스크롤 영역 */}
            <div className="flex-1 overflow-y-auto px-8 pb-8 scrollbar-hide">
              <h2 className="text-xl font-bold text-gray-900 mb-8 leading-relaxed">
                세상을 바꿀 AI 서비스를 함께 만들 AI Developer를 찾습니다! (WINNOW)
              </h2>

              {/* 필수 */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-4">지원자 체크리스트 (필수)</h4>
                <div className="space-y-5">
                  {REQUIRED_ITEMS.map((item, idx) => {
                    const key = `req-${idx}`;
                    const isChecked = checkedItems.has(key);
                    const isActiveItem =
                      (phase === 'check-1' && idx === 0) ||
                      (phase === 'check-2' && idx === 1) ||
                      (phase === 'check-3' && idx === 2);

                    return (
                      <div key={key}>
                        <label
                          className={`flex items-start gap-3 transition-all duration-300 ${
                            isActiveItem ? 'scale-[1.01]' : ''
                          }`}
                        >
                          <div
                            className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all duration-500 ${
                              isChecked
                                ? 'bg-blue-600 border-blue-600 shadow-md shadow-blue-200'
                                : 'border-gray-300 bg-white'
                            }`}
                          >
                            {isChecked && <Check size={14} className="text-white" />}
                          </div>
                          <span
                            className={`text-sm leading-relaxed transition-colors duration-300 ${
                              isChecked ? 'text-gray-900 font-medium' : 'text-gray-600'
                            }`}
                          >
                            {item.label}
                          </span>
                        </label>

                        {item.hasTextarea && isChecked && (
                          <div className="ml-9 mt-3">
                            <div className="border border-gray-200 rounded-xl p-4 min-h-[80px] bg-gray-50/50">
                              {typedText ? (
                                <p className="text-sm text-gray-800 leading-relaxed">
                                  {typedText}
                                  {phase === 'typing' && (
                                    <span className="inline-block w-0.5 h-4 bg-blue-600 ml-0.5 animate-pulse align-middle" />
                                  )}
                                </p>
                              ) : (
                                <p className="text-sm text-gray-400">{item.textareaPlaceholder}</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 우대 */}
              <div className="mb-8">
                <h4 className="text-sm font-semibold text-gray-700 mb-4">지원자 체크리스트 (우대)</h4>
                <div className="space-y-4">
                  {PREFERRED_ITEMS.map((item, idx) => {
                    const key = `pref-${idx}`;
                    const isChecked = checkedItems.has(key);
                    const isActiveItem = phase === 'check-pref' && idx === 0;
                    return (
                      <label
                        key={key}
                        className={`flex items-start gap-3 transition-all duration-300 ${
                          isActiveItem ? 'scale-[1.01]' : ''
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all duration-500 ${
                            isChecked
                              ? 'bg-blue-600 border-blue-600 shadow-md shadow-blue-200'
                              : 'border-gray-300 bg-white'
                          }`}
                        >
                          {isChecked && <Check size={14} className="text-white" />}
                        </div>
                        <span
                          className={`text-sm leading-relaxed transition-colors duration-300 ${
                            isChecked ? 'text-gray-900 font-medium' : 'text-gray-600'
                          }`}
                        >
                          {item.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-gray-200 my-6" />
              <div className="flex justify-end">
                <button
                  className={`px-8 py-3 rounded-xl font-semibold text-sm transition-all duration-500 ${
                    phase === 'submit-hover'
                      ? 'bg-blue-700 text-white shadow-xl shadow-blue-300/40 scale-105'
                      : phase === 'submitting'
                        ? 'bg-blue-500 text-white'
                        : phase === 'submitted'
                          ? 'bg-green-500 text-white'
                          : 'bg-blue-600 text-white shadow-md'
                  }`}
                >
                  {phase === 'submitting' ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      지원 중...
                    </span>
                  ) : phase === 'submitted' ? (
                    <span className="flex items-center gap-2">
                      <Check size={16} />
                      지원 완료!
                    </span>
                  ) : (
                    '지원하기'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  /* ═══════════════════════════════════════════
     뷰 3: 지원자 관리 테이블 (스크린샷 2)
     ═══════════════════════════════════════════ */
  const renderApplicantTable = () => {
    const isActive = view === 'table';
    return (
      <div
        className={`absolute inset-0 transition-all duration-700 ${
          isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-105 pointer-events-none'
        }`}
      >
        <div className="h-full flex flex-col bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-lg p-6">
          {/* 헤더 */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">지원자 관리</h3>
              <p className="text-sm text-gray-500">
                총 <span className="font-semibold text-gray-700">{applicantCount}명</span>의 지원자
              </p>
            </div>
            <button className="flex items-center gap-2 bg-green-500 text-white px-5 py-2.5 rounded-lg text-sm font-semibold shadow-md">
              <Download size={16} />
              엑셀 다운로드
            </button>
          </div>

          {/* 검색바 */}
          <div className="relative mb-4">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="이름, 이메일, 전화번호로 검색..."
              className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50/50 focus:outline-none"
              readOnly
            />
          </div>

          {/* 필터 */}
          <div className="flex gap-3 mb-5">
            {[
              { icon: Filter, label: '상태' },
              { icon: FileText, label: '공고' },
              { icon: Users, label: '성별' },
              { icon: Calendar, label: '기간' },
            ].map(({ icon: Icon, label }) => (
              <button
                key={label}
                className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600"
              >
                <Icon size={14} />
                {label}
                <svg className="w-3 h-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            ))}
          </div>

          {/* 테이블 */}
          <div className="flex-1 overflow-hidden">
            <div className="grid grid-cols-[32px_70px_1fr_100px_60px_1.5fr_80px_80px_64px_36px] gap-2 px-4 py-3 border-b border-gray-200 text-xs text-gray-500 font-medium">
              <div className="flex items-center"><div className="w-4 h-4 border border-gray-300 rounded" /></div>
              <div>이름</div>
              <div>이메일</div>
              <div>전화번호</div>
              <div>성별</div>
              <div>지원 포지션</div>
              <div>지원 일시</div>
              <div>작성 내용</div>
              <div>상태</div>
              <div>관리</div>
            </div>

            <div
              className={`grid grid-cols-[32px_70px_1fr_100px_60px_1.5fr_80px_80px_64px_36px] gap-2 px-4 py-4 border-b border-gray-100 items-center transition-all duration-700 ${
                showRow ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              <div className="flex items-center"><div className="w-4 h-4 border border-gray-300 rounded" /></div>
              <div className="text-sm font-bold text-gray-900 truncate">{APPLICANT.name}</div>
              <div className="text-sm text-gray-600 truncate">{APPLICANT.email}</div>
              <div className="text-sm text-gray-600">{APPLICANT.phone}</div>
              <div className="text-sm text-gray-600">{APPLICANT.gender}</div>
              <div className="text-sm text-gray-600 truncate">{APPLICANT.position}</div>
              <div className="text-sm text-gray-600">{APPLICANT.date}</div>
              <div>
                <button className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                  <Sparkles size={12} />
                  AI 분석
                </button>
              </div>
              <div>
                <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                  <span className="w-2 h-2 rounded-full bg-gray-400" />
                  검토중
                </span>
              </div>
              <div>
                <Trash2 size={14} className="text-gray-400" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  /* ═══════════════════════════════════════════ */
  return (
    <div ref={containerRef} className="relative w-full h-[620px] pointer-events-none select-none">
      {renderPublishView()}
      {renderApplicationForm()}
      {renderApplicantTable()}
    </div>
  );
};
