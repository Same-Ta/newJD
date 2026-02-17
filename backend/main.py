from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from dotenv import load_dotenv

# .env 파일 로드 (가장 먼저 실행)
load_dotenv()

# 라우터 임포트 (Config는 지연 로딩)
from routes.auth import router as auth_router
from routes.jds import router as jds_router
from routes.applications import router as applications_router
from routes.gemini import router as gemini_router
from routes.comments import router as comments_router
from routes.team import router as team_router

app = FastAPI(title="Winnow API", version="1.0.0")

# ==================== Startup Events ====================
@app.on_event("startup")
async def startup_event():
    """서버 시작 시 Firebase Admin SDK 미리 초기화하여 콜드 스타트 방지"""
    from config.firebase import get_db, get_bucket
    try:
        # Firebase 초기화 (첫 요청 전에 미리 실행)
        db = get_db()
        bucket = get_bucket()
        print("✅ Firebase Admin SDK initialized successfully")
        print("✅ Firestore client warmed up")
        if bucket:
            print("✅ Storage bucket warmed up")
    except Exception as e:
        print(f"⚠️  Firebase initialization warning: {e}")


# CORS 설정 (프로덕션에서는 실제 프론트엔드 URL만 허용)
import os
allowed_origins = [
    "http://localhost:5173",  # 로컬 개발
    "http://localhost:5174",  # Vite 대체 포트
    "http://localhost:5175",  # Vite 대체 포트
    "http://localhost:5176",  # Vite 대체 포트
    "http://localhost:5177",  # Vite 대체 포트
    "http://localhost:3000",
    "https://www.winnow.kr",  # 프로덕션 도메인
    "https://winnow.kr",      # 도메인 리다이렉트 대비
    os.getenv("FRONTEND_URL", "https://www.winnow.kr"),
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== 라우터 등록 ====================
app.include_router(auth_router)
app.include_router(jds_router)
app.include_router(applications_router)
app.include_router(gemini_router)
app.include_router(comments_router)
app.include_router(team_router)


# ==================== Health Check ====================
@app.get("/")
def read_root():
    return {"message": "Winnow API is running", "version": "1.0.0"}


@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


@app.get("/keepalive")
def keep_alive():
    """콜드 스타트 방지용 엔드포인트"""
    return {"status": "alive", "timestamp": datetime.now().isoformat()}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
