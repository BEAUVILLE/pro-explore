begin;

-- DIGIY EXPLORE — ALIGNEMENT PRODUCTION V2 VIERGE
-- Objectif : un abonné enregistre sa fiche sans SQL et sans connaître les codes internes.
-- Ce fichier ne contient aucun téléphone, slug, nom ou profil d'abonné.
-- Ne modifie ni les PIN, ni digiy_verify_pin, ni la durée des sessions.

create schema if not exists extensions;
create extension if not exists unaccent with schema extensions;

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
            lower(extensions.unaccent(coalesce(
              to_jsonb(c)->>'label',
              to_jsonb(c)->>'name',
              to_jsonb(c)->>'title',
              to_jsonb(c)->>'public_name',
              ''
            ))) = lower(extensions.unaccent($1))
            or lower(extensions.unaccent(to_jsonb(c)::text))
               like '%%' || lower(extensions.unaccent($1)) || '%%'
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

create or replace function public.digiy_explore_prepare_place_v4()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_name text;
  v_label text;
  v_zone text;
  v_base text;
  v_candidate text;
  v_suffix text;
  v_counter integer := 0;
begin
  new.owner_slug := lower(btrim(coalesce(new.owner_slug, '')));
  new.owner_phone := regexp_replace(coalesce(new.owner_phone, ''), '[^0-9]', '', 'g');
  if length(new.owner_phone) = 9 then
    new.owner_phone := '221' || new.owner_phone;
  end if;

  v_name := left(coalesce(
    nullif(btrim(new.place_name), ''),
    nullif(btrim(new.public_name), ''),
    'Lieu EXPLORE'
  ), 160);

  v_label := left(coalesce(
    nullif(btrim(new.category), ''),
    'Autre découverte'
  ), 120);

  v_zone := left(coalesce(
    nullif(btrim(new.zone), ''),
    nullif(btrim(new.city), ''),
    'Petite Côte'
  ), 160);

  new.place_name := v_name;
  new.public_name := v_name;
  new.category := v_label;
  new.category_code := public.digiy_explore_resolve_category_code(
    v_label,
    new.category_code
  );
  new.zone := v_zone;
  new.city := v_zone;

  v_base := coalesce(
    public.digiy_explore_slugify(nullif(btrim(new.public_slug), '')),
    public.digiy_explore_slugify(nullif(btrim(new.slug), '')),
    public.digiy_explore_slugify(v_name),
    'lieu'
  );

  v_candidate := left(v_base, 58);
  v_suffix := left(
    replace(coalesce(new.id::text, md5(clock_timestamp()::text)), '-', ''),
    8
  );

  while exists (
    select 1
    from public.digiy_explore_places p
    where (
      lower(coalesce(p.slug, '')) = lower(v_candidate)
      or lower(coalesce(p.public_slug, '')) = lower(v_candidate)
    )
      and p.id is distinct from new.id
  )
  loop
    v_counter := v_counter + 1;
    v_candidate :=
      left(v_base, 44)
      || '-'
      || v_suffix
      || case when v_counter > 1 then '-' || v_counter::text else '' end;
  end loop;

  new.slug := v_candidate;
  new.public_slug := v_candidate;
  new.public_url :=
    'https://explore.digiylyfe.com/fiche.html?slug=' || v_candidate;

  new.photo_urls := case
    when nullif(btrim(coalesce(new.photo_url, '')), '') is not null
      then jsonb_build_array(new.photo_url)
    when jsonb_typeof(coalesce(new.photo_urls, '[]'::jsonb)) = 'array'
      then coalesce(new.photo_urls, '[]'::jsonb)
    else '[]'::jsonb
  end;

  new.tags := case
    when jsonb_typeof(coalesce(new.tags, '[]'::jsonb)) = 'array'
         and jsonb_array_length(coalesce(new.tags, '[]'::jsonb)) > 0
      then new.tags
    else jsonb_build_array(v_label, v_zone, 'Petite Côte')
  end;

  new.external_links := case
    when nullif(btrim(coalesce(new.website_url, '')), '') is not null
      then jsonb_build_array(
        jsonb_build_object('label', 'Site officiel', 'url', new.website_url)
      )
    when jsonb_typeof(coalesce(new.external_links, '[]'::jsonb)) = 'array'
      then coalesce(new.external_links, '[]'::jsonb)
    else '[]'::jsonb
  end;

  new.opening_hours := case
    when nullif(btrim(coalesce(new.hours, '')), '') is not null
      then jsonb_build_array(new.hours)
    when jsonb_typeof(coalesce(new.opening_hours, '[]'::jsonb)) = 'array'
      then coalesce(new.opening_hours, '[]'::jsonb)
    else '[]'::jsonb
  end;

  new.is_featured := coalesce(new.is_featured, false);
  new.is_published := coalesce(new.is_published, false);
  new.status := case when new.is_published then 'published' else 'draft' end;
  new.is_active := coalesce(new.is_active, true);
  new.updated_at := now();

  return new;
