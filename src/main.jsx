import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { initDb } from './services/db.js';
import './styles.css';
initDb().finally(() => createRoot(document.getElementById('root')).render(<App />));
