import React, { useEffect, useState, useCallback } from "react";
import styled from "styled-components";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../components/Common/Header";
import { API_BASE_URL } from "../config";
import Swal from "sweetalert2";

const nombreDe = (j) => (j.apodo && j.apodo.trim() ? j.apodo : j.nombre);

const ArmarConvocatoria = () => {
  const { codevento } = useParams();
  const navigate = useNavigate();

  const [evento, setEvento] = useState(null);
  const [jugadores, setJugadores] = useState([]);
  const [original, setOriginal] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const token = localStorage.getItem("token");

  const cargar = useCallback(async () => {
    try {
      const resp = await axios.post(
        `${API_BASE_URL}/evento_convocatoria`,
        { codevento },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEvento(resp.data.evento);
      setJugadores(resp.data.jugadores || []);
      setOriginal(resp.data.jugadores || []);
    } catch (err) {
      console.error("Error cargando convocatoria:", err);
      Swal.fire({
        title: "Error",
        text: "No se pudo cargar la convocatoria",
        icon: "error"
      });
    } finally {
      setCargando(false);
    }
  }, [codevento, token]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const soloLectura = evento?.estado === "F" || evento?.estado === "B";

  const marcar = (codpersona, convocatoria) => {
    if (soloLectura) return;
    setJugadores((prev) =>
      prev.map((j) =>
        j.codpersona === codpersona ? { ...j, convocatoria } : j
      )
    );
  };

  const quitar = (codpersona) => marcar(codpersona, null);

  const hayCambios = jugadores.some((j) => {
    const o = original.find((x) => x.codpersona === j.codpersona);
    return o && o.convocatoria !== j.convocatoria;
  });

  const guardarConvocatoria = async () => {
    const cambios = jugadores.filter((j) => {
      const o = original.find((x) => x.codpersona === j.codpersona);
      return o && o.convocatoria !== j.convocatoria;
    });

    if (cambios.length === 0) return;

    setGuardando(true);
    try {
      await Promise.all(
        cambios.map((j) =>
          axios.post(
            `${API_BASE_URL}/evento_convocatoria_actualizar`,
            { codevento, codpersona: j.codpersona, convocatoria: j.convocatoria },
            { headers: { Authorization: `Bearer ${token}` } }
          )
        )
      );
      setOriginal(jugadores);
      Swal.fire({ title: "Guardado", text: "La convocatoria se guardó correctamente", icon: "success", timer: 1500, showConfirmButton: false });
    } catch (err) {
      console.error("Error guardando convocatoria:", err);
      Swal.fire({ title: "Error", text: "No se pudo guardar la convocatoria", icon: "error" });
    } finally {
      setGuardando(false);
    }
  };

  const handleVolver = async () => {
    if (hayCambios) {
      const result = await Swal.fire({
        title: "Tenés cambios sin guardar",
        text: "Si salís ahora se van a perder",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Salir sin guardar",
        cancelButtonText: "Seguir editando",
      });
      if (!result.isConfirmed) return;
    }
    navigate("/dashboard");
  };

  const handleIrAPartido = async () => {
    if (hayCambios) {
      const result = await Swal.fire({
        title: "Tenés cambios sin guardar",
        text: "Si vas a iniciar el partido sin guardar, la convocatoria se va a perder",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Seguir sin guardar",
        cancelButtonText: "Seguir editando",
      });
      if (!result.isConfirmed) return;
    }
    navigate(`/partido/${codevento}`);
  };

  if (cargando) {
    return (
      <>
        <Header />
        <Centrado>Cargando convocatoria...</Centrado>
      </>
    );
  }

  const titulares = jugadores.filter((j) => j.convocatoria === "T");
  const suplentes = jugadores.filter((j) => j.convocatoria === "S");
  const pool = jugadores.filter((j) => j.convocatoria !== "T" && j.convocatoria !== "S");

  const cantTitulares = evento?.cant_titulares ?? null;
  const cantSuplentes = evento?.cant_suplentes ?? null;

  const faltanTitulares = cantTitulares == null || titulares.length < cantTitulares;
  const faltanSuplentes = cantSuplentes == null || suplentes.length < cantSuplentes;

  const armandoAlgo = faltanTitulares || faltanSuplentes;
  const noCitados = !armandoAlgo ? pool : [];

  const divisionEvento = evento?.divisiones?.[0];
  const divisionLabel = divisionEvento
    ? divisionEvento.division_padre_descripcion
      ? `${divisionEvento.division_padre_descripcion} · ${divisionEvento.descripcion}`
      : divisionEvento.descripcion
    : null;

  return (
    <>
      <Header />
      <Container>
        <Title>Armar convocatoria</Title>
        <SubtitleRow>
          {divisionLabel && <Subtitle>{divisionLabel}</Subtitle>}
          {soloLectura && <SoloLecturaBadge>Evento finalizado · solo lectura</SoloLecturaBadge>}
        </SubtitleRow>

        <Seccion>
          <SeccionHeader>
            <SeccionTitulo>Titulares</SeccionTitulo>
            <Contador ok={cantTitulares != null && titulares.length === cantTitulares}>
              {titulares.length}
              {cantTitulares != null ? ` / ${cantTitulares}` : ""}
            </Contador>
          </SeccionHeader>

          <SlotsLista>
            {titulares.map((j, i) => (
              <SlotOcupado key={j.codpersona}>
                <SlotNumero>{i + 1}</SlotNumero>
                <SlotNombre>{nombreDe(j)}</SlotNombre>
                {!soloLectura && <QuitarBtn onClick={() => quitar(j.codpersona)}>✕</QuitarBtn>}
              </SlotOcupado>
            ))}
          </SlotsLista>

          {faltanTitulares && !soloLectura && (
            <SlotPendiente>
              <Prompt>Elegí al Titular #{titulares.length + 1}</Prompt>
              {pool.length === 0 ? (
                <EmptyState>No quedan jugadores disponibles</EmptyState>
              ) : (
                <PoolGrid>
                  {pool.map((j) => (
                    <PoolBtn key={j.codpersona} onClick={() => marcar(j.codpersona, "T")}>
                      {nombreDe(j)}
                      {j.division_descripcion && (
                        <DivisionTag>{j.division_descripcion}</DivisionTag>
                      )}
                    </PoolBtn>
                  ))}
                </PoolGrid>
              )}
            </SlotPendiente>
          )}
        </Seccion>

        <Seccion>
          <SeccionHeader>
            <SeccionTitulo>Suplentes</SeccionTitulo>
            <Contador ok={cantSuplentes != null && suplentes.length === cantSuplentes}>
              {suplentes.length}
              {cantSuplentes != null ? ` / ${cantSuplentes}` : ""}
            </Contador>
          </SeccionHeader>

          <SlotsLista>
            {suplentes.map((j, i) => (
              <SlotOcupado key={j.codpersona}>
                <SlotNumero>{i + 1}</SlotNumero>
                <SlotNombre>{nombreDe(j)}</SlotNombre>
                {!soloLectura && <QuitarBtn onClick={() => quitar(j.codpersona)}>✕</QuitarBtn>}
              </SlotOcupado>
            ))}
          </SlotsLista>

          {faltanSuplentes && !soloLectura && (
            <SlotPendiente>
              <Prompt>Elegí al Suplente #{suplentes.length + 1}</Prompt>
              {pool.length === 0 ? (
                <EmptyState>No quedan jugadores disponibles</EmptyState>
              ) : (
                <PoolGrid>
                  {pool.map((j) => (
                    <PoolBtn key={j.codpersona} onClick={() => marcar(j.codpersona, "S")}>
                      {nombreDe(j)}
                      {j.division_descripcion && (
                        <DivisionTag>{j.division_descripcion}</DivisionTag>
                      )}
                    </PoolBtn>
                  ))}
                </PoolGrid>
              )}
            </SlotPendiente>
          )}
        </Seccion>

        {(soloLectura || !armandoAlgo) && (
          <Seccion>
            <SeccionHeader>
              <SeccionTitulo>No citados</SeccionTitulo>
              <Contador>{(soloLectura ? pool : noCitados).length}</Contador>
            </SeccionHeader>
            <PoolGrid>
              {(soloLectura ? pool : noCitados).map((j) => (
                <NoCitadoTag key={j.codpersona}>{nombreDe(j)}</NoCitadoTag>
              ))}
            </PoolGrid>
          </Seccion>
        )}

        <FooterButtons>
          <BackButton onClick={handleVolver}>← Volver al Dashboard</BackButton>
          <EventosButton onClick={handleVolver}>📅 Ir a eventos</EventosButton>
          {!soloLectura && (
            <SaveButton onClick={guardarConvocatoria} disabled={!hayCambios || guardando}>
              {guardando ? "Guardando..." : "Guardar convocatoria"}
            </SaveButton>
          )}
          <IniciarPartidoButton onClick={handleIrAPartido}>▶ Iniciar partido</IniciarPartidoButton>
        </FooterButtons>
      </Container>
    </>
  );
};

export default ArmarConvocatoria;

const Container = styled.div`
  max-width: 700px;
  margin: 0 auto;
  padding: 20px;
`;

const Centrado = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #666;
`;

const Title = styled.h2`
  margin-bottom: 4px;
`;

const SubtitleRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 20px;
`;

const Subtitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #4a90e2;
  background: #eef3f9;
  display: inline-block;
  padding: 4px 12px;
  border-radius: 14px;
`;

const SoloLecturaBadge = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #856404;
  background: #fff3cd;
  display: inline-block;
  padding: 4px 12px;
  border-radius: 14px;
`;

const Seccion = styled.div`
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
`;

const SeccionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
`;

const SeccionTitulo = styled.h3`
  margin: 0;
  font-size: 16px;
  color: #333;
`;

const Contador = styled.div`
  padding: 4px 12px;
  border-radius: 16px;
  background: ${(props) => (props.ok ? "#d4edda" : "#eef3f9")};
  color: ${(props) => (props.ok ? "#155724" : "#34495e")};
  font-weight: 700;
  font-size: 13px;
`;

const SlotsLista = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
`;

const SlotOcupado = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: #f5f8fc;
  border-radius: 8px;
`;

const SlotNumero = styled.span`
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #4a90e2;
  color: white;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const SlotNombre = styled.span`
  flex: 1;
  font-weight: 600;
  color: #333;
`;

const QuitarBtn = styled.button`
  border: none;
  background: transparent;
  color: #dc3545;
  cursor: pointer;
  font-size: 14px;
  padding: 4px;

  &:hover {
    opacity: 0.7;
  }
`;

const SlotPendiente = styled.div`
  border-top: 1px dashed #ddd;
  padding-top: 10px;
`;

const Prompt = styled.div`
  font-weight: 600;
  color: #4a90e2;
  margin-bottom: 10px;
`;

const PoolGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const PoolBtn = styled.button`
  padding: 8px 14px;
  border-radius: 20px;
  border: none;
  background: #ecf0f1;
  color: #333;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;

  &:hover {
    background: #dbe4ea;
  }
`;

const DivisionTag = styled.span`
  font-size: 10px;
  font-weight: 500;
  color: #4a90e2;
  background: #dceafc;
  padding: 2px 6px;
  border-radius: 8px;
`;

const NoCitadoTag = styled.span`
  padding: 6px 12px;
  border-radius: 16px;
  background: #f4f4f4;
  color: #777;
  font-size: 13px;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 20px;
  color: #999;
`;

const FooterButtons = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  padding: 24px 0;
`;

const BackButton = styled.button`
  background: transparent;
  border: 2px solid #4a90e2;
  color: #4a90e2;
  padding: 10px 24px;
  border-radius: 30px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: #4a90e2;
    color: white;
  }
`;

const SaveButton = styled.button`
  background: ${({ disabled }) => (disabled ? "#a5d6b0" : "#2ecc71")};
  border: none;
  color: white;
  padding: 10px 24px;
  border-radius: 30px;
  font-size: 16px;
  font-weight: 600;
  cursor: ${({ disabled }) => (disabled ? "not-allowed" : "pointer")};

  &:hover {
    background: ${({ disabled }) => (disabled ? "#a5d6b0" : "#27ae60")};
  }
`;

const EventosButton = styled.button`
  background: transparent;
  border: 2px solid #95a5a6;
  color: #555;
  padding: 10px 24px;
  border-radius: 30px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: #95a5a6;
    color: white;
  }
`;

const IniciarPartidoButton = styled.button`
  background: #1d3557;
  border: none;
  color: white;
  padding: 10px 24px;
  border-radius: 30px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: #16273f;
  }
`;
