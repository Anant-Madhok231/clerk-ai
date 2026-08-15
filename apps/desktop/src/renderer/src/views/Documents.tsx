import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, FileText, Upload, XCircle } from 'lucide-react'
import { queryKeys } from '../lib/queryClient'
import { PageHeader } from '../components/layout/PageHeader'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import styles from './Documents.module.css'

interface QueueEntry {
  id: string
  fileName: string
  status: 'reading' | 'done' | 'duplicate' | 'error'
  detail?: string
}

export function Documents() {
  const [queue, setQueue] = useState<QueueEntry[]>([])
  const [dragActive, setDragActive] = useState(false)
  const queryClient = useQueryClient()

  const importPaths = useCallback(
    async (paths: { fileName: string; filePath: string }[]) => {
      for (const { fileName, filePath } of paths) {
        const id = crypto.randomUUID()
        setQueue((q) => [{ id, fileName, status: 'reading' }, ...q])
        try {
          const result = await window.clerk.importDocument(filePath)
          setQueue((q) =>
            q.map((entry) =>
              entry.id === id
                ? {
                    ...entry,
                    status: result.outcome === 'skipped-duplicate' ? 'duplicate' : 'done',
                    detail:
                      result.outcome === 'skipped-duplicate'
                        ? 'Already imported'
                        : result.status === 'INFORMATIONAL'
                          ? 'No action needed'
                          : `Added as ${result.status?.toLowerCase()}`
                  }
                : entry
            )
          )
          queryClient.invalidateQueries({ queryKey: queryKeys.situations })
        } catch (error) {
          setQueue((q) =>
            q.map((entry) =>
              entry.id === id ? { ...entry, status: 'error', detail: (error as Error).message } : entry
            )
          )
        }
      }
    },
    [queryClient]
  )

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      setDragActive(false)
      const files = Array.from(event.dataTransfer.files).map((file) => ({
        fileName: file.name,
        filePath: window.clerkFiles.getPathForFile(file)
      }))
      void importPaths(files)
    },
    [importPaths]
  )

  async function handleBrowse(): Promise<void> {
    const filePaths = await window.clerk.showOpenDocumentDialog()
    if (filePaths.length === 0) return
    void importPaths(filePaths.map((filePath) => ({ fileName: filePath.split(/[/\\]/).pop() ?? filePath, filePath })))
  }

  return (
    <div className="clerk-page">
      <PageHeader
        title="Documents"
        subtitle="Import a bill, form, or scan and Clerk will read it the same way it reads email."
        actions={
          <Button variant="primary" onClick={handleBrowse}>
            Import
          </Button>
        }
      />

      <div
        className={`${styles.dropzone} ${dragActive ? styles.dropzoneActive : ''}`}
        onDragOver={(event) => {
          event.preventDefault()
          setDragActive(true)
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
      >
        <Upload className={styles.dropzoneIcon} strokeWidth={1.5} />
        <p className={styles.dropzoneTitle}>Drag files here</p>
        <p className={styles.dropzoneHint}>PDF, TXT, PNG, or JPEG — up to 20MB</p>
      </div>

      {queue.length > 0 && (
        <div className={styles.queue}>
          {queue.map((entry) => (
            <div key={entry.id} className={`${styles.queueItem} clerk-fade-in`}>
              <div className={styles.queueIcon}>
                {entry.status === 'reading' ? (
                  <Spinner size={16} />
                ) : entry.status === 'error' ? (
                  <XCircle size={16} />
                ) : (
                  <FileText size={16} />
                )}
              </div>
              <div>
                <p className={styles.queueName}>{entry.fileName}</p>
                <p
                  className={`${styles.queueStatus} ${
                    entry.status === 'error'
                      ? styles.queueStatusError
                      : entry.status === 'done'
                        ? styles.queueStatusDone
                        : ''
                  }`}
                >
                  {entry.status === 'reading' ? 'Reading document…' : entry.detail}
                </p>
              </div>
              {entry.status === 'done' && <CheckCircle2 size={16} color="var(--color-completed)" />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
