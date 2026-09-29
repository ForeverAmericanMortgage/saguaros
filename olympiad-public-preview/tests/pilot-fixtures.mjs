/** Synthetic data only. This module performs no network calls, account creation, or sends. */
export const olympiadProjectRef = 'nwonwhyyvqgqxigrskqc';
export function createPilotFixtures(runId) {
  if (!/^[a-z0-9-]{4,24}$/.test(runId ?? '')) throw new Error('Provide a unique lowercase run ID (4–24 letters, digits, hyphens).');
  const participant = (team, number) => ({
    name: `TEST ${team} Participant ${number}`,
    email: `olympiad-${runId}-${team}-${number}@example.test`,
    phone: `20255501${String(number).padStart(2, '0')}`,
    shirt_size: ['XS','S','M','L','XL','2XL'][number - 1],
    shirt_fit: number % 2 ? 'female' : 'male',
  });
  const team = (owner, suffix, industry, roster) => ({
    fixture_key: `${runId}-${suffix}`, owner,
    registration: {
      action: 'register', name: `TEST ${runId} ${suffix}`, company: `TEST ${suffix} Company`,
      industry, captain_name: `TEST Captain ${owner}`, captain_phone: '2025550100',
      is_public: false, description: 'Synthetic pilot test team. Not an actual participating business.',
      invited_by_slug: '',
    },
    roster,
  });
  return {
    run_id: runId, project_ref: olympiadProjectRef,
    // These identify fixture owners only, not deliverable sign-in addresses.
    captains: [{key:'A', fixture_email:`olympiad-${runId}-captain-a@example.test`}, {key:'B', fixture_email:`olympiad-${runId}-captain-b@example.test`}],
    teams: [
      team('A','Technology','technology',Array.from({length:6},(_,i)=>participant('technology',i+1))),
      team('B','Healthcare','healthcare',[participant('healthcare',1),{name:'TEST Participant Pending',email:'',phone:'',shirt_size:'',shirt_fit:''}]),
      team('A','Property','commercial-real-estate',[]),
    ],
  };
}
