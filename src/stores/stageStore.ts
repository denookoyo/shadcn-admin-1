import { create } from 'zustand'

export type Stage = 'test' | 'preview' | 'production'

type StageState = {
  stage: Stage
  setStage: (stage: Stage) => void
}

function getInitialStage(): Stage {
  if (typeof window === 'undefined') return 'test'
  const stored = window.localStorage.getItem('hedgetech:stage') as Stage | null
  return stored === 'preview' || stored === 'production' ? stored : 'test'
}

export const useStageStore = create<StageState>((set) => ({
  stage: getInitialStage(),
  setStage: (stage) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('hedgetech:stage', stage)
    }
    set({ stage })
  },
}))
