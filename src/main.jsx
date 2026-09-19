import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import { missingVars } from './firebase/config';
import './index.css';

function ConfigNotice() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="brand-mark">CT</div>
          <div>
            <strong>ClassTrack</strong>
            <span>Configuration required</span>
          </div>
        </div>
        <h2>Firebase not configured</h2>
        <p>
          Add your Firebase web app keys to a <code>.env.local</code> file at the project root.
        </p>
        <div className="alert alert-danger">
          Missing variables: <code>{missingVars.join(', ')}</code>
        </div>
        <p className="mt-3" style={{ fontSize: 13 }}>
          Copy <code>.env.example</code> to <code>.env.local</code>, fill in the values from the
          Firebase Console, then restart the dev server.
        </p>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));

if (missingVars && missingVars.length) {
  root.render(
    <React.StrictMode>
      <ConfigNotice />
    </React.StrictMode>
  );
} else {
  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </React.StrictMode>
  );
}