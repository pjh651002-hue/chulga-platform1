/**
 * 출가상담 응답 중계 함수
 *
 * 브라우저는 이 주소로 { question: "..." } 만 보내고,
 * API 키는 Vercel 환경변수(ANTHROPIC_API_KEY)에만 둡니다.
 * index.html 에 키를 적으면 소스보기로 노출되므로 절대 넣지 마십시오.
 *
 * 환경변수
 *   ANTHROPIC_API_KEY  (필수)
 *   ANSWER_MODEL       (선택, 기본 claude-sonnet-5)
 *   ALLOWED_ORIGIN     (선택, 예: https://chulga.jogyeorder.kr)
 */

const SYSTEM = `당신은 대한불교조계종 출가 안내 창구의 응답 도우미입니다.

답변 범위
- 출가 절차, 행자 등록, 행자교육, 출가학교, 외국인 출가 요건 등 사실과 절차만 안내합니다.
- 출가를 해야 할지 말지는 판단하지 않습니다. 그런 질문에는 판단을 내리지 말고
  출가상담 스님과의 연결을 안내하십시오.

지켜야 할 것
- 확인되지 않은 내용은 단정하지 말고, 교육부나 해당 사찰에 확인하도록 안내하십시오.
- 종법령 조문을 인용할 때는 조문 번호를 지어내지 마십시오. 확실하지 않으면
  "정확한 조문은 교육부에 확인이 필요합니다"라고 답하십시오.
- 특정 사찰을 추천하거나 서열을 매기지 마십시오.
- 개인정보(이름, 연락처, 주민등록번호 등)를 묻지 마십시오. 이용자가 스스로 적더라도
  되풀이해 적지 마십시오.
- 한국어 질문에는 한국어 존댓말로, 영어 질문에는 영어로 답하십시오.
- 3~5문장으로 짧게 답하고, 마지막에 출가상담전화 1666-7987 또는
  교육부 02-2011-1817 문의를 덧붙이십시오.

응답 거절
- 의료, 법률, 재정에 관한 개별 판단은 하지 말고 전문가 상담을 권하십시오.
- 죽음이나 자해를 암시하는 내용이 오면 절차 안내를 하지 말고,
  자살예방 상담 109와 사람과의 직접 대화를 권하십시오.`;

const MAX_LEN = 1000;

module.exports = async (req, res) => {
  const origin = process.env.ALLOWED_ORIGIN || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST 만 받습니다." });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return res.status(500).json({
      answer:
        "상담 서버가 아직 설정되지 않았습니다. 출가상담전화 1666-7987 또는 교육부 02-2011-1817로 문의해 주십시오.",
    });
  }

  let question = "";
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    question = String(body.question || "").trim();
  } catch (e) {
    return res.status(400).json({ error: "요청 형식이 올바르지 않습니다." });
  }

  if (!question) return res.status(400).json({ error: "질문이 비어 있습니다." });
  if (question.length > MAX_LEN)
    return res.status(400).json({ error: `질문은 ${MAX_LEN}자 이내로 적어 주십시오.` });

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANSWER_MODEL || "claude-sonnet-5",
        max_tokens: 700,
        system: SYSTEM,
        messages: [{ role: "user", content: question }],
      }),
    });

    if (!r.ok) {
      console.error("anthropic error", r.status);
      return res.status(502).json({
        answer:
          "지금은 답변을 드리기 어렵습니다. 출가상담전화 1666-7987로 문의해 주십시오.",
      });
    }

    const data = await r.json();
    const answer = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    return res.status(200).json({
      answer:
        answer ||
        "답변을 만들지 못했습니다. 출가상담전화 1666-7987로 문의해 주십시오.",
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      answer:
        "응답을 가져오지 못했습니다. 출가상담전화 1666-7987로 문의해 주십시오.",
    });
  }
};
