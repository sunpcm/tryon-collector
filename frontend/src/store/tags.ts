import { create } from 'zustand';
import { fetchTags, type TagsConfig } from '@/api/client';

interface TagsState {
  businessLines: string[];
  categories: string[];
  loaded: boolean;
  loadTags: () => Promise<void>;
}

export const useTagsStore = create<TagsState>(set => ({
  businessLines: [],
  categories: [],
  loaded: false,
  loadTags: async () => {
    try {
      const tags: TagsConfig = await fetchTags();
      set({
        businessLines: tags.business_lines,
        categories: tags.categories,
        loaded: true,
      });
    } catch {
      // fallback to defaults on error
      set({
        businessLines: [
          '春季女装',
          '秋季女装',
          '春季男装',
          '秋季男装',
          '童装',
          '配饰',
        ],
        categories: [
          '连衣裙',
          '上衣',
          '裤子',
          '外套',
          '裙子',
          '鞋履',
          '包袋',
          '其他',
        ],
        loaded: true,
      });
    }
  },
}));
