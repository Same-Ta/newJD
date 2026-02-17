import firebase_admin
from firebase_admin import credentials, firestore, storage
import os
from typing import Optional, Any
from datetime import datetime, timedelta

# 지연 초기화를 위한 변수들
_db: Optional[firestore.Client] = None
_bucket: Optional[Any] = None
_initialized_at: Optional[datetime] = None

# 간단한 인메모리 캐시 (자주 접근하는 데이터용)
_data_cache: dict = {}
_cache_expiry: dict = {}

def _initialize_firebase():
    """Firebase Admin SDK 지연 초기화"""
    global _initialized_at
    if not firebase_admin._apps:
        # 환경 변수에서 Firebase 인증 정보 로드
        private_key = os.getenv("FIREBASE_PRIVATE_KEY", "")
        
        # 줄바꿈 문자 변환 (\n을 실제 줄바꿈으로)
        private_key = private_key.replace("\\n", "\n")
        
        firebase_config = {
            "type": "service_account",
            "project_id": os.getenv("FIREBASE_PROJECT_ID"),
            "private_key_id": os.getenv("FIREBASE_PRIVATE_KEY_ID"),
            "private_key": private_key,
            "client_email": os.getenv("FIREBASE_CLIENT_EMAIL"),
            "client_id": os.getenv("FIREBASE_CLIENT_ID"),
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "client_x509_cert_url": f"https://www.googleapis.com/robot/v1/metadata/x509/{os.getenv('FIREBASE_CLIENT_EMAIL')}"
        }
        
        storage_bucket = os.getenv("FIREBASE_STORAGE_BUCKET", "")
        
        cred = credentials.Certificate(firebase_config)
        
        init_options = {}
        if storage_bucket:
            init_options['storageBucket'] = storage_bucket
        
        firebase_admin.initialize_app(cred, init_options)
        _initialized_at = datetime.now()
        print(f"🔥 Firebase initialized at {_initialized_at.isoformat()}")

def get_db() -> firestore.Client:
    """지연 초기화된 Firestore 클라이언트 반환"""
    global _db
    if _db is None:
        _initialize_firebase()
        _db = firestore.client()
    return _db

def get_bucket() -> Optional[Any]:
    """지연 초기화된 Storage 버킷 반환"""
    global _bucket
    if _bucket is None and os.getenv("FIREBASE_STORAGE_BUCKET"):
        _initialize_firebase()
        _bucket = storage.bucket()
    return _bucket

# 하위 호환성을 위한 별칭
db = property(lambda self: get_db())
bucket = property(lambda self: get_bucket())


# ==================== 캐싱 유틸리티 ====================
def cache_data(key: str, data: Any, ttl_seconds: int = 300):
    """
    데이터를 캐시에 저장 (기본 5분 TTL)
    자주 조회하는 사용자 정보, 설정 등에 사용
    """
    _data_cache[key] = data
    _cache_expiry[key] = datetime.now() + timedelta(seconds=ttl_seconds)


def get_cached_data(key: str) -> Optional[Any]:
    """캐시에서 데이터 조회 (만료된 경우 None 반환)"""
    if key in _data_cache:
        if datetime.now() < _cache_expiry.get(key, datetime.now()):
            return _data_cache[key]
        else:
            # 만료된 캐시 제거
            del _data_cache[key]
            del _cache_expiry[key]
    return None


def clear_cache(key: Optional[str] = None):
    """캐시 삭제 (key가 None이면 전체 캐시 삭제)"""
    if key:
        _data_cache.pop(key, None)
        _cache_expiry.pop(key, None)
    else:
        _data_cache.clear()
        _cache_expiry.clear()


def get_connection_info() -> dict:
    """Firebase 연결 상태 정보 반환"""
    return {
        "initialized": firebase_admin._apps is not None and len(firebase_admin._apps) > 0,
        "initialized_at": _initialized_at.isoformat() if _initialized_at else None,
        "db_connected": _db is not None,
        "bucket_connected": _bucket is not None,
        "cache_size": len(_data_cache)
    }
