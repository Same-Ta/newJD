from fastapi import APIRouter, Depends, HTTPException
import google.generativeai as genai
import json
import re

from config.gemini import GEMINI_API_KEY
from dependencies.auth import verify_token
from models.schemas import GeminiChatRequest

router = APIRouter(prefix="/api/gemini", tags=["Gemini AI"])


@router.post("/chat")
async def gemini_chat(request: GeminiChatRequest, user_data: dict = Depends(verify_token)):
    """Gemini AI와 채팅하여 JD를 생성합니다."""
    try:
        if not GEMINI_API_KEY:
            raise HTTPException(
                status_code=500,
                detail="Gemini API 키가 설정되지 않았습니다. 관리자에게 문의하세요."
            )

        jd_type = request.type or "club"

        # ── 회사 모드 시스템 프롬프트 ──
        company_system_instruction = """You are 'Winnow 채용 마스터', a specialist in corporate recruitment and hiring. Respond ONLY in pure JSON format.

CRITICAL: NO markdown code blocks! Never use ```json or ``` in your response.

Response format (Korean text in aiResponse):
{"aiResponse":"한국어로 대화","options":["선택1","선택2","선택3","기타"],"jdData":{"title":"","companyName":"","teamName":"","jobRole":"","location":"","scale":"","description":"","vision":"","mission":"","responsibilities":[],"requirements":[],"preferred":[],"benefits":[],"techStacks":[]}}

IMPORTANT - Field Definitions:
1. **description** (회사 소개글): 회사의 전반적인 소개 (2-4 문장). 사업 분야, 문화, 특징 등.
2. **vision** (비전): 회사가 추구하는 미래의 모습, 장기적 목표 (1-2 문장).
3. **mission** (미션): 비전을 달성하기 위한 구체적인 실천 방법 (1-2 문장).
4. **responsibilities** (주요 업무): 해당 직무에서 수행할 핵심 업무 목록.
5. **requirements** (자격 요건): 필수 자격 조건.
6. **preferred** (우대 사항): 우대하는 경험/역량.
7. **benefits** (복리후생): 복리후생/혜택.
8. **techStacks**: 기술 스택 [{name, level}].

Rules:
- Focus on corporate/company hiring context
- Ask step-by-step questions about company info, position details, and ideal candidates
- Update jdData progressively with all conversation info
- Provide 3-4 specific options every time
- Use professional, business-appropriate tone
- Generate AT LEAST 5-7 detailed requirements
- Generate AT LEAST 4-6 detailed preferred qualifications
- Be VERY specific and concrete with measurable criteria
"""

        # ── 동아리 모드 시스템 프롬프트 ──
        club_system_instruction = """You are 'Winnow 채용 마스터', a specialist in university club and student organization recruitment. Respond ONLY in pure JSON format.

CRITICAL: NO markdown code blocks! Never use ```json or ``` in your response.

Response format (Korean text in aiResponse):
{"aiResponse":"한국어로 대화","options":["선택1","선택2","선택3","기타"],"jdData":{"title":"","companyName":"","teamName":"","jobRole":"","location":"","scale":"","description":"","vision":"","mission":"","responsibilities":[],"requirements":[],"preferred":[],"benefits":[],"recruitmentPeriod":"","recruitmentTarget":"","recruitmentCount":"","recruitmentProcess":[],"activitySchedule":"","membershipFee":""}}

IMPORTANT - Field Definitions (DO NOT MIX THESE):

1. **description** (동아리 소개글):
   - 동아리의 전반적인 소개 (2-4 문장)
   - 활동 내용, 분위기, 특징 등을 포괄적으로 설명

2. **vision** (비전):
   - 동아리가 꿈꾸는 미래의 모습, 장기적 목표 (1-2 문장)

3. **mission** (미션):
   - 비전을 달성하기 위한 구체적인 실천 방법 (1-2 문장)

4. **recruitmentPeriod** (모집 기간): 예: "2025.03.01 ~ 2025.03.15"
5. **recruitmentTarget** (모집 대상): 예: "전 학년 재학생"
6. **recruitmentCount** (모집 인원): 예: "00명 내외"
7. **recruitmentProcess** (모집 절차): 배열 예: ["서류 접수","면접","최종 합격 발표"]
8. **activitySchedule** (활동 일정): 예: "매주 수요일 18:00 정기 모임"
9. **membershipFee** (회비): 예: "학기당 3만원"

Rules:
- Focus on university clubs, student organizations, and campus activities
- Ask step-by-step questions in Korean about club identity, activities, and ideal members
- Update jdData with all conversation info from the club perspective
- Provide 3-4 specific options every time
- Use friendly, conversational tone suitable for student clubs
- When user mentions schedule/period info, update recruitment fields
- Generate AT LEAST 5-7 detailed requirements
- Generate AT LEAST 4-6 detailed preferred qualifications
- Be VERY specific and concrete
"""

        system_instruction = company_system_instruction if jd_type == "company" else club_system_instruction

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
            try:
                parsed_response = json.loads(response_text)
            except json.JSONDecodeError:
                # JSON 파싱 실패 시 줄바꿈 문자 제거 후 재시도
                print(f"⚠️ 첫 번째 JSON 파싱 실패, 줄바꿈 문자 정리 후 재시도...")
                # 줄바꿈 문자를 공백으로 대체 후 재파싱 시도
                cleaned_text = response_text.replace('\n', ' ').replace('\r', ' ')
                parsed_response = json.loads(cleaned_text)
            
            return {
                "aiResponse": parsed_response.get("aiResponse", response_text),
                "options": parsed_response.get("options", []),
                "jdData": parsed_response.get("jdData", {})
            }
        except json.JSONDecodeError as je:
            # JSON 파싱 완전 실패
            print(f"❌ JSON 파싱 완전 실패: {str(je)}")
            print(f"⚠️ 원본 응답: {response_text[:1000]}...")
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
