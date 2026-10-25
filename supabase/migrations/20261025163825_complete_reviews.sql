-- All access goes through Hydrogen. Approved rows still contain private author fields.
revoke all on public.reviews, public.review_replies, public.review_votes,
  public.moderation_events from anon, authenticated;
grant all on public.reviews, public.review_replies, public.moderation_events to service_role;

create table public.review_rate_limits (
  bucket text primary key check (bucket ~ '^[a-f0-9]{64}$'),
  window_start timestamptz not null default now(),
  attempts integer not null check (attempts > 0)
);
alter table public.review_rate_limits enable row level security;
revoke all on public.review_rate_limits from anon, authenticated;
grant all on public.review_rate_limits to service_role;
create index review_rate_limits_expiry_idx on public.review_rate_limits(window_start);

create function public.review_take_quota(p_bucket text, p_limit integer default 5)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  if p_limit not between 1 and 20 then raise exception 'Invalid quota'; end if;
  delete from public.review_rate_limits where window_start < now() - interval '1 day';
  insert into public.review_rate_limits as quota (bucket, attempts)
    values (p_bucket, 1)
    on conflict (bucket) do update set
      attempts = case when quota.window_start < now() - interval '10 minutes' then 1 else quota.attempts + 1 end,
      window_start = case when quota.window_start < now() - interval '10 minutes' then now() else quota.window_start end
    where quota.window_start < now() - interval '10 minutes' or quota.attempts < p_limit;
  return found;
end;
$$;
revoke all on function public.review_take_quota(text, integer) from public, anon, authenticated;
grant execute on function public.review_take_quota(text, integer) to service_role;

create function public.review_validate_reply()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare parent public.review_replies;
begin
  if tg_op = 'UPDATE' and (new.review_id is distinct from old.review_id or new.parent_reply_id is distinct from old.parent_reply_id) then
    raise exception 'Reply parent cannot change' using errcode = '23514';
  end if;
  if new.parent_reply_id is null then new.depth := 1;
  else
    select * into parent from public.review_replies where id = new.parent_reply_id for share;
    if not found or parent.review_id <> new.review_id or parent.depth >= 2 then
      raise exception 'Invalid reply parent or depth' using errcode = '23514';
    end if;
    new.depth := parent.depth + 1;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.review_validate_reply() from public, anon, authenticated;
create trigger review_replies_validate before insert or update on public.review_replies
for each row execute function public.review_validate_reply();
create index review_replies_parent_idx on public.review_replies(parent_reply_id);

create function public.review_submit(
  p_handle text, p_product_id text, p_name text, p_body text, p_bucket text,
  p_rating integer default null, p_title text default null, p_email text default null,
  p_review_id uuid default null, p_parent_reply_id uuid default null
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare result_id uuid;
begin
  if not public.review_take_quota(p_bucket) then
    raise sqlstate 'PT429' using message = 'Too many submissions. Try again in 10 minutes.';
  end if;
  if p_review_id is null then
    insert into public.reviews(product_handle, product_id, reviewer_name, reviewer_email, rating, title, body, status)
      values (p_handle, p_product_id, btrim(p_name), nullif(btrim(p_email), ''), p_rating, btrim(p_title), btrim(p_body), 'pending') returning id into result_id;
  else
    perform 1 from public.reviews where id = p_review_id and product_handle = p_handle and product_id = p_product_id and status = 'approved' for share;
    if not found then raise sqlstate 'PT400' using message = 'Review is not available for replies.'; end if;
    if p_parent_reply_id is not null then
      perform 1 from public.review_replies where id = p_parent_reply_id and review_id = p_review_id and status = 'approved' and depth = 1 for share;
      if not found then raise sqlstate 'PT400' using message = 'Reply parent is unavailable or maximum depth reached.'; end if;
    end if;
    insert into public.review_replies(review_id, parent_reply_id, author_name, body, status)
      values (p_review_id, p_parent_reply_id, btrim(p_name), btrim(p_body), 'pending') returning id into result_id;
  end if;
  return result_id;
end;
$$;
revoke all on function public.review_submit(text,text,text,text,text,integer,text,text,uuid,uuid) from public, anon, authenticated;
grant execute on function public.review_submit(text,text,text,text,text,integer,text,text,uuid,uuid) to service_role;

create function public.review_product_data(p_handle text, p_page integer default 1, p_sort text default 'newest')
returns jsonb language sql stable security invoker set search_path = '' as $$
with recursive approved as (
  select * from public.reviews where product_handle = p_handle and status = 'approved'
), summary as (
  select count(*) as count, coalesce(round(avg(rating), 1), 0) as average,
    jsonb_build_object('1',count(*) filter(where rating=1),'2',count(*) filter(where rating=2),
      '3',count(*) filter(where rating=3),'4',count(*) filter(where rating=4),'5',count(*) filter(where rating=5)) as distribution
  from approved
), pagination as (
  select least(greatest(p_page,1), greatest(1,ceil(count/8.0)::integer)) as page,
    greatest(1,ceil(count/8.0)::integer) as pages from summary
), selected as (
  select * from approved
  order by case when p_sort = 'highest' then rating end desc,
    case when p_sort = 'lowest' then rating end asc, created_at desc, id desc
  limit 8 offset ((select page from pagination)-1)*8
), visible_replies as (
  select replies.* from public.review_replies replies join selected on selected.id = replies.review_id
    where replies.status='approved' and replies.parent_reply_id is null
  union all
  select child.* from public.review_replies child join visible_replies parent on child.parent_reply_id=parent.id
    where child.status='approved' and child.review_id=parent.review_id and child.depth=parent.depth+1 and child.depth<=2
)
select jsonb_build_object('enabled',true,'page',pagination.page,'totalPages',pagination.pages,'sort',p_sort,
  'aggregate',jsonb_build_object('averageRating',summary.average,'reviewCount',summary.count,'distribution',summary.distribution),
  'reviews',coalesce((select jsonb_agg(jsonb_build_object(
    'id',r.id,'productHandle',r.product_handle,'productId',r.product_id,'rating',r.rating,'title',r.title,'body',r.body,
    'reviewerName',r.reviewer_name,'status',r.status,'createdAt',r.created_at,
    'replies',coalesce((select jsonb_agg(jsonb_build_object('id',reply.id,'parentReplyId',reply.parent_reply_id,
      'authorName',reply.author_name,'body',reply.body,'depth',reply.depth,'createdAt',reply.created_at) order by reply.created_at,reply.id)
      from visible_replies reply where reply.review_id=r.id),'[]'::jsonb)
    ) order by case when p_sort='highest' then r.rating end desc,
      case when p_sort='lowest' then r.rating end asc,r.created_at desc,r.id desc) from selected r),'[]'::jsonb))
from summary cross join pagination;
$$;
revoke all on function public.review_product_data(text,integer,text) from public, anon, authenticated;
grant execute on function public.review_product_data(text,integer,text) to service_role;

notify pgrst, 'reload schema';
