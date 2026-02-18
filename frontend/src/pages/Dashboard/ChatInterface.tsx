import { ChevronRight, MessageSquare, X, FileText } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { maskSensitiveData } from '../../utils/security';
import { auth } from '../../config/firebase';
import { jdAPI, geminiAPI } from '@/services/api';

interface CurrentJD {
    title: string;
    type?: 'company' | 'club';
    jobRole?: string;
    company?: string;
    companyName?: string;
    teamName?: string;
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
    benefits: string[];
    // 필수 체크 개수 설정
    requiredCheckCount?: number;
    preferredCheckCount?: number;
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
    // 동아리 모집 일정 필드
    recruitmentPeriod?: string;
    recruitmentTarget?: string;
    recruitmentCount?: string;
    recruitmentProcess?: string[];
    activitySchedule?: string;
    membershipFee?: string;
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
    // 기본 JD 초기값
    const getDefaultJD = (type: 'company' | 'club' = 'club'): CurrentJD => ({
        title: '', type, jobRole: '', company: '', companyName: '', teamName: '',
        location: '', scale: '', description: '', vision: '', mission: '', techStacks: [],
        responsibilities: [], requirements: [], preferred: [], benefits: [],
        requirementTypes: {}, preferredTypes: {},
        recruitmentPeriod: '', recruitmentTarget: '', recruitmentCount: '',
        recruitmentProcess: [], activitySchedule: '', membershipFee: ''
    });

    const getTypeSelectionMessage = (): ChatMessage => ({
        role: 'ai',
        text: '안녕하세요! WINNOW 채용 마스터입니다 🎯\n어떤 유형의 공고를 만들어 볼까요?',
        timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        options: ['회사 채용공고', '동아리 모집공고']
    });

    const getDefaultMessage = (type: 'company' | 'club' = 'club'): ChatMessage => ({
        role: 'ai',
        text: type === 'club'
            ? '동아리 모집공고를 만들어 볼게요! 🎯 동아리의 정체성을 브랜딩하고, 최고의 신입 부원을 찾는 공고를 함께 만들어볼게요!\n\n먼저, 동아리 이름이 무엇인가요?'
            : '회사 채용공고를 만들어 볼게요! 🎯 기업의 핵심 인재를 찾는 채용 공고를 함께 만들어볼게요!\n\n먼저, 회사 이름이 무엇인가요?',
        timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    });

    // 공고 유형 상태
    const [jdType, setJdType] = useState<'company' | 'club'>('club');
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
    const [messages, setMessages] = useState<ChatMessage[]>([getTypeSelectionMessage()]);
    const [messageHistory, setMessageHistory] = useState<ChatMessage[][]>([[getTypeSelectionMessage()]]); // 되돌리기용 히스토리
    const [waitingForCustomInput, setWaitingForCustomInput] = useState(false);
    const [currentJD, setCurrentJD] = useState<CurrentJD>(getDefaultJD('club'));
    const [isLoading, setIsLoading] = useState(false);
    const [typingText, setTypingText] = useState<{ [key: string]: string }>({});
    const [isTypingAI, setIsTypingAI] = useState(false); // AI 응답 타이핑 중 상태
    const chatEndRef = useRef<HTMLDivElement>(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editedJD, setEditedJD] = useState<CurrentJD>(currentJD);
    
    // 채팅방 크기 조절 상태
    const [chatWidth, setChatWidth] = useState(35); // 퍼센트 단위
    const [chatHeight, setChatHeight] = useState(95); // vh 단위
    const [isWidthResizing, setIsWidthResizing] = useState(false);
    const [isHeightResizing, setIsHeightResizing] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    
    // 모바일 탭 상태 (chat 또는 preview)
    const [mobileTab, setMobileTab] = useState<'chat' | 'preview'>('chat');
    const [isMobile, setIsMobile] = useState(false);
    
