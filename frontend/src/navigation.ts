export type Page = 'dashboard' | 'sign-to-text' | 'text-to-sign'

export interface NavItem {
  id: Page
  label: string
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'sign-to-text', label: 'Sign → Text' },
  { id: 'text-to-sign', label: 'Text → Sign' },
]
