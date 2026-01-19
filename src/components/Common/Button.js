// src/components/Button.js
import styled from "styled-components";

export const Button = styled.button`
  background: ${(props) => (props.primary ? "#1877f2" : "#f0f2f5")};
  color: ${(props) => (props.primary ? "white" : "#1877f2")};
  padding: 12px;
  border: none;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  width: 100%;
`;