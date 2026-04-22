// Dashboard.js - COMPLETO CON MODAL DE ESTADÍSTICAS
// (Mismo contenido que tu archivo actual, pero con el modal agregado al final)

import React, { useContext, useState, useEffect, useRef } from "react";
import styled from "styled-components";
import axios from "axios";
import { AuthContext } from "../contexts/AuthContext";
import { API_BASE_URL } from "../config";
import { useNavigate } from "react-router-dom";
import EstadisticasAsistencias from "../components/EstadisticasAsistencias";
import ActividadesJugadores from "../components/ActividadesJugadores";
import EstadisticasPersona from "../components/EstadisticasPersona"; // ¡IMPORTANTE! Agregar esta importación
import  Estadisticas from "./Estadisticas";
import Header from "../components/Common/Header";
import TabsCarrusel from "../components/TabsCarrusel";
import Container80 from "../components/Common/Container80";
import { HiDotsVertical } from "react-icons/hi";
import { HiLockOpen, HiLockClosed } from "react-icons/hi2";
import { FiEdit2, FiMoreHorizontal } from "react-icons/fi";
import { localToUTC, UTCToLocal } from "../utils/helpers";
import {
  FaUserCheck,
  FaUserSlash,
  FaPlane,
  FaAmbulance,
  FaRegAngry,
  FaPlus,
  FaRedo,
  FaSearch,
  FaCalendarAlt,
} from "react-icons/fa";
import { MdSick } from "react-icons/md";
import { CiSquareAlert } from "react-icons/ci";
import { FcStatistics } from "react-icons/fc";
import Swal from "sweetalert2";

