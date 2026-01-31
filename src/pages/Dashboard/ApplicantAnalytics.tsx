import React from 'react';
import { ChevronRight } from 'lucide-react';

export const ApplicantAnalytics = () => (
    <div className="space-y-8 max-w-[1200px] mx-auto pb-10">
        <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">지원자 현황</h2>
            <p className="text-gray-500 text-sm mt-1">AI가 스크리닝한 인재 목록을 확인하세요.</p>
        </div>

        {/* Analytics Top */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Graph Card */}
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
                <div className="flex justify-between items-center mb-8">
                    <h3 className="font-bold text-lg text-gray-800">총 지원자 추이</h3>
                    <div className="text-[12px] font-bold text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg flex items-center gap-2 cursor-pointer hover:bg-gray-100">
                        January 2026 <ChevronRight size={14}/>
                    </div>
                </div>
                <div className="h-[220px] w-full relative">
                    {/* SVG Wave Graph */}
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 400 150" preserveAspectRatio="none">
                         <defs>
                            <linearGradient id="gradientArea" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#818CF8" stopOpacity="0.2"/>
                                <stop offset="100%" stopColor="#818CF8" stopOpacity="0"/>
                            </linearGradient>
                        </defs>
                        {/* Grid lines */}
                        <line x1="0" y1="150" x2="400" y2="150" stroke="#F3F4F6" strokeWidth="1" />
                        <line x1="0" y1="100" x2="400" y2="100" stroke="#F3F4F6" strokeWidth="1" />
                        <line x1="0" y1="50" x2="400" y2="50" stroke="#F3F4F6" strokeWidth="1" />
                        
                        {/* Dashed Line (Previous) */}
                        <path d="M0,120 Q50,110 100,80 T200,90 T300,70 T400,90" fill="none" stroke="#E5E7EB" strokeWidth="2" strokeDasharray="5,5" />
                        
                        {/* Main Line */}
                        <path d="M0,130 Q40,120 80,70 T180,60 T280,30 T400,60" fill="none" stroke="#6366f1" strokeWidth="3" strokeLinecap="round"/>
                        <path d="M0,130 Q40,120 80,70 T180,60 T280,30 T400,60 V150 H0 Z" fill="url(#gradientArea)" stroke="none"/>
                        
                        {/* Active Point */}
                        <circle cx="280" cy="30" r="4" fill="white" stroke="#6366f1" strokeWidth="3" />
                    </svg>
                    
                    {/* Floating Tooltip */}
                    <div className="absolute top-[10%] left-[65%] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.1)] px-4 py-2.5 rounded-xl border border-gray-100 text-center animate-bounce duration-[2000ms]">
                        <div className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">This Month</div>
                        <div className="font-extrabold text-xl text-gray-900 leading-none">37 <span className="text-[10px] font-medium text-gray-400">명</span></div>
                        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-b border-r border-gray-100 rotate-45"></div>
                    </div>
                </div>
            </div>

            {/* Donut Charts */}
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-around">
                {/* Gender Chart */}
                <div className="text-center">
                    <div className="text-[13px] font-bold mb-6 text-gray-600">성비</div>
                    <div className="relative w-36 h-36 mx-auto">
                         <svg className="w-full h-full transform -rotate-90">
                            <circle cx="72" cy="72" r="56" fill="transparent" stroke="#EEF2FF" strokeWidth="16" strokeLinecap="round" />
                            <circle cx="72" cy="72" r="56" fill="transparent" stroke="#6366F1" strokeWidth="16" strokeDasharray="350" strokeDashoffset="120" strokeLinecap="round" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center flex-col">
                            <span className="text-[18px] font-extrabold text-gray-900">65%</span>
                            <span className="text-[10px] text-gray-400 font-medium">남성</span>
                        </div>
                    </div>
                    <div className="flex justify-center gap-4 mt-6">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500"></div>
                            <span className="text-[11px] font-medium text-gray-500">남성 20</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-indigo-100"></div>
                            <span className="text-[11px] font-medium text-gray-500">여성 10</span>
                        </div>
                    </div>
                </div>
                
                {/* Grade Chart */}
                 <div className="text-center">
                    <div className="text-[13px] font-bold mb-6 text-gray-600">경력 분포</div>
                    <div className="relative w-36 h-36 mx-auto">
                         <svg className="w-full h-full transform -rotate-90">
                            <circle cx="72" cy="72" r="56" fill="transparent" stroke="#F3E8FF" strokeWidth="16" strokeLinecap="round" />
                            <circle cx="72" cy="72" r="56" fill="transparent" stroke="#8B5CF6" strokeWidth="16" strokeDasharray="350" strokeDashoffset="80" strokeLinecap="round" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center flex-col">
                            <span className="text-[18px] font-extrabold text-gray-900">72%</span>
                            <span className="text-[10px] text-gray-400 font-medium">시니어</span>
                        </div>
                    </div>
                     <div className="flex justify-center gap-4 mt-6">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-violet-500"></div>
                            <span className="text-[11px] font-medium text-gray-500">5년+</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-violet-100"></div>
                            <span className="text-[11px] font-medium text-gray-500">주니어</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Status Cards - Colored */}
        <div>
             <h3 className="font-bold text-lg text-gray-800 mb-5">채용 진행 현황</h3>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                 {[
                     { label: '합격', count: 15, bg: 'bg-[#4ADE80]', text: 'text-white' },
                     { label: '보류', count: 3, bg: 'bg-[#FDE047]', text: 'text-yellow-800' },
                     { label: '불합격', count: 17, bg: 'bg-[#FCA5A5]', text: 'text-white' },
                     { label: '검토중', count: 20, bg: 'bg-[#C4B5FD]', text: 'text-white' }
                 ].map(status => (
                     <div key={status.label} className={`h-[120px] p-6 rounded-2xl ${status.bg} shadow-sm transition-all hover:scale-105 cursor-pointer flex flex-col justify-between`}>
                         <div className={`font-bold text-lg ${status.text}`}>{status.label}</div>
                         <div className={`text-3xl font-extrabold ${status.text}`}>{status.count} <span className="text-sm font-normal opacity-80">명</span></div>
                     </div>
                 ))}
             </div>
        </div>
    </div>
);
