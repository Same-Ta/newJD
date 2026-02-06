from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
import firebase_admin
from firebase_admin import credentials, firestore, auth as firebase_auth
import os
import json
from datetime import datetime
import google.generativeai as genai
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv()

# Firebase Admin SDK 초기화
if not firebase_admin._apps:
    cred = credentials.Certificate("serviceAccountKey.json")
    firebase_admin.initialize_app(cred)

db = firestore.client()
security = HTTPBearer()

# Gemini API 설정
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    print(f"✅ Gemini API Key loaded: {GEMINI_API_KEY[:10]}...")
else:
    print("⚠️ Warning: GEMINI_API_KEY not found in environment variables")

app = FastAPI(title="Winnow API", version="1.0.0")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== Models ====================
class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    nickname: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class JDCreate(BaseModel):
    title: str
    company: Optional[str] = None
    companyName: Optional[str] = None
    teamName: Optional[str] = None
    jobRole: Optional[str] = None
    location: Optional[str] = None
    scale: Optional[str] = None
    vision: Optional[str] = None
    mission: Optional[str] = None
    techStacks: Optional[List[Dict[str, Any]]] = None
    responsibilities: List[str] = []
    requirements: List[str] = []
    preferred: List[str] = []
    benefits: List[str] = []
    status: str = "draft"
    applicationFields: Optional[Dict[str, Any]] = None

class JDUpdate(BaseModel):
    title: Optional[str] = None
    company: Optional[str] = None
    companyName: Optional[str] = None
    teamName: Optional[str] = None
    jobRole: Optional[str] = None
    location: Optional[str] = None
    scale: Optional[str] = None
    vision: Optional[str] = None
    mission: Optional[str] = None
    techStacks: Optional[List[Dict[str, Any]]] = None
    responsibilities: Optional[List[str]] = None
    requirements: Optional[List[str]] = None
    preferred: Optional[List[str]] = None
    benefits: Optional[List[str]] = None
    status: Optional[str] = None
    applicationFields: Optional[Dict[str, Any]] = None

class ApplicationCreate(BaseModel):
    jdId: str
    jdTitle: str
    applicantName: str
    applicantEmail: EmailStr
    applicantPhone: Optional[str] = None
    applicantGender: Optional[str] = None
    birthDate: Optional[str] = None
    university: Optional[str] = None
    major: Optional[str] = None
    portfolio: Optional[str] = None
    customAnswers: Optional[Dict[int, str]] = None
    requirementAnswers: Optional[List[Dict[str, Any]]] = None
    preferredAnswers: Optional[List[Dict[str, Any]]] = None

class ApplicationUpdate(BaseModel):
    status: str

class AIAnalysisRequest(BaseModel):
    applicantData: Dict[str, Any]

class GeminiChatRequest(BaseModel):
    message: str
    chatHistory: List[Dict[str, Any]] = []

# ==================== Auth ====================
async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        decoded_token = firebase_auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication")

# ==================== Health Check ====================
@app.get("/")
def read_root():
    return {"message": "Winnow API is running", "version": "1.0.0"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

# ==================== Auth Endpoints ====================
@app.post("/api/auth/register")
async def register(user: UserRegister):
    try:
        # Firebase Authentication에서 사용자 생성
        user_record = firebase_auth.create_user(
            email=user.email,
            password=user.password,
            display_name=user.nickname or user.email.split('@')[0]
        )
        
        # Firestore에 사용자 프로필 저장
        db.collection('users').document(user_record.uid).set({
            'email': user.email,
            'nickname': user.nickname or user.email.split('@')[0],
            'createdAt': firestore.SERVER_TIMESTAMP
        })
        
        return {"uid": user_record.uid, "email": user.email, "message": "User registered successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/auth/me")
async def get_current_user(user_data: dict = Depends(verify_token)):
    try:
        user_doc = db.collection('users').document(user_data['uid']).get()
        if user_doc.exists:
            return {"uid": user_data['uid'], **user_doc.to_dict()}
        return {"uid": user_data['uid'], "email": user_data.get('email')}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== JD Endpoints ====================
@app.post("/api/jds")
async def create_jd(jd: JDCreate, user_data: dict = Depends(verify_token)):
    try:
        jd_data = jd.dict()
        jd_data['userId'] = user_data['uid']
        jd_data['createdAt'] = firestore.SERVER_TIMESTAMP
        jd_data['updatedAt'] = firestore.SERVER_TIMESTAMP
        
        doc_ref = db.collection('jds').document()
        doc_ref.set(jd_data)
        
        return {"id": doc_ref.id, "message": "JD created successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/jds")
async def get_jds(user_data: dict = Depends(verify_token)):
    try:
        jds_ref = db.collection('jds').where('userId', '==', user_data['uid'])
        jds = []
        for doc in jds_ref.stream():
            jd_data = doc.to_dict()
            jd_data['id'] = doc.id
            jds.append(jd_data)
        return jds
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/jds/{jd_id}")
async def get_jd(jd_id: str):
    try:
        doc = db.collection('jds').document(jd_id).get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="JD not found")
        jd_data = doc.to_dict()
        jd_data['id'] = doc.id
        return jd_data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/jds/{jd_id}")
