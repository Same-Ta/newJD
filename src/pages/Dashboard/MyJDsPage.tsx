import React from 'react';
import { MOCK_JOBS, MOCK_APPLICANTS } from '@/constants/mockData';
import { Badge } from '@/components/common/Badge';
import { ChevronRight } from 'lucide-react';

interface MyJDsPageProps {
  onNavigate: (page: string) => void;
}

export const MyJDsPage = ({ onNavigate }: MyJDsPageProps) => (
  <div className="space-y-6 max-w-[1200px] mx-auto">
    <h2 className="text-2xl font-bold">내 채용 공고 (JD)</h2>
    <p className="text-sm text-gray-500 -mt-5 mb-5">작성한 JD를 수정하거나 새로운 공고를 작성하세요.</p>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
      {[...MOCK_JOBS, ...MOCK_JOBS].map((job, i) => (
        <div 
          key={i} 
          onClick={() => onNavigate('jd-detail')} 
          className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 group cursor-pointer flex flex-col"
        >
          <div className="h-44 relative">
            <img src={job.img} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt={job.title}/>
            <div className="absolute top-3 left-3">
              <Badge type={job.status} text={job.status}/>
            </div>
          </div>
          <div className="p-5">
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1">{job.team}</div>
            <h3 className="font-bold mb-3 text-[15px] leading-snug">{job.title}</h3>
            <div className="flex items-center text-[12px] text-gray-500 font-medium">
              ★ 4.8 <span className="mx-1.5 text-gray-300">|</span> {job.date}
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);
