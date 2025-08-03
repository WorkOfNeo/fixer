-- 2-BIZ Stock Checker - Initial Database Schema
-- Multi-tenant architecture with Row Level Security (RLS)

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- Tenants table - Each organization/company
create table public.tenants (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  slug text unique not null,
  settings jsonb default '{}',
  spy_credentials jsonb default '{}', -- Encrypted SPY system credentials
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Profiles table - User accounts linked to tenants
create table public.profiles (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  tenant_id uuid references public.tenants,
  full_name text,
  role text default 'user' check (role in ('owner', 'admin', 'user')),
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id)
);

-- Customers table - SPY system customers per tenant
create table public.customers (
  id uuid default uuid_generate_v4() primary key,
  tenant_id uuid references public.tenants not null,
  spy_customer_id text not null, -- Customer ID from SPY system
  name text not null,
  edit_url text not null, -- Direct link to customer edit page in SPY
  email text,
  phone text,
  address jsonb,
  country text,
  status text default 'active' check (status in ('active', 'inactive')),
  metadata jsonb default '{}',
  last_sync timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(tenant_id, spy_customer_id) -- Prevent duplicate customers per tenant
);

-- Sales orders table - Order tracking per tenant
create table public.sales_orders (
  id uuid default uuid_generate_v4() primary key,
  tenant_id uuid references public.tenants not null,
  customer_id uuid references public.customers not null,
  order_number text not null,
  items jsonb not null, -- Array of order items
  total_pieces integer not null,
  status text default 'pending',
  spy_order_data jsonb, -- Data from SPY system
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(tenant_id, order_number) -- Prevent duplicate order numbers per tenant
);

-- Customer sync logs for monitoring
create table public.customer_sync_logs (
  id uuid default uuid_generate_v4() primary key,
  tenant_id uuid references public.tenants not null,
  customers_found integer not null default 0,
  customers_saved integer not null default 0,
  duration_ms integer not null default 0,
  errors text[],
  success boolean not null default false,
  sync_type text not null default 'manual', -- 'manual', 'scheduled', 'auto'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create indexes for performance
create index customers_tenant_id_idx on public.customers(tenant_id);
create index customers_name_idx on public.customers using gin(name gin_trgm_ops);
create index customers_spy_id_idx on public.customers(spy_customer_id);
create index customers_last_sync_idx on public.customers(last_sync);
create index sales_orders_tenant_id_idx on public.sales_orders(tenant_id);
create index sales_orders_customer_id_idx on public.sales_orders(customer_id);
create index profiles_user_id_idx on public.profiles(user_id);
create index profiles_tenant_id_idx on public.profiles(tenant_id);

-- Enable Row Level Security
alter table public.tenants enable row level security;
alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.sales_orders enable row level security;
alter table public.customer_sync_logs enable row level security;

-- Tenants RLS policies
create policy "Users can view their own tenant" on public.tenants
  for select using (
    id in (
      select tenant_id from public.profiles 
      where user_id = auth.uid()
    )
  );

create policy "Tenant owners can update their tenant" on public.tenants
  for update using (
    id in (
      select tenant_id from public.profiles 
      where user_id = auth.uid() and role = 'owner'
    )
  );

-- Profiles RLS policies
create policy "Users can view their own profile" on public.profiles
  for select using (user_id = auth.uid());

create policy "Users can update their own profile" on public.profiles
  for update using (user_id = auth.uid());

create policy "Users can insert their own profile" on public.profiles
  for insert with check (user_id = auth.uid());

-- Customers RLS policies
create policy "Users can view customers from their tenant" on public.customers
  for select using (
    tenant_id in (
      select tenant_id from public.profiles 
      where user_id = auth.uid()
    )
  );

create policy "Users can insert customers to their tenant" on public.customers
  for insert with check (
    tenant_id in (
      select tenant_id from public.profiles 
      where user_id = auth.uid()
    )
  );

create policy "Users can update customers in their tenant" on public.customers
  for update using (
    tenant_id in (
      select tenant_id from public.profiles 
      where user_id = auth.uid()
    )
  );

create policy "Users can delete customers from their tenant" on public.customers
  for delete using (
    tenant_id in (
      select tenant_id from public.profiles 
      where user_id = auth.uid()
    )
  );

-- Sales orders RLS policies
create policy "Users can view sales orders from their tenant" on public.sales_orders
  for select using (
    tenant_id in (
      select tenant_id from public.profiles 
      where user_id = auth.uid()
    )
  );

create policy "Users can insert sales orders to their tenant" on public.sales_orders
  for insert with check (
    tenant_id in (
      select tenant_id from public.profiles 
      where user_id = auth.uid()
    )
  );

create policy "Users can update sales orders in their tenant" on public.sales_orders
  for update using (
    tenant_id in (
      select tenant_id from public.profiles 
      where user_id = auth.uid()
    )
  );

-- Customer sync logs RLS policies
create policy "Users can view sync logs from their tenant" on public.customer_sync_logs
  for select using (
    tenant_id in (
      select tenant_id from public.profiles 
      where user_id = auth.uid()
    )
  );

create policy "Users can insert sync logs to their tenant" on public.customer_sync_logs
  for insert with check (
    tenant_id in (
      select tenant_id from public.profiles 
      where user_id = auth.uid()
    )
  );

-- Functions for updated_at timestamps
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Triggers for updated_at
create trigger handle_updated_at before update on public.tenants
  for each row execute procedure public.handle_updated_at();

create trigger handle_updated_at before update on public.profiles
  for each row execute procedure public.handle_updated_at();

create trigger handle_updated_at before update on public.customers
  for each row execute procedure public.handle_updated_at();

create trigger handle_updated_at before update on public.sales_orders
  for each row execute procedure public.handle_updated_at();

-- Function to automatically create profile when user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user creation
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Enable trigram extension for fuzzy search
create extension if not exists pg_trgm;

-- Function to search customers with fuzzy matching
create or replace function public.search_customers(
  search_tenant_id uuid,
  search_query text,
  similarity_threshold real default 0.3,
  max_results integer default 10
)
returns table (
  id uuid,
  name text,
  email text,
  country text,
  similarity real
)
language sql
security definer
as $$
  select 
    c.id,
    c.name,
    c.email,
    c.country,
    greatest(
      similarity(c.name, search_query),
      similarity(coalesce(c.email, ''), search_query)
    ) as similarity
  from public.customers c
  where 
    c.tenant_id = search_tenant_id
    and c.status = 'active'
    and (
      c.name ilike '%' || search_query || '%'
      or c.email ilike '%' || search_query || '%'
      or similarity(c.name, search_query) > similarity_threshold
      or similarity(coalesce(c.email, ''), search_query) > similarity_threshold
    )
  order by similarity desc, c.name
  limit max_results;
$$;

-- Grant necessary permissions
grant usage on schema public to anon, authenticated;
grant all privileges on all tables in schema public to authenticated;
grant all privileges on all sequences in schema public to authenticated;

-- Grant execute permissions on functions
grant execute on function public.search_customers to authenticated;

-- Insert default data
-- Note: This would be done through the application, not in migration 