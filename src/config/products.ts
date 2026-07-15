import type { FeatureId } from './features';

export type ProductSlug =
  | 'review-booster'
  | 'appointment-reminder'
  | 'sequence-sender'
  | 'smart-reports'
  | 'marketing-creatives'
  | 'clinic-growth-suite';

export interface ProductModuleLink {
  featureId: FeatureId;
  label: string;
  path: string;
  description: string;
}

export interface ProductConfig {
  slug: ProductSlug;
  name: string;
  shortName: string;
  headline: string;
  summary: string;
  audience: string;
  startingPrice: string;
  accentClass: string;
  modules: ProductModuleLink[];
  sharedSetup: Array<{
    label: string;
    path: string;
    description: string;
  }>;
  outcomes: string[];
}

export const PRODUCTS: ProductConfig[] = [
  {
    slug: 'review-booster',
    name: 'Review Booster',
    shortName: 'Reviews',
    headline: 'Get more Google reviews from real patient visits',
    summary: 'AI-assisted review requests, WhatsApp-ready messages, GMB links, and follow-up workflows in one focused product.',
    audience: 'Clinics, labs, dentists, and local healthcare businesses that want reputation growth.',
    startingPrice: 'From ₹999/mo',
    accentClass: 'from-emerald-600 to-teal-700',
    modules: [
      {
        featureId: 'reviews',
        label: 'Review Requests',
        path: '/reviews',
        description: 'Create patient review records, generate AI review text, and send GMB follow-ups.',
      },
    ],
    sharedSetup: [
      {
        label: 'Clinic Info',
        path: '/clinic-information',
        description: 'Brand, phone, address, GMB link, and clinic profile used in messages.',
      },
      {
        label: 'WhatsApp Settings',
        path: '/settings',
        description: 'Connect WhatsApp and manage direct-send configuration.',
      },
    ],
    outcomes: ['More review requests sent', 'Less manual copy-paste', 'Consistent clinic branding'],
  },
  {
    slug: 'appointment-reminder',
    name: 'Appointment Reminder',
    shortName: 'Appointments',
    headline: 'Book appointments and remind patients without extra admin work',
    summary: 'A focused appointment workspace for patient scheduling, reminders, doctor assignment, and visit tracking.',
    audience: 'Small clinics and diagnostic centers that need a lightweight appointment desk.',
    startingPrice: 'From ₹999/mo',
    accentClass: 'from-blue-600 to-cyan-700',
    modules: [
      {
        featureId: 'appointments',
        label: 'Appointments',
        path: '/appointments',
        description: 'Schedule appointments, update visit status, and send reminder messages.',
      },
    ],
    sharedSetup: [
      {
        label: 'Clinic Info',
        path: '/clinic-information',
        description: 'Clinic details and doctor information used in appointment communication.',
      },
      {
        label: 'WhatsApp Settings',
        path: '/settings',
        description: 'Connect WhatsApp for direct reminders.',
      },
    ],
    outcomes: ['Cleaner appointment tracking', 'Faster reminders', 'Better front-desk workflow'],
  },
  {
    slug: 'sequence-sender',
    name: 'Sequence Sender',
    shortName: 'Sequences',
    headline: 'Run patient follow-up sequences from one WhatsApp queue',
    summary: 'Create profile-based drip messages, generate AI templates, queue sends, and manage due follow-ups.',
    audience: 'Clinics and labs that want recurring health awareness, reactivation, and follow-up campaigns.',
    startingPrice: 'From ₹1,499/mo',
    accentClass: 'from-violet-600 to-indigo-700',
    modules: [
      {
        featureId: 'sequences',
        label: 'Sequence Flow',
        path: '/sequence-flow',
        description: 'Enter leads, assign sequences, create templates, and quick-send due messages from one workspace.',
      },
      {
        featureId: 'sequences',
        label: 'Sequences',
        path: '/sequence-messages',
        description: 'Review scheduled messages and manage sequence status.',
      },
      {
        featureId: 'sequences',
        label: 'Quick Send',
        path: '/quick-send',
        description: 'Send due or overdue messages from a focused queue.',
      },
      {
        featureId: 'sequences',
        label: 'AI Generator',
        path: '/ai-sequence-generator',
        description: 'Generate campaign templates by profile type, theme, and language.',
      },
    ],
    sharedSetup: [
      {
        label: 'Clinic Info',
        path: '/clinic-information',
        description: 'Clinic name, phone, and profile types used in templates.',
      },
      {
        label: 'WhatsApp Settings',
        path: '/settings',
        description: 'Connect WhatsApp before direct sending.',
      },
    ],
    outcomes: ['Repeatable follow-ups', 'AI-generated templates', 'One queue for sending'],
  },
  {
    slug: 'smart-reports',
    name: 'Smart Reports',
    shortName: 'Reports',
    headline: 'Upload reports, create smart summaries, and send them to patients',
    summary: 'A report workflow for uploads, AI report requests, PDF merging, status tracking, and WhatsApp sharing.',
    audience: 'Diagnostic labs, health checkup centers, and clinics handling patient report documents.',
    startingPrice: 'From ₹1,999/mo',
    accentClass: 'from-orange-600 to-rose-700',
    modules: [
      {
        featureId: 'reports',
        label: 'Smart Reports',
        path: '/reports',
        description: 'Upload reports, track status, merge PDFs, and share report links.',
      },
    ],
    sharedSetup: [
      {
        label: 'Clinic Info',
        path: '/clinic-information',
        description: 'Clinic branding and contact details used in patient report messages.',
      },
      {
        label: 'WhatsApp Settings',
        path: '/settings',
        description: 'Connect WhatsApp to send completed reports.',
      },
    ],
    outcomes: ['Report upload workflow', 'Patient-ready sharing', 'Merged PDF delivery'],
  },
  {
    slug: 'marketing-creatives',
    name: 'Marketing Creatives',
    shortName: 'Creatives',
    headline: 'Organize clinic marketing creatives by campaign and month',
    summary: 'A lightweight creative library for healthcare campaigns, monthly assets, videos, links, and thumbnails.',
    audience: 'Clinics that receive marketing content and need one place for staff to access it.',
    startingPrice: 'From ₹799/mo',
    accentClass: 'from-pink-600 to-fuchsia-700',
    modules: [
      {
        featureId: 'creatives',
        label: 'Creatives',
        path: '/creatives',
        description: 'Browse and use assigned creative assets by category, year, and month.',
      },
    ],
    sharedSetup: [
      {
        label: 'Clinic Info',
        path: '/clinic-information',
        description: 'Keep clinic brand details ready for creative personalization.',
      },
    ],
    outcomes: ['One creative library', 'Easy staff access', 'Campaign-ready assets'],
  },
  {
    slug: 'clinic-growth-suite',
    name: 'Clinic Growth Suite',
    shortName: 'Full Suite',
    headline: 'One growth workspace for appointments, reviews, sequences, reports, and creatives',
    summary: 'The full platform for clinics that want every module under one login with shared settings and admin control.',
    audience: 'Growing clinics and labs that want one operating layer for patient communication and growth.',
    startingPrice: 'From ₹3,999/mo',
    accentClass: 'from-slate-800 to-indigo-800',
    modules: [
      {
        featureId: 'appointments',
        label: 'Appointments',
        path: '/appointments',
        description: 'Schedule and track patient visits.',
      },
      {
        featureId: 'reviews',
        label: 'Reviews',
        path: '/reviews',
        description: 'Generate and send review requests.',
      },
      {
        featureId: 'sequences',
        label: 'Sequences',
        path: '/sequence-messages',
        description: 'Run follow-up message sequences.',
      },
      {
        featureId: 'reports',
        label: 'Smart Reports',
        path: '/reports',
        description: 'Manage report upload and sharing workflows.',
      },
      {
        featureId: 'creatives',
        label: 'Creatives',
        path: '/creatives',
        description: 'Access marketing content assets.',
      },
    ],
    sharedSetup: [
      {
        label: 'Clinic Info',
        path: '/clinic-information',
        description: 'Shared profile, doctors, branding, GMB, and contact details.',
      },
      {
        label: 'Settings',
        path: '/settings',
        description: 'Shared integrations, WhatsApp, and system preferences.',
      },
      {
        label: 'Admin Panel',
        path: '/admin',
        description: 'Control user module access and profile types.',
      },
    ],
    outcomes: ['One clinic login', 'Shared setup', 'Modular pricing and access'],
  },
];

export function getProductBySlug(slug?: string | null) {
  return PRODUCTS.find((product) => product.slug === slug);
}
