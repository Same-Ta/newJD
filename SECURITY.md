# 🔒 WINNOW 보안 가이드

## 1. Firebase 보안 규칙 (Firestore)

Firebase Console > Firestore Database > Rules 에서 아래 규칙을 적용하세요:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // 사용자 정보 - 본인만 접근 가능
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // JD(채용공고) - 작성자만 수정/삭제 가능, 공개 읽기
    match /jds/{jdId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
    
    // 지원서 - 채용담당자만 접근 가능
    match /applications/{applicationId} {
      allow read: if request.auth != null && 
        request.auth.uid == resource.data.recruiterId;
      allow create: if true; // 지원자는 로그인 없이 지원 가능
      allow update, delete: if request.auth != null && 
        request.auth.uid == resource.data.recruiterId;
    }
    
    // 임시저장 - 본인만 접근 가능
    match /drafts/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 2. 환경 변수 관리

### ✅ 올바른 방법
- `.env` 파일에 API 키 저장
- `.gitignore`에 `.env` 추가 (이미 설정됨)
- 프로덕션에서는 환경 변수 사용

### ❌ 금지 사항
- 코드에 API 키 하드코딩
- `.env` 파일을 Git에 커밋
- API 키를 공개 저장소에 노출

## 3. 개인정보 보호

### 자동 마스킹 적용 항목
- 📧 이메일: `ab***@example.com`
- 📱 전화번호: `010-****-1234`
- 👤 이름: `홍*동`

### AI 전송 시 보호
- 모든 민감 정보가 마스킹되어 AI에 전송됨
- 전화번호, 이메일 등 개인식별정보 자동 필터링

## 4. 세션 보안

### 권장 설정
- 30분 비활성 시 자동 로그아웃
- 브라우저 종료 시 세션 만료

### 구현 방법 (선택적)
```typescript
// App.tsx에 추가
import { SessionManager } from './utils/security';
import { signOut } from 'firebase/auth';

useEffect(() => {
  const sessionManager = new SessionManager(() => {
    signOut(auth);
    alert('보안을 위해 자동 로그아웃되었습니다.');
  });
  
  return () => sessionManager.destroy();
}, []);
```

## 5. 데이터 백업 및 삭제

### 정기 백업
- Firebase Console에서 자동 백업 설정
- 주기: 일일 백업 권장

### 개인정보 삭제 요청 처리
- 지원자 요청 시 30일 이내 삭제
- 삭제 로그 유지 (GDPR/PIPA 준수)

## 6. 보안 체크리스트

- [ ] Firebase 보안 규칙 적용
- [ ] `.env` 파일 생성 및 API 키 설정
- [ ] `.gitignore`에 `.env` 포함 확인
- [ ] 프로덕션 환경 변수 설정 (Vercel 등)
- [ ] 정기적인 API 키 로테이션
- [ ] 접근 로그 모니터링

## 7. 긴급 상황 대응

### API 키 노출 시
1. Firebase Console에서 즉시 API 키 재발급
2. `.env` 파일 업데이트
3. 기존 키 비활성화
4. 접근 로그 확인

### 데이터 유출 의심 시
1. 즉시 Firebase 보안 규칙 강화
2. 영향 받은 사용자 알림
3. 보안 감사 실시

---

📌 **문의**: 보안 관련 문의는 관리자에게 연락하세요.
