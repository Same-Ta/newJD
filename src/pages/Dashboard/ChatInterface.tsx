import { ChevronRight, MessageSquare, X, FileText, CheckCircle2, Circle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { generateJD } from '../../utils/gemini';
import { auth, db } from '../../config/firebase';
import { doc, setDoc, addDoc, collection, serverTimestamp, getDoc } from 'firebase/firestore';

interface CurrentJD {
    title: string;
    jobRole?: string;
    company?: string;
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
        responsibilities: [],
        requirements: [],
        preferred: [],
        benefits: []
    });
    const [isLoading, setIsLoading] = useState(false);

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
            const jobData = {
                ...currentJD,
                userId: user.uid,
                createdAt: serverTimestamp(),
                status: 'published',
                title: currentJD.title,
                jobRole: currentJD.jobRole || '',
                company: currentJD.company || ''
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
                setCurrentJD(prev => ({
                    title: response.jdData.title || prev.title,
                    responsibilities: (response.jdData.responsibilities && response.jdData.responsibilities.length > 0) 
                        ? response.jdData.responsibilities 
                        : prev.responsibilities,
                    requirements: (response.jdData.requirements && response.jdData.requirements.length > 0) 
                        ? response.jdData.requirements 
                        : prev.requirements,
                    preferred: (response.jdData.preferred && response.jdData.preferred.length > 0) 
                        ? response.jdData.preferred 
                        : prev.preferred,
                    benefits: (response.jdData.benefits && response.jdData.benefits.length > 0) 
                        ? response.jdData.benefits 
                        : prev.benefits
                }));
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
                
                <div className="flex-1 p-5 space-y-6 overflow-y-auto">
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
            <div className="flex-1 bg-white flex flex-col relative">
                <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
                <div className="p-6 border-b border-gray-100 flex justify-between items-center h-[70px]">
                    <h3 className="font-bold text-lg text-gray-800">실시간 미리보기</h3>
                    <div className="flex gap-2">
                        <button onClick={saveDraft} className="px-4 py-2 border border-gray-200 rounded-lg text-[12px] font-bold text-gray-600 hover:bg-gray-50 transition-colors">임시 저장</button>
                        <button onClick={publishJob} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[12px] font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all">공고 게시</button>
                    </div>
                </div>
                <div className="flex-1 p-10 bg-gray-50/30 overflow-y-auto">
                    {!currentJD.title && currentJD.responsibilities.length === 0 ? (
                        <div className="bg-white border border-gray-200 rounded-xl w-full h-full flex flex-col items-center justify-center text-center p-10 shadow-sm border-dashed">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                <FileText size={32} className="text-gray-300"/>
                            </div>
                            <h4 className="font-bold text-gray-400 mb-2">아직 작성된 내용이 없습니다.</h4>
                            <p className="text-[13px] text-gray-400 max-w-xs leading-relaxed">왼쪽 채팅창에서 AI 매니저와 대화를 나누면, 이곳에 채용 공고가 실시간으로 완성됩니다.</p>
                        </div>
                    ) : (
                        <div className="bg-white border border-gray-200 rounded-xl w-full p-8 shadow-sm space-y-6">
                            {/* 공고 제목 */}
                            <div className="space-y-3">
                                <h4 className="font-bold text-lg text-gray-800 border-b border-gray-200 pb-2 flex items-center gap-2">
                                    {currentJD.title ? <CheckCircle2 size={20} className="text-green-500"/> : <Circle size={20} className="text-gray-300"/>}
                                    공고 제목
                                </h4>
                                <div className="text-[14px] text-gray-700 leading-relaxed">
                                    {currentJD.title || <span className="text-gray-400">아직 설정되지 않았습니다.</span>}
                                </div>
                            </div>

                            {/* 주요 업무 */}
                            <div className="space-y-3">
                                <h4 className="font-bold text-lg text-gray-800 border-b border-gray-200 pb-2 flex items-center gap-2">
                                    {currentJD.responsibilities.length > 0 ? <CheckCircle2 size={20} className="text-green-500"/> : <Circle size={20} className="text-gray-300"/>}
                                    주요 업무
                                </h4>
                                <ul className="space-y-2">
                                    {currentJD.responsibilities.length > 0 ? currentJD.responsibilities.map((item, idx) => (
                                        <li key={idx} className="flex items-start gap-2 text-[14px] text-gray-700">
                                            <CheckCircle2 size={16} className="text-blue-500 mt-0.5 flex-shrink-0"/>
                                            {item}
                                        </li>
                                    )) : <span className="text-gray-400 text-[14px]">아직 설정되지 않았습니다.</span>}
                                </ul>
                            </div>

                            {/* 자격 요건 */}
                            <div className="space-y-3">
                                <h4 className="font-bold text-lg text-gray-800 border-b border-gray-200 pb-2 flex items-center gap-2">
                                    {currentJD.requirements.length > 0 ? <CheckCircle2 size={20} className="text-green-500"/> : <Circle size={20} className="text-gray-300"/>}
                                    자격 요건
                                </h4>
                                <ul className="space-y-2">
                                    {currentJD.requirements.length > 0 ? currentJD.requirements.map((item, idx) => (
                                        <li key={idx} className="flex items-start gap-2 text-[14px] text-gray-700">
                                            <CheckCircle2 size={16} className="text-blue-500 mt-0.5 flex-shrink-0"/>
                                            {item}
                                        </li>
                                    )) : <span className="text-gray-400 text-[14px]">아직 설정되지 않았습니다.</span>}
                                </ul>
                            </div>

                            {/* 우대 사항 */}
                            <div className="space-y-3">
                                <h4 className="font-bold text-lg text-gray-800 border-b border-gray-200 pb-2 flex items-center gap-2">
                                    {currentJD.preferred.length > 0 ? <CheckCircle2 size={20} className="text-green-500"/> : <Circle size={20} className="text-gray-300"/>}
                                    우대 사항
                                </h4>
                                <ul className="space-y-2">
                                    {currentJD.preferred.length > 0 ? currentJD.preferred.map((item, idx) => (
                                        <li key={idx} className="flex items-start gap-2 text-[14px] text-gray-700">
                                            <CheckCircle2 size={16} className="text-blue-500 mt-0.5 flex-shrink-0"/>
                                            {item}
                                        </li>
                                    )) : <span className="text-gray-400 text-[14px]">아직 설정되지 않았습니다.</span>}
                                </ul>
                            </div>

                            {/* 혜택 및 복지 */}
                            <div className="space-y-3">
                                <h4 className="font-bold text-lg text-gray-800 border-b border-gray-200 pb-2 flex items-center gap-2">
                                    {currentJD.benefits.length > 0 ? <CheckCircle2 size={20} className="text-green-500"/> : <Circle size={20} className="text-gray-300"/>}
                                    혜택 및 복지
                                </h4>
                                <ul className="space-y-2">
                                    {currentJD.benefits.length > 0 ? currentJD.benefits.map((item, idx) => (
                                        <li key={idx} className="flex items-start gap-2 text-[14px] text-gray-700">
                                            <CheckCircle2 size={16} className="text-blue-500 mt-0.5 flex-shrink-0"/>
                                            {item}
                                        </li>
                                    )) : <span className="text-gray-400 text-[14px]">아직 설정되지 않았습니다.</span>}
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
