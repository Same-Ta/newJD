"""
Gemini API 과금 보호용 Rate Limiter
- 알고리즘: 슬라이딩 윈도우 (Sliding Window)
- 범위: 사용자(UID) 단위 + 엔드포인트 단위
- 인증(verify_token) 포함 → 기존 Depends(verify_token) 대체 가능
"""
import time
import asyncio
from collections import defaultdict, deque
from fastapi import Depends, HTTPException
from dependencies.auth import verify_token

# 전역 윈도우 저장소: "endpoint:uid" -> 타임스탬프 deque
_windows: dict = defaultdict(deque)
_lock = asyncio.Lock()


def make_gemini_limiter(max_calls: int, window_seconds: int = 60, label: str = ""):
    """
    Gemini 엔드포인트 전용 Rate Limiter + 인증 통합 Dependency 팩토리.

    사용법:
        @router.post("/chat")
        async def chat(user_data: dict = Depends(gemini_chat_limiter)):
            ...

    Args:
        max_calls: 윈도우 내 허용 최대 호출 수
        window_seconds: 윈도우 크기 (초), 기본 60초 = RPM
        label: 로깅용 엔드포인트 이름
    """
    async def _limiter(user_data: dict = Depends(verify_token)) -> dict:
        uid = user_data.get("uid", "unknown")
        key = f"{label}:{uid}"
        now = time.monotonic()
        cutoff = now - window_seconds

        async with _lock:
            window = _windows[key]

            # 만료된 타임스탬프 제거
            while window and window[0] < cutoff:
                window.popleft()

            if len(window) >= max_calls:
                # 가장 오래된 항목이 만료될 때까지 대기 시간 계산
                retry_after = int(window[0] + window_seconds - now) + 1
                raise HTTPException(
                    status_code=429,
                    detail=(
                        f"Gemini API 요청 한도 초과: "
                        f"1분에 최대 {max_calls}회 호출 가능합니다. "
                        f"{retry_after}초 후 다시 시도하세요."
                    ),
                    headers={"Retry-After": str(retry_after)},
                )

            window.append(now)

        return user_data

    return _limiter


# ==================== 엔드포인트별 리미터 인스턴스 ====================

# /api/gemini/chat — JD 생성 채팅 (비교적 가벼움, 대화형이라 연속 호출 많음)
gemini_chat_limiter = make_gemini_limiter(max_calls=10, label="gemini_chat")

# /api/applications/analyze — AI 스크리닝 분석 (긴 프롬프트, 고비용)
ai_analyze_limiter = make_gemini_limiter(max_calls=5, label="ai_analyze")

# /api/pdf/analyze — PDF 비전 분석 (Files API 포함, 최고 비용)
pdf_analyze_limiter = make_gemini_limiter(max_calls=3, label="pdf_analyze")
