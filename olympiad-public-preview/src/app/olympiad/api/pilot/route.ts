import { NextResponse } from 'next/server';
import { allowedOrigin, pilotClient, pilotConfiguration, pilotEmailAllowed, SITE_URL } from '../../pilot/server';
import { chairmanAccess } from '../../auth/chairman-access';
import { PROOF_COOKIE } from '../../auth/chairman-proof';
import { cookies } from 'next/headers';
import * as validate from '../../pilot/validation';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store', 'Vary': 'Cookie, Origin' };
const reply = (value: unknown, status = 200) => NextResponse.json(value, { status, headers });
const publicColumns = 'id,slug,team_name,company_name,industry_id,description,event_id';

async function logoUrls(client: Awaited<ReturnType<typeof pilotClient>>, ids: string[]) {
 if(!ids.length)return new Map<string,string>();
 const {data}=await client.from('team_public_logos').select('team_id,updated_at').in('team_id',ids);
 return new Map((data??[]).map(l=>[l.team_id,`/olympiad/api/public-logo?team_id=${l.team_id}&v=${encodeURIComponent(l.updated_at)}`]));
}
async function context() {
  const client = await pilotClient();
  const [{ data: event, error }, { data: industries, error: industryError }] = await Promise.all([
    client.from('event_editions').select('id,year,registration_open,fundraising_active').eq('year', 2027).single(),
    client.from('industries').select('id,slug,name,sort_order').order('sort_order'),
  ]);
  if (error || industryError || !event) throw new Error('Event setup unavailable.');
  const map = (team: Record<string, unknown>) => ({
    id: team.id, slug: team.slug, name: team.team_name, company: team.company_name,
    industry: industries?.find(row => row.id === team.industry_id)?.name ?? 'Other businesses',
    description: team.description ?? '', event_year: event.year,
  });
  return { client, event, industries: industries ?? [], map };
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const action = params.get('action') ?? 'directory';
  const config = pilotConfiguration();
  if (!config.configured) {
    if (action === 'status') return reply({ enabled: false, configured: false });
    if (action === 'directory') return reply({ teams: [], configured: false });
    if (action === 'mine') return reply({ user: null, teams: [], configured: false });
    if (action === 'organizer') return reply({ error: 'Organizer setup is pending.' }, 503);
    return reply({ error: 'Team pages will be available when registration opens.' }, 503);
  }
  try {
    const { client, event, industries, map } = await context();
    if (action === 'status') return reply({ enabled: config.enabled, registration_open: event.registration_open, configured: true, pilot_only: true, google_sign_in_enabled: process.env.OLYMPIAD_GOOGLE_SIGN_IN_ENABLED === 'true', fundraising_active: event.fundraising_active, industries: industries.map(i => i.name) });
    if (action === 'leaderboard') {
      if (!event.fundraising_active) {
        const { data, error } = await client.from('team_directory').select(publicColumns).eq('event_id',event.id).order('team_name').limit(500);
        if (error) throw error;
        const urls=await logoUrls(client,(data??[]).map(t=>t.id));
        return reply({ active:false, teams:(data??[]).map(team=>({id:team.id,name:team.team_name,slug:team.slug,
          category:industries.find(i=>i.id===team.industry_id)?.name??'Other businesses',totalCents:0,logo_url:urls.get(team.id)})),
          message:'Fundraising opens soon. Participating teams are not ranked yet.' });
      }
      const { data, error } = await client.from('fundraising_leaderboard').select('*').eq('event_id', event.id).order('total_cents', { ascending: false }).limit(500);
      if (error) throw error;
      const urls=await logoUrls(client,(data??[]).map(t=>t.team_id));
      return reply({ active:true, teams:(data??[]).map(team=>({id:team.team_id,name:team.team_name,slug:team.slug,
        category:industries.find(i=>i.id===team.industry_id)?.name??'Other businesses',totalCents:Number(team.total_cents),logo_url:urls.get(team.team_id)})) });
    }
    if (action === 'directory' || action === 'team') {
      let query = client.from('team_directory').select(publicColumns).eq('event_id', event.id).order('team_name').limit(500);
      if (action === 'team') query = query.eq('slug', validate.text(params.get('slug'), 'Team', 160, true));
      const { data, error } = await query;
      if (error) throw error;
      const urls = await logoUrls(client,(data??[]).map(t=>t.id));
      if (action === 'team') return data?.[0] ? reply({ team: {...map(data[0]),logo_url:urls.get(data[0].id)} }) : reply({ error: 'This team page is not public or could not be found.' }, 404);
      return reply({ teams: (data ?? []).map(t=>({...map(t),logo_url:urls.get(t.id)})), configured: true });
    }
    if (action === 'organizer') {
      const access = await chairmanAccess(client);
      if (!access.ok) return reply({ error: 'Invited chairman Google access is required.' }, access.status);
      const { data: { user }, error: authError } = await client.auth.getUser();
      if (authError || !user || !user.email_confirmed_at) return reply({ error: 'Sign in with your organizer email to continue.' }, 401);
      const { data: membership, error: membershipError } = await client.from('organizer_memberships').select('user_id').eq('user_id', user.id).maybeSingle();
      if (membershipError) throw membershipError;
      if (!membership) return reply({ error: 'Organizer access is required.' }, 403);
      const { data, error } = await client.from('teams').select(`${publicColumns},captain_user_id,is_public,team_captain_details(name,phone),roster_participants(id,name,email,phone,shirt_size,shirt_fit,position)`).eq('event_id', event.id).order('team_name').limit(501);
      if (error) throw error;
      if ((data?.length ?? 0) > 500) return reply({ error: 'This overview needs pagination before it can show all teams.' }, 503);
      const { data: goals, error: goalsError } = await client.from('team_fundraising_goals').select('team_id,stretch_goal_cents');
      if (goalsError) throw goalsError;
      const { data: followups, error: followupsError } = await client.from('team_followups').select('team_id,status,assigned_to,notes,next_follow_up,updated_at');
      if (followupsError) throw followupsError;
      const [{ data: reviews, error: reviewError }, { data: members, error: memberError }, { data: assignments, error: assignmentError }, { data: credit, error: creditError }] = await Promise.all([
        client.from('team_reviews').select('team_id,status,message,version'),
        client.from('club_member_references').select('id,name').eq('active',true).order('name'),
        client.from('team_member_attributions').select('team_id,member_id'),
        client.from('member_fundraising_credit').select('member_id,member_name,team_count,total_cents').eq('event_id',event.id),
      ]);
      if (reviewError || memberError || assignmentError || creditError) throw reviewError || memberError || assignmentError || creditError;
      const { data: audienceProfiles, error: audienceError } = await client.from('team_audience_profiles').select('team_id,participation_history');
      if (audienceError) throw audienceError;
      const webLogoUrls = await logoUrls(client,(data??[]).map(t=>t.id));
      const { data: logos, error: logoError } = await client.from('team_brand_assets').select('team_id,filename,content_type,size_bytes,updated_at');
      if (logoError) throw logoError;
      const { data: campaignContacts, error: contactError } = await client.rpc('organizer_campaign_contacts');
      if (contactError) throw contactError;
      const contacts = (campaignContacts ?? []) as {captain_user_id: string; email: string; last_result: string | null; last_synced_at: string | null}[];
      const normalized = (name: string) => name.toLowerCase().replace(/\b(llc|incorporated|inc|corporation|corp|ltd)\b/g,'').replace(/[^a-z0-9]/g,'');

      return reply({ teams: (data ?? []).map(team => {
        const roster = [...(team.roster_participants ?? [])].sort((a,b) => a.position - b.position);
        const captainContact = contacts.find(c => c.captain_user_id === team.captain_user_id);
        const complete = roster.filter(p => p.name && p.email && p.phone && p.shirt_size && p.shirt_fit).length;
        const details = Array.isArray(team.team_captain_details) ? team.team_captain_details[0] : team.team_captain_details;
        const review = reviews?.find(r => r.team_id === team.id);
        const memberId = assignments?.find(a => a.team_id === team.id)?.member_id ?? null;
        const duplicates = (data ?? []).filter(other => other.id !== team.id && ((normalized(String(team.company_name)).length >= 3 && normalized(String(other.company_name)) === normalized(String(team.company_name))) || normalized(String(other.team_name)) === normalized(String(team.team_name)))).slice(0,5).map(other => ({id:other.id,name:other.team_name,company:other.company_name,reason:'Similar business or team name. Confirm whether this is a separate team.'}));
        return { ...map(team), logo_url: webLogoUrls.get(team.id), captain_email: captainContact?.email ?? '', campaign_status: captainContact?.last_result ?? null, campaign_checked_at: captainContact?.last_synced_at ?? null, roster: roster.map(({position: _position, ...person}) => person), logo: logos?.find(l => l.team_id === team.id) ?? null, participation_history: audienceProfiles?.find(p => p.team_id === team.id)?.participation_history ?? 'unclassified', approval_status: review?.status ?? 'pending', approval_message: review?.message ?? '', approval_version: review?.version ?? 0, referring_club_member_id: memberId, referring_club_member_name: members?.find(m => m.id === memberId)?.name ?? '', duplicate_candidates: duplicates, followup: followups?.find(f => f.team_id === team.id) ?? null, stretch_goal_cents: goals?.find(g => g.team_id === team.id)?.stretch_goal_cents ?? 300000, is_public: team.is_public, captain_name: details?.name ?? '', captain_phone: details?.phone ?? '', missing: { name: roster.filter(p => !p.name).length, email: roster.filter(p => !p.email).length, phone: roster.filter(p => !p.phone).length, shirt: roster.filter(p => !p.shirt_size || !p.shirt_fit).length }, listed: roster.length, complete, needs_follow_up: roster.length < 6 || complete < roster.length };
      }), club_members: members ?? [], member_credit: credit ?? [], registration_open: event.registration_open, fundraising_active: event.fundraising_active });
    }
    if (action === 'mine') {
      const { data: { user } } = await client.auth.getUser();
      if (!user || !user.email_confirmed_at) return reply({ user: null, teams: [], registration_allowed: false });
      const { data: cohort, error: cohortError } = await client.from('pilot_captains').select('user_id').eq('user_id', user.id).maybeSingle();
      if (cohortError) throw cohortError;
      const { data, error } = await client.from('teams').select(`${publicColumns},is_public,roster_version,team_captain_details(name,phone),roster_participants(id,name,email,phone,shirt_size,shirt_fit,position)`).eq('captain_user_id', user.id).eq('event_id', event.id).order('created_at');
      if (error) throw error;
      const { data: goals, error: goalsError } = await client.from('team_fundraising_goals').select('team_id,stretch_goal_cents');
      if (goalsError) throw goalsError;
      const { data: reviews, error: reviewError } = await client.from('team_reviews').select('team_id,status,message');
      if (reviewError) throw reviewError;
      const [{data: members,error: memberError},{data: assignments,error: assignmentError}] = await Promise.all([
        client.from('club_member_references').select('id,name').eq('active',true).order('name'),
        client.from('team_member_attributions').select('team_id,member_id').in('team_id',(data ?? []).map(team => team.id)),
      ]);
      if (memberError || assignmentError) throw memberError || assignmentError;
      const webLogoUrls = await logoUrls(client,(data??[]).map(t=>t.id));
      const { data: logos, error: logoError } = await client.from('team_brand_assets').select('team_id,filename,content_type,size_bytes,updated_at');
      if (logoError) throw logoError;
      const { data: organizer, error: organizerError } = await client.from('organizer_memberships').select('user_id').eq('user_id', user.id).maybeSingle();
      if (organizerError) throw organizerError;
      return reply({ club_members: members ?? [], fundraising_active: event.fundraising_active, registration_allowed: !!cohort && event.registration_open && config.enabled, user: { email: user.email, is_organizer: !!organizer }, teams: (data ?? []).map(team => {
        const details = Array.isArray(team.team_captain_details) ? team.team_captain_details[0] : team.team_captain_details;
        return { ...map(team), logo_url: webLogoUrls.get(team.id), logo: logos?.find(l => l.team_id === team.id) ?? null, referring_club_member_id: assignments?.find(a => a.team_id === team.id)?.member_id ?? null, approval_status: reviews?.find(r => r.team_id === team.id)?.status ?? 'pending', approval_message: reviews?.find(r => r.team_id === team.id)?.message ?? '', stretch_goal_cents: goals?.find(g => g.team_id === team.id)?.stretch_goal_cents ?? 300000, is_public: team.is_public, roster_version: team.roster_version, captain_name: details?.name ?? '', captain_phone: details?.phone ?? '', roster: (team.roster_participants ?? []).sort((a,b) => a.position - b.position).map(({position: _position, ...row}) => row) };
      }) });
    }
    return reply({ error: 'Unknown request.' }, 400);
  } catch (error) {
    if (error instanceof validate.PilotInputError) return reply({ error: error.message }, 400);
    console.error('Olympiad read failed', { action });
    return reply({ error: 'We could not load this information. Please try again shortly.' }, 503);
  }
}

