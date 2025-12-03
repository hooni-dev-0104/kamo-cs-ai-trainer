# Supabase 데이터베이스 마이그레이션

이 디렉토리에는 Supabase 데이터베이스 스키마 마이그레이션 파일이 포함되어 있습니다.

## 마이그레이션 파일 목록

마이그레이션 파일은 순서대로 실행되어야 합니다. Supabase SQL Editor에서 다음 순서로 실행하세요:

### 1. 초기 스키마 (001_initial_schema.sql)
- 기본 테이블 생성: `sessions`, `responses`, `feedbacks`
- 시나리오 테이블 생성: `scenarios`
- 초기 시나리오 데이터 삽입 (택시, 대리기사 관련 5개 시나리오)
- Row Level Security (RLS) 기본 정책 설정

### 2. 게임화 기능 (002_gamification.sql)
- 사용자 통계 테이블: `user_stats`
- 배지 시스템 테이블: `badges`, `user_badges`
- `sessions` 테이블에 `user_id` 컬럼 추가
- 초기 배지 데이터 삽입 (8개 배지)
- RLS 정책 설정

### 3. 퀴즈 학습 자료 (003_quiz_materials.sql)
- 퀴즈 학습 자료 테이블: `quiz_materials`
- 관리자 권한 기반 RLS 정책 설정

### 4. 사용자 관리 (004_user_management.sql)
- 사용자 프로필 테이블: `profiles`
- 관리자 권한 확인 함수: `is_admin()`
- 자동 프로필 생성 트리거: `on_auth_user_created`
- RLS 정책 설정

### 5. RLS 정책 수정 (005_fix_rls.sql)
- `profiles` 및 `quiz_materials` 테이블의 RLS 정책 강화
- 관리자 권한 기반 접근 제어 최종 설정

## 마이그레이션 실행 방법

### 방법 1: Supabase SQL Editor 사용 (권장)

1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. 프로젝트 선택
3. SQL Editor 메뉴 클릭
4. 각 마이그레이션 파일의 내용을 순서대로 복사하여 실행

### 방법 2: Supabase CLI 사용

```bash
# Supabase CLI 설치 (아직 설치하지 않은 경우)
npm install -g supabase

# Supabase 로그인
supabase login

# 프로젝트 연결
supabase link --project-ref YOUR_PROJECT_REF

# 마이그레이션 적용
supabase db push
```

## 주의사항

⚠️ **중요**: 마이그레이션 파일은 순서대로 실행해야 합니다. 순서를 바꾸거나 건너뛰면 오류가 발생할 수 있습니다.

⚠️ **프로덕션 환경**: 프로덕션 데이터베이스에 마이그레이션을 적용하기 전에 반드시 백업을 수행하세요.

## 테이블 구조 요약

### 핵심 테이블
- `scenarios`: 고객 상담 시나리오 정의
- `sessions`: 사용자 세션 기록
- `responses`: 사용자 응대 기록
- `feedbacks`: AI 피드백 데이터

### 게임화 테이블
- `user_stats`: 사용자 통계 (점수, 레벨, 완료 세션 수)
- `badges`: 배지 정의
- `user_badges`: 사용자 배지 획득 기록

### 관리 테이블
- `profiles`: 사용자 프로필 및 권한
- `quiz_materials`: 퀴즈 학습 자료

## RLS (Row Level Security) 정책

모든 테이블에 RLS가 활성화되어 있으며, 사용자별 데이터 접근을 제어합니다:

- **일반 사용자**: 자신의 데이터만 읽고 쓸 수 있음
- **관리자**: 모든 데이터에 접근 가능
- **익명 사용자**: 리더보드 등 공개 데이터만 읽을 수 있음

## 문제 해결

마이그레이션 실행 중 오류가 발생하면:

1. 오류 메시지를 확인하세요
2. 이전 마이그레이션이 정상적으로 실행되었는지 확인하세요
3. 테이블이 이미 존재하는 경우 `CREATE TABLE IF NOT EXISTS` 구문이 사용되므로 안전합니다
4. 자세한 내용은 [TROUBLESHOOTING.md](../docs/TROUBLESHOOTING.md)를 참고하세요

---

**작성일**: 2025년 1월  
**버전**: 1.0

