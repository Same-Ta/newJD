import { useState, useEffect } from 'react';
import { Filter, Download, X, Sparkles, FileText, Trash2, EyeOff, Shield } from 'lucide-react';
import { auth } from '@/config/firebase';
import * as XLSX from 'xlsx';
import { maskEmail, maskName } from '@/utils/security';
import { applicationAPI, jdAPI } from '@/services/api';

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
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [showFilterMenu, setShowFilterMenu] = useState(false);
    
    // 공고별 필터링 상태
    const [jdFilter, setJdFilter] = useState<string>('all');
    const [jdList, setJdList] = useState<Array<{ id: string; title: string }>>([]);
    const [showJdFilterMenu, setShowJdFilterMenu] = useState(false);
    
    // AI 스크리닝 리포트 관련 상태
    const [selectedApplicant, setSelectedApplicant] = useState<Application | null>(null);
    const [aiSummary, setAiSummary] = useState<string>('');
    const [summaryLoading, setSummaryLoading] = useState(false);
    
    // 개인정보 마스킹 상태
    const [isPrivacyMode, setIsPrivacyMode] = useState(true); // 기본값: 마스킹 활성화

    useEffect(() => {
        fetchApplications();
        fetchJDs();
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
            const applicationsData = await applicationAPI.getAll();

            // 클라이언트 측에서 날짜순 정렬
            applicationsData.sort((a: any, b: any) => {
                const dateA = a.appliedAt?.seconds ? a.appliedAt.seconds * 1000 : 0;
                const dateB = b.appliedAt?.seconds ? b.appliedAt.seconds * 1000 : 0;
                return dateB - dateA;
            });

            console.log('불러온 지원서:', applicationsData.length, '건');
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
                title: jd.title || '제목 없음'
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

    // AI 요약 생성 함수
    const generateAISummary = async (application: Application) => {
        setSummaryLoading(true);
        try {
            const result = await applicationAPI.analyze(application);
            setAiSummary(result.analysis);
        } catch (error) {
            console.error('AI 분석 실패:', error);
            setAiSummary('AI 분석에 실패했습니다. 잠시 후 다시 시도해주세요.');
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
            generateAISummary(application);
        }
    };

    // 모달 닫기
    const closeModal = () => {
        setSelectedApplicant(null);
        setAiSummary('');
    };

    // 엑셀 다운로드 함수
    const handleExcelDownload = () => {
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

    const filteredApplications = applications
        .filter(app => statusFilter === 'all' || app.status === statusFilter)
        .filter(app => jdFilter === 'all' || app.jdTitle === jdFilter);

    const statusOptions = ['검토중', '합격', '불합격'];

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
     <div className="bg-white rounded-2xl border border-gray-100 shadow-sm min-h-[600px] flex flex-col max-w-[1200px] mx-auto">
         <div className="p-6 border-b border-gray-100">
             <div className="flex justify-between items-start mb-3">
                 <h3 className="font-bold text-lg text-gray-900">지원자 관리</h3>
                 <div className="flex gap-2">
                     {/* 프라이버시 모드 토글 */}
                     <button 
                         onClick={() => setIsPrivacyMode(!isPrivacyMode)}
                         className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                             isPrivacyMode 
                                 ? 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200' 
                                 : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200'
                         }`}
                         title={isPrivacyMode ? '개인정보 보호 모드 활성화됨' : '개인정보가 노출됩니다'}
                     >
                         {isPrivacyMode ? <Shield size={16}/> : <EyeOff size={16}/>}
                         {isPrivacyMode ? '보호 모드' : '전체 표시'}
                     </button>
                     
                     {/* 상태별 필터 */}
                     <div className="relative">
                         <button 
                             onClick={() => setShowFilterMenu(!showFilterMenu)}
                             className="flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-xs font-medium text-gray-600 transition-colors"
                         >
                             <Filter size={16}/> 필터 {statusFilter !== 'all' && `(${statusFilter})`}
                         </button>
                         
                         {showFilterMenu && (
                             <div className="absolute top-12 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-2 w-40">
                                 <button
                                     onClick={() => {
                                         setStatusFilter('all');
                                         setShowFilterMenu(false);
                                     }}
                                     className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors"
                                 >
                                     전체 보기
                                 </button>
                                 {statusOptions.map(status => (
                                     <button
                                         key={status}
                                         onClick={() => {
                                             setStatusFilter(status);
                                             setShowFilterMenu(false);
                                         }}
                                         className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors"
                                     >
                                         {status}
                                     </button>
                                 ))}
                             </div>
                         )}
                     </div>
                     
                     <button 
                         onClick={handleExcelDownload}
                         className="flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-xs font-medium text-gray-600 transition-colors"
                     >
                         <Download size={16}/> 엑셀 다운로드
                     </button>
                 </div>
             </div>
             
             {/* 공고별 필터 - 지원자 관리 바로 아래, 흰색 배경, ▽ 아이콘 */}
             <div className="relative inline-block mb-3">
                 <button 
                     onClick={() => setShowJdFilterMenu(!showJdFilterMenu)}
                     className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-50 rounded-lg text-sm font-medium text-gray-700 transition-colors border border-gray-200 shadow-sm"
                 >
                     <FileText size={16} className="text-gray-500"/>
                     <span>{jdFilter === 'all' ? '모든 공고' : jdFilter}</span>
                     {jdList.length > 0 && (
                         <span className="ml-1 px-2 py-0.5 bg-gray-100 rounded-full text-xs text-gray-600">{jdList.length}</span>
                     )}
                     <span className="ml-1 text-gray-400">▽</span>
                 </button>
                 
                 {showJdFilterMenu && (
                     <div className="absolute top-12 left-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-2 min-w-[250px] max-h-[300px] overflow-y-auto">
                         <button
                             onClick={() => {
                                 setJdFilter('all');
                                 setShowJdFilterMenu(false);
                             }}
                             className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors ${
                                 jdFilter === 'all' ? 'bg-blue-50 text-blue-600 font-semibold' : ''
                             }`}
                         >
                             모든 공고
                         </button>
                         {jdList.map(jd => (
                             <button
                                 key={jd.id}
                                 onClick={() => {
                                     setJdFilter(jd.title);
                                     setShowJdFilterMenu(false);
                                 }}
                                 className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors ${
                                     jdFilter === jd.title ? 'bg-blue-50 text-blue-600 font-semibold' : ''
                                 }`}
                             >
                                 {jd.title}
                             </button>
                         ))}
                     </div>
                 )}
             </div>
             
             <p className="text-xs text-gray-400">총 {filteredApplications.length}명의 지원자가 있습니다.</p>
         </div>
         <div className="flex-1 overflow-auto">
             <table className="w-full text-left text-sm text-gray-600">
                 <thead className="bg-[#F8FAFC] text-[11px] uppercase font-bold text-gray-400 tracking-wider">
                     <tr>
                         <th className="px-6 py-4 w-12"><input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"/></th>
                         <th className="px-6 py-4">이름</th>
                         <th className="px-6 py-4">지원 포지션</th>
                         <th className="px-6 py-4">성별</th>
                         <th className="px-6 py-4">지원 일시</th>
                         <th className="px-6 py-4">작성 내용</th>
                         <th className="px-6 py-4 text-center">상태</th>
                         <th className="px-6 py-4 text-center">관리</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50">
                     {filteredApplications.length === 0 ? (
                         <tr>
                             <td colSpan={8} className="px-6 py-20 text-center text-gray-400">
                                 {statusFilter === 'all' ? '아직 지원자가 없습니다.' : `${statusFilter} 상태의 지원자가 없습니다.`}
                             </td>
                         </tr>
                     ) : (
                         filteredApplications.map((application) => (
                             <tr key={application.id} className="hover:bg-blue-50/30 transition-colors group cursor-pointer">
                                 <td className="px-6 py-5"><input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" onClick={(e) => e.stopPropagation()}/></td>
                                 <td className="px-6 py-5" onClick={() => handleApplicantClick(application)}>
                                     <div className="font-bold text-[14px] text-gray-900">
                                         {isPrivacyMode ? maskName(application.applicantName) : application.applicantName}
                                     </div>
                                     <div className="text-[11px] text-gray-400">
                                         {isPrivacyMode ? maskEmail(application.applicantEmail) : application.applicantEmail}
                                     </div>
                                 </td>
                                 <td className="px-6 py-5" onClick={() => handleApplicantClick(application)}>
                                     <div className="text-[13px] font-medium text-gray-700">{application.jdTitle}</div>
                                 </td>
                                 <td className="px-6 py-5 text-[13px] text-gray-600" onClick={() => handleApplicantClick(application)}>{application.applicantGender || '-'}</td>
                                 <td className="px-6 py-5 text-[13px] text-gray-400" onClick={() => handleApplicantClick(application)}>{formatDate(application.appliedAt)}</td>
                                 <td className="px-6 py-5">
                                     <button
                                         onClick={(e) => {
                                             e.stopPropagation();
                                             handleApplicantClick(application);
                                         }}
                                         className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-[12px] font-medium"
                                     >
                                         <Sparkles size={14} />
                                         AI 분석
                                     </button>
                                 </td>
                                 <td className="px-6 py-5">
                                     <div className="flex justify-center gap-1">
                                         <button
                                             onClick={(e) => {
                                                 e.stopPropagation();
                                                 handleStatusChange(application.id, '합격');
                                             }}
                                             className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                                                 application.status === '합격' 
                                                     ? 'bg-green-500 text-white shadow-md' 
                                                     : 'bg-gray-100 text-gray-500 hover:bg-green-100 hover:text-green-600'
                                             }`}
                                         >
                                             합격
                                         </button>
                                         <button
                                             onClick={(e) => {
                                                 e.stopPropagation();
                                                 handleStatusChange(application.id, '불합격');
                                             }}
                                             className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                                                 application.status === '불합격' 
                                                     ? 'bg-red-500 text-white shadow-md' 
                                                     : 'bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-600'
                                             }`}
                                         >
                                             불합격
                                         </button>
                                     </div>
                                 </td>
                                 <td className="px-6 py-5">
                                     <div className="flex justify-center">
                                         <button
                                             onClick={(e) => {
                                                 e.stopPropagation();
                                                 handleDeleteApplicant(application.id, application.applicantName);
                                             }}
                                             className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                             title="지원자 삭제"
                                         >
                                             <Trash2 size={16} />
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
                                 <div className="flex items-center gap-2 mb-2">
                                     <Sparkles size={24} className="fill-white" />
                                     <h2 className="text-2xl font-bold">AI 스크리닝 리포트</h2>
                                 </div>
                                 <p className="text-blue-100 text-sm">
                                     {isPrivacyMode ? maskName(selectedApplicant.applicantName) : selectedApplicant.applicantName} · {selectedApplicant.jdTitle}
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
                             <div className="flex items-center gap-2 mb-4">
                                 <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                     <Sparkles size={18} className="text-blue-600" />
                                 </div>
                                 <h3 className="text-lg font-bold text-gray-900">AI 자동 요약</h3>
                             </div>
                             
                             {summaryLoading ? (
                                 <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                                     <div className="flex items-center gap-3">
                                         <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                         <p className="text-gray-600">AI가 지원자 답변을 분석하고 있습니다...</p>
                                     </div>
                                 </div>
                             ) : (
                                 <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                                     <div className="prose prose-sm max-w-none">
                                         <div className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                                             {aiSummary || 'AI 요약을 생성하는 중입니다...'}
                                         </div>
                                     </div>
                                 </div>
                             )}
                         </div>

                         {/* 전체 답변 내용 섹션 */}
                         <div>
                             <div className="flex items-center gap-2 mb-4">
                                 <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                                     <FileText size={18} className="text-gray-600" />
                                 </div>
                                 <h3 className="text-lg font-bold text-gray-900">전체 답변 내용</h3>
                             </div>
                             
                             <div className="space-y-6">
                                 {/* 자격 요건 */}
                                 {selectedApplicant.requirementAnswers && selectedApplicant.requirementAnswers.length > 0 && (
                                     <div className="bg-white rounded-xl p-5 border border-gray-200">
                                         <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                                             <span className="text-blue-600">✓</span> 자격 요건
                                         </h4>
                                         <div className="space-y-2">
                                             {selectedApplicant.requirementAnswers.map((answer, index) => (
                                                 <div key={index} className="flex items-start gap-2">
                                                     <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${
                                                         answer.checked ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                                                     }`}>
                                                         {answer.checked ? '✓' : '✗'}
                                                     </span>
                                                     <div>
                                                         <p className="text-gray-700">{answer.question}</p>
                                                         {answer.detail && <p className="text-xs text-gray-500 mt-0.5">{answer.detail}</p>}
                                                     </div>
                                                 </div>
                                             ))}
                                         </div>
                                     </div>
                                 )}

                                 {/* 우대 사항 */}
                                 {selectedApplicant.preferredAnswers && selectedApplicant.preferredAnswers.length > 0 && (
                                     <div className="bg-white rounded-xl p-5 border border-gray-200">
                                         <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                                             <span className="text-purple-600">★</span> 우대 사항
                                         </h4>
                                         <div className="space-y-2">
                                             {selectedApplicant.preferredAnswers.map((answer, index) => (
                                                 <div key={index} className="flex items-start gap-2">
                                                     <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${
                                                         answer.checked ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-400'
                                                     }`}>
                                                         {answer.checked ? '✓' : '✗'}
                                                     </span>
                                                     <div>
                                                         <p className="text-gray-700">{answer.question}</p>
                                                         {answer.detail && <p className="text-xs text-gray-500 mt-0.5">{answer.detail}</p>}
                                                     </div>
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

