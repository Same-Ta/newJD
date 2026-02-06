from fastapi import APIRouter, Depends, HTTPException
from firebase_admin import firestore as firebase_firestore
from pydantic import BaseModel

from config.firebase import db
from dependencies.auth import verify_token

router = APIRouter(prefix="/api/comments", tags=["Comments"])


class CommentCreate(BaseModel):
    applicationId: str
    content: str


class CommentUpdate(BaseModel):
    content: str


@router.post("")
async def create_comment(comment: CommentCreate, user_data: dict = Depends(verify_token)):
    """코멘트를 작성합니다."""
    try:
        comment_data = {
            "applicationId": comment.applicationId,
            "content": comment.content,
            "authorId": user_data["uid"],
            "authorEmail": user_data.get("email", ""),
            "authorName": user_data.get("name", user_data.get("email", "").split("@")[0]),
            "createdAt": firebase_firestore.SERVER_TIMESTAMP,
            "updatedAt": firebase_firestore.SERVER_TIMESTAMP,
        }

        doc_ref = db.collection("comments").document()
        doc_ref.set(comment_data)

        return {"id": doc_ref.id, "message": "Comment created successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{application_id}")
async def get_comments(application_id: str, user_data: dict = Depends(verify_token)):
    """특정 지원서의 모든 코멘트를 반환합니다."""
    try:
        comments_ref = (
            db.collection("comments")
            .where("applicationId", "==", application_id)
        )
        comments = []
        for doc in comments_ref.stream():
            comment_data = doc.to_dict()
            comment_data["id"] = doc.id
            # Firestore Timestamp를 직렬화 가능한 형태로 변환
            if comment_data.get("createdAt"):
                comment_data["createdAt"] = {
                    "seconds": int(comment_data["createdAt"].timestamp()),
                    "nanoseconds": 0
                }
            if comment_data.get("updatedAt"):
                comment_data["updatedAt"] = {
                    "seconds": int(comment_data["updatedAt"].timestamp()),
                    "nanoseconds": 0
                }
            comments.append(comment_data)
        # 클라이언트 측 정렬 (createdAt 기준)
        comments.sort(key=lambda x: x.get("createdAt", {}).get("seconds", 0))
        return comments
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{comment_id}")
async def update_comment(
    comment_id: str, comment: CommentUpdate, user_data: dict = Depends(verify_token)
):
    """코멘트를 수정합니다."""
    try:
        doc_ref = db.collection("comments").document(comment_id)
        doc = doc_ref.get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Comment not found")

        comment_data = doc.to_dict()
        if comment_data.get("authorId") != user_data["uid"]:
            raise HTTPException(status_code=403, detail="Not authorized to edit this comment")

        doc_ref.update(
            {"content": comment.content, "updatedAt": firebase_firestore.SERVER_TIMESTAMP}
        )
        return {"message": "Comment updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{comment_id}")
async def delete_comment(comment_id: str, user_data: dict = Depends(verify_token)):
    """코멘트를 삭제합니다."""
    try:
        doc_ref = db.collection("comments").document(comment_id)
        doc = doc_ref.get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Comment not found")

        comment_data = doc.to_dict()
        if comment_data.get("authorId") != user_data["uid"]:
            raise HTTPException(status_code=403, detail="Not authorized to delete this comment")

        doc_ref.delete()
        return {"message": "Comment deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