async def update_jd(jd_id: str, jd: JDUpdate, user_data: dict = Depends(verify_token)):
    try:
        doc_ref = db.collection('jds').document(jd_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            raise HTTPException(status_code=404, detail="JD not found")
        
        if doc.to_dict().get('userId') != user_data['uid']:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        update_data = {k: v for k, v in jd.dict().items() if v is not None}
        update_data['updatedAt'] = firestore.SERVER_TIMESTAMP
        doc_ref.update(update_data)
        
        return {"message": "JD updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/jds/{jd_id}")
async def delete_jd(jd_id: str, user_data: dict = Depends(verify_token)):
    try:
        doc_ref = db.collection('jds').document(jd_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            raise HTTPException(status_code=404, detail="JD not found")
        
        if doc.to_dict().get('userId') != user_data['uid']:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        doc_ref.delete()
        return {"message": "JD deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Application Endpoints ====================
@app.post("/api/applications")
async def create_application(application: ApplicationCreate):
    try:
        # JD 정보 가져오기
        jd_doc = db.collection('jds').document(application.jdId).get()
        if not jd_doc.exists:
            raise HTTPException(status_code=404, detail="JD not found")
        
        jd_data = jd_doc.to_dict()
        recruiter_id = jd_data.get('userId')
        
        app_data = application.dict()
        app_data['recruiterId'] = recruiter_id
        app_data['appliedAt'] = firestore.SERVER_TIMESTAMP
        app_data['status'] = 'pending'
        
        doc_ref = db.collection('applications').document()
        doc_ref.set(app_data)
        
        return {"id": doc_ref.id, "message": "Application submitted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/applications")
async def get_applications(user_data: dict = Depends(verify_token)):
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

@app.get("/api/applications/{application_id}")
async def get_application(application_id: str, user_data: dict = Depends(verify_token)):
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

@app.put("/api/applications/{application_id}")
async def update_application(application_id: str, application: ApplicationUpdate, user_data: dict = Depends(verify_token)):
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
            'updatedAt': firestore.SERVER_TIMESTAMP
        })
        
        return {"message": "Application updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/applications/{application_id}")
async def delete_application(application_id: str, user_data: dict = Depends(verify_token)):
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

# ==================== AI Analysis Endpoint ====================
@app.post("/api/applications/analyze")
async def analyze_application(request: AIAnalysisRequest, user_data: dict = Depends(verify_token)):
    try:
        if not GEMINI_API_KEY:
            raise HTTPException(status_code=500, detail="Gemini API key not configured")
        
        applicant = request.applicantData
        
        # 프롬프트 생성
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

# ==================== Gemini Chat Endpoint ====================
@app.post("/api/gemini/chat")
async def gemini_chat(request: GeminiChatRequest):
    try:
        if not GEMINI_API_KEY:
            raise HTTPException(status_code=500, detail="Gemini API 키가 설정되지 않았습니다. 관리자에게 문의하세요.")
        
        # System instruction 설정
        system_instruction = """너는 연합동아리의 정체성을 브랜딩하고, 효율적인 채용 시스템을 설계해주는 'Winnow 채용 마스터'야. 
너의 임무는 운영진과의 인터뷰를 통해 [1. 동아리 소개], [2. 모집 일정 및 정보], [3. 지원자 설문 및 자가진단]을 포함한 '완벽한 모집 패키지'를 제작하는 것이다.

[운영 원칙]
1. 한 번에 모든 질문을 던지지 마라. 단계별로 대화하며 사용자의 답변을 구체화해라.
2. 답변이 추상적이면(예: "열정적인 사람") 반드시 추가 질문을 통해 구체화(예: "밤샘 작업이 가능한 사람인가요?")해라.
3. 모든 결과물은 '허수 지원자 차단'과 '동아리 매력 극대화'에 초점을 맞춘다.

대화를 자연스럽고 친근하게 진행하며, 사용자의 답변에 따라 적절한 추가 질문을 던져라.
"""
        
        model = genai.GenerativeModel(
            'gemini-2.5-flash',
            system_instruction=system_instruction
        )
        
        # 채팅 히스토리 변환
        history = []
        for msg in request.chatHistory:
            role = msg.get("role", "user")
            text = msg.get("text", "")
            if text:  # 빈 메시지 제외
                history.append({
                    "role": "user" if role == "user" else "model",
                    "parts": [text]
                })
        
        # 채팅 시작
        chat = model.start_chat(history=history)
        response = chat.send_message(request.message)
        
        return {
            "aiResponse": response.text,
            "options": [],
            "jdData": {}
        }
    except Exception as e:
        print(f"❌ Gemini Chat Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI 응답 생성 중 오류가 발생했습니다: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
