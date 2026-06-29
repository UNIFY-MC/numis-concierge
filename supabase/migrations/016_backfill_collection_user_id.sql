-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  PASSO C (AUTH) — atribuir a colecção existente ao dono.                   ║
-- ║                                                                            ║
-- ║  As 4001 linhas de numis.collection foram criadas na fase single-user com  ║
-- ║  user_id NULL. Antes de fechar o anon (migration 007), carimba-as com o    ║
-- ║  uid do dono — senão a RLS (auth.uid() = user_id) esconde-as.              ║
-- ║                                                                            ║
-- ║  APLICAR DEPOIS do 1.º login Google do dono (cria a conta em auth.users)   ║
-- ║  e ANTES da 007. Idempotente: se a conta ainda não existe, é no-op.        ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

update numis.collection
set user_id = (
  select id from auth.users
  where lower(email) = lower('mariocarvalho.biz@gmail.com')
  limit 1
)
where user_id is null;
