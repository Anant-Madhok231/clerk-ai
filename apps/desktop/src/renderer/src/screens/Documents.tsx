import { useEffect, useState } from "react";
import type { SourceItem } from "@clerk-ai/core";

export function Documents() {
  const [docs, setDocs] = useState<SourceItem[] | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const refresh = () => window.clerk.listDocumentSources().then(setDocs);

  useEffect(() => {
    refresh();
  }, []);

  async function handleImport() {
    setStatus("Importing...");
    try {
      const result = await window.clerk.importDocument();
      if (!result.imported) {
        setStatus(null);
        return;
      }
      setStatus(
        result.classification === "INFORMATIONAL"
          ? "Imported. No action needed - this looked informational."
          : `Imported and classified as ${result.classification}.`
      );
      refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Import failed.");
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Documents</h1>
        <p className="page-subtitle">Bills, letters, and forms you've imported. PDF, PNG, JPG, and TXT files up to 15 MB.</p>
      </div>

      <div className="button-row" style={{ marginBottom: 20 }}>
        <button type="button" className="button button-primary" onClick={handleImport}>
          Import Document
        </button>
      </div>

      {status && <p className="page-subtitle">{status}</p>}

      {docs?.length === 0 && <div className="empty-state card">No documents imported yet.</div>}

      {docs?.map((doc) => (
        <div key={doc.id} className="card" style={{ marginBottom: 10 }}>
          <p className="situation-title">{doc.fileName}</p>
          <p className="situation-meta">Imported {new Date(doc.createdAt).toLocaleDateString()}</p>
        </div>
      ))}
    </div>
  );
}
