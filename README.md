# WINNOW - AI 기반 채용 플랫폼

GitHub 저장소의 프론트엔드 코드를 백엔드/프론트엔드 완전 분리 구조로 재구성한 프로젝트입니다.

## 📁 프로젝트 구조

```
newJD/
├── frontend/          # React + TypeScript 프론트엔드
│   ├── src/
│   │   ├── components/    # 재사용 가능한 컴포넌트
│   │   ├── pages/         # 페이지 컴포넌트
│   │   ├── services/      # API 서비스 레이어
│   │   ├── config/        # Firebase 설정 (Auth only)
│   │   ├── constants/     # 상수
│   │   ├── utils/         # 유틸리티 함수
│   │   └── ...
│   ├── package.json
│   └── vite.config.ts
│
├── backend/           # FastAPI 백엔드
│   ├── main.py            # FastAPI 애플리케이션
│   ├── requirements.txt   # Python 의존성
│   └── serviceAccountKey.json  # Firebase Admin SDK 키
│
└── README.md
```

## 🏗️ 아키텍처

### 백엔드 (FastAPI)
- **인증**: Firebase Admin SDK를 통한 JWT 토큰 검증
- **데이터베이스**: Firebase Firestore (백엔드에서만 접근)
- **AI**: Gemini API 통합 (지원자 분석)
- **API**: RESTful API 설계

### 프론트엔드 (React + TypeScript)
- **인증**: Firebase Authentication (클라이언트 인증만 사용)
- **API 통신**: 백엔드 API만 사용 (Firestore 직접 접근 제거)
- **UI**: Tailwind CSS, Lucide Icons
- **빌드**: Vite

## 🚀 시작하기

### 1. 환경 변수 설정

#### Backend (`.env`)
```bash
cd backend
cp .env.example .env
```

`.env` 파일 수정:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

#### Frontend (`.env`)
```bash
cd frontend
cp .env.example .env
```

`.env` 파일 수정:
```env
VITE_API_BASE_URL=http://localhost:8000

# Firebase Auth Configuration
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 2. Firebase Admin SDK 설정

백엔드에서 Firestore를 사용하기 위해 서비스 계정 키가 필요합니다:

1. [Firebase Console](https://console.firebase.google.com/) 접속
2. 프로젝트 설정 → 서비스 계정 → 새 비공개 키 생성
3. `serviceAccountKey.json`을 `backend/` 폴더에 저장

### 3. 백엔드 실행

```bash
cd backend

# 가상환경 생성 및 활성화
python -m venv venv
.\venv\Scripts\activate  # Windows
# source venv/bin/activate  # Mac/Linux

# 의존성 설치
pip install -r requirements.txt

# 서버 실행
python main.py
```

백엔드 서버: http://localhost:8000

### 4. 프론트엔드 실행

```bash
cd frontend

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

프론트엔드 서버: http://localhost:5173

```bash
# Vercel CLI 설치 (전역)
npm install -g vercel

# 배포
vercel

# 프로덕션 배포
vercel --prod
```

### 2. Vercel 대시보드 사용

1. [Vercel](https://vercel.com)에 로그인
2. "Add New Project" 클릭
3. GitHub 레포지토리 연결
4. 환경 변수 설정:
   - Settings → Environment Variables에서 `.env` 파일의 모든 변수 추가
5. Deploy 클릭

### 환경 변수 설정 (Vercel)

Vercel 프로젝트 설정에서 다음 환경 변수를 추가해야 합니다:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`
- `VITE_GEMINI_API_KEY`

## 기술 스택

- **Frontend**: React 18, TypeScript
- **Styling**: Tailwind CSS
- **Build**: Vite
- **Backend**: Firebase (Auth, Firestore)
- **AI**: Google Gemini API
- **Deployment**: Vercel

## 프로젝트 구조

```
JDNEW/
├── src/
│   ├── components/     # 재사용 가능한 컴포넌트
│   ├── pages/          # 페이지 컴포넌트
│   ├── config/         # 설정 파일 (Firebase 등)
│   ├── constants/      # 상수
│   ├── utils/          # 유틸리티 함수
│   ├── App.tsx         # 메인 앱 컴포넌트
│   └── main.tsx        # 진입점
├── public/             # 정적 파일
├── .env                # 환경 변수 (gitignore됨)
├── vercel.json         # Vercel 배포 설정
└── package.json        # 프로젝트 의존성
```

## 라이선스

MIT
