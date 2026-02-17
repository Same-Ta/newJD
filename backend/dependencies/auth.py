from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_admin import auth as firebase_auth
from config.firebase import get_db, cache_data, get_cached_data
from datetime import datetime
import hashlib

security = HTTPBearer()


async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Firebase ID 토큰을 검증하고 사용자 정보를 반환합니다. (캐싱 적용)"""
    # Firebase 초기화 확인 (get_db 호출 시 초기화됨)
    get_db()
    
    token = credentials.credentials
    
    # 토큰 해시를 캐시 키로 사용 (보안상 토큰 전체를 저장하지 않음)
    token_hash = hashlib.sha256(token.encode()).hexdigest()[:16]
    cache_key = f"token_verify:{token_hash}"
    
    # 캐시된 토큰 검증 결과 확인 (5분 TTL)
    cached_result = get_cached_data(cache_key)
    if cached_result:
        return cached_result
    
    try:
        decoded_token = firebase_auth.verify_id_token(token)
        
        # 검증 결과 캐시 저장 (5분)
        cache_data(cache_key, decoded_token, ttl_seconds=300)
        
        return decoded_token
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication"
        )
