# Katie's Agent v2

비밀번호 하나로 입장, API 키는 서버(Vercel)에만 보관.

## 파일 구조

```
├── public/index.html   ← 프론트엔드
├── api/auth.js         ← 비밀번호 확인
├── api/channel.js      ← YouTube 데이터
├── api/claude.js       ← Claude AI 스트리밍
└── vercel.json
```

## Vercel 배포

1. GitHub 새 레포 생성 → 이 폴더 내용 push
2. vercel.com → New Project → 레포 import
3. Environment Variables 3개 설정:

| 변수명 | 설명 |
|--------|------|
| `ACCESS_PASSWORD` | 접속 비밀번호 (예: `katie2024`) |
| `YOUTUBE_API_KEY` | YouTube Data API v3 키 |
| `ANTHROPIC_API_KEY` | Anthropic Claude API 키 |

4. Deploy → 완료

## 사용 흐름

접속 → 비밀번호 입력 → 자동 분석 시작 → 대시보드
(24시간 세션 유지, 재방문 시 비밀번호 재입력 불필요)
