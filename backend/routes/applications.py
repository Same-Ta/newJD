from fastapi import APIRouter, Depends, HTTPException
from firebase_admin import firestore as firebase_firestore
import json
import google.generativeai as genai

from config.firebase import db
from config.gemini import GEMINI_API_KEY
from dependencies.auth import verify_token
from models.schemas import ApplicationCreate, ApplicationUpdate, AIAnalysisRequest

router = APIRouter(prefix="/api/applications", tags=["Applications"])


@router.post("")
async def create_application(application: ApplicationCreate):
    """새 지원서를 제출합니다."""
    try:
        jd_doc = db.collection('jds').document(application.jdId).get()
        if not jd_doc.exists:
            raise HTTPException(status_code=404, detail="JD not found")

        jd_data = jd_doc.to_dict()
        recruiter_id = jd_data.get('userId')

        app_data = application.dict()
        app_data['recruiterId'] = recruiter_id
        app_data['appliedAt'] = firebase_firestore.SERVER_TIMESTAMP
        app_data['status'] = 'pending'

        doc_ref = db.collection('applications').document()
        doc_ref.set(app_data)

        return {"id": doc_ref.id, "message": "Application submitted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("")
async def get_applications(user_data: dict = Depends(verify_token)):
    """현재 사용자의 모든 지원서를 반환합니다."""
    try:
        apps_ref = db.collection('applications').where('recruiterId', '==', user_data['uid'])
        applications = []
        for doc in apps_ref.stream():
            app_data = doc.to_dict()
            app_data['id'] = doc.id
            applications.append(app_data)
        return applications
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{application_id}")
async def get_application(application_id: str, user_data: dict = Depends(verify_token)):
    """특정 지원서를 반환합니다."""
    try:
        doc = db.collection('applications').document(application_id).get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Application not found")

        app_data = doc.to_dict()
        if app_data.get('recruiterId') != user_data['uid']:
            raise HTTPException(status_code=403, detail="Not authorized")

        app_data['id'] = doc.id
        return app_data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{application_id}")
async def update_application(application_id: str, application: ApplicationUpdate, user_data: dict = Depends(verify_token)):
    """지원서 상태를 수정합니다."""
    try:
        doc_ref = db.collection('applications').document(application_id)
        doc = doc_ref.get()

        if not doc.exists:
            raise HTTPException(status_code=404, detail="Application not found")

        app_data = doc.to_dict()
        if app_data.get('recruiterId') != user_data['uid']:
            raise HTTPException(status_code=403, detail="Not authorized")

        doc_ref.update({
            'status': application.status,
            'updatedAt': firebase_firestore.SERVER_TIMESTAMP
        })

        return {"message": "Application updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{application_id}")
async def delete_application(application_id: str, user_data: dict = Depends(verify_token)):
    """지원서를 삭제합니다."""
    try:
        doc_ref = db.collection('applications').document(application_id)
        doc = doc_ref.get()

        if not doc.exists:
            raise HTTPException(status_code=404, detail="Application not found")

        app_data = doc.to_dict()
        if app_data.get('recruiterId') != user_data['uid']:
            raise HTTPException(status_code=403, detail="Not authorized")

        doc_ref.delete()
        return {"message": "Application deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze")
async def analyze_application(request: AIAnalysisRequest, user_data: dict = Depends(verify_token)):
    """AI를 이용해 지원자를 분석합니다."""
    try:
        if not GEMINI_API_KEY:
            raise HTTPException(status_code=500, detail="Gemini API key not configured")

        applicant = request.applicantData

        prompt = f"""당신은 채용 전문가입니다. 다음 지원자를 냉정하게 분석하고 평가해주세요.

지원자 정보:
- 이름: {applicant.get('applicantName', 'N/A')}
- 이메일: {applicant.get('applicantEmail', 'N/A')}
- 전화번호: {applicant.get('applicantPhone', 'N/A')}
- 공고: {applicant.get('jdTitle', 'N/A')}

자격 요건 답변:
{json.dumps(applicant.get('requirementAnswers', []), ensure_ascii=False, indent=2)}

우대 사항 답변:
{json.dumps(applicant.get('preferredAnswers', []), ensure_ascii=False, indent=2)}

다음 형식으로 평가해주세요:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 종합 평가
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 인재 유형:
[완성형 리더 / 직무 전문가 / 성장형 유망주 중 하나]

📊 역량 평가:
• 직무 역량: ⭐️ [1-5점]
• 문제 해결: ⭐️ [1-5점]
• 성장 잠재력: ⭐️ [1-5점]
• 협업 태도: ⭐️ [1-5점]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ 핵심 강점
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[2-3줄로 요약]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ 리스크 요인
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[2-3줄로 요약]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💬 추천 질문
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. [질문 1]
2. [질문 2]
3. [질문 3]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 최종 의견
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[합격 추천 / 보류 추천 / 불합격 추천] - 사유 2줄 이내

중요 규칙:
- 냉정하고 객관적으로 평가
- 답변이 부족할 경우 낮음/미흡으로 처리
- 절대 JSON 형식으로 출력하지 마세요
- 위 형식 그대로 작성하세요"""

        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(prompt)

        return {"analysis": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
