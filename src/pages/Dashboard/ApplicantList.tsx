import React from 'react';
import { Filter, Download, MoreHorizontal } from 'lucide-react';
import { MOCK_APPLICANTS } from '@/constants/mockData';

export const ApplicantList = () => (
     <div className="bg-white rounded-2xl border border-gray-100 shadow-sm min-h-[600px] flex flex-col max-w-[1200px] mx-auto">
         <div className="p-6 border-b border-gray-100 flex justify-between items-center">
             <div>
                <h3 className="font-bold text-lg text-gray-900">지원자 리스트</h3>
                <p className="text-xs text-gray-400 mt-1">총 142명의 지원자가 있습니다.</p>
             </div>
             <div className="flex gap-2">
                 <button className="flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-xs font-medium text-gray-600 transition-colors"><Filter size={16}/> 필터</button>
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
                         <th className="px-6 py-4">희망 연봉</th>
                         <th className="px-6 py-4">지원 일시</th>
                         <th className="px-6 py-4 text-right">상태</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50">
                     {MOCK_APPLICANTS.map((applicant) => (
                         <tr key={applicant.id} className="hover:bg-blue-50/30 transition-colors group cursor-pointer">
                             <td className="px-6 py-5"><input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"/></td>
                             <td className="px-6 py-5">
                                 <div className="font-bold text-[14px] text-gray-900">{applicant.name}</div>
                                 <div className="text-[11px] text-gray-400">kim@example.com</div>
                             </td>
                             <td className="px-6 py-5">
                                 <div className="text-[13px] font-medium text-gray-700">시니어 프로덕트 디자이너</div>
                                 <div className="text-[11px] text-blue-500 font-medium">1년 경력</div>
                             </td>
                             <td className="px-6 py-5 font-medium text-[13px]">{applicant.amount}</td>
                             <td className="px-6 py-5 text-[13px] text-gray-400">{applicant.date}</td>
                             <td className="px-6 py-5 text-right">
                                 <span className={`inline-flex items-center justify-center w-16 py-1.5 rounded text-[11px] font-bold ${
                                     applicant.status === '합격' ? 'bg-green-100 text-green-600' :
                                     applicant.status === '불합격' ? 'bg-red-100 text-red-600' :
                                     applicant.status === '보류' ? 'bg-yellow-100 text-yellow-600' :
                                     'bg-purple-100 text-purple-600'
                                 }`}>
                                     {applicant.status}
                                 </span>
                             </td>
                         </tr>
                     ))}
                 </tbody>
             </table>
         </div>
     </div>
);
