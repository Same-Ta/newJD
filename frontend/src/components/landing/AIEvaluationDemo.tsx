import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';

/* ─────────── 지원자 데이터 ─────────── */
const APPLICANTS = [
  {
    name: '최형균',
    email: 'gudrbs14@naver.com',
    position: '세상을 바꿀 AI 서비스를 함께 만들 AI Developer를 찾습니다! (WINNOW)',
    skillLevel: 0.35,   // 0~1 위치 (낮음)
    willLevel: 0.3,
    evaluations: [
      { category: '직무 역량', basis: "(자격 요건 및 우대 사항 'detail' 답변 모두 공란)", level: '하', color: 'bg-red-50 text-red-500', verdict: '머신러닝 모델 구현 경험 및 클라우드 플랫폼 사용 경험 등 직무 관련 구체적인 데이터나 방법론이 전혀 없어 실무 전문성을 판단할 수 없음.' },
      { category: '문제 해결', basis: "(자격 요건 및 우대 사항 'detail' 답변 모두 공란)", level: '하', color: 'bg-red-50 text-red-500', verdict: '문제 해결 경험에 대한 구체적 사례나 장애물 돌파를 위한 논리적 사고 및 실행력 관련 데이터가 없어 평가 불가.' },
      { category: '성장 잠재력', basis: "(자격 요건 및 우대 사항 'detail' 답변 모두 공란)", level: '하', color: 'bg-red-50 text-red-500', verdict: '실제 학습 성과나 팀 성장에 대한 기여 의지를 입증할 구체적인 내용이 없어 잠재력을 판단하기 어려움.' },
      { category: '협업 태도', basis: "(자격 요건 및 우대 사항 'detail' 답변 모두 공란)", level: '하', color: 'bg-red-50 text-red-500', verdict: '팀 목표 달성을 위한 아이디어 공유 및 협력, 코드 리뷰 참여 등에 대한 구체적인 행동 패턴이 없어 협업 태도를 평가하기 어려움.' },
    ],
    decision: '불합격',
  },
  {
    name: '김민준',
    email: 'minjun@univ.ac.kr',
    position: '세상을 바꿀 AI 서비스를 함께 만들 AI Developer를 찾습니다! (WINNOW)',
    skillLevel: 0.75,
    willLevel: 0.8,
    evaluations: [
      { category: '직무 역량', basis: 'CNN 모델 구현 및 95% 정확도 달성', level: '상', color: 'bg-green-50 text-green-600', verdict: 'TensorFlow, PyTorch를 활용한 이미지 분류 모델 구현 및 배포 경험이 풍부하며 실무 수준의 기술력을 보유.' },
      { category: '문제 해결', basis: 'AWS 배포 및 성능 최적화 경험', level: '중', color: 'bg-yellow-50 text-yellow-600', verdict: '클라우드 환경에서의 배포 경험과 모델 성능 최적화 과정에서 문제 해결 능력을 확인할 수 있음.' },
      { category: '성장 잠재력', basis: '오픈소스 기여 및 스터디 리딩', level: '상', color: 'bg-green-50 text-green-600', verdict: '자기 주도적 학습과 커뮤니티 기여를 통해 지속적인 성장 의지를 입증.' },
      { category: '협업 태도', basis: '코드 리뷰 적극 참여, 팀 프로젝트 PM', level: '상', color: 'bg-green-50 text-green-600', verdict: '팀 프로젝트에서 PM 역할을 수행하고 코드 리뷰에 적극 참여하여 높은 협업 태도를 보임.' },
    ],
    decision: '합격',
  },
  {
    name: '이서연',
    email: 'seoyeon@univ.ac.kr',
    position: '세상을 바꿀 AI 서비스를 함께 만들 AI Developer를 찾습니다! (WINNOW)',
    skillLevel: 0.55,
    willLevel: 0.65,
    evaluations: [
      { category: '직무 역량', basis: 'NLP 모델 파인튜닝 경험', level: '중', color: 'bg-yellow-50 text-yellow-600', verdict: 'HuggingFace를 활용한 NLP 모델 파인튜닝 경험이 있으나 배포 경험은 부족.' },
      { category: '문제 해결', basis: '학부 연구실 프로젝트 수행', level: '중', color: 'bg-yellow-50 text-yellow-600', verdict: '연구실 프로젝트에서 데이터 전처리 및 모델 개선 과정을 수행한 경험 확인.' },
      { category: '성장 잠재력', basis: '관련 교과목 우수 성적, AI 대회 참가', level: '상', color: 'bg-green-50 text-green-600', verdict: 'AI 관련 대회 참가와 우수한 학업 성적으로 높은 성장 잠재력을 보유.' },
      { category: '협업 태도', basis: '팀 프로젝트 경험 다수', level: '중', color: 'bg-yellow-50 text-yellow-600', verdict: '다수의 팀 프로젝트 경험이 있으나 구체적인 협업 방식에 대한 시술이 부족.' },
    ],
    decision: '합격',
  },
];

