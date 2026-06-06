import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Posts from './pages/Posts';
import Collabs from './pages/Collabs';
import AISummarizer from './pages/AISummarizer';

// Main Layout Wrapper containing the sidebar navigation and page content panels
const MainLayout = ({ children }) => {
  return (
    <div className="layout-wrapper">
      <Sidebar />
      {children}
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Authentication Pages */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Creator Dashboard Pages */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Dashboard />
                </MainLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/posts" 
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Posts />
                </MainLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/collabs" 
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Collabs />
                </MainLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/ai-summarizer" 
            element={
              <ProtectedRoute>
                <MainLayout>
                  <AISummarizer />
                </MainLayout>
              </ProtectedRoute>
            } 
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
