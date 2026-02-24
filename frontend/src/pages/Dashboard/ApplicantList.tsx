import { useState, useEffect, useRef, useCallback } from 'react';
import { Filter, Download, X, Sparkles, FileText, Trash2, Search, Calendar, ChevronDown, Users, ClipboardList, Shuffle, ArrowUpDown, Clock, CheckCircle2 } from 'lucide-react';
import { auth } from '@/config/firebase';
import { applicationAPI, jdAPI } from '@/services/api';
import { AIAnalysisDashboard } from '@/components/ai/AIAnalysisComponents';
import { useDemoMode } from '@/components/onboarding';

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
    const { isDemoMode, demoApplicants, demoAiAnalysis, onDemoAction, currentStepId } = useDemoMode();
    
    const [statusFilter, setStatusFilter] = useState<string[]>([]);
    const [jdFilter, setJdFilter] = useState<string[]>([]);
    const [genderFilter, setGenderFilter] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [dateRange, setDateRange] = useState<{start: string, end: string}>({start: '', end: ''});
    
    const [showStatusMenu, setShowStatusMenu] = useState(false);
    const [showJdMenu, setShowJdMenu] = useState(false);
    const [showGenderMenu, setShowGenderMenu] = useState(false);
    const [showDateMenu, setShowDateMenu] = useState(false);

    // 튜토리얼 스텝 변경 시 모든 드롭다운 닫기 (currentStepId React state 방식 + 커스텀 이벤트 방식 병행)
    useEffect(() => {
      if (isDemoMode && currentStepId) {
        setShowStatusMenu(false);
        setShowJdMenu(false);
        setShowGenderMenu(false);
        setShowDateMenu(false);
      }
    }, [currentStepId, isDemoMode]);

    // 커스텀 이벤트 기반 드롭다운 강제 닫기 (React state 타이밍 문제 보완)
    useEffect(() => {
      if (!isDemoMode) return;
      const handleCloseMenus = () => {
        setShowStatusMenu(false);
        setShowJdMenu(false);
        setShowGenderMenu(false);
        setShowDateMenu(false);
      };
      window.addEventListener('tutorial:close-menus', handleCloseMenus);
      return () => window.removeEventListener('tutorial:close-menus', handleCloseMenus);
    }, [isDemoMode]);
    
    const [jdList, setJdList] = useState<Array<{ id: string; title: string; type?: string }>>([]);
    
    const [selectedApplicant, setSelectedApplicant] = useState<Application | null>(null);
    const [aiSummary, setAiSummary] = useState<string>('');
    const [summaryLoading, setSummaryLoading] = useState(false);
    
    const [openStatusDropdown, setOpenStatusDropdown] = useState<string | null>(null);
    const statusDropdownRef = useRef<HTMLDivElement>(null);

    // 면접 일정 내보내기 모달 상태
    const [showInterviewModal, setShowInterviewModal] = useState(false);
    const [interviewSortOrder, setInterviewSortOrder] = useState<'alphabetical' | 'random'>('alphabetical');
    const [interviewDate, setInterviewDate] = useState('');
    const [interviewStartTime, setInterviewStartTime] = useState('09:00');
    const [interviewDuration, setInterviewDuration] = useState(30); // 분
    const [interviewBreak, setInterviewBreak] = useState(10); // 분
    const [interviewLocation, setInterviewLocation] = useState('');
    const [shuffledPassers, setShuffledPassers] = useState<Application[]>([]);

    useEffect(() => {
        if (isDemoMode) {
            setApplications(demoApplicants as any);
            setJdList([
                { id: 'demo-jd-001', title: '프론트엔드 개발자 (React/TypeScript)', type: 'company' },
                { id: 'demo-jd-002', title: '백엔드 엔지니어 (Python/FastAPI)', type: 'company' },
            ]);
            setLoading(false);
            return;
        }
        Promise.all([fetchApplications(), fetchJDs()]);
    }, [isDemoMode]);

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
                setLoading(false);
                return;
            }

            const applicationsData = await applicationAPI.getAll(true);

            applicationsData.sort((a: any, b: any) => {
                const dateA = a.appliedAt?.seconds ? a.appliedAt.seconds * 1000 : 0;
                const dateB = b.appliedAt?.seconds ? b.appliedAt.seconds * 1000 : 0;
                return dateB - dateA;
            });

            setApplications(applicationsData);
        } catch (error) {
            console.error('지원서 로딩 실패:', error);
            alert('지원서를 불러오는 중 오류가 발생했습니다.');
        } finally {
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

    // 면접 일정 관련 함수
    const getPassedApplicants = useCallback(() => {
        return applications.filter(app => app.status === '합격');
    }, [applications]);

    const openInterviewModal = () => {
        const passers = getPassedApplicants();
        const sorted = [...passers].sort((a, b) =>
            a.applicantName.localeCompare(b.applicantName, 'ko')
        );
        setShuffledPassers(sorted);
        setInterviewSortOrder('alphabetical');
        setShowInterviewModal(true);
    };

    const handleSortChange = (order: 'alphabetical' | 'random') => {
        setInterviewSortOrder(order);
        const passers = getPassedApplicants();
        if (order === 'alphabetical') {
            setShuffledPassers([...passers].sort((a, b) =>
                a.applicantName.localeCompare(b.applicantName, 'ko')
            ));
        } else {
            const arr = [...passers];
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            setShuffledPassers(arr);
        }
    };

    const calcInterviewTime = (index: number): string => {
        if (!interviewDate || !interviewStartTime) return '-';
        const [h, m] = interviewStartTime.split(':').map(Number);
        const totalMinutes = h * 60 + m + index * (interviewDuration + interviewBreak);
        const endMinutes = totalMinutes + interviewDuration;
        const fmt = (mins: number) => {
            const hh = Math.floor(mins / 60) % 24;
            const mm = mins % 60;
            return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
        };
        return `${fmt(totalMinutes)} ~ ${fmt(endMinutes)}`;
    };

    const handleInterviewExcel = async () => {
        const confirmed = confirm(
            '개인정보 보안 경고\n\n' +
            '엑셀 파일에는 합격자의 개인정보(이름, 이메일, 전화번호)가 포함되어 있습니다.\n\n' +
            '이 파일은 안전하게 보관해주세요.\n' +
            '미허가자에게 공유하거나 공개하지 마세요.\n\n' +
            '다운로드하시겠습니까?'
        );
        if (!confirmed) return;

        try {
            const XLSX = await import('xlsx');

            const excelData = shuffledPassers.map((app, index) => {
                const timeSlot = calcInterviewTime(index);
                return {
                    '순번': index + 1,
                    '이름': app.applicantName || '-',
                    '이메일': app.applicantEmail || '-',
                    '전화번호': app.applicantPhone || '-',
                    '성별': app.applicantGender || '-',
                    '지원공고': app.jdTitle || '-',
                    '면접일자': interviewDate || '-',
                    '면접시간': timeSlot,
                    '면접장소': interviewLocation || '-',
                    '소요시간(분)': interviewDuration,
                    '정렬방식': interviewSortOrder === 'alphabetical' ? '가나다순' : '무작위',
                };
            });

            const worksheet = XLSX.utils.json_to_sheet(excelData);
            worksheet['!cols'] = [
                { wch: 6 }, { wch: 12 }, { wch: 25 }, { wch: 15 },
                { wch: 8 }, { wch: 30 }, { wch: 14 }, { wch: 18 },
                { wch: 20 }, { wch: 14 }, { wch: 12 },
            ];

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, '면접 일정');

            const today = new Date();
            const dateString = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
            XLSX.writeFile(workbook, `면접일정_${dateString}.xlsx`);
            setShowInterviewModal(false);
        } catch (error) {
            console.error('면접 일정 엑셀 생성 실패:', error);
            alert('엑셀 파일 생성 중 오류가 발생했습니다.');
        }
    };

    const handleApplicantClick = (application: Application) => {
        if (isDemoMode && onNavigateToApplicant) {
            // 데모 모드: 실제 페이지처럼 지원자 상세 페이지로 이동
            onDemoAction?.('ai-analysis-opened');
            onNavigateToApplicant(application.id);
        } else if (onNavigateToApplicant && !isDemoMode) {
            onNavigateToApplicant(application.id);
        } else {
            setSelectedApplicant(application);
            setAiSummary('');
            if (isDemoMode) {
                setSummaryLoading(true);
                onDemoAction?.('ai-analysis-opened');
                setTimeout(() => {
                    setAiSummary(demoAiAnalysis);
                    setSummaryLoading(false);
                    setTimeout(() => onDemoAction?.('ai-modal-ready'), 300);
                }, 1200);
            } else {
                loadOrGenerateAnalysis(application);
            }
        }
    };

    const closeModal = () => {
        setSelectedApplicant(null);
        setAiSummary('');
    };

    const handleExcelDownload = async () => {
        const confirmed = confirm(
            '개인정보 보안 경고\n\n' +
            '엑셀 파일에는 지원자의 개인정보(이름, 이메일, 전화번호)가 포함되어 있습니다.\n\n' +
            '이 파일은 안전하게 보관해주세요.\n' +
            '미허가자에게 공유하거나 공개하지 마세요.\n' +
            '사용 후 안전하게 삭제해주세요.\n\n' +
            '다운로드하시겠습니까?'
        );
        
        if (!confirmed) return;
        
        try {
            const XLSX = await import('xlsx');

            const excelData = filteredApplications.map((app, index) => {
                const requirementAnswers = app.requirementAnswers?.map(ans =>
                    `${ans.question}: ${ans.answer === 'Y' ? '예' : '아니오'}`
                ).join('\n') || '-';

                const preferredAnswers = app.preferredAnswers?.map(ans =>
                    `${ans.question}: ${ans.answer === 'Y' ? '예' : '아니오'}`
                ).join('\n') || '-';

                return {
                    '번호': index + 1,
                    '지원자명': app.applicantName || '-',
                    '이메일': app.applicantEmail || '-',
                    '전화번호': app.applicantPhone || '-',
                    '성별': app.applicantGender || '-',
                    '지원공고': app.jdTitle || '-',
                    '지원일': formatDate(app.appliedAt),
                    '상태': app.status || '검토중',
                    '필수조건': requirementAnswers,
                    '우대조건': preferredAnswers
                };
            });

            const worksheet = XLSX.utils.json_to_sheet(excelData);

            const columnWidths = [
                { wch: 5 },
                { wch: 12 },
                { wch: 25 },
                { wch: 15 },
                { wch: 8 },
                { wch: 30 },
                { wch: 12 },
                { wch: 10 },
                { wch: 50 },
                { wch: 50 }
            ];
            worksheet['!cols'] = columnWidths;

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, '지원자 목록');

            const today = new Date();
            const dateString = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
            const fileName = `지원자_목록_${dateString}.xlsx`;

            XLSX.writeFile(workbook, fileName);
        } catch (error) {
            console.error('엑셀 다운로드 실패:', error);
            alert('엑셀 파일 생성 중 오류가 발생했습니다.');
        }
    };

    const filteredApplications = applications.filter(app => {
        if (statusFilter.length > 0 && !statusFilter.includes(app.status)) {
            return false;
        }
        
        if (jdFilter.length > 0 && !jdFilter.includes(app.jdTitle)) {
            return false;
        }
        
        if (genderFilter.length > 0 && !genderFilter.includes(app.applicantGender || '')) {
            return false;
        }
        
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const matchesName = app.applicantName.toLowerCase().includes(query);
            const matchesEmail = app.applicantEmail.toLowerCase().includes(query);
            const matchesPhone = app.applicantPhone?.toLowerCase().includes(query);
            
            if (!matchesName && !matchesEmail && !matchesPhone) {
                return false;
            }
        }
        
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
                    
                    <div className="flex items-center gap-2 flex-wrap self-start">
                        <button
                            onClick={openInterviewModal}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm flex-shrink-0"
                        >
                            <ClipboardList size={18}/> 면접 일정 내보내기
                            {getPassedApplicants().length > 0 && (
                                <span className="ml-1 px-1.5 py-0.5 bg-white/30 rounded-full text-xs font-bold">
                                    {getPassedApplicants().length}명
                                </span>
                            )}
                        </button>
                        <button
                            onClick={handleExcelDownload}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm flex-shrink-0"
                        >
                            <Download size={18}/> 엑셀 다운로드
                        </button>
                    </div>
                </div>
                
                <div className="space-y-3">
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
                    
                    <div className="flex items-center gap-2 flex-wrap">
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

                        <div className="relative" data-tour="applicant-jd-filter">
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
                                <div className="absolute top-12 left-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-2 w-32">
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
                                            <button onClick={() => setQuickDateFilter('today')} className="px-3 py-1.5 text-xs bg-gray-50 hover:bg-gray-100 rounded text-gray-700 font-medium">오늘</button>
                                            <button onClick={() => setQuickDateFilter('week')} className="px-3 py-1.5 text-xs bg-gray-50 hover:bg-gray-100 rounded text-gray-700 font-medium">최근 7일</button>
                                            <button onClick={() => setQuickDateFilter('month')} className="px-3 py-1.5 text-xs bg-gray-50 hover:bg-gray-100 rounded text-gray-700 font-medium">최근 30일</button>
                                            <button onClick={() => setQuickDateFilter('all')} className="px-3 py-1.5 text-xs bg-gray-50 hover:bg-gray-100 rounded text-gray-700 font-medium">전체</button>
                                        </div>
                                    </div>
                                    <div className="px-4 py-3">
                                        <p className="text-xs font-semibold text-gray-500 mb-2">직접 입력</p>
                                        <div className="space-y-2">
                                            <div>
                                                <label className="text-xs text-gray-600 mb-1 block">시작일</label>
                                                <input type="date" value={dateRange.start} onChange={(e) => setDateRange(prev => ({...prev, start: e.target.value}))} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:border-orange-500" />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-600 mb-1 block">종료일</label>
                                                <input type="date" value={dateRange.end} onChange={(e) => setDateRange(prev => ({...prev, end: e.target.value}))} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:border-orange-500" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {(statusFilter.length > 0 || jdFilter.length > 0 || genderFilter.length > 0 || searchQuery || dateRange.start || dateRange.end) && (
                            <button onClick={clearAllFilters} className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors">
                                <X size={16} />
                                필터 초기화
                            </button>
                        )}
                    </div>
                    
                    {(statusFilter.length > 0 || jdFilter.length > 0 || genderFilter.length > 0 || searchQuery || dateRange.start || dateRange.end) && (
                        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-gray-100">
                            <span className="text-xs text-gray-500 font-medium">적용된 필터:</span>
                            
                            {searchQuery && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                                    검색: "{searchQuery}"
                                    <button onClick={() => setSearchQuery('')} className="hover:text-red-600"><X size={12} /></button>
                                </span>
                            )}
                            
                            {statusFilter.map(status => (
                                <span key={status} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                                    {status}
                                    <button onClick={() => toggleStatusFilter(status)} className="hover:text-red-600"><X size={12} /></button>
                                </span>
                            ))}
                            
                            {jdFilter.map(jd => (
                                <span key={jd} className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                                    {jd}
                                    <button onClick={() => toggleJdFilter(jd)} className="hover:text-red-600"><X size={12} /></button>
                                </span>
                            ))}
                            
                            {genderFilter.map(gender => (
                                <span key={gender} className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                                    {gender}
                                    <button onClick={() => toggleGenderFilter(gender)} className="hover:text-red-600"><X size={12} /></button>
                                </span>
                            ))}
                            
                            {(dateRange.start || dateRange.end) && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs">
                                    {dateRange.start && dateRange.end ? `${dateRange.start} ~ ${dateRange.end}` : dateRange.start ? `${dateRange.start} 이후` : `${dateRange.end} 이전`}
                                    <button onClick={() => setDateRange({start: '', end: ''})} className="hover:text-red-600"><X size={12} /></button>
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="lg:hidden flex-1 overflow-auto p-3 sm:p-4">
                {filteredApplications.length === 0 ? (
                    <div className="py-20 text-center text-gray-400">
                        {statusFilter.length > 0 || jdFilter.length > 0 || genderFilter.length > 0 || searchQuery || dateRange.start || dateRange.end
                            ? '조건에 맞는 지원자가 없습니다.'
                            : '아직 지원자가 없습니다.'
                        }
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredApplications.map((application, appIndex) => (
                            <div key={application.id} className="bg-white border border-gray-100 rounded-xl p-4 hover:shadow-md transition-all cursor-pointer active:scale-[0.99]" onClick={() => handleApplicantClick(application)} {...(appIndex === 0 ? { 'data-tour': 'applicant-row-first' } : {})}>
                                <div className="flex items-start justify-between gap-3 mb-3">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-[15px] text-gray-900 truncate">{application.applicantName}</span>
                                            <span className={`flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${application.status === '합격' ? 'bg-green-100 text-green-700' : application.status === '불합격' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${application.status === '합격' ? 'bg-green-500' : application.status === '불합격' ? 'bg-red-500' : 'bg-gray-400'}`} />
                                                {application.status || '검토중'}
                                            </span>
                                        </div>
                                        <p className="text-[12px] text-gray-500 truncate">{application.jdTitle}</p>
                                    </div>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        <button onClick={(e) => { e.stopPropagation(); handleApplicantClick(application); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="AI 분석" {...(appIndex === 0 ? { 'data-tour': 'ai-analysis-btn-first' } : {})}>
                                            <Sparkles size={16} />
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteApplicant(application.id, application.applicantName); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="삭제">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-400">
                                    <span>{application.applicantEmail}</span>
                                    {application.applicantPhone && <span>{application.applicantPhone}</span>}
                                    <span>{formatDate(application.appliedAt)}</span>
                                </div>
                                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
                                    {['검토중', '합격', '불합격'].map(status => (
                                        <button key={status} onClick={(e) => { e.stopPropagation(); handleStatusChange(application.id, status); }} className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${(application.status || '검토중') === status ? status === '합격' ? 'bg-green-500 text-white' : status === '불합격' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
                                            {status}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="hidden lg:block flex-1 overflow-auto">
                <table className="w-full text-left text-sm text-gray-600" style={{fontSize: '0.85rem'}}>
                    <thead className="bg-[#F8FAFC] text-[10px] uppercase font-bold text-gray-400 tracking-wider sticky top-0">
                        <tr>
                            <th className="px-3 py-3 whitespace-nowrap">이름</th>
                            <th className="px-3 py-3 whitespace-nowrap">이메일</th>
                            <th className="px-3 py-3 whitespace-nowrap">전화번호</th>
                            <th className="px-3 py-3 whitespace-nowrap">성별</th>
                            <th className="px-3 py-3 whitespace-nowrap">지원공고</th>
                            <th className="px-3 py-3 whitespace-nowrap">지원일시</th>
                            <th className="px-3 py-3 text-center whitespace-nowrap">AI 분석</th>
                            <th className="px-3 py-3 text-center whitespace-nowrap min-w-[110px]">상태</th>
                            <th className="px-3 py-3 text-center whitespace-nowrap">관리</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredApplications.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="px-6 py-20 text-center text-gray-400">
                                    {statusFilter.length > 0 || jdFilter.length > 0 || genderFilter.length > 0 || searchQuery || dateRange.start || dateRange.end ? '조건에 맞는 지원자가 없습니다.' : '아직 지원자가 없습니다.'}
                                </td>
                            </tr>
                        ) : (
                            filteredApplications.map((application, appIndex) => (
                                <tr key={application.id} className="hover:bg-blue-50/30 transition-colors group cursor-pointer" {...(appIndex === 0 ? { 'data-tour': 'applicant-row-first' } : {})}>
                                    <td className="px-3 py-3 whitespace-nowrap" onClick={() => handleApplicantClick(application)}>
                                        <div className="font-bold text-[13px] text-gray-900">{application.applicantName}</div>
                                    </td>
                                    <td className="px-3 py-3 whitespace-nowrap" onClick={() => handleApplicantClick(application)}>
                                        <div className="text-[12px] text-gray-600">{application.applicantEmail}</div>
                                    </td>
                                    <td className="px-3 py-3 text-[12px] text-gray-600 whitespace-nowrap" onClick={() => handleApplicantClick(application)}>{application.applicantPhone || '-'}</td>
                                    <td className="px-3 py-3 text-[12px] text-gray-600 whitespace-nowrap" onClick={() => handleApplicantClick(application)}>{application.applicantGender || '-'}</td>
                                    <td className="px-3 py-3 whitespace-nowrap" onClick={() => handleApplicantClick(application)}>
                                        <div className="text-[12px] font-medium text-gray-700">{application.jdTitle}</div>
                                    </td>
                                    <td className="px-3 py-3 text-[12px] text-gray-400 whitespace-nowrap" onClick={() => handleApplicantClick(application)}>{formatDate(application.appliedAt)}</td>
                                    <td className="px-3 py-3">
                                        <button onClick={(e) => { e.stopPropagation(); handleApplicantClick(application); }} className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-[11px] font-medium mx-auto whitespace-nowrap" {...(appIndex === 0 ? { 'data-tour': 'ai-analysis-btn-first' } : {})}>
                                            <Sparkles size={13} />
                                            AI 분석
                                        </button>
                                    </td>
                                    <td className="px-3 py-3">
                                        <div className="relative flex justify-center" ref={openStatusDropdown === application.id ? statusDropdownRef : undefined}>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setOpenStatusDropdown(openStatusDropdown === application.id ? null : application.id); }}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all whitespace-nowrap ${application.status === '합격' ? 'bg-green-100 text-green-700' : application.status === '불합격' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}
                                            >
                                                <span className={`w-2 h-2 rounded-full ${application.status === '합격' ? 'bg-green-500' : application.status === '불합격' ? 'bg-red-500' : 'bg-gray-400'}`} />
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
                                                            onClick={(e) => { e.stopPropagation(); handleStatusChange(application.id, opt.label); setOpenStatusDropdown(null); }}
                                                            className={`w-full flex items-center gap-2.5 px-3 py-2 text-[12px] font-medium text-gray-700 ${opt.hoverBg} transition-colors ${(application.status || '검토중') === opt.label ? 'bg-blue-50 text-blue-700' : ''}`}
                                                        >
                                                            <span className={`w-2.5 h-2.5 rounded-full ${opt.color}`} />
                                                            {opt.label}
                                                            {(application.status || '검토중') === opt.label && <span className="ml-auto text-blue-500 text-[10px]">✓</span>}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-3 py-3">
                                        <div className="flex justify-center">
                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteApplicant(application.id, application.applicantName); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="지원자 삭제">
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

            {/* 면접 일정 내보내기 모달 */}
            {showInterviewModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowInterviewModal(false)}>
                    <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                        {/* 모달 헤더 */}
                        <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 p-6 text-white">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-2xl font-bold mb-1">면접 일정 내보내기</h2>
                                    <p className="text-indigo-100 text-sm">합격자 {getPassedApplicants().length}명의 면접 일정을 설정하고 엑셀로 내보냅니다.</p>
                                </div>
                                <button onClick={() => setShowInterviewModal(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors"><X size={24} /></button>
                            </div>
                        </div>

                        <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
                            {getPassedApplicants().length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                                    <CheckCircle2 size={48} className="text-gray-200 mb-4" />
                                    <p className="text-gray-500 font-medium text-lg">합격자가 없습니다</p>
                                    <p className="text-gray-400 text-sm mt-1">지원자 목록에서 상태를 '합격'으로 변경하면 면접 일정에 포함됩니다.</p>
                                </div>
                            ) : (
                                <div className="p-6 space-y-6">
                                    {/* 정렬 방식 */}
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                                            <ArrowUpDown size={16} className="text-indigo-500" />
                                            정렬 방식 선택
                                        </h3>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => handleSortChange('alphabetical')}
                                                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                                                    interviewSortOrder === 'alphabetical'
                                                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                                        : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                                                }`}
                                            >
                                                가나다순 (이름 순)
                                            </button>
                                            <button
                                                onClick={() => handleSortChange('random')}
                                                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                                                    interviewSortOrder === 'random'
                                                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                                        : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                                                }`}
                                            >
                                                <Shuffle size={15} />
                                                무작위 순서
                                            </button>
                                        </div>
                                        {interviewSortOrder === 'random' && (
                                            <button
                                                onClick={() => handleSortChange('random')}
                                                className="mt-2 text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                                            >
                                                <Shuffle size={12} /> 순서 다시 섞기
                                            </button>
                                        )}
                                    </div>

                                    {/* 면접 설정 */}
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                                            <Clock size={16} className="text-indigo-500" />
                                            면접 일정 설정
                                            <span className="text-xs text-gray-400 font-normal">(선택사항)</span>
                                        </h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1 font-medium">면접 날짜</label>
                                                <input
                                                    type="date"
                                                    value={interviewDate}
                                                    onChange={e => setInterviewDate(e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1 font-medium">시작 시간</label>
                                                <input
                                                    type="time"
                                                    value={interviewStartTime}
                                                    onChange={e => setInterviewStartTime(e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1 font-medium">면접 소요시간 (분)</label>
                                                <input
                                                    type="number"
                                                    min="5"
                                                    max="180"
                                                    value={interviewDuration}
                                                    onChange={e => setInterviewDuration(Number(e.target.value))}
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1 font-medium">면접 간 대기시간 (분)</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="60"
                                                    value={interviewBreak}
                                                    onChange={e => setInterviewBreak(Number(e.target.value))}
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="block text-xs text-gray-500 mb-1 font-medium">면접 장소</label>
                                                <input
                                                    type="text"
                                                    placeholder="예: 본사 3층 회의실A"
                                                    value={interviewLocation}
                                                    onChange={e => setInterviewLocation(e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* 합격자 미리보기 */}
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                                            <Users size={16} className="text-indigo-500" />
                                            면접 순서 미리보기
                                            <span className="text-xs text-gray-400 font-normal">({shuffledPassers.length}명)</span>
                                        </h3>
                                        <div className="rounded-xl border border-gray-100 overflow-hidden">
                                            <table className="w-full text-sm">
                                                <thead className="bg-gray-50 text-xs text-gray-500 font-semibold">
                                                    <tr>
                                                        <th className="px-4 py-2.5 text-left">순번</th>
                                                        <th className="px-4 py-2.5 text-left">이름</th>
                                                        <th className="px-4 py-2.5 text-left">지원공고</th>
                                                        <th className="px-4 py-2.5 text-left">면접시간</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {shuffledPassers.map((app, i) => (
                                                        <tr key={app.id} className="hover:bg-indigo-50/30 transition-colors">
                                                            <td className="px-4 py-2.5 text-gray-500 font-medium">{i + 1}</td>
                                                            <td className="px-4 py-2.5 font-semibold text-gray-900">{app.applicantName}</td>
                                                            <td className="px-4 py-2.5 text-gray-500 text-xs">{app.jdTitle}</td>
                                                            <td className="px-4 py-2.5 text-indigo-600 font-medium text-xs">
                                                                {interviewDate ? `${interviewDate} ${calcInterviewTime(i)}` : calcInterviewTime(i)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="border-t border-gray-100 p-5 bg-gray-50 flex justify-between items-center">
                            <p className="text-xs text-gray-400">
                                합격자 {getPassedApplicants().length}명 · {interviewSortOrder === 'alphabetical' ? '가나다순' : '무작위 순서'}
                            </p>
                            <div className="flex items-center gap-3">
                                <button onClick={() => setShowInterviewModal(false)} className="px-5 py-2 text-gray-600 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors">취소</button>
                                <button
                                    onClick={handleInterviewExcel}
                                    disabled={getPassedApplicants().length === 0}
                                    className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                                >
                                    <Download size={16} /> 엑셀로 내보내기
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {selectedApplicant && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={closeModal}>
                    <div data-tour="ai-analysis-modal" className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-6 text-white">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-2xl font-bold mb-2">AI 스크리닝 리포트</h2>
                                    <p className="text-blue-100 text-sm">{selectedApplicant.applicantName}  {selectedApplicant.jdTitle}</p>
                                </div>
                                <button onClick={closeModal} className="p-2 hover:bg-white/20 rounded-lg transition-colors"><X size={24} /></button>
                            </div>
                        </div>

                        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                            <div className="mb-8">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold text-gray-900">AI 자동 분석</h3>
                                    <button onClick={handleRefreshAnalysis} disabled={summaryLoading} className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50">
                                        {summaryLoading ? '분석 중...' : '다시 분석'}
                                    </button>
                                </div>
                                
                                {summaryLoading ? (
                                    <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                                        <div className="flex items-center gap-3">
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                            <p className="text-gray-600">AI가 지원자 정보를 분석하고 있습니다...</p>
                                        </div>
                                    </div>
                                ) : (
                                    <AIAnalysisDashboard content={aiSummary || ''} />
                                )}
                            </div>

                            <div>
                                <div className="mb-4">
                                    <h3 className="text-lg font-bold text-gray-900">전체 답변 내용</h3>
                                </div>
                                
                                <div className="space-y-6">
                                    {selectedApplicant.requirementAnswers && selectedApplicant.requirementAnswers.length > 0 && (
                                        <div className="bg-white rounded-xl p-5 border border-gray-200">
                                            <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                                                <span className="text-blue-600">✓</span>
                                                {(jdList.find(j => j.title === selectedApplicant.jdTitle)?.type || 'club') === 'company' ? '필수 조건' : '지원자 체크리스트 (필수)'}
                                            </h4>
                                            <div className="space-y-2">
                                                {selectedApplicant.requirementAnswers.map((answer: any, index: number) => (
                                                    <div key={index} className="flex items-center gap-2">
                                                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${answer.checked ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                                            {answer.checked ? '✓' : '✗'}
                                                        </span>
                                                        <p className="text-gray-700">{answer.question}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {selectedApplicant.preferredAnswers && selectedApplicant.preferredAnswers.length > 0 && (
                                        <div className="bg-white rounded-xl p-5 border border-gray-200">
                                            <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                                                <span className="text-purple-600"></span>
                                                {(jdList.find(j => j.title === selectedApplicant.jdTitle)?.type || 'club') === 'company' ? '우대 조건' : '지원자 체크리스트 (우대)'}
                                            </h4>
                                            <div className="space-y-2">
                                                {selectedApplicant.preferredAnswers.map((answer: any, index: number) => (
                                                    <div key={index} className="flex items-center gap-2">
                                                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${answer.checked ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-400'}`}>
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

                        {/* 데모 전용: 팀원 코멘트 섹션 */}
                        {isDemoMode && (
                                <div data-tour="applicant-comments" className="mt-6 border-t border-gray-100 pt-6 px-6">
                                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                                        팀원 코멘트
                                        <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full text-xs font-bold">2</span>
                                    </h3>
                                    <div className="space-y-3 mb-4">
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">김</div>
                                            <div className="bg-gray-50 rounded-xl p-3 flex-1">
                                                <p className="text-xs font-semibold text-gray-900 mb-1">김채용 <span className="text-gray-400 font-normal">2/20 14:30</span></p>
                                                <p className="text-sm text-gray-600">React 경험이 풍부하고 포트폴리오가 인상적입니다. 기술 면접 진행해볼 만 합니다! 👍</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">이</div>
                                            <div className="bg-gray-50 rounded-xl p-3 flex-1">
                                                <p className="text-xs font-semibold text-gray-900 mb-1">이팀장 <span className="text-gray-400 font-normal">2/20 15:10</span></p>
                                                <p className="text-sm text-gray-600">동의합니다. 팀 문화 적합성도 좋아 보여요. 최종 면접 추천! ✨</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="코멘트를 입력하세요..."
                                            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                        />
                                        <button className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors flex-shrink-0">전송</button>
                                    </div>
                                </div>
                        )}

                        <div className="border-t border-gray-100 p-6 bg-gray-50">
                            <div className="flex justify-between items-center">
                                <div className="text-sm text-gray-500">
                                    <span className="font-medium">지원일:</span> {formatDate(selectedApplicant.appliedAt)}
                                </div>
                                <button onClick={closeModal} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">닫기</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};