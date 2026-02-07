import { Badge } from '@/components/common/Badge';
import { useState, useEffect } from 'react';
import { auth } from '@/config/firebase';
import { jdAPI, applicationAPI } from '@/services/api';

interface MyJDsPageProps {
  onNavigate: (page: string) => void;
  onNavigateToJD: (jdId: string) => void;
}

interface JDItem {
  id: string;
  title: string;
  jobRole?: string;
  company?: string;
  createdAt: any;
  status?: string;
  recruitmentPeriod?: string;
}

export const MyJDsPage = ({ onNavigateToJD }: MyJDsPageProps) => {
  const [jdList, setJdList] = useState<JDItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [applicantCounts, setApplicantCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchJDs = async () => {
      const user = auth.currentUser;
      if (!user) {
        console.error('로그인된 사용자가 없습니다.');
        setLoading(false);
        return;
      }

      try {
        console.log('사용자 공고 목록 불러오는 중...');
        const [jds, apps] = await Promise.all([
          jdAPI.getAll(),
          applicationAPI.getAll().catch(() => [] as any[])
        ]);
        
        // 클라이언트 사이드 정렬 (createdAt 기준 내림차순)
        const sortedJds = jds.sort((a: any, b: any) => {
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bTime - aTime;
        });

        console.log(`${sortedJds.length}개의 공고를 불러왔습니다.`);
        setJdList(sortedJds);

        // 지원자 수 계산
        const counts: Record<string, number> = {};
        apps.forEach((app: any) => {
          const id = app.jdId;
          if (id) counts[id] = (counts[id] || 0) + 1;
        });
        setApplicantCounts(counts);
      } catch (error) {
        console.error('공고 목록 불러오기 실패:', error);
        alert('공고 목록을 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchJDs();
  }, []);

  const handleDelete = async (jdId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // 카드 클릭 이벤트 방지
    
    const confirmed = window.confirm('정말 삭제하시겠습니까?');
    if (!confirmed) return;

    try {
      console.log('공고 삭제 중...', jdId);
      await jdAPI.delete(jdId);
      
      // 상태에서 해당 아이템 제거 (즉시 UI 반영)
      setJdList(prevList => prevList.filter(jd => jd.id !== jdId));
      
      console.log('공고 삭제 완료');
      alert('공고가 삭제되었습니다.');
    } catch (error) {
      console.error('공고 삭제 실패:', error);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-[1200px] mx-auto">
        <h2 className="text-2xl font-bold">내 채용 공고</h2>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">로딩 중...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
  <div className="space-y-6 max-w-[1200px] mx-auto">
    <h2 className="text-2xl font-bold">내 채용 공고</h2>
    <p className="text-sm text-gray-500 -mt-5 mb-5">작성한 공고를 수정하거나 새로운 공고를 작성하세요.</p>
    
    {jdList.length === 0 ? (
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
        {jdList.map((job) => {
          // D-day 계산: recruitmentPeriod에서 마감일 파싱, 없으면 생성일+30일
          let dDay = '';
          const today = new Date();
          if (job.recruitmentPeriod) {
            // "2025.03.01 ~ 2025.03.15" 형식에서 마감일 추출
            const parts = job.recruitmentPeriod.split('~');
            if (parts.length >= 2) {
              const endStr = parts[1].trim().replace(/\./g, '-');
              const deadline = new Date(endStr);
              if (!isNaN(deadline.getTime())) {
                const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                dDay = diffDays > 0 ? `D-${diffDays}` : diffDays === 0 ? 'D-Day' : '마감';
              }
            }
          }
          if (!dDay && job.createdAt) {
            const date = job.createdAt?.toDate ? job.createdAt.toDate() : new Date(job.createdAt);
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
              key={job.id} 
              onClick={() => onNavigateToJD(job.id)} 
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 group cursor-pointer flex flex-col"
            >
              {/* 이미지 영역 */}
              <div className="h-44 relative">
                <img 
                  src={randomImage} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                  alt={job.title}
                />
                <div className="absolute top-3 left-3">
                  <Badge 
                    type={job.status || 'draft'} 
                    text={job.status === 'published' ? '채용중' : '임시저장'} 
                  />
                </div>
                <button
                  onClick={(e) => handleDelete(job.id, e)}
                  className="absolute top-3 right-3 p-1.5 bg-white/90 backdrop-blur-sm text-gray-600 hover:text-red-600 hover:bg-white rounded-lg transition-colors shadow-sm"
                  title="삭제"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
              {/* 콘텐츠 영역 */}
              <div className="p-5">
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1">
                  {job.company || 'WINNOW'} {job.jobRole && `· ${job.jobRole}`}
                </div>
                
                <h3 className="font-bold mb-3 text-[15px] leading-snug line-clamp-2">
                  {job.title || '제목 없음'}
                </h3>
                
                <div className="flex items-center justify-between text-[12px] text-gray-500 font-medium">
                  <div className="flex items-center gap-1">
                    <span className="text-blue-600 font-bold">{dDay}</span>
                    <span className="mx-1.5 text-gray-300">|</span>
                    <span className="mx-1 text-gray-400">지원자</span>
                    <span className="font-semibold text-gray-700">{applicantCounts[job.id] || 0}명</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
  );
};
