import { CircleRecord, PublicEventData } from '@klk/infrastructure';

export type FixtureEvent = PublicEventData & { id: string; pubkey: string };

const NOW = Math.floor(Date.now() / 1000);
const DAY = 86400;

export const FIXTURE_EVENTS: FixtureEvent[] = [
  {
    id: 'fixture-1',
    pubkey: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
    title: 'Barcelona Builders Meetup',
    start: NOW + DAY,
    end: NOW + DAY + 7200,
    location: '2.1686,41.3874',
    summary:
      'Monthly gathering of developers, designers, and creators building the open web. Come share what you are working on, get feedback, and meet collaborators.',
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
    city: 'barcelona',
  },
  {
    id: 'fixture-2',
    pubkey: 'b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3',
    title: 'Jazz Night at El Born',
    start: NOW + DAY * 2,
    end: NOW + DAY * 2 + 10800,
    location: undefined,
    summary: 'Live jazz with local musicians. No cover charge.',
    image: undefined,
    city: 'barcelona',
  },
  {
    id: 'fixture-3',
    pubkey: 'c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
    title: 'Sagrada Familia Sunrise Walk',
    start: NOW + DAY * 3,
    end: NOW + DAY * 3 + 5400,
    location: '2.1744,41.4036',
    summary: undefined,
    image: 'https://images.unsplash.com/photo-1583779457094-ab6f77f7bf57?w=800',
    city: 'barcelona',
  },
  {
    id: 'fixture-4',
    pubkey: 'd4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5',
    title: 'Nostr Protocol Workshop',
    start: NOW + DAY * 4,
    end: 0,
    location: undefined,
    summary: undefined,
    image: undefined,
    city: 'barcelona',
  },
  {
    id: 'fixture-5',
    pubkey: 'e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6',
    title: 'Rooftop Cinema: Open Air Screenings',
    start: NOW + DAY * 5,
    end: NOW + DAY * 5 + 9000,
    location: '2.1734,41.3935',
    summary: 'Classic films under the stars. Bring a blanket.',
    image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800',
    city: 'barcelona',
  },
  {
    id: 'fixture-6',
    pubkey: 'f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1',
    title: 'Street Food Festival',
    start: NOW + DAY * 7,
    end: NOW + DAY * 9,
    location: '2.1734,41.3950',
    summary: 'Three days of food from 40 vendors across Barcelona.',
    image: undefined,
    city: 'barcelona',
  },
];

export const FIXTURE_CIRCLES: CircleRecord[] = [
  {
    id: 'fixture-circle-1',
    name: 'BCN Builders',
    symKey: 'fixture-sym-key-1',
    members: [
      'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
      'b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3',
      'c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
    ],
    createdAt: NOW - DAY * 30,
  },
  {
    id: 'fixture-circle-2',
    name: 'Jazz Crew',
    symKey: 'fixture-sym-key-2',
    members: [
      'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
      'd4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5',
    ],
    createdAt: NOW - DAY * 14,
  },
  {
    id: 'fixture-circle-3',
    name: 'New Circle',
    symKey: 'fixture-sym-key-3',
    members: [],
    createdAt: NOW - DAY,
  },
];

export const FIXTURE_ATTENDEES = [
  {
    pubkey: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
    name: 'Emily',
    rsvpStatus: 'going' as const,
  },
  {
    pubkey: 'b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3',
    name: 'Max',
    rsvpStatus: 'going' as const,
  },
  {
    pubkey: 'c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
    name: 'Chelsea',
    rsvpStatus: 'going' as const,
  },
  {
    pubkey: 'd4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5',
    name: 'Jordan',
    rsvpStatus: 'maybe' as const,
  },
  {
    pubkey: 'e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6',
    name: 'Alex',
    rsvpStatus: 'going' as const,
  },
  {
    pubkey: 'f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1',
    name: 'Sam',
    rsvpStatus: 'not_going' as const,
  },
  {
    pubkey: 'a7b8c9d0e1f2a7b8c9d0e1f2a7b8c9d0e1f2a7b8c9d0e1f2a7b8c9d0e1f2a7b8',
    name: undefined,
    rsvpStatus: 'going' as const,
  },
  {
    pubkey: 'b8c9d0e1f2a7b8c9d0e1f2a7b8c9d0e1f2a7b8c9d0e1f2a7b8c9d0e1f2a7b8c9',
    name: 'Maya',
    rsvpStatus: 'going' as const,
  },
  {
    pubkey: 'c9d0e1f2a7b8c9d0e1f2a7b8c9d0e1f2a7b8c9d0e1f2a7b8c9d0e1f2a7b8c9d0',
    name: 'Luca',
    rsvpStatus: 'going' as const,
  },
  {
    pubkey: 'd0e1f2a7b8c9d0e1f2a7b8c9d0e1f2a7b8c9d0e1f2a7b8c9d0e1f2a7b8c9d0e1',
    name: 'Nadia',
    rsvpStatus: 'maybe' as const,
  },
];
