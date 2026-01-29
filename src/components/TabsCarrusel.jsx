// src/components/TabsCarrusel.jsx

import React from 'react';
import styled from 'styled-components';

const TabsCarrusel = ({ tabs, active, onChange, size = "md" }) => {
  return (
    <Container>
      {tabs.map((tab) => (
        <TabButton
          key={tab.id}
          active={active === tab.id}
          size={size}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </TabButton>
      ))}
    </Container>
  );
};

export default TabsCarrusel;



// ======= styled =======

const Container = styled.div`
  display: flex;
  overflow-x: auto;
  gap: 12px;
  padding: 10px 5px;
  scrollbar-width: none; /* Firefox */
  
  &::-webkit-scrollbar {
    display: none; /* Chrome */
  }
`;
const TabButton = styled.button`
  flex: 0 0 auto;
  border-radius: 30px;
  border: none;
  cursor: pointer;
  font-weight: bold;

  padding: ${({ size }) =>
    size === "sm" ? "6px 14px" : "10px 20px"};

  font-size: ${({ size }) =>
    size === "sm" ? "10px" : "10px"};

  background: ${({ active }) => (active ? "#e63946" : "#1d3557")};
  color: white;

  transition: 0.2s;

  &:hover {
    opacity: 0.8;
  }
`;
