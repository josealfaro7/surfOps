import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './components/Landing.jsx';
import { haySesionGuardada } from './lib/sesion.js';
// Fuentes alojadas en la app (sin depender de Google Fonts con mala señal)
import '@fontsource/atkinson-hyperlegible-next/latin-400.css';
import '@fontsource/atkinson-hyperlegible-next/latin-600.css';
import '@fontsource/atkinson-hyperlegible-next/latin-700.css';
import '@fontsource/barlow-semi-condensed/latin-600.css';
import '@fontsource/barlow-semi-condensed/latin-700.css';
import './index.css';

// El ERP completo solo se descarga al entrar a /app: quien mira la portada no
// carga nada de la aplicación.
const App = lazy(() => import('./App.jsx'));

// Vite sirve la app bajo /surfOps/ (ver vite.config.js), así que el router
// trabaja con ese mismo prefijo.
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

// La raíz recibe con la portada, salvo que la escuela ya tenga sesión abierta:
// en ese caso no tiene sentido mostrarle publicidad de lo que ya compró.
function Entrada() {
  if (haySesionGuardada()) {
    return <Navigate to="/app" replace />;
  }
  return <Landing />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename={BASE}>
      <Routes>
        <Route path="/" element={<Entrada />} />
        <Route
          path="/app/*"
          element={
            <Suspense fallback={<div className="min-h-screen bg-slate-100" />}>
              <App />
            </Suspense>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
