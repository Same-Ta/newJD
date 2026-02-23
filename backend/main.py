from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from datetime import datetime
from dotenv import load_dotenv
import asyncio
import os

# .env 파일 로드 (가장 먼저 실행)
load_dotenv()

# 라우터 임포트 (Config는 지연 로딩)
from routes.auth import router as auth_router
from routes.jds import router as jds_router
from routes.applications import router as applications_router
from routes.gemini import router as gemini_router
from routes.comments import router as comments_router
from routes.team import router as team_router
from routes.pdf_analysis import router as pdf_router

app = FastAPI(title="Winnow API", version="1.0.0")

# ==================== GZip 압축 미들웨어 ====================
# 500바이트 이상 응답 자동 gzip 압축 → 네트워크 전송량 50-70% 감소
app.add_middleware(GZipMiddleware, minimum_size=500)


# ==================== Cache-Control 미들웨어 ====================
class CacheControlMiddleware(BaseHTTPMiddleware):
    """API 응답에 Cache-Control 헤더를 자동 추가하여 CDN/브라우저 캐싱 활용"""
    
    # 캐싱 가능한 GET 엔드포인트와 TTL(초) 매핑
    CACHEABLE_ROUTES = {
        "/health": 60,
        "/keepalive": 60,
        "/": 60,
    }
    
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # GET 요청만 캐싱
        if request.method == "GET":
            path = request.url.path
            
            # 명시적 캐싱 대상
            if path in self.CACHEABLE_ROUTES:
                ttl = self.CACHEABLE_ROUTES[path]
                response.headers["Cache-Control"] = f"public, s-maxage={ttl}, stale-while-revalidate=30"
            # 공개 공고 조회 (인증 불필요)
            elif path.startswith("/api/jds/public/"):
                response.headers["Cache-Control"] = "public, s-maxage=120, stale-while-revalidate=60"
            # 인증 필요한 API는 private 캐싱
            elif path.startswith("/api/"):
                response.headers["Cache-Control"] = "private, no-cache"
        
        return response

app.add_middleware(CacheControlMiddleware)


# ==================== Startup Events ====================
_keep_alive_task = None

@app.on_event("startup")
async def startup_event():
    """서버 시작 시 Firebase 초기화 + 자체 Keep-alive 타이머 시작"""
    global _keep_alive_task
    
    # 1. Firebase Admin SDK 미리 초기화
    from config.firebase import get_db, get_bucket
    try:
        db = get_db()
        bucket = get_bucket()
        print("✅ Firebase Admin SDK initialized successfully")
        print("✅ Firestore client warmed up")
        if bucket:
            print("✅ Storage bucket warmed up")
    except Exception as e:
        print(f"⚠️  Firebase initialization warning: {e}")
    
    # 2. 자체 Keep-alive (Render Free Tier 15분 sleep 방지)
    _keep_alive_task = asyncio.create_task(_self_ping_loop())
    print("✅ Self keep-alive timer started (13min interval)")


@app.on_event("shutdown")
async def shutdown_event():
    """서버 종료 시 Keep-alive 타스크 정리"""
    global _keep_alive_task
    if _keep_alive_task:
        _keep_alive_task.cancel()
        print("🛑 Self keep-alive timer stopped")


async def _self_ping_loop():
    """13분마다 자신의 /keepalive 엔드포인트를 호출하여 Render sleep 방지"""
    import httpx
    
    # 배포 환경에서만 동작 (로컬 개발에서는 불필요)
    render_url = os.getenv("RENDER_EXTERNAL_URL")
    if not render_url:
        print("ℹ️  RENDER_EXTERNAL_URL not set, self-ping disabled (local dev)")
        return
    
    ping_url = f"{render_url}/keepalive"
    interval = 13 * 60  # 13분 (Render는 15분 후 sleep)
    
    while True:
        await asyncio.sleep(interval)
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(ping_url)
                print(f"🏓 Self-ping: {resp.status_code} at {datetime.now().isoformat()}")
        except Exception as e:
            print(f"⚠️  Self-ping failed: {e}")


# CORS 설정 (프로덕션에서는 실제 프론트엔드 URL만 허용)
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
app.include_router(pdf_router)


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
