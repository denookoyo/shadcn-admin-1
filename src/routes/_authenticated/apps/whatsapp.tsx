import { createFileRoute } from '@tanstack/react-router'
import { WhatsAppIntegration } from '@/features/apps/whatsapp-integration'

export const Route = createFileRoute('/_authenticated/apps/whatsapp')({
  component: WhatsAppIntegration,
})
