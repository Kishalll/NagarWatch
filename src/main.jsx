import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

window.onerror = function (message, source, lineno, colno, error) {
  console.error('Global Error:', message, error);
  document.body.innerHTML = `<div style="color: red; padding: 20px;">
    <h1>Application Error</h1>
    <pre>${message}</pre>
    <pre>${error?.stack}</pre>
  </div>`;
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
