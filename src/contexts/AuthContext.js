// AuthContext.js
import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentClub, setCurrentClub] = useState(null);
  const [currentDisciplina, setCurrentDisciplina] = useState(null);
  const [seccionActiva, setSeccionActiva] = useState("inicio");
  const [personasDivision, setPersonasDivision] = useState([]);
  
  // 👇 NUEVO: Agregar divisiones seleccionadas al contexto
  const [divisionesSeleccionadas, setDivisionesSeleccionadas] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('currentUser');

    if (token && storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    } else {
      setCurrentUser(null);
    }

    setLoading(false);
  }, []);

  const logout = () => {
    setCurrentUser(null);
    setCurrentClub(null);
    setCurrentDisciplina(null);
    setSeccionActiva("inicio");
    setPersonasDivision([]);
    setDivisionesSeleccionadas([]); // 👈 Limpiar también
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        loading,
        currentClub,
        setCurrentClub,
        currentDisciplina,
        setCurrentDisciplina,
        logout,
        seccionActiva,
        setSeccionActiva,
        personasDivision,
        setPersonasDivision,
        // 👇 EXPORTAR los nuevos valores
        divisionesSeleccionadas,
        setDivisionesSeleccionadas
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};