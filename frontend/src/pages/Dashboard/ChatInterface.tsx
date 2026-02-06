import { ChevronRight, MessageSquare, X, FileText } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { maskSensitiveData } from '../../utils/security';
import { auth } from '../../config/firebase';
import { jdAPI, geminiAPI } from '@/services/api';

interface CurrentJD {
    title: string;
    jobRole?: string;
    company?: string;
    companyName?: string;
    teamName?: string;
    location?: string;
    scale?: string;
    description?: string;  // 동아리 소개글 (활동, 분위기 등)
    vision?: string;
    mission?: string;
    techStacks?: { name: string; level: number }[];
    responsibilities: string[];
    requirements: string[];
    preferred: string[];
    benefits: string[];
    // 필수 체크 개수 설정
    requiredCheckCount?: number;  // 자격요건 중 최소 체크 개수
    preferredCheckCount?: number; // 우대사항 중 최소 체크 개수
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

interface ChatMessage {
    role: 'user' | 'ai';
    text: string;
    timestamp: string;
    options?: string[];
    parts?: { text: string }[];
}

interface ChatInterfaceProps {
    onNavigate: (page: string) => void;
}

export const ChatInterface = ({ onNavigate }: ChatInterfaceProps) => {
    // 사무적인 이미지 배열
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
    const [selectedImage] = useState(officeImages[Math.floor(Math.random() * officeImages.length)]);
    
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            role: 'ai',
            text: '안녕하세요! WINNOW 채용 마스터입니다 🎯 동아리의 정체성을 브랜딩하고, 최고의 신입 부원을 찾는 채용 공고를 함께 만들어볼게요! 먼저, 어떤 동아리이신가요?',
            timestamp: '오전 10:23'
        }
    ]);
    const [waitingForCustomInput, setWaitingForCustomInput] = useState(false);
    const [currentJD, setCurrentJD] = useState<CurrentJD>({
        title: '',
        jobRole: '',
        company: '',
        companyName: '',
        teamName: '',
        location: '',
        scale: '',
        description: '',
        vision: '',
        mission: '',
        techStacks: [],
        responsibilities: [],
        requirements: [],
        preferred: [],
        benefits: []
    });
    const [isLoading, setIsLoading] = useState(false);
    const [typingText, setTypingText] = useState<{ [key: string]: string }>({});
    const chatEndRef = useRef<HTMLDivElement>(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editedJD, setEditedJD] = useState<CurrentJD>(currentJD);
    
    // 지원 양식 커스터마이징 모달 상태
    const [showApplicationFieldsModal, setShowApplicationFieldsModal] = useState(false);
    const [requiredCheckCount, setRequiredCheckCount] = useState(0);
    const [preferredCheckCount, setPreferredCheckCount] = useState(0);
    const [applicationFieldsConfig, setApplicationFieldsConfig] = useState({
        name: true,        // 필수 (비활성화 불가)
        email: true,       // 필수 (비활성화 불가)
        phone: true,
        gender: false,
        birthDate: false,
        university: false,
        major: false,
        portfolio: false,
        customQuestions: [] as string[]
    });
    const [newCustomQuestion, setNewCustomQuestion] = useState('');

    // 페이지 로드 시 localStorage에서 데이터 복원
    useEffect(() => {
        const savedJD = localStorage.getItem('currentJD');
        const savedMessages = localStorage.getItem('chatMessages');
        
        if (savedJD) {
            try {
                const parsedJD = JSON.parse(savedJD);
                setCurrentJD(parsedJD);
                console.log('✅ 저장된 JD 데이터 복원:', parsedJD);
            } catch (e) {
                console.error('JD 데이터 복원 실패:', e);
            }
        }
        
        if (savedMessages) {
            try {
                const parsedMessages = JSON.parse(savedMessages);
                setMessages(parsedMessages);
                console.log('✅ 저장된 채팅 내역 복원:', parsedMessages.length, '개 메시지');
            } catch (e) {
                console.error('채팅 내역 복원 실패:', e);
            }
        }
    }, []);

    // currentJD가 변경될 때마다 자동 저장
    useEffect(() => {
        if (currentJD.title || currentJD.companyName || currentJD.requirements.length > 0) {
            localStorage.setItem('currentJD', JSON.stringify(currentJD));
            console.log('💾 JD 데이터 자동 저장됨');
        }
    }, [currentJD]);

    // 메시지가 변경될 때마다 자동 저장
    useEffect(() => {
        if (messages.length > 1) { // 초기 메시지 제외
            localStorage.setItem('chatMessages', JSON.stringify(messages));
            console.log('💾 채팅 내역 자동 저장됨:', messages.length, '개 메시지');
        }
    }, [messages]);

    // 자동 스크롤
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // 타이핑 애니메이션 효과
    const typeText = (key: string, text: string, speed: number = 30) => {
        let index = 0;
        const interval = setInterval(() => {
            if (index <= text.length) {
                setTypingText(prev => ({ ...prev, [key]: text.substring(0, index) }));
                index++;
            } else {
                clearInterval(interval);
                setTypingText(prev => {
                    const newState = { ...prev };
                    delete newState[key];
                    return newState;
                });
            }
        }, speed);
    };

    // 편집 모드 시작
    const startEdit = () => {
        setEditedJD({ ...currentJD });
        setIsEditMode(true);
    };

    // 편집 저장
    const saveEdit = () => {
        setCurrentJD(editedJD);
        
        // AI에게 변경 사항 알림
        const changeMessage: ChatMessage = {
            role: 'ai',
            text: '**내용이 수정되었습니다.** 변경된 내용을 기억하겠습니다. 추가로 수정하고 싶은 부분이 있으신가요?',
            timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, changeMessage]);
        
        setIsEditMode(false);
    };

    // 편집 취소
    const cancelEdit = () => {
        setEditedJD(currentJD);
        setIsEditMode(false);
    };

    // 배열 항목 업데이트
    const updateArrayItem = (field: keyof CurrentJD, index: number, value: string) => {
        const array = editedJD[field] as string[];
        const newArray = [...array];
        newArray[index] = value;
        setEditedJD({ ...editedJD, [field]: newArray });
    };

    // 배열 항목 추가
    const addArrayItem = (field: keyof CurrentJD) => {
        const array = (editedJD[field] as string[]) || [];
        setEditedJD({ ...editedJD, [field]: [...array, ''] });
    };

    // 배열 항목 삭제
    const removeArrayItem = (field: keyof CurrentJD, index: number) => {
        const array = editedJD[field] as string[];
        const newArray = array.filter((_, i) => i !== index);
        setEditedJD({ ...editedJD, [field]: newArray });
    };

    // 공고 초기화 함수
    const resetJD = () => {
        const confirmed = window.confirm('모든 작성 내용을 초기화하시겠습니까?\n\n이 작업은 취소할 수 없습니다.');
        if (!confirmed) return;
        
        setCurrentJD({
            title: '',
            jobRole: '',
            company: '',
            companyName: '',
            teamName: '',
            location: '',
            scale: '',
            description: '',
            vision: '',
            mission: '',
            techStacks: [],
            responsibilities: [],
            requirements: [],
            preferred: [],
            benefits: []
        });
        setMessages([
            {
                role: 'ai',
                text: '안녕하세요! WINNOW 채용 마스터입니다 🎯 동아리의 정체성을 브랜딩하고, 최고의 신입 부원을 찾는 채용 공고를 함께 만들어볼게요! 먼저, 어떤 동아리이신가요?',
                timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
            }
        ]);
        localStorage.removeItem('currentJD');
        localStorage.removeItem('chatMessages');
        setRequiredCheckCount(0);
        setPreferredCheckCount(0);
        alert('공고 작성이 초기화되었습니다.');
    };

    // 공고 게시 버튼 클릭 시 -> 지원양식 설정 모달 표시
    const handlePublishClick = () => {
        const user = auth.currentUser;
        if (!user) {
            alert('로그인이 필요합니다.');
            return;
        }

        if (!currentJD.title && currentJD.responsibilities.length === 0) {
            alert('게시할 내용이 없습니다.');
            return;
        }

        setShowApplicationFieldsModal(true);
    };

    // 커스텀 질문 추가
    const addCustomQuestion = () => {
        if (newCustomQuestion.trim()) {
            setApplicationFieldsConfig(prev => ({
                ...prev,
                customQuestions: [...prev.customQuestions, newCustomQuestion.trim()]
            }));
            setNewCustomQuestion('');
        }
    };

    // 커스텀 질문 삭제
    const removeCustomQuestion = (index: number) => {
        setApplicationFieldsConfig(prev => ({
            ...prev,
            customQuestions: prev.customQuestions.filter((_, i) => i !== index)
        }));
    };

    // 실제 공고 게시 (모달에서 확인 후)
    const publishJob = async () => {
        const user = auth.currentUser;
        if (!user) {
            alert('로그인이 필요합니다.');
            return;
        }

        if (!currentJD.title && currentJD.responsibilities.length === 0) {
            alert('게시할 내용이 없습니다.');
            return;
        }

        console.log('공고 게시 시작...', currentJD);

        try {
            // undefined 값을 빈 문자열이나 빈 배열로 변환
            const jobData = {
                status: 'published',
                title: currentJD.title || '',
                jobRole: currentJD.jobRole || '',
                company: currentJD.company || '',
                companyName: currentJD.companyName || '',
                teamName: currentJD.teamName || '',
                location: currentJD.location || '',
                scale: currentJD.scale || '',
                description: currentJD.description || '',
                vision: currentJD.vision || '',
                mission: currentJD.mission || '',
                techStacks: currentJD.techStacks || [],
                responsibilities: currentJD.responsibilities || [],
                requirements: currentJD.requirements || [],
                preferred: currentJD.preferred || [],
                benefits: currentJD.benefits || [],
                requiredCheckCount: requiredCheckCount || 0,
                preferredCheckCount: preferredCheckCount || 0,
                // 지원 양식 설정 추가
                applicationFields: applicationFieldsConfig
            };

            console.log('저장할 데이터:', jobData);

            // 백엔드 API로 JD 저장
            const savedJD = await jdAPI.create(jobData);
            
            console.log('JD 저장 완료:', savedJD);
            
            // 모달 닫기
            setShowApplicationFieldsModal(false);
            
            // 화면 초기화
            setCurrentJD({
                title: '',
                jobRole: '',
                company: '',
                companyName: '',
                teamName: '',
                location: '',
                scale: '',
                description: '',
                vision: '',
                mission: '',
                techStacks: [],
                responsibilities: [],
                requirements: [],
                preferred: [],
                benefits: []
            });
            
            // 지원 양식 설정 초기화
            setApplicationFieldsConfig({
                name: true,
                email: true,
                phone: true,
                gender: false,
                birthDate: false,
                university: false,
                major: false,
                portfolio: false,
                customQuestions: []
            });
            
            // 체크 개수 초기화
            setRequiredCheckCount(0);
            setPreferredCheckCount(0);
            
            // 채팅 내역 초기화
            setMessages([
                {
                    role: 'ai',
                    text: '안녕하세요! WINNOW 채용 마스터입니다 🎯 동아리의 정체성을 브랜딩하고, 최고의 신입 부원을 찾는 채용 공고를 함께 만들어볼게요! 먼저, 어떤 동아리이신가요?',
                    timestamp: '오전 10:23'
                }
            ]);
            
            // localStorage 초기화
            localStorage.removeItem('currentJD');
            localStorage.removeItem('chatMessages');
            console.log('💾 localStorage 데이터 삭제됨');
            
            // 임시저장 데이터 초기화는 비활성화 (API 미지원)
            // TODO: 백엔드에 drafts API 구현 후 활성화
            
            // alert 후 내 공고 목록 페이지로 이동
            alert('공고가 성공적으로 게시되었습니다!');
            console.log('내 공고 목록 페이지로 이동합니다.');
            onNavigate('my-jds');
        } catch (error) {
            console.error('공고 게시 오류:', error);
            alert('공고 게시 중 오류가 발생했습니다.');
        }
    };

    const handleSend = async (selectedOption?: string) => {
        const messageText = selectedOption || input.trim();
        if (!messageText || isLoading) return;

        const userMessage: ChatMessage = {
            role: 'user',
            text: messageText,
            timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, userMessage]);
        const currentInput = messageText;
        if (!selectedOption) setInput('');
        setIsLoading(true);

        // "기타" 선택 시 추가 입력 대기
        if (selectedOption === '기타') {
            const followUpMessage: ChatMessage = {
                role: 'ai',
                text: '구체적으로 어떻게 하시나요? 자유롭게 답변해주세요.',
                timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
            };
            setMessages(prev => [...prev, followUpMessage]);
            setWaitingForCustomInput(true);
            setIsLoading(false);
            return;
        }

        // 기타 선택 후 사용자 입력인 경우
        if (waitingForCustomInput) {
            setWaitingForCustomInput(false);
        }

        try {
            // messages 상태를 Gemini API 형식으로 변환 (options 필드 제외)
            const conversationHistory = messages.map(msg => ({
                role: (msg.role === 'ai' ? 'model' : 'user') as 'user' | 'model',
                text: maskSensitiveData(msg.parts?.[0]?.text || msg.text || '')
            }));

            // 민감 정보 마스킹 후 API 호출
            const sanitizedMessage = maskSensitiveData(currentInput);
            const response = await geminiAPI.chat(sanitizedMessage, conversationHistory);
            
            // 응답 검증
            if (!response || typeof response !== 'object') {
                throw new Error('Invalid response from AI');
            }
            
            // AI로부터 받은 선택지 사용 (없으면 undefined)
            let aiOptions: string[] | undefined = undefined;
            try {
                if (response.options && Array.isArray(response.options) && response.options.length > 0) {
                    aiOptions = response.options.filter((opt: any) => typeof opt === 'string' && opt.trim().length > 0);
                    if (aiOptions && aiOptions.length === 0) {
                        aiOptions = undefined;
                    }
                }
            } catch (optError) {
                console.warn('Options processing error:', optError);
                aiOptions = undefined;
            }
            
            // 1. 채팅 메시지 추가: aiResponse 필드 사용
            const chatMessageText = response.aiResponse || '응답을 받았습니다.';
            
            const aiMessage: ChatMessage = {
                role: 'ai',
                text: chatMessageText,
                timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
                options: aiOptions
            };
            
            setMessages(prev => [...prev, aiMessage]);
            
            // 2. 미리보기 업데이트: jdData가 있으면 기존 상태와 병합
            if (response.jdData && typeof response.jdData === 'object') {
                const newJD = {
                    title: response.jdData.title || currentJD.title || '',
                    jobRole: response.jdData.jobRole || currentJD.jobRole || '',
                    company: response.jdData.company || currentJD.company || '',
                    companyName: response.jdData.companyName || currentJD.companyName || '',
                    teamName: response.jdData.teamName || currentJD.teamName || '',
                    location: response.jdData.location || currentJD.location || '',
                    scale: response.jdData.scale || currentJD.scale || '',
                    description: response.jdData.description || currentJD.description || '',
                    vision: response.jdData.vision || currentJD.vision || '',
                    mission: response.jdData.mission || currentJD.mission || '',
                    techStacks: (response.jdData.techStacks && response.jdData.techStacks.length > 0)
                        ? response.jdData.techStacks
                        : currentJD.techStacks || [],
                    responsibilities: (response.jdData.responsibilities && response.jdData.responsibilities.length > 0) 
                        ? response.jdData.responsibilities 
                        : currentJD.responsibilities || [],
                    requirements: (response.jdData.requirements && response.jdData.requirements.length > 0) 
                        ? response.jdData.requirements 
                        : currentJD.requirements || [],
                    preferred: (response.jdData.preferred && response.jdData.preferred.length > 0) 
                        ? response.jdData.preferred 
                        : currentJD.preferred || [],
                    benefits: (response.jdData.benefits && response.jdData.benefits.length > 0) 
                        ? response.jdData.benefits 
                        : currentJD.benefits || []
                };
                
                // 타이핑 애니메이션 적용 - 새로운 값이 있을 때만
                if (response.jdData.title && response.jdData.title !== currentJD.title) {
                    typeText('title', response.jdData.title);
                }
                if (response.jdData.companyName && response.jdData.companyName !== currentJD.companyName) {
                    typeText('companyName', response.jdData.companyName, 20);
                }
                if (response.jdData.description && response.jdData.description !== currentJD.description) {
                    typeText('description', response.jdData.description, 20);
                }
                if (response.jdData.vision && response.jdData.vision !== currentJD.vision) {
                    typeText('vision', response.jdData.vision, 20);
                }
                if (response.jdData.mission && response.jdData.mission !== currentJD.mission) {
                    typeText('mission', response.jdData.mission, 20);
                }
                if (response.jdData.location && response.jdData.location !== currentJD.location) {
                    typeText('location', response.jdData.location, 15);
                }
                if (response.jdData.scale && response.jdData.scale !== currentJD.scale) {
                    typeText('scale', response.jdData.scale, 15);
                }
                
                console.log('JD 업데이트:', newJD);
                setCurrentJD(prev => ({ ...prev, ...newJD }));
                
                // 배열 필드들도 즉시 반영되도록 보장
                setTimeout(() => {
                    setCurrentJD(prev => ({ ...prev, ...newJD }));
                }, 100);
            }
        } catch (error) {
            console.error('Error generating JD:', error);
            const errorMessage: ChatMessage = {
                role: 'ai',
                text: '죄송합니다. 오류가 발생했습니다. 다시 시도해주세요.',
                timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex bg-gray-100 rounded-2xl border border-gray-200 shadow-xl overflow-hidden w-full gap-3" style={{ height: 'calc(100% - 0px)', zoom: '0.75'}}>
            {/* Chat Area - Left */}
            <div className="w-[35%] flex flex-col bg-white rounded-l-2xl border border-gray-200 shadow-sm">
                <div className="p-5 border-b border-gray-200 bg-white flex justify-between items-center h-[70px]">
                    <div className="flex items-center gap-2.5 font-bold text-[15px] text-gray-800">
                        <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-sm"><MessageSquare size={14} fill="white"/></div>
                        JD 생성 매니저
                    </div>
                    <button 
                        onClick={() => {
                            if (currentJD.title || messages.length > 1) {
                                const confirmed = window.confirm('작성 중인 내용이 있습니다. 새로 시작하시겠습니까?\n\n현재 내용은 자동으로 저장되어 다음에 다시 불러올 수 있습니다.');
                                if (!confirmed) return;
                            }
                            // 새로운 채팅 시작 (localStorage는 유지)
                            setCurrentJD({
                                title: '',
                                jobRole: '',
                                company: '',
                                companyName: '',
                                teamName: '',
                                location: '',
                                scale: '',
                                description: '',
                                vision: '',
                                mission: '',
                                techStacks: [],
                                responsibilities: [],
                                requirements: [],
                                preferred: [],
                                benefits: []
                            });
                            setMessages([
                                {
                                    role: 'ai',
                                    text: '안녕하세요! WINNOW 채용 마스터입니다 🎯 동아리의 정체성을 브랜딩하고, 최고의 신입 부원을 찾는 채용 공고를 함께 만들어볼게요! 먼저, 어떤 동아리이신가요?',
                                    timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
                                }
                            ]);
                            localStorage.removeItem('currentJD');
                            localStorage.removeItem('chatMessages');
                        }}
                        className="text-gray-400 cursor-pointer hover:text-gray-600 transition-colors"
                        title="새로 시작"
                    >
                        <X size={18} />
                    </button>
                </div>
                
                <div className="flex-1 p-5 space-y-6 overflow-y-auto scrollbar-hide bg-[#F8FAFC]" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    {messages.map((msg, idx) => (
                        <div key={idx} className="flex gap-3 flex-col">
                            <div className="flex gap-3">
                                {msg.role === 'ai' && (
                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-blue-600 border border-blue-200">AI</div>
                                )}
                                <div className={`space-y-1 max-w-[260px] ${msg.role === 'user' ? 'ml-auto' : ''}`}>
                                    <div className={`p-3.5 rounded-2xl text-[13px] shadow-sm border leading-relaxed ${
                                        msg.role === 'ai' 
                                            ? 'bg-white rounded-tl-none text-gray-700 border-gray-100' 
                                            : 'bg-blue-600 rounded-tr-none text-white border-blue-600'
                                    }`}>
                                        {msg.role === 'ai' ? (
                                            <span dangerouslySetInnerHTML={{ 
                                                __html: (() => {
                                                    // JSON 객체가 아닌 순수 텍스트만 표시
                                                    let displayText = msg.text;
                                                    try {
                                                        // JSON 형태의 문자열이면 파싱 시도
                                                        const parsed = JSON.parse(msg.text);
                                                        // aiResponse 필드가 있으면 그것만 사용
                                                        if (parsed.aiResponse) {
                                                            displayText = parsed.aiResponse;
                                                        }
                                                    } catch (e) {
                                                        // JSON이 아니면 원본 텍스트 사용
                                                        displayText = msg.text;
                                                    }
                                                    return displayText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>');
                                                })()
                                            }} />
                                        ) : (
                                            msg.text
                                        )}
                                    </div>
                                    <div className={`text-[10px] text-gray-400 ${msg.role === 'user' ? 'text-right pr-1' : 'pl-1'}`}>{msg.timestamp}</div>
                                </div>
                            </div>
                            
                            {/* 선택지 버튼 */}
                            {msg.role === 'ai' && msg.options && Array.isArray(msg.options) && msg.options.length > 0 && (
                                <div className="flex flex-col gap-2 ml-11">
                                    {msg.options.map((option, optIdx) => (
                                        <button
                                            key={optIdx}
                                            onClick={() => handleSend(option)}
                                            disabled={isLoading}
                                            className="px-4 py-2.5 bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-400 rounded-lg text-[13px] font-medium text-gray-700 hover:text-blue-600 transition-all text-left disabled:opacity-50"
                                        >
                                            {option}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => handleSend('이 질문은 건너뛰겠습니다')}
                                        disabled={isLoading}
                                        className="px-4 py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-300 hover:border-gray-400 rounded-lg text-[13px] font-medium text-gray-500 hover:text-gray-700 transition-all text-center disabled:opacity-50"
                                    >
                                        건너뛰기
                                    </button>
                                </div>
                            )}
                            
                            {/* 일반 질문에도 건너뛰기 버튼 표시 (선택지가 없고, 마지막 메시지이고, AI 메시지인 경우) */}
                            {msg.role === 'ai' && !msg.options && idx === messages.length - 1 && !isLoading && (
                                <div className="flex justify-start ml-11 mt-2">
                                    <button
                                        onClick={() => handleSend('이 질문은 건너뛰겠습니다')}
                                        disabled={isLoading}
                                        className="px-4 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-300 hover:border-gray-400 rounded-lg text-[12px] font-medium text-gray-500 hover:text-gray-700 transition-all disabled:opacity-50"
                                    >
                                        건너뛰기
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-blue-600 border border-blue-200">AI</div>
                            <div className="bg-white p-3.5 rounded-2xl rounded-tl-none text-[13px] text-gray-400 shadow-sm border border-gray-100">
                                응답 생성 중...
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>

                <div className="p-4 bg-white border-t border-gray-100">
                    <div className="relative">
                        <textarea 
                            placeholder="답변을 입력하세요..." 
                            value={input}
                            onChange={(e) => {
                                setInput(e.target.value);
                                // 자동 높이 조절
                                e.target.style.height = 'auto';
                                e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
                            }}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            disabled={isLoading}
                            rows={1}
                            className="w-full pl-4 pr-12 py-3.5 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-[13px] font-medium placeholder:text-gray-400 shadow-inner resize-none overflow-y-auto"
                            style={{ minHeight: '52px', maxHeight: '150px' }}
                        />
                        <button 
                            onClick={() => handleSend()}
                            disabled={isLoading}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50"
                        >
                            <ChevronRight size={18}/>
                        </button>
                    </div>
                </div>
            </div>

            {/* Preview Area - Right */}
            <div className="flex-1 bg-white flex relative overflow-hidden rounded-r-2xl border border-gray-200 shadow-sm">
                
                {/* Left Profile Section */}
                <div className="w-[240px] border-r border-gray-100 flex flex-col bg-[#FAFBFC] overflow-y-auto">
                    {/* Profile Image */}
                    <div className="px-6 flex flex-col items-center pt-8">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 mb-4 shadow-lg overflow-hidden">
                            <img 
                                src={selectedImage}
                                alt="Profile" 
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <h3 className="font-bold text-[17px] text-gray-900 mb-1">
                            {currentJD.companyName || currentJD.teamName ? (
                                <span>
                                    {typingText['companyName'] !== undefined 
                                        ? typingText['companyName'] 
                                        : (currentJD.companyName || currentJD.teamName)}
                                    {typingText['companyName'] !== undefined && <span className="animate-pulse">|</span>}
                                </span>
                            ) : (
                                <span className="text-gray-400">동아리 이름</span>
                            )}
                        </h3>
                        <p className="text-[12px] text-gray-500 font-semibold mb-6">
                            {currentJD.jobRole || <span className="text-gray-400">모집 분야</span>}
                        </p>
                    </div>

                    {/* Location & Scale */}
                    <div className="px-6 space-y-4 mb-6">
                        <div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">LOCATION</div>
                            <div className="flex items-center gap-2 text-[13px]">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                {currentJD.location ? (
                                    <span className="text-gray-700">
                                        {typingText['location'] !== undefined ? typingText['location'] : currentJD.location}
                                        {typingText['location'] !== undefined && <span className="animate-pulse">|</span>}
                                    </span>
                                ) : (
                                    <span className="text-gray-400">아직 설정되지 않았습니다</span>
                                )}
                            </div>
                        </div>
                        
                        <div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">SCALE</div>
                            <div className="flex items-center gap-2 text-[13px]">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                {currentJD.scale ? (
                                    <span className="text-gray-700">
                                        {typingText['scale'] !== undefined ? typingText['scale'] : currentJD.scale}
                                        {typingText['scale'] !== undefined && <span className="animate-pulse">|</span>}
                                    </span>
                                ) : (
                                    <span className="text-gray-400">아직 설정되지 않았습니다</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Tech Stack */}
                    {currentJD.techStacks && currentJD.techStacks.length > 0 && (
                        <div className="px-6 mb-6">
                            <div className="flex items-center gap-2 mb-3">
                                <svg className="w-4 h-4 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                                <span className="font-bold text-[13px] text-gray-800">Tech Stack & Skills</span>
                            </div>
                            <div className="space-y-2">
                                {currentJD.techStacks.map((tech, idx) => (
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
                <div className="flex-1 flex flex-col overflow-hidden">
                    
                    <div className="flex-1 overflow-y-auto p-8 space-y-8 pt-8">
                        {!currentJD.title && currentJD.responsibilities.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center">
                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                    <FileText size={32} className="text-gray-300"/>
                                </div>
                                <h4 className="font-bold text-gray-400 mb-2">아직 작성된 내용이 없습니다.</h4>
                                <p className="text-[13px] text-gray-400 max-w-xs leading-relaxed">왼쪽 채팅창에서 AI 매니저와 대화를 나누면, 이곳에 채용 공고가 실시간으로 완성됩니다.</p>
                            </div>
                        ) : (
                            <>
                                {/* 공고 제목 */}
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900 mb-4">
                                        {isEditMode ? (
                                            <input
                                                type="text"
                                                value={editedJD.title}
                                                onChange={(e) => setEditedJD({ ...editedJD, title: e.target.value })}
                                                placeholder="공고 제목을 입력하세요"
                                                className="w-full px-3 py-2 border border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        ) : currentJD.title ? (
                                            <>
                                                {typingText['title'] !== undefined ? typingText['title'] : currentJD.title}
                                                {typingText['title'] !== undefined && <span className="animate-pulse">|</span>}
                                            </>
                                        ) : (
                                            <span className="text-gray-400">공고 제목이 여기에 표시됩니다</span>
                                        )}
                                    </h1>
                                    
                                    {/* 편집 모드 전용: 기본 정보 입력 필드 */}
                                    {isEditMode && (
                                        <div className="space-y-3 mb-6 bg-blue-50/30 p-4 rounded-lg border border-blue-200">
                                            <div>
                                                <label className="block text-[11px] font-bold text-gray-600 mb-1.5">동아리명</label>
                                                <input
                                                    type="text"
                                                    value={editedJD.companyName}
                                                    onChange={(e) => setEditedJD({ ...editedJD, companyName: e.target.value })}
                                                    placeholder="동아리 이름을 입력하세요"
                                                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-[13px]"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-bold text-gray-600 mb-1.5">모집 분야</label>
                                                <input
                                                    type="text"
                                                    value={editedJD.jobRole}
                                                    onChange={(e) => setEditedJD({ ...editedJD, jobRole: e.target.value })}
                                                    placeholder="모집 분야를 입력하세요"
                                                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-[13px]"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-bold text-gray-600 mb-1.5">활동 장소</label>
                                                <input
                                                    type="text"
                                                    value={editedJD.location}
                                                    onChange={(e) => setEditedJD({ ...editedJD, location: e.target.value })}
                                                    placeholder="활동 장소를 입력하세요"
                                                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-[13px]"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-bold text-gray-600 mb-1.5">동아리 규모</label>
                                                <input
                                                    type="text"
                                                    value={editedJD.scale}
                                                    onChange={(e) => setEditedJD({ ...editedJD, scale: e.target.value })}
                                                    placeholder="동아리 규모를 입력하세요 (예: 소규모/중규모 동아리)"
                                                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-[13px]"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* 동아리 소개 (ABOUT US) */}
                                {(currentJD.description || isEditMode) && (
                                    <div className="space-y-3">
                                        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100 rounded-lg p-5">
                                            <h4 className="text-[11px] font-bold text-blue-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M10 2a8 8 0 100 16 8 8 0 000-16zM9 9a1 1 0 112 0v4a1 1 0 11-2 0V9zm1-5a1 1 0 100 2 1 1 0 000-2z"/>
                                                </svg>
                                                동아리 소개
                                            </h4>
                                            {isEditMode ? (
                                                <textarea
                                                    value={editedJD.description}
                                                    onChange={(e) => setEditedJD({ ...editedJD, description: e.target.value })}
                                                    placeholder="동아리의 활동, 분위기, 특징 등을 소개하는 글을 입력하세요"
                                                    className="w-full px-3 py-2 border border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-[13px]"
                                                    rows={4}
                                                />
                                            ) : (
                                                <p className="text-[14px] text-gray-700 leading-relaxed">
                                                    {typingText['description'] !== undefined ? typingText['description'] : currentJD.description}
                                                    {typingText['description'] !== undefined && <span className="animate-pulse">|</span>}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* VISION & MISSION */}
                                {((currentJD.vision || currentJD.mission) || isEditMode) && (
                                    <div className="space-y-4">
                                        <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-5">
                                            <h4 className="text-[11px] font-bold text-blue-600 uppercase tracking-wider mb-2">VISION & MISSION</h4>
                                            <div className="space-y-3">
                                                {(currentJD.vision || isEditMode) && (
                                                    <div>
                                                        <h5 className="font-bold text-[13px] text-gray-800 mb-1">우리의 비전</h5>
                                                        {isEditMode ? (
                                                            <textarea
                                                                value={editedJD.vision}
                                                                onChange={(e) => setEditedJD({ ...editedJD, vision: e.target.value })}
                                                                placeholder="비전을 입력하세요"
                                                                className="w-full px-3 py-2 border border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-[13px]"
                                                                rows={3}
                                                            />
                                                        ) : (
                                                            <p className="text-[13px] text-gray-700 leading-relaxed">
                                                                {typingText['vision'] !== undefined ? typingText['vision'] : currentJD.vision}
                                                                {typingText['vision'] !== undefined && <span className="animate-pulse">|</span>}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                                {(currentJD.mission || isEditMode) && (
                                                    <div>
                                                        <h5 className="font-bold text-[13px] text-gray-800 mb-1">우리의 미션</h5>
                                                        {isEditMode ? (
                                                            <textarea
                                                                value={editedJD.mission}
                                                                onChange={(e) => setEditedJD({ ...editedJD, mission: e.target.value })}
                                                                placeholder="미션을 입력하세요"
                                                                className="w-full px-3 py-2 border border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-[13px]"
                                                                rows={3}
                                                            />
                                                        ) : (
                                                            <p className="text-[13px] text-gray-700 leading-relaxed">
                                                                {typingText['mission'] !== undefined ? typingText['mission'] : currentJD.mission}
                                                                {typingText['mission'] !== undefined && <span className="animate-pulse">|</span>}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* 자격 요건 (CHECKLIST) */}
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">자격 요건 (CHECKLIST)</h4>
                                        {isEditMode && (
                                            <button
                                                onClick={() => addArrayItem('requirements')}
                                                className="text-[11px] font-semibold text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                                            >
                                                + 추가
                                            </button>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        {isEditMode ? (
                                            editedJD.requirements && editedJD.requirements.length > 0 ? (
                                                editedJD.requirements.map((item, idx) => (
                                                    <div key={idx} className="flex items-start gap-2">
                                                        <input
                                                            type="text"
                                                            value={item}
                                                            onChange={(e) => updateArrayItem('requirements', idx, e.target.value)}
                                                            placeholder="자격 요건을 입력하세요"
                                                            className="flex-1 px-3 py-2 border border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-[13px]"
                                                        />
                                                        <button
                                                            onClick={() => removeArrayItem('requirements', idx)}
                                                            className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-[13px] text-gray-400 p-3">항목을 추가하세요.</p>
                                            )
                                        ) : (
                                            currentJD.requirements.length > 0 ? currentJD.requirements.map((item, idx) => (
                                                <label key={idx} className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors group">
                                                    <input type="checkbox" className="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                                                    <span className="text-[13px] text-gray-700 leading-relaxed group-hover:text-gray-900">{item}</span>
                                                </label>
                                            )) : (
                                                <p className="text-[13px] text-gray-400 p-3">아직 설정되지 않았습니다.</p>
                                            )
                                        )}
                                    </div>
                                </div>

                                {/* 우대 사항 (PREFERRED) */}
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">우대 사항 (PREFERRED)</h4>
                                        {isEditMode && (
                                            <button
                                                onClick={() => addArrayItem('preferred')}
                                                className="text-[11px] font-semibold text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                                            >
                                                + 추가
                                            </button>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        {isEditMode ? (
                                            editedJD.preferred && editedJD.preferred.length > 0 ? (
                                                editedJD.preferred.map((item, idx) => (
                                                    <div key={idx} className="flex items-start gap-2">
                                                        <input
                                                            type="text"
                                                            value={item}
                                                            onChange={(e) => updateArrayItem('preferred', idx, e.target.value)}
                                                            placeholder="우대 사항을 입력하세요"
                                                            className="flex-1 px-3 py-2 border border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-[13px]"
                                                        />
                                                        <button
                                                            onClick={() => removeArrayItem('preferred', idx)}
                                                            className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-[13px] text-gray-400 p-3">항목을 추가하세요.</p>
                                            )
                                        ) : (
                                            currentJD.preferred.length > 0 ? currentJD.preferred.map((item, idx) => (
                                                <label key={idx} className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors group">
                                                    <input type="checkbox" className="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                                                    <span className="text-[13px] text-gray-700 leading-relaxed group-hover:text-gray-900">{item}</span>
                                                </label>
                                            )) : (
                                                <p className="text-[13px] text-gray-400 p-3">아직 설정되지 않았습니다.</p>
                                            )
                                        )}
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="pt-6 border-t border-gray-100 flex justify-end items-center gap-2">
                                    {!isEditMode ? (
                                        <>
                                            <button onClick={resetJD} className="px-4 py-2.5 border border-red-300 text-red-600 rounded-lg text-[13px] font-bold hover:bg-red-50 transition-colors">초기화</button>
                                            <button onClick={startEdit} className="px-4 py-2.5 border border-blue-500 text-blue-600 rounded-lg text-[13px] font-bold hover:bg-blue-50 transition-colors">편집</button>
                                            <button onClick={handlePublishClick} className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-[13px] font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all">공고 게시</button>
                                        </>
                                    ) : (
                                        <>
                                            <button onClick={cancelEdit} className="px-4 py-2.5 border border-gray-200 rounded-lg text-[13px] font-bold text-gray-600 hover:bg-gray-50 transition-colors">취소</button>
                                            <button onClick={saveEdit} className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-[13px] font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all">저장</button>
                                        </>
                                    )}
                                </div>

                                {/* Branding */}
                                <div className="text-right pt-4">
                                    <p className="text-[11px] font-bold text-gray-400">WINNOW Recruiting Team</p>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
            
            {/* 지원 양식 커스터마이징 모달 */}
            {showApplicationFieldsModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full max-h-[85vh] overflow-hidden shadow-2xl border border-gray-200">
                        {/* 모달 헤더 */}
                        <div className="px-6 py-5 border-b border-gray-100">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-[17px] font-bold text-gray-900">지원 양식 설정</h2>
                                    <p className="text-[12px] text-gray-500 mt-1">지원자로부터 받을 정보를 선택하세요</p>
                                </div>
                                <button 
                                    onClick={() => setShowApplicationFieldsModal(false)}
                                    className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>
                        
                        {/* 모달 본문 */}
                        <div className="p-6 overflow-y-auto max-h-[55vh]">
                            {/* 필수 정보 */}
                            <div className="mb-6">
                                <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">필수 정보</h3>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between py-2.5 px-3 bg-gray-50 rounded-lg">
                                        <span className="text-[13px] font-medium text-gray-500">이름</span>
                                        <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center">
                                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between py-2.5 px-3 bg-gray-50 rounded-lg">
                                        <span className="text-[13px] font-medium text-gray-500">이메일</span>
                                        <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center">
                                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* 선택 정보 */}
                            <div className="mb-6">
                                <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">선택 정보</h3>
                                <div className="space-y-2">
                                    <label className="flex items-center justify-between py-2.5 px-3 bg-white border border-gray-200 rounded-lg hover:border-blue-400 cursor-pointer transition-all group">
                                        <span className="text-[13px] font-medium text-gray-700 group-hover:text-gray-900">전화번호</span>
                                        <input 
                                            type="checkbox" 
                                            checked={applicationFieldsConfig.phone}
                                            onChange={(e) => setApplicationFieldsConfig({...applicationFieldsConfig, phone: e.target.checked})}
                                            className="w-[18px] h-[18px] text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                        />
                                    </label>
                                    <label className="flex items-center justify-between py-2.5 px-3 bg-white border border-gray-200 rounded-lg hover:border-blue-400 cursor-pointer transition-all group">
                                        <span className="text-[13px] font-medium text-gray-700 group-hover:text-gray-900">성별</span>
                                        <input 
                                            type="checkbox" 
                                            checked={applicationFieldsConfig.gender}
                                            onChange={(e) => setApplicationFieldsConfig({...applicationFieldsConfig, gender: e.target.checked})}
                                            className="w-[18px] h-[18px] text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                        />
                                    </label>
                                    <label className="flex items-center justify-between py-2.5 px-3 bg-white border border-gray-200 rounded-lg hover:border-blue-400 cursor-pointer transition-all group">
                                        <span className="text-[13px] font-medium text-gray-700 group-hover:text-gray-900">생년월일</span>
                                        <input 
                                            type="checkbox" 
                                            checked={applicationFieldsConfig.birthDate}
                                            onChange={(e) => setApplicationFieldsConfig({...applicationFieldsConfig, birthDate: e.target.checked})}
                                            className="w-[18px] h-[18px] text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                        />
                                    </label>
                                    <label className="flex items-center justify-between py-2.5 px-3 bg-white border border-gray-200 rounded-lg hover:border-blue-400 cursor-pointer transition-all group">
                                        <span className="text-[13px] font-medium text-gray-700 group-hover:text-gray-900">학교</span>
                                        <input 
                                            type="checkbox" 
                                            checked={applicationFieldsConfig.university}
                                            onChange={(e) => setApplicationFieldsConfig({...applicationFieldsConfig, university: e.target.checked})}
                                            className="w-[18px] h-[18px] text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                        />
                                    </label>
                                    <label className="flex items-center justify-between py-2.5 px-3 bg-white border border-gray-200 rounded-lg hover:border-blue-400 cursor-pointer transition-all group">
                                        <span className="text-[13px] font-medium text-gray-700 group-hover:text-gray-900">전공</span>
                                        <input 
                                            type="checkbox" 
                                            checked={applicationFieldsConfig.major}
                                            onChange={(e) => setApplicationFieldsConfig({...applicationFieldsConfig, major: e.target.checked})}
                                            className="w-[18px] h-[18px] text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                        />
                                    </label>
                                    <label className="flex items-center justify-between py-2.5 px-3 bg-white border border-gray-200 rounded-lg hover:border-blue-400 cursor-pointer transition-all group">
                                        <span className="text-[13px] font-medium text-gray-700 group-hover:text-gray-900">포트폴리오 링크</span>
                                        <input 
                                            type="checkbox" 
                                            checked={applicationFieldsConfig.portfolio}
                                            onChange={(e) => setApplicationFieldsConfig({...applicationFieldsConfig, portfolio: e.target.checked})}
                                            className="w-[18px] h-[18px] text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                        />
                                    </label>
                                </div>
                            </div>
                            
                            {/* 자격요건 체크 설정 */}
                            {currentJD.requirements && currentJD.requirements.length > 0 && (
                                <div className="mb-6">
                                    <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">자격요건 체크 설정</h3>
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                        <p className="text-[12px] text-gray-600 mb-3">
                                            지원자가 최소한 몇 개의 자격요건을 충족해야 하는지 설정하세요.
                                        </p>
                                        <div className="flex items-center gap-3">
                                            <span className="text-[13px] font-semibold text-gray-700">총 {currentJD.requirements.length}개 중</span>
                                            <select
                                                value={requiredCheckCount}
                                                onChange={(e) => setRequiredCheckCount(Number(e.target.value))}
                                                className="flex-1 px-3 py-2 border border-blue-300 rounded-lg text-[13px] font-semibold focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                            >
                                                <option value={0}>체크 필수 없음</option>
                                                {Array.from({ length: currentJD.requirements.length }, (_, i) => i + 1).map(num => (
                                                    <option key={num} value={num}>최소 {num}개 필수</option>
                                                ))}
                                            </select>
                                            <span className="text-[13px] text-gray-600">체크 필요</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 우대사항 체크 설정 */}
                            {currentJD.preferred && currentJD.preferred.length > 0 && (
                                <div className="mb-6">
                                    <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">우대사항 체크 설정</h3>
                                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                        <p className="text-[12px] text-gray-600 mb-3">
                                            지원자가 최소한 몇 개의 우대사항을 충족해야 하는지 설정하세요.
                                        </p>
                                        <div className="flex items-center gap-3">
                                            <span className="text-[13px] font-semibold text-gray-700">총 {currentJD.preferred.length}개 중</span>
                                            <select
                                                value={preferredCheckCount}
                                                onChange={(e) => setPreferredCheckCount(Number(e.target.value))}
                                                className="flex-1 px-3 py-2 border border-purple-300 rounded-lg text-[13px] font-semibold focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                                            >
                                                <option value={0}>체크 필수 없음</option>
                                                {Array.from({ length: currentJD.preferred.length }, (_, i) => i + 1).map(num => (
                                                    <option key={num} value={num}>최소 {num}개 필수</option>
                                                ))}
                                            </select>
                                            <span className="text-[13px] text-gray-600">체크 필요</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            {/* 커스텀 질문 */}
                            <div>
                                <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">추가 질문</h3>
                                
                                {/* 추가된 질문 목록 */}
                                {applicationFieldsConfig.customQuestions.length > 0 && (
                                    <div className="space-y-2 mb-3">
                                        {applicationFieldsConfig.customQuestions.map((question, idx) => (
                                            <div key={idx} className="flex items-center gap-3 py-2.5 px-3 bg-blue-50 border border-blue-100 rounded-lg">
                                                <span className="text-[12px] font-bold text-blue-600 shrink-0">Q{idx + 1}</span>
                                                <span className="flex-1 text-[13px] text-gray-700 truncate">{question}</span>
                                                <button
                                                    onClick={() => removeCustomQuestion(idx)}
                                                    className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors shrink-0"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                
                                {/* 새 질문 입력 */}
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newCustomQuestion}
                                        onChange={(e) => setNewCustomQuestion(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && addCustomQuestion()}
                                        placeholder="질문을 입력하세요"
                                        className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg text-[13px] focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400"
                                    />
                                    <button
                                        onClick={addCustomQuestion}
                                        disabled={!newCustomQuestion.trim()}
                                        className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-[13px] font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        추가
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        {/* 모달 푸터 */}
                        <div className="border-t border-gray-100 px-6 py-4 bg-[#FAFBFC] flex justify-end items-center gap-2">
                            <button
                                onClick={() => setShowApplicationFieldsModal(false)}
                                className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-[13px] font-semibold hover:bg-gray-50 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={publishJob}
                                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-[13px] font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all"
                            >
                                공고 게시
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
