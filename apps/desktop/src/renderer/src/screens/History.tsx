import { StatusListScreen } from "./StatusListScreen";

export function History() {
  return (
    <StatusListScreen
      status="COMPLETED"
      title="History"
      subtitle="Situations Clerk has resolved."
      emptyMessage="Nothing resolved yet."
    />
  );
}
