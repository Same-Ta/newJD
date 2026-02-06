from fastapi import APIRouter, HTTPException
import google.generativeai as genai
import json
import re

from config.gemini import GEMINI_API_KEY
from models.schemas import GeminiChatRequest

router = APIRouter(prefix="/api/gemini", tags=["Gemini AI"])


@router.post("/chat")
async def gemini_chat(request: GeminiChatRequest):
    """Gemini AI와 채팅하여 JD를 생성합니다."""
    try:
        if not GEMINI_API_KEY:
            raise HTTPException(
                status_code=500,
                detail="Gemini API 키가 설정되지 않았습니다. 관리자에게 문의하세요."
            )

        system_instruction = """너는 연합동아리의 정체성을 브랜딩하고, 효율적인 채용 시스템을 설계해주는 'Winnow 채용 마스터'야. 
너의 임무는 운영진과의 인터뷰를 통해 [1. 동아리 소개], [2. 모집 일정 및 정보], [3. 지원자 설문 및 자가진단]을 포함한 '완벽한 모집 패키지'를 제작하는 것이다.

[운영 원칙]
1. 한 번에 모든 질문을 던지지 마라. 단계별로 대화하며 사용자의 답변을 구체화해라.
2. 답변이 추상적이면(예: "열정적인 사람") 반드시 추가 질문을 통해 구체화(예: "밤샘 작업이 가능한 사람인가요?")해라.
3. 모든 결과물은 '허수 지원자 차단'과 '동아리 매력 극대화'에 초점을 맞춘다.

[중요] 사용자의 답변에서 동아리 정보를 파악하면 반드시 응답 끝에 JSON 형식으로 추가해라:
```json
{
  "title": "동아리 이름",
  "companyName": "동아리 이름",
  "teamName": "팀 이름",
  "location": "위치",
  "scale": "규모",
  "vision": "비전",
  "mission": "미션",
  "responsibilities": ["역할1", "역할2"],
  "requirements": ["필수조건1", "필수조건2"],
  "preferred": ["우대사항1"],
  "benefits": ["혜택1", "혜택2"]
}
```

대화를 자연스럽고 친근하게 진행하며, 사용자의 답변에 따라 적절한 추가 질문을 던져라.
"""

        model = genai.GenerativeModel(
            'gemini-2.0-flash-exp',  # 최신 고성능 실험 모델
            system_instruction=system_instruction
        )

        # 채팅 히스토리 변환
        history = []
        for msg in request.chatHistory:
            role = msg.get("role", "user")
            text = msg.get("text", "")
            if text:
                history.append({
                    "role": "user" if role == "user" else "model",
                    "parts": [text]
                })

        chat = model.start_chat(history=history)
        response = chat.send_message(request.message)
        
        # AI 응답 파싱 (순수 JSON 형식 기대)
        response_text = response.text.strip()
        
        try:
            # JSON 응답 파싱 시도
            parsed_response = json.loads(response_text)
            
            return {
                "aiResponse": parsed_response.get("aiResponse", response_text),
                "options": parsed_response.get("options", []),
                "jdData": parsed_response.get("jdData", {})
            }
        except json.JSONDecodeError:
            # JSON이 아닌 경우 기본 응답 반환
            print("⚠️ AI가 JSON 형식으로 응답하지 않음")
            return {
                "aiResponse": response_text,
                "options": [],
                "jdData": {}
            }
    except Exception as e:
        print(f"❌ Gemini Chat Error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"AI 응답 생성 중 오류가 발생했습니다: {str(e)}"
        )
