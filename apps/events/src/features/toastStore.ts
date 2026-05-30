import type { ToastMessage } from '@/components/toast';
import { atom } from 'nanostores';

export const $toast = atom<ToastMessage | null>(null);

export function showToast(message: string): void {
  const id = `${Date.now()}`;
  $toast.set({ id, message });
}

export function hideToast(): void {
  $toast.set(null);
}
