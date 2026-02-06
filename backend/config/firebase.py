import firebase_admin
from firebase_admin import credentials, firestore
import os

# Firebase Admin SDK 초기화
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
    
    cred = credentials.Certificate(firebase_config)
    firebase_admin.initialize_app(cred)

# Firestore 클라이언트
db = firestore.client()
