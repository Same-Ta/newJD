import { useState, useEffect } from 'react';
import { db, auth } from '@/config/firebase';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';

interface JDDetailProps {
    jdId?: string;
    onNavigate: (page: string) => void;
}

interface JDData {
    title: string;
    company?: string;
    jobRole?: string;
    responsibilities: string[];
    requirements: string[];
    preferred: string[];
    benefits: string[];
    createdAt: any;
    status?: string;
    userId?: string;
}

export const JDDetail = ({ jdId, onNavigate }: JDDetailProps) => {
    const [jdData, setJdData] = useState<JDData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    
    // 지원하기 폼 상태
    const [applicantName, setApplicantName] = useState('');
    const [applicantEmail, setApplicantEmail] = useState('');
    const [applicantGender, setApplicantGender] = useState('');
    const [checkedItems, setCheckedItems] = useState<{[key: string]: boolean}>({});
    const [answers, setAnswers] = useState<{[key: string]: string}>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // 작성자 여부 확인
    const currentUserId = auth.currentUser?.uid;
    const isOwner = currentUserId && jdData?.userId === currentUserId;

    useEffect(() => {
        const fetchJD = async () => {
            if (!jdId) {
                setError(true);
                setLoading(false);
                return;
            }

            try {
                console.log('JD 상세 정보 불러오는 중...', jdId);
                const docRef = doc(db, 'jds', jdId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    console.log('JD 데이터:', docSnap.data());
                    setJdData(docSnap.data() as JDData);
                } else {
                    console.error('문서가 존재하지 않습니다.');
                    setError(true);
                }
            } catch (err) {
                console.error('JD 불러오기 실패:', err);
                setError(true);
            } finally {
                setLoading(false);
            }
        };

        fetchJD();
    }, [jdId]);

    const handleShare = async () => {
        try {
            const currentUrl = window.location.href;
            await navigator.clipboard.writeText(currentUrl);
            alert('링크가 클립보드에 복사되었습니다. 원하시는 곳에 붙여넣기(Ctrl+V) 하세요.');
        } catch (err) {
            console.error('클립보드 복사 실패:', err);
            alert('링크 복사에 실패했습니다.');
        }
    };

    const handleApply = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!jdId || !jdData) {
            alert('공고 정보를 찾을 수 없습니다.');
            return;
        }

        // 유효성 검사: 최소 1개 이상의 답변 필요
        const answeredItems = Object.keys(answers).filter(key => answers[key].trim() !== '');
        if (answeredItems.length === 0) {
            alert('최소 1개 이상의 항목에 대해 답변을 작성해주세요.');
            return;
        }

        setIsSubmitting(true);
        
        try {
            // answers를 배열 형태로 변환
            const formattedAnswers = Object.keys(answers)
                .filter(key => answers[key].trim() !== '')
                .map(key => {
                    let question = '';
                    
                    // task-0, req-1 형태의 key에서 질문 텍스트 추출
                    if (key.startsWith('task-')) {
                        const index = parseInt(key.split('-')[1]);
                        question = jdData.responsibilities[index] || '';
                    } else if (key.startsWith('req-')) {
                        const index = parseInt(key.split('-')[1]);
                        question = jdData.requirements[index] || '';
                    }
                    
                    return {
                        question,
                        answer: answers[key]
                    };
                });

            const applicationData = {
                jdId: jdId,
                recruiterId: jdData.userId || '',
                jdTitle: jdData.title,
                applicantName,
                applicantEmail,
                applicantGender,
                answers: formattedAnswers,
                appliedAt: serverTimestamp(),
                status: 'pending'
            };

            await addDoc(collection(db, 'applications'), applicationData);
            
            alert('지원서가 성공적으로 제출되었습니다!');
            
            // 폼 초기화
            setApplicantName('');
            setApplicantEmail('');
            setApplicantGender('');
            setCheckedItems({});
            setAnswers({});
        } catch (error) {
            console.error('지원 제출 실패:', error);
            alert('지원 제출 중 오류가 발생했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-500">로딩 중...</p>
                </div>
            </div>
        );
    }

    if (error || !jdData) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div className="text-gray-400 mb-4">
                        <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-bold text-gray-700 mb-2">존재하지 않는 공고입니다</h3>
                    <p className="text-sm text-gray-500 mb-6">해당 공고를 찾을 수 없습니다.</p>
                    <button 
                        onClick={() => onNavigate('my-jds')}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                    >
                        목록으로 돌아가기
                    </button>
                </div>
            </div>
        );
    }

    // 날짜 포맷팅
    let formattedDate = '';
    if (jdData.createdAt) {
        const date = jdData.createdAt?.toDate ? jdData.createdAt.toDate() : new Date(jdData.createdAt);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        formattedDate = `${year}.${month}.${day}`;
    }

    return (
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
                <span className="text-blue-600 text-[12px] font-bold bg-blue-50 px-2 py-1 rounded mb-3 inline-block">
                    {jdData.status === 'published' ? '게시됨' : '임시저장'}
                </span>
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-[28px] font-extrabold text-gray-900 leading-tight">{jdData.title || '제목 없음'}</h1>
                    {isOwner && (
                        <button
                            onClick={handleShare}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                            </svg>
                            🔗 링크 공유하기
                        </button>
                    )}
                </div>
                <div className="text-sm text-gray-500 mb-4">{formattedDate}</div>
                {jdData.jobRole && (
                    <p className="text-gray-600 leading-relaxed text-[15px] mb-2">
                        <strong>직무:</strong> {jdData.jobRole}
                    </p>
                )}
                {jdData.company && (
                    <p className="text-gray-600 leading-relaxed text-[15px]">
                        <strong>회사:</strong> {jdData.company}
                    </p>
                )}
            </div>

            <div className="space-y-12">
                {/* 주요 업무 */}
                {jdData.responsibilities && jdData.responsibilities.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 mb-5">
                            <div className="w-1 h-4 bg-blue-600 rounded-full"></div>
                            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">주요 업무 (Responsibilities)</h3>
                        </div>
                        <div className="space-y-3">
                            {jdData.responsibilities.map((item, i) => (
                                <div key={i} className="flex items-start gap-3 p-4 bg-gray-50/50 rounded-xl border border-gray-100">
                                    <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <div className="w-2 h-2 rounded-full bg-white"></div>
                                    </div>
                                    <span className="text-[14px] font-medium text-gray-700 leading-relaxed">{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 자격 요건 */}
                {jdData.requirements && jdData.requirements.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 mb-5">
                            <div className="w-1 h-4 bg-blue-600 rounded-full"></div>
                            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">자격 요건 (Requirements)</h3>
                        </div>
                        <div className="space-y-3">
                            {jdData.requirements.map((item, i) => (
                                <div key={i} className="flex items-start gap-3 p-4 bg-gray-50/50 rounded-xl border border-gray-100 hover:border-blue-200 transition-colors cursor-default">
                                    <div className="w-5 h-5 rounded border-2 border-gray-300 bg-white flex-shrink-0 mt-0.5"></div>
                                    <span className="text-[14px] font-medium text-gray-700 leading-relaxed">{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 우대 사항 */}
                {jdData.preferred && jdData.preferred.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 mb-5">
                            <div className="w-1 h-4 bg-blue-600 rounded-full"></div>
                            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">우대 사항 (Preferred)</h3>
                        </div>
                        <div className="space-y-3">
                            {jdData.preferred.map((item, i) => (
                                <div key={i} className="flex items-start gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-colors cursor-default shadow-sm">
                                    <div className="w-5 h-5 rounded border-2 border-gray-300 bg-white flex-shrink-0 mt-0.5"></div>
                                    <span className="text-[14px] font-medium text-gray-700 leading-relaxed">{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 복지 및 혜택 */}
                {jdData.benefits && jdData.benefits.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 mb-5">
                            <div className="w-1 h-4 bg-blue-600 rounded-full"></div>
                            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">복지 및 혜택 (Benefits)</h3>
                        </div>
                        <div className="space-y-3">
                            {jdData.benefits.map((item, i) => (
                                <div key={i} className="flex items-start gap-3 p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                                    <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <span className="text-[14px] font-medium text-gray-700 leading-relaxed">{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 지원하기 폼 (작성자가 아닌 경우에만 표시) */}
                {!isOwner && (
                    <div className="mt-12 p-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-[24px] border-2 border-blue-200">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <h3 className="text-[20px] font-bold text-gray-900">이 포지션에 지원하기</h3>
                        </div>
                        
                        <form onSubmit={handleApply} className="space-y-6">
                            {/* 기본 정보 */}
                            <div className="bg-white p-6 rounded-xl border border-gray-200 space-y-4">
                                <h4 className="text-[14px] font-bold text-gray-800 mb-4">기본 정보</h4>
                                
                                <div>
                                    <label className="block text-[13px] font-bold text-gray-700 mb-2">이름 *</label>
                                    <input
                                        type="text"
                                        value={applicantName}
                                        onChange={(e) => setApplicantName(e.target.value)}
                                        required
                                        placeholder="홍길동"
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-[14px]"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-[13px] font-bold text-gray-700 mb-2">이메일 *</label>
                                    <input
                                        type="email"
                                        value={applicantEmail}
                                        onChange={(e) => setApplicantEmail(e.target.value)}
                                        required
                                        placeholder="example@email.com"
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-[14px]"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-[13px] font-bold text-gray-700 mb-2">성별 *</label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="gender"
                                                value="남성"
                                                checked={applicantGender === '남성'}
                                                onChange={(e) => setApplicantGender(e.target.value)}
                                                required
                                                className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                                            />
                                            <span className="text-[14px] text-gray-700">남성</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="gender"
                                                value="여성"
                                                checked={applicantGender === '여성'}
                                                onChange={(e) => setApplicantGender(e.target.value)}
                                                required
                                                className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                                            />
                                            <span className="text-[14px] text-gray-700">여성</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="gender"
                                                value="기타"
                                                checked={applicantGender === '기타'}
                                                onChange={(e) => setApplicantGender(e.target.value)}
                                                required
                                                className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                                            />
                                            <span className="text-[14px] text-gray-700">기타</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* 주요 업무 체크리스트 */}
                            {jdData.responsibilities && jdData.responsibilities.length > 0 && (
                                <div className="bg-white p-6 rounded-xl border border-gray-200">
                                    <h4 className="text-[14px] font-bold text-gray-800 mb-4">주요 업무 관련 경험</h4>
                                    <p className="text-[12px] text-gray-500 mb-4">해당하는 업무 경험이 있다면 체크하고 자세히 설명해주세요.</p>
                                    
                                    <div className="space-y-3">
                                        {jdData.responsibilities.map((task, i) => {
                                            const itemKey = `task-${i}`;
                                            const isChecked = checkedItems[itemKey] || false;
                                            
                                            return (
                                                <div 
                                                    key={i} 
                                                    className={`p-4 rounded-xl border-2 transition-all ${
                                                        isChecked 
                                                            ? 'border-blue-500 bg-blue-50/50 border-l-4' 
                                                            : 'border-gray-200 bg-white'
                                                    }`}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <input
                                                            type="checkbox"
                                                            id={itemKey}
                                                            checked={isChecked}
                                                            onChange={(e) => {
                                                                const newChecked = e.target.checked;
                                                                setCheckedItems(prev => ({
                                                                    ...prev,
                                                                    [itemKey]: newChecked
                                                                }));
                                                                
                                                                if (!newChecked) {
                                                                    setAnswers(prev => {
                                                                        const newAnswers = { ...prev };
                                                                        delete newAnswers[itemKey];
                                                                        return newAnswers;
                                                                    });
                                                                }
                                                            }}
                                                            className="w-5 h-5 rounded border-2 border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 mt-0.5 cursor-pointer"
                                                        />
                                                        <label htmlFor={itemKey} className="flex-1 text-[14px] font-medium text-gray-700 leading-relaxed cursor-pointer">
                                                            {task}
                                                        </label>
                                                    </div>
                                                    
                                                    {isChecked && (
                                                        <div className="mt-3 animate-[slideDown_0.2s_ease-out]">
                                                            <textarea
                                                                value={answers[itemKey] || ''}
                                                                onChange={(e) => setAnswers(prev => ({
                                                                    ...prev,
                                                                    [itemKey]: e.target.value
                                                                }))}
                                                                placeholder="이 항목과 관련된 경험을 자세히 설명해주세요..."
                                                                rows={3}
                                                                className="w-full px-4 py-3 border-2 border-blue-300 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-[13px] resize-none"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* 자격 요건 체크리스트 */}
                            {jdData.requirements && jdData.requirements.length > 0 && (
                                <div className="bg-white p-6 rounded-xl border border-gray-200">
                                    <h4 className="text-[14px] font-bold text-gray-800 mb-4">자격 요건 충족도</h4>
                                    <p className="text-[12px] text-gray-500 mb-4">보유하고 있는 자격 요건을 체크하고 관련 경험을 설명해주세요.</p>
                                    
                                    <div className="space-y-3">
                                        {jdData.requirements.map((req, i) => {
                                            const itemKey = `req-${i}`;
                                            const isChecked = checkedItems[itemKey] || false;
                                            
                                            return (
                                                <div 
                                                    key={i} 
                                                    className={`p-4 rounded-xl border-2 transition-all ${
                                                        isChecked 
                                                            ? 'border-blue-500 bg-blue-50/50 border-l-4' 
                                                            : 'border-gray-200 bg-white'
                                                    }`}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <input
                                                            type="checkbox"
                                                            id={itemKey}
                                                            checked={isChecked}
                                                            onChange={(e) => {
                                                                const newChecked = e.target.checked;
                                                                setCheckedItems(prev => ({
                                                                    ...prev,
                                                                    [itemKey]: newChecked
                                                                }));
                                                                
                                                                if (!newChecked) {
                                                                    setAnswers(prev => {
                                                                        const newAnswers = { ...prev };
                                                                        delete newAnswers[itemKey];
                                                                        return newAnswers;
                                                                    });
                                                                }
                                                            }}
                                                            className="w-5 h-5 rounded border-2 border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 mt-0.5 cursor-pointer"
                                                        />
                                                        <label htmlFor={itemKey} className="flex-1 text-[14px] font-medium text-gray-700 leading-relaxed cursor-pointer">
                                                            {req}
                                                        </label>
                                                    </div>
                                                    
                                                    {isChecked && (
                                                        <div className="mt-3 animate-[slideDown_0.2s_ease-out]">
                                                            <textarea
                                                                value={answers[itemKey] || ''}
                                                                onChange={(e) => setAnswers(prev => ({
                                                                    ...prev,
                                                                    [itemKey]: e.target.value
                                                                }))}
                                                                placeholder="이 항목과 관련된 경험을 자세히 설명해주세요..."
                                                                rows={3}
                                                                className="w-full px-4 py-3 border-2 border-blue-300 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-[13px] resize-none"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                            
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-[15px] hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                            >
                                {isSubmitting ? '제출 중...' : '✉️ 지원서 제출하기'}
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    </div>
    );
};
