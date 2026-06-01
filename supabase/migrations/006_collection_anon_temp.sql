-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  TEMPORÁRIO — REVERTER NO PASSO C (AUTH).                                   ║
-- ║  NÃO USAR EM PRODUÇÃO COM DADOS A SÉRIO.                                    ║
-- ║                                                                            ║
-- ║  Abre a tabela numis.collection ao role 'anon' para a app funcionar sem    ║
-- ║  autenticação (fase single-user). Concede SELECT/INSERT/UPDATE — NUNCA     ║
-- ║  DELETE, para que ninguém com a anon key possa apagar a colecção.          ║
-- ║                                                                            ║
-- ║  Reverter com: supabase/migrations/007_revert_collection_anon_PASSO_C.sql  ║
-- ║  Quando: assim que o Passo C (Supabase Auth) ligar user_id = auth.uid().   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- Marcar "não tenho" = UPDATE quantidade=0 (a app NUNCA apaga linhas).
-- Por isso anon recebe apenas SELECT, INSERT, UPDATE.
grant select, insert, update on numis.collection to anon;

create policy "TEMP anon le collection"
  on numis.collection for select to anon using (true);

create policy "TEMP anon insere collection"
  on numis.collection for insert to anon with check (true);

create policy "TEMP anon actualiza collection"
  on numis.collection for update to anon using (true) with check (true);
