create extension if not exists pgcrypto;

create type review_status as enum ('pending', 'approved', 'rejected');

create table reviews (
  id uuid primary key default gen_random_uuid(),
  product_handle text not null,
  product_id text,
  customer_id text,
  reviewer_name text not null,
  reviewer_email text,
  rating integer not null check (rating between 1 and 5),
  title text not null check (char_length(title) between 4 and 120),
  body text not null check (char_length(body) between 20 and 2000),
  status review_status not null default 'pending',
  moderation_note text,
  moderated_by text,
  moderated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table review_replies (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references reviews(id) on delete cascade,
  parent_reply_id uuid references review_replies(id) on delete cascade,
  author_name text not null,
  body text not null check (char_length(body) between 2 and 2000),
  status review_status not null default 'pending',
  depth integer not null default 1 check (depth between 1 and 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table review_votes (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references reviews(id) on delete cascade,
  voter_hash text not null,
  vote smallint not null check (vote in (-1, 1)),
  created_at timestamptz not null default now(),
  unique (review_id, voter_hash)
);

create table moderation_events (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (subject_type in ('review', 'reply')),
  subject_id uuid not null,
  from_status review_status,
  to_status review_status not null,
  actor_id text,
  note text,
  created_at timestamptz not null default now()
);

create index reviews_product_status_created_idx
  on reviews (product_handle, status, created_at desc);

create index reviews_product_rating_idx
  on reviews (product_handle, status, rating);

create index review_replies_review_status_created_idx
  on review_replies (review_id, status, created_at asc);

alter table reviews enable row level security;
alter table review_replies enable row level security;
alter table review_votes enable row level security;
alter table moderation_events enable row level security;

create policy "Public can read approved reviews"
  on reviews for select
  using (status = 'approved');

create policy "Public can read approved replies"
  on review_replies for select
  using (status = 'approved');
