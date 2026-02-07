import { ChevronRight, X } from 'lucide-react';
import { Badge } from '@/components/common/Badge';
import { useState, useEffect } from 'react';
import { auth } from '@/config/firebase';
import { jdAPI } from '@/services/api';
import { useApplicantStats, generateChartPath } from '@/hooks/useApplicantStats';

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
  recruitmentPeriod?: string;
}

export const DashboardHome = ({ onNavigate, onNavigateToJD }: DashboardHomeProps) => {
    const [userName, setUserName] = useState('채용 담당자');
    const [activeJDs, setActiveJDs] = useState<JD[]>([]);
    
    // 공용 hook 사용
    const { stats, dailyData, recentApplicants, loading, applications: applicantData } = useApplicantStats();
    
    // 위젯 관리 상태
    const [showWidgetSelector, setShowWidgetSelector] = useState(false);
    const [activeWidgets, setActiveWidgets] = useState<string[]>(() => {
      try {
        const saved = localStorage.getItem('winnow_active_widgets');
        if (saved) return JSON.parse(saved);
      } catch {}
      return ['gender', 'grade'];
    });

    // 사용 가능한 위젯 목록
    const availableWidgets = [
        { id: 'gender', name: '성별 분포', color: 'blue' },
        { id: 'grade', name: '학년 분포', color: 'purple' },
        { id: 'language', name: '선호 언어', color: 'green' },
        { id: 'status', name: '지원 상태', color: 'orange' },
        { id: 'jd', name: '공고별 지원자', color: 'pink' },
    ];

    useEffect(() => {
        const currentUser = auth.currentUser;
        if (currentUser) {
            const name = currentUser.displayName || currentUser.email?.split('@')[0] || '채용 담당자';
            setUserName(name);
            
            fetchActiveJDs(currentUser.uid);
        }
    }, []);
    
    const toggleWidget = (widgetId: string) => {
        setActiveWidgets(prev => {
            const next = prev.includes(widgetId) 
                ? prev.filter(id => id !== widgetId)
                : [...prev, widgetId];
            localStorage.setItem('winnow_active_widgets', JSON.stringify(next));
            return next;
        });
    };
    
    // 위젯별 데이터 계산
    const getWidgetData = (widgetId: string) => {
        switch(widgetId) {
            case 'gender': {
                const male = applicantData.filter(a => a.applicantGender === '남성').length;
                const female = applicantData.filter(a => a.applicantGender === '여성').length;
                const other = applicantData.filter(a => a.applicantGender === '기타').length;
                const total = male + female + other || 1;
                return { male, female, other, total };
            }
            case 'grade': {
                const grades: any = {};
                applicantData.forEach(a => {
                    const grade = a.applicantGrade || '미입력';
                    grades[grade] = (grades[grade] || 0) + 1;
                });
                return grades;
            }
            case 'language': {
                const languages: any = {};
                applicantData.forEach(a => {
                    const lang = a.preferredLanguage || '미입력';
                    languages[lang] = (languages[lang] || 0) + 1;
                });
                return languages;
            }
            case 'status': {
                const 검토중 = applicantData.filter(a => a.status === '검토중').length;
                const 합격 = applicantData.filter(a => a.status === '합격').length;
                const 불합격 = applicantData.filter(a => a.status === '불합격').length;
                return { 검토중, 합격, 불합격 };
            }
            case 'jd': {
                const jds: any = {};
                applicantData.forEach(a => {
                    const jd = a.jdTitle || '미입력';
                    jds[jd] = (jds[jd] || 0) + 1;
                });
                return jds;
            }
            default:
                return {};
        }
    };

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
            console.error('공고 로딩 실패:', error);
        }
    };

    const { mainPath, areaPath } = generateChartPath(dailyData);

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
        <div className="space-y-8 max-w-[1400px] mx-auto pb-10">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">안녕하세요, {userName}님!</h2>
                    <p className="text-gray-500 text-sm mt-1.5 font-medium">오늘도 좋은 인재를 찾기 위한 준비가 되셨나요?</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setShowWidgetSelector(!showWidgetSelector)}
                        className="px-4 py-2.5 bg-white border border-gray-200 hover:border-gray-300 rounded-lg text-sm font-medium text-gray-700 transition-all shadow-sm hover:shadow"
                    >
                        통계 위젯
                    </button>
                    <button onClick={() => onNavigate('chat')} className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-blue-500/25 hover:bg-blue-700 transition-all active:scale-95">
                        새 공고 만들기
                    </button>
                </div>
            </div>

            {/* 위젯 선택 팝업 */}
            {showWidgetSelector && (
                <div className="bg-white rounded-2xl border-2 border-blue-200 p-5 shadow-xl">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h4 className="font-bold text-base text-gray-800">통계 위젯 관리</h4>
                            <p className="text-xs text-gray-500 mt-0.5">대시보드에 표시할 통계를 선택하세요</p>
                        </div>
                        <button onClick={() => setShowWidgetSelector(false)} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {availableWidgets.map(widget => {
                            const isActive = activeWidgets.includes(widget.id);
                            return (
                                <button
                                    key={widget.id}
                                    onClick={() => toggleWidget(widget.id)}
                                    className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                                        isActive
                                            ? 'bg-blue-600 text-white shadow-lg scale-105'
                                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                                    }`}
                                >
                                    {widget.name}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* 통합 대시보드 그리드 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* 진행 중인 공고 카드 */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-6">
                        <div className="text-gray-500 text-[13px] font-medium">진행 중인 공고</div>
                        <span className="text-green-600 text-[11px] font-bold bg-green-50 px-2 py-1 rounded-md">+{activeJDs.length}건</span>
                    </div>
                    <div className="text-[28px] font-bold text-gray-900 tracking-tight">{activeJDs.length} <span className="text-[16px] font-medium text-gray-400">개</span></div>
                </div>

                {/* 신규 지원자 카드 */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-6">
                        <div className="text-gray-500 text-[13px] font-medium">신규 지원자</div>
                        <span className="text-green-600 text-[11px] font-bold bg-green-50 px-2 py-1 rounded-md">+{stats.thisMonth}명</span>
                    </div>
                    <div className="text-[28px] font-bold text-gray-900 tracking-tight">{stats.total} <span className="text-[16px] font-medium text-gray-400">명</span></div>
                </div>

                {/* AI 스크리닝 리포트 카드 */}
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-2xl text-white shadow-xl hover:shadow-2xl transition-all">
                    <div className="text-gray-300 text-[13px] font-medium mb-1">AI 스크리닝 리포트</div>
                    <div className="text-[15px] text-gray-400 mb-6">최근 지원자 분석 완료</div>
                    <button 
                        onClick={() => onNavigate('applicants')}
                        className="w-full bg-white/10 hover:bg-white/20 transition-colors py-2.5 rounded-lg text-[13px] font-semibold text-center border border-white/10 backdrop-blur-sm"
                    >
                        리포트 확인하기
                    </button>
                </div>

                {/* 신규 지원자 진행률 차트 */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-4">신규 지원자</h3>
                    <div className="flex items-center justify-between">
                        <div className="relative w-28 h-28">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="56" cy="56" r="48" fill="transparent" stroke="#E5E7EB" strokeWidth="10" />
                                <circle 
                                    cx="56" 
                                    cy="56" 
                                    r="48" 
                                    fill="transparent" 
                                    stroke="#10B981"
                                    strokeWidth="10" 
                                    strokeDasharray="301"
                                    strokeDashoffset={301 - (301 * (stats.total > 0 ? ((stats.passed + stats.rejected) / stats.total) : 0))}
                                    strokeLinecap="round"
                                    className="transition-all duration-1000"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-[10px] text-gray-500 mb-0.5">처리 완료</span>
                                <span className="text-xl font-bold text-emerald-600">{stats.total > 0 ? Math.round(((stats.passed + stats.rejected) / stats.total) * 100) : 0}%</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                            <div>
                                <div className="text-[10px] text-gray-400 mb-0.5">신규 지원</div>
                                <div className="text-base font-bold text-gray-800">{stats.thisMonth}건</div>
                            </div>
                            <div>
                                <div className="text-[10px] text-gray-400 mb-0.5">검토 중</div>
                                <div className="text-base font-bold text-gray-800">{stats.reviewing}건</div>
                            </div>
                            <div>
                                <div className="text-[10px] text-gray-400 mb-0.5">보류</div>
                                <div className="text-base font-bold text-gray-800">{stats.pending}건</div>
                            </div>
                            <div>
                                <div className="text-[10px] text-gray-400 mb-0.5">총 지원자</div>
                                <div className="text-base font-bold text-gray-800">{stats.total}건</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 서류 합격 진행률 차트 */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-4">서류 합격</h3>
                    <div className="flex items-center justify-between">
                        <div className="relative w-28 h-28">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="56" cy="56" r="48" fill="transparent" stroke="#E5E7EB" strokeWidth="10" />
                                <circle 
                                    cx="56" 
                                    cy="56" 
                                    r="48" 
                                    fill="transparent" 
                                    stroke="#3B82F6"
                                    strokeWidth="10" 
                                    strokeDasharray="301"
                                    strokeDashoffset={301 - (301 * (stats.total > 0 ? (stats.passed / stats.total) : 0))}
                                    strokeLinecap="round"
                                    className="transition-all duration-1000"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-[10px] text-gray-500 mb-0.5">합격률</span>
                                <span className="text-xl font-bold text-blue-600">{stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0}%</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                            <div>
                                <div className="text-[10px] text-gray-400 mb-0.5">합격</div>
                                <div className="text-base font-bold text-gray-800">{stats.passed}건</div>
                            </div>
                            <div>
                                <div className="text-[10px] text-gray-400 mb-0.5">불합격</div>
                                <div className="text-base font-bold text-gray-800">{stats.rejected}건</div>
                            </div>
                            <div>
                                <div className="text-[10px] text-gray-400 mb-0.5">보류</div>
                                <div className="text-base font-bold text-gray-800">{stats.pending}건</div>
                            </div>
                            <div>
                                <div className="text-[10px] text-gray-400 mb-0.5">검토중</div>
                                <div className="text-base font-bold text-gray-800">{stats.reviewing}건</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 최근 지원자 목록 */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-4">최근 지원자</h3>
                    <div className="space-y-3">
                        {recentApplicants.length > 0 ? (
                            recentApplicants.slice(0, 4).map((applicant, idx) => (
                                <div key={idx} className="flex justify-between items-center text-sm border-b border-gray-50 pb-2.5 last:border-0">
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-gray-700 truncate text-[13px]">{applicant.name}</div>
                                        <div className="text-[10px] text-gray-400">{applicant.date}</div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-6 text-gray-400 text-xs">
                                아직 지원자가 없습니다
                            </div>
                        )}
                    </div>
                </div>

                {/* 동적 위젯들 */}
                {activeWidgets.map(widgetId => {
                    const widget = availableWidgets.find(w => w.id === widgetId);
                    if (!widget) return null;

                    const data = getWidgetData(widgetId);

                    return (
                        <div key={widgetId} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <h4 className="font-semibold text-gray-800">{widget.name}</h4>
                                <button 
                                    onClick={() => toggleWidget(widgetId)}
                                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 transition-all p-1.5 hover:bg-red-50 rounded-lg"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            {/* 성별 위젯 */}
                            {widgetId === 'gender' && (
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-gray-600 font-medium">남성</span>
                                        <div className="flex items-center gap-2">
                                            <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-blue-500 transition-all" style={{width: `${(data.male / data.total) * 100}%`}}></div>
                                            </div>
                                            <span className="text-xs font-bold text-gray-800 w-16 text-right">{data.male}명 ({Math.round((data.male / data.total) * 100)}%)</span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-gray-600 font-medium">여성</span>
                                        <div className="flex items-center gap-2">
                                            <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-pink-500 transition-all" style={{width: `${(data.female / data.total) * 100}%`}}></div>
                                            </div>
                                            <span className="text-xs font-bold text-gray-800 w-16 text-right">{data.female}명 ({Math.round((data.female / data.total) * 100)}%)</span>
                                        </div>
                                    </div>
                                    {data.other > 0 && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-gray-600 font-medium">기타</span>
                                            <div className="flex items-center gap-2">
                                                <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-gray-400 transition-all" style={{width: `${(data.other / data.total) * 100}%`}}></div>
                                                </div>
                                                <span className="text-xs font-bold text-gray-800 w-16 text-right">{data.other}명 ({Math.round((data.other / data.total) * 100)}%)</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 학년 위젯 */}
                            {widgetId === 'grade' && (
                                <div className="space-y-2.5">
                                    {Object.entries(data).length === 0 ? (
                                        <p className="text-xs text-gray-400 text-center py-4">데이터 없음</p>
                                    ) : (
                                        Object.entries(data).slice(0, 5).map(([grade, count]: any) => (
                                            <div key={grade} className="flex justify-between items-center py-1">
                                                <span className="text-xs text-gray-600 font-medium">{grade}</span>
                                                <span className="text-sm font-bold text-gray-800">{count}명</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {/* 언어 위젯 */}
                            {widgetId === 'language' && (
                                <div className="space-y-2.5">
                                    {Object.entries(data).length === 0 ? (
                                        <p className="text-xs text-gray-400 text-center py-4">데이터 없음</p>
                                    ) : (
                                        Object.entries(data).slice(0, 5).map(([lang, count]: any) => (
                                            <div key={lang} className="flex justify-between items-center py-1">
                                                <span className="text-xs text-gray-600 font-medium">{lang}</span>
                                                <span className="text-sm font-bold text-gray-800">{count}명</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {/* 상태 위젯 */}
                            {widgetId === 'status' && (
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                            <span className="text-xs text-gray-600 font-medium">검토중</span>
                                        </div>
                                        <span className="text-sm font-bold text-yellow-600">{data.검토중}명</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                            <span className="text-xs text-gray-600 font-medium">합격</span>
                                        </div>
                                        <span className="text-sm font-bold text-green-600">{data.합격}명</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                            <span className="text-xs text-gray-600 font-medium">불합격</span>
                                        </div>
                                        <span className="text-sm font-bold text-red-600">{data.불합격}명</span>
                                    </div>
                                </div>
                            )}

                            {/* 공고별 위젯 */}
                            {widgetId === 'jd' && (
                                <div className="space-y-2 max-h-32 overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full">
                                    {Object.entries(data).length === 0 ? (
                                        <p className="text-xs text-gray-400 text-center py-4">데이터 없음</p>
                                    ) : (
                                        Object.entries(data).slice(0, 10).map(([jd, count]: any) => (
                                            <div key={jd} className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
                                                <span className="text-xs text-gray-600 truncate mr-3 font-medium max-w-[180px]">{jd}</span>
                                                <span className="text-sm font-bold text-gray-800 whitespace-nowrap">{count}명</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* 지원자 추이 차트 (lg:col-span-2) */}
                <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-gray-800">지원자 추이</h3>
                        <div className="flex gap-2">
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

                {/* 채용 단계별 현황 */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-4">채용 단계별 현황</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-[13px] text-gray-600">총 지원</span>
                            <span className="text-sm font-bold text-gray-800">{stats.total}건</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-[13px] text-gray-600">합격</span>
                            <span className="text-sm font-bold text-gray-800">{stats.passed}건</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-[13px] text-gray-600">검토중</span>
                            <span className="text-sm font-bold text-gray-800">{stats.reviewing}건</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-[13px] text-gray-600">불합격</span>
                            <span className="text-sm font-bold text-gray-800">{stats.rejected}건</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-[13px] text-gray-600">보류</span>
                            <span className="text-sm font-bold text-gray-800">{stats.pending}건</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                            <span className="text-[13px] text-gray-600">이번달</span>
                            <span className="text-sm font-bold text-gray-800">{stats.thisMonth}건</span>
                        </div>
                    </div>
                </div>
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
                            // D-day 계산: recruitmentPeriod에서 마감일 파싱, 없으면 생성일+30일
                            let dDay = '';
                            const today = new Date();
                            if (jd.recruitmentPeriod) {
                                const parts = jd.recruitmentPeriod.split('~');
                                if (parts.length >= 2) {
                                    const endStr = parts[1].trim().replace(/\./g, '-');
                                    const deadline = new Date(endStr);
                                    if (!isNaN(deadline.getTime())) {
                                        const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                                        dDay = diffDays > 0 ? `D-${diffDays}` : diffDays === 0 ? 'D-Day' : '마감';
                                    }
                                }
                            }
                            if (!dDay && jd.createdAt) {
                                const date = jd.createdAt?.toDate ? jd.createdAt.toDate() : new Date(jd.createdAt);
                                const deadline = new Date(date);
                                deadline.setDate(deadline.getDate() + 30);
                                const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
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
                                                <span className="text-blue-600 font-bold">{dDay}</span>
                                                <span className="mx-1.5 text-gray-300">|</span>
                                                <span className="mx-1 text-gray-400">지원자</span>
                                                <span className="font-semibold text-gray-700">{applicantData.filter((a: any) => a.jdId === jd.id).length}명</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
