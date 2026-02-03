// ===== <AI 스크리닝 리포트> =====
import { useState, useEffect } from 'react';
import { Filter, Download, MoreHorizontal, X, Sparkles, FileText, UserPlus } from 'lucide-react';
import { db, auth } from '@/config/firebase';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, Timestamp } from 'firebase/firestore';

interface Application {
    id: string;
    applicantName: string;
    applicantEmail: string;
    applicantPhone?: string;
    applicantGender?: string;
    jdTitle: string;
    requirementAnswers?: Array<{ question: string; answer: string }>;
    preferredAnswers?: Array<{ question: string; answer: string }>;
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

            // 답변 텍스트 생성
            let answersText = ``;
            
            if (application.requirementAnswers && application.requirementAnswers.length > 0) {
                answersText += `[자격 요건]\n`;
                application.requirementAnswers.forEach(a => {
                    answersText += `- ${a.question}: ${a.answer === 'Y' ? '충족함' : '미충족'}\n`;
                });
                answersText += `\n`;
            }
            
            if (application.preferredAnswers && application.preferredAnswers.length > 0) {
                answersText += `[우대 사항]\n`;
                application.preferredAnswers.forEach(a => {
                    answersText += `- ${a.question}: ${a.answer === 'Y' ? '충족함' : '미충족'}\n`;
                });
            }

            const prompt = `다음은 ${application.applicantName}님이 ${application.jdTitle} 포지션에 지원하면서 작성한 답변입니다.\n\n${answersText}\n\n위 내용을 분석하여 다음 항목으로 요약해주세요:\n1. 지원자의 핵심 강점 (2-3줄)\n2. 충족한 자격요건 및 우대사항 요약\n3. 포지션 적합도 평가 (2-3줄)\n4. 종합 의견 (2-3줄)\n\n전문적이고 객관적인 톤으로 작성해주세요.`;

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

            console.log('테스트 지원자들 추가 시작, recruiterId:', currentUser.uid);

