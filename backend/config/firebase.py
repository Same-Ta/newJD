import firebase_admin
from firebase_admin import credentials, firestore
import os

# Firebase Admin SDK 초기화
if not firebase_admin._apps:
    # serviceAccountKey.json 경로 설정
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    key_path = os.path.join(base_dir, "serviceAccountKey.json")
    cred = credentials.Certificate(key_path)
    firebase_admin.initialize_app(cred)

# Firestore 클라이언트
db = firestore.client()
