// AI 분석 대시보드 공통 컴포넌트

// 근거 텍스트 정제 함수
export const cleanEvidence = (text: string): string => {
    if (!text) return '';
    let cleaned = text
        .replace(/`detail`\s*:\s*\\*\s*/gi, '')
        .replace(/\(답변\s*내용\s*부재\)/gi, '')
        .replace(/\(모든\s*상세\s*답변이\s*공란[^)]*\)/gi, '')
        .replace(/\\+/g, '')
        .replace(/`[^`]*`\s*:\s*/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
    if (cleaned.length < 3 || cleaned === '-' || cleaned === 'N/A') return '';
    return cleaned;
};

// 섹션 제목 컴포넌트
const SectionTitle = ({ children, borderColor = 'border-blue-500' }: { children: React.ReactNode; borderColor?: string }) => (
    <div className={`border-l-4 ${borderColor} pl-3 mb-4`}>
        <h3 className="text-[15px] font-bold text-gray-900">{children}</h3>
    </div>
);

// 테이블 헤더 스타일
const thClass = 'px-4 py-2.5 text-left text-[12px] font-semibold text-gray-500 bg-slate-50 border-b border-gray-200 whitespace-nowrap';
const tdClass = 'px-4 py-3 text-[13px] text-gray-700 border-b border-gray-100';

// 수준 배지 컴포넌트
const LevelBadge = ({ level }: { level: string }) => {
    const normalized = level.replace(/[\[\]]/g, '').trim();
    const colorMap: Record<string, string> = {
        '상': 'bg-green-100 text-green-700',
        '높음': 'bg-green-100 text-green-700',
        '중': 'bg-amber-100 text-amber-700',
        '보통': 'bg-amber-100 text-amber-700',
        '하': 'bg-red-100 text-red-700',
        '낮음': 'bg-red-100 text-red-700',
    };
    const cls = colorMap[normalized] || 'bg-gray-100 text-gray-700';
    return <span className={`inline-block text-[11px] font-bold px-2.5 py-1 rounded-full ${cls}`}>{normalized}</span>;
};

// 상태 배지 컴포넌트
const StatusBadge = ({ status }: { status: string }) => {
    const isConfirmed = status === '확인됨';
    return (
        <span className={`inline-block text-[11px] font-bold px-2.5 py-1 rounded-full ${isConfirmed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {status}
        </span>
    );
};

// 수평 게이지 컴포넌트 (피드백 스타일)
const HorizontalGauge = ({
    level,
    title,
    description,
}: {
    level: string;
    title: string;
    description: string;
}) => {
    const normalized = level.replace(/[\[\]]/g, '').trim();
    const posMap: Record<string, number> = { '높음': 18, '상': 18, '보통': 50, '중': 50, '낮음': 82, '하': 82 };
    const position = posMap[normalized] || 50;
    const labelMap: Record<string, string> = { '높음': '높음', '상': '높음', '보통': '보통', '중': '보통', '낮음': '낮음', '하': '낮음' };
    const levelLabel = labelMap[normalized] || '보통';

    return (
        <div className="bg-slate-50 rounded-xl p-5 border border-gray-200 flex-1">
            <h4 className="text-[13px] font-bold text-gray-900 mb-4">{title}</h4>
            {/* 라벨 */}
            <div className="flex justify-between items-end mb-2 px-1">
                <div className="text-center">
                    <p className="text-[10px] text-gray-400 leading-tight">지원자 중</p>
                    <p className="text-[10px] text-gray-400 leading-tight">가장 <span className="font-bold text-blue-600">높은</span> 수준</p>
                </div>
                <div className="text-center">
                    <p className="text-[10px] text-gray-400 leading-tight">평균</p>
                    <p className="text-[10px] text-gray-400 leading-tight">수준</p>
                </div>
                <div className="text-center">
                    <p className="text-[10px] text-gray-400 leading-tight">지원자 중</p>
                    <p className="text-[10px] text-gray-400 leading-tight">가장 <span className="font-bold text-orange-500">낮은</span> 수준</p>
                </div>
            </div>
            {/* 게이지 바 */}
            <div className="relative h-3 rounded-full overflow-visible mb-1">
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-green-400 via-green-300/60 to-gray-200"></div>
                {/* 평균 마커 */}
                <div className="absolute top-0 bottom-0 left-1/2 w-px bg-gray-400/50"></div>
                {/* 위치 마커 */}
                <div
                    className="absolute top-1/2 -translate-y-1/2 transition-all duration-700 ease-out"
                    style={{ left: `${position}%` }}
                >
                    <div className="relative -ml-3">
                        <div className="w-6 h-6 rounded-full bg-white border-[2.5px] border-blue-500 shadow-md flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        </div>
                        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap">
                            <span className="text-[10px] font-bold text-blue-600">{levelLabel}</span>
                        </div>
                    </div>
                </div>
            </div>
            {/* 설명 */}
            <p className="text-[11px] text-gray-500 leading-relaxed mt-6">{description}</p>
        </div>
    );
};

// AI 분석 결과 타입
export interface AnalysisResult {
    profile: { track?: string; major?: string; info?: string; status?: string };
    overview: { classification?: string; skillLevel?: string; willLevel?: string };
    skills: Array<{ name: string; level: string; evidence: string; judgment: string }>;
    cultureFit: Array<{ name: string; status: string; description: string }>;
    strengths: string[];
    risks: string[];
    interviewQuestions: string[];
}

// 전체 AI 응답 파싱 함수
export const parseFullAnalysis = (text: string): AnalysisResult => {
    const result: AnalysisResult = {
        profile: {}, overview: {}, skills: [], cultureFit: [],
        strengths: [], risks: [], interviewQuestions: []
    };

    const lines = text.split('\n');
    let currentSection = '';
    let currentSubSection = '';
    let currentSkill: { name: string; level: string; evidence: string; judgment: string } | null = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line === '---') continue;

        if (line.match(/\[0\./)) { currentSection = 'profile'; currentSubSection = ''; continue; }
        if (line.match(/\[1\./)) { currentSection = 'overview'; currentSubSection = ''; continue; }
        if (line.match(/\[2\./)) { currentSection = 'skills'; currentSubSection = ''; continue; }
        if (line.match(/\[3\./)) { currentSection = 'cultureFit'; currentSubSection = ''; if (currentSkill) { result.skills.push(currentSkill); currentSkill = null; } continue; }
        if (line.match(/\[4\./)) { currentSection = 'guide'; currentSubSection = ''; continue; }

        if (currentSection === 'profile') {
            const m1 = line.match(/지원 트랙\s*[::：]\s*(.+)/); if (m1) result.profile.track = m1[1].trim();
            const m2 = line.match(/전공 정보\s*[::：]\s*(.+)/); if (m2) result.profile.major = m2[1].trim();
            const m3 = line.match(/인적 사항\s*[::：]\s*(.+)/); if (m3) result.profile.info = m3[1].trim();
            const m4 = line.match(/현재 상태\s*[::：]\s*(.+)/); if (m4) result.profile.status = m4[1].trim();
        }

        if (currentSection === 'overview') {
            const m1 = line.match(/최종 분류\s*[::：]\s*\[?([^\]]+)\]?/); if (m1) result.overview.classification = m1[1].trim();
            const m2 = line.match(/역량.*?\(Skill\).*?[::：]\s*\[?([^\]]+)\]?/); if (m2) result.overview.skillLevel = m2[1].trim();
            const m3 = line.match(/의지.*?\(Will\).*?[::：]\s*\[?([^\]]+)\]?/); if (m3) result.overview.willLevel = m3[1].trim();
        }

        if (currentSection === 'skills') {
            const skillMatch = line.match(/^(직무 역량|문제 해결|성장 잠재력|협업 태도)\s*\|\s*\[?([^\s\|]*[상중하높음보통낮음]+)/);
            if (skillMatch) {
                if (currentSkill) result.skills.push(currentSkill);
                currentSkill = { name: skillMatch[1].trim(), level: skillMatch[2].replace(/[\[\]]/g, '').trim(), evidence: '', judgment: '' };
                continue;
            }
            if (currentSkill) {
                if (line.startsWith('근거:')) {
                    currentSkill.evidence = line.replace(/^근거:\s*/, '').replace(/"/g, '').trim();
                } else if (line.startsWith('판정:')) {
                    currentSkill.judgment = line.replace(/^판정:\s*/, '').replace(/^\(|\)$/g, '').trim();
                }
            }
        }

        if (currentSection === 'cultureFit') {
            if (currentSkill) { result.skills.push(currentSkill); currentSkill = null; }
            const fitMatch = line.match(/\[\s*\]\s*(.+?)\s*[::：]\s*\[(확인됨|미흡)\]/);
            if (fitMatch) {
                let desc = '';
                if (i + 1 < lines.length) {
                    const nextLine = lines[i + 1].trim();
                    if (nextLine.startsWith('(') || (nextLine.length > 3 && !nextLine.startsWith('[') && !nextLine.match(/^---/))) {
                        desc = nextLine.replace(/^\(|\)$/g, '').trim();
                    }
                }
                result.cultureFit.push({ name: fitMatch[1].trim(), status: fitMatch[2], description: desc });
            }
        }

        if (currentSection === 'guide') {
            if (line.includes('💡') || line.includes('핵심 강점')) { currentSubSection = 'strengths'; continue; }
            if (line.includes('⚠️') || line.includes('주의 사항')) { currentSubSection = 'risks'; continue; }
            if (line.includes('🙋') || line.includes('면접 질문')) { currentSubSection = 'interview'; continue; }

            if (currentSubSection === 'strengths') {
                if (line.match(/^\d+\./)) {
                    const content = line.replace(/^\d+\.\s*/, '').trim();
                    if (content.length > 1) result.strengths.push(content);
                }
            }
            if (currentSubSection === 'risks') {
                const labelMatch = line.match(/^(.+?)[::：]\s*(.+)/);
                if (labelMatch && line.length > 10) {
                    result.risks.push(labelMatch[0].trim());
                } else if (line.startsWith('-') || line.startsWith('(')) {
                    const content = line.replace(/^-\s*|^\(|\)$/g, '').trim();
                    if (content.length > 5) result.risks.push(content);
                }
            }
            if (currentSubSection === 'interview') {
                const labelMatch = line.match(/^(.+?)[::：]\s*[""]?(.+)[""]?$/);
                if (labelMatch && line.length > 10) {
                    const fullQ = labelMatch[2].replace(/"/g, '').trim();
                    if (fullQ.length > 10) result.interviewQuestions.push(fullQ);
                } else if (line.startsWith('-') || line.startsWith('(') || line.startsWith('\u201c')) {
                    const content = line.replace(/^-\s*|^\(|\)$|^\u201c|\u201d$/g, '').replace(/"/g, '').trim();
                    if (content.length > 10) result.interviewQuestions.push(content);
                }
            }
        }
    }
    if (currentSkill) result.skills.push(currentSkill);
    return result;
};

// 분류 라벨 → 설명 매핑
const classificationDescriptions: Record<string, string> = {
    '즉시 면접': '역량과 의지 모두 높은 수준으로 평가되어 즉시 면접을 권장합니다.',
    '면접 권장': '종합적으로 우수한 역량을 보유하고 있어 면접 대상으로 적합합니다.',
    '조건부 검토': '일부 역량이 부족하나 잠재력이 있어 조건부 검토가 필요합니다.',
    '보류': '현재 기준에 부합하지 않는 부분이 있어 추가 검토가 필요합니다.',
};

// AI 분석 대시보드 렌더러
export const AIAnalysisDashboard = ({ content }: { content: string }) => {
    if (!content) return <p className="text-gray-400 text-sm">분석 결과가 없습니다.</p>;

    const analysis = parseFullAnalysis(content);
    const hasData = analysis.overview.classification || analysis.skills.length > 0 ||
                    analysis.cultureFit.length > 0 || analysis.strengths.length > 0 ||
                    analysis.risks.length > 0 || analysis.interviewQuestions.length > 0;

    if (!hasData) {
        return (
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <div className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">{content}</div>
            </div>
        );
    }

    // 역량 분류: 짚어볼 만한 (중/하) vs 우수 (상)
    const normalizeLevel = (l: string) => l.replace(/[\[\]]/g, '').trim();
    const flaggedSkills = analysis.skills.filter(s => ['중', '보통', '하', '낮음'].includes(normalizeLevel(s.level)));
    const excellentSkills = analysis.skills.filter(s => ['상', '높음'].includes(normalizeLevel(s.level)));

    const classificationDesc = analysis.overview.classification
        ? classificationDescriptions[analysis.overview.classification] || `해당 지원자는 "${analysis.overview.classification}" 단계로 분류되었습니다.`
        : '';

    return (
        <div className="space-y-8">

            {/* ── 서류 지원 현황 ── */}
            {Object.values(analysis.profile).some(v => v) && (
                <div>
                    <SectionTitle borderColor="border-slate-400">서류 지원 현황</SectionTitle>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-gray-200 rounded-lg overflow-hidden border border-gray-200">
                        {analysis.profile.track && (
                            <div className="bg-white p-3.5">
                                <p className="text-[10px] font-medium text-gray-400 mb-1">지원 트랙</p>
                                <p className="text-[13px] font-bold text-gray-900">{analysis.profile.track}</p>
                            </div>
                        )}
                        {analysis.profile.major && (
                            <div className="bg-white p-3.5">
                                <p className="text-[10px] font-medium text-gray-400 mb-1">전공</p>
                                <p className="text-[13px] font-bold text-gray-900">{analysis.profile.major}</p>
                            </div>
                        )}
                        {analysis.profile.info && (
                            <div className="bg-white p-3.5">
                                <p className="text-[10px] font-medium text-gray-400 mb-1">인적 사항</p>
                                <p className="text-[13px] font-bold text-gray-900">{analysis.profile.info}</p>
                            </div>
                        )}
                        {analysis.profile.status && (
                            <div className="bg-white p-3.5">
                                <p className="text-[10px] font-medium text-gray-400 mb-1">현재 상태</p>
                                <p className="text-[13px] font-bold text-gray-900">{analysis.profile.status}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── 종합 진단 결과 ── */}
            {(analysis.overview.classification || analysis.overview.skillLevel || analysis.overview.willLevel) && (
                <div>
                    <SectionTitle borderColor="border-blue-500">종합 진단 결과</SectionTitle>

                    {/* 최종 분류 배너 */}
                    {analysis.overview.classification && (
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-5">
                            <div className="flex items-center gap-3 mb-1.5">
                                <p className="text-[11px] font-medium text-blue-400">최종 분류</p>
                                <span className="text-[12px] font-bold px-3 py-1 rounded-full bg-blue-600 text-white">
                                    {analysis.overview.classification}
                                </span>
                            </div>
                            <p className="text-[12px] text-gray-600 leading-relaxed">{classificationDesc}</p>
                        </div>
                    )}

                    {/* Skill / Will 게이지 카드 (이미지 피드백 스타일) */}
                    {(analysis.overview.skillLevel || analysis.overview.willLevel) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {analysis.overview.skillLevel && (
                                <HorizontalGauge
                                    level={analysis.overview.skillLevel}
                                    title="역량 (Skill)"
                                    description="지원자의 직무 관련 역량 수준을 종합적으로 평가한 결과입니다. 실무 경험, 기술 스택, 문제 해결 능력 등을 반영합니다."
                                />
                            )}
                            {analysis.overview.willLevel && (
                                <HorizontalGauge
                                    level={analysis.overview.willLevel}
                                    title="의지 (Will)"
                                    description="지원자의 성장 의지와 동기 부여 수준을 평가한 결과입니다. 자기 개발 노력, 목표 의식, 열정 등을 반영합니다."
                                />
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ── 짚어 볼 만한 역량 평가 ── */}
            {flaggedSkills.length > 0 && (
                <div>
                    <SectionTitle borderColor="border-amber-500">짚어 볼 만한 역량 평가</SectionTitle>
                    <div className="rounded-xl border border-gray-200 overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr>
                                    <th className={thClass}>역량</th>
                                    <th className={thClass}>근거</th>
                                    <th className={`${thClass} text-center`}>수준</th>
                                    <th className={thClass}>판정</th>
                                </tr>
                            </thead>
                            <tbody>
                                {flaggedSkills.map((skill, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                        <td className={`${tdClass} font-semibold text-gray-900 whitespace-nowrap`}>{skill.name}</td>
                                        <td className={tdClass}>
                                            <p className="text-[12px] text-gray-600 leading-relaxed line-clamp-2">
                                                {cleanEvidence(skill.evidence) || '-'}
                                            </p>
                                        </td>
                                        <td className={`${tdClass} text-center`}><LevelBadge level={skill.level} /></td>
                                        <td className={tdClass}>
                                            <p className="text-[12px] text-gray-600 leading-relaxed">{skill.judgment || '-'}</p>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── 우수 역량 평가 ── */}
            {excellentSkills.length > 0 && (
                <div>
                    <SectionTitle borderColor="border-green-500">우수 역량 평가</SectionTitle>
                    <div className="rounded-xl border border-gray-200 overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr>
                                    <th className={thClass}>역량</th>
                                    <th className={thClass}>근거</th>
                                    <th className={`${thClass} text-center`}>수준</th>
                                    <th className={thClass}>판정</th>
                                </tr>
                            </thead>
                            <tbody>
                                {excellentSkills.map((skill, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                        <td className={`${tdClass} font-semibold text-gray-900 whitespace-nowrap`}>{skill.name}</td>
                                        <td className={tdClass}>
                                            <p className="text-[12px] text-gray-600 leading-relaxed line-clamp-2">
                                                {cleanEvidence(skill.evidence) || '-'}
                                            </p>
                                        </td>
                                        <td className={`${tdClass} text-center`}><LevelBadge level={skill.level} /></td>
                                        <td className={tdClass}>
                                            <p className="text-[12px] text-gray-600 leading-relaxed">{skill.judgment || '-'}</p>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── 조직 적합도 ── */}
            {analysis.cultureFit.length > 0 && (
                <div>
                    <SectionTitle borderColor="border-purple-500">조직 적합도 (Culture Fit)</SectionTitle>
                    <div className="rounded-xl border border-gray-200 overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr>
                                    <th className={thClass}>항목</th>
                                    <th className={thClass}>설명</th>
                                    <th className={`${thClass} text-center`}>상태</th>
                                </tr>
                            </thead>
                            <tbody>
                                {analysis.cultureFit.map((fit, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                        <td className={`${tdClass} font-semibold text-gray-900 whitespace-nowrap`}>{fit.name}</td>
                                        <td className={tdClass}>
                                            <p className="text-[12px] text-gray-600 leading-relaxed">{fit.description || '-'}</p>
                                        </td>
                                        <td className={`${tdClass} text-center`}><StatusBadge status={fit.status} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── 핵심 강점 (칭찬 부분 스타일) ── */}
            {analysis.strengths.length > 0 && (
                <div>
                    <SectionTitle borderColor="border-green-500">핵심 강점</SectionTitle>
                    <div className="rounded-xl border border-gray-200 overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr>
                                    <th className={`${thClass} w-12 text-center`}>#</th>
                                    <th className={thClass}>내용</th>
                                </tr>
                            </thead>
                            <tbody>
                                {analysis.strengths.map((s, idx) => (
                                    <tr key={idx} className="hover:bg-green-50/30 transition-colors">
                                        <td className={`${tdClass} text-center`}>
                                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold">{idx + 1}</span>
                                        </td>
                                        <td className={`${tdClass} text-[13px] text-gray-700 leading-relaxed`}>{s}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── 주의 사항 (보완 부분 스타일) ── */}
            {analysis.risks.length > 0 && (
                <div>
                    <SectionTitle borderColor="border-orange-500">주의 사항 (Risk)</SectionTitle>
                    <div className="rounded-xl border border-gray-200 overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr>
                                    <th className={`${thClass} w-12 text-center`}>#</th>
                                    <th className={thClass}>내용</th>
                                </tr>
                            </thead>
                            <tbody>
                                {analysis.risks.map((risk, idx) => (
                                    <tr key={idx} className="hover:bg-orange-50/30 transition-colors">
                                        <td className={`${tdClass} text-center`}>
                                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold">{idx + 1}</span>
                                        </td>
                                        <td className={`${tdClass} text-[13px] text-gray-700 leading-relaxed`}>{risk}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── 면접 질문 추천 ── */}
            {analysis.interviewQuestions.length > 0 && (
                <div>
                    <SectionTitle borderColor="border-indigo-500">면접 질문 추천</SectionTitle>
                    <div className="rounded-xl border border-gray-200 overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr>
                                    <th className={`${thClass} w-12 text-center`}>#</th>
                                    <th className={thClass}>질문</th>
                                </tr>
                            </thead>
                            <tbody>
                                {analysis.interviewQuestions.map((q, idx) => (
                                    <tr key={idx} className="hover:bg-indigo-50/30 transition-colors">
                                        <td className={`${tdClass} text-center`}>
                                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">Q{idx + 1}</span>
                                        </td>
                                        <td className={`${tdClass} text-[13px] text-gray-700 leading-relaxed`}>{q}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};