/* ─────────── Skill/Will 바 컴포넌트 (외부 정의로 렌더 시 재생성 방지) ─────────── */
const SkillBar = ({ label, level, subtitle, animate }: { label: string; level: number; subtitle: string; animate: boolean }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-5 flex-1">
    <h4 className="font-bold text-base text-gray-900 mb-3">{label}</h4>
    <div className="flex justify-between text-[10px] text-gray-400 mb-1.5">
      <span>
        지원자 중<br />
        가장 <span className="text-blue-500 font-semibold">높은</span> 수준
      </span>
      <span className="text-center">
        평균<br />수준
      </span>
      <span className="text-right">
        지원자 중<br />
        가장 <span className="text-orange-500 font-semibold">낮은</span> 수준
      </span>
    </div>
    {/* 바 — 원형 인디케이터가 잘리지 않도록 래퍼/바/원 분리 */}
    <div className="relative h-5 mb-2">
      <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-3 rounded-full bg-gradient-to-r from-green-400 via-green-300 to-green-100" />
      <div
        className="absolute top-1/2 w-5 h-5 bg-white border-[3px] border-blue-500 rounded-full shadow-md transition-all duration-1000"
        style={{ left: animate ? `${level * 100}%` : '50%', transform: 'translate(-50%, -50%)' }}
      />
    </div>
    <div
      className="text-center text-xs font-semibold transition-all duration-1000"
      style={{ marginLeft: `clamp(-40%, ${(level * 100 - 50)}%, 40%)` }}
    >
      <span className={level > 0.6 ? 'text-green-600' : level > 0.4 ? 'text-yellow-600' : 'text-orange-600'}>
        {level > 0.6 ? '높음' : level > 0.4 ? '보통' : '낮음'}
      </span>
    </div>
    <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">{subtitle}</p>
  </div>
);

/* ─────────── 단계 ─────────── */
type Phase =
  | 'idle'
  | 'show-header'     // 상단 지원자 정보 표시
  | 'ai-analyzing'    // AI 분석 중
  | 'show-skill-will' // Skill/Will 바 표시
  | 'show-eval-1'     // 평가 행 1
  | 'show-eval-2'     // 평가 행 2
  | 'show-eval-3'     // 평가 행 3
  | 'show-eval-4'     // 평가 행 4
  | 'show-decision'   // 합격/불합격 결정 표시
  | 'click-decision'  // 버튼 클릭 애니메이션
  | 'next-applicant'  // 다음 지원자로 전환
  | 'done';

