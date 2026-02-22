import { useEffect, useState } from 'react';
import { AlertTriangle, Clock } from 'lucide-react';

interface SessionTimeoutModalProps {
  /** 경고창 표시 여부 */
  isVisible: boolean;
  /** 자동 로그아웃까지 남은 시간 (ms) */
  remainingMs: number;
  /** 세션 연장 버튼 클릭 */
  onExtend: () => void;
  /** 지금 로그아웃 버튼 클릭 */
  onLogout: () => void;
}

function formatSeconds(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) {
    return `${minutes}분 ${seconds.toString().padStart(2, '0')}초`;
  }
  return `${seconds}초`;
}

export function SessionTimeoutModal({
  isVisible,
  remainingMs,
  onExtend,
  onLogout,
}: SessionTimeoutModalProps) {
  const [displayMs, setDisplayMs] = useState(remainingMs);

  useEffect(() => {
    setDisplayMs(remainingMs);
  }, [remainingMs]);

  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setDisplayMs((prev) => Math.max(0, prev - 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible) return null;

  const progress = Math.max(0, displayMs / remainingMs);
  const isUrgent = displayMs < 30 * 1000; // 30초 미만이면 강조

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* 배경 오버레이 */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* 모달 */}
      <div className="relative bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 animate-fade-in">
        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className={`flex items-center justify-center w-10 h-10 rounded-full ${
              isUrgent ? 'bg-red-500/20' : 'bg-amber-500/20'
            }`}
          >
            <AlertTriangle
              className={`w-5 h-5 ${isUrgent ? 'text-red-400' : 'text-amber-400'}`}
            />
          </div>
          <div>
            <h2 className="text-white font-semibold text-base">세션 만료 예정</h2>
            <p className="text-gray-400 text-xs">보안을 위해 자동 로그아웃됩니다</p>
          </div>
        </div>

        {/* 타이머 */}
        <div
          className={`flex items-center justify-center gap-2 py-4 mb-4 rounded-xl ${
            isUrgent ? 'bg-red-500/10 border border-red-500/30' : 'bg-gray-800'
          }`}
        >
          <Clock className={`w-5 h-5 ${isUrgent ? 'text-red-400' : 'text-gray-400'}`} />
          <span
            className={`text-2xl font-mono font-bold tabular-nums ${
              isUrgent ? 'text-red-400' : 'text-white'
            }`}
          >
            {formatSeconds(displayMs)}
          </span>
          <span className="text-gray-500 text-sm">후 로그아웃</span>
        </div>

        {/* 프로그레스 바 */}
        <div className="w-full h-1 bg-gray-700 rounded-full mb-5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              isUrgent ? 'bg-red-400' : 'bg-amber-400'
            }`}
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        {/* 버튼 */}
        <div className="flex gap-3">
          <button
            onClick={onLogout}
            className="flex-1 py-2.5 px-4 rounded-xl border border-gray-600 text-gray-400 text-sm font-medium hover:border-gray-500 hover:text-gray-300 transition-colors"
          >
            지금 로그아웃
          </button>
          <button
            onClick={onExtend}
            className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors"
          >
            계속 사용하기
          </button>
        </div>

        <p className="text-center text-gray-600 text-xs mt-3">
          30분간 활동이 없어 자동 로그아웃 예정입니다
        </p>
      </div>
    </div>
  );
}
