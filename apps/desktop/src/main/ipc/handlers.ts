import { ipcMain } from 'electron'
import type Database from 'better-sqlite3'
import { IPC_CHANNELS, SetNoteRequestSchema, type Note } from '@shared/ipc-contract'
import { getNote, setNote } from '../notes/noteStore'

export function registerIpcHandlers(db: Database.Database): void {
  ipcMain.handle(IPC_CHANNELS.getNote, (): Note => {
    return { text: getNote(db) }
  })

  ipcMain.handle(IPC_CHANNELS.setNote, (_event, payload: unknown): Note => {
    const { text } = SetNoteRequestSchema.parse(payload)
    setNote(db, text)
    return { text }
  })
}
