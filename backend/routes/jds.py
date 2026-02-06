from fastapi import APIRouter, Depends, HTTPException
from firebase_admin import firestore as firebase_firestore

from config.firebase import db
from dependencies.auth import verify_token
from models.schemas import JDCreate, JDUpdate

router = APIRouter(prefix="/api/jds", tags=["JDs"])


@router.post("")
async def create_jd(jd: JDCreate, user_data: dict = Depends(verify_token)):
    """새 JD를 생성합니다."""
    try:
        jd_data = jd.dict()
        jd_data['userId'] = user_data['uid']
        jd_data['createdAt'] = firebase_firestore.SERVER_TIMESTAMP
        jd_data['updatedAt'] = firebase_firestore.SERVER_TIMESTAMP

        doc_ref = db.collection('jds').document()
        doc_ref.set(jd_data)

        return {"id": doc_ref.id, "message": "JD created successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("")
async def get_jds(user_data: dict = Depends(verify_token)):
    """현재 사용자의 모든 JD를 반환합니다."""
    try:
        jds_ref = db.collection('jds').where('userId', '==', user_data['uid'])
        jds = []
        for doc in jds_ref.stream():
            jd_data = doc.to_dict()
            jd_data['id'] = doc.id
            jds.append(jd_data)
        return jds
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{jd_id}")
async def get_jd(jd_id: str):
    """특정 JD를 반환합니다."""
    try:
        doc = db.collection('jds').document(jd_id).get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="JD not found")
        jd_data = doc.to_dict()
        jd_data['id'] = doc.id
        return jd_data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{jd_id}")
async def update_jd(jd_id: str, jd: JDUpdate, user_data: dict = Depends(verify_token)):
    """JD를 수정합니다."""
    try:
        doc_ref = db.collection('jds').document(jd_id)
        doc = doc_ref.get()

        if not doc.exists:
            raise HTTPException(status_code=404, detail="JD not found")

        if doc.to_dict().get('userId') != user_data['uid']:
            raise HTTPException(status_code=403, detail="Not authorized")

        update_data = {k: v for k, v in jd.dict().items() if v is not None}
        update_data['updatedAt'] = firebase_firestore.SERVER_TIMESTAMP
        doc_ref.update(update_data)

        return {"message": "JD updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{jd_id}")
async def delete_jd(jd_id: str, user_data: dict = Depends(verify_token)):
    """JD를 삭제합니다."""
    try:
        doc_ref = db.collection('jds').document(jd_id)
        doc = doc_ref.get()

        if not doc.exists:
            raise HTTPException(status_code=404, detail="JD not found")

        if doc.to_dict().get('userId') != user_data['uid']:
            raise HTTPException(status_code=403, detail="Not authorized")

        doc_ref.delete()
        return {"message": "JD deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
