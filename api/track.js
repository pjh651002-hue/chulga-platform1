/**
 * 익명 퍼널 수집
 *
 * ─────────────────────────────────────────────────────────────
 * 수집하지 않는 것 (코드로 강제합니다)
 *   · 이름, 연락처, 조회 코드
 *   · 출가상담에 적은 질문 내용 — 단 한 글자도 받지 않습니다
 *   · IP 주소, User-Agent, 리퍼러
 *   · 정확한 나이 (연령대로만 받습니다)
 *   · 쿠키, localStorage 식별자
 *
 * 세션 식별자(sk)는 브라우저 sessionStorage 에만 있고 탭을 닫으면 사라집니다.
 * 방문과 방문 사이를 잇지 않으므로 같은 사람인지 알 수 없습니다.
 *
 * 아래 허용 목록에 없는 값은 버립니다. 클라이언트가 무엇을 보내든
 * 여기 적힌 항목·값만 저장됩니다.
 * ─────────────────────────────────────────────────────────────
 */

const { configured, insert } = require("./_db.js");

const EVENTS = new Set([
  "visit",          // 앱 방문
  "guide_open",     // 나에게 맞는 곳 찾기 진입
  "match_run",      // 조건 입력 완료
  "school_open",    // 출가학교 화면 진입
  "school_detail",  // 특정 출가학교 상세 확인
  "apply_click",    // 사찰 홈페이지 링크 클릭
  "tel_click",      // 전화 걸기
  "counsel_open",   // 출가상담 화면 진입
  "counsel_ask",    // 질문 전송 (내용은 받지 않습니다)
]);

const AGE_BANDS = new Set(["10대", "20대", "30대", "40대", "50대", "60대 이상"]);
const SEXES = new Set(["male", "female"]);
const REGIONS = new Set(["수도권", "충청", "호남", "영남", "강원"]);
const DURS = new Set(["short", "mid", "long"]);
const LANGS = new Set(["ko", "en"]);

const pick = (set, v) => (typeof v === "string" && set.has(v) ? v : null);

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).end();

  // 수집을 켜지 않았으면 조용히 받아넘깁니다. 앱 동작에는 영향이 없습니다.
  if (!configured()) return res.status(204).end();

  let body = {};
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
  } catch (e) {
    return res.status(204).end();
  }

  const event = typeof body.e === "string" && EVENTS.has(body.e) ? body.e : null;
  if (!event) return res.status(204).end();

  // 세션 키는 정해진 모양만 받습니다. 그 밖의 문자열은 버립니다.
  const sk = typeof body.sk === "string" && /^[a-z0-9]{12,24}$/.test(body.sk) ? body.sk : null;
  if (!sk) return res.status(204).end();

  // 사찰명은 자유 입력이 아니라 앱이 가진 목록에서 오지만, 길이를 자르고
  // 줄바꿈·제어문자를 지웁니다.
  let temple = null;
  if (typeof body.t === "string") {
    const cleaned = body.t.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, 40);
    if (cleaned) temple = cleaned;
  }

  try {
    await insert("funnel_event", {
      session_key: sk,
      event,
      age_band: pick(AGE_BANDS, body.a),
      sex: pick(SEXES, body.s),
      region: pick(REGIONS, body.r),
      dur: pick(DURS, body.d),
      lang: pick(LANGS, body.l),
      temple,
    });
  } catch (err) {
    // 수집 실패가 이용자 화면에 드러나면 안 됩니다. 로그만 남깁니다.
    console.error("track insert failed", err.message);
  }

  return res.status(204).end();
};
