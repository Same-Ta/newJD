from fastapi import APIRouter, Depends, HTTPException
from firebase_admin import firestore as firebase_firestore, auth as firebase_auth
from pydantic import BaseModel
from datetime import datetime, timezone
import uuid

from config.firebase import get_db
from dependencies.auth import verify_token

router = APIRouter(prefix="/api/team", tags=["Team"])


class JDInvite(BaseModel):
    jdId: str
    email: str


class InvitationResponse(BaseModel):
    action: str  # "accept" or "reject"


# ==================== JD별 협업자 관리 ====================

@router.post("/invite")
async def invite_collaborator(invite: JDInvite, user_data: dict = Depends(verify_token)):
    """특정 JD에 협업자 초대를 보냅니다 (pending 상태로 생성)."""
    try:
        uid = user_data["uid"]
        email = invite.email.strip().lower()
        jd_id = invite.jdId

        # JD 조회 & 소유자 확인
        jd_ref = get_db().collection("jds").document(jd_id)
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

        # 이미 대기 중인 초대가 있는지 확인
        existing_invites = get_db().collection("invitations") \
            .where("jdId", "==", jd_id) \
            .where("inviteeEmail", "==", email) \
            .where("status", "==", "pending") \
            .get()
        if len(list(existing_invites)) > 0:
            raise HTTPException(status_code=400, detail="이미 보낸 초대가 대기 중입니다.")

        # Firebase Auth에서 사용자 찾기
        invited_uid = None
        invited_name = email.split("@")[0]
        try:
            invited_user = firebase_auth.get_user_by_email(email)
            invited_uid = invited_user.uid
            invited_name = invited_user.display_name or email.split("@")[0]
        except Exception:
            pass

        # 초대자 이름 가져오기
        inviter_name = user_data.get("name") or user_data.get("email", "").split("@")[0]

        # 초대 문서 생성 (pending 상태)
        invitation_id = str(uuid.uuid4())
        invitation_data = {
            "id": invitation_id,
            "jdId": jd_id,
            "jdTitle": jd_data.get("title", "제목 없음"),
            "inviterUid": uid,
            "inviterEmail": user_data.get("email", ""),
            "inviterName": inviter_name,
            "inviteeEmail": email,
            "inviteeUid": invited_uid,
            "inviteeName": invited_name,
            "status": "pending",  # pending / accepted / rejected
            "createdAt": datetime.now(timezone.utc),
            "respondedAt": None,
        }

        get_db().collection("invitations").document(invitation_id).set(invitation_data)

        return {
            "message": f"{email} 님에게 초대를 보냈습니다. 상대방이 수락하면 협업자로 추가됩니다.",
            "invitation": {
                "id": invitation_id,
                "email": email,
                "name": invited_name,
                "status": "pending",
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/invitations")
async def get_my_invitations(user_data: dict = Depends(verify_token)):
    """현재 사용자에게 온 대기 중인 초대 목록을 반환합니다."""
    try:
        email = user_data.get("email", "").lower()
        if not email:
            return {"invitations": []}

        # 내 이메일로 온 pending 초대 조회
        invitations = get_db().collection("invitations") \
            .where("inviteeEmail", "==", email) \
            .where("status", "==", "pending") \
            .get()

        result = []
        for inv_doc in invitations:
            inv = inv_doc.to_dict()
            # Timestamp 직렬화
            if inv.get("createdAt"):
                if hasattr(inv["createdAt"], "timestamp"):
                    inv["createdAt"] = {"seconds": int(inv["createdAt"].timestamp()), "nanoseconds": 0}
                elif isinstance(inv["createdAt"], datetime):
                    inv["createdAt"] = {"seconds": int(inv["createdAt"].timestamp()), "nanoseconds": 0}
            result.append(inv)

        return {"invitations": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/invitations/sent/{jd_id}")
async def get_sent_invitations(jd_id: str, user_data: dict = Depends(verify_token)):
    """특정 JD에 보낸 대기 중인 초대 목록을 반환합니다."""
    try:
        uid = user_data["uid"]

        jd_doc = get_db().collection("jds").document(jd_id).get()
        if not jd_doc.exists:
            raise HTTPException(status_code=404, detail="공고를 찾을 수 없습니다.")

        jd_data = jd_doc.to_dict()
        if jd_data.get("userId") != uid and uid not in (jd_data.get("collaboratorIds") or []):
            raise HTTPException(status_code=403, detail="조회 권한이 없습니다.")

        invitations = get_db().collection("invitations") \
            .where("jdId", "==", jd_id) \
            .where("status", "==", "pending") \
            .get()

        result = []
        for inv_doc in invitations:
            inv = inv_doc.to_dict()
            if inv.get("createdAt"):
                if hasattr(inv["createdAt"], "timestamp"):
                    inv["createdAt"] = {"seconds": int(inv["createdAt"].timestamp()), "nanoseconds": 0}
                elif isinstance(inv["createdAt"], datetime):
                    inv["createdAt"] = {"seconds": int(inv["createdAt"].timestamp()), "nanoseconds": 0}
            result.append(inv)

        return {"invitations": result}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/invitations/{invitation_id}/respond")
async def respond_to_invitation(invitation_id: str, response: InvitationResponse, user_data: dict = Depends(verify_token)):
    """초대를 수락하거나 거절합니다."""
    try:
        email = user_data.get("email", "").lower()
        uid = user_data["uid"]

        inv_ref = get_db().collection("invitations").document(invitation_id)
        inv_doc = inv_ref.get()
        if not inv_doc.exists:
            raise HTTPException(status_code=404, detail="초대를 찾을 수 없습니다.")

        inv_data = inv_doc.to_dict()

        # 본인에게 온 초대인지 확인
        if inv_data.get("inviteeEmail", "").lower() != email:
            raise HTTPException(status_code=403, detail="이 초대에 응답할 권한이 없습니다.")

        if inv_data.get("status") != "pending":
            raise HTTPException(status_code=400, detail="이미 처리된 초대입니다.")

        action = response.action.lower()
        if action not in ("accept", "reject"):
            raise HTTPException(status_code=400, detail="action은 'accept' 또는 'reject'이어야 합니다.")

        # 초대 상태 업데이트
        inv_ref.update({
            "status": "accepted" if action == "accept" else "rejected",
            "respondedAt": datetime.now(timezone.utc),
        })

        if action == "accept":
            # JD에 협업자로 추가
            jd_ref = get_db().collection("jds").document(inv_data["jdId"])
            jd_doc = jd_ref.get()
            if jd_doc.exists:
                invited_name = user_data.get("name") or inv_data.get("inviteeName", email.split("@")[0])
                new_collaborator = {
                    "uid": uid,
                    "email": email,
                    "name": invited_name,
                    "role": "collaborator",
                    "addedAt": datetime.now(timezone.utc),
                    "addedBy": inv_data.get("inviterUid"),
                }
                update_data = {
                    "collaborators": firebase_firestore.ArrayUnion([new_collaborator]),
                    "collaboratorEmails": firebase_firestore.ArrayUnion([email]),
                    "collaboratorIds": firebase_firestore.ArrayUnion([uid]),
                }
                jd_ref.update(update_data)

            return {"message": "초대를 수락했습니다. 이제 해당 공고의 협업자입니다."}
        else:
            return {"message": "초대를 거절했습니다."}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/collaborators/{jd_id}")
async def get_collaborators(jd_id: str, user_data: dict = Depends(verify_token)):
    """특정 JD의 협업자 목록을 반환합니다."""
    try:
        uid = user_data["uid"]

        jd_doc = get_db().collection("jds").document(jd_id).get()
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

        jd_ref = get_db().collection("jds").document(jd_id)
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
        new_emails = [c.get("email", "").lower() for c in new_collaborators if c.get("email")]
        jd_ref.update({
            "collaborators": new_collaborators,
            "collaboratorIds": new_ids,
            "collaboratorEmails": new_emails,
        })

        return {"message": f"{member_email} 님을 공고에서 제거했습니다."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
