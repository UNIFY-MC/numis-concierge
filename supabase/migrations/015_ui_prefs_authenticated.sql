-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  PASSO C (AUTH) — acesso de 'authenticated' à numis.ui_prefs.              ║
-- ║                                                                            ║
-- ║  A ui_prefs só tinha políticas para 'anon' (fase gate de password). Com    ║
-- ║  Supabase Auth o cliente passa a 'authenticated' e a RLS bloquearia a      ║
-- ║  leitura/escrita das preferências de tabela. ui_prefs é global (1 linha    ║
-- ║  por chave, uso pessoal) — concede acesso a qualquer utilizador autenticado║
-- ║  e dispensa as políticas TEMP anon.                                        ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

grant select, insert, update on numis.ui_prefs to authenticated;

drop policy if exists "TEMP anon le ui_prefs"      on numis.ui_prefs;
drop policy if exists "TEMP anon escreve ui_prefs" on numis.ui_prefs;

create policy "Authenticated le ui_prefs"
  on numis.ui_prefs for select to authenticated using (true);

create policy "Authenticated escreve ui_prefs"
  on numis.ui_prefs for all to authenticated using (true) with check (true);

revoke select, insert, update on numis.ui_prefs from anon;
