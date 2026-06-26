import React from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowRight, Building2, CheckCircle, Lock, Settings, ShieldCheck } from 'lucide-react';
import { getProductBySlug } from '../config/products';
import { hasFeature, isAdminRole } from '../config/features';
import { useStore } from '../store/useStore';

export function ProductWorkspacePage() {
  const { productSlug } = useParams();
  const product = getProductBySlug(productSlug);
  const { user } = useStore();

  if (!product) {
    return <Navigate to="/" replace />;
  }

  const availableModules = product.modules.filter((module) => hasFeature(user, module.featureId));
  const lockedModules = product.modules.filter((module) => !hasFeature(user, module.featureId));

  return (
    <div className="space-y-8">
      <section className={`rounded-lg bg-gradient-to-br ${product.accentClass} p-6 text-white shadow-lg sm:p-8`}>
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold text-white/75">Product Workspace</p>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{product.name}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/85 sm:text-base">
              {product.summary}
            </p>
          </div>
          <Link
            to={`/products/${product.slug}`}
            className="inline-flex items-center justify-center rounded-md border border-white/40 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
          >
            View landing page
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Included Modules</h2>
            <p className="text-sm text-gray-600">Only the product-specific components are surfaced here.</p>
          </div>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
            {availableModules.length}/{product.modules.length} available
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {product.modules.map((module) => {
            const isAvailable = hasFeature(user, module.featureId);
            return (
              <div
                key={`${module.path}-${module.label}`}
                className={`rounded-lg border bg-white p-5 shadow-sm ${
                  isAvailable ? 'border-gray-200' : 'border-dashed border-gray-300 opacity-75'
                }`}
              >
                <div className="flex items-start gap-3">
                  {isAvailable ? (
                    <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
                  ) : (
                    <Lock className="mt-0.5 h-5 w-5 flex-shrink-0 text-gray-400" />
                  )}
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900">{module.label}</h3>
                    <p className="mt-1 text-sm text-gray-600">{module.description}</p>
                  </div>
                </div>

                {isAvailable ? (
                  <Link
                    to={module.path}
                    className="mt-5 inline-flex items-center rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
                  >
                    Open {module.label}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                ) : (
                  <p className="mt-5 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-600">
                    This module is part of the product wrapper but is not enabled for this user yet.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Shared Setup</h2>
          <p className="text-sm text-gray-600">
            These shared services stay common across products, so a customer can upgrade without re-entering setup.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {product.sharedSetup.map((setup) => {
            const isAdminOnly = setup.path === '/admin';
            const canOpen = !isAdminOnly || isAdminRole(user?.role);

            return (
              <div key={setup.path} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  {setup.path === '/clinic-information' ? (
                    <Building2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
                  ) : setup.path === '/admin' ? (
                    <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-purple-600" />
                  ) : (
                    <Settings className="mt-0.5 h-5 w-5 flex-shrink-0 text-gray-700" />
                  )}
                  <div>
                    <h3 className="font-semibold text-gray-900">{setup.label}</h3>
                    <p className="mt-1 text-sm text-gray-600">{setup.description}</p>
                  </div>
                </div>

                {canOpen ? (
                  <Link
                    to={setup.path}
                    className="mt-5 inline-flex items-center rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                  >
                    Open {setup.label}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                ) : (
                  <p className="mt-5 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-600">
                    Admin access required.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {lockedModules.length > 0 && (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-5">
          <h2 className="font-semibold text-amber-900">Some product modules are locked</h2>
          <p className="mt-1 text-sm text-amber-800">
            Existing users are not changed automatically. Enable the missing feature flags from Admin Panel when you want this user to access the full wrapper.
          </p>
        </section>
      )}
    </div>
  );
}
