import { useState, useEffect, useRef, useCallback } from 'react';
import { auth } from '@/config/firebase';
import { commentAPI } from '@/services/api';

// ==================== 타입 정의 ====================
interface Comment {
  id: string;
  applicationId: string;
  content: string;
  authorId: string;
  authorEmail: string;
  authorName: string;
  posX: number | null;
  posY: number | null;
  parentId: string | null;
  resolved: boolean;
  createdAt: { seconds: number };
  updatedAt: { seconds: number };
}

interface CommentThread {
  root: Comment;
  replies: Comment[];
}

interface FigmaCommentsProps {
  applicationId: string;
  children: React.ReactNode;
}

// ==================== 아바타 색 ====================
const AVATAR_COLORS = [
  'bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500',
  'bg-pink-500', 'bg-teal-500', 'bg-indigo-500', 'bg-red-500',
];

const getAvatarColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const getInitial = (name: string) => {
  return (name || '?').charAt(0).toUpperCase();
};

const getUserDisplayName = () => {
  const user = auth.currentUser;
  return user?.displayName || user?.email?.split('@')[0] || '나';
};

const formatTime = (ts: { seconds: number } | undefined) => {
  if (!ts) return '';
  const d = new Date(ts.seconds * 1000);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${month}/${day} ${h}:${m}`;
};

// ==================== 코멘트 핀 ====================
const CommentPin = ({
  thread,
  isActive,
  onClick,
}: {
  thread: CommentThread;
  isActive: boolean;
  onClick: () => void;
}) => {
  const { root } = thread;
  const color = getAvatarColor(root.authorName);

  return (
    <div
      className="absolute z-30 group cursor-pointer"
      style={{ left: `${root.posX}%`, top: `${root.posY}%`, transform: 'translate(-50%, -100%)' }}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
      {/* 말풍선 핀 */}
      <div className={`relative transition-all duration-200 ${isActive ? 'scale-110' : 'hover:scale-105'}`}>
        <div className={`w-8 h-8 rounded-full ${color} flex items-center justify-center text-white text-xs font-bold shadow-lg border-2 ${isActive ? 'border-blue-400 ring-2 ring-blue-300' : 'border-white'} ${root.resolved ? 'opacity-50' : ''}`}>
          {getInitial(root.authorName)}
        </div>
        {thread.replies.length > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-blue-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {thread.replies.length}
          </span>
        )}
        {root.resolved && (
          <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">✓</span>
        )}
        {/* 핀 꼬리 */}
        <div className={`absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent ${root.resolved ? 'border-t-gray-400' : `border-t-gray-600`}`} />
      </div>
    </div>
  );
};

// ==================== 코멘트 스레드 카드 ====================
const CommentThreadCard = ({
  thread,
  applicationId,
  onClose,
  onRefresh,
}: {
  thread: CommentThread;
  applicationId: string;
  onClose: () => void;
  onRefresh: () => void;
}) => {
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const replyRef = useRef<HTMLTextAreaElement>(null);
  const currentUserId = auth.currentUser?.uid;

  const allComments = [thread.root, ...thread.replies];

  const handleReply = async () => {
    if (!replyText.trim() || sending) return;
    setSending(true);
    try {
      console.log('[Comment] Creating reply:', { applicationId, parentId: thread.root.id });
      await commentAPI.create(applicationId, replyText.trim(), thread.root.posX ?? undefined, thread.root.posY ?? undefined, thread.root.id);
      console.log('[Comment] Reply created successfully');
      setReplyText('');
      onRefresh();
    } catch (e: any) {
      console.error('[Comment] 답글 실패:', e);
      alert('답글 저장에 실패했습니다: ' + (e?.message || '알 수 없는 오류'));
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!window.confirm('코멘트를 삭제하시겠습니까?')) return;
    try {
      await commentAPI.delete(commentId);
      onRefresh();
      if (commentId === thread.root.id) onClose();
    } catch (e) {
      console.error('삭제 실패:', e);
    }
  };

  const handleEdit = async (commentId: string) => {
    if (!editText.trim()) return;
    try {
      await commentAPI.update(commentId, editText.trim());
      setEditingId(null);
      onRefresh();
    } catch (e) {
      console.error('수정 실패:', e);
    }
  };

  const handleResolve = async () => {
    try {
      await commentAPI.resolve(thread.root.id);
      onRefresh();
    } catch (e) {
      console.error('해결 실패:', e);
    }
  };

  return (
    <div
      className="absolute z-50 bg-white rounded-xl shadow-2xl border border-gray-200 w-[320px] overflow-hidden"
      style={{
        left: `${thread.root.posX}%`,
        top: `${thread.root.posY}%`,
        transform: 'translate(-50%, 12px)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50/70">
        <span className="text-[11px] font-semibold text-gray-500">
          {thread.replies.length > 0 ? `${thread.replies.length + 1}개의 코멘트` : '코멘트'}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleResolve}
            className={`px-2 py-1 rounded text-[10px] font-bold transition-colors ${thread.root.resolved ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
            title={thread.root.resolved ? '다시 열기' : '해결됨으로 표시'}
          >
            {thread.root.resolved ? '✓ 해결됨' : '해결'}
          </button>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded transition-colors">
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* 메시지 목록 */}
      <div className="max-h-[300px] overflow-y-auto">
        {allComments.map((c, idx) => (
          <div key={c.id} className={`px-4 py-3 ${idx > 0 ? 'border-t border-gray-50' : ''} hover:bg-gray-50/50 transition-colors`}>
            <div className="flex items-start gap-2.5">
              <div className={`w-6 h-6 rounded-full ${getAvatarColor(c.authorName)} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mt-0.5`}>
                {getInitial(c.authorName)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-bold text-gray-800 truncate">{c.authorName}</span>
                  <span className="text-[10px] text-gray-400">{formatTime(c.createdAt)}</span>
                </div>
                {editingId === c.id ? (
                  <div className="mt-1.5">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full px-2 py-1.5 border border-blue-300 rounded text-[12px] resize-none focus:ring-1 focus:ring-blue-500"
                      rows={2}
                      autoFocus
                    />
                    <div className="flex gap-1 mt-1">
                      <button onClick={() => handleEdit(c.id)} className="px-2 py-0.5 bg-blue-600 text-white rounded text-[10px] font-bold">저장</button>
                      <button onClick={() => setEditingId(null)} className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded text-[10px] font-bold">취소</button>
                    </div>
                  </div>
                ) : (
                  <p className="text-[12px] text-gray-700 mt-0.5 leading-relaxed whitespace-pre-wrap">{c.content}</p>
                )}
              </div>
              {c.authorId === currentUserId && editingId !== c.id && (
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={() => { setEditingId(c.id); setEditText(c.content); }}
                    className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600"
                    title="수정"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="p-1 hover:bg-red-100 rounded text-gray-400 hover:text-red-500"
                    title="삭제"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 답글 입력 */}
      <div className="border-t border-gray-100 px-4 py-3 bg-gray-50/50">
        <div className="flex items-end gap-2">
          <textarea
            ref={replyRef}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleReply();
              }
            }}
            placeholder="답글을 입력하세요..."
            rows={1}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-[12px] resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          />
          <button
            onClick={handleReply}
            disabled={!replyText.trim() || sending}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== 새 코멘트 입력 팝업 ====================
const NewCommentPopup = ({
  posX,
  posY,
  applicationId,
  onClose,
  onCreated,
}: {
  posX: number;
  posY: number;
  applicationId: string;
  onClose: () => void;
  onCreated: () => void;
}) => {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      console.log('[Comment] Creating comment:', { applicationId, posX, posY, content: text.trim() });
      const result = await commentAPI.create(applicationId, text.trim(), posX, posY);
      console.log('[Comment] Created successfully:', result);
      onCreated();
      onClose();
    } catch (e: any) {
      console.error('[Comment] 코멘트 작성 실패:', e);
      setError(e?.message || '코멘트 저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="absolute z-50 bg-white rounded-xl shadow-2xl border border-gray-200 w-[280px] overflow-hidden"
      style={{
        left: `${posX}%`,
        top: `${posY}%`,
        transform: 'translate(-50%, 12px)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-6 h-6 rounded-full ${getAvatarColor(getUserDisplayName())} flex items-center justify-center text-white text-[10px] font-bold`}>
            {getInitial(getUserDisplayName())}
          </div>
          <span className="text-[12px] font-bold text-gray-700">{getUserDisplayName()}</span>
        </div>
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
            if (e.key === 'Escape') onClose();
          }}
          placeholder="코멘트를 입력하세요..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[12px] resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {error && (
          <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-lg text-[11px] text-red-600">
            {error}
          </div>
        )}
        <div className="flex justify-end gap-2 mt-2">
          <button onClick={onClose} className="px-3 py-1.5 text-[11px] font-bold text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={!text.trim() || sending}
            className="px-3 py-1.5 text-[11px] font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
          >
            {sending ? '저장 중...' : '등록'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== 메인 FigmaComments 컴포넌트 ====================
export const FigmaComments = ({ applicationId, children }: FigmaCommentsProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentMode, setCommentMode] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [newCommentPos, setNewCommentPos] = useState<{ x: number; y: number } | null>(null);
  const [showResolved, setShowResolved] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchComments = useCallback(async () => {
    try {
      const data = await commentAPI.getByApplicationId(applicationId);
      setComments(data);
    } catch (e) {
      console.error('코멘트 로딩 실패:', e);
    }
  }, [applicationId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // 스레드로 그룹핑
  const threads: CommentThread[] = (() => {
    const roots = comments.filter(c => !c.parentId && c.posX != null && c.posY != null);
    return roots.map(root => ({
      root,
      replies: comments.filter(c => c.parentId === root.id).sort((a, b) =>
        (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0)
      ),
    }));
  })();

  const visibleThreads = showResolved ? threads : threads.filter(t => !t.root.resolved);

  const handleContainerClick = (e: React.MouseEvent) => {
    if (!commentMode) {
      setActiveThreadId(null);
      return;
    }

    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setNewCommentPos({ x, y });
    setActiveThreadId(null);
  };

  return (
    <div className="relative">
      {/* 코멘트 툴바 */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => { setCommentMode(!commentMode); setNewCommentPos(null); setActiveThreadId(null); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-bold transition-all ${
            commentMode
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
          {commentMode ? '코멘트 모드 ON' : '코멘트'}
        </button>

        {threads.length > 0 && (
          <>
            <span className="text-[11px] text-gray-400 font-medium">
              {threads.filter(t => !t.root.resolved).length}개 활성
              {threads.filter(t => t.root.resolved).length > 0 && ` · ${threads.filter(t => t.root.resolved).length}개 해결됨`}
            </span>
            <button
              onClick={() => setShowResolved(!showResolved)}
              className="text-[11px] text-blue-600 hover:text-blue-700 font-medium"
            >
              {showResolved ? '해결된 코멘트 숨기기' : '해결된 코멘트 보기'}
            </button>
          </>
        )}
      </div>

      {/* 코멘트 영역 */}
      <div
        ref={containerRef}
        className={`relative ${commentMode ? 'cursor-crosshair' : ''}`}
        onClick={handleContainerClick}
      >
        {/* 핀 렌더링 */}
        {visibleThreads.map(thread => (
          <CommentPin
            key={thread.root.id}
            thread={thread}
            isActive={activeThreadId === thread.root.id}
            onClick={() => {
              setActiveThreadId(activeThreadId === thread.root.id ? null : thread.root.id);
              setNewCommentPos(null);
            }}
          />
        ))}

        {/* 활성 스레드 카드 */}
        {activeThreadId && (() => {
          const thread = visibleThreads.find(t => t.root.id === activeThreadId);
          if (!thread) return null;
          return (
            <CommentThreadCard
              thread={thread}
              applicationId={applicationId}
              onClose={() => setActiveThreadId(null)}
              onRefresh={fetchComments}
            />
          );
        })()}

        {/* 새 코멘트 팝업 */}
        {newCommentPos && (
          <>
            {/* 새 핀 미리보기 */}
            <div
              className="absolute z-40 pointer-events-none"
              style={{ left: `${newCommentPos.x}%`, top: `${newCommentPos.y}%`, transform: 'translate(-50%, -100%)' }}
            >
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-lg border-2 border-white ring-2 ring-blue-300 animate-pulse">
                {getInitial(getUserDisplayName())}
              </div>
              <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-blue-600" />
            </div>
            <NewCommentPopup
              posX={newCommentPos.x}
              posY={newCommentPos.y}
              applicationId={applicationId}
              onClose={() => setNewCommentPos(null)}
              onCreated={() => { fetchComments(); setCommentMode(false); }}
            />
          </>
        )}

        {/* 자식 콘텐츠 */}
        {children}
      </div>

      {/* 코멘트 모드 안내 */}
      {commentMode && !newCommentPos && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-2xl text-[13px] font-medium z-50 flex items-center gap-3 animate-bounce">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
          </svg>
          원하는 위치를 클릭하여 코멘트를 남기세요
          <button
            onClick={() => setCommentMode(false)}
            className="ml-2 px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-[11px] font-bold"
          >
            ESC
          </button>
        </div>
      )}
    </div>
  );
};

export default FigmaComments;
