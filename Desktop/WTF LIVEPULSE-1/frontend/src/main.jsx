import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import globalStyles from './styles/global.css?raw';

function injectGlobalStyles() {
  const styleId = 'wtf-livepulse-global-styles';

  if (document.getElementById(styleId)) {
    return;
  }

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = globalStyles;
  document.head.appendChild(style);
}

injectGlobalStyles();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
