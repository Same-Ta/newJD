import { useState, useEffect } from 'react';
import { Users, UserPlus, Trash2, Crown, Mail, X, Loader2, AlertCircle, CheckCircle, FileText, ChevronRight, Clock, Check, XCircle, Bell } from 'lucide-react';
import { FONTS } from '@/constants/fonts';
import { teamAPI, jdAPI } from '@/services/api';
import { useDemoMode } from '@/components/onboarding';

interface Collaborator {
  uid: string | null;
  email: string;
  name: string;
  role: string;
  addedAt?: { seconds: number; nanoseconds: number };
}

interface PendingInvitation {
  id: string;
  jdId: string;
  jdTitle: string;
  inviterName: string;
  inviterEmail: string;
  inviteeEmail: string;
  inviteeName: string;
  status: string;
  createdAt?: { seconds: number; nanoseconds: number };
}

interface JDItem {
  id: string;
  title: string;
  _role?: string;
  collaborators?: Collaborator[];
}

interface TeamManagementProps {
  onNavigate?: (page: string) => void;
}

export const TeamManagement = (_props: TeamManagementProps) => {
  const { isDemoMode, demoJDs, demoTeamMembers, onDemoAction } = useDemoMode();
  const [jds, setJds] = useState<JDItem[]>([]);
  const [selectedJdId, setSelectedJdId] = useState<string | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [ownerInfo, setOwnerInfo] = useState<{ name: string; email: string }>({ name: '', email: '' });
  const [loading, setLoading] = useState(true);
  const [collabLoading, setCollabLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // 초대 관련 상태
  const [myInvitations, setMyInvitations] = useState<PendingInvitation[]>([]);
  const [sentInvitations, setSentInvitations] = useState<PendingInvitation[]>([]);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [invitationsLoading, setInvitationsLoading] = useState(false);

  // 투토리얼 스텝 전환 시 초대 모달 강제 닫기 (Phase 3→4 전환 등)
  useEffect(() => {
    if (!isDemoMode) return;
    const handleCloseMenus = () => setShowInviteModal(false);
    window.addEventListener('tutorial:close-menus', handleCloseMenus);
    return () => window.removeEventListener('tutorial:close-menus', handleCloseMenus);
  }, [isDemoMode]);

  useEffect(() => {
    if (isDemoMode) {
      // 데모 모드: 가짜 JD로 세팅
      setJds(demoJDs.map((j: any) => ({ id: j.id, title: j.title })) as JDItem[]);
      setLoading(false);
      return;
    }
    loadJDs();
    loadMyInvitations();
  }, [isDemoMode]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const loadJDs = async () => {
    try {
      setLoading(true);
      const data = await jdAPI.getAll();
      setJds(data || []);
    } catch (error: any) {
      console.error('공고 목록 로드 실패:', error);
      setToast({ type: 'error', message: '공고 목록을 불러오는데 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  const loadCollaborators = async (jdId: string) => {
    try {
      setCollabLoading(true);
      const data = await teamAPI.getCollaborators(jdId);
      setCollaborators(data.collaborators || []);
      setOwnerInfo({ name: data.ownerName || '', email: data.ownerEmail || '' });
      // 보낸 초대도 함께 로드
      await loadSentInvitations(jdId);
    } catch (error: any) {
      console.error('협업자 로드 실패:', error);
      setCollaborators([]);
    } finally {
      setCollabLoading(false);
    }
  };

  const loadMyInvitations = async () => {
    try {
      setInvitationsLoading(true);
      const data = await teamAPI.getMyInvitations();
      setMyInvitations(data.invitations || []);
    } catch (error: any) {
      console.error('초대 목록 로드 실패:', error);
    } finally {
      setInvitationsLoading(false);
    }
  };

  const loadSentInvitations = async (jdId: string) => {
    try {
      const data = await teamAPI.getSentInvitations(jdId);
      setSentInvitations(data.invitations || []);
    } catch (error: any) {
      console.error('보낸 초대 로드 실패:', error);
      setSentInvitations([]);
    }
  };

  const handleRespondInvitation = async (invitationId: string, action: 'accept' | 'reject') => {
    try {
      setRespondingId(invitationId);
      const result = await teamAPI.respondToInvitation(invitationId, action);
      setToast({ type: 'success', message: result.message });
      // 초대 목록 새로고침
      await loadMyInvitations();
      // 공고 목록도 새로고침 (수락 시 새 공고가 보일 수 있음)
      if (action === 'accept') {
        await loadJDs();
      }
    } catch (error: any) {
      setToast({ type: 'error', message: error.message || '초대 응답에 실패했습니다.' });
    } finally {
      setRespondingId(null);
    }
  };

  const handleSelectJD = (jdId: string) => {
    setSelectedJdId(jdId);
    if (isDemoMode) {
      // 데모 모드: 가짜 협업자 데이터 세팅
      setCollaborators(demoTeamMembers.map((m: any) => ({
        uid: null,
        email: m.email,
        name: m.name,
        role: m.role,
      })));
      setOwnerInfo({ name: '나', email: 'demo@winnow.com' });
      return;
    }
    loadCollaborators(jdId);
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !selectedJdId) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail.trim())) {
      setToast({ type: 'error', message: '올바른 이메일 형식을 입력해주세요.' });
      return;
    }

    if (isDemoMode) {
      // 데모 모드: API 호출 없이 성공 처리
      setToast({ type: 'success', message: `${inviteEmail.trim()} 님에게 초대를 보냈습니다.` });
      setSentInvitations(prev => [...prev, {
        id: 'demo-inv-' + Date.now(),
        jdId: selectedJdId,
        jdTitle: jds.find(j => j.id === selectedJdId)?.title || '',
        inviterName: '나',
        inviterEmail: 'demo@winnow.com',
        inviteeEmail: inviteEmail.trim(),
        inviteeName: inviteEmail.split('@')[0],
        status: 'pending',
      }]);
      setInviteEmail('');
      setShowInviteModal(false);
      onDemoAction?.('team-invited');
      return;
    }

    try {
      setInviting(true);
      await teamAPI.invite(selectedJdId, inviteEmail.trim());
      setToast({ type: 'success', message: `${inviteEmail.trim()} 님에게 초대를 보냈습니다. 상대방이 수락하면 협업자로 추가됩니다.` });
      setInviteEmail('');
      setShowInviteModal(false);
      await loadSentInvitations(selectedJdId);
    } catch (error: any) {
      setToast({ type: 'error', message: error.message || '초대에 실패했습니다.' });
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveCollaborator = async (email: string, name: string) => {
    if (!selectedJdId) return;
    if (!confirm(`정말 ${name} 님을 이 공고에서 제거하시겠습니까?`)) return;

    try {
      await teamAPI.removeCollaborator(selectedJdId, email);
      setToast({ type: 'success', message: `${name} 님을 공고에서 제거했습니다.` });
      await loadCollaborators(selectedJdId);
    } catch (error: any) {
      setToast({ type: 'error', message: error.message || '제거에 실패했습니다.' });
    }
  };

  const formatDate = (timestamp?: { seconds: number }) => {
    if (!timestamp) return '-';
    return new Date(timestamp.seconds * 1000).toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    if (/[가-힣]/.test(name[0])) return name[0];
    return name.substring(0, 2).toUpperCase();
  };

  const avatarColors = [
    'bg-blue-100 text-blue-600 border-blue-200',
    'bg-purple-100 text-purple-600 border-purple-200',
    'bg-green-100 text-green-600 border-green-200',
    'bg-orange-100 text-orange-600 border-orange-200',
    'bg-pink-100 text-pink-600 border-pink-200',
    'bg-teal-100 text-teal-600 border-teal-200',
  ];

  const selectedJD = jds.find(j => j.id === selectedJdId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">공고 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[900px] mx-auto" style={{ fontFamily: FONTS.sans }}>
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-4 sm:right-6 left-4 sm:left-auto z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border transition-all max-w-sm sm:max-w-none sm:w-auto ${
          toast.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          <span className="text-sm font-medium">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 opacity-60 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">팀 관리</h2>
        <p className="text-sm text-gray-500 mt-1">공고별로 팀원을 초대하여 함께 채용을 관리하세요</p>
      </div>

      {/* 받은 초대 목록 (대기 중) */}
      {!isDemoMode && myInvitations.length > 0 && (
        <div className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-amber-100 flex items-center gap-2">
            <Bell size={16} className="text-amber-600" />
            <span className="font-semibold text-amber-900 text-sm">받은 초대</span>
            <span className="ml-2 text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full font-bold">
              {myInvitations.length}건
            </span>
          </div>
          <div className="divide-y divide-amber-100">
            {myInvitations.map((inv) => (
              <div key={inv.id} className="px-5 py-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <Mail size={18} className="text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {inv.jdTitle}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    <span className="font-medium text-amber-700">{inv.inviterName}</span>님이 초대했습니다
                  </p>
                  {inv.createdAt && (
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {new Date(inv.createdAt.seconds * 1000).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleRespondInvitation(inv.id, 'reject')}
                    disabled={respondingId === inv.id}
                    className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-100 hover:border-gray-300 text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    {respondingId === inv.id ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <XCircle size={13} />
                    )}
                    거절
                  </button>
                  <button
                    onClick={() => handleRespondInvitation(inv.id, 'accept')}
                    disabled={respondingId === inv.id}
                    className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-xs font-semibold transition-colors shadow-md shadow-blue-500/20 disabled:opacity-50"
                  >
                    {respondingId === inv.id ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Check size={13} />
                    )}
                    수락
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {invitationsLoading && myInvitations.length === 0 && (
        <div className="mb-6 bg-gray-50 border border-gray-100 rounded-2xl p-4 flex items-center gap-3">
          <Loader2 size={16} className="animate-spin text-gray-400" />
          <span className="text-sm text-gray-400">초대 목록 확인 중...</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* 좌측: 공고 목록 */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
              <FileText size={16} className="text-gray-500" />
              <span className="font-semibold text-gray-800 text-sm">내 공고</span>
              <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full font-medium">
                {jds.length}
              </span>
            </div>
            <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
              {jds.length === 0 ? (
                <div className="py-12 text-center">
                  <FileText size={32} className="text-gray-200 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">공고가 없습니다</p>
                </div>
              ) : (
                jds.map((jd, jdIdx) => (
                  <button
                    key={jd.id}
                    onClick={() => handleSelectJD(jd.id)}
                    className={`w-full px-5 py-3.5 text-left flex items-center gap-3 transition-colors ${
                      selectedJdId === jd.id
                        ? 'bg-blue-50 border-l-2 border-blue-600'
                        : 'hover:bg-gray-50 border-l-2 border-transparent'
                    }`}
                    {...(jdIdx === 0 ? { 'data-tour': 'team-jd-first' } : {})}
                  >
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${selectedJdId === jd.id ? 'text-blue-700' : 'text-gray-900'}`}>
                        {jd.title || '제목 없음'}
                      </p>
                      {jd._role === 'collaborator' && (
                        <span className="text-[10px] text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded font-medium mt-1 inline-block">
                          협업 참여
                        </span>
                      )}
                    </div>
                    <ChevronRight size={14} className={selectedJdId === jd.id ? 'text-blue-500' : 'text-gray-300'} />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 우측: 선택된 공고의 협업자 관리 */}
        <div className="lg:col-span-3">
          {!selectedJdId ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
              <Users size={40} className="text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm font-medium">왼쪽에서 공고를 선택하세요</p>
              <p className="text-gray-300 text-xs mt-1">공고별로 협업자를 관리할 수 있습니다</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 선택된 공고 헤더 */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 text-base break-words">{selectedJD?.title || '제목 없음'}</h3>
                    <p className="text-xs text-gray-400 mt-1">이 공고의 협업자를 관리합니다</p>
                  </div>
                  <button
                    onClick={() => setShowInviteModal(true)}
                    data-tour="team-invite-btn"
                    className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold text-sm shadow-md shadow-blue-500/20 whitespace-nowrap"
                  >
                    <UserPlus size={14} />
                    초대
                  </button>
                </div>
              </div>

              {/* 협업자 목록 */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-50 flex items-center gap-2">
                  <Users size={16} className="text-gray-500" />
                  <span className="font-semibold text-gray-800 text-sm">멤버</span>
                  <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full font-medium">
                    {collaborators.length + 1}명
                  </span>
                </div>

                {collabLoading ? (
                  <div className="py-8 text-center">
                    <Loader2 className="w-6 h-6 text-blue-500 animate-spin mx-auto mb-2" />
                    <p className="text-gray-400 text-xs">불러오는 중...</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {/* 소유자 (항상 표시) */}
                    <div className="px-5 py-3.5 flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs border ${avatarColors[0]}`}>
                        {getInitials(ownerInfo.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 text-sm">{ownerInfo.name || '소유자'}</span>
                          <span className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold">
                            <Crown size={9} /> 소유자
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Mail size={10} className="text-gray-400" />
                          <span className="text-[11px] text-gray-500">{ownerInfo.email}</span>
                        </div>
                      </div>
                    </div>

                    {/* 협업자 목록 */}
                    {collaborators.map((collab, idx) => (
                      <div key={collab.email} className="px-5 py-3.5 flex items-center gap-3 group">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs border ${avatarColors[(idx + 1) % avatarColors.length]}`}>
                          {getInitials(collab.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold text-gray-900 text-sm">{collab.name}</span>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Mail size={10} className="text-gray-400" />
                            <span className="text-[11px] text-gray-500">{collab.email}</span>
                          </div>
                        </div>
                        <div className="text-[11px] text-gray-400 hidden sm:block">
                          {formatDate(collab.addedAt)}
                        </div>
                        <button
                          onClick={() => handleRemoveCollaborator(collab.email, collab.name)}
                          className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          title="공고에서 제거"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}

                    {collaborators.length === 0 && (
                      <div className="py-8 text-center">
                        <p className="text-gray-400 text-xs">소유자 외 협업자가 없습니다</p>
                        <p className="text-gray-300 text-[11px] mt-1">초대 버튼으로 팀원을 추가하세요</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 대기 중인 보낸 초대 */}
              {sentInvitations.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-50 flex items-center gap-2">
                    <Clock size={16} className="text-amber-500" />
                    <span className="font-semibold text-gray-800 text-sm">대기 중인 초대</span>
                    <span className="ml-auto text-xs text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full font-medium">
                      {sentInvitations.length}건
                    </span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {sentInvitations.map((inv) => (
                      <div key={inv.id} className="px-5 py-3 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center border border-amber-200">
                          <Clock size={14} className="text-amber-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-gray-700">{inv.inviteeName || inv.inviteeEmail}</span>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Mail size={10} className="text-gray-400" />
                            <span className="text-[11px] text-gray-500">{inv.inviteeEmail}</span>
                          </div>
                        </div>
                        <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
                          수락 대기
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 안내 */}
              <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <UserPlus size={13} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-blue-900">공고별 초대 안내</p>
                  <p className="text-[11px] text-blue-700 mt-0.5 leading-relaxed">
                    초대를 보내면 상대방이 수락해야 협업자로 추가됩니다.
                    협업자는 해당 공고와 지원자, 코멘트만 확인할 수 있으며,
                    다른 공고에는 접근할 수 없습니다.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus size={18} className="text-blue-600" />
                <span className="font-bold text-gray-900">협업자 초대</span>
              </div>
              <button
                onClick={() => { setShowInviteModal(false); setInviteEmail(''); }}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={18} className="text-gray-400" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-xs text-gray-500 mb-3 bg-gray-50 px-3 py-2 rounded-lg">
                <strong className="text-gray-700">{selectedJD?.title}</strong> 공고에 초대합니다
              </p>
              <label className="block text-sm font-semibold text-gray-700 mb-2">이메일 주소</label>
              <input
                type="email"
                placeholder="teammate@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                data-tour="team-invite-input"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all placeholder:text-gray-400"
                autoFocus
              />
              <p className="text-xs text-gray-400 mt-2">
                초대를 보내면 상대방이 수락/거절할 수 있습니다. 수락 시 협업자로 추가됩니다.
              </p>
            </div>
            <div className="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3">
              <button
                onClick={() => { setShowInviteModal(false); setInviteEmail(''); }}
                className="px-4 py-2.5 text-gray-600 hover:bg-gray-200 rounded-xl text-sm font-medium transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleInvite}
                disabled={inviting || !inviteEmail.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold transition-colors"
              >
                {inviting ? (
                  <><Loader2 size={14} className="animate-spin" /> 초대 중...</>
                ) : (
                  <><UserPlus size={14} /> 초대하기</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
