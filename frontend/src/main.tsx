import * as React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Declare API_BASE_URL on Window interface to fix TypeScript error
declare global {
  interface Window {
    API_BASE_URL: string;
  }
}

// Set the API base URL based on environment
window.API_BASE_URL = import.meta.env.PROD
  ? `https://${window.location.hostname}` // Use same domain in production
  : 'http://127.0.0.1:8000'; // Use direct backend URL in development

console.log('🚀 Starting Track Futura...');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
