-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  REVERTER A DÍVIDA TÉCNICA DA MIGRATION 006.                               ║
-- ║  APLICAR NO PASSO C (AUTH) — NÃO ANTES.                                     ║
-- ║                                                                            ║
-- ║  Fecha o acesso anon à numis.collection que a 006 abriu para a fase        ║
-- ║  single-user. A partir daqui a colecção volta a ser privada por user_id.   ║
-- ║                                                                            ║
-- ║  Pré-requisitos antes de aplicar:                                          ║
-- ║   1. Supabase Auth ligado (login a funcionar).                             ║
-- ║   2. Todas as linhas existentes de numis.collection com user_id preenchido ║
-- ║      (atribuir ao utilizador dono da colecção migrada).                    ║
-- ║      Ex: update numis.collection set user_id = '<uuid-do-mario>'           ║
-- ║          where user_id is null;                                            ║
-- ║   3. lib/catalog.ts a filtrar/escrever com o user_id da sessão.            ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

drop policy if exists "TEMP anon le collection"        on numis.collection;
drop policy if exists "TEMP anon insere collection"    on numis.collection;
drop policy if exists "TEMP anon actualiza collection" on numis.collection;

revoke select, insert, update on numis.collection from anon;

-- As políticas originais (auth.uid() = user_id) da migration 005 permanecem
-- e voltam a ser as únicas em vigor.
