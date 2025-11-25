# GitHub Actions 워크플로우

## deploy.yml

이 워크플로우는 main 브랜치에 푸시될 때마다 자동으로:
1. 프로젝트를 빌드하여 오류 확인
2. Vercel에 배포

## 설정 방법

### 1. Vercel 토큰 생성

1. [Vercel Dashboard](https://vercel.com/account/tokens) 접속
2. "Create Token" 클릭
3. 토큰 이름 입력 (예: "GitHub Actions")
4. Scope: Full Account 선택
5. 토큰 복사 (한 번만 표시됨)

### 2. GitHub Secrets 설정

1. GitHub 저장소 → Settings → Secrets and variables → Actions
2. "New repository secret" 클릭
3. 다음 secrets 추가:

#### 필수:
- `VERCEL_TOKEN`: Vercel 토큰 (위에서 생성한 토큰)

#### 선택사항 (빌드 검증용):
- `VITE_SUPABASE_URL`: Supabase URL
- `VITE_SUPABASE_ANON_KEY`: Supabase Anon Key
- `VITE_GOOGLE_CLOUD_API_KEY`: Google Cloud API Key
- `VITE_GOOGLE_CLOUD_PROJECT_ID`: Google Cloud Project ID

**참고**: 환경 변수는 Vercel Dashboard에서도 설정해야 합니다. GitHub Secrets는 빌드 검증용입니다.

### 3. Vercel 프로젝트 ID 확인 (선택사항)

Vercel 프로젝트가 이미 있다면:
1. Vercel Dashboard → 프로젝트 선택
2. Settings → General
3. Project ID 복사
4. `.vercel/project.json` 파일 생성 (선택사항)

## 워크플로우 동작

### Push to main
- 빌드 검증 실행
- 성공 시 Vercel에 프로덕션 배포

### Pull Request
- 빌드 검증만 실행 (배포하지 않음)

## 문제 해결

### "Vercel token not found" 오류
- GitHub Secrets에 `VERCEL_TOKEN`이 설정되었는지 확인

### "Build failed" 오류
- 로컬에서 `npm run build` 실행하여 오류 확인
- 환경 변수가 올바르게 설정되었는지 확인

### 배포가 되지 않는 경우
- Vercel Dashboard에서 GitHub 연동이 되어 있다면, GitHub Actions 없이도 자동 배포됩니다
- GitHub Actions는 추가적인 빌드 검증과 배포 제어를 제공합니다

## 참고

- Vercel이 GitHub과 연동되어 있다면, GitHub Actions 없이도 자동 배포가 됩니다
- GitHub Actions는 빌드 검증과 더 세밀한 배포 제어를 원할 때 유용합니다
- Pull Request 시에는 배포하지 않고 빌드만 검증합니다

