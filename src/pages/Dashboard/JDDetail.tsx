import React from 'react';

export const JDDetail = () => (
    <div className="flex flex-col lg:flex-row gap-8 h-full max-w-[1200px] mx-auto pb-10">
        {/* Left Info Panel */}
        <div className="w-full lg:w-[320px] flex-shrink-0 space-y-6">
            <div className="bg-white p-8 rounded-[24px] border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] text-center">
                <div className="w-[88px] h-[88px] rounded-full mx-auto mb-5 overflow-hidden ring-4 ring-gray-50">
                    <img src="https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&q=80&w=200" alt="logo" className="w-full h-full object-cover"/>
                </div>
                <h3 className="font-extrabold text-xl text-gray-900">WINNOW</h3>
                <div className="text-[13px] font-medium text-blue-600 mt-1 bg-blue-50 inline-block px-3 py-1 rounded-full">디자인팀</div>
                
                <div className="mt-8 space-y-5 text-left">
                    <div className="flex items-start gap-4">
                        <div className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0 text-gray-400"><div className="w-2 h-2 rounded-full bg-gray-400"></div></div>
                        <div>
                            <div className="text-[10px] font-bold text-gray-400 tracking-wider mb-0.5">LOCATION</div>
                            <div className="font-bold text-[14px] text-gray-800">판교 오피스</div>
                        </div>
                    </div>
                    <div className="flex items-start gap-4">
                        <div className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0 text-gray-400"><div className="w-2 h-2 rounded-full bg-gray-400"></div></div>
                        <div>
                            <div className="text-[10px] font-bold text-gray-400 tracking-wider mb-0.5">SALARY</div>
                            <div className="font-bold text-[14px] text-gray-800">6,000만원 부터</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white p-8 rounded-[24px] border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                <h4 className="font-bold text-[13px] mb-6 flex items-center gap-2 text-blue-600 uppercase tracking-wide">
                    ⚡ Tech Stack & Skills
                </h4>
                <div className="space-y-6">
                    {[
                        { name: 'Figma', val: 95 },
                        { name: 'ProtoPie', val: 80 },
                        { name: 'Illustrator', val: 70 },
                        { name: 'Design System', val: 90 }
                    ].map(skill => (
                        <div key={skill.name}>
                            <div className="flex justify-between text-[12px] mb-2 font-bold text-gray-700">
                                <span>{skill.name}</span>
                                <span className="text-blue-600">{skill.val}%</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                <div className="bg-blue-600 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${skill.val}%` }}></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* Right Content */}
        <div className="flex-1 bg-white p-10 rounded-[24px] border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] h-full overflow-y-auto">
            <div className="mb-10">
                <span className="text-blue-600 text-[12px] font-bold bg-blue-50 px-2 py-1 rounded mb-3 inline-block">채용중</span>
                <h1 className="text-[28px] font-extrabold text-gray-900 mb-4 leading-tight">시니어 프로덕트 디자이너<br/>(Product Designer)</h1>
                <p className="text-gray-600 leading-relaxed text-[15px]">
                    WINNOW의 디자인 시스템을 고도화하고, 사용자 중심의 UI/UX를 설계합니다. 복잡한 채용 데이터를 직관적인 시각화로 풀어내는 것이 핵심 과제입니다. 우리는 데이터를 두려워하지 않고, 논리적인 근거를 바탕으로 디자인하는 분을 찾습니다.
                </p>
            </div>

            <div className="space-y-12">
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-1 h-4 bg-blue-600 rounded-full"></div>
                        <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Vision & Mission</h3>
                    </div>
                    
                    <div className="pl-3 border-l-2 border-gray-100 space-y-6">
                        <div>
                            <h3 className="font-bold text-gray-900 text-[15px] mb-2">우리의 비전</h3>
                            <p className="text-[14px] text-gray-600 leading-relaxed">모든 채용 담당자가 데이터에 기반하여 확신을 가지고 인재를 채용할 수 있는 세상을 만듭니다.</p>
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 text-[15px] mb-2">우리의 미션</h3>
                            <p className="text-[14px] text-gray-600 leading-relaxed">불필요한 서류 검토 시간을 0에 수렴하게 만들고, 사람과 사람이 만나는 인터뷰의 가치를 극대화합니다.</p>
                        </div>
                    </div>
                </div>

                <div>
                    <div className="flex items-center gap-2 mb-5">
                        <div className="w-1 h-4 bg-blue-600 rounded-full"></div>
                        <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">자격 요건 (Checklist)</h3>
                    </div>
                    <div className="space-y-3">
                        {[
                            '5년 이상의 모바일/웹 프로덕트 디자인 경력이 있으신 분',
                            'Figma를 활용한 디자인 시스템 구축 및 운영 경험이 있으신 분',
                            '개발자, PM과 원활한 커뮤니케이션이 가능하신 분',
                            '데이터를 기반으로 디자인 의사결정을 내릴 수 있는 분'
                        ].map((item, i) => (
                            <div key={i} className="flex items-start gap-3 p-4 bg-gray-50/50 rounded-xl border border-gray-100 hover:border-blue-200 transition-colors cursor-default">
                                <div className="w-5 h-5 rounded border-2 border-gray-300 bg-white flex-shrink-0 mt-0.5"></div>
                                <span className="text-[14px] font-medium text-gray-700 leading-relaxed">{item}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                     <div className="flex items-center gap-2 mb-5">
                        <div className="w-1 h-4 bg-blue-600 rounded-full"></div>
                        <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">우대 사항 (Preferred)</h3>
                    </div>
                     <div className="space-y-3">
                        {[
                            'B2B SaaS 프로덕트 디자인 경험이 있으신 분',
                            'ProtoPie, Framer 등을 활용한 인터랙션 디자인 능력이 뛰어나신 분',
                            'HTML/CSS에 대한 기본적인 이해가 있으신 분'
                        ].map((item, i) => (
                            <div key={i} className="flex items-start gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-colors cursor-default shadow-sm">
                                <div className="w-5 h-5 rounded border-2 border-gray-300 bg-white flex-shrink-0 mt-0.5"></div>
                                <span className="text-[14px] font-medium text-gray-700 leading-relaxed">{item}</span>
                            </div>
                        ))}
                     </div>
                </div>
            </div>
        </div>
    </div>
);
