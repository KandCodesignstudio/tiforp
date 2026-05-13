# Supabase Setup for ITforP Core

## Quick Start (Mock Data)

The app runs with mock data by default — no Supabase needed. Just:

```bash
npm start
```

Scan the QR code with **Expo Go** on your phone.

---

## Connect to Supabase (Production)

### 1. Create a Supabase Project

1. Go to https://supabase.com/dashboard
2. Click **New project** — name it `itforp-core`
3. Choose a region close to your users and set a database password

### 2. Get Your API Keys

1. Go to **Project Settings → API**
2. Copy the **Project URL** and **anon / public** key

### 3. Update the Config File

Open `src/config/supabase.js` and replace the placeholder values:

```js
const SUPABASE_URL = 'https://xxxxxxxxxxxx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

### 4. Switch to Live Data

In both `src/hooks/useJobs.js` and `src/hooks/useNotes.js`, change:

```js
const USE_MOCK = false; // was: true
```

### 5. Create the Database Tables

Run the following SQL in your Supabase project under **SQL Editor**:

```sql
-- Jobs table
create table public.jobs (
  id          uuid primary key default gen_random_uuid(),
  job_number  text not null,
  status      text not null default 'in_progress',
  client      jsonb not null default '{}',
  description text,
  trips       jsonb not null default '[]',
  attachments jsonb not null default '[]',
  next_trip   timestamptz,
  created_at  timestamptz default now()
);

-- Notes table
create table public.notes (
  id          uuid primary key default gen_random_uuid(),
  job_id      uuid references public.jobs(id) on delete cascade,
  text        text not null,
  author      text not null,
  trip_number integer not null,
  created_at  timestamptz default now()
);

-- Indexes for performance
create index notes_job_id_idx on public.notes(job_id);
create index jobs_status_idx  on public.jobs(status);
```

### 6. Enable Row Level Security

```sql
-- Enable RLS
alter table public.jobs  enable row level security;
alter table public.notes enable row level security;

-- Jobs: authenticated users can read and update
create policy "Read jobs"   on public.jobs for select using (auth.role() = 'authenticated');
create policy "Update jobs" on public.jobs for update using (auth.role() = 'authenticated');

-- Notes: authenticated users can read and insert
create policy "Read notes"   on public.notes for select using (auth.role() = 'authenticated');
create policy "Insert notes" on public.notes for insert with check (auth.role() = 'authenticated');
```

### 7. Enable Realtime

In the Supabase dashboard:
1. Go to **Database → Replication**
2. Enable replication for both the `jobs` and `notes` tables

### 8. Enable Email Auth

1. Go to **Authentication → Providers**
2. Ensure **Email** is enabled (it is by default)
3. Optionally disable **Confirm email** during development

### 9. Client JSON Field Shapes (stored in `client` JSONB)

```json
{
  "name": "ACME INC.",
  "storeNumber": "STORE #1234",
  "address": "123 Main St, Dallas, TX 75201",
  "contacts": [
    { "name": "Jane Doe", "role": "Site Manager", "phone": "214-555-0100" }
  ]
}
```

### 10. Trip JSON Field Shape (stored in `trips` JSONB array)

```json
[
  {
    "id": "trip_1",
    "tripNumber": 1,
    "scheduledAt": "2025-12-20T09:00:00.000Z",
    "status": "scheduled",
    "scopeOfWork": "Install switch\nRun cables\nTest connections"
  }
]
```
