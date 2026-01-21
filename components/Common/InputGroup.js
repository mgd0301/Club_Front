// src/components/InputGroup.js
import styled from "styled-components";
import { FaUser, FaEnvelope, FaLock, FaPhone, FaCalendarAlt } from "react-icons/fa";

// Componente contenedor
export const InputGroup = styled.div`
  position: relative;
  margin-bottom: 1.5rem;
  width: 100%;
`;

// Estilos base del input
export const Input = styled.input`
  width: 100%;
  padding: 12px 16px 12px 40px;
  font-size: 16px;
  border: 1.5px solid #e0e0e0;
  border-radius: 8px;
  transition: all 0.3s ease;
  outline: none;
  background-color: #f9f9f9;

  &:focus {
    border-color: #1877f2;
    box-shadow: 0 0 0 3px rgba(24, 119, 242, 0.2);
    background-color: white;
  }

  &::placeholder {
    color: #a0a0a0;
  }
`;

// Contenedor de ícono
export const IconWrapper = styled.span`
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #606770;
  font-size: 16px;
`;

// Componente con ícono dinámico
export const InputWithIcon = ({ iconType, ...props }) => {
  const getIcon = () => {
    switch (iconType) {
      case "user":
        return <FaUser />;
      case "email":
        return <FaEnvelope />;
      case "password":
        return <FaLock />;
      case "phone":
        return <FaPhone />;
      case "date":
        return <FaCalendarAlt />;
      default:
        return <FaUser />;
    }
  };

  return (
    <InputGroup>
      <IconWrapper>{getIcon()}</IconWrapper>
      <Input {...props} />
    </InputGroup>
  );
};

// Versión extendida con label y validación
export const InputField = ({ 
  label, 
  iconType, 
  error, 
  ...props 
}) => (
  <div style={{ marginBottom: "1rem", width: "100%" }}>
    {label && (
      <Label htmlFor={props.id || props.name}>
        {label}
        {props.required && <Required>*</Required>}
      </Label>
    )}
    <InputWithIcon iconType={iconType} {...props} />
    {error && <ErrorMessage>{error}</ErrorMessage>}
  </div>
);

// Estilos adicionales
const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  color: #606770;
  font-weight: 500;
`;

const Required = styled.span`
  color: #f02849;
  margin-left: 4px;
`;

const ErrorMessage = styled.div`
  color: #f02849;
  font-size: 13px;
  margin-top: 6px;
  padding-left: 8px;
`;