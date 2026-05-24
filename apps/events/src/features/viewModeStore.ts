import { useStore } from '@nanostores/react';
import { atom } from 'nanostores';

export type ViewMode = 'list' | 'map';

export const $viewMode = atom<ViewMode>('list');

export function useViewMode(): ViewMode {
  return useStore($viewMode);
}
