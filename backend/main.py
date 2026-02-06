from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from dotenv import load_dotenv

# .env 파일 로드 (가장 먼저 실행)
load_dotenv()

# Config 초기화 (Firebase, Gemini)
from config import firebase  # noqa: E402, F401
from config import gemini  # noqa: E402, F401

# 라우터 임포트
from routes.auth import router as auth_router
from routes.jds import router as jds_router
from routes.applications import router as applications_router
from routes.gemini import router as gemini_router

app = FastAPI(title="Winnow API", version="1.0.0")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== 라우터 등록 ====================
app.include_router(auth_router)
app.include_router(jds_router)
app.include_router(applications_router)
app.include_router(gemini_router)


# ==================== Health Check ====================
@app.get("/")
def read_root():
    return {"message": "Winnow API is running", "version": "1.0.0"}


@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
