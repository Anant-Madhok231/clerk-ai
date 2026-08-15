import { migration0001Init } from './0001-init'

export interface Migration {
  id: string
  sql: string
}

export const migrations: Migration[] = [migration0001Init]
