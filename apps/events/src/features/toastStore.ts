import { atom } from 'nanostores';
import type { ToastMessage } from '@/components/toast';

export const $toast = atom<ToastMessage | null>(null);

export function showToast(message: string): void {
  const id = `${Date.now()}`;
  $toast.set({ id, message });
}

export function hideToast(): void {
  $toast.set(null);
}
