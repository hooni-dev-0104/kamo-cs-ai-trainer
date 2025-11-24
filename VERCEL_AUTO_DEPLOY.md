# Vercel 자동 배포 설정 가이드

## 1. Vercel Dashboard에서 GitHub 연동

### 방법 1: 새 프로젝트로 연결 (아직 Vercel에 프로젝트가 없는 경우)

1. [Vercel Dashboard](https://vercel.com/dashboard)에 접속
2. "Add New Project" 클릭
3. "Import Git Repository" 선택
4. GitHub 계정 연결 (처음이면 GitHub 인증)
5. `hooni-dev-0104/kamo-cs-trainer` 저장소 선택
6. "Import" 클릭

### 방법 2: 기존 프로젝트에 GitHub 연결 (이미 Vercel에 프로젝트가 있는 경우)

1. Vercel Dashboard → 프로젝트 선택
2. Settings → Git로 이동
3. "Connect Git Repository" 클릭
4. GitHub 저장소 선택 및 연결

## 2. 자동 배포 설정 확인

연결 후 자동으로 다음 설정이 적용됩니다:

- **Production Branch**: `main` (또는 `master`)
- **Automatic deployments**: 활성화
  - Push to main → Production 배포
  - Pull Request → Preview 배포

## 3. 환경 변수 설정

Settings → Environment Variables에서 다음 변수들을 설정:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GOOGLE_CLOUD_API_KEY=your_google_cloud_api_key
VITE_GOOGLE_CLOUD_PROJECT_ID=your_google_cloud_project_id
```

**중요**: Production, Preview, Development 모든 환경에 설정하세요.

## 4. 배포 설정 확인

Settings → General에서 확인:

- **Framework Preset**: Vite (자동 감지됨)
- **Build Command**: `npm run build` (vercel.json에 설정됨)
- **Output Directory**: `dist` (vercel.json에 설정됨)
- **Install Command**: `npm install` (기본값)

## 5. 테스트

1. 로컬에서 변경사항 커밋:
   ```bash
   git add .
   git commit -m "테스트: 자동 배포 확인"
   ```

2. main 브랜치에 푸시:
   ```bash
   git push origin main
   ```

3. Vercel Dashboard → Deployments에서 배포 진행 상황 확인
4. 배포 완료 후 제공된 URL로 접속하여 확인

## 6. 배포 알림 설정 (선택사항)

Settings → Notifications에서:
- Email 알림 설정
- Slack/Discord 웹훅 설정 (선택사항)

## 문제 해결

### 배포가 자동으로 시작되지 않는 경우

1. Vercel Dashboard → Settings → Git 확인
2. GitHub 저장소 연결 상태 확인
3. Production Branch가 `main`으로 설정되어 있는지 확인

### 빌드 실패 시

1. Deployments → 실패한 배포 → Logs 확인
2. 환경 변수가 올바르게 설정되었는지 확인
3. 로컬에서 빌드 테스트:
   ```bash
   npm run build
   ```

### 환경 변수 오류

- 변수명이 `VITE_`로 시작하는지 확인
- 모든 환경(Production, Preview, Development)에 설정되었는지 확인
- 환경 변수 변경 후 재배포 필요

