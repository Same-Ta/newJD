from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator
from typing import List, Optional, Dict, Any
from utils.security_utils import get_encryptor


# ==================== Auth Models ====================
class UserRegister(BaseModel):
    """
    User registration model.
    
    Email is stored as-is in Firebase Authentication.
    No encryption needed for auth emails.
    """
    email: EmailStr
    password: str = Field(..., min_length=6)
    nickname: Optional[str] = None


class UserResponse(BaseModel):
    """
    User response model with automatic decryption.
    
    Decrypts email when fetching from DB.
    """
    userId: str
    email: str
    nickname: Optional[str] = None
    createdAt: Optional[str] = None

    @model_validator(mode='before')
    @classmethod
    def decrypt_email(cls, data):
        """
        Automatically decrypt email when loading from DB.
        Gracefully handles non-encrypted legacy data.
        """
        if isinstance(data, dict):
            encryptor = get_encryptor()
            
            if 'email' in data and data['email'] is not None:
                try:
                    data['email'] = encryptor.decrypt(str(data['email']))
                except Exception:
                    # If decryption fails, keep original value (backward compatibility)
                    pass
        
        return data


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
    """
    Application creation model with automatic encryption.
    
    Sensitive fields (applicantName, applicantEmail, applicantPhone, birthDate, 
    university, major) are automatically encrypted before saving to DB using AES-256-GCM.
    """
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
    portfolioFileUrl: Optional[str] = None
    portfolioFileName: Optional[str] = None
    customAnswers: Optional[Dict[int, str]] = None
    requirementAnswers: Optional[List[Dict[str, Any]]] = None
    preferredAnswers: Optional[List[Dict[str, Any]]] = None
    selectedSkills: Optional[Dict[str, Any]] = None

    @model_validator(mode='after')
    def encrypt_sensitive_fields(self):
        """
        Automatically encrypt sensitive personal information fields before saving to DB.
        Uses AES-256-GCM encryption with the DataEncryption utility class.
        """
        encryptor = get_encryptor()
        
        # List of fields to encrypt
        sensitive_fields = [
            'applicantName',
            'applicantEmail', 
            'applicantPhone',
            'birthDate',
            'university',
            'major'
        ]
        
        # Convert to dict for encryption
        data_dict = self.model_dump()
        
        # Encrypt each sensitive field that has a value
        for field in sensitive_fields:
            if field in data_dict and data_dict[field] is not None:
                try:
                    data_dict[field] = encryptor.encrypt(str(data_dict[field]))
                except Exception as e:
                    print(f"⚠️ Failed to encrypt {field}: {str(e)}")
        
        # Update model fields with encrypted values
        for field, value in data_dict.items():
            setattr(self, field, value)
        
        return self


class ApplicationResponse(BaseModel):
    """
    Application response model with automatic decryption.
    
    Decrypts sensitive fields when fetching from DB for authorized users.
    """
    jdId: str
    jdTitle: str
    applicantName: str
    applicantEmail: str
    applicantPhone: Optional[str] = None
    applicantGender: Optional[str] = None
    birthDate: Optional[str] = None
    university: Optional[str] = None
    major: Optional[str] = None
    portfolio: Optional[str] = None
    portfolioFileUrl: Optional[str] = None
    portfolioFileName: Optional[str] = None
    customAnswers: Optional[Dict[int, str]] = None
    requirementAnswers: Optional[List[Dict[str, Any]]] = None
    preferredAnswers: Optional[List[Dict[str, Any]]] = None
    selectedSkills: Optional[Dict[str, Any]] = None
    status: Optional[str] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None
    applicationId: Optional[str] = None

    @model_validator(mode='before')
    @classmethod
    def decrypt_sensitive_fields(cls, data):
        """
        Automatically decrypt sensitive personal information fields when loading from DB.
        Gracefully handles non-encrypted legacy data.
        Also converts Firestore DatetimeWithNanoseconds to ISO string.
        """
        if isinstance(data, dict):
            # Convert Firestore datetime objects to ISO strings
            datetime_fields = ['createdAt', 'updatedAt', 'appliedAt']
            for field in datetime_fields:
                if field in data and data[field] is not None:
                    val = data[field]
                    if hasattr(val, 'isoformat'):
                        data[field] = val.isoformat()
            
            encryptor = get_encryptor()
            
            # List of fields to decrypt
            sensitive_fields = [
                'applicantName',
                'applicantEmail',
                'applicantPhone',
                'birthDate',
                'university',
                'major'
            ]
            
            # Decrypt each sensitive field that has a value
            for field in sensitive_fields:
                if field in data and data[field] is not None:
                    try:
                        # Try to decrypt - if it fails, assume it's already decrypted (legacy data)
                        original_value = str(data[field])
                        data[field] = encryptor.decrypt(original_value)
                        print(f"✅ Successfully decrypted {field}")
                    except Exception as e:
                        # If decryption fails, keep original value (backward compatibility)
                        print(f"⚠️ Failed to decrypt {field}: {str(e)} - keeping original value")
                        pass
        
        return data


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
