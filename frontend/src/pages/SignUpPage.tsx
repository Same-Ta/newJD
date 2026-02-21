import { FONTS } from '@/constants/fonts';
import { auth, googleProvider } from '@/config/firebase';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { authAPI } from '@/services/api';
import { useState } from 'react';

interface SignUpPageProps {
    onLogin: () => void;
    onNavigateToLogin: () => void;
}

export const SignUpPage = ({ onLogin, onNavigateToLogin }: SignUpPageProps) => {
        const [email, setEmail] = useState('');
        const [password, setPassword] = useState('');
        const [confirmPassword, setConfirmPassword] = useState('');
        const [nickname, setNickname] = useState('');
        const [loading, setLoading] = useState(false);
        const [error, setError] = useState('');

        const handleGoogleLogin = async () => {
                setError('');
                setLoading(true);
                try {
                        const result = await signInWithPopup(auth, googleProvider);
                        const token = await result.user.getIdToken();
                        await authAPI.googleLogin(token);
                        console.log('Google 로그인 성공');
                        setLoading(false);
                        onLogin();
                } catch (err: any) {
                        console.error('Google 로그인 오류:', err);
                        setLoading(false);
                        if (err.code === 'auth/popup-closed-by-user') {
                                return;
                        }
                        setError(err.message || 'Google 로그인 중 오류가 발생했습니다.');
                }
        };

        const handleSubmit = async (e: React.FormEvent) => {
                e.preventDefault();
                setError('');

                // 비밀번호 일치 확인
                if (password !== confirmPassword) {
                        setError('비밀번호가 일치하지 않습니다.');
                        return;
                }

                // 비밀번호 길이 확인
                if (password.length < 6) {
                        setError('비밀번호는 최소 6자 이상이어야 합니다.');
                        return;
                }

                setLoading(true);
                console.log('회원가입 시작...');
                
                try {
                        console.log('회원가입 API 호출 중...');
                        // 백엔드 API로 회원가입 (Firebase Auth + Firestore 모두 처리)
                        await authAPI.register(email, password, nickname);
                        
                        // 백엔드에서 생성된 계정으로 클라이언트 로그인
                        await signInWithEmailAndPassword(auth, email, password);
                        
                        console.log('회원가입 성공!');
                        setLoading(false);
                        alert('회원가입이 완료되었습니다! 로그인 페이지로 이동합니다.');
                        onNavigateToLogin();
                } catch (err: any) {
                        console.error('회원가입 오류:', err);
                        setLoading(false);
                        
                        // Firebase 에러 코드에 따른 한글 메시지
                        if (err.code === 'auth/email-already-in-use') {
                                setError('이미 사용 중인 이메일입니다.');
                        } else if (err.code === 'auth/invalid-email') {
                                setError('유효하지 않은 이메일 형식입니다.');
                        } else if (err.code === 'auth/weak-password') {
                                setError('비밀번호가 너무 약합니다.');
                        } else {
                                setError(err.message || '회원가입 중 오류가 발생했습니다.');
                        }
                }
        };

        return (
                <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans" style={{ fontFamily: FONTS.sans }}>
                        {/* Background elements */}
                        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-50/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                        
                        <div className="absolute top-6 left-4 sm:top-10 sm:left-10 flex items-center gap-2.5">
                                <img src="/logo.png" alt="WINNOW" className="w-8 h-8 object-contain" />
                                <span className="font-extrabold text-xl tracking-tight text-slate-900">WINNOW</span>
                        </div>

                        <div className="w-full max-w-[400px] relative z-10">
                                <h1 className="text-[26px] sm:text-[32px] font-extrabold text-center mb-8 sm:mb-12 text-slate-900">회원가입</h1>
                                
                                <form onSubmit={handleSubmit} className="space-y-5">
                                        {error && <div className="text-red-500 text-sm text-center">{error}</div>}
                                        
                                        <div className="space-y-1.5">
                                                <label className="block text-[13px] font-bold text-slate-600">Nickname</label>
                                                <input type="text" placeholder="Enter nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} required className="w-full h-12 px-4 bg-slate-50 border border-gray-200 rounded-xl text-[15px] placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" />
                                        </div>

                                        <div className="space-y-1.5">
                                                <label className="block text-[13px] font-bold text-slate-600">Email</label>
                                                <input type="email" placeholder="Enter email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full h-12 px-4 bg-slate-50 border border-gray-200 rounded-xl text-[15px] placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" />
                                        </div>

                                        <div className="space-y-1.5">
                                                <label className="block text-[13px] font-bold text-slate-600">Password</label>
                                                <input type="password" placeholder="Create a password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full h-12 px-4 bg-slate-50 border border-gray-200 rounded-xl text-[15px] placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" />
                                        </div>
                                        <div className="space-y-1.5">
                                                <input type="password" placeholder="Confirm password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="w-full h-12 px-4 bg-slate-50 border border-gray-200 rounded-xl text-[15px] placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" />
                                        </div>
                                        
                                        <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white h-12 rounded-xl font-bold text-[15px] hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30 mt-4 active:scale-[0.98] disabled:opacity-50">
                                                {loading ? 'Signing up...' : 'Sign up'}
                                        </button>
                                </form>
                                
                                <div className="relative my-8">
                                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
                                        <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-400 font-medium">Or continue with</span></div>
                                </div>

                                <button 
                                        onClick={handleGoogleLogin}
                                        disabled={loading}
                                        className="w-full bg-white border border-gray-200 text-slate-700 h-12 rounded-xl font-semibold text-[15px] hover:bg-gray-50 transition-all flex items-center justify-center gap-2.5 active:scale-[0.98] disabled:opacity-50"
                                >
                                         <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                                         Start with Google
                                </button>

                                {/* 로그인 링크 */}
                                <div className="text-center mt-6">
                                        <p className="text-sm text-slate-600">
                                                이미 계정이 있으신가요?{' '}
                                                <button 
                                                        onClick={onNavigateToLogin}
                                                        className="text-blue-600 font-bold hover:text-blue-700 transition-colors"
                                                >
                                                        로그인
                                                </button>
                                        </p>
                                </div>
                        </div>
                </div>
        )
}
