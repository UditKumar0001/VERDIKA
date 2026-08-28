import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Navbar Component
 * Navigation bar for Verdika platform.
 */
export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">Verdika</Link>
      </div>
      <div className="navbar-links">
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/login">Login</Link>
        <Link to="/signup">Sign Up</Link>
      </div>
    </nav>
  );
}
