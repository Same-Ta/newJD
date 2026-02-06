// src/utils/security.ts
// 보안 관련 유틸리티 함수들

/**
 * 민감한 개인정보 패턴 정의
 */
const SENSITIVE_PATTERNS = {
    // 전화번호 패턴 (한국)
    phone: /(\d{2,3}[-.\s]?\d{3,4}[-.\s]?\d{4})/g,
    // 이메일 패턴
    email: /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
    // 주민등록번호 패턴
    ssn: /(\d{6}[-\s]?\d{7})/g,
    // 카드번호 패턴
    creditCard: /(\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4})/g,
};

/**
 * 텍스트에서 민감한 개인정보를 마스킹 처리
 * AI에 전송하기 전 사용
 */
export const maskSensitiveData = (text: string): string => {
    if (!text) return text;
    
    let maskedText = text;
    
    // 전화번호 마스킹 (010-****-1234 형태)
    maskedText = maskedText.replace(SENSITIVE_PATTERNS.phone, (match) => {
        const digits = match.replace(/[-.\s]/g, '');
        if (digits.length >= 10) {
            return `${digits.slice(0, 3)}-****-${digits.slice(-4)}`;
        }
        return match;
    });
    
    // 이메일 마스킹 (ab***@example.com 형태)
    maskedText = maskedText.replace(SENSITIVE_PATTERNS.email, (match) => {
        const [local, domain] = match.split('@');
        if (local.length > 2) {
            return `${local.slice(0, 2)}***@${domain}`;
        }
        return `***@${domain}`;
    });
    
    // 주민등록번호 마스킹
    maskedText = maskedText.replace(SENSITIVE_PATTERNS.ssn, '******-*******');
    
    // 카드번호 마스킹
    maskedText = maskedText.replace(SENSITIVE_PATTERNS.creditCard, '****-****-****-****');
    
    return maskedText;
};

/**
 * 전화번호 마스킹 (표시용)
 */
export const maskPhone = (phone: string): string => {
    if (!phone) return '';
    const digits = phone.replace(/[-.\s]/g, '');
    if (digits.length >= 10) {
        return `${digits.slice(0, 3)}-****-${digits.slice(-4)}`;
    }
    return phone;
};

/**
 * 이메일 마스킹 (표시용)
 */
export const maskEmail = (email: string): string => {
    if (!email) return '';
    const [local, domain] = email.split('@');
    if (!domain) return email;
    if (local.length > 2) {
        return `${local.slice(0, 2)}${'*'.repeat(Math.min(local.length - 2, 5))}@${domain}`;
    }
    return `***@${domain}`;
};

/**
 * 이름 마스킹 (표시용)
 * 홍길동 -> 홍*동
 */
export const maskName = (name: string): string => {
    if (!name) return '';
    if (name.length === 2) {
        return `${name[0]}*`;
    }
    if (name.length > 2) {
        return `${name[0]}${'*'.repeat(name.length - 2)}${name[name.length - 1]}`;
    }
    return name;
};

/**
 * API 요청 시 민감 정보 로깅 방지
 */
export const safeLog = (label: string, data: any): void => {
    if (process.env.NODE_ENV === 'production') {
        // 프로덕션에서는 민감 정보 제외하고 로깅
        console.log(label, '[DATA REDACTED IN PRODUCTION]');
    } else {
        // 개발 환경에서도 민감 정보는 마스킹
        const safeData = typeof data === 'string' 
            ? maskSensitiveData(data)
            : JSON.stringify(data, (key, value) => {
                if (['phone', 'email', 'ssn', 'password', 'applicantPhone', 'applicantEmail'].includes(key.toLowerCase())) {
                    return '[REDACTED]';
                }
                return value;
            }, 2);
        console.log(label, safeData);
    }
};
