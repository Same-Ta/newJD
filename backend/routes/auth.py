from fastapi import APIRouter, Depends, HTTPException
from firebase_admin import auth as firebase_auth, firestore as firebase_firestore

from config.firebase import db
from dependencies.auth import verify_token
from models.schemas import UserRegister

router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post("/register")
async def register(user: UserRegister):
    """새 사용자를 등록합니다."""
    try:
        user_record = firebase_auth.create_user(
            email=user.email,
            password=user.password,
            display_name=user.nickname or user.email.split('@')[0]
        )

        db.collection('users').document(user_record.uid).set({
            'email': user.email,
            'nickname': user.nickname or user.email.split('@')[0],
            'createdAt': firebase_firestore.SERVER_TIMESTAMP
        })

        return {
            "uid": user_record.uid,
            "email": user.email,
            "message": "User registered successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/me")
async def get_current_user(user_data: dict = Depends(verify_token)):
    """현재 로그인한 사용자 정보를 반환합니다."""
    try:
        user_doc = db.collection('users').document(user_data['uid']).get()
        if user_doc.exists:
            return {"uid": user_data['uid'], **user_doc.to_dict()}
        return {"uid": user_data['uid'], "email": user_data.get('email')}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
