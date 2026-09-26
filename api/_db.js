/**
 * Supabase REST 호출 도우미
 *
 * 의존성을 늘리지 않으려고 supabase-js 대신 REST 를 직접 부릅니다.
 * 서비스 롤 키는 서버에서만 쓰이며 브라우저로 나가지 않습니다.
 *
 * 환경변수
 *   SUPABASE_URL                (선택)
 *   SUPABASE_SERVICE_ROLE_KEY   (선택)
 *
 * 둘 다 없으면 configured() 가 false 이고, 호출한 쪽에서 아무 일도 하지 않습니다.
 * 즉 수집을 켜지 않아도 앱은 그대로 돌아갑니다.
 */

const BASE = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

function configured() {
  return Boolean(BASE && KEY);
}

async function rest(path, init = {}) {
  const res = await fetch(`${BASE}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`supabase ${res.status} ${body.slice(0, 200)}`);
  }
  return res;
}

async function insert(table, row) {
  await rest(table, {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(row),
  });
}

async function selectAll(view) {
  const res = await rest(`${view}?select=*`);
  return res.json();
}

module.exports = { configured, insert, selectAll };
