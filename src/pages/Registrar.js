// src/pages/Registrar.jsx
import React, { useState } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { useNavigate } from 'react-router-dom';

const Registrar = () => {
   const [nombre, setNombre] = useState('');
  const [apodo, setApodo] = useState(''); // Nuevo estado para el apod
  const [email, setEmail] = useState('');  
  const [clave, setClave] = useState('');
  const [confirmClave, setConfirmClave] = useState('');
  const [mostrarClave, setMostrarClave] = useState(false);
  const [mostrarConfirmClave, setMostrarConfirmClave] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje('');
  
    // 1️⃣ Validar que el email no esté vacío
    if (!email.trim()) {
      setMensaje('El email es obligatorio');
      return;
    }
  
    // 2️⃣ Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setMensaje('El email ingresado no es válido');
      return;
    }
  
    // 3️⃣ Validar que las contraseñas coincidan
    if (clave !== confirmClave) {
      setMensaje('Las contraseñas no coinciden');
      return;
    }
  
    try {
      setLoading(true);
      await axios.post(`${API_BASE_URL}/registrar`, {
        nombre: nombre.trim(),
        apodo: apodo.trim(), // Agregar apodo al objeto
        email: email.trim(),
        clave,
      });
  
      alert('Usuario registrado correctamente');
      navigate('/'); // Volver al login
    } catch (err) {
      console.error(err);
      setMensaje(err.response?.data?.error || 'Error al registrar usuario');
    } finally {
      setLoading(false);
    }
  };
  

  return (
    <Container>
      <Title>Registrarse</Title>
      <Form onSubmit={handleSubmit}>
        
            <InputGroup>

            <InputLabel>Nombre:</InputLabel>
                <Input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Nombre"
                    required
                />
            </InputGroup>

            <InputGroup>

            <InputLabel>Apodo:</InputLabel>
                <Input
                    type="text"
                    value={apodo}
                    onChange={(e) => setApodo(e.target.value)}
                    placeholder="Apodo"                    
                />
            </InputGroup>

            <InputGroup>
            <InputLabel>Email:</InputLabel>
            <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email válido"
                required
            />
            </InputGroup>


        <InputGroup>
          <InputLabel>Contraseña:</InputLabel>
          <PasswordWrapper>
            <Input
              type={mostrarClave ? "text" : "password"}
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              placeholder="Contraseña"
            />
            <ToggleButton type="button" onClick={() => setMostrarClave(!mostrarClave)}>
              {mostrarClave ? "🙈" : "👁️"}
            </ToggleButton>
          </PasswordWrapper>
        </InputGroup>

        <InputGroup>
          <InputLabel>Confirmar Contraseña:</InputLabel>
          <PasswordWrapper>
            <Input
              type={mostrarConfirmClave ? "text" : "password"}
              value={confirmClave}
              onChange={(e) => setConfirmClave(e.target.value)}
              placeholder="Repite tu contraseña"
            />
            <ToggleButton type="button" onClick={() => setMostrarConfirmClave(!mostrarConfirmClave)}>
              {mostrarConfirmClave ? "🙈" : "👁️"}
            </ToggleButton>
          </PasswordWrapper>
        </InputGroup>

        <Button type="submit" disabled={loading}>
          {loading ? 'Registrando...' : 'Registrarse'}
        </Button>

        {mensaje && <Mensaje>{mensaje}</Mensaje>}
      </Form>
    </Container>
  );
};

export default Registrar;

// ===== Styled Components =====
const Container = styled.div`
  max-width: 400px;
  margin: 2rem auto;
  padding: 2rem;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 3px 12px rgba(0,0,0,0.15);
`;

const Title = styled.h2`
  text-align: center;
  margin-bottom: 1rem;
  color: #333;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
`;

const InputLabel = styled.label`
  margin-bottom: 4px;
  font-weight: bold;
  color: #333;
`;

const Input = styled.input`
  flex: 1;
  padding: 10px;
  border-radius: 6px;
  border: 1px solid #ccc;
  font-size: 15px;
  outline: none;
  &:focus { border-color: #1877f2; }
`;

const PasswordWrapper = styled.div`
  display: flex;
  align-items: center;
`;

const ToggleButton = styled.button`
  margin-left: 8px;
  padding: 0 8px;
  border: none;
  background: none;
  font-size: 18px;
  cursor: pointer;
`;

const Button = styled.button`
  margin-top: 10px;
  padding: 12px;
  background: #1877f2;
  color: #fff;
  font-weight: 600;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.3s;
  &:hover { background: #166fe5; }
  &:disabled { background: #a0c0f5; cursor: not-allowed; }
`;

const Mensaje = styled.p`
  margin-top: 12px;
  color: red;
  font-weight: 500;
  text-align: center;
`;
