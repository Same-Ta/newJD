import os
import google.generativeai as genai

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    print(f"✅ Gemini API Key loaded: {GEMINI_API_KEY[:10]}...")
else:
    print("⚠️ Warning: GEMINI_API_KEY not found in environment variables")
