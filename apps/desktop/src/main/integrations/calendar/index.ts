import type { Db } from '../../db/client'
import { GOOGLE_SCOPES } from '../google/oauthClient'
import { performGoogleOAuthConnection } from '../google/googleOAuthConnection'
import { clearTokens, loadTokens, saveTokens } from './tokenStore'
import { createEvent, type CreateEventInput, type CreatedEvent } from './calendarClient'

export interface CalendarAdapterOptions {
  clientId: string
}

/** Facade over Google Calendar OAuth + event creation, mirroring GmailAdapter's shape. */
export class CalendarAdapter {
  constructor(
    private readonly db: Db,
    private readonly options: CalendarAdapterOptions
  ) {}

  isConnected(): boolean {
    return loadTokens(this.db) !== null
  }

  async connect(): Promise<void> {
    const tokens = await performGoogleOAuthConnection({
      clientId: this.options.clientId,
      scope: GOOGLE_SCOPES.calendarEvents,
      serviceName: 'Google Calendar'
    })
    saveTokens(this.db, tokens)
  }

  disconnect(): void {
    clearTokens(this.db)
  }

  async createEvent(input: CreateEventInput): Promise<CreatedEvent> {
    const tokens = loadTokens(this.db)
    if (!tokens) throw new Error('Google Calendar is not connected.')
    return createEvent(tokens.accessToken, input)
  }
}
