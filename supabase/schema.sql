-- OneSpace 2.0 – Supabase PostgreSQL & Storage Schema
-- Enforces strict per-user Row-Level Security (RLS) across all tables and storage buckets.

-- 1. Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  role_title text default '',
  bio text default '',
  avatar_url text default '',
  currency text default 'USD',
  theme_preference text default 'light' check (theme_preference in ('light', 'dark')),
  notifications_enabled boolean default true,
  task_reminders boolean default true,
  habit_reminders boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Tasks
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text default '',
  due_date date,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  category text not null default 'Personal',
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- 3. Calendar Events & Reminders
create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  event_date date not null,
  start_time text default '',
  end_time text default '',
  event_type text not null default 'event' check (event_type in ('event', 'reminder', 'important')),
  description text default '',
  created_at timestamptz default now()
);

-- 4. Habits & Logs
create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  frequency text not null default 'daily' check (frequency in ('daily', 'weekly')),
  target_per_week integer not null default 7,
  category text not null default 'Wellness',
  completed_dates text[] not null default '{}',
  created_at timestamptz default now()
);

-- 5. Finance Transactions & Monthly Budgets
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tx_type text not null check (tx_type in ('income', 'expense')),
  amount numeric(12, 2) not null check (amount >= 0),
  category text not null,
  tx_date date not null,
  note text default '',
  created_at timestamptz default now()
);

create table if not exists public.person_money_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  direction text not null check (direction in ('given', 'received')),
  person_name text not null,
  amount numeric(12, 2) not null check (amount > 0),
  entry_date date not null,
  due_date date,
  note text default '',
  created_at timestamptz default now()
);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  monthly_limit numeric(12, 2) not null check (monthly_limit >= 0),
  unique (user_id, category)
);

-- 6. Goals & Milestones
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text not null default 'personal' check (category in ('personal', 'professional')),
  deadline date,
  description text default '',
  completed boolean not null default false,
  created_at timestamptz default now()
);

create table if not exists public.goal_milestones (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  completed boolean not null default false
);

-- 7. My Space Folders & Items
create table if not exists public.space_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references public.space_folders(id) on delete cascade,
  name text not null,
  description text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.space_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  folder_id uuid references public.space_folders(id) on delete set null,
  item_type text not null check (item_type in ('file', 'link', 'note')),
  title text not null,
  description text default '',
  file_kind text,
  file_name text,
  file_size bigint,
  mime_type text,
  storage_path text,
  url text,
  is_youtube boolean default false,
  note_content text default '',
  favorite boolean default false,
  category text default 'General',
  tags text[] not null default '{}',
  last_accessed_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable Row Level Security (RLS) on every table
alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.calendar_events enable row level security;
alter table public.habits enable row level security;
alter table public.transactions enable row level security;
alter table public.person_money_entries enable row level security;
alter table public.budgets enable row level security;
alter table public.goals enable row level security;
alter table public.goal_milestones enable row level security;
alter table public.space_folders enable row level security;
alter table public.space_items enable row level security;

-- Per-user RLS Policies
create policy "Own profile access" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "Own tasks access" on public.tasks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Own calendar access" on public.calendar_events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Own habits access" on public.habits for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Own transactions access" on public.transactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Own person money entries access" on public.person_money_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Own budgets access" on public.budgets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Own goals access" on public.goals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Own milestones access" on public.goal_milestones for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Own folders access" on public.space_folders for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Own space items access" on public.space_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Private Storage Bucket for My Space files (path convention: {user_id}/{item_id}/{filename})
insert into storage.buckets (id, name, public)
values ('myspace-files', 'myspace-files', false)
on conflict (id) do nothing;

create policy "Users manage own My Space files"
on storage.objects for all
using (bucket_id = 'myspace-files' and auth.uid()::text = (storage.foldername(name))[1])
with check (bucket_id = 'myspace-files' and auth.uid()::text = (storage.foldername(name))[1]);
