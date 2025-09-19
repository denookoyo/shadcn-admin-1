import ContentSection from '../components/content-section'
import { AccountForm } from './account-form'
import { MfaSection } from './mfa'

export default function SettingsAccount() {
  return (
    <ContentSection
      title='Account'
      desc='Update your account settings. Set your preferred language and
          timezone.'
    >
      <div className='space-y-8'>
        <AccountForm />
        <div className='mt-8'>
          <MfaSection />
        </div>
      </div>
    </ContentSection>
  )
}
