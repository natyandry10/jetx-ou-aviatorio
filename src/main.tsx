import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { GoogleDriveAuthProvider } from './auth/GoogleDriveAuthContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleDriveAuthProvider>
      <App />
    </GoogleDriveAuthProvider>
  </StrictMode>,
);
