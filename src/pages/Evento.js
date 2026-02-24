import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";
import axios from "axios";
import { AuthContext } from "../contexts/AuthContext";
import { API_BASE_URL } from "../config";
import Header from "../components/Common/Header";
import { useNavigate } from "react-router-dom";

const CrearEvento = () => {
  const navigate = useNavigate();
  const { currentUser, currentClub, currentDisciplina } = useContext(AuthContext);

  const [divisiones, setDivisiones] = useState([]);
  const [divisionesSeleccionadas, setDivisionesSeleccionadas] = useState([]);

  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [observacion, setObservacion] = useState("");
  const [loading, setLoading] = useState(false);

  /* =========================
     Cargar divisiones
     ========================= */
  useEffect(() => {
    if (
      !currentUser?.codpersona ||
      !currentClub?.codclub ||
      !currentDisciplina?.coddisciplina
    )
      return;

    fetchDivisionesPersona();
  }, [currentUser, currentClub, currentDisciplina]);



  const registrarEvento = async () => {

    if (loading) return;
  try {
    setLoading(true);

    

    console.log("tipo usuario:" + currentUser.codpersona + "-" + currentUser.tipo_usuario);

  //  if (currentUser.tipo_usuario !==1){
    //    alert("No tiene permiso para crear eventos");
      //  return;
    //}
    await axios.post(
      `${API_BASE_URL}/nuevo_evento`,
      {
        fecha,
        hora: hora || null,
        observacion,
        divisiones: divisionesSeleccionadas,
        tipo: 'E',
        subtipo: 'C'
      },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      }
    );

    alert("Evento creado correctamente");
    navigate("/dashboard");

  } catch (err) {
    console.error(err);
    alert("Error al crear evento");
  } finally {
    setLoading(false);
  }
};



  const fetchDivisionesPersona = async () => {
    try {
      const resp = await axios.post(
        `${API_BASE_URL}/divisiones_persona`,
        {
          codpersona: currentUser.codpersona,
          codclub: currentClub.codclub,
          coddisciplina: currentDisciplina.coddisciplina,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      setDivisiones(resp.data);
    } catch (err) {
      console.error("Error cargando divisiones:", err);
    }
  };

  /* =========================
     Toggle división
     ========================= */
  const toggleDivision = (coddivision) => {
    setDivisionesSeleccionadas((prev) =>
      prev.includes(coddivision)
        ? prev.filter((d) => d !== coddivision)
        : [...prev, coddivision]
    );
  };

  /* =========================
     Guardar evento
     ========================= */
  const guardarEvento = async () => {
    if (!divisionesSeleccionadas.length) {
      alert("Seleccioná al menos una división");
      return;
    }

    try {
      await axios.post(
        `${API_BASE_URL}/eventos`,
        {
          fecha: fecha || null,
          hora: hora || null,
          observacion,
          divisiones: divisionesSeleccionadas,
          tipo: "E", // Entrenamiento
          subtipo: "C", // Campo por ahora
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      navigate("/dashboard");
    } catch (err) {
      console.error("Error creando evento:", err);
      alert("Error al crear evento");
    }
  };

  return (
    <>
      <Header />

      <Container>
        <Title>Crear Evento</Title>

        <Section>
          <Label>Fecha (opcional)</Label>
          <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </Section>

        <Section>
          <Label>Hora (opcional)</Label>
          <Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
        </Section>

        <Section>
          <Label>Divisiones</Label>
          <DivisionesGrid>
            {divisiones.map((d) => (
              <DivisionBtn
                key={d.coddivision}
                active={divisionesSeleccionadas.includes(d.coddivision)}
                onClick={() => toggleDivision(d.coddivision)}
              >
                {d.descripcion}
              </DivisionBtn>
            ))}
          </DivisionesGrid>
        </Section>

        <Section>
          <Label>Observacion</Label>
          <Textarea
            rows={4}
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
          />
        </Section>
        
        {loading && <p>Creando evento, por favor espere...</p>}
        
        <Buttons>
          <Cancel onClick={() => navigate("/dashboard")}>Cancelar</Cancel>
          <Save onClick={registrarEvento} disabled={loading}>
          {loading ? "Guardando..." : "Registrar"}
        </Save>
        </Buttons>
      </Container>
    </>
  );
};

export default CrearEvento;

/* =========================
   Styled
   ========================= */

const Container = styled.div`
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
`;

const Title = styled.h2`
  margin-bottom: 20px;
`;

const Section = styled.div`
  margin-bottom: 18px;
`;

const Label = styled.label`
  display: block;
  font-weight: 600;
  margin-bottom: 6px;
`;

const Input = styled.input`
  width: 100%;
  padding: 10px;
`;

const Textarea = styled.textarea`
  width: 100%;
  padding: 10px;
`;

const DivisionesGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`;

const DivisionBtn = styled.button`
  padding: 8px 14px;
  border-radius: 20px;
  border: none;
  cursor: pointer;
  background: ${({ active }) => (active ? "#e63946" : "#1d3557")};
  color: white;
`;

const Buttons = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
`;

const Save = styled.button`
  padding: 10px 18px;
  background: ${({ disabled }) => (disabled ? "#95a5a6" : "#2ecc71")};
  border: none;
  color: white;
  cursor: ${({ disabled }) => (disabled ? "not-allowed" : "pointer")};
`;

const Cancel = styled.button`
  padding: 10px 18px;
  background: #bdc3c7;
  border: none;
  cursor: pointer;
`;
