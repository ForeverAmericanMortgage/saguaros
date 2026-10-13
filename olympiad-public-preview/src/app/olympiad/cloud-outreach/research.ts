export function researchCompany(input: unknown) {
  if (!input || typeof input !== 'object') throw Error('Company required');
  const row = input as Record<string, unknown>;
  const company = typeof row.company === 'string' ? row.company.trim() : '';
  const domain = typeof row.domain === 'string' ? row.domain.trim().toLowerCase() : '';
  if (!company || company.length > 200 || /[\r\n]/.test(company) || domain.length > 253 || !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain)) throw Error('Company and root domain required');
  return {company, domain};
}

export function researchReservation(input: unknown) {
  const row = input as Record<string, unknown>;
  const id = typeof row?.reservation_id === 'string' ? row.reservation_id : '';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw Error('Research reservation required');
  return id;
}
