import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle,
  Eye,
  EyeOff,
  FileText,
  Lock,
  Mail,
  MessageCircle,
  Palette,
  User,
} from 'lucide-react';
import { getProductBySlug, PRODUCTS, ProductSlug } from '../config/products';
import { supabase } from '../services/supabaseClient';

interface OnboardingForm {
  productSlug: ProductSlug;
  labName: string;
  legalName: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  gstin: string;
  gmbLink: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  confirmPassword: string;
  primaryColor: string;
  secondaryColor: string;
  defaultLanguage: string;
  reportTypes: string[];
  letterheadUrl: string;
  doctorNameRequired: boolean;
  allowHistoricalTrends: boolean;
  businessType: string;
  customerLabel: string;
  appointmentLabel: string;
  locationLabel: string;
  serviceKeywords: string;
  promptNotes: string;
}

const passwordRule = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

const reportTypeOptions = [
  { id: 'smart_report', label: 'Smart Report' },
  { id: 'trend_analysis', label: 'Trend Analysis' },
  { id: 'longitivity_report', label: 'Longevity Report' },
];

const productDefaults: Record<ProductSlug, Partial<OnboardingForm>> = {
  'review-booster': {
    businessType: 'Clinic or diagnostic lab',
    customerLabel: 'patient',
    appointmentLabel: 'visit',
    locationLabel: 'center',
  },
  'appointment-reminder': {
    businessType: 'Clinic',
    customerLabel: 'patient',
    appointmentLabel: 'appointment',
    locationLabel: 'center',
  },
  'sequence-sender': {
    businessType: 'Clinic or diagnostic lab',
    customerLabel: 'patient',
    appointmentLabel: 'follow-up',
    locationLabel: 'WhatsApp',
  },
  'smart-reports': {
    businessType: 'Diagnostic lab',
    customerLabel: 'patient',
    appointmentLabel: 'report request',
    locationLabel: 'lab',
    serviceKeywords: 'CBC, lipid profile, thyroid profile, HbA1c, liver profile, kidney profile',
  },
  'marketing-creatives': {
    businessType: 'Clinic',
    customerLabel: 'patient',
    appointmentLabel: 'campaign',
    locationLabel: 'center',
  },
  'clinic-growth-suite': {
    businessType: 'Clinic or diagnostic lab',
    customerLabel: 'patient',
    appointmentLabel: 'visit',
    locationLabel: 'center',
  },
};

function initialForm(productSlug: ProductSlug): OnboardingForm {
  const defaults = productDefaults[productSlug];
  return {
    productSlug,
    labName: '',
    legalName: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    phone: '',
    whatsapp: '',
    email: '',
    website: '',
    gstin: '',
    gmbLink: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    confirmPassword: '',
    primaryColor: '#4F46E5',
    secondaryColor: '#E5E7EB',
    defaultLanguage: 'en',
    reportTypes: ['smart_report', 'trend_analysis', 'longitivity_report'],
    letterheadUrl: '',
    doctorNameRequired: true,
    allowHistoricalTrends: true,
    businessType: defaults.businessType || '',
    customerLabel: defaults.customerLabel || 'patient',
    appointmentLabel: defaults.appointmentLabel || 'visit',
    locationLabel: defaults.locationLabel || 'center',
    serviceKeywords: defaults.serviceKeywords || '',
    promptNotes: '',
  };
}

export function MicroSaasOnboardingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedProduct = searchParams.get('product') as ProductSlug | null;
  const startingProduct = getProductBySlug(requestedProduct)?.slug || 'smart-reports';
  const [form, setForm] = useState<OnboardingForm>(() => initialForm(startingProduct));
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const product = useMemo(() => getProductBySlug(form.productSlug), [form.productSlug]);
  const needsReports = form.productSlug === 'smart-reports' || form.productSlug === 'clinic-growth-suite';
  const needsGmb = form.productSlug === 'review-booster' || form.productSlug === 'clinic-growth-suite';
  const needsMessaging = ['review-booster', 'appointment-reminder', 'sequence-sender', 'smart-reports', 'clinic-growth-suite'].includes(form.productSlug);

  const updateForm = (updates: Partial<OnboardingForm>) => setForm((current) => ({ ...current, ...updates }));

  const handleProductChange = (productSlug: ProductSlug) => {
    setForm((current) => ({
      ...current,
      ...productDefaults[productSlug],
      productSlug,
    }));
  };

  const validateStep = (targetStep = step) => {
    if (targetStep === 1) {
      if (!form.labName.trim()) return 'Lab or business name is required.';
      if (!form.city.trim()) return 'City is required.';
      if (!form.phone.trim()) return 'Phone number is required.';
      if (needsGmb && !form.gmbLink.trim()) return 'Google review link is required for Review Booster.';
    }

    if (targetStep === 2) {
      if (!form.adminName.trim()) return 'Admin name is required.';
      if (!form.adminEmail.trim()) return 'Admin email is required.';
      if (!passwordRule.test(form.adminPassword)) {
        return 'Password must be 8+ characters with uppercase, lowercase, number, and special character.';
      }
      if (form.adminPassword !== form.confirmPassword) return 'Passwords do not match.';
    }

    if (targetStep === 3 && needsReports && form.reportTypes.length === 0) {
      return 'Select at least one Smart Report type.';
    }

    return '';
  };

  const nextStep = () => {
    const validationError = validateStep();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setStep((current) => Math.min(current + 1, 4));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validationError = validateStep(2) || validateStep(3);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data: payload, error: functionError } = await supabase.functions.invoke('create-micro-saas-account', {
        body: {
          productSlug: form.productSlug,
          labName: form.labName,
          legalName: form.legalName,
          address: form.address,
          city: form.city,
          state: form.state,
          pincode: form.pincode,
          country: form.country,
          phone: form.phone,
          whatsapp: form.whatsapp || form.phone,
          email: form.email || form.adminEmail,
          website: form.website,
          gstin: form.gstin,
          gmbLink: form.gmbLink,
          adminName: form.adminName,
          adminEmail: form.adminEmail,
          adminPassword: form.adminPassword,
          primaryColor: form.primaryColor,
          secondaryColor: form.secondaryColor,
          reportSettings: {
            defaultLanguage: form.defaultLanguage,
            reportTypes: form.reportTypes,
            letterheadUrl: form.letterheadUrl,
            doctorNameRequired: form.doctorNameRequired,
            allowHistoricalTrends: form.allowHistoricalTrends,
          },
          businessContext: {
            businessType: form.businessType,
            customerLabel: form.customerLabel,
            appointmentLabel: form.appointmentLabel,
            locationLabel: form.locationLabel,
            serviceKeywords: form.serviceKeywords,
            promptNotes: form.promptNotes,
          },
        },
      });

      if (functionError || payload?.error) {
        console.error('[MicroSaasOnboarding] Account creation failed', {
          functionError,
          payload,
        });
        const requestIdText = payload?.requestId ? ` Request ID: ${payload.requestId}.` : '';
        const detailsText = payload?.details ? ` Details: ${JSON.stringify(payload.details)}` : '';
        throw new Error(`${payload?.error || functionError?.message || 'Failed to create account'}.${requestIdText}${detailsText}`);
      }

      console.info('[MicroSaasOnboarding] Account creation succeeded', payload);
      setSuccess('Account created. You can sign in with the admin email and password.');
      setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-950">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link to={`/products/${form.productSlug}`} className="flex items-center gap-3">
            <img src="https://i.ibb.co/TDsD6Kt3/DC-logo.png" alt="Clinic Micro SaaS" className="h-10 w-10 rounded-full" />
            <div>
              <p className="text-sm font-semibold">Clinic Micro SaaS</p>
              <p className="text-xs text-gray-500">Account setup</p>
            </div>
          </Link>
          <Link to="/login" className="text-sm font-semibold text-gray-700 hover:text-gray-950">Sign in</Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[320px_1fr] lg:px-8">
        <aside className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <p className="text-sm font-semibold text-gray-500">Selected product</p>
            <select
              value={form.productSlug}
              onChange={(event) => handleProductChange(event.target.value as ProductSlug)}
              className="mt-3 w-full rounded-md border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              {PRODUCTS.map((item) => (
                <option key={item.slug} value={item.slug}>{item.name}</option>
              ))}
            </select>
            <p className="mt-3 text-sm text-gray-600">{product?.summary}</p>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-5">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="mb-4 flex items-center gap-3 last:mb-0">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${step >= item ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {step > item ? <CheckCircle className="h-4 w-4" /> : item}
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {item === 1 && 'Lab info'}
                  {item === 2 && 'Admin account'}
                  {item === 3 && 'Product setup'}
                  {item === 4 && 'Finish'}
                </span>
              </div>
            ))}
          </div>
        </aside>

        <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Create {product?.name || 'Micro SaaS'} Account</h1>
            <p className="mt-1 text-sm text-gray-600">Capture the lab, account, and product settings needed before first login.</p>
          </div>

          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {step === 1 && (
            <section className="space-y-5">
              <div className="flex items-center gap-2 border-b border-gray-200 pb-3">
                <Building2 className="h-5 w-5 text-indigo-600" />
                <h2 className="font-semibold">Lab And Business Information</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Lab / Business Name" value={form.labName} required onChange={(value) => updateForm({ labName: value })} />
                <Field label="Legal Name" value={form.legalName} onChange={(value) => updateForm({ legalName: value })} />
                <Field label="Phone" value={form.phone} required type="tel" onChange={(value) => updateForm({ phone: value.replace(/\D/g, '').slice(0, 10) })} />
                <Field label="WhatsApp" value={form.whatsapp} type="tel" onChange={(value) => updateForm({ whatsapp: value.replace(/\D/g, '').slice(0, 10) })} />
                <Field label="Email" value={form.email} type="email" onChange={(value) => updateForm({ email: value })} />
                <Field label="Website" value={form.website} type="url" onChange={(value) => updateForm({ website: value })} />
                <Field label="City" value={form.city} required onChange={(value) => updateForm({ city: value })} />
                <Field label="State" value={form.state} onChange={(value) => updateForm({ state: value })} />
                <Field label="Pincode" value={form.pincode} onChange={(value) => updateForm({ pincode: value })} />
                <Field label="GSTIN" value={form.gstin} onChange={(value) => updateForm({ gstin: value.toUpperCase() })} />
              </div>
              <Field label="Address" value={form.address} onChange={(value) => updateForm({ address: value })} />
              {needsGmb && <Field label="Google Review Link" value={form.gmbLink} required type="url" onChange={(value) => updateForm({ gmbLink: value })} />}
            </section>
          )}

          {step === 2 && (
            <section className="space-y-5">
              <div className="flex items-center gap-2 border-b border-gray-200 pb-3">
                <User className="h-5 w-5 text-indigo-600" />
                <h2 className="font-semibold">Admin Account</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Admin Name" value={form.adminName} required onChange={(value) => updateForm({ adminName: value })} />
                <Field label="Admin Email" value={form.adminEmail} required type="email" icon={<Mail className="h-4 w-4" />} onChange={(value) => updateForm({ adminEmail: value })} />
                <PasswordField label="Password" value={form.adminPassword} show={showPassword} onToggle={() => setShowPassword(!showPassword)} onChange={(value) => updateForm({ adminPassword: value })} />
                <PasswordField label="Confirm Password" value={form.confirmPassword} show={showPassword} onToggle={() => setShowPassword(!showPassword)} onChange={(value) => updateForm({ confirmPassword: value })} />
              </div>
              <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                This creates the main admin login and enables only the selected micro-SaaS modules for the account.
              </div>
            </section>
          )}

          {step === 3 && (
            <section className="space-y-6">
              {needsReports && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-gray-200 pb-3">
                    <FileText className="h-5 w-5 text-indigo-600" />
                    <h2 className="font-semibold">Smart Report Setup</h2>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <SelectField label="Default Language" value={form.defaultLanguage} onChange={(value) => updateForm({ defaultLanguage: value })} options={[['en', 'English'], ['hi', 'Hindi'], ['mr', 'Marathi'], ['gu', 'Gujarati'], ['ta', 'Tamil'], ['te', 'Telugu']]} />
                    <Field label="Letterhead URL" value={form.letterheadUrl} type="url" onChange={(value) => updateForm({ letterheadUrl: value })} />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {reportTypeOptions.map((option) => (
                      <label key={option.id} className="flex items-center gap-2 rounded-md border border-gray-200 p-3 text-sm">
                        <input
                          type="checkbox"
                          checked={form.reportTypes.includes(option.id)}
                          onChange={(event) => updateForm({
                            reportTypes: event.target.checked
                              ? [...form.reportTypes, option.id]
                              : form.reportTypes.filter((item) => item !== option.id),
                          })}
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {needsMessaging && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-gray-200 pb-3">
                    <MessageCircle className="h-5 w-5 text-indigo-600" />
                    <h2 className="font-semibold">Prompt And Messaging Context</h2>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Business Type" value={form.businessType} onChange={(value) => updateForm({ businessType: value })} />
                    <Field label="Customer Label" value={form.customerLabel} onChange={(value) => updateForm({ customerLabel: value })} />
                    <Field label="Interaction Label" value={form.appointmentLabel} onChange={(value) => updateForm({ appointmentLabel: value })} />
                    <Field label="Location / Mode Label" value={form.locationLabel} onChange={(value) => updateForm({ locationLabel: value })} />
                  </div>
                  <TextArea label="Service Keywords" value={form.serviceKeywords} onChange={(value) => updateForm({ serviceKeywords: value })} />
                  <TextArea label="Prompt Notes" value={form.promptNotes} onChange={(value) => updateForm({ promptNotes: value })} />
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-gray-200 pb-3">
                  <Palette className="h-5 w-5 text-indigo-600" />
                  <h2 className="font-semibold">Brand Colors</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <ColorField label="Primary Color" value={form.primaryColor} onChange={(value) => updateForm({ primaryColor: value })} />
                  <ColorField label="Secondary Color" value={form.secondaryColor} onChange={(value) => updateForm({ secondaryColor: value })} />
                </div>
              </div>
            </section>
          )}

          {step === 4 && (
            <section className="py-8 text-center">
              <CheckCircle className="mx-auto h-14 w-14 text-emerald-600" />
              <h2 className="mt-4 text-2xl font-bold">Account Ready</h2>
              <p className="mt-2 text-gray-600">{success || 'Your account details are ready to submit.'}</p>
              {success && (
                <button
                  type="button"
                  onClick={() => navigate('/login?next=/pricing')}
                  className="mt-6 inline-flex items-center rounded-md bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Log in &amp; choose your plan
                  <ArrowRight className="ml-2 h-4 w-4" />
                </button>
              )}
            </section>
          )}

          {!success && (
            <div className="mt-8 flex items-center justify-between border-t border-gray-200 pt-5">
              <button type="button" onClick={() => setStep((current) => Math.max(current - 1, 1))} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                Back
              </button>
              {step < 3 ? (
                <button type="button" onClick={nextStep} className="inline-flex items-center rounded-md bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </button>
              ) : (
                <button type="submit" disabled={loading} className="inline-flex items-center rounded-md bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                  {loading ? 'Creating...' : 'Create Account'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </form>
      </main>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', required, icon }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; icon?: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium text-gray-700">
      {label} {required && <span className="text-red-500">*</span>}
      <div className="relative mt-1">
        {icon && <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">{icon}</div>}
        <input type={type} required={required} value={value} onChange={(event) => onChange(event.target.value)} className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${icon ? 'pl-9' : ''}`} />
      </div>
    </label>
  );
}

function PasswordField({ label, value, show, onToggle, onChange }: { label: string; value: string; show: boolean; onToggle: () => void; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm font-medium text-gray-700">
      {label} <span className="text-red-500">*</span>
      <div className="relative mt-1">
        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input type={show ? 'text' : 'password'} required value={value} onChange={(event) => onChange(event.target.value)} className="block w-full rounded-md border-gray-300 pl-9 pr-10 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
        <button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </label>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: [string, string][]; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm font-medium text-gray-700">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
        {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
      </select>
    </label>
  );
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm font-medium text-gray-700">
      {label}
      <textarea rows={3} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
    </label>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm font-medium text-gray-700">
      {label}
      <input type="color" value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-gray-300 bg-white p-1" />
    </label>
  );
}
