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
import { UTCToLocal, localToUTC } from "../utils/helpers";

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

// Función para procesar asistencias y agrupar por semana
const procesarAsistenciasPorSemana = (asistencias, dias) => {
  if (!asistencias || asistencias.length === 0) return null;

  const semanasMap = new Map();
  const hoy = new Date();
  const fechaInicio = new Date();
  fechaInicio.setDate(hoy.getDate() - dias);
  
  fechaInicio.setHours(0, 0, 0, 0);
  hoy.setHours(23, 59, 59, 999);

  const getLunes = (fecha) => {
    const nuevaFecha = new Date(fecha);
    const dia = nuevaFecha.getDay();
    const diff = dia === 0 ? 6 : dia - 1;
    nuevaFecha.setDate(nuevaFecha.getDate() - diff);
    nuevaFecha.setHours(0, 0, 0, 0);
    return nuevaFecha;
  };

  const getDomingo = (fecha) => {
    const nuevaFecha = new Date(fecha);
    const dia = nuevaFecha.getDay();
    const diff = dia === 0 ? 0 : 7 - dia;
    nuevaFecha.setDate(nuevaFecha.getDate() + diff);
    nuevaFecha.setHours(23, 59, 59, 999);
    return nuevaFecha;
  };

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
    
    fechaCursor.setDate(fechaCursor.getDate() + 7);
  }

  asistencias.forEach(asis => {
    // 🔥 Convertir la fecha UTC del backend a LOCAL para el agrupamiento
    const fechaLocalStr = UTCToLocal(asis.fecha, 'date'); // "08/04/2026"
    const [dia, mes, anio] = fechaLocalStr.split('/');
    const fechaAsis = new Date(anio, mes - 1, dia);
    fechaAsis.setHours(12, 0, 0, 0);
    
    const inicioSemana = getLunes(fechaAsis);
    const semanaKey = inicioSemana.toISOString().split('T')[0];
    
    if (semanasMap.has(semanaKey)) {
      const semana = semanasMap.get(semanaKey);
      semana.asistencias++;
      semana.fechas.push(fechaLocalStr);
    }
  });

  const semanas = Array.from(semanasMap.values())
    .sort((a, b) => {
      const [diaA, mesA, anioA] = a.semana_inicio.split('/');
      const [diaB, mesB, anioB] = b.semana_inicio.split('/');
      return new Date(anioA, mesA - 1, diaA) - new Date(anioB, mesB - 1, diaB);
    });

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
const GraficoAsistencias = React.memo(({ datos }) => {
  if (!datos?.semanas?.length) return null;
  
  const semanasConCero = datos.semanas.map(s => s.asistencias === 0);
  const maxAsistencias = Math.max(7, ...datos.semanas.map(s => s.asistencias));
  
  const chartData = {
    labels: datos.semanas.map(s => {
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

// ========== COMPONENTE MENÚ SEMÁFORO MEJORADO ==========
const MenuSemaforo = ({ onSelect, codpersona, codasistencia, onClose, className }) => {
  const opciones = [
    { color: 'verde', valor: 'V', icono: '🟢', bg: 'linear-gradient(135deg, #28a745, #20c997)' },
    { color: 'amarillo', valor: 'A', icono: '🟡', bg: 'linear-gradient(135deg, #ffc107, #fd7e14)' },
    { color: 'rojo', valor: 'R', icono: '🔴', bg: 'linear-gradient(135deg, #dc3545, #c82333)' }
  ];

  return (
    <MenuContainerSemaforo className={className}>
      {opciones.map((op) => (
        <OpcionSemaforo
          key={op.valor}
          onClick={() => {
            onSelect(codpersona, codasistencia, op.valor);
            onClose();
          }}
          style={{ background: op.bg }}
          title={`Marcar como ${op.color}`}
        >
          {op.icono}
        </OpcionSemaforo>
      ))}
    </MenuContainerSemaforo>
  );
};

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
  const [diasSeleccionados, setDiasSeleccionados] = useState({});
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [mostrarEstadisticas, setMostrarEstadisticas] = useState(false);
  
  // ===== ESTADO PARA CONTROLAR EL MENÚ DEL SEMÁFORO =====
  const [menuSemaforoAbierto, setMenuSemaforoAbierto] = useState(null);







  const actualizarSemaforoHistorial = async (codpersona, codasistencia, valor) => {
  try {
    console.log('🚦 Actualizando semáforo desde historial:', { codpersona, codasistencia, valor });
    
    const response = await axios.post(
      `${API_BASE_URL}/asistencia_actividad_actualizar_semaforo`,
      { 
        codasistencia,
        semaforo: valor 
      },
      { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
    );
    
    if (response.data.success) {
      // Actualizar el historial local
      setHistorial(prev => ({
        ...prev,
        [codpersona]: prev[codpersona].map(asis => 
          asis.codasistencia === codasistencia 
            ? { ...asis, semaforo: valor }
            : asis
        )
      }));
      
      // Si esta asistencia es la última, también actualizar la persona principal
      setPersonas(prev => prev.map(p => 
        p.codpersona === codpersona && p.codultima_asistencia === codasistencia
          ? { ...p, semaforo_ult_asistencia: valor }
          : p
      ));
      
      setMenuSemaforoAbierto(null);
      console.log('✅ Semáforo actualizado en historial');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    alert('Error al actualizar el semáforo');
  }
};




  // ===== FUNCIÓN PARA ACTUALIZAR SEMÁFORO =====
  const actualizarSemaforo = async (codpersona, codasistencia, valor) => {
    try {
      console.log('🚦 Actualizando semáforo:', { codpersona, codasistencia, valor });
      
      // Llamada al endpoint
      const response = await axios.post(
        `${API_BASE_URL}/asistencia_actividad_actualizar_semaforo`,
        { 
          codasistencia,
          semaforo: valor 
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      
      if (response.data.success) {
        // Actualizamos el estado de personas para que el cambio se vea inmediatamente
        setPersonas(prev => prev.map(p => 
          p.codpersona === codpersona 
            ? { ...p, semaforo_ult_asistencia: valor }
            : p
        ));
        
        setMenuSemaforoAbierto(null);
        console.log('✅ Semáforo actualizado en BD');
      }
      
    } catch (error) {
      console.error('❌ Error:', error);
      alert('Error al actualizar el semáforo');
    }
  };

  // ========== LÓGICA PRINCIPAL ==========
  useEffect(() => {
    const timer = setTimeout(() => {
      setFiltroDebounced(filtroNombre);
    }, 400);
    return () => clearTimeout(timer);
  }, [filtroNombre]);
  
  const toggleEstadisticas = () => {
    setMostrarEstadisticas(!mostrarEstadisticas);
  }
  
  const getDivisionesParaBuscar = () => {
    if (filtroDebounced && filtroDebounced.trim() !== "") {
      return todasLasDivisiones || [];
    }
    return divisionesSeleccionadas || [];
  };

  useEffect(() => {
    if (!codactividad) {
      setPersonas([]);
      return;
    }

    const divisionesParaBuscar = getDivisionesParaBuscar();
    
    if (!filtroDebounced && divisionesParaBuscar.length === 0) {
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

  const fetchPersonasActividades = async (divisionesParaBuscar) => {
    try {
      setLoading(true);

      let respuestas = [];
      if (filtroDebounced && filtroDebounced.trim() !== "") {
        const res = await axios.post(
          `${API_BASE_URL}/personas_jugadores_actividades`,
          { 
            codclub: codclub,
            coddivision: 0,
            coddisciplina: coddisciplina, 
            codactividad: codactividad,
            filtro: filtroDebounced || ""
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

      console.log('Respuestas:', respuestas);
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
  






  const formatearFechaBackend = (fecha, finDelDia = false) => {
  // fecha es un objeto Date en hora LOCAL del usuario
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, '0');
  const day = String(fecha.getDate()).padStart(2, '0');
  
  const hora = finDelDia ? "23:59" : "00:00";
  const fechaLocalStr = `${year}-${month}-${day}`;
  
  // Convertir a UTC
  const fechaUTC = localToUTC(fechaLocalStr, hora);
  
  // Devolver en formato YYYYMMDDHHmmss (sin separadores)
  return fechaUTC.replace(/[-: ]/g, '');
};

//08042026
const formatearFechaBackendOld = (fecha, finDelDia = false) => {
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, '0');
  const day = String(fecha.getDate()).padStart(2, '0');

  return finDelDia
    ? `${year}${month}${day}235959`
    : `${year}${month}${day}000000`;
};


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

const cargarHistorial = async (codpersona) => {
  setCargandoHistorial(prev => ({ ...prev, [codpersona]: true }));

  const hoy = new Date();
  const desde = new Date();
  desde.setDate(hoy.getDate() - 30); // Últimos 30 días

  // 🔥 CLAVE: Formatear las fechas como YYYYMMDDHHmmss
  const fecha_desde = formatearFechaBackend(desde, false); // 000000
  const fecha_hasta = formatearFechaBackend(hoy, true);    // 235959

  console.log('📅 Enviando fechas:', { fecha_desde, fecha_hasta });

  try {
    const response = await axios.post(
      `${API_BASE_URL}/historial_asistencias`,
      { 
        codpersona,           // ✅
        codactividad,        // ✅
        fecha_desde,         // ✅ formato: YYYYMMDD000000
        fecha_hasta          // ✅ formato: YYYYMMDD235959
      },
      { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
    );
    
    const asistencias = response.data.asistencias || [];
    setHistorial(prev => ({
      ...prev,
      [codpersona]: asistencias
    }));
    
  } catch (error) {
    console.error("❌ Error cargando historial:", error);
    alert('Error al cargar el historial');
  } finally {
    setCargandoHistorial(prev => ({ ...prev, [codpersona]: false }));
  }
};
  

const cargarDatosGrafico = async (codpersona, dias = 90) => {
  setCargandoGrafico(prev => ({ ...prev, [codpersona]: true }));
  
  const hoy = new Date();
  const desde = new Date();
  desde.setDate(hoy.getDate() - dias);
  
  // 🔥 CLAVE: Formatear las fechas
  const fecha_desde = formatearFechaBackend(desde, false); // 000000
  const fecha_hasta = formatearFechaBackend(hoy, true);    // 235959
  
  try {
    const response = await axios.post(
      `${API_BASE_URL}/historial_asistencias`,
      { 
        codpersona, 
        codactividad, 
        fecha_desde,    // ✅
        fecha_hasta     // ✅
      },
      { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
    );
    
    const asistencias = response.data.asistencias || [];
    const datosProcesados = procesarAsistenciasPorSemana(asistencias, dias);
    
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
    
    if (nuevaVista === 'grafico' && !datosGrafico[codpersona]) {
      cargarDatosGrafico(codpersona, 90);
    }
  };

  const toggleExpandido = (codpersona) => {
    const nuevoEstado = !expandido[codpersona];
    setExpandido(prev => ({ ...prev, [codpersona]: nuevoEstado }));
    if (nuevoEstado) {
      cargarHistorial(codpersona);
    }
  };

  const cambiarPeriodoGrafico = (codpersona, dias) => {
    cargarDatosGrafico(codpersona, dias);
  };

const registrarAsistenciaActividad = async (
  codpersona,
  codasistenciaExistente = 0,
  tipoFecha = 'hoy'
) => {
  try {
    setRegistrando(prev => ({ ...prev, [codpersona]: true }));
    
    let fechaObj = new Date();

    if (tipoFecha === 'ayer') {
      fechaObj.setDate(fechaObj.getDate() - 1);
    } else if (tipoFecha === 'antesDeAyer') {
      fechaObj.setDate(fechaObj.getDate() - 2);
    }

    // 🔥 Convertir a UTC antes de enviar
    const year = fechaObj.getFullYear();
    const month = String(fechaObj.getMonth() + 1).padStart(2, '0');
    const day = String(fechaObj.getDate()).padStart(2, '0');
    const hours = String(fechaObj.getHours()).padStart(2, '0');
    const minutes = String(fechaObj.getMinutes()).padStart(2, '0');
    
    const fechaUTC = localToUTC(`${year}-${month}-${day}`, `${hours}:${minutes}`);
    
    console.log(`📝 Registrando asistencia para ${codpersona} en UTC: ${fechaUTC}`);
    
    const response = await axios.post(
      `${API_BASE_URL}/actividad_asistencia`,
      {
        codasistencia: codasistenciaExistente || 0,
        codclub,
        codactividad,
        codpersona,
        fecha: fechaUTC,  // 🔥 Enviamos UTC
        observacion: '',
        estado: 'A'
      },
      { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
    );

    const nuevoCodAsistencia = response.data.codasistencia;

    setPersonas(prev =>
      prev.map(p => {
        if (p.codpersona !== codpersona) return p;
        
        if (tipoFecha === 'hoy') {
          return {
            ...p,
            asistencias_semana: (p.asistencias_semana || 0) + 1,
            fecha_ult_asistencia: fechaUTC,
            codultima_asistencia: nuevoCodAsistencia,
            semaforo_ult_asistencia: 'V'
          };
        }
        
        return {
          ...p,
          asistencias_semana: (p.asistencias_semana || 0) + 1,
          fecha_ult_asistencia: fechaUTC
        };
      })
    );

    if (expandido[codpersona]) {
      await cargarHistorial(codpersona);
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
    const fechaFin = new Date(hoy);
    const dia = hoy.getDay();
    const diff = dia === 0 ? -6 : 1 - dia;
    const fechaInicio = new Date(hoy);
    fechaInicio.setDate(hoy.getDate() + diff);
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

  const personasFiltradas = personas.filter(
    (p) =>
      p.nombre?.toLowerCase().includes(filtroNombre.toLowerCase()) ||
      p.apodo?.toLowerCase().includes(filtroNombre.toLowerCase())
  );

  const getTextoBusqueda = () => {
    if (filtroDebounced && filtroDebounced.trim() !== "") {
      return `🔍 Buscando "${filtroDebounced}" en TODAS las divisiones`;
    }
    if (divisionesSeleccionadas?.length > 0) {
      return `📌 Mostrando ${divisionesSeleccionadas.length} división(es) seleccionada(s)`;
    }
    return "⏸️ Seleccioná divisiones o escribí un nombre para buscar";
  };

  return (
    <Wrapper>
      <Header>
        <h3>{nombreActividad || "Actividad"}</h3>
        <HeaderControls>
          <Input
            type="text"
            placeholder="Buscar persona..."
            value={filtroNombre}
            onChange={(e) => setFiltroNombre(e.target.value)}
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
        {divisionesSeleccionadas?.length > 0 && !filtroDebounced && (
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
                  <PersonaContainer>
                    <Fila>
                      
            {/* ===== DESKTOP VIEW CON SEMÁFORO ===== */}
            <DesktopView>
              <NombreDesktop>{p.apodo || p.nombre}</NombreDesktop>
              
              <IconoContainerSemaforo>
                <IconoMancuerna
                  onClick={() => {
                    console.log('🔵 Click en mancuerna - persona:', p.codpersona);
                    setMenuSemaforoAbierto(
                      menuSemaforoAbierto === p.codpersona ? null : p.codpersona
                    );
                  }}
                  tieneSemaforo={p.semaforo_ult_asistencia}
                >
                  {p.semaforo_ult_asistencia ? ( 
                    <SemaforoIndicator valor={p.semaforo_ult_asistencia} Hoy/>
                  ) : null}
                </IconoMancuerna>
                
                {menuSemaforoAbierto === p.codpersona && (
                  <MenuSemaforo
                    onSelect={actualizarSemaforo}
                    codpersona={p.codpersona}
                    codasistencia={p.codultima_asistencia}
                    onClose={() => setMenuSemaforoAbierto(null)}
                  />
                )}
              </IconoContainerSemaforo>
              
              <DivisionDesktop>
                <BadgeDivision>{p.division}</BadgeDivision>
              </DivisionDesktop>
              <AsistenciasDesktop>
                <BadgeAsistencia valor={p.asistencias_semana || 0}>
                  {p.asistencias_semana || 0}
                </BadgeAsistencia>
              </AsistenciasDesktop>
            </DesktopView>

            {/* ===== MOBILE VIEW CON SEMÁFORO ===== */}
            <MobileView>
              <MobileHeader>
                <NombreMobile>{p.apodo || p.nombre}</NombreMobile>
                <IconoContainerSemaforoMobile>
                  <IconoMancuernaMobile
                    onClick={() => {
                      console.log('📱 Click en mancuerna móvil - persona:', p.codpersona);
                      setMenuSemaforoAbierto(
                        menuSemaforoAbierto === p.codpersona ? null : p.codpersona
                      );
                    }}
                    tieneSemaforo={p.semaforo_ult_asistencia}
                  >
                    {p.semaforo_ult_asistencia ? (
                      <SemaforoIndicatorMobile valor={p.semaforo_ult_asistencia} />
                    ) : null}
                  </IconoMancuernaMobile>
                  
                  {menuSemaforoAbierto === p.codpersona && (
                    <MenuSemaforoMobile
                      onSelect={actualizarSemaforo}
                      codpersona={p.codpersona}
                      codasistencia={p.codultima_asistencia}
                      onClose={() => setMenuSemaforoAbierto(null)}
                    />
                  )}
                </IconoContainerSemaforoMobile>
              </MobileHeader>
              <MobileRow>
                <BadgeDivision>{p.division}</BadgeDivision>
                <BadgeAsistenciaMobile valor={p.asistencias_semana || 0}>
                  {p.asistencias_semana || 0} sem
                </BadgeAsistenciaMobile>
              </MobileRow>
            </MobileView>

                      <BotonesContainer>
                        <BotonesFila>
                          <BtnIcono 
                            onClick={() => toggleExpandido(p.codpersona)}
                            title="Ver historial"
                          >
                            <HiDotsVertical size={20} />
                          </BtnIcono>
                          <BtnAsistir 
                            onClick={() => registrarAsistenciaActividad(p.codpersona)}
                            title="Asistir"
                            $registrando={registrando[p.codpersona]}
                            disabled={registrando[p.codpersona]}
                          >
                            {registrando[p.codpersona] ? '...' : 'Asistir'}
                          </BtnAsistir>
                        </BotonesFila>
                        <FechaOpciones>
                          <FechaBtn onClick={() => registrarAsistenciaActividad(p.codpersona, 0, 'ayer')}>
                            Ayer
                          </FechaBtn>
                          <FechaBtn onClick={() => registrarAsistenciaActividad(p.codpersona, 0, 'antesDeAyer')}>
                            Antes de Ayer
                          </FechaBtn>
                        </FechaOpciones>
                      </BotonesContainer>
                    </Fila>
                  </PersonaContainer>

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
                                
                             {historial[p.codpersona].map((asis) => {

                                console.log('🔍 ASIS.FECHA es de tipo:', typeof asis.fecha);
                                console.log('🔍 ASIS.FECHA valor:', asis.fecha);
                                  // Obtener fecha local usando el helper
                                  const fechaLocalDate = UTCToLocal(asis.fecha, 'date');
                                  
                                  // 🔥 CORREGIDO: Convertir "YYYY-MM-DD HH:MM:SS" a formato ISO válido
                                  const fechaUTC = new Date(asis.fecha.replace(' ', 'T') + 'Z');
                                  //const diaSemana = fechaUTC.toLocaleDateString("es-AR", {
                                   // weekday: "long"
                                  //});
                                  const diaSemana = new Date(asis.fecha).toLocaleDateString("es-AR", {
                                    weekday: "long"
                                  });
                                  
                                  // Parsear la fecha local para los cálculos de modificabilidad
                                  const [dia, mes, anio] = fechaLocalDate.split('/');
                                  const fechaAsis = new Date(anio, mes - 1, dia);
                                  fechaAsis.setHours(0, 0, 0, 0);

                                  const hoy = new Date();
                                  hoy.setHours(0, 0, 0, 0);
                                  const ayer = new Date(hoy);
                                  ayer.setDate(ayer.getDate() - 1);
                                  const antesdeayer = new Date(hoy);
                                  antesdeayer.setDate(antesdeayer.getDate() - 2);

                                  const esModificable = 
                                    fechaAsis.getTime() === hoy.getTime() ||
                                    fechaAsis.getTime() === ayer.getTime() ||
                                    fechaAsis.getTime() === antesdeayer.getTime();
                                
                                return (
                                  <HistorialItem key={asis.codasistencia}>
                                    <HistorialFecha>
                                          {diaSemana} {fechaLocalDate}
                                        </HistorialFecha>
                                          
                                          {/* Contenedor del semáforo - SOLO EL CÍRCULO */}
                                          <HistorialSemaforoContainer>
                                            {/* El círculo de color - AHORA ABRE EL MENÚ */}
                                            {asis.semaforo && (
                                             // Reemplazá TODO el bloque del círculo con esto:

                                              <SemaforoHistorialButton
                                                valor={asis.semaforo}
                                                esModificable={esModificable}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  console.log('🔴 CLICK EN CÍRCULO - código:', asis.codasistencia);
                                                  console.log('🔴 esModificable:', esModificable);
                                                  
                                                  if (esModificable) {
                                                    // Si es modificable, abrimos el menú
                                                    setMenuSemaforoAbierto(
                                                      menuSemaforoAbierto === asis.codasistencia ? null : asis.codasistencia
                                                    );
                                                  } else {
                                                    // Si NO es modificable, mostramos un aviso
                                                    alert(`⚠️ No se puede modificar el color de asistencias anteriores a ${antesdeayer.toLocaleDateString('es-AR')}`);
                                                  }
                                                }}
                                                title={esModificable ? "Cambiar color" : "No se puede modificar"}
                                              />
                                            )}
                                            
                                            {/* Menú del semáforo */}
                                            {menuSemaforoAbierto === asis.codasistencia && (
                                              <MenuSemaforoHistorial
                                                onSelect={(codpersona, codasistencia, valor) => {
                                                  console.log('🟢 MENÚ SELECCIONADO:', { codpersona, codasistencia, valor });
                                                  actualizarSemaforoHistorial(codpersona, codasistencia, valor);
                                                  setMenuSemaforoAbierto(null);
                                                }}
                                                codpersona={p.codpersona}
                                                codasistencia={asis.codasistencia}
                                                onClose={() => setMenuSemaforoAbierto(null)}
                                              />
                                            )}
                                          </HistorialSemaforoContainer>
                                          
                                          {/* Check y botón cancelar */}
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
                                      );
                                    })}
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
    justify-content: flex-start;
    gap: 20px;
  }

  h3 {
    margin: 0;
    font-size: 18px;
    color: #1d3557;
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
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
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

const FechaOpciones = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;
`;

const FechaBtn = styled.button`
  background: #007bff;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #0056b3;
  }
`;

const PersonaContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 8px;
`;

const BotonesFila = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

// ===== VERSIÓN MEJORADA DE LOS CIRCULOS =====
const IconoContainerSemaforoMobile = styled.div`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-left: 8px;
`;

const IconoMancuernaMobile = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.tieneSemaforo ? 'rgba(0,0,0,0.05)' : '#f0f0f0'};
    transform: scale(1.05);
  }
  
  &:active {
    transform: scale(0.95);
  }
`;

const SemaforoIndicatorMobile = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: ${props => {
    switch(props.valor) {
      case 'V': return 'linear-gradient(135deg, #28a745, #20c997)';
      case 'A': return 'linear-gradient(135deg, #ffc107, #fd7e14)';
      case 'R': return 'linear-gradient(135deg, #dc3545, #c82333)';
      default: return '#999';
    }
  }};
  box-shadow: 0 4px 10px rgba(0,0,0,0.2);
  border: 2px solid white;
  transition: all 0.3s ease;
  
  &:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 15px rgba(0,0,0,0.3);
  }
`;

const MenuSemaforoMobile = styled(MenuSemaforo)`
  right: -10px;
  
  @media (max-width: 480px) {
    right: -5px;
    
    button {
      width: 45px;
      height: 45px;
      font-size: 22px;
    }
  }
`;

// Versión desktop mejorada
const IconoContainerSemaforo = styled.div`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 40px;
`;

const IconoMancuerna = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.tieneSemaforo ? 'rgba(0,0,0,0.05)' : '#f0f0f0'};
    transform: scale(1.05);
  }
  
  &:active {
    transform: scale(0.95);
  }
`;

const SemaforoIndicator = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: ${props => {
    switch(props.valor) {
      case 'V': return 'linear-gradient(135deg, #28a745, #20c997)';
      case 'A': return 'linear-gradient(135deg, #ffc107, #fd7e14)';
      case 'R': return 'linear-gradient(135deg, #dc3545, #c82333)';
      default: return '#999';
    }
  }};
  box-shadow: 0 4px 10px rgba(0,0,0,0.2);
  border: 2px solid white;
  transition: all 0.3s ease;
  
  &:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 15px rgba(0,0,0,0.3);
  }
`;

// Menú desktop mejorado
const MenuContainerSemaforo = styled.div`
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border-radius: 50px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
  padding: 12px;
  display: flex;
  gap: 12px;
  z-index: 1000;
  margin-top: 8px;
  border: 1px solid rgba(0,0,0,0.1);
  backdrop-filter: blur(10px);
  background: rgba(255,255,255,0.95);
  
  @media (max-width: 768px) {
    padding: 10px;
    gap: 10px;
    right: -10px;
  }
`;

const OpcionSemaforo = styled.button`
  background: ${props => props.color};
  border: none;
  width: 45px;
  height: 45px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0,0,0,0.15);
  border: 2px solid white;
  
  &:hover {
    transform: scale(1.15) rotate(5deg);
    box-shadow: 0 8px 25px rgba(0,0,0,0.25);
  }
  
  &:active {
    transform: scale(0.95);
  }
  
  @media (max-width: 768px) {
    width: 50px;
    height: 50px;
    font-size: 24px;
  }
`;




const HistorialFecha = styled.span`
  color: #333;
  text-transform: capitalize;
  font-weight: 500;
  white-space: nowrap;
`;



const SemaforoHistorial = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: ${props => {
    switch(props.valor) {
      case 'V': return 'linear-gradient(135deg, #28a745, #20c997)';
      case 'A': return 'linear-gradient(135deg, #ffc107, #fd7e14)';
      case 'R': return 'linear-gradient(135deg, #dc3545, #c82333)';
      default: return '#999';
    }
  }};
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  border: 2px solid white;
  opacity: ${props => props.esModificable ? 1 : 0.5};
  cursor: ${props => props.esModificable ? 'pointer' : 'default'};
  transition: transform 0.2s;
  
  &:hover {
    transform: ${props => props.esModificable ? 'scale(1.1)' : 'none'};
  }
`;

const BtnSemaforoHistorial = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 6px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  min-width: 28px;
  min-height: 28px;
  
  &:hover {
    background: #f0f0f0;
    color: #333;
  }
`;

const HistorialAcciones = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: flex-end;
  
  @media (max-width: 768px) {
    gap: 8px;
  }
`;

const HistorialCheck = styled.span`
  font-size: 16px;
  min-width: 20px;
  text-align: center;
`;










// Ajusta el contenedor del semáforo
const HistorialSemaforoContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative; /* ¡CRUCIAL para que el menú se posicione! */
  min-width: 40px;
  
  @media (max-width: 768px) {
    justify-content: flex-end;
  }
`;

// Ajusta el botón del círculo
const SemaforoHistorialButton = styled.button`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid white;
  padding: 0;
  cursor: pointer;  /* Siempre pointer */
  transition: all 0.2s ease;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  
  background: ${props => {
    switch(props.valor) {
      case 'V': return 'linear-gradient(135deg, #28a745, #20c997)';
      case 'A': return 'linear-gradient(135deg, #ffc107, #fd7e14)';
      case 'R': return 'linear-gradient(135deg, #dc3545, #c82333)';
      default: return '#999';
    }
  }};
  
  /* El hover solo da feedback visual, pero no cambia el cursor */
  &:hover {
    transform: scale(1.1);
    box-shadow: 0 4px 10px rgba(0,0,0,0.3);
  }
  
  &:active {
    transform: scale(0.95);
  }
`;

// Ajusta el menú para que aparezca centrado debajo del círculo
const MenuSemaforoHistorial = styled(MenuSemaforo)`
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: 8px;
  z-index: 1002;
  
  @media (max-width: 768px) {
    left: auto;
    right: 0;
    transform: none;
  }
`;

// Ajusta las columnas del grid
const HistorialItem = styled.div`
  display: grid;
  grid-template-columns: 200px 80px 120px; /* Segunda columna más angosta para el círculo */
  align-items: center;
  padding: 10px;
  background: white;
  border-radius: 6px;
  font-size: 14px;
  gap: 10px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr 60px 100px;
    padding: 8px;
    font-size: 13px;
    gap: 8px;
  }
`;