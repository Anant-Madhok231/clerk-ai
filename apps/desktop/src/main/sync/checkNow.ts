import type { Db } from '../db/client'
import type { AIProvider } from '../ai/AIProvider'
import type { GmailAdapter } from '../integrations/gmail'
import type { ProcessResult } from '../pipeline/processSourceItem'
import { getAppSettings } from '../settings/appSettings'
import { notifyForResults, notifyUpcomingDeadlines } from '../notifications/notifyForResults'
import { broadcastSituationsChanged, broadcastSyncStatusChanged } from '../events/broadcast'
import { recordCheckCompleted, setChecking } from './syncStatus'

export interface CheckNowDependencies {
  db: Db
  aiProvider: AIProvider
  gmailAdapter: GmailAdapter
}

export interface CheckNowResult {
  checked: boolean
  results: ProcessResult[]
}

/** shared by "check inbox now", the tray menu item, and the background scheduler - one real implementation, not three copies */
export async function checkGmailNow(deps: CheckNowDependencies): Promise<CheckNowResult> {
  if (!deps.gmailAdapter.isConnected()) return { checked: false, results: [] }

  setChecking(true)
  broadcastSyncStatusChanged()
  try {
    const results = await deps.gmailAdapter.sync(deps.aiProvider)
    recordCheckCompleted(deps.db)
    if (results.length > 0) broadcastSituationsChanged()

    const settings = getAppSettings(deps.db)
    notifyForResults(deps.db, settings, results)
    notifyUpcomingDeadlines(deps.db, settings)

    return { checked: true, results }
  } finally {
    setChecking(false)
    broadcastSyncStatusChanged()
  }
}
