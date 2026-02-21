import { useState, useEffect } from 'react';
import { auth } from '@/config/firebase';
import { jdAPI, applicationAPI } from '@/services/api';
import { useDemoMode, DEMO_AI_JD_RESPONSE } from '@/components/onboarding';

interface JDDetailProps {
    jdId?: string;
    onNavigate: (page: string) => void;
}

interface JDData {
    title: string;
    type?: 'company' | 'club';
    company?: string;
    companyName?: string;
    teamName?: string;
    jobRole?: string;
    location?: string;
    scale?: string;
    description?: string;
    vision?: string;
    mission?: string;
    techStacks?: { name: string; level: number }[];
    responsibilities: string[];
    requirements: string[];
    preferred: string[];
    requirementTypes?: Record<number, 'checkbox' | 'text'>;
    preferredTypes?: Record<number, 'checkbox' | 'text'>;
    requirementsFormat?: 'checkbox' | 'text';
    preferredFormat?: 'checkbox' | 'text';
    benefits: string[];
    createdAt: any;
    status?: string;
    userId?: string;
    bannerImage?: string;
    profileImage?: string;
    // 동아리 모집 일정 필드
    recruitmentPeriod?: string;
    recruitmentTarget?: string;
    recruitmentCount?: string;
    recruitmentProcess?: string[];
    activitySchedule?: string;
    membershipFee?: string;
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
        skillOptions?: { category: string; skills: string[] }[];
    };
}

