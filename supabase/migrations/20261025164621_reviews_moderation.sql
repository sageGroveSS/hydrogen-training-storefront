create function public.review_moderate(p_kind text, p_id uuid, p_status public.review_status, p_note text default '')
returns void language plpgsql security invoker set search_path = '' as $$
declare previous public.review_status; parent_review uuid; parent_reply uuid;
begin
  if char_length(p_note) > 500 then raise sqlstate 'PT400' using message='Moderation note is too long.'; end if;
  if p_kind = 'review' then
    select status into previous from public.reviews where id=p_id for update;
    if not found then raise sqlstate 'PT404' using message='Review not found.'; end if;
    update public.reviews set status=p_status,moderation_note=p_note,moderated_by='store-moderator',moderated_at=now(),updated_at=now() where id=p_id;
  elsif p_kind = 'reply' then
    select status,review_id,parent_reply_id into previous,parent_review,parent_reply from public.review_replies where id=p_id for update;
    if not found then raise sqlstate 'PT404' using message='Reply not found.'; end if;
    if p_status='approved' then
      perform 1 from public.reviews where id=parent_review and status='approved' for share;
      if not found then raise sqlstate 'PT409' using message='Approve the review before its replies.'; end if;
      if parent_reply is not null then
        perform 1 from public.review_replies where id=parent_reply and status='approved' for share;
        if not found then raise sqlstate 'PT409' using message='Approve the parent reply first.'; end if;
      end if;
    end if;
    update public.review_replies set status=p_status,updated_at=now() where id=p_id;
  else raise sqlstate 'PT400' using message='Invalid moderation subject.';
  end if;
  insert into public.moderation_events(subject_type,subject_id,from_status,to_status,actor_id,note)
    values(p_kind,p_id,previous,p_status,'store-moderator',p_note);
end;
$$;
revoke all on function public.review_moderate(text,uuid,public.review_status,text) from public, anon, authenticated;
grant execute on function public.review_moderate(text,uuid,public.review_status,text) to service_role;
create index moderation_events_subject_idx on public.moderation_events(subject_type,subject_id,created_at desc);
create index reviews_moderation_idx on public.reviews(status,created_at desc,id desc);
create index review_replies_moderation_idx on public.review_replies(status,created_at desc,id desc);
alter table public.review_replies add constraint review_replies_author_length check(char_length(btrim(author_name)) between 2 and 80);
notify pgrst, 'reload schema';