            const testApplicants = [
                {
                    recruiterId: currentUser.uid,
                    applicantName: '김지원',
                    applicantEmail: 'jiwon.kim@example.com',
                    applicantPhone: '010-1234-5678',
                    applicantGender: '여성',
                    jdTitle: '프론트엔드 개발자',
                    requirementAnswers: [
                        { question: 'React 3년 이상 경험', answer: 'Y' },
                        { question: 'TypeScript 사용 경험', answer: 'Y' },
                        { question: '팀 리더 경험', answer: 'Y' },
                        { question: 'UI/UX 디자인 이해', answer: 'Y' }
                    ],
                    preferredAnswers: [
                        { question: 'Next.js 사용 경험', answer: 'Y' },
                        { question: '대규모 프로젝트 경험', answer: 'Y' },
                        { question: '성능 최적화 경험', answer: 'Y' },
                        { question: '애니메이션 구현 경험', answer: 'Y' }
                    ],
                    appliedAt: Timestamp.now(),
                    status: '검토중'
                },
                {
                    recruiterId: currentUser.uid,
                    applicantName: '박민수',
                    applicantEmail: 'minsu.park@example.com',
                    applicantPhone: '010-2345-6789',
                    applicantGender: '남성',
                    jdTitle: '백엔드 개발자',
                    requirementAnswers: [
                        { question: 'Java/Spring 5년 이상 경험', answer: 'Y' },
                        { question: 'MSA 아키텍처 설계 경험', answer: 'Y' },
                        { question: 'DB 설계 및 최적화 경험', answer: 'Y' },
                        { question: 'RESTful API 설계 경험', answer: 'Y' }
                    ],
                    preferredAnswers: [
                        { question: 'Kubernetes 운영 경험', answer: 'Y' },
                        { question: 'AWS 클라우드 경험', answer: 'N' },
                        { question: 'Redis 캐싱 경험', answer: 'Y' },
                        { question: '대용량 트래픽 처리 경험', answer: 'Y' }
                    ],
                    appliedAt: Timestamp.now(),
                    status: '검토중'
                },
                {
                    recruiterId: currentUser.uid,
                    applicantName: '이서연',
                    applicantEmail: 'seoyeon.lee@example.com',
                    applicantPhone: '010-3456-7890',
                    applicantGender: '여성',
                    jdTitle: 'UX/UI 디자이너',
                    requirementAnswers: [
                        { question: 'Figma/Sketch 사용 경험 3년 이상', answer: 'Y' },
                        { question: '사용자 리서치 경험', answer: 'Y' },
                        { question: '프로토타입 제작 경험', answer: 'Y' },
                        { question: '디자인 시스템 구축 경험', answer: 'N' }
                    ],
                    preferredAnswers: [
                        { question: '모션 디자인 경험', answer: 'Y' },
                        { question: '앱 디자인 경험', answer: 'Y' },
                        { question: 'HTML/CSS 이해', answer: 'N' },
                        { question: 'A/B 테스팅 경험', answer: 'Y' }
                    ],
                    appliedAt: Timestamp.now(),
                    status: '검토중'
                },
                {
                    recruiterId: currentUser.uid,
                    applicantName: '최준호',
                    applicantEmail: 'junho.choi@example.com',
                    applicantPhone: '010-4567-8901',
                    applicantGender: '남성',
                    jdTitle: '데이터 분석가',
                    requirementAnswers: [
                        { question: 'Python/R 데이터 분석 경험 3년 이상', answer: 'Y' },
                        { question: 'SQL 고급 활용 능력', answer: 'Y' },
                        { question: '통계학 전공 또는 관련 경험', answer: 'Y' },
                        { question: '시각화 도구 활용 경험', answer: 'Y' }
                    ],
                    preferredAnswers: [
                        { question: '머신러닝 모델 구축 경험', answer: 'N' },
                        { question: 'BigQuery/Redshift 경험', answer: 'Y' },
                        { question: 'Tableau/PowerBI 경험', answer: 'Y' },
                        { question: 'A/B 테스트 설계 및 분석', answer: 'N' }
                    ],
                    appliedAt: Timestamp.now(),
                    status: '검토중'
                },
                {
                    recruiterId: currentUser.uid,
                    applicantName: '정하은',
                    applicantEmail: 'haeun.jung@example.com',
                    applicantPhone: '010-5678-9012',
                    applicantGender: '여성',
                    jdTitle: 'Product Manager',
                    requirementAnswers: [
                        { question: '제품 기획 및 관리 경험 5년 이상', answer: 'Y' },
                        { question: '애자일/스크럼 방법론 경험', answer: 'Y' },
                        { question: '데이터 기반 의사결정 경험', answer: 'Y' },
                        { question: '개발팀 협업 경험', answer: 'Y' }
                    ],
                    preferredAnswers: [
                        { question: 'B2B SaaS 제품 경험', answer: 'N' },
                        { question: '글로벌 시장 런칭 경험', answer: 'N' },
                        { question: 'SQL 활용 능력', answer: 'Y' },
                        { question: 'UX 리서치 진행 경험', answer: 'Y' }
                    ],
                    appliedAt: Timestamp.now(),
                    status: '검토중'
                }
            ];

            let count = 0;
            for (const testApp of testApplicants) {
                await addDoc(collection(db, 'applications'), testApp);
                count++;
            }
            
            console.log(`${count}명의 테스트 지원자 추가 완료`);
            
            // 목록 새로고침
            setLoading(true);
            await fetchApplications();
            alert(`${count}명의 테스트 지원자가 추가되었습니다!`);
        } catch (error) {
            console.error('테스트 지원자 추가 실패:', error);
            alert('테스트 지원자 추가에 실패했습니다: ' + error);
        }
    };

    const filteredApplications = statusFilter === 'all'
        ? applications
        : applications.filter(app => app.status === statusFilter);

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
                     <UserPlus size={16}/> 테스트 지원자 5명 추가
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
                         <th className="px-6 py-4 text-center">상태</th>
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
                             
                             <div className="space-y-6">
                                 {/* 자격 요건 */}
                                 {selectedApplicant.requirementAnswers && selectedApplicant.requirementAnswers.length > 0 && (
                                     <div className="bg-white rounded-xl p-5 border border-gray-200">
                                         <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                                             <span className="text-blue-600">✓</span> 자격 요건
                                         </h4>
                                         <div className="space-y-2">
                                             {selectedApplicant.requirementAnswers.map((answer, index) => (
                                                 <div key={index} className="flex items-center gap-2">
                                                     <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                                                         answer.answer === 'Y' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                                                     }`}>
                                                         {answer.answer === 'Y' ? '✓' : '✗'}
                                                     </span>
                                                     <p className="text-gray-700">{answer.question}</p>
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
                                                 <div key={index} className="flex items-center gap-2">
                                                     <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                                                         answer.answer === 'Y' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-400'
                                                     }`}>
                                                         {answer.answer === 'Y' ? '✓' : '✗'}
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
// ===== </AI 스크리닝 리포트> =====
