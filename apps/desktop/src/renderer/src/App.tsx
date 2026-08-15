import { useEffect, useState } from 'react'

export function App() {
  const [text, setText] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    window.clerk.getNote().then((note) => setText(note.text))
  }, [])

  async function handleSave(): Promise<void> {
    await window.clerk.setNote(text)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', maxWidth: 480 }}>
      <h1>Clerk</h1>
      <p>Vertical-slice proof: this note round-trips through secure IPC into SQLite.</p>
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={6}
        style={{ width: '100%', fontFamily: 'inherit', fontSize: '1rem' }}
      />
      <div style={{ marginTop: '0.75rem' }}>
        <button onClick={handleSave}>Save</button>
        {saved ? <span style={{ marginLeft: '0.75rem' }}>Saved.</span> : null}
      </div>
    </main>
  )
}
