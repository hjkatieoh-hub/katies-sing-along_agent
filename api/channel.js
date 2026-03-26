export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const YT_KEY = process.env.YOUTUBE_API_KEY;
  if (!YT_KEY) return res.status(500).json({ error: 'YOUTUBE_API_KEY 환경변수가 없습니다' });

  async function yt(endpoint, params) {
    const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);
    url.searchParams.set('key', YT_KEY);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const r = await fetch(url.toString());
    if (!r.ok) { const e = await r.json(); throw new Error(e.error?.message || 'YouTube API 오류'); }
    return r.json();
  }

  try {
    const chRes = await yt('channels', {
      forHandle: 'Katiesingalong',
      part: 'snippet,statistics,contentDetails,status',
    });
    if (!chRes.items?.length) throw new Error('@Katiesingalong 채널을 찾을 수 없습니다');
    const ch = chRes.items[0];

    const uploadsId = ch.contentDetails?.relatedPlaylists?.uploads;
    const plRes = await yt('playlistItems', { playlistId: uploadsId, part: 'contentDetails', maxResults: 50 });
    const ids = plRes.items.map(i => i.contentDetails.videoId).join(',');
    const vRes = await yt('videos', { id: ids, part: 'snippet,statistics' });

    const videos = vRes.items.sort(
      (a, b) => parseInt(b.statistics.viewCount || 0) - parseInt(a.statistics.viewCount || 0)
    );

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    return res.status(200).json({ channel: ch, videos });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
