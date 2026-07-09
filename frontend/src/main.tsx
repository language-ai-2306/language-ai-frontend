import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import { initGlobalErrorHandlers } from './api/errorLog';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

// Catch async / event-handler errors the React ErrorBoundary can't see.
initGlobalErrorHandlers();

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

createRoot(rootEl).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
