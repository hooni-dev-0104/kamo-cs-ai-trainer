# GitHub Actions 워크플로우

## deploy.yml

이 워크플로우는 main 브랜치에 푸시될 때마다 자동으로:
1. 프로젝트를 빌드하여 오류 확인 (로컬 빌드 검증)
2. Vercel Deployment API를 통해 Vercel 프로젝트 빌드 트리거
3. 배포 완료까지 대기

## 설정 방법

### 1. Vercel 토큰 생성

1. [Vercel Account Tokens](https://vercel.com/account/tokens) 접속
2. "Create Token" 클릭
3. 토큰 이름 입력 (예: "GitHub Actions")
4. Scope: Full Account 선택
5. 토큰 복사 (한 번만 표시됨)

### 2. Vercel Team ID 확인

1. [Vercel Dashboard](https://vercel.com/dashboard) 접속
2. 팀 선택 (개인 계정이면 Personal)
3. Settings → General
4. Team ID 확인 (또는 URL에서 확인: `vercel.com/[team-id]/...`)

### 3. GitHub Secrets 설정

1. GitHub 저장소 → Settings → Secrets and variables → Actions
2. "New repository secret" 클릭
3. 다음 secrets 추가:

#### 필수:
- `VERCEL_TOKEN`: Vercel 토큰 (위에서 생성한 토큰)
- `VERCEL_TEAM_ID`: Vercel Team ID (개인 계정이면 비워두거나 Personal)

#### 선택사항 (빌드 검증용):
- `VITE_SUPABASE_URL`: Supabase URL
- `VITE_SUPABASE_ANON_KEY`: Supabase Anon Key
- `VITE_GOOGLE_CLOUD_API_KEY`: Google Cloud API Key
- `VITE_GOOGLE_CLOUD_PROJECT_ID`: Google Cloud Project ID

**참고**: 
- 환경 변수는 Vercel Dashboard에서도 설정해야 합니다
- GitHub Secrets는 빌드 검증용입니다
- `VERCEL_TEAM_ID`가 비어있으면 Personal 계정으로 인식됩니다

## 워크플로우 동작

### Push to main
1. **빌드 검증**: 로컬에서 빌드 실행하여 오류 확인
2. **Vercel 배포 트리거**: Vercel Deployment API를 통해 배포 시작
3. **배포 대기**: 배포 완료까지 최대 5분 대기
4. **결과 확인**: 배포 URL 및 상태 확인

### Pull Request
- 빌드 검증만 실행 (배포하지 않음)

### 수동 실행
- `workflow_dispatch` 이벤트로 수동 실행 가능
- GitHub Actions 탭에서 "Run workflow" 클릭

## 문제 해결

### "Vercel token not found" 오류
- GitHub Secrets에 `VERCEL_TOKEN`이 설정되었는지 확인
- 토큰이 만료되지 않았는지 확인

### "Project not found" 오류
- Vercel Dashboard에서 프로젝트 이름이 `kamo-cs-trainer`인지 확인
- `VERCEL_TEAM_ID`가 올바른지 확인 (개인 계정이면 비워두기)

### "Build failed" 오류
- 로컬에서 `npm run build` 실행하여 오류 확인
- 환경 변수가 올바르게 설정되었는지 확인
- Vercel Dashboard → Deployments → Build Logs 확인

### 배포가 트리거되지 않는 경우
- Vercel Dashboard에서 GitHub 연동이 되어 있다면, GitHub Actions 없이도 자동 배포됩니다
- GitHub Actions는 추가적인 빌드 검증과 명시적인 배포 트리거를 제공합니다
- Vercel API 응답을 확인하여 오류 메시지 확인

### 배포가 오래 걸리는 경우
- 워크플로우는 최대 5분 대기 후 계속 실행 중임을 알립니다
- Vercel Dashboard에서 실제 배포 상태 확인

## 참고

- Vercel이 GitHub과 연동되어 있다면, GitHub Actions 없이도 자동 배포가 됩니다
- GitHub Actions는 빌드 검증과 더 세밀한 배포 제어를 원할 때 유용합니다
- Pull Request 시에는 배포하지 않고 빌드만 검증합니다

