# Vercel 배포 문제 해결 가이드

## 배포가 안되는 경우 체크리스트

### 1. Vercel 프로젝트가 생성되었는지 확인

1. [Vercel Dashboard](https://vercel.com/dashboard) 접속
2. 프로젝트 목록에 `kamo-cs-trainer`가 있는지 확인
3. 없다면 "Add New Project" 클릭하여 생성

### 2. GitHub 저장소 연결 확인

1. Vercel Dashboard → 프로젝트 선택
2. Settings → Git로 이동
3. "Connected Git Repository"에 GitHub 저장소가 연결되어 있는지 확인
4. 연결되지 않았다면:
   - "Connect Git Repository" 클릭
   - GitHub 인증 (처음이면)
   - `hooni-dev-0104/kamo-cs-trainer` 선택
   - "Import" 클릭

### 3. 환경 변수 확인

1. Settings → Environment Variables로 이동
2. 다음 변수들이 **모든 환경**에 설정되어 있는지 확인:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_GOOGLE_CLOUD_API_KEY`
   - `VITE_GOOGLE_CLOUD_PROJECT_ID`

3. 변수명이 정확한지 확인 (대소문자 구분)
4. 값이 올바른지 확인 (공백 없이)

### 4. 빌드 설정 확인

1. Settings → General로 이동
2. 다음 설정 확인:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
   - **Root Directory**: `./` (기본값)

### 5. 배포 로그 확인

1. Deployments 탭으로 이동
2. 최신 배포 클릭
3. "Build Logs" 확인
4. 에러 메시지 확인:
   - 환경 변수 오류
   - 빌드 오류
   - 타입 오류
   - 의존성 오류

### 6. 자동 배포 설정 확인

1. Settings → Git로 이동
2. **Production Branch**: `main`으로 설정되어 있는지 확인
3. **Automatic deployments**가 활성화되어 있는지 확인

### 7. 수동 배포 시도

1. Deployments 탭으로 이동
2. "Redeploy" 클릭
3. 또는 GitHub에 푸시:
   ```bash
   git add .
   git commit -m "배포 테스트"
   git push origin main
   ```

## 일반적인 오류 및 해결 방법

### 오류: "Build failed"

**원인**: 빌드 중 오류 발생

**해결**:
1. 로컬에서 빌드 테스트:
   ```bash
   npm run build
   ```
2. 빌드 로그에서 구체적인 오류 확인
3. TypeScript 오류가 있다면 수정
4. 환경 변수 누락 확인

### 오류: "Environment variables missing"

**원인**: 필수 환경 변수가 설정되지 않음

**해결**:
1. Settings → Environment Variables에서 모든 변수 확인
2. Production, Preview, Development 모든 환경에 설정
3. 변수명이 `VITE_`로 시작하는지 확인

### 오류: "Deployment not found"

**원인**: GitHub 저장소가 연결되지 않음

**해결**:
1. Settings → Git에서 저장소 연결 확인
2. GitHub 권한 확인
3. 저장소를 다시 연결

### 오류: "Build timeout"

**원인**: 빌드 시간 초과

**해결**:
1. 불필요한 의존성 제거
2. 빌드 최적화
3. Vercel Pro 플랜 고려 (무료 플랜은 빌드 시간 제한 있음)

## 디버깅 단계

### 1단계: 로컬 빌드 테스트
```bash
npm run build
```
성공하면 → Vercel 설정 문제
실패하면 → 코드 문제

### 2단계: Vercel CLI로 배포 테스트
```bash
npm i -g vercel
vercel login
vercel --prod
```
성공하면 → GitHub 연동 문제
실패하면 → Vercel 설정 문제

### 3단계: 환경 변수 확인
Vercel Dashboard에서 환경 변수가 올바르게 설정되었는지 확인

### 4단계: 빌드 로그 확인
Vercel Dashboard → Deployments → Build Logs에서 상세 오류 확인

## 빠른 해결 방법

1. **프로젝트 재생성**:
   - 기존 프로젝트 삭제
   - 새로 프로젝트 생성
   - GitHub 저장소 연결

2. **환경 변수 재설정**:
   - 모든 환경 변수 삭제
   - 다시 추가 (주의: 값 확인)

3. **캐시 클리어**:
   - Settings → General → "Clear Build Cache" 클릭
   - 재배포

## 도움이 필요한 경우

1. Vercel Dashboard의 빌드 로그 전체 복사
2. 에러 메시지 스크린샷
3. 환경 변수 설정 상태 (민감 정보 제외)
4. 로컬 빌드 결과

이 정보들을 공유하면 더 정확한 해결책을 제시할 수 있습니다.

