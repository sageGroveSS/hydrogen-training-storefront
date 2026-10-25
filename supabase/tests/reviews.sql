-- Run in SQL Editor or psql. All regression fixtures roll back.
begin;
do $$
declare
  payload jsonb; review_id uuid; other_review uuid; root_reply uuid; child_reply uuid;
  hidden_reply uuid; count_before integer; attempts integer; accepted integer;
begin
  insert into public.reviews(product_handle,product_id,reviewer_name,reviewer_email,rating,title,body,status,created_at)
    select '__reviews_regression__','gid://shopify/Product/test','Regression author','private@example.test',
      case when n<=500 then 1 else 5 end,'Regression review '||n,'Synthetic regression review body, never a real customer.','approved',now()-n*interval '1 second'
    from generate_series(1,1005) n;
  select id into review_id from public.reviews where product_handle='__reviews_regression__' order by created_at desc,id desc limit 1;
  select id into other_review from public.reviews where product_handle='__reviews_regression__' and id<>review_id limit 1;
  insert into public.reviews(product_handle,product_id,reviewer_name,rating,title,body,status)
    values('__reviews_regression__','gid://shopify/Product/test','Pending author',5,'Pending review','This pending review must never count in public ratings.','pending');
  payload:=public.review_product_data('__reviews_regression__',1,'highest');
  if (payload#>>'{aggregate,reviewCount}')::integer<>1005 or (payload#>>'{aggregate,averageRating}')::numeric<>3.0
    or (payload#>>'{aggregate,distribution,1}')::integer<>500 or (payload#>>'{aggregate,distribution,5}')::integer<>505 then
    raise exception 'Aggregate regression: %',payload->'aggregate'; end if;
  if jsonb_array_length(payload->'reviews')<>8 or (payload#>>'{reviews,0,rating}')::integer<>5 or (payload->>'totalPages')::integer<>126 then raise exception 'Pagination or highest sort failed'; end if;
  if payload::text like '%private@example.test%' then raise exception 'Private email leaked'; end if;
  payload:=public.review_product_data('__reviews_regression__',1,'lowest');
  if (payload#>>'{reviews,0,rating}')::integer<>1 then raise exception 'Lowest sort failed'; end if;
  payload:=public.review_product_data('__reviews_regression__',9999,'newest');
  if (payload->>'page')::integer<>126 or jsonb_array_length(payload->'reviews')<>5 then raise exception 'Last-page clamping failed'; end if;

  insert into public.review_replies(review_id,author_name,body,status) values(review_id,'Root author','Root approved reply','approved') returning id into root_reply;
  insert into public.review_replies(review_id,parent_reply_id,author_name,body,status,depth) values(review_id,root_reply,'Child author','Nested approved reply','approved',1) returning id into child_reply;
  if (select depth from public.review_replies where id=child_reply)<>2 then raise exception 'Depth was not computed'; end if;
  begin
    insert into public.review_replies(review_id,parent_reply_id,author_name,body,status) values(review_id,child_reply,'Too deep','Invalid third-level reply','pending');
    raise exception 'Third reply level accepted';
  exception when check_violation then null; end;
  begin
    insert into public.review_replies(review_id,parent_reply_id,author_name,body,status) values(other_review,root_reply,'Wrong review','Cross-review parent accepted','pending');
    raise exception 'Cross-review parent accepted';
  exception when check_violation then null; end;
  begin
    update public.review_replies set parent_reply_id=child_reply where id=root_reply;
    raise exception 'Reparenting cycle accepted';
  exception when check_violation then null; end;

  perform public.review_moderate('reply',root_reply,'rejected','Regression test');
  payload:=public.review_product_data('__reviews_regression__',1,'newest');
  if jsonb_array_length(payload#>'{reviews,0,replies}')<>0 then raise exception 'Hidden ancestor exposed nested reply'; end if;
  perform public.review_moderate('reply',root_reply,'approved','Regression test');
  payload:=public.review_product_data('__reviews_regression__',1,'newest');
  if jsonb_array_length(payload#>'{reviews,0,replies}')<>2 then raise exception 'Visible reply tree failed'; end if;
  insert into public.review_replies(review_id,author_name,body,status) values(review_id,'Pending author','Pending reply content','pending') returning id into hidden_reply;
  perform public.review_moderate('review',review_id,'rejected','Regression test');
  select count(*) into count_before from public.moderation_events;
  begin
    perform public.review_moderate('reply',hidden_reply,'approved','Must fail');
    raise exception 'Reply to hidden review approved';
  exception when sqlstate 'PT409' then null; end;
  if (select count(*) from public.moderation_events)<>count_before then raise exception 'Failed decision left audit event'; end if;
  perform public.review_moderate('review',review_id,'approved','Restore test review');

  accepted:=0;
  for attempts in 1..6 loop
    begin
      perform public.review_submit('__reviews_regression__','gid://shopify/Product/test','Rate limit test','Synthetic pending review for rate-limit regression.',repeat('a',64),5,'Rate limit test');
      accepted:=accepted+1;
    exception when sqlstate 'PT429' then null; end;
  end loop;
  if accepted<>5 then raise exception 'Expected five atomic submissions, got %',accepted; end if;
  begin
    perform public.review_submit('__reviews_regression__','gid://shopify/Product/test','Reply test','Invalid nested reply',repeat('b',64),null,null,null,review_id,child_reply);
    raise exception 'Reply RPC accepted third depth';
  exception when sqlstate 'PT400' then null; end;

  if has_table_privilege('anon','public.reviews','select') or has_table_privilege('authenticated','public.review_replies','insert') then raise exception 'Direct public table access remains'; end if;
  if has_function_privilege('anon','public.review_product_data(text,integer,text)','execute') or has_function_privilege('authenticated','public.review_moderate(text,uuid,public.review_status,text)','execute') then raise exception 'Privileged function exposed'; end if;
  if not has_function_privilege('service_role','public.review_product_data(text,integer,text)','execute') then raise exception 'Server read function unavailable'; end if;
  raise notice 'Reviews SQL regression passed: 1005 ratings, moderation, audit rollback, hierarchy, quotas, grants.';
end;
$$;
rollback;
select 'Reviews SQL regression passed; fixtures rolled back' as result;
