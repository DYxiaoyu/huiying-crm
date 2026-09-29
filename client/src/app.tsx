import React from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import NotFound from './pages/NotFound/NotFound';
import CustomersPage from './pages/customers/CustomersPage';
import CustomerDetailPage from './pages/customer-detail/CustomerDetailPage';
import SuppliersPage from './pages/suppliers/SuppliersPage';
import SupplierKeysPage from './pages/supplier-keys/SupplierKeysPage';
import SupplierApplyPage from './pages/supplier-apply/SupplierApplyPage';
import LeadFormPage from './pages/lead/LeadFormPage';
import AdminPage from './pages/admin/AdminPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import FilesPage from './pages/files/FilesPage';
import LoginPage from './pages/login/LoginPage';

const ProtectedRoute = ({ children }: { children: React.ReactElement }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

/** 老板后台：仅管理员可访问，普通员工访问跳回概览 */
const AdminRoute = ({ children }: { children: React.ReactElement }) => {
  const { isAuthenticated, employee } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (employee?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return children;
};

const RoutesComponent = () => {
  return (
    <AuthProvider>
      <Routes>
        {/* 公开页：供应商提交（无需登录） */}
        <Route path="/join" element={<SupplierApplyPage />} />
        <Route path="/enquiry" element={<LeadFormPage />} />
        <Route path="/lead" element={<Navigate to="/enquiry" replace />} />
        {/* 兼容旧链接 */}
        <Route path="/supplier-register" element={<Navigate to="/join" replace />} />

        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="customers/:id" element={<CustomerDetailPage />} />
          <Route path="suppliers" element={<SuppliersPage />} />
          <Route path="supplier-keys" element={<SupplierKeysPage />} />
          <Route path="files" element={<FilesPage />} />
          <Route
            path="admin"
            element={
              <AdminRoute>
                <AdminPage />
              </AdminRoute>
            }
          />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  );
};

export default RoutesComponent;
