export type Page = 'dashboard' | 'sign-to-text' | 'text-to-sign' | 'learn'

export interface NavItem {
  id: Page
  label: string
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'sign-to-text', label: 'Sign → Text' },
  { id: 'text-to-sign', label: 'Text → Sign' },
  { id: 'learn', label: 'Learn ASL' },
]
