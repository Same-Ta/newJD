import { Plus, Users, FileText, ChevronRight, X } from 'lucide-react';
import { Badge } from '@/components/common/Badge';
import { auth, db } from '@/config/firebase';
import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface DashboardHomeProps {
  onNavigate: (page: string) => void;
}

interface JD {
  id: string;
  title: string;
  department?: string;
  location?: string;
  status?: string;
  createdAt?: any;
}

export const DashboardHome = ({ onNavigate }: DashboardHomeProps) => {
    const [userName, setUserName] = useState('채용 담당자');
    const [userEmail, setUserEmail] = useState('');
    const [activeJDs, setActiveJDs] = useState<JD[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const currentUser = auth.currentUser;
        if (currentUser) {
            // displayName이 있으면 사용, 없으면 이메일의 @ 앞부분 사용
            const name = currentUser.displayName || currentUser.email?.split('@')[0] || '채용 담당자';
            setUserName(name);
            setUserEmail(currentUser.email || '');
            
            // 실제 JD 데이터 가져오기
            fetchActiveJDs(currentUser.uid);
        }
    }, []);

    const fetchActiveJDs = async (userId: string) => {
        try {
            const jdQuery = query(
                collection(db, 'jds'),
                where('userId', '==', userId)
            );

            const snapshot = await getDocs(jdQuery);
            const jds = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as JD[];

            // 최신순으로 정렬하고 최대 4개만
            const sortedJDs = jds.sort((a, b) => {
                const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
                const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
                return dateB.getTime() - dateA.getTime();
            }).slice(0, 4);

            setActiveJDs(sortedJDs);
        } catch (error) {
            console.error('JD 로딩 실패:', error);
        } finally {
            setLoading(false);
        }
    };

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

        {/* Profile Card */}
        <div className="bg-white p-7 rounded-3xl border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-gray-800 flex items-center gap-2.5 text-base">
                    <Users size={18} className="text-blue-600 fill-blue-600"/> 내 프로필
                </h3>
                <button className="text-[11px] font-bold bg-[#111827] text-white px-3.5 py-1.5 rounded-full hover:bg-black transition-colors">변경사항 저장</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-5">
                    <div>
                        <label className="text-[11px] font-bold text-gray-400 mb-1.5 block tracking-wide">이름</label>
                        <input type="text" value={userName} readOnly className="w-full h-11 px-3 bg-white border border-gray-200 rounded-lg text-[13px] font-medium text-gray-700 focus:outline-none focus:border-blue-500 transition-colors" />
                    </div>
                    <div>
                        <label className="text-[11px] font-bold text-gray-400 mb-1.5 block tracking-wide">직책/소속</label>
                        <input type="text" placeholder="직책을 입력해주세요" className="w-full h-11 px-3 bg-white border border-gray-200 rounded-lg text-[13px] font-medium placeholder:text-gray-300 focus:outline-none focus:border-blue-500 transition-colors" />
                    </div>
                    <div className="bg-blue-50/80 h-11 px-3 rounded-lg flex items-center text-[12px] font-medium text-blue-600 truncate border border-blue-100">{userEmail}</div>
                </div>
                
                <div className="space-y-3">
                     <label className="text-[11px] font-bold text-gray-400 mb-1.5 block tracking-wide">보유 스킬</label>
                     <div className="flex flex-wrap gap-2">
                         {['채용 전략', '인터뷰', 'HR 데이터 분석'].map(skill => (
                             <span key={skill} className="bg-white h-9 px-3 rounded-lg text-[12px] font-medium text-gray-600 border border-gray-200 flex items-center gap-1.5 hover:border-blue-300 transition-colors cursor-default">
                                {skill} <X size={12} className="text-gray-300 cursor-pointer hover:text-red-500"/>
                             </span>
                         ))}
                         <button className="h-9 px-3 rounded-lg text-[12px] font-medium text-gray-400 border border-dashed border-gray-300 hover:border-blue-400 hover:text-blue-500 transition-all bg-gray-50/50">
                            + 추가
                         </button>
                     </div>
                     <div className="pt-4">
                        <label className="text-[11px] font-bold text-gray-400 mb-1.5 block tracking-wide">한줄 소개</label>
                         <textarea className="w-full h-[88px] p-3 bg-white border border-gray-200 rounded-lg text-[13px] resize-none focus:outline-none focus:border-blue-500 transition-colors"></textarea>
                     </div>
                </div>

                <div>
                    <label className="text-[11px] font-bold text-gray-400 mb-2 block tracking-wide">이력서 관리</label>
                    <div className="border border-gray-200 rounded-xl p-4 flex items-center justify-between mb-3 bg-white hover:border-blue-200 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-red-50 text-red-500 rounded-lg flex items-center justify-center"><FileText size={20}/></div>
                            <div>
                                <div className="text-[13px] font-bold text-gray-800">kim_recruiter_resume.pdf</div>
                                <div className="text-[11px] text-gray-400 mt-0.5">4.5 MB • 2024.10.20 업데이트</div>
                            </div>
                        </div>
                        <button className="text-gray-300 hover:text-gray-500"><X size={16}/></button>
                    </div>
                    <button className="w-full h-12 border border-dashed border-gray-300 text-gray-500 rounded-xl text-[13px] font-medium flex items-center justify-center gap-2 hover:bg-gray-50 hover:border-gray-400 transition-all">
                        <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center"><Plus size={12}/></div>
                        새 이력서 업로드
                    </button>
                </div>
            </div>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
                { label: '진행 중인 공고', val: '4 개', inc: '+4건', icon: FileText },
                { label: '신규 지원자', val: '142 명', inc: '+12명', icon: Users },
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
            {loading ? (
                <div className="flex items-center justify-center h-40">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : activeJDs.length === 0 ? (
                <div className="bg-gray-50 rounded-2xl p-12 text-center border border-gray-100">
                    <FileText size={48} className="mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500 mb-2 font-medium">아직 생성된 채용 공고가 없습니다</p>
                    <p className="text-gray-400 text-sm mb-6">AI와 함께 첫 번째 JD를 만들어보세요</p>
                    <button 
                        onClick={() => onNavigate('chat')} 
                        className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
                    >
                        <Plus size={16} /> 새 JD 만들기
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    {activeJDs.map((jd) => (
                        <div key={jd.id} onClick={() => onNavigate('my-jds')} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-[0_10px_30px_rgba(0,0,0,0.08)] transition-all duration-300 group cursor-pointer flex flex-col h-full">
                            <div className="h-40 w-full relative overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600">
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                                <div className="absolute top-3 left-3">
                                    <Badge type={jd.status || 'active'} text={jd.status || '진행중'} />
                                </div>
                                <div className="absolute bottom-3 left-3 right-3">
                                    <h4 className="font-bold text-white text-lg leading-tight line-clamp-2">{jd.title}</h4>
                                </div>
                            </div>
                            <div className="p-5 flex flex-col flex-1">
                                <div className="text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wide">
                                    {jd.department || '부서 미지정'} · {jd.location || '위치 미지정'}
                                </div>
                                
                                <div className="flex gap-1.5 mb-auto mt-3">
                                    <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100">채용중</span>
                                </div>
                                
                                <div className="mt-5 pt-4 border-t border-gray-50 flex justify-end items-center text-[12px]">
                                    <button className="text-blue-600 font-medium hover:text-blue-700">상세보기 →</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>
    );
};
