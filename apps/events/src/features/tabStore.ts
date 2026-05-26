import { atom } from 'nanostores';

export const $lastActiveTab = atom<'events' | 'circles'>('events');
