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
import ApplicationStatus from './pages/ApplicationStatus';
import AcceptInvite from './pages/AcceptInvite';

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

              {/* Protected Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/application/:id"
                element={
                  <ProtectedRoute>
                    <ApplicationDetail />
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
