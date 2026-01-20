// Dashboard.js

import React, { useContext, useState, useEffect } from "react";
import styled from "styled-components";
import axios from "axios";
import { AuthContext } from "../contexts/AuthContext";
import { API_BASE_URL } from "../config";
import { useNavigate } from "react-router-dom";
import EstadisticasAsistencias from "../components/EstadisticasAsistencias";

import Header from "../components/Common/Header";
import TabsCarrusel from "../components/TabsCarrusel";
import Container80 from "../components/Common/Container80";

import {
  FaUserCheck,
  FaUserSlash,
  FaPlane,
  FaAmbulance,
  FaRegAngry,
  FaPlus,
  FaRedo,
  FaSearch,
  FaFilter,
  FaCalendarAlt,
} from "react-icons/fa";
import { MdSick } from "react-icons/md";
import { CiSquareAlert } from "react-icons/ci";
import { FcStatistics } from "react-icons/fc";

const Dashboard = () => {
  const { currentUser, currentClub, currentDisciplina } = useContext(AuthContext);

  const [activeTab, setActiveTab] = useState("personas");
  const [divisiones, setDivisiones] = useState([]);
  const [divisionesSeleccionadas, setDivisionesSeleccionadas] = useState([]);
  const [currentDivision, setCurrentDivision] = useState(null);
  const [personasDivision, setPersonasDivision] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [buscarpersona, setBuscarPersona] = useState("");
  const [mostrarEstadisticas, setMostrarEstadisticas] = useState(false);
  const [filtroAsistencia, setFiltroAsistencia] = useState(null);
  const [toast, setToast] = useState(null);
  const [contadoresAsistencia, setContadoresAsistencia] = useState({});

  /* =========================
     Estados personas
     ========================= */
  const ESTADOS = {
    1: { label: "Activo", icon: <FaUserCheck color="green" /> },
    0: { label: "Inactivo", icon: <FaUserSlash color="gray" /> },
    2: { label: "Lesionado", icon: <FaAmbulance color="red" /> },
    3: { label: "Suspendido", icon: <CiSquareAlert color="orange" /> },
    4: { label: "Viaje", icon: <FaPlane color="blue" /> },
    5: { label: "Enfermo", icon: <MdSick color="purple" /> },
    6: { label: "Baja", icon: <FaRegAngry /> },
  };

  /* =========================
     Roles styles
     ========================= */
  const rolStyles = {
    Jugador: { bg: "#b6e9dcff", border: "#11a131ff" },
    Entrenador: { bg: "#fdebd0", border: "#f39c12" },
    Medico: { bg: "#fdebd0", border: "#f39c12" },
    Kinesiologo: { bg: "#fdebd0", border: "#f39c12" },
    PreparadorFisico: { bg: "#fdebd0", border: "#f39c12" },
  };

  const getRolStyle = (rol) =>
    rolStyles[rol] || { bg: "#ecf0f1", border: "#95a5a6" };

  /* =========================
     Tabs
     ========================= */
  const tabs = [
    { id: "personas", label: "Personas" },
    { id: "eventos", label: "Eventos" },
  ];

  /* =========================
     Effects
     ========================= */

  useEffect(() => {
    if (activeTab !== "eventos") return;
    if (!currentClub?.codclub) return;

    fetchEventosDetalles();
  }, [activeTab, currentClub, divisionesSeleccionadas]);

  useEffect(() => {
    if (
      activeTab !== "personas" ||
      !currentUser?.codpersona ||
      !currentClub?.codclub ||
      !currentDisciplina?.coddisciplina
    )
      return;

    fetchDivisionesPersona();
  }, [
    activeTab,
    currentUser?.codpersona,
    currentClub?.codclub,
    currentDisciplina?.coddisciplina,
  ]);

  useEffect(() => {
    if (divisiones.length === 1) setCurrentDivision(divisiones[0]);
  }, [divisiones]);

  useEffect(() => {
    if (activeTab === "personas") {
      fetchPersonasDivision();
    }
  }, [divisionesSeleccionadas, activeTab]);

  // En el estado inicial, cambia el useEffect:
  useEffect(() => {
    // Establecer fechas de la semana actual (lunes a domingo)
    const { lunes, domingo } = getWeekRange();
    setFechaInicio(lunes);
    setFechaFin(domingo);
  }, []);

  // Función para obtener lunes y domingo de la semana actual
  const getWeekRange = () => {
    const hoy = new Date();
    const dia = hoy.getDay(); // 0 = Domingo, 1 = Lunes, ...

    // Calcular lunes (restar días hasta llegar al lunes)
    const lunes = new Date(hoy);
    const diff = hoy.getDate() - dia + (dia === 0 ? -6 : 1); // Ajuste si es domingo
    lunes.setDate(diff);

    // Calcular domingo (lunes + 6 días)
    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 6);

    return {
      lunes: lunes.toISOString().split("T")[0],
      domingo: domingo.toISOString().split("T")[0],
    };
  };

  const calcularContadoresEvento = (evento) => {
    if (!evento?.personas) {
      return {
        "I": 0, "P": 0, "PN": 0, "A": 0, "AA": 0, "total": 0
      };
    }
    
    const contadores = {
      "I": 0, "P": 0, "PN": 0, "A": 0, "AA": 0, "total": 0
    };
    
    evento.personas.forEach(persona => {
      const estado = persona.asistencia || "I";
      if (estado in contadores) {
        contadores[estado]++;
      }
      contadores.total++;
    });
    
    return contadores;
  };

  // Componente BotonConContador
  const BotonConContador = ({ estado, evento, onClick }) => {
    // Obtener el contador del estado global
    const contador = contadoresAsistencia[evento.codevento]?.[estado === null ? "total" : estado] || 0;
    
    const getBotonProps = () => {
      switch(estado) {
        case null: return { Componente: BtnTodos, texto: "☰", title: "Mostrar todos" };
        case "I": return { Componente: BtnSinEstado, texto: "Ø", title: "Sin estado" };
        case "P": return { Componente: BtnPresente, texto: "✔", title: "Presente" };
        case "PN": return { Componente: BtnPresenteNo, texto: "✔-", title: "Presente no entrena" };
        case "A": return { Componente: BtnAusente, texto: "✖", title: "Ausente" };
        case "AA": return { Componente: BtnAusenteAviso, texto: "⚠", title: "Ausente sin aviso" };
        default: return { Componente: BtnTodos, texto: "☰", title: "Mostrar todos" };
      }
    };
    
    const { Componente, texto, title } = getBotonProps();
    
    return (
      <Componente onClick={onClick} title={title}>
        <ButtonContent>
          <span>{texto}</span>
          <CounterBadge>{contador}</CounterBadge>
        </ButtonContent>
      </Componente>
    );
  };

  /* =========================
     Utils
     ========================= */
  const calcularEdad = (fecha) => {
    if (!fecha) return null;
    const n = new Date(fecha);
    const h = new Date();
    let e = h.getFullYear() - n.getFullYear();
    const m = h.getMonth() - n.getMonth();
    if (m < 0 || (m === 0 && h.getDate() < n.getDate())) e--;
    return e;
  };

  /* =========================
     API
     ========================= */
  const fetchDivisionesPersona = async () => {
    const resp = await axios.post(
      `${API_BASE_URL}/divisiones_persona`,
      {
        codpersona: currentUser.codpersona,
        codclub: currentClub.codclub,
        coddisciplina: currentDisciplina.coddisciplina,
      },
      { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
    );
    setDivisiones(resp.data);
  };

  const fetchEventosDetalles = async () => {
    try {
      if (!divisionesSeleccionadas.length) {
        console.warn("No hay divisiones seleccionadas");
        // Limpiar eventos y contadores si no hay divisiones
        setEventos([]);
        setContadoresAsistencia({});
        return;
      }

      const codDivs = divisionesSeleccionadas.map((d) => d.coddivision);

      console.log("Divisiones seleccionadas:", codDivs);

      const resp = await axios.post(
        `${API_BASE_URL}/eventos_detalles`,
        {
          codclub: currentClub.codclub,
          coddivisiones: codDivs,
          fecha_desde: fechaInicio,
          fecha_hasta: fechaFin,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      console.log("Eventos detalles:", resp.data);
      
      // 1️⃣ Guardar los eventos
      setEventos(resp.data);
      
      // 2️⃣ Inicializar contadores para cada evento
      const nuevosContadores = {};
      
      resp.data.forEach(evento => {
        // Inicializar el contador para este evento
        nuevosContadores[evento.codevento] = {
          "I": 0, "P": 0, "PN": 0, "A": 0, "AA": 0, "total": 0
        };
        
        // Contar las asistencias actuales
        if (evento.personas && Array.isArray(evento.personas)) {
          evento.personas.forEach(persona => {
            const estado = persona.asistencia || "I";
            if (estado in nuevosContadores[evento.codevento]) {
              nuevosContadores[evento.codevento][estado]++;
            }
            nuevosContadores[evento.codevento].total++;
          });
        }
      });
      
      // 3️⃣ Guardar los contadores
      setContadoresAsistencia(nuevosContadores);
      
      console.log("Contadores inicializados:", nuevosContadores);
      
    } catch (err) {
      console.error("Error cargando eventos:", err);
      
      // En caso de error, limpiar estados
      setEventos([]);
      setContadoresAsistencia({});
    }
  };

  const fetchPersonasDivision = async () => {
    // Si no hay divisiones seleccionadas, vaciamos
    if (divisionesSeleccionadas.length === 0) {
      setPersonasDivision([]);
      return;
    }

    try {
      // 1. Hacer una llamada por CADA división seleccionada
      const respuestas = await Promise.all(
        divisionesSeleccionadas.map((division) =>
          axios.post(
            `${API_BASE_URL}/personas_division`,
            { coddivision: division.coddivision },
            { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
          )
        )
      );

      // 2. Combinar todas las personas
      const todasLasPersonas = respuestas.flatMap((resp) => resp.data);

      // 3. Eliminar duplicados (si una persona está en 2 divisiones)
      const personasUnicas = Array.from(
        new Map(todasLasPersonas.map((p) => [p.codpersona, p])).values()
      );

      // 4. Guardar
      setPersonasDivision(personasUnicas);
    } catch (err) {
      console.error("Error cargando personas:", err);
    }
  };

  /* =========================
     Separación roles
     ========================= */
  const staff = personasDivision.filter((p) => p.rol !== "Jugador");
  const jugadores = personasDivision.filter((p) => p.rol === "Jugador");

  // Filtrado SOLO para jugadores (no para staff)
  const filteredJugadores = jugadores.filter(
    (p) =>
      p.nombre?.toLowerCase().includes(buscarpersona.toLowerCase()) ||
      p.apodo?.toLowerCase().includes(buscarpersona.toLowerCase())
  );

  const asistencia = async (codevento, codpersona, nuevaAsistencia) => {
    // Encontrar el nombre de la persona para el toast
    const evento = eventos.find((ev) => ev.codevento === codevento);
    const persona = evento?.personas?.find((p) => p.codpersona === codpersona);
    const nombrePersona = persona?.apodo || persona?.nombre || "Jugador";

    const estilo = getAsistenciaStyle(nuevaAsistencia);

    // Guardar el estado anterior para el rollback
    const estadoAnterior = persona?.asistencia || "I";

    // Mensajes según el tipo de asistencia
    const mensajes = {
      P: `${nombrePersona} PRESENTE`,
      PN: `${nombrePersona} PRESENTE NO ENTRENA`,
      A: `${nombrePersona} AUSENTE`,
      AA: `${nombrePersona} AUSENTE SIN AVISO`,
    };

    // Mostrar toast
    const mensajeToast = mensajes[nuevaAsistencia] || `${nombrePersona} ACTUALIZADO`;
    setToast({
      message: mensajeToast,
      color: estilo.color,
    });

    // Auto-ocultar después de 800ms
    setTimeout(() => setToast(null), 1200);

    // 1️⃣ Update optimista en eventos
    setEventos((prev) =>
      prev.map((ev) =>
        ev.codevento !== codevento
          ? ev
          : {
              ...ev,
              personas: ev.personas.map((per) =>
                per.codpersona === codpersona
                  ? { ...per, asistencia: nuevaAsistencia }
                  : per
              ),
            }
      )
    );

    // 2️⃣ Update optimista en contadores (CORREGIDO)
    setContadoresAsistencia(prev => {
      const nuevosContadores = { ...prev };
      
      // Si no existe el contador para este evento, crearlo
      if (!nuevosContadores[codevento]) {
        nuevosContadores[codevento] = {
          "I": 0, "P": 0, "PN": 0, "A": 0, "AA": 0, "total": 0
        };
      }
      
      // Decrementar el estado anterior
      if (estadoAnterior in nuevosContadores[codevento]) {
        nuevosContadores[codevento][estadoAnterior] = 
          Math.max(0, (nuevosContadores[codevento][estadoAnterior] || 0) - 1);
      }
      
      // Incrementar el nuevo estado
      if (nuevaAsistencia in nuevosContadores[codevento]) {
        nuevosContadores[codevento][nuevaAsistencia] = 
          (nuevosContadores[codevento][nuevaAsistencia] || 0) + 1;
      }
      
      return nuevosContadores;
    });

    try {
      await axios.post(
        `${API_BASE_URL}/evento_asistencia`,
        {
          codevento,
          codpersona,
          asistencia: nuevaAsistencia,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
    } catch (err) {
      console.error("Error guardando asistencia", err);

      // Toast de error
      setToast({
        message: `❌ ERROR en ${nombrePersona}`,
        color: "#dc3545"
      });
      setTimeout(() => setToast(null), 800);

      // 3️⃣ Rollback en eventos
      setEventos((prev) =>
        prev.map((ev) =>
          ev.codevento !== codevento
            ? ev
            : {
                ...ev,
                personas: ev.personas.map((per) =>
                  per.codpersona === codpersona
                    ? { ...per, asistencia: estadoAnterior }
                    : per
                ),
              }
        )
      );

      // 4️⃣ Rollback en contadores
      setContadoresAsistencia(prev => {
        const nuevosContadores = { ...prev };
        
        if (nuevosContadores[codevento]) {
          // Revertir el cambio: incrementar estado anterior, decrementar nuevo
          if (estadoAnterior in nuevosContadores[codevento]) {
            nuevosContadores[codevento][estadoAnterior] = 
              (nuevosContadores[codevento][estadoAnterior] || 0) + 1;
          }
          
          if (nuevaAsistencia in nuevosContadores[codevento]) {
            nuevosContadores[codevento][nuevaAsistencia] = 
              Math.max(0, (nuevosContadores[codevento][nuevaAsistencia] || 0) - 1);
          }
        }
        
        return nuevosContadores;
      });
    }
  };

  const getAsistenciaStyle = (asistencia) => {
    switch (asistencia) {
      case "P": // Presente
        return {
          bg: "linear-gradient(135deg, #28a745 0%, #c4cfc9ff 40%)",
          border: "#c4cfc9ff",
          color: "#28a745",
        };
      case "PN": // Presente no entrena
        return {
          bg: "linear-gradient(135deg, #17a2b8 0%, #c4cfc9ff 40%)",
          border: "#c4cfc9ff",
          color: "#17a2b8",
        };
      case "A": // Ausente
        return {
          bg: "linear-gradient(135deg, #dc3545 0%, #c4cfc9ff 40%)",
          border: "#c4cfc9ff",
          color: "#dc3545",
        };
      case "AA": // Ausente sin aviso
        return {
          bg: "linear-gradient(135deg, #e4be16ff 0%, #c4cfc9ff 40%)",
          border: "#c4cfc9ff",
          color: "#e4be16ff",
        };
      case "I": // Sin marcar
      default:
        return {
          bg: "linear-gradient(135deg, #e9ecef 0%, #c4cfc9ff 100%)",
          border: "#ddd",
          color: "#6c757d",
        };
    }
  };
  
  const navigate = useNavigate();

  const TIPO_EVENTO = {
    E: "Entrenamiento",
    P: "Partido",
  };

  const SUBTIPO_EVENTO = {
    C: "Campo",
    G: "Gimnasio",
  };

  const handleFiltro = (valor) => (e) => {
    e.stopPropagation();
    console.log("trae: " + valor);
    setFiltroAsistencia(valor);
  };

  /* =========================
     Render
     ========================= */
  return (
    <Container80>
      <Header />
      <TabsCarrusel tabs={tabs} active={activeTab} onChange={setActiveTab} />
      <DivisionesContainer>
        {divisiones.map((d) => (
          <DivisionButton
            key={d.coddivision}
            active={divisionesSeleccionadas.some(
              (div) => div.coddivision === d.coddivision
            )}
            onClick={() => {
              setDivisionesSeleccionadas((prev) => {
                // Ver si ya está seleccionada
                const yaEstaSeleccionada = prev.some(
                  (div) => div.coddivision === d.coddivision
                );

                if (yaEstaSeleccionada) {
                  // Si YA está, la QUITAMOS
                  return prev.filter((div) => div.coddivision !== d.coddivision);
                } else {
                  // Si NO está, la AGREGAMOS
                  return [...prev, d];
                }
              });
            }}
          >
            {d.descripcion}
          </DivisionButton>
        ))}
      </DivisionesContainer>

      <ToolbarContainer>
        <ToolbarLeft>
          <GreenButton
            onClick={() => {
              if (activeTab === "personas") {
                navigate("/persona");
              } else if (activeTab === "eventos") {
                navigate("/evento");
              }
            }}
          >
            <FaPlus />
            <ButtonText></ButtonText>
          </GreenButton>

          {/* BOTÓN ACTUALIZADO: */}
          <RefreshButton
            onClick={() => {
              if (divisionesSeleccionadas.length > 0) {
                if (activeTab === "personas") {
                  fetchPersonasDivision();
                } else if (activeTab === "eventos") {
                  fetchEventosDetalles();
                }
              }
            }}
          >
            <FaRedo />
            <ButtonText></ButtonText>
          </RefreshButton>

          {/* ========== NUEVO: FECHAS Y BOTÓN ESTADÍSTICAS ========== */}
          {activeTab === "eventos" && (
            <>
              {/* FECHAS */}
              <FechasContainer>
                <FechaInput
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  title="Fecha inicio"
                />

                <FechaInput
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  title="Fecha fin"
                />

                {/* Botón para establecer semana actual */}
                <SemanaButton
                  onClick={() => {
                    const { lunes, domingo } = getWeekRange();
                    setFechaInicio(lunes);
                    setFechaFin(domingo);
                  }}
                  title="Establecer semana actual"
                >
                  <FaCalendarAlt size={14} />
                </SemanaButton>
              </FechasContainer>

              {/* BOTÓN ESTADÍSTICAS */}
              <EstadisticasButton
                onClick={() => setMostrarEstadisticas(!mostrarEstadisticas)}
                active={mostrarEstadisticas}
              >
                <FcStatistics size={16} />
                <ButtonText>{mostrarEstadisticas ? "Ocu" : "Ver"}</ButtonText>
              </EstadisticasButton>
            </>
          )}
        </ToolbarLeft>

        <ToolbarRight>
          {activeTab === "personas" && (
            <SearchWrapper>
              <SearchContainer>
                <SearchIcon>
                  <FaSearch size={14} />
                </SearchIcon>
                <SearchInput
                  placeholder="Buscar jugadores..."
                  value={buscarpersona}
                  onChange={(e) => setBuscarPersona(e.target.value)}
                />
              </SearchContainer>

              {/* Contador DEBAJO */}
              <ContadorJugadores>
                {(() => {
                  const jugadoresEnDivision = personasDivision.filter(
                    (p) => p.rol === "Jugador"
                  );
                  const totalJugadores = jugadoresEnDivision.length;
                  const jugadoresMostrados = filteredJugadores.length;

                  if (buscarpersona) {
                    return `Mostrando ${jugadoresMostrados} de ${totalJugadores} jugadores para "${buscarpersona}"`;
                  } else {
                    return `${totalJugadores} jugador${
                      totalJugadores !== 1 ? "es" : ""
                    }${
                      divisionesSeleccionadas.length > 1
                        ? ` en ${divisionesSeleccionadas.length} divisiones`
                        : ""
                    }`;
                  }
                })()}
              </ContadorJugadores>
            </SearchWrapper>
          )}
        </ToolbarRight>
      </ToolbarContainer>

      {mostrarEstadisticas && (
        <EstadisticasAsistencias
          fechaDesde={fechaInicio}
          fechaHasta={fechaFin}
          coddivisiones={divisionesSeleccionadas.map((d) => d.coddivision)}
        />
      )}

      {/* STAFF - siempre mostrar sin filtro */}
      {activeTab === "personas" && (
        <>
          {staff.length > 0 && (
            <StaffRow>
              {staff.map((p) => {
                const estado = ESTADOS[p.estado] || ESTADOS[1];
                const rolStyle = getRolStyle(p.rol);
                const edad = calcularEdad(p.fecha_nacimiento);

                return (
                  <PersonaCard key={p.codpersona} bg={rolStyle.bg} border={rolStyle.border}>
                    <TopRow>
                      <Nombre>{p.apodo || p.nombre}</Nombre>
                      {edad !== null && <Edad>{edad} años</Edad>}
                    </TopRow>

                    <DivisionRow>
                      <DivisionBadge>{p.division}</DivisionBadge>
                    </DivisionRow>

                    <BottomRow>
                      {estado.icon}
                      <EstadoLabel>{estado.label}</EstadoLabel>
                    </BottomRow>
                  </PersonaCard>
                );
              })}
            </StaffRow>
          )}

          {/* JUGADORES - con filtro */}
          {filteredJugadores.length > 0 ? (
            <PersonasGrid>
              {filteredJugadores.map((p) => {
                const estado = ESTADOS[p.estado] || ESTADOS[1];
                const rolStyle = getRolStyle(p.rol);
                const edad = calcularEdad(p.fecha_nacimiento);

                return (
                  <PersonaCard key={p.codpersona} bg={rolStyle.bg} border={rolStyle.border}>
                    <TopRow>
                      <Nombre>{p.apodo || p.nombre}</Nombre>
                      {edad !== null && <Edad>{edad} años</Edad>}
                    </TopRow>

                    <DivisionRow>
                      <DivisionBadge>{p.division}</DivisionBadge>
                    </DivisionRow>
                    <BottomRow>
                      {estado.icon}
                      <EstadoLabel>{estado.label}</EstadoLabel>
                    </BottomRow>
                  </PersonaCard>
                );
              })}
            </PersonasGrid>
          ) : (
            // Mostrar mensaje solo si está buscando y no hay jugadores
            buscarpersona && <NoResults>No se encontraron jugadores para "{buscarpersona}"</NoResults>
          )}
        </>
      )}

      {/* ================= EVENTOS ================= */}
      {activeTab === "eventos" && (
        <EventosContainer>
          {eventos.map((ev) => {
            const fecha = new Date(ev.fecha);
            
            const dia = fecha.toLocaleDateString("es-AR", {
              weekday: "short",
              day: "2-digit",
              month: "2-digit",
            });
            const hora = fecha.toLocaleTimeString("es-AR", {
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <EventoCard key={ev.codevento}>
                <EventoHeader
                  open={ev.open}
                  onClick={() =>
                    setEventos((prev) =>
                      prev.map((e) =>
                        e.codevento === ev.codevento
                          ? { ...e, open: !e.open }
                          : e
                      )
                    )
                  }
                >
                  <EventoFecha>
                    <strong>{dia}</strong>
                    <span>{hora}</span>
                  </EventoFecha>

                  <EventoInfo>
                    <EventoTipo>
                      {TIPO_EVENTO[ev.tipo] || ev.tipo} ·{" "}
                      {SUBTIPO_EVENTO[ev.sub_tipo] || ev.sub_tipo}
                    </EventoTipo>
                    <EventoDivisiones>
                      {ev.divisiones?.map((d) => d.division).join(" / ")}
                    </EventoDivisiones>
                  </EventoInfo>

                  {/* DESKTOP */}
                  <EventoAccionesHeader>
                    <BotonConContador 
                      estado={null} 
                      evento={ev} 
                      onClick={handleFiltro(null)} 
                    />
                    <BotonConContador 
                      estado="I" 
                      evento={ev} 
                      onClick={handleFiltro("I")} 
                    />
                    <BotonConContador 
                      estado="P" 
                      evento={ev} 
                      onClick={handleFiltro("P")} 
                    />
                    <BotonConContador 
                      estado="PN" 
                      evento={ev} 
                      onClick={handleFiltro("PN")} 
                    />
                    <BotonConContador 
                      estado="A" 
                      evento={ev} 
                      onClick={handleFiltro("A")} 
                    />
                    <BotonConContador 
                      estado="AA" 
                      evento={ev} 
                      onClick={handleFiltro("AA")} 
                    />
                  </EventoAccionesHeader>

                  {/* MOBILE */}
                  <EventoAccionesMobile>
                    <BotonConContador 
                      estado={null} 
                      evento={ev} 
                      onClick={handleFiltro(null)} 
                    />
                    <BotonConContador 
                      estado="I" 
                      evento={ev} 
                      onClick={handleFiltro("I")} 
                    />
                    <BotonConContador 
                      estado="P" 
                      evento={ev} 
                      onClick={handleFiltro("P")} 
                    />
                    <BotonConContador 
                      estado="PN" 
                      evento={ev} 
                      onClick={handleFiltro("PN")} 
                    />
                    <BotonConContador 
                      estado="A" 
                      evento={ev} 
                      onClick={handleFiltro("A")} 
                    />
                    <BotonConContador 
                      estado="AA" 
                      evento={ev} 
                      onClick={handleFiltro("AA")} 
                    />
                  </EventoAccionesMobile>
                </EventoHeader>

                {ev.open && (
                  <EventoBody>
                    <EventoPersonas>
                      {[...ev.personas]
                        .filter(
                          (p) =>
                            filtroAsistencia === null ||
                            p.asistencia === filtroAsistencia
                        )
                        .sort((a, b) => {
                          const na = (a.apodo || a.nombre || "").toLowerCase();
                          const nb = (b.apodo || b.nombre || "").toLowerCase();
                          return na.localeCompare(nb);
                        })
                        .map((p) => {
                          const estado = ESTADOS[p.estado] || ESTADOS[1];
                          const asistenciaStyle = getAsistenciaStyle(p.asistencia);

                          return (
                            <PersonaEventoRow
                              key={`${p.codpersona}-${p.coddivision}`}
                              bg={asistenciaStyle.bg}
                              border={asistenciaStyle.border}
                            >
                              <PersonaEventoInfo>
                                <EstadoIcono>{estado.icon}</EstadoIcono>

                                <NombreDivContainer>
                                  <NombreEvento>{p.apodo || p.nombre}</NombreEvento>
                                  {p.division && (
                                    <DivisionEvento>{p.division}</DivisionEvento>
                                  )}
                                </NombreDivContainer>
                              </PersonaEventoInfo>

                              <AccionesEvento>
                                <BtnPresente
                                  onClick={() => asistencia(ev.codevento, p.codpersona, "P")}
                                  title="Presente"
                                >
                                  ✔
                                </BtnPresente>
                                <BtnPresenteNo
                                  onClick={() => asistencia(ev.codevento, p.codpersona, "PN")}
                                  title="Presente no entrena"
                                >
                                  ✔-
                                </BtnPresenteNo>
                                <BtnAusente
                                  onClick={() => asistencia(ev.codevento, p.codpersona, "A")}
                                  title="Ausente"
                                >
                                  ✖
                                </BtnAusente>
                                <BtnAusenteAviso
                                  onClick={() => asistencia(ev.codevento, p.codpersona, "AA")}
                                  title="Ausente sin aviso"
                                >
                                  ⚠
                                </BtnAusenteAviso>
                              </AccionesEvento>
                            </PersonaEventoRow>
                          );
                        })}
                    </EventoPersonas>
                  </EventoBody>
                )}
              </EventoCard>
            );
          })}
        </EventosContainer>
      )}

      {/* Toast Simple */}
      {toast && (
        <SimpleToast color={toast.color}>
          {toast.message}
        </SimpleToast>
      )}
    </Container80>
  );
};

export default Dashboard;

/* =========================
   Styles
   ========================= */
/* =========================
   Styles
   ========================= */

const DivisionesContainer = styled.div`
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 10px;
`;

const DivisionButton = styled.button`
  padding: 6px 14px;
  border-radius: 20px;
  border: none;
  background: ${({ active }) => (active ? "#e63946" : "#1d3557")};
  color: white;
  cursor: pointer;
`;

const StaffRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 12px;
  margin: 16px 0;
`;

const PersonasGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 12px;
  margin: 16px 0;
`;

const PersonaCard = styled.div`
  background: ${({ bg }) => bg};
  border-left: 6px solid ${({ border }) => border};
  border-radius: 12px;
  padding: 20px;
  width: 250px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;

  @media (max-width: 768px) {
    width: calc(50% - 10px);
  }

  @media (max-width: 480px) {
    width: 100%;
  }
`;

const TopRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: bold;
  margin-bottom: 8px;
`;

const BottomRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
`;

const Nombre = styled.div`
  font-size: 18px;
  color: blue !important;
`;

const Edad = styled.div`
  font-size: 14px;
  color: #666;
`;

const EstadoLabel = styled.span`
  font-size: 14px;
  color: #333;
`;

const NoResults = styled.div`
  text-align: center;
  padding: 40px;
  color: #666;
  font-size: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  margin: 20px;
`;

/* =========================
   Toolbar Styles
   ========================= */

const ToolbarContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 12px 16px;
  margin: 10px 0;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e0e0e0;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 10px;
  }
`;

const ToolbarLeft = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
`;

const ToolbarRight = styled.div`
  display: flex;
  align-items: center;
  flex: 1;
  justify-content: flex-start;
`;

const BaseButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }

  &:active {
    transform: translateY(0);
  }
`;

const GreenButton = styled(BaseButton)`
  background: #28a745;
  color: white;

  &:hover {
    background: #218838;
  }
`;

const RefreshButton = styled(BaseButton)`
  background: #6c757d;
  color: white;

  &:hover {
    background: #5a6268;
  }
`;

const ButtonText = styled.span`
  font-size: 14px;
  font-weight: 500;
`;

const SearchContainer = styled.div`
  position: relative;
  flex: 1;
  min-width: 200px;
  max-width: 400px;

  @media (max-width: 768px) {
    width: 100%;
    max-width: 100%;
  }
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #6c757d;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 10px 10px 10px 36px;
  border-radius: 6px;
  border: 1px solid #ced4da;
  font-size: 14px;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #80bdff;
    box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
  }

  &::placeholder {
    color: #6c757d;
  }
`;

/* =========================
   Fechas Styles
   ========================= */

const FechasContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: nowrap;

  @media (max-width: 768px) {
    width: 100%;
    flex-wrap: wrap;
    justify-content: center;
  }

  @media (max-width: 480px) {
    gap: 6px;
  }
`;

const FechaInput = styled.input`
  padding: 10px;
  border-radius: 6px;
  border: 1px solid #ced4da;
  font-size: 14px;
  width: 110px;

  @media (max-width: 768px) {
    width: 120px;
  }

  @media (max-width: 480px) {
    width: 100px;
    padding: 8px;
    font-size: 13px;
  }

  &:focus {
    outline: none;
    border-color: #80bdff;
    box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
  }
`;

const SemanaButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 12px;
  border-radius: 6px;
  border: none;
  background: #6f42c1;
  color: white;
  cursor: pointer;

  @media (max-width: 480px) {
    padding: 8px 10px;
  }

  &:hover {
    background: #5a32a3;
  }
`;

/* =========================
   Eventos Styles
   ========================= */

const EventosContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 16px;
`;

const EventoCard = styled.div`
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  transition: all 0.3s ease;
  border: 1px solid #eaeaea;

  &:hover {
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }
`;

const EventoHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  cursor: pointer;
  color: white;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

  /* DESKTOP */
  flex-direction: row;

  &:hover {
    background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
  }

  /* 📱 MOBILE */
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    text-align: center;

    ${({ open }) =>
      open &&
      `
        position: sticky;
        top: 0;
        z-index: 30;
        box-shadow: 0 4px 12px rgba(0,0,0,0.25);
      `}
  }
`;

const EventoFecha = styled.div`
  min-width: 80px;
  text-align: center;

  strong {
    font-size: 16px;
    color: white;
  }

  span {
    display: block;
    font-size: 14px;
    color: rgba(255, 255, 255, 0.9);
    font-weight: 500;
  }
`;

const EventoInfo = styled.div`
  flex: 1;
`;

const EventoTipo = styled.div`
  font-weight: 700;
  font-size: 16px;
  color: white;
`;

const EventoDivisiones = styled.div`
  font-size: 14px;
  color: rgba(255, 255, 255, 0.85);
  margin-top: 2px;
`;

const EventoPersonas = styled.div`
  border-top: 1px solid #eaeaea;
`;

const PersonaEventoRow = styled.div`
  display: flex;
  align-items: center;
  padding: 14px 16px;
  gap: 16px;
  background: ${({ bg }) => bg};
  border-left: 6px solid ${({ border }) => border};
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  min-height: 80px;

  &:hover {
    background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.95) 0%,
      rgba(255, 255, 255, 0.85) 50%,
      ${({ bg }) => bg} 100%
    );
    box-shadow: inset 4px 0 0 ${({ border }) => border},
      0 4px 15px rgba(0, 0, 0, 0.1);
    transform: translateX(4px);

    &::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(
        90deg,
        transparent,
        rgba(255, 255, 255, 0.4),
        transparent
      );
      animation: shine 1.2s ease;
    }
  }

  @media (max-width: 768px) {
    flex-wrap: wrap;
    gap: 12px;
    min-height: auto;
    padding: 12px;
  }

  @keyframes shine {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }
