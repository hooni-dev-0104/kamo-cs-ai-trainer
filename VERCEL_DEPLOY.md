# Vercel 배포 가이드

## 1. Vercel CLI 설치 (선택사항)

터미널에서 Vercel CLI를 설치할 수 있습니다:

```bash
npm i -g vercel
```

## 2. Vercel에 로그인

```bash
vercel login
```

## 3. 프로젝트 배포

프로젝트 루트 디렉토리에서 다음 명령어를 실행:

```bash
vercel
```

또는 프로덕션 배포:

```bash
vercel --prod
```

## 4. 환경 변수 설정

Vercel 대시보드에서 환경 변수를 설정해야 합니다:

1. [Vercel Dashboard](https://vercel.com/dashboard)에 접속
2. 프로젝트 선택
3. Settings → Environment Variables로 이동
4. 다음 환경 변수들을 추가:

### 필수 환경 변수

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GOOGLE_CLOUD_API_KEY=your_google_cloud_api_key
VITE_GOOGLE_CLOUD_PROJECT_ID=your_google_cloud_project_id
```

### 환경별 설정

- **Production**: 프로덕션 환경
- **Preview**: 프리뷰 환경 (PR 등)
- **Development**: 개발 환경

모든 환경에 동일한 값으로 설정하거나, 환경별로 다르게 설정할 수 있습니다.

## 5. GitHub 연동 (권장)

1. Vercel Dashboard에서 프로젝트 선택
2. Settings → Git으로 이동
3. GitHub 저장소 연결
4. 자동 배포 설정:
   - Push to main → 자동 배포
   - Pull Request → 프리뷰 배포

## 6. 배포 확인

배포가 완료되면 Vercel이 제공하는 URL로 접속하여 확인:
- 예: `https://kamo-cs-trainer.vercel.app`

## 7. 커스텀 도메인 설정 (선택사항)

1. Settings → Domains로 이동
2. 원하는 도메인 추가
3. DNS 설정 안내에 따라 도메인 설정

## 문제 해결

### 빌드 실패 시

1. Vercel Dashboard → Deployments에서 로그 확인
2. 로컬에서 빌드 테스트:
   ```bash
   npm run build
   ```

### 환경 변수 오류 시

1. 환경 변수가 올바르게 설정되었는지 확인
2. 변수명이 `VITE_`로 시작하는지 확인 (Vite는 `VITE_` 접두사가 필요)
3. 배포 후 재배포 필요 (환경 변수 변경 시)

### CORS 오류 시

- Supabase에서 CORS 설정 확인
- Google Cloud API에서 허용된 도메인 확인

