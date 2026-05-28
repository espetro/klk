export const CITIES = [
  { slug: 'barcelona', label: 'Barcelona' },
  { slug: 'madrid', label: 'Madrid' },
  { slug: 'nyc', label: 'New York' },
  { slug: 'london', label: 'London' },
  { slug: 'berlin', label: 'Berlin' },
];

export function slugifyCity(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replaceAll(/\s+/gu, '-')
    .replaceAll(/[^a-z0-9-]/gu, '')
    .replaceAll(/-+/gu, '-')
    .replaceAll(/^-|-$/gu, '');
}

export function cityTag(name: string): [string, string] {
  return ['t', `city:${slugifyCity(name)}`];
}

export function cityTagValue(name: string): string {
  return `city:${slugifyCity(name)}`;
}
