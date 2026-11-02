// AdministrarClubes.jsx
import React, { useEffect, useState, useCallback } from "react";
import styled from "styled-components";
import Header from "../components/Common/Header";
import { API_BASE_URL } from "../config";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";

const AdministrarClubes = () => {
  const navigate = useNavigate();

  const [clubes, setClubes] = useState([]);
  const [disciplinas, setDisciplinas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [clubSeleccionado, setClubSeleccionado] = useState(null);
  const [coddisciplinasElegidas, setCoddisciplinasElegidas] = useState([]);
  const [nombreNuevoClub, setNombreNuevoClub] = useState("");
  const [creandoClub, setCreandoClub] = useState(false);

  const PERSONA_VACIA = { nombre: "", dni: "", usuario: "", email: "", clave: "" };
  const [personaNueva, setPersonaNueva] = useState(PERSONA_VACIA);
  const [creandoPersona, setCreandoPersona] = useState(false);

  const [modoPersona, setModoPersona] = useState("nueva"); // "nueva" | "existente"
  const [busquedaPersona, setBusquedaPersona] = useState("");
  const [resultadosBusquedaPersona, setResultadosBusquedaPersona] = useState([]);
  const [buscandoPersona, setBuscandoPersona] = useState(false);
  const [asociandoCodpersona, setAsociandoCodpersona] = useState(null);

  const token = localStorage.getItem("token");

  const cargarDatos = useCallback(async () => {
    try {
      const [resClubes, resDisciplinas] = await Promise.all([
        fetch(`${API_BASE_URL}/clubes_admin`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          }
        }),
        fetch(`${API_BASE_URL}/disciplinas_todas`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          }
        })
      ]);

      if (!resClubes.ok || !resDisciplinas.ok) {
        throw new Error("Error HTTP");
      }

      const dataClubes = await resClubes.json();
      const dataDisciplinas = await resDisciplinas.json();

      setClubes(dataClubes);
      setDisciplinas(dataDisciplinas);
    } catch (error) {
      console.error("Error cargando clubes:", error);
      Swal.fire({
        title: "Error",
        text: "No se pudieron cargar los clubes",
        icon: "error",
        timer: 2000
      });
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const seleccionarClub = (club) => {
    setClubSeleccionado(club);
    setCoddisciplinasElegidas(club.coddisciplinas || []);
    setBusquedaPersona("");
    setResultadosBusquedaPersona([]);
  };

  const toggleDisciplina = (coddisciplina) => {
    setCoddisciplinasElegidas((prev) =>
      prev.includes(coddisciplina)
        ? prev.filter((c) => c !== coddisciplina)
        : [...prev, coddisciplina]
    );
  };

  const guardar = async () => {
    if (!clubSeleccionado) return;

    setGuardando(true);

    try {
      const res = await fetch(`${API_BASE_URL}/club_disciplinas_guardar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          codclub: clubSeleccionado.codclub,
          coddisciplinas: coddisciplinasElegidas
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

      await Swal.fire({
        title: "¡Listo!",
        text: "Disciplinas del club actualizadas",
        icon: "success",
        timer: 1500,
        showConfirmButton: false
      });

      await cargarDatos();
      setClubSeleccionado((prev) =>
        prev ? { ...prev, coddisciplinas: coddisciplinasElegidas } : prev
      );
    } catch (error) {
      console.error("Error guardando disciplinas del club:", error);
      Swal.fire({
        title: "Error",
        text: "No se pudo guardar",
        icon: "error"
      });
    } finally {
      setGuardando(false);
    }
  };

  const crearClub = async () => {
    if (!nombreNuevoClub.trim()) return;

    setCreandoClub(true);

    try {
      const res = await fetch(`${API_BASE_URL}/club_crear`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ descripcion: nombreNuevoClub.trim() })
      });

      const data = await res.json();

      if (!res.ok) {
        Swal.fire({
          title: "No se pudo crear",
          text: data.mensaje || "Error desconocido",
          icon: "error"
        });
        return;
      }

      setNombreNuevoClub("");
      await cargarDatos();

      Swal.fire({
        title: "¡Club creado!",
        text: "Ahora podés asignarle sus disciplinas.",
        icon: "success",
        timer: 1500,
        showConfirmButton: false
      });
    } catch (error) {
      console.error("Error creando club:", error);
      Swal.fire({ title: "Error", text: "No se pudo crear el club", icon: "error" });
    } finally {
      setCreandoClub(false);
    }
  };

  const actualizarPersonaNueva = (campo, valor) =>
    setPersonaNueva((prev) => ({ ...prev, [campo]: valor }));

  const crearPersonaParaClub = async () => {
    if (!clubSeleccionado) return;

    if (!personaNueva.nombre.trim() || !personaNueva.usuario.trim() || !personaNueva.clave) {
      Swal.fire({
        title: "Faltan datos",
        text: "Nombre, usuario y contraseña son obligatorios.",
        icon: "warning"
      });
      return;
    }

    setCreandoPersona(true);

    try {
      const res = await fetch(`${API_BASE_URL}/persona_guardar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          codpersona: 0,
          nombre: personaNueva.nombre.trim(),
          dni: personaNueva.dni.trim() || null,
          usuario: personaNueva.usuario.trim(),
          email: personaNueva.email.trim() || null,
          clave: personaNueva.clave,
          activo: 1,
          estado: 1,
          codclub: clubSeleccionado.codclub,
          divisiones: []
        })
      });

      const data = await res.json();

      if (!res.ok) {
        const ir = data.codpersona_existente
          ? await Swal.fire({
              title: "No se pudo crear",
              text: `${data.mensaje}. ¿Igual querés asociar a esa persona existente a "${clubSeleccionado.descripcion}"?`,
              icon: "warning",
              showCancelButton: true,
              confirmButtonText: "Sí, asociar",
              cancelButtonText: "Cancelar"
            })
          : null;

        if (ir?.isConfirmed) {
          await fetch(`${API_BASE_URL}/persona_guardar`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              codpersona: data.codpersona_existente,
              nombre: personaNueva.nombre.trim(),
              codclub: clubSeleccionado.codclub,
              divisiones: []
            })
          });
        } else if (!data.codpersona_existente) {
          Swal.fire({ title: "No se pudo crear", text: data.mensaje || "Error desconocido", icon: "error" });
          return;
        }
      }

      setPersonaNueva(PERSONA_VACIA);

      await Swal.fire({
        title: "¡Listo!",
        text: `"${personaNueva.usuario.trim()}" ya puede iniciar sesión y va a ver el club "${clubSeleccionado.descripcion}".`,
        icon: "success"
      });
    } catch (error) {
      console.error("Error creando persona para el club:", error);
      Swal.fire({ title: "Error", text: "No se pudo crear la persona", icon: "error" });
    } finally {
      setCreandoPersona(false);
    }
  };

  const buscarPersonasExistente = async () => {
    if (!busquedaPersona || busquedaPersona.trim().length < 2) {
      setResultadosBusquedaPersona([]);
      return;
    }
    setBuscandoPersona(true);
    try {
      const res = await fetch(`${API_BASE_URL}/personas_buscar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ filtro: busquedaPersona.trim() })
      });
      const data = await res.json();
      setResultadosBusquedaPersona(data);
    } catch (error) {
      console.error("Error buscando personas:", error);
    } finally {
      setBuscandoPersona(false);
    }
  };

  const asociarPersonaExistente = async (persona) => {
    if (!clubSeleccionado) return;

    setAsociandoCodpersona(persona.codpersona);

    try {
      const res = await fetch(`${API_BASE_URL}/persona_guardar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          codpersona: persona.codpersona,
          nombre: persona.nombre,
          codclub: clubSeleccionado.codclub,
          divisiones: []
        })
      });

      const data = await res.json();

      if (!res.ok) {
        Swal.fire({ title: "No se pudo asociar", text: data.mensaje || "Error desconocido", icon: "error" });
        return;
      }

      setBusquedaPersona("");
      setResultadosBusquedaPersona([]);

      await Swal.fire({
        title: "¡Listo!",
        text: `"${persona.nombre}" ya está asociada al club "${clubSeleccionado.descripcion}".`,
        icon: "success",
        timer: 1800,
        showConfirmButton: false
      });
    } catch (error) {
      console.error("Error asociando persona existente:", error);
      Swal.fire({ title: "Error", text: "No se pudo asociar la persona", icon: "error" });
    } finally {
      setAsociandoCodpersona(null);
    }
  };

  const nombresDisciplinas = (coddisciplinas) =>
    (coddisciplinas || [])
      .map((cod) => disciplinas.find((d) => d.coddisciplina === cod)?.descripcion)
      .filter(Boolean);

  const volverAlDashboard = () => navigate("/dashboard");

  if (cargando) {
    return (
      <>
        <Header />
        <LoadingContainer>
          <LoadingSpinner />
          <p>Cargando clubes...</p>
        </LoadingContainer>
      </>
    );
  }

  return (
    <>
      <Header />
      <Container>
        {/* COLUMNA 1: listado de clubes */}
        <Column>
          <Title>Clubes</Title>

          <NuevoClubRow>
            <input
              type="text"
              placeholder="Nombre del nuevo club..."
              value={nombreNuevoClub}
              onChange={(e) => setNombreNuevoClub(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") crearClub(); }}
            />
            <Button onClick={crearClub} disabled={creandoClub || !nombreNuevoClub.trim()}>
              {creandoClub ? "Creando..." : "+ Crear club"}
            </Button>
          </NuevoClubRow>

          <ClubList>
            {clubes.length === 0 ? (
              <EmptyListItem>
                No hay clubes cargados. Se cargan directamente en la base de
                datos.
              </EmptyListItem>
            ) : (
              clubes.map((club) => (
                <ClubRow
                  key={club.codclub}
                  activo={clubSeleccionado?.codclub === club.codclub}
                  onClick={() => seleccionarClub(club)}
                >
                  <ClubNombre>{club.descripcion}</ClubNombre>
                  <ClubTags>
                    {nombresDisciplinas(club.coddisciplinas).length === 0 ? (
                      <TagVacio>Sin disciplinas</TagVacio>
                    ) : (
                      nombresDisciplinas(club.coddisciplinas).map((nombre) => (
                        <Tag key={nombre}>{nombre}</Tag>
                      ))
                    )}
                  </ClubTags>
                </ClubRow>
              ))
            )}
          </ClubList>
        </Column>

        {/* COLUMNA 2: disciplinas del club seleccionado */}
        <Column>
          <Title>
            {clubSeleccionado
              ? `Disciplinas de ${clubSeleccionado.descripcion}`
              : "Seleccione un club"}
          </Title>

          {!clubSeleccionado ? (
            <EmptyListItem>
              Elija un club de la lista para gestionar sus disciplinas.
            </EmptyListItem>
          ) : disciplinas.length === 0 ? (
            <EmptyListItem>No hay disciplinas cargadas todavía.</EmptyListItem>
          ) : (
            <>
              <CheckboxList>
                {disciplinas.map((disciplina) => (
                  <CheckboxRow key={disciplina.coddisciplina}>
                    <input
                      type="checkbox"
                      id={`disc-${disciplina.coddisciplina}`}
                      checked={coddisciplinasElegidas.includes(
                        disciplina.coddisciplina
                      )}
                      onChange={() => toggleDisciplina(disciplina.coddisciplina)}
                    />
                    <label htmlFor={`disc-${disciplina.coddisciplina}`}>
                      {disciplina.descripcion}
                    </label>
                  </CheckboxRow>
                ))}
              </CheckboxList>

              <Button onClick={guardar} disabled={guardando}>
                {guardando ? "Guardando..." : "💾 Guardar"}
              </Button>
            </>
          )}

          <InfoBox>
            <strong>📝 Cómo funciona:</strong>
            <ul>
              <li>
                Marque las disciplinas que practica el club seleccionado.
              </li>
              <li>
                Al crear un partido, sólo podrá elegir como rival a clubes que
                compartan la misma disciplina.
              </li>
              <li>Los clubes se cargan directamente en la base de datos.</li>
            </ul>
          </InfoBox>
        </Column>

        {/* COLUMNA 3: primera persona del club seleccionado (para poder loguearse) */}
        <Column>
          <Title>
            {clubSeleccionado
              ? `Primera persona de ${clubSeleccionado.descripcion}`
              : "Primera persona"}
          </Title>

          {!clubSeleccionado ? (
            <EmptyListItem>
              Elija un club de la lista para crearle su primera persona.
            </EmptyListItem>
          ) : (
            <>
              <TabRow>
                <TabButton
                  activo={modoPersona === "nueva"}
                  onClick={() => setModoPersona("nueva")}
                >
                  ➕ Nueva persona
                </TabButton>
                <TabButton
                  activo={modoPersona === "existente"}
                  onClick={() => setModoPersona("existente")}
                >
                  🔍 Usar existente
                </TabButton>
              </TabRow>

              {modoPersona === "nueva" ? (
                <>
                  <InputRow>
                    <label>Nombre</label>
                    <input
                      value={personaNueva.nombre}
                      onChange={(e) => actualizarPersonaNueva("nombre", e.target.value)}
                    />
                  </InputRow>

                  <InputRow>
                    <label>DNI</label>
                    <input
                      value={personaNueva.dni}
                      onChange={(e) => actualizarPersonaNueva("dni", e.target.value)}
                    />
                  </InputRow>

                  <InputRow>
                    <label>Usuario (para iniciar sesión)</label>
                    <input
                      value={personaNueva.usuario}
                      onChange={(e) => actualizarPersonaNueva("usuario", e.target.value)}
                      autoComplete="new-username"
                    />
                  </InputRow>

                  <InputRow>
                    <label>Email</label>
                    <input
                      value={personaNueva.email}
                      onChange={(e) => actualizarPersonaNueva("email", e.target.value)}
                    />
                  </InputRow>

                  <InputRow>
                    <label>Contraseña</label>
                    <input
                      type="password"
                      value={personaNueva.clave}
                      onChange={(e) => actualizarPersonaNueva("clave", e.target.value)}
                      autoComplete="new-password"
                    />
                  </InputRow>

                  <Button onClick={crearPersonaParaClub} disabled={creandoPersona}>
                    {creandoPersona ? "Creando..." : "👤 Crear y asociar al club"}
                  </Button>
                </>
              ) : (
                <>
                  <NuevoClubRow>
                    <input
                      type="text"
                      placeholder="Buscar por nombre o DNI..."
                      value={busquedaPersona}
                      onChange={(e) => setBusquedaPersona(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") buscarPersonasExistente(); }}
                    />
                    <Button
                      onClick={buscarPersonasExistente}
                      disabled={buscandoPersona || busquedaPersona.trim().length < 2}
                    >
                      {buscandoPersona ? "Buscando..." : "Buscar"}
                    </Button>
                  </NuevoClubRow>

                  {resultadosBusquedaPersona.length > 0 && (
                    <ResultadosList>
                      {resultadosBusquedaPersona.map((persona) => (
                        <ResultadoItem key={persona.codpersona}>
                          <div>
                            <strong>{persona.nombre}</strong>
                            {persona.dni && <span> &middot; DNI {persona.dni}</span>}
                            <PertenenciaInfo>
                              {persona.pertenece_a && persona.pertenece_a.length > 0
                                ? persona.pertenece_a
                                    .map((p) => `${p.club}${p.disciplina ? ` (${p.disciplina})` : ""}`)
                                    .join(", ")
                                : "Sin club asignado todavía"}
                            </PertenenciaInfo>
                          </div>
                          <Button
                            onClick={() => asociarPersonaExistente(persona)}
                            disabled={asociandoCodpersona === persona.codpersona}
                          >
                            {asociandoCodpersona === persona.codpersona
                              ? "Asociando..."
                              : `Asociar a ${clubSeleccionado.descripcion}`}
                          </Button>
                        </ResultadoItem>
                      ))}
                    </ResultadosList>
                  )}
                </>
              )}
            </>
          )}

          <InfoBox>
            <strong>📝 Para qué sirve:</strong>
            <ul>
              <li>
                Crea una persona y la asocia directamente a este club, sin
                depender del selector de arriba.
              </li>
              <li>
                Con el usuario y contraseña que pongas, esa persona ya puede
                iniciar sesión y va a ver este club en su selector.
              </li>
              <li>
                Desde ahí en más (ya logueada) puede crear divisiones y sumar
                al resto de las personas del club.
              </li>
            </ul>
          </InfoBox>
        </Column>
      </Container>

      <FooterButtons>
        <BackButton onClick={volverAlDashboard}>← Volver al Dashboard</BackButton>
      </FooterButtons>
    </>
  );
};

export default AdministrarClubes;

// ========== STYLED COMPONENTS ==========
const Container = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 24px;
  width: 100%;
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;

  @media (max-width: 1200px) {
    grid-template-columns: 1fr 1fr;
  }

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const InputRow = styled.div`
  display: flex;
  flex-direction: column;
  margin-bottom: 10px;

  label {
    font-size: 13px;
    color: #666;
    margin-bottom: 4px;
  }

  input {
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 6px;
  }
`;

const TabRow = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
`;

const TabButton = styled.button`
  flex: 1;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid ${(props) => (props.activo ? "#4a90e2" : "#ddd")};
  background: ${(props) => (props.activo ? "#4a90e2" : "#fff")};
  color: ${(props) => (props.activo ? "#fff" : "#555")};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: 0.2s ease;
`;

const ResultadosList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
`;

const ResultadoItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;

  button {
    margin-bottom: 0;
  }
`;

const PertenenciaInfo = styled.div`
  font-size: 12px;
  color: #999;
  margin-top: 2px;
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

const NuevoClubRow = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 16px;

  input {
    flex: 1;
    padding: 8px 10px;
    border: 1px solid #ddd;
    border-radius: 8px;
    font-size: 14px;
  }

  button {
    margin-bottom: 0;
    white-space: nowrap;
  }
`;

const ClubList = styled.div`
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  overflow: hidden;
`;

const ClubRow = styled.div`
  padding: 12px 14px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  background: ${(props) => (props.activo ? "#eaf2fc" : "#fff")};

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: ${(props) => (props.activo ? "#eaf2fc" : "#f5f8fc")};
  }
`;

const ClubNombre = styled.div`
  font-weight: 600;
  color: #333;
  margin-bottom: 6px;
`;

const ClubTags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const Tag = styled.span`
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 20px;
  background: #4a90e2;
  color: white;
  font-weight: 600;
`;

const TagVacio = styled.span`
  font-size: 11px;
  color: #999;
  font-style: italic;
`;

const EmptyListItem = styled.div`
  padding: 20px;
  text-align: center;
  color: #999;
  font-size: 14px;
`;

const CheckboxList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
`;

const CheckboxRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;

  input {
    width: 18px;
    height: 18px;
    cursor: pointer;
  }

  label {
    font-size: 14px;
    color: #333;
    cursor: pointer;
  }
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
  margin-bottom: 16px;

  &:hover:not(:disabled) {
    background-color: #357abd;
    transform: translateY(-1px);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }
`;

const InfoBox = styled.div`
  margin-top: 8px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #4a90e2;
  font-size: 13px;
  color: #555;

  ul {
    margin: 8px 0 0 20px;
    padding: 0;
  }

  li {
    margin-bottom: 4px;
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