`;

const PersonaEventoInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;

  @media (max-width: 768px) {
    width: 100%;
    margin-bottom: 8px;
  }
`;

const NombreDivContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
`;

const NombreEvento = styled.span`
  font-size: 16px;
  font-weight: 600;
  color: #2d3748;
  white-space: nowrap;  /* Mantiene en una línea */
  overflow: visible;    /* ← CAMBIA de 'hidden' a 'visible' */
  text-overflow: clip;  /* ← CAMBIA de 'ellipsis' a 'clip' o quítalo */
  /* max-width: 200px; */  /* ← QUITA o comenta esta línea */

  /* También quita los media queries que limitan el ancho */
  /* @media (max-width: 768px) {
    max-width: 180px;
  }

  @media (max-width: 480px) {
    max-width: 150px;
  } */
`;

const DivisionEvento = styled.span`
  font-size: 13px;
  color: #6c757d;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
`;

const EstadoIcono = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  min-width: 24px;
  height: 24px;
  margin-right: 8px;
`;

const AccionesEvento = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  height: 48px;

  @media (max-width: 768px) {
    width: 100%;
    justify-content: center;
    flex-wrap: wrap;
    gap: 6px;
    height: auto;
  }
`;

/* =========================
   Botones de Asistencia
   ========================= */

const BaseAsistencia = styled.button`
  width: 48px;
  height: 48px;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-size: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  font-weight: 700;

  &:hover {
    transform: translateY(-3px) scale(1.05);
    box-shadow: 0 6px 15px rgba(0, 0, 0, 0.2);
  }

  &:active {
    transform: translateY(0) scale(0.98);
  }

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.2), transparent);
  }

  &::after {
    content: attr(title);
    position: absolute;
    bottom: -30px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.85);
    color: white;
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 12px;
    white-space: nowrap;
    opacity: 0;
    transition: all 0.3s ease;
    pointer-events: none;
    z-index: 10;
    font-weight: 400;
  }

  &:hover::after {
    opacity: 1;
    bottom: -42px;
  }

  @media (max-width: 768px) {
    width: 42px;
    height: 42px;
    font-size: 18px;
    flex: 0 0 auto;
  }
