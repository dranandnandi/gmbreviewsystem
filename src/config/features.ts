import type { User } from '../types';

export const FEATURE_MODULES = [
  {
    id: 'appointments',
    name: 'Appointments',
    description: 'Schedule appointments and manage patient visits.',
  },
  {
    id: 'reviews',
    name: 'Reviews',
    description: 'Create review requests and AI-assisted Google review messages.',
  },
  {
    id: 'sequences',
    name: 'Sequence Messages',
    description: 'Create and send drip follow-up message sequences.',
  },
  {
    id: 'creatives',
    name: 'Creatives',
    description: 'Access marketing creatives and clinic content assets.',
  },
  {
    id: 'reports',
    name: 'Smart Reports',
    description: 'Upload reports, track AI report requests, merge PDFs, and share reports.',
  },
] as const;

export const ADMIN_FEATURES = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    description: 'Main dashboard with overview and statistics.',
  },
  ...FEATURE_MODULES,
] as const;

export type FeatureId = (typeof ADMIN_FEATURES)[number]['id'];

export function isAdminRole(role?: string | null) {
  return role === 'admin' || role === 'super_admin';
}

export function isSuperAdminRole(role?: string | null) {
  return role === 'super_admin';
}

export function hasFeature(user: User | null | undefined, feature: FeatureId | string) {
  if (!user) return false;
  if (isSuperAdminRole(user.role)) return true;
  return user.enabledFeatures?.includes(feature) ?? false;
}
