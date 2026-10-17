import { KEY_PREFIX } from './api'

export type Role = 'admin' | 'coordinator' | 'teacher' | 'student'

export const ROLES: { id: Role; label: string; path: string }[] = [
  { id: 'admin', label: 'Admin', path: '/admin' },
  { id: 'coordinator', label: 'Coordinator', path: '/field' },
  { id: 'teacher', label: 'Teacher', path: '/learn/teacher' },
  { id: 'student', label: 'Student', path: '/learn/student' },
]

const ROLE_KEY = KEY_PREFIX + 'role'

export function getSavedRole(): Role {
  const saved = localStorage.getItem(ROLE_KEY)
  return ROLES.some((r) => r.id === saved) ? (saved as Role) : 'admin'
}

export function saveRole(role: Role) {
  localStorage.setItem(ROLE_KEY, role)
}

export function pathForRole(role: Role): string {
  return ROLES.find((r) => r.id === role)!.path
}

export function roleForPath(pathname: string): Role | undefined {
  return ROLES.find((r) => pathname.startsWith(r.path))?.id
}
