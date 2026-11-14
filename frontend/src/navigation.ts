export type Page = 'dashboard' | 'sign-to-text' | 'text-to-sign'

export interface NavItem {
  id: Page
  label: string
  description: string
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', description: 'Overview and status' },
  { id: 'sign-to-text', label: 'Sign → Text', description: 'Webcam landmark capture' },
  { id: 'text-to-sign', label: 'Text → Sign', description: 'ISL video retrieval' },
]
