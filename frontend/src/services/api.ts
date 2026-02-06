import { auth } from '@/config/firebase';

// @ts-ignore
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// 인증 토큰 가져오기
const getAuthToken = async (): Promise<string> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('사용자가 로그인되어 있지 않습니다.');
  }
  return await user.getIdToken();
};

// API 요청 헬퍼
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
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
};

// ==================== JD API ====================
export const jdAPI = {
  create: async (jdData: any) => {
    return await apiRequest('/api/jds', {
      method: 'POST',
      body: JSON.stringify(jdData),
    });
  },

  getAll: async () => {
    return await apiRequest('/api/jds');
  },

  getById: async (jdId: string) => {
    return await publicApiRequest(`/api/jds/${jdId}`);
  },

  update: async (jdId: string, jdData: any) => {
    return await apiRequest(`/api/jds/${jdId}`, {
      method: 'PUT',
      body: JSON.stringify(jdData),
    });
  },

  delete: async (jdId: string) => {
    return await apiRequest(`/api/jds/${jdId}`, {
      method: 'DELETE',
    });
  },
};

// ==================== Application API ====================
export const applicationAPI = {
  create: async (applicationData: any) => {
    return await publicApiRequest('/api/applications', {
      method: 'POST',
      body: JSON.stringify(applicationData),
    });
  },

  getAll: async () => {
    return await apiRequest('/api/applications');
  },

  getById: async (applicationId: string) => {
    return await apiRequest(`/api/applications/${applicationId}`);
  },

  update: async (applicationId: string, status: string) => {
    return await apiRequest(`/api/applications/${applicationId}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },

  delete: async (applicationId: string) => {
    return await apiRequest(`/api/applications/${applicationId}`, {
      method: 'DELETE',
    });
  },

  analyze: async (applicantData: any) => {
    return await apiRequest('/api/applications/analyze', {
      method: 'POST',
      body: JSON.stringify({ applicantData }),
    });
  },
};

// ==================== Gemini API ====================
export const geminiAPI = {
  chat: async (message: string, chatHistory: any[] = []) => {
    return await publicApiRequest('/api/gemini/chat', {
      method: 'POST',
      body: JSON.stringify({ message, chatHistory }),
    });
  },
};

// ==================== Comment API ====================
export const commentAPI = {
  getByApplicationId: async (applicationId: string) => {
    return await apiRequest(`/api/comments/${applicationId}`);
  },

  create: async (applicationId: string, content: string) => {
    return await apiRequest('/api/comments', {
      method: 'POST',
      body: JSON.stringify({ applicationId, content }),
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
};

// ==================== Team API ====================
export const teamAPI = {
  getCollaborators: async (jdId: string) => {
    return await apiRequest(`/api/team/collaborators/${jdId}`);
  },

  invite: async (jdId: string, email: string) => {
    return await apiRequest('/api/team/invite', {
      method: 'POST',
      body: JSON.stringify({ jdId, email }),
    });
  },

  removeCollaborator: async (jdId: string, memberEmail: string) => {
    return await apiRequest(`/api/team/collaborators/${jdId}/${encodeURIComponent(memberEmail)}`, {
      method: 'DELETE',
    });
  },
};
