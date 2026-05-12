import { create } from 'zustand';
import { fetchTags, type TagsConfig } from '@/api/client';

interface TagsState {
  businessLines: string[];
  categories: string[];
  loaded: boolean;
  loadError: string | null;
  loadTags: (force?: boolean) => Promise<void>;
  invalidate: () => void;
}

export const useTagsStore = create<TagsState>((set, get) => ({
  businessLines: [],
  categories: [],
  loaded: false,
  loadError: null,
  loadTags: async force => {
    if (!force && get().loaded) return;
    try {
      const tags: TagsConfig = await fetchTags();
      set({
        businessLines: tags.business_lines,
        categories: tags.categories,
        loaded: true,
        loadError: null,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({
        businessLines: [],
        categories: [],
        loaded: true,
        loadError: msg,
      });
    }
  },
  invalidate: () => set({ loaded: false }),
}));
