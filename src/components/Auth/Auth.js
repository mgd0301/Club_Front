// src/components/Auth/Auth.js
import React, { useState } from 'react';
import Login from './Login';
import Registro from './Registro';
import styled from 'styled-components';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <AuthContainer>
      {isLogin ? (
        <Login switchToRegistro={() => setIsLogin(false)} />
      ) : (
        <Registro switchToLogin={() => setIsLogin(true)} />
      )}
    </AuthContainer>
  );
};

const AuthContainer = styled.div`
  max-width: 420px;
  margin: 3rem auto;
  padding: 1rem;
`;

export default Auth;
