
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import UserApp from './UserApp';
import { AuthProvider } from './contexts/AuthContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// URL 기반 라우팅
// /admin -> CMS (관리자용 App)
// / -> 사용자용 UserApp
const isAdminRoute = window.location.pathname === '/admin';

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthProvider>
      {isAdminRoute ? <App /> : <UserApp />}
    </AuthProvider>
  </React.StrictMode>
);
