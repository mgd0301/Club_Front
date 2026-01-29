import React, { useEffect, useState } from "react";
import axios from "axios";
import styled from "styled-components";
import { API_BASE_URL } from "../config";

const ActividadesJugadores = ({
  codactividad,
  divisiones,
  actividades,
}) => {
  const [personas, setPersonas] = useState([]);
  const [filtroNombre, setFiltroNombre] = useState("");
  const [loading, setLoading] = useState(false);

  /* =========================
     Cargar personas
     ========================= */

  useEffect(() => {
    if (!codactividad || !divisiones || divisiones.length === 0) {
      setPersonas([]);
      return;
    }

    fetchPersonasDivision();
  }, [codactividad, divisiones]);

  const fetchPersonasDivision = async () => {
    try {
      setLoading(true);

      const respuestas = await Promise.all(
        divisiones.map((division) =>
          axios.post(
            `${API_BASE_URL}/personas_division`,
            { coddivision: division.coddivision },
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            }
          )
        )
      );

      const todas = respuestas.flatMap((r) => r.data);

      // eliminar duplicados
      const unicas = Array.from(
        new Map(todas.map((p) => [p.codpersona, p])).values()
      );

      setPersonas(unicas);
    } catch (err) {
      console.error("Error cargando personas actividad", err);
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     Actividad activa
     ========================= */

  const actividad = actividades?.find(
    (a) => a.codactividad === codactividad
  );

  const nombreActividad = actividad?.descripcion || "...";

  /* =========================
     Filtro
     ========================= */

  const personasFiltradas = personas.filter(
    (p) =>
      p.nombre?.toLowerCase().includes(filtroNombre.toLowerCase()) ||
      p.apodo?.toLowerCase().includes(filtroNombre.toLowerCase())
  );

  /* =========================
     Render
     ========================= */

  return (
    <Wrapper>
      <Header>
        <h3>Asistencia a {nombreActividad}</h3>

        <Input
          type="text"
          placeholder="Buscar persona..."
          value={filtroNombre}
          onChange={(e) => setFiltroNombre(e.target.value)}
        />
      </Header>

      {loading && <p>Cargando personas...</p>}

      {!loading && personasFiltradas.length === 0 && (
        <p>No hay personas para mostrar</p>
      )}

      <Lista>
        {personasFiltradas.map((p) => (
          <Fila key={p.codpersona}>
            <Nombre>{p.apodo || p.nombre}</Nombre>

            <Botones>
              <BtnAsistir>Asistir</BtnAsistir>
              <BtnCancelar>Cancelar</BtnCancelar>
            </Botones>
          </Fila>
        ))}
      </Lista>
    </Wrapper>
  );
};

export default ActividadesJugadores;

/* =========================
   Styles
   ========================= */

const Wrapper = styled.div`
  margin-top: 16px;
`;

const Header = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;

  h3 {
    margin: 0;
  }
`;

const Input = styled.input`
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid #ccc;
  width: 100%;
`;

const Lista = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Fila = styled.div`
  background: #fff;
  border-radius: 10px;
  padding: 10px 12px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);

  display: flex;
  justify-content: space-between;
  align-items: center;

  @media (max-width: 600px) {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
`;

const Nombre = styled.span`
  font-weight: 600;
`;

const Botones = styled.div`
  display: flex;
  gap: 6px;

  @media (max-width: 600px) {
    justify-content: space-between;
  }
`;

const BtnAsistir = styled.button`
  background: #28a745;
  color: white;
  border: none;
  padding: 6px 10px;
  border-radius: 6px;
  cursor: pointer;
  flex: 1;
`;

const BtnCancelar = styled.button`
  background: #dc3545;
  color: white;
  border: none;
  padding: 6px 10px;
  border-radius: 6px;
  cursor: pointer;
  flex: 1;
`;
