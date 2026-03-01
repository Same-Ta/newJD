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
  BookOpen,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { FONTS } from '@/constants/fonts';
import { FunnelCSS } from '@/components/common/FunnelCSS';
import { SidebarItem } from '@/components/common/SidebarItem';
import { auth } from '@/config/firebase';
import { onAuthStateChanged, onIdTokenChanged, signOut } from 'firebase/auth';
import { clearAuthCache } from '@/services/api';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import { SessionTimeoutModal } from '@/components/common/SessionTimeoutModal';
import {
  DemoModeProvider,
  useDemoMode,
  dismissTutorial,
  resetTutorial,
  TutorialOverlay,
  WelcomeDialog,
} from '@/components/onboarding';

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

// Suspense fallback component - 코드 분할 청크 로딩 중 표시
const PageLoader = () => (
  <div className="flex items-center justify-center h-64 animate-fadeIn">
    <div className="text-center">
      <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg animate-pulse">
        <span className="text-white font-bold text-sm">W</span>
      </div>
      <div className="w-24 h-1 bg-gray-200 rounded-full mx-auto overflow-hidden">
        <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full animate-[loader-slide_1.2s_ease-in-out_infinite]" style={{ width: '40%' }} />
      </div>
    </div>
  </div>
);

const App = () => {
  // 페이지 키 → URL 경로 매핑
  const PAGE_PATHS: Record<string, string> = {
    'landing': '/',
    'login': '/login',
    'signup': '/signup',
    'dashboard': '/dashboard',
    'my-jds': '/my-jds',
    'jd-detail': '/jd-detail',
    'applicants': '/applicants',
    'applicant-detail': '/applicant-detail',
    'chat': '/chat',
    'team': '/team',
    'settings': '/settings',
  };

  // URL 경로 → 페이지 키 역매핑
  const pathToPage = (pathname: string): string => {
    // 공개 공고 링크: /jd/:id 패턴
    if (pathname.match(/^\/jd\/[^/]+/)) return 'jd-detail';
    for (const [page, path] of Object.entries(PAGE_PATHS)) {
      if (path === pathname) return page;
    }
    return 'landing';
  };

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

  // 초기 페이지를 URL에서 결정
  const getInitialPage = (): string => {
    const jdId = getJdIdFromUrl();
    if (jdId) return 'jd-detail';
    return pathToPage(window.location.pathname);
  };

  const [currentPage, setCurrentPage] = useState(() => getInitialPage());
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [selectedJdId, setSelectedJdId] = useState<string | undefined>(undefined);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | undefined>(undefined);
  const [init, setInit] = useState(false);
  const [userName, setUserName] = useState('채용 담당자');
  const [userEmail, setUserEmail] = useState('');
  const [userInitials, setUserInitials] = useState('U');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // 자동 로그아웃 경고 모달 상태
  const SESSION_WARNING_DURATION = 2 * 60 * 1000; // 2분
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);

  // 온보딩 상태 (라이브 시뮬레이션)
  const [showWelcome, setShowWelcome] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const { isDemoMode, enableDemoMode, disableDemoMode } = useDemoMode();

  // 초기 URL 확인
  const initialJdId = getJdIdFromUrl();

  useEffect(() => {
    if (initialJdId && !selectedJdId) {
      setSelectedJdId(initialJdId);
      setCurrentPage('jd-detail');
    }
  }, []);

  // ==================== 성능 최적화: 앱 로더 제거 + 백엔드 웜업 ====================
  useEffect(() => {
    // 1. HTML에 삽입된 초기 로딩 스켈레톤 제거
    const loader = document.getElementById('app-loader');
    if (loader) {
      loader.classList.add('fade-out');
      setTimeout(() => loader.remove(), 300);
    }
    
    // 2. 백엔드 서버 웜업 (Render cold start 방지)
    //    사용자가 UI를 보는 동안 백그라운드에서 백엔드 깨우기
    const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';
    fetch(`${API_BASE}/keepalive`, { 
      method: 'GET',
      // 연결 설정만 해도 서버 깨우기에 충분, 타임아웃 짧게
      signal: AbortSignal.timeout?.(8000),
    }).then(r => {
      if (r.ok) console.log('🔥 Backend warmed up');
    }).catch(() => {
      // 무시 - 백엔드가 아직 시작 중일 수 있음
      console.log('ℹ️  Backend warmup pending (cold start)');
    });
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
          window.history.replaceState({ page: 'dashboard' }, '', '/dashboard');
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
          window.history.replaceState({ page: 'landing' }, '', '/');
        }
      }
      setInit(true);
    });

    return () => unsubscribe();
  }, [currentPage]);

  // 토큰 자동 갱신 감지 (만료 전 자동 리프레시)
  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      if (user) {
        try {
          // 토큰 강제 갱신 (캐시된 토큰 무효화)
          await user.getIdToken(true);
          console.log('🔄 Token refreshed automatically');
          clearAuthCache(); // API 캐시도 초기화
        } catch (error) {
          console.error('Token refresh failed:', error);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // 주기적인 토큰 갱신 (50분마다 - Firebase 토큰은 1시간 유효)
  useEffect(() => {
    if (!isLoggedIn) return;

    const refreshInterval = setInterval(async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          await user.getIdToken(true); // 강제 토큰 갱신
          clearAuthCache();
          console.log('🔄 Token refreshed by interval (50 min)');
        } catch (error) {
          console.error('Scheduled token refresh failed:', error);
        }
      }
    }, 50 * 60 * 1000); // 50분마다

    return () => clearInterval(refreshInterval);
  }, [isLoggedIn]);

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
    const initialPath = PAGE_PATHS[currentPage] || '/';
    window.history.replaceState({ page: currentPage }, '', initialPath);

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
        } else {
          // URL 경로에서 페이지 결정
          const page = pathToPage(window.location.pathname);
          setCurrentPage(page);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // 페이지 내비게이션 (브라우저 히스토리에 기록 + URL 경로 변경)
  const navigateTo = (page: string) => {
    const path = PAGE_PATHS[page] || '/';
    window.history.pushState({ page }, '', path);
    setCurrentPage(page);
  };

  const handleLogin = () => {
    setIsLoggedIn(true);
    navigateTo('dashboard');
    // 로그인 시 항상 WelcomeDialog 표시 (매 로그인마다 체험 기회 제공)
    setTimeout(() => setShowWelcome(true), 600);
  };

  // 온보딩 핸들러 (라이브 시뮬레이션)
  const handleWelcomeStart = () => {
    setShowWelcome(false);
    enableDemoMode();
    navigateTo('dashboard');
    setTimeout(() => setShowTutorial(true), 400);
  };

  const handleWelcomeSkip = () => {
    setShowWelcome(false);
  };

  const handleWelcomeDismiss = () => {
    dismissTutorial();
    setShowWelcome(false);
  };

  const handleTutorialComplete = () => {
    setShowTutorial(false);
    disableDemoMode();
    navigateTo('dashboard');
  };

  const handleLogout = async () => {
    try {
      clearAuthCache();
      await signOut(auth);
      setIsLoggedIn(false);
      setShowTimeoutWarning(false);
      navigateTo('landing');
    } catch (error) {
      console.error('로그아웃 오류:', error);
    }
  };

  // 자동 로그아웃 훅
  const { extendSession } = useSessionTimeout({
    idleTimeout: 30 * 60 * 1000,           // 30분 비활동 시 경고
    warningDuration: SESSION_WARNING_DURATION, // 2분 내 응답 없으면 로그아웃
    isLoggedIn,
    onWarning: () => setShowTimeoutWarning(true),
    onTimeout: () => {
      console.log('⏰ 세션 만료: 자동 로그아웃');
      handleLogout();
    },
  });

  const handleExtendSession = () => {
    setShowTimeoutWarning(false);
    extendSession();
  };

  const handleNavigateToJD = (jdId: string) => {
    setSelectedJdId(jdId);
    window.history.pushState({ page: 'jd-detail', jdId }, '', `/jd-detail?jdId=${jdId}`);
    setCurrentPage('jd-detail');
  };

  // 튜토리얼 오버레이 전용 네비게이션: 데모 모드에서 jd-detail 이동 시 demo JD id 자동 설정
  const handleTutorialNavigate = (page: string) => {
    if (page === 'jd-detail') {
      handleNavigateToJD('demo-jd-001');
    } else {
      navigateTo(page);
    }
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
                  window.history.pushState({ page: 'applicant-detail', applicationId: id }, '', `/applicant-detail?id=${id}`);
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
  // 데모 모드일 때는 대시보드 레이아웃 안에서 렌더링 (튜토리얼 오버레이 유지)
  if (currentPage === 'jd-detail' && !isDemoMode) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: FONTS.sans }}>
        <FunnelCSS />
        {/* 간단한 헤더 */}
        <header className="bg-white border-b border-gray-100 px-6 h-16 flex items-center justify-between fixed w-full z-10 shadow-sm">
          <button
            onClick={() => navigateTo(isLoggedIn ? 'dashboard' : 'landing')}
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
          >
            <img src="/logo.png" alt="WINNOW" className="w-8 h-8 object-contain" />
            <span className="font-extrabold text-[19px] text-gray-900 tracking-tight">WINNOW</span>
          </button>
          <div className="flex items-center gap-3">
            {isLoggedIn && (
              <button 
                onClick={() => navigateTo('my-jds')}
                className="px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                내 공고로 이동
              </button>
            )}
          </div>
        </header>
        <main className="pt-16 h-[100dvh] overflow-hidden">
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
          <button onClick={() => navigateTo('dashboard')} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <img src="/logo.png" alt="WINNOW" className="w-7 h-7 object-contain" />
            <span className="font-extrabold text-[17px] text-gray-900 tracking-tight">WINNOW</span>
          </button>
        </div>
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-[10px] border border-blue-200">{userInitials}</div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-[280px] bg-white h-full flex flex-col shadow-xl z-50 animate-slideIn">
            <div className="px-5 h-16 flex items-center justify-between flex-shrink-0 border-b border-gray-100">
              <button onClick={() => { navigateTo('dashboard'); setSidebarOpen(false); }} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <img src="/logo.png" alt="WINNOW" className="w-7 h-7 object-contain" />
                <span className="font-extrabold text-[17px] text-gray-900 tracking-tight">WINNOW</span>
              </button>
              <button onClick={() => setSidebarOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="px-3 space-y-1 flex-1 overflow-y-auto pt-4">
              <div className="text-[11px] font-bold text-gray-400 px-4 mb-2 uppercase tracking-wider">채용 관리</div>
              <SidebarItem icon={LayoutDashboard} label="대시보드" active={currentPage === 'dashboard'} onClick={() => { navigateTo('dashboard'); setSidebarOpen(false); }} dataTour="sidebar-dashboard" />
              <SidebarItem icon={FileText} label="내 공고 목록" active={currentPage === 'my-jds'} onClick={() => { navigateTo('my-jds'); setSidebarOpen(false); }} dataTour="sidebar-myjds" />
              <SidebarItem icon={CheckCircle2} label="지원자 관리" active={currentPage === 'applicants'} onClick={() => { navigateTo('applicants'); setSidebarOpen(false); }} dataTour="sidebar-applicants" />
              <SidebarItem icon={MessageSquare} label="공고 생성 (AI)" active={currentPage === 'chat'} onClick={() => { navigateTo('chat'); setSidebarOpen(false); }} dataTour="sidebar-chat" />
            </div>
            <div className="px-3 pb-6">
              <div className="text-[11px] font-bold text-gray-400 px-4 mb-2 uppercase tracking-wider">내 정보</div>
              <SidebarItem icon={Users} label="팀 관리" active={currentPage === 'team'} onClick={() => { navigateTo('team'); setSidebarOpen(false); }} dataTour="sidebar-team" />
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
      <aside className={`${sidebarCollapsed ? 'w-[72px]' : 'w-[260px]'} bg-white border-r border-gray-100 h-screen z-20 hidden md:flex flex-col shadow-[2px_0_20px_rgba(0,0,0,0.02)] transition-all duration-300 flex-shrink-0`}>
        <div className={`${sidebarCollapsed ? 'px-3 justify-center' : 'px-6'} h-20 flex items-center gap-2.5 mb-2 flex-shrink-0`}>
            {!sidebarCollapsed && (
              <button onClick={() => navigateTo('dashboard')} className="flex items-center gap-2.5 flex-1 min-w-0 hover:opacity-80 transition-opacity">
                <img src="/logo.png" alt="WINNOW" className="w-8 h-8 object-contain flex-shrink-0" />
                <span className="font-extrabold text-[19px] text-gray-900 tracking-tight truncate">WINNOW</span>
              </button>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
              title={sidebarCollapsed ? '사이드바 펼치기' : '사이드바 접기'}
            >
              {sidebarCollapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
            </button>
        </div>

        <div className={`${sidebarCollapsed ? 'px-2' : 'px-3'} space-y-1 flex-1 overflow-y-auto`}>
            {!sidebarCollapsed && <div className="text-[11px] font-bold text-gray-400 px-4 mb-2 mt-4 uppercase tracking-wider">채용 관리</div>}
            {sidebarCollapsed && <div className="mb-2 mt-4" />}
            <SidebarItem 
                icon={LayoutDashboard} 
                label="대시보드" 
                active={currentPage === 'dashboard'} 
                onClick={() => navigateTo('dashboard')} 
                dataTour="sidebar-dashboard"
                collapsed={sidebarCollapsed}
            />
            <SidebarItem 
                icon={FileText} 
                label="내 공고 목록" 
                active={currentPage === 'my-jds'} 
                onClick={() => navigateTo('my-jds')} 
                dataTour="sidebar-myjds"
                collapsed={sidebarCollapsed}
            />
            <SidebarItem 
                icon={CheckCircle2} 
                label="지원자 관리" 
                active={currentPage === 'applicants'} 
                onClick={() => navigateTo('applicants')} 
                dataTour="sidebar-applicants"
                collapsed={sidebarCollapsed}
            />
             <SidebarItem 
                icon={MessageSquare} 
                label="공고 생성 (AI)" 
                active={currentPage === 'chat'} 
                onClick={() => navigateTo('chat')} 
                dataTour="sidebar-chat"
                collapsed={sidebarCollapsed}
            />
        </div>

        <div className={`${sidebarCollapsed ? 'px-2' : 'px-3'} pb-6`}>
             {!sidebarCollapsed && <div className="text-[11px] font-bold text-gray-400 px-4 mb-2 uppercase tracking-wider">내 정보</div>}
             {sidebarCollapsed && <div className="mb-2" />}
             <SidebarItem icon={Users} label="팀 관리" active={currentPage === 'team'} onClick={() => navigateTo('team')} dataTour="sidebar-team" collapsed={sidebarCollapsed} />
             <SidebarItem icon={Settings} label="계정 설정" active={currentPage === 'settings'} onClick={() => navigateTo('settings')} collapsed={sidebarCollapsed} />

             {!sidebarCollapsed && (
             <div className="mt-3 px-4 pt-5 border-t border-gray-50">
                 <div className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer group">
                     <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs border border-blue-200">{userInitials}</div>
                     <div className="flex-1 min-w-0">
                         <div className="text-[13px] font-bold text-gray-800 truncate">{userName}</div>
                         <div className="text-[11px] text-gray-400 truncate">{userEmail}</div>
                     </div>
                     <LogOut size={16} className="text-gray-300 group-hover:text-red-500 transition-colors" onClick={(e) => { e.stopPropagation(); handleLogout(); }}/>
                 </div>
             </div>
             )}
             {sidebarCollapsed && (
               <div className="mt-3 pt-3 border-t border-gray-50 flex flex-col items-center gap-2">
                 <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs border border-blue-200">{userInitials}</div>
                 <button onClick={handleLogout} className="p-2 text-gray-300 hover:text-red-500 transition-colors rounded-lg hover:bg-gray-50" title="로그아웃">
                   <LogOut size={16} />
                 </button>
               </div>
             )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 bg-[#F8FAFC] h-screen overflow-hidden pt-14 md:pt-0 transition-all duration-300">
          <div className={currentPage === 'chat' ? 'h-full w-full p-2 md:p-4' : 'p-4 md:p-8 pb-20 h-full overflow-y-auto scroll-smooth'}>
              {renderContent()}
          </div>
      </main>

      {/* 자동 로그아웃 경고 모달 */}
      <SessionTimeoutModal
        isVisible={showTimeoutWarning}
        remainingMs={SESSION_WARNING_DURATION}
        onExtend={handleExtendSession}
        onLogout={handleLogout}
      />

      {/* 웰컴 다이얼로그 */}
      <WelcomeDialog
        isOpen={showWelcome}
        onStart={handleWelcomeStart}
        onSkip={handleWelcomeSkip}
        onDismiss={handleWelcomeDismiss}
      />

      {/* 라이브 튜토리얼 오버레이 */}
      {showTutorial && (
        <TutorialOverlay
          onComplete={handleTutorialComplete}
          onNavigate={handleTutorialNavigate}
        />
      )}

      {/* 온보딩 다시 보기 FAB */}
      {!showWelcome && !showTutorial && (
        <button
          onClick={() => {
            resetTutorial();
            setShowWelcome(true);
          }}
          className="fixed bottom-6 right-6 z-40 w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg shadow-blue-500/30 flex items-center justify-center transition-all hover:scale-105 group"
          title="서비스 가이드 다시 보기"
        >
          <BookOpen size={20} />
          <span className="absolute right-14 bg-gray-900 text-white text-[11px] font-semibold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            서비스 가이드
          </span>
        </button>
      )}
    </div>
  );
};

// App을 DemoModeProvider로 감싸서 내보내기
const AppWithProviders = () => (
  <DemoModeProvider>
    <App />
  </DemoModeProvider>
);

export default AppWithProviders;