const Dashboard = () => {
  const { 
    currentUser, 
    currentClub, 
    currentDisciplina,
    seccionActiva,
    divisionesSeleccionadas  = [],
    setDivisionesSeleccionadas = () => {}
  } = useContext(AuthContext);

  const [activeTab, setActiveTab] = useState("personas");
  const [divisiones, setDivisiones] = useState([]);
  
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
  const esEntornoPruebas = currentClub?.codclub === 1;
  const [actividades, setActividades] = useState([]);
  const [actividadActiva, setActividadActiva] = useState(null);
  
  // Estado para controlar la visibilidad del staff
  const [mostrarStaff, setMostrarStaff] = useState(false);
  
  // Estados para el modal de estadísticas de persona
  const [estadisticasPersona, setEstadisticasPersona] = useState(null);
  const [mostrarModalEstadisticas, setMostrarModalEstadisticas] = useState(false);

  const actividadesTabs = actividades.map(a => ({
    id: a.codactividad,
    label: a.descripcion
  }));

  useEffect(() => {
    console.log("Divisiones seleccionadas actualizadas:", divisionesSeleccionadas);
  }, [divisionesSeleccionadas]);

  // useEffects
  useEffect(() => {
    if (currentClub?.codclub) {
      fetchActividadesClub();
    }
  }, [currentClub]);

  useEffect(() => {
    if (actividades.length > 0 && !actividadActiva) {
      setActividadActiva(actividades[0].codactividad);
    }
  }, [actividades]);

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
    { id: "actividades", label: "Actividades" },
    { id: "estadisticas", label: "Estadísticas" },
  ];

  /* =========================
     Effects
     ========================= */

  useEffect(() => {
    if (activeTab !== "eventos") return;
    if (!currentClub?.codclub) return;
    fetchEventosDetalles();
  }, [activeTab, currentClub, divisionesSeleccionadas, fechaInicio, fechaFin]);

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

  useEffect(() => {
    const { lunes, domingo } = getWeekRange();
    setFechaInicio(lunes);
    setFechaFin(domingo);
  }, []);

  const getWeekRange = () => {
    const hoy = new Date();
    const dia = hoy.getDay();

    const lunes = new Date(hoy);
    const diff = hoy.getDate() - dia + (dia === 0 ? -6 : 1);
    lunes.setDate(diff);

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

  const parsearFechaArgentina = (fechaStr) => {
    const [fechaPart, horaPart] = fechaStr.split('T');
    const [year, month, day] = fechaPart.split('-').map(Number);
    
    const [hour, minute] = (horaPart ? horaPart.split(':') : ['0', '0']).map(Number);
    
    return new Date(year, month - 1, day, hour, minute);
  };

  const BotonConContador = ({ estado, evento, onClick }) => {
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

  const fetchActividadesClub = async () => {
    const resp = await axios.post(
      `${API_BASE_URL}/actividades_club`,
      {       
        codclub: currentClub.codclub,       
      },
      { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
    );
    console.log("Actividades:", resp.data);
    setActividades(resp.data);
  };

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
        setEventos([]);
        setContadoresAsistencia({});
        return;
      }

      const codDivs = divisionesSeleccionadas.map((d) => d.coddivision);


    // Probar localToUTC
    const fechaInicioUTC = localToUTC(fechaInicio, "00:00:00");
    const fechaFinUTC = localToUTC(fechaFin, "23:59:59");

    console.log("fechaInicioUTC:", fechaInicioUTC);
    console.log("fechaFinUTC:", fechaFinUTC);

    console.log("Eventos Fecha Desde:", fechaInicio);
      console.log("Eventos Fecha Hasta:", fechaFin);

      console.log("Eventos Fecha Desde UTC:", fechaInicioUTC);
      console.log("Eventos Fecha Hasta UTC:", fechaFinUTC);

      const resp = await axios.post(
        `${API_BASE_URL}/eventos_detalles`,
        {
          codclub: currentClub.codclub,
          coddivisiones: codDivs,
          fecha_desde: fechaInicioUTC,
          fecha_hasta: fechaFinUTC,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      //console.log("Eventos detalles:", resp.data);
      
      setEventos(resp.data);
      
      const nuevosContadores = {};
      
      resp.data.forEach(evento => {
        nuevosContadores[evento.codevento] = {
          "I": 0, "P": 0, "PN": 0, "A": 0, "AA": 0, "total": 0
        };
        
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
      
      setContadoresAsistencia(nuevosContadores);
      
      //console.log("Contadores inicializados:", nuevosContadores);
      
    } catch (err) {
      console.error("Error cargando eventos:", err);
      setEventos([]);
      setContadoresAsistencia({});
    }
  };

  const fetchPersonasDivision = async () => {
    console.log("API_URL:", API_BASE_URL);
    if (divisionesSeleccionadas.length === 0) {
      setPersonasDivision([]);
      return;
    }

    try {
      const respuestas = await Promise.all(
        divisionesSeleccionadas.map((division) =>
          axios.post(
            `${API_BASE_URL}/personas_division`,
            { coddivision: division.coddivision },
            { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
          )
        )
      );
      //console.log("Divisiones seleccionadas:", divisionesSeleccionadas);
      //console.log("Respuestas:", respuestas);
      
      const todasLasPersonas = respuestas.flatMap((resp) => resp.data);

      const personasUnicas = Array.from(
        new Map(todasLasPersonas.map((p) => [p.codpersona, p])).values()
      );

      console.log("Personas únicas:", personasUnicas);

      setPersonasDivision(personasUnicas);
    } catch (err) {
      console.error("Error cargando personas:", err);
    }
  };

  /* =========================
     Filtrado de personas
     ========================= */
  
  // Filtrado para TODAS las personas (jugadores + staff)
  const personasFiltradas = personasDivision.filter(
    (p) =>
      p.nombre?.toLowerCase().includes(buscarpersona.toLowerCase()) ||
      p.apodo?.toLowerCase().includes(buscarpersona.toLowerCase())
  );

  // Separación por roles
  const staff = personasDivision.filter((p) => p.rol !== "Jugador");
  const jugadores = personasDivision.filter((p) => p.rol === "Jugador");

  // Stats para el contador
  const totalJugadores = jugadores.length;
  const totalStaff = staff.length;
  const totalPersonas = personasDivision.length;

  // Jugadores filtrados
  const filteredJugadores = jugadores.filter(
    (p) =>
      p.nombre?.toLowerCase().includes(buscarpersona.toLowerCase()) ||
      p.apodo?.toLowerCase().includes(buscarpersona.toLowerCase())
  );

  // Staff filtrado
  const staffFiltrado = staff.filter(
    (p) =>
      p.nombre?.toLowerCase().includes(buscarpersona.toLowerCase()) ||
      p.apodo?.toLowerCase().includes(buscarpersona.toLowerCase())
  );

  const asistencia = async (codevento, codpersona, nuevaAsistencia) => {
    const evento = eventos.find((ev) => ev.codevento === codevento);
    const persona = evento?.personas?.find((p) => p.codpersona === codpersona);
    const nombrePersona = persona?.apodo || persona?.nombre || "Jugador";

    const estilo = getAsistenciaStyle(nuevaAsistencia);

    const estadoAnterior = persona?.asistencia || "I";

    const mensajes = {
      P: `${nombrePersona} PRESENTE`,
      PN: `${nombrePersona} PRESENTE NO ENTRENA`,
      A: `${nombrePersona} AUSENTE`,
      AA: `${nombrePersona} AUSENTE SIN AVISO`,
    };

    const mensajeToast = mensajes[nuevaAsistencia] || `${nombrePersona} ACTUALIZADO`;
    setToast({
      message: mensajeToast,
      color: estilo.color,
    });

    setTimeout(() => setToast(null), 1200);

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

    setContadoresAsistencia(prev => {
      const nuevosContadores = { ...prev };
      
      if (!nuevosContadores[codevento]) {
        nuevosContadores[codevento] = {
          "I": 0, "P": 0, "PN": 0, "A": 0, "AA": 0, "total": 0
        };
      }
      
      if (estadoAnterior in nuevosContadores[codevento]) {
        nuevosContadores[codevento][estadoAnterior] = 
          Math.max(0, (nuevosContadores[codevento][estadoAnterior] || 0) - 1);
      }
      
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

      setToast({
        message: `❌ ERROR en ${nombrePersona}`,
        color: "#dc3545"
      });
      setTimeout(() => setToast(null), 800);

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

      setContadoresAsistencia(prev => {
        const nuevosContadores = { ...prev };
        
        if (nuevosContadores[codevento]) {
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

  // Función para manejar la apertura del modal de estadísticas
  const handleVerEstadisticas = (persona) => {
    setEstadisticasPersona(persona);
    setMostrarModalEstadisticas(true);
  };

  const getAsistenciaStyle = (asistencia) => {
    switch (asistencia) {
      case "P":
        return {
          bg: "linear-gradient(135deg, #28a745 0%, #c4cfc9ff 40%)",
          border: "#c4cfc9ff",
          color: "#28a745",
        };
      case "PN":
        return {
          bg: "linear-gradient(135deg, #17a2b8 0%, #c4cfc9ff 40%)",
          border: "#c4cfc9ff",
          color: "#17a2b8",
        };
      case "A":
        return {
          bg: "linear-gradient(135deg, #dc3545 0%, #c4cfc9ff 40%)",
          border: "#c4cfc9ff",
          color: "#dc3545",
        };
      case "AA":
        return {
          bg: "linear-gradient(135deg, #e4be16ff 0%, #c4cfc9ff 40%)",
          border: "#c4cfc9ff",
          color: "#e4be16ff",
        };
      case "I":
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

  function MenuEvento({ onFinalizar, onAbrir, onEliminar }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
      const handler = (e) => {
        if (ref.current && !ref.current.contains(e.target)) {
          setOpen(false);
        }
      };
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }, []);

    return (
      <MenuEventoWrapper ref={ref} onClick={(e) => e.stopPropagation()}>
        <IconWrapper>
          <HiDotsVertical
            size={22}
            onClick={() => setOpen((o) => !o)}
            style={{
              cursor: "pointer",
              color: "#333",
              background: "#fff",
              borderRadius: "50%",
              padding: "4px",
              boxShadow: "0 1px 4px rgba(0,0,0,.25)",
            }}
          />
        </IconWrapper>

        {open && (
          <Menu align="left">
            <Item onClick={onAbrir}>Abrir</Item>
            <Item onClick={onFinalizar}>Finalizar</Item>
            <Item onClick={onEliminar}>Eliminar</Item>
          </Menu>
        )}
      </MenuEventoWrapper>
    );
  }

  const estadoEvento = async(codevento, tipo) => {
    try {
      if (tipo === "B"){
        const result = await Swal.fire({
          title: "¿Estás seguro de eliminar el evento?",
          text: "No podrás recuperar este evento",
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: "Sí, eliminar",
          cancelButtonText: "Cancelar",
        });

        if (!result.isConfirmed) return;
      } 

      console.log("Ejecutando..." + tipo + " " + codevento);
      const response = await axios.post(
        `${API_BASE_URL}/evento_estado`,
        {
          codevento: codevento,
          tipo: tipo
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      
      console.log("Evento cambiado:", response.data);
      fetchEventosDetalles();
      
    } catch (err) {
      console.error("Error finalizando evento", err);
    }
  };

  useEffect(() => {
    if (activeTab !== "eventos") {
      setMostrarEstadisticas(false);
    }
  }, [activeTab]);

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
    if (divisiones.length > 0 && divisionesSeleccionadas.length === 0) {
      console.log("Auto-seleccionando primera división:", divisiones[0]);
      setDivisionesSeleccionadas([divisiones[0]]);
      setCurrentDivision(divisiones[0]);
    }
  }, [divisiones]);

  useEffect(() => {
    if (activeTab === "personas" && divisionesSeleccionadas.length > 0) {
      console.log("Cargando personas para divisiones:", divisionesSeleccionadas);
      fetchPersonasDivision();
    }
  }, [divisionesSeleccionadas, activeTab]);

  useEffect(() => {
    if (activeTab !== "eventos") return;
    if (!currentClub?.codclub) return;
    if (divisionesSeleccionadas.length === 0) return;

    console.log("Cargando eventos para divisiones:", divisionesSeleccionadas);
    fetchEventosDetalles();
  }, [activeTab, currentClub, divisionesSeleccionadas, fechaInicio, fechaFin]);

  const coddivisionesParaEstadisticas = divisionesSeleccionadas.length > 0 
    ? divisionesSeleccionadas.map((d) => d.coddivision)
    : [];

  function MenuPersona({ onEstadisticas }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
      const handler = (e) => {
        if (ref.current && !ref.current.contains(e.target)) {
          setOpen(false);
        }
      };
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }, []);

    return (
      <MenuPersonaWrapper ref={ref} onClick={(e) => e.stopPropagation()}>
        <div className="menu-icon" onClick={() => setOpen((o) => !o)}>
          <FiMoreHorizontal size={20} />
        </div>
        
        {open && (
          <Menu align="right" style={{ top: '40px', right: 0 }}>
            <Item onClick={() => { 
              onEstadisticas(); 
              setOpen(false); 
            }}>
              <MenuItemContent>
                <FcStatistics size={18} />
                <span>Estadísticas</span>
              </MenuItemContent>
            </Item>
          </Menu>
        )}
      </MenuPersonaWrapper>
    );
  }

  const handleEditarPersona = (codpersona) => {
    navigate('/persona', { 
      state: { codpersona: codpersona } 
    });
  };

  return (
    <Container80 className={esEntornoPruebas ? "entorno-pruebas" : ""}>
      {esEntornoPruebas && (
        <BannerPruebas>
          ⚠️ CLUBIP - ENTORNO DE PRUEBAS - Base de datos de desarrollo
        </BannerPruebas>
      )}
      <Header />
      <TabsCarrusel tabs={tabs} active={activeTab} onChange={setActiveTab} />
      
      {activeTab === "actividades" && (
        <TabsCarrusel
          tabs={actividadesTabs}
          active={actividadActiva}
          onChange={setActividadActiva}
          size="sm"
        />
      )}
      
      
      <DivisionesContainer>
        {divisiones.map((d) => (
          <DivisionButton
            key={d.coddivision}
            active={divisionesSeleccionadas.some(
              (div) => div.coddivision === d.coddivision
            )}
            onClick={() => {
              setDivisionesSeleccionadas((prev) => {
                const yaEstaSeleccionada = prev.some(
                  (div) => div.coddivision === d.coddivision
                );

                if (yaEstaSeleccionada) {
                  return prev.filter((div) => div.coddivision !== d.coddivision);
                } else {
                  return [...prev, d];
                }
              });
            }}
          >
            {d.descripcion}
          </DivisionButton>
        ))}
      </DivisionesContainer>

      {(activeTab === "personas" || activeTab === "eventos") && ( 
        <ToolbarContainer>
          <ToolbarLeft>
            <GreenButton
              title="Nuevo"
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

            <RefreshButton
              title="Refrescar"
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

            {/* Botón para mostrar/ocultar staff */}
            {activeTab === "personas" && (
              <StaffToggleButton
                onClick={() => setMostrarStaff(!mostrarStaff)}
                active={mostrarStaff}
                title={mostrarStaff ? "Ocultar staff" : "Mostrar staff"}
              >
                👥 Staff {mostrarStaff ? '▼' : '▶'} ({totalStaff})
              </StaffToggleButton>
            )}

            {activeTab === "eventos" && (
              <>
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
                    placeholder="Buscar personas..."
                    value={buscarpersona}
                    onChange={(e) => setBuscarPersona(e.target.value)}
                  />
                </SearchContainer>

                {/* Contador mejorado */}
                <ContadorPersonas>
                  {buscarpersona ? (
                    `Mostrando ${personasFiltradas.length} de ${totalPersonas} personas para "${buscarpersona}"`
                  ) : (
                    <>
                      <span><strong>{totalJugadores}</strong> jugador{totalJugadores !== 1 ? 'es' : ''}</span>
                      <span style={{ margin: '0 8px', color: '#ccc' }}>|</span>
                      <span><strong>{totalStaff}</strong> staff</span>
                    </>
                  )}
                </ContadorPersonas>
              </SearchWrapper>            
            )}
          </ToolbarRight>
        </ToolbarContainer>
      )}

      {activeTab === "eventos" && mostrarEstadisticas && (
        <EstadisticasAsistencias
          fechaDesde={fechaInicio}
          fechaHasta={fechaFin}          
          coddivisiones={divisionesSeleccionadas.map((d) => d.coddivision)}
        />
      )}

      {activeTab === "actividades" && actividadActiva && (
        <ActividadesJugadores
          codclub={currentClub.codclub}
          usuario={currentUser}
          codactividad={actividadActiva}                  
          nombreActividad={
            actividades.find(a => a.codactividad === actividadActiva)?.descripcion || "Actividad"
          }
          divisiones={divisionesSeleccionadas}
          todasLasDivisiones={divisiones}
          coddisciplina={currentDisciplina?.coddisciplina ?? 0}
          divisionesSeleccionadas={divisionesSeleccionadas}
          setDivisionesSeleccionadas={setDivisionesSeleccionadas}
        />
      )}
     

      {activeTab === "estadisticas" && (
          <Estadisticas
            codclub={currentClub.codclub}
            usuario={currentUser}
            coddisciplina={currentDisciplina?.coddisciplina ?? 0}
            divisiones={divisiones}
            divisionesSeleccionadas={divisionesSeleccionadas}
            setDivisionesSeleccionadas={setDivisionesSeleccionadas}         
            codactividad={actividadActiva} // para gimnasio
          />
        )}

      {activeTab === "personas" && (
        <>
          {/* STAFF - Solo se muestra si hay staff y mostrarStaff es true */}
          {mostrarStaff && staffFiltrado.length > 0 && (
            <>
              <StaffHeader>
                <h3>Staff ({staffFiltrado.length})</h3>
              </StaffHeader>
              <StaffRow>
                {staffFiltrado.map((p) => {
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
                      
                      <ButtonGroup>
                        <EditButton onClick={() => handleEditarPersona(p.codpersona)} title="Editar persona">
                          <FiEdit2 size={18} />
                        </EditButton>

                        <MenuPersona
                          onEstadisticas={() => handleVerEstadisticas(p)}
                        />
                      </ButtonGroup>
                    </PersonaCard>
                  );
                })}
              </StaffRow>
            </>
          )}

          {/* JUGADORES - Siempre visibles, con filtro aplicado */}
          {filteredJugadores.length > 0 ? (
            <>
              <JugadoresHeader>
                <h3>Jugadores ({filteredJugadores.length})</h3>
              </JugadoresHeader>
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
                      
                      <ButtonGroup>
                        <EditButton onClick={() => handleEditarPersona(p.codpersona)} title="Editar persona">
                          <FiEdit2 size={18} />
                        </EditButton>

                        <MenuPersona
                          onEstadisticas={() => handleVerEstadisticas(p)}
                        />
                      </ButtonGroup>
                    </PersonaCard>
                  );
                })}
              </PersonasGrid>
            </>
          ) : (
            buscarpersona && <NoResults>No se encontraron personas para "{buscarpersona}"</NoResults>
          )}

          {/* Mensaje cuando no hay staff para mostrar */}
          {mostrarStaff && staffFiltrado.length === 0 && buscarpersona && (
            <NoResults>No se encontró staff para "{buscarpersona}"</NoResults>
          )}
        </>
      )}

      {/* ================= EVENTOS ================= */}
      {activeTab === "eventos" && (
        <EventosContainer>
          {eventos.map((ev) => {





//            console.log("FECHA Y HORA UTC:" + ev.fecha);
  //          console.log("FECHA Y HORA:" + UTCToLocal(ev.fecha, "datetime"));

            //const fecha = parsearFechaArgentina(ev.fecha);
            //const fecha = UTCToLocal(ev.fecha, "datetime");

            {/*const dia = fecha.toLocaleDateString("es-AR", {
              weekday: "short",
              day: "2-digit",
              month: "2-digit",
            });
            const hora = fecha.toLocaleTimeString("es-AR", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            });*/}

            const fechaHoraUTC = ev.fecha;

            const fecchaDate = new Date(fechaHoraUTC);
            const dia = fecchaDate.toLocaleDateString("es-AR", {
              weekday: "short",
              day: "2-digit",
              month: "2-digit",
            });
            const hora = UTCToLocal(fechaHoraUTC, "time");

            return (
              <EventoCard key={ev.codevento}>
                <EventoHeader
                  open={ev.open}
                  estado={ev.estado || "A"}
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
                  <MenuEventoWrapper>
                    <MenuEvento
                      onAbrir={() => estadoEvento(ev.codevento, "A")}
                      onFinalizar={() => estadoEvento(ev.codevento, "F")}
                      onEliminar={() => estadoEvento(ev.codevento, "B")}
                    />
                  </MenuEventoWrapper>
                  
                  <CandadoWrapper>
                    {ev.estado === "A" ? 
                      <HiLockOpen size={24} color="#28a745" /> : 
                      <HiLockClosed size={24} color="#dc3545" />
                    }
                  </CandadoWrapper>  
                  
                  <EventoFecha>
                    {/*<strong>{ev.codevento}</strong>*/}
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

                  <EventoAccionesHeader>
                    <BotonConContador estado={null} evento={ev} onClick={handleFiltro(null)} />
                    <BotonConContador estado="I" evento={ev} onClick={handleFiltro("I")} />
                    <BotonConContador estado="P" evento={ev} onClick={handleFiltro("P")} />
                    <BotonConContador estado="PN" evento={ev} onClick={handleFiltro("PN")} />
                    <BotonConContador estado="A" evento={ev} onClick={handleFiltro("A")} />
                    <BotonConContador estado="AA" evento={ev} onClick={handleFiltro("AA")} />
                  </EventoAccionesHeader>

                  <EventoAccionesMobile>
                    <BotonConContador estado={null} evento={ev} onClick={handleFiltro(null)} />
                    <BotonConContador estado="I" evento={ev} onClick={handleFiltro("I")} />
                    <BotonConContador estado="P" evento={ev} onClick={handleFiltro("P")} />
                    <BotonConContador estado="PN" evento={ev} onClick={handleFiltro("PN")} />
                    <BotonConContador estado="A" evento={ev} onClick={handleFiltro("A")} />
                    <BotonConContador estado="AA" evento={ev} onClick={handleFiltro("AA")} />
                  </EventoAccionesMobile>
                </EventoHeader>

                {ev.open && (
                  <EventoBody>
                    {ev.personas && ev.personas.length > 0 ? (
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
                                    disabled={ev.estado !== "A"}
                                    style={ev.estado !== "A" ? { opacity: 0.5, cursor: "not-allowed" } : {}}
                                  >
                                    ✔
                                  </BtnPresente>
                                  <BtnPresenteNo
                                    onClick={() => asistencia(ev.codevento, p.codpersona, "PN")}
                                    title="Presente no entrena"
                                    disabled={ev.estado !== "A"}
                                    style={ev.estado !== "A" ? { opacity: 0.5, cursor: "not-allowed" } : {}}
                                  >
                                    ✔-
                                  </BtnPresenteNo>
                                  <BtnAusente
                                    onClick={() => asistencia(ev.codevento, p.codpersona, "A")}
                                    title="Ausente"
                                    disabled={ev.estado !== "A"}
                                    style={ev.estado !== "A" ? { opacity: 0.5, cursor: "not-allowed" } : {}}
                                  >
                                    ✖
                                  </BtnAusente>
                                  <BtnAusenteAviso
                                    onClick={() => asistencia(ev.codevento, p.codpersona, "AA")}
                                    title="Ausente sin aviso"
                                    disabled={ev.estado !== "A"}
                                    style={ev.estado !== "A" ? { opacity: 0.5, cursor: "not-allowed" } : {}}
                                  >
                                    ⚠
                                  </BtnAusenteAviso>
                                </AccionesEvento>
                              </PersonaEventoRow>
                            );
                          })}
                      </EventoPersonas>
                    ) : (
                      <NoPersonasMensaje>
                        No hay personas inscritas en este evento.
                      </NoPersonasMensaje>
                    )}
                  </EventoBody>
                )}
              </EventoCard>
            );
          })}
        </EventosContainer>
      )}

      {toast && (
        <SimpleToast color={toast.color}>
          {toast.message}
        </SimpleToast>
      )}

      {/* ================= MODAL DE ESTADÍSTICAS DE PERSONA ================= */}
      {mostrarModalEstadisticas && estadisticasPersona && (
        <ModalOverlay onClick={() => {
          setMostrarModalEstadisticas(false);
          setEstadisticasPersona(null);
        }}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>
                📊 Estadísticas de {estadisticasPersona.apodo || estadisticasPersona.nombre}
              </ModalTitle>
              <CloseButton onClick={() => {
                setMostrarModalEstadisticas(false);
                setEstadisticasPersona(null);
              }}>&times;</CloseButton>
            </ModalHeader>
            <ModalBody>
              <EstadisticasPersona
                codpersona={estadisticasPersona.codpersona}
                codactividad={actividadActiva || null}
                coddivisiones={divisionesSeleccionadas.map((d) => d.coddivision)}
                fecha_desde={fechaInicio || (() => {
                  const fecha = new Date();
                  fecha.setDate(fecha.getDate() - 90);
                  return fecha.toISOString().split('T')[0];
                })()}
                fecha_hasta={fechaFin || new Date().toISOString().split('T')[0]}
              />
            </ModalBody>
          </ModalContent>
        </ModalOverlay>
      )}
    </Container80>
  );
};

