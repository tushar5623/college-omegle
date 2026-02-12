import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// --- YE DO LINES ADD KARO (Video Fix) ---
import { Buffer } from 'buffer';
window.Buffer = Buffer;
// ----------------------------------------

ReactDOM.createRoot(document.getElementById('root')).render(
    <App />
)