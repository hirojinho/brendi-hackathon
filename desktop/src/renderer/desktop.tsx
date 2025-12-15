import React from 'react';
import ReactDOM from 'react-dom/client';
import { DesktopApp } from './components/DesktopApp';
import { SimpleDesktopApp } from './components/SimpleDesktopApp';
import { DebugDesktopApp } from './components/DebugDesktopApp';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DesktopApp />
  </React.StrictMode>,
);