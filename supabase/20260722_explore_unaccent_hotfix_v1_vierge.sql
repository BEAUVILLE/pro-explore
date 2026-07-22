begin;

-- DIGIY EXPLORE — HOTFIX NORMALISATION V1 VIERGE
-- Corrige le chemin de la fonction unaccent sans toucher aux données abonnés.
-- Aucun téléphone, nom, slug ou profil n'est inscrit ici.

create or replace function public.digiy_explore_normalize_text(
  p_value text
)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select btrim(
    regexp_replace(
      translate(
        lower(coalesce(p_value, '')),
        'àáâäãåçèéêëìíîïñòóôöõùúûüýÿœæ',
        'aaaaaaceeeeiiiinooooouuuuyyoa'
      ),
      '[^a-z0-9]+',
      ' ',
      'g'
    )
  );
$$;

create or replace function public.digiy_explore_resolve_category_code(
  p_category_label text,
  p_requested_code text default null
)
returns text
language plpgsql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_ref_column text;
  v_label text := btrim(coalesce(p_category_label, ''));
  v_requested text := btrim(coalesce(p_requested_code, ''));
  v_code text;
  v_sql text;
begin
  select att.attname
  into v_ref_column
  from pg_constraint con
  join lateral unnest(con.confkey) with ordinality as fk(attnum, position)
    on true
  join pg_attribute att
    on att.attrelid = con.confrelid
   and att.attnum = fk.attnum
  where con.conrelid = 'public.digiy_explore_places'::regclass
    and con.contype = 'f'
    and con.conname = 'digiy_explore_places_category_fk'
  order by fk.position
  limit 1;

  if v_ref_column is null then
    raise exception 'EXPLORE_CATEGORY_FK_NOT_FOUND';
  end if;

  if v_requested <> '' then
    v_sql := format(
      'select c.%1$I::text
         from public.digiy_explore_categories c
        where c.%1$I::text = $1
        limit 1',
      v_ref_column
    );
    execute v_sql into v_code using v_requested;
    if v_code is not null then
      return v_code;
    end if;
  end if;

  if v_label <> '' then
    v_sql := format(
      $query$
        select c.%1$I::text
        from public.digiy_explore_categories c
        where coalesce(lower(to_jsonb(c)->>'is_active'), 'true')
              not in ('false','f','0','no','inactive')
          and (
            public.digiy_explore_normalize_text(coalesce(
              to_jsonb(c)->>'label',
              to_jsonb(c)->>'name',
              to_jsonb(c)->>'title',
              to_jsonb(c)->>'public_name',
              ''
            ))) = public.digiy_explore_normalize_text($1)
            or public.digiy_explore_normalize_text(to_jsonb(c)::text)
               like '%%' || public.digiy_explore_normalize_text($1) || '%%'
          )
        order by c.%1$I::text
        limit 1
      $query$,
      v_ref_column
    );
    execute v_sql into v_code using v_label;
    if v_code is not null then
      return v_code;
    end if;
  end if;

  v_sql := format(
    'select c.%1$I::text
       from public.digiy_explore_categories c
      where c.%1$I::text = ''service''
      limit 1',
    v_ref_column
  );
  execute v_sql into v_code;
  if v_code is not null then
    return v_code;
  end if;

  v_sql := format(
    $query$
      select c.%1$I::text
      from public.digiy_explore_categories c
      where coalesce(lower(to_jsonb(c)->>'is_active'), 'true')
            not in ('false','f','0','no','inactive')
      order by c.%1$I::text
      limit 1
    $query$,
    v_ref_column
  );
  execute v_sql into v_code;

  if v_code is null then
    raise exception 'EXPLORE_NO_ACTIVE_CATEGORY';
  end if;

  return v_code;
end;
$$;

grant execute on function public.digiy_explore_normalize_text(text)
to anon, authenticated;

notify pgrst, 'reload schema';

commit;

select
  to_regprocedure('public.digiy_explore_normalize_text(text)') is not null
    as normalisation_installee,
  to_regprocedure('public.digiy_explore_resolve_category_code(text,text)') is not null
    as resolution_categories_installee,
  public.digiy_explore_resolve_category_code('Pêche / sortie', null)
    as exemple_code_resolu;
