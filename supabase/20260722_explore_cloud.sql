begin;

-- DIGIY EXPLORE — profils publics et QR individuels
-- Cette migration ne modifie ni les PIN, ni digiy_verify_pin, ni les sessions existantes.

create schema if not exists extensions;
create extension if not exists unaccent with schema extensions;

create table if not exists public.digiy_explore_places (
  id uuid primary key default gen_random_uuid(),
  owner_slug text not null,
  owner_phone text not null,
  place_name text,
  category text,
  zone text,
  price_text text,
  hours text,
  whatsapp text,
  address text,
  public_slug text,
  public_url text,
  photo_url text,
  summary text,
  website_url text,
  is_published boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.digiy_explore_places
  add column if not exists owner_slug text,
  add column if not exists owner_phone text,
  add column if not exists place_name text,
  add column if not exists category text,
  add column if not exists zone text,
  add column if not exists price_text text,
  add column if not exists hours text,
  add column if not exists whatsapp text,
  add column if not exists address text,
  add column if not exists public_slug text,
  add column if not exists public_url text,
  add column if not exists photo_url text,
  add column if not exists summary text,
  add column if not exists website_url text,
  add column if not exists is_published boolean not null default false,
  add column if not exists is_active boolean not null default true,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists digiy_explore_places_owner_slug_uq
  on public.digiy_explore_places (owner_slug);

create unique index if not exists digiy_explore_places_public_slug_uq
  on public.digiy_explore_places (public_slug)
  where public_slug is not null and btrim(public_slug) <> '';

-- Paramètre volontairement anonyme : compatible avec toute ancienne version
-- quel que soit le nom historique du paramètre.
create or replace function public.digiy_explore_slugify(text)
returns text
language sql
immutable
set search_path = public, extensions, pg_temp
as $$
  select nullif(
    trim(
      both '-'
      from regexp_replace(
        regexp_replace(
          lower(unaccent(coalesce($1, ''))),
          '[^a-z0-9]+',
          '-',
          'g'
        ),
        '-+',
        '-',
        'g'
      )
    ),
    ''
  );
$$;

create or replace function public.digiy_explore_json_is_true(p_value jsonb)
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $$
  select case
    when p_value is null then false
    when p_value = 'true'::jsonb then true
    when p_value = '1'::jsonb then true
    when jsonb_typeof(p_value) = 'string'
      then lower(trim(both '"' from p_value::text)) in ('true','t','1','yes','ok')
    when jsonb_typeof(p_value) = 'object'
      then lower(coalesce(
        p_value->>'ok',
        p_value->>'access',
        p_value->>'access_ok',
        p_value->>'has_access',
        p_value->>'allowed',
        p_value->>'active',
        p_value->>'is_active',
        p_value->>'subscribed',
        p_value->>'valid',
        ''
      )) in ('true','t','1','yes','ok')
    else false
  end;
$$;

create or replace function public.digiy_explore_has_access(p_phone text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_phone text := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  v_result jsonb;
begin
  if length(v_phone) = 9 then
    v_phone := '221' || v_phone;
  end if;

  if length(v_phone) < 9 then
    return false;
  end if;

  begin
    execute 'select to_jsonb(public.digiy_has_module_access_from_abos($1,$2))'
      into v_result
      using v_phone, 'EXPLORE_BOOST';

    if public.digiy_explore_json_is_true(v_result) then
      return true;
    end if;
  exception when others then
    null;
  end;

  begin
    execute 'select to_jsonb(public.digiy_has_access($1,$2))'
      into v_result
      using v_phone, 'EXPLORE';

    if public.digiy_explore_json_is_true(v_result) then
      return true;
    end if;
  exception when others then
    null;
  end;

  return false;
end;
$$;

create or replace function public.digiy_explore_prepare_public_identity()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
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

  v_base := coalesce(
    public.digiy_explore_slugify(nullif(btrim(new.public_slug), '')),
    public.digiy_explore_slugify(nullif(btrim(new.place_name), '')),
    'lieu'
  );

  v_candidate := left(v_base, 58);
  v_suffix := left(replace(coalesce(new.id::text, md5(clock_timestamp()::text)), '-', ''), 8);

  while exists (
    select 1
    from public.digiy_explore_places p
    where lower(p.public_slug) = lower(v_candidate)
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

  new.public_slug := v_candidate;
  new.public_url :=
    'https://explore.digiylyfe.com/fiche.html?slug='
    || v_candidate;
  new.updated_at := now();

  return new;
end;
$$;

drop trigger if exists trg_digiy_explore_prepare_public_identity
on public.digiy_explore_places;

create trigger trg_digiy_explore_prepare_public_identity
before insert or update
on public.digiy_explore_places
for each row
execute function public.digiy_explore_prepare_public_identity();

create or replace function public.digiy_explore_get_place_by_owner(
  p_owner_slug text,
  p_phone text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_owner_slug text := lower(btrim(coalesce(p_owner_slug, '')));
  v_phone text := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  v_place jsonb;
begin
  if length(v_phone) = 9 then
    v_phone := '221' || v_phone;
  end if;

  if v_owner_slug = '' or not public.digiy_explore_has_access(v_phone) then
    return jsonb_build_object('ok', false, 'reason', 'access_denied');
  end if;

  select to_jsonb(p)
  into v_place
  from public.digiy_explore_places p
  where lower(p.owner_slug) = v_owner_slug
    and p.owner_phone = v_phone
  limit 1;

  return jsonb_build_object(
    'ok', true,
    'place', v_place
  );
end;
$$;

create or replace function public.digiy_explore_save_place(
  p_owner_slug text,
  p_phone text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_owner_slug text := lower(btrim(coalesce(p_owner_slug, '')));
  v_phone text := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  v_row public.digiy_explore_places%rowtype;
  v_public_slug text := public.digiy_explore_slugify(p_payload->>'public_slug');
  v_photo_url text := btrim(coalesce(p_payload->>'photo_url', ''));
  v_website_url text := btrim(coalesce(p_payload->>'website_url', ''));
  v_published boolean := lower(coalesce(p_payload->>'is_published', 'false'))
    in ('true','t','1','yes','on');
begin
  if length(v_phone) = 9 then
    v_phone := '221' || v_phone;
  end if;

  if v_owner_slug = '' or not public.digiy_explore_has_access(v_phone) then
    return jsonb_build_object('ok', false, 'reason', 'access_denied');
  end if;

  if btrim(coalesce(p_payload->>'place_name', '')) = '' then
    return jsonb_build_object('ok', false, 'reason', 'place_name_required');
  end if;

  if v_photo_url <> '' and v_photo_url !~* '^https://[^[:space:]]+$' then
    return jsonb_build_object('ok', false, 'reason', 'photo_url_invalid');
  end if;

  if v_website_url <> '' and v_website_url !~* '^https://[^[:space:]]+$' then
    return jsonb_build_object('ok', false, 'reason', 'website_url_invalid');
  end if;

  insert into public.digiy_explore_places (
    owner_slug,
    owner_phone,
    place_name,
    category,
    zone,
    price_text,
    hours,
    whatsapp,
    address,
    public_slug,
    photo_url,
    summary,
    website_url,
    is_published,
    is_active
  )
  values (
    v_owner_slug,
    v_phone,
    left(btrim(coalesce(p_payload->>'place_name', '')), 160),
    left(btrim(coalesce(p_payload->>'category', '')), 120),
    left(btrim(coalesce(p_payload->>'zone', '')), 160),
    left(btrim(coalesce(p_payload->>'price_text', '')), 120),
    left(btrim(coalesce(p_payload->>'hours', '')), 160),
    left(regexp_replace(coalesce(p_payload->>'whatsapp', ''), '[^0-9]', '', 'g'), 20),
    left(btrim(coalesce(p_payload->>'address', '')), 240),
    v_public_slug,
    nullif(v_photo_url, ''),
    left(btrim(coalesce(p_payload->>'summary', '')), 3000),
    nullif(v_website_url, ''),
    v_published,
    true
  )
  on conflict (owner_slug)
  do update set
    place_name = excluded.place_name,
    category = excluded.category,
    zone = excluded.zone,
    price_text = excluded.price_text,
    hours = excluded.hours,
    whatsapp = excluded.whatsapp,
    address = excluded.address,
    public_slug = coalesce(nullif(excluded.public_slug, ''), public.digiy_explore_places.public_slug),
    photo_url = excluded.photo_url,
    summary = excluded.summary,
    website_url = excluded.website_url,
    is_published = excluded.is_published,
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
            'public_name', p.place_name,
            'name', p.place_name,
            'title', p.place_name,
            'category_label', p.category,
            'category_name', p.category,
            'category_code', p.category,
            'city', p.zone,
            'zone', p.zone,
            'price_label', p.price_text,
            'hours', p.hours,
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
            'website_url', p.website_url,
            'kind', p.category,
            'contact_url',
              case
                when coalesce(p.whatsapp, '') <> ''
                  then 'https://wa.me/' || p.whatsapp
                else null
              end,
            'external_links',
              case
                when coalesce(p.website_url, '') <> ''
                  then jsonb_build_array(
                    jsonb_build_object(
                      'label', 'Site officiel',
                      'url', p.website_url
                    )
                  )
                else '[]'::jsonb
              end,
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
    jsonb_build_object(
      'ok', false,
      'reason', 'place_not_found'
    )
  );
$$;

alter table public.digiy_explore_places enable row level security;

revoke all on table public.digiy_explore_places from anon, authenticated;
revoke all on function public.digiy_explore_get_place_by_owner(text,text) from public;
revoke all on function public.digiy_explore_save_place(text,text,jsonb) from public;
revoke all on function public.digiy_explore_public_place_by_slug(text) from public;

grant execute on function public.digiy_explore_get_place_by_owner(text,text)
  to anon, authenticated;
grant execute on function public.digiy_explore_save_place(text,text,jsonb)
  to anon, authenticated;
grant execute on function public.digiy_explore_public_place_by_slug(text)
  to anon, authenticated;

notify pgrst, 'reload schema';

commit;

-- Contrôle après exécution
select
  owner_slug,
  place_name,
  public_slug,
  public_url,
  is_published,
  is_active
from public.digiy_explore_places
order by created_at asc;
