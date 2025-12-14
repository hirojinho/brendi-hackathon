import React from 'react';
import ReactDOM from 'react-dom/client';
import { DesktopApp } from './components/DesktopApp';
import { SimpleDesktopApp } from './components/SimpleDesktopApp';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SimpleDesktopApp />
  </React.StrictMode>,
);