import os
import google.generativeai as genai
from typing import Optional

_initialized = False

def _ensure_gemini_configured():
    """Gemini API 지연 초기화"""
    global _initialized
    if not _initialized:
        api_key = os.getenv("GEMINI_API_KEY", "")
        if api_key:
            genai.configure(api_key=api_key)
            print(f"✅ Gemini API Key loaded: {api_key[:10]}...")
            _initialized = True
        else:
            print("⚠️ Warning: GEMINI_API_KEY not found in environment variables")
            raise ValueError("GEMINI_API_KEY not found")

def get_gemini_model(model_name: str = "gemini-2.5-flash"):
    """지연 초기화된 Gemini 모델 반환"""
    _ensure_gemini_configured()
    return genai.GenerativeModel(model_name)

# 하위 호환성을 위해 즉시 초기화는 제거하되, 필요시 호출할 수 있도록 함수 제공
def configure_gemini():
    """필요시 수동으로 Gemini 설정"""
    _ensure_gemini_configured()
