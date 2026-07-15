import React from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { ArrowRight, Building2, CheckCircle, LayoutDashboard, MessageCircle, Settings, Sparkles } from 'lucide-react';
import { getProductBySlug, PRODUCTS } from '../config/products';

const productLinks = PRODUCTS.map((product) => ({
  slug: product.slug,
  name: product.name,
  path: `/products/${product.slug}`,
}));

export function ProductLandingPage() {
  const { productSlug } = useParams();
  const location = useLocation();
  const slugFromPath = location.pathname.replace(/^\/+/, '').split('/')[0];
  const product = getProductBySlug(productSlug || slugFromPath);

  if (!product) {
    return <Navigate to="/products/review-booster" replace />;
  }

  return (
    <div className="min-h-screen bg-white text-gray-950">
      <header className="border-b border-gray-200 bg-white/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/products/review-booster" className="flex items-center gap-3">
            <img
              src="https://i.ibb.co/TDsD6Kt3/DC-logo.png"
              alt="Clinic Growth"
              className="h-10 w-10 rounded-full border border-gray-200"
            />
            <div>
              <p className="text-sm font-semibold text-gray-900">Clinic Micro SaaS</p>
              <p className="text-xs text-gray-500">One backend, focused products</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-2 lg:flex">
            {productLinks.map((item) => (
              <Link
                key={item.slug}
                to={item.path}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  item.slug === product.slug
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          <Link
            to="/login"
            className="inline-flex items-center rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
          >
            Sign in
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </header>

      <main>
        <section className={`bg-gradient-to-br ${product.accentClass} text-white`}>
          <div className="mx-auto grid min-h-[520px] max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_420px] lg:px-8">
            <div className="max-w-3xl">
              <div className="mb-5 inline-flex items-center rounded-full bg-white/15 px-4 py-2 text-sm font-medium">
                <Sparkles className="mr-2 h-4 w-4" />
                {product.startingPrice}
              </div>
              <h1 className="text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
                {product.name}
              </h1>
              <p className="mt-5 text-2xl font-semibold text-white/95">
                {product.headline}
              </p>
              <p className="mt-5 max-w-2xl text-base leading-7 text-white/85 sm:text-lg">
                {product.summary}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  to={`/onboarding?product=${product.slug}`}
                  className="inline-flex items-center justify-center rounded-md bg-white px-5 py-3 text-sm font-semibold text-gray-950 shadow-sm hover:bg-gray-100"
                >
                  Start with {product.shortName}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <Link
                  to={`/workspace/${product.slug}`}
                  className="inline-flex items-center justify-center rounded-md border border-white/40 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
                >
                  Open workspace
                </Link>
              </div>
            </div>

            <div className="rounded-lg border border-white/25 bg-white/12 p-5 shadow-2xl backdrop-blur">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">Workspace Preview</p>
                  <p className="text-xs text-white/70">Focused modules only</p>
                </div>
                <LayoutDashboard className="h-6 w-6 text-white/80" />
              </div>
              <div className="space-y-3">
                {product.modules.map((module) => (
                  <div key={`${module.path}-${module.label}`} className="rounded-md bg-white p-4 text-gray-900 shadow-sm">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
                      <div>
                        <p className="font-semibold">{module.label}</p>
                        <p className="mt-1 text-sm text-gray-600">{module.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-md bg-white/15 p-3">
                  <Building2 className="h-5 w-5 text-white" />
                  <p className="mt-2 text-xs font-medium text-white">Shared clinic setup</p>
                </div>
                <div className="rounded-md bg-white/15 p-3">
                  <Settings className="h-5 w-5 text-white" />
                  <p className="mt-2 text-xs font-medium text-white">Shared integrations</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">Built For</p>
            <h2 className="mt-3 text-3xl font-bold text-gray-950">{product.audience}</h2>
            <p className="mt-4 text-gray-600">
              Each product has its own front door and focused workspace, but the same account can later unlock more modules without migration.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {product.outcomes.map((outcome) => (
              <div key={outcome} className="rounded-lg border border-gray-200 bg-gray-50 p-5">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
                <p className="mt-3 text-sm font-semibold text-gray-900">{outcome}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-gray-200 bg-gray-50">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
            <div className="mb-8 flex items-center gap-3">
              <MessageCircle className="h-7 w-7 text-gray-700" />
              <div>
                <h2 className="text-2xl font-bold text-gray-950">All Product Frontends</h2>
                <p className="text-sm text-gray-600">Separate landing pages, shared SaaS platform underneath.</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {PRODUCTS.map((item) => (
                <Link
                  key={item.slug}
                  to={`/products/${item.slug}`}
                  className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <p className="text-lg font-semibold text-gray-950">{item.name}</p>
                  <p className="mt-2 line-clamp-2 text-sm text-gray-600">{item.summary}</p>
                  <p className="mt-4 text-sm font-semibold text-gray-900">{item.startingPrice}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
