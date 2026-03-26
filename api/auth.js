export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { password } = req.body || {};
  const PASS = process.env.ACCESS_PASSWORD;

  if (!PASS) return res.status(500).json({ error: 'ACCESS_PASSWORD 환경변수 없음' });
  if (!password) return res.status(400).json({ error: '비밀번호를 입력하세요' });
  if (password !== PASS) return res.status(401).json({ error: '비밀번호가 틀렸습니다' });

  // 24시간 세션 토큰 (base64 timestamp)
  const token = Buffer.from(JSON.stringify({
    ok: true,
    exp: Date.now() + 86400000
  })).toString('base64');

  return res.status(200).json({ token });
}
