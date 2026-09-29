# ☕ 바이브 카페 (Vibe Cafe) - 실시간 주문 시스템

> 따뜻한 감성의 카페 주문서 작성 및 실시간 금액 계산, Supabase 클라우드 데이터베이스 연동 웹 애플리케이션입니다.

---

## 🛠️ 기술 스택 (Tech Stack)

- **Frontend**: React 19, TypeScript, Vite 8, Tailwind CSS v4, Motion
- **Icons**: Lucide React
- **Database / Backend**: Supabase (PostgreSQL, Realtime)
- **Deployment**: Vercel

---

## 📂 프로젝트 구조 (Project Structure)

```text
├── src/
│   ├── components/
│   │   ├── OrderForm.tsx       # 주문서 작성 컴포넌트 (실시간 계산 & Supabase 저장)
│   │   ├── OrderBoard.tsx      # 실시간 주문 접수 게시판
│   │   └── SupabaseModal.tsx   # Supabase API 설정 및 SQL 복사 모달
│   ├── data/
│   │   └── cafeData.ts         # 메뉴 데이터 및 Supabase DDL SQL 쿼리문
│   ├── lib/
│   │   └── supabase.ts         # Supabase 클라이언트 및 DB 연동 함수
│   ├── App.tsx                 # 메인 레이아웃 및 Realtime 동기화
│   ├── main.tsx                # React 진입점
│   ├── types.ts                # TypeScript 인터페이스 정의
│   └── index.css               # 카페 테마 스타일링
├── .env.example                # 환경 변수 템플릿
├── .gitignore                  # Git 추적 제외 목록
├── .npmrc                      # npm peer dependency 충돌 방지 설정
├── vercel.json                 # Vercel SPA 라우팅 및 보안 헤더 설정
├── vite.config.ts              # Vite 설정
└── package.json
```

---

## 🚀 로컬 실행 방법 (Local Development)

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경 변수 설정
`.env.example` 파일을 복사하여 `.env` 파일을 생성하고 Supabase 키를 입력합니다.
```bash
cp .env.example .env
```

```env
VITE_SUPABASE_URL="https://your-project-id.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-public-key"
```
*(환경 변수를 설정하지 않아도 앱 내 [Supabase 설정] 팝업에서 직접 입력하여 테스트할 수 있습니다)*

### 3. 개발 서버 실행
```bash
npm run dev
```

---

## ☁️ Vercel 배포 가이드 (Vercel Deployment)

### 1. GitHub 저장소에 Push
1. 로컬 저장소 초기화 및 커밋:
   ```bash
   git init
   git add .
   git commit -m "feat: 바이브 카페 프로젝트 초기 커밋"
   ```
2. GitHub에서 새 Repository를 생성한 뒤 연결:
   ```bash
   git remote add origin https://github.com/사용자계정/저장소명.git
   git branch -M main
   git push -u origin main
   ```

### 2. Vercel에서 Import 및 환경 변수 설정
1. [Vercel 대시보드](https://vercel.com/dashboard)에서 **Add New... > Project**를 클릭합니다.
2. 위에서 push한 GitHub 저장소를 선택(**Import**)합니다.
3. **Environment Variables** 항목에 아래 두 환경 변수를 등록합니다:
   - `VITE_SUPABASE_URL`: 본인의 Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY`: 본인의 Supabase `anon public` Key
4. **Deploy** 버튼을 누르면 약 1분 내에 배포가 완료됩니다!

---

## 🔒 보안 및 주의 사항 (Security Best Practices)

1. **절대 `.env` 파일을 깃허브에 올리지 마세요.**
   - `.gitignore`에 `.env` 및 `.env*.local`이 등록되어 있어 안전하게 제외됩니다.
2. **Supabase Key 주의**:
   - 프론트엔드 환경 변수(`VITE_`)는 빌드 시 브라우저에 포함되므로, 관리자 권한을 가진 `service_role` 키는 **절대 입력하지 마시고**, 반드시 **`anon public` 키**만 사용하세요.
3. **Row Level Security (RLS)**:
   - 본 프로젝트의 `cafeData.ts`에 포함된 SQL 쿼리는 누구나 주문을 안전하게 등록/조회할 수 있는 RLS 정책이 기본 적용되어 있습니다.
