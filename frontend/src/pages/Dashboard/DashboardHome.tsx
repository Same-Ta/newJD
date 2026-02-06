import { Plus, FileText, ChevronRight, Users } from 'lucide-react';
import { Badge } from '@/components/common/Badge';
import { useState, useEffect } from 'react';
import { auth } from '@/config/firebase';
import { jdAPI, applicationAPI } from '@/services/api';

interface DashboardHomeProps {
  onNavigate: (page: string) => void;
  onNavigateToJD: (jdId: string) => void;
}

interface JD {
  id: string;
  title: string;
  department?: string;
  location?: string;
  status?: string;
  createdAt?: any;
  company?: string;
  jobRole?: string;
}

interface StatusStats {
    total: number;
    passed: number;
    pending: number;
    rejected: number;
    reviewing: number;
    thisMonth: number;
}

interface DailyCount {
    date: string;
    count: number;
}

interface RecentApplicant {
    name: string;
    date: string;
    status?: string;
}

export const DashboardHome = ({ onNavigate, onNavigateToJD }: DashboardHomeProps) => {
    const [userName, setUserName] = useState('채용 담당자');
    const [activeJDs, setActiveJDs] = useState<JD[]>([]);
    const [stats, setStats] = useState<StatusStats>({
        total: 0,
        passed: 0,
        pending: 0,
        rejected: 0,
        reviewing: 0,
        thisMonth: 0
    });
    const [dailyData, setDailyData] = useState<DailyCount[]>([]);
    const [recentApplicants, setRecentApplicants] = useState<RecentApplicant[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const currentUser = auth.currentUser;
        if (currentUser) {
            const name = currentUser.displayName || currentUser.email?.split('@')[0] || '채용 담당자';
            setUserName(name);
            
            fetchActiveJDs(currentUser.uid);
            fetchAnalytics();
        }
    }, []);

    const fetchActiveJDs = async (_userId: string) => {
        try {
            const jds = await jdAPI.getAll();
            const sortedJDs = jds.sort((a: JD, b: JD) => {
                const dateA = a.createdAt?.seconds ? new Date(a.createdAt.seconds * 1000) : new Date(0);
                const dateB = b.createdAt?.seconds ? new Date(b.createdAt.seconds * 1000) : new Date(0);
                return dateB.getTime() - dateA.getTime();
            }).slice(0, 4);

            setActiveJDs(sortedJDs);
        } catch (error) {
            console.error('JD 로딩 실패:', error);
        }
    };

    const fetchAnalytics = async () => {
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) {
                setLoading(false);
                return;
            }

            const applications = await applicationAPI.getAll();

            let passed = 0;
            let pending = 0;
            let rejected = 0;
            let reviewing = 0;
            let thisMonth = 0;

            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();

            const last7Days: { [key: string]: number } = {};
            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];
                last7Days[dateStr] = 0;
            }

            applications.forEach((app: any) => {
                if (app.status === '합격') passed++;
                else if (app.status === '보류') pending++;
                else if (app.status === '불합격') rejected++;
                else if (app.status === '검토중') reviewing++;

                if (app.appliedAt) {
                    const appliedDate = app.appliedAt.seconds ? new Date(app.appliedAt.seconds * 1000) : new Date(app.appliedAt);
                    if (appliedDate.getMonth() === currentMonth && appliedDate.getFullYear() === currentYear) {
                        thisMonth++;
                    }

                    const dateStr = appliedDate.toISOString().split('T')[0];
                    if (last7Days.hasOwnProperty(dateStr)) {
                        last7Days[dateStr]++;
                    }
                }
            });

            setStats({
                total: applications.length,
                passed,
                pending,
                rejected,
                reviewing,
                thisMonth
            });

            const chartData = Object.keys(last7Days).map(date => ({
                date,
                count: last7Days[date]
            }));
            setDailyData(chartData);

            // 최근 지원자 5명 가져오기
            const sortedApplicants = applications
                .filter((app: any) => app.appliedAt && (app.name || app.applicantName))
                .sort((a: any, b: any) => {
                    const dateA = a.appliedAt.seconds ? new Date(a.appliedAt.seconds * 1000) : new Date(a.appliedAt);
                    const dateB = b.appliedAt.seconds ? new Date(b.appliedAt.seconds * 1000) : new Date(b.appliedAt);
                    return dateB.getTime() - dateA.getTime();
                })
                .slice(0, 5)
                .map((app: any) => {
                    const appliedDate = app.appliedAt.seconds ? new Date(app.appliedAt.seconds * 1000) : new Date(app.appliedAt);
                    return {
                        name: app.name || app.applicantName || '익명',
                        date: appliedDate.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace(/\.$/, ''),
                        status: app.status
                    };
                });
            setRecentApplicants(sortedApplicants);

        } catch (error) {
            console.error('통계 로딩 실패:', error);
        } finally {
            setLoading(false);
        }
    };

    const generatePath = () => {
        if (dailyData.length === 0) return "M0,130 L400,130";
        
        const maxCount = Math.max(...dailyData.map(d => d.count), 1);
        const points = dailyData.map((d, i) => {
            const x = (i / (dailyData.length - 1)) * 400;
            const y = 150 - (d.count / maxCount) * 120;
            return { x, y };
        });

        let path = `M${points[0].x},${points[0].y}`;
        for (let i = 1; i < points.length; i++) {
            const prev = points[i - 1];
            const curr = points[i];
            const cpX = (prev.x + curr.x) / 2;
            path += ` Q${cpX},${prev.y} ${curr.x},${curr.y}`;
        }
        return path;
    };

    const mainPath = generatePath();
    const areaPath = mainPath + " V150 H0 Z";

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-500">대시보드 로딩 중...</p>
                </div>
            </div>
        );
    }
    
    return (
        <div className="space-y-8 max-w-[1200px] mx-auto pb-10">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">안녕하세요, {userName}님!</h2>
                    <p className="text-gray-500 text-sm mt-1.5 font-medium">오늘도 좋은 인재를 찾기 위한 준비가 되셨나요?</p>
                </div>
                <button onClick={() => onNavigate('chat')} className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-blue-500/25 hover:bg-blue-700 transition-all flex items-center gap-2 active:scale-95">
                    <Plus size={18} strokeWidth={3} /> 새 JD 만들기
                </button>
            </div>

            {/* Dashboard Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: '진행 중인 공고', val: `${activeJDs.length} 개`, inc: `+${activeJDs.length}건`, icon: FileText },
                    { label: '신규 지원자', val: `${stats.total} 명`, inc: `+${stats.thisMonth}명`, icon: Users },
                ].map((stat, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative group hover:-translate-y-1 transition-transform duration-300">
                        <div className="flex justify-between items-start mb-6">
                            <div className="bg-gray-50 p-2.5 rounded-xl group-hover:bg-blue-50 transition-colors"><stat.icon size={22} className="text-gray-600 group-hover:text-blue-600"/></div>
                            <span className="text-green-600 text-[11px] font-bold bg-green-50 px-2 py-1 rounded-md">{stat.inc}</span>
                        </div>
                        <div className="text-gray-500 text-[13px] font-medium mb-1">{stat.label}</div>
                        <div className="text-[28px] font-bold text-gray-900 tracking-tight">{stat.val.split(' ')[0]} <span className="text-[16px] font-medium text-gray-400">{stat.val.split(' ')[1]}</span></div>
                    </div>
                ))}
                
                {/* ===== <AI 스크리닝 리포트> ===== */}
                {/* Dark Report Card */}
                <div className="bg-[#111827] p-7 rounded-2xl text-white flex flex-col justify-between shadow-xl shadow-gray-200">
                    <div>
                        <div className="text-[15px] font-bold mb-1">AI 스크리닝 리포트</div>
                        <p className="text-gray-400 text-xs">최근 지원자 분석이 완료되었습니다.</p>
                    </div>
                    <button 
                        onClick={() => onNavigate('applicants')}
                        className="w-full bg-white/10 hover:bg-white/15 transition-colors py-3 rounded-lg text-[13px] font-medium text-center border border-white/5 backdrop-blur-sm"
                    >
                        리포트 확인하기
                    </button>
                </div>
                {/* ===== </AI 스크리닝 리포트> ===== */}
            </div>

            {/* Active Jobs List */}
            <div>
                <div className="flex justify-between items-center mb-5">
                    <h3 className="font-bold text-lg text-gray-800">진행 중인 채용 공고</h3>
                    <button onClick={() => onNavigate('my-jds')} className="text-[12px] text-gray-500 flex items-center gap-1 font-medium hover:text-blue-600 transition-colors">전체보기 <ChevronRight size={14}/></button>
                </div>
                {activeJDs.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 p-20 text-center">
                        <div className="text-gray-400 mb-4">
                            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-bold text-gray-700 mb-2">아직 작성된 공고가 없습니다</h3>
                        <p className="text-sm text-gray-500">AI와 함께 첫 채용 공고를 작성해보세요!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                        {activeJDs.map((jd) => {
                            // Firestore Timestamp를 yyyy.mm.dd 형식으로 변환
                            let dDay = '';
                            if (jd.createdAt) {
                                const date = jd.createdAt?.toDate ? jd.createdAt.toDate() : new Date(jd.createdAt);
                                
                                // D-day 계산 (30일 후 마감으로 가정)
                                const deadline = new Date(date);
                                deadline.setDate(deadline.getDate() + 30);
                                const today = new Date();
                                const diffTime = deadline.getTime() - today.getTime();
                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                dDay = diffDays > 0 ? `D-${diffDays}` : '마감';
                            }

                            // 랜덤 이미지 선택
                            const images = [
                                'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=800',
                                'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&q=80&w=800',
                                'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=800',
                                'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&q=80&w=800',
                            ];
                            const randomImage = images[Math.floor(Math.random() * images.length)];

                            return (
                                <div 
                                    key={jd.id} 
                                    onClick={() => onNavigateToJD(jd.id)} 
                                    className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 group cursor-pointer flex flex-col"
                                >
                                    {/* 이미지 영역 */}
                                    <div className="h-44 relative">
                                        <img 
                                            src={randomImage} 
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                                            alt={jd.title}
                                        />
                                        <div className="absolute top-3 left-3">
                                            <Badge 
                                                type={jd.status || 'draft'} 
                                                text={jd.status === 'published' ? '채용중' : '임시저장'} 
                                            />
                                        </div>
                                    </div>
                                    {/* 콘텐츠 영역 */}
                                    <div className="p-5">
                                        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1">
                                            {jd.company || 'WINNOW'} {jd.jobRole && `· ${jd.jobRole}`}
                                        </div>
                                        
                                        <h3 className="font-bold mb-3 text-[15px] leading-snug line-clamp-2">
                                            {jd.title || '제목 없음'}
                                        </h3>
                                        
                                        <div className="flex items-center justify-between text-[12px] text-gray-500 font-medium">
                                            <div className="flex items-center gap-1">
                                                <span className="text-yellow-500">★</span>
                                                <span className="text-gray-700 font-semibold">4.8</span>
                                                <span className="mx-1.5 text-gray-300">|</span>
                                                <span className="text-blue-600 font-bold">{dDay}</span>
                                                <span className="mx-1 text-gray-400">지원자</span>
                                                <span className="font-semibold text-gray-700">{Math.floor(Math.random() * 30) + 5}명</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Analytics Section */}
            <div>
                <div className="flex justify-between items-center mb-5">
                    <h3 className="font-bold text-lg text-gray-800">지원자 현황</h3>
                    <button 
                        onClick={() => onNavigate('applicants')}
                        className="text-[12px] text-gray-500 flex items-center gap-1 font-medium hover:text-blue-600 transition-colors"
                    >
                        전체보기 <ChevronRight size={14}/>
                    </button>
                </div>

                <div className="space-y-6">
                    {/* 원형 진행률 차트 2개 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* 신규 지원자 */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <div className="flex items-start gap-2 mb-4">
                                <FileText size={18} className="text-emerald-600" />
                                <h3 className="font-bold text-gray-800">신규 지원자</h3>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="relative w-32 h-32">
                                    <svg className="w-full h-full transform -rotate-90">
                                        <circle cx="64" cy="64" r="56" fill="transparent" stroke="#E5E7EB" strokeWidth="12" />
                                        <circle 
                                            cx="64" 
                                            cy="64" 
                                            r="56" 
                                            fill="transparent" 
                                            stroke="#10B981"
                                            strokeWidth="12" 
                                            strokeDasharray="352"
                                            strokeDashoffset={352 - (352 * (stats.total > 0 ? ((stats.passed + stats.rejected) / stats.total) : 0))}
                                            strokeLinecap="round"
                                            className="transition-all duration-1000"
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-xs text-gray-500 mb-1">처리 완료</span>
                                        <span className="text-2xl font-bold text-emerald-600">{stats.total > 0 ? Math.round(((stats.passed + stats.rejected) / stats.total) * 100) : 0}%</span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                                    <div>
                                        <div className="text-xs text-gray-400 mb-1">신규 지원</div>
                                        <div className="text-lg font-bold text-gray-800">{stats.thisMonth}건</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-400 mb-1">검토 중</div>
                                        <div className="text-lg font-bold text-gray-800">{stats.reviewing}건</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-400 mb-1">보류</div>
                                        <div className="text-lg font-bold text-gray-800">{stats.pending}건</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-400 mb-1">총 지원자</div>
                                        <div className="text-lg font-bold text-gray-800">{stats.total}건</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 서류 합격 */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <div className="flex items-start gap-2 mb-4">
                                <Users size={18} className="text-blue-600" />
                                <h3 className="font-bold text-gray-800">서류 합격</h3>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="relative w-32 h-32">
                                    <svg className="w-full h-full transform -rotate-90">
                                        <circle cx="64" cy="64" r="56" fill="transparent" stroke="#E5E7EB" strokeWidth="12" />
                                        <circle 
                                            cx="64" 
                                            cy="64" 
                                            r="56" 
                                            fill="transparent" 
                                            stroke="#3B82F6"
                                            strokeWidth="12" 
                                            strokeDasharray="352"
                                            strokeDashoffset={352 - (352 * (stats.total > 0 ? (stats.passed / stats.total) : 0))}
                                            strokeLinecap="round"
                                            className="transition-all duration-1000"
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-xs text-gray-500 mb-1">합격률</span>
                                        <span className="text-2xl font-bold text-blue-600">{stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0}%</span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                                    <div>
                                        <div className="text-xs text-gray-400 mb-1">합격</div>
                                        <div className="text-lg font-bold text-gray-800">{stats.passed}건</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-400 mb-1">불합격</div>
                                        <div className="text-lg font-bold text-gray-800">{stats.rejected}건</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-400 mb-1">보류</div>
                                        <div className="text-lg font-bold text-gray-800">{stats.pending}건</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-400 mb-1">검토중</div>
                                        <div className="text-lg font-bold text-gray-800">{stats.reviewing}건</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 차트 및 최근 지원자 */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* 지원자 추이 차트 */}
                        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <div className="flex items-center gap-2 mb-6">
                                <FileText size={18} className="text-blue-600" />
                                <h3 className="font-bold text-gray-800">지원자 추이</h3>
                                <div className="ml-auto flex gap-2">
                                    <button className="px-3 py-1 text-xs font-bold bg-blue-600 text-white rounded-lg">지원자</button>
                                    <button className="px-3 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded-lg">서류합격</button>
                                    <button className="px-3 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded-lg">면접통과</button>
                                </div>
                            </div>
                            
                            <div className="h-48 relative">
                                <svg className="w-full h-full" viewBox="0 0 400 150" preserveAspectRatio="none">
                                    <defs>
                                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3"/>
                                            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0"/>
                                        </linearGradient>
                                    </defs>
                                    <path d={areaPath} fill="url(#chartGradient)" />
                                    <path d={mainPath} fill="none" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 text-xs text-gray-400">
                                    {dailyData.map((d, i) => (
                                        <span key={i}>{new Date(d.date).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })}</span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* 최근 지원자 */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-gray-800">최근 지원자</h3>
                                <button className="text-xs text-gray-400">⚙</button>
                            </div>
                            <div className="space-y-3">
                                {recentApplicants.length > 0 ? (
                                    recentApplicants.map((applicant, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-sm border-b border-gray-50 pb-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-gray-700 truncate">{applicant.name}</div>
                                                <div className="text-xs text-gray-400">{applicant.date}</div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-gray-400 text-sm">
                                        아직 지원자가 없습니다
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 채용 단계별 현황 및 채용 현황 */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* 채용 단계별 현황 */}
                        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-800 mb-4">채용 단계별 현황</h3>
                            <div className="grid grid-cols-3 gap-x-12 gap-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">총 지원</span>
                                    <span className="text-sm font-bold text-gray-800">{stats.total}건</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">합격</span>
                                    <span className="text-sm font-bold text-gray-800">{stats.passed}건</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">검토중</span>
                                    <span className="text-sm font-bold text-gray-800">{stats.reviewing}건</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">불합격</span>
                                    <span className="text-sm font-bold text-gray-800">{stats.rejected}건</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">보류</span>
                                    <span className="text-sm font-bold text-gray-800">{stats.pending}건</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">이번달</span>
                                    <span className="text-sm font-bold text-gray-800">{stats.thisMonth}건</span>
                                </div>
                            </div>
                            <div className="mt-4 text-xs text-gray-400 text-center">총 지원 수 기준</div>
                        </div>

                        {/* 채용 현황 */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-800 mb-4">채용 현황</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                                    <span className="text-sm text-gray-600">포지션</span>
                                    <span className="text-sm text-gray-600">지원자 수</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-700">전체 포지션</span>
                                    <span className="text-sm font-bold text-gray-800">{stats.total}명</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
