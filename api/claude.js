import { songsDB, getTopSongsForNow, getHighViralSongs } from './songs-db.js';

export const config = { maxDuration: 60 };

const SYSTEM = `당신은 Katie's Sing Along 채널 전담 AI 마케팅 에이전트입니다.
어린이 동요/Nursery Rhymes 채널 전문가로서, 제공된 채널 데이터와 곡 DB를 바탕으로
실행 가능하고 구체적인 한국어 답변을 작성합니다.
마크다운 형식(### 제목, - 리스트)으로 작성합니다.`;

function buildSongsContext() {
  const topNow = getTopSongsForNow();
  const highViral = getHighViralSongs().slice(0, 8);

  return `
=== 곡 DB 요약 (총 ${songsDB.songs.length}곡) ===

【지금 당장 올리면 좋은 곡 TOP 5 (현재 시즌 + 바이럴 가능성 기준)】
${topNow.map((s, i) => `${i + 1}. "${s.title}" | 카테고리: ${s.category} | 바이럴: ${s.viral_potential}
   - 쇼츠 아이디어: ${s.shorts_idea}
   - 훅: ${s.hook}
   - 제작 팁: ${s.notes}`).join('\n')}

【바이럴 가능성 HIGH 이상 곡 목록】
${highViral.map(s => `- "${s.title}" (${s.category}) | ${s.viral_potential} | 아이디어: ${s.shorts_idea}`).join('\n')}

【업로드 전략】
- 주 목표 업로드: ${songsDB.upload_strategy.weekly_target}회
- 포맷 비율: 쇼츠 60% / 롱폼 30% / 컴필레이션 10%
- 최적 업로드 시간: 평일 ${songsDB.upload_strategy.best_upload_times.weekday} / 주말 ${songsDB.upload_strategy.best_upload_times.weekend}

【쇼츠 훅 패턴】
${songsDB.shorts_templates.hook_patterns.map(h => `- ${h}`).join('\n')}
`.trim();
}

const PROMPTS = {
  insight: (ctx) => `다음 채널 데이터와 곡 DB를 분석해서 종합 인사이트를 작성해주세요.

【채널 데이터】
${ctx}

${buildSongsContext()}

### 채널 현재 상태
성장 단계 평가 (초기/성장/성숙/정체), 핵심 수치 해석

### 강점
데이터 기반 3가지 이상

### 약점 & 리스크
개선이 필요한 구체적인 지점

### 곡 DB 활용 기회
현재 채널 상태에서 가장 빠르게 조회수를 올릴 수 있는 곡/포맷 3가지 (DB 기반)

### 성장 로드맵
단기(1개월) / 중기(3개월) 목표`,

  goals: (ctx) => `다음 채널 데이터와 곡 DB를 바탕으로 이번 주 실행 가능한 목표를 수립해주세요.

【채널 데이터】
${ctx}

${buildSongsContext()}

### 이번 주 KPI 목표
조회수, 구독자 등 수치 포함

### 이번 주 제작할 영상
곡 DB에서 선정한 곡명과 포맷, 이유 포함 (3편)

### 최우선 액션 아이템
5가지 구체적 실행 항목 (우선순위 순)

### 이번 주 피해야 할 것`,

  scripts: (ctx) => `다음 채널 데이터와 곡 DB를 바탕으로 YouTube Shorts 스크립트 3편을 작성해주세요.

【채널 데이터】
${ctx}

${buildSongsContext()}

곡 DB의 "지금 당장 올리면 좋은 곡 TOP 5"에서 3곡을 선택해 스크립트를 작성하세요.
각 스크립트 구조:

### 스크립트 1: [곡명] — [콘셉트]
**선택 이유:** (바이럴 가능성, 시즌 적합성)
**훅 (첫 3초):** 시청자를 잡는 문장/동작
**본문 (30~60초):** 진행 방식, 가사 포함
**CTA:** 구독/댓글 유도 멘트
**업로드 최적 시간:** 

### 스크립트 2: [곡명] — [콘셉트]
...

### 스크립트 3: [곡명] — [콘셉트]
...`,

  schedule: (ctx) => `다음 채널 데이터와 곡 DB를 바탕으로 이번 주 7일 콘텐츠 스케줄을 만들어주세요.

【채널 데이터】
${ctx}

${buildSongsContext()}

### 주간 업로드 스케줄
요일별 곡명, 플랫폼(YouTube/Instagram/TikTok), 포맷, 업로드 시간 포함
곡은 DB에서 선택하고 선택 이유 한 줄 포함

### YouTube 영상 설명란 템플릿
(SEO 최적화, 해시태그 포함, 예시 곡명 적용)

### Instagram 캡션 템플릿
(부모 타겟, 공감 유도, 해시태그)

### TikTok 캡션 템플릿
(짧고 임팩트 있게, 트렌드 해시태그)

### 다음 주 예고
이번 주 성과에 따른 다음 주 방향 제안`
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const ANT_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANT_KEY) return res.status(500).json({ error: 'ANTHROPIC_API_KEY 환경변수가 없습니다' });

  const { task, context } = req.body || {};
  if (!task || !context) return res.status(400).json({ error: 'task, context 필수' });

  const promptFn = PROMPTS[task];
  if (!promptFn) return res.status(400).json({ error: '알 수 없는 task: ' + task });

  const upstream = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANT_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 2000,
      stream: true,
      system: SYSTEM,
      messages: [{ role: 'user', content: promptFn(context) }],
    }),
  });

  if (!upstream.ok) {
    const e = await upstream.json();
    return res.status(upstream.status).json({ error: e.error?.message || 'Claude API 오류' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const reader = upstream.body.getReader();
  const dec = new TextDecoder();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(dec.decode(value, { stream: true }));
    }
  } finally {
    res.end();
  }
}
