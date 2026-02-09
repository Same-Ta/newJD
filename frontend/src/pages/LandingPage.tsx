import { ChevronRight } from 'lucide-react';
import { FONTS } from '@/constants/fonts';
import { useEffect, useRef, useCallback } from 'react';
import { ChatDemo } from '@/components/landing/ChatDemo';
import { ApplicationFlowDemo } from '@/components/landing/ApplicationFlowDemo';
import { AIEvaluationDemo } from '@/components/landing/AIEvaluationDemo';

interface LandingPageProps {
  onLogin: () => void;
}

export const LandingPage = ({ onLogin }: LandingPageProps) => {
  const progressRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    if (!progressRef.current) return;
    const totalHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const progress = totalHeight > 0 ? (window.scrollY / totalHeight) * 100 : 0;
    progressRef.current.style.width = `${progress}%`;
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-y-auto scrollbar-hide" style={{ fontFamily: FONTS.sans }}>
      {/* Scroll Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1 bg-gray-100 z-[60]">
        <div 
          ref={progressRef}
          className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-[width] duration-300 ease-out"
          style={{ width: '0%' }}
        ></div>
      </div>

      {/* Header */}
      <header className="fixed top-0 w-full bg-white/70 backdrop-blur-xl z-50 border-b border-gray-100/50 mt-1">
        <div className="max-w-[1200px] mx-auto px-6 h-[72px] flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer">
            <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white font-extrabold text-sm shadow-md shadow-blue-500/30">W</div>
            <span className="font-extrabold text-xl tracking-tight text-[#111827]">WINNOW</span>
          </div>
          <div className="hidden md:flex items-center gap-10 text-[15px] font-medium text-gray-500">
            <a href="#" className="hover:text-blue-600 transition-colors">프로세스</a>
            <a href="#" className="hover:text-blue-600 transition-colors">주요기능</a>
            <button 
              onClick={onLogin}
              className="bg-[#0F172A] text-white px-6 py-2.5 rounded-full hover:bg-black transition-all shadow-lg hover:shadow-xl text-sm font-semibold"
            >
              무료로 시작하기
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-40 pb-24 text-center px-4 relative overflow-hidden">
        {/* Background Glow */}
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-blue-100/40 rounded-full blur-[100px] -z-10 pointer-events-none"></div>

        <h1 className="text-4xl md:text-[56px] font-bold leading-[1.2] mb-8 tracking-tight text-slate-900">
          채용의 <span className="relative inline-block text-gray-300">
            <span className="relative z-10 line-through decoration-gray-400/80 decoration-2">거품</span>
            <span className="absolute inset-0 bg-gray-100 blur-sm rounded-full -z-0 opacity-50"></span>
          </span> 을 걷어내고<br />
          <span className="text-blue-600 relative inline-block">
            핵심 인재
            <svg className="absolute w-full h-3 -bottom-1 left-0 text-blue-200/50 -z-10" viewBox="0 0 100 10" preserveAspectRatio="none"><path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" /></svg>
          </span> 만 남기세요
        </h1>
        <p className="text-gray-500 text-lg mb-12 font-medium">
          수백 개의 이력서를 검토하느라 지치셨나요?
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4 mb-24">
          <button onClick={onLogin} className="bg-blue-600 text-white px-8 py-3.5 rounded-full font-bold shadow-xl shadow-blue-500/20 hover:bg-blue-700 hover:scale-105 transition-all text-[15px]">
            스크리닝 체험하기
          </button>
          <button className="bg-white border border-gray-200 text-gray-700 px-8 py-3.5 rounded-full font-bold hover:bg-gray-50 hover:border-gray-300 transition-all text-[15px] shadow-sm">
            도입 사례 보기
          </button>
        </div>

        {/* Features Section - 3 Steps */}
        <div className="max-w-[1100px] mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-slate-900">
            3단계로 완성하는 <span className="text-blue-600">스마트 채용</span>
          </h2>
          <p className="text-gray-500 text-lg mb-16">
            지원자 관리부터 AI 면접, 분석까지 한 곳에서
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Step 1: 지원자 UI */}
            <div className="group relative h-[420px] rounded-2xl overflow-hidden cursor-pointer hover:scale-[1.02] transition-all duration-300">
              {/* Background with overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-950"></div>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(59,130,246,0.3),transparent_50%)]"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
              
              {/* 실제 UI 미리보기 */}
              <div className="absolute inset-0 p-6 opacity-30">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 h-full">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-white font-bold text-sm">지원자 목록</h4>
                    <div className="flex gap-2">
                      <div className="w-6 h-6 bg-white/20 rounded"></div>
                      <div className="w-6 h-6 bg-white/20 rounded"></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {[92, 88, 85, 82].map((score, i) => (
                      <div key={i} className="bg-white/20 rounded-lg p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-600 rounded-full"></div>
                          <div className="space-y-1">
                            <div className="w-16 h-2 bg-white/60 rounded"></div>
                            <div className="w-24 h-2 bg-white/30 rounded"></div>
                          </div>
                        </div>
                        <div className="bg-blue-600 text-white text-xs px-2 py-1 rounded font-bold">{score}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="relative z-10 h-full flex flex-col justify-between p-8 text-white">
                <div>
                  <div className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium mb-4">
                    인사 · 관리
                  </div>
                  <h3 className="text-2xl font-bold leading-tight mb-3">
                    지원자 목록을<br />
                    한눈에 확인하고<br />
                    효율적으로 관리
                  </h3>
                </div>
                <div className="space-y-1 text-sm text-white/80">
                  <p>실시간 현황 파악 | 상태별 필터링 제공</p>
                </div>
              </div>
            </div>

            {/* Step 2: AI 대화 UI */}
            <div className="group relative h-[420px] rounded-2xl overflow-hidden cursor-pointer hover:scale-[1.02] transition-all duration-300">
              {/* Background with overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-950"></div>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(168,85,247,0.3),transparent_50%)]"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
              
              {/* 실제 채팅 UI 미리보기 */}
              <div className="absolute inset-0 p-6 opacity-30">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 h-full flex flex-col">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/20">
                    <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">AI</div>
                    <div className="text-white font-bold text-sm">WINNOW AI</div>
                  </div>
                  <div className="flex-1 space-y-3 overflow-hidden">
                    <div className="flex gap-2">
                      <div className="w-7 h-7 bg-purple-600 rounded-full flex-shrink-0"></div>
                      <div className="bg-white/20 rounded-2xl rounded-tl-sm px-3 py-2 max-w-[70%]">
                        <div className="w-32 h-2 bg-white/60 rounded mb-1"></div>
                        <div className="w-24 h-2 bg-white/40 rounded"></div>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <div className="bg-purple-600/60 rounded-2xl rounded-tr-sm px-3 py-2 max-w-[70%]">
                        <div className="w-28 h-2 bg-white/80 rounded mb-1"></div>
                        <div className="w-20 h-2 bg-white/60 rounded"></div>
                      </div>
                      <div className="w-7 h-7 bg-white/40 rounded-full flex-shrink-0"></div>
                    </div>
                    <div className="flex gap-2">
                      <div className="w-7 h-7 bg-purple-600 rounded-full flex-shrink-0"></div>
                      <div className="bg-white/20 rounded-2xl rounded-tl-sm px-3 py-2 max-w-[70%]">
                        <div className="w-36 h-2 bg-white/60 rounded"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="relative z-10 h-full flex flex-col justify-between p-8 text-white">
                <div>
                  <div className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium mb-4">
                    AI · 면접
                  </div>
                  <h3 className="text-2xl font-bold leading-tight mb-3">
                    AI와 대화하며<br />
                    지원자를 심층<br />
                    평가하고 분석
                  </h3>
                </div>
                <div className="space-y-1 text-sm text-white/80">
                  <p>자동 질문 생성 | 실시간 답변 분석</p>
                </div>
              </div>
            </div>

            {/* Step 3: 분석 표 */}
            <div className="group relative h-[420px] rounded-2xl overflow-hidden cursor-pointer hover:scale-[1.02] transition-all duration-300">
              {/* Background with overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950"></div>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.2),transparent_50%)]"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
              
              {/* 실제 분석 대시보드 미리보기 */}
              <div className="absolute inset-0 p-6 opacity-30">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 h-full">
                  <h4 className="text-white font-bold text-sm mb-4">지원자 분석</h4>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[{ label: '총 지원', val: '24' }, { label: '서류통과', val: '12' }, { label: '최종', val: '5' }].map((stat, i) => (
                      <div key={i} className="bg-white/20 rounded-lg p-3">
                        <div className="text-white/60 text-xs mb-1">{stat.label}</div>
                        <div className="text-white font-bold text-xl">{stat.val}</div>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <div className="bg-white/10 rounded p-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-green-600 rounded"></div>
                        <div className="w-20 h-2 bg-white/60 rounded"></div>
                      </div>
                      <div className="w-12 h-6 bg-green-600 rounded"></div>
                    </div>
                    <div className="bg-white/10 rounded p-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-blue-600 rounded"></div>
                        <div className="w-16 h-2 bg-white/60 rounded"></div>
                      </div>
                      <div className="w-12 h-6 bg-blue-600 rounded"></div>
                    </div>
                    <div className="bg-white/10 rounded p-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-yellow-600 rounded"></div>
                        <div className="w-24 h-2 bg-white/60 rounded"></div>
                      </div>
                      <div className="w-12 h-6 bg-yellow-600 rounded"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="relative z-10 h-full flex flex-col justify-between p-8 text-white">
                <div>
                  <div className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium mb-4">
                    분석 · 통계
                  </div>
                  <h3 className="text-2xl font-bold leading-tight mb-3">
                    데이터 기반으로<br />
                    지원자를 비교하고<br />
                    최적 인재 선택
                  </h3>
                </div>
                <div className="space-y-1 text-sm text-white/80">
                  <p>종합 분석표 | 시각화된 리포트</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Chat Demo Section */}
      <section className="py-28 px-4 bg-gradient-to-b from-white via-gray-50/50 to-white relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] bg-blue-50/60 rounded-full blur-[120px] -z-10 pointer-events-none"></div>
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center mb-14">
            <div className="inline-block px-4 py-1.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold mb-5 tracking-wide">
              LIVE DEMO
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-slate-900">
              AI와 대화하면 <span className="text-blue-600">공고가 완성</span>됩니다
            </h2>
            <p className="text-gray-500 text-base max-w-lg mx-auto">
              채팅으로 동아리를 소개하면, AI가 자동으로 모집 공고를 생성합니다.
              실제 동작을 확인해보세요.
            </p>
          </div>
          <div style={{ transform: 'scale(0.75)', transformOrigin: 'top center' }}>
            <ChatDemo />
          </div>
        </div>
      </section>

      {/* Application Flow Demo Section */}
      <section className="py-28 px-4 bg-gradient-to-b from-white via-gray-50/30 to-white relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] bg-purple-50/40 rounded-full blur-[120px] -z-10 pointer-events-none"></div>
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center mb-14">
            <div className="inline-block px-4 py-1.5 bg-purple-100 text-purple-700 rounded-full text-xs font-bold mb-5 tracking-wide">
              APPLICATION FLOW
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-slate-900">
              공고 게시부터 <span className="text-blue-600">지원자 관리</span>까지
            </h2>
            <p className="text-gray-500 text-base max-w-lg mx-auto">
              공고를 게시하고 링크를 공유하면, 지원자가 체크리스트를 작성하고 대시보드에서 바로 확인됩니다.
            </p>
          </div>
          <div style={{ transform: 'scale(0.75)', transformOrigin: 'top center' }}>
            <ApplicationFlowDemo />
          </div>
        </div>
      </section>

      {/* AI Evaluation Demo Section */}
      <section className="py-28 px-4 bg-gradient-to-b from-white via-gray-50/30 to-white relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] bg-green-50/40 rounded-full blur-[120px] -z-10 pointer-events-none"></div>
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center mb-14">
            <div className="inline-block px-4 py-1.5 bg-green-100 text-green-700 rounded-full text-xs font-bold mb-5 tracking-wide">
              AI EVALUATION
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-slate-900">
              AI로 분석하고 <span className="text-blue-600">합격을 결정</span>하세요
            </h2>
            <p className="text-gray-500 text-base max-w-lg mx-auto">
              지원자별 역량과 의지를 AI가 자동으로 평가합니다. 한눈에 비교하고 간편하게 합격/불합격을 관리하세요.
            </p>
          </div>
          <div style={{ transform: 'scale(0.75)', transformOrigin: 'top center' }}>
            <AIEvaluationDemo />
          </div>
        </div>
      </section>

      {/* Dark Feature Section */}
      <section className="bg-[#020617] text-white py-32 px-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-900 to-transparent opacity-50"></div>
        
        <div className="max-w-[1100px] mx-auto relative z-10">
          <h2 className="text-[32px] md:text-[40px] font-bold mb-20 leading-tight">
            평가에 필요한 모든 도구를<br />
            <span className="text-blue-500">활용해보세요</span>
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            {[
                { title: '정교한 평가 지표', desc: '1,000개 이상의 직무 데이터를 기반으로 지원자의 핵심 역량을 정밀하게 분석하세요.', tags: ['직무 적합성', '성장 가능성', '기술 역량'] },
                { title: '간편한 평가 프로세스', desc: 'JD 생성부터 결과 분석까지, 채용의 전 과정을 원스톱으로 관리하세요.', tags: ['JD 생성', '자동화', '대시보드'] },
                { title: '다양한 분야 커버', desc: '개발, 디자인, 마케팅 등 기업에 필요한 모든 직군의 역량을 평가할 수 있습니다.', tags: ['전 직군', '맞춤형', '유연성'] }
            ].map((card, idx) => (
                <div key={idx} className="group bg-[#0F172A]/60 border border-slate-800 p-8 rounded-3xl backdrop-blur-sm hover:border-blue-500/50 hover:bg-[#0F172A] transition-all duration-300">
                    <h3 className="text-xl font-bold mb-3 group-hover:text-blue-400 transition-colors">{card.title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed mb-8 h-12">{card.desc}</p>
                    <div className="flex flex-wrap gap-2">
                        {card.tags.map(tag => (
                             <span key={tag} className="text-[11px] font-medium bg-slate-800 text-slate-300 px-2.5 py-1 rounded border border-slate-700 group-hover:border-blue-500/30 transition-colors">{tag}</span>
                        ))}
                    </div>
                    <div className="absolute bottom-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full blur-2xl group-hover:bg-blue-600/20 transition-all pointer-events-none"></div>
                </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-32 px-4 bg-white">
          <div className="max-w-[1000px] mx-auto bg-[#0F172A] rounded-[40px] px-8 py-20 text-center text-white relative overflow-hidden shadow-2xl shadow-slate-200">
              <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
              <div className="relative z-10 flex flex-col items-center">
                <h2 className="text-3xl md:text-4xl font-bold mb-6 leading-tight">채용의 새로운 기준을<br/>만들어보세요</h2>
                <p className="text-slate-400 mb-10 text-sm md:text-base font-light">초기 설정 비용 0원. 지금 바로 우리 회사에 딱 맞는 인재 풀을 확인하실 수 있습니다.</p>
                <button onClick={onLogin} className="bg-white text-slate-900 px-10 py-4 rounded-full font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2 group shadow-xl">
                    지금 무료로 시작하기 
                    <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
          </div>
      </section>
      
      <footer className="py-12 border-t border-gray-100 text-center text-[11px] text-gray-400 bg-gray-50 uppercase tracking-wider font-medium">
          WINNOW © 2026 Winnow Inc. All rights reserved.
      </footer>
    </div>
  );
};
