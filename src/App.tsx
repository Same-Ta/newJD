import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Settings, 
  LogOut, 
  CheckCircle2, 
  MessageSquare,
} from 'lucide-react';
import { FONTS } from '@/constants/fonts';
import { FunnelCSS } from '@/components/common/FunnelCSS';
import { SidebarItem } from '@/components/common/SidebarItem';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/LoginPage';
import { SignUpPage } from '@/pages/SignUpPage';
import { DashboardHome } from '@/pages/Dashboard/DashboardHome';
import { JDDetail } from '@/pages/Dashboard/JDDetail';
import { ApplicantAnalytics } from '@/pages/Dashboard/ApplicantAnalytics';
import { ApplicantList } from '@/pages/Dashboard/ApplicantList';
import { ChatInterface } from '@/pages/Dashboard/ChatInterface';
import { MyJDsPage } from '@/pages/Dashboard/MyJDsPage';
import { auth } from '@/config/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

const App = () => {
  const [currentPage, setCurrentPage] = useState('landing');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [selectedJdId, setSelectedJdId] = useState<string | undefined>(undefined);
  const [init, setInit] = useState(false);

  // Firebase Auth 상태 감지
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log('로그인 상태 확인:', user.email);
        setIsLoggedIn(true);
        // 로그인되어 있고 landing 페이지에 있다면 dashboard로 이동
        if (currentPage === 'landing') {
          setCurrentPage('dashboard');
        }
      } else {
        console.log('로그인 되지 않은 상태');
        setIsLoggedIn(false);
        // JD 상세 페이지가 아닌 경우에만 landing으로 이동
        if (currentPage !== 'jd-detail' && currentPage !== 'login' && currentPage !== 'signup') {
          setCurrentPage('landing');
        }
      }
      setInit(true);
    });

    return () => unsubscribe();
  }, []);

  // URL 해시를 통한 공개 링크 처리
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      // #/jd/[id] 형식의 URL 처리
      if (hash.startsWith('#/jd/')) {
        const jdId = hash.replace('#/jd/', '');
        console.log('공개 JD 링크 접근:', jdId);
        setSelectedJdId(jdId);
        setCurrentPage('jd-detail');
      }
    };

    // 초기 로드 시 체크
    handleHashChange();
    
    // 해시 변경 감지
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleLogin = () => {
    setIsLoggedIn(true);
    setCurrentPage('dashboard');
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsLoggedIn(false);
      setCurrentPage('landing');
    } catch (error) {
      console.error('로그아웃 오류:', error);
    }
  };

  const handleNavigateToJD = (jdId: string) => {
    setSelectedJdId(jdId);
    setCurrentPage('jd-detail');
  };

  const renderContent = () => {
    switch(currentPage) {
        case 'dashboard': return <DashboardHome onNavigate={setCurrentPage} />;
        case 'my-jds': return <MyJDsPage onNavigate={setCurrentPage} onNavigateToJD={handleNavigateToJD} />;
        case 'jd-detail': return <JDDetail jdId={selectedJdId} onNavigate={setCurrentPage} />;
        case 'analytics': return <ApplicantAnalytics />;
        case 'applicants': 
          return (
            <div className="space-y-4 max-w-[1200px] mx-auto">
              <h2 className="text-2xl font-bold mb-4">지원자 관리</h2>
              <ApplicantList />
            </div>
          );
        case 'chat': return <ChatInterface onNavigate={setCurrentPage} />;
        default: return <DashboardHome onNavigate={setCurrentPage} />;
    }
  };

  // 초기화 중 로딩 화면
  if (!init) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center" style={{ fontFamily: FONTS.sans }}>
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-extrabold text-2xl shadow-lg shadow-blue-500/30 mx-auto mb-6 animate-pulse">W</div>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // 공개 라우트: JD 상세 페이지 (로그인 불필요)
  if (currentPage === 'jd-detail') {
    return (
      <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: FONTS.sans }}>
        <FunnelCSS />
        {/* 간단한 헤더 */}
        <header className="bg-white border-b border-gray-100 px-6 h-16 flex items-center justify-between fixed w-full z-10 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-extrabold text-sm shadow-md shadow-blue-500/20">W</div>
            <span className="font-extrabold text-[19px] text-gray-900 tracking-tight">WINNOW</span>
          </div>
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <button 
                onClick={() => setCurrentPage('my-jds')}
                className="px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                내 공고로 이동
              </button>
            ) : (
              <button 
                onClick={() => setCurrentPage('login')}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                로그인
              </button>
            )}
          </div>
        </header>
        <main className="pt-16">
          <JDDetail jdId={selectedJdId} onNavigate={setCurrentPage} />
        </main>
      </div>
    );
  }

  if (!isLoggedIn) {
      if (currentPage === 'signup') {
        return <SignUpPage onLogin={handleLogin} onNavigateToLogin={() => setCurrentPage('login')} />;
      }
      if (currentPage === 'login') {
        return <LoginPage onLogin={handleLogin} onNavigateToSignUp={() => setCurrentPage('signup')} />;
      }
      return <LandingPage onLogin={() => setCurrentPage('login')} />;
  }

  // Dashboard Layout
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex" style={{ fontFamily: FONTS.sans }}>
      <FunnelCSS />
      
      {/* Sidebar */}
      <aside className="w-[260px] bg-white border-r border-gray-100 fixed h-full z-20 hidden md:flex flex-col shadow-[2px_0_20px_rgba(0,0,0,0.02)]">
        <div className="px-6 h-20 flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-extrabold text-sm shadow-md shadow-blue-500/20">W</div>
            <span className="font-extrabold text-[19px] text-gray-900 tracking-tight">WINNOW</span>
        </div>

        <div className="px-3 space-y-1 flex-1 overflow-y-auto">
            <div className="text-[11px] font-bold text-gray-400 px-4 mb-2 mt-4 uppercase tracking-wider">채용 관리</div>
            <SidebarItem 
                icon={LayoutDashboard} 
                label="대시보드" 
                active={currentPage === 'dashboard'} 
                onClick={() => setCurrentPage('dashboard')} 
            />
            <SidebarItem 
                icon={FileText} 
                label="내 JD 목록" 
                active={currentPage === 'my-jds'} 
                onClick={() => setCurrentPage('my-jds')} 
            />
            <SidebarItem 
                icon={Users} 
                label="지원자 현황" 
                active={currentPage === 'analytics'} 
                onClick={() => setCurrentPage('analytics')} 
            />
            <SidebarItem 
                icon={CheckCircle2} 
                label="지원자 관리" 
                active={currentPage === 'applicants'} 
                onClick={() => setCurrentPage('applicants')} 
            />
             <SidebarItem 
                icon={MessageSquare} 
                label="JD 생성 (AI)" 
                active={currentPage === 'chat'} 
                onClick={() => setCurrentPage('chat')} 
            />
        </div>

        <div className="px-3 pb-6">
             <div className="text-[11px] font-bold text-gray-400 px-4 mb-2 uppercase tracking-wider">내 정보</div>
             <SidebarItem icon={Settings} label="계정 설정" active={false} onClick={() => {}} />
             <div className="mt-4 px-4 pt-5 border-t border-gray-50">
                 <div className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer group">
                     <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs border border-blue-200">KH</div>
                     <div className="flex-1 min-w-0">
                         <div className="text-[13px] font-bold text-gray-800 truncate">김윈노</div>
                         <div className="text-[11px] text-gray-400 truncate">guest@winnow.ai</div>
                     </div>
                     <LogOut size={16} className="text-gray-300 group-hover:text-red-500 transition-colors" onClick={(e) => { e.stopPropagation(); handleLogout(); }}/>
                 </div>
             </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-[260px] min-w-0 bg-[#F8FAFC]">
          <div className="p-8 pb-20 h-screen overflow-y-auto scroll-smooth">
              {renderContent()}
          </div>
      </main>
    </div>
  );
};

export default App;
