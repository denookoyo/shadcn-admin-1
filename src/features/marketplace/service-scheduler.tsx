import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import { db, type ProductAvailability } from '@/lib/data'
import { cn } from '@/lib/utils'

const dayFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
})

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
})

type ServiceSchedulerProps = {
  productId: string
  value: string | null
  onChange: (value: string | null) => void
}

function findFirstSelectableDay(data: ProductAvailability | null) {
  if (!data) return null
  const first = data.days.find((day) => day.isOpen && day.slots.some((slot) => slot.available))
  return first?.date ?? data.days[0]?.date ?? null
}

export function ServiceScheduler({ productId, value, onChange }: ServiceSchedulerProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [availability, setAvailability] = useState<ProductAvailability | null>(null)
  const [activeDay, setActiveDay] = useState<string | null>(null)
  const hasApi = typeof db.getProductAvailability === 'function'

  const loadAvailability = useCallback(async () => {
    if (!hasApi) {
      setError('Availability API is not enabled in this environment.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await db.getProductAvailability!(productId, { days: 21 })
      setAvailability(data)
      setActiveDay((current) => current ?? findFirstSelectableDay(data))
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to load availability'
      setError(message)
      setAvailability(null)
    } finally {
      setLoading(false)
    }
  }, [hasApi, productId])

  useEffect(() => {
    loadAvailability()
  }, [loadAvailability])

  useEffect(() => {
    if (!availability) return
    if (!value) {
      setActiveDay((current) => current ?? findFirstSelectableDay(availability))
      return
    }
    const dayKey = new Date(value).toISOString().slice(0, 10)
    setActiveDay(dayKey)
  }, [availability, value])

  const activeDayData = useMemo(() => {
    if (!availability || !activeDay) return null
    return availability.days.find((day) => day.date === activeDay) ?? null
  }, [availability, activeDay])

  if (!hasApi) {
    return (
      <div className='rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700'>
        Service scheduling is disabled in offline mode.
      </div>
    )
  }

  if (loading && !availability) {
    return (
      <div className='flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600'>
        <Loader2 className='h-4 w-4 animate-spin text-emerald-600' />
        Checking availability…
      </div>
    )
  }

  if (error) {
    return (
      <div className='space-y-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700'>
        <div>{error}</div>
        <button
          type='button'
          className='inline-flex items-center gap-1 rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100'
          onClick={loadAvailability}
        >
          <RefreshCw className='h-3.5 w-3.5' /> Try again
        </button>
      </div>
    )
  }

  if (!availability) {
    return null
  }

  return (
    <div className='space-y-3'>
      <div className='flex items-center justify-between text-xs text-slate-500'>
        <span>Select a date</span>
        <button
          type='button'
          className='inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-600 hover:border-emerald-200 hover:text-emerald-700'
          onClick={loadAvailability}
        >
          <RefreshCw className='h-3.5 w-3.5' /> Refresh
        </button>
      </div>

      <div className='flex gap-2 overflow-x-auto pb-2'>
        {availability.days.map((day) => {
          const isActive = day.date === activeDay
          const label = dayFormatter.format(new Date(`${day.date}T00:00:00`))
          return (
            <button
              key={day.date}
              type='button'
              className={cn(
                'min-w-[120px] rounded-2xl border px-3 py-2 text-left text-xs transition',
                isActive ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300'
              )}
              onClick={() => setActiveDay(day.date)}
            >
              <div className='font-semibold'>{label}</div>
              <div className='mt-1 text-[11px]'>{day.isOpen ? `${day.remaining} of ${day.capacity} slots free` : 'Closed'}</div>
            </button>
          )
        })}
      </div>

      <div className='rounded-2xl border border-slate-200 bg-white p-3'>
        {!activeDayData || !activeDayData.isOpen ? (
          <div className='text-xs text-slate-500'>Select another day — this one is closed.</div>
        ) : activeDayData.slots.length === 0 ? (
          <div className='text-xs text-slate-500'>This day has no bookable slots. Try refreshing or choosing a different day.</div>
        ) : (
          <div className='grid grid-cols-2 gap-2 sm:grid-cols-3'>
            {activeDayData.slots.map((slot) => {
              const isSelected = value === slot.start
              const disabled = !slot.available && !isSelected
              const label = timeFormatter.format(new Date(slot.start))
              return (
                <button
                  key={slot.start}
                  type='button'
                  disabled={disabled}
                  className={cn(
                    'rounded-full border px-3 py-2 text-xs font-semibold transition',
                    isSelected
                      ? 'border-emerald-600 bg-emerald-600 text-white shadow'
                      : disabled
                        ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-emerald-400 hover:text-emerald-700'
                  )}
                  onClick={() => onChange(isSelected ? null : slot.start)}
                >
                  {label}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
