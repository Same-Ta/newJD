from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from dependencies.auth import verify_token
import json
import io
import os
import tempfile

router = APIRouter(prefix="/api/pdf", tags=["PDF Analysis"])

PDF_ANALYSIS_PROMPT_TEXT = """
다음은 채용공고 PDF에서 추출한 텍스트입니다. 이 내용을 분석하여 아래 JSON 형식으로 정확하게 반환해주세요.

텍스트:
{pdf_text}

다음 JSON 형식으로만 응답해주세요 (다른 텍스트 없이):
{{
  "title": "공고 제목",
  "company": "회사명",
  "jobRole": "직무/포지션",
  "location": "근무지",
  "scale": "회사 규모",
  "description": "회사/팀 소개",
  "vision": "비전",
  "mission": "미션",
  "techStacks": [
    {{"name": "기술명", "level": 3}}
  ],
  "responsibilities": ["업무 내용 1", "업무 내용 2"],
  "requirements": ["자격 요건 1", "자격 요건 2"],
  "preferred": ["우대 사항 1", "우대 사항 2"],
  "benefits": ["복지/혜택 1", "복지/혜택 2"],
  "recruitmentPeriod": "채용 기간",
  "recruitmentCount": "채용 인원",
  "recruitmentProcess": ["서류 전형", "면접", "최종 합격"],
  "activitySchedule": "",
  "membershipFee": ""
}}

비어있는 항목은 빈 문자열("") 또는 빈 배열([])로 반환하세요.
텍스트에서 파악할 수 없는 정보는 비워서 반환하세요.
"""

PDF_ANALYSIS_PROMPT_VISION = """
첨부된 PDF(또는 이미지)는 채용공고 문서입니다. 문서의 내용을 분석하여 아래 JSON 형식으로 정확하게 반환해주세요.

다음 JSON 형식으로만 응답해주세요 (다른 텍스트 없이):
{
  "title": "공고 제목",
  "company": "회사명",
  "jobRole": "직무/포지션",
  "location": "근무지",
  "scale": "회사 규모",
  "description": "회사/팀 소개",
  "vision": "비전",
  "mission": "미션",
  "techStacks": [
    {"name": "기술명", "level": 3}
  ],
  "responsibilities": ["업무 내용 1", "업무 내용 2"],
  "requirements": ["자격 요건 1", "자격 요건 2"],
  "preferred": ["우대 사항 1", "우대 사항 2"],
  "benefits": ["복지/혜택 1", "복지/혜택 2"],
  "recruitmentPeriod": "채용 기간",
  "recruitmentCount": "채용 인원",
  "recruitmentProcess": ["서류 전형", "면접", "최종 합격"],
  "activitySchedule": "",
  "membershipFee": ""
}

문서에서 채용공고와 관련 없는 내용(재학증명서, 성적증명서 등 첨부서류)은 무시하고,
채용/모집 공고에 해당하는 정보만 추출하세요.
파악할 수 없는 항목은 빈 문자열("") 또는 빈 배열([])로 반환하세요.
"""


def _parse_gemini_json(response_text: str) -> dict:
    """Gemini 응답에서 JSON 파싱"""
    text = response_text.strip()
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0].strip()
    elif "```" in text:
        text = text.split("```")[1].split("```")[0].strip()
    return json.loads(text)


async def _analyze_with_vision(content: bytes, filename: str) -> dict:
    """Gemini Files API를 통해 이미지/스캔 PDF 분석"""
    import google.generativeai as genai
    from config.gemini import get_gemini_model

    # 임시 파일에 저장 후 Gemini Files API로 업로드
    suffix = os.path.splitext(filename)[1] or ".pdf"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        uploaded_file = genai.upload_file(tmp_path, mime_type="application/pdf")
        model = get_gemini_model()
        response = model.generate_content([uploaded_file, PDF_ANALYSIS_PROMPT_VISION])
        # 업로드된 파일 삭제 (비동기 처리)
        try:
            genai.delete_file(uploaded_file.name)
        except Exception:
            pass
        return _parse_gemini_json(response.text)
    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass


@router.post("/analyze")
async def analyze_pdf(
    file: UploadFile = File(...),
    current_user: dict = Depends(verify_token)
):
    """PDF 파일을 업로드하여 채용공고 내용을 AI로 분석"""
    if not file.filename or not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="PDF 파일만 업로드 가능합니다.")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:  # 10MB
        raise HTTPException(status_code=400, detail="파일 크기는 10MB 이하여야 합니다.")

    # 1단계: PyPDF2로 텍스트 추출 시도
    pdf_text = ""
    try:
        import PyPDF2
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))
        for page in pdf_reader.pages:
            pdf_text += page.extract_text() or ""
    except Exception:
        pass  # 텍스트 추출 실패 시 비전 분석으로 폴백

    # 2단계: 텍스트가 없으면 Gemini 비전(멀티모달)으로 분석
    if not pdf_text.strip():
        try:
            job_data = await _analyze_with_vision(content, file.filename)
            return {"success": True, "jobData": job_data, "message": "PDF 비전 분석 완료"}
        except json.JSONDecodeError as e:
            raise HTTPException(status_code=500, detail=f"AI 응답 파싱 오류: {str(e)}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"AI 비전 분석 오류: {str(e)}")

    # 3단계: 텍스트가 있으면 기존 텍스트 기반 분석
    try:
        from config.gemini import get_gemini_model
        model = get_gemini_model()
        prompt = PDF_ANALYSIS_PROMPT_TEXT.format(pdf_text=pdf_text[:8000])
        response = model.generate_content(prompt)
        job_data = _parse_gemini_json(response.text)
        return {"success": True, "jobData": job_data, "message": "PDF 분석 완료"}

    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"AI 응답 파싱 오류: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI 분석 오류: {str(e)}")


@router.post("/extract-text")
async def extract_pdf_text(
    file: UploadFile = File(...),
    current_user: dict = Depends(verify_token)
):
    """PDF 파일에서 텍스트만 추출"""
    if not file.filename or not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="PDF 파일만 업로드 가능합니다.")

    content = await file.read()

    try:
        import PyPDF2
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))
        pdf_text = ""
        for page in pdf_reader.pages:
            pdf_text += page.extract_text() or ""

        return {"success": True, "text": pdf_text, "pages": len(pdf_reader.pages)}
    except ImportError:
        raise HTTPException(status_code=500, detail="PDF 처리 라이브러리가 설치되지 않았습니다.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"PDF 텍스트 추출 실패: {str(e)}")
