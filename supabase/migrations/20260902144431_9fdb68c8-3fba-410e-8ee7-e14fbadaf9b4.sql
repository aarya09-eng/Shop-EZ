-- ShopEZ schema: roles, profiles, products, reviews, cart, orders

create type public.app_role as enum ('admin', 'user');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text not null default '',
  phone text not null default '',
  address text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile select" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "own roles select" on public.user_roles for select to authenticated using (auth.uid() = user_id);

-- First signed-in user may claim the admin role while no admin exists yet.
create or replace function public.bootstrap_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  if exists (select 1 from public.user_roles where role = 'admin') then
    return false;
  end if;
  insert into public.user_roles (user_id, role) values (uid, 'admin')
  on conflict do nothing;
  return true;
end;
$$;
grant execute on function public.bootstrap_admin() to authenticated;

-- profile auto-creation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'phone', '')
  )
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'user')
  on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  price numeric(10,2) not null default 0,
  discount integer not null default 0,
  category text not null default 'General',
  image_url text not null default '',
  stock integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.products to anon;
grant select on public.products to authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "products public read" on public.products for select to anon, authenticated using (true);
create policy "admins insert products" on public.products for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "admins update products" on public.products for update to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "admins delete products" on public.products for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  reviewer_name text not null default 'Customer',
  rating integer not null default 5,
  comment text not null default '',
  created_at timestamptz not null default now()
);
grant select on public.reviews to anon;
grant select, insert, delete on public.reviews to authenticated;
grant all on public.reviews to service_role;
alter table public.reviews enable row level security;
create policy "reviews public read" on public.reviews for select to anon, authenticated using (true);
create policy "own review insert" on public.reviews for insert to authenticated with check (auth.uid() = user_id);
create policy "own review delete" on public.reviews for delete to authenticated using (auth.uid() = user_id);

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null default 1,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);
grant select, insert, update, delete on public.cart_items to authenticated;
grant all on public.cart_items to service_role;
alter table public.cart_items enable row level security;
create policy "own cart all" on public.cart_items for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text not null default '',
  address_line text not null default '',
  city text not null default '',
  postal_code text not null default '',
  country text not null default '',
  payment_method text not null default 'COD',
  special_requirements text not null default '',
  order_status text not null default 'Pending',
  total_amount numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert on public.orders to authenticated;
grant update on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "own orders select" on public.orders for select to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));
create policy "own orders insert" on public.orders for insert to authenticated with check (auth.uid() = user_id);
create policy "admins update orders" on public.orders for update to authenticated using (public.has_role(auth.uid(), 'admin'));

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null default '',
  image_url text not null default '',
  quantity integer not null default 1,
  unit_price numeric(10,2) not null default 0
);
grant select, insert on public.order_items to authenticated;
grant all on public.order_items to service_role;
alter table public.order_items enable row level security;
create policy "own order items select" on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.has_role(auth.uid(), 'admin'))));
create policy "own order items insert" on public.order_items for insert to authenticated
  with check (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

-- Seed demo catalog
insert into public.products (id, name, description, price, discount, category, image_url, stock) values
('11111111-1111-4111-8111-000000000001','Aurora Wireless Headphones','Over-ear wireless headphones with active noise cancellation, 40-hour battery life and plush memory-foam earcups.',199.00,15,'Electronics','https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',24),
('11111111-1111-4111-8111-000000000002','Nimbus Smart Watch','A lightweight fitness smartwatch with heart-rate tracking, GPS and a bright always-on AMOLED display.',149.50,10,'Electronics','https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80',40),
('11111111-1111-4111-8111-000000000003','Everyday Canvas Backpack','Water-resistant 22L canvas backpack with padded laptop sleeve and hidden anti-theft pocket.',79.00,0,'Bags','https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80',60),
('11111111-1111-4111-8111-000000000004','Terra Ceramic Mug Set','Set of four hand-glazed stoneware mugs, dishwasher and microwave safe, 350ml each.',34.00,20,'Home','https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800&q=80',85),
('11111111-1111-4111-8111-000000000005','Linen Weave Throw Blanket','Breathable stonewashed linen-cotton throw, 130x170cm, perfect for sofa or bed.',59.00,5,'Home','https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&q=80',35),
('11111111-1111-4111-8111-000000000006','Trailhead Running Shoes','Cushioned trail runners with grippy rubber outsole and breathable knit upper.',119.00,25,'Footwear','https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80',48),
('11111111-1111-4111-8111-000000000007','Studio Mechanical Keyboard','Hot-swappable 75% mechanical keyboard with tactile switches and per-key backlighting.',129.00,10,'Electronics','https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&q=80',30),
('11111111-1111-4111-8111-000000000008','Cold Brew Coffee Maker','1.5L borosilicate cold brew carafe with reusable stainless steel filter.',44.00,0,'Kitchen','https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80',52),
('11111111-1111-4111-8111-000000000009','Meridian Sunglasses','Polarised UV400 lenses in a lightweight acetate frame with spring hinges.',89.00,30,'Accessories','https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&q=80',70),
('11111111-1111-4111-8111-000000000010','Fold-Flat Desk Lamp','Aluminium LED desk lamp with three colour temperatures and USB-C charging port.',69.00,10,'Home','https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&q=80',44),
('11111111-1111-4111-8111-000000000011','Leather Card Wallet','Full-grain vegetable-tanned leather wallet holding six cards plus folded notes.',49.00,0,'Accessories','https://images.unsplash.com/photo-1627123424574-724758594e93?w=800&q=80',90),
('11111111-1111-4111-8111-000000000012','Peak Insulated Bottle','750ml double-wall vacuum bottle keeping drinks cold 24h or hot 12h.',32.00,15,'Kitchen','https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&q=80',120);

insert into public.reviews (product_id, reviewer_name, rating, comment) values
('11111111-1111-4111-8111-000000000001','Priya S.',5,'The noise cancellation is genuinely excellent on flights.'),
('11111111-1111-4111-8111-000000000001','Marco D.',4,'Great sound, slightly tight fit for the first week.'),
('11111111-1111-4111-8111-000000000002','Leah K.',5,'Battery easily lasts five days with GPS workouts.'),
('11111111-1111-4111-8111-000000000003','Tom R.',4,'Survived a rainy commute all winter. Laptop pocket is well padded.'),
('11111111-1111-4111-8111-000000000004','Anita M.',5,'Beautiful glaze, feels handmade because it is.'),
('11111111-1111-4111-8111-000000000006','Devon W.',4,'Fantastic grip on wet rock, sizing runs half a size small.'),
('11111111-1111-4111-8111-000000000007','Sam P.',5,'Typing feel is superb and swapping switches took minutes.'),
('11111111-1111-4111-8111-000000000009','Ruth A.',5,'Lightweight enough to forget I am wearing them.'),
('11111111-1111-4111-8111-000000000012','Ken O.',4,'Ice still rattling around the next morning.');