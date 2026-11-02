// AdministrarSistema.jsx
import React, { useState } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import Header from "../components/Common/Header";

const CLAVE_SUPERADMIN = "osamayague";

const AdministrarSistema = () => {
  const navigate = useNavigate();

  const [desbloqueado, setDesbloqueado] = useState(
    sessionStorage.getItem("superadmin_ok") === "1"
  );
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");

  const intentarDesbloquear = () => {
    if (clave === CLAVE_SUPERADMIN) {
      sessionStorage.setItem("superadmin_ok", "1");
      setDesbloqueado(true);
      setError("");
    } else {
      setError("Clave incorrecta");
    }
  };

  if (!desbloqueado) {
    return (
      <GateContainer>
        <GateBox>
          <h2>Acceso restringido</h2>
          <p>Ingresá la clave para administrar el sistema.</p>
          <input
            type="password"
            placeholder="Clave"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") intentarDesbloquear(); }}
            autoFocus
          />
          <button onClick={intentarDesbloquear}>Entrar</button>
          {error && <ErrorMsg>{error}</ErrorMsg>}
        </GateBox>
      </GateContainer>
    );
  }

  return (
    <>
      <Header />

      <Container>
        <Title>Administrar sistema</Title>
        <Subtitle>
          Alta de clubes, asociación de disciplinas, divisiones y personas.
        </Subtitle>

        <CardsGrid>
          <Card onClick={() => navigate("/admin-clubes")}>
            <CardTitle>🏟️ Clubes y disciplinas</CardTitle>
            <CardDesc>
              Crear un club nuevo y elegir qué disciplinas practica.
            </CardDesc>
          </Card>

          <Card onClick={() => navigate("/admin-divisiones")}>
            <CardTitle>📋 Divisiones</CardTitle>
            <CardDesc>
              Crear las divisiones de cada club y disciplina (ej: Primera, M18).
            </CardDesc>
          </Card>

          <Card onClick={() => navigate("/persona")}>
            <CardTitle>🧑 Personas</CardTitle>
            <CardDesc>
              Dar de alta una persona nueva o buscar una existente para
              sumarla a otro club/disciplina. Elegí antes el club y la
              disciplina arriba en el selector.
            </CardDesc>
          </Card>
        </CardsGrid>
      </Container>
    </>
  );
};

export default AdministrarSistema;

const GateContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #f1f3f5;
`;

const GateBox = styled.div`
  background: white;
  padding: 32px;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
  width: 320px;
  text-align: center;

  h2 {
    margin: 0 0 8px;
  }

  p {
    color: #666;
    font-size: 13px;
    margin-bottom: 16px;
  }

  input {
    width: 100%;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 8px;
    margin-bottom: 12px;
    box-sizing: border-box;
  }

  button {
    width: 100%;
    padding: 10px;
    border: none;
    border-radius: 8px;
    background: #4a90e2;
    color: white;
    font-weight: 600;
    cursor: pointer;
  }
`;

const ErrorMsg = styled.div`
  color: #dc3545;
  font-size: 13px;
  margin-top: 10px;
`;

const Container = styled.div`
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
`;

const Title = styled.h2`
  margin-bottom: 4px;
`;

const Subtitle = styled.p`
  color: #666;
  margin-bottom: 24px;
`;

const CardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.div`
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition: 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.1);
  }
`;

const CardTitle = styled.h3`
  margin: 0 0 8px;
  font-size: 16px;
`;

const CardDesc = styled.p`
  margin: 0;
  font-size: 13px;
  color: #666;
`;
