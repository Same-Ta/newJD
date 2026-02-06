import { useState, useEffect } from 'react';
import { auth } from '@/config/firebase';
import { jdAPI, applicationAPI } from '@/services/api';
import { X } from 'lucide-react';

interface JDDetailProps {
    jdId?: string;
    onNavigate: (page: string) => void;
}

interface JDData {
    title: string;
    company?: string;
    companyName?: string;
    teamName?: string;
    jobRole?: string;
    location?: string;
    scale?: string;
    vision?: string;
    mission?: string;
    techStacks?: { name: string; level: number }[];
    responsibilities: string[];
    requirements: string[];
    preferred: string[];
    benefits: string[];
    createdAt: any;
    status?: string;
    userId?: string;
    // 지원 양식 커스텀 필드
    applicationFields?: {
        name: boolean;
        email: boolean;
        phone: boolean;
        gender: boolean;
        birthDate: boolean;
        university: boolean;
        major: boolean;
        portfolio: boolean;
        customQuestions: string[];
    };
}

export const JDDetail = ({ jdId, onNavigate }: JDDetailProps) => {
    const [jdData, setJdData] = useState<JDData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [showApplicationModal, setShowApplicationModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    
    // 지원서 폼 데이터
    const [applicationForm, setApplicationForm] = useState({
        name: '',
        email: '',
        phone: '',
        gender: '',
        birthDate: '',
        university: '',
        major: '',
        portfolio: '',
        customAnswers: {} as Record<number, string>,
        requirementAnswers: {} as Record<number, { checked: boolean; detail: string }>,
        preferredAnswers: {} as Record<number, { checked: boolean; detail: string }>
    });
    
    // 공고 페이지에서의 체크박스 상태 (보여주기용)
    const [viewRequirementChecks, setViewRequirementChecks] = useState<Record<number, { checked: boolean; detail: string }>>({});
    const [viewPreferredChecks, setViewPreferredChecks] = useState<Record<number, { checked: boolean; detail: string }>>({});
    
    // 프로필 이미지를 한 번만 선택하도록 useState 사용
    const [profileImage] = useState(() => {
        const officeImages = [
            'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=400&h=400&fit=crop',
            'https://images.unsplash.com/photo-1497032205916-ac775f0649ae?w=400&h=400&fit=crop',
            'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&h=400&fit=crop',
            'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=400&fit=crop',
            'https://images.unsplash.com/photo-1487017159836-4e23ece2e4cf?w=400&h=400&fit=crop',
            'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&h=400&fit=crop',
            'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=400&h=400&fit=crop',
            'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&h=400&fit=crop',
            'https://images.unsplash.com/photo-1573164713988-8665fc963095?w=400&h=400&fit=crop',
            'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=400&h=400&fit=crop'
        ];
        return officeImages[Math.floor(Math.random() * officeImages.length)];
    });
    
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
                const data = await jdAPI.getById(jdId);
                setJdData(data as JDData);
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
        if (!jdId) return;
        
        try {
            // 베이스 URL 가져오기 (origin)
            const baseUrl = window.location.origin;
            
            // 공유 링크 생성 - 경로 기반 라우팅 사용 (Vercel 최적화)
            // 각 JD마다 고유한 URL을 가짐: /jd/[jdId]
            const shareUrl = `${baseUrl}/jd/${jdId}`;
            
            await navigator.clipboard.writeText(shareUrl);
            console.log('공유 링크 생성:', shareUrl);
            alert('공고 링크가 클립보드에 복사되었습니다!\n지원자에게 이 링크를 공유하세요.');
        } catch (err) {
            console.error('클립보드 복사 실패:', err);
            // fallback: 링크를 수동으로 보여주기
            const baseUrl = window.location.origin;
            const shareUrl = `${baseUrl}/jd/${jdId}`;
            prompt('아래 링크를 복사하세요:', shareUrl);
        }
    };

    const handleApplicationSubmit = async () => {
        // 필수 필드 검증 (이름, 이메일은 항상 필수)
        if (!applicationForm.name || !applicationForm.email) {
            alert('이름과 이메일은 필수 입력 항목입니다.');
            return;
        }
        
        // 전화번호가 필수로 설정된 경우 검증
        const fields = jdData?.applicationFields;
        if (fields?.phone && !applicationForm.phone) {
            alert('전화번호는 필수 입력 항목입니다.');
            return;
        }

        if (!jdId || !jdData) {
            alert('공고 정보를 불러올 수 없습니다.');
            return;
        }

        setSubmitting(true);

        try {
            // 체크리스트 응답 데이터 변환 (viewRequirementChecks/viewPreferredChecks 사용)
            const requirementResponses = jdData.requirements?.map((item, idx) => {
                const answer = viewRequirementChecks[idx];
                return {
                    question: item,
                    checked: answer?.checked || false,
                    detail: answer?.detail || ''
                };
            }) || [];

            const preferredResponses = jdData.preferred?.map((item, idx) => {
                const answer = viewPreferredChecks[idx];
                return {
                    question: item,
                    checked: answer?.checked || false,
                    detail: answer?.detail || ''
                };
            }) || [];

            // 백엔드 API로 지원서 저장
            const applicationData = {
                jdId: jdId,
                jdTitle: jdData.title,
                applicantName: applicationForm.name,
                applicantEmail: applicationForm.email,
                applicantPhone: applicationForm.phone || '',
                applicantGender: applicationForm.gender || '',
                birthDate: applicationForm.birthDate || '',
                university: applicationForm.university || '',
                major: applicationForm.major || '',
                portfolio: applicationForm.portfolio || '',
                customAnswers: applicationForm.customAnswers || {},
                requirementAnswers: requirementResponses,
                preferredAnswers: preferredResponses
            };

            await applicationAPI.create(applicationData);

            alert('지원이 완료되었습니다! 검토 후 연락드리겠습니다.');
            setShowApplicationModal(false);
            
            // 폼 초기화
            setApplicationForm({
                name: '',
                email: '',
                phone: '',
                gender: '',
                birthDate: '',
                university: '',
                major: '',
                portfolio: '',
                customAnswers: {},
                requirementAnswers: {},
                preferredAnswers: {}
            });

        } catch (error) {
            console.error('지원서 제출 실패:', error);
            alert('지원서 제출에 실패했습니다. 다시 시도해주세요.');
        } finally {
            setSubmitting(false);
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
                    <h3 className="text-lg font-bold text-gray-700 mb-2">존재하지 않는 공고입니다</h3>
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

    return (
        <div className="flex h-full bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden max-w-[1200px] mx-auto" style={{ height: 'calc(100vh - 140px)'}}>
            {/* Left Profile Section */}
            <div className="w-[240px] border-r border-gray-100 flex flex-col bg-[#FAFBFC] pt-16 overflow-y-auto scrollbar-hide">
                {/* Profile Image */}
                <div className="px-6 flex flex-col items-center">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 mb-4 shadow-lg overflow-hidden">
                        <img 
                            src={profileImage}
                            alt="Profile" 
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <h3 className="font-bold text-[17px] text-gray-900 mb-1">
                        {jdData.teamName || jdData.companyName || jdData.company || 'WINNOW'}
                    </h3>
                    <p className="text-[12px] text-gray-500 font-semibold mb-6">
                        {jdData.jobRole || '모집 분야'}
                    </p>
                </div>

                {/* Location & Scale */}
                <div className="px-6 space-y-4 mb-6">
                    {jdData.location && (
                        <div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">LOCATION</div>
                            <div className="flex items-center gap-2 text-[13px]">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span className="text-gray-700">{jdData.location}</span>
                            </div>
                        </div>
                    )}
                    
                    {jdData.scale && (
                        <div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">SCALE</div>
                            <div className="flex items-center gap-2 text-[13px]">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                <span className="text-gray-700">{jdData.scale}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Tech Stack */}
                {jdData.techStacks && jdData.techStacks.length > 0 && (
                    <div className="px-6 mb-6">
                        <div className="flex items-center gap-2 mb-3">
                            <svg className="w-4 h-4 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                            <span className="font-bold text-[13px] text-gray-800">Tech Stack & Skills</span>
                        </div>
                        <div className="space-y-2">
                            {jdData.techStacks.map((tech, idx) => (
                                <div key={idx}>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[12px] font-semibold text-gray-700">{tech.name}</span>
                                        <span className="text-[11px] text-gray-500 font-medium">{tech.level}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                                        <div 
                                            className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                                            style={{ width: `${tech.level}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Right Content Section */}
            <div className="flex-1 flex flex-col">
                <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-white">
                    <h3 className="font-bold text-lg text-gray-800">공고 상세</h3>
                    <div className="flex gap-2">
                        {isOwner && (
                            <button
                                onClick={handleShare}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[12px] font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all"
                            >
                                🔗 링크 공유
                            </button>
                        )}
                        <button 
                            onClick={() => onNavigate('my-jds')}
                            className="px-4 py-2 border border-gray-200 rounded-lg text-[12px] font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                            목록으로
                        </button>
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto scrollbar-hide">
                    <div className="p-8 space-y-8">
                        {/* 공고 제목 */}
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 mb-4">
                                {jdData.title || '제목 없음'}
                            </h1>
                        </div>

                        {/* VISION & MISSION */}
                        {(jdData.vision || jdData.mission) && (
                            <div className="space-y-4">
                                <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-5">
                                    <h4 className="text-[11px] font-bold text-blue-600 uppercase tracking-wider mb-2">VISION & MISSION</h4>
                                    <div className="space-y-3">
                                        {jdData.vision && (
                                            <div>
                                                <h5 className="font-bold text-[13px] text-gray-800 mb-1">우리의 비전</h5>
                                                <p className="text-[13px] text-gray-700 leading-relaxed">{jdData.vision}</p>
                                            </div>
                                        )}
                                        {jdData.mission && (
                                            <div>
                                                <h5 className="font-bold text-[13px] text-gray-800 mb-1">우리의 미션</h5>
                                                <p className="text-[13px] text-gray-700 leading-relaxed">{jdData.mission}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 자격 요건 (CHECKLIST) */}
                        <div className="space-y-3">
                            <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">자격 요건 (CHECKLIST)</h4>
                            <div className="space-y-2">
                                {jdData.requirements && jdData.requirements.length > 0 ? jdData.requirements.map((item, idx) => (
                                    <div key={idx} className="space-y-2">
                                        <label className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors group">
                                            <input 
                                                type="checkbox" 
                                                checked={viewRequirementChecks[idx]?.checked || false}
                                                onChange={(e) => {
                                                    if (!isOwner) {
                                                        setViewRequirementChecks({
                                                            ...viewRequirementChecks,
                                                            [idx]: {
                                                                checked: e.target.checked,
                                                                detail: viewRequirementChecks[idx]?.detail || ''
                                                            }
                                                        });
                                                    }
                                                }}
                                                disabled={!!isOwner}
                                                className="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" 
                                            />
                                            <span className="text-[13px] text-gray-700 leading-relaxed group-hover:text-gray-900">{item}</span>
                                        </label>
                                        {!isOwner && viewRequirementChecks[idx]?.checked && (
                                            <div className="ml-10 mt-2">
                                                <textarea
                                                    value={viewRequirementChecks[idx]?.detail || ''}
                                                    onChange={(e) => setViewRequirementChecks({
                                                        ...viewRequirementChecks,
                                                        [idx]: {
                                                            checked: true,
                                                            detail: e.target.value
                                                        }
                                                    })}
                                                    placeholder="관련 경험이나 역량을 구체적으로 작성해주세요"
                                                    rows={3}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[13px] focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                                />
                                            </div>
                                        )}
                                    </div>
                                )) : (
                                    <p className="text-[13px] text-gray-400 p-3">자격 요건이 설정되지 않았습니다.</p>
                                )}
                            </div>
                        </div>

                        {/* 우대 사항 (PREFERRED) */}
                        <div className="space-y-3">
                            <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">우대 사항 (PREFERRED)</h4>
                            <div className="space-y-2">
                                {jdData.preferred && jdData.preferred.length > 0 ? jdData.preferred.map((item, idx) => (
                                    <div key={idx} className="space-y-2">
                                        <label className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors group">
                                            <input 
                                                type="checkbox" 
                                                checked={viewPreferredChecks[idx]?.checked || false}
                                                onChange={(e) => {
                                                    if (!isOwner) {
                                                        setViewPreferredChecks({
                                                            ...viewPreferredChecks,
                                                            [idx]: {
                                                                checked: e.target.checked,
                                                                detail: viewPreferredChecks[idx]?.detail || ''
                                                            }
                                                        });
                                                    }
                                                }}
                                                disabled={!!isOwner}
                                                className="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" 
                                            />
                                            <span className="text-[13px] text-gray-700 leading-relaxed group-hover:text-gray-900">{item}</span>
                                        </label>
                                        {!isOwner && viewPreferredChecks[idx]?.checked && (
                                            <div className="ml-10 mt-2">
                                                <textarea
                                                    value={viewPreferredChecks[idx]?.detail || ''}
                                                    onChange={(e) => setViewPreferredChecks({
                                                        ...viewPreferredChecks,
                                                        [idx]: {
                                                            checked: true,
                                                            detail: e.target.value
                                                        }
                                                    })}
                                                    placeholder="관련 경험이나 역량을 구체적으로 작성해주세요"
                                                    rows={3}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[13px] focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                                />
                                            </div>
                                        )}
                                    </div>
                                )) : (
                                    <p className="text-[13px] text-gray-400 p-3">우대 사항이 설정되지 않았습니다.</p>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="pt-6 border-t border-gray-100 flex justify-end items-center">
                            {!isOwner && (
                                <button 
                                    onClick={() => {
                                        // 보기 페이지의 데이터를 모달로 전달
                                        setApplicationForm({
                                            ...applicationForm,
                                            requirementAnswers: viewRequirementChecks,
                                            preferredAnswers: viewPreferredChecks
                                        });
                                        setShowApplicationModal(true);
                                    }}
                                    className="px-6 py-3 bg-blue-600 text-white rounded-lg text-[14px] font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                    지원하기
                                </button>
                            )}
                        </div>

                        {/* Branding */}
                        <div className="text-right pt-4">
                            <p className="text-[11px] font-bold text-gray-400">WINNOW Recruiting Team</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* 지원서 작성 모달 */}
            {showApplicationModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-hide">
                        {/* 모달 헤더 - 드래그 가능하지만 아이콘 없음 */}
                        <div 
                            className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center cursor-move"
                            draggable={true}
                            onDragStart={(e) => {
                                e.dataTransfer.effectAllowed = 'move';
                            }}
                        >
                            <h3 className="text-xl font-bold text-gray-900 select-none">지원서 작성</h3>
                            <button 
                                onClick={() => setShowApplicationModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>

                        {/* 모달 본문 */}
                        <div className="p-6 space-y-6">
                            {/* 기본 정보 - 항상 표시되는 필수 필드 */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                                    필수 정보
                                </h4>
                                
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">이름 *</label>
                                    <input
                                        type="text"
                                        value={applicationForm.name}
                                        onChange={(e) => setApplicationForm({ ...applicationForm, name: e.target.value })}
                                        placeholder="홍길동"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">이메일 *</label>
                                    <input
                                        type="email"
                                        value={applicationForm.email}
                                        onChange={(e) => setApplicationForm({ ...applicationForm, email: e.target.value })}
                                        placeholder="example@email.com"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        required
                                    />
                                </div>
                            </div>

                            {/* 선택 정보 - applicationFields 설정에 따라 표시 */}
                            {(jdData?.applicationFields?.phone || 
                              jdData?.applicationFields?.gender || 
                              jdData?.applicationFields?.birthDate ||
                              jdData?.applicationFields?.university ||
                              jdData?.applicationFields?.major ||
                              jdData?.applicationFields?.portfolio ||
                              // 기존 공고 호환성: applicationFields가 없으면 기본값 표시
                              !jdData?.applicationFields) && (
                                <div className="space-y-4">
                                    <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                        추가 정보
                                    </h4>
                                    
                                    {/* 전화번호 - 기본 표시 또는 설정된 경우 */}
                                    {(jdData?.applicationFields?.phone || !jdData?.applicationFields) && (
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                연락처 {jdData?.applicationFields?.phone && '*'}
                                            </label>
                                            <input
                                                type="tel"
                                                value={applicationForm.phone}
                                                onChange={(e) => setApplicationForm({ ...applicationForm, phone: e.target.value })}
                                                placeholder="010-0000-0000"
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>
                                    )}

                                    {/* 성별 */}
                                    {(jdData?.applicationFields?.gender || !jdData?.applicationFields) && (
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">성별</label>
                                            <select
                                                value={applicationForm.gender}
                                                onChange={(e) => setApplicationForm({ ...applicationForm, gender: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            >
                                                <option value="">선택 안 함</option>
                                                <option value="남성">남성</option>
                                                <option value="여성">여성</option>
                                                <option value="기타">기타</option>
                                            </select>
                                        </div>
                                    )}
                                    
                                    {/* 생년월일 */}
                                    {jdData?.applicationFields?.birthDate && (
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">생년월일</label>
                                            <input
                                                type="date"
                                                value={applicationForm.birthDate}
                                                onChange={(e) => setApplicationForm({ ...applicationForm, birthDate: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>
                                    )}
                                    
                                    {/* 학교 */}
                                    {jdData?.applicationFields?.university && (
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">학교</label>
                                            <input
                                                type="text"
                                                value={applicationForm.university}
                                                onChange={(e) => setApplicationForm({ ...applicationForm, university: e.target.value })}
                                                placeholder="OO대학교"
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>
                                    )}
                                    
                                    {/* 전공 */}
                                    {jdData?.applicationFields?.major && (
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">전공</label>
                                            <input
                                                type="text"
                                                value={applicationForm.major}
                                                onChange={(e) => setApplicationForm({ ...applicationForm, major: e.target.value })}
                                                placeholder="컴퓨터공학과"
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>
                                    )}
                                    
                                    {/* 포트폴리오 */}
                                    {jdData?.applicationFields?.portfolio && (
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">포트폴리오 링크</label>
                                            <input
                                                type="url"
                                                value={applicationForm.portfolio}
                                                onChange={(e) => setApplicationForm({ ...applicationForm, portfolio: e.target.value })}
                                                placeholder="https://..."
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            {/* 커스텀 질문 */}
                            {jdData?.applicationFields?.customQuestions && jdData.applicationFields.customQuestions.length > 0 && (
                                <div className="space-y-4">
                                    <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                                        <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                                        추가 질문
                                    </h4>
                                    
                                    {jdData.applicationFields.customQuestions.map((question, idx) => (
                                        <div key={idx}>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                Q{idx + 1}. {question}
                                            </label>
                                            <textarea
                                                value={applicationForm.customAnswers[idx] || ''}
                                                onChange={(e) => setApplicationForm({
                                                    ...applicationForm,
                                                    customAnswers: {
                                                        ...applicationForm.customAnswers,
                                                        [idx]: e.target.value
                                                    }
                                                })}
                                                placeholder="답변을 입력해주세요"
                                                rows={3}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 모달 푸터 */}
                        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
                            <button
                                onClick={() => setShowApplicationModal(false)}
                                className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                                disabled={submitting}
                            >
                                취소
                            </button>
                            <button
                                onClick={handleApplicationSubmit}
                                disabled={submitting}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submitting ? '제출 중...' : '지원하기'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
