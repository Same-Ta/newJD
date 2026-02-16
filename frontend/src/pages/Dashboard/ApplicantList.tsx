import { useState, useEffect, useRef } from 'react';
import { Filter, Download, X, Sparkles, FileText, Trash2, Search, Calendar, ChevronDown, Users } from 'lucide-react';
import { auth } from '@/config/firebase';
import { applicationAPI, jdAPI } from '@/services/api';
import { AIAnalysisDashboard } from '@/components/ai/AIAnalysisComponents';

interface Application {
    id: string;
    applicantName: string;
    applicantEmail: string;
    applicantPhone?: string;
    applicantGender?: string;
    jdTitle: string;
    requirementAnswers?: Array<{ question: string; checked: boolean; detail: string; answer?: string }>;
    preferredAnswers?: Array<{ question: string; checked: boolean; detail: string; answer?: string }>;
    appliedAt: any;
    status: string;
}


export const ApplicantList = ({ onNavigateToApplicant }: { onNavigateToApplicant?: (id: string) => void }) => {
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);
    
    // 다중 필터 상태
    const [statusFilter, setStatusFilter] = useState<string[]>([]);
    const [jdFilter, setJdFilter] = useState<string[]>([]);
    const [genderFilter, setGenderFilter] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [dateRange, setDateRange] = useState<{start: string, end: string}>({start: '', end: ''});
    
    // 드롭다운 메뉴 상태
    const [showStatusMenu, setShowStatusMenu] = useState(false);
    const [showJdMenu, setShowJdMenu] = useState(false);
    const [showGenderMenu, setShowGenderMenu] = useState(false);
    const [showDateMenu, setShowDateMenu] = useState(false);
    
    // 공고 목록
    const [jdList, setJdList] = useState<Array<{ id: string; title: string; type?: string }>>([]);
    
    // AI 스크리닝 리포트 관련 상태
    const [selectedApplicant, setSelectedApplicant] = useState<Application | null>(null);
    const [aiSummary, setAiSummary] = useState<string>('');
    const [summaryLoading, setSummaryLoading] = useState(false);
    
    // 상태 드롭다운 메뉴
    const [openStatusDropdown, setOpenStatusDropdown] = useState<string | null>(null);
    const statusDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // 병렬 로딩으로 초기 로딩 속도 개선
        Promise.all([fetchApplications(), fetchJDs()]);
    }, []);

    // 상태 드롭다운 외부 클릭 감지
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) {
                setOpenStatusDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchApplications = async () => {
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) {
                console.log('로그인된 사용자가 없습니다.');
                setLoading(false);
                return;
            }

            console.log('지원서 불러오는 중...');
            // 캐시가 있으면 우선 사용하여 빠르게 표시 (3분 캐시)
            const applicationsData = await applicationAPI.getAll(true);

            // 클라이언트 측에서 날짜순 정렬
            applicationsData.sort((a: any, b: any) => {
                const dateA = a.appliedAt?.seconds ? a.appliedAt.seconds * 1000 : 0;
                const dateB = b.appliedAt?.seconds ? b.appliedAt.seconds * 1000 : 0;
                return dateB - dateA;
            });

            console.log('불러온 지원서:', applicationsData.length, '건');
            console.log('첫 번째 지원서 샘플:', applicationsData[0]);
            setApplications(applicationsData);
        } catch (error) {
            console.error('지원서 로딩 실패:', error);
            alert('지원서를 불러오는 중 오류가 발생했습니다.');
        } finally{
            setLoading(false);
        }
    };

    const fetchJDs = async () => {
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) return;

            const jdsData = await jdAPI.getAll();
            const jdsList = jdsData.map((jd: any) => ({
                id: jd.id,
                title: jd.title || '제목 없음',
                type: jd.type || 'club'
            }));

            setJdList(jdsList);
        } catch (error) {
            console.error('공고 목록 로딩 실패:', error);
        }
    };

    const handleStatusChange = async (applicationId: string, newStatus: string) => {
        try {
            await applicationAPI.update(applicationId, newStatus);

            // 로컬 상태 업데이트
            setApplications(prev =>
                prev.map(app =>
                    app.id === applicationId ? { ...app, status: newStatus } : app
                )
            );
        } catch (error) {
            console.error('상태 업데이트 실패:', error);
            alert('상태 업데이트에 실패했습니다.');
        }
    };

    const handleDeleteApplicant = async (applicationId: string, applicantName?: string) => {
        const message = applicantName 
            ? `정말 ${applicantName} 지원자를 삭제하시겠습니까?`
            : '정말로 이 지원자를 삭제하시겠습니까?';
            
        if (!confirm(message)) {
            return;
        }

        try {
            await applicationAPI.delete(applicationId);
            setApplications(prev => prev.filter(app => app.id !== applicationId));
            alert('지원자가 삭제되었습니다.');
        } catch (error) {
            console.error('지원자 삭제 실패:', error);
            alert('지원자 삭제에 실패했습니다.');
        }
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return '-';
        const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}.${month}.${day}`;
    };

    // AI 분석 로드 또는 생성 (캐싱)
    const loadOrGenerateAnalysis = async (application: Application) => {
        setSummaryLoading(true);
        try {
            const saved = await applicationAPI.getAnalysis(application.id);
            if (saved && saved.analysis) {
                setAiSummary(saved.analysis);
                return;
            }
            await runAnalysis(application);
        } catch (error) {
            console.error('분석 로드 실패:', error);
            await runAnalysis(application);
        } finally {
            setSummaryLoading(false);
        }
    };

    const runAnalysis = async (application: Application) => {
        try {
            const result = await applicationAPI.analyze(application);
            setAiSummary(result.analysis);
            await applicationAPI.saveAnalysis(application.id, result.analysis);
        } catch (error) {
            console.error('AI 분석 실패:', error);
            setAiSummary('AI 분석에 실패했습니다. 잠시 후 다시 시도해주세요.');
        }
    };

    const handleRefreshAnalysis = async () => {
        if (!selectedApplicant) return;
        setSummaryLoading(true);
        try {
            await runAnalysis(selectedApplicant);
        } finally {
            setSummaryLoading(false);
        }
    };

    // 지원자 클릭 핸들러
    const handleApplicantClick = (application: Application) => {
        if (onNavigateToApplicant) {
            onNavigateToApplicant(application.id);
        } else {
            setSelectedApplicant(application);
            setAiSummary('');
            loadOrGenerateAnalysis(application);
        }
    };

    // 모달 닫기
    const closeModal = () => {
        setSelectedApplicant(null);
        setAiSummary('');
    };

    // 엑셀 다운로드 함수 (xlsx를 동적으로 임포트하여 초기 번들 크기 감소)
    const handleExcelDownload = async () => {
        // 보안 경고
        const confirmed = confirm(
            '⚠️ 보안 경고\n\n' +
            '엑셀 파일에는 지원자의 개인정보(이름, 이메일, 전화번호)가 포함되어 있습니다.\n\n' +
            '• 파일을 안전하게 보관하세요\n' +
            '• 권한이 없는 사람과 공유하지 마세요\n' +
            '• 사용 후 안전하게 삭제하세요\n\n' +
            '다운로드하시겠습니까?'
        );
        
        if (!confirmed) return;
        
        try {
            // xlsx 라이브러리를 필요할 때만 동적 임포트 (~500KB 절약)
            const XLSX = await import('xlsx');

            // 엑셀로 변환할 데이터 준비
            const excelData = filteredApplications.map((app, index) => {
                // 자격요건 답변 정리
                const requirementAnswers = app.requirementAnswers?.map(ans => 
                    `${ans.question}: ${ans.answer === 'Y' ? '충족' : '미충족'}`
                ).join('\n') || '-';

                // 우대사항 답변 정리
                const preferredAnswers = app.preferredAnswers?.map(ans => 
                    `${ans.question}: ${ans.answer === 'Y' ? '충족' : '미충족'}`
                ).join('\n') || '-';

                return {
                    '번호': index + 1,
                    '지원자명': app.applicantName || '-',
                    '이메일': app.applicantEmail || '-',
                    '전화번호': app.applicantPhone || '-',
                    '성별': app.applicantGender || '-',
                    '지원 포지션': app.jdTitle || '-',
                    '지원일': formatDate(app.appliedAt),
                    '상태': app.status || '검토중',
                    '자격요건': requirementAnswers,
                    '우대사항': preferredAnswers
                };
            });

            // 워크시트 생성
            const worksheet = XLSX.utils.json_to_sheet(excelData);

            // 열 너비 설정
            const columnWidths = [
                { wch: 5 },   // 번호
                { wch: 12 },  // 지원자명
                { wch: 25 },  // 이메일
                { wch: 15 },  // 전화번호
                { wch: 8 },   // 성별
                { wch: 30 },  // 지원 포지션
                { wch: 12 },  // 지원일
                { wch: 10 },  // 상태
                { wch: 50 },  // 자격요건
                { wch: 50 }   // 우대사항
            ];
            worksheet['!cols'] = columnWidths;

            // 워크북 생성
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, '지원자 목록');

            // 파일명 생성 (현재 날짜 포함)
            const today = new Date();
            const dateString = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
            const fileName = `지원자_목록_${dateString}.xlsx`;

            // 파일 다운로드
            XLSX.writeFile(workbook, fileName);

            console.log('엑셀 다운로드 완료:', fileName);
        } catch (error) {
            console.error('엑셀 다운로드 실패:', error);
            alert('엑셀 파일 생성 중 오류가 발생했습니다.');
        }
    };

    const filteredApplications = applications.filter(app => {
        // 상태 필터
        if (statusFilter.length > 0 && !statusFilter.includes(app.status)) {
            return false;
        }
        
        // 공고 필터
        if (jdFilter.length > 0 && !jdFilter.includes(app.jdTitle)) {
            return false;
        }
        
        // 성별 필터
        if (genderFilter.length > 0 && !genderFilter.includes(app.applicantGender || '')) {
            return false;
        }
        
        // 검색어 필터 (이름, 이메일, 전화번호)
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const matchesName = app.applicantName.toLowerCase().includes(query);
            const matchesEmail = app.applicantEmail.toLowerCase().includes(query);
            const matchesPhone = app.applicantPhone?.toLowerCase().includes(query);
            
            if (!matchesName && !matchesEmail && !matchesPhone) {
                return false;
            }
        }
        
        // 날짜 범위 필터
        if (dateRange.start || dateRange.end) {
            const appDate = new Date(app.appliedAt.seconds * 1000);
            
            if (dateRange.start) {
                const startDate = new Date(dateRange.start);
                startDate.setHours(0, 0, 0, 0);
                if (appDate < startDate) return false;
            }
            
            if (dateRange.end) {
                const endDate = new Date(dateRange.end);
                endDate.setHours(23, 59, 59, 999);
                if (appDate > endDate) return false;
            }
        }
        
        return true;
    });

    const statusOptions = ['검토중', '합격', '불합격'];
    const genderOptions = ['남성', '여성', '기타'];

    // 필터 토글 함수들
    const toggleStatusFilter = (status: string) => {
        setStatusFilter(prev => 
            prev.includes(status) 
                ? prev.filter(s => s !== status)
                : [...prev, status]
        );
    };

    const toggleJdFilter = (jdTitle: string) => {
        setJdFilter(prev => 
            prev.includes(jdTitle) 
                ? prev.filter(j => j !== jdTitle)
                : [...prev, jdTitle]
        );
    };

    const toggleGenderFilter = (gender: string) => {
        setGenderFilter(prev => 
            prev.includes(gender) 
                ? prev.filter(g => g !== gender)
                : [...prev, gender]
        );
    };

    // 빠른 날짜 필터
    const setQuickDateFilter = (type: 'today' | 'week' | 'month' | 'all') => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        switch(type) {
            case 'today':
                setDateRange({
                    start: today.toISOString().split('T')[0],
                    end: today.toISOString().split('T')[0]
                });
                break;
            case 'week':
                const weekAgo = new Date(today);
                weekAgo.setDate(weekAgo.getDate() - 7);
                setDateRange({
                    start: weekAgo.toISOString().split('T')[0],
                    end: today.toISOString().split('T')[0]
                });
                break;
            case 'month':
                const monthAgo = new Date(today);
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                setDateRange({
                    start: monthAgo.toISOString().split('T')[0],
                    end: today.toISOString().split('T')[0]
                });
                break;
            case 'all':
                setDateRange({start: '', end: ''});
                break;
        }
        setShowDateMenu(false);
    };

    // 모든 필터 초기화
    const clearAllFilters = () => {
        setStatusFilter([]);
        setJdFilter([]);
        setGenderFilter([]);
        setSearchQuery('');
        setDateRange({start: '', end: ''});
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-500">로딩 중...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm min-h-[600px] flex flex-col max-w-[1400px] mx-auto">
            <div className="p-4 sm:p-6 border-b border-gray-100">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4">
                    <div>
                        <h3 className="font-bold text-lg sm:text-xl text-gray-900 mb-1">지원자 관리</h3>
                        <p className="text-sm text-gray-500">총 {filteredApplications.length}명의 지원자</p>
                    </div>
                    
                    <button 
                        onClick={handleExcelDownload}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm flex-shrink-0 self-start"
                    >
                        <Download size={18}/> 엑셀 다운로드
                    </button>
                </div>
                
                {/* 필터 영역 */}
                <div className="space-y-3">
                    {/* 검색바 */}
                    <div className="relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="이름, 이메일, 전화번호로 검색..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                    </div>
                    
                    {/* 필터 버튼들 */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* 상태 필터 */}
                        <div className="relative">
                            <button 
                                onClick={() => setShowStatusMenu(!showStatusMenu)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                                    statusFilter.length > 0 
                                        ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                }`}
                            >
                                <Filter size={16}/>
                                상태
                                {statusFilter.length > 0 && (
                                    <span className="ml-1 px-1.5 py-0.5 bg-blue-600 text-white rounded-full text-xs font-bold">
                                        {statusFilter.length}
                                    </span>
                                )}
                                <ChevronDown size={14} />
                            </button>
                            
                            {showStatusMenu && (
                                <div className="absolute top-12 left-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-2 w-40">
                                    {statusOptions.map(status => (
                                        <label
                                            key={status}
                                            className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 cursor-pointer"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={statusFilter.includes(status)}
                                                onChange={() => toggleStatusFilter(status)}
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-sm text-gray-700">{status}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 공고 필터 */}
                        <div className="relative">
                            <button 
                                onClick={() => setShowJdMenu(!showJdMenu)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                                    jdFilter.length > 0 
                                        ? 'bg-purple-50 text-purple-700 border-purple-200' 
                                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                }`}
                            >
                                <FileText size={16}/>
                                공고
                                {jdFilter.length > 0 && (
                                    <span className="ml-1 px-1.5 py-0.5 bg-purple-600 text-white rounded-full text-xs font-bold">
                                        {jdFilter.length}
                                    </span>
                                )}
                                <ChevronDown size={14} />
                            </button>
                            
                            {showJdMenu && (
                                <div className="absolute top-12 left-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-2 min-w-[250px] max-h-[300px] overflow-y-auto">
                                    {jdList.map(jd => (
                                        <label
                                            key={jd.id}
                                            className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 cursor-pointer"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={jdFilter.includes(jd.title)}
                                                onChange={() => toggleJdFilter(jd.title)}
                                                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                            />
                                            <span className="text-sm text-gray-700">{jd.title}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 성별 필터 */}
                        <div className="relative">
                            <button 
                                onClick={() => setShowGenderMenu(!showGenderMenu)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                                    genderFilter.length > 0 
                                        ? 'bg-green-50 text-green-700 border-green-200' 
                                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                }`}
                            >
                                <Users size={16}/>
                                성별
                                {genderFilter.length > 0 && (
                                    <span className="ml-1 px-1.5 py-0.5 bg-green-600 text-white rounded-full text-xs font-bold">
                                        {genderFilter.length}
                                    </span>
                                )}
                                <ChevronDown size={14} />
                            </button>
                            
                            {showGenderMenu && (
                                <div className="absolute top-12 left-0 bg-white border-gray-200 rounded-lg shadow-lg z-10 py-2 w-32">
                                    {genderOptions.map(gender => (
                                        <label
                                            key={gender}
                                            className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 cursor-pointer"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={genderFilter.includes(gender)}
                                                onChange={() => toggleGenderFilter(gender)}
                                                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                                            />
                                            <span className="text-sm text-gray-700">{gender}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 날짜 필터 */}
                        <div className="relative">
                            <button 
                                onClick={() => setShowDateMenu(!showDateMenu)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                                    (dateRange.start || dateRange.end)
                                        ? 'bg-orange-50 text-orange-700 border-orange-200' 
                                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                }`}
                            >
                                <Calendar size={16}/>
                                기간
                                {(dateRange.start || dateRange.end) && (
                                    <span className="ml-1 px-1.5 py-0.5 bg-orange-600 text-white rounded-full text-xs font-bold">
                                        1
                                    </span>
                                )}
                                <ChevronDown size={14} />
                            </button>
                            
                            {showDateMenu && (
                                <div className="absolute top-12 left-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-2 w-64">
                                    <div className="px-4 py-2 border-b border-gray-100">
                                        <p className="text-xs font-semibold text-gray-500 mb-2">빠른 선택</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                onClick={() => setQuickDateFilter('today')}
                                                className="px-3 py-1.5 text-xs bg-gray-50 hover:bg-gray-100 rounded text-gray-700 font-medium"
                                            >
                                                오늘
                                            </button>
                                            <button
                                                onClick={() => setQuickDateFilter('week')}
                                                className="px-3 py-1.5 text-xs bg-gray-50 hover:bg-gray-100 rounded text-gray-700 font-medium"
                                            >
                                                최근 7일
                                            </button>
                                            <button
                                                onClick={() => setQuickDateFilter('month')}
                                                className="px-3 py-1.5 text-xs bg-gray-50 hover:bg-gray-100 rounded text-gray-700 font-medium"
                                            >
                                                최근 30일
                                            </button>
                                            <button
                                                onClick={() => setQuickDateFilter('all')}
                                                className="px-3 py-1.5 text-xs bg-gray-50 hover:bg-gray-100 rounded text-gray-700 font-medium"
                                            >
                                                전체
                                            </button>
                                        </div>
                                    </div>
                                    <div className="px-4 py-3">
                                        <p className="text-xs font-semibold text-gray-500 mb-2">사용자 지정</p>
                                        <div className="space-y-2">
                                            <div>
                                                <label className="text-xs text-gray-600 mb-1 block">시작일</label>
                                                <input
                                                    type="date"
                                                    value={dateRange.start}
                                                    onChange={(e) => setDateRange(prev => ({...prev, start: e.target.value}))}
                                                    className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:border-orange-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-600 mb-1 block">종료일</label>
                                                <input
                                                    type="date"
                                                    value={dateRange.end}
                                                    onChange={(e) => setDateRange(prev => ({...prev, end: e.target.value}))}
                                                    className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:border-orange-500"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 필터 초기화 버튼 */}
                        {(statusFilter.length > 0 || jdFilter.length > 0 || genderFilter.length > 0 || searchQuery || dateRange.start || dateRange.end) && (
                            <button
                                onClick={clearAllFilters}
                                className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors"
                            >
                                <X size={16} />
                                필터 초기화
                            </button>
                        )}
                    </div>
                    
                    {/* 활성 필터 태그 */}
                    {(statusFilter.length > 0 || jdFilter.length > 0 || genderFilter.length > 0 || searchQuery || dateRange.start || dateRange.end) && (
                        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-gray-100">
                            <span className="text-xs text-gray-500 font-medium">활성 필터:</span>
                            
                            {searchQuery && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                                    검색: "{searchQuery}"
                                    <button onClick={() => setSearchQuery('')} className="hover:text-red-600">
                                        <X size={12} />
                                    </button>
                                </span>
                            )}
                            
                            {statusFilter.map(status => (
                                <span key={status} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                                    {status}
                                    <button onClick={() => toggleStatusFilter(status)} className="hover:text-red-600">
                                        <X size={12} />
                                    </button>
                                </span>
                            ))}
                            
                            {jdFilter.map(jd => (
                                <span key={jd} className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                                    {jd}
                                    <button onClick={() => toggleJdFilter(jd)} className="hover:text-red-600">
                                        <X size={12} />
                                    </button>
                                </span>
                            ))}
                            
                            {genderFilter.map(gender => (
                                <span key={gender} className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                                    {gender}
                                    <button onClick={() => toggleGenderFilter(gender)} className="hover:text-red-600">
                                        <X size={12} />
                                    </button>
                                </span>
                            ))}
                            
                            {(dateRange.start || dateRange.end) && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs">
                                    {dateRange.start && dateRange.end 
                                        ? `${dateRange.start} ~ ${dateRange.end}`
                                        : dateRange.start 
                                        ? `${dateRange.start} 이후`
                                        : `${dateRange.end} 이전`
                                    }
                                    <button onClick={() => setDateRange({start: '', end: ''})} className="hover:text-red-600">
                                        <X size={12} />
                                    </button>
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-auto">
                <table className="w-full text-left text-sm text-gray-600" style={{fontSize: '0.85rem'}}>
                    <thead className="bg-[#F8FAFC] text-[10px] uppercase font-bold text-gray-400 tracking-wider sticky top-0">
                        <tr>
                            <th className="px-3 py-3 w-10"><input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"/></th>
                            <th className="px-3 py-3 whitespace-nowrap">이름</th>
                            <th className="px-3 py-3 whitespace-nowrap">이메일</th>
                            <th className="px-3 py-3 whitespace-nowrap">전화번호</th>
                            <th className="px-3 py-3 whitespace-nowrap">성별</th>
                            <th className="px-3 py-3 whitespace-nowrap">지원 포지션</th>
                            <th className="px-3 py-3 whitespace-nowrap">지원 일시</th>
                            <th className="px-3 py-3 text-center whitespace-nowrap">작성 내용</th>
                            <th className="px-3 py-3 text-center whitespace-nowrap min-w-[110px]">상태</th>
                            <th className="px-3 py-3 text-center whitespace-nowrap">관리</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredApplications.length === 0 ? (
                            <tr>
                                <td colSpan={10} className="px-6 py-20 text-center text-gray-400">
                                    {statusFilter.length > 0 || jdFilter.length > 0 || genderFilter.length > 0 || searchQuery || dateRange.start || dateRange.end
                                        ? '조건에 맞는 지원자가 없습니다.'
                                        : '아직 지원자가 없습니다.'
                                    }
                                </td>
                            </tr>
                        ) : (
                            filteredApplications.map((application) => (
                                <tr key={application.id} className="hover:bg-blue-50/30 transition-colors group cursor-pointer">
                                    <td className="px-3 py-3"><input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" onClick={(e) => e.stopPropagation()}/></td>
                                    <td className="px-3 py-3 whitespace-nowrap" onClick={() => handleApplicantClick(application)}>
                                        <div className="font-bold text-[13px] text-gray-900">
                                            {application.applicantName}
                                        </div>
                                    </td>
                                    <td className="px-3 py-3 whitespace-nowrap" onClick={() => handleApplicantClick(application)}>
                                        <div className="text-[12px] text-gray-600">
                                            {application.applicantEmail}
                                        </div>
                                    </td>
                                    <td className="px-3 py-3 text-[12px] text-gray-600 whitespace-nowrap" onClick={() => handleApplicantClick(application)}>
                                        {application.applicantPhone || '-'}
                                    </td>
                                    <td className="px-3 py-3 text-[12px] text-gray-600 whitespace-nowrap" onClick={() => handleApplicantClick(application)}>{application.applicantGender || '-'}</td>
                                    <td className="px-3 py-3 whitespace-nowrap" onClick={() => handleApplicantClick(application)}>
                                        <div className="text-[12px] font-medium text-gray-700">{application.jdTitle}</div>
                                    </td>
                                    <td className="px-3 py-3 text-[12px] text-gray-400 whitespace-nowrap" onClick={() => handleApplicantClick(application)}>{formatDate(application.appliedAt)}</td>
                                    <td className="px-3 py-3">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleApplicantClick(application);
                                            }}
                                            className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-[11px] font-medium mx-auto whitespace-nowrap"
                                        >
                                            <Sparkles size={13} />
                                            AI 분석
                                        </button>
                                    </td>
                                    <td className="px-3 py-3">
                                        <div className="relative flex justify-center" ref={openStatusDropdown === application.id ? statusDropdownRef : undefined}>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setOpenStatusDropdown(openStatusDropdown === application.id ? null : application.id);
                                                }}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all whitespace-nowrap ${
                                                    application.status === '합격'
                                                        ? 'bg-green-100 text-green-700'
                                                        : application.status === '불합격'
                                                        ? 'bg-red-100 text-red-700'
                                                        : 'bg-gray-100 text-gray-600'
                                                }`}
                                            >
                                                <span className={`w-2 h-2 rounded-full ${
                                                    application.status === '합격' ? 'bg-green-500'
                                                    : application.status === '불합격' ? 'bg-red-500'
                                                    : 'bg-gray-400'
                                                }`} />
                                                {application.status || '검토중'}
                                            </button>
                                            {openStatusDropdown === application.id && (
                                                <div className="absolute top-full mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-xl py-1.5 min-w-[130px] animate-in fade-in slide-in-from-top-1 duration-150">
                                                    <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">상태 변경</div>
                                                    {[
                                                        { label: '검토중', color: 'bg-gray-400', hoverBg: 'hover:bg-gray-50' },
                                                        { label: '합격', color: 'bg-green-500', hoverBg: 'hover:bg-green-50' },
                                                        { label: '불합격', color: 'bg-red-500', hoverBg: 'hover:bg-red-50' },
                                                    ].map(opt => (
                                                        <button
                                                            key={opt.label}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleStatusChange(application.id, opt.label);
                                                                setOpenStatusDropdown(null);
                                                            }}
                                                            className={`w-full flex items-center gap-2.5 px-3 py-2 text-[12px] font-medium text-gray-700 ${opt.hoverBg} transition-colors ${
                                                                (application.status || '검토중') === opt.label ? 'bg-blue-50 text-blue-700' : ''
                                                            }`}
                                                        >
                                                            <span className={`w-2.5 h-2.5 rounded-full ${opt.color}`} />
                                                            {opt.label}
                                                            {(application.status || '검토중') === opt.label && (
                                                                <span className="ml-auto text-blue-500 text-[10px]">✓</span>
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-3 py-3">
                                        <div className="flex justify-center">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteApplicant(application.id, application.applicantName);
                                                }}
                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                title="지원자 삭제"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* AI 스크리닝 리포트 모달 */}
            {selectedApplicant && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={closeModal}>
                    <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        {/* 모달 헤더 */}
                        <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-6 text-white">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-2xl font-bold mb-2">AI 스크리닝 리포트</h2>
                                    <p className="text-blue-100 text-sm">
                                        {selectedApplicant.applicantName} · {selectedApplicant.jdTitle}
                                    </p>
                                </div>
                                <button onClick={closeModal} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        {/* 모달 본문 */}
                        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                            {/* AI 요약 섹션 */}
                            <div className="mb-8">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold text-gray-900">AI 자동 요약</h3>
                                    <button
                                        onClick={handleRefreshAnalysis}
                                        disabled={summaryLoading}
                                        className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        {summaryLoading ? '분석 중...' : '다시 분석'}
                                    </button>
                                </div>
                                
                                {summaryLoading ? (
                                    <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                                        <div className="flex items-center gap-3">
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                            <p className="text-gray-600">AI가 지원자 답변을 분석하고 있습니다...</p>
                                        </div>
                                    </div>
                                ) : (
                                    <AIAnalysisDashboard content={aiSummary || ''} />
                                )}
                            </div>

                            {/* 전체 답변 내용 섹션 */}
                            <div>
                                <div className="mb-4">
                                    <h3 className="text-lg font-bold text-gray-900">전체 답변 내용</h3>
                                </div>
                                
                                <div className="space-y-6">
                                    {/* 자격 요건 / 지원자 체크리스트 */}
                                    {selectedApplicant.requirementAnswers && selectedApplicant.requirementAnswers.length > 0 && (
                                        <div className="bg-white rounded-xl p-5 border border-gray-200">
                                            <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                                                <span className="text-blue-600">✓</span> {(jdList.find(j => j.title === selectedApplicant.jdTitle)?.type || 'club') === 'company' ? '자격 요건' : '지원자 체크리스트 (필수)'}
                                            </h4>
                                            <div className="space-y-2">
                                                {selectedApplicant.requirementAnswers.map((answer: any, index: number) => (
                                                    <div key={index} className="flex items-center gap-2">
                                                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                                                            answer.checked ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                                                        }`}>
                                                            {answer.checked ? '✓' : '✗'}
                                                        </span>
                                                        <p className="text-gray-700">{answer.question}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* 우대 사항 / 우대 체크리스트 */}
                                    {selectedApplicant.preferredAnswers && selectedApplicant.preferredAnswers.length > 0 && (
                                        <div className="bg-white rounded-xl p-5 border border-gray-200">
                                            <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                                                <span className="text-purple-600">★</span> {(jdList.find(j => j.title === selectedApplicant.jdTitle)?.type || 'club') === 'company' ? '우대 사항' : '지원자 체크리스트 (우대)'}
                                            </h4>
                                            <div className="space-y-2">
                                                {selectedApplicant.preferredAnswers.map((answer: any, index: number) => (
                                                    <div key={index} className="flex items-center gap-2">
                                                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                                                            answer.checked ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-400'
                                                        }`}>
                                                            {answer.checked ? '✓' : '✗'}
                                                        </span>
                                                        <p className="text-gray-700">{answer.question}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 모달 푸터 */}
                        <div className="border-t border-gray-100 p-6 bg-gray-50">
                            <div className="flex justify-between items-center">
                                <div className="text-sm text-gray-500">
                                    <span className="font-medium">지원일:</span> {formatDate(selectedApplicant.appliedAt)}
                                </div>
                                <button onClick={closeModal} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                                    닫기
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
