import React, { useEffect, useState } from "react";
import axios from "axios";
import styled from "styled-components";
import { API_BASE_URL } from "../config";
import { CgGym } from "react-icons/cg";
import { HiDotsVertical } from "react-icons/hi";
import { FiX } from "react-icons/fi";
import { FaPeopleGroup } from "react-icons/fa6";
import { Line } from 'react-chartjs-2';
import { FcStatistics } from "react-icons/fc";
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
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

import EstadisticasAsistenciaActividades from "./EstadisticasAsistenciaActividades";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);




// Función para procesar asistencias y agrupar por semana - AHORA DINÁMICA
// Función para procesar asistencias y agrupar por semana - CORREGIDA (7 días exactos)
const procesarAsistenciasPorSemana = (asistencias, dias) => {
  if (!asistencias || asistencias.length === 0) return null;

  // Crear un mapa de todas las semanas en el período
  const semanasMap = new Map();
  const hoy = new Date();
  const fechaInicio = new Date();
  fechaInicio.setDate(hoy.getDate() - dias);
  
  // Ajustar fechaInicio al inicio del día
  fechaInicio.setHours(0, 0, 0, 0);
  hoy.setHours(23, 59, 59, 999);

  console.log(`📅 Procesando ${dias} días: ${fechaInicio.toLocaleDateString()} - ${hoy.toLocaleDateString()}`);

  // Función para obtener el lunes de una fecha (inicio de semana)
  const getLunes = (fecha) => {
    const nuevaFecha = new Date(fecha);
    const dia = nuevaFecha.getDay(); // 0 = domingo, 1 = lunes, ..., 6 = sábado
    const diff = dia === 0 ? 6 : dia - 1; // Si es domingo (0), resto 6 para llegar al lunes anterior
    nuevaFecha.setDate(nuevaFecha.getDate() - diff);
    nuevaFecha.setHours(0, 0, 0, 0);
    return nuevaFecha;
  };

  // Función para obtener el domingo de una fecha (fin de semana)
  const getDomingo = (fecha) => {
    const nuevaFecha = new Date(fecha);
    const dia = nuevaFecha.getDay();
    const diff = dia === 0 ? 0 : 7 - dia; // Si es domingo (0), no sumo nada
    nuevaFecha.setDate(nuevaFecha.getDate() + diff);
    nuevaFecha.setHours(23, 59, 59, 999);
    return nuevaFecha;
  };

  // Generar todas las semanas del período
  let fechaCursor = new Date(fechaInicio);
  while (fechaCursor <= hoy) {
    const inicioSemana = getLunes(fechaCursor);
    const finSemana = getDomingo(inicioSemana);
    
    const semanaKey = inicioSemana.toISOString().split('T')[0];
    
    if (!semanasMap.has(semanaKey)) {
      semanasMap.set(semanaKey, {
        semana_inicio: inicioSemana.toLocaleDateString('es-AR'),
        semana_fin: finSemana.toLocaleDateString('es-AR'),
        asistencias: 0,
        fechas: []
      });
    }
    
    // Avanzar 7 días exactos
    fechaCursor.setDate(fechaCursor.getDate() + 7);
  }

  // Contar asistencias por semana
  asistencias.forEach(asis => {
    const [dia, mes, anio] = asis.fecha.split('/');
    const fechaAsis = new Date(anio, mes - 1, dia);
    fechaAsis.setHours(12, 0, 0, 0); // Mediodía para evitar problemas de zona horaria
    
    const inicioSemana = getLunes(fechaAsis);
    const semanaKey = inicioSemana.toISOString().split('T')[0];
    
    if (semanasMap.has(semanaKey)) {
      const semana = semanasMap.get(semanaKey);
      semana.asistencias++;
      semana.fechas.push(asis.fecha);
    }
  });

  // Convertir a array y ordenar (de más antigua a más reciente para el gráfico)
  const semanas = Array.from(semanasMap.values())
    .sort((a, b) => {
      const [diaA, mesA, anioA] = a.semana_inicio.split('/');
      const [diaB, mesB, anioB] = b.semana_inicio.split('/');
      return new Date(anioA, mesA - 1, diaA) - new Date(anioB, mesB - 1, diaB);
    });

  // Verificación de semanas de 7 días
  semanas.forEach(sem => {
    const [diaIni, mesIni, anioIni] = sem.semana_inicio.split('/');
    const [diaFin, mesFin, anioFin] = sem.semana_fin.split('/');
    
    const inicio = new Date(anioIni, mesIni - 1, diaIni);
    const fin = new Date(anioFin, mesFin - 1, diaFin);
    
    const diffDias = Math.round((fin - inicio) / (1000 * 60 * 60 * 24));
    
    if (diffDias !== 6) {
      console.warn(`⚠️ Semana con ${diffDias + 1} días: ${sem.semana_inicio} - ${sem.semana_fin}`);
    }
  });

  // Calcular total
  const total = semanas.reduce((acc, sem) => acc + sem.asistencias, 0);


  return {
    semanas,
    total_asistencias: total,
    semanas_totales: semanas.length,
    semanas_con_asistencia: semanas.filter(s => s.asistencias > 0).length,
    semanas_sin_asistencia: semanas.filter(s => s.asistencias === 0).length,
    promedio_semanal: (total / semanas.length).toFixed(1),
    dias_consultados: dias,
    periodo: {
      desde: fechaInicio.toLocaleDateString('es-AR'),
      hasta: hoy.toLocaleDateString('es-AR')
    }
  };
};

