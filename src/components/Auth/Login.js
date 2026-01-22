import React, { useState, useContext, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import { API_BASE_URL } from '../../config';

const Login = () => {
  const [identificador, setIdentificador] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const { setCurrentUser } = useContext(AuthContext);
  const navigate = useNavigate();

  // 👉 Si ya hay token, no mostrar login
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const doLogin = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/login`, {
        tipo: 'N',
        identificador,
        password
      });

      const { token, usuario } = response.data;

      localStorage.setItem('token', token);

      setCurrentUser({
        codpersona: usuario.codpersona,
        email: usuario.email,
        apodo: usuario.apodo,
        nombre: usuario.nombre,
        photoURL: usuario.fotoperfil,
        tipo_usuario: usuario.tipo_usuario
      });

      localStorage.setItem(
  'currentUser',
  JSON.stringify({
    codpersona: usuario.codpersona,
    email: usuario.email,
    apodo: usuario.apodo,
    nombre: usuario.nombre,
    photoURL: usuario.fotoperfil,
    tipo_usuario: usuario.tipo_usuario
  })
);

      navigate('/dashboard');
    } catch (err) {
      alert(err.response?.data?.mensaje || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    doLogin();
  };

  return (
    <Container>
      <Title>Iniciar Sesión</Title>
      <Title>Clubip</Title>

      <Form onSubmit={handleSubmit}>
        <InputGroup>
          <Input
            type="text"
            name="username"
            placeholder="Email, usuario o teléfono"
            value={identificador}
            onChange={(e) => setIdentificador(e.target.value)}
            autoComplete="username"
            required
          />
        </InputGroup>

        <InputGroup>
          <Input
            type="password"
            name="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </InputGroup>

        <Button type="submit" disabled={loading}>
          {loading ? 'Accediendo...' : 'Entrar'}
        </Button>

        {loading && <Spinner />}
      </Form>
    </Container>
  );
};

export default Login;


// ===== Styled Components =====
const Container = styled.div`
  max-width: 400px;
  margin: 0 auto;
  padding: 2rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
`;

const Title = styled.h2`
  text-align: center;
  margin-bottom: 1.5rem;
  color: #333;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const InputGroup = styled.div`
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #f9f9f9;
`;

const Input = styled.input`
  width: 100%;
  border: none;
  outline: none;
  padding: 8px;
  background: transparent;
  font-size: 16px;
`;

const Button = styled.button`
  padding: 12px;
  background: #1877f2;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;

  &:disabled {
    background: #a0c0f5;
    cursor: not-allowed;
  }
`;

const Spinner = styled.div`
  margin: 10px auto;
  width: 24px;
  height: 24px;
  border: 3px solid #ccc;
  border-top: 3px solid #333;
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
