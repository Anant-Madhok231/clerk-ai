import type { Db } from '../../db/client'
import { GOOGLE_SCOPES } from '../google/oauthClient'
import { ensureFreshAccessToken, performGoogleOAuthConnection } from '../google/googleOAuthConnection'
import { clearTokens, loadTokens, saveTokens } from './tokenStore'
import { createEvent, listUpcomingEvents, type CreateEventInput, type CreatedEvent, type UpcomingEvent } from './calendarClient'

export interface CalendarAdapterOptions {
  clientId: string
  clientSecret: string
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
      clientSecret: this.options.clientSecret,
      scope: GOOGLE_SCOPES.calendarEvents,
      serviceName: 'Google Calendar'
    })
    saveTokens(this.db, tokens)
  }

  disconnect(): void {
    clearTokens(this.db)
  }

  /** Loads stored tokens, transparently refreshing an expired access token before returning it. */
  private async getValidAccessToken(): Promise<string> {
    const tokens = loadTokens(this.db)
    if (!tokens) throw new Error('Google Calendar is not connected.')
    return ensureFreshAccessToken(tokens, this.options, (updated) => saveTokens(this.db, updated))
  }

  async createEvent(input: CreateEventInput): Promise<CreatedEvent> {
    const accessToken = await this.getValidAccessToken()
    return createEvent(accessToken, input)
  }

  async listUpcomingEvents(maxResults = 10): Promise<UpcomingEvent[]> {
    const accessToken = await this.getValidAccessToken()
    return listUpcomingEvents(accessToken, { maxResults })
  }
}
