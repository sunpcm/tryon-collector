import { create } from 'zustand';

interface IdentityState {
  nickname: string | null;
  setNickname: (name: string) => void;
  clearNickname: () => void;
}

const STORAGE_KEY = 'tryon-nickname';

function loadNickname(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function persistNickname(name: string | null) {
  try {
    if (name) {
      localStorage.setItem(STORAGE_KEY, name);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

export const useIdentityStore = create<IdentityState>(set => ({
  nickname: loadNickname(),
  setNickname: name => {
    persistNickname(name);
    set({ nickname: name });
  },
  clearNickname: () => {
    persistNickname(null);
    set({ nickname: null });
  },
}));
