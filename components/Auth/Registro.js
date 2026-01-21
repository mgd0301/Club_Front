// src/components/Auth/Registro.js
import React, { useState } from 'react';
import { FaUser, FaEnvelope, FaPhone, FaLock } from 'react-icons/fa';
import styled from 'styled-components';

const Registro = ({ switchToLogin }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone: '',
    password: ''
  });
  const [method, setMethod] = useState('email');

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Datos de registro:', formData);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <Container>
      <Title>Crear Cuenta</Title>
      
      <ToggleContainer>
        <ToggleButton 
          active={method === 'email'} 
          onClick={() => setMethod('email')}
          type="button"
        >
          <FaEnvelope /> Email
        </ToggleButton>
        <ToggleButton 
          active={method === 'phone'} 
          onClick={() => setMethod('phone')}
          type="button"
        >
          <FaPhone /> Teléfono
        </ToggleButton>
      </ToggleContainer>
      
      <Form onSubmit={handleSubmit}>
        <InputGroup>
          <FaUser />
          <Input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            placeholder="Nombre de usuario"
            required
          />
        </InputGroup>
        
        {method === 'email' ? (
          <InputGroup>
            <FaEnvelope />
            <Input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Correo electrónico"
              required
            />
          </InputGroup>
        ) : (
          <InputGroup>
            <FaPhone />
            <Input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Número de teléfono"
              required
            />
          </InputGroup>
        )}
        
        <InputGroup>
          <FaLock />
          <Input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Contraseña"
            required
            minLength="6"
          />
        </InputGroup>
        
        <Button type="submit">Registrarse</Button>
      </Form>
      
      <SwitchText>
        ¿Ya tienes cuenta?{' '}
        <SwitchLink onClick={switchToLogin}>Inicia sesión</SwitchLink>
      </SwitchText>
    </Container>
  );
};

const Container = styled.div`
  max-width: 400px;
  margin: 0 auto;
  padding: 2rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
`;

const Title = styled.h2`
  text-align: center;
  margin-bottom: 1.5rem;
  color: #333;
`;

const ToggleContainer = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 1rem;
`;

const ToggleButton = styled.button`
  flex: 1;
  padding: 10px;
  background: ${props => props.active ? '#1877f2' : '#f0f2f5'};
  color: ${props => props.active ? 'white' : '#333'};
  border: none;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 14px;
  transition: all 0.3s;

  &:hover {
    background: ${props => props.active ? '#1877f2' : '#e4e6eb'};
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const InputGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #f9f9f9;
`;

const Input = styled.input`
  flex: 1;
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
  transition: background 0.3s;

  &:hover {
    background: #166fe5;
  }
`;

const SwitchText = styled.p`
  text-align: center;
  margin-top: 1rem;
  color: #666;
  font-size: 14px;
`;

const SwitchLink = styled.span`
  color: #1877f2;
  cursor: pointer;
  font-weight: 600;

  &:hover {
    text-decoration: underline;
  }
`;

export default Registro;