export default Dashboard;

/* =========================
   STYLES - REUTILIZABLES
   ========================= */

const Wrapper = styled.div`
  position: relative;
`;

const Menu = styled.div`
  position: absolute;
  top: 36px;
  ${({ align = 'left' }) => align === 'right' ? 'right: 0;' : 'left: 0;'}
  background: white;
  color: #222;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0,0,0,.2);
  min-width: 120px;
  z-index: 100;
  
  @media (max-width: 768px) {
    top: 32px;
  }
`;

const Item = styled.div`
  padding: 8px 12px;
  cursor: pointer;
  font-size: 14px;
  color: #222;

  &:hover {
    background: #f2f2f2;
  }
`;

const IconWrapper = styled.div`
  border-radius: 50%;
  padding: 4px;

  &:hover {
    background: #f0f0f0;
  }
`;

/* =========================
   STYLES - ESPECÍFICOS
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
  position: relative;
  
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
  width: 100%;
`;

const BottomRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
`;

const Nombre = styled.div`
  font-size: 14px;
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
  padding: 20px 16px 16px 60px;
  cursor: pointer;
  color: white;
  background: ${({ estado }) => {
    switch(estado) {
      case 'A':
        return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
      case 'F':
        return 'linear-gradient(135deg, #6c757d 0%, #495057 100%)';
      case 'C':
        return 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)';
      default:
        return 'linear-gradient(135deg, #6c757d 0%, #495057 100%)';
    }
  }};
  position: relative;
  padding-left: 60px;
  min-height: 80px;
  flex-direction: row;

  &:hover {
    background: ${({ estado }) => {
      switch(estado) {
        case 'A':
          return 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)';
        case 'F':
          return 'linear-gradient(135deg, #495057 0%, #343a40 100%)';
        case 'C':
          return 'linear-gradient(135deg, #c82333 0%, #bd2130 100%)';
        default:
          return 'linear-gradient(135deg, #495057 0%, #343a40 100%)';
      }
    }};
  }

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    text-align: center;
    padding-left: 50px;

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
  margin-left: 0;

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
  padding: 4px 16px;
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
  white-space: nowrap;
  overflow: visible;
  text-overflow: clip;
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
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none !important;
    box-shadow: none !important;
  }
  
  &:disabled:hover {
    transform: none !important;
    box-shadow: none !important;
  }
  
  &:disabled:hover::after {
    opacity: 0;
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

  @media (min-width: 769px) {
    margin-left: 10px;
    align-self: center;
  }

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

const MenuEventoWrapper = styled.div`
  position: absolute;
  left: 16px;
  top: 20px;
  z-index: 50;
  
  @media (max-width: 768px) {
    left: 12px;
    top: 16px;
  }
  
  @media (max-width: 480px) {
    left: 8px;
    top: 12px;
  }
`;

const CandadoWrapper = styled.div`
  position: absolute;
  left: 20px;
  top: 66px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 40;
  
  svg {
    width: 32px;
    height: 32px;
  }
  
  svg[color="#28a745"] {
    filter: drop-shadow(0 0 2px rgba(40, 167, 69, 0.5));
  }
  
  @media (max-width: 768px) {
    left: 16px;
    top: 60px;
  }
  
  @media (max-width: 480px) {
    left: 12px;
    top: 55px;
  }
`;

const BannerPruebas = styled.div`
  background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
  color: white;
  text-align: center;
  padding: 10px;
  font-weight: bold;
  font-size: 14px;
  position: sticky;
  top: 0;
  z-index: 1000;
  box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  animation: pulse 2s infinite;
  
  @keyframes pulse {
    0% { opacity: 0.9; }
    50% { opacity: 1; }
    100% { opacity: 0.9; }
  }
`;

const NoPersonasMensaje = styled.div`
  text-align: center;
  padding: 20px;
  color: #666;
  font-size: 14px;
  background: #f1f3f4;
  border-radius: 6px;
  margin: 10px;
`;

const NombreContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

const ButtonGroup = styled.div`
  position: absolute;
  bottom: 12px;
  right: 12px;
  display: flex;
  gap: 8px;
  z-index: 20;
`;

const EditButton = styled.button`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: white;
  color: #1d3557;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: all 0.2s ease;

  &:hover {
    background: #1d3557;
    color: white;
    transform: scale(1.1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  &:active {
    transform: scale(0.95);
  }
`;

const MenuPersonaWrapper = styled.div`
  position: relative;
  
  .menu-icon {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: white;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    cursor: pointer;
    transition: all 0.2s ease;
    
    &:hover {
      background: #1d3557;
      color: white;
      transform: scale(1.1);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }
  }
`;

/* =========================
   NUEVOS STYLES
   ========================= */

const StaffToggleButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 6px;
  border: 2px solid ${({ active }) => (active ? "#6f42c1" : "#6c757d")};
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
  background: ${({ active }) => (active ? "#f3e8ff" : "white")};
  color: ${({ active }) => (active ? "#6f42c1" : "#495057")};

  &:hover {
    background: ${({ active }) => (active ? "#e9d8fd" : "#f8f9fa")};
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }

  &:active {
    transform: translateY(0);
  }
`;

const StaffHeader = styled.div`
  margin: 20px 0 10px 0;
  padding: 0 20px;
  
  h3 {
    color: #6f42c1;
    font-size: 18px;
    font-weight: 600;
    margin: 0;
    border-left: 4px solid #6f42c1;
    padding-left: 12px;
  }
`;

const JugadoresHeader = styled.div`
  margin: 20px 0 10px 0;
  padding: 0 20px;
  
  h3 {
    color: #28a745;
    font-size: 18px;
    font-weight: 600;
    margin: 0;
    border-left: 4px solid #28a745;
    padding-left: 12px;
  }
`;

const ContadorPersonas = styled.div`
  font-size: 13px;
  color: #4a5568;
  font-weight: 500;
  padding: 4px 12px;
  background: #f7fafc;
  border-radius: 4px;
  border: 1px solid #e2e8f0;
  white-space: nowrap;
  display: flex;
  align-items: center;

  @media (min-width: 769px) {
    margin-left: 10px;
    align-self: center;
  }

  @media (max-width: 768px) {
    width: 100%;
    text-align: center;
    margin-top: 8px;
    white-space: normal;
    justify-content: center;
  }
`;

// Estilo adicional para el contenido del menú
const MenuItemContent = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

/* =========================
   ESTILOS DEL MODAL DE ESTADÍSTICAS
   ========================= */

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(3px);
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 16px;
  width: 95%;
  max-width: 1000px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideIn 0.3s ease;

  @keyframes slideIn {
    from {
      transform: translateY(-30px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 2px solid #f0f0f0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 16px 16px 0 0;
`;

const ModalTitle = styled.h3`
  margin: 0;
  font-size: 20px;
  font-weight: 600;
`;

const CloseButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  font-size: 28px;
  cursor: pointer;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: scale(1.1);
  }
`;

const ModalBody = styled.div`
  padding: 24px;
  max-height: calc(90vh - 80px);
  overflow-y: auto;
`;