import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import * as React from 'react';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';

// Import your pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import SuperAdminDashboard from './pages/admin/SuperAdminDashboard';
import OrganizationsList from './pages/OrganizationsList';
import OrganizationProjects from './pages/OrganizationProjects';

// Import your social media scrapers
import ScrapyInstagramScraper from './pages/ScrapyInstagramScraper';
import ScrapyLinkedInScraper from './pages/ScrapyLinkedInScraper';
import ScrapyTikTokScraper from './pages/ScrapyTikTokScraper';
import ScrapyFacebookScraper from './pages/ScrapyFacebookScraper';
import DataStorage from './pages/DataStorage';
import Analysis from './pages/Analysis';
import Dashboard3 from './pages/Dashboard3';
import AIAnalyticsReport from './pages/AIAnalyticsReport';
import InputSelection from './pages/InputSelection';
import Report from './pages/Report';
import GeneratedReports from './pages/GeneratedReports';

// Import layout
import Layout from './components/layout/Layout';
import NoSidebarLayout from './components/NoSidebarLayout';

// Import theme
import theme from './theme/index';

// Import auth utilities
import { isAuthenticated, getUserRole } from './utils/auth';

// Simple Auth Provider replacement
const SimpleAuthProvider = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

// Simple Protected Route
const SimpleProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

// Simple Admin Route
const SimpleAdminRoute = ({ children, requiredRole }: { children: React.ReactNode; requiredRole: string }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  
  const userRole = getUserRole();
  if (userRole !== requiredRole && userRole !== 'super_admin') {
    return <Navigate to="/organizations" replace />;
  }
  
  return <>{children}</>;
};

function App() {
  // Debug component
  const DebugComponent = () => (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Track Futura - Debug Mode</h1>
      <p>Authentication status: {isAuthenticated() ? 'Authenticated' : 'Not authenticated'}</p>
      <p>User role: {getUserRole()}</p>
      <div style={{ marginTop: '20px' }}>
        <button onClick={() => window.location.href = '/organizations'} style={{ margin: '5px' }}>Organizations</button>
        <button onClick={() => window.location.href = '/admin/super'} style={{ margin: '5px' }}>Super Admin</button>
        <button onClick={() => window.location.href = '/organizations/1/projects/1'} style={{ margin: '5px' }}>Project Dashboard</button>
        <br />
        <button onClick={() => window.location.href = '/organizations/1/projects/1/scrapy-instagram'} style={{ margin: '5px' }}>Instagram</button>
        <button onClick={() => window.location.href = '/organizations/1/projects/1/scrapy-linkedin'} style={{ margin: '5px' }}>LinkedIn</button>
        <button onClick={() => window.location.href = '/organizations/1/projects/1/scrapy-tiktok'} style={{ margin: '5px' }}>TikTok</button>
        <button onClick={() => window.location.href = '/organizations/1/projects/1/scrapy-facebook'} style={{ margin: '5px' }}>Facebook</button>
        <br />
        <button onClick={() => window.location.href = '/organizations/1/projects/1/data-storage'} style={{ margin: '5px' }}>Data Storage</button>
        <button onClick={() => window.location.href = '/organizations/1/projects/1/analysis'} style={{ margin: '5px' }}>Analysis</button>
      </div>
    </div>
  );

  return (
    <SimpleAuthProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <Routes>
            {/* Debug route */}
            <Route path="/debug" element={<DebugComponent />} />
            
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Root route */}
            <Route path="/" element={
              isAuthenticated() ? (
                getUserRole() === 'super_admin' ? (
                  <Navigate to="/admin/super" />
                ) : (
                  <Navigate to="/organizations" />
                )
              ) : (
                <Navigate to="/login" />
              )
            } />

            {/* Admin routes */}
            <Route path="/admin/super" element={
              <SimpleAdminRoute requiredRole="super_admin">
                <NoSidebarLayout>
                  <SuperAdminDashboard />
                </NoSidebarLayout>
              </SimpleAdminRoute>
            } />

            {/* Organizations */}
            <Route path="/organizations" element={
              <SimpleProtectedRoute>
                <NoSidebarLayout>
                  <OrganizationsList />
                </NoSidebarLayout>
              </SimpleProtectedRoute>
            } />
            
            <Route path="/organizations/:organizationId/projects" element={
              <SimpleProtectedRoute>
                <NoSidebarLayout>
                  <OrganizationProjects />
                </NoSidebarLayout>
              </SimpleProtectedRoute>
            } />

            {/* Project Dashboard */}
            <Route path="/organizations/:organizationId/projects/:projectId" element={
              <SimpleProtectedRoute>
                <Layout>
                  <Dashboard3 />
                </Layout>
              </SimpleProtectedRoute>
            } />

            {/* SOCIAL MEDIA SCRAPERS */}
            <Route path="/organizations/:organizationId/projects/:projectId/scrapy-instagram" element={
              <SimpleProtectedRoute>
                <Layout>
                  <ScrapyInstagramScraper />
                </Layout>
              </SimpleProtectedRoute>
            } />
            
            <Route path="/organizations/:organizationId/projects/:projectId/scrapy-linkedin" element={
              <SimpleProtectedRoute>
                <Layout>
                  <ScrapyLinkedInScraper />
                </Layout>
              </SimpleProtectedRoute>
            } />
            
            <Route path="/organizations/:organizationId/projects/:projectId/scrapy-tiktok" element={
              <SimpleProtectedRoute>
                <Layout>
                  <ScrapyTikTokScraper />
                </Layout>
              </SimpleProtectedRoute>
            } />
            
            <Route path="/organizations/:organizationId/projects/:projectId/scrapy-facebook" element={
              <SimpleProtectedRoute>
                <Layout>
                  <ScrapyFacebookScraper />
                </Layout>
              </SimpleProtectedRoute>
            } />

            {/* Alternative routes for social media */}
            <Route path="/organizations/:organizationId/projects/:projectId/instagram-scraper" element={
              <SimpleProtectedRoute>
                <Layout>
                  <ScrapyInstagramScraper />
                </Layout>
              </SimpleProtectedRoute>
            } />
            
            <Route path="/organizations/:organizationId/projects/:projectId/linkedin-scraper" element={
              <SimpleProtectedRoute>
                <Layout>
                  <ScrapyLinkedInScraper />
                </Layout>
              </SimpleProtectedRoute>
            } />
            
            <Route path="/organizations/:organizationId/projects/:projectId/tiktok-scraper" element={
              <SimpleProtectedRoute>
                <Layout>
                  <ScrapyTikTokScraper />
                </Layout>
              </SimpleProtectedRoute>
            } />
            
            <Route path="/organizations/:organizationId/projects/:projectId/facebook-scraper" element={
              <SimpleProtectedRoute>
                <Layout>
                  <ScrapyFacebookScraper />
                </Layout>
              </SimpleProtectedRoute>
            } />

            {/* Data Storage and Analysis */}
            <Route path="/organizations/:organizationId/projects/:projectId/data-storage" element={
              <SimpleProtectedRoute>
                <Layout>
                  <DataStorage />
                </Layout>
              </SimpleProtectedRoute>
            } />
            
            <Route path="/organizations/:organizationId/projects/:projectId/analysis" element={
              <SimpleProtectedRoute>
                <Layout>
                  <Analysis />
                </Layout>
              </SimpleProtectedRoute>
            } />

            {/* AI Analytics Report */}
            <Route path="/organizations/:organizationId/projects/:projectId/ai-analytics/:jobId" element={
              <SimpleProtectedRoute>
                <Layout>
                  <AIAnalyticsReport />
                </Layout>
              </SimpleProtectedRoute>
            } />

            {/* Report System Routes */}
            <Route path="/organizations/:organizationId/projects/:projectId/input-selection" element={
              <SimpleProtectedRoute>
                <Layout>
                  <InputSelection />
                </Layout>
              </SimpleProtectedRoute>
            } />
            
            <Route path="/organizations/:organizationId/projects/:projectId/report" element={
              <SimpleProtectedRoute>
                <Layout>
                  <Report />
                </Layout>
              </SimpleProtectedRoute>
            } />
            
            <Route path="/organizations/:organizationId/projects/:projectId/reports/generated" element={
              <SimpleProtectedRoute>
                <Layout>
                  <GeneratedReports />
                </Layout>
              </SimpleProtectedRoute>
            } />

            {/* Legacy AI Analytics route */}
            <Route path="/ai-analytics/:jobId" element={
              <SimpleProtectedRoute>
                <Layout>
                  <AIAnalyticsReport />
                </Layout>
              </SimpleProtectedRoute>
            } />

            {/* Legacy routes for quick access */}
            <Route path="/scrapy-instagram" element={
              <SimpleProtectedRoute>
                <Layout>
                  <ScrapyInstagramScraper />
                </Layout>
              </SimpleProtectedRoute>
            } />
            
            <Route path="/scrapy-linkedin" element={
              <SimpleProtectedRoute>
                <Layout>
                  <ScrapyLinkedInScraper />
                </Layout>
              </SimpleProtectedRoute>
            } />
            
            <Route path="/scrapy-tiktok" element={
              <SimpleProtectedRoute>
                <Layout>
                  <ScrapyTikTokScraper />
                </Layout>
              </SimpleProtectedRoute>
            } />
            
            <Route path="/scrapy-facebook" element={
              <SimpleProtectedRoute>
                <Layout>
                  <ScrapyFacebookScraper />
                </Layout>
              </SimpleProtectedRoute>
            } />

            {/* Legacy Report System Routes */}
            <Route path="/input-selection" element={
              <SimpleProtectedRoute>
                <Layout>
                  <InputSelection />
                </Layout>
              </SimpleProtectedRoute>
            } />
            
            <Route path="/report" element={
              <SimpleProtectedRoute>
                <Layout>
                  <Report />
                </Layout>
              </SimpleProtectedRoute>
            } />
            
            <Route path="/reports/generated" element={
              <SimpleProtectedRoute>
                <Layout>
                  <GeneratedReports />
                </Layout>
              </SimpleProtectedRoute>
            } />

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/debug" replace />} />
          </Routes>
        </Router>
      </ThemeProvider>
    </SimpleAuthProvider>
  );
}

export default App;