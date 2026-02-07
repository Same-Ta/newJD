from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any


# ==================== Auth Models ====================
class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    nickname: Optional[str] = None


# ==================== JD Models ====================
class JDCreate(BaseModel):
    title: str
    type: Optional[str] = "club"  # 'company' | 'club'
    company: Optional[str] = None
    companyName: Optional[str] = None
    teamName: Optional[str] = None
    jobRole: Optional[str] = None
    location: Optional[str] = None
    scale: Optional[str] = None
    description: Optional[str] = None  # 동아리 소개 / 회사 소개
    vision: Optional[str] = None
    mission: Optional[str] = None
    techStacks: Optional[List[Dict[str, Any]]] = None
    responsibilities: List[str] = []
    requirements: List[str] = []
    preferred: List[str] = []
    benefits: List[str] = []
    status: str = "draft"
    applicationFields: Optional[Dict[str, Any]] = None
    # 동아리 모집 일정 필드
    recruitmentPeriod: Optional[str] = None   # 모집 기간
    recruitmentTarget: Optional[str] = None   # 모집 대상
    recruitmentCount: Optional[str] = None    # 모집 인원
    recruitmentProcess: Optional[List[str]] = None  # 모집 절차
    activitySchedule: Optional[str] = None    # 활동 일정
    membershipFee: Optional[str] = None       # 회비/활동비


class JDUpdate(BaseModel):
    title: Optional[str] = None
    type: Optional[str] = None  # 'company' | 'club'
    company: Optional[str] = None
    companyName: Optional[str] = None
    teamName: Optional[str] = None
    jobRole: Optional[str] = None
    location: Optional[str] = None
    scale: Optional[str] = None
    description: Optional[str] = None
    vision: Optional[str] = None
    mission: Optional[str] = None
    techStacks: Optional[List[Dict[str, Any]]] = None
    responsibilities: Optional[List[str]] = None
    requirements: Optional[List[str]] = None
    preferred: Optional[List[str]] = None
    benefits: Optional[List[str]] = None
    status: Optional[str] = None
    applicationFields: Optional[Dict[str, Any]] = None
    recruitmentPeriod: Optional[str] = None
    recruitmentTarget: Optional[str] = None
    recruitmentCount: Optional[str] = None
    recruitmentProcess: Optional[List[str]] = None
    activitySchedule: Optional[str] = None
    membershipFee: Optional[str] = None


# ==================== Application Models ====================
class ApplicationCreate(BaseModel):
    jdId: str
    jdTitle: str
    applicantName: str
    applicantEmail: EmailStr
    applicantPhone: Optional[str] = None
    applicantGender: Optional[str] = None
    birthDate: Optional[str] = None
    university: Optional[str] = None
    major: Optional[str] = None
    portfolio: Optional[str] = None
    customAnswers: Optional[Dict[int, str]] = None
    requirementAnswers: Optional[List[Dict[str, Any]]] = None
    preferredAnswers: Optional[List[Dict[str, Any]]] = None


class ApplicationUpdate(BaseModel):
    status: str


# ==================== AI Models ====================
class AIAnalysisRequest(BaseModel):
    applicantData: Dict[str, Any]


class SaveAnalysisRequest(BaseModel):
    analysis: str


class GeminiChatRequest(BaseModel):
    message: str
    chatHistory: List[Dict[str, Any]] = []
    type: Optional[str] = "club"  # 'company' | 'club'
