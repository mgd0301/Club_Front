// AdministrarGrupos.jsx
import React, { useEffect, useState, useContext, useCallback } from "react";
import { AuthContext } from "../contexts/AuthContext";
import styled from "styled-components";
import Header from "../components/Common/Header";
import { API_BASE_URL } from "../config";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";

const AdministrarGrupos = () => {
  const { currentClub } = useContext(AuthContext);
  const navigate = useNavigate();

  const [grupos, setGrupos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [grupoSeleccionado, setGrupoSeleccionado] = useState(null);
  const [nombreGrupo, setNombreGrupo] = useState("");
  const [nombreNuevoGrupo, setNombreNuevoGrupo] = useState("");

  const [miembros, setMiembros] = useState([]);
  const [cargandoMiembros, setCargandoMiembros] = useState(false);

  const [busqueda, setBusqueda] = useState("");
  const [resultadosBusqueda, setResultadosBusqueda] = useState([]);
  const [buscando, setBuscando] = useState(false);

  const token = localStorage.getItem("token");

  const cargarGrupos = useCallback(async () => {
    if (!currentClub?.codclub) return;

    try {
      const res = await fetch(`${API_BASE_URL}/grupos_listar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ codclub: currentClub.codclub })
      });

      if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);

      const data = await res.json();
      setGrupos(data);
    } catch (error) {
      console.error("Error cargando grupos:", error);
      Swal.fire({
        title: "Error",
        text: "No se pudieron cargar los grupos",
        icon: "error",
        timer: 2000
      });
    } finally {
      setCargando(false);
    }
  }, [currentClub, token]);

  useEffect(() => {
    setCargando(true);
    cargarGrupos();
  }, [cargarGrupos]);

  const cargarMiembros = useCallback(async (codgrupo) => {
    if (!codgrupo) return;
    setCargandoMiembros(true);
    try {
      const res = await fetch(`${API_BASE_URL}/grupo_personas_listar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ codgrupo })
      });

      if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);

      const data = await res.json();
      setMiembros(data);
    } catch (error) {
      console.error("Error cargando miembros del grupo:", error);
      Swal.fire({
        title: "Error",
        text: "No se pudieron cargar los integrantes del grupo",
        icon: "error",
        timer: 2000
      });
    } finally {
      setCargandoMiembros(false);
    }
  }, [token]);

  const seleccionarGrupo = (grupo) => {
    setGrupoSeleccionado(grupo);
    setNombreGrupo(grupo.descripcion);
    setBusqueda("");
    setResultadosBusqueda([]);
    cargarMiembros(grupo.codgrupo);
  };

  const crearGrupo = async (e) => {
    e.preventDefault();

    if (!nombreNuevoGrupo.trim()) {
      Swal.fire({
        title: "Falta el nombre",
        text: "Ingrese un nombre para el grupo",
        icon: "warning",
        timer: 2000
      });
      return;
    }

    setGuardando(true);
    try {
      const res = await fetch(`${API_BASE_URL}/grupo_guardar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          codclub: currentClub.codclub,
          descripcion: nombreNuevoGrupo.trim()
        })
      });

      const data = await res.json();

      if (!res.ok) {
        Swal.fire({
          title: "No se pudo crear el grupo",
          text: data.mensaje || "Error desconocido",
          icon: "error"
        });
        return;
      }

      setNombreNuevoGrupo("");
      await cargarGrupos();
    } catch (error) {
      console.error("Error creando grupo:", error);
      Swal.fire({
        title: "Error",
        text: "No se pudo crear el grupo",
        icon: "error"
      });
    } finally {
      setGuardando(false);
    }
  };

  const renombrarGrupo = async (e) => {
    e.preventDefault();
    if (!grupoSeleccionado) return;

    if (!nombreGrupo.trim()) {
      Swal.fire({
        title: "Falta el nombre",
        text: "Ingrese un nombre para el grupo",
        icon: "warning",
        timer: 2000
      });
      return;
    }

    setGuardando(true);
    try {
      const res = await fetch(`${API_BASE_URL}/grupo_guardar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          codgrupo: grupoSeleccionado.codgrupo,
          codclub: currentClub.codclub,
          descripcion: nombreGrupo.trim()
        })
      });

      const data = await res.json();

      if (!res.ok) {
        Swal.fire({
          title: "No se pudo guardar",
          text: data.mensaje || "Error desconocido",
          icon: "error"
        });
        return;
      }

      await cargarGrupos();
      setGrupoSeleccionado({ ...grupoSeleccionado, descripcion: nombreGrupo.trim() });
    } catch (error) {
      console.error("Error renombrando grupo:", error);
      Swal.fire({
        title: "Error",
        text: "No se pudo renombrar el grupo",
        icon: "error"
      });
    } finally {
      setGuardando(false);
    }
  };

  const eliminarGrupo = async (grupo) => {
    const result = await Swal.fire({
      title: "¿Eliminar grupo?",
      html: `¿Eliminar el grupo <strong>${grupo.descripcion}</strong>?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar"
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`${API_BASE_URL}/grupo_eliminar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ codgrupo: grupo.codgrupo })
      });

      const data = await res.json();

      if (!res.ok) {
        Swal.fire({
          title: "No se pudo eliminar",
          text: data.mensaje || "Error desconocido",
          icon: "error"
        });
        return;
      }

      if (grupoSeleccionado?.codgrupo === grupo.codgrupo) {
        setGrupoSeleccionado(null);
        setMiembros([]);
      }
      await cargarGrupos();
    } catch (error) {
      console.error("Error eliminando grupo:", error);
      Swal.fire({
        title: "Error",
        text: "No se pudo eliminar el grupo",
        icon: "error"
      });
    }
  };

  const buscarPersonas = useCallback(async (texto) => {
    if (!currentClub?.codclub || !texto.trim()) {
      setResultadosBusqueda([]);
      return;
    }

    setBuscando(true);
    try {
      const res = await fetch(`${API_BASE_URL}/personas_club`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ codclub: currentClub.codclub, filtro: texto.trim(), soloJugadores: true })
      });

      if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);

      const data = await res.json();
      setResultadosBusqueda(data);
    } catch (error) {
      console.error("Error buscando personas:", error);
    } finally {
      setBuscando(false);
    }
  }, [currentClub, token]);

  useEffect(() => {
    const timer = setTimeout(() => buscarPersonas(busqueda), 350);
    return () => clearTimeout(timer);
  }, [busqueda, buscarPersonas]);

  const esMiembro = (codpersona) =>
    miembros.some((m) => m.codpersona === codpersona);

  const agregarPersona = async (persona) => {
    if (!grupoSeleccionado) return;

    try {
      const res = await fetch(`${API_BASE_URL}/grupo_persona_agregar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          codgrupo: grupoSeleccionado.codgrupo,
          codpersona: persona.codpersona
        })
      });

      const data = await res.json();

      if (!res.ok) {
        Swal.fire({
          title: "No se pudo agregar",
          text: data.mensaje || "Error desconocido",
          icon: "error"
        });
        return;
      }

      await cargarMiembros(grupoSeleccionado.codgrupo);
      await cargarGrupos();
    } catch (error) {
      console.error("Error agregando persona al grupo:", error);
      Swal.fire({
        title: "Error",
        text: "No se pudo agregar la persona",
        icon: "error"
      });
    }
  };

  const quitarPersona = async (persona) => {
    if (!grupoSeleccionado) return;

    try {
      const res = await fetch(`${API_BASE_URL}/grupo_persona_quitar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          codgrupo: grupoSeleccionado.codgrupo,
          codpersona: persona.codpersona
        })
      });

      const data = await res.json();

      if (!res.ok) {
        Swal.fire({
          title: "No se pudo quitar",
          text: data.mensaje || "Error desconocido",
          icon: "error"
        });
        return;
      }

      await cargarMiembros(grupoSeleccionado.codgrupo);
      await cargarGrupos();
    } catch (error) {
      console.error("Error quitando persona del grupo:", error);
      Swal.fire({
        title: "Error",
        text: "No se pudo quitar la persona",
        icon: "error"
      });
    }
  };

  const volverAlDashboard = () => navigate("/dashboard");

  if (cargando) {
    return (
      <>
        <Header />
        <LoadingContainer>
          <LoadingSpinner />
          <p>Cargando grupos...</p>
        </LoadingContainer>
      </>
    );
  }

  if (!currentClub) {
    return (
      <>
        <Header />
        <EmptyStateContainer>
          <h3>Seleccione un club primero</h3>
          <p>Vuelva al dashboard y seleccione un club.</p>
          <BackButton onClick={volverAlDashboard} style={{ marginTop: "20px" }}>
            ← Volver al Dashboard
          </BackButton>
        </EmptyStateContainer>
      </>
    );
  }

  return (
    <>
      <Header />
      <Container>
        {/* COLUMNA 1: lista de grupos */}
        <Column>
          <Title>Grupos</Title>

          <Form onSubmit={crearGrupo}>
            <Label>Nuevo grupo:</Label>
            <ButtonGroup>
              <TextInput
                type="text"
                value={nombreNuevoGrupo}
                onChange={(e) => setNombreNuevoGrupo(e.target.value)}
                placeholder="Ej: ACADEMIA"
                style={{ marginBottom: 0 }}
              />
              <Button type="submit" disabled={guardando} style={{ flex: "0 0 auto", marginBottom: 0 }}>
                + Crear
              </Button>
            </ButtonGroup>
          </Form>

          <GrupoLista>
            {grupos.length === 0 ? (
              <EmptyListItem>No hay grupos creados todavía</EmptyListItem>
            ) : (
              grupos.map((grupo) => (
                <GrupoRow
                  key={grupo.codgrupo}
                  activo={grupoSeleccionado?.codgrupo === grupo.codgrupo}
                >
                  <GrupoNombre onClick={() => seleccionarGrupo(grupo)}>
                    {grupo.descripcion}
                    <GrupoCantidad>{grupo.cantidad_personas} persona(s)</GrupoCantidad>
                  </GrupoNombre>
                  <RemoveButton onClick={() => eliminarGrupo(grupo)} title="Eliminar grupo">
                    ✕
                  </RemoveButton>
                </GrupoRow>
              ))
            )}
          </GrupoLista>
        </Column>

        {/* COLUMNA 2: detalle del grupo seleccionado */}
        <Column>
          {!grupoSeleccionado ? (
            <EmptyListItem>Seleccioná un grupo de la izquierda, o creá uno nuevo.</EmptyListItem>
          ) : (
            <>
              <Title>Integrantes de "{grupoSeleccionado.descripcion}"</Title>

              <Form onSubmit={renombrarGrupo}>
                <Label>Nombre del grupo:</Label>
                <ButtonGroup>
                  <TextInput
                    type="text"
                    value={nombreGrupo}
                    onChange={(e) => setNombreGrupo(e.target.value)}
                    style={{ marginBottom: 0 }}
                  />
                  <Button type="submit" disabled={guardando} style={{ flex: "0 0 auto", marginBottom: 0 }}>
                    💾 Guardar
                  </Button>
                </ButtonGroup>
              </Form>

              <Label style={{ marginTop: "16px" }}>Agregar persona (cualquier división):</Label>
              <TextInput
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre..."
              />

              {busqueda.trim() && (
                <ResultadosBusqueda>
                  {buscando ? (
                    <EmptyListItem>Buscando...</EmptyListItem>
                  ) : resultadosBusqueda.length === 0 ? (
                    <EmptyListItem>Sin resultados</EmptyListItem>
                  ) : (
                    resultadosBusqueda.map((persona) => (
                      <ResultadoRow key={persona.codpersona}>
                        <PersonaInfo>
                          <strong>{persona.nombre}</strong>
                          {persona.divisiones && persona.divisiones.length > 0 && (
                            <PersonaDivisiones>
                              {persona.divisiones.map((d) => d.descripcion).join(", ")}
                            </PersonaDivisiones>
                          )}
                        </PersonaInfo>
                        {esMiembro(persona.codpersona) ? (
                          <YaAgregado>Ya está en el grupo</YaAgregado>
                        ) : (
                          <SmallLink onClick={() => agregarPersona(persona)}>+ agregar</SmallLink>
                        )}
                      </ResultadoRow>
                    ))
                  )}
                </ResultadosBusqueda>
              )}

              <Label style={{ marginTop: "16px" }}>
                Integrantes actuales ({miembros.length}):
              </Label>
              <MiembrosLista>
                {cargandoMiembros ? (
                  <EmptyListItem>Cargando...</EmptyListItem>
                ) : miembros.length === 0 ? (
                  <EmptyListItem>Este grupo todavía no tiene personas</EmptyListItem>
                ) : (
                  miembros.map((persona) => (
                    <MiembroRow key={persona.codpersona}>
                      <PersonaInfo>
                        <strong>{persona.nombre}</strong>
                        {persona.divisiones && persona.divisiones.length > 0 && (
                          <PersonaDivisiones>
                            {persona.divisiones.map((d) => d.descripcion).join(", ")}
                          </PersonaDivisiones>
                        )}
                      </PersonaInfo>
                      <RemoveButton onClick={() => quitarPersona(persona)} title="Quitar del grupo">
                        ✕
                      </RemoveButton>
                    </MiembroRow>
                  ))
                )}
              </MiembrosLista>
            </>
          )}
        </Column>
      </Container>

      <FooterButtons>
        <BackButton onClick={volverAlDashboard}>← Volver al Dashboard</BackButton>
      </FooterButtons>
    </>
  );
};

