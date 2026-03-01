import { auth } from '@/config/firebase';
import { cache } from '@/utils/cache';

// @ts-ignore
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// 인증 토큰 캠시로 중복 호출 방지
let cachedToken: string | null = null;
let tokenExpiry: number = 0;
// 로그아웃 시 캐시 초기화 함수
export const clearAuthCache = () => {
  cachedToken = null;
  tokenExpiry = 0;
  cache.invalidateAll();
};
const getAuthToken = async (forceRefresh: boolean = false): Promise<string> => {
  const now = Date.now();
  
  // forceRefresh가 true이거나 캐시가 만료된 경우 새 토큰 발급
  if (forceRefresh || !cachedToken || now >= tokenExpiry) {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('사용자가 로그인되어 있지 않습니다.');
    }
    
    // forceRefresh 시 Firebase에서 새 토큰 강제 발급
    cachedToken = await user.getIdToken(forceRefresh);
    tokenExpiry = now + 50 * 60 * 1000; // 50분 캐시 (토큰 유효기간은 1시간)
    
    if (forceRefresh) {
      console.log('🔄 Auth token forcefully refreshed');
    }
  }
  
  return cachedToken;
};

// API 요청 헬퍼 (토큰 만료 시 자동 재시도 + Cold Start 대응)
const apiRequest = async (endpoint: string, options: RequestInit = {}, retryCount: number = 0): Promise<any> => {
  try {
    const token = await getAuthToken(retryCount > 0); // 재시도 시 토큰 강제 갱신
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept-Encoding': 'gzip',
        ...options.headers,
      },
    });

    // 401 에러 발생 시 토큰 만료로 간주하고 1회 재시도
    if (response.status === 401 && retryCount === 0) {
      console.log('⚠️  Token expired, retrying with refreshed token...');
      clearAuthCache(); // 캐시 초기화
      return await apiRequest(endpoint, options, retryCount + 1);
    }
    
    // 503 (Render cold start / Service Unavailable) → 대기 후 재시도
    if (response.status === 503 && retryCount < 2) {
      const wait = (retryCount + 1) * 3000; // 3초, 6초 대기
      console.log(`⏳ Server waking up (503), retrying in ${wait/1000}s...`);
      await new Promise(resolve => setTimeout(resolve, wait));
      return await apiRequest(endpoint, options, retryCount + 1);
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || `API 요청 실패: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    // 네트워크 에러나 타임아웃의 경우 재시도 (최대 2회)
    if (retryCount < 2 && error instanceof TypeError) {
      const wait = (retryCount + 1) * 2000; // 2초, 4초 대기
      console.log(`⚠️  Network error, retrying in ${wait/1000}s...`);
      await new Promise(resolve => setTimeout(resolve, wait));
      return await apiRequest(endpoint, options, retryCount + 1);
    }
    
    console.error('API 요청 에러:', error);
    throw error;
  }
};

// 공개 API 요청 (인증 불필요)
const publicApiRequest = async (endpoint: string, options: RequestInit = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || `API 요청 실패: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API 요청 에러:', error);
    throw error;
  }
};

// ==================== Auth API ====================
export const authAPI = {
  register: async (email: string, password: string, nickname?: string) => {
    return await publicApiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, nickname }),
    });
  },
  
  getCurrentUser: async () => {
    return await apiRequest('/api/auth/me');
  },

  googleLogin: async (token?: string) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      const authToken = await getAuthToken();
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    const response = await fetch(`${API_BASE_URL}/api/auth/google-login`, {
      method: 'POST',
      headers,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || `API 요청 실패: ${response.status}`);
    }
    return await response.json();
  },
};

// ==================== 공고 API ====================
export const jdAPI = {
  create: async (jdData: any) => {
    const result = await apiRequest('/api/jds', {
      method: 'POST',
      body: JSON.stringify(jdData),
    });
    cache.invalidate('jds-all');
    return result;
  },

  getAll: async (useCache: boolean = true) => {
    if (useCache) {
      const cached = cache.get('jds-all');
      if (cached) {
        console.log('✅ 캐시에서 JD 목록 로드');
        return cached;
      }
    }
    
    console.log('🔄 서버에서 JD 목록 로드');
    const data = await apiRequest('/api/jds');
    cache.set('jds-all', data, 5 * 60 * 1000); // 5분 캐시
    return data;
  },

  getById: async (jdId: string) => {
    return await publicApiRequest(`/api/jds/${jdId}`);
  },

  update: async (jdId: string, jdData: any) => {
    const result = await apiRequest(`/api/jds/${jdId}`, {
      method: 'PUT',
      body: JSON.stringify(jdData),
    });
    cache.invalidate('jds-all');
    return result;
  },

  delete: async (jdId: string) => {
    const result = await apiRequest(`/api/jds/${jdId}`, {
      method: 'DELETE',
    });
    cache.invalidate('jds-all');
    return result;
  },

  // 이미지 압축 후 base64 변환
  compressImage: (file: File, maxWidth: number = 800, quality: number = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // 리사이즈
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context not available'));
            return;
          }
          
          ctx.drawImage(img, 0, 0, width, height);
          const base64 = canvas.toDataURL('image/jpeg', quality);
          resolve(base64);
        };
        img.onerror = () => reject(new Error('이미지 로드 실패'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('파일 읽기 실패'));
      reader.readAsDataURL(file);
    });
  },
};

// ==================== Application API ====================
export const applicationAPI = {
  create: async (applicationData: any) => {
    const result = await publicApiRequest('/api/applications', {
      method: 'POST',
      body: JSON.stringify(applicationData),
    });
    // 캐시 무효화
    cache.invalidate('applications-all');
    return result;
  },

  getAll: async (useCache: boolean = true) => {
    // 캐시 확인
    if (useCache) {
      const cached = cache.get('applications-all');
      if (cached) {
        console.log('✅ 캐시에서 지원서 데이터 로드');
        return cached;
      }
    }
    
    console.log('🔄 서버에서 지원서 데이터 로드');
    const data = await apiRequest('/api/applications');
    
    // 캐시 저장 (3분)
    cache.set('applications-all', data, 3 * 60 * 1000);
    return data;
  },

  getById: async (applicationId: string, useCache: boolean = true) => {
    const cacheKey = `application-${applicationId}`;
    
    if (useCache) {
      const cached = cache.get(cacheKey);
      if (cached) {
        console.log(`✅ 캐시에서 지원서 ${applicationId} 로드`);
        return cached;
      }
    }
    
    const data = await apiRequest(`/api/applications/${applicationId}`);
    cache.set(cacheKey, data, 3 * 60 * 1000);
    return data;
  },

  update: async (applicationId: string, status: string) => {
    const result = await apiRequest(`/api/applications/${applicationId}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
    // 관련 캐시 무효화
    cache.invalidate('applications-all');
    cache.invalidate(`application-${applicationId}`);
    return result;
  },

  delete: async (applicationId: string) => {
    const result = await apiRequest(`/api/applications/${applicationId}`, {
      method: 'DELETE',
    });
    // 관련 캐시 무효화
    cache.invalidate('applications-all');
    cache.invalidate(`application-${applicationId}`);
    return result;
  },

  analyze: async (applicantData: any, aiCriteria?: string) => {
    return await apiRequest('/api/applications/analyze', {
      method: 'POST',
      body: JSON.stringify({ applicantData, ...(aiCriteria ? { aiCriteria } : {}) }),
    });
  },

  saveAnalysis: async (applicationId: string, analysis: string) => {
    return await apiRequest(`/api/applications/${applicationId}/analysis`, {
      method: 'POST',
      body: JSON.stringify({ analysis }),
    });
  },

  getAnalysis: async (applicationId: string) => {
    return await apiRequest(`/api/applications/${applicationId}/analysis`);
  },
  
  // 캐시 강제 새로고침
  refresh: async () => {
    cache.invalidate('applications-all');
    return await applicationAPI.getAll(false);
  },

  uploadPortfolio: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_BASE_URL}/api/applications/upload-portfolio`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || `업로드 실패: ${response.status}`);
    }
    return await response.json();
  },

  downloadPortfolio: async (applicationId: string) => {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/applications/download-portfolio/${applicationId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) {
      throw new Error('다운로드 실패');
    }
    return response;
  },
};

