import { useState } from 'react';
import { auth } from '@/config/firebase';
import { updatePassword, updateProfile, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { resetTutorial } from '@/components/onboarding';
import { BookOpen } from 'lucide-react';

export const AccountSettings = () => {
  const user = auth.currentUser;
  
  // 프로필 정보
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [email] = useState(user?.email || '');
  
  // 비밀번호 변경
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // 상태
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 프로필 업데이트
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setMessage(null);

    try {
      await updateProfile(user, {
        displayName: displayName
      });
      setMessage({ type: 'success', text: '프로필이 성공적으로 업데이트되었습니다.' });
      // 페이지 새로고침으로 사이드바 업데이트
      window.location.reload();
    } catch (error: any) {
      console.error('프로필 업데이트 오류:', error);
      setMessage({ type: 'error', text: '프로필 업데이트 중 오류가 발생했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  // 비밀번호 변경
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.email) return;

    setPasswordMessage(null);

    // 유효성 검사
    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: '새 비밀번호는 최소 6자 이상이어야 합니다.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: '새 비밀번호가 일치하지 않습니다.' });
      return;
    }

    setLoading(true);

    try {
      // 재인증
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // 비밀번호 변경
      await updatePassword(user, newPassword);
      
      setPasswordMessage({ type: 'success', text: '비밀번호가 성공적으로 변경되었습니다.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('비밀번호 변경 오류:', error);
      if (error.code === 'auth/wrong-password') {
        setPasswordMessage({ type: 'error', text: '현재 비밀번호가 올바르지 않습니다.' });
      } else if (error.code === 'auth/weak-password') {
        setPasswordMessage({ type: 'error', text: '새 비밀번호가 너무 약합니다.' });
      } else {
        setPasswordMessage({ type: 'error', text: '비밀번호 변경 중 오류가 발생했습니다.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[720px] mx-auto space-y-6 sm:space-y-8">
      {/* 프로필 정보 카드 */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 sm:px-8 py-4 sm:py-5 border-b border-gray-100">
          <h3 className="text-[15px] font-bold text-gray-900">프로필 정보</h3>
          <p className="text-[12px] text-gray-400 mt-0.5">다른 팀원에게 보여지는 이름을 설정하세요</p>
        </div>

        <form onSubmit={handleUpdateProfile} className="p-5 sm:p-8 space-y-5">
          {/* 이름 */}
          <div>
            <label className="block text-[13px] font-semibold text-gray-700 mb-2">이름</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="이름을 입력하세요"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-[14px] focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
              required
            />
          </div>

          {/* 이메일 (읽기 전용) */}
          <div>
            <label className="block text-[13px] font-semibold text-gray-700 mb-2">이메일</label>
            <div className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-[14px] text-gray-500">
              {email}
            </div>
            <p className="text-[11px] text-gray-400 mt-1.5">이메일은 변경할 수 없습니다</p>
          </div>

          {/* 메시지 */}
          {message && (
            <div className={`p-4 rounded-xl text-[13px] font-medium ${
              message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {message.text}
            </div>
          )}

          {/* 저장 버튼 */}
          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 bg-blue-600 text-white text-[14px] font-bold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '저장 중...' : '프로필 저장'}
          </button>
        </form>
      </div>

      {/* 비밀번호 변경 카드 */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 sm:px-8 py-4 sm:py-5 border-b border-gray-100">
          <h3 className="text-[15px] font-bold text-gray-900">비밀번호 변경</h3>
          <p className="text-[12px] text-gray-400 mt-0.5">계정 보안을 위해 정기적으로 변경하세요</p>
        </div>

        <form onSubmit={handleChangePassword} className="p-5 sm:p-8 space-y-5">
          {/* 현재 비밀번호 */}
          <div>
            <label className="block text-[13px] font-semibold text-gray-700 mb-2">현재 비밀번호</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="현재 비밀번호를 입력하세요"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-[14px] focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
              required
            />
          </div>

          <div className="h-px bg-gray-100" />

          {/* 새 비밀번호 */}
          <div>
            <label className="block text-[13px] font-semibold text-gray-700 mb-2">새 비밀번호</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="새 비밀번호를 입력하세요 (최소 6자)"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-[14px] focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
              required
            />
            {newPassword && (
              <div className="mt-2 flex gap-1">
                {[1,2,3,4].map(level => (
                  <div key={level} className={`h-1 flex-1 rounded-full transition-colors ${
                    newPassword.length >= level * 3
                      ? level <= 1 ? 'bg-red-400' : level <= 2 ? 'bg-orange-400' : level <= 3 ? 'bg-yellow-400' : 'bg-green-500'
                      : 'bg-gray-200'
                  }`} />
                ))}
              </div>
            )}
          </div>

          {/* 새 비밀번호 확인 */}
          <div>
            <label className="block text-[13px] font-semibold text-gray-700 mb-2">새 비밀번호 확인</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="새 비밀번호를 다시 입력하세요"
              className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-[14px] focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all ${
                confirmPassword && confirmPassword !== newPassword ? 'border-red-300' : 'border-gray-200'
              }`}
              required
            />
            {confirmPassword && confirmPassword !== newPassword && (
              <p className="text-[11px] text-red-500 mt-1.5 font-medium">비밀번호가 일치하지 않습니다</p>
            )}
          </div>

          {/* 비밀번호 메시지 */}
          {passwordMessage && (
            <div className={`p-4 rounded-xl text-[13px] font-medium ${
              passwordMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {passwordMessage.text}
            </div>
          )}

          {/* 변경 버튼 */}
          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 bg-gray-900 text-white text-[14px] font-bold rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '변경 중...' : '비밀번호 변경'}
          </button>
        </form>
      </div>

      {/* 계정 활동 */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 sm:px-8 py-4 sm:py-5 border-b border-gray-100">
          <h3 className="text-[15px] font-bold text-gray-900">계정 활동</h3>
        </div>
        <div className="p-5 sm:p-8 space-y-4">
          <div className="flex justify-between items-center py-3 border-b border-gray-50">
            <div>
              <p className="text-[13px] font-semibold text-gray-700">가입일</p>
              <p className="text-[11px] text-gray-400 mt-0.5">계정이 생성된 날짜</p>
            </div>
            <span className="text-[13px] font-bold text-gray-900">
              {user?.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}
            </span>
          </div>
          <div className="flex justify-between items-center py-3">
            <div>
              <p className="text-[13px] font-semibold text-gray-700">마지막 로그인</p>
              <p className="text-[11px] text-gray-400 mt-0.5">가장 최근 접속 기록</p>
            </div>
            <span className="text-[13px] font-bold text-gray-900">
              {user?.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
            </span>
          </div>
        </div>
      </div>
      {/* 서비스 가이드 */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 sm:px-8 py-4 sm:py-5 border-b border-gray-100">
          <h3 className="text-[15px] font-bold text-gray-900">서비스 가이드</h3>
          <p className="text-[12px] text-gray-400 mt-0.5">WINNOW 사용법을 다시 확인할 수 있습니다</p>
        </div>
        <div className="p-5 sm:p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-indigo-500" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-gray-700">서비스 가이드 다시 보기</p>
                <p className="text-[11px] text-gray-400 mt-0.5">실제 화면을 통한 인터랙티브 가이드를 다시 체험합니다</p>
              </div>
            </div>
            <button
              onClick={() => {
                resetTutorial();
                alert('서비스 가이드가 초기화되었습니다. 다음 페이지 이동 시 가이드가 표시될 수 있습니다.\n\n즉시 시작하려면 우측 하단의 가이드 버튼을 클릭하세요.');
              }}
              className="px-4 py-2 text-[13px] font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors"
            >
              초기화
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
