import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [currentClub, setCurrentClub] = useState(null);
  const [currentDisciplina, setCurrentDisciplina] = useState(null);

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
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
