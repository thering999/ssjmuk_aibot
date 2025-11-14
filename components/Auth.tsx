import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getProjectId } from '../services/firebase';
import LoadingIndicator from './LoadingIndicator';

const Auth: React.FC = () => {
  const { user, signIn, signOut, loading, error: authError } = useAuth();
  const [errorInfo, setErrorInfo] = useState<{ code: string; message: string } | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (authError) {
        setErrorInfo(authError);
    }
  }, [authError]);

  const handleSignIn = () => {
    setErrorInfo(null);
    signIn();
  };
  
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const renderError = () => {
    if (!errorInfo) return null;

    if (errorInfo.code === 'auth/unauthorized-domain') {
        const currentDomain = window.location.hostname;
        const projectId = getProjectId();
        const settingsUrl = projectId
            ? `https://console.firebase.google.com/project/${projectId}/authentication/settings`
            : 'https://console.firebase.google.com/';

        return (
            <div className="mt-4 p-6 bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-400 dark:border-orange-500 rounded-r-lg">
                <div className="flex">
                    <div className="flex-shrink-0">
                        <svg className="h-6 w-6 text-orange-500 dark:text-orange-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div className="ml-4 flex-1">
                        <h3 className="text-xl font-bold text-orange-900 dark:text-orange-100 mb-2">Action Required: Authorize Your Domain</h3>
                        <p className="text-orange-800 dark:text-orange-200 mb-6">
                            This is a one-time security step. To sign in, you must tell Firebase that it's safe for this web address to make requests.
                        </p>
                        
                        <div className="space-y-6">
                            {/* Step 1 */}
                            <div className="flex items-start">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-200 dark:bg-orange-800 text-orange-700 dark:text-orange-200 flex items-center justify-center font-bold text-lg">1</div>
                                <div className="ml-4">
                                    <h4 className="font-semibold text-orange-900 dark:text-orange-100">Open your Firebase security settings.</h4>
                                    <a href={settingsUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-2 px-4 py-2 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors text-sm">
                                        Go to Firebase Auth Settings
                                    </a>
                                </div>
                            </div>
                            
                            {/* Step 2 */}
                             <div className="flex items-start">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-200 dark:bg-orange-800 text-orange-700 dark:text-orange-200 flex items-center justify-center font-bold text-lg">2</div>
                                <div className="ml-4">
                                    <h4 className="font-semibold text-orange-900 dark:text-orange-100">Find the "Authorized domains" list and click <strong className="font-mono bg-orange-100 dark:bg-orange-900/50 px-1 py-0.5 rounded">Add domain</strong>.</h4>
                                    <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                                        You may already see <code className="text-xs bg-orange-100 dark:bg-orange-900/50 px-1 rounded">localhost</code> and your deployed site here. You need to add the one you're using for development right now.
                                    </p>
                                </div>
                            </div>

                            {/* Step 3 */}
                            <div className="flex items-start">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-200 dark:bg-orange-800 text-orange-700 dark:text-orange-200 flex items-center justify-center font-bold text-lg">3</div>
                                <div className="ml-4">
                                    <h4 className="font-semibold text-orange-900 dark:text-orange-100">Copy your current domain below and paste it in.</h4>
                                    <div className="mt-2 p-3 bg-orange-100 dark:bg-orange-900/40 rounded-md flex items-center justify-between">
                                        <code className="font-mono text-lg text-teal-700 dark:text-teal-300 select-all">{currentDomain}</code>
                                        <button 
                                            onClick={() => handleCopy(currentDomain)} 
                                            className="ml-4 px-3 py-1 text-sm bg-white dark:bg-gray-700 rounded shadow text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50"
                                            disabled={isCopied}
                                        >
                                            {isCopied ? 'Copied!' : 'Copy'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <p className="mt-6 font-semibold text-orange-800 dark:text-orange-200">
                            After adding the domain, refresh this page and sign in again.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Fallback for other errors
    let title = "An Error Occurred";
    let message = errorInfo.message;

    if (errorInfo.code === 'auth/configuration-not-found') {
      title = "Action Required: Configuration Error";
      message = "Sign-in failed. Please ensure the 'Google' provider is enabled in your Firebase project's Authentication settings.";
    }
    
    return (
       <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-r-lg">
            <div className="flex">
                <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                </div>
                <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-900 dark:text-red-100">{title}</h3>
                    <div className="mt-2 text-sm text-red-800 dark:text-red-200">
                      <p>{message}</p>
                    </div>
                </div>
            </div>
        </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-2">
        <LoadingIndicator className="h-5 w-5 text-gray-500" />
      </div>
    );
  }
  
  if (user) {
    return (
      <div className="flex items-center space-x-2">
        <img src={user.photoURL || undefined} alt={user.displayName || 'User'} className="w-8 h-8 rounded-full" />
        <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.displayName}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
        </div>
        <button onClick={signOut} title="Sign Out" className="p-2 rounded text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={handleSignIn}
        className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
      >
        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        Sign in with Google
      </button>
      {renderError()}
    </div>
  );
};

export default Auth;