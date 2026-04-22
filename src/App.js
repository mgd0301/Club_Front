import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './contexts/AuthContext';
import Auth from './components/Auth/Auth';
import Dashboard from './pages/Dashboard';
import Evento from './pages/Evento';
import Registrar from './pages/Registrar';
import Persona  from './pages/Persona';
import PersonasAdministrar from './pages/PersonasAdministrar';

import { useContext } from 'react';

const IndexRoute = () => {
  const { currentUser, loading } = useContext(AuthContext);
  if (loading) return <div>Cargando...</div>;
  return currentUser ? <Navigate to="/dashboard" replace /> : <Auth />;
};

const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useContext(AuthContext);
  const token = localStorage.getItem('token');

  if (loading) return <div>Cargando...</div>;

  // 👇 CLAVE: si hay token, dejá entrar
  if (!currentUser && !token) {
    return <Navigate to="/" replace />;
  }

  return children;
};


function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>

          <Route path="/" element={<IndexRoute />} />
          <Route path="/registrar" element={<Registrar />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/evento"
            element={
              <ProtectedRoute>
                <Evento />
              </ProtectedRoute>
            }
          />

          <Route
            path="/persona"
            element={
              <ProtectedRoute>
                <Persona />
              </ProtectedRoute>
            }
          />

        <Route
          path="/admin-personas" // 👈 Cambia de /PersonasAdministrar a /admin-personas
          element={
            <ProtectedRoute>
              <PersonasAdministrar />
            </ProtectedRoute>
          }
        />
      

        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
