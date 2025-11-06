import React from 'react';

interface FirebaseSetupProps {
  onBypass: () => void;
}

const firebaseConfigCode = `
// File: services/firebase.ts

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
`;

const FirebaseSetup: React.FC<FirebaseSetupProps> = ({ onBypass }) => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center mb-6">
          <svg className="w-8 h-8 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Firebase Configuration Required</h1>
        </div>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          To enable user authentication and save chat history, you need to connect the application to your own Firebase project.
        </p>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Please follow these steps:
        </p>
        <ol className="list-decimal list-inside space-y-4 text-gray-600 dark:text-gray-300 mb-6">
          <li>
            Go to the{' '}
            <a
              href="https://console.firebase.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-600 hover:underline dark:text-teal-400 font-medium"
            >
              Firebase Console
            </a>
            {' '}and create a new project (or use an existing one).
          </li>
          <li>
            In your project, add a new Web App. You will be provided with a `firebaseConfig` object.
          </li>
          <li>
            Copy the values from your Firebase project's config object and paste them into the file below, replacing the placeholder values like `"YOUR_API_KEY"`.
          </li>
        </ol>

        <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4">
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
            File to edit: <code className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded">services/firebase.ts</code>
          </p>
          <pre className="text-sm bg-white dark:bg-gray-800 p-4 rounded-md overflow-x-auto">
            <code className="text-gray-800 dark:text-gray-200">{firebaseConfigCode.trim()}</code>
          </pre>
        </div>
         <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Or, you can{' '}
          <button
            onClick={onBypass}
            className="font-medium text-teal-600 hover:text-teal-500 dark:text-teal-400 dark:hover:text-teal-300 underline"
          >
            continue without signing in
          </button>
          . Your chat history will not be saved.
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
          After you've updated the file, the application will automatically reload.
        </p>
      </div>
    </div>
  );
};

export default FirebaseSetup;
