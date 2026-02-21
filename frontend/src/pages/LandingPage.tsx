import { ChevronRight, Menu, X, ArrowUp } from 'lucide-react';
import { FONTS } from '@/constants/fonts';
import { useEffect, useRef, useCallback, useState } from 'react';
import { ChatDemo } from '@/components/landing/ChatDemo';
import { ApplicationFlowDemo } from '@/components/landing/ApplicationFlowDemo';
import { AIEvaluationDemo } from '@/components/landing/AIEvaluationDemo';
import { ProductShowcase } from '@/components/landing/ProductShowcase';

interface LandingPageProps {
  onLogin: () => void;
}

export const LandingPage = ({ onLogin }: LandingPageProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);
  const [showTopBtn, setShowTopBtn] = useState(false);
  const [showContactEmail, setShowContactEmail] = useState(false);

  const handleScroll = useCallback(() => {
    if (!progressRef.current) return;
    const totalHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const progress = totalHeight > 0 ? (window.scrollY / totalHeight) * 100 : 0;
    progressRef.current.style.width = `${progress}%`;
    setShowTopBtn(window.scrollY > 400);
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-y-auto scrollbar-hide snap-y snap-proximity" style={{ fontFamily: FONTS.sans, zoom: 0.8 }}>
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
            <img src="/logo.png" alt="WINNOW" className="w-7 h-7 object-contain" />
            <span className="font-extrabold text-xl tracking-tight text-[#111827]">WINNOW</span>
          </div>
          <div className="hidden md:flex items-center gap-10 text-[15px] font-medium text-gray-500">
            <a href="#demos" className="hover:text-blue-600 transition-colors" onClick={(e) => { e.preventDefault(); document.getElementById('demos')?.scrollIntoView({ behavior: 'smooth' }); }}>프로세스</a>
            <button 
              onClick={onLogin}
              className="bg-[#0F172A] text-white px-6 py-2.5 rounded-full hover:bg-black transition-all shadow-lg hover:shadow-xl text-sm font-semibold"
            >
              무료로 시작하기
            </button>
          </div>
          <button className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white/95 backdrop-blur-xl px-6 py-4 space-y-3">
            <a href="#demos" className="block text-[15px] font-medium text-gray-600 hover:text-blue-600 py-2" onClick={(e) => { e.preventDefault(); setMobileMenuOpen(false); document.getElementById('demos')?.scrollIntoView({ behavior: 'smooth' }); }}>프로세스</a>
            <button onClick={() => { onLogin(); setMobileMenuOpen(false); }} className="w-full bg-[#0F172A] text-white px-6 py-2.5 rounded-full hover:bg-black transition-all shadow-lg text-sm font-semibold">
              무료로 시작하기
            </button>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="pt-32 md:pt-40 pb-16 md:pb-24 text-center px-4 relative overflow-hidden">
        {/* Background Glow */}
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-blue-100/40 rounded-full blur-[100px] -z-10 pointer-events-none"></div>

        <h1 className="text-3xl sm:text-4xl md:text-[56px] font-bold mb-6 sm:mb-8 tracking-tight text-slate-900" style={{ lineHeight: '1.6em' }}>
          채용의 <span className="relative inline-block text-gray-300">
            <span className="relative z-10 line-through decoration-gray-400/80 decoration-2">거품</span>
            <span className="absolute inset-0 bg-gray-100 blur-sm rounded-full -z-0 opacity-50"></span>
          </span> 을 걷어내고<br />
          <span className="text-blue-600 relative inline-block">
            핵심 인재
            <svg className="absolute w-full h-3 -bottom-1 left-0 text-blue-200/50 -z-10" viewBox="0 0 100 10" preserveAspectRatio="none"><path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" /></svg>
          </span> 만 남기세요
        </h1>
        <p className="text-gray-500 text-base md:text-lg mb-8 md:mb-12 font-medium">
          수백 개의 이력서를 검토하느라 지치셨나요?
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 mb-16 md:mb-24 px-2">
          <button onClick={onLogin} className="bg-blue-600 text-white px-8 py-3.5 rounded-full font-bold shadow-xl shadow-blue-500/20 hover:bg-blue-700 hover:scale-105 transition-all text-[15px]">
            스크리닝 체험하기
          </button>
          <button onClick={() => setShowContactEmail(!showContactEmail)} className="bg-white border border-gray-200 text-gray-700 px-8 py-3.5 rounded-full font-bold hover:bg-gray-50 hover:border-gray-300 transition-all text-[15px] shadow-sm">
            문의하기
          </button>
        </div>
        {showContactEmail && (
          <div className="mt-[-2rem] mb-8 text-center animate-fade-in">
            <p className="text-gray-600 text-sm">📧 <a href="mailto:gudrbs25781445@gmail.com" className="text-blue-600 font-semibold hover:underline">gudrbs25781445@gmail.com</a> 으로 연락해 주세요!</p>
          </div>
        )}

      </section>

      {/* Interactive Chat Demo Section */}
      <section id="demos" className="scroll-mt-20 py-16 md:py-28 px-4 bg-[#F1F5F9] relative overflow-hidden snap-start">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] bg-blue-100/40 rounded-full blur-[120px] -z-10 pointer-events-none"></div>
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center mb-14">
            <div className="inline-block px-4 py-1.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold mb-5 tracking-wide">
              LIVE DEMO
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-slate-900">
              AI와 대화하면 <span className="text-blue-600">공고가 완성</span>됩니다
            </h2>
            <p className="text-gray-500 text-base max-w-lg mx-auto">
              채팅만으로, AI가 자동으로 모집 공고를 생성합니다.
              실제 동작을 확인해보세요.
            </p>
          </div>
          <div className="pointer-events-none">
            <div className="hidden md:block" style={{ transform: 'scale(0.7)', transformOrigin: 'top center', height: '480px' }}>
              <ChatDemo />
            </div>
            <div className="md:hidden" style={{ transform: 'scale(0.55)', transformOrigin: 'top left', height: '280px' }}>
              <ChatDemo />
            </div>
          </div>
        </div>
      </section>

      {/* Application Flow Demo Section */}
      <section className="py-16 md:py-28 px-4 bg-[#F1F5F9] relative overflow-hidden snap-start">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] bg-purple-100/30 rounded-full blur-[120px] -z-10 pointer-events-none"></div>
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
          <div className="pointer-events-none">
            <div className="min-w-[700px] md:min-w-0">
              <div className="hidden md:block" style={{ transform: 'scale(0.7)', transformOrigin: 'top center', height: '400px' }}>
                <ApplicationFlowDemo />
              </div>
              <div className="md:hidden" style={{ transform: 'scale(0.55)', transformOrigin: 'top left', height: '310px' }}>
                <ApplicationFlowDemo />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Evaluation Demo Section */}
      <section className="py-16 md:py-28 px-4 bg-[#F1F5F9] relative overflow-hidden snap-start">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] bg-green-100/30 rounded-full blur-[120px] -z-10 pointer-events-none"></div>
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
          <div className="pointer-events-none">
            <div className="hidden md:block" style={{ transform: 'scale(0.7)', transformOrigin: 'top center', height: '520px' }}>
              <AIEvaluationDemo />
            </div>
            <div className="md:hidden" style={{ transform: 'scale(0.55)', transformOrigin: 'top left', height: '400px' }}>
              <AIEvaluationDemo />
            </div>
          </div>
        </div>
      </section>

      {/* Product Showcase - PR Sections */}
      <ProductShowcase />

      {/* Dark Feature Section */}
      <section className="py-20 md:py-32 px-4 bg-[#0B1120] text-white relative overflow-hidden">
        <div className="max-w-[1100px] mx-auto relative z-10">
          <h2 className="text-[26px] sm:text-[32px] md:text-[40px] font-bold mb-10 sm:mb-20 leading-tight">
            평가에 필요한 모든 도구를<br />
            <span className="text-blue-500">활용해보세요</span>
          </h2>
          
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {[
                { title: '정교한 평가 지표', desc: '1,000개 이상의 직무 데이터를 기반으로 지원자의 핵심 역량을 정밀하게 분석하세요.', tags: ['직무 적합성', '성장 가능성', '기술 역량'] },
                { title: '간편한 평가 프로세스', desc: 'JD 생성부터 결과 분석까지, 채용의 전 과정을 원스톱으로 관리하세요.', tags: ['JD 생성', '자동화', '대시보드'] },
                { title: '다양한 분야 커버', desc: '개발, 디자인, 마케팅 등 기업에 필요한 모든 직군의 역량을 평가할 수 있습니다.', tags: ['전 직군', '맞춤형', '유연성'] }
            ].map((card, idx) => (
                <div key={idx} className="group relative bg-[#0F172A]/60 border border-slate-800 p-6 sm:p-8 rounded-3xl backdrop-blur-sm hover:border-blue-500/50 hover:bg-[#0F172A] transition-all duration-300">
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
      <section className="py-20 md:py-32 px-4 bg-white">
          <div className="max-w-[1000px] mx-auto bg-[#0F172A] rounded-[24px] md:rounded-[40px] px-6 md:px-8 py-14 md:py-20 text-center text-white relative overflow-hidden shadow-2xl shadow-slate-200">
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

      {/* Scroll to Top Button */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className={`fixed bottom-6 right-6 z-50 w-11 h-11 bg-[#0F172A] text-white rounded-full flex items-center justify-center shadow-lg hover:bg-blue-600 transition-all duration-300 ${
          showTopBtn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
        aria-label="맨 위로 이동"
      >
        <ArrowUp size={18} />
      </button>
    </div>
  );
};