export default AdministrarGrupos;

// ========== STYLED COMPONENTS ==========
const Container = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  width: 100%;
  padding: 20px;
  max-width: 1000px;
  margin: 0 auto;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const Column = styled.div`
  background: #ffffff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  height: fit-content;
`;

const Title = styled.h3`
  margin-bottom: 16px;
  font-size: 18px;
  font-weight: 600;
  color: #333;
  padding-bottom: 8px;
  border-bottom: 2px solid #4a90e2;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 4px;
  font-size: 13px;
  font-weight: 600;
  color: #555;
`;

const TextInput = styled.input`
  width: 100%;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid #ddd;
  margin-bottom: 14px;
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: #4a90e2;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 4px;
  margin-bottom: 14px;
  align-items: stretch;
`;

const Button = styled.button`
  padding: 12px;
  border-radius: 8px;
  border: none;
  background-color: ${(props) => (props.disabled ? "#ccc" : "#4a90e2")};
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
  transition: 0.2s ease;
  flex: 1;

  &:hover:not(:disabled) {
    background-color: #357abd;
    transform: translateY(-1px);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }
`;

const GrupoLista = styled.div`
  margin-top: 8px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  overflow: hidden;
`;

const GrupoRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid #f0f0f0;
  background: ${(props) => (props.activo ? "#eaf2fd" : "#fff")};

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: #f5f8fc;
  }
