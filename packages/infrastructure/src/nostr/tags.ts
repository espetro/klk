import type { Coordinates } from './geo';

export interface City {
  slug: string;
  label: string;
  coordinates: Coordinates;
}

export const CITIES: readonly City[] = [
  { slug: 'barcelona', label: 'Barcelona', coordinates: { latitude: 41.3851, longitude: 2.1734 } },
  { slug: 'malaga', label: 'Málaga', coordinates: { latitude: 36.7213, longitude: -4.4214 } },
  { slug: 'valencia', label: 'Valencia', coordinates: { latitude: 39.4699, longitude: -0.3763 } },
  { slug: 'jaen', label: 'Jaén', coordinates: { latitude: 37.7796, longitude: -3.7849 } },
  {
    slug: 'san-francisco',
    label: 'San Francisco',
    coordinates: { latitude: 37.7749, longitude: -122.4194 },
  },
  {
    slug: 'kuala-lumpur',
    label: 'Kuala Lumpur',
    coordinates: { latitude: 3.139, longitude: 101.6869 },
  },
  { slug: 'singapore', label: 'Singapore', coordinates: { latitude: 1.3521, longitude: 103.8198 } },
] as const;

export function slugifyCity(name: string): string {
  return name
    .normalize('NFD')
    .replaceAll(/\p{Diacritic}/gu, '')
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

export const dTag = (value: string): [string, string] => ['d', value];
export const titleTag = (title: string): [string, string] => ['title', title];
export const startTag = (ts: number): [string, string] => ['start', String(ts)];
export const endTag = (ts: number): [string, string] => ['end', String(ts)];
export const locationTag = (location: string): [string, string] => ['location', location];
export const summaryTag = (summary: string): [string, string] => ['summary', summary];
export const imageTag = (url: string): [string, string] => ['image', url];

export type RsvpStatus = 'accepted' | 'declined' | 'tentative';
export const aTag = (coordinate: string): [string, string] => ['a', coordinate];
export const statusTag = (status: RsvpStatus): [string, string] => ['status', status];

export const pTag = (pubkey: string): [string, string] => ['p', pubkey];
export const gTag = (groupId: string): [string, string] => ['g', groupId];
export const eTag = (eventId: string): [string, string] => ['e', eventId];

export function eventCoordinate(kind: number, pubkey: string, d: string): string {
  return `${kind}:${pubkey}:${d}`;
}

export function parseCitySlug(tags: string[][]): string {
  return tags.find(([t, v]) => t === 't' && v?.startsWith('city:'))?.[1]?.replace('city:', '') ?? '';
}
