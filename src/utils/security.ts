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
    // 계좌번호 패턴 (일반적인 형태)
    bankAccount: /(\d{3,6}[-\s]?\d{2,6}[-\s]?\d{2,6}[-\s]?\d{0,6})/g,
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
 * AES-GCM을 사용한 데이터 암호화
 * Web Crypto API 사용
 */
export const encryptData = async (data: string, key: CryptoKey): Promise<string> => {
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encryptedData = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encoder.encode(data)
    );
    
    // IV + 암호화된 데이터를 base64로 인코딩
    const combined = new Uint8Array(iv.length + new Uint8Array(encryptedData).length);
    combined.set(iv);
    combined.set(new Uint8Array(encryptedData), iv.length);
    
    return btoa(String.fromCharCode(...combined));
};

/**
 * AES-GCM을 사용한 데이터 복호화
 */
export const decryptData = async (encryptedString: string, key: CryptoKey): Promise<string> => {
    const combined = new Uint8Array(
        atob(encryptedString).split('').map(c => c.charCodeAt(0))
    );
    
    const iv = combined.slice(0, 12);
    const encryptedData = combined.slice(12);
    
    const decryptedData = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encryptedData
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
};

/**
 * 암호화 키 생성
 */
export const generateEncryptionKey = async (): Promise<CryptoKey> => {
    return crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );
};

/**
 * 패스워드 기반 암호화 키 생성 (PBKDF2)
 */
export const deriveKeyFromPassword = async (password: string, salt: Uint8Array): Promise<CryptoKey> => {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
    );
    
    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt.buffer as ArrayBuffer,
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );
};

/**
 * 민감 데이터 검출 여부 확인
 */
export const containsSensitiveData = (text: string): boolean => {
    if (!text) return false;
    
    return Object.values(SENSITIVE_PATTERNS).some(pattern => {
        pattern.lastIndex = 0; // Reset regex state
        return pattern.test(text);
    });
};

/**
 * 입력 값 검증 (XSS 방지)
 */
export const sanitizeInput = (input: string): string => {
    if (!input) return '';
    
    return input
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
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

/**
 * 세션 타임아웃 설정 (밀리초)
 */
export const SESSION_TIMEOUT = 30 * 60 * 1000; // 30분

/**
 * 비활성 상태 감지 및 자동 로그아웃
 */
export class SessionManager {
    private timeoutId: NodeJS.Timeout | null = null;
    private onTimeout: () => void;
    
    constructor(onTimeout: () => void) {
        this.onTimeout = onTimeout;
        this.resetTimer();
        this.setupActivityListeners();
    }
    
    private resetTimer(): void {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }
        this.timeoutId = setTimeout(() => {
            this.onTimeout();
        }, SESSION_TIMEOUT);
    }
    
    private setupActivityListeners(): void {
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
        events.forEach(event => {
            document.addEventListener(event, () => this.resetTimer(), { passive: true });
        });
    }
    
    public destroy(): void {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }
    }
}
