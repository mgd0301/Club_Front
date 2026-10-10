import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";
import axios from "axios";
import { AuthContext } from "../contexts/AuthContext";
import { API_BASE_URL } from "../config";
import Header from "../components/Common/Header";
import { useNavigate } from "react-router-dom";
import { localToUTC } from "../utils/helpers";

const CrearEvento = () => {
  const navigate = useNavigate();
  const { currentUser, currentClub, currentDisciplina } = useContext(AuthContext);

  const [divisiones, setDivisiones] = useState([]);
  const [divisionesSeleccionadas, setDivisionesSeleccionadas] = useState([]);
  const [divisionesTodas, setDivisionesTodas] = useState([]);

  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [observacion, setObservacion] = useState("");
  const [loading, setLoading] = useState(false);
  const [tipoEvento, setTipoEvento] = useState("E"); // 'E' Entrenamiento | 'P' Partido
  const [divisionPadreSeleccionada, setDivisionPadreSeleccionada] = useState(null);
  const [subdivisionSeleccionada, setSubdivisionSeleccionada] = useState(null);

  const [clubesRivales, setClubesRivales] = useState([]);
  const [codclubRival, setCodclubRival] = useState("");

  // Para un partido primero se elige la división (M14) entre las que la persona tiene
  // acceso/permiso. Si esa división tiene sub-divisiones (A, B), recién ahí aparecen
  // debajo para elegir una sí o sí; si no tiene, la división elegida ya es la jugable.
  const hijosDeSeleccionada = divisionPadreSeleccionada
    ? divisionesTodas.filter((d) => d.coddivision_padre === divisionPadreSeleccionada)
    : [];

  const handleSeleccionarPadre = (coddivision) => {
    setDivisionPadreSeleccionada(coddivision);
    const tieneHijos = divisionesTodas.some((d) => d.coddivision_padre === coddivision);
    setSubdivisionSeleccionada(tieneHijos ? null : coddivision);
  };

  /* =========================
     Cargar divisiones
     ========================= */


     useEffect(() => {
  const hoy = new Date();
  
  const year = hoy.getFullYear();
  const month = String(hoy.getMonth() + 1).padStart(2, "0");
  const day = String(hoy.getDate()).padStart(2, "0");

  const fechaLocal = `${year}-${month}-${day}`;
  
  setFecha(fechaLocal);
}, []);


  useEffect(() => {
    if (
      !currentUser?.codpersona ||
      !currentClub?.codclub ||
      !currentDisciplina?.coddisciplina
    )
      return;

    fetchDivisionesPersona();
  }, [currentUser, currentClub, currentDisciplina]);

  useEffect(() => {
    if (!currentClub?.codclub || !currentDisciplina?.coddisciplina) return;

    const fetchDivisionesTodas = async () => {
      try {
        const resp = await axios.post(
          `${API_BASE_URL}/divisiones_disciplina`,
          {
            coddisciplina: currentDisciplina.coddisciplina,
            codclub: currentClub.codclub,
          },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        setDivisionesTodas(resp.data);
      } catch (err) {
        console.error("Error cargando divisiones del club:", err);
      }
    };

    fetchDivisionesTodas();
  }, [currentClub, currentDisciplina]);

  useEffect(() => {
    if (tipoEvento !== "P" || !currentDisciplina?.coddisciplina) {
      setClubesRivales([]);
      setCodclubRival("");
      return;
    }

    const fetchClubesRivales = async () => {
      try {
        const resp = await axios.post(
          `${API_BASE_URL}/clubes_por_disciplina`,
          {
            coddisciplina: currentDisciplina.coddisciplina,
            codclub_excluir: currentClub?.codclub,
          },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        setClubesRivales(resp.data);
      } catch (err) {
        console.error("Error cargando clubes rivales:", err);
      }
    };

    fetchClubesRivales();
  }, [tipoEvento, currentDisciplina, currentClub]);









const registrarEvento = async () => {
    if (loading) return;

    const divisionesAEnviar =
      tipoEvento === "P"
        ? (subdivisionSeleccionada ? [subdivisionSeleccionada] : [])
        : divisionesSeleccionadas;

    if (!divisionesAEnviar || divisionesAEnviar.length === 0) {
        alert(
          tipoEvento === "P"
            ? "Debe seleccionar la división/sub-división que juega el partido"
            : "Debe seleccionar al menos una división para registrar el evento"
        );
        return;
    }

    try {
        setLoading(true);

        console.log("tipo usuario:" + currentUser.codpersona + "-" + currentUser.tipo_usuario);

        // 🔥 Convertir fecha y hora local del usuario a UTC
        // Si no hay hora, usamos "00:00"
        const fechaHoraUTC = localToUTC(fecha, hora || "00:00");

        if (!fechaHoraUTC) {
            alert("Error al convertir la fecha/hora");
            return;
        }

        // Separar la fecha UTC y la hora UTC (sin segundos)
        const [fechaUTC, horaUTCCompleta] = fechaHoraUTC.split(' ');
        const horaUTC = horaUTCCompleta.substring(0, 5); // "HH:MM"

        console.log("Original local:", fecha, hora);
        console.log("Enviando UTC:", fechaUTC, horaUTC);

        const resp = await axios.post(
            `${API_BASE_URL}/nuevo_evento`,
            {
                fecha: fechaUTC,      // 🔥 fecha en UTC
                hora: horaUTC,        // 🔥 hora en UTC
                observacion,
                divisiones: divisionesAEnviar,
                tipo: tipoEvento,
                subtipo: 'C',
                coddisciplina: currentDisciplina?.coddisciplina,
                codclub: currentClub?.codclub,
                codclub_rival: tipoEvento === "P" ? (codclubRival || null) : null
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

  const registrarEventoOld = async () => {

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
          <Label>Tipo de evento</Label>
          <DivisionesGrid>
            <DivisionBtn
              active={tipoEvento === "E"}
              onClick={() => {
                setTipoEvento("E");
                setDivisionPadreSeleccionada(null);
                setSubdivisionSeleccionada(null);
              }}
            >
              Entrenamiento
            </DivisionBtn>
            <DivisionBtn
              active={tipoEvento === "P"}
              onClick={() => {
                setTipoEvento("P");
                setDivisionPadreSeleccionada(null);
                setSubdivisionSeleccionada(null);
              }}
            >
              Partido
            </DivisionBtn>
          </DivisionesGrid>
        </Section>

        {tipoEvento === "E" ? (
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
        ) : (
          <>
            <Section>
              <Label>División que juega</Label>
              <DivisionesGrid>
                {divisiones.map((d) => (
                  <DivisionBtn
                    key={d.coddivision}
                    active={divisionPadreSeleccionada === d.coddivision}
                    onClick={() => handleSeleccionarPadre(d.coddivision)}
                  >
                    {d.descripcion}
                  </DivisionBtn>
                ))}
              </DivisionesGrid>
            </Section>

            {hijosDeSeleccionada.length > 0 && (
              <Section>
                <Label>Sub-división</Label>
                <DivisionesGrid>
                  {hijosDeSeleccionada.map((d) => (
                    <DivisionBtn
                      key={d.coddivision}
                      active={subdivisionSeleccionada === d.coddivision}
                      onClick={() => setSubdivisionSeleccionada(d.coddivision)}
                    >
                      {d.descripcion}
                    </DivisionBtn>
                  ))}
                </DivisionesGrid>
              </Section>
            )}

            <Section>
              <Label>Rival</Label>
              <Select
                value={codclubRival}
                onChange={(e) => setCodclubRival(e.target.value)}
              >
                <option value="">Sin definir</option>
                {clubesRivales.map((c) => (
                  <option key={c.codclub} value={c.codclub}>
                    {c.descripcion}
                  </option>
                ))}
              </Select>
              {clubesRivales.length === 0 && (
                <small>
                  No hay clubes cargados con esta disciplina todavía.
                </small>
              )}
            </Section>
          </>
        )}

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

const Select = styled.select`
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
