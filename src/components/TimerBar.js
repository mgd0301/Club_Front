import React from 'react';
import styled from 'styled-components';

const TimerBar = ({ timeLeft, isActive, progress, onToggle, onReset }) => {
  return (
    <Container>
      <Status isActive={isActive}>
        {isActive ? `⏱ ${timeLeft}s` : '⏸ Pausado'}
      </Status>
      
      <ProgressBar>
        <ProgressFill progress={progress} isActive={isActive} />
      </ProgressBar>
      
      <Buttons>
        <Button onClick={onToggle}>
          {isActive ? 'Pausar' : 'Activar'}
        </Button>
        <Button onClick={onReset}>
          Reiniciar
        </Button>
      </Buttons>
    </Container>
  );
};

// Estilos... (mantén tus estilos aquí)
const Container = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 10px;
  background: #f5f5f5;
  border-radius: 8px;
  margin: 10px 0;
`;

const Status = styled.span`
  font-weight: 600;
  color: ${props => props.isActive ? '#28a745' : '#dc3545'};
  min-width: 100px;
`;

const ProgressBar = styled.div`
  flex: 1;
  height: 6px;
  background: #e0e0e0;
  border-radius: 3px;
  overflow: hidden;
`;

const ProgressFill = styled.div`
  width: ${props => props.progress * 100}%;
  height: 100%;
  background: ${props => props.isActive ? '#28a745' : '#6c757d'};
  transition: width 1s linear;
`;

const Buttons = styled.div`
  display: flex;
  gap: 8px;
`;

const Button = styled.button`
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  background: #1877f2;
  color: white;
  cursor: pointer;
  
  &:hover {
    opacity: 0.9;
  }
`;

export default TimerBar;