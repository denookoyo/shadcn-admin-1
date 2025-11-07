import { createFileRoute } from '@tanstack/react-router'
import { TelegramIntegration } from '@/features/apps/telegram-integration'

export const Route = createFileRoute('/_authenticated/apps/telegram')({
  component: TelegramIntegration,
})