`;

const BtnSinEstado = styled(BaseAsistencia)`
  background: linear-gradient(135deg, #819c82ff, #868f87ff);
  color: white;

  &:hover {
    background: linear-gradient(135deg, #43a047, #5cb860);
  }
`;

const BtnTodos = styled(BaseAsistencia)`
  background: linear-gradient(135deg, #5e94dbff, #2912f0ff);
  color: white;

  &:hover {
    background: linear-gradient(135deg, #43a047, #5cb860);
  }
`;

const BtnPresente = styled(BaseAsistencia)`
  background: linear-gradient(135deg, #4caf50, #66bb6a);
  color: white;

  &:hover {
    background: linear-gradient(135deg, #43a047, #5cb860);
  }
`;

const BtnPresenteNo = styled(BaseAsistencia)`
  background: linear-gradient(135deg, #2196f3, #42a5f5);
  color: white;

  &:hover {
    background: linear-gradient(135deg, #1e88e5, #3d9fe5);
  }
`;

const BtnAusente = styled(BaseAsistencia)`
  background: linear-gradient(135deg, #f44336, #ef5350);
  color: white;

  &:hover {
    background: linear-gradient(135deg, #e53935, #e04540);
  }
`;

const BtnAusenteAviso = styled(BaseAsistencia)`
  background: linear-gradient(135deg, #ffb300, #ffca28);
  color: #333;

  &:hover {
    background: linear-gradient(135deg, #ffa000, #ffc107);
  }
`;

const EventoBody = styled.div`
  overflow-y: auto;
  max-height: 165vh;

  @media (max-width: 768px) {
    max-height: calc(100svh - 72px);
  }
`;

const SearchWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 8px;
`;

const ContadorJugadores = styled.div`
  font-size: 13px;
  color: #4a5568;
  font-weight: 500;
  padding: 4px 12px;
  background: #f7fafc;
  border-radius: 4px;
  border: 1px solid #e2e8f0;
  white-space: nowrap;

  /* En desktop: al lado */
  @media (min-width: 769px) {
    margin-left: 10px;
    align-self: center;
  }

  /* En mobile: abajo */
  @media (max-width: 768px) {
    width: 100%;
    text-align: center;
    margin-top: 8px;
    white-space: normal;
  }
`;

/* =========================
   Division Badge
   ========================= */

const DivisionRow = styled.div`
  display: flex;
  margin: 6px 0 8px 0;
`;

const DivisionBadge = styled.span`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.3px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const EstadisticasButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 6px;
  border: 2px solid ${({ active }) => (active ? "#17a2b8" : "#6c757d")};
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
  background: ${({ active }) => (active ? "#e8f4f8" : "white")};
  color: ${({ active }) => (active ? "#138496" : "#495057")};

  &:hover {
    background: ${({ active }) => (active ? "#d1ecf1" : "#f8f9fa")};
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }

  &:active {
    transform: translateY(0);
  }

  svg {
    filter: ${({ active }) => (active ? "none" : "grayscale(0.3)")};
  }
`;

const EventoAccionesHeader = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;

  @media (max-width: 768px) {
    display: none;
  }
`;

const EventoAccionesMobile = styled.div`
  display: none;

  @media (max-width: 768px) {
    display: flex;
    gap: 10px;
    justify-content: space-around;
    width: 100%;
    flex-basis: 100%;
    order: 99;
    margin-top: 12px;
  }
`;

const SimpleToast = styled.div`
  position: fixed;
  top: 20px;
  right: 20px;
  background: ${props => props.color || '#28a745'};
  color: white;
  padding: 12px 20px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 9999;
  animation: slideIn 0.2s ease, fadeOut 0.2s ease 0.6s;
  font-weight: 600;
  font-size: 14px;
  
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes fadeOut {
    from {
      opacity: 1;
    }
    to {
      opacity: 0;
    }
  }
`;

const ButtonContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  position: relative;
`;

const CounterBadge = styled.span`
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.85));
  color: #2d3748;
  font-size: 12px;
  font-weight: 900;
  padding: 2px 6px;
  border-radius: 50%;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid rgba(255, 255, 255, 0.3);
  box-shadow: 
    0 2px 4px rgba(0, 0, 0, 0.2),
    inset 0 1px 3px rgba(255, 255, 255, 0.5);
  text-shadow: 0 1px 1px rgba(255, 255, 255, 0.8);
  
  /* Efecto de resplandor cuando el número es alto */
  ${props => props.children > 0 && `
    animation: pulse 2s infinite;
  `}
  
  @keyframes pulse {
    0% {
      box-shadow: 
        0 2px 4px rgba(0, 0, 0, 0.2),
        inset 0 1px 3px rgba(255, 255, 255, 0.5);
    }
    50% {
      box-shadow: 
        0 2px 6px rgba(0, 0, 0, 0.3),
        inset 0 1px 3px rgba(255, 255, 255, 0.5),
        0 0 10px rgba(255, 255, 255, 0.4);
    }
    100% {
      box-shadow: 
        0 2px 4px rgba(0, 0, 0, 0.2),
        inset 0 1px 3px rgba(255, 255, 255, 0.5);
    }
  }
`;

