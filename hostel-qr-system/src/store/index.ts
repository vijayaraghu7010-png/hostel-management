import { create } from 'zustand';

interface AppState {
  theme: 'dark' | 'light';
  isSidebarOpen: boolean;
  toggleTheme: () => void;
  setSidebarOpen: (isOpen: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  theme: 'dark',
  isSidebarOpen: false,
  toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
  setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
}));

export * from './authStore';
