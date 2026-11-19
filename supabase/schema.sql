-- ═══════════════════════════════════════════════════════════════
-- CLORIVO — Supabase Schema  (idempotent — safe to re-run)
-- Run this in your Supabase project → SQL Editor
-- ═══════════════════════════════════════════════════════════════

create extension if not exists "uuid-ossp";

-- ─── HELPER: auto-update updated_at ─────────────────────────────
create or replace function handle_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

-- ─── PROFILES ────────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  avatar_url  text,
  phone       text,
  role        text not null default 'buyer' check (role in ('buyer','seller','admin')),
  shop_id     uuid,
  address     jsonb default '{}',
  push_token  text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
alter table public.profiles add column if not exists push_token text;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function handle_updated_at();

create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ─── CATEGORIES ──────────────────────────────────────────────────
create table if not exists public.categories (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  slug        text unique not null,
  icon        text,
  parent_id   uuid references public.categories(id),
  position    int default 0,
  created_at  timestamptz default now()
);

-- ─── SHOPS ───────────────────────────────────────────────────────
create table if not exists public.shops (
  id            uuid primary key default uuid_generate_v4(),
  seller_id     uuid not null references public.profiles(id) on delete cascade,
  name          text not null,
  slug          text unique,
  description   text,
  logo_url      text,
  cover_url     text,
  brand_color   text default '#6C4DFF',
  promo_text    text,
  is_verified   boolean default false,
  is_active     boolean default true,
  followers     int default 0,
  rating        numeric(3,2) default 0,
  reviews_count int default 0,
  total_sales   int default 0,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

drop trigger if exists shops_updated_at on public.shops;
create trigger shops_updated_at before update on public.shops
  for each row execute function handle_updated_at();

-- ─── SHOP BANNERS ────────────────────────────────────────────────
create table if not exists public.shop_banners (
  id          uuid primary key default uuid_generate_v4(),
  shop_id     uuid not null references public.shops(id) on delete cascade,
  image_url   text,
  title       text,
  subtitle    text,
  cta_text    text,
  cta_url     text,
  position    int default 0,
  is_active   boolean default true,
  created_at  timestamptz default now()
);

-- ─── PRODUCTS ────────────────────────────────────────────────────
create table if not exists public.products (
  id            uuid primary key default uuid_generate_v4(),
  shop_id       uuid not null references public.shops(id) on delete cascade,
  seller_id     uuid references public.profiles(id),
  category_id   uuid references public.categories(id),
  category      text,
  title         text not null,
  description   text,
  price         numeric(10,2) not null,
  compare_price numeric(10,2),
  images        text[] default '{}',
  variants      jsonb default '[]',
  stock         int default 0,
  sku           text,
  status        text default 'active' check (status in ('active','draft','archived')),
  tags          text[] default '{}',
  sold_count    int default 0,
  rating        numeric(3,2) default 0,
  reviews_count int default 0,
  is_featured   boolean default false,
  source        text default 'manual' check (source in ('manual','cj')),
  cj_product_id text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
alter table public.products add column if not exists seller_id uuid references public.profiles(id);
alter table public.products add column if not exists category   text;

drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at before update on public.products
  for each row execute function handle_updated_at();

create index if not exists products_shop_id_idx     on public.products(shop_id);
create index if not exists products_category_id_idx on public.products(category_id);
create index if not exists products_status_idx      on public.products(status);
create index if not exists products_seller_id_idx   on public.products(seller_id);

-- ─── CARTS ───────────────────────────────────────────────────────
create table if not exists public.carts (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique(user_id)
);

drop trigger if exists carts_updated_at on public.carts;
create trigger carts_updated_at before update on public.carts
  for each row execute function handle_updated_at();

create table if not exists public.cart_items (
  id          uuid primary key default uuid_generate_v4(),
  cart_id     uuid not null references public.carts(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete cascade,
  variant     jsonb default '{}',
  quantity    int not null default 1 check (quantity > 0),
  unit_price  numeric(10,2) not null,
  created_at  timestamptz default now(),
  unique(cart_id, product_id, variant)
);
-- backward compat: rename price → unit_price if old column exists
do $$ begin
  if exists (select 1 from information_schema.columns where table_name='cart_items' and column_name='price' and table_schema='public') then
    alter table public.cart_items rename column price to unit_price;
  end if;
exception when others then null; end $$;
alter table public.cart_items add column if not exists unit_price numeric(10,2);

-- ─── ORDERS ──────────────────────────────────────────────────────
create table if not exists public.orders (
  id               uuid primary key default uuid_generate_v4(),
  buyer_id         uuid not null references public.profiles(id),
  status           text not null default 'pending'
                     check (status in ('pending','confirmed','processing','shipped','delivered','cancelled','refunded')),
  subtotal         numeric(10,2) not null default 0,
  discount         numeric(10,2) default 0,
  shipping_fee     numeric(10,2) default 0,
  total_amount     numeric(10,2) not null default 0,
  promo_code       text,
  shipping_address jsonb not null default '{}',
  shipping_method  text default 'standard',
  payment_method   text,
  payment_status   text default 'pending' check (payment_status in ('pending','paid','failed','refunded')),
  tracking_number  text,
  notes            text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
-- backward compat: add total_amount if only old total column exists
do $$ begin
  if exists (select 1 from information_schema.columns where table_name='orders' and column_name='total' and table_schema='public')
  and not exists (select 1 from information_schema.columns where table_name='orders' and column_name='total_amount' and table_schema='public') then
    alter table public.orders rename column total to total_amount;
  end if;
exception when others then null; end $$;
alter table public.orders add column if not exists total_amount numeric(10,2) not null default 0;
alter table public.orders add column if not exists subtotal     numeric(10,2) not null default 0;

drop trigger if exists orders_updated_at on public.orders;
create trigger orders_updated_at before update on public.orders
  for each row execute function handle_updated_at();

create index if not exists orders_buyer_id_idx on public.orders(buyer_id);
create index if not exists orders_status_idx   on public.orders(status);

create table if not exists public.order_items (
  id          uuid primary key default uuid_generate_v4(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  product_id  uuid references public.products(id),
  shop_id     uuid references public.shops(id),
  seller_id   uuid references public.profiles(id),
  title       text not null,
  image_url   text,
  variant     jsonb default '{}',
  quantity    int not null,
  unit_price  numeric(10,2) not null default 0,
  created_at  timestamptz default now()
);
alter table public.order_items add column if not exists seller_id  uuid references public.profiles(id);
alter table public.order_items add column if not exists unit_price numeric(10,2) not null default 0;
-- backward compat: if old column was named price, rename it
do $$ begin
  if exists (select 1 from information_schema.columns where table_name='order_items' and column_name='price' and table_schema='public')
  and not exists (select 1 from information_schema.columns where table_name='order_items' and column_name='unit_price' and table_schema='public') then
    alter table public.order_items rename column price to unit_price;
  end if;
exception when others then null; end $$;

create index if not exists order_items_seller_id_idx on public.order_items(seller_id);

-- ─── CONVERSATIONS & MESSAGES ─────────────────────────────────────
create table if not exists public.conversations (
  id              uuid primary key default uuid_generate_v4(),
  buyer_id        uuid not null references public.profiles(id),
  seller_id       uuid not null references public.profiles(id),
  shop_id         uuid references public.shops(id),
  product_id      uuid references public.products(id),
  last_message    text,
  last_message_at timestamptz default now(),
  buyer_unread    int default 0,
  seller_unread   int default 0,
  created_at      timestamptz default now(),
  unique(buyer_id, seller_id, product_id)
);

create index if not exists conversations_buyer_id_idx  on public.conversations(buyer_id);
create index if not exists conversations_seller_id_idx on public.conversations(seller_id);

create table if not exists public.messages (
  id              uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id),
  content         text not null,
  attachment_url  text,
  read_at         timestamptz,
  created_at      timestamptz default now()
);

create index if not exists messages_conversation_id_idx on public.messages(conversation_id);

create or replace function update_conversation_on_message()
returns trigger language plpgsql as $$
begin
  update public.conversations
  set last_message    = new.content,
      last_message_at = new.created_at,
      buyer_unread    = case
        when (select buyer_id from public.conversations where id = new.conversation_id) != new.sender_id
        then buyer_unread + 1 else buyer_unread end,
      seller_unread   = case
        when (select seller_id from public.conversations where id = new.conversation_id) != new.sender_id
        then seller_unread + 1 else seller_unread end
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists on_message_created on public.messages;
create trigger on_message_created
  after insert on public.messages
  for each row execute function update_conversation_on_message();

-- ─── NOTIFICATIONS ───────────────────────────────────────────────
create table if not exists public.notifications (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  type        text not null,
  title       text not null,
  body        text,
  data        jsonb default '{}',
  read_at     timestamptz,
  created_at  timestamptz default now()
);

create index if not exists notifications_user_id_idx on public.notifications(user_id);

-- ─── KYC REQUESTS ────────────────────────────────────────────────
create table if not exists public.kyc_requests (
  id            uuid primary key default uuid_generate_v4(),
  seller_id     uuid not null references public.profiles(id) on delete cascade,
  shop_name     text,
  doc_front_url text,
  doc_back_url  text,
  selfie_url    text,
  status        text default 'pending' check (status in ('pending','approved','rejected')),
  review_notes  text,
  reviewed_by   uuid references public.profiles(id),
  reviewed_at   timestamptz,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

drop trigger if exists kyc_updated_at on public.kyc_requests;
create trigger kyc_updated_at before update on public.kyc_requests
  for each row execute function handle_updated_at();

-- ─── BANNERS (Admin CMS) ──────────────────────────────────────────
create table if not exists public.banners (
  id          uuid primary key default uuid_generate_v4(),
  title       text not null,
  subtitle    text,
  image_url   text,
  cta_text    text,
  cta_url     text,
  bg_color    text default '#6C4DFF',
  position    int default 0,
  is_active   boolean default true,
  starts_at   timestamptz,
  ends_at     timestamptz,
  created_by  uuid references public.profiles(id),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

drop trigger if exists banners_updated_at on public.banners;
create trigger banners_updated_at before update on public.banners
  for each row execute function handle_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════

alter table public.profiles      enable row level security;
alter table public.categories     enable row level security;
alter table public.shops          enable row level security;
alter table public.shop_banners   enable row level security;
alter table public.products       enable row level security;
alter table public.carts          enable row level security;
alter table public.cart_items     enable row level security;
alter table public.orders         enable row level security;
alter table public.order_items    enable row level security;
alter table public.conversations  enable row level security;
alter table public.messages       enable row level security;
alter table public.notifications  enable row level security;
alter table public.kyc_requests   enable row level security;
alter table public.banners        enable row level security;

-- Helper: create policy only if it doesn't exist yet
create or replace function _create_policy_if_not_exists(
  p_name text, p_table text, p_cmd text, p_using text, p_check text default null
) returns void language plpgsql as $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = p_table and policyname = p_name
  ) then
    execute format(
      'create policy %I on public.%I %s %s %s',
      p_name, p_table,
      case when p_cmd = 'all' then 'for all' else 'for ' || p_cmd end,
      case when p_using is not null then 'using (' || p_using || ')' else '' end,
      case when p_check is not null then 'with check (' || p_check || ')' else '' end
    );
  end if;
end;
$$;

-- profiles
select _create_policy_if_not_exists('Profiles are publicly readable','profiles','select','true');
select _create_policy_if_not_exists('Users can update own profile','profiles','update','auth.uid() = id');

-- categories
select _create_policy_if_not_exists('Categories are public','categories','select','true');
select _create_policy_if_not_exists('Admins can manage categories','categories','all',
  '(select role from public.profiles where id = auth.uid()) = ''admin''');

-- shops
select _create_policy_if_not_exists('Shops are publicly readable','shops','select','is_active = true');
select _create_policy_if_not_exists('Sellers can manage their shop','shops','all','seller_id = auth.uid()');
select _create_policy_if_not_exists('Admins can manage all shops','shops','all',
  '(select role from public.profiles where id = auth.uid()) = ''admin''');

-- shop_banners
select _create_policy_if_not_exists('Shop banners are public','shop_banners','select','is_active = true');
select _create_policy_if_not_exists('Sellers can manage their banners','shop_banners','all',
  'shop_id in (select id from public.shops where seller_id = auth.uid())');

-- products
select _create_policy_if_not_exists('Active products are public','products','select','status = ''active''');
select _create_policy_if_not_exists('Sellers can manage their products','products','all',
  'shop_id in (select id from public.shops where seller_id = auth.uid())');
select _create_policy_if_not_exists('Sellers can manage own products by seller_id','products','all',
  'seller_id = auth.uid()');
select _create_policy_if_not_exists('Admins can manage all products','products','all',
  '(select role from public.profiles where id = auth.uid()) = ''admin''');

-- carts
select _create_policy_if_not_exists('Users can manage their cart','carts','all','user_id = auth.uid()');
select _create_policy_if_not_exists('Users can manage their cart items','cart_items','all',
  'cart_id in (select id from public.carts where user_id = auth.uid())');

-- orders
select _create_policy_if_not_exists('Buyers see their orders','orders','select','buyer_id = auth.uid()');
select _create_policy_if_not_exists('Buyers can create orders','orders','insert',null,'buyer_id = auth.uid()');
select _create_policy_if_not_exists('Sellers can update order status','orders','update',
  'id in (select order_id from public.order_items where seller_id = auth.uid())');
select _create_policy_if_not_exists('Admins see all orders','orders','all',
  '(select role from public.profiles where id = auth.uid()) = ''admin''');
select _create_policy_if_not_exists('Sellers see orders for their items','order_items','select',
  'seller_id = auth.uid()');
select _create_policy_if_not_exists('Sellers see orders for their shop','order_items','select',
  'shop_id in (select id from public.shops where seller_id = auth.uid())');
select _create_policy_if_not_exists('Buyers see their order items','order_items','select',
  'order_id in (select id from public.orders where buyer_id = auth.uid())');
select _create_policy_if_not_exists('Orders can be inserted with items','order_items','insert',null,
  'order_id in (select id from public.orders where buyer_id = auth.uid())');

-- conversations
select _create_policy_if_not_exists('Participants can see conversations','conversations','select',
  'buyer_id = auth.uid() or seller_id = auth.uid()');
select _create_policy_if_not_exists('Users can create conversations','conversations','insert',
  null,'buyer_id = auth.uid()');
select _create_policy_if_not_exists('Participants can update conversations','conversations','update',
  'buyer_id = auth.uid() or seller_id = auth.uid()');

-- messages
select _create_policy_if_not_exists('Participants can see messages','messages','select',
  'conversation_id in (select id from public.conversations where buyer_id = auth.uid() or seller_id = auth.uid())');
select _create_policy_if_not_exists('Participants can send messages','messages','insert',null,
  'sender_id = auth.uid() and conversation_id in (select id from public.conversations where buyer_id = auth.uid() or seller_id = auth.uid())');

-- notifications
select _create_policy_if_not_exists('Users see their notifications','notifications','select','user_id = auth.uid()');
select _create_policy_if_not_exists('Users can update their notifications','notifications','update','user_id = auth.uid()');
-- PHASE 6 SECURITY FIX: no client-facing INSERT policy on notifications.
-- All inserts go through admin_send_broadcast()/admin_send_notification()
-- (SECURITY DEFINER, permission-checked) or the service-role client inside
-- send-notification (internal-secret-gated). An unrestricted INSERT policy
-- ('Service role can insert notifications', using WITH CHECK (true) and no
-- TO clause) used to live here and applied to PUBLIC, including anon — see
-- phase6_notifications_security_migration.sql. Do not recreate it: this
-- schema file is documented as safe to re-run, and _create_policy_if_not_exists
-- would silently restore the open policy on any database where it had been
-- dropped. If a policy by this exact name still exists on a database being
-- brought up to date, drop it explicitly:
drop policy if exists "Service role can insert notifications" on public.notifications;

-- kyc_requests
select _create_policy_if_not_exists('Sellers see their KYC','kyc_requests','select','seller_id = auth.uid()');
select _create_policy_if_not_exists('Sellers can submit KYC','kyc_requests','insert',null,'seller_id = auth.uid()');
select _create_policy_if_not_exists('Admins can manage all KYC','kyc_requests','all',
  '(select role from public.profiles where id = auth.uid()) = ''admin''');

-- banners
select _create_policy_if_not_exists('Active banners are public','banners','select','is_active = true');
select _create_policy_if_not_exists('Admins manage banners','banners','all',
  '(select role from public.profiles where id = auth.uid()) = ''admin''');

-- ─── Storage buckets ──────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values
  ('products',       'products',       true),
  ('shop-assets',    'shop-assets',    true),
  ('kyc-documents',  'kyc-documents',  false),
  ('avatars',        'avatars',        true),
  ('banners',        'banners',        true),
  ('categories',     'categories',     true)
on conflict (id) do nothing;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Products bucket public read' and tablename = 'objects') then
    create policy "Products bucket public read" on storage.objects for select using (bucket_id = 'products');
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Authenticated users upload products' and tablename = 'objects') then
    create policy "Authenticated users upload products" on storage.objects for insert
      with check (bucket_id = 'products' and auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Authenticated users update products' and tablename = 'objects') then
    create policy "Authenticated users update products" on storage.objects for update
      using (bucket_id = 'products' and auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Shop assets are public' and tablename = 'objects') then
    create policy "Shop assets are public" on storage.objects for select using (bucket_id = 'shop-assets');
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Sellers can upload shop assets' and tablename = 'objects') then
    create policy "Sellers can upload shop assets" on storage.objects for insert
      with check (bucket_id = 'shop-assets' and auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Avatars are public' and tablename = 'objects') then
    create policy "Avatars are public" on storage.objects for select using (bucket_id = 'avatars');
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Users can upload avatar' and tablename = 'objects') then
    create policy "Users can upload avatar" on storage.objects for insert
      with check (bucket_id = 'avatars' and auth.role() = 'authenticated');
  end if;
  -- Banners bucket (admin only write, public read)
  if not exists (select 1 from pg_policies where policyname = 'Banners are public' and tablename = 'objects') then
    create policy "Banners are public" on storage.objects for select using (bucket_id = 'banners');
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Admins can upload banners' and tablename = 'objects') then
    create policy "Admins can upload banners" on storage.objects for insert
      with check (bucket_id = 'banners' and auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Admins can delete banners' and tablename = 'objects') then
    create policy "Admins can delete banners" on storage.objects for delete
      using (bucket_id = 'banners' and auth.role() = 'authenticated');
  end if;
  -- Categories bucket (public read, authenticated write)
  if not exists (select 1 from pg_policies where policyname = 'Categories images are public' and tablename = 'objects') then
    create policy "Categories images are public" on storage.objects for select using (bucket_id = 'categories');
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Admins can upload category images' and tablename = 'objects') then
    create policy "Admins can upload category images" on storage.objects for insert
      with check (bucket_id = 'categories' and auth.role() = 'authenticated');
  end if;
end $$;

-- ─── PRODUCT VIDEOS ─────────────────────────────────────────────
create table if not exists public.product_videos (
  id            uuid primary key default uuid_generate_v4(),
  seller_id     uuid references auth.users(id) on delete cascade,
  product_id    uuid references public.products(id) on delete set null,
  shop_id       uuid references public.shops(id) on delete set null,
  video_url     text not null,
  thumbnail_url text,
  caption       text,
  views         integer default 0,
  is_active     boolean default true,
  created_at    timestamptz default now()
);

alter table public.product_videos enable row level security;

-- Public can view active videos
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Videos public read' and tablename = 'product_videos') then
    create policy "Videos public read" on public.product_videos for select using (is_active = true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Seller manage own videos' and tablename = 'product_videos') then
    create policy "Seller manage own videos" on public.product_videos for all using (auth.uid() = seller_id);
  end if;
end $$;

-- Storage bucket for videos
insert into storage.buckets (id, name, public)
  values ('videos', 'videos', true)
on conflict (id) do nothing;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Videos bucket public read' and tablename = 'objects') then
    create policy "Videos bucket public read" on storage.objects for select using (bucket_id = 'videos');
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Authenticated users upload videos' and tablename = 'objects') then
    create policy "Authenticated users upload videos" on storage.objects for insert
      with check (bucket_id = 'videos' and auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Authenticated users delete videos' and tablename = 'objects') then
    create policy "Authenticated users delete videos" on storage.objects for delete
      using (bucket_id = 'videos' and auth.role() = 'authenticated');
  end if;
end $$;
