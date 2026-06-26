import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { AppointmentsPage } from './pages/AppointmentsPage';
import { ReviewsPage } from './pages/ReviewsPage';
import { SettingsPage } from './pages/SettingsPage';
import { CreativesPage } from './pages/CreativesPage';
import { SequenceMessagesPage } from './pages/SequenceMessagesPage';
import { SimplifiedSequenceMessagesPage } from './pages/SimplifiedSequenceMessagesPage';
import { AISequenceTemplateGeneratorPage } from './pages/AISequenceTemplateGeneratorPage';
import ClinicInformationPage from './pages/ClinicInformationPage';
import { AdminPage } from './pages/AdminPage';
import { SmartReportsPage } from './pages/SmartReportsPage';
import { SuperAdminPage } from './pages/SuperAdminPage';
import { ProductCatalogPage } from './pages/ProductCatalogPage';
import { ProductLandingPage } from './pages/ProductLandingPage';
import { ProductWorkspacePage } from './pages/ProductWorkspacePage';
import { useStore } from './store/useStore';
import { hasFeature, isAdminRole, isSuperAdminRole } from './config/features';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useStore();
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useStore();
  if (!user) return <Navigate to="/login" />;
  if (!isAdminRole(user.role)) return <Navigate to="/" />;
  return <>{children}</>;
}

function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useStore();
  if (!user) return <Navigate to="/login" />;
  if (!isSuperAdminRole(user.role)) return <Navigate to="/" />;
  return <>{children}</>;
}

function FeatureRoute({ children, feature }: { children: React.ReactNode; feature: string }) {
  const { user } = useStore();
  if (!user) return <Navigate to="/login" />;
  if (!hasFeature(user, feature)) return <Navigate to="/" />;
  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/products/:productSlug" element={<ProductLandingPage />} />
        <Route path="/review-booster" element={<ProductLandingPage />} />
        <Route path="/appointment-reminder" element={<ProductLandingPage />} />
        <Route path="/sequence-sender" element={<ProductLandingPage />} />
        <Route path="/smart-reports" element={<ProductLandingPage />} />
        <Route path="/marketing-creatives" element={<ProductLandingPage />} />
        <Route path="/clinic-growth-suite" element={<ProductLandingPage />} />
        <Route path="/" element={<Layout />}>
          <Route path="login" element={<LoginPage />} />
          <Route
            index
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="products"
            element={
              <ProtectedRoute>
                <ProductCatalogPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="workspace/:productSlug"
            element={
              <ProtectedRoute>
                <ProductWorkspacePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="appointments"
            element={
              <ProtectedRoute>
                <FeatureRoute feature="appointments">
                  <AppointmentsPage />
                </FeatureRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="reviews"
            element={
              <ProtectedRoute>
                <FeatureRoute feature="reviews">
                  <ReviewsPage />
                </FeatureRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="sequence-messages"
            element={
              <ProtectedRoute>
                <FeatureRoute feature="sequences">
                  <SequenceMessagesPage />
                </FeatureRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="quick-send"
            element={
              <ProtectedRoute>
                <FeatureRoute feature="sequences">
                  <SimplifiedSequenceMessagesPage />
                </FeatureRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="ai-sequence-generator"
            element={
              <ProtectedRoute>
                <FeatureRoute feature="sequences">
                  <AISequenceTemplateGeneratorPage />
                </FeatureRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="creatives"
            element={
              <ProtectedRoute>
                <FeatureRoute feature="creatives">
                  <CreativesPage />
                </FeatureRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="reports"
            element={
              <ProtectedRoute>
                <FeatureRoute feature="reports">
                  <SmartReportsPage />
                </FeatureRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="clinic-information"
            element={
              <ProtectedRoute>
                <ClinicInformationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin"
            element={
              <AdminRoute>
                <AdminPage />
              </AdminRoute>
            }
          />
          <Route
            path="super-admin"
            element={
              <SuperAdminRoute>
                <SuperAdminPage />
              </SuperAdminRoute>
            }
          />
          <Route
            path="settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
