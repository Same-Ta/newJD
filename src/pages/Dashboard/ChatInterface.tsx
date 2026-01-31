import React from 'react';
import { ChevronRight, MessageSquare, X, FileText } from 'lucide-react';

export const ChatInterface = () => (
    <div className="flex h-full bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden max-w-[1200px] mx-auto" style={{ height: 'calc(100vh - 140px)'}}>
        {/* Chat Area - Left */}
        <div className="w-[380px] border-r border-gray-100 flex flex-col bg-[#F8FAFC]">
            <div className="p-5 border-b border-gray-100 bg-white flex justify-between items-center h-[70px]">
                <div className="flex items-center gap-2.5 font-bold text-[15px] text-gray-800">
                    <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-md"><MessageSquare size={14} fill="white"/></div>
                    JD 생성 매니저
                </div>
                <X size={18} className="text-gray-400 cursor-pointer hover:text-gray-600"/>
            </div>
            
            <div className="flex-1 p-5 space-y-6 overflow-y-auto">
                <div className="flex gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-blue-600 border border-blue-200">AI</div>
                    <div className="space-y-1 max-w-[260px]">
                        <div className="bg-white p-3.5 rounded-2xl rounded-tl-none text-[13px] text-gray-700 shadow-sm border border-gray-100 leading-relaxed">
                            안녕하세요! <strong>WINNOW 채용 매니저</strong>입니다. <br/>저희가 최고의 채용 공고(JD)를 작성해 드릴게요. 어떤 포지션을 찾고 계신가요?
                        </div>
                        <div className="text-[10px] text-gray-400 pl-1">오전 10:23</div>
                    </div>
                </div>
            </div>

            <div className="p-4 bg-white border-t border-gray-100">
                <div className="relative">
                    <input type="text" placeholder="답변을 입력하세요..." className="w-full pl-4 pr-12 py-3.5 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-[13px] font-medium placeholder:text-gray-400 shadow-inner"/>
                    <button className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white hover:bg-blue-700 transition-colors shadow-md">
                        <ChevronRight size={18}/>
                    </button>
                </div>
            </div>
        </div>

        {/* Preview Area - Right */}
        <div className="flex-1 bg-white flex flex-col relative">
            <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
            <div className="p-6 border-b border-gray-100 flex justify-between items-center h-[70px]">
                <h3 className="font-bold text-lg text-gray-800">실시간 미리보기</h3>
                <div className="flex gap-2">
                    <button className="px-4 py-2 border border-gray-200 rounded-lg text-[12px] font-bold text-gray-600 hover:bg-gray-50 transition-colors">임시 저장</button>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[12px] font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all">공고 게시</button>
                </div>
            </div>
            <div className="flex-1 p-10 bg-gray-50/30 overflow-y-auto">
                <div className="bg-white border border-gray-200 rounded-xl w-full h-full flex flex-col items-center justify-center text-center p-10 shadow-sm border-dashed">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <FileText size={32} className="text-gray-300"/>
                    </div>
                    <h4 className="font-bold text-gray-400 mb-2">아직 작성된 내용이 없습니다.</h4>
                    <p className="text-[13px] text-gray-400 max-w-xs leading-relaxed">왼쪽 채팅창에서 AI 매니저와 대화를 나누면, 이곳에 채용 공고가 실시간으로 완성됩니다.</p>
                </div>
            </div>
        </div>
    </div>
);