export const JDDetail = ({ jdId, onNavigate }: JDDetailProps) => {
    const [jdData, setJdData] = useState<JDData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [showApplicationModal, setShowApplicationModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedData, setEditedData] = useState<JDData | null>(null);
    
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
        portfolioFile: null as File | null,
        portfolioFileName: '',
        customAnswers: {} as Record<number, string>,
        requirementAnswers: {} as Record<number, { checked: boolean; detail: string }>,
        preferredAnswers: {} as Record<number, { checked: boolean; detail: string }>,
        selectedSkills: {} as Record<string, string[]>
    });
    
    // 공고 페이지에서의 체크박스 상태 (보여주기용)
    const [viewRequirementChecks, setViewRequirementChecks] = useState<Record<number, { checked: boolean; detail: string }>>({});
    const [viewPreferredChecks, setViewPreferredChecks] = useState<Record<number, { checked: boolean; detail: string }>>({});
    
    // 프로필 이미지 편집 모달 상태
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [profileFile, setProfileFile] = useState<File | null>(null);
    const [profilePreview, setProfilePreview] = useState<string | null>(null);
    const [isUploadingProfile, setIsUploadingProfile] = useState(false);
    
    // 프로필 이미지 (저장된 이미지 또는 랜덤 이미지)
    const [profileImage] = useState(() => {
        if (jdData?.profileImage) return jdData.profileImage;
        
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
    
    const displayProfileImage = jdData?.profileImage || profileImage;
    
    const { isDemoMode, onDemoAction } = useDemoMode();
    const currentUserId = auth.currentUser?.uid;
    const isOwner = isDemoMode || (currentUserId && jdData?.userId === currentUserId);

    // 수정 관련 함수
    const handleEdit = () => {
        setEditedData({ ...jdData } as JDData);
        setIsEditing(true);
    };

    const handleCancel = () => {
        setEditedData(null);
        setIsEditing(false);
    };

    const handleSave = async () => {
        if (!editedData || !jdId) return;

        // 데모 모드: API 호웈 없이 즉시 저장 처리
        if (isDemoMode) {
            setJdData(editedData);
            setIsEditing(false);
            setEditedData(null);
            onDemoAction?.('jd-save-complete');
            return;
        }
        
        try {
            setSubmitting(true);
            await jdAPI.update(jdId, editedData);
            setJdData(editedData);
            setIsEditing(false);
            setEditedData(null);
            alert('공고가 성공적으로 수정되었습니다.');
        } catch (error) {
            console.error('공고 수정 실패:', error);
            alert('공고 수정에 실패했습니다.');
        } finally {
            setSubmitting(false);
        }
    };

    const updateEditedField = (field: keyof JDData, value: any) => {
        if (!editedData) return;
        setEditedData({ ...editedData, [field]: value });
    };

    // 프로필 이미지 업로드 핸들러
    const handleProfileFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert('파일 크기는 5MB 이하여야 합니다.');
                return;
            }
            
            if (!file.type.startsWith('image/')) {
                alert('이미지 파일만 업로드 가능합니다.');
                return;
            }
            
            setProfileFile(file);
            
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfilePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveProfile = async () => {
        if (!profileFile || !jdId) {
            alert('업로드할 이미지를 선택해주세요.');
            return;
        }

        setIsUploadingProfile(true);
        try {
            // 프로필 이미지 압축 후 base64 변환
            const base64 = await jdAPI.compressImage(profileFile, 400, 0.7);
            
            // JD 업데이트 (base64 직접 저장)
            await jdAPI.update(jdId, { profileImage: base64 });
            
            // 로컬 상태 업데이트
            setJdData(prev => prev ? { ...prev, profileImage: base64 } : prev);
            
            alert('프로필 이미지가 변경되었습니다!');
            setShowProfileModal(false);
            setProfileFile(null);
            setProfilePreview(null);
        } catch (error) {
            console.error('프로필 업로드 실패:', error);
            alert('프로필 업로드 중 오류가 발생했습니다.');
        } finally {
            setIsUploadingProfile(false);
        }
    };

    useEffect(() => {
        const fetchJD = async () => {
            if (!jdId) {
                setError(true);
                setLoading(false);
                return;
            }

            // 데모 모드: mock 데이터 사용
            if (isDemoMode) {
                setJdData(DEMO_AI_JD_RESPONSE as any);
                setLoading(false);
                return;
            }

            try {
                const data = await jdAPI.getById(jdId);
                setJdData(data as JDData);
            } catch (err) {
                console.error('공고 불러오기 실패:', err);
                setError(true);
            } finally {
                setLoading(false);
            }
        };

        fetchJD();
    }, [jdId, isDemoMode]);

    const handleShare = async () => {
        if (!jdId) return;

        // 데모 모드: 실제 클립보드 대신 토스트만 표시
        if (isDemoMode) {
            onDemoAction('link-copied');
            alert('공고 링크가 클립보드에 복사되었습니다!\n지원자에게 이 링크를 공유하세요.');
            return;
        }
        
        try {
            // 베이스 URL 가져오기 (origin)
            const baseUrl = window.location.origin;
            
            // 공유 링크 생성 - 경로 기반 라우팅 사용 (Vercel 최적화)
            // 각 공고마다 고유한 URL을 가짐: /jd/[jdId]
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

            // PDF 파일 업로드 처리
            let portfolioFileUrl = '';
            let portfolioFileName = '';
            if (applicationForm.portfolioFile) {
                const uploadResult = await applicationAPI.uploadPortfolio(applicationForm.portfolioFile);
                portfolioFileUrl = uploadResult.fileUrl;
                portfolioFileName = uploadResult.fileName;
            }

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
                portfolioFileUrl: portfolioFileUrl,
                portfolioFileName: portfolioFileName,
                customAnswers: applicationForm.customAnswers || {},
                requirementAnswers: requirementResponses,
                preferredAnswers: preferredResponses,
                selectedSkills: applicationForm.selectedSkills || {}
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
                portfolioFile: null,
                portfolioFileName: '',
                customAnswers: {},
                requirementAnswers: {},
                preferredAnswers: {},
                selectedSkills: {}
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
        <div className="flex flex-col h-full bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden max-w-[1200px] mx-auto" style={{ height: 'calc(100vh - 140px)'}}>
            
            <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                {/* Left Profile Section */}
                <div className="hidden md:flex w-[240px] border-r border-gray-100 flex-col bg-[#FAFBFC] pt-16 overflow-y-auto scrollbar-hide">
                {/* Profile Image */}
                <div className="px-6 flex flex-col items-center">
                    <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 mb-4 shadow-lg overflow-hidden group">
                        <img 
                            src={displayProfileImage}
                            alt="Profile" 
                            className="w-full h-full object-cover"
                        />
                        {isOwner && (
                            <button
                                onClick={() => {
                                    setProfilePreview(displayProfileImage);
                                    setShowProfileModal(true);
                                }}
                                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                title="프로필 이미지 변경"
                            >
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </button>
                        )}
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
                <div className="px-4 sm:px-8 py-4 sm:py-6 border-b border-gray-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-white">
                    <h3 className="font-bold text-lg text-gray-800">{isEditing ? '공고 수정' : '공고 상세'}</h3>
                    <div className="flex gap-2">
                        {isOwner && !isEditing && (
                            <>
                                <button
                                    data-tour="jd-edit-btn"
                                    onClick={handleEdit}
                                    className="px-4 py-2 bg-white border border-blue-600 text-blue-600 rounded-lg text-[12px] font-bold hover:bg-blue-50 transition-all"
                                >
                                    수정
                                </button>
                                <button
                                    data-tour="jd-share-link"
                                    onClick={handleShare}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[12px] font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all"
                                >
                                    🔗 링크 공유
                                </button>
                            </>
                        )}
                        {isEditing && (
                            <>
                                <button
                                    data-tour="jd-save-btn"
                                    onClick={handleSave}
                                    disabled={submitting}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[12px] font-bold hover:bg-blue-700 disabled:bg-gray-400 transition-all"
                                >
                                    {submitting ? '저장 중...' : '저장'}
                                </button>
                                <button
                                    onClick={handleCancel}
                                    disabled={submitting}
                                    className="px-4 py-2 bg-gray-500 text-white rounded-lg text-[12px] font-bold hover:bg-gray-600 disabled:bg-gray-300 transition-all"
                                >
                                    취소
                                </button>
                            </>
                        )}
                        {!isEditing && (
                            <button 
                                onClick={() => onNavigate('my-jds')}
                                className="px-4 py-2 border border-gray-200 rounded-lg text-[12px] font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                                목록으로
                            </button>
                        )}
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto scrollbar-hide">
                    <div className="p-8 space-y-8">
                        {/* 공고 제목 */}
                        <div>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={editedData?.title || ''}
                                    onChange={(e) => updateEditedField('title', e.target.value)}
                                    className="text-2xl font-bold text-gray-900 mb-4 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="공고 제목을 입력하세요"
                                />
                            ) : (
                                <h1 className="text-2xl font-bold text-gray-900 mb-4">
                                    {jdData.title || '제목 없음'}
                                </h1>
                            )}
                        </div>

                        {/* 소개 (ABOUT US) */}
                        {(jdData.description || isEditing) && (
                            <div className="space-y-3">
                                <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100 rounded-lg p-5">
                                    <h4 className="text-[11px] font-bold text-blue-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M10 2a8 8 0 100 16 8 8 0 000-16zM9 9a1 1 0 112 0v4a1 1 0 11-2 0V9zm1-5a1 1 0 100 2 1 1 0 000-2z"/>
                                        </svg>
                                        {(jdData.type || 'club') === 'company' ? '회사 소개' : '동아리 소개'}
                                    </h4>
                                    {isEditing ? (
                                        <textarea
                                            value={editedData?.description || ''}
                                            onChange={(e) => updateEditedField('description', e.target.value)}
                                            rows={4}
                                            className="w-full text-[14px] text-gray-700 leading-relaxed px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                                            placeholder="회사/동아리 소개를 입력하세요"
                                        />
                                    ) : (
                                        <p className="text-[14px] text-gray-700 leading-relaxed">{jdData.description}</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* 모집 일정 및 정보 (동아리 모드) */}
                        {(jdData.type || 'club') === 'club' && (
                            jdData.recruitmentPeriod || jdData.recruitmentTarget || jdData.recruitmentCount ||
                            (jdData.recruitmentProcess && jdData.recruitmentProcess.length > 0) ||
                            jdData.activitySchedule || jdData.membershipFee
                        ) && (
                            <div className="space-y-3">
                                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100 rounded-lg p-5">
                                    <h4 className="text-[11px] font-bold text-green-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                        </svg>
                                        모집 일정 및 정보
                                    </h4>
                                    <div className="space-y-3">
                                        {jdData.recruitmentPeriod && (
                                            <div className="flex items-start gap-3">
                                                <span className="text-[11px] font-bold text-gray-500 w-20 flex-shrink-0 pt-0.5">모집 기간</span>
                                                <span className="text-[13px] text-gray-700">{jdData.recruitmentPeriod}</span>
                                            </div>
                                        )}
                                        {jdData.recruitmentTarget && (
                                            <div className="flex items-start gap-3">
                                                <span className="text-[11px] font-bold text-gray-500 w-20 flex-shrink-0 pt-0.5">모집 대상</span>
                                                <span className="text-[13px] text-gray-700">{jdData.recruitmentTarget}</span>
                                            </div>
                                        )}
                                        {jdData.recruitmentCount && (
                                            <div className="flex items-start gap-3">
                                                <span className="text-[11px] font-bold text-gray-500 w-20 flex-shrink-0 pt-0.5">모집 인원</span>
                                                <span className="text-[13px] text-gray-700">{jdData.recruitmentCount}</span>
                                            </div>
                                        )}
                                        {jdData.recruitmentProcess && jdData.recruitmentProcess.length > 0 && (
                                            <div className="flex items-start gap-3">
                                                <span className="text-[11px] font-bold text-gray-500 w-20 flex-shrink-0 pt-0.5">모집 절차</span>
                                                <span className="text-[13px] text-gray-700">
                                                    {jdData.recruitmentProcess.map((step, i) => (
                                                        <span key={i}>
                                                            {i > 0 && <span className="text-green-400 mx-1">→</span>}
                                                            {step}
                                                        </span>
                                                    ))}
                                                </span>
                                            </div>
                                        )}
                                        {jdData.activitySchedule && (
                                            <div className="flex items-start gap-3">
                                                <span className="text-[11px] font-bold text-gray-500 w-20 flex-shrink-0 pt-0.5">활동 일정</span>
                                                <span className="text-[13px] text-gray-700">{jdData.activitySchedule}</span>
                                            </div>
                                        )}
                                        {jdData.membershipFee && (
                                            <div className="flex items-start gap-3">
                                                <span className="text-[11px] font-bold text-gray-500 w-20 flex-shrink-0 pt-0.5">회비</span>
                                                <span className="text-[13px] text-gray-700">{jdData.membershipFee}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* VISION & MISSION */}
                        {(jdData.vision || jdData.mission || isEditing) && (
                            <div className="space-y-4">
                                <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-5">
                                    <h4 className="text-[11px] font-bold text-blue-600 uppercase tracking-wider mb-2">VISION & MISSION</h4>
                                    <div className="space-y-3">
                                        <div>
                                            <h5 className="font-bold text-[13px] text-gray-800 mb-1">우리의 비전</h5>
                                            {isEditing ? (
                                                <textarea
                                                    value={editedData?.vision || ''}
                                                    onChange={(e) => updateEditedField('vision', e.target.value)}
                                                    rows={3}
                                                    className="w-full text-[13px] text-gray-700 leading-relaxed px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                                                    placeholder="비전을 입력하세요"
                                                />
                                            ) : (
                                                jdData.vision && <p className="text-[13px] text-gray-700 leading-relaxed">{jdData.vision}</p>
                                            )}
                                        </div>
                                        <div>
                                            <h5 className="font-bold text-[13px] text-gray-800 mb-1">우리의 미션</h5>
                                            {isEditing ? (
                                                <textarea
                                                    value={editedData?.mission || ''}
                                                    onChange={(e) => updateEditedField('mission', e.target.value)}
                                                    rows={3}
                                                    className="w-full text-[13px] text-gray-700 leading-relaxed px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                                                    placeholder="미션을 입력하세요"
                                                />
                                            ) : (
                                                jdData.mission && <p className="text-[13px] text-gray-700 leading-relaxed">{jdData.mission}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 자격 요건 / 지원자 체크리스트 */}
                        <div className="space-y-3">
                            <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{(jdData.type || 'club') === 'company' ? '자격 요건 (CHECKLIST)' : '지원자 체크리스트 (필수)'}</h4>
                            {isEditing ? (
                                <div className="space-y-2">
                                    {((editedData?.requirements && editedData.requirements.length > 0) ? editedData.requirements : ['']).map((item, idx) => {
                                        const itemType = editedData?.requirementTypes?.[idx] || 'text';
                                        return (
                                            <div key={idx} className="space-y-1">
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={item}
                                                        onChange={(e) => {
                                                            const current = (editedData?.requirements && editedData.requirements.length > 0) ? editedData.requirements : [''];
                                                            const newRequirements = [...current];
                                                            newRequirements[idx] = e.target.value;
                                                            updateEditedField('requirements', newRequirements);
                                                        }}
                                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-[13px] focus:ring-2 focus:ring-blue-500"
                                                        placeholder="자격 요건 입력"
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            const current = (editedData?.requirements && editedData.requirements.length > 0) ? editedData.requirements : [''];
                                                            const newRequirements = current.filter((_, i) => i !== idx);
                                                            // 타입 맵도 인덱스 재매핑
                                                            const currentTypes = { ...(editedData?.requirementTypes || {}) };
                                                            const newTypes: Record<number, 'checkbox' | 'text'> = {};
                                                            Object.keys(currentTypes).forEach(k => {
                                                                const ki = parseInt(k);
                                                                if (ki < idx) newTypes[ki] = currentTypes[ki];
                                                                else if (ki > idx) newTypes[ki - 1] = currentTypes[ki];
                                                            });
                                                            updateEditedField('requirements', newRequirements.length ? newRequirements : ['']);
                                                            updateEditedField('requirementTypes', newTypes);
                                                        }}
                                                        className="px-3 py-2 bg-red-500 text-white rounded-lg text-[12px] hover:bg-red-600"
                                                    >
                                                        삭제
                                                    </button>
                                                </div>
                                                {/* 답변 형식 토글 */}
                                                <div className="flex items-center gap-2 ml-1">
                                                    <span className="text-[11px] text-gray-400">답변 형식:</span>
                                                    <button
                                                        onClick={() => {
                                                            const types = { ...(editedData?.requirementTypes || {}) };
                                                            types[idx] = 'checkbox';
                                                            updateEditedField('requirementTypes', types);
                                                        }}
                                                        className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                                                            itemType === 'checkbox' 
                                                                ? 'bg-green-100 text-green-700 border border-green-300' 
                                                                : 'bg-gray-50 text-gray-400 border border-gray-200 hover:bg-gray-100'
                                                        }`}
                                                    >
                                                        ✓ 체크만
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            const types = { ...(editedData?.requirementTypes || {}) };
                                                            types[idx] = 'text';
                                                            updateEditedField('requirementTypes', types);
                                                        }}
                                                        className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                                                            itemType === 'text' 
                                                                ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                                                                : 'bg-gray-50 text-gray-400 border border-gray-200 hover:bg-gray-100'
                                                        }`}
                                                    >
                                                        ✎ 서술형
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <button
                                        onClick={() => {
                                            const current = (editedData?.requirements && editedData.requirements.length > 0) ? editedData.requirements : [''];
                                            const newRequirements = [...current, ''];
                                            updateEditedField('requirements', newRequirements);
                                        }}
                                        className="px-4 py-2 bg-blue-500 text-white rounded-lg text-[12px] hover:bg-blue-600"
                                    >
                                        + 항목 추가
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {jdData.requirements && jdData.requirements.length > 0 ? jdData.requirements.map((item, idx) => {
                                        const itemType = jdData.requirementTypes?.[idx] || 'checkbox';
                                        return (
                                        <div key={idx} className="space-y-2">
                                            <label className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors group">
                                                <input 
                                                    type="checkbox" 
                                                    checked={viewRequirementChecks[idx]?.checked || false}
                                                    onChange={(e) => {
                                                        setViewRequirementChecks({
                                                            ...viewRequirementChecks,
                                                            [idx]: {
                                                                checked: e.target.checked,
                                                                detail: viewRequirementChecks[idx]?.detail || ''
                                                            }
                                                        });
                                                    }}
                                                    className="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer" 
                                                />
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[13px] text-gray-700 leading-relaxed group-hover:text-gray-900">{item}</span>
                                                    {itemType === 'text' && (
                                                        <span className="text-[10px] text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded font-medium">서술</span>
                                                    )}
                                                </div>
                                            </label>
                                            {viewRequirementChecks[idx]?.checked && itemType === 'text' && (
                                                <div className="ml-10">
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
                                        );
                                    }) : (
                                        <p className="text-[13px] text-gray-400 p-3">{(jdData.type || 'club') === 'company' ? '자격 요건이 설정되지 않았습니다.' : '체크리스트가 설정되지 않았습니다.'}</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* 우대 사항 / 우대 체크리스트 */}
                        <div className="space-y-3">
                            <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{(jdData.type || 'club') === 'company' ? '우대 사항 (PREFERRED)' : '지원자 체크리스트 (우대)'}</h4>
                            {isEditing ? (
                                <div className="space-y-2">
                                    {((editedData?.preferred && editedData.preferred.length > 0) ? editedData.preferred : ['']).map((item, idx) => {
                                        const itemType = editedData?.preferredTypes?.[idx] || 'text';
                                        return (
                                            <div key={idx} className="space-y-1">
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={item}
                                                        onChange={(e) => {
                                                            const current = (editedData?.preferred && editedData.preferred.length > 0) ? editedData.preferred : [''];
                                                            const newPreferred = [...current];
                                                            newPreferred[idx] = e.target.value;
                                                            updateEditedField('preferred', newPreferred);
                                                        }}
                                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-[13px] focus:ring-2 focus:ring-blue-500"
                                                        placeholder="우대 사항 입력"
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            const current = (editedData?.preferred && editedData.preferred.length > 0) ? editedData.preferred : [''];
                                                            const newPreferred = current.filter((_, i) => i !== idx);
                                                            // 타입 맵도 인덱스 재매핑
                                                            const currentTypes = { ...(editedData?.preferredTypes || {}) };
                                                            const newTypes: Record<number, 'checkbox' | 'text'> = {};
                                                            Object.keys(currentTypes).forEach(k => {
                                                                const ki = parseInt(k);
                                                                if (ki < idx) newTypes[ki] = currentTypes[ki];
                                                                else if (ki > idx) newTypes[ki - 1] = currentTypes[ki];
                                                            });
                                                            updateEditedField('preferred', newPreferred.length ? newPreferred : ['']);
                                                            updateEditedField('preferredTypes', newTypes);
                                                        }}
                                                        className="px-3 py-2 bg-red-500 text-white rounded-lg text-[12px] hover:bg-red-600"
                                                    >
                                                        삭제
                                                    </button>
                                                </div>
                                                {/* 답변 형식 토글 */}
                                                <div className="flex items-center gap-2 ml-1">
                                                    <span className="text-[11px] text-gray-400">답변 형식:</span>
                                                    <button
                                                        onClick={() => {
                                                            const types = { ...(editedData?.preferredTypes || {}) };
                                                            types[idx] = 'checkbox';
                                                            updateEditedField('preferredTypes', types);
                                                        }}
                                                        className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                                                            itemType === 'checkbox' 
                                                                ? 'bg-green-100 text-green-700 border border-green-300' 
                                                                : 'bg-gray-50 text-gray-400 border border-gray-200 hover:bg-gray-100'
                                                        }`}
                                                    >
                                                        ✓ 체크만
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            const types = { ...(editedData?.preferredTypes || {}) };
                                                            types[idx] = 'text';
                                                            updateEditedField('preferredTypes', types);
                                                        }}
                                                        className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                                                            itemType === 'text' 
                                                                ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                                                                : 'bg-gray-50 text-gray-400 border border-gray-200 hover:bg-gray-100'
                                                        }`}
                                                    >
                                                        ✎ 서술형
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <button
                                        onClick={() => {
                                            const current = (editedData?.preferred && editedData.preferred.length > 0) ? editedData.preferred : [''];
                                            const newPreferred = [...current, ''];
                                            updateEditedField('preferred', newPreferred);
                                        }}
                                        className="px-4 py-2 bg-blue-500 text-white rounded-lg text-[12px] hover:bg-blue-600"
                                    >
                                        + 항목 추가
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {jdData.preferred && jdData.preferred.length > 0 ? jdData.preferred.map((item, idx) => {
                                        const itemType = jdData.preferredTypes?.[idx] || 'checkbox';
                                        return (
                                        <div key={idx} className="space-y-2">
                                            <label className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors group">
                                                <input 
                                                    type="checkbox" 
                                                    checked={viewPreferredChecks[idx]?.checked || false}
                                                    onChange={(e) => {
                                                        setViewPreferredChecks({
                                                            ...viewPreferredChecks,
                                                            [idx]: {
                                                                checked: e.target.checked,
                                                                detail: viewPreferredChecks[idx]?.detail || ''
                                                            }
                                                        });
                                                    }}
                                                    className="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer" 
                                                />
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[13px] text-gray-700 leading-relaxed group-hover:text-gray-900">{item}</span>
                                                    {itemType === 'text' && (
                                                        <span className="text-[10px] text-purple-500 bg-purple-50 px-1.5 py-0.5 rounded font-medium">서술</span>
                                                    )}
                                                </div>
                                            </label>
                                            {viewPreferredChecks[idx]?.checked && itemType === 'text' && (
                                                <div className="ml-10">
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
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[13px] focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                        );
                                    }) : (
                                        <p className="text-[13px] text-gray-400 p-3">{(jdData.type || 'club') === 'company' ? '우대 사항이 설정되지 않았습니다.' : '우대 체크리스트가 설정되지 않았습니다.'}</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* 혜택 / 복리후생 */}
                        {((jdData.benefits && jdData.benefits.length > 0) || isEditing) && (
                            <div className="space-y-3">
                                <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{(jdData.type || 'club') === 'company' ? '복리후생 (BENEFITS)' : '활동 혜택 (BENEFITS)'}</h4>
                                {isEditing ? (
                                    <div className="space-y-2">
                                        {((editedData?.benefits && editedData.benefits.length > 0) ? editedData.benefits : ['']).map((item, idx) => (
                                            <div key={idx} className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={item}
                                                    onChange={(e) => {
                                                        const current = (editedData?.benefits && editedData.benefits.length > 0) ? editedData.benefits : [''];
                                                        const newBenefits = [...current];
                                                        newBenefits[idx] = e.target.value;
                                                        updateEditedField('benefits', newBenefits);
                                                    }}
                                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-[13px] focus:ring-2 focus:ring-blue-500"
                                                    placeholder="혜택/복리후생 입력"
                                                />
                                                <button
                                                    onClick={() => {
                                                        const current = (editedData?.benefits && editedData.benefits.length > 0) ? editedData.benefits : [''];
                                                        const newBenefits = current.filter((_, i) => i !== idx);
                                                        updateEditedField('benefits', newBenefits.length ? newBenefits : ['']);
                                                    }}
                                                    className="px-3 py-2 bg-red-500 text-white rounded-lg text-[12px] hover:bg-red-600"
                                                >
                                                    삭제
                                                </button>
                                            </div>
                                        ))}
                                        <button
                                            onClick={() => {
                                                const current = (editedData?.benefits && editedData.benefits.length > 0) ? editedData.benefits : [''];
                                                updateEditedField('benefits', [...current, '']);
                                            }}
                                            className="px-4 py-2 bg-blue-500 text-white rounded-lg text-[12px] hover:bg-blue-600"
                                        >
                                            + 항목 추가
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        {jdData.benefits.map((item, idx) => (
                                            <div key={idx} className="flex items-start gap-3 px-3 py-2">
                                                <span className="text-orange-400 mt-0.5 flex-shrink-0">•</span>
                                                <span className="text-[13px] text-gray-700 leading-relaxed">{item}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 스킬/도구 체크리스트 섹션 */}
                        {((jdData?.applicationFields?.skillOptions && jdData.applicationFields.skillOptions.length > 0) || isEditing) && (
                            <div className="space-y-3">
                                <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                    스킬 / 도구 체크리스트
                                </h4>
                                {isEditing ? (
                                    <div className="bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 rounded-lg p-5 space-y-4">
                                        <p className="text-[12px] text-indigo-500 font-medium">지원자가 선택할 수 있는 스킬 목록을 수정하세요</p>
                                        {(editedData?.applicationFields?.skillOptions || []).map((cat, catIdx) => (
                                            <div key={catIdx} className="bg-white rounded-lg p-4 border border-indigo-100">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <input
                                                        type="text"
                                                        value={cat.category}
                                                        onChange={(e) => {
                                                            const newOptions = [...(editedData?.applicationFields?.skillOptions || [])];
                                                            newOptions[catIdx] = { ...newOptions[catIdx], category: e.target.value };
                                                            updateEditedField('applicationFields', { ...editedData?.applicationFields, skillOptions: newOptions });
                                                        }}
                                                        className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-[13px] font-bold focus:ring-2 focus:ring-indigo-500"
                                                        placeholder="카테고리명"
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            const newOptions = (editedData?.applicationFields?.skillOptions || []).filter((_, i) => i !== catIdx);
                                                            updateEditedField('applicationFields', { ...editedData?.applicationFields, skillOptions: newOptions });
                                                        }}
                                                        className="px-2 py-1.5 bg-red-500 text-white rounded-lg text-[11px] hover:bg-red-600"
                                                    >
                                                        삭제
                                                    </button>
                                                </div>
                                                <div className="flex flex-wrap gap-2 mb-2">
                                                    {cat.skills.map((skill, skillIdx) => (
                                                        <span key={skillIdx} className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg text-[12px] text-indigo-700 font-medium">
                                                            {skill}
                                                            <button
                                                                onClick={() => {
                                                                    const newOptions = [...(editedData?.applicationFields?.skillOptions || [])];
                                                                    newOptions[catIdx] = { ...newOptions[catIdx], skills: newOptions[catIdx].skills.filter((_, i) => i !== skillIdx) };
                                                                    updateEditedField('applicationFields', { ...editedData?.applicationFields, skillOptions: newOptions });
                                                                }}
                                                                className="text-indigo-400 hover:text-red-500 ml-0.5"
                                                            >
                                                                ✕
                                                            </button>
                                                        </span>
                                                    ))}
                                                </div>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        placeholder="스킬명 입력 후 추가"
                                                        className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-[12px] focus:ring-2 focus:ring-indigo-500"
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                                                                const val = (e.target as HTMLInputElement).value.trim();
                                                                const newOptions = [...(editedData?.applicationFields?.skillOptions || [])];
                                                                if (!newOptions[catIdx].skills.includes(val)) {
                                                                    newOptions[catIdx] = { ...newOptions[catIdx], skills: [...newOptions[catIdx].skills, val] };
                                                                    updateEditedField('applicationFields', { ...editedData?.applicationFields, skillOptions: newOptions });
                                                                }
                                                                (e.target as HTMLInputElement).value = '';
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                        <button
                                            onClick={() => {
                                                const newOptions = [...(editedData?.applicationFields?.skillOptions || []), { category: '', skills: [] }];
                                                updateEditedField('applicationFields', { ...editedData?.applicationFields, skillOptions: newOptions });
                                            }}
                                            className="px-4 py-2 bg-indigo-500 text-white rounded-lg text-[12px] font-bold hover:bg-indigo-600"
                                        >
                                            + 카테고리 추가
                                        </button>
                                    </div>
                                ) : (
                                    <div className="bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 rounded-lg p-5 space-y-5">
                                        <p className="text-[12px] text-indigo-500 font-medium">
                                            {isOwner ? '지원자가 선택할 수 있는 스킬 목록입니다' : '보유하고 있는 스킬을 선택해주세요'}
                                        </p>
                                        {jdData!.applicationFields!.skillOptions!.map((cat, catIdx) => (
                                            <div key={catIdx}>
                                                <span className="text-[12px] font-bold text-gray-700 mb-2 block">{cat.category}</span>
                                                <div className="flex flex-wrap gap-2">
                                                    {cat.skills.map((skill, skillIdx) => {
                                                        const isSelected = (applicationForm.selectedSkills[cat.category] || []).includes(skill);
                                                        return (
                                                            <button
                                                                key={skillIdx}
                                                                type="button"
                                                                onClick={() => {
                                                                    if (!isOwner) {
                                                                        setApplicationForm(prev => {
                                                                            const current = prev.selectedSkills[cat.category] || [];
                                                                            const updated = isSelected
                                                                                ? current.filter(s => s !== skill)
                                                                                : [...current, skill];
                                                                            return {
                                                                                ...prev,
                                                                                selectedSkills: {
                                                                                    ...prev.selectedSkills,
                                                                                    [cat.category]: updated
                                                                                }
                                                                            };
                                                                        });
                                                                    }
                                                                }}
                                                                disabled={!!isOwner}
                                                                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all ${
                                                                    isOwner
                                                                        ? 'bg-white text-gray-500 border-gray-200 cursor-default'
                                                                        : isSelected
                                                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                                                            : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600 cursor-pointer'
                                                                }`}
                                                            >
                                                                {!isOwner && isSelected && <span className="mr-1">✓</span>}
                                                                {skill}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

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

                        {/* 지원 양식 설정 (수정 모드) */}
                        {isEditing && (
                            <div className="space-y-3 border-t border-gray-200 pt-6">
                                <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">지원 양식 설정</h4>
                                <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 space-y-4">
                                    <p className="text-[12px] text-gray-500">지원자가 작성할 항목을 선택하세요</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { key: 'phone', label: '연락처' },
                                            { key: 'gender', label: '성별' },
                                            { key: 'birthDate', label: '생년월일' },
                                            { key: 'university', label: '학교' },
                                            { key: 'major', label: '전공' },
                                            { key: 'portfolio', label: '포트폴리오' },
                                        ].map(({ key, label }) => (
                                            <label key={key} className="flex items-center gap-2 p-2 rounded-lg hover:bg-white cursor-pointer transition-colors">
                                                <input
                                                    type="checkbox"
                                                    checked={!!(editedData?.applicationFields as any)?.[key]}
                                                    onChange={(e) => {
                                                        const fields = editedData?.applicationFields || { name: true, email: true, phone: false, gender: false, birthDate: false, university: false, major: false, portfolio: false, customQuestions: [], skillOptions: [] };
                                                        updateEditedField('applicationFields', { ...fields, [key]: e.target.checked });
                                                    }}
                                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                />
                                                <span className="text-[13px] text-gray-700">{label}</span>
                                            </label>
                                        ))}
                                    </div>

                                    {/* 커스텀 질문 수정 */}
                                    <div className="border-t border-gray-200 pt-4 mt-4">
                                        <span className="text-[12px] font-bold text-gray-600 mb-2 block">커스텀 질문</span>
                                        {(editedData?.applicationFields?.customQuestions || []).map((q, idx) => (
                                            <div key={idx} className="flex gap-2 mb-2">
                                                <input
                                                    type="text"
                                                    value={q}
                                                    onChange={(e) => {
                                                        const questions = [...(editedData?.applicationFields?.customQuestions || [])];
                                                        questions[idx] = e.target.value;
                                                        updateEditedField('applicationFields', { ...editedData?.applicationFields, customQuestions: questions });
                                                    }}
                                                    className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-[12px] focus:ring-2 focus:ring-blue-500"
                                                    placeholder="질문 입력"
                                                />
                                                <button
                                                    onClick={() => {
                                                        const questions = (editedData?.applicationFields?.customQuestions || []).filter((_, i) => i !== idx);
                                                        updateEditedField('applicationFields', { ...editedData?.applicationFields, customQuestions: questions });
                                                    }}
                                                    className="px-2 py-1.5 bg-red-500 text-white rounded-lg text-[11px] hover:bg-red-600"
                                                >
                                                    삭제
                                                </button>
                                            </div>
                                        ))}
                                        <button
                                            onClick={() => {
                                                const questions = [...(editedData?.applicationFields?.customQuestions || []), ''];
                                                updateEditedField('applicationFields', { ...editedData?.applicationFields, customQuestions: questions });
                                            }}
                                            className="px-3 py-1.5 bg-purple-500 text-white rounded-lg text-[11px] font-bold hover:bg-purple-600"
                                        >
                                            + 질문 추가
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 지원서 작성 모달 */}
            {showApplicationModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowApplicationModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                        {/* 모달 헤더 */}
                        <div className="px-7 pt-7 pb-5">
                            <div className="flex items-center justify-between mb-1">
                                <h3 className="text-lg font-bold text-gray-900">지원서 작성</h3>
                                <button 
                                    onClick={() => setShowApplicationModal(false)}
                                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600 text-lg"
                                >
                                    ✕
                                </button>
                            </div>
                            <p className="text-[13px] text-gray-400">아래 정보를 입력하고 지원해주세요</p>
                        </div>

                        {/* 모달 본문 */}
                        <div className="flex-1 overflow-y-auto px-7 pb-4 space-y-6 scrollbar-hide">
                            {/* 기본 정보 */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                    <span className="text-[13px] font-bold text-gray-800">필수 정보</span>
                                </div>
                                
                                <div>
                                    <label className="block text-[13px] font-semibold text-gray-600 mb-1.5">이름 <span className="text-red-400">*</span></label>
                                    <input
                                        type="text"
                                        value={applicationForm.name}
                                        onChange={(e) => setApplicationForm({ ...applicationForm, name: e.target.value })}
                                        placeholder="홍길동"
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[14px] focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all placeholder:text-gray-300"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-[13px] font-semibold text-gray-600 mb-1.5">이메일 <span className="text-red-400">*</span></label>
                                    <input
                                        type="email"
                                        value={applicationForm.email}
                                        onChange={(e) => setApplicationForm({ ...applicationForm, email: e.target.value })}
                                        placeholder="example@email.com"
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[14px] focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all placeholder:text-gray-300"
                                        required
                                    />
                                </div>
                            </div>

                            {/* 선택 정보 */}
                            {(jdData?.applicationFields?.phone || 
                              jdData?.applicationFields?.gender || 
                              jdData?.applicationFields?.birthDate ||
                              jdData?.applicationFields?.university ||
                              jdData?.applicationFields?.major ||
                              jdData?.applicationFields?.portfolio ||
                              !jdData?.applicationFields) && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                        <span className="text-[13px] font-bold text-gray-800">추가 정보</span>
                                    </div>
                                    
                                    {(jdData?.applicationFields?.phone || !jdData?.applicationFields) && (
                                        <div>
                                            <label className="block text-[13px] font-semibold text-gray-600 mb-1.5">
                                                연락처 {jdData?.applicationFields?.phone && <span className="text-red-400">*</span>}
                                            </label>
                                            <input
                                                type="tel"
                                                value={applicationForm.phone}
                                                onChange={(e) => setApplicationForm({ ...applicationForm, phone: e.target.value })}
                                                placeholder="010-0000-0000"
                                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[14px] focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all placeholder:text-gray-300"
                                            />
                                        </div>
                                    )}

                                    {(jdData?.applicationFields?.gender || !jdData?.applicationFields) && (
                                        <div>
                                            <label className="block text-[13px] font-semibold text-gray-600 mb-1.5">성별</label>
                                            <select
                                                value={applicationForm.gender}
                                                onChange={(e) => setApplicationForm({ ...applicationForm, gender: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[14px] focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all appearance-none"
                                                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center' }}
                                            >
                                                <option value="">선택 안 함</option>
                                                <option value="남성">남성</option>
                                                <option value="여성">여성</option>
                                                <option value="기타">기타</option>
                                            </select>
                                        </div>
                                    )}
                                    
                                    {jdData?.applicationFields?.birthDate && (
                                        <div>
                                            <label className="block text-[13px] font-semibold text-gray-600 mb-1.5">생년월일</label>
                                            <input
                                                type="date"
                                                value={applicationForm.birthDate}
                                                onChange={(e) => setApplicationForm({ ...applicationForm, birthDate: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[14px] focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                                            />
                                        </div>
                                    )}
                                    
                                    {jdData?.applicationFields?.university && (
                                        <div>
                                            <label className="block text-[13px] font-semibold text-gray-600 mb-1.5">학교</label>
                                            <input
                                                type="text"
                                                value={applicationForm.university}
                                                onChange={(e) => setApplicationForm({ ...applicationForm, university: e.target.value })}
                                                placeholder="OO대학교"
                                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[14px] focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all placeholder:text-gray-300"
                                            />
                                        </div>
                                    )}
                                    
                                    {jdData?.applicationFields?.major && (
                                        <div>
                                            <label className="block text-[13px] font-semibold text-gray-600 mb-1.5">전공</label>
                                            <input
                                                type="text"
                                                value={applicationForm.major}
                                                onChange={(e) => setApplicationForm({ ...applicationForm, major: e.target.value })}
                                                placeholder="컴퓨터공학과"
                                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[14px] focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all placeholder:text-gray-300"
                                            />
                                        </div>
                                    )}
                                    
                                    {jdData?.applicationFields?.portfolio && (
                                        <div>
                                            <label className="block text-[13px] font-semibold text-gray-600 mb-1.5">포트폴리오</label>
                                            
                                            {/* 링크 입력 */}
                                            <input
                                                type="url"
                                                value={applicationForm.portfolio}
                                                onChange={(e) => setApplicationForm({ ...applicationForm, portfolio: e.target.value })}
                                                placeholder="포트폴리오 링크 (https://...)"
                                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[14px] focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all placeholder:text-gray-300"
                                            />
                                            
                                            <div className="flex items-center gap-3 my-2">
                                                <div className="flex-1 h-px bg-gray-200" />
                                                <span className="text-[11px] text-gray-400 font-medium">또는 PDF 첨부</span>
                                                <div className="flex-1 h-px bg-gray-200" />
                                            </div>
                                            
                                            {/* PDF 업로드 */}
                                            {applicationForm.portfolioFile ? (
                                                <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
                                                    <svg className="w-5 h-5 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                    <span className="text-[13px] text-blue-700 font-medium flex-1 truncate">{applicationForm.portfolioFileName}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setApplicationForm({ ...applicationForm, portfolioFile: null, portfolioFileName: '' })}
                                                        className="text-blue-400 hover:text-red-500 text-[18px] transition-colors flex-shrink-0"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            ) : (
                                                <label className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-all group">
                                                    <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                    </svg>
                                                    <span className="text-[13px] text-gray-500 group-hover:text-blue-600 font-medium transition-colors">PDF 파일 첨부 (최대 10MB)</span>
                                                    <input
                                                        type="file"
                                                        accept=".pdf"
                                                        className="hidden"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) {
                                                                if (file.size > 10 * 1024 * 1024) {
                                                                    alert('파일 크기는 10MB 이하여야 합니다.');
                                                                    return;
                                                                }
                                                                if (!file.name.toLowerCase().endsWith('.pdf')) {
                                                                    alert('PDF 파일만 업로드 가능합니다.');
                                                                    return;
                                                                }
                                                                setApplicationForm({ ...applicationForm, portfolioFile: file, portfolioFileName: file.name });
                                                            }
                                                        }}
                                                    />
                                                </label>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            {/* 스킬/도구 체크리스트 */}
                            {jdData?.applicationFields?.skillOptions && jdData.applicationFields.skillOptions.length > 0 && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                        <span className="text-[13px] font-bold text-gray-800">보유 스킬</span>
                                    </div>
                                    <p className="text-[12px] text-gray-400 -mt-2">해당하는 항목을 모두 선택해주세요</p>
                                    
                                    {jdData.applicationFields.skillOptions.map((cat, catIdx) => (
                                        <div key={catIdx}>
                                            <label className="block text-[13px] font-semibold text-gray-600 mb-2">{cat.category}</label>
                                            <div className="flex flex-wrap gap-2">
                                                {cat.skills.map((skill, skillIdx) => {
                                                    const isSelected = (applicationForm.selectedSkills[cat.category] || []).includes(skill);
                                                    return (
                                                        <button
                                                            key={skillIdx}
                                                            type="button"
                                                            onClick={() => {
                                                                setApplicationForm(prev => {
                                                                    const current = prev.selectedSkills[cat.category] || [];
                                                                    const updated = isSelected
                                                                        ? current.filter(s => s !== skill)
                                                                        : [...current, skill];
                                                                    return {
                                                                        ...prev,
                                                                        selectedSkills: {
                                                                            ...prev.selectedSkills,
                                                                            [cat.category]: updated
                                                                        }
                                                                    };
                                                                });
                                                            }}
                                                            className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all ${
                                                                isSelected
                                                                    ? 'bg-blue-600 text-white border-blue-600'
                                                                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
                                                            }`}
                                                        >
                                                            {skill}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* 커스텀 질문 */}
                            {jdData?.applicationFields?.customQuestions && jdData.applicationFields.customQuestions.length > 0 && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                        <span className="text-[13px] font-bold text-gray-800">추가 질문</span>
                                    </div>
                                    
                                    {jdData.applicationFields.customQuestions.map((question, idx) => (
                                        <div key={idx}>
                                            <label className="block text-[13px] font-semibold text-gray-600 mb-1.5">
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
                                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[14px] focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all resize-none placeholder:text-gray-300"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 모달 푸터 */}
                        <div className="px-7 py-5 border-t border-gray-100 flex justify-end gap-3">
                            <button
                                onClick={() => setShowApplicationModal(false)}
                                className="px-5 py-2.5 rounded-xl text-[13px] font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                                disabled={submitting}
                            >
                                취소
                            </button>
                            <button
                                onClick={handleApplicationSubmit}
                                disabled={submitting || !applicationForm.name.trim() || !applicationForm.email.trim()}
                                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-[13px] font-bold hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {submitting ? '제출 중...' : '지원하기'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* 프로필 이미지 편집 모달 */}
            {showProfileModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden shadow-2xl border border-gray-200">
                        {/* 모달 헤더 */}
                        <div className="px-6 py-5 border-b border-gray-100">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-[17px] font-bold text-gray-900">프로필 이미지 변경</h2>
                                    <p className="text-[12px] text-gray-500 mt-1">{jdData.teamName || jdData.companyName || '회사/팀'} 프로필</p>
                                </div>
                                <button 
                                    onClick={() => {
                                        setShowProfileModal(false);
                                        setProfileFile(null);
                                        setProfilePreview(null);
                                    }}
                                    className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        
                        {/* 모달 본문 */}
                        <div className="p-6 overflow-y-auto max-h-[60vh]">
                            <div className="space-y-4">
                                {/* 프로필 이미지 미리보기 */}
                                {profilePreview && (
                                    <div className="flex justify-center relative">
                                        <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-gray-200 shadow-lg">
                                            <img 
                                                src={profilePreview} 
                                                alt="프로필 미리보기" 
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        {profileFile && (
                                            <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-3 py-1 rounded-full font-medium shadow-md">
                                                새 이미지
                                            </div>
                                        )}
                                    </div>
                                )}
                                
                                {/* 파일 선택 */}
                                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 hover:border-blue-400 transition-colors">
                                    <label className="cursor-pointer flex flex-col items-center gap-3">
                                        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center">
                                            <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                            </svg>
                                        </div>
                                        <div className="text-center">
                                            <span className="text-[14px] font-semibold text-blue-600">
                                                {profileFile ? '다른 이미지 선택' : '프로필 이미지 선택'}
                                            </span>
                                            <p className="text-[12px] text-gray-500 mt-1">5MB 이하의 이미지 파일 (JPG, PNG, GIF)</p>
                                        </div>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleProfileFileChange}
                                            className="hidden"
                                        />
                                    </label>
                                </div>
                                
                                {profileFile && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                        <p className="text-[12px] text-blue-800">
                                            <span className="font-semibold">선택된 파일:</span> {profileFile.name}
                                        </p>
                                        <p className="text-[11px] text-blue-600 mt-1">
                                            크기: {(profileFile.size / 1024 / 1024).toFixed(2)} MB
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {/* 모달 푸터 */}
                        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setShowProfileModal(false);
                                    setProfileFile(null);
                                    setProfilePreview(null);
                                }}
                                className="px-5 py-2.5 rounded-xl text-[13px] font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                                disabled={isUploadingProfile}
                            >
                                취소
                            </button>
                            <button
                                onClick={handleSaveProfile}
                                disabled={!profileFile || isUploadingProfile}
                                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-[13px] font-bold hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {isUploadingProfile ? '업로드 중...' : '저장'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            </div>
        </div>
    );
};
