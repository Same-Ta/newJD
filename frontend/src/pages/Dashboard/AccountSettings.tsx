import { useState } from 'react';
import { auth } from '@/config/firebase';
import { updatePassword, updateProfile, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { User, Lock, Mail, AlertCircle, CheckCircle2 } from 'lucide-react';

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
    <div className="max-w-[800px] mx-auto space-y-6">
      {/* 헤더 */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">계정 설정</h2>
        <p className="text-gray-500 text-sm mt-1">프로필 정보 및 비밀번호를 관리하세요</p>
      </div>

      {/* 프로필 정보 카드 */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
            <User size={20} className="text-blue-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">프로필 정보</h3>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-5">
          {/* 이름 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">이름</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="이름을 입력하세요"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              required
            />
          </div>

          {/* 이메일 (읽기 전용) */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">이메일</label>
            <div className="flex items-center gap-2 w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-600">
              <Mail size={16} className="text-gray-400" />
              <span>{email}</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">이메일은 변경할 수 없습니다</p>
          </div>

          {/* 메시지 */}
          {message && (
            <div className={`flex items-center gap-2 p-4 rounded-lg ${
              message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle2 size={18} />
              ) : (
                <AlertCircle size={18} />
              )}
              <span className="text-sm font-medium">{message.text}</span>
            </div>
          )}

          {/* 저장 버튼 */}
          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '저장 중...' : '프로필 저장'}
          </button>
        </form>
      </div>

      {/* 비밀번호 변경 카드 */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
            <Lock size={20} className="text-purple-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">비밀번호 변경</h3>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-5">
          {/* 현재 비밀번호 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">현재 비밀번호</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="현재 비밀번호를 입력하세요"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              required
            />
          </div>

          {/* 새 비밀번호 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">새 비밀번호</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="새 비밀번호를 입력하세요 (최소 6자)"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              required
            />
          </div>

          {/* 새 비밀번호 확인 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">새 비밀번호 확인</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="새 비밀번호를 다시 입력하세요"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              required
            />
          </div>

          {/* 비밀번호 메시지 */}
          {passwordMessage && (
            <div className={`flex items-center gap-2 p-4 rounded-lg ${
              passwordMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {passwordMessage.type === 'success' ? (
                <CheckCircle2 size={18} />
              ) : (
                <AlertCircle size={18} />
              )}
              <span className="text-sm font-medium">{passwordMessage.text}</span>
            </div>
          )}

          {/* 변경 버튼 */}
          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '변경 중...' : '비밀번호 변경'}
          </button>
        </form>
      </div>

      {/* 계정 정보 */}
      <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6">
        <h4 className="text-sm font-bold text-gray-700 mb-3">계정 정보</h4>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>가입일</span>
            <span className="font-medium text-gray-900">
              {user?.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString('ko-KR') : '-'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>마지막 로그인</span>
            <span className="font-medium text-gray-900">
              {user?.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime).toLocaleDateString('ko-KR') : '-'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
