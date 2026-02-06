// src/services/gemini.ts
import { maskSensitiveData, safeLog } from './security';

// @ts-ignore
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * 채팅 기록에서 민감 정보를 마스킹
 */
const sanitizeChatHistory = (chatHistory: any[]): any[] => {
  return chatHistory.map(msg => ({
    role: msg.role === 'model' ? 'model' : 'user',
    text: maskSensitiveData(msg.parts?.[0]?.text || '')
  }));
};

export const generateJD = async (message: string, chatHistory: any[]) => {
  try {
    // 백엔드 API 호출
    const url = `${API_BASE_URL}/api/gemini/chat`;
    
    // 민감 정보 마스킹 처리
    const sanitizedMessage = maskSensitiveData(message);
    const sanitizedHistory = sanitizeChatHistory(chatHistory);
    
    // 안전한 로깅 (민감 정보 제외)
    safeLog('Gemini 요청:', { messageLength: message.length, historyLength: chatHistory.length });
    
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: sanitizedMessage,
        chatHistory: sanitizedHistory
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: '서버 오류가 발생했습니다.' }));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // 백엔드 응답 형식에 맞춰 반환
    return {
      aiResponse: data.aiResponse || "응답을 받았습니다.",
      options: data.options || [],
      jdData: data.jdData || {}
    };
  } catch (error: any) {
    console.error('Gemini API 호출 오류:', error);
    return {
      aiResponse: "죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
      options: [],
      jdData: {}
    };
  }
};
