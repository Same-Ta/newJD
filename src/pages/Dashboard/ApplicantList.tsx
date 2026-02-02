import { useState, useEffect } from 'react';
import { Filter, Download, MoreHorizontal, ExternalLink } from 'lucide-react';
import { db, auth } from '@/config/firebase';
import { collection, query, where, orderBy, getDocs, doc, updateDoc } from 'firebase/firestore';

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

    useEffect(() => {
        fetchApplications();
    }, []);

    const fetchApplications = async () => {
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) {
                setLoading(false);
                return;
            }

            const applicationsQuery = query(
                collection(db, 'applications'),
                where('recruiterId', '==', currentUser.uid),
                orderBy('appliedAt', 'desc')
            );

            const snapshot = await getDocs(applicationsQuery);
            const applicationsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Application[];

            setApplications(applicationsData);
        } catch (error) {
            console.error('지원서 로딩 실패:', error);
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
                                 <td className="px-6 py-5"><input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"/></td>
                                 <td className="px-6 py-5">
                                     <div className="font-bold text-[14px] text-gray-900">{application.applicantName}</div>
                                     <div className="text-[11px] text-gray-400">{application.applicantEmail}</div>
                                 </td>
                                 <td className="px-6 py-5">
                                     <div className="text-[13px] font-medium text-gray-700">{application.jdTitle}</div>
                                 </td>
                                 <td className="px-6 py-5 text-[13px] text-gray-600">{application.applicantGender || '-'}</td>
                                 <td className="px-6 py-5 text-[13px] text-gray-400">{formatDate(application.appliedAt)}</td>
                                 <td className="px-6 py-5">
                                     <button
                                         onClick={() => {
                                             // 답변 모달이나 상세 페이지로 이동
                                             const answersText = application.answers
                                                 .map(a => `Q: ${a.question}\nA: ${a.answer}`)
                                                 .join('\n\n');
                                             alert(`${application.applicantName}님의 답변:\n\n${answersText}`);
                                         }}
                                         className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-[12px] font-medium"
                                     >
                                         <ExternalLink size={14} />
                                         확인
                                     </button>
                                 </td>
                                 <td className="px-6 py-5 text-right">
                                     <select
                                         value={application.status}
                                         onChange={(e) => handleStatusChange(application.id, e.target.value)}
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
     </div>
    );
};
