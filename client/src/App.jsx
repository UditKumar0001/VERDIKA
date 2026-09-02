import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import VerdiChatbot from './components/VerdiChatbot';
import './App.css';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import ApplicationDetail from './pages/ApplicationDetail';
import NewApplication from './pages/NewApplication';
import PublicApply from './pages/PublicApply';
import CompanySelector from './pages/CompanySelector';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import ApplicationStatus from './pages/ApplicationStatus';
import AcceptInvite from './pages/AcceptInvite';
import {
  AboutPage,
  PricingPage,
  BlogPage,
  CareersPage,
  SecurityPage,
  PrivacyPage,
  TermsPage,
  CompliancePage
} from './pages/StaticPages';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Navbar />
          <main className="main-content">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/apply" element={<CompanySelector />} />
              <Route path="/apply/:companySlug" element={<PublicApply />} />
              <Route path="/status/:applicationToken" element={<ApplicationStatus />} />
              <Route path="/invite/:token" element={<AcceptInvite />} />

              {/* Informational & Legal Pages */}
              <Route path="/about" element={<AboutPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/blog" element={<BlogPage />} />
              <Route path="/careers" element={<CareersPage />} />
              <Route path="/security" element={<SecurityPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/compliance" element={<CompliancePage />} />

              {/* Protected Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'underwriter', 'merchant']}>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/application/:id"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'underwriter', 'merchant']}>
                    <ApplicationDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/super-admin/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['super_admin']}>
                    <SuperAdminDashboard />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </main>
          <Footer />
          {/* Floating AI Chatbot Assistant (Visible on all pages) */}
          <VerdiChatbot />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
