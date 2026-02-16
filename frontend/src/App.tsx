import { useState, useEffect, lazy, Suspense } from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  Settings, 
  LogOut, 
  CheckCircle2, 
  MessageSquare,
  Users,
  Menu,
  X,
} from 'lucide-react';
import { FONTS } from '@/constants/fonts';
import { FunnelCSS } from '@/components/common/FunnelCSS';
import { SidebarItem } from '@/components/common/SidebarItem';
import { auth } from '@/config/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { clearAuthCache } from '@/services/api';

// Lazy load all page components for code splitting
const LandingPage = lazy(() => import('@/pages/LandingPage').then(m => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import('@/pages/LoginPage').then(m => ({ default: m.LoginPage })));
const SignUpPage = lazy(() => import('@/pages/SignUpPage').then(m => ({ default: m.SignUpPage })));
const DashboardHome = lazy(() => import('@/pages/Dashboard/DashboardHome').then(m => ({ default: m.DashboardHome })));
const JDDetail = lazy(() => import('@/pages/Dashboard/JDDetail').then(m => ({ default: m.JDDetail })));
const ApplicantList = lazy(() => import('@/pages/Dashboard/ApplicantList').then(m => ({ default: m.ApplicantList })));
const ApplicantDetail = lazy(() => import('@/pages/Dashboard/ApplicantDetail').then(m => ({ default: m.ApplicantDetail })));
const ChatInterface = lazy(() => import('@/pages/Dashboard/ChatInterface').then(m => ({ default: m.ChatInterface })));
const MyJDsPage = lazy(() => import('@/pages/Dashboard/MyJDsPage').then(m => ({ default: m.MyJDsPage })));
const AccountSettings = lazy(() => import('@/pages/Dashboard/AccountSettings').then(m => ({ default: m.AccountSettings })));
const TeamManagement = lazy(() => import('@/pages/Dashboard/TeamManagement').then(m => ({ default: m.TeamManagement })));

// Suspense fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <div className="text-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
      <p className="text-gray-400 text-sm">불러오는 중...</p>
    </div>
  </div>
);

const App = () => {
  // URL에서 공고 ID 추출 함수
  const getJdIdFromUrl = () => {
    // 1. 해시 라우팅 확인
    const hash = window.location.hash;
    if (hash.startsWith('#/jd/')) {
      return hash.replace('#/jd/', '');
    }
    
    // 2. 경로 라우팅 확인
    const pathname = window.location.pathname;
    const pathMatch = pathname.match(/^\/jd\/([^\/]+)/);
    if (pathMatch) {
      return pathMatch[1];
    }
    
    // 3. 쿼리 파라미터 확인
    const params = new URLSearchParams(window.location.search);
    const jdIdParam = params.get('jdId');
    if (jdIdParam) {
      return jdIdParam;
    }
    
    return null;
  };

  const [currentPage, setCurrentPage] = useState('landing');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [selectedJdId, setSelectedJdId] = useState<string | undefined>(undefined);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | undefined>(undefined);
  const [init, setInit] = useState(false);
  const [userName, setUserName] = useState('채용 담당자');
  const [userEmail, setUserEmail] = useState('');
  const [userInitials, setUserInitials] = useState('U');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // 초기 URL 확인
  const initialJdId = getJdIdFromUrl();

  useEffect(() => {
    if (initialJdId && !selectedJdId) {
      setSelectedJdId(initialJdId);
      setCurrentPage('jd-detail');
    }
  }, []);

  // Firebase Auth 상태 감지
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log('로그인 상태 확인:', user.email);
        setIsLoggedIn(true);
        
        // 사용자 정보 설정
        const name = user.displayName || user.email?.split('@')[0] || '채용 담당자';
        setUserName(name);
        setUserEmail(user.email || '');
        
        // 이니셜 생성 (이름의 첫 글자 또는 이메일의 첫 두 글자)
        if (user.displayName) {
          setUserInitials(user.displayName.substring(0, 1).toUpperCase());
        } else if (user.email) {
          setUserInitials(user.email.substring(0, 2).toUpperCase());
        }
        
        // 로그인되어 있고 landing 페이지에 있으며 공고 상세 페이지가 아닐 때만 dashboard로 이동
        if (currentPage === 'landing' && !getJdIdFromUrl()) {
          setCurrentPage('dashboard');
          window.history.replaceState({ page: 'dashboard' }, '');
        }
      } else {
        console.log('로그인 되지 않은 상태');
        setIsLoggedIn(false);
        setUserName('');
        setUserEmail('');
        clearAuthCache();
        // 공고 상세 페이지가 아닌 경우에만 landing으로 이동
        if (currentPage !== 'jd-detail' && currentPage !== 'login' && currentPage !== 'signup') {
          setCurrentPage('landing');
          window.history.replaceState({ page: 'landing' }, '');
        }
      }
      setInit(true);
    });

    return () => unsubscribe();
  }, [currentPage]);

  // URL 변경 감지 및 공개 링크 처리
  useEffect(() => {
    const handleUrlChange = () => {
      const jdId = getJdIdFromUrl();
      if (jdId) {
        console.log('공개 공고 링크 접근:', jdId);
        setSelectedJdId(jdId);
        setCurrentPage('jd-detail');
      }
    };

    // 초기 로드 시 체크
    handleUrlChange();
    
    // 해시 변경 감지
    window.addEventListener('hashchange', handleUrlChange);
    
    return () => {
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  // 브라우저 뒤로가기/앞으로가기 처리
  useEffect(() => {
    // 현재 페이지를 히스토리 초기 상태로 설정
    window.history.replaceState({ page: currentPage }, '');

    const handlePopState = (e: PopStateEvent) => {
      const state = e.state;
      if (state?.page) {
        setCurrentPage(state.page);
        if (state.jdId) setSelectedJdId(state.jdId);
        if (state.applicationId) setSelectedApplicationId(state.applicationId);
      } else {
        // URL에서 JD ID 확인 (공개 링크 지원)
        const jdId = getJdIdFromUrl();
        if (jdId) {
          setSelectedJdId(jdId);
          setCurrentPage('jd-detail');
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // 페이지 내비게이션 (브라우저 히스토리에 기록)
  const navigateTo = (page: string) => {
    window.history.pushState({ page }, '');
    setCurrentPage(page);
  };

  const handleLogin = () => {
    setIsLoggedIn(true);
    navigateTo('dashboard');
  };

  const handleLogout = async () => {
    try {
      clearAuthCache();
      await signOut(auth);
      setIsLoggedIn(false);
      navigateTo('landing');
    } catch (error) {
      console.error('로그아웃 오류:', error);
    }
  };

  const handleNavigateToJD = (jdId: string) => {
    setSelectedJdId(jdId);
    window.history.pushState({ page: 'jd-detail', jdId }, '');
    setCurrentPage('jd-detail');
  };

  const renderContent = () => {
    const content = (() => {
      switch(currentPage) {
          case 'dashboard': return <DashboardHome onNavigate={navigateTo} onNavigateToJD={handleNavigateToJD} />;
          case 'my-jds': return <MyJDsPage onNavigate={navigateTo} onNavigateToJD={handleNavigateToJD} />;
          case 'jd-detail': return <JDDetail jdId={selectedJdId} onNavigate={navigateTo} />;
          case 'applicant-detail':
            return (
              <ApplicantDetail
                applicationId={selectedApplicationId!}
                onBack={() => navigateTo('applicants')}
              />
            );
          case 'applicants': 
            return (
              <div className="space-y-4 max-w-[1200px] mx-auto">
                <h2 className="text-2xl font-bold mb-4">지원자 관리</h2>
                <ApplicantList onNavigateToApplicant={(id) => {
                  setSelectedApplicationId(id);
                  window.history.pushState({ page: 'applicant-detail', applicationId: id }, '');
                  setCurrentPage('applicant-detail');
                }} />
              </div>
            );
          case 'chat': return <ChatInterface onNavigate={navigateTo} />;
          case 'team': return <TeamManagement onNavigate={navigateTo} />;
          case 'settings': return <AccountSettings />;
          default: return <DashboardHome onNavigate={navigateTo} onNavigateToJD={(jdId) => console.log('Navigate to 공고:', jdId)} />;
      }
    })();
    return <Suspense fallback={<PageLoader />}>{content}</Suspense>;
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

  // 공개 라우트: 공고 상세 페이지 (로그인 불필요)
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
                onClick={() => navigateTo('my-jds')}
                className="px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                내 공고로 이동
              </button>
            ) : (
              <button 
                onClick={() => navigateTo('login')}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                로그인
              </button>
            )}
          </div>
        </header>
        <main className="pt-16">
          <Suspense fallback={<PageLoader />}>
            <JDDetail jdId={selectedJdId} onNavigate={navigateTo} />
          </Suspense>
        </main>
      </div>
    );
  }

  if (!isLoggedIn) {
      if (currentPage === 'signup') {
        return <Suspense fallback={<PageLoader />}><SignUpPage onLogin={handleLogin} onNavigateToLogin={() => navigateTo('login')} /></Suspense>;
      }
      if (currentPage === 'login') {
        return <Suspense fallback={<PageLoader />}><LoginPage 
          onLogin={handleLogin} 
          onNavigateToSignUp={() => navigateTo('signup')}
          onBackToLanding={() => navigateTo('landing')}
        /></Suspense>;
      }
      return <Suspense fallback={<PageLoader />}><LandingPage onLogin={() => navigateTo('login')} /></Suspense>;
  }

  // Dashboard Layout
  return (
    <div className="h-screen bg-[#F8FAFC] flex overflow-hidden" style={{ fontFamily: FONTS.sans }}>
      <FunnelCSS />

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-100 h-14 flex items-center justify-between px-4 z-30 shadow-sm">
        <div className="flex items-center gap-2">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <Menu size={22} className="text-gray-700" />
          </button>
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-white font-extrabold text-xs shadow-md shadow-blue-500/20">W</div>
          <span className="font-extrabold text-[17px] text-gray-900 tracking-tight">WINNOW</span>
        </div>
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-[10px] border border-blue-200">{userInitials}</div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-[280px] bg-white h-full flex flex-col shadow-xl z-50 animate-slideIn">
            <div className="px-5 h-16 flex items-center justify-between flex-shrink-0 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-white font-extrabold text-xs shadow-md shadow-blue-500/20">W</div>
                <span className="font-extrabold text-[17px] text-gray-900 tracking-tight">WINNOW</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="px-3 space-y-1 flex-1 overflow-y-auto pt-4">
              <div className="text-[11px] font-bold text-gray-400 px-4 mb-2 uppercase tracking-wider">채용 관리</div>
              <SidebarItem icon={LayoutDashboard} label="대시보드" active={currentPage === 'dashboard'} onClick={() => { navigateTo('dashboard'); setSidebarOpen(false); }} />
              <SidebarItem icon={FileText} label="내 공고 목록" active={currentPage === 'my-jds'} onClick={() => { navigateTo('my-jds'); setSidebarOpen(false); }} />
              <SidebarItem icon={CheckCircle2} label="지원자 관리" active={currentPage === 'applicants'} onClick={() => { navigateTo('applicants'); setSidebarOpen(false); }} />
              <SidebarItem icon={MessageSquare} label="공고 생성 (AI)" active={currentPage === 'chat'} onClick={() => { navigateTo('chat'); setSidebarOpen(false); }} />
            </div>
            <div className="px-3 pb-6">
              <div className="text-[11px] font-bold text-gray-400 px-4 mb-2 uppercase tracking-wider">내 정보</div>
              <SidebarItem icon={Users} label="팀 관리" active={currentPage === 'team'} onClick={() => { navigateTo('team'); setSidebarOpen(false); }} />
              <SidebarItem icon={Settings} label="계정 설정" active={currentPage === 'settings'} onClick={() => { navigateTo('settings'); setSidebarOpen(false); }} />
              <div className="mt-4 px-4 pt-5 border-t border-gray-50">
                <div className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer group">
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs border border-blue-200">{userInitials}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-bold text-gray-800 truncate">{userName}</div>
                    <div className="text-[11px] text-gray-400 truncate">{userEmail}</div>
                  </div>
                  <LogOut size={16} className="text-gray-300 group-hover:text-red-500 transition-colors" onClick={(e) => { e.stopPropagation(); handleLogout(); }}/>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Desktop Sidebar */}
      <aside className="w-[260px] bg-white border-r border-gray-100 h-screen z-20 hidden md:flex flex-col shadow-[2px_0_20px_rgba(0,0,0,0.02)]">
        <div className="px-6 h-20 flex items-center gap-2.5 mb-2 flex-shrink-0">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-extrabold text-sm shadow-md shadow-blue-500/20">W</div>
            <span className="font-extrabold text-[19px] text-gray-900 tracking-tight">WINNOW</span>
        </div>

        <div className="px-3 space-y-1 flex-1 overflow-y-auto">
            <div className="text-[11px] font-bold text-gray-400 px-4 mb-2 mt-4 uppercase tracking-wider">채용 관리</div>
            <SidebarItem 
                icon={LayoutDashboard} 
                label="대시보드" 
                active={currentPage === 'dashboard'} 
                onClick={() => navigateTo('dashboard')} 
            />
            <SidebarItem 
                icon={FileText} 
                label="내 공고 목록" 
                active={currentPage === 'my-jds'} 
                onClick={() => navigateTo('my-jds')} 
            />
            <SidebarItem 
                icon={CheckCircle2} 
                label="지원자 관리" 
                active={currentPage === 'applicants'} 
                onClick={() => navigateTo('applicants')} 
            />
             <SidebarItem 
                icon={MessageSquare} 
                label="공고 생성 (AI)" 
                active={currentPage === 'chat'} 
                onClick={() => navigateTo('chat')} 
            />
        </div>

        <div className="px-3 pb-6">
             <div className="text-[11px] font-bold text-gray-400 px-4 mb-2 uppercase tracking-wider">내 정보</div>
             <SidebarItem icon={Users} label="팀 관리" active={currentPage === 'team'} onClick={() => navigateTo('team')} />
             <SidebarItem icon={Settings} label="계정 설정" active={currentPage === 'settings'} onClick={() => navigateTo('settings')} />
             <div className="mt-4 px-4 pt-5 border-t border-gray-50">
                 <div className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer group">
                     <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs border border-blue-200">{userInitials}</div>
                     <div className="flex-1 min-w-0">
                         <div className="text-[13px] font-bold text-gray-800 truncate">{userName}</div>
                         <div className="text-[11px] text-gray-400 truncate">{userEmail}</div>
                     </div>
                     <LogOut size={16} className="text-gray-300 group-hover:text-red-500 transition-colors" onClick={(e) => { e.stopPropagation(); handleLogout(); }}/>
                 </div>
             </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 bg-[#F8FAFC] h-screen overflow-hidden pt-14 md:pt-0">
          <div className={currentPage === 'chat' ? 'h-full w-full p-2 md:p-4' : 'p-4 md:p-8 pb-20 h-full overflow-y-auto scroll-smooth'}>
              {renderContent()}
          </div>
      </main>
    </div>
  );
};

export default App;
