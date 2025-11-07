import { createFileRoute } from '@tanstack/react-router'
import { SalesAssistant } from '@/features/assistant/sales-assistant'
import { MarketplacePageShell } from '@/features/marketplace/page-shell'

export const Route = createFileRoute('/marketplace/_layout/assistant/')({
  component: AssistantRoute,
})

function AssistantRoute() {
  return (
    <MarketplacePageShell width='wide' className='flex flex-col gap-6 lg:pt-12 lg:pb-16'>
      <header className='space-y-2'>
        <h1 className='text-3xl font-semibold tracking-tight'>AI Concierge</h1>
        <p className='max-w-2xl text-sm text-muted-foreground'>Chat-first commerce assistant that understands your catalogue, books services, and completes checkout with live payment links.</p>
      </header>
      <SalesAssistant />
    </MarketplacePageShell>
  )
}
