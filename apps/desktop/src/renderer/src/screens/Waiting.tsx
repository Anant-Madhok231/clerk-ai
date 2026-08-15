import { StatusListScreen } from "./StatusListScreen";

export function Waiting() {
  return (
    <StatusListScreen
      status="WAITING"
      title="Waiting"
      subtitle="Things you're waiting on someone else for."
      emptyMessage="Nothing pending right now."
    />
  );
}
