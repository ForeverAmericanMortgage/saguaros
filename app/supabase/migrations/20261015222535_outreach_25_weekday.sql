-- Raise only qualified-draft/new-introduction targets. Preserve credits, follow-ups and approval gates.
do $migration$
declare s text;
begin
 s=pg_get_functiondef('olympiad_outreach_worker.apollo(text,text,jsonb)'::regprocedure);
 if position('q>=20' in s)=0 or position('20-q' in s)=0 then raise exception 'Unexpected Apollo target definition';end if;
 execute replace(replace(s,'q>=20','q>=25'),'20-q','25-q');
 s=pg_get_functiondef('olympiad_private.apollo_alert_status(date,numeric,timestamptz)'::regprocedure);
 execute replace(replace(replace(replace(replace(replace(s,'q<20','q<25'),'g<20','g<25'),'q>=20','q>=25'),'g>=20','g>=25'),'20 qualified','25 qualified'),'20 confirmed','25 confirmed');
 s=pg_get_functiondef('olympiad_outreach_worker.daily(text,text,jsonb)'::regprocedure);
 if position('if n<20 then' in s)=0 then raise exception 'Unexpected sender target definition';end if;
 execute replace(replace(s,')>=20 then',')>=25 then'),'if n<20 then','if n<25 then');
 s=pg_get_functiondef('olympiad_outreach_worker.notification(text,text,jsonb)'::regprocedure);
 execute replace(s,'limit 20','limit 25');
end $migration$;
