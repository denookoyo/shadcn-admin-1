import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { db } from '@/lib/data'
import { toast } from 'sonner'

type Setup = { secret: string; otpauth: string }

export function MfaSection() {
  const [enabled, setEnabled] = useState<boolean>(false)
  const [loading, setLoading] = useState(false)
  const [setup, setSetup] = useState<Setup | null>(null)
  const [token, setToken] = useState('')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const r = await db.getMfaStatus?.()
        if (!mounted || !r) return
        setEnabled(!!r.enabled)
      } catch {}
    })()
    return () => {
      mounted = false
    }
  }, [])

  async function startSetup() {
    try {
      setLoading(true)
      const r = await db.mfaSetup?.()
      if (r) setSetup(r)
    } catch (e) {
      toast.error('Failed to start setup')
    } finally {
      setLoading(false)
    }
  }

  async function enable() {
    try {
      setLoading(true)
      const r = await db.mfaEnable?.(token)
      if (r?.enabled) {
        toast.success('Two-factor enabled')
        setEnabled(true)
        setSetup(null)
        setToken('')
      } else {
        toast.error('Invalid code')
      }
    } catch (e) {
      toast.error('Enable failed')
    } finally {
      setLoading(false)
    }
  }

  async function disable() {
    try {
      setLoading(true)
      const r = await db.mfaDisable?.(token)
      if (r && !r.enabled) {
        toast.success('Two-factor disabled')
        setEnabled(false)
        setSetup(null)
        setToken('')
      } else {
        toast.error('Invalid code')
      }
    } catch (e) {
      toast.error('Disable failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='space-y-4'>
      <div>
        <h3 className='text-sm font-medium'>Two-Factor Authentication (TOTP)</h3>
        <p className='text-sm text-muted-foreground'>Use an authenticator app to protect your account.</p>
      </div>
      {!enabled && !setup && (
        <div>
          <Button onClick={startSetup} disabled={loading}>Enable 2FA</Button>
        </div>
      )}
      {!enabled && setup && (
        <div className='space-y-2'>
          <p className='text-sm'>Step 1: Add the account to your authenticator app.</p>
          <div className='rounded border p-3 bg-muted text-sm break-all'>Secret: {setup.secret}</div>
          <a className='text-sm underline underline-offset-4' href={setup.otpauth}>Open in authenticator</a>
          <p className='text-sm pt-2'>Step 2: Enter the 6-digit code to confirm.</p>
          <div className='flex gap-2 max-w-xs'>
            <Input placeholder='123456' value={token} onChange={(e) => setToken(e.target.value)} />
            <Button onClick={enable} disabled={loading || token.length < 6}>Confirm</Button>
          </div>
        </div>
      )}
      {enabled && (
        <div className='space-y-2'>
          <p className='text-sm'>Two-factor is enabled. Enter a current code to disable.</p>
          <div className='flex gap-2 max-w-xs'>
            <Input placeholder='123456' value={token} onChange={(e) => setToken(e.target.value)} />
            <Button variant='destructive' onClick={disable} disabled={loading || token.length < 6}>Disable 2FA</Button>
          </div>
        </div>
      )}
    </div>
  )
}

