export class PilotInputError extends Error {}
export function text(value: unknown, label: string, max: number, required = false): string {
  if (value !== undefined && value !== null && typeof value !== 'string') throw new PilotInputError(`${label} must be text.`);
  const result = typeof value === 'string' ? value.trim() : '';
  if (required && !result) throw new PilotInputError(`${label} is required.`);
  if (result.length > max) throw new PilotInputError(`${label} must be ${max} characters or fewer.`);
  return result;
}
export function email(value: unknown, required = true) {
  const result = text(value, 'Email', 254, required).toLowerCase();
  if (result && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) throw new PilotInputError('Enter a valid email address.');
  return result;
}
export function phone(value: unknown, required = false) {
  const result = text(value, 'Phone number', 40, required);
  if (result && !/^[+\d().\s-]+$/.test(result)) throw new PilotInputError('Enter a valid phone number.');
  if (result && (result.replace(/\D/g, '').length < 10 || result.replace(/\D/g, '').length > 15)) throw new PilotInputError('Phone numbers need 10 to 15 digits.');
  return result;
}
export function uuid(value: unknown) {
  const result = text(value, 'Team ID', 36, true);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(result)) throw new PilotInputError('Invalid record ID.');
  return result;
}
export function boolean(value: unknown) {
  if (typeof value !== 'boolean') throw new PilotInputError('Choose whether to list your team publicly.');
  return value;
}
export function roster(value: unknown) {
  if (!Array.isArray(value) || value.length > 50) throw new PilotInputError('A roster can contain up to 50 participants.');
  const seen = new Set<string>();
  return value.map((item: unknown) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new PilotInputError('Invalid participant.');
    const row = item as Record<string, unknown>;
    const address = email(row.email, false);
    if (address && seen.has(address)) throw new PilotInputError('Each participant needs a different email address.');
    if (address) seen.add(address);
    const size = text(row.shirt_size, 'Shirt size', 5);
    const fit = text(row.shirt_fit, 'Shirt fit', 10).toLowerCase();
    if (!['','XS','S','M','L','XL','2XL','3XL'].includes(size) || !['','male','female'].includes(fit)) throw new PilotInputError('Choose a listed shirt size and fit.');
    return { ...(row.id ? { id: uuid(row.id) } : {}), name: text(row.name, 'Participant name', 120), email: address, phone: phone(row.phone), shirt_size: size, shirt_fit: fit };
  }).filter(row => row.name || row.email || row.phone || row.shirt_size || row.shirt_fit);
}

export function captainName(data: Record<string, unknown>): string {
  if (data.captain_first_name !== undefined || data.captain_last_name !== undefined) {
    const first = text(data.captain_first_name, 'Captain first name', 120, true);
    const last = text(data.captain_last_name, 'Captain last name', 120, true);
    return text(`${first} ${last}`, 'Captain full name', 120, true);
  }
  // Accept complete names from a form opened before deployment.
  const full = text(data.captain_name, 'Captain full name', 120, true);
  if (full.split(/\s+/).length < 2) throw new PilotInputError('Enter the captain’s first and last name.');
  return full;
}
