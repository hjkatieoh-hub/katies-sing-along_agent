export const config = { maxDuration: 60 };

const SYSTEM = `당신은 어린이 유튜브 채널 전문 마케팅 에이전트입니다.
채널 데이터를 분석해서 실용적이고 구체적인 한국어 답변을 작성합니다.
마크다운 형식으로 작성하며, 제목은 ### 사용, 리스트는 - 사용합니다.`;

const PROMPTS = {
  insight: ctx => `다음 YouTube 채널 데이터를 분석해서 종합 인사이트를 작성해주세요.\n\n${ctx}\n\n### 채널 현재 상태\n성장 단계 평가 포함\n\n### 강점\n데이터 기반 3가지 이상\n\n### 약점 & 리스크\n개선이 필요한 지점\n\n### 성장 기회\n지금 당장 활용할 수 있는 기회 요인 3가지`,

  goals: ctx => `다음 채널 데이터를 바탕으로 이번 주 실행 가능한 콘텐츠 목표를 수립해주세요.\n\n${ctx}\n\n### 이번 주 KPI 목표\n수치 포함\n\n### 제작 목표\n영상 유형과 수량\n\n### 최우선 액션 아이템\n5가지 구체적인 실행 항목\n\n### 이번 주 피해야 할 것`,

  scripts: ctx => `다음 채널의 인기 영상 패턴을 분석해 YouTube Shorts 스크립트 3편을 작성해주세요.\n\n${ctx}\n\n어린이 동요/Nursery Rhymes 채널에 맞게, 부모가 아이와 함께 보기 좋은 콘텐츠로 만들어주세요.\n\n### 스크립트 1: [제목]\n**훅 (첫 3초):** \n**본문 (30~60초):** \n**CTA:** \n\n### 스크립트 2: [제목]\n...\n\n### 스크립트 3: [제목]\n...`,

  schedule: ctx => `다음 채널 데이터를 바탕으로 이번 주 7일 콘텐츠 스케줄과 SNS별 캡션을 작성해주세요.\n\n${ctx}\n\n### 주간 업로드 스케줄\n요일별 플랫폼(YouTube/Instagram/TikTok)과 콘텐츠 유형, 최적 시간대\n\n### YouTube 설명란 템플릿\nSEO 최적화, 해시태그 포함\n\n### Instagram 캡션 템플릿\n부모 타겟, 해시태그 포함\n\n### TikTok 캡션 템플릿\n짧고 임팩트 있게, 트렌드 해시태그`
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
      max_tokens: 1500,
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
