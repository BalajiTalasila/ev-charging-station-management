import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider, useAuth } from './context/AuthContext';

import LandingPage   from './pages/auth/LandingPage';
import LoginPage     from './pages/auth/LoginPage';
import RegisterPage  from './pages/auth/RegisterPage';

import UserLayout          from './pages/user/UserLayout';
import UserHome            from './pages/user/UserHome';
import NearbyStations      from './pages/user/NearbyStations';
import StationDetail       from './pages/user/StationDetail';
import MyBookings          from './pages/user/MyBookings';
import UserNotifications   from './pages/user/UserNotifications';
import UserProfile         from './pages/user/UserProfile';

import ManagerLayout       from './pages/manager/ManagerLayout';
import ManagerOverview     from './pages/manager/ManagerOverview';
import ManageChargers      from './pages/manager/ManageChargers';
import ManageSlots         from './pages/manager/ManageSlots';
import ManagerBookings     from './pages/manager/ManagerBookings';
import ManagerReports      from './pages/manager/ManagerReports';

import AdminLayout         from './pages/admin/AdminLayout';
import AdminDashboard      from './pages/admin/AdminDashboard';
import ManageStations      from './pages/admin/ManageStations';
import ManageManagers      from './pages/admin/ManageManagers';
import ManageUsers         from './pages/admin/ManageUsers';
import AllBookings         from './pages/admin/AllBookings';

function ProtectedRoute({ children, allowedRole }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-center"><div className="spinner"/></div>;
  if (!user) return <Navigate to="/" replace />;
  if (allowedRole && user.role !== allowedRole) return <Navigate to="/" replace />;
  return children;
}

function RoleRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  if (user.role === 'ADMIN')   return <Navigate to="/admin"   replace />;
  if (user.role === 'MANAGER') return <Navigate to="/manager" replace />;
  return <Navigate to="/user" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/"          element={<LandingPage />} />
          <Route path="/login"     element={<LoginPage />} />
          <Route path="/register"  element={<RegisterPage />} />
          <Route path="/redirect"  element={<RoleRedirect />} />

          {/* User */}
          <Route path="/user" element={<ProtectedRoute allowedRole="USER"><UserLayout /></ProtectedRoute>}>
            <Route index       element={<UserHome />} />
            <Route path="stations"           element={<NearbyStations />} />
            <Route path="stations/:id"       element={<StationDetail />} />
            <Route path="bookings"           element={<MyBookings />} />
            <Route path="notifications"      element={<UserNotifications />} />
            <Route path="profile"            element={<UserProfile />} />
          </Route>

          {/* Manager */}
          <Route path="/manager" element={<ProtectedRoute allowedRole="MANAGER"><ManagerLayout /></ProtectedRoute>}>
            <Route index              element={<ManagerOverview />} />
            <Route path="chargers"    element={<ManageChargers />} />
            <Route path="slots"       element={<ManageSlots />} />
            <Route path="bookings"    element={<ManagerBookings />} />
            <Route path="reports"     element={<ManagerReports />} />
          </Route>

          {/* Admin */}
          <Route path="/admin" element={<ProtectedRoute allowedRole="ADMIN"><AdminLayout /></ProtectedRoute>}>
            <Route index               element={<AdminDashboard />} />
            <Route path="stations"     element={<ManageStations />} />
            <Route path="managers"     element={<ManageManagers />} />
            <Route path="users"        element={<ManageUsers />} />
            <Route path="bookings"     element={<AllBookings />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
    </AuthProvider>
  );
}
