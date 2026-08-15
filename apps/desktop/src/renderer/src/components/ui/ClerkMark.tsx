/** The Clerk app mark: a rounded tile with a checkmark — legible down to tray-icon size. Source of truth for the generated app/tray/favicon icons (see scripts/generate-icons.mjs). */
export function ClerkMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" fill="#3457D5" />
      <path
        d="M12 20.5L17.4 26L28.5 14.2"
        stroke="white"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
