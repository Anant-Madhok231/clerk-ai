import { PageHeader } from '../components/layout/PageHeader'
import { Spinner } from '../components/ui/Spinner'
import { useAppSettings } from '../lib/useAppSettings'
import { AccountsSection } from './settings/AccountsSection'
import { ClerkSection } from './settings/ClerkSection'
import { NotificationsSection } from './settings/NotificationsSection'
import { AppearanceSection } from './settings/AppearanceSection'
import { AISection } from './settings/AISection'
import { PrivacySection } from './settings/PrivacySection'
import { AboutSection } from './settings/AboutSection'

export function Settings() {
  const { settings, isLoading, update } = useAppSettings()

  return (
    <div className="clerk-page clerk-page-narrow">
      <PageHeader title="Settings" />
      {isLoading || !settings ? (
        <Spinner />
      ) : (
        <>
          <AccountsSection />
          <ClerkSection settings={settings} onChange={update} />
          <NotificationsSection settings={settings} onChange={update} />
          <AppearanceSection settings={settings} onChange={update} />
          <AISection settings={settings} onChange={update} />
          <PrivacySection />
          <AboutSection />
        </>
      )}
    </div>
  )
}
