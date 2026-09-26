-- ═══════════════════════════════════════════════════════════════
--  출가 플랫폼 · 익명 퍼널 수집 스키마
--
--  Supabase 프로젝트를 만든 뒤 SQL Editor 에 통째로 붙여넣어 실행하십시오.
--  여러 번 실행해도 같은 결과가 되도록 작성했습니다.
--
--  설계 원칙
--    · 개인을 식별할 수 있는 값은 저장하지 않습니다.
--    · 정확한 나이가 아니라 연령대만 받습니다.
--    · 상담 질문 내용은 한 글자도 저장하지 않습니다.
--    · IP 와 User-Agent 는 받지도 적지도 않습니다.
--    · 세션 키는 브라우저 탭이 닫히면 사라지므로 방문끼리 이어지지 않습니다.
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.funnel_event (
  id           bigint generated always as identity primary key,
  occurred_at  timestamptz not null default now(),
  session_key  text        not null,   -- 탭 단위 임의 문자열. 개인 식별 불가
  event        text        not null,
  age_band     text,                   -- '30대' 같은 구간. 정확한 나이는 저장 안 함
  sex          text,
  region       text,
  dur          text,
  temple       text,
  lang         text
);

comment on table public.funnel_event is
  '익명 퍼널 기록. 개인식별정보를 담지 않습니다. 보존기간 180일.';
comment on column public.funnel_event.session_key is
  '브라우저 sessionStorage 의 임의 문자열. 탭을 닫으면 사라지며 방문 간 연결 불가.';

create index if not exists funnel_event_at_idx    on public.funnel_event (occurred_at desc);
create index if not exists funnel_event_event_idx on public.funnel_event (event);

-- ── 접근 차단 ──────────────────────────────────────────────────
-- 쓰기는 서버리스 함수가 서비스 롤 키로만 합니다.
-- 브라우저에서 쓰는 anon 키로는 읽지도 쓰지도 못하게 막습니다.
alter table public.funnel_event enable row level security;
-- 정책을 하나도 만들지 않습니다. 따라서 anon/authenticated 는 어떤 행도 볼 수 없습니다.
revoke all on public.funnel_event from anon, authenticated;

-- ── 집계 뷰 ────────────────────────────────────────────────────
-- 뷰에는 RLS 가 걸리지 않으므로, security_invoker 를 켜고 권한도 회수합니다.
-- 이 두 줄을 빠뜨리면 anon 키로 집계가 그대로 새어 나갑니다.

create or replace view public.v_funnel
  with (security_invoker = true) as
select
  event,
  count(distinct session_key)::int as sessions,
  count(*)::int                    as events
from public.funnel_event
where occurred_at > now() - interval '90 days'
group by event;

create or replace view public.v_segment
  with (security_invoker = true) as
select 'age' as kind, age_band as value, count(distinct session_key)::int as sessions
  from public.funnel_event
 where age_band is not null and occurred_at > now() - interval '90 days'
 group by age_band
union all
select 'region', region, count(distinct session_key)::int
  from public.funnel_event
 where region is not null and occurred_at > now() - interval '90 days'
 group by region
union all
select 'temple', temple, count(distinct session_key)::int
  from public.funnel_event
 where temple is not null and occurred_at > now() - interval '90 days'
 group by temple;

revoke all on public.v_funnel  from anon, authenticated;
revoke all on public.v_segment from anon, authenticated;

-- ── 보존기간 ───────────────────────────────────────────────────
-- 180일이 지난 기록은 지웁니다. 보존기간을 바꾸시려면 아래 숫자와
-- 개인정보처리방침에 적을 기간을 함께 고치십시오.
create or replace function public.purge_old_funnel_events()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.funnel_event where occurred_at < now() - interval '180 days';
$$;

revoke all on function public.purge_old_funnel_events() from anon, authenticated;

-- 자동 실행은 pg_cron 확장이 필요합니다. Supabase 대시보드에서
--   Database → Extensions → pg_cron 을 켠 뒤 아래를 한 번 실행하십시오.
--   (켜지 않으셨다면 주기적으로 직접 실행하셔도 됩니다.)
--
--   select cron.schedule(
--     'purge-funnel-events', '17 4 * * *',
--     $$select public.purge_old_funnel_events()$$
--   );