`;

const GrupoNombre = styled.span`
  cursor: pointer;
  font-weight: 600;
  color: #333;
  display: flex;
  flex-direction: column;
  gap: 2px;

  &:hover {
    color: #4a90e2;
  }
`;

const GrupoCantidad = styled.span`
  font-size: 12px;
  font-weight: 400;
  color: #888;
`;

const EmptyListItem = styled.div`
  padding: 20px;
  text-align: center;
  color: #999;
  font-size: 14px;
`;

const ResultadosBusqueda = styled.div`
  margin-bottom: 14px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  max-height: 220px;
  overflow-y: auto;
`;

const ResultadoRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid #f0f0f0;

  &:last-child {
    border-bottom: none;
  }
`;

const MiembrosLista = styled.div`
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  overflow: hidden;
`;

const MiembroRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid #f0f0f0;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: #f5f8fc;
  }
`;

const PersonaInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 14px;
  color: #333;
`;

const PersonaDivisiones = styled.span`
  font-size: 12px;
  color: #888;
`;

const YaAgregado = styled.span`
  font-size: 12px;
  color: #999;
`;

const SmallLink = styled.span`
  font-size: 12px;
  color: #4a90e2;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    text-decoration: underline;
  }
`;

const RemoveButton = styled.button`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: #dc3545;
  color: white;
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.7;
  transition: 0.2s ease;
  flex-shrink: 0;

  &:hover {
    opacity: 1;
    transform: scale(1.1);
    background: #c82333;
  }
`;

const EmptyStateContainer = styled.div`
  text-align: center;
  padding: 60px 20px;
  max-width: 600px;
  margin: 0 auto;

  h3 {
    color: #333;
    margin-bottom: 10px;
  }

  p {
    color: #666;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #666;
`;

const LoadingSpinner = styled.div`
  width: 50px;
  height: 50px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #4a90e2;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 15px;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const FooterButtons = styled.div`
  display: flex;
  justify-content: center;
  padding: 20px;
  margin-top: 20px;
  border-top: 1px solid #eee;
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
  transition: 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;

  &:hover {
    background: #4a90e2;
    color: white;
    transform: translateY(-2px);
    box-shadow: 0 4px 10px rgba(74, 144, 226, 0.3);
  }

  &:active {
    transform: translateY(0);
  }
`;
