from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from firebase_admin import firestore as firebase_firestore
import json
import uuid
import io
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import google.generativeai as genai

from config.firebase import get_db, bucket
import os
from dependencies.auth import verify_token
from models.schemas import ApplicationCreate, ApplicationUpdate, ApplicationResponse, AIAnalysisRequest, SaveAnalysisRequest, EmailNotificationRequest

router = APIRouter(prefix="/api/applications", tags=["Applications"])


def _send_email_smtp(to_email: str, subject: str, html_body: str):
    """SMTP를 사용하여 이메일을 전송합니다."""
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_password = os.getenv("SMTP_PASSWORD", "")
    smtp_from = os.getenv("SMTP_FROM", smtp_user)

    if not smtp_user or not smtp_password:
        raise ValueError("SMTP 설정이 되어 있지 않습니다. SMTP_USER와 SMTP_PASSWORD 환경변수를 설정해주세요.")

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = smtp_from
    msg["To"] = to_email

    html_part = MIMEText(html_body, "html", "utf-8")
    msg.attach(html_part)

    with smtplib.SMTP(smtp_host, smtp_port) as server:
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(smtp_user, smtp_password)
        server.sendmail(smtp_from, to_email, msg.as_string())


def _build_email_html(applicant_name: str, message: str, notification_type: str) -> str:
    """이메일 HTML 템플릿을 생성합니다."""
    is_accepted = notification_type == "accepted"
    accent_color = "#16a34a" if is_accepted else "#dc2626"
    badge_bg = "#dcfce7" if is_accepted else "#fee2e2"
    badge_text = "합격" if is_accepted else "불합격"
    icon = "🎉" if is_accepted else "📋"

    # 메시지 내 줄바꿈을 <br>로 변환
    formatted_message = message.replace("\n", "<br>")

    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:{accent_color};padding:32px 40px;text-align:center;">
            <div style="font-size:36px;margin-bottom:8px;">{icon}</div>
            <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">지원 결과 안내</h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <p style="font-size:16px;color:#1e293b;margin:0 0 8px;">
              안녕하세요, <strong>{applicant_name}</strong>님.
            </p>
            <div style="display:inline-block;padding:4px 16px;background:{badge_bg};color:{accent_color};border-radius:20px;font-size:13px;font-weight:700;margin:12px 0 24px;">
              {badge_text}
            </div>
            <div style="font-size:15px;line-height:1.8;color:#334155;white-space:pre-line;">
              {formatted_message}
            </div>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:24px 40px;border-top:1px solid #e2e8f0;text-align:center;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">본 메일은 Winnow를 통해 발송되었습니다.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


@router.post("/send-email")
async def send_email_notifications(request: EmailNotificationRequest, user_data: dict = Depends(verify_token)):
    """합격/불합격 이메일 알림을 전송합니다."""
    try:
        uid = user_data['uid']
        results = {"success": [], "failed": []}

        for app_id in request.applicationIds:
            try:
                doc = get_db().collection('applications').document(app_id).get()
                if not doc.exists:
                    results["failed"].append({"id": app_id, "reason": "지원서를 찾을 수 없습니다."})
                    continue

                app_data = doc.to_dict()

                # 권한 확인
                is_authorized = app_data.get('recruiterId') == uid
                if not is_authorized and app_data.get('jdId'):
                    jd_doc = get_db().collection('jds').document(app_data['jdId']).get()
                    if jd_doc.exists:
                        jd_data = jd_doc.to_dict()
                        is_authorized = uid in (jd_data.get('collaboratorIds') or [])
                if not is_authorized:
                    results["failed"].append({"id": app_id, "reason": "권한이 없습니다."})
                    continue

                # 복호화하여 이메일 주소 가져오기
                app_data['applicationId'] = doc.id
                try:
                    decrypted_app = ApplicationResponse(**app_data)
                    email = decrypted_app.applicantEmail
                    name = decrypted_app.applicantName
                except Exception:
                    email = app_data.get('applicantEmail', '')
                    name = app_data.get('applicantName', '지원자')

                if not email:
                    results["failed"].append({"id": app_id, "reason": "이메일 주소가 없습니다."})
                    continue

                # HTML 이메일 생성 및 전송
                html_body = _build_email_html(name, request.message, request.notificationType)
                _send_email_smtp(email, request.subject, html_body)

                # 전송 기록 저장
                new_status = "합격" if request.notificationType == "accepted" else "불합격"
                doc.reference.update({
                    'emailSentAt': firebase_firestore.SERVER_TIMESTAMP,
                    'emailType': request.notificationType,
                    'status': new_status,
                    'updatedAt': firebase_firestore.SERVER_TIMESTAMP
                })

                results["success"].append({"id": app_id, "email": email, "name": name})
                print(f"✅ Email sent to {email} ({name})")

            except ValueError as ve:
                results["failed"].append({"id": app_id, "reason": str(ve)})
            except Exception as e:
                print(f"❌ Failed to send email for {app_id}: {str(e)}")
                results["failed"].append({"id": app_id, "reason": str(e)})

        total = len(request.applicationIds)
        success_count = len(results["success"])

        return {
            "message": f"{total}건 중 {success_count}건 전송 완료",
            "results": results
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("")
async def create_application(application: ApplicationCreate):
    """새 지원서를 제출합니다."""
    try:
        jd_doc = get_db().collection('jds').document(application.jdId).get()
        if not jd_doc.exists:
            raise HTTPException(status_code=404, detail="JD not found")

        jd_data = jd_doc.to_dict()
        recruiter_id = jd_data.get('userId')

        app_data = application.dict()
        app_data['recruiterId'] = recruiter_id
        app_data['appliedAt'] = firebase_firestore.SERVER_TIMESTAMP
        app_data['status'] = 'pending'

        doc_ref = get_db().collection('applications').document()
        doc_ref.set(app_data)

        return {"id": doc_ref.id, "message": "Application submitted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload-portfolio")
async def upload_portfolio(file: UploadFile = File(...)):
    """포트폴리오 PDF 파일을 업로드합니다."""
    try:
        if not bucket:
            raise HTTPException(status_code=500, detail="Storage가 설정되지 않았습니다. FIREBASE_STORAGE_BUCKET 환경변수를 확인해주세요.")
        
        # PDF 검증
        if not file.filename or not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="PDF 파일만 업로드 가능합니다.")
        
        # 파일 크기 제한 (10MB)
        contents = await file.read()
        if len(contents) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="파일 크기는 10MB 이하여야 합니다.")
        
        # 고유 파일명 생성
        file_id = str(uuid.uuid4())
        original_name = file.filename
        blob_path = f"portfolios/{file_id}_{original_name}"
        
        # Firebase Storage에 업로드
        blob = bucket.blob(blob_path)
        blob.upload_from_string(contents, content_type='application/pdf')
        
        return {
            "fileUrl": blob_path,
            "fileName": original_name,
            "message": "파일 업로드 완료"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/download-portfolio/{application_id}")
async def download_portfolio(application_id: str, user_data: dict = Depends(verify_token)):
    """지원서의 포트폴리오 PDF를 다운로드합니다."""
    try:
        if not bucket:
            raise HTTPException(status_code=500, detail="Storage가 설정되지 않았습니다.")
        
        # 지원서 조회
        app_doc = get_db().collection('applications').document(application_id).get()
        if not app_doc.exists:
            raise HTTPException(status_code=404, detail="지원서를 찾을 수 없습니다.")
        
        app_data = app_doc.to_dict()
        file_url = app_data.get('portfolioFileUrl', '')
        file_name = app_data.get('portfolioFileName', 'portfolio.pdf')
        
        if not file_url:
            raise HTTPException(status_code=404, detail="첨부된 포트폴리오 파일이 없습니다.")
        
        # Firebase Storage에서 다운로드
        blob = bucket.blob(file_url)
        if not blob.exists():
            raise HTTPException(status_code=404, detail="파일이 존재하지 않습니다.")
        
        content = blob.download_as_bytes()
        
        return StreamingResponse(
            io.BytesIO(content),
            media_type='application/pdf',
            headers={
                'Content-Disposition': f'attachment; filename="{file_name}"'
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze")
async def analyze_application(request: AIAnalysisRequest, user_data: dict = Depends(verify_token)):
    """지원자를 AI로 분석합니다."""
    try:
        GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
        if not GEMINI_API_KEY:
            raise HTTPException(status_code=500, detail="Gemini API key not configured")

        # application ID가 제공된 경우 DB에서 복호화된 데이터를 가져옴
        if 'id' in request.applicantData or 'applicationId' in request.applicantData:
            app_id = request.applicantData.get('id') or request.applicantData.get('applicationId')
            print(f"🔄 Fetching and decrypting application {app_id} for AI analysis...")
            
            doc = get_db().collection('applications').document(app_id).get()
            if not doc.exists:
                raise HTTPException(status_code=404, detail="Application not found")
            
            app_data = doc.to_dict()
            app_data['applicationId'] = doc.id
            app_data['id'] = doc.id
            
            # ApplicationResponse를 통해 복호화
            try:
                decrypted_app = ApplicationResponse(**app_data)
                applicant = decrypted_app.model_dump()
                print(f"✅ Successfully decrypted application data for AI analysis")
            except Exception as e:
                print(f"⚠️ Failed to decrypt application for AI: {str(e)}")
                # 실패 시 원본 데이터 사용
                applicant = app_data
        else:
            # ID가 없으면 전달받은 데이터 그대로 사용 (backward compatibility)
            applicant = request.applicantData

        prompt = f"""[시스템 역할]
당신은 초기 스타트업의 생존을 결정짓는 전문 채용 컨설턴트입니다. 지원자의 답변에서 미사여구를 제거하고, 오직 [데이터, 방법론, 행동 패턴]만을 근거로 역량(Skill)과 의지(Will)를 냉정하게 판별합니다.

[분석 원칙]
- 냉정한 상/중/하: 수치와 구체적 방법론이 없으면 무조건 '중' 이하로 판정합니다.
- 팩트 위주: 지원자의 답변을 짧게 인용(Quote)하여 평가의 객관성을 확보합니다.

---

🔍 지원자 분석 리포트: {applicant.get('applicantName', 'N/A')}

---

[0. 서류 지원 현황 및 프로필]

지원 트랙 : {applicant.get('track', '') or '미기입'}

전공 정보 : {applicant.get('major', '') or '미기입'}

인적 사항 : {(str(applicant.get('grade', '')) + '학년') if applicant.get('grade') else '미기입'} / {(str(applicant.get('age', '')) + '세') if applicant.get('age') else '미기입'}{(' (' + applicant.get('applicantGender', '') + ')') if applicant.get('applicantGender') else ''}

현재 상태 : {applicant.get('status', '') or '미기입'}

---

지원자 세부 정보:
- 이메일: {applicant.get('applicantEmail', 'N/A')}
- 전화번호: {applicant.get('applicantPhone', 'N/A')}
- 공고: {applicant.get('jdTitle', 'N/A')}

자격 요건 답변:
{json.dumps(applicant.get('requirementAnswers', []), ensure_ascii=False, indent=2)}

우대 사항 답변:
{json.dumps(applicant.get('preferredAnswers', []), ensure_ascii=False, indent=2)}

---

위 정보를 바탕으로 아래 형식에 맞춰 분석 리포트를 작성하세요:

[1. 종합 진단 결과]

최종 분류 : [완성형 리더 / 직무 중심 전문가 / 성장형 유망주 / 신중 검토 대상]

역량(Skill) 수준 : [높음 / 보통 / 낮음]

의지(Will) 수준 : [높음 / 보통 / 낮음]

---

[2. 세부 역량 평가] (냉정 평가 모드)

직무 역량 | [상 / 중 / 하]

근거: " " (답변 발쵼)

판정: (JD 기준 대비 실무 전문성 및 숙련도 분석)

---

문제 해결 | [상 / 중 / 하]

근거: " " (답변 발쵼)

판정: (장애물 돌파를 위한 논리적 사고 및 실행력 분석)

---

성장 잠재력 | [상 / 중 / 하]

근거: " " (답변 발쵼)

판정: (실제 학습 성과 및 팀 성장에 대한 기여 의지 분석)

---

협업 태도 | [상 / 중 / 하]

근거: " " (답변 발쵼)

판정: (전략적 협업 관점 및 목표 중심적 소통 능력 분석)

---

[3. 조직 적합도 (Culture Fit)]

[ ] 스타트업 마인드셋 : [확인됨 / 미흡] (MVP 사고방식 및 리소스 제한 극복 경험)

[ ] 자기 주도성 : [확인됨 / 미흡] (지시 대기 여부 및 스스로 과업 정의 능력)

[ ] 커뮤니케이션 : [확인됨 / 미흡] (피드백 수용성 및 결론 중심의 논리력)

---

[4. 채용 가이드]

💡 핵심 강점

1.

2.

⚠️ 주의 사항 (Risk)

(치명적인 결함 혹은 리스크 요소)

(관리 시 유의해야 할 매니징 포인트)

🙋 면접 질문 추천

(답변의 허점을 짰르는 압박 질문)

(실무 역량의 바닥을 확인하는 기술 질문)

---

[중요 지시 사항]

가독성 최우선: 들여쓰기와 구분선(---)을 사용하여 섹션을 명확히 분리하세요.

간결성: 각 항목은 2줄 이내로 핵심만 짰르듯 작성하세요.

엄격함: 답변이 기준에 미달하면 가차 없이 '낮음' 또는 '미흡'으로 평가하세요.

금지: 절대 JSON이나 코드 블록으로 답변을 감싸지 마세요."""

        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(prompt)

        return {"analysis": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("")
async def get_applications(user_data: dict = Depends(verify_token)):
    """현재 사용자의 모든 지원서를 반환합니다 (소유 + 협업 JD 포함)."""
    try:
        uid = user_data['uid']
        applications = []
        seen_ids = set()

        # 1. 자신이 recruiterId인 지원서
        own_ref = get_db().collection('applications').where('recruiterId', '==', uid)
        for doc in own_ref.stream():
            app_data = doc.to_dict()
            app_data['applicationId'] = doc.id
            
            # ApplicationResponse 모델을 통해 자동 복호화
            try:
                print(f"🔄 Decrypting application {doc.id}...")
                decrypted_app = ApplicationResponse(**app_data)
                decrypted_data = decrypted_app.model_dump()
                decrypted_data['id'] = doc.id  # id 필드 추가
                applications.append(decrypted_data)
                print(f"✅ Successfully processed application {doc.id}")
            except Exception as e:
                # 복호화 실패 시 상세 에러 로깅
                print(f"❌ Failed to process application {doc.id}: {str(e)}")
                import traceback
                traceback.print_exc()
                # 원본 데이터 반환 (backward compatibility)
                app_data['id'] = doc.id
                applications.append(app_data)
            
            seen_ids.add(doc.id)

        # 2. 협업자로 초대된 JD의 지원서
        collab_jds_ref = get_db().collection('jds').where('collaboratorIds', 'array_contains', uid)
        for jd_doc in collab_jds_ref.stream():
            jd_apps_ref = get_db().collection('applications').where('jdId', '==', jd_doc.id)
            for doc in jd_apps_ref.stream():
                if doc.id not in seen_ids:
                    app_data = doc.to_dict()
                    app_data['applicationId'] = doc.id
                    
                    # ApplicationResponse 모델을 통해 자동 복호화
                    try:
                        print(f"🔄 Decrypting application {doc.id}...")
                        decrypted_app = ApplicationResponse(**app_data)
                        decrypted_data = decrypted_app.model_dump()
                        decrypted_data['id'] = doc.id  # id 필드 추가
                        applications.append(decrypted_data)
                        print(f"✅ Successfully processed application {doc.id}")
                    except Exception as e:
                        # 복호화 실패 시 상세 에러 로깅
                        print(f"❌ Failed to process application {doc.id}: {str(e)}")
                        import traceback
                        traceback.print_exc()
                        # 원본 데이터 반환
                        app_data['id'] = doc.id
                        applications.append(app_data)
                    
                    seen_ids.add(doc.id)

        return applications
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{application_id}")
async def get_application(application_id: str, user_data: dict = Depends(verify_token)):
    """특정 지원서를 반환합니다."""
    try:
        uid = user_data['uid']
        doc = get_db().collection('applications').document(application_id).get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Application not found")

        app_data = doc.to_dict()

        # 소유자 또는 해당 JD 협업자인지 확인
        is_authorized = app_data.get('recruiterId') == uid
        if not is_authorized and app_data.get('jdId'):
            jd_doc = get_db().collection('jds').document(app_data['jdId']).get()
            if jd_doc.exists:
                jd_data = jd_doc.to_dict()
                is_authorized = uid in (jd_data.get('collaboratorIds') or [])
        if not is_authorized:
            raise HTTPException(status_code=403, detail="Not authorized")

        app_data['applicationId'] = doc.id
        
        # ApplicationResponse 모델을 통해 자동 복호화
        try:
            print(f"🔄 Decrypting application {doc.id}...")
            decrypted_app = ApplicationResponse(**app_data)
            decrypted_data = decrypted_app.model_dump()
            decrypted_data['id'] = doc.id
            print(f"✅ Successfully processed application {doc.id}")
            return decrypted_data
        except Exception as e:
            # 복호화 실패 시 상세 에러 로깅
            print(f"❌ Failed to process application {doc.id}: {str(e)}")
            import traceback
            traceback.print_exc()
            # 원본 데이터 반환 (backward compatibility)
            app_data['id'] = doc.id
            return app_data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{application_id}")
async def update_application(application_id: str, application: ApplicationUpdate, user_data: dict = Depends(verify_token)):
    """지원서 상태를 수정합니다."""
    try:
        uid = user_data['uid']
        doc_ref = get_db().collection('applications').document(application_id)
        doc = doc_ref.get()

        if not doc.exists:
            raise HTTPException(status_code=404, detail="Application not found")

        app_data = doc.to_dict()

        # 소유자 또는 해당 JD 협업자인지 확인
        is_authorized = app_data.get('recruiterId') == uid
        if not is_authorized and app_data.get('jdId'):
            jd_doc = get_db().collection('jds').document(app_data['jdId']).get()
            if jd_doc.exists:
                jd_data = jd_doc.to_dict()
                is_authorized = uid in (jd_data.get('collaboratorIds') or [])
        if not is_authorized:
            raise HTTPException(status_code=403, detail="Not authorized")

        doc_ref.update({
            'status': application.status,
            'updatedAt': firebase_firestore.SERVER_TIMESTAMP
        })

        return {"message": "Application updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{application_id}")
async def delete_application(application_id: str, user_data: dict = Depends(verify_token)):
    """지원서를 삭제합니다."""
    try:
        doc_ref = get_db().collection('applications').document(application_id)
        doc = doc_ref.get()

        if not doc.exists:
            raise HTTPException(status_code=404, detail="Application not found")

        app_data = doc.to_dict()
        if app_data.get('recruiterId') != user_data['uid']:
            raise HTTPException(status_code=403, detail="Not authorized")

        doc_ref.delete()
        return {"message": "Application deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{application_id}/analysis")
async def save_analysis(application_id: str, request: SaveAnalysisRequest, user_data: dict = Depends(verify_token)):
    """AI 분석 결과를 저장합니다."""
    try:
        doc_ref = get_db().collection('applications').document(application_id)
        doc = doc_ref.get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Application not found")

        doc_ref.update({
            'aiAnalysis': request.analysis,
            'aiAnalyzedAt': firebase_firestore.SERVER_TIMESTAMP
        })
        return {"message": "Analysis saved successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{application_id}/analysis")
async def get_analysis(application_id: str, user_data: dict = Depends(verify_token)):
    """저장된 AI 분석 결과를 반환합니다."""
    try:
        doc = get_db().collection('applications').document(application_id).get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Application not found")

        data = doc.to_dict()
        return {
            "analysis": data.get('aiAnalysis', ''),
            "analyzedAt": data.get('aiAnalyzedAt', None)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
