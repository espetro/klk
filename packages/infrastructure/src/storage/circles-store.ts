import { deleteSecure, getSecure, setSecure } from './secure';

export interface GroupRecord {
  id: string;
  name: string;
  symKey: string;
  members: string[];
}

const INDEX_KEY = 'groups_index';

async function getIndex(): Promise<string[]> {
  const raw = await getSecure(INDEX_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function setIndex(ids: string[]): Promise<void> {
  await setSecure(INDEX_KEY, JSON.stringify(ids));
}

export async function saveGroup(group: GroupRecord): Promise<void> {
  const ids = await getIndex();
  if (!ids.includes(group.id)) {
    await setIndex([...ids, group.id]);
  }
  await setSecure(`group_${group.id}`, JSON.stringify(group));
}

export async function getGroup(id: string): Promise<GroupRecord | null> {
  const raw = await getSecure(`group_${id}`);
  return raw ? JSON.parse(raw) : null;
}

export async function getAllGroups(): Promise<GroupRecord[]> {
  const ids = await getIndex();
  const groups = await Promise.all(ids.map(getGroup));
  return groups.filter(Boolean) as GroupRecord[];
}

export async function deleteGroup(id: string): Promise<void> {
  const ids = await getIndex();
  await setIndex(ids.filter((i) => i !== id));
  await deleteSecure(`group_${id}`);
}
