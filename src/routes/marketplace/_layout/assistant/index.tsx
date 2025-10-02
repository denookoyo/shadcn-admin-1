import { createFileRoute } from '@tanstack/react-router'
import { SalesAssistant } from '@/features/assistant/sales-assistant'

export const Route = createFileRoute('/marketplace/_layout/assistant/')({
  component: AssistantRoute,
})

function AssistantRoute() {
  return (
    <div className='mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 lg:py-12'>
      <header className='space-y-2'>
        <h1 className='text-3xl font-semibold tracking-tight'>AI Concierge</h1>
        <p className='max-w-2xl text-sm text-muted-foreground'>Chat-first commerce assistant that understands your catalogue, books services, and completes checkout with live payment links.</p>
      </header>
      <SalesAssistant />
    </div>
  )
}
