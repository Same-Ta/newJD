// ===== <AI 스크리닝 리포트> =====
import { useState, useEffect } from 'react';
import { Filter, Download, MoreHorizontal, X, Sparkles, FileText, UserPlus } from 'lucide-react';
import { db, auth } from '@/config/firebase';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, Timestamp } from 'firebase/firestore';

interface Application {
    id: string;
    applicantName: string;
    applicantEmail: string;
    applicantGender?: string;
    jdTitle: string;
    answers: Array<{ question: string; answer: string }>;
    appliedAt: any;
    status: string;
}

export const ApplicantList = () => {
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [showFilterMenu, setShowFilterMenu] = useState(false);
    
    // AI 스크리닝 리포트 관련 상태
    const [selectedApplicant, setSelectedApplicant] = useState<Application | null>(null);
    const [aiSummary, setAiSummary] = useState<string>('');
    const [summaryLoading, setSummaryLoading] = useState(false);

    useEffect(() => {
        fetchApplications();
    }, []);

    const fetchApplications = async () => {
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) {
                console.log('로그인된 사용자가 없습니다.');
                setLoading(false);
                return;
            }

            console.log('지원서 로딩 시작, recruiterId:', currentUser.uid);

            const applicationsQuery = query(
                collection(db, 'applications'),
                where('recruiterId', '==', currentUser.uid)
            );

            const snapshot = await getDocs(applicationsQuery);
            console.log('불러온 지원서 수:', snapshot.docs.length);
            
            const applicationsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Application[];

            // 클라이언트 측에서 날짜순 정렬
            applicationsData.sort((a, b) => {
                const dateA = a.appliedAt?.toDate ? a.appliedAt.toDate() : new Date(a.appliedAt);
                const dateB = b.appliedAt?.toDate ? b.appliedAt.toDate() : new Date(b.appliedAt);
                return dateB.getTime() - dateA.getTime();
            });

            console.log('지원서 데이터:', applicationsData);
            setApplications(applicationsData);
        } catch (error) {
            console.error('지원서 로딩 실패:', error);
            alert('지원서 로딩 중 오류가 발생했습니다: ' + error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (applicationId: string, newStatus: string) => {
        try {
            const applicationRef = doc(db, 'applications', applicationId);
            await updateDoc(applicationRef, { status: newStatus });

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

    const formatDate = (timestamp: any) => {
        if (!timestamp) return '-';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}.${month}.${day}`;
    };

    // AI 요약 생성 함수
    const generateAISummary = async (application: Application) => {
        setSummaryLoading(true);
        try {
            const env = (import.meta as any).env as Record<string, string>;
            const API_KEY = env.VITE_GEMINI_API_KEY || "";
            
            if (!API_KEY) {
                setAiSummary('API 키가 설정되지 않았습니다. .env 파일에 VITE_GEMINI_API_KEY를 추가해주세요.');
                setSummaryLoading(false);
                return;
            }

            const answersText = application.answers
                .map(a => `질문: ${a.question}\n답변: ${a.answer}`)
                .join('\n\n');

            const prompt = `다음은 ${application.applicantName}님이 ${application.jdTitle} 포지션에 지원하면서 작성한 답변입니다.\n\n${answersText}\n\n위 내용을 분석하여 다음 항목으로 요약해주세요:\n1. 지원자의 핵심 강점 (2-3줄)\n2. 주요 경험 및 역량 (3-4개 항목)\n3. 포지션 적합도 평가 (2-3줄)\n4. 종합 의견 (2-3줄)\n\n전문적이고 객관적인 톤으로 작성해주세요.`;

            // fetch API 직접 사용
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
            
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ role: "user", parts: [{ text: prompt }] }]
                }),
            });

            if (!response.ok) {
                throw new Error(`API 호출 실패: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content) {
                throw new Error('응답 없음');
            }

            const summary = data.candidates[0].content.parts[0].text;
            setAiSummary(summary);
        } catch (error) {
            console.error('AI 요약 생성 실패:', error);
            setAiSummary('AI 요약 생성 중 오류가 발생했습니다. 다시 시도해주세요.');
        } finally {
            setSummaryLoading(false);
        }
    };

    // 지원자 클릭 핸들러
    const handleApplicantClick = (application: Application) => {
        setSelectedApplicant(application);
        setAiSummary('');
        generateAISummary(application);
    };

    // 모달 닫기
    const closeModal = () => {
        setSelectedApplicant(null);
        setAiSummary('');
    };

    // 테스트 데이터 추가 함수
    const addTestApplicant = async () => {
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) {
                alert('로그인이 필요합니다.');
                return;
            }

            console.log('테스트 지원자 추가 시작, recruiterId:', currentUser.uid);

            const testApplication = {
                recruiterId: currentUser.uid,
                applicantName: '김지원',
                applicantEmail: 'jiwon.kim@example.com',
                applicantGender: '여성',
                jdTitle: '프론트엔드 개발자',
                answers: [
                    {
                        question: '본인의 주요 경력과 프로젝트 경험을 소개해주세요.',
                        answer: '저는 3년차 프론트엔드 개발자로, React와 TypeScript를 주로 사용합니다. 최근에는 대규모 이커머스 플랫폼의 리뉴얼 프로젝트에서 팀 리드로 참여하여 성능 최적화를 통해 페이지 로딩 속도를 40% 개선했습니다. 또한 컴포넌트 라이브러리를 구축하여 개발 생산성을 크게 향상시켰습니다.'
                    },
                    {
                        question: '가장 어려웠던 기술적 도전과 해결 방법을 설명해주세요.',
                        answer: '대용량 데이터를 실시간으로 렌더링해야 하는 대시보드 개발이 가장 어려웠습니다. 가상 스크롤링과 메모이제이션을 활용하여 수천 개의 데이터 항목을 부드럽게 표시할 수 있었고, React Query를 도입하여 서버 상태 관리를 효율화했습니다. 결과적으로 초기 렌더링 시간을 3초에서 0.8초로 단축시켰습니다.'
                    },
                    {
                        question: '팀워크와 협업 경험에 대해 말씀해주세요.',
                        answer: '크로스 펑셔널 팀에서 디자이너, 백엔드 개발자들과 긴밀히 협업했습니다. 주간 코드 리뷰를 주도하여 팀 전체의 코드 품질을 향상시켰고, 디자인 시스템 구축 시 디자이너들과 지속적으로 소통하며 개발자 친화적인 컴포넌트를 만들었습니다. 또한 기술 문서화를 통해 신규 팀원의 온보딩 시간을 50% 단축시켰습니다.'
                    },
                    {
                        question: '우리 회사에 지원한 동기와 향후 목표를 알려주세요.',
                        answer: '귀사의 혁신적인 제품과 기술 중심 문화에 매력을 느꼈습니다. 특히 AI 기반 채용 솔루션이라는 도메인에서 사용자 경험을 개선하는 데 기여하고 싶습니다. 향후 3년 내에 프론트엔드 아키텍처를 설계하고 주니어 개발자들을 멘토링할 수 있는 시니어 개발자로 성장하는 것이 목표입니다.'
                    }
                ],
                appliedAt: Timestamp.now(),
                status: '검토중'
            };

            console.log('추가할 데이터:', testApplication);
            const docRef = await addDoc(collection(db, 'applications'), testApplication);
            console.log('테스트 지원자 추가 완료, ID:', docRef.id);
            
            // 목록 새로고침
            setLoading(true);
            await fetchApplications();
            alert('테스트 지원자가 추가되었습니다! (ID: ' + docRef.id + ')');
        } catch (error) {
            console.error('테스트 지원자 추가 실패:', error);
            alert('테스트 지원자 추가에 실패했습니다: ' + error);
        }
    };

    const filteredApplications = statusFilter === 'all'
        ? applications
        : applications.filter(app => app.status === statusFilter);

    const statusOptions = ['검토중', '보류', '합격', '불합격'];

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
         <div className="p-6 border-b border-gray-100 flex justify-between items-center">
             <div>
                <h3 className="font-bold text-lg text-gray-900">지원자 리스트</h3>
                <p className="text-xs text-gray-400 mt-1">총 {filteredApplications.length}명의 지원자가 있습니다.</p>
             </div>
             <div className="flex gap-2 relative">
                 <button 
                     onClick={addTestApplicant}
                     className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium transition-colors"
                 >
                     <UserPlus size={16}/> 테스트 지원자 추가
                 </button>
                 <button 
                     onClick={() => setShowFilterMenu(!showFilterMenu)}
                     className="flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-xs font-medium text-gray-600 transition-colors"
                 >
                     <Filter size={16}/> 필터 {statusFilter !== 'all' && `(${statusFilter})`}
                 </button>
                 
                 {showFilterMenu && (
                     <div className="absolute top-12 left-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-2 w-40">
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
                 
                 <button className="flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-xs font-medium text-gray-600 transition-colors"><Download size={16}/> 엑셀 다운로드</button>
                 <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400"><MoreHorizontal size={18}/></button>
             </div>
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
                         <th className="px-6 py-4 text-right">상태</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50">
                     {filteredApplications.length === 0 ? (
                         <tr>
                             <td colSpan={7} className="px-6 py-20 text-center text-gray-400">
                                 {statusFilter === 'all' ? '아직 지원자가 없습니다.' : `${statusFilter} 상태의 지원자가 없습니다.`}
                             </td>
                         </tr>
                     ) : (
                         filteredApplications.map((application) => (
                             <tr key={application.id} className="hover:bg-blue-50/30 transition-colors group cursor-pointer">
                                 <td className="px-6 py-5"><input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" onClick={(e) => e.stopPropagation()}/></td>
                                 <td className="px-6 py-5" onClick={() => handleApplicantClick(application)}>
                                     <div className="font-bold text-[14px] text-gray-900">{application.applicantName}</div>
                                     <div className="text-[11px] text-gray-400">{application.applicantEmail}</div>
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
                                 <td className="px-6 py-5 text-right">
                                     <select
                                         value={application.status}
                                         onChange={(e) => {
                                             e.stopPropagation();
                                             handleStatusChange(application.id, e.target.value);
                                         }}
                                         onClick={(e) => e.stopPropagation()}
                                         className={`px-3 py-1.5 rounded text-[11px] font-bold border-0 cursor-pointer focus:ring-2 focus:ring-blue-500 ${
                                             application.status === '합격' ? 'bg-green-100 text-green-600' :
                                             application.status === '불합격' ? 'bg-red-100 text-red-600' :
                                             application.status === '보류' ? 'bg-yellow-100 text-yellow-600' :
                                             'bg-purple-100 text-purple-600'
                                         }`}
                                     >
                                         {statusOptions.map(status => (
                                             <option key={status} value={status}>{status}</option>
                                         ))}
                                     </select>
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
                                 <p className="text-blue-100 text-sm">{selectedApplicant.applicantName} · {selectedApplicant.jdTitle}</p>
                             </div>
                             <button onClick={closeModal} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                                 <X size={24} />
                             </button>
                         </div>
                     </div>

                     {/* 모달 본문 */}
                     <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
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
                             
                             <div className="space-y-4">
                                 {selectedApplicant.answers.map((answer, index) => (
                                     <div key={index} className="bg-white rounded-xl p-5 border border-gray-200 hover:border-blue-200 transition-colors">
                                         <div className="flex items-start gap-3">
                                             <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-1">
                                                 {index + 1}
                                             </div>
                                             <div className="flex-1">
                                                 <h4 className="font-bold text-gray-900 mb-2">{answer.question}</h4>
                                                 <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{answer.answer}</p>
                                             </div>
                                         </div>
                                     </div>
                                 ))}
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
// ===== </AI 스크리닝 리포트> =====
