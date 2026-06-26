import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Boxes } from 'lucide-react';
import { PRODUCTS } from '../config/products';
import { hasFeature } from '../config/features';
import { useStore } from '../store/useStore';

export function ProductCatalogPage() {
  const { user } = useStore();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Boxes className="h-8 w-8 text-indigo-600" />
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Product Wrappers</h1>
          <p className="text-gray-600">Focused micro-SaaS frontends using the same shared platform.</p>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {PRODUCTS.map((product) => {
          const availableCount = product.modules.filter((module) => hasFeature(user, module.featureId)).length;
          return (
            <div key={product.slug} className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className={`h-2 bg-gradient-to-r ${product.accentClass}`} />
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{product.name}</h2>
                    <p className="mt-2 text-sm text-gray-600">{product.summary}</p>
                  </div>
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                    {availableCount}/{product.modules.length}
                  </span>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {product.modules.map((module) => (
                    <span
                      key={`${product.slug}-${module.path}-${module.label}`}
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        hasFeature(user, module.featureId)
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {module.label}
                    </span>
                  ))}
                </div>

                <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                  <Link
                    to={`/workspace/${product.slug}`}
                    className="inline-flex items-center justify-center rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
                  >
                    Open workspace
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                  <Link
                    to={`/products/${product.slug}`}
                    className="inline-flex items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                  >
                    Landing page
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
