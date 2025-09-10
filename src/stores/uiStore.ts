import { create } from 'zustand'

interface UiState {
  hideMarketplaceChrome: boolean
  setHideMarketplaceChrome: (hidden: boolean) => void
}

export const useUiStore = create<UiState>()((set) => ({
  hideMarketplaceChrome: false,
  setHideMarketplaceChrome: (hidden) => set({ hideMarketplaceChrome: hidden }),
}))