export async function POST(request: Request) {
  if (!allowedOrigin(request)) return reply({ error: 'Please submit from the Olympiad website.' }, 403);
  if (!request.headers.get('content-type')?.includes('application/json')) return reply({ error: 'Expected a JSON request.' }, 415);
  if (!pilotConfiguration().enabled) return reply({ error: 'Registration is not open yet. Please check back soon.' }, 503);
  try {
    // Read a bounded stream rather than accepting an unlimited request body.
    const reader = request.body?.getReader();
    if (!reader) return reply({ error: 'Missing request.' }, 400);
    const chunks: Uint8Array[] = []; let bytes = 0;
    for (;;) { const { value, done } = await reader.read(); if (done) break; bytes += value.byteLength; if (bytes > 65536) { await reader.cancel(); return reply({ error: 'Request is too large.' }, 413); } chunks.push(value); }
    let data: Record<string, unknown>;
    try { data = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return reply({ error: 'Invalid request.' }, 400); }
    if (!data || typeof data !== 'object' || Array.isArray(data)) return reply({ error: 'Invalid request.' }, 400);
    const { client, event, industries } = await context();
    if (data.action === 'sign-out') { (await cookies()).delete(PROOF_COOKIE); const { error } = await client.auth.signOut({scope:'local'}); if (error) throw error; return reply({ ok: true }); }
    if (data.action === 'google-sign-in') {
      if (process.env.OLYMPIAD_GOOGLE_SIGN_IN_ENABLED !== 'true') return reply({ error: 'Google sign-in is not available yet. Please use an email link.' }, 503);
      const { data: oauth, error } = await client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${SITE_URL}/olympiad/auth/callback`, skipBrowserRedirect: true, queryParams: { prompt: 'select_account' } } });
      if (error || !oauth.url) return reply({ error: 'Google sign-in could not start. Please try again or use an email link.' }, 503);
      return reply({ url: oauth.url });
    }
    if (data.action === 'sign-in') {
      const address = validate.email(data.email);
      if (!pilotEmailAllowed(address)) return reply({ error: 'Captain access is currently limited to the invited pilot. Please contact the event team.' }, 403);
      // Only allowlisted inboxes reach this point. Identity setup can precede team registration.
      const { error } = await client.auth.signInWithOtp({ email: address, options: { shouldCreateUser: true, emailRedirectTo: `${SITE_URL}/olympiad/auth/callback` } });
      if (error) return reply({ error: error.status === 429 ? 'Please wait before requesting another sign-in email.' : 'Sign-in email could not be sent. Please try again later.' }, error.status === 429 ? 429 : 503);
      return reply({ ok: true, message: 'Check your email for your secure team-hub link. Open it and select Continue to team hub.' });
    }
    const { data: { user }, error: userError } = await client.auth.getUser();
    if (userError || !user || !user.email_confirmed_at) return reply({ error: 'Please sign in with your verified email first.' }, 401);
    if (['review-team', 'save-followup', 'set-goal'].includes(String(data.action))) {
      const access = await chairmanAccess(client);
      if (!access.ok) return reply({ error: 'Invited chairman Google access is required.' }, access.status);
    }
    if (data.action === 'review-team') {
      const { data: membership, error: membershipError } = await client.from('organizer_memberships').select('user_id').eq('user_id',user.id).maybeSingle();
      if (membershipError) throw membershipError;
      if (!membership) return reply({error:'Organizer access is required.'},403);
      if (typeof data.status !== 'string' || !['pending','approved','needs_changes','declined'].includes(data.status)) throw new validate.PilotInputError('Choose a review decision.');
      if (typeof data.expected_version !== 'number' || !Number.isSafeInteger(data.expected_version) || data.expected_version < 0) throw new validate.PilotInputError('Load the latest saved review first.');
      const message = validate.text(data.message,'Message to captain',2000,['needs_changes','declined'].includes(data.status));
      const memberId = data.referring_club_member_id == null || data.referring_club_member_id === '' ? null : validate.uuid(data.referring_club_member_id);
      if (typeof data.participation_history !== 'string' || !['unclassified','new','returning'].includes(data.participation_history)) throw new validate.PilotInputError('Choose a team history.');
      const { data: review, error } = await client.rpc('review_team_with_history', {p_team_id:validate.uuid(data.team_id),p_status:data.status,p_message:message,p_expected_version:data.expected_version,p_member_id:memberId,p_participation_history:data.participation_history});
      if (error) return reply({error:error.message.includes('Review changed') ? 'This review changed. Load the latest saved review before continuing.' : 'Review could not be saved. Check the team and selected member.'},error.message.includes('Review changed') ? 409 : 400);
      return reply({ok:true,review});
    }
    if (data.action === 'save-followup') {
      const { data: membership, error: membershipError } = await client.from('organizer_memberships').select('user_id').eq('user_id', user.id).maybeSingle();
      if (membershipError) throw membershipError;
      if (!membership) return reply({ error: 'Organizer access is required.' }, 403);
      const teamId = validate.uuid(data.team_id);
      if (typeof data.status !== 'string' || !['not_contacted','contacted','waiting','complete'].includes(data.status) || typeof data.assigned_to !== 'string' || data.assigned_to.length > 120 || typeof data.notes !== 'string' || data.notes.length > 2000) throw new validate.PilotInputError('Check the follow-up status, assigned person and notes.');
      if (data.expected_updated_at != null && (typeof data.expected_updated_at !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(data.expected_updated_at) || !Number.isFinite(Date.parse(data.expected_updated_at)))) throw new validate.PilotInputError('Reload the latest saved follow-up before editing.');
      const date = data.next_follow_up || null;
      if (date && (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0,10) !== date)) throw new validate.PilotInputError('Choose a valid follow-up date.');
      const { data: team, error: teamError } = await client.from('teams').select('id').eq('id',teamId).eq('event_id',event.id).maybeSingle();
      if (teamError) throw teamError;
      if (!team) return reply({ error: 'Team not found.' },404);
      const row = { team_id: teamId, status: data.status, assigned_to: data.assigned_to.trim(), notes: data.notes.trim(), next_follow_up: date, updated_by: user.id };
      // Compare the saved timestamp to avoid overwriting another organizer's work.
      const query = data.expected_updated_at
        ? client.from('team_followups').update(row).eq('team_id',teamId).eq('updated_at',data.expected_updated_at)
        : client.from('team_followups').insert(row);
      const { data: saved, error } = await query.select('team_id,status,assigned_to,notes,next_follow_up,updated_at').maybeSingle();
      if (error?.code === '23505' || (!error && !saved)) return reply({ error: 'This follow-up changed in another session. Load the latest saved follow-up before editing again.' },409);
      if (error) throw error;
      return reply({ok:true, followup:saved});
    }
    if (data.action === 'set-goal') {
      const { data: membership, error: membershipError } = await client.from('organizer_memberships').select('user_id').eq('user_id', user.id).maybeSingle();
      if (membershipError) throw membershipError;
      if (!membership) return reply({ error: 'Organizer access is required.' }, 403);
      const cents = data.stretch_goal_cents;
      if (typeof cents !== 'number' || !Number.isSafeInteger(cents) || cents < 300000 || cents > 1000000000) throw new validate.PilotInputError('Choose a stretch goal between $3,000 and $10,000,000.');
      const teamId = validate.uuid(data.team_id);
      const { data: team, error: teamError } = await client.from('teams').select('id').eq('id',teamId).eq('event_id',event.id).maybeSingle();
      if (teamError) throw teamError;
      if (!team) return reply({ error: 'Team not found.' },404);
      const { error } = await client.from('team_fundraising_goals').upsert({team_id:teamId,stretch_goal_cents:cents},{onConflict:'team_id'});
      if (error) throw error;
      return reply({ok:true});
    }
    if (data.action === 'register') {
      if (!event.registration_open) return reply({ error: 'Registration is not open yet.' }, 403);
      const { data: cohort, error: cohortError } = await client.from('pilot_captains').select('user_id').eq('user_id', user.id).maybeSingle();
      if (cohortError) throw cohortError;
      if (!cohort) return reply({ error: 'Your pilot registration access is not ready yet. Please contact the event team.' }, 403);
      const category = industries.find(i => i.name === data.industry || i.slug === data.industry);
      if (!category) throw new validate.PilotInputError('Choose an industry.');
      const { data: registered, error } = await client.rpc('register_team_with_referral', {
        p_team_name: validate.text(data.name,'Team name',120,true), p_company_name: validate.text(data.company,'Company',160,true),
        p_industry_slug: category.slug, p_captain_name: validate.captainName(data),
        p_phone: validate.phone(data.captain_phone,true), p_is_public: validate.boolean(data.is_public),
        p_referring_team_slug: validate.text(data.invited_by_slug,'Inviting team',160) || null,
        p_member_id: data.referring_club_member_id == null || data.referring_club_member_id === '' ? null : validate.uuid(data.referring_club_member_id),
        p_description: validate.text(data.description,'Description',500),
      });
      if (error) return reply({ error: error.code === '23505' ? 'That team name is already registered for this event.' : 'We could not register your team. Please check your details and try again.' }, 400);
      return reply({ ok: true, team: registered?.[0] }, 201);
    }
    if (data.action === 'save-roster') {
      if (!Number.isInteger(data.expected_version) || Number(data.expected_version)<0) throw new validate.PilotInputError('Please reload your roster before saving.');
      const { error } = await client.rpc('save_roster', { p_team_id: validate.uuid(data.team_id), p_roster: validate.roster(data.roster), p_expected_version: data.expected_version });
      if (error) return reply({ error: error.message.includes('Roster changed') ? 'This roster changed in another session. Reload before saving.' : 'Roster could not be saved. Check your team access and participant details.' }, error.message.includes('Roster changed') ? 409 : 400);
      return reply({ ok: true, roster_version: Number(data.expected_version) + 1 });
    }
    if (data.action === 'update-team') {
      const category = industries.find(i => i.name === data.industry || i.slug === data.industry);
      if (!category) throw new validate.PilotInputError('Choose an industry.');
      const { error } = await client.rpc('update_team_profile_with_referral', {
        p_team_id: validate.uuid(data.team_id), p_team_name: validate.text(data.name,'Team name',120,true),
        p_company_name: validate.text(data.company,'Business name',160,true), p_industry_slug: category.slug,
        p_captain_name: validate.captainName(data), p_phone: validate.phone(data.captain_phone,true),
        p_member_id: data.referring_club_member_id == null || data.referring_club_member_id === '' ? null : validate.uuid(data.referring_club_member_id),
        p_description: validate.text(data.description,'Description',500), p_is_public: validate.boolean(data.is_public),
      });
      if (error) return reply({ error: error.code === '23505' ? 'That team name is already registered.' : 'Team settings could not be saved. Check your details and team access.' },400);
      return reply({ ok: true });
    }
    return reply({ error: 'Unknown request.' }, 400);
  } catch (error) {
    if (error instanceof validate.PilotInputError) return reply({ error: error.message }, 400);
    console.error('Olympiad update failed');
    return reply({ error: 'We could not save your changes. Please try again shortly.' }, 503);
  }
}
