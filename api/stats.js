/**
 * 운영자 통계 조회 — 집계값만 돌려줍니다
 *
 * 개별 기록은 절대 내보내지 않습니다. 아래 두 뷰만 읽습니다.
 *   v_funnel   단계별 세션 수
 *   v_segment  연령대·지역·사찰별 세션 수
 *
 * 운영자 화면이 푸터에 공개 링크로 걸려 있으므로, 이 API 는 키를 요구합니다.
 * 환경변수 STATS_TOKEN 을 정하고, 운영자 화면에서 그 값을 입력해야 실제
 * 수치가 나옵니다. 키가 없으면 화면은 기존 예시 수치를 그대로 보여줍니다.
 *
 * 환경변수
 *   STATS_TOKEN                 (필수 — 없으면 조회가 막힙니다)
 *   SUPABASE_URL                (선택)
 *   SUPABASE_SERVICE_ROLE_KEY   (선택)
 */

const { configured, selectAll } = require("./_db.js");

// 재식별을 막기 위해, 사람 수가 이보다 적은 구간은 내보내지 않습니다.
const MIN_CELL = 5;

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");

  if (req.method !== "GET") return res.status(405).json({ error: "GET 만 받습니다." });

  if (!configured()) {
    return res.status(200).json({ configured: false, reason: "수집이 설정되지 않았습니다." });
  }

  const token = process.env.STATS_TOKEN;
  const given = (req.query && req.query.key) || "";
  if (!token || given !== token) {
    return res.status(401).json({ configured: true, error: "조회 키가 맞지 않습니다." });
  }

  try {
    const [funnel, segment] = await Promise.all([selectAll("v_funnel"), selectAll("v_segment")]);

    const seg = { age: [], region: [], temple: [] };
    for (const row of segment) {
      if (!seg[row.kind]) continue;
      if (row.sessions < MIN_CELL) continue; // 소수 구간은 감춥니다
      seg[row.kind].push({ value: row.value, sessions: row.sessions });
    }
    for (const k of Object.keys(seg)) seg[k].sort((a, b) => b.sessions - a.sessions);

    return res.status(200).json({
      configured: true,
      minCell: MIN_CELL,
      window: "최근 90일",
      funnel: funnel.map((r) => ({ event: r.event, sessions: r.sessions, events: r.events })),
      segment: seg,
    });
  } catch (err) {
    console.error("stats read failed", err.message);
    return res.status(502).json({ configured: true, error: "집계를 가져오지 못했습니다." });
  }
};