// Componente memoizado para el gráfico de LÍNEAS
// Componente memoizado para el gráfico de LÍNEAS - CON FECHAS CORREGIDAS
const GraficoAsistencias = React.memo(({ datos }) => {
  if (!datos?.semanas?.length) return null;
  
  const semanasConCero = datos.semanas.map(s => s.asistencias === 0);
  
  // Determinar el máximo de asistencias para la escala Y
  const maxAsistencias = Math.max(7, ...datos.semanas.map(s => s.asistencias));
  
  const chartData = {
    labels: datos.semanas.map(s => {
      // Formato: "17/11" (solo inicio de semana)
      const inicio = s.semana_inicio.split('/').slice(0,2).join('/');
      return inicio;
    }),
    datasets: [
      {
        label: 'Asistencias',
        data: datos.semanas.map(s => s.asistencias),
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        borderWidth: 3,
        pointBackgroundColor: (context) => {
          const index = context.dataIndex;
          return semanasConCero[index] ? '#ef4444' : '#667eea';
        },
        pointBorderColor: 'white',
        pointBorderWidth: 2,
        pointRadius: (context) => {
          const index = context.dataIndex;
          return semanasConCero[index] ? 6 : 4;
        },
        pointHoverRadius: 8,
        tension: 0.3,
        fill: true,
      }
    ]
  };
  
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { 
        backgroundColor: '#333',
        titleColor: 'white',
        bodyColor: 'white',
        callbacks: {
          title: (context) => {
            const semana = datos.semanas[context[0].dataIndex];
            return `Semana del ${semana.semana_inicio} al ${semana.semana_fin}`;
          },
          label: (context) => {
            const semana = datos.semanas[context.dataIndex];
            const asistencias = context.raw;
            const totalDias = semana.fechas.length;
            
            if (asistencias === 0) {
              return ['❌ Sin asistencias esta semana'];
            }
            
            const lines = [
              `✅ Asistió ${asistencias} ${asistencias === 1 ? 'vez' : 'veces'}`,
              `📅 Días: ${semana.fechas.join(', ')}`
            ];
            
            return lines;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: maxAsistencias,
        ticks: { 
          stepSize: 1,
          font: { size: 10 },
          callback: (value) => value === 0 ? '0' : value
        },
        grid: { color: 'rgba(0, 0, 0, 0.05)' },
        title: {
          display: true,
          text: 'Asistencias por semana',
          font: { size: 10 }
        }
      },
      x: {
        ticks: {
          maxRotation: 45,
          minRotation: 45,
          font: { size: 9 },
          maxTicksLimit: 10,
          autoSkip: true,
          padding: 5,
        },
        grid: { display: false },
        title: {
          display: true,
          text: 'Inicio de semana',
          font: { size: 10 }
        }
      }
    },
    animation: { duration: 300 },
    layout: {
      padding: { left: 5, right: 5, top: 15, bottom: 20 }
    }
  };
  
  // Verificar que todas las semanas sean de 7 días
    const semanasCorrectas = datos.semanas.every(s => {
    const [diaIni, mesIni, anioIni] = s.semana_inicio.split('/');
    const [diaFin, mesFin, anioFin] = s.semana_fin.split('/');
    const inicio = new Date(anioIni, mesIni - 1, diaIni);
    const fin = new Date(anioFin, mesFin - 1, diaFin);
    const diffDias = Math.round((fin - inicio) / (1000 * 60 * 60 * 24));
    return diffDias === 6;
  });
  
  if (!semanasCorrectas) {
    console.warn('⚠️ Algunas semanas no tienen 7 días exactos');
  }
  

  

  return (
    <>
      <GraficoWrapper>
        <Line data={chartData} options={options} />
      </GraficoWrapper>
      
      <EstadisticasContainer>
        <EstadisticaItem>
          <EstadisticaLabel>Total</EstadisticaLabel>
          <EstadisticaValor total>{datos.total_asistencias}</EstadisticaValor>
        </EstadisticaItem>
        
        <EstadisticaItem>
          <EstadisticaLabel>Semanas</EstadisticaLabel>
          <EstadisticaValor>{datos.semanas_totales}</EstadisticaValor>
        </EstadisticaItem>
        
        <EstadisticaItem>
          <EstadisticaLabel>Promedio</EstadisticaLabel>
          <EstadisticaValor promedio>{datos.promedio_semanal}/sem</EstadisticaValor>
        </EstadisticaItem>
        
        <EstadisticaItem>
          <EstadisticaLabel>Sin asistir</EstadisticaLabel>
          <EstadisticaValor cero>{datos.semanas_sin_asistencia}</EstadisticaValor>
        </EstadisticaItem>
      </EstadisticasContainer>
      
      <PeriodoInfo>
        📅 {datos.periodo.desde} - {datos.periodo.hasta} ({datos.dias_consultados} días) • {datos.semanas_totales} semanas de 7 días
      </PeriodoInfo>
    </>
  );
}, (prevProps, nextProps) => prevProps.datos === nextProps.datos);

