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

        system_instruction = """You are 'Winnow 채용 마스터', a specialist in university club and student organization recruitment. Respond ONLY in pure JSON format.

CRITICAL: NO markdown code blocks! Never use ```json or ``` in your response.

Response format (Korean text in aiResponse):
{"aiResponse":"한국어로 대화","options":["선택1","선택2","선택3","기타"],"jdData":{"title":"","companyName":"","teamName":"","jobRole":"","location":"","scale":"","description":"","vision":"","mission":"","responsibilities":[],"requirements":[],"preferred":[],"benefits":[]}}

IMPORTANT - Field Definitions (DO NOT MIX THESE):

1. **description** (동아리 소개글):
   - 동아리의 전반적인 소개 (2-4 문장)
   - 활동 내용, 분위기, 특징 등을 포괄적으로 설명
   - 예시: "GDSC는 Google Developers 공식 대학생 개발자 커뮤니티로, 기술 학습과 협업 프로젝트를 통해 실무 역량을 키웁니다. 매주 스터디와 해커톤을 진행하며 자유롭고 활기찬 분위기에서 함께 성장합니다."
   - ONLY UPDATE when user provides general club introduction info

2. **vision** (비전):
   - 동아리가 꼼는 미래의 모습, 장기적 목표 (1-2 문장)
   - 예시: "국내 최고의 학생 개발자 커뮤니티로 성장하여, 글로벌 IT 업계를 이끌 인재를 육성합니다."
   - ONLY UPDATE when user specifically talks about future goals/dreams

3. **mission** (미션):
   - 비전을 달성하기 위한 구체적인 실천 방법 (1-2 문장)
   - 예시: "실무 중심의 프로젝트와 정기적인 기술 세미나를 통해 학생들의 실력을 키우고, 협업과 지식 공유의 문화를 조성합니다."
   - ONLY UPDATE when user talks about how they achieve their goals

Rules:
- Focus on university clubs, student organizations, and campus activities
- Ask step-by-step questions in Korean about club identity, activities, and ideal members
- Update jdData with all conversation info from the club perspective
- Provide 3-4 specific options every time
- Use friendly, conversational tone suitable for student clubs
- When user answers about club activities/atmosphere, update **description** field
- When user answers about long-term goals/dreams, update **vision** field
- When user answers about how they work/operate, update **mission** field
- DO NOT mix description with vision/mission - keep them separate!

IMPORTANT - Requirements & Preferred Qualifications:
- Generate AT LEAST 5-7 detailed, specific requirements (필수 자격요건)
- Generate AT LEAST 4-6 detailed, specific preferred qualifications (우대 사항)
- Be VERY specific and concrete (avoid vague statements like "열정적인 사람")
- Include measurable criteria when possible (e.g., "주 1회 이상 정기 모임 참여 가능", "포토샵/일러스트 중급 이상")
- Mix hard skills (기술) and soft skills (태도/가치관)
- For requirements: focus on MUST-HAVE essentials
- For preferred: focus on NICE-TO-HAVE bonuses that make candidates stand out

Examples of GOOD requirements:
- "2026년 1학기 기준 2학년 이상 재학생"
- "주 1회 정기 세션 필수 참여 가능 (수요일 저녁 7시)"
- "동아리 활동 우선순위를 높게 두고 1년 이상 활동 가능한 분"
- "Adobe Photoshop, Illustrator 중 1개 이상 기본 사용 가능"
- "팀 프로젝트 경험이 있으며 협업에 적극적인 자세"

Examples of GOOD preferred qualifications:
- "디자인 관련 수상 경력 또는 공모전 참여 경험"
- "개인 포트폴리오 또는 작업물 보유자"
- "영상 편집 툴(Premiere Pro, Final Cut 등) 사용 가능자"
- "SNS 마케팅 또는 콘텐츠 제작 경험자"
- "타 동아리/학회 운영진 경험자"
"""

        # gemini-2.5-flash: 최신 고성능 모델 (gemini-2.0-flash-exp는 존재하지 않음)
        model = genai.GenerativeModel(
            'gemini-2.5-flash',
            system_instruction=system_instruction,
            generation_config={
                "response_mime_type": "application/json"
            }
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
        
        # 디버깅: AI 응답 출력
        print(f"📥 AI Response: {response_text[:500]}...")
        
        try:
            # 마크다운 코드 블록 제거 (혹시 모를 경우 대비)
            if response_text.startswith("```"):
                response_text = re.sub(r'^```(?:json)?\s*|\s*```$', '', response_text, flags=re.MULTILINE).strip()
            
            # JSON 응답 파싱 시도
            parsed_response = json.loads(response_text)
            
            return {
                "aiResponse": parsed_response.get("aiResponse", response_text),
                "options": parsed_response.get("options", []),
                "jdData": parsed_response.get("jdData", {})
            }
        except json.JSONDecodeError as je:
            # JSON 파싱 실패
            print(f"⚠️ JSON 파싱 실패: {str(je)}")
            print(f"⚠️ 원본 응답: {response_text}")
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
