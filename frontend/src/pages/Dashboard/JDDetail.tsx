import { useState, useEffect, useRef, useCallback } from 'react';
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
    sectionOrder?: string[];
}

type SectionType = 'description' | 'recruitment' | 'visionMission' | 'requirements' | 'preferred' | 'benefits' | 'skills' | 'applicationForm';

const SECTION_META: Record<SectionType, { label: string }> = {
    description: { label: '소개' },
    recruitment: { label: '모집 일정' },
    visionMission: { label: '비전/미션' },
    requirements: { label: '필수 체크리스트' },
    preferred: { label: '우대 체크리스트' },
    benefits: { label: '혜택/복리후생' },
    skills: { label: '스킬 체크리스트' },
    applicationForm: { label: '지원 양식' },
};

const ALL_SECTION_TYPES: SectionType[] = ['description', 'recruitment', 'visionMission', 'requirements', 'preferred', 'benefits', 'skills', 'applicationForm'];

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

    // Section drag & drop
    const [sectionOrder, setSectionOrder] = useState<SectionType[]>([]);
    const [draggedSection, setDraggedSection] = useState<string | null>(null);
    const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
    
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
    
    const { isDemoMode, onDemoAction, currentStepId } = useDemoMode();
    const currentUserId = auth.currentUser?.uid;
    const isOwner = isDemoMode || (currentUserId && jdData?.userId === currentUserId);

    // 데모 모드: 드래그 &  드롭 시연 (섹션 순서 변경 애니메이션)
    const [demoDragAnimating, setDemoDragAnimating] = useState(false);
    useEffect(() => {
        if (!isDemoMode || currentStepId !== 'p2-drag-demo' || !isEditing) return;
        if (sectionOrder.length < 2) return;

        // 1초 후 첫 번째/두 번째 섹션 swap 시연
        const swapTimer = setTimeout(() => {
            setDemoDragAnimating(true);
            // 시각적 피드백: 잠깐 drag 상태 표시
            setDraggedSection(sectionOrder[0]);
            setDragOverIdx(1);
        }, 800);

        // 1.8초 후 실제 swap 적용
        const applyTimer = setTimeout(() => {
            setSectionOrder(prev => {
                const newOrder = [...prev];
                [newOrder[0], newOrder[1]] = [newOrder[1], newOrder[0]];
                return newOrder;
            });
            setDraggedSection(null);
            setDragOverIdx(null);
            setDemoDragAnimating(false);
        }, 1800);

        return () => {
            clearTimeout(swapTimer);
            clearTimeout(applyTimer);
            setDraggedSection(null);
            setDragOverIdx(null);
            setDemoDragAnimating(false);
        };
    }, [isDemoMode, currentStepId, isEditing]);

    // 수정 관련 함수
    const handleEdit = () => {
        setEditedData({ ...jdData } as JDData);
        const stored = jdData?.sectionOrder as SectionType[] | undefined;
        if (stored && stored.length > 0) {
            setSectionOrder([...stored]);
        } else {
            const derived: SectionType[] = [];
            if (jdData?.description) derived.push('description');
            if ((jdData?.type || 'club') === 'club' && (jdData?.recruitmentPeriod || jdData?.recruitmentTarget || jdData?.recruitmentCount || jdData?.recruitmentProcess?.length || jdData?.activitySchedule || jdData?.membershipFee)) derived.push('recruitment');
            if (jdData?.vision || jdData?.mission) derived.push('visionMission');
            derived.push('requirements');
            derived.push('preferred');
            if (jdData?.benefits?.length) derived.push('benefits');
            if (jdData?.applicationFields?.skillOptions?.length) derived.push('skills');
            derived.push('applicationForm');
            setSectionOrder(derived);
        }
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
            const demoSave = { ...editedData, sectionOrder: sectionOrder.filter(s => s !== 'applicationForm') };
            setJdData(demoSave);
            setIsEditing(false);
            setEditedData(null);
            onDemoAction?.('jd-save-complete');
            return;
        }
        
        try {
            setSubmitting(true);
            const saveData = { ...editedData, sectionOrder: sectionOrder.filter(s => s !== 'applicationForm') };
            await jdAPI.update(jdId, saveData);
            setJdData(saveData);
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

    // Section drag & drop handlers
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const autoScrollRAF = useRef<number | null>(null);

    const handleSectionDragStart = (e: React.DragEvent, section: string) => {
        e.dataTransfer.effectAllowed = 'move';
        setDraggedSection(section);
    };
    const handleSectionDragOver = (e: React.DragEvent, idx: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverIdx(idx);
    };
    // 드래그 중 자동 스크롤 (상하 가장자리 80px 영역)
    const handleDragAutoScroll = useCallback((e: React.DragEvent) => {
        const container = scrollContainerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const EDGE = 80;
        const SPEED = 18;
        if (autoScrollRAF.current) cancelAnimationFrame(autoScrollRAF.current);
        if (y < EDGE) {
            const factor = 1 - y / EDGE;
            const scroll = () => { container.scrollTop -= SPEED * factor; autoScrollRAF.current = requestAnimationFrame(scroll); };
            autoScrollRAF.current = requestAnimationFrame(scroll);
        } else if (y > rect.height - EDGE) {
            const factor = 1 - (rect.height - y) / EDGE;
            const scroll = () => { container.scrollTop += SPEED * factor; autoScrollRAF.current = requestAnimationFrame(scroll); };
            autoScrollRAF.current = requestAnimationFrame(scroll);
        }
    }, []);
    const stopAutoScroll = useCallback(() => { if (autoScrollRAF.current) { cancelAnimationFrame(autoScrollRAF.current); autoScrollRAF.current = null; } }, []);

    const handleSectionDrop = (dropIdx: number) => {
        stopAutoScroll();
        if (!draggedSection) return;
        const t = draggedSection as SectionType;
        if (!sectionOrder.includes(t)) {
            const o = [...sectionOrder]; o.splice(dropIdx, 0, t); setSectionOrder(o);
        } else {
            const ci = sectionOrder.indexOf(t);
            if (ci === dropIdx) { setDraggedSection(null); setDragOverIdx(null); return; }
            const o = [...sectionOrder]; o.splice(ci, 1);
            o.splice(dropIdx > ci ? dropIdx - 1 : dropIdx, 0, t); setSectionOrder(o);
        }
        setDraggedSection(null); setDragOverIdx(null);
    };
    const handleSectionDragEnd = () => { stopAutoScroll(); setDraggedSection(null); setDragOverIdx(null); };
    const removeSection = (s: SectionType) => setSectionOrder(prev => prev.filter(x => x !== s));

    const getDisplaySections = (): SectionType[] => {
        if (!jdData) return [];
        const stored = jdData.sectionOrder as SectionType[] | undefined;
        const has: Record<SectionType, boolean> = {
            description: !!jdData.description,
            recruitment: (jdData.type || 'club') === 'club' && !!(jdData.recruitmentPeriod || jdData.recruitmentTarget || jdData.recruitmentCount || (jdData.recruitmentProcess && jdData.recruitmentProcess.length > 0) || jdData.activitySchedule || jdData.membershipFee),
            visionMission: !!(jdData.vision || jdData.mission),
            requirements: !!(jdData.requirements && jdData.requirements.length > 0),
            preferred: !!(jdData.preferred && jdData.preferred.length > 0),
            benefits: !!(jdData.benefits && jdData.benefits.length > 0),
            skills: !!(jdData.applicationFields?.skillOptions && jdData.applicationFields.skillOptions.length > 0),
            applicationForm: false,
        };
        if (stored && stored.length > 0) return stored.filter(s => has[s]);
        return ALL_SECTION_TYPES.filter(s => has[s]);
    };
    const activeSections = isEditing ? sectionOrder : getDisplaySections();
    const paletteSections = isEditing ? ALL_SECTION_TYPES.filter(s => !sectionOrder.includes(s)) : [];

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


    // 섹션별 콘텐츠 렌더링 함수
    const renderSectionContent = (type: SectionType): React.ReactNode => {
        if (!jdData) return null;
        switch (type) {
            case 'description':
                return (
                    <>
                    {(jdData.description || isEditing) && (
                        <div className="space-y-3">
                            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100 rounded-lg p-5">
                                <h4 className="text-[11px] font-bold text-blue-600 uppercase tracking-wider mb-3">
                                    {(jdData.type || 'club') === 'company' ? '회사 소개' : '동아리 소개'}
                                </h4>
                                {isEditing ? (
                                    <textarea
                                        value={editedData?.description || ''}
                                        onChange={(e) => updateEditedField('description', e.target.value)}
                                        rows={4}
                                        className="w-full text-[14px] text-gray-700 leading-relaxed bg-transparent border border-dashed border-blue-200 rounded-lg outline-none focus:border-blue-400 px-2 py-1 resize-none transition-colors"
                                        placeholder="회사/동아리 소개를 입력하세요"
                                    />
                                ) : (
                                    <p className="text-[14px] text-gray-700 leading-relaxed">{jdData.description}</p>
                                )}
                            </div>
                        </div>
                    )}
                    </>
                );
            case 'recruitment':
                return (
                    <>
                    {((jdData.type || 'club') === 'club') && (
                        (isEditing || jdData.recruitmentPeriod || jdData.recruitmentTarget || jdData.recruitmentCount ||
                        (jdData.recruitmentProcess && jdData.recruitmentProcess.length > 0) ||
                        jdData.activitySchedule || jdData.membershipFee) && (
                            <div className="space-y-3">
                                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100 rounded-lg p-5">
                                    <h4 className="text-[11px] font-bold text-green-600 uppercase tracking-wider mb-4">
                                        모집 일정 및 정보
                                    </h4>
                                    <div className="space-y-3">
                                        {(isEditing || jdData.recruitmentPeriod) && (
                                            <div className="flex items-start gap-3">
                                                <span className="text-[11px] font-bold text-gray-500 w-20 flex-shrink-0 pt-0.5">모집 기간</span>
                                                {isEditing ? (
                                                    <input type="text" value={editedData?.recruitmentPeriod || ''} onChange={(e) => updateEditedField('recruitmentPeriod', e.target.value)} className="flex-1 text-[13px] text-gray-700 bg-transparent border-b border-dashed border-blue-300 outline-none focus:border-blue-500 px-0 py-0 transition-colors" placeholder="예: 2025.03.01 ~ 2025.03.15" />
                                                ) : (
                                                    <span className="text-[13px] text-gray-700">{jdData.recruitmentPeriod}</span>
                                                )}
                                            </div>
                                        )}
                                        {(isEditing || jdData.recruitmentTarget) && (
                                            <div className="flex items-start gap-3">
                                                <span className="text-[11px] font-bold text-gray-500 w-20 flex-shrink-0 pt-0.5">모집 대상</span>
                                                {isEditing ? (
                                                    <input type="text" value={editedData?.recruitmentTarget || ''} onChange={(e) => updateEditedField('recruitmentTarget', e.target.value)} className="flex-1 text-[13px] text-gray-700 bg-transparent border-b border-dashed border-blue-300 outline-none focus:border-blue-500 px-0 py-0 transition-colors" placeholder="예: 전공 무관 대학생" />
                                                ) : (
                                                    <span className="text-[13px] text-gray-700">{jdData.recruitmentTarget}</span>
                                                )}
                                            </div>
                                        )}
                                        {(isEditing || jdData.recruitmentCount) && (
                                            <div className="flex items-start gap-3">
                                                <span className="text-[11px] font-bold text-gray-500 w-20 flex-shrink-0 pt-0.5">모집 인원</span>
                                                {isEditing ? (
                                                    <input type="text" value={editedData?.recruitmentCount || ''} onChange={(e) => updateEditedField('recruitmentCount', e.target.value)} className="flex-1 text-[13px] text-gray-700 bg-transparent border-b border-dashed border-blue-300 outline-none focus:border-blue-500 px-0 py-0 transition-colors" placeholder="예: 10명" />
                                                ) : (
                                                    <span className="text-[13px] text-gray-700">{jdData.recruitmentCount}</span>
                                                )}
                                            </div>
                                        )}
                                        {(isEditing || (jdData.recruitmentProcess && jdData.recruitmentProcess.length > 0)) && (
                                            <div className="flex items-start gap-3">
                                                <span className="text-[11px] font-bold text-gray-500 w-20 flex-shrink-0 pt-0.5">모집 절차</span>
                                                {isEditing ? (
                                                    <div className="flex-1">
                                                        <div className="flex flex-wrap items-center gap-1">
                                                            {((editedData?.recruitmentProcess && editedData.recruitmentProcess.length > 0) ? editedData.recruitmentProcess : ['']).map((proc, i) => (
                                                                <span key={i} className="inline-flex items-center">
                                                                    {i > 0 && <span className="text-green-400 mx-1">→</span>}
                                                                    <input type="text" value={proc} onChange={(e) => { const arr = [...((editedData?.recruitmentProcess && editedData.recruitmentProcess.length > 0) ? editedData.recruitmentProcess : [''])]; arr[i] = e.target.value; updateEditedField('recruitmentProcess', arr); }} className="text-[13px] text-gray-700 bg-transparent border-b border-dashed border-blue-300 outline-none focus:border-blue-500 px-0 py-0 w-24 transition-colors" placeholder={`절차${i + 1}`} />
                                                                    <button type="button" onClick={() => { const arr = [...((editedData?.recruitmentProcess && editedData.recruitmentProcess.length > 0) ? editedData.recruitmentProcess : [''])]; arr.splice(i, 1); updateEditedField('recruitmentProcess', arr.length > 0 ? arr : ['']); }} className="text-red-300 hover:text-red-500 text-[10px] ml-0.5">✕</button>
                                                                </span>
                                                            ))}
                                                            <button type="button" onClick={() => { const arr = [...(editedData?.recruitmentProcess || []), '']; updateEditedField('recruitmentProcess', arr); }} className="text-[11px] text-green-500 hover:text-green-700 font-medium ml-1">+</button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-[13px] text-gray-700">
                                                        {jdData.recruitmentProcess?.map((step, i) => (
                                                            <span key={i}>
                                                                {i > 0 && <span className="text-green-400 mx-1">→</span>}
                                                                {step}
                                                            </span>
                                                        ))}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        {(isEditing || jdData.activitySchedule) && (
                                            <div className="flex items-start gap-3">
                                                <span className="text-[11px] font-bold text-gray-500 w-20 flex-shrink-0 pt-0.5">활동 일정</span>
                                                {isEditing ? (
                                                    <input type="text" value={editedData?.activitySchedule || ''} onChange={(e) => updateEditedField('activitySchedule', e.target.value)} className="flex-1 text-[13px] text-gray-700 bg-transparent border-b border-dashed border-blue-300 outline-none focus:border-blue-500 px-0 py-0 transition-colors" placeholder="예: 매주 수요일 오후 7시" />
                                                ) : (
                                                    <span className="text-[13px] text-gray-700">{jdData.activitySchedule}</span>
                                                )}
                                            </div>
                                        )}
                                        {(isEditing || jdData.membershipFee) && (
                                            <div className="flex items-start gap-3">
                                                <span className="text-[11px] font-bold text-gray-500 w-20 flex-shrink-0 pt-0.5">회비</span>
                                                {isEditing ? (
                                                    <input type="text" value={editedData?.membershipFee || ''} onChange={(e) => updateEditedField('membershipFee', e.target.value)} className="flex-1 text-[13px] text-gray-700 bg-transparent border-b border-dashed border-blue-300 outline-none focus:border-blue-500 px-0 py-0 transition-colors" placeholder="예: 월 1만원" />
                                                ) : (
                                                    <span className="text-[13px] text-gray-700">{jdData.membershipFee}</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    )}
                    </>
                );
            case 'visionMission':
                return (
                    <>
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
                                                rows={2}
                                                className="w-full text-[13px] text-gray-700 leading-relaxed bg-transparent border border-dashed border-blue-200 rounded-lg outline-none focus:border-blue-400 px-2 py-1 resize-none transition-colors"
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
                                                rows={2}
                                                className="w-full text-[13px] text-gray-700 leading-relaxed bg-transparent border border-dashed border-blue-200 rounded-lg outline-none focus:border-blue-400 px-2 py-1 resize-none transition-colors"
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
                    </>
                );
            case 'requirements':
                return (
                    <>
                    <div className="space-y-3">
                        <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{(jdData.type || 'club') === 'company' ? '자격 요건 (CHECKLIST)' : '지원자 체크리스트 (필수)'}</h4>
                        <div className="space-y-2">
                            {(isEditing ? ((editedData?.requirements && editedData.requirements.length > 0) ? editedData.requirements : ['']) : (jdData.requirements || [])).map((item, idx) => {
                                const itemType = isEditing 
                                    ? (editedData?.requirementTypes?.[idx] || 'text')
                                    : (jdData.requirementTypes?.[idx] || 'checkbox');
                                return (
                                <div key={idx} className="space-y-2">
                                    <div className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors group">
                                        {!isEditing && (
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
                                        )}
                                        {isEditing ? (
                                            <div className="flex-1 flex items-center gap-2">
                                                <span className="text-gray-300 text-sm">☐</span>
                                                <input
                                                    type="text"
                                                    value={item}
                                                    onChange={(e) => {
                                                        const current = (editedData?.requirements && editedData.requirements.length > 0) ? editedData.requirements : [''];
                                                        const newReqs = [...current];
                                                        newReqs[idx] = e.target.value;
                                                        updateEditedField('requirements', newReqs);
                                                    }}
                                                    className="flex-1 text-[13px] text-gray-700 leading-relaxed bg-transparent border-b border-dashed border-blue-300 outline-none focus:border-blue-500 px-0 py-0 transition-colors"
                                                    placeholder="자격 요건 입력"
                                                />
                                                {/* 답변 형식 토글 */}
                                                <button
                                                    onClick={() => {
                                                        const types = { ...(editedData?.requirementTypes || {}) };
                                                        types[idx] = itemType === 'checkbox' ? 'text' : 'checkbox';
                                                        updateEditedField('requirementTypes', types);
                                                    }}
                                                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-all flex-shrink-0 ${
                                                        itemType === 'text' 
                                                            ? 'bg-blue-50 text-blue-600 border border-blue-200' 
                                                            : 'bg-gray-50 text-gray-400 border border-gray-200'
                                                    }`}
                                                    title={itemType === 'text' ? '서술형' : '체크만'}
                                                >
                                                    {itemType === 'text' ? '✎' : '✓'}
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const current = (editedData?.requirements && editedData.requirements.length > 0) ? editedData.requirements : [''];
                                                        const newReqs = current.filter((_, i) => i !== idx);
                                                        const currentTypes = { ...(editedData?.requirementTypes || {}) };
                                                        const newTypes: Record<number, 'checkbox' | 'text'> = {};
                                                        Object.keys(currentTypes).forEach(k => {
                                                            const ki = parseInt(k);
                                                            if (ki < idx) newTypes[ki] = currentTypes[ki];
                                                            else if (ki > idx) newTypes[ki - 1] = currentTypes[ki];
                                                        });
                                                        updateEditedField('requirements', newReqs.length ? newReqs : ['']);
                                                        updateEditedField('requirementTypes', newTypes);
                                                    }}
                                                    className="text-red-300 hover:text-red-500 text-[11px] flex-shrink-0 transition-colors"
                                                >✕</button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <span className="text-[13px] text-gray-700 leading-relaxed group-hover:text-gray-900">{item}</span>
                                                {itemType === 'text' && (
                                                    <span className="text-[10px] text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded font-medium">서술</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    {!isEditing && viewRequirementChecks[idx]?.checked && itemType === 'text' && (
                                        <div className="ml-10">
                                            <textarea
                                                value={viewRequirementChecks[idx]?.detail || ''}
                                                onChange={(e) => setViewRequirementChecks({
                                                    ...viewRequirementChecks,
                                                    [idx]: { checked: true, detail: e.target.value }
                                                })}
                                                placeholder="관련 경험이나 역량을 구체적으로 작성해주세요"
                                                rows={3}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[13px] focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                            />
                                        </div>
                                    )}
                                </div>
                                );
                            })}
                            {!isEditing && (!jdData.requirements || jdData.requirements.length === 0) && (
                                <p className="text-[13px] text-gray-400 p-3">{(jdData.type || 'club') === 'company' ? '자격 요건이 설정되지 않았습니다.' : '체크리스트가 설정되지 않았습니다.'}</p>
                            )}
                            {isEditing && (
                                <button
                                    onClick={() => {
                                        const current = (editedData?.requirements && editedData.requirements.length > 0) ? editedData.requirements : [''];
                                        updateEditedField('requirements', [...current, '']);
                                    }}
                                    className="text-[12px] text-blue-500 hover:text-blue-700 font-medium ml-3 transition-colors"
                                >
                                    + 항목 추가
                                </button>
                            )}
                        </div>
                    </div>
                    </>
                );
            case 'preferred':
                return (
                    <>
                    <div className="space-y-3">
                        <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{(jdData.type || 'club') === 'company' ? '우대 사항 (PREFERRED)' : '지원자 체크리스트 (우대)'}</h4>
                        <div className="space-y-2">
                            {(isEditing ? ((editedData?.preferred && editedData.preferred.length > 0) ? editedData.preferred : ['']) : (jdData.preferred || [])).map((item, idx) => {
                                const itemType = isEditing
                                    ? (editedData?.preferredTypes?.[idx] || 'text')
                                    : (jdData.preferredTypes?.[idx] || 'checkbox');
                                return (
                                <div key={idx} className="space-y-2">
                                    <div className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors group">
                                        {!isEditing && (
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
                                        )}
                                        {isEditing ? (
                                            <div className="flex-1 flex items-center gap-2">
                                                <span className="text-gray-300 text-sm">☐</span>
                                                <input
                                                    type="text"
                                                    value={item}
                                                    onChange={(e) => {
                                                        const current = (editedData?.preferred && editedData.preferred.length > 0) ? editedData.preferred : [''];
                                                        const newPref = [...current];
                                                        newPref[idx] = e.target.value;
                                                        updateEditedField('preferred', newPref);
                                                    }}
                                                    className="flex-1 text-[13px] text-gray-700 leading-relaxed bg-transparent border-b border-dashed border-blue-300 outline-none focus:border-blue-500 px-0 py-0 transition-colors"
                                                    placeholder="우대 사항 입력"
                                                />
                                                <button
                                                    onClick={() => {
                                                        const types = { ...(editedData?.preferredTypes || {}) };
                                                        types[idx] = itemType === 'checkbox' ? 'text' : 'checkbox';
                                                        updateEditedField('preferredTypes', types);
                                                    }}
                                                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-all flex-shrink-0 ${
                                                        itemType === 'text' 
                                                            ? 'bg-purple-50 text-purple-600 border border-purple-200' 
                                                            : 'bg-gray-50 text-gray-400 border border-gray-200'
                                                    }`}
                                                    title={itemType === 'text' ? '서술형' : '체크만'}
                                                >
                                                    {itemType === 'text' ? '✎' : '✓'}
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const current = (editedData?.preferred && editedData.preferred.length > 0) ? editedData.preferred : [''];
                                                        const newPref = current.filter((_, i) => i !== idx);
                                                        const currentTypes = { ...(editedData?.preferredTypes || {}) };
                                                        const newTypes: Record<number, 'checkbox' | 'text'> = {};
                                                        Object.keys(currentTypes).forEach(k => {
                                                            const ki = parseInt(k);
                                                            if (ki < idx) newTypes[ki] = currentTypes[ki];
                                                            else if (ki > idx) newTypes[ki - 1] = currentTypes[ki];
                                                        });
                                                        updateEditedField('preferred', newPref.length ? newPref : ['']);
                                                        updateEditedField('preferredTypes', newTypes);
                                                    }}
                                                    className="text-red-300 hover:text-red-500 text-[11px] flex-shrink-0 transition-colors"
                                                >✕</button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <span className="text-[13px] text-gray-700 leading-relaxed group-hover:text-gray-900">{item}</span>
                                                {itemType === 'text' && (
                                                    <span className="text-[10px] text-purple-500 bg-purple-50 px-1.5 py-0.5 rounded font-medium">서술</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    {!isEditing && viewPreferredChecks[idx]?.checked && itemType === 'text' && (
                                        <div className="ml-10">
                                            <textarea
                                                value={viewPreferredChecks[idx]?.detail || ''}
                                                onChange={(e) => setViewPreferredChecks({
                                                    ...viewPreferredChecks,
                                                    [idx]: { checked: true, detail: e.target.value }
                                                })}
                                                placeholder="관련 경험이나 역량을 구체적으로 작성해주세요"
                                                rows={3}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[13px] focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                                            />
                                        </div>
                                    )}
                                </div>
                                );
                            })}
                            {!isEditing && (!jdData.preferred || jdData.preferred.length === 0) && (
                                <p className="text-[13px] text-gray-400 p-3">{(jdData.type || 'club') === 'company' ? '우대 사항이 설정되지 않았습니다.' : '우대 체크리스트가 설정되지 않았습니다.'}</p>
                            )}
                            {isEditing && (
                                <button
                                    onClick={() => {
                                        const current = (editedData?.preferred && editedData.preferred.length > 0) ? editedData.preferred : [''];
                                        updateEditedField('preferred', [...current, '']);
                                    }}
                                    className="text-[12px] text-blue-500 hover:text-blue-700 font-medium ml-3 transition-colors"
                                >
                                    + 항목 추가
                                </button>
                            )}
                        </div>
                    </div>
                    </>
                );
            case 'benefits':
                return (
                    <>
                    {((jdData.benefits && jdData.benefits.length > 0) || isEditing) && (
                        <div className="space-y-3">
                            <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{(jdData.type || 'club') === 'company' ? '복리후생 (BENEFITS)' : '활동 혜택 (BENEFITS)'}</h4>
                            <div className="space-y-1">
                                {(isEditing ? ((editedData?.benefits && editedData.benefits.length > 0) ? editedData.benefits : ['']) : (jdData.benefits || [])).map((item, idx) => (
                                    <div key={idx} className="flex items-start gap-3 px-3 py-2 group">
                                        <span className="text-orange-400 mt-0.5 flex-shrink-0">•</span>
                                        {isEditing ? (
                                            <div className="flex-1 flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={item}
                                                    onChange={(e) => {
                                                        const current = (editedData?.benefits && editedData.benefits.length > 0) ? editedData.benefits : [''];
                                                        const newBenefits = [...current];
                                                        newBenefits[idx] = e.target.value;
                                                        updateEditedField('benefits', newBenefits);
                                                    }}
                                                    className="flex-1 text-[13px] text-gray-700 leading-relaxed bg-transparent border-b border-dashed border-blue-300 outline-none focus:border-blue-500 px-0 py-0 transition-colors"
                                                    placeholder="혜택/복리후생 입력"
                                                />
                                                <button
                                                    onClick={() => {
                                                        const current = (editedData?.benefits && editedData.benefits.length > 0) ? editedData.benefits : [''];
                                                        const newBenefits = current.filter((_, i) => i !== idx);
                                                        updateEditedField('benefits', newBenefits.length ? newBenefits : ['']);
                                                    }}
                                                    className="text-red-300 hover:text-red-500 text-[11px] flex-shrink-0 transition-colors"
                                                >✕</button>
                                            </div>
                                        ) : (
                                            <span className="text-[13px] text-gray-700 leading-relaxed">{item}</span>
                                        )}
                                    </div>
                                ))}
                                {isEditing && (
                                    <button
                                        onClick={() => {
                                            const current = (editedData?.benefits && editedData.benefits.length > 0) ? editedData.benefits : [''];
                                            updateEditedField('benefits', [...current, '']);
                                        }}
                                        className="text-[12px] text-blue-500 hover:text-blue-700 font-medium ml-3 transition-colors"
                                    >
                                        + 항목 추가
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                    </>
                );
            case 'skills':
                return (
                    <>
                    {((jdData?.applicationFields?.skillOptions && jdData.applicationFields.skillOptions.length > 0) || isEditing) && (
                        <div className="space-y-3">
                            <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                스킬 / 도구 체크리스트
                            </h4>
                            <div className="bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 rounded-lg p-5 space-y-5">
                                <p className="text-[12px] text-indigo-500 font-medium">
                                    {isEditing ? '지원자가 선택할 수 있는 스킬 목록을 수정하세요' : isOwner ? '지원자가 선택할 수 있는 스킬 목록입니다' : '보유하고 있는 스킬을 선택해주세요'}
                                </p>
                                {(isEditing ? (editedData?.applicationFields?.skillOptions || []) : (jdData?.applicationFields?.skillOptions || [])).map((cat, catIdx) => (
                                    <div key={catIdx}>
                                        <div className="flex items-center gap-2 mb-2">
                                            {isEditing ? (
                                                <>
                                                    <input
                                                        type="text"
                                                        value={cat.category}
                                                        onChange={(e) => {
                                                            const newOptions = [...(editedData?.applicationFields?.skillOptions || [])];
                                                            newOptions[catIdx] = { ...newOptions[catIdx], category: e.target.value };
                                                            updateEditedField('applicationFields', { ...editedData?.applicationFields, skillOptions: newOptions });
                                                        }}
                                                        className="text-[12px] font-bold text-gray-700 bg-transparent border-b border-dashed border-blue-300 outline-none focus:border-blue-500 px-0 py-0 transition-colors"
                                                        placeholder="카테고리명"
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            const newOptions = (editedData?.applicationFields?.skillOptions || []).filter((_, i) => i !== catIdx);
                                                            updateEditedField('applicationFields', { ...editedData?.applicationFields, skillOptions: newOptions });
                                                        }}
                                                        className="text-red-300 hover:text-red-500 text-[11px] transition-colors"
                                                    >✕</button>
                                                </>
                                            ) : (
                                                <span className="text-[12px] font-bold text-gray-700">{cat.category}</span>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {cat.skills.map((skill, skillIdx) => {
                                                const isSelected = !isEditing && (applicationForm.selectedSkills[cat.category] || []).includes(skill);
                                                return isEditing ? (
                                                    <span key={skillIdx} className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-indigo-200 rounded-lg text-[12px] text-indigo-700 font-medium">
                                                        {skill}
                                                        <button
                                                            onClick={() => {
                                                                const newOptions = [...(editedData?.applicationFields?.skillOptions || [])];
                                                                newOptions[catIdx] = { ...newOptions[catIdx], skills: newOptions[catIdx].skills.filter((_, i) => i !== skillIdx) };
                                                                updateEditedField('applicationFields', { ...editedData?.applicationFields, skillOptions: newOptions });
                                                            }}
                                                            className="text-indigo-400 hover:text-red-500 ml-0.5"
                                                        >✕</button>
                                                    </span>
                                                ) : (
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
                                                                    return { ...prev, selectedSkills: { ...prev.selectedSkills, [cat.category]: updated } };
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
                                            {isEditing && (
                                                <input
                                                    type="text"
                                                    placeholder="+ 스킬 추가 (Enter)"
                                                    className="px-3 py-1.5 bg-transparent border border-dashed border-indigo-300 rounded-lg text-[12px] text-indigo-600 outline-none focus:border-indigo-500 w-32 transition-colors"
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
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {isEditing && (
                                    <button
                                        onClick={() => {
                                            const newOptions = [...(editedData?.applicationFields?.skillOptions || []), { category: '', skills: [] }];
                                            updateEditedField('applicationFields', { ...editedData?.applicationFields, skillOptions: newOptions });
                                        }}
                                        className="text-[12px] text-indigo-500 hover:text-indigo-700 font-medium transition-colors"
                                    >
                                        + 카테고리 추가
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                    </>
                );
            case 'applicationForm':
                return (
                    <>
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
                    </>
                );
            default:
                return null;
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
        <div className="flex flex-col h-full bg-white md:rounded-2xl md:border border-gray-200 md:shadow-xl overflow-hidden max-w-[1200px] mx-auto">
            
            <div className="flex flex-col md:flex-row flex-1 min-h-0">
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
                    {isEditing ? (
                        <input
                            type="text"
                            value={editedData?.teamName || editedData?.companyName || ''}
                            onChange={(e) => updateEditedField('teamName', e.target.value)}
                            className="font-bold text-[17px] text-gray-900 mb-1 w-full bg-transparent border-b border-dashed border-blue-300 outline-none focus:border-blue-500 text-center px-1"
                            placeholder="팀/동아리명"
                        />
                    ) : (
                        <h3 className="font-bold text-[17px] text-gray-900 mb-1">
                            {jdData.teamName || jdData.companyName || jdData.company || 'WINNOW'}
                        </h3>
                    )}
                    {isEditing ? (
                        <input
                            type="text"
                            value={editedData?.jobRole || ''}
                            onChange={(e) => updateEditedField('jobRole', e.target.value)}
                            className="text-[12px] text-gray-500 font-semibold mb-6 w-full bg-transparent border-b border-dashed border-blue-300 outline-none focus:border-blue-500 text-center px-1"
                            placeholder="모집 분야"
                        />
                    ) : (
                        <p className="text-[12px] text-gray-500 font-semibold mb-6">
                            {jdData.jobRole || '모집 분야'}
                        </p>
                    )}
                </div>

                {/* Location & Scale */}
                <div className="px-6 space-y-4 mb-6">
                    {(jdData.location || isEditing) && (
                        <div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">LOCATION</div>
                            <div className="text-[13px]">
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={editedData?.location || ''}
                                        onChange={(e) => updateEditedField('location', e.target.value)}
                                        className="text-gray-700 bg-transparent border-b border-dashed border-blue-300 outline-none focus:border-blue-500 w-full text-[13px]"
                                        placeholder="위치 입력"
                                    />
                                ) : (
                                    <span className="text-gray-700">{jdData.location}</span>
                                )}
                            </div>
                        </div>
                    )}
                    
                    {(jdData.scale || isEditing) && (
                        <div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">SCALE</div>
                            <div className="text-[13px]">
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={editedData?.scale || ''}
                                        onChange={(e) => updateEditedField('scale', e.target.value)}
                                        className="text-gray-700 bg-transparent border-b border-dashed border-blue-300 outline-none focus:border-blue-500 w-full text-[13px]"
                                        placeholder="규모 입력"
                                    />
                                ) : (
                                    <span className="text-gray-700">{jdData.scale}</span>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Tech Stack */}
                {jdData.techStacks && jdData.techStacks.length > 0 && (
                    <div className="px-6 mb-6">
                        <div className="flex items-center gap-2 mb-3">
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
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="px-4 sm:px-8 py-4 sm:py-6 border-b border-gray-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-white">
                    <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg text-gray-800">공고 상세</h3>
                        {isEditing && <span className="text-[11px] font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200 animate-pulse">편집 중</span>}
                    </div>
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
                                    링크 공유
                                </button>
                            </>
                        )}
                        {isEditing && (
                            <>
                                <button
                                    data-tour="jd-save-btn"
                                    onClick={handleSave}
                                    disabled={submitting}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-[12px] font-bold hover:bg-green-700 disabled:bg-gray-400 transition-all"
                                >
                                    {submitting ? '저장 중...' : '저장'}
                                </button>
                                <button
                                    onClick={handleCancel}
                                    disabled={submitting}
                                    className="px-4 py-2 bg-white border border-gray-300 text-gray-600 rounded-lg text-[12px] font-bold hover:bg-gray-50 disabled:bg-gray-100 transition-all"
                                >
                                    취소
                                </button>
                            </>
                        )}
                        <button 
                            onClick={() => onNavigate('my-jds')}
                            className="px-4 py-2 border border-gray-200 rounded-lg text-[12px] font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                            목록으로
                        </button>
                    </div>
                </div>
                
                <div ref={scrollContainerRef} className="flex-1 overflow-y-auto scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }} onDragOver={isEditing ? handleDragAutoScroll : undefined} onDragLeave={isEditing ? stopAutoScroll : undefined} onDrop={isEditing ? stopAutoScroll : undefined}>
                    <div className="p-8 space-y-8">
                        {/* 공고 제목 */}
                        <div>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={editedData?.title || ''}
                                    onChange={(e) => updateEditedField('title', e.target.value)}
                                    className="text-2xl font-bold text-gray-900 mb-4 w-full bg-transparent border-0 border-b-2 border-dashed border-blue-300 outline-none focus:border-blue-500 px-0 py-1 transition-colors"
                                    placeholder="공고 제목을 입력하세요"
                                />
                            ) : (
                                <h1 className="text-2xl font-bold text-gray-900 mb-4">
                                    {jdData.title || '제목 없음'}
                                </h1>
                            )}
                        </div>

                        {/* 섹션 팔레트 */}
                        {isEditing && paletteSections.length > 0 && (
                            <div data-tour="section-palette" className="flex flex-wrap items-center gap-2 p-3 bg-gradient-to-r from-gray-50 to-blue-50/50 border border-blue-100 rounded-xl">
                                <span className="text-[11px] font-bold text-gray-400 mr-1">섹션 추가</span>
                                {paletteSections.map(s => (
                                    <div
                                        key={s}
                                        draggable
                                        onDragStart={(e) => handleSectionDragStart(e, s)}
                                        onClick={() => setSectionOrder(prev => [...prev, s])}
                                        className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-[11px] font-medium text-gray-600 cursor-grab hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 hover:shadow-sm active:cursor-grabbing transition-all select-none"
                                        title="클릭 또는 드래그하여 추가"
                                    >
                                        + {SECTION_META[s].label}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* 동적 섹션 렌더링 */}
                        <div data-tour="section-drag-area">
                        {activeSections.map((section, idx) => (
                            <div
                                key={section}
                                draggable={isEditing}
                                onDragStart={(e) => isEditing && handleSectionDragStart(e, section)}
                                onDragOver={(e) => isEditing && handleSectionDragOver(e, idx)}
                                onDrop={() => isEditing && handleSectionDrop(idx)}
                                onDragEnd={handleSectionDragEnd}
                                data-tour={idx === 0 ? 'section-drag-first' : undefined}
                                className={`relative group/section transition-all duration-300 ${isEditing ? 'cursor-grab active:cursor-grabbing' : ''} ${dragOverIdx === idx ? 'ring-2 ring-blue-400 ring-offset-2 rounded-lg' : ''} ${demoDragAnimating && draggedSection === sectionOrder[0] && idx === 0 ? 'opacity-60 scale-[0.98] ring-2 ring-blue-400 rounded-lg' : ''} ${demoDragAnimating && idx === 1 ? 'ring-2 ring-green-400 ring-offset-2 rounded-lg bg-green-50/30' : ''}`}
                            >
                                {isEditing && (
                                    <div className={`flex items-center justify-between mb-1 py-1 transition-opacity ${isDemoMode && (currentStepId === 'p2-drag-sections' || currentStepId === 'p2-drag-demo') ? 'opacity-100' : 'opacity-0 group-hover/section:opacity-100'}`}>
                                        <span className="text-[10px] text-gray-400 flex items-center gap-1 select-none">
                                            <span className={`cursor-grab text-gray-300 hover:text-gray-500 ${isDemoMode && currentStepId === 'p2-drag-sections' ? 'text-blue-500 animate-pulse text-sm' : ''}`}>⠇</span>
                                            {SECTION_META[section as SectionType]?.label}
                                        </span>
                                        <button onClick={() => removeSection(section as SectionType)} className="text-[10px] text-red-300 hover:text-red-500 font-medium transition-colors">제거</button>
                                    </div>
                                )}
                                {renderSectionContent(section as SectionType)}
                            </div>
                        ))}

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
                                    className="px-6 py-3 bg-blue-600 text-white rounded-lg text-[14px] font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all"
                                >
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
