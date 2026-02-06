import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Sparkles, FileText, MessageSquare, Send, MoreHorizontal, Pencil, Trash2, User } from 'lucide-react';
import { auth } from '@/config/firebase';
import { applicationAPI, commentAPI } from '@/services/api';
import { FONTS } from '@/constants/fonts';

interface Application {
    id: string;
    applicantName: string;
    applicantEmail: string;
    applicantPhone?: string;
    applicantGender?: string;
    jdTitle: string;
    requirementAnswers?: Array<{ question: string; checked: boolean; detail: string; answer?: string }>;
    preferredAnswers?: Array<{ question: string; checked: boolean; detail: string; answer?: string }>;
    appliedAt: any;
    status: string;
}

interface Comment {
    id: string;
    applicationId: string;
    content: string;
    authorId: string;
    authorEmail: string;
    authorName: string;
    createdAt: any;
    updatedAt: any;
}

interface ApplicantDetailProps {
    applicationId: string;
    onBack: () => void;
}

export const ApplicantDetail = ({ applicationId, onBack }: ApplicantDetailProps) => {
    const [application, setApplication] = useState<Application | null>(null);
    const [loading, setLoading] = useState(true);
    const [aiSummary, setAiSummary] = useState<string>('');
    const [summaryLoading, setSummaryLoading] = useState(false);

    // 코멘트 관련 상태
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [commentLoading, setCommentLoading] = useState(false);
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
    const commentsEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const currentUserId = auth.currentUser?.uid;

    useEffect(() => {
        fetchApplication();
        fetchComments();
    }, [applicationId]);

    const fetchApplication = async () => {
        try {
            const data = await applicationAPI.getById(applicationId);
            setApplication(data);
            // AI 분석도 자동 실행
            generateAISummary(data);
        } catch (error) {
            console.error('지원서 로딩 실패:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchComments = async () => {
        try {
            const data = await commentAPI.getByApplicationId(applicationId);
            setComments(data);
        } catch (error) {
            console.error('코멘트 로딩 실패:', error);
        }
    };

    const generateAISummary = async (app: Application) => {
        setSummaryLoading(true);
        try {
            const result = await applicationAPI.analyze(app);
            setAiSummary(result.analysis);
        } catch (error) {
            console.error('AI 분석 실패:', error);
            setAiSummary('AI 분석에 실패했습니다. 잠시 후 다시 시도해주세요.');
        } finally {
            setSummaryLoading(false);
        }
    };

    const handleAddComment = async () => {
        if (!newComment.trim()) return;
        setCommentLoading(true);
        try {
            await commentAPI.create(applicationId, newComment.trim());
            setNewComment('');
            await fetchComments();
            // 스크롤 맨 아래로
            setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        } catch (error) {
            console.error('코멘트 작성 실패:', error);
            alert('코멘트 작성에 실패했습니다.');
        } finally {
            setCommentLoading(false);
        }
    };

    const handleEditComment = async (commentId: string) => {
        if (!editContent.trim()) return;
        try {
            await commentAPI.update(commentId, editContent.trim());
            setEditingCommentId(null);
            setEditContent('');
            await fetchComments();
        } catch (error) {
            console.error('코멘트 수정 실패:', error);
            alert('코멘트 수정에 실패했습니다.');
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        if (!confirm('코멘트를 삭제하시겠습니까?')) return;
        try {
            await commentAPI.delete(commentId);
            await fetchComments();
        } catch (error) {
            console.error('코멘트 삭제 실패:', error);
            alert('코멘트 삭제에 실패했습니다.');
        }
    };

    const handleStatusChange = async (newStatus: string) => {
        if (!application) return;
        try {
            await applicationAPI.update(application.id, newStatus);
            setApplication(prev => prev ? { ...prev, status: newStatus } : null);
        } catch (error) {
            console.error('상태 변경 실패:', error);
        }
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return '-';
        const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}.${month}.${day} ${hours}:${minutes}`;
    };

    const formatDateShort = (timestamp: any) => {
        if (!timestamp) return '-';
        const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMin = Math.floor(diffMs / 60000);
        const diffHour = Math.floor(diffMs / 3600000);
        const diffDay = Math.floor(diffMs / 86400000);

        if (diffMin < 1) return '방금 전';
        if (diffMin < 60) return `${diffMin}분 전`;
        if (diffHour < 24) return `${diffHour}시간 전`;
        if (diffDay < 7) return `${diffDay}일 전`;
        return `${date.getMonth() + 1}/${date.getDate()}`;
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleAddComment();
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-500">지원서 로딩 중...</p>
                </div>
            </div>
        );
    }

    if (!application) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <p className="text-gray-500">지원서를 찾을 수 없습니다.</p>
                    <button onClick={onBack} className="mt-4 text-blue-600 hover:underline text-sm">돌아가기</button>
                </div>
            </div>
        );
    }

    const requirementMet = application.requirementAnswers?.filter(a => a.checked).length || 0;
    const requirementTotal = application.requirementAnswers?.length || 0;
    const preferredMet = application.preferredAnswers?.filter(a => a.checked).length || 0;
    const preferredTotal = application.preferredAnswers?.length || 0;

    return (
        <div className="max-w-[1200px] mx-auto space-y-6" style={{ fontFamily: FONTS.sans }}>
            {/* 상단 헤더 */}
            <div className="flex items-center gap-4">
                <button
                    onClick={onBack}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <ArrowLeft size={20} className="text-gray-600" />
                </button>
                <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900">{application.applicantName}</h2>
                    <p className="text-sm text-gray-500">{application.applicantEmail} · {application.jdTitle}</p>
                </div>
                <div className="flex gap-2">
                    {['검토중', '합격', '불합격'].map(status => (
                        <button
                            key={status}
                            onClick={() => handleStatusChange(status)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                                application.status === status
                                    ? status === '합격' ? 'bg-green-500 text-white shadow-md'
                                    : status === '불합격' ? 'bg-red-500 text-white shadow-md'
                                    : 'bg-blue-500 text-white shadow-md'
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {/* 메인 콘텐츠 - 2컬럼 레이아웃 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 좌측: 지원서 내용 */}
                <div className="lg:col-span-2 space-y-6">
                    {/* 지원자 기본 정보 */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <User size={18} className="text-gray-600" />
                            지원자 정보
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-gray-400 mb-1">이름</p>
                                <p className="text-sm font-medium text-gray-900">{application.applicantName}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 mb-1">이메일</p>
                                <p className="text-sm font-medium text-gray-900">{application.applicantEmail}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 mb-1">전화번호</p>
                                <p className="text-sm font-medium text-gray-900">{application.applicantPhone || '-'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 mb-1">성별</p>
                                <p className="text-sm font-medium text-gray-900">{application.applicantGender || '-'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 mb-1">지원일</p>
                                <p className="text-sm font-medium text-gray-900">{formatDate(application.appliedAt)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 mb-1">지원 공고</p>
                                <p className="text-sm font-medium text-gray-900">{application.jdTitle}</p>
                            </div>
                        </div>
                    </div>

                    {/* AI 분석 */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Sparkles size={18} className="text-blue-600" />
                            </div>
                            <h3 className="font-bold text-gray-900">AI 스크리닝 분석</h3>
                        </div>
                        {summaryLoading ? (
                            <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                                    <p className="text-gray-500 text-sm">AI가 지원자를 분석하고 있습니다...</p>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                                <div className="text-gray-800 text-sm whitespace-pre-wrap leading-relaxed">
                                    {aiSummary || 'AI 분석 결과가 없습니다.'}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 자격 요건 */}
                    {application.requirementAnswers && application.requirementAnswers.length > 0 && (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                        <FileText size={18} className="text-green-600" />
                                    </div>
                                    <h3 className="font-bold text-gray-900">자격 요건</h3>
                                </div>
                                <span className="text-sm font-medium text-green-600 bg-green-50 px-3 py-1 rounded-full">
                                    {requirementMet}/{requirementTotal} 충족
                                </span>
                            </div>
                            <div className="space-y-3">
                                {application.requirementAnswers.map((answer, index) => (
                                    <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                                        <span className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                            answer.checked ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-400'
                                        }`}>
                                            {answer.checked ? '✓' : '✗'}
                                        </span>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-gray-900">{answer.question}</p>
                                            {answer.detail && (
                                                <p className="text-xs text-gray-500 mt-1">{answer.detail}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 우대 사항 */}
                    {application.preferredAnswers && application.preferredAnswers.length > 0 && (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                                        <FileText size={18} className="text-purple-600" />
                                    </div>
                                    <h3 className="font-bold text-gray-900">우대 사항</h3>
                                </div>
                                <span className="text-sm font-medium text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
                                    {preferredMet}/{preferredTotal} 충족
                                </span>
                            </div>
                            <div className="space-y-3">
                                {application.preferredAnswers.map((answer, index) => (
                                    <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                                        <span className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                            answer.checked ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-400'
                                        }`}>
                                            {answer.checked ? '✓' : '✗'}
                                        </span>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-gray-900">{answer.question}</p>
                                            {answer.detail && (
                                                <p className="text-xs text-gray-500 mt-1">{answer.detail}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* 우측: 코멘트 섹션 (노션 스타일) */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col sticky top-6" style={{ height: 'calc(100vh - 180px)', minHeight: '500px' }}>
                        {/* 코멘트 헤더 */}
                        <div className="p-5 border-b border-gray-100 flex-shrink-0">
                            <div className="flex items-center gap-2">
                                <MessageSquare size={18} className="text-gray-600" />
                                <h3 className="font-bold text-gray-900">코멘트</h3>
                                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
                                    {comments.length}
                                </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">팀원들과 자유롭게 의견을 나눠보세요</p>
                        </div>

                        {/* 코멘트 목록 */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full">
                            {comments.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                                    <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mb-3">
                                        <MessageSquare size={24} className="text-gray-300" />
                                    </div>
                                    <p className="text-sm text-gray-400 font-medium">아직 코멘트가 없습니다</p>
                                    <p className="text-xs text-gray-300 mt-1">첫 코멘트를 남겨보세요!</p>
                                </div>
                            ) : (
                                comments.map(comment => (
                                    <div key={comment.id} className="group">
                                        {editingCommentId === comment.id ? (
                                            /* 수정 모드 */
                                            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                                                <textarea
                                                    value={editContent}
                                                    onChange={(e) => setEditContent(e.target.value)}
                                                    className="w-full bg-white border border-gray-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                                                    rows={3}
                                                    autoFocus
                                                />
                                                <div className="flex justify-end gap-2 mt-2">
                                                    <button
                                                        onClick={() => { setEditingCommentId(null); setEditContent(''); }}
                                                        className="px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                                                    >
                                                        취소
                                                    </button>
                                                    <button
                                                        onClick={() => handleEditComment(comment.id)}
                                                        className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                                                    >
                                                        저장
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            /* 보기 모드 */
                                            <div className="relative">
                                                <div className="flex items-start gap-3">
                                                    {/* 아바타 */}
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                                        {(comment.authorName || comment.authorEmail || 'U').charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-semibold text-gray-900">
                                                                {comment.authorName || comment.authorEmail?.split('@')[0] || '익명'}
                                                            </span>
                                                            <span className="text-[11px] text-gray-400">
                                                                {formatDateShort(comment.createdAt)}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap leading-relaxed break-words">
                                                            {comment.content}
                                                        </p>
                                                    </div>

                                                    {/* 본인 코멘트 메뉴 */}
                                                    {currentUserId === comment.authorId && (
                                                        <div className="relative flex-shrink-0">
                                                            <button
                                                                onClick={() => setMenuOpenId(menuOpenId === comment.id ? null : comment.id)}
                                                                className="p-1 text-gray-300 hover:text-gray-500 opacity-0 group-hover:opacity-100 transition-all rounded"
                                                            >
                                                                <MoreHorizontal size={16} />
                                                            </button>
                                                            {menuOpenId === comment.id && (
                                                                <div className="absolute right-0 top-7 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1 w-24">
                                                                    <button
                                                                        onClick={() => {
                                                                            setEditingCommentId(comment.id);
                                                                            setEditContent(comment.content);
                                                                            setMenuOpenId(null);
                                                                        }}
                                                                        className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 transition-colors flex items-center gap-2 text-gray-700"
                                                                    >
                                                                        <Pencil size={12} /> 수정
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            handleDeleteComment(comment.id);
                                                                            setMenuOpenId(null);
                                                                        }}
                                                                        className="w-full px-3 py-2 text-left text-xs hover:bg-red-50 transition-colors flex items-center gap-2 text-red-500"
                                                                    >
                                                                        <Trash2 size={12} /> 삭제
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                            <div ref={commentsEndRef} />
                        </div>

                        {/* 코멘트 입력 */}
                        <div className="p-4 border-t border-gray-100 flex-shrink-0">
                            <div className="flex items-end gap-2">
                                <div className="flex-1 relative">
                                    <textarea
                                        ref={textareaRef}
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="코멘트를 입력하세요... (Enter로 전송)"
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent focus:bg-white transition-all placeholder:text-gray-400"
                                        rows={1}
                                        style={{ minHeight: '44px', maxHeight: '120px' }}
                                        onInput={(e) => {
                                            const target = e.target as HTMLTextAreaElement;
                                            target.style.height = 'auto';
                                            target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                                        }}
                                    />
                                </div>
                                <button
                                    onClick={handleAddComment}
                                    disabled={!newComment.trim() || commentLoading}
                                    className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:bg-gray-200 disabled:text-gray-400 flex-shrink-0"
                                >
                                    <Send size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
