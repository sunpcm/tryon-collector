import { create } from 'zustand';

export interface EditingBundle {
  task_id: string;
  designer_id: string;
  business_line: string;
  category: string;
  title: string;
  optional_notes: string;
  group_key: string;
}

export interface EditingShowcase {
  showcase_id: string;
  uploader: string;
  brand: string;
  purpose: string;
}

interface EditingState {
  bundle: EditingBundle | null;
  showcase: EditingShowcase | null;
  setBundle: (b: EditingBundle | null) => void;
  setShowcase: (s: EditingShowcase | null) => void;
  clear: () => void;
}

export const useEditingStore = create<EditingState>(set => ({
  bundle: null,
  showcase: null,
  setBundle: bundle => set({ bundle }),
  setShowcase: showcase => set({ showcase }),
  clear: () => set({ bundle: null, showcase: null }),
}));
