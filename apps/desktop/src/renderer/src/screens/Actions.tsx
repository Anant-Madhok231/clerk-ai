import { StatusListScreen } from "./StatusListScreen";

export function Actions() {
  return (
    <StatusListScreen
      status="ACTION"
      title="Actions"
      subtitle="Things you need to do."
      emptyMessage="Nothing needs action right now."
    />
  );
}