// ==================== Gemini API ====================
export const geminiAPI = {
  chat: async (message: string, chatHistory: any[] = [], type: string = 'club') => {
    return await apiRequest('/api/gemini/chat', {
      method: 'POST',
      body: JSON.stringify({ message, chatHistory, type }),
    });
  },
  
  // 시맨틱 지원자 검색
  semanticSearch: async (query: string, applications: any[]) => {
    return await apiRequest('/api/gemini/semantic-search', {
      method: 'POST',
      body: JSON.stringify({ query, applications }),
    });
  },
  
  // 대화형 지원자 데이터 질의
  queryApplicants: async (question: string, applications: any[], chatHistory: any[] = []) => {
    return await apiRequest('/api/gemini/query-applicants', {
      method: 'POST',
      body: JSON.stringify({ question, applications, chatHistory }),
    });
  },
};

// ==================== Comment API ====================
export const commentAPI = {
  getByApplicationId: async (applicationId: string) => {
    return await apiRequest(`/api/comments/${applicationId}`);
  },

  create: async (applicationId: string, content: string, posX?: number, posY?: number, parentId?: string) => {
    const body: any = { applicationId, content };
    if (posX !== undefined) body.posX = posX;
    if (posY !== undefined) body.posY = posY;
    if (parentId !== undefined) body.parentId = parentId;
    return await apiRequest('/api/comments', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  update: async (commentId: string, content: string) => {
    return await apiRequest(`/api/comments/${commentId}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    });
  },

  delete: async (commentId: string) => {
    return await apiRequest(`/api/comments/${commentId}`, {
      method: 'DELETE',
    });
  },

  resolve: async (commentId: string) => {
    return await apiRequest(`/api/comments/${commentId}/resolve`, {
      method: 'PUT',
    });
  },
};

// ==================== PDF API ====================
export const pdfAPI = {
  analyze: async (file: File) => {
    const token = await getAuthToken();
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_BASE_URL}/api/pdf/analyze`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
    if (response.status === 401) {
      // 토큰 만료 시 재시도
      const newToken = await getAuthToken(true);
      const retryResponse = await fetch(`${API_BASE_URL}/api/pdf/analyze`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${newToken}` },
        body: formData,
      });
      if (!retryResponse.ok) {
        const error = await retryResponse.json().catch(() => ({ detail: retryResponse.statusText }));
        throw new Error(error.detail || `PDF 분석 실패: ${retryResponse.status}`);
      }
      return await retryResponse.json();
    }
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || `PDF 분석 실패: ${response.status}`);
    }
    return await response.json();
  },
};

// ==================== Team API ====================
export const teamAPI = {
  getCollaborators: async (jdId: string) => {
    return await apiRequest(`/api/team/collaborators/${jdId}`);
  },

  invite: async (jdId: string, email: string) => {
    const result = await apiRequest('/api/team/invite', {
      method: 'POST',
      body: JSON.stringify({ jdId, email }),
    });
    cache.invalidate('jds-all');
    return result;
  },

  removeCollaborator: async (jdId: string, memberEmail: string) => {
    const result = await apiRequest(`/api/team/collaborators/${jdId}/${encodeURIComponent(memberEmail)}`, {
      method: 'DELETE',
    });
    cache.invalidate('jds-all');
    return result;
  },

  // 내게 온 대기 중 초대 목록
  getMyInvitations: async () => {
    return await apiRequest('/api/team/invitations');
  },

  // 특정 JD에 보낸 대기 중 초대 목록
  getSentInvitations: async (jdId: string) => {
    return await apiRequest(`/api/team/invitations/sent/${jdId}`);
  },

  // 초대 수락/거절
  respondToInvitation: async (invitationId: string, action: 'accept' | 'reject') => {
    const result = await apiRequest(`/api/team/invitations/${invitationId}/respond`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
    cache.invalidate('jds-all');
    return result;
  },
};