const ActividadesJugadores = ({
  codclub,
  usuario,
  codactividad,
  nombreActividad,
  divisiones,
  todasLasDivisiones,
  coddisciplina,
  divisionesSeleccionadas,
  setDivisionesSeleccionadas,
}) => {
  const [personas, setPersonas] = useState([]);
  const [filtroNombre, setFiltroNombre] = useState("");
  const [filtroDebounced, setFiltroDebounced] = useState("");
  const [loading, setLoading] = useState(false);
  const [registrando, setRegistrando] = useState({});
  const [expandido, setExpandido] = useState({});
  const [historial, setHistorial] = useState({});
  const [cargandoHistorial, setCargandoHistorial] = useState({});
  const [datosGrafico, setDatosGrafico] = useState({});
  const [cargandoGrafico, setCargandoGrafico] = useState({});
  const [modoVista, setModoVista] = useState({});
  const [diasSeleccionados, setDiasSeleccionados] = useState({}); // Para guardar los días por persona
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [mostrarEstadisticas, setMostrarEstadisticas] = useState(false);

  // ========== LÓGICA PRINCIPAL ==========



   useEffect(() => {
    const timer = setTimeout(() => {
      setFiltroDebounced(filtroNombre);
    }, 400); // Espera 400ms después de que el usuario deje de escribir

    // Cleanup: cancela el timer si el usuario sigue escribiendo
    return () => clearTimeout(timer);
  }, [filtroNombre]);
  
  const toggleEstadisticas = () => {
      setMostrarEstadisticas(!mostrarEstadisticas);
  }
  
  // Determinar qué divisiones usar para la búsqueda
  const getDivisionesParaBuscar = () => {
    if (filtroDebounced && filtroDebounced.trim() !== "") {  // 👈 CAMBIO
      return todasLasDivisiones || [];
    }
    return divisionesSeleccionadas || [];
  };

  // Efecto principal
  useEffect(() => {
    if (!codactividad) {
      setPersonas([]);
      return;
    }

    const divisionesParaBuscar = getDivisionesParaBuscar();
    
    if (!filtroDebounced && divisionesParaBuscar.length === 0) {  // 👈 CAMBIO
      setPersonas([]);
      setLoading(false);
      return;
    }

    fetchPersonasActividades(divisionesParaBuscar);
  }, [codactividad, divisionesSeleccionadas, filtroDebounced]); 

  useEffect(() => {
  const { inicio, fin } = getWeekRange();
  setFechaInicio(inicio);
  setFechaFin(fin);
}, []);
  // Cargar personas
  const fetchPersonasActividades = async (divisionesParaBuscar) => {
    try {
      setLoading(true);

      let respuestas = [];
      if (filtroDebounced && filtroDebounced.trim() !== "") {  // 👈 CAMBIO
        const res = await axios.post(
          `${API_BASE_URL}/personas_jugadores_actividades`,
          { 
            codclub: codclub,
            coddivision: 0,
            coddisciplina: coddisciplina, 
            codactividad: codactividad,
            filtro: filtroDebounced || ""  // 👈 CAMBIO
          },
          { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        );     
        respuestas = [res];                 
      } else {
        respuestas = await Promise.all(
          divisionesParaBuscar.map((division) => {
            return axios.post(
              `${API_BASE_URL}/personas_jugadores_actividades`,
              { 
                codclub: codclub,
                coddivision: division.coddivision,
                coddisciplina: coddisciplina, 
                codactividad: codactividad,
                filtro: filtroNombre || ""
              },
              { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
            );
          })
        );
      }

      const todas = respuestas.flatMap((r) => r.data);
      const unicas = Array.from(
        new Map(todas.map((p) => [p.codpersona, p])).values()
      );

      setPersonas(unicas);
    } catch (err) {
      console.error("❌ Error cargando personas actividad:", err);
      setPersonas([]);
    } finally {
      setLoading(false);
    }
  };

  // ========== FUNCIONES ==========
  
  const esFechaHoy = (fechaStr) => {
    if (!fechaStr) return false;
    const fecha = new Date(fechaStr).toLocaleDateString("es-AR", {
      timeZone: "America/Argentina/Cordoba"
    });
    const hoy = new Date().toLocaleDateString("es-AR", {
      timeZone: "America/Argentina/Cordoba"
    });
    return fecha === hoy;
  };

  const getDiaEnEspanol = (diaIngles) => {
    const dias = {
      'Monday': 'lunes',
      'Tuesday': 'martes',
      'Wednesday': 'miércoles',
      'Thursday': 'jueves',
      'Friday': 'viernes',
      'Saturday': 'sábado',
      'Sunday': 'domingo'
    };
    return dias[diaIngles] || diaIngles;
  };

  const cargarHistorial = async (codpersona, dias = 130) => {
    setCargandoHistorial(prev => ({ ...prev, [codpersona]: true }));
    try {
      const response = await axios.post(
        `${API_BASE_URL}/historial_asistencias`,
        { codpersona, codactividad, dias },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      
      const asistencias = response.data.asistencias || [];
      setHistorial(prev => ({
        ...prev,
        [codpersona]: asistencias
      }));
      
    } catch (error) {
      console.error("❌ Error cargando historial:", error);
    } finally {
      setCargandoHistorial(prev => ({ ...prev, [codpersona]: false }));
    }
  };

  const cargarDatosGrafico = async (codpersona, dias = 90) => {
    setCargandoGrafico(prev => ({ ...prev, [codpersona]: true }));
    try {
      console.log(`📊 Cargando gráfico para ${codpersona} con ${dias} días`);
      
      const response = await axios.post(
        `${API_BASE_URL}/historial_asistencias`,
        { 
          codpersona, 
          codactividad, 
          dias
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      
      const asistencias = response.data.asistencias || [];
      const datosProcesados = procesarAsistenciasPorSemana(asistencias, dias);
      
      console.log(`✅ Gráfico procesado: ${datosProcesados?.semanas.length} semanas`);
      
      setDatosGrafico(prev => ({ ...prev, [codpersona]: datosProcesados }));
      setDiasSeleccionados(prev => ({ ...prev, [codpersona]: dias }));
      
    } catch (error) {
      console.error("❌ Error cargando gráfico:", error);
    } finally {
      setCargandoGrafico(prev => ({ ...prev, [codpersona]: false }));
    }
  };

  const toggleVista = (codpersona) => {
    const nuevaVista = modoVista[codpersona] === 'grafico' ? 'lista' : 'grafico';
    setModoVista(prev => ({ ...prev, [codpersona]: nuevaVista }));
    
    // Si vamos a gráfico y no hay datos, cargar con valor por defecto (90 días)
    if (nuevaVista === 'grafico' && !datosGrafico[codpersona]) {
      cargarDatosGrafico(codpersona, 90);
    }
  };

  const toggleExpandido = (codpersona) => {
    const nuevoEstado = !expandido[codpersona];
    setExpandido(prev => ({ ...prev, [codpersona]: nuevoEstado }));
    if (nuevoEstado) {
      cargarHistorial(codpersona, 30); // 30 días para la lista
    }
  };

  const cambiarPeriodoGrafico = (codpersona, dias) => {
    console.log(`🔄 Cambiando período a ${dias} días para ${codpersona}`);
    cargarDatosGrafico(codpersona, dias);
  };

  const registrarAsistenciaActividad = async (codpersona, codasistenciaExistente = 0) => {
    try {
      setRegistrando(prev => ({ ...prev, [codpersona]: true }));
      
      const fecha = new Date().toISOString();

      await axios.post(
        `${API_BASE_URL}/actividad_asistencia`,
        {
          codasistencia: codasistenciaExistente || 0,
          codclub,
          codactividad,
          codpersona,
          fecha,
          observacion: '',
          estado: 'A'
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      
      setPersonas(prev =>
        prev.map(p => {
          if (p.codpersona !== codpersona) return p;
          return {
            ...p,
            asistencias_semana: (p.asistencias_semana || 0) + 1,
            fecha_ult_asistencia: new Date().toISOString()
          };
        })
      );

      if (expandido[codpersona]) {
        await cargarHistorial(codpersona, 30);
        if (modoVista[codpersona] === 'grafico') {
          const diasActuales = diasSeleccionados[codpersona] || 90;
          await cargarDatosGrafico(codpersona, diasActuales);
        }
      }
      
      setTimeout(() => {
        setRegistrando(prev => ({ ...prev, [codpersona]: false }));
      }, 500);
      
    } catch (error) {
      console.error("❌ Error registrando asistencia:", error);
      setRegistrando(prev => ({ ...prev, [codpersona]: false }));
    }
  };



  const getWeekRange = () => {
  const hoy = new Date();

  // copiar fecha
  const fechaFin = new Date(hoy);

  // día de la semana (0 domingo, 1 lunes…)
  const dia = hoy.getDay();

  // calcular cuánto restar para llegar al lunes
  const diff = dia === 0 ? -6 : 1 - dia;

  const fechaInicio = new Date(hoy);
  fechaInicio.setDate(hoy.getDate() + diff);

  // Formato yyyy-mm-dd para input date
  const formato = (fecha) => fecha.toISOString().split("T")[0];

  return {
    inicio: formato(fechaInicio),
    fin: formato(fechaFin),
  };
};

  const cancelarAsistencia = async (codasistencia, codpersona, fechaAsistencia) => {
    const confirmacion = window.confirm(
      `¿Estás seguro que querés eliminar la asistencia del ${fechaAsistencia}?`
    );
    if (!confirmacion) return;
    
    try {
      setCargandoHistorial(prev => ({ ...prev, [codpersona]: true }));
      
      await axios.post(
        `${API_BASE_URL}/actividad_asistencia`,
        { codasistencia, estado: 'B' },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      
      const divisionesParaBuscar = getDivisionesParaBuscar();
      await fetchPersonasActividades(divisionesParaBuscar);
      
      if (expandido[codpersona]) {
        await cargarHistorial(codpersona, 30);
        if (modoVista[codpersona] === 'grafico') {
          const diasActuales = diasSeleccionados[codpersona] || 90;
          await cargarDatosGrafico(codpersona, diasActuales);
        }
      }
      
    } catch (error) {
      console.error("❌ Error cancelando asistencia:", error);
      alert("Hubo un error al cancelar la asistencia");
    } finally {
      setCargandoHistorial(prev => ({ ...prev, [codpersona]: false }));
    }
  };

  // Filtro local
  const personasFiltradas = personas.filter(
    (p) =>
      p.nombre?.toLowerCase().includes(filtroNombre.toLowerCase()) ||
      p.apodo?.toLowerCase().includes(filtroNombre.toLowerCase())
  );

  const getTextoBusqueda = () => {
    if (filtroDebounced && filtroDebounced.trim() !== "") {  // 👈 CAMBIO
      return `🔍 Buscando "${filtroDebounced}" en TODAS las divisiones`;
    }
    if (divisionesSeleccionadas?.length > 0) {
      return `📌 Mostrando ${divisionesSeleccionadas.length} división(es) seleccionada(s)`;
    }
    return "⏸️ Seleccioná divisiones o escribí un nombre para buscar";
  };

  /* =========================
     RENDER
     ========================= */
  return (
    <Wrapper>
      <Header>
              <h3>{nombreActividad || "Actividad"}</h3>

              <HeaderControls>
                <Input
                  type="text"
                  placeholder="Buscar persona..."
                  value={filtroNombre}  // 👈 CAMBIO
                  onChange={(e) => setFiltroNombre(e.target.value)}  // 👈 CAMBIO
                />

                <FechasContainer>
                  <FechaInput
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                  />
                  <FechaInput
                    type="date"
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                  />
                </FechasContainer>

                <StatsButton onClick={toggleEstadisticas}>
                  <FcStatistics size={20} />
                </StatsButton>
              </HeaderControls>
            </Header>

            {mostrarEstadisticas && (
              <EstadisticasAsistenciaActividades
                fechaDesde={fechaInicio}
                fechaHasta={fechaFin}
                coddivisiones={divisionesSeleccionadas.map(d => d.coddivision)}
                codactividad={codactividad}
              />
            )}

      <EstadoInfo>
        {getTextoBusqueda()}
        {divisionesSeleccionadas?.length > 0 && !filtroDebounced && (  // 👈 CAMBIO
          <DivisionsDetalle>
            ({divisionesSeleccionadas.map(d => d.descripcion).join(', ')})
          </DivisionsDetalle>
        )}
      </EstadoInfo>

      <TitulosDesktop>
        <TituloNombre>Nombre</TituloNombre>
        <TituloIcono></TituloIcono>
        <TituloDivision>División</TituloDivision>
        <TituloAsistencias>Esta Semana</TituloAsistencias>
      </TitulosDesktop>

      {loading && <Loading>Cargando personas...</Loading>}

      <Lista>
        {!loading && (
          <>
            {personasFiltradas.length === 0 ? (
              <MensajeInfo>
                {filtroNombre 
                  ? `No se encontraron jugadores para "${filtroNombre}" en ninguna división`
                  : divisionesSeleccionadas?.length === 0
                    ? "Seleccioná divisiones o escribí un nombre para buscar jugadores"
                    : "No hay jugadores en las divisiones seleccionadas"}
              </MensajeInfo>
            ) : (
              personasFiltradas.map((p) => (
                <React.Fragment key={p.codpersona}>
                  <Fila>
                    <DesktopView>
                      <NombreDesktop>{p.apodo || p.nombre}</NombreDesktop>
                      <IconoContainer>
                        {esFechaHoy(p.fecha_ult_asistencia) && (
                          <CgGym size={20} color="#28a745" title="Asistió hoy" />
                        )}
                      </IconoContainer>
                      <DivisionDesktop>
                        <BadgeDivision>{p.division}</BadgeDivision>
                      </DivisionDesktop>
                      <AsistenciasDesktop>
                        <BadgeAsistencia valor={p.asistencias_semana || 0}>
                          {p.asistencias_semana || 0}
                        </BadgeAsistencia>
                      </AsistenciasDesktop>
                    </DesktopView>

                    <MobileView>
                      <MobileHeader>
                        <NombreMobile>{p.apodo || p.nombre}</NombreMobile>
                        {esFechaHoy(p.fecha_ult_asistencia) && (
                          <CgGym size={20} color="#28a745" title="Asistió hoy" />
                        )}
                      </MobileHeader>
                      <MobileRow>
                        <BadgeDivision>{p.division}</BadgeDivision>
                        <BadgeAsistenciaMobile valor={p.asistencias_semana || 0}>
                          {p.asistencias_semana || 0} sem
                        </BadgeAsistenciaMobile>
                      </MobileRow>
                    </MobileView>

                    <BotonesContainer>
                      <BtnIcono 
                        onClick={() => toggleExpandido(p.codpersona)}
                        title="Ver historial"
                      >
                        <HiDotsVertical size={20} />
                      </BtnIcono>
                      <BtnAsistir 
                        onClick={() => registrarAsistenciaActividad(p.codpersona)}
                        $registrando={registrando[p.codpersona]}
                        disabled={registrando[p.codpersona]}
                      >
                        {registrando[p.codpersona] ? '...' : 'Asistir'}
                      </BtnAsistir>
                    </BotonesContainer>
                  </Fila>

                  {expandido[p.codpersona] && (
                    <HistorialContainer>
                      <HistorialHeader>
                        <span>
                          {modoVista[p.codpersona] === 'grafico' 
                            ? '📊 Gráfico de asistencias' 
                            : '📋 Últimos 30 Días'} ({p.apodo || p.nombre})
                        </span>
                        <HistorialHeaderRight>
                          {modoVista[p.codpersona] === 'grafico' && (
                            <PeriodoSelector>
                              <PeriodoBtn 
                                onClick={() => cambiarPeriodoGrafico(p.codpersona, 10)}
                                active={diasSeleccionados[p.codpersona] === 10}
                              >
                                10d
                              </PeriodoBtn>
                              <PeriodoBtn 
                                onClick={() => cambiarPeriodoGrafico(p.codpersona, 30)}
                                active={diasSeleccionados[p.codpersona] === 30}
                              >
                                30d
                              </PeriodoBtn>
                              <PeriodoBtn 
                                onClick={() => cambiarPeriodoGrafico(p.codpersona, 60)}
                                active={diasSeleccionados[p.codpersona] === 60}
                              >
                                60d
                              </PeriodoBtn>
                              <PeriodoBtn 
                                onClick={() => cambiarPeriodoGrafico(p.codpersona, 90)}
                                active={diasSeleccionados[p.codpersona] === 90}
                              >
                                90d
                              </PeriodoBtn>
                              <PeriodoBtn 
                                onClick={() => cambiarPeriodoGrafico(p.codpersona, 150)}
                                active={diasSeleccionados[p.codpersona] === 150}
                              >
                                150d
                              </PeriodoBtn>
                              <PeriodoBtn 
                                onClick={() => cambiarPeriodoGrafico(p.codpersona, 200)}
                                active={diasSeleccionados[p.codpersona] === 200}
                              >
                                200d
                              </PeriodoBtn>
                              <PeriodoBtn 
                                onClick={() => cambiarPeriodoGrafico(p.codpersona, 300)}
                                active={diasSeleccionados[p.codpersona] === 300}
                              >
                                300d
                              </PeriodoBtn>
                            </PeriodoSelector>
                          )}
                          <BtnVista
                            onClick={() => toggleVista(p.codpersona)}
                            active={modoVista[p.codpersona] === 'grafico'}
                          >
                            {modoVista[p.codpersona] === 'grafico' ? '📋' : '📊'}
                          </BtnVista>
                          <BtnCerrar onClick={() => toggleExpandido(p.codpersona)}>
                            <FiX size={18} />
                          </BtnCerrar>
                        </HistorialHeaderRight>
                      </HistorialHeader>
                      
                      {modoVista[p.codpersona] !== 'grafico' && (
                        <>
                          {cargandoHistorial[p.codpersona] ? (
                            <HistorialLoading>Cargando historial...</HistorialLoading>
                          ) : historial[p.codpersona]?.length > 0 ? (
                            <>
                              <HistorialLista>
                                {historial[p.codpersona].map((asis) => (
                                  <HistorialItem key={asis.codasistencia}>
                                    <HistorialFecha>
                                      {getDiaEnEspanol(asis.dia_semana)} {asis.fecha}
                                    </HistorialFecha>
                                    <HistorialAcciones>
                                      <HistorialCheck>✅</HistorialCheck>
                                      <BtnCancelarHistorial
                                        onClick={() => cancelarAsistencia(
                                          asis.codasistencia, 
                                          p.codpersona,
                                          asis.fecha
                                        )}
                                      >
                                        Cancelar
                                      </BtnCancelarHistorial>
                                    </HistorialAcciones>
                                  </HistorialItem>
                                ))}
                              </HistorialLista>
                              <HistorialTotal>
                                Total: {historial[p.codpersona].length || 0}
                              </HistorialTotal>
                            </>
                          ) : (
                            <HistorialEmpty>No hay asistencias registradas</HistorialEmpty>
                          )}
                        </>
                      )}

                      {modoVista[p.codpersona] === 'grafico' && (
                        <>
                          {cargandoGrafico[p.codpersona] ? (
                            <HistorialLoading>Cargando gráfico...</HistorialLoading>
                          ) : datosGrafico[p.codpersona]?.semanas?.length > 0 ? (
                            <GraficoContainer>
                              <GraficoTitulo>
                                Asistencias por semana ({diasSeleccionados[p.codpersona] || 90} días)
                              </GraficoTitulo>
                              <GraficoAsistencias
                                key={`${p.codpersona}-${diasSeleccionados[p.codpersona]}`}
                                datos={datosGrafico[p.codpersona]}
                              />
                            </GraficoContainer>
                          ) : (
                            <HistorialEmpty>No hay datos suficientes</HistorialEmpty>
                          )}
                        </>
                      )}
                    </HistorialContainer>
                  )}
                </React.Fragment>
              ))
            )}
          </>
        )}
      </Lista>
    </Wrapper>
  );
};

export default ActividadesJugadores;

/* =========================
   STYLED COMPONENTS
   ========================= */
const Wrapper = styled.div`
  margin-top: 16px;
  width: 100%;
  overflow-x: hidden;
`;


const HeaderControls = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    width: 100%;
    gap: 8px;
  }
`;
const Header = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 12px;

  @media (min-width: 769px) {
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;   /* 👈 CAMBIO */
    gap: 20px;                     /* espacio entre título y controles */
  }

  h3 {
    margin: 0;
    font-size: 18px;
    color: #1d3557;
  }
`;
const HeaderRight = styled.div`
  display: flex;
  gap: 8px;
  width: 100%;
  
  @media (min-width: 769px) {
    flex: 1;
    justify-content: center;
    max-width: 600px;
    margin: 0 auto;
  }
`;

const Input = styled.input`
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  font-size: 16px;
  flex: 1;
  min-width: 0;
  background: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.02);
  
  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }
  
  @media (max-width: 768px) {
    font-size: 14px;
    padding: 8px 10px;
  }
  
  @media (min-width: 769px) {
    max-width: 400px;
  }
`;

const EstadoInfo = styled.div`
  font-size: 13px;
  margin-bottom: 12px;
  padding: 8px 12px;
  background: #e8f0fe;
  border-radius: 20px;
  display: inline-block;
  color: #1d3557;
  font-weight: 500;
  max-width: 100%;
  word-break: break-word;
  
  @media (max-width: 768px) {
    font-size: 12px;
    padding: 6px 10px;
    width: auto;
    display: block;
  }
`;

const DivisionsDetalle = styled.span`
  color: #666;
  font-weight: normal;
  margin-left: 5px;
  @media (max-width: 768px) {
    display: block;
    margin-left: 0;
    margin-top: 4px;
  }
`;

const Loading = styled.p`
  text-align: center;
  padding: 20px;
  color: #666;
`;

const MensajeInfo = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: #666;
  background: #f8f9fa;
  border-radius: 8px;
  font-size: 14px;
  width: 100%;
  box-sizing: border-box;
`;

const TitulosDesktop = styled.div`
  display: grid;
  grid-template-columns: 2fr 30px 120px 100px 1fr;
  padding: 8px 12px;
  margin: 8px 0;
  background: #f0f0f0;
  border-radius: 8px;
  font-weight: 700;
  color: #333;
  font-size: 14px;
  
  @media (max-width: 768px) {
    display: none;
  }
`;

const TituloNombre = styled.div``;
const TituloIcono = styled.div``;
const TituloDivision = styled.div``;
const TituloAsistencias = styled.div``;

const Lista = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 100px;
  width: 100%;
`;

const Fila = styled.div`
  background: #fff;
  border-radius: 10px;
  padding: 12px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  box-sizing: border-box;
  
  @media (max-width: 768px) {
    padding: 10px;
    gap: 8px;
  }
`;

const DesktopView = styled.div`
  display: grid;
  grid-template-columns: 2fr 30px 120px 100px;
  align-items: center;
  flex: 1;
  gap: 8px;
  
  @media (max-width: 768px) {
    display: none;
  }
`;

const NombreDesktop = styled.span`
  font-weight: 600;
  color: #1d3557;
`;

const IconoContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 30px;
`;

const DivisionDesktop = styled.div`
  display: flex;
  justify-content: flex-start;
`;

const AsistenciasDesktop = styled.div`
  display: flex;
  justify-content: flex-start;
`;

const MobileView = styled.div`
  display: none;
  
  @media (max-width: 768px) {
    display: flex;
    flex-direction: column;
    flex: 1;
    gap: 6px;
    min-width: 0;
  }
`;

const MobileHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
`;

const NombreMobile = styled.span`
  font-weight: 700;
  font-size: 16px;
  color: #1d3557;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const MobileRow = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: center;
`;

const BadgeDivision = styled.span`
  display: inline-block;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 4px 8px;
  border-radius: 16px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.3px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  text-align: center;
  min-width: 60px;
  white-space: nowrap;
  
  @media (max-width: 768px) {
    font-size: 10px;
    padding: 3px 6px;
    min-width: 50px;
  }
`;

const BadgeAsistencia = styled.span`
  display: inline-block;
  background: ${props => {
    if (props.valor >= 5) return 'linear-gradient(135deg, #28a745 0%, #20c997 100%)';
    if (props.valor >= 3) return 'linear-gradient(135deg, #ffc107 0%, #fd7e14 100%)';
    return 'linear-gradient(135deg, #6c757d 0%, #5a6268 100%)';
  }};
  color: white;
  padding: 4px 8px;
  border-radius: 16px;
  font-size: 11px;
  font-weight: 600;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  text-align: center;
  min-width: 30px;
`;

const BadgeAsistenciaMobile = styled(BadgeAsistencia)`
  min-width: 55px;
  width: auto;
  padding: 4px 8px;
  font-size: 11px;
`;

const BotonesContainer = styled.div`
  display: flex;
  gap: 4px;
  margin-left: 4px;
  
  @media (max-width: 768px) {
    gap: 2px;
  }
`;

const BtnIcono = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  color: #666;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background: #f0f0f0;
    color: #333;
  }
  
  &:active {
    background: #e0e0e0;
  }
  
  @media (max-width: 768px) {
    min-width: 40px;
    min-height: 40px;
    padding: 6px;
  }
`;

const BtnAsistir = styled.button`
  background: ${props => props.$registrando ? '#6c757d' : '#28a745'};
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: ${props => props.$registrando ? 'wait' : 'pointer'};
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
  min-width: 70px;
  min-height: 44px;
  
  &:hover {
    background: ${props => props.$registrando ? '#6c757d' : '#218838'};
    transform: ${props => props.$registrando ? 'none' : 'translateY(-1px)'};
  }
  
  &:active {
    transform: ${props => props.$registrando ? 'none' : 'translateY(0)'};
  }
  
  ${props => props.$registrando && `
    animation: pulse 1.5s infinite;
    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.7; }
      100% { opacity: 1; }
    }
  `}
  
  @media (max-width: 768px) {
    padding: 8px 10px;
    font-size: 13px;
    min-width: 60px;
    min-height: 40px;
  }
`;

const HistorialContainer = styled.div`
  background: #e8eaecff;
  border-radius: 0 0 8px 8px;
  margin-top: 4px;
  padding: 12px;
  border: 2px solid #667eea;
  border-top: none;
  width: 100%;
  box-sizing: border-box;
  
  @media (max-width: 768px) {
    padding: 10px;
  }
`;

const HistorialHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-weight: 600;
  color: #1d3557;
  
  @media (max-width: 768px) {
    font-size: 13px;
    flex-wrap: wrap;
    gap: 8px;
  }
`;

const HistorialHeaderRight = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
`;

const PeriodoSelector = styled.div`
  display: flex;
  gap: 4px;
  background: #f0f0f0;
  padding: 4px;
  border-radius: 20px;
  margin-right: 8px;
  
  @media (max-width: 768px) {
    order: -1;
    width: 100%;
    justify-content: center;
    margin-right: 0;
    margin-bottom: 8px;
  }
`;

const PeriodoBtn = styled.button`
  background: ${props => props.active ? '#667eea' : 'transparent'};
  color: ${props => props.active ? 'white' : '#666'};
  border: none;
  border-radius: 16px;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: ${props => props.active ? '#764ba2' : '#e0e0e0'};
  }
  
  @media (max-width: 768px) {
    padding: 6px 10px;
    font-size: 12px;
  }
`;

const BtnVista = styled.button`
  background: ${props => props.active ? '#667eea' : 'transparent'};
  color: ${props => props.active ? 'white' : '#667eea'};
  border: 2px solid #667eea;
  border-radius: 20px;
  padding: 6px 12px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 44px;
  min-height: 44px;
  
  &:hover {
    background: ${props => props.active ? '#764ba2' : '#f0f0f0'};
  }
  
  @media (max-width: 768px) {
    padding: 4px 8px;
    font-size: 13px;
    min-width: 40px;
    min-height: 40px;
  }
`;

const BtnCerrar = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  color: #666;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background: #e0e0e0;
    color: #333;
  }
  
  @media (max-width: 768px) {
    min-width: 40px;
    min-height: 40px;
    padding: 6px;
  }
`;

const HistorialLoading = styled.div`
  text-align: center;
  padding: 20px;
  color: #666;
`;

const HistorialEmpty = styled.div`
  text-align: center;
  padding: 20px;
  color: #999;
  font-style: italic;
`;

const HistorialLista = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
`;

const HistorialItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: white;
  border-radius: 6px;
  font-size: 14px;
  
  @media (max-width: 768px) {
    padding: 8px;
    font-size: 13px;
    flex-wrap: wrap;
    gap: 8px;
  }
`;

const HistorialFecha = styled.span`
  color: #333;
  text-transform: capitalize;
  font-weight: 500;
`;

const HistorialAcciones = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  
  @media (max-width: 768px) {
    gap: 8px;
  }
`;

const HistorialCheck = styled.span`
  font-size: 16px;
`;

const BtnCancelarHistorial = styled.button`
  background: #dc3545;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  min-width: 70px;
  min-height: 36px;
  
  &:hover {
    background: #c82333;
  }
  
  @media (max-width: 768px) {
    padding: 4px 8px;
    font-size: 11px;
    min-width: 60px;
    min-height: 32px;
  }
`;

const HistorialTotal = styled.div`
  text-align: right;
  font-size: 13px;
  color: #666;
  font-weight: 500;
  padding-top: 8px;
  border-top: 1px dashed #ccc;
`;

const GraficoContainer = styled.div`
  margin: 12px 0 8px 0;
  padding: 12px;
  background: white;
  border-radius: 10px;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  
  @media (max-width: 768px) {
    padding: 8px;
  }
`;

const GraficoTitulo = styled.h4`
  margin: 0 0 10px 0;
  font-size: 14px;
  color: #1d3557;
  font-weight: 600;
  
  @media (max-width: 768px) {
    font-size: 13px;
    margin-bottom: 8px;
  }
`;

const GraficoWrapper = styled.div`
  position: relative;
  width: 100%;
  height: 220px;
  
  @media (max-width: 768px) {
    height: 180px;
  }
  
  canvas {
    width: 100% !important;
    height: 100% !important;
  }
`;

const EstadisticasContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: space-around;
  margin: 12px 0 8px 0;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 12px;
`;

const EstadisticaItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 60px;
`;

const EstadisticaLabel = styled.span`
  font-size: 10px;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const EstadisticaValor = styled.span`
  font-size: 16px;
  font-weight: 700;
  color: ${props => {
    if (props.total) return '#28a745';
    if (props.promedio) return '#667eea';
    if (props.cero) return '#ef4444';
    return '#1d3557';
  }};
  
  @media (max-width: 768px) {
    font-size: 14px;
  }
`;

const PeriodoInfo = styled.div`
  font-size: 11px;
  color: #999;
  text-align: center;
  margin-top: 4px;
  padding: 4px;
  background: #f5f5f5;
  border-radius: 12px;
`;


const ButtonText = styled.span`
  font-size: 14px;
  font-weight: 500;
`;


const FechasContainer = styled.div`
  display: flex;
  gap: 6px;
  align-items: center;
`;

const StatsButton = styled.button`
  background: #1d3557;
  color: white;
  border: none;
  padding: 6px 10px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;

  &:hover {
    background: #16324f;
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