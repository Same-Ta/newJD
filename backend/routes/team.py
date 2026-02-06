from fastapi import APIRouter, Depends, HTTPException
from firebase_admin import firestore as firebase_firestore, auth as firebase_auth
from pydantic import BaseModel
from datetime import datetime, timezone

from config.firebase import db
from dependencies.auth import verify_token

router = APIRouter(prefix="/api/team", tags=["Team"])


class JDInvite(BaseModel):
    jdId: str
    email: str


# ==================== JD별 협업자 관리 ====================

@router.post("/invite")
async def invite_collaborator(invite: JDInvite, user_data: dict = Depends(verify_token)):
    """특정 JD에 협업자를 초대합니다."""
    try:
        uid = user_data["uid"]
        email = invite.email.strip().lower()
        jd_id = invite.jdId

        # JD 조회 & 소유자 확인
        jd_ref = db.collection("jds").document(jd_id)
        jd_doc = jd_ref.get()
        if not jd_doc.exists:
            raise HTTPException(status_code=404, detail="공고를 찾을 수 없습니다.")

        jd_data = jd_doc.to_dict()

        # 소유자 또는 기존 협업자만 초대 가능
        if jd_data.get("userId") != uid and uid not in (jd_data.get("collaboratorIds") or []):
            raise HTTPException(status_code=403, detail="이 공고에 협업자를 초대할 권한이 없습니다.")

        # 이미 협업자인지 확인
        existing = jd_data.get("collaborators") or []
        for c in existing:
            if c.get("email", "").lower() == email:
                raise HTTPException(status_code=400, detail="이미 이 공고의 협업자입니다.")

        # 소유자 본인 초대 방지
        if user_data.get("email", "").lower() == email:
            raise HTTPException(status_code=400, detail="자기 자신을 초대할 수 없습니다.")

        # Firebase Auth에서 사용자 찾기
        invited_uid = None
        invited_name = email.split("@")[0]
        try:
            invited_user = firebase_auth.get_user_by_email(email)
            invited_uid = invited_user.uid
            invited_name = invited_user.display_name or email.split("@")[0]
        except Exception:
            pass

        new_collaborator = {
            "uid": invited_uid,
            "email": email,
            "name": invited_name,
            "role": "collaborator",
            "addedAt": datetime.now(timezone.utc),  # ArrayUnion에서는 SERVER_TIMESTAMP 사용 불가
            "addedBy": uid,
        }

        update_data = {
            "collaborators": firebase_firestore.ArrayUnion([new_collaborator]),
        }
        if invited_uid:
            update_data["collaboratorIds"] = firebase_firestore.ArrayUnion([invited_uid])

        jd_ref.update(update_data)

        return {
            "message": f"{email} 님을 공고에 초대했습니다.",
            "collaborator": {"email": email, "name": invited_name, "role": "collaborator"},
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/collaborators/{jd_id}")
async def get_collaborators(jd_id: str, user_data: dict = Depends(verify_token)):
    """특정 JD의 협업자 목록을 반환합니다."""
    try:
        uid = user_data["uid"]

        jd_doc = db.collection("jds").document(jd_id).get()
        if not jd_doc.exists:
            raise HTTPException(status_code=404, detail="공고를 찾을 수 없습니다.")

        jd_data = jd_doc.to_dict()

        # 소유자 또는 협업자만 조회 가능
        if jd_data.get("userId") != uid and uid not in (jd_data.get("collaboratorIds") or []):
            raise HTTPException(status_code=403, detail="조회 권한이 없습니다.")

        collaborators = jd_data.get("collaborators") or []

        # Timestamp 직렬화 (datetime 객체를 {seconds, nanoseconds} 형태로 변환)
        for c in collaborators:
            if c.get("addedAt"):
                if hasattr(c["addedAt"], "timestamp"):
                    # Firestore Timestamp인 경우
                    c["addedAt"] = {"seconds": int(c["addedAt"].timestamp()), "nanoseconds": 0}
                elif isinstance(c["addedAt"], datetime):
                    # Python datetime인 경우
                    c["addedAt"] = {"seconds": int(c["addedAt"].timestamp()), "nanoseconds": 0}

        # 소유자 정보도 함께 반환
        owner_email = ""
        owner_name = ""
        try:
            owner_user = firebase_auth.get_user(jd_data["userId"])
            owner_email = owner_user.email or ""
            owner_name = owner_user.display_name or owner_email.split("@")[0]
        except Exception:
            pass

        return {
            "jdId": jd_id,
            "jdTitle": jd_data.get("title", ""),
            "ownerId": jd_data.get("userId"),
            "ownerEmail": owner_email,
            "ownerName": owner_name,
            "collaborators": collaborators,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/collaborators/{jd_id}/{member_email}")
async def remove_collaborator(jd_id: str, member_email: str, user_data: dict = Depends(verify_token)):
    """특정 JD에서 협업자를 제거합니다."""
    try:
        uid = user_data["uid"]

        jd_ref = db.collection("jds").document(jd_id)
        jd_doc = jd_ref.get()
        if not jd_doc.exists:
            raise HTTPException(status_code=404, detail="공고를 찾을 수 없습니다.")

        jd_data = jd_doc.to_dict()

        # 소유자만 제거 가능 (또는 자기 자신이 나가기)
        is_owner = jd_data.get("userId") == uid
        is_self = user_data.get("email", "").lower() == member_email.lower()
        if not is_owner and not is_self:
            raise HTTPException(status_code=403, detail="협업자를 제거할 권한이 없습니다.")

        collaborators = jd_data.get("collaborators") or []
        removed = None
        new_collaborators = []
        for c in collaborators:
            if c.get("email", "").lower() == member_email.lower():
                removed = c
            else:
                new_collaborators.append(c)

        if not removed:
            raise HTTPException(status_code=404, detail="해당 협업자를 찾을 수 없습니다.")

        new_ids = [c.get("uid") for c in new_collaborators if c.get("uid")]
        jd_ref.update({
            "collaborators": new_collaborators,
            "collaboratorIds": new_ids,
        })

        return {"message": f"{member_email} 님을 공고에서 제거했습니다."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
