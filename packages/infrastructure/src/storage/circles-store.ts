import { deleteSecure, getSecure, setSecure } from './secure';

export interface CircleRecord {
  id: string;
  name: string;
  symKey: string;
  members: string[];
  createdAt?: number;
}

const INDEX_KEY = 'circles_index';

async function getIndex(): Promise<string[]> {
  const raw = await getSecure(INDEX_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function setIndex(ids: string[]): Promise<void> {
  await setSecure(INDEX_KEY, JSON.stringify(ids));
}

export async function saveCircle(circle: CircleRecord): Promise<void> {
  const ids = await getIndex();
  if (!ids.includes(circle.id)) {
    await setIndex([...ids, circle.id]);
  }
  await setSecure(`circle_${circle.id}`, JSON.stringify(circle));
}

export async function getCircle(id: string): Promise<CircleRecord | null> {
  const raw = await getSecure(`circle_${id}`);
  return raw ? JSON.parse(raw) : null;
}

export async function getAllCircles(): Promise<CircleRecord[]> {
  const ids = await getIndex();
  const circles = await Promise.all(ids.map((_) => getCircle(_)));
  return circles.filter(Boolean);
}

export async function deleteCircle(id: string): Promise<void> {
  const ids = await getIndex();
  await setIndex(ids.filter((i) => i !== id));
  await deleteSecure(`circle_${id}`);
}
