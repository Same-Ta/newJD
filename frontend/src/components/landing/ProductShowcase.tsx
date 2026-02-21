import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

/* ───────── 카운트업 애니메이션 훅 ───────── */
function useCountUp(end: number, duration = 2000, suffix = '') {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !started) setStarted(true); },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    let start = 0;
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [started, end, duration]);

  return { count, suffix, ref };
}

/* ───────── 스크롤 페이드인 훅 ───────── */
function useFadeIn() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.15 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return { ref, visible };
}

/* ───────────────────────────────────────── */
/*            1. 임팩트 수치 밴드             */
/* ───────────────────────────────────────── */
function ImpactStatsBand() {
  const s1 = useCountUp(85, 2000);
  const s2 = useCountUp(60, 2000);
  const s3 = useCountUp(3, 1400);
  const s4 = useCountUp(95, 2200);

  const stats = [
    { ...s1, label: '1차 스크리닝 효율', unit: '%', accent: 'text-blue-400' },
    { ...s2, label: '채용 리드타임 단축', unit: '%', accent: 'text-purple-400' },
    { ...s3, label: '공고 작성 시간', unit: '분', accent: 'text-emerald-400' },
    { ...s4, label: '사용자 만족도', unit: '%', accent: 'text-amber-400' },
  ];

  return (
    <section className="relative py-20 md:py-28 bg-[#020617] overflow-hidden">
      {/* 배경 그래디언트 글로우 */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-[1100px] mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <div className="inline-block px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full text-xs font-bold mb-5 tracking-widest uppercase">
            Proven Results
          </div>
          <h2 className="text-3xl md:text-[44px] font-extrabold text-white leading-tight mb-4">
            숫자로 증명하는<br />
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">WINNOW의 성과</span>
          </h2>
          <p className="text-slate-400 text-base md:text-lg max-w-md mx-auto">
            데이터가 말해주는 채용 프로세스의 변화
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {stats.map((stat, i) => (
            <div
              key={i}
              ref={stat.ref}
              className="group relative bg-slate-900/60 border border-slate-800 rounded-2xl p-6 md:p-8 text-center hover:border-slate-700 transition-all duration-500"
            >
              <div className="text-4xl md:text-5xl font-black text-white mb-2 tabular-nums">
                {stat.count}<span className={`text-2xl md:text-3xl ${stat.accent}`}>{stat.unit}</span>
              </div>
              <p className="text-slate-400 text-sm font-medium">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────────────────── */
/*     2. Before / After 비교 테이블          */
/* ───────────────────────────────────────── */
function BeforeAfterComparison() {
  const fade = useFadeIn();

  const rows = [
    { category: '채용공고 작성', before: '2시간 이상 소요, 매번 처음부터', after: 'AI 대화로 3분 만에 완성' },
    { category: '1차 스크리닝', before: '이력서 수백 건 수동 검토', after: 'AI 자동 평가 + 점수 랭킹' },
    { category: '지원자 관리', before: '엑셀, 메일로 분산 관리', after: '실시간 대시보드에서 통합 관리' },
    { category: '채용 리드타임', before: '평균 30일 이상', after: '평균 12일로 60% 단축' },
    { category: '평가 일관성', before: '평가자마다 기준이 다름', after: 'AI 기반 객관적 평가 지표 제공' },
    { category: '채용 리포트', before: '수동으로 데이터 취합 및 보고', after: '실시간 분석 + 자동 리포트 생성' },
  ];

  return (
    <section className="py-20 md:py-32 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-50/50 rounded-full blur-[100px] -z-10" />

      <div
        ref={fade.ref}
        className={`max-w-[1000px] mx-auto px-4 transition-all duration-700 ${
          fade.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
        }`}
      >
        <div className="text-center mb-14">
          <div className="inline-block px-4 py-1.5 bg-slate-100 text-slate-600 rounded-full text-xs font-bold mb-5 tracking-widest uppercase">
            Comparison
          </div>
          <h2 className="text-3xl md:text-[44px] font-extrabold text-slate-900 leading-tight mb-4">
            직접 비교해보세요<br />
            <span className="text-blue-600">확실히 다릅니다</span>
          </h2>
        </div>

        {/* 테이블 */}
        <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-xl shadow-gray-100/80">
          {/* 헤더 */}
          <div className="grid grid-cols-[1fr_1.2fr_1.2fr] border-b border-gray-100">
            <div className="p-4 md:p-6" />
            <div className="p-4 md:p-6 text-center border-l border-gray-100">
              <div className="inline-flex items-center gap-2 bg-red-50 border border-red-100 px-3 py-1.5 rounded-full">
                <div className="w-5 h-5 bg-red-200 rounded-full" />
                <span className="text-red-600 text-xs font-bold">기존 방식</span>
              </div>
            </div>
            <div className="p-4 md:p-6 text-center border-l border-gray-100 bg-blue-50/30">
              <div className="inline-flex items-center gap-2 bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-full">
                <img src="/logo.png" alt="WINNOW" className="w-5 h-5 object-contain" />
                <span className="text-blue-700 text-xs font-bold">WINNOW</span>
              </div>
            </div>
          </div>

          {/* 행 */}
          {rows.map((row, i) => (
            <div
              key={i}
              className={`grid grid-cols-[1fr_1.2fr_1.2fr] ${i !== rows.length - 1 ? 'border-b border-gray-100' : ''} hover:bg-gray-50/50 transition-colors`}
            >
              <div className="p-4 md:p-5 flex items-center">
                <span className="text-slate-800 text-xs md:text-sm font-bold">{row.category}</span>
              </div>
              <div className="p-4 md:p-5 border-l border-gray-100 flex items-center gap-2">
                <XCircle size={14} className="text-red-400 flex-shrink-0" />
                <span className="text-slate-500 text-xs md:text-sm leading-snug">{row.before}</span>
              </div>
              <div className="p-4 md:p-5 border-l border-gray-100 bg-blue-50/20 flex items-center gap-2">
                <CheckCircle2 size={14} className="text-blue-500 flex-shrink-0" />
                <span className="text-slate-700 text-xs md:text-sm font-medium leading-snug">{row.after}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
/* ───────────────────────────────────────── */
/*      4. 핵심 강점 카드 (기능 하이라이트)    */
/* ───────────────────────────────────────── */
function FeatureHighlights() {
  const fade = useFadeIn();

  const features = [
    {
      title: 'AI 공고 작성',
      desc: '대화만으로 직무 기술서부터 평가 기준까지 자동 생성. 매번 새로 작성할 필요 없습니다.',
      stat: '3분',
      statLabel: '평균 작성 시간',
      accent: 'text-blue-600',
      border: 'hover:border-blue-200',
    },
    {
      title: '자동 스크리닝',
      desc: '지원자의 체크리스트 응답을 AI가 분석하여 적합도 점수를 자동 산출합니다.',
      stat: '85%',
      statLabel: '스크리닝 정확도',
      accent: 'text-purple-600',
      border: 'hover:border-purple-200',
    },
    {
      title: '통합 지원자 관리',
      desc: '지원부터 최종 합격까지 한 곳에서. 상태 변경, 메모, 피드백 모두 실시간 관리.',
      stat: '100%',
      statLabel: '프로세스 통합',
      accent: 'text-emerald-600',
      border: 'hover:border-emerald-200',
    },
    {
      title: '데이터 보안',
      desc: 'AES-256 암호화로 지원자 개인정보를 안전하게 보호. 기업 보안 기준 충족.',
      stat: 'AES-256',
      statLabel: '암호화 수준',
      accent: 'text-amber-600',
      border: 'hover:border-amber-200',
    },
  ];

  return (
    <section className="py-20 md:py-32 bg-white relative overflow-hidden">
      <div
        ref={fade.ref}
        className={`max-w-[1100px] mx-auto px-4 transition-all duration-700 ${
          fade.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
        }`}
      >
        <div className="text-center mb-16">
          <div className="inline-block px-4 py-1.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold mb-5 tracking-widest uppercase">
            Key Features
          </div>
          <h2 className="text-3xl md:text-[44px] font-extrabold text-slate-900 leading-tight mb-4">
            채용 담당자를 위한<br />
            <span className="text-blue-600">올인원 솔루션</span>
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 gap-5 md:gap-6">
          {features.map((f, i) => (
            <div
              key={i}
              className={`group relative bg-white border border-gray-200 rounded-2xl p-7 md:p-8 ${f.border} hover:shadow-lg transition-all duration-300`}
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className={`text-lg font-bold text-slate-900 group-hover:${f.accent} transition-colors`}>{f.title}</h3>
                <div className="text-right flex-shrink-0 ml-4">
                  <div className={`text-2xl font-black ${f.accent}`}>{f.stat}</div>
                  <div className="text-[10px] text-slate-400 font-medium">{f.statLabel}</div>
                </div>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
/* ───────── 메인 익스포트 ───────── */
export function ProductShowcase() {
  return (
    <>
      <ImpactStatsBand />
      <BeforeAfterComparison />
      <FeatureHighlights />
    </>
  );
}
