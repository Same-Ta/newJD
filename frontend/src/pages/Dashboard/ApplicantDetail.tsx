import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { applicationAPI, jdAPI } from '@/services/api';
import { FONTS } from '@/constants/fonts';
import { AIAnalysisDashboard } from '@/components/ai/AIAnalysisComponents';
import { FigmaComments } from '@/components/common/FigmaComments';
import { useDemoMode, DEMO_APPLICANTS, DEMO_AI_ANALYSIS } from '@/components/onboarding';

interface Application {
    id: string;
    applicantName: string;
    applicantEmail: string;
    applicantPhone?: string;
    applicantGender?: string;
    jdId?: string;
    jdTitle: string;
    portfolio?: string;
    portfolioFileUrl?: string;
    portfolioFileName?: string;
    requirementAnswers?: Array<{ question: string; checked: boolean; detail: string; answer?: string }>;
    preferredAnswers?: Array<{ question: string; checked: boolean; detail: string; answer?: string }>;
    appliedAt: any;
    status: string;
}

interface ApplicantDetailProps {
    applicationId: string;
    onBack: () => void;
}

export const ApplicantDetail = ({ applicationId, onBack }: ApplicantDetailProps) => {
    const [application, setApplication] = useState<Application | null>(null);
    const [loading, setLoading] = useState(true);
    const [jdType, setJdType] = useState<'company' | 'club'>('club');
    const [aiSummary, setAiSummary] = useState<string>('');
    const [summaryLoading, setSummaryLoading] = useState(false);
    const { isDemoMode, onDemoAction } = useDemoMode();

    useEffect(() => {
        fetchApplication();
    }, [applicationId]);

    const fetchApplication = async () => {
        // 데모 모드: 데모 데이터 사용
        if (isDemoMode || applicationId.startsWith('demo-')) {
            const demoApp = DEMO_APPLICANTS.find((a: (typeof DEMO_APPLICANTS)[0]) => a.id === applicationId) ?? DEMO_APPLICANTS[0];
            setApplication(demoApp as any);
            setJdType('company');
            setSummaryLoading(true);
            setTimeout(() => {
                setAiSummary(DEMO_AI_ANALYSIS);
                setSummaryLoading(false);
                setTimeout(() => onDemoAction?.('ai-modal-ready'), 300);
            }, 1200);
            setLoading(false);
            return;
        }
        try {
            const data = await applicationAPI.getById(applicationId);
            setApplication(data);
            
            // JD 타입 확인과 AI 분석을 병렬 실행
            await Promise.all([
                data.jdId
                    ? jdAPI.getById(data.jdId).then(jd => { if (jd?.type) setJdType(jd.type); }).catch(() => {})
                    : Promise.resolve(),
                loadOrGenerateAnalysis(data)
            ]);
        } catch (error) {
            console.error('지원서 로딩 실패:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadOrGenerateAnalysis = async (app: Application) => {
        setSummaryLoading(true);
        try {
            // 먼저 저장된 분석 결과 확인
            const saved = await applicationAPI.getAnalysis(app.id);
            if (saved.analysis) {
                setAiSummary(saved.analysis);
                return;
            }
            // 저장된 결과 없으면 새로 생성
            await runAnalysis(app);
        } catch {
            // getAnalysis 실패 시에도 새로 분석 시도
            await runAnalysis(app);
        } finally {
            setSummaryLoading(false);
        }
    };

    const runAnalysis = async (app: Application) => {
        try {
            const result = await applicationAPI.analyze(app);
            setAiSummary(result.analysis);
            // 결과를 Firestore에 저장
            await applicationAPI.saveAnalysis(app.id, result.analysis).catch(() => {});
        } catch (error) {
            console.error('AI 분석 실패:', error);
            setAiSummary('AI 분석에 실패했습니다. 잠시 후 다시 시도해주세요.');
        }
    };

    const handleRefreshAnalysis = async () => {
        if (!application || summaryLoading) return;
        if (isDemoMode) {
            setSummaryLoading(true);
            setTimeout(() => { setAiSummary(DEMO_AI_ANALYSIS); setSummaryLoading(false); }, 1200);
            return;
        }
        setSummaryLoading(true);
        await runAnalysis(application);
        setSummaryLoading(false);
    };



    const handleStatusChange = async (newStatus: string) => {
        if (!application) return;
        // 데모 모드: 로컸 상태만 변경
        if (isDemoMode) {
            setApplication(prev => prev ? { ...prev, status: newStatus } : null);
            return;
        }
        try {
            await applicationAPI.update(application.id, newStatus);
            setApplication(prev => prev ? { ...prev, status: newStatus } : null);
        } catch (error) {
            console.error('상태 변경 실패:', error);
        }
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return '-';
        const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}.${month}.${day} ${hours}:${minutes}`;
    };



    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-500">지원서 로딩 중...</p>
                </div>
            </div>
        );
    }

    if (!application) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <p className="text-gray-500">지원서를 찾을 수 없습니다.</p>
                    <button onClick={onBack} className="mt-4 text-blue-600 hover:underline text-sm">돌아가기</button>
                </div>
            </div>
        );
    }

    const requirementMet = application.requirementAnswers?.filter(a => a.checked).length || 0;
    const requirementTotal = application.requirementAnswers?.length || 0;
    const preferredMet = application.preferredAnswers?.filter(a => a.checked).length || 0;
    const preferredTotal = application.preferredAnswers?.length || 0;

    return (
        <div className="max-w-[1200px] mx-auto space-y-4 sm:space-y-6 px-1 sm:px-0" style={{ fontFamily: FONTS.sans }}>
            {/* 상단 헤더 */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <button
                    onClick={onBack}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors self-start"
                >
                    <ArrowLeft size={20} className="text-gray-600" />
                </button>
                <div className="flex-1 min-w-0">
                    <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 truncate">{application.applicantName}</h2>
                    <p className="text-xs sm:text-sm text-gray-500 truncate">{application.applicantEmail} · {application.jdTitle}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0 flex-wrap">
                    {['검토중', '합격', '불합격'].map(status => (
                        <button
                            key={status}
                            onClick={() => handleStatusChange(status)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                                application.status === status
                                    ? status === '합격' ? 'bg-green-500 text-white shadow-md'
                                    : status === '불합격' ? 'bg-red-500 text-white shadow-md'
                                    : 'bg-blue-500 text-white shadow-md'
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {/* 메인 콘텐츠 - 1컬럼 레이아웃 */}
            <FigmaComments applicationId={applicationId}>
            <div className="grid grid-cols-1 gap-6">
                {/* 지원서 내용 */}
                <div className="space-y-6">
                    {/* 지원자 기본 정보 */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
                        <h3 className="font-bold text-gray-900 mb-4">
                            지원자 정보
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-gray-400 mb-1">이름</p>
                                <p className="text-sm font-medium text-gray-900">{application.applicantName}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 mb-1">이메일</p>
                                <p className="text-sm font-medium text-gray-900">{application.applicantEmail}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 mb-1">전화번호</p>
                                <p className="text-sm font-medium text-gray-900">{application.applicantPhone || '-'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 mb-1">성별</p>
                                <p className="text-sm font-medium text-gray-900">{application.applicantGender || '-'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 mb-1">지원일</p>
                                <p className="text-sm font-medium text-gray-900">{formatDate(application.appliedAt)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 mb-1">지원 공고</p>
                                <p className="text-sm font-medium text-gray-900">{application.jdTitle}</p>
                            </div>
                        </div>

                        {/* 포트폴리오 */}
                        {(application.portfolio || application.portfolioFileUrl) && (
                            <div className="mt-5 pt-5 border-t border-gray-100">
                                <p className="text-xs text-gray-400 mb-3 font-semibold uppercase tracking-wider">포트폴리오</p>
                                <div className="space-y-2">
                                    {application.portfolio && (
                                        <a
                                            href={application.portfolio}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 rounded-xl transition-all group"
                                        >
                                            <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                            </svg>
                                            <span className="text-sm text-gray-700 group-hover:text-blue-600 truncate">{application.portfolio}</span>
                                        </a>
                                    )}
                                    {!isDemoMode && application.portfolioFileUrl && (
                                        <button
                                            onClick={async () => {
                                                try {
                                                    const response = await applicationAPI.downloadPortfolio(application.id);
                                                    const blob = await response.blob();
                                                    const url = window.URL.createObjectURL(blob);
                                                    const a = document.createElement('a');
                                                    a.href = url;
                                                    a.download = application.portfolioFileName || 'portfolio.pdf';
                                                    document.body.appendChild(a);
                                                    a.click();
                                                    window.URL.revokeObjectURL(url);
                                                    document.body.removeChild(a);
                                                } catch (error) {
                                                    console.error('PDF 다운로드 실패:', error);
                                                    alert('PDF 다운로드에 실패했습니다.');
                                                }
                                            }}
                                            className="flex items-center gap-2 w-full px-4 py-2.5 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-all group text-left"
                                        >
                                            <svg className="w-4 h-4 text-red-400 group-hover:text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            <span className="text-sm font-medium text-red-600 group-hover:text-red-700 truncate">{application.portfolioFileName || 'portfolio.pdf'}</span>
                                            <span className="text-[11px] text-red-400 ml-auto flex-shrink-0">다운로드</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* AI 분석 */}
                    <div data-tour="applicant-ai-analysis" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold text-gray-900">AI 스크리닝 분석</h3>
                            <button
                                onClick={handleRefreshAnalysis}
                                disabled={summaryLoading}
                                className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {summaryLoading ? '분석 중...' : '다시 분석'}
                            </button>
                        </div>
                        {summaryLoading ? (
                            <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                                    <p className="text-gray-500 text-sm">AI가 지원자를 분석하고 있습니다...</p>
                                </div>
                            </div>
                        ) : (
                            <AIAnalysisDashboard content={aiSummary || ''} />
                        )}
                    </div>

                    {/* 자격 요건 / 지원자 체크리스트 */}
                    {application.requirementAnswers && application.requirementAnswers.length > 0 && (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-gray-900">{jdType === 'company' ? '자격 요건' : '지원자 체크리스트 (필수)'}</h3>
                                <span className="text-sm font-medium text-green-600 bg-green-50 px-3 py-1 rounded-full">
                                    {requirementMet}/{requirementTotal} 충족
                                </span>
                            </div>
                            <div className="space-y-3">
                                {application.requirementAnswers.map((answer, index) => (
                                    <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                                        <span className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                            answer.checked ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-400'
                                        }`}>
                                            {answer.checked ? '✓' : '✗'}
                                        </span>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-gray-900">{answer.question}</p>
                                            {answer.detail && (
                                                <p className="text-xs text-gray-500 mt-1 whitespace-pre-wrap">{answer.detail}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 우대 사항 / 우대 체크리스트 */}}
                    {application.preferredAnswers && application.preferredAnswers.length > 0 && (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-gray-900">{jdType === 'company' ? '우대 사항' : '지원자 체크리스트 (우대)'}</h3>
                                <span className="text-sm font-medium text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
                                    {preferredMet}/{preferredTotal} 충족
                                </span>
                            </div>
                            <div className="space-y-3">
                                {application.preferredAnswers.map((answer, index) => (
                                    <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                                        <span className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                            answer.checked ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-400'
                                        }`}>
                                            {answer.checked ? '✓' : '✗'}
                                        </span>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-gray-900">{answer.question}</p>
                                            {answer.detail && (
                                                <p className="text-xs text-gray-500 mt-1 whitespace-pre-wrap">{answer.detail}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            </FigmaComments>
        </div>
    );
};

export default ApplicantDetail;
