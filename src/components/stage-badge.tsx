import { useStageStore } from '@/stores/stageStore'
import { cn } from '@/lib/utils'

const stageClassMap: Record<'test' | 'preview' | 'production', string> = {
  test: 'border-amber-200 bg-amber-50 text-amber-700',
  preview: 'border-sky-200 bg-sky-50 text-sky-700',
  production: 'border-emerald-200 bg-emerald-50 text-emerald-700',
}

export function StageBadge({ className }: { className?: string }) {
  const stage = useStageStore((state) => state.stage)
  const label = stage === 'production' ? 'Production' : stage === 'preview' ? 'Preview' : 'Test'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide',
        stageClassMap[stage],
        className,
      )}
    >
      <span className='size-2 rounded-full border border-current bg-current/20' aria-hidden />
      {label}
    </span>
  )
}
