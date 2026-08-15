import { Notification } from "electron";

export function showClerkNotification(title: string, body: string): void {
  if (!Notification.isSupported()) return;
  new Notification({ title: `Clerk`, body: `${title}\n${body}`.trim() }).show();
}
