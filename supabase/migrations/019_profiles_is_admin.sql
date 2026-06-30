-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  MVP multitenant (Fase 1) — flag de admin no profile.                      ║
-- ║  Hoje o "dono" estava implícito no email hardcoded (016). Com signups,     ║
-- ║  precisa de ser explícito: is_admin governa gestão de catálogo, moderação  ║
-- ║  e acesso a áreas de administração. Ver decisions/0003-mvp-multitenant.md. ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
alter table numis.profiles add column if not exists is_admin boolean not null default false;

-- Dono da plataforma (Mário).
update numis.profiles set is_admin = true
where id = 'bbf3000a-59df-4e3f-9308-44ff01d7253d';