    // 모바일 감지
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);
    
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
        customQuestions: [] as string[],
        skillOptions: [] as { category: string; skills: string[] }[]
    });
    const [newCustomQuestion, setNewCustomQuestion] = useState('');
    
    // 배너 이미지 업로드 상태
    const [bannerImageFile, setBannerImageFile] = useState<File | null>(null);
    const [bannerImagePreview, setBannerImagePreview] = useState<string | null>(null);
    const [newSkillCategory, setNewSkillCategory] = useState('');
    const [newSkillItem, setNewSkillItem] = useState('');
    const [editingSkillCategoryIdx, setEditingSkillCategoryIdx] = useState<number | null>(null);

    // 페이지 로드 시 localStorage에서 데이터 복원
    useEffect(() => {
        const savedJD = localStorage.getItem('currentJD');
        const savedMessages = localStorage.getItem('chatMessages');
        
        if (savedJD) {
            try {
                const parsedJD = JSON.parse(savedJD);
                setCurrentJD(parsedJD);
                if (parsedJD.type) setJdType(parsedJD.type);
                console.log('✅ 저장된 공고 데이터 복원:', parsedJD);
            } catch (e) {
                console.error('공고 데이터 복원 실패:', e);
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

    // 공고 데이터가 변경될 때마다 자동 저장
    useEffect(() => {
        if (currentJD.title || currentJD.companyName || currentJD.requirements.length > 0) {
            localStorage.setItem('currentJD', JSON.stringify(currentJD));
            console.log('💾 공고 데이터 자동 저장됨');
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

    // 크기 조절 핸들러
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isWidthResizing) {
                const container = containerRef.current;
                if (!container) return;
                
                const containerRect = container.getBoundingClientRect();
                const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
                
                // 최소 25%, 최대 60%로 제한
                if (newWidth >= 25 && newWidth <= 60) {
                    setChatWidth(newWidth);
                }
            }

            if (isHeightResizing) {
                const container = containerRef.current;
                if (!container) return;
                
                const containerRect = container.getBoundingClientRect();
                const windowHeight = window.innerHeight;
                const newHeight = ((e.clientY - containerRect.top) / windowHeight) * 100;
                
                // 최소 50vh, 최대 95vh로 제한
                if (newHeight >= 50 && newHeight <= 95) {
                    setChatHeight(newHeight);
                }
            }
        };

        const handleMouseUp = () => {
            setIsWidthResizing(false);
            setIsHeightResizing(false);
        };

        if (isWidthResizing || isHeightResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = isWidthResizing ? 'col-resize' : 'ns-resize';
            document.body.style.userSelect = 'none';
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, [isWidthResizing, isHeightResizing]);

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

    // AI 메시지 타이핑 효과 (스트리밍)
    const typeAIMessage = (message: ChatMessage) => {
        setIsTypingAI(true);
        const text = message.text;
        let index = 0;
        const speed = 20; // 타이핑 속도 (ms)
        
        // 임시 메시지 추가 (빈 텍스트로 시작)
        const tempMessage: ChatMessage = {
            ...message,
            text: ''
        };
        setMessages(prev => [...prev, tempMessage]);
        
        const interval = setInterval(() => {
            if (index <= text.length) {
                setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = {
                        ...tempMessage,
                        text: text.substring(0, index)
                    };
                    return newMessages;
                });
                index++;
            } else {
                clearInterval(interval);
                setIsTypingAI(false);
                // 최종 메시지로 업데이트
                setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = message;
                    return newMessages;
                });
            }
        }, speed);
    };

    // 되돌리기 기능
    const handleUndo = () => {
        if (messageHistory.length <= 1) {
            alert('되돌릴 메시지가 없습니다.');
            return;
        }
        
        const newHistory = messageHistory.slice(0, -1);
        setMessageHistory(newHistory);
        setMessages(newHistory[newHistory.length - 1]);
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
        
        setCurrentJD(getDefaultJD('club'));
        setJdType('club');
        setMessages([getTypeSelectionMessage()]);
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

    // 배너 이미지 파일 선택 핸들러
    const handleBannerImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // 파일 크기 체크 (5MB)
            if (file.size > 5 * 1024 * 1024) {
                alert('파일 크기는 5MB 이하여야 합니다.');
                return;
            }
            
            // 이미지 파일 타입 체크
            if (!file.type.startsWith('image/')) {
                alert('이미지 파일만 업로드 가능합니다.');
                return;
            }
            
            setBannerImageFile(file);
            
            // 미리보기 생성
            const reader = new FileReader();
            reader.onloadend = () => {
                setBannerImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    // 배너 이미지 압축 및 base64 변환 함수
    const compressBannerImage = async (): Promise<string | null> => {
        if (!bannerImageFile) return null;
        
        try {
            const base64 = await jdAPI.compressImage(bannerImageFile, 800, 0.7);
            return base64;
        } catch (error) {
            console.error('배너 이미지 압축 오류:', error);
            alert('배너 이미지 처리 중 오류가 발생했습니다.');
            return null;
        }
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
            // 배너 이미지가 있으면 압축 후 base64 변환
            let bannerBase64 = null;
            if (bannerImageFile) {
                bannerBase64 = await compressBannerImage();
            }
            
            // undefined 값을 빈 문자열이나 빈 배열로 변환
            const jobData = {
                status: 'published',
                type: jdType,
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
                requirementTypes: currentJD.requirementTypes || undefined,
                preferredTypes: currentJD.preferredTypes || undefined,
                benefits: currentJD.benefits || [],
                recruitmentPeriod: currentJD.recruitmentPeriod || '',
                recruitmentTarget: currentJD.recruitmentTarget || '',
                recruitmentCount: currentJD.recruitmentCount || '',
                recruitmentProcess: currentJD.recruitmentProcess || [],
                activitySchedule: currentJD.activitySchedule || '',
                membershipFee: currentJD.membershipFee || '',
                requiredCheckCount: requiredCheckCount || 0,
                preferredCheckCount: preferredCheckCount || 0,
                // 지원 양식 설정 추가
                applicationFields: applicationFieldsConfig,
                // 배너 이미지 base64 추가
                bannerImage: bannerBase64 || undefined
            };

            console.log('저장할 데이터:', jobData);

            // 백엔드 API로 공고 저장
            const savedJD = await jdAPI.create(jobData);
            
            console.log('공고 저장 완료:', savedJD);
            
            // 모달 닫기
            setShowApplicationFieldsModal(false);
            
            // 화면 초기화
            setCurrentJD(getDefaultJD(jdType));
            
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
                customQuestions: [],
                skillOptions: []
            });
            
            // 체크 개수 초기화
            setRequiredCheckCount(0);
            setPreferredCheckCount(0);
            
            // 배너 이미지 초기화
            setBannerImageFile(null);
            setBannerImagePreview(null);
            
            // 채팅 내역 초기화
            setMessages([getTypeSelectionMessage()]);
            
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

        // 회사/동아리 유형 선택 처리
        if (selectedOption === '회사 채용공고' || selectedOption === '동아리 모집공고') {
            const newType = selectedOption === '회사 채용공고' ? 'company' : 'club';
            setJdType(newType);
            setCurrentJD(getDefaultJD(newType));
            const followUpMessage = getDefaultMessage(newType);
            
            // 스트리밍 효과로 메시지 표시
            typeAIMessage(followUpMessage);
            
            // 메시지 히스토리에 추가
            setTimeout(() => {
                setMessageHistory(prev => [...prev, [...messages, userMessage, followUpMessage]]);
            }, followUpMessage.text.length * 20 + 100);
            
            setIsLoading(false);
            return;
        }

        // "기타" 선택 시 추가 입력 대기
        if (selectedOption === '기타') {
            const followUpMessage: ChatMessage = {
                role: 'ai',
                text: '구체적으로 어떻게 하시나요? 자유롭게 답변해주세요.',
                timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
            };
            
            // 스트리밍 효과로 메시지 표시
            typeAIMessage(followUpMessage);
            
            // 메시지 히스토리에 추가
            setTimeout(() => {
                setMessageHistory(prev => [...prev, [...messages, userMessage, followUpMessage]]);
            }, followUpMessage.text.length * 20 + 100);
            
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
            const response = await geminiAPI.chat(sanitizedMessage, conversationHistory, jdType);
            
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
            
            // 1. 채팅 메시지 추가: aiResponse 필드 사용 (스트리밍 효과 적용)
            const chatMessageText = response.aiResponse || '응답을 받았습니다.';
            
            const aiMessage: ChatMessage = {
                role: 'ai',
                text: chatMessageText,
                timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
                options: aiOptions
            };
            
            // 스트리밍 효과로 AI 메시지 표시
            typeAIMessage(aiMessage);
            
            // 메시지 히스토리에 추가
            setTimeout(() => {
                setMessageHistory(prev => [...prev, [...messages, userMessage, aiMessage]]);
            }, chatMessageText.length * 20 + 100); // 타이핑이 끝난 후 히스토리 업데이트
            
            // 2. 미리보기 업데이트: 공고 데이터가 있으면 기존 상태와 병합
            // 핵심 원칙: AI 응답에 해당 필드가 명시적으로 있고 비어있지 않을 때만 업데이트
            // 빈 문자열/빈 배열은 "아직 안 채웠다"이므로 기존 값 유지
            if (response.jdData && typeof response.jdData === 'object') {
                const rd = response.jdData; // 축약
                const mergeStr = (newVal: string | undefined, oldVal: string) => 
                    (newVal && newVal.trim().length > 0) ? newVal : oldVal;
                const mergeArr = (newVal: any[] | undefined, oldVal: any[]) =>
                    (newVal && Array.isArray(newVal) && newVal.length > 0) ? newVal : oldVal;

                const newJD = {
                    title: mergeStr(rd.title, currentJD.title || ''),
                    jobRole: mergeStr(rd.jobRole, currentJD.jobRole || ''),
                    company: mergeStr(rd.company, currentJD.company || ''),
                    companyName: mergeStr(rd.companyName, currentJD.companyName || ''),
                    teamName: mergeStr(rd.teamName, currentJD.teamName || ''),
                    location: mergeStr(rd.location, currentJD.location || ''),
                    scale: mergeStr(rd.scale, currentJD.scale || ''),
                    description: mergeStr(rd.description, currentJD.description || ''),
                    vision: mergeStr(rd.vision, currentJD.vision || ''),
                    mission: mergeStr(rd.mission, currentJD.mission || ''),
                    techStacks: mergeArr(rd.techStacks, currentJD.techStacks || []),
                    responsibilities: mergeArr(rd.responsibilities, currentJD.responsibilities || []),
                    requirements: mergeArr(rd.requirements, currentJD.requirements || []),
                    preferred: mergeArr(rd.preferred, currentJD.preferred || []),
                    benefits: mergeArr(rd.benefits, currentJD.benefits || []),
                    // 동아리 모집 일정 필드
                    recruitmentPeriod: mergeStr(rd.recruitmentPeriod, currentJD.recruitmentPeriod || ''),
                    recruitmentTarget: mergeStr(rd.recruitmentTarget, currentJD.recruitmentTarget || ''),
                    recruitmentCount: mergeStr(rd.recruitmentCount, currentJD.recruitmentCount || ''),
                    recruitmentProcess: mergeArr(rd.recruitmentProcess, currentJD.recruitmentProcess || []),
                    activitySchedule: mergeStr(rd.activitySchedule, currentJD.activitySchedule || ''),
                    membershipFee: mergeStr(rd.membershipFee, currentJD.membershipFee || ''),
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
                
                console.log('공고 업데이트:', newJD);
                setCurrentJD(prev => ({ ...prev, ...newJD }));
                
                // 배열 필드들도 즉시 반영되도록 보장
                setTimeout(() => {
                    setCurrentJD(prev => ({ ...prev, ...newJD }));
                }, 100);
            }
        } catch (error) {
            console.error('공고 생성 오류:', error);
            const errorMessage: ChatMessage = {
                role: 'ai',
                text: '죄송합니다. 오류가 발생했습니다. 다시 시도해주세요.',
                timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
            };
            
            // 스트리밍 효과로 에러 메시지 표시
            typeAIMessage(errorMessage);
            
            // 메시지 히스토리에 추가
            setTimeout(() => {
                setMessageHistory(prev => [...prev, [...messages, userMessage, errorMessage]]);
            }, errorMessage.text.length * 20 + 100);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative w-full" style={isMobile ? {} : { transform: 'scale(0.95)', transformOrigin: 'top center', width: '105.26%', marginLeft: '-2.63%' }}>
        {/* 모바일 탭 전환 */}
        {isMobile && (
            <div className="flex mb-2 bg-gray-100 rounded-xl p-1 gap-1">
                <button 
                    onClick={() => setMobileTab('chat')}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${mobileTab === 'chat' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
                >
                    💬 채팅
                </button>
                <button 
                    onClick={() => setMobileTab('preview')}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${mobileTab === 'preview' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
                >
                    📄 미리보기
                </button>
            </div>
        )}
        <div ref={containerRef} className={`${isMobile ? 'flex flex-col' : 'flex'} bg-gray-100 rounded-2xl border border-gray-200 shadow-xl overflow-hidden w-full gap-0 relative`} style={{ height: isMobile ? 'calc(100vh - 140px)' : `${chatHeight}vh` }}>
            {/* Chat Area - Left */}
            <div className={`flex flex-col bg-white ${isMobile ? 'rounded-2xl' : 'rounded-l-2xl'} border border-gray-200 shadow-sm relative ${isMobile && mobileTab !== 'chat' ? 'hidden' : ''}`} style={{ width: isMobile ? '100%' : `${chatWidth}%`, height: isMobile ? '100%' : undefined }}>
                <div className="p-3 md:p-5 border-b border-gray-200 bg-white flex justify-between items-center h-[56px] md:h-[70px]">
                    <div className="flex items-center gap-2.5 font-bold text-gray-800" style={{ fontSize: isMobile ? '14px' : (chatWidth < 30 ? '13px' : '15px') }}>
                        <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-sm"><MessageSquare size={14} fill="white"/></div>
                        공고 생성 매니저
                    </div>
                    <div className="flex items-center gap-2">
                        {/* 되돌리기 버튼 */}
                        <button 
                            onClick={handleUndo}
                            disabled={messageHistory.length <= 1 || isTypingAI}
                            className="text-gray-400 cursor-pointer hover:text-blue-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title="되돌리기"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 7v6h6"/>
                                <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
                            </svg>
                        </button>
                        {/* 초기화 버튼 */}
                        <button 
                            onClick={() => {
                                if (currentJD.title || messages.length > 1) {
                                    const confirmed = window.confirm('작성 중인 내용이 있습니다. 새로 시작하시겠습니까?\n\n현재 내용은 자동으로 저장되어 다음에 다시 불러올 수 있습니다.');
                                    if (!confirmed) return;
                                }
                                // 새로운 채팅 시작 (localStorage는 유지)
                                setCurrentJD(getDefaultJD('club'));
                                setJdType('club');
                                const initialMessage = [getTypeSelectionMessage()];
                                setMessages(initialMessage);
                                setMessageHistory([initialMessage]);
                                localStorage.removeItem('currentJD');
                                localStorage.removeItem('chatMessages');
                            }}
                            className="text-gray-400 cursor-pointer hover:text-gray-600 transition-colors"
                            title="새로 시작"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>
                
                <div className="flex-1 p-5 space-y-6 overflow-y-auto scrollbar-hide bg-[#F8FAFC]" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    {messages.map((msg, idx) => (
                        <div key={idx} className="flex gap-3 flex-col">
                            <div className="flex gap-3">
                                {msg.role === 'ai' && chatWidth >= 30 && (
                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-blue-600 border border-blue-200">AI</div>
                                )}
                                <div className={`space-y-1 ${msg.role === 'user' ? 'ml-auto' : ''}`} style={{ maxWidth: chatWidth < 30 ? '90%' : '70%' }}>
                                    <div className={`p-3.5 rounded-2xl shadow-sm border leading-relaxed ${
                                        msg.role === 'ai' 
                                            ? 'bg-white rounded-tl-none text-gray-700 border-gray-100' 
                                            : 'bg-blue-600 rounded-tr-none text-white border-blue-600'
                                    }`} style={{ fontSize: chatWidth < 30 ? '12px' : '13px' }}>
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
                                <div className="flex flex-col gap-2" style={{ marginLeft: chatWidth >= 30 ? '44px' : '0' }}>
                                    {msg.options.map((option, optIdx) => (
                                        <button
                                            key={optIdx}
                                            onClick={() => handleSend(option)}
                                            disabled={isLoading || isTypingAI}
                                            className="px-4 py-2.5 bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-400 rounded-lg font-medium text-gray-700 hover:text-blue-600 transition-all text-left disabled:opacity-50"
                                            style={{ fontSize: chatWidth < 30 ? '12px' : '13px' }}
                                        >
                                            {option}
                                        </button>
                                    ))}
                                    {/* 직접 입력 필드 */}
                                    {idx === messages.length - 1 && (
                                        <form
                                            onSubmit={(e) => {
                                                e.preventDefault();
                                                const formData = new FormData(e.currentTarget);
                                                const customValue = (formData.get('customOption') as string)?.trim();
                                                if (customValue) {
                                                    handleSend(customValue);
                                                    e.currentTarget.reset();
                                                }
                                            }}
                                            className="flex gap-2"
                                        >
                                            <input
                                                name="customOption"
                                                type="text"
                                                placeholder="직접 입력..."
                                                disabled={isLoading || isTypingAI}
                                                className="flex-1 px-4 py-2.5 bg-white border border-gray-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 rounded-lg text-gray-700 transition-all disabled:opacity-50 outline-none"
                                                style={{ fontSize: chatWidth < 30 ? '12px' : '13px' }}
                                            />
                                            <button
                                                type="submit"
                                                disabled={isLoading || isTypingAI}
                                                className="px-3 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-all disabled:opacity-50 flex-shrink-0"
                                                style={{ fontSize: chatWidth < 30 ? '12px' : '13px' }}
                                            >
                                                전송
                                            </button>
                                        </form>
                                    )}
                                    <button
                                        onClick={() => handleSend('이 질문은 건너뛰겠습니다')}
                                        disabled={isLoading || isTypingAI}
                                        className="px-4 py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-300 hover:border-gray-400 rounded-lg text-[13px] font-medium text-gray-500 hover:text-gray-700 transition-all text-center disabled:opacity-50"
                                    >
                                        건너뛰기
                                    </button>
                                </div>
                            )}
                            
                            {/* 일반 질문에도 건너뛰기 버튼 표시 (선택지가 없고, 마지막 메시지이고, AI 메시지인 경우) */}
                            {msg.role === 'ai' && !msg.options && idx === messages.length - 1 && !isLoading && !isTypingAI && (
                                <div className="flex justify-start ml-11 mt-2">
                                    <button
                                        onClick={() => handleSend('이 질문은 건너뛰겠습니다')}
                                        disabled={isLoading || isTypingAI}
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
                    {isTypingAI && !isLoading && (
                        <div className="flex gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-blue-600 border border-blue-200">AI</div>
                            <div className="bg-white p-3.5 rounded-2xl rounded-tl-none text-[13px] text-gray-400 shadow-sm border border-gray-100">
                                <span className="animate-pulse">타이핑 중...</span>
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
                            disabled={isLoading || isTypingAI}
                            rows={1}
                            className="w-full pl-4 pr-12 py-3.5 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-[13px] font-medium placeholder:text-gray-400 shadow-inner resize-none overflow-y-auto disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ minHeight: '52px', maxHeight: '150px' }}
                        />
                        <button 
                            onClick={() => handleSend()}
                            disabled={isLoading || isTypingAI}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronRight size={18}/>
                        </button>
                    </div>
                </div>
            </div>

            {/* 가로 크기 조절 핸들 - 모바일에서 숨김 */}
            {!isMobile && (
            <div 
                className={`w-2 bg-gray-200 hover:bg-blue-400 cursor-col-resize transition-all flex items-center justify-center group relative ${
                    isWidthResizing ? 'bg-blue-500' : ''
                }`}
                onMouseDown={(e) => {
                    e.preventDefault();
                    setIsWidthResizing(true);
                }}
                style={{ flexShrink: 0 }}
            >
                {/* 중앙 아이콘 */}
                <div className="absolute inset-y-0 flex items-center justify-center">
                    <div className="flex flex-col gap-1">
                        <div className="w-1 h-1 bg-gray-400 group-hover:bg-white rounded-full transition-colors"></div>
                        <div className="w-1 h-1 bg-gray-400 group-hover:bg-white rounded-full transition-colors"></div>
                        <div className="w-1 h-1 bg-gray-400 group-hover:bg-white rounded-full transition-colors"></div>
                    </div>
                </div>
            </div>
            )}

            {/* Preview Area - Right */}
            <div className={`flex-1 bg-white flex relative overflow-hidden ${isMobile ? 'rounded-2xl' : 'rounded-r-2xl'} border border-gray-200 shadow-sm ${isMobile && mobileTab !== 'preview' ? 'hidden' : ''}`} style={{ height: isMobile ? '100%' : undefined }}>
                
                {/* Left Profile Section - 채팅창이 클 때 또는 모바일에서 숨기기 */}
                {!isMobile && chatWidth < 45 && (
                <div className="border-r border-gray-100 flex flex-col bg-[#FAFBFC] overflow-y-auto" style={{ width: chatWidth < 35 ? '160px' : '200px' }}>
                    {/* Profile Image */}
                    <div className="px-4 flex flex-col items-center pt-6">
                        <div className="rounded-full bg-gradient-to-br from-blue-400 to-purple-500 mb-3 shadow-lg overflow-hidden" style={{ width: chatWidth < 35 ? '48px' : '64px', height: chatWidth < 35 ? '48px' : '64px' }}>
                            <img 
                                src={selectedImage}
                                alt="Profile" 
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <h3 className="font-bold text-gray-900 mb-1" style={{ fontSize: chatWidth < 50 ? '14px' : '17px' }}>
                            {currentJD.companyName || currentJD.teamName ? (
                                <span>
                                    {typingText['companyName'] !== undefined 
                                        ? typingText['companyName'] 
                                        : (currentJD.companyName || currentJD.teamName)}
                                    {typingText['companyName'] !== undefined && <span className="animate-pulse">|</span>}
                                </span>
                            ) : (
                                <span className="text-gray-400">{jdType === 'company' ? '회사 이름' : '동아리 이름'}</span>
                            )}
                        </h3>
                        <p className="text-gray-500 font-semibold mb-4" style={{ fontSize: chatWidth < 50 ? '11px' : '12px' }}>
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
                )}

                {/* Right Content Section */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    
                    <div className="flex-1 overflow-y-auto space-y-8" style={{ padding: isMobile ? '16px' : (chatWidth > 40 ? '32px' : '16px'), paddingTop: isMobile ? '16px' : (chatWidth > 40 ? '32px' : '16px') }}>
                        {!currentJD.title && currentJD.responsibilities.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center">
                                <div className="bg-gray-50 rounded-full flex items-center justify-center mb-4" style={{ width: chatWidth > 40 ? '64px' : '48px', height: chatWidth > 40 ? '64px' : '48px' }}>
                                    <FileText size={chatWidth > 40 ? 32 : 24} className="text-gray-300"/>
                                </div>
                                <h4 className="font-bold text-gray-400 mb-2" style={{ fontSize: chatWidth > 40 ? '16px' : '14px' }}>아직 작성된 내용이 없습니다.</h4>
                                <p className="text-gray-400 max-w-xs leading-relaxed" style={{ fontSize: chatWidth > 40 ? '13px' : '12px' }}>왼쪽 채팅창에서 AI 매니저와 대화를 나누면, 이곳에 채용 공고가 실시간으로 완성됩니다.</p>
                            </div>
                        ) : (
                            <>
                                {/* 공고 제목 */}
                                <div>
                                    <h1 className="font-bold text-gray-900 mb-4" style={{ fontSize: chatWidth > 40 ? '24px' : '18px' }}>
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
                                                <label className="block text-[11px] font-bold text-gray-600 mb-1.5">{jdType === 'company' ? '회사명' : '동아리명'}</label>
                                                <input
                                                    type="text"
                                                    value={editedJD.companyName}
                                                    onChange={(e) => setEditedJD({ ...editedJD, companyName: e.target.value })}
                                                    placeholder={jdType === 'company' ? '회사 이름을 입력하세요' : '동아리 이름을 입력하세요'}
                                                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-[13px]"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-bold text-gray-600 mb-1.5">{jdType === 'company' ? '채용 직무' : '모집 분야'}</label>
                                                <input
                                                    type="text"
                                                    value={editedJD.jobRole}
                                                    onChange={(e) => setEditedJD({ ...editedJD, jobRole: e.target.value })}
                                                    placeholder={jdType === 'company' ? '채용 직무를 입력하세요' : '모집 분야를 입력하세요'}
                                                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-[13px]"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-bold text-gray-600 mb-1.5">{jdType === 'company' ? '근무지' : '활동 장소'}</label>
                                                <input
                                                    type="text"
                                                    value={editedJD.location}
                                                    onChange={(e) => setEditedJD({ ...editedJD, location: e.target.value })}
                                                    placeholder={jdType === 'company' ? '근무지를 입력하세요' : '활동 장소를 입력하세요'}
                                                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-[13px]"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-bold text-gray-600 mb-1.5">{jdType === 'company' ? '회사 규모' : '동아리 규모'}</label>
                                                <input
                                                    type="text"
                                                    value={editedJD.scale}
                                                    onChange={(e) => setEditedJD({ ...editedJD, scale: e.target.value })}
                                                    placeholder={jdType === 'company' ? '회사 규모를 입력하세요 (예: 스타트업/중소기업/대기업)' : '동아리 규모를 입력하세요 (예: 소규모/중규모 동아리)'}
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
                                                {jdType === 'company' ? '회사 소개' : '동아리 소개'}
                                            </h4>
                                            {isEditMode ? (
                                                <textarea
                                                    value={editedJD.description}
                                                    onChange={(e) => setEditedJD({ ...editedJD, description: e.target.value })}
                                                    placeholder={jdType === 'company' ? '회사의 사업 분야, 문화, 특징 등을 소개하는 글을 입력하세요' : '동아리의 활동, 분위기, 특징 등을 소개하는 글을 입력하세요'}
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

                                {/* 모집 일정 및 정보 (동아리 모드 전용) */}
                                {jdType === 'club' && (
                                    (currentJD.recruitmentPeriod || currentJD.recruitmentTarget || currentJD.recruitmentCount || 
                                     (currentJD.recruitmentProcess && currentJD.recruitmentProcess.length > 0) ||
                                     currentJD.activitySchedule || currentJD.membershipFee || isEditMode) && (
                                    <div className="space-y-3">
                                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100 rounded-lg p-5">
                                            <h4 className="text-[11px] font-bold text-green-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                                </svg>
                                                모집 일정 및 정보
                                            </h4>
                                            <div className="space-y-3">
                                                {/* 모집 기간 */}
                                                <div className="flex items-start gap-3">
                                                    <span className="text-[11px] font-bold text-gray-500 w-20 flex-shrink-0 pt-0.5">모집 기간</span>
                                                    {isEditMode ? (
                                                        <input type="text" value={editedJD.recruitmentPeriod || ''} onChange={(e) => setEditedJD({ ...editedJD, recruitmentPeriod: e.target.value })} placeholder="예: 2025.03.01 ~ 2025.03.15" className="flex-1 px-3 py-1.5 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-[13px]" />
                                                    ) : (
                                                        <span className="text-[13px] text-gray-700">{currentJD.recruitmentPeriod || <span className="text-gray-400">미정</span>}</span>
                                                    )}
                                                </div>
                                                {/* 모집 대상 */}
                                                <div className="flex items-start gap-3">
                                                    <span className="text-[11px] font-bold text-gray-500 w-20 flex-shrink-0 pt-0.5">모집 대상</span>
                                                    {isEditMode ? (
                                                        <input type="text" value={editedJD.recruitmentTarget || ''} onChange={(e) => setEditedJD({ ...editedJD, recruitmentTarget: e.target.value })} placeholder="예: 전 학년 재학생" className="flex-1 px-3 py-1.5 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-[13px]" />
                                                    ) : (
                                                        <span className="text-[13px] text-gray-700">{currentJD.recruitmentTarget || <span className="text-gray-400">미정</span>}</span>
                                                    )}
                                                </div>
                                                {/* 모집 인원 */}
                                                <div className="flex items-start gap-3">
                                                    <span className="text-[11px] font-bold text-gray-500 w-20 flex-shrink-0 pt-0.5">모집 인원</span>
                                                    {isEditMode ? (
                                                        <input type="text" value={editedJD.recruitmentCount || ''} onChange={(e) => setEditedJD({ ...editedJD, recruitmentCount: e.target.value })} placeholder="예: 00명 내외" className="flex-1 px-3 py-1.5 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-[13px]" />
                                                    ) : (
                                                        <span className="text-[13px] text-gray-700">{currentJD.recruitmentCount || <span className="text-gray-400">미정</span>}</span>
                                                    )}
                                                </div>
                                                {/* 모집 절차 */}
                                                <div className="flex items-start gap-3">
                                                    <span className="text-[11px] font-bold text-gray-500 w-20 flex-shrink-0 pt-0.5">모집 절차</span>
                                                    {isEditMode ? (
                                                        <input type="text" value={(editedJD.recruitmentProcess || []).join(', ')} onChange={(e) => setEditedJD({ ...editedJD, recruitmentProcess: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} placeholder="예: 서류 접수, 면접, 최종 합격 발표" className="flex-1 px-3 py-1.5 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-[13px]" />
                                                    ) : (
                                                        <span className="text-[13px] text-gray-700">
                                                            {currentJD.recruitmentProcess && currentJD.recruitmentProcess.length > 0 
                                                                ? currentJD.recruitmentProcess.map((step, i) => (
                                                                    <span key={i}>
                                                                        {i > 0 && <span className="text-green-400 mx-1">→</span>}
                                                                        {step}
                                                                    </span>
                                                                ))
                                                                : <span className="text-gray-400">미정</span>
                                                            }
                                                        </span>
                                                    )}
                                                </div>
                                                {/* 활동 일정 */}
                                                <div className="flex items-start gap-3">
                                                    <span className="text-[11px] font-bold text-gray-500 w-20 flex-shrink-0 pt-0.5">활동 일정</span>
                                                    {isEditMode ? (
                                                        <input type="text" value={editedJD.activitySchedule || ''} onChange={(e) => setEditedJD({ ...editedJD, activitySchedule: e.target.value })} placeholder="예: 매주 수요일 18:00 정기 모임" className="flex-1 px-3 py-1.5 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-[13px]" />
                                                    ) : (
                                                        <span className="text-[13px] text-gray-700">{currentJD.activitySchedule || <span className="text-gray-400">미정</span>}</span>
                                                    )}
                                                </div>
                                                {/* 회비 */}
                                                <div className="flex items-start gap-3">
                                                    <span className="text-[11px] font-bold text-gray-500 w-20 flex-shrink-0 pt-0.5">회비</span>
                                                    {isEditMode ? (
                                                        <input type="text" value={editedJD.membershipFee || ''} onChange={(e) => setEditedJD({ ...editedJD, membershipFee: e.target.value })} placeholder="예: 학기당 3만원" className="flex-1 px-3 py-1.5 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-[13px]" />
                                                    ) : (
                                                        <span className="text-[13px] text-gray-700">{currentJD.membershipFee || <span className="text-gray-400">미정</span>}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}

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

                                {/* 자격 요건 / 지원자 체크리스트 */}
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{jdType === 'company' ? '자격 요건 (CHECKLIST)' : '지원자 체크리스트 (필수)'}</h4>
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
                                                editedJD.requirements.map((item, idx) => {
                                                    const itemType = editedJD.requirementTypes?.[idx] || 'checkbox';
                                                    return (
                                                        <div key={idx} className="space-y-1">
                                                            <div className="flex items-start gap-2">
                                                                <input
                                                                    type="text"
                                                                    value={item}
                                                                    onChange={(e) => updateArrayItem('requirements', idx, e.target.value)}
                                                                    placeholder={jdType === 'company' ? '자격 요건을 입력하세요' : '체크리스트 항목을 입력하세요'}
                                                                    className="flex-1 px-3 py-2 border border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-[13px]"
                                                                />
                                                                <button
                                                                    onClick={() => removeArrayItem('requirements', idx)}
                                                                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                                                                >
                                                                    ✕
                                                                </button>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 pl-1">
                                                                <button
                                                                    onClick={() => setEditedJD({ ...editedJD, requirementTypes: { ...editedJD.requirementTypes, [idx]: 'checkbox' } })}
                                                                    className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all ${
                                                                        itemType === 'checkbox'
                                                                            ? 'bg-blue-600 border-blue-600 text-white'
                                                                            : 'bg-white border-gray-200 text-gray-400 hover:border-blue-300'
                                                                    }`}
                                                                >
                                                                    ✓ 체크형
                                                                </button>
                                                                <button
                                                                    onClick={() => setEditedJD({ ...editedJD, requirementTypes: { ...editedJD.requirementTypes, [idx]: 'text' } })}
                                                                    className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all ${
                                                                        itemType === 'text'
                                                                            ? 'bg-blue-600 border-blue-600 text-white'
                                                                            : 'bg-white border-gray-200 text-gray-400 hover:border-blue-300'
                                                                    }`}
                                                                >
                                                                    ✎ 서술형
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <p className="text-[13px] text-gray-400 p-3">항목을 추가하세요.</p>
                                            )
                                        ) : (
                                            currentJD.requirements.length > 0 ? currentJD.requirements.map((item, idx) => {
                                                const itemType = currentJD.requirementTypes?.[idx] || 'checkbox';
                                                return (
                                                    <div key={idx} className="space-y-1">
                                                        <label className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors group">
                                                            {itemType === 'checkbox' && <input type="checkbox" className="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />}
                                                            {itemType === 'text' && <span className="text-blue-400 mt-0.5 flex-shrink-0">•</span>}
                                                            <span className="text-[13px] text-gray-700 leading-relaxed group-hover:text-gray-900">{item}</span>
                                                        </label>
                                                        <div className="flex items-center gap-1.5 pl-3">
                                                            <button
                                                                onClick={() => setCurrentJD(prev => ({ ...prev, requirementTypes: { ...prev.requirementTypes, [idx]: 'checkbox' } }))}
                                                                className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all ${
                                                                    itemType === 'checkbox'
                                                                        ? 'bg-blue-600 border-blue-600 text-white'
                                                                        : 'bg-white border-gray-200 text-gray-400 hover:border-blue-300'
                                                                }`}
                                                            >
                                                                ✓ 체크형
                                                            </button>
                                                            <button
                                                                onClick={() => setCurrentJD(prev => ({ ...prev, requirementTypes: { ...prev.requirementTypes, [idx]: 'text' } }))}
                                                                className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all ${
                                                                    itemType === 'text'
                                                                        ? 'bg-blue-600 border-blue-600 text-white'
                                                                        : 'bg-white border-gray-200 text-gray-400 hover:border-blue-300'
                                                                }`}
                                                            >
                                                                ✎ 서술형
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            }) : (
                                                <p className="text-[13px] text-gray-400 p-3">아직 설정되지 않았습니다.</p>
                                            )
                                        )}
                                    </div>
                                </div>

                                {/* 우대 사항 / 우대 체크리스트 */}
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{jdType === 'company' ? '우대 사항 (PREFERRED)' : '지원자 체크리스트 (우대)'}</h4>
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
                                                editedJD.preferred.map((item, idx) => {
                                                    const itemType = editedJD.preferredTypes?.[idx] || 'checkbox';
                                                    return (
                                                        <div key={idx} className="space-y-1">
                                                            <div className="flex items-start gap-2">
                                                                <input
                                                                    type="text"
                                                                    value={item}
                                                                    onChange={(e) => updateArrayItem('preferred', idx, e.target.value)}
                                                                    placeholder={jdType === 'company' ? '우대 사항을 입력하세요' : '우대 체크리스트 항목을 입력하세요'}
                                                                    className="flex-1 px-3 py-2 border border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-[13px]"
                                                                />
                                                                <button
                                                                    onClick={() => removeArrayItem('preferred', idx)}
                                                                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                                                                >
                                                                    ✕
                                                                </button>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 pl-1">
                                                                <button
                                                                    onClick={() => setEditedJD({ ...editedJD, preferredTypes: { ...editedJD.preferredTypes, [idx]: 'checkbox' } })}
                                                                    className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all ${
                                                                        itemType === 'checkbox'
                                                                            ? 'bg-purple-600 border-purple-600 text-white'
                                                                            : 'bg-white border-gray-200 text-gray-400 hover:border-purple-300'
                                                                    }`}
                                                                >
                                                                    ✓ 체크형
                                                                </button>
                                                                <button
                                                                    onClick={() => setEditedJD({ ...editedJD, preferredTypes: { ...editedJD.preferredTypes, [idx]: 'text' } })}
                                                                    className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all ${
                                                                        itemType === 'text'
                                                                            ? 'bg-purple-600 border-purple-600 text-white'
                                                                            : 'bg-white border-gray-200 text-gray-400 hover:border-purple-300'
                                                                    }`}
                                                                >
                                                                    ✎ 서술형
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <p className="text-[13px] text-gray-400 p-3">항목을 추가하세요.</p>
                                            )
                                        ) : (
                                            currentJD.preferred.length > 0 ? currentJD.preferred.map((item, idx) => {
                                                const itemType = currentJD.preferredTypes?.[idx] || 'checkbox';
                                                return (
                                                    <div key={idx} className="space-y-1">
                                                        <label className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors group">
                                                            {itemType === 'checkbox' && <input type="checkbox" className="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />}
                                                            {itemType === 'text' && <span className="text-purple-400 mt-0.5 flex-shrink-0">•</span>}
                                                            <span className="text-[13px] text-gray-700 leading-relaxed group-hover:text-gray-900">{item}</span>
                                                        </label>
                                                        <div className="flex items-center gap-1.5 pl-3">
                                                            <button
                                                                onClick={() => setCurrentJD(prev => ({ ...prev, preferredTypes: { ...prev.preferredTypes, [idx]: 'checkbox' } }))}
                                                                className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all ${
                                                                    itemType === 'checkbox'
                                                                        ? 'bg-purple-600 border-purple-600 text-white'
                                                                        : 'bg-white border-gray-200 text-gray-400 hover:border-purple-300'
                                                                }`}
                                                            >
                                                                ✓ 체크형
                                                            </button>
                                                            <button
                                                                onClick={() => setCurrentJD(prev => ({ ...prev, preferredTypes: { ...prev.preferredTypes, [idx]: 'text' } }))}
                                                                className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all ${
                                                                    itemType === 'text'
                                                                        ? 'bg-purple-600 border-purple-600 text-white'
                                                                        : 'bg-white border-gray-200 text-gray-400 hover:border-purple-300'
                                                                }`}
                                                            >
                                                                ✎ 서술형
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            }) : (
                                                <p className="text-[13px] text-gray-400 p-3">아직 설정되지 않았습니다.</p>
                                            )
                                        )}
                                    </div>
                                </div>

                                {/* 혜택 / 복리후생 */}
                                {(currentJD.benefits && currentJD.benefits.length > 0 || isEditMode) && (
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{jdType === 'company' ? '복리후생 (BENEFITS)' : '활동 혜택 (BENEFITS)'}</h4>
                                            {isEditMode && (
                                                <button
                                                    onClick={() => addArrayItem('benefits')}
                                                    className="text-[11px] font-semibold text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                                                >
                                                    + 추가
                                                </button>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            {isEditMode ? (
                                                editedJD.benefits && editedJD.benefits.length > 0 ? (
                                                    editedJD.benefits.map((item, idx) => (
                                                        <div key={idx} className="flex items-start gap-2">
                                                            <input
                                                                type="text"
                                                                value={item}
                                                                onChange={(e) => updateArrayItem('benefits', idx, e.target.value)}
                                                                placeholder={jdType === 'company' ? '복리후생을 입력하세요' : '활동 혜택을 입력하세요'}
                                                                className="flex-1 px-3 py-2 border border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-[13px]"
                                                            />
                                                            <button
                                                                onClick={() => removeArrayItem('benefits', idx)}
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
                                                currentJD.benefits.map((item, idx) => (
                                                    <div key={idx} className="flex items-start gap-3 px-3 py-2">
                                                        <span className="text-orange-400 mt-0.5 flex-shrink-0">•</span>
                                                        <span className="text-[13px] text-gray-700 leading-relaxed">{item}</span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}

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
                            {/* 배너 이미지 업로드 */}
                            <div className="mb-6">
                                <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">배너 이미지 (선택)</h3>
                                <div className="space-y-3">
                                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-400 transition-colors">
                                        {bannerImagePreview ? (
                                            <div className="relative">
                                                <img 
                                                    src={bannerImagePreview} 
                                                    alt="배너 미리보기" 
                                                    className="w-full h-32 object-cover rounded-lg"
                                                />
                                                <button
                                                    onClick={() => {
                                                        setBannerImageFile(null);
                                                        setBannerImagePreview(null);
                                                    }}
                                                    className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ) : (
                                            <label className="cursor-pointer flex flex-col items-center gap-2">
                                                <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center">
                                                    <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                                <div className="text-center">
                                                    <span className="text-[13px] font-medium text-blue-600">이미지 선택</span>
                                                    <p className="text-[11px] text-gray-500 mt-1">5MB 이하의 이미지 파일</p>
                                                </div>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleBannerImageChange}
                                                    className="hidden"
                                                />
                                            </label>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
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
                                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                            <span className="text-[13px] font-semibold text-gray-700 shrink-0">총 {currentJD.requirements.length}개 중</span>
                                            <select
                                                value={requiredCheckCount}
                                                onChange={(e) => setRequiredCheckCount(Number(e.target.value))}
                                                className="flex-1 min-w-[140px] px-3 py-2 border border-blue-300 rounded-lg text-[13px] font-semibold focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                            >
                                                <option value={0}>체크 필수 없음</option>
                                                {Array.from({ length: currentJD.requirements.length }, (_, i) => i + 1).map(num => (
                                                    <option key={num} value={num}>최소 {num}개 필수</option>
                                                ))}
                                            </select>
                                            <span className="text-[13px] text-gray-600 shrink-0">체크 필요</span>
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
                                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                            <span className="text-[13px] font-semibold text-gray-700 shrink-0">총 {currentJD.preferred.length}개 중</span>
                                            <select
                                                value={preferredCheckCount}
                                                onChange={(e) => setPreferredCheckCount(Number(e.target.value))}
                                                className="flex-1 min-w-[140px] px-3 py-2 border border-purple-300 rounded-lg text-[13px] font-semibold focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                                            >
                                                <option value={0}>체크 필수 없음</option>
                                                {Array.from({ length: currentJD.preferred.length }, (_, i) => i + 1).map(num => (
                                                    <option key={num} value={num}>최소 {num}개 필수</option>
                                                ))}
                                            </select>
                                            <span className="text-[13px] text-gray-600 shrink-0">체크 필요</span>
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

                            {/* 스킬/도구 체크리스트 */}
                            <div>
                                <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">스킬/도구 체크리스트</h3>
                                <p className="text-[11px] text-gray-400 mb-3">지원자가 자신의 역량을 체크할 수 있는 항목을 추가하세요</p>
                                
                                {/* 추가된 카테고리 목록 */}
                                {applicationFieldsConfig.skillOptions.length > 0 && (
                                    <div className="space-y-3 mb-4">
                                        {applicationFieldsConfig.skillOptions.map((cat, catIdx) => (
                                            <div key={catIdx} className="bg-gray-50 border border-gray-200 rounded-xl p-3.5">
                                                <div className="flex items-center justify-between mb-2.5">
                                                    <span className="text-[13px] font-bold text-gray-800">{cat.category}</span>
                                                    <button
                                                        onClick={() => {
                                                            setApplicationFieldsConfig(prev => ({
                                                                ...prev,
                                                                skillOptions: prev.skillOptions.filter((_, i) => i !== catIdx)
                                                            }));
                                                        }}
                                                        className="text-[11px] text-red-400 hover:text-red-600 font-medium"
                                                    >
                                                        삭제
                                                    </button>
                                                </div>
                                                <div className="flex flex-wrap gap-1.5 mb-2.5">
                                                    {cat.skills.map((skill, skillIdx) => (
                                                        <span key={skillIdx} className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-[12px] text-gray-700">
                                                            {skill}
                                                            <button
                                                                onClick={() => {
                                                                    setApplicationFieldsConfig(prev => ({
                                                                        ...prev,
                                                                        skillOptions: prev.skillOptions.map((c, i) => 
                                                                            i === catIdx 
                                                                                ? { ...c, skills: c.skills.filter((_, si) => si !== skillIdx) }
                                                                                : c
                                                                        )
                                                                    }));
                                                                }}
                                                                className="text-gray-400 hover:text-red-500 text-[10px] ml-0.5"
                                                            >
                                                                ✕
                                                            </button>
                                                        </span>
                                                    ))}
                                                </div>
                                                {/* 해당 카테고리에 스킬 추가 */}
                                                {editingSkillCategoryIdx === catIdx ? (
                                                    <div className="flex gap-1.5">
                                                        <input
                                                            type="text"
                                                            value={newSkillItem}
                                                            onChange={(e) => setNewSkillItem(e.target.value)}
                                                            onKeyPress={(e) => {
                                                                if (e.key === 'Enter' && newSkillItem.trim()) {
                                                                    setApplicationFieldsConfig(prev => ({
                                                                        ...prev,
                                                                        skillOptions: prev.skillOptions.map((c, i) => 
                                                                            i === catIdx 
                                                                                ? { ...c, skills: [...c.skills, newSkillItem.trim()] }
                                                                                : c
                                                                        )
                                                                    }));
                                                                    setNewSkillItem('');
                                                                }
                                                            }}
                                                            placeholder="스킬명 입력 후 Enter"
                                                            className="flex-1 px-2.5 py-1.5 border border-gray-200 rounded-lg text-[12px] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                            autoFocus
                                                        />
                                                        <button
                                                            onClick={() => {
                                                                if (newSkillItem.trim()) {
                                                                    setApplicationFieldsConfig(prev => ({
                                                                        ...prev,
                                                                        skillOptions: prev.skillOptions.map((c, i) => 
                                                                            i === catIdx 
                                                                                ? { ...c, skills: [...c.skills, newSkillItem.trim()] }
                                                                                : c
                                                                        )
                                                                    }));
                                                                    setNewSkillItem('');
                                                                }
                                                            }}
                                                            className="px-2.5 py-1.5 bg-blue-600 text-white rounded-lg text-[11px] font-bold"
                                                        >
                                                            추가
                                                        </button>
                                                        <button
                                                            onClick={() => { setEditingSkillCategoryIdx(null); setNewSkillItem(''); }}
                                                            className="px-2.5 py-1.5 text-gray-400 hover:text-gray-600 text-[11px] font-bold"
                                                        >
                                                            완료
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => setEditingSkillCategoryIdx(catIdx)}
                                                        className="text-[11px] text-blue-600 hover:text-blue-700 font-medium"
                                                    >
                                                        + 항목 추가
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* 새 카테고리 추가 */}
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newSkillCategory}
                                        onChange={(e) => setNewSkillCategory(e.target.value)}
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter' && newSkillCategory.trim()) {
                                                setApplicationFieldsConfig(prev => ({
                                                    ...prev,
                                                    skillOptions: [...prev.skillOptions, { category: newSkillCategory.trim(), skills: [] }]
                                                }));
                                                setNewSkillCategory('');
                                            }
                                        }}
                                        placeholder="카테고리명 (예: 프로그래밍 언어, 디자인 툴)"
                                        className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg text-[13px] focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400"
                                    />
                                    <button
                                        onClick={() => {
                                            if (newSkillCategory.trim()) {
                                                setApplicationFieldsConfig(prev => ({
                                                    ...prev,
                                                    skillOptions: [...prev.skillOptions, { category: newSkillCategory.trim(), skills: [] }]
                                                }));
                                                setNewSkillCategory('');
                                            }
                                        }}
                                        disabled={!newSkillCategory.trim()}
                                        className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-[13px] font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        추가
                                    </button>
                                </div>

                                {/* 프리셋 버튼 */}
                                {applicationFieldsConfig.skillOptions.length === 0 && (
                                    <div className="mt-3">
                                        <p className="text-[11px] text-gray-400 mb-2">빠른 추가</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {[
                                                { category: '프로그래밍 언어', skills: ['Python', 'JavaScript', 'TypeScript', 'Java', 'C/C++', 'Go', 'Kotlin', 'Swift', 'Rust'] },
                                                { category: '프레임워크', skills: ['React', 'Next.js', 'Vue.js', 'Spring', 'Django', 'FastAPI', 'Flutter', 'Node.js'] },
                                                { category: '디자인 툴', skills: ['Figma', 'Photoshop', 'Illustrator', 'After Effects', 'Premiere Pro', 'Sketch', 'XD'] },
                                                { category: '협업 툴', skills: ['Git', 'Notion', 'Slack', 'Jira', 'Confluence', 'Discord'] },
                                            ].map((preset) => (
                                                <button
                                                    key={preset.category}
                                                    onClick={() => {
                                                        setApplicationFieldsConfig(prev => ({
                                                            ...prev,
                                                            skillOptions: [...prev.skillOptions, preset]
                                                        }));
                                                    }}
                                                    className="px-2.5 py-1.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-lg text-[11px] font-medium hover:bg-blue-100 transition-colors"
                                                >
                                                    {preset.category}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
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

        {/* 하단 높이 조절 핸들 - 모바일에서 숨김 */}
        {!isMobile && (
        <div
            className={`absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize flex items-center justify-center group z-50 ${
                isHeightResizing ? 'bg-blue-200/50' : 'hover:bg-blue-100/30'
            } transition-colors`}
            onMouseDown={(e) => {
                e.preventDefault();
                setIsHeightResizing(true);
            }}
        >
            <div className="w-16 h-1 bg-gray-300 rounded-full group-hover:bg-blue-500 transition-colors"></div>
        </div>
        )}
        </div>
    );
};
