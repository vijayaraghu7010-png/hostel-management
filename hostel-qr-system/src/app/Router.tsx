import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout, ProtectedRoute } from '@/components/layout';
import { Login } from '@/pages/auth/Login';
import { RefreshCw } from 'lucide-react';

// Lazy loading page chunks for performance optimization
const StudentDashboard = lazy(() => import('@/pages/student/Dashboard').then((m) => ({ default: m.StudentDashboard })));
const WardenDashboard = lazy(() => import('@/pages/warden/Dashboard').then((m) => ({ default: m.WardenDashboard })));
const StudentStudyPage = lazy(() => import('@/modules/study/pages/StudentStudyPage'));
const WardenStudyPage = lazy(() => import('@/modules/study/pages/WardenStudyPage'));
const StudentOutpassPage = lazy(() => import('@/modules/outpass/pages/StudentOutpassPage'));
const WardenOutpassPage = lazy(() => import('@/modules/outpass/pages/WardenOutpassPage'));
const AdminDashboard = lazy(() => import('@/modules/admin/pages/AdminDashboard'));
const UniversalScannerPage = lazy(() => import('@/pages/scanner/UniversalScannerPage'));

const PageLoader: React.FC = () => (
  <div className="w-full h-64 flex flex-col items-center justify-center gap-3 text-slate-400">
    <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
    <span className="text-xs font-semibold">Loading Module Chunk...</span>
  </div>
);

export const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/login" replace />} />
            <Route path="login" element={<Login />} />

            {/* Universal Smart Auto-Route Scanner */}
            <Route
              path="scanner"
              element={
                <ProtectedRoute allowedRoles={['warden', 'admin']}>
                  <UniversalScannerPage />
                </ProtectedRoute>
              }
            />

            {/* Student Routes */}
            <Route
              path="student/dashboard"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="student/study"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <StudentStudyPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="student/outpass"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <StudentOutpassPage />
                </ProtectedRoute>
              }
            />

            {/* Warden Routes */}
            <Route
              path="warden/dashboard"
              element={
                <ProtectedRoute allowedRoles={['warden']}>
                  <WardenDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="warden/study"
              element={
                <ProtectedRoute allowedRoles={['warden']}>
                  <WardenStudyPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="warden/outpass"
              element={
                <ProtectedRoute allowedRoles={['warden']}>
                  <WardenOutpassPage />
                </ProtectedRoute>
              }
            />

            {/* Admin Command Center Route */}
            <Route
              path="admin/dashboard"
              element={
                <ProtectedRoute allowedRoles={['warden', 'admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};
