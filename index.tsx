import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { LanguageProvider } from './hooks/useTranslation';
import { AuthProvider } from './hooks/useAuth';
import { isFirebaseConfigured } from './services/firebase';
import FirebaseSetup from './components/FirebaseSetup';

const Main = () => {
  const [bypassFirebase, setBypassFirebase] = useState(false);
  
  const showSetup = isFirebaseConfigured() === false && bypassFirebase === false;

  if (showSetup) {
    return <FirebaseSetup onBypass={() => setBypassFirebase(true)} />;
  }

  return (
    <LanguageProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </LanguageProvider>
  );
};


const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <Main />
  </React.StrictMode>
);
