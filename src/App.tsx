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
import { AdminPage } from './pages/AdminPage';
import { useStore } from './store/useStore';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useStore();
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useStore();
  if (!user) return <Navigate to="/login" />;
  if (user.role !== 'admin') return <Navigate to="/" />;
  return <>{children}</>;
}

function FeatureRoute({ children, feature }: { children: React.ReactNode; feature: string }) {
  const { user } = useStore();
  if (!user) return <Navigate to="/login" />;
  if (!user.enabledFeatures?.includes(feature)) return <Navigate to="/" />;
  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
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
            path="admin"
            element={
              <AdminRoute>
                <AdminPage />
              </AdminRoute>
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