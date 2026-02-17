from fastapi import APIRouter, Request, HTTPException
from config.firebase import get_db
from typing import Dict, List, Any
import json
from datetime import datetime, timezone

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

@router.post("")
async def track_analytics(request: Request):
    """사용자 분석 데이터를 수집합니다 (완전 익명)"""
    try:
        body = await request.json()
        session_id = body.get('sessionId')
        events = body.get('events', [])
        
        if not session_id or not events:
            return {"status": "error", "message": "Invalid data"}
        
        # Firestore에 저장
        db = get_db()
        batch = db.batch()
        
        for event in events:
            # 개인정보 제거/해시화
            clean_event = sanitize_event(event)
            
            # 이벤트 문서 생성
            event_ref = db.collection('analytics').document()
            batch.set(event_ref, {
                **clean_event,
                'serverTimestamp': datetime.now(timezone.utc),
                'ip': hash_ip(get_client_ip(request)),  # IP 해시화
            })
        
        # 배치 저장
        batch.commit()
        
        # 세션 통계 업데이트
        update_session_stats(session_id, events)
        
        return {"status": "success", "processed": len(events)}
        
    except Exception as e:
        print(f"Analytics error: {e}")
        return {"status": "error", "message": "Server error"}


@router.get("/dashboard")
async def get_analytics_dashboard():
    """관리자용 분석 대시보드 데이터"""
    try:
        db = get_db()
        
        # 최근 7일간 데이터
        seven_days_ago = datetime.now(timezone.utc).timestamp() - (7 * 24 * 60 * 60)
        
        # 페이지뷰 통계
        pageviews = db.collection('analytics') \
            .where('event', '==', 'page_view') \
            .where('serverTimestamp', '>=', seven_days_ago) \
            .stream()
        
        # 인기 페이지 계산
        page_stats = {}
        for doc in pageviews:
            data = doc.to_dict()
            page = data.get('properties', {}).get('page', 'unknown')
            page_stats[page] = page_stats.get(page, 0) + 1
        
        # JD 활동 통계
        jd_events = db.collection('analytics') \
            .where('event', '==', 'jd_activity') \
            .where('serverTimestamp', '>=', seven_days_ago) \
            .stream()
        
        jd_stats = {'create': 0, 'view': 0, 'edit': 0}
        for doc in jd_events:
            data = doc.to_dict()
            action = data.get('properties', {}).get('action')
            if action in jd_stats:
                jd_stats[action] += 1
        
        # AI 사용량 통계
        ai_events = db.collection('analytics') \
            .where('event', '==', 'ai_usage') \
            .where('serverTimestamp', '>=', seven_days_ago) \
            .stream()
        
        ai_stats = {}
        for doc in ai_events:
            data = doc.to_dict()
            feature = data.get('properties', {}).get('feature', 'unknown')
            ai_stats[feature] = ai_stats.get(feature, 0) + 1
        
        return {
            "pageviews": page_stats,
            "jd_activity": jd_stats,
            "ai_usage": ai_stats,
            "period": "7days"
        }
        
    except Exception as e:
        print(f"Dashboard error: {e}")
        raise HTTPException(status_code=500, detail="Server error")


def sanitize_event(event: Dict[str, Any]) -> Dict[str, Any]:
    """개인정보 제거 및 데이터 정제"""
    clean_event = {
        'sessionId': hash_string(event.get('sessionId', '')),  # 세션 ID 해시화
        'event': event.get('event', ''),
        'properties': {}
    }
    
    properties = event.get('properties', {})
    
    # 안전한 속성들만 저장
    safe_properties = [
        'timestamp', 'page', 'pathname', 'element', 'context', 
        'action', 'success', 'feature', 'percent', 'duration'
    ]
    
    for key in safe_properties:
        if key in properties:
            value = properties[key]
            # 길이 제한
            if isinstance(value, str) and len(value) > 200:
                value = value[:200]
            clean_event['properties'][key] = value
    
    # URL에서 민감한 정보 제거
    if 'url' in properties:
        url = properties['url']
        # 쿼리 파라미터 제거
        if '?' in url:
            url = url.split('?')[0]
        clean_event['properties']['url_path'] = url
    
    return clean_event


def hash_string(text: str) -> str:
    """문자열 해시화"""
    import hashlib
    return hashlib.sha256(text.encode()).hexdigest()[:16]


def hash_ip(ip: str) -> str:
    """IP 주소 해시화"""
    import hashlib
    # IP의 일부만 해시화하여 완전한 익명성 보장
    salt = "winnow_analytics_2024"
    return hashlib.sha256(f"{ip}{salt}".encode()).hexdigest()[:12]


def get_client_ip(request: Request) -> str:
    """클라이언트 IP 추출"""
    # 프록시 뒤에 있는 경우 고려
    forwarded_for = request.headers.get('X-Forwarded-For')
    if forwarded_for:
        return forwarded_for.split(',')[0].strip()
    
    forwarded = request.headers.get('X-Forwarded-Host')
    if forwarded:
        return forwarded
    
    return request.client.host if request.client else 'unknown'


def update_session_stats(session_id: str, events: List[Dict]):
    """세션별 통계 업데이트"""
    try:
        db = get_db()
        session_ref = db.collection('session_stats').document(hash_string(session_id))
        
        # 기존 세션 데이터 조회
        session_doc = session_ref.get()
        if session_doc.exists:
            data = session_doc.to_dict()
            data['eventCount'] = data.get('eventCount', 0) + len(events)
            data['lastActivity'] = datetime.now(timezone.utc)
        else:
            data = {
                'sessionId': hash_string(session_id),
                'eventCount': len(events),
                'startTime': datetime.now(timezone.utc),
                'lastActivity': datetime.now(timezone.utc)
            }
        
        session_ref.set(data)
        
    except Exception as e:
        print(f"Session stats error: {e}")