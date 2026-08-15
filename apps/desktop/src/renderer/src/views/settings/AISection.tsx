import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AppSettingsPatchView, AppSettingsView } from '@shared/ipc-channels'
import { queryKeys } from '../../lib/queryClient'
import { useToastStore } from '../../lib/toast'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { Button } from '../../components/ui/Button'
import sectionStyles from './SettingsSection.module.css'
import styles from './AISection.module.css'

export function AISection({
  settings,
  onChange
}: {
  settings: AppSettingsView
  onChange: (patch: AppSettingsPatchView) => void
}) {
  const queryClient = useQueryClient()
  const showToast = useToastStore((state) => state.show)
  const [apiKeyInput, setApiKeyInput] = useState('')

  const { data: hasKey } = useQuery({
    queryKey: queryKeys.hasOpenAIApiKey,
    queryFn: () => window.clerk.hasOpenAIApiKey()
  })

  const saveKey = useMutation({
    mutationFn: (apiKey: string) => window.clerk.setOpenAIApiKey(apiKey),
    onSuccess: () => {
      setApiKeyInput('')
      queryClient.invalidateQueries({ queryKey: queryKeys.hasOpenAIApiKey })
      showToast('OpenAI API key saved.', 'success')
    },
    onError: (error: Error) => showToast(error.message, 'error')
  })

  const clearKey = useMutation({
    mutationFn: () => window.clerk.clearOpenAIApiKey(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.hasOpenAIApiKey })
  })

  return (
    <section className={sectionStyles.section}>
      <p className={sectionStyles.heading}>AI Provider</p>
      <p className={sectionStyles.description}>
        Demo Mode classifies with deterministic rules and needs no credentials. OpenAI uses your own API key.
      </p>
      <div className={sectionStyles.card}>
        <div className={sectionStyles.row}>
          <p className={sectionStyles.rowLabel}>Provider</p>
          <SegmentedControl
            value={settings.aiProviderKind}
            onChange={(aiProviderKind) => onChange({ aiProviderKind })}
            options={[
              { value: 'demo', label: 'Demo' },
              { value: 'openai', label: 'OpenAI' }
            ]}
          />
        </div>
        {settings.aiProviderKind === 'openai' && (
          <div className={styles.keyRow}>
            <input
              type="password"
              className={styles.keyInput}
              placeholder={hasKey ? 'Key saved — enter a new one to replace it' : 'sk-...'}
              value={apiKeyInput}
              onChange={(event) => setApiKeyInput(event.target.value)}
            />
            {hasKey ? (
              <Button variant="ghost" size="sm" onClick={() => clearKey.mutate()}>
                Clear
              </Button>
            ) : null}
            <Button
              variant="secondary"
              size="sm"
              disabled={!apiKeyInput || saveKey.isPending}
              onClick={() => saveKey.mutate(apiKeyInput)}
            >
              Save
            </Button>
          </div>
        )}
      </div>
    </section>
  )
}
