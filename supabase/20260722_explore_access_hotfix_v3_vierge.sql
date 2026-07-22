-- DIGIY EXPLORE — ACCÈS V3 VIERGE
-- Compatibilité téléphone Sénégal : format international et format local.
-- Aucun numéro, PIN, slug ou profil d'abonné n'est inscrit dans ce fichier.
-- Ne modifie ni le PIN, ni digiy_verify_pin, ni guard.js.

create or replace function public.digiy_explore_has_access(p_phone text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_digits text := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  v_phone_full text;
  v_phone_local text;
  v_test_phone text;
  v_result jsonb;
  v_module text;
  v_exists boolean := false;
begin
  if length(v_digits) = 9 then
    v_phone_local := v_digits;
    v_phone_full := '221' || v_digits;
  elsif length(v_digits) = 12 and left(v_digits, 3) = '221' then
    v_phone_full := v_digits;
    v_phone_local := substr(v_digits, 4);
  else
    v_phone_full := v_digits;
    v_phone_local := v_digits;
  end if;

  if length(v_phone_local) < 9 then
    return false;
  end if;

  foreach v_test_phone in array array[v_phone_full, v_phone_local]
  loop
    foreach v_module in array array[
      'EXPLORE_BOOST',
      'EXPLORE',
      'explore_boost',
      'explore'
    ]
    loop
      begin
        execute 'select to_jsonb(public.digiy_has_module_access_from_abos($1,$2))'
          into v_result
          using v_test_phone, v_module;

        if public.digiy_explore_json_is_true(v_result) then
          return true;
        end if;
      exception when others then
        null;
      end;

      begin
        execute 'select to_jsonb(public.digiy_has_access($1,$2))'
          into v_result
          using v_test_phone, v_module;

        if public.digiy_explore_json_is_true(v_result) then
          return true;
        end if;
      exception when others then
        null;
      end;
    end loop;
  end loop;

  begin
    if to_regclass('public.digiy_subscriptions_public') is not null then
      execute $sql$
        select exists (
          select 1
          from public.digiy_subscriptions_public s
          where regexp_replace(coalesce(s.phone::text, ''), '[^0-9]', '', 'g')
                in ($1, $2)
            and (
              regexp_replace(
                upper(coalesce(s.module::text, '')),
                '[^A-Z0-9]+',
                '_',
                'g'
              ) in ('EXPLORE', 'EXPLORE_BOOST')
              or lower(btrim(coalesce(s.slug::text, ''))) in (
                lower('explore-' || $1),
                lower('explore-' || $2)
              )
            )
        )
      $sql$
      into v_exists
      using v_phone_full, v_phone_local;

      if v_exists then
        return true;
      end if;
    end if;
  exception when others then
    null;
  end;

  return false;
end;
$$;

grant execute on function public.digiy_explore_has_access(text)
  to anon, authenticated;

notify pgrst, 'reload schema';

-- Contrôle structurel neutre : aucune identité n'est interrogée.
select
  to_regprocedure('public.digiy_explore_has_access(text)') is not null
    as controle_acces_installe;
