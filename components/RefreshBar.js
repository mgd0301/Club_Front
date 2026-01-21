import React from 'react';
import styled, { keyframes } from 'styled-components';

const fillBar = keyframes`
  0% { width: 0%; }
  100% { width: 100%; }
`;

const RefreshBar = ({ 
  isVisible = false,
  duration = 1500,
  height = "4px",
  color = "#588162ff",
  background = "#e0e0e0"
}) => {
  return (
    <Container isVisible={isVisible}>
      <ProgressBar height={height} background={background}>
        {isVisible && (
          <ProgressFill 
            duration={duration} 
            color={color} 
            height={height} 
          />
        )}
      </ProgressBar>
    </Container>
  );
};

// ===== ESTILOS CORREGIDOS =====
const Container = styled.div`
  width: 100%;
  height: 10px;        /* ← deja SIEMPRE espacio */
  margin: 10px 0;
  opacity: ${props => (props.isVisible ? 1 : 0)};
  transition: opacity 0.3s ease;
  pointer-events: none;  /* ← no molesta si está invisible */
`;

const ProgressBar = styled.div`
  width: 20%;
  height: ${props => props.height};
  background: ${props => props.background};
  border-radius: 2px;
  overflow: hidden;
`;

const ProgressFill = styled.div`
  width: 0%;
  height: ${props => props.height};
  background: ${props => props.color};
  animation: ${fillBar} ${props => props.duration || 1500}ms ease-in-out forwards;
`;

export default RefreshBar;
