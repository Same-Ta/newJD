import { ChevronRight, MessageSquare, X, FileText } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { generateJD } from '../../utils/gemini';
import { auth, db } from '../../config/firebase';
import { doc, setDoc, addDoc, collection, serverTimestamp, getDoc } from 'firebase/firestore';

interface CurrentJD {
    title: string;
    jobRole?: string;
    company?: string;
    companyName?: string;
    teamName?: string;
    location?: string;
    scale?: string;
    vision?: string;
    mission?: string;
    techStacks?: { name: string; level: number }[];
    responsibilities: string[];
    requirements: string[];
    preferred: string[];
    benefits: string[];
}

interface ChatMessage {
    role: 'user' | 'ai';
    text: string;
    timestamp: string;
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
            text: '안녕하세요! WINNOW 채용 매니저입니다. 저희가 최고의 채용 공고(JD)를 작성해 드릴게요. 어떤 포지션을 찾고 계신가요?',
            timestamp: '오전 10:23'
        }
    ]);
    const [currentJD, setCurrentJD] = useState<CurrentJD>({
        title: '',
        jobRole: '',
        company: '',
        companyName: '',
        teamName: '',
        location: '',
        scale: '',
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

    // 페이지 로드 시 임시저장 데이터 불러오기
    useEffect(() => {
        const loadDraft = async () => {
            const user = auth.currentUser;
            if (!user) return;

            try {
                const draftDoc = await getDoc(doc(db, 'drafts', user.uid));
                
                if (draftDoc.exists()) {
                    const draftData = draftDoc.data();
                    if (draftData.jd) {
                        setCurrentJD(draftData.jd);
                        console.log('임시저장 데이터를 불러왔습니다:', draftData.jd);
                    }
                }
            } catch (error) {
                console.error('임시저장 데이터 로드 오류:', error);
            }
        };

        loadDraft();
    }, []);

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

    const saveDraft = async () => {
        const user = auth.currentUser;
        if (!user) {
            alert('로그인이 필요합니다.');
            return;
        }

        if (!currentJD.title && currentJD.responsibilities.length === 0) {
            alert('저장할 내용이 없습니다.');
            return;
        }

        try {
            await setDoc(doc(db, 'drafts', user.uid), {
                jd: currentJD,
                userId: user.uid,
                updatedAt: serverTimestamp()
            });
            alert('임시 저장되었습니다.');
        } catch (error) {
            console.error('임시 저장 오류:', error);
            alert('임시 저장 중 오류가 발생했습니다.');
        }
    };

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
                userId: user.uid,
                createdAt: serverTimestamp(),
                status: 'published',
                title: currentJD.title || '',
                jobRole: currentJD.jobRole || '',
                company: currentJD.company || '',
                companyName: currentJD.companyName || '',
                teamName: currentJD.teamName || '',
                location: currentJD.location || '',
                scale: currentJD.scale || '',
                vision: currentJD.vision || '',
                mission: currentJD.mission || '',
                techStacks: currentJD.techStacks || [],
                responsibilities: currentJD.responsibilities || [],
                requirements: currentJD.requirements || [],
                preferred: currentJD.preferred || [],
                benefits: currentJD.benefits || []
            };

            console.log('저장할 데이터:', jobData);

            // 'jds' 컬렉션에 저장
            const jobDocRef = await addDoc(collection(db, 'jds'), jobData);
            
            console.log('JD 저장 완료:', jobDocRef.id);
            
            // 화면 초기화
            setCurrentJD({
                title: '',
                jobRole: '',
                company: '',
                companyName: '',
                teamName: '',
                location: '',
                scale: '',
                vision: '',
                mission: '',
                techStacks: [],
                responsibilities: [],
                requirements: [],
                preferred: [],
                benefits: []
            });
            
            // 채팅 내역 초기화
            setMessages([
                {
                    role: 'ai',
                    text: '안녕하세요! WINNOW 채용 매니저입니다. 저희가 최고의 채용 공고(JD)를 작성해 드릴게요. 어떤 포지션을 찾고 계신가요?',
                    timestamp: '오전 10:23'
                }
            ]);
            
            // 임시저장 데이터도 삭제
            try {
                await setDoc(doc(db, 'drafts', user.uid), {
                    jd: {
                        title: '',
                        jobRole: '',
                        company: '',
                        companyName: '',
                        teamName: '',
                        location: '',
                        scale: '',
                        vision: '',
                        mission: '',
                        techStacks: [],
                        responsibilities: [],
                        requirements: [],
                        preferred: [],
                        benefits: []
                    },
                    userId: user.uid,
                    updatedAt: serverTimestamp()
                });
            } catch (err) {
                console.error('임시저장 초기화 실패:', err);
            }
            
            // alert 후 내 공고 목록 페이지로 이동
            alert('공고가 성공적으로 게시되었습니다!');
            console.log('내 공고 목록 페이지로 이동합니다.');
            onNavigate('my-jds');
        } catch (error) {
            console.error('공고 게시 오류:', error);
            alert('공고 게시 중 오류가 발생했습니다.');
        }
    };

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: ChatMessage = {
            role: 'user',
            text: input,
            timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, userMessage]);
        const currentInput = input;
        setInput('');
        setIsLoading(true);

        try {
            // messages 상태를 Gemini API 형식으로 변환
            const conversationHistory = messages.map(msg => ({
                role: (msg.role === 'ai' ? 'model' : 'user') as 'user' | 'model',
                parts: [{ text: msg.text }]
            }));

            // generateJD 호출 - 항상 { aiResponse, jdData } 형태로 반환됨
            const response = await generateJD(currentInput, conversationHistory);
            
            // 1. 채팅 메시지 추가: aiResponse 필드 사용
            const chatMessageText = response.aiResponse || '응답을 받았습니다.';
            
            const aiMessage: ChatMessage = {
                role: 'ai',
                text: chatMessageText,
                timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
            };
            
            setMessages(prev => [...prev, aiMessage]);
            
            // 2. 미리보기 업데이트: jdData가 있으면 기존 상태와 병합
            if (response.jdData && typeof response.jdData === 'object') {
                const newJD = {
                    title: response.jdData.title || currentJD.title,
                    companyName: response.jdData.companyName || currentJD.companyName,
                    teamName: response.jdData.teamName || currentJD.teamName,
                    location: response.jdData.location || currentJD.location,
                    scale: response.jdData.scale || currentJD.scale,
                    vision: response.jdData.vision || currentJD.vision,
                    mission: response.jdData.mission || currentJD.mission,
                    techStacks: (response.jdData.techStacks && response.jdData.techStacks.length > 0)
                        ? response.jdData.techStacks
                        : currentJD.techStacks,
                    responsibilities: (response.jdData.responsibilities && response.jdData.responsibilities.length > 0) 
                        ? response.jdData.responsibilities 
                        : currentJD.responsibilities,
                    requirements: (response.jdData.requirements && response.jdData.requirements.length > 0) 
                        ? response.jdData.requirements 
                        : currentJD.requirements,
                    preferred: (response.jdData.preferred && response.jdData.preferred.length > 0) 
                        ? response.jdData.preferred 
                        : currentJD.preferred,
                    benefits: (response.jdData.benefits && response.jdData.benefits.length > 0) 
                        ? response.jdData.benefits 
                        : currentJD.benefits
                };
                
                // 타이핑 애니메이션 적용
                if (response.jdData.title && response.jdData.title !== currentJD.title) {
                    typeText('title', response.jdData.title);
                }
                if (response.jdData.vision && response.jdData.vision !== currentJD.vision) {
                    typeText('vision', response.jdData.vision);
                }
                if (response.jdData.mission && response.jdData.mission !== currentJD.mission) {
                    typeText('mission', response.jdData.mission);
                }
                
                setCurrentJD(prev => ({ ...prev, ...newJD }));
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
                
                <div className="flex-1 p-5 space-y-6 overflow-y-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    {messages.map((msg, idx) => (
                        <div key={idx} className="flex gap-3">
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
                                        <span dangerouslySetInnerHTML={{ __html: msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }} />
                                    ) : (
                                        msg.text
                                    )}
                                </div>
                                <div className={`text-[10px] text-gray-400 ${msg.role === 'user' ? 'text-right pr-1' : 'pl-1'}`}>{msg.timestamp}</div>
                            </div>
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
                        <input 
                            type="text" 
                            placeholder="답변을 입력하세요..." 
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                            disabled={isLoading}
                            className="w-full pl-4 pr-12 py-3.5 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-[13px] font-medium placeholder:text-gray-400 shadow-inner"
                        />
                        <button 
                            onClick={handleSend}
                            disabled={isLoading}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50"
                        >
                            <ChevronRight size={18}/>
                        </button>
                    </div>
                </div>
            </div>

            {/* Preview Area - Right */}
            <div className="flex-1 bg-white flex relative">
                
                {/* Left Profile Section */}
                <div className="w-[240px] border-r border-gray-100 flex flex-col bg-[#FAFBFC] pt-16">
                    {/* Profile Image */}
                    <div className="px-6 flex flex-col items-center">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 mb-4 shadow-lg overflow-hidden">
                            <img 
                                src={selectedImage}
                                alt="Profile" 
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <h3 className="font-bold text-[17px] text-gray-900 mb-1">
                            {currentJD.teamName || <span className="text-gray-400">동아리 이름</span>}
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
                                    <span className="text-gray-700">{currentJD.location}</span>
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
                                    <span className="text-gray-700">{currentJD.scale}</span>
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
                <div className="flex-1 flex flex-col">
                    <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-white">
                        <h3 className="font-bold text-lg text-gray-800">실시간 미리보기</h3>
                        <div className="flex gap-2">
                            {!isEditMode ? (
                                <>
                                    <button onClick={startEdit} className="px-4 py-2 border border-blue-500 text-blue-600 rounded-lg text-[12px] font-bold hover:bg-blue-50 transition-colors">편집</button>
                                    <button onClick={saveDraft} className="px-4 py-2 border border-gray-200 rounded-lg text-[12px] font-bold text-gray-600 hover:bg-gray-50 transition-colors">임시 저장</button>
                                    <button onClick={publishJob} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[12px] font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all">공고 게시</button>
                                </>
                            ) : (
                                <>
                                    <button onClick={cancelEdit} className="px-4 py-2 border border-gray-200 rounded-lg text-[12px] font-bold text-gray-600 hover:bg-gray-50 transition-colors">취소</button>
                                    <button onClick={saveEdit} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[12px] font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all">저장</button>
                                </>
                            )}
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto">
                        {!currentJD.title && currentJD.responsibilities.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center p-10">
                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                    <FileText size={32} className="text-gray-300"/>
                                </div>
                                <h4 className="font-bold text-gray-400 mb-2">아직 작성된 내용이 없습니다.</h4>
                                <p className="text-[13px] text-gray-400 max-w-xs leading-relaxed">왼쪽 채팅창에서 AI 매니저와 대화를 나누면, 이곳에 채용 공고가 실시간으로 완성됩니다.</p>
                            </div>
                        ) : (
                            <div className="p-8 space-y-8">
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
                                    {(currentJD.companyName || isEditMode) && (
                                        <div className="text-[14px] text-gray-600 leading-relaxed">
                                            {isEditMode ? (
                                                <input
                                                    type="text"
                                                    value={editedJD.companyName}
                                                    onChange={(e) => setEditedJD({ ...editedJD, companyName: e.target.value })}
                                                    placeholder="회사명을 입력하세요"
                                                    className="w-full px-3 py-2 border border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-[14px]"
                                                />
                                            ) : (
                                                <p>{currentJD.companyName}의 디자인 시스템을 고도화하고, 사용자 중심의 UI/UX를 설계합니다. 복잡한 제품 데이터를 직관적인 시각화로 풀어내는 것이 핵심 과제입니다.</p>
                                            )}
                                        </div>
                                    )}
                                </div>

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
                                <div className="pt-6 border-t border-gray-100 flex justify-end items-center">
                                    <button className="px-6 py-3 bg-blue-600 text-white rounded-lg text-[14px] font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                        일괄 공유하기
                                    </button>
                                </div>

                                {/* Branding */}
                                <div className="text-right pt-4">
                                    <p className="text-[11px] font-bold text-gray-400">WINNOW Recruiting Team</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