export const AIEvaluationDemo = () => {
  const [phase, setPhase] = useState<Phase>('idle');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [visibleEvals, setVisibleEvals] = useState(0);
  const [showBars, setShowBars] = useState(false);
  const [decided, setDecided] = useState(false);
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

  const applicant = APPLICANTS[currentIdx];

  /* ─── 한 명의 지원자 평가 시퀀스 ─── */
  const evaluateOne = useCallback(
    (idx: number) => {
      setCurrentIdx(idx);
      setVisibleEvals(0);
      setShowBars(false);
      setDecided(false);
      setPhase('idle');

      addTimeout(() => {
        setPhase('show-header');

        addTimeout(() => {
          setPhase('ai-analyzing');

          addTimeout(() => {
            setPhase('show-skill-will');
            setShowBars(true);

            addTimeout(() => {
              // 평가 행 순차 등장
              setPhase('show-eval-1');
              setVisibleEvals(1);

              addTimeout(() => {
                setPhase('show-eval-2');
                setVisibleEvals(2);

                addTimeout(() => {
                  setPhase('show-eval-3');
                  setVisibleEvals(3);

                  addTimeout(() => {
                    setPhase('show-eval-4');
                    setVisibleEvals(4);

                    addTimeout(() => {
                      setPhase('show-decision');

                      addTimeout(() => {
                        setPhase('click-decision');
                        setDecided(true);

                        addTimeout(() => {
                          // 다음 지원자로
                          const nextIdx = (idx + 1) % APPLICANTS.length;
                          setPhase('next-applicant');

                          addTimeout(() => {
                            evaluateOne(nextIdx);
                          }, 1000);
                        }, 2000);
                      }, 1000);
                    }, 1000);
                  }, 500);
                }, 500);
              }, 500);
            }, 500);
          }, 1500);
        }, 800);
      }, 800);
    },
    [addTimeout],
  );

  /* ─── IntersectionObserver ─── */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted.current) {
          hasStarted.current = true;
          evaluateOne(0);
        }
      },
      { threshold: 0.05, rootMargin: '0px 0px 100px 0px' },
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      clearAll();
    };
  }, [evaluateOne, clearAll]);

  return (
    <div ref={containerRef} className="relative w-full pointer-events-none select-none">
      <div
        className={`bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden transition-all duration-700 ${
          phase === 'idle' || phase === 'next-applicant' ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
        }`}
      >
        {/* ═══ 상단: 지원자 헤더 (스크린샷 2) ═══ */}
        <div
          className={`flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 transition-all duration-500 gap-2 ${
            phase !== 'idle' ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <ArrowLeft size={18} className="text-gray-400 flex-shrink-0" />
            <div className="min-w-0">
              <h3 className="font-bold text-base sm:text-lg text-gray-900 truncate">{applicant.name}</h3>
              <p className="text-xs sm:text-sm text-gray-500 truncate">
                {applicant.email} · <span className="hidden sm:inline">{applicant.position}</span><span className="sm:hidden">WINNOW</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-auto sm:ml-0">
            <span
              className={`px-3 sm:px-5 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold border transition-all duration-500 ${
                decided && applicant.decision !== '합격' && applicant.decision !== '불합격'
                  ? 'bg-gray-100 border-gray-300 text-gray-700'
                  : 'border-gray-200 text-gray-600'
              }`}
            >
              검토중
            </span>
            <span
              className={`px-3 sm:px-5 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-500 ${
                decided && applicant.decision === '합격'
                  ? 'bg-green-500 text-white shadow-lg shadow-green-200 scale-110'
                  : 'bg-green-500/20 text-green-700 border border-green-300'
              }`}
            >
              합격
            </span>
            <span
              className={`px-3 sm:px-5 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-500 ${
                decided && applicant.decision === '불합격'
                  ? 'bg-red-500 text-white shadow-lg shadow-red-200 scale-110'
                  : 'border border-gray-200 text-gray-600'
              }`}
            >
              불합격
            </span>
          </div>
        </div>

        {/* ═══ AI 분석 중 표시 ═══ */}
        {phase === 'ai-analyzing' && (
          <div className="flex items-center justify-center gap-2 sm:gap-3 py-6 sm:py-8">
            <Sparkles size={18} className="text-blue-500 animate-pulse" />
            <span className="text-sm sm:text-base font-semibold text-blue-600 animate-pulse">AI가 지원자를 분석하고 있습니다...</span>
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        {/* ═══ Skill / Will 바 (스크린샷 1 상단) ═══ */}
        <div
          className={`px-6 pt-6 pb-4 transition-all duration-700 ${
            ['show-skill-will', 'show-eval-1', 'show-eval-2', 'show-eval-3', 'show-eval-4', 'show-decision', 'click-decision', 'done'].includes(phase)
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <SkillBar
              label="역량 (Skill)"
              level={applicant.skillLevel}
              animate={showBars}
              subtitle="지원자의 직무 관련 역량 수준을 종합적으로 평가한 결과입니다. 실무 경험, 기술 스택, 문제 해결 능력 등을 반영합니다."
            />
            <SkillBar
              label="의지 (Will)"
              level={applicant.willLevel}
              animate={showBars}
              subtitle="지원자의 성장의 의지와 동기 부여 수준을 평가한 결과입니다. 자기 개발 노력, 목표 의식, 열정 등을 반영합니다."
            />
          </div>
        </div>

        {/* ═══ 짚어 볼 만한 역량 평가 테이블 (스크린샷 1 하단) ═══ */}
        <div
          className={`px-6 pb-6 transition-all duration-700 ${
            visibleEvals > 0 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="flex items-center gap-2 mb-4 mt-2">
            <div className="w-1 h-5 bg-gray-900 rounded-full" />
            <h4 className="font-bold text-base text-gray-900">짚어 볼 만한 역량 평가</h4>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden">
            {/* 테이블 헤더 (desktop) */}
            <div className="hidden sm:grid grid-cols-[100px_1fr_60px_1fr] gap-0 bg-gray-50 border-b border-gray-200 px-5 py-3 text-sm font-semibold text-gray-500">
              <div>역량</div>
              <div>근거</div>
              <div className="text-center">수준</div>
              <div>판정</div>
            </div>

            {/* 평가 행 (desktop: grid, mobile: card) */}
            {applicant.evaluations.map((ev, i) => (
              <div
                key={i}
                className={`border-b border-gray-100 last:border-b-0 transition-all duration-500 ${
                  i < visibleEvals ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
                }`}
              >
                {/* Desktop row */}
                <div className="hidden sm:grid grid-cols-[100px_1fr_60px_1fr] gap-0 px-5 py-4 items-start">
                  <div className="font-bold text-sm text-gray-900">{ev.category}</div>
                  <div className="text-sm text-gray-500 leading-relaxed">{ev.basis}</div>
                  <div className="flex justify-center">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${ev.color}`}>
                      {ev.level}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 leading-relaxed">{ev.verdict}</div>
                </div>
                {/* Mobile card */}
                <div className="sm:hidden px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-gray-900">{ev.category}</span>
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${ev.color}`}>
                      {ev.level}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-1">근거: {ev.basis}</p>
                  <p className="text-xs text-gray-600 leading-relaxed">{ev.verdict}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
