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
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function cityTag(name: string): [string, string] {
  return ['t', `city:${slugifyCity(name)}`];
}

export function cityTagValue(name: string): string {
  return `city:${slugifyCity(name)}`;
}