end;
$$;

drop trigger if exists trg_digiy_explore_prepare_public_identity
on public.digiy_explore_places;
drop trigger if exists trg_zz_digiy_explore_legacy_bridge
on public.digiy_explore_places;
drop trigger if exists trg_zzzz_digiy_explore_category_fk_bridge
on public.digiy_explore_places;
drop trigger if exists trg_digiy_explore_prepare_place_v4
on public.digiy_explore_places;

create trigger trg_digiy_explore_prepare_place_v4
before insert or update
on public.digiy_explore_places
for each row
execute function public.digiy_explore_prepare_place_v4();

create or replace function public.digiy_explore_save_place(
  p_owner_slug text,
  p_phone text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_owner_slug text := lower(btrim(coalesce(p_owner_slug, '')));
  v_phone text := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  v_name text;
  v_category text;
  v_zone text;
  v_public_slug text;
  v_photo_url text;
  v_website_url text;
  v_published boolean;
  v_category_code text;
  v_row public.digiy_explore_places%rowtype;
begin
  if length(v_phone) = 9 then
    v_phone := '221' || v_phone;
  end if;

  if v_owner_slug = '' or not public.digiy_explore_has_access(v_phone) then
    return jsonb_build_object('ok', false, 'reason', 'access_denied');
  end if;

  v_name := left(btrim(coalesce(v_payload->>'place_name', '')), 160);
  if v_name = '' then
    return jsonb_build_object('ok', false, 'reason', 'place_name_required');
  end if;

  v_category := left(coalesce(
    nullif(btrim(v_payload->>'category'), ''),
    'Autre découverte'
  ), 120);

  v_zone := left(coalesce(
    nullif(btrim(v_payload->>'zone'), ''),
    'Petite Côte'
  ), 160);

  v_public_slug := coalesce(
    public.digiy_explore_slugify(nullif(btrim(v_payload->>'public_slug'), '')),
    public.digiy_explore_slugify(v_name),
    'lieu'
  );

  v_photo_url := btrim(coalesce(v_payload->>'photo_url', ''));
  v_website_url := btrim(coalesce(v_payload->>'website_url', ''));
  v_published := lower(coalesce(v_payload->>'is_published', 'false'))
    in ('true','t','1','yes','on');

  if v_photo_url <> '' and v_photo_url !~* '^https://[^[:space:]]+$' then
    return jsonb_build_object('ok', false, 'reason', 'photo_url_invalid');
  end if;

  if v_website_url <> '' and v_website_url !~* '^https://[^[:space:]]+$' then
    return jsonb_build_object('ok', false, 'reason', 'website_url_invalid');
  end if;

  v_category_code := public.digiy_explore_resolve_category_code(
    v_category,
    v_payload->>'category_code'
  );

  insert into public.digiy_explore_places (
    owner_slug,
    owner_phone,
    slug,
    public_slug,
    public_url,
    public_name,
    place_name,
    category_code,
    category,
    city,
    zone,
    price_text,
    hours,
    whatsapp,
    address,
    photo_url,
    photo_urls,
    summary,
    website_url,
    tags,
    external_links,
    opening_hours,
    is_featured,
    is_published,
    status,
    is_active
  )
  values (
    v_owner_slug,
    v_phone,
    v_public_slug,
    v_public_slug,
    'https://explore.digiylyfe.com/fiche.html?slug=' || v_public_slug,
    v_name,
    v_name,
    v_category_code,
    v_category,
    v_zone,
    v_zone,
    left(btrim(coalesce(v_payload->>'price_text', '')), 120),
    left(btrim(coalesce(v_payload->>'hours', '')), 160),
    left(regexp_replace(coalesce(v_payload->>'whatsapp', v_phone), '[^0-9]', '', 'g'), 20),
    left(btrim(coalesce(v_payload->>'address', '')), 240),
    nullif(v_photo_url, ''),
    case when v_photo_url <> '' then jsonb_build_array(v_photo_url) else '[]'::jsonb end,
    left(btrim(coalesce(v_payload->>'summary', '')), 3000),
    nullif(v_website_url, ''),
    jsonb_build_array(v_category, v_zone, 'Petite Côte'),
    case
      when v_website_url <> '' then
        jsonb_build_array(jsonb_build_object('label', 'Site officiel', 'url', v_website_url))
      else '[]'::jsonb
    end,
    case
      when btrim(coalesce(v_payload->>'hours', '')) <> '' then
        jsonb_build_array(btrim(v_payload->>'hours'))
      else '[]'::jsonb
    end,
    false,
    v_published,
    case when v_published then 'published' else 'draft' end,
    true
  )
  on conflict (owner_slug)
  do update set
    owner_phone = excluded.owner_phone,
    slug = excluded.slug,
    public_slug = excluded.public_slug,
    public_url = excluded.public_url,
    public_name = excluded.public_name,
    place_name = excluded.place_name,
    category_code = excluded.category_code,
    category = excluded.category,
    city = excluded.city,
    zone = excluded.zone,
    price_text = excluded.price_text,
    hours = excluded.hours,
    whatsapp = excluded.whatsapp,
    address = excluded.address,
    photo_url = excluded.photo_url,
    photo_urls = excluded.photo_urls,
    summary = excluded.summary,
    website_url = excluded.website_url,
    tags = excluded.tags,
    external_links = excluded.external_links,
    opening_hours = excluded.opening_hours,
    is_published = excluded.is_published,
    status = excluded.status,
    is_active = true,
    updated_at = now()
  where public.digiy_explore_places.owner_phone = excluded.owner_phone
  returning * into v_row;

  if v_row.id is null then
    return jsonb_build_object('ok', false, 'reason', 'owner_mismatch');
  end if;

  return jsonb_build_object(
    'ok', true,
    'place', to_jsonb(v_row)
  );

exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'reason', 'public_slug_already_used');
  when foreign_key_violation then
    return jsonb_build_object('ok', false, 'reason', 'category_not_available');
  when not_null_violation then
    return jsonb_build_object('ok', false, 'reason', 'profile_data_incomplete');
end;
$$;

create or replace function public.digiy_explore_public_place_by_slug(
  p_slug text
)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (
      select jsonb_build_object(
        'ok', true,
        'place', jsonb_strip_nulls(
          jsonb_build_object(
            'slug', p.public_slug,
            'public_slug', p.public_slug,
            'public_url', p.public_url,
            'public_name', p.public_name,
            'name', p.public_name,
            'title', p.public_name,
            'category_label', p.category,
            'category_name', p.category,
            'category_code', p.category_code,
            'city', p.city,
            'zone', p.zone,
            'price_label', p.price_text,
            'hours', p.hours,
            'opening_hours', p.opening_hours,
            'whatsapp', p.whatsapp,
            'public_phone', p.whatsapp,
            'address', p.address,
            'address_text', p.address,
            'short_description', p.summary,
            'full_description', p.summary,
            'summary', p.summary,
            'description', p.summary,
            'photo_url', p.photo_url,
            'cover_url', p.photo_url,
            'photo_urls', p.photo_urls,
            'tags', p.tags,
            'website_url', p.website_url,
            'kind', p.category,
            'contact_url',
              case
                when coalesce(p.whatsapp, '') <> ''
                  then 'https://wa.me/' || p.whatsapp
                else null
              end,
            'external_links', p.external_links,
            'is_featured', p.is_featured,
            'is_published', p.is_published,
            'is_active', p.is_active
          )
        )
      )
      from public.digiy_explore_places p
      where lower(p.public_slug) =
            lower(public.digiy_explore_slugify(p_slug))
        and p.is_active is true
        and p.is_published is true
      limit 1
    ),
    jsonb_build_object('ok', false, 'reason', 'not_found')
  );
$$;

revoke all on function public.digiy_explore_resolve_category_code(text, text)
from public;
revoke all on function public.digiy_explore_save_place(text, text, jsonb)
from public;
revoke all on function public.digiy_explore_public_place_by_slug(text)
from public;

grant execute on function public.digiy_explore_save_place(text, text, jsonb)
to anon, authenticated;
grant execute on function public.digiy_explore_public_place_by_slug(text)
to anon, authenticated;

notify pgrst, 'reload schema';

commit;

-- Contrôles structurels neutres : aucune donnée personnelle, aucun abonné créé.
select
  to_regprocedure(
    'public.digiy_explore_resolve_category_code(text,text)'
  ) is not null as resolveur_categories_installe,
  to_regprocedure(
    'public.digiy_explore_save_place(text,text,jsonb)'
  ) is not null as sauvegarde_fiche_installee,
  to_regprocedure(
    'public.digiy_explore_public_place_by_slug(text)'
  ) is not null as lecture_publique_installee;

select
  exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.digiy_explore_places'::regclass
      and tgname = 'trg_digiy_explore_prepare_place_v4'
      and not tgisinternal
  ) as trigger_compatibilite_installe;

select
  count(*) as categories_disponibles
from public.digiy_explore_categories;
