import React, { useEffect, useState, useMemo } from "react";
import styled from "styled-components";
import axios from "axios";
import { API_BASE_URL } from "../config";
import {  LineChart,  Line  } from "recharts";
import {  BarChart,  Bar,  XAxis,  YAxis,  Tooltip,  ResponsiveContainer,  Legend,  CartesianGrid} from "recharts";
import { FaCalendarAlt } from "react-icons/fa";
import { UTCToLocal, localToUTC } from "../utils/helpers";
import CalendarioAsistencias from "./calendarioAsistencias";


import { MdOutlineSportsRugby } from "react-icons/md";


const EstadisticasPersona = ({
  codpersona,
  codactividad,
  coddivisiones = [],
  fecha_desde: fechaDesdeProp,
  fecha_hasta: fechaHastaProp

  

}) => {

  //console.log("fechas", fechaDesdeProp, fechaHastaProp);

  // Estados para fechas locales
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  
  const [dataGimnasio, setDataGimnasio] = useState([]);
  const [dataEntrenamiento, setDataEntrenamiento] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userModifiedDates, setUserModifiedDates] = useState(false);


  
  // Constante para esperado por semana (3 para gimnasio)
  const ESPERADO_GYM_SEMANAL = 3;

  // Inicializar fechas cuando cambian las props o al montar
  useEffect(() => {
  // Solo usar props si el usuario NO modificó manualmente las fechas
  if (!userModifiedDates) {
    if (fechaDesdeProp && fechaHastaProp) {
      setFechaInicio(fechaDesdeProp);
      setFechaFin(fechaHastaProp);
    } else if (!fechaInicio && !fechaFin) {
      // Solo establecer default si no hay fechas iniciales
      const hoy = new Date();
      const hace90Dias = new Date();
      hace90Dias.setDate(hoy.getDate() - 90);
      
      setFechaFin(hoy.toISOString().split('T')[0]);
      setFechaInicio(hace90Dias.toISOString().split('T')[0]);
    }
  }
}, [fechaDesdeProp, fechaHastaProp, userModifiedDates]);

  // Función para establecer la semana actual
  // REEMPLAZAR los handlers actuales:

// const setSemanaActual = () => { ... } - MODIFICAR
const setSemanaActual = () => {
  const hoy = new Date();
  const dia = hoy.getDay();
  
  const lunes = new Date(hoy);
  const diff = hoy.getDate() - dia + (dia === 0 ? -6 : 1);
  lunes.setDate(diff);
  
  const domingo = new Date(lunes);
  domingo.setDate(lunes.getDate() + 6);
  
  setFechaInicio(lunes.toISOString().split('T')[0]);
  setFechaFin(domingo.toISOString().split('T')[0]);
  setUserModifiedDates(true); // 👈 AGREGAR ESTA LÍNEA
};

// const setUltimos90Dias = () => { ... } - MODIFICAR
const setUltimos90Dias = () => {
  const hoy = new Date();
  const hace90Dias = new Date();
  hace90Dias.setDate(hoy.getDate() - 90);
  
  setFechaFin(hoy.toISOString().split('T')[0]);
  setFechaInicio(hace90Dias.toISOString().split('T')[0]);
  setUserModifiedDates(true); // 👈 AGREGAR ESTA LÍNEA
};

  // Función para obtener los datos
  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");
      
      const config = {
        headers: { 
          Authorization: `Bearer ${localStorage.getItem("token")}` 
        }
      };

      // Formatear fechas para el backend
      const fechaDesdeFormateada = localToUTC(fechaInicio, "00:00:00");
      const fechaHastaFormateada = localToUTC(fechaFin, "23:59:59");

      //console.log("📅 Fechas ORIGINALES:", { fechaInicio, fechaFin });
      //console.log("📅 Fechas FORMATEADAS UTC:", { 
        //fecha_desde: fechaDesdeFormateada, 
        //fecha_hasta: fechaHastaFormateada 
      //});

      // 🔹 GIMNASIO (actividades)
      const respGym = await axios.post(
        `${API_BASE_URL}/historial_asistencia_actividades`,
        {
          codpersona,
          codactividad,
          coddivisiones,
          fecha_desde: fechaDesdeFormateada,
          fecha_hasta: fechaHastaFormateada,
          esperado: ESPERADO_GYM_SEMANAL
        },
        config
      );

      // 🔹 ENTRENAMIENTO (divisiones)
      const respEntrenamiento = await axios.post(
        `${API_BASE_URL}/asistencias_divisiones`,
        {
          codpersona,
          fecha_desde: fechaDesdeFormateada,
          fecha_hasta: fechaHastaFormateada,
          coddivisiones
        },
        config
      );

      const gimnasioData = respGym.data?.detalle || [];
      const entrenamientoData = Array.isArray(respEntrenamiento.data) ? respEntrenamiento.data : [];
      
      setDataGimnasio(gimnasioData);
      setDataEntrenamiento(entrenamientoData);

      //console.log("📊 Gimnasio procesado:", gimnasioData);
     // console.log("📊 Entrenamiento procesado:", entrenamientoData);

    } catch (err) {
      console.error("❌ Error cargando estadísticas persona:", err);
      setError(err.response?.data?.message || "Error al cargar las estadísticas");
    } finally {
      setLoading(false);
    }
  };

  // Efecto para cargar datos cuando cambian fechas o persona
  useEffect(() => {
    if (!codpersona || !fechaInicio || !fechaFin) return;
    fetchData();
  }, [codpersona, codactividad, coddivisiones, fechaInicio, fechaFin]);

  // Función para formatear fecha a DD/MM/YY
  const formatFechaDDMMYY = (date) => {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = String(date.getFullYear()).slice(-2);
    return `${d}/${m}/${y}`;
  };




  // Función para obtener la semana de una fecha
const getSemanaFromFecha = (fechaStr) => {
  // Si ya es un objeto Date, usarlo directamente
  let f = fechaStr instanceof Date ? fechaStr : new Date(fechaStr);
  
  if (isNaN(f.getTime())) {
    console.error("Fecha inválida:", fechaStr);
    return {
      key: null,
      label: "Fecha inválida"
    };
  }
  
  const dia = f.getDay();
  const diff = f.getDate() - dia + (dia === 0 ? -6 : 1);
  
  const lunes = new Date(f);
  lunes.setDate(diff);
  lunes.setHours(0, 0, 0, 0);
  
  // 🔥 Validar que la fecha sea razonable (no año 2026 si es 2025)
  if (lunes.getFullYear() > new Date().getFullYear() + 1) {
    console.warn("Fecha muy futura ignorada:", lunes);
    return {
      key: null,
      label: "Fecha inválida"
    };
  }
  
  const domingo = new Date(lunes);
  domingo.setDate(lunes.getDate() + 6);
  
  return {
    key: lunes.toISOString().split('T')[0],
    label: `${formatFechaDDMMYY(lunes)}-${formatFechaDDMMYY(domingo)}`
  };
};

  // Función para obtener la semana de una fecha
  const getSemanaFromFechaOld = (fechaStr) => {
    // Validar que la fecha sea válida
    let f = new Date(fechaStr);
    if (isNaN(f.getTime())) {
      // Si es inválida, intentar parsear diferente
      f = new Date(fechaStr.replace(/-/g, '/'));
      if (isNaN(f.getTime())) {
        console.error("Fecha inválida:", fechaStr);
        return {
          key: new Date().toISOString().split('T')[0],
          label: "Fecha inválida"
        };
      }
    }
    
    const dia = f.getDay();
    const diff = f.getDate() - dia + (dia === 0 ? -6 : 1);
    
    const lunes = new Date(f);
    lunes.setDate(diff);
    lunes.setHours(0, 0, 0, 0);
    
    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 6);
    
    return {
      key: lunes.toISOString().split('T')[0],
      label: `${formatFechaDDMMYY(lunes)}-${formatFechaDDMMYY(domingo)}`
    };
  };

  // Datos para el gráfico (combinado por semana)
 // Datos para el gráfico (combinado por semana)
const dataGrafico = useMemo(() => {
  const map = {};

  // 🟦 GIMNASIO
  if (Array.isArray(dataGimnasio)) {
    dataGimnasio.forEach(item => {
      const fechaStr = item.fecha;
      if (!fechaStr) return;

      const fechaLocal = new Date(fechaStr);
      if (isNaN(fechaLocal)) return;

      const fechaKey = fechaLocal.toISOString().split('T')[0];

      if (!map[fechaKey]) {
        map[fechaKey] = {
          fecha: fechaKey,
          gimnasio: 0,
          entrenamiento: 0
        };
      }

      map[fechaKey].gimnasio += 1;
    });
  }

  // 🟩 ENTRENAMIENTO
  if (Array.isArray(dataEntrenamiento)) {
    dataEntrenamiento.forEach(item => {
      const fechaStr = item.fecha;
      if (!fechaStr) return;

      const fecha = new Date(fechaStr);
      const fechaKey = fecha.toISOString().split('T')[0];

      if (!map[fechaKey]) {
        map[fechaKey] = {
          fecha: fechaKey,
          gimnasio: 0,
          entrenamiento: 0
        };
      }

      const cod = item.codigo_asistencia;

      if (cod === "P" || cod === "PN") {
        map[fechaKey].entrenamiento = 1;
      } else if (cod === "A" || cod === "AA") {
        map[fechaKey].entrenamiento = 0;
      }
    });
  }

  return Object.values(map).sort((a, b) => a.fecha.localeCompare(b.fecha));
}, [dataGimnasio, dataEntrenamiento]);

 // ========== DETALLE SEMANAL CORREGIDO ==========
const detalleSemanal = useMemo(() => {
  const semanasMap = new Map();  // 🔥 ESTO DEBE IR PRIMERO

  // 🟢 GIMNASIO (por fecha → semana)
  if (Array.isArray(dataGimnasio)) {
    dataGimnasio.forEach(item => {
      const fechaStr = item.fecha;
      if (!fechaStr) return;

      const fechaLocal = new Date(fechaStr);
      if (isNaN(fechaLocal)) return;

      const semana = getSemanaFromFecha(fechaLocal);

      if (!semanasMap.has(semana.key)) {
        semanasMap.set(semana.key, {
          key: semana.key,
          label: semana.label,
          gym: 0,
          entrenamiento: 0,
          esperado_entrenamiento: 0,
          total_asistencias: 0
        });
      }

      const semanaData = semanasMap.get(semana.key);
      semanaData.gym += 1;
      semanaData.total_asistencias += 1;
    });
  }

  // 🔵 ENTRENAMIENTO (queda igual)
  if (Array.isArray(dataEntrenamiento)) {
    dataEntrenamiento.forEach(item => {
      const fechaStr = item.fecha || item.fecha_evento;
      if (!fechaStr) return;

      const semana = getSemanaFromFecha(fechaStr);
      if (!semana || semana.label === "Fecha inválida") return;

      if (!semanasMap.has(semana.key)) {
        semanasMap.set(semana.key, {
          key: semana.key,
          label: semana.label,
          gym: 0,
          entrenamiento: 0,
          esperado_entrenamiento: 0,
          total_asistencias: 0
        });
      }

      const semanaData = semanasMap.get(semana.key);
      semanaData.esperado_entrenamiento += 1;

      const codAsistencia = item.codigo_asistencia;
      
      if (codAsistencia === "P" || codAsistencia === "PN") {
        semanaData.entrenamiento += 1;
        semanaData.total_asistencias += 1;
      }
    });
  }

  // TRANSFORMAR
  const semanasArray = Array.from(semanasMap.values())
    .map(semana => {
      const esperadoGym = ESPERADO_GYM_SEMANAL;
      const esperadoEntrenamiento = semana.esperado_entrenamiento || 0;
      const totalEsperado = esperadoGym + esperadoEntrenamiento;

      return {
        ...semana,
        esperadoEntrenamiento,
        esperadoGym,
        total_esperado: totalEsperado,

        gymPorcentaje: esperadoGym > 0
          ? Math.round((semana.gym / esperadoGym) * 100)
          : 0,

        entrenamientoPorcentaje: esperadoEntrenamiento > 0
          ? Math.round((semana.entrenamiento / esperadoEntrenamiento) * 100)
          : 0,

        semanaPorcentaje: totalEsperado > 0
          ? Math.round((semana.total_asistencias / totalEsperado) * 100)
          : 0
      };
    })
    .sort((a, b) => a.key.localeCompare(b.key))
    .filter(semana => semana.key !== null && semana.key !== undefined && semana.label !== "Fecha inválida");

  return semanasArray;
}, [dataGimnasio, dataEntrenamiento]);

  // Calcular resumen global
  const resumenGlobal = useMemo(() => {
    if (detalleSemanal.length === 0) return null;

    const totalAsistencias = detalleSemanal.reduce((acc, sem) => acc + sem.total_asistencias, 0);
    const totalEsperado = detalleSemanal.reduce((acc, sem) => acc + sem.total_esperado, 0);
    const porcentajeGlobal = Math.round((totalAsistencias / totalEsperado) * 100);

    return {
      totalAsistencias,
      totalEsperado,
      porcentajeGlobal
    };
  }, [detalleSemanal]);

  if (!codpersona) {
    return <Mensaje>Seleccioná una persona</Mensaje>;
  }

  return (
    <Container>
      <h3>📈 Estadísticas de Asistencia</h3>
      
      {/* Selectores de fecha */}
      <FechasContainer>
        <FechaWrapper>
          <Label>Desde:</Label>
          <FechaInput
            type="date"
            value={fechaInicio}
            onChange={(e) => { setFechaInicio(e.target.value);
              setUserModifiedDates(true);
            }}
            max={fechaFin}
          />
        </FechaWrapper>
        
        <FechaWrapper>
          <Label>Hasta:</Label>
          <FechaInput
            type="date"
            value={fechaFin}
            onChange={(e) => { setFechaFin(e.target.value);
              setUserModifiedDates(true);
            }}
            min={fechaInicio}
            max={new Date().toISOString().split('T')[0]}
          />
        </FechaWrapper>
        
        <ButtonGroup>
          <SemanaButton onClick={setSemanaActual} title="Semana actual">
            <FaCalendarAlt size={14} />
            <span>Semana</span>
          </SemanaButton>
          
          <Button90 onClick={setUltimos90Dias} title="Últimos 90 días">
            90d
          </Button90>
          
          <ActualizarButton onClick={fetchData} disabled={loading}>
            {loading ? "Cargando..." : "Actualizar"}
          </ActualizarButton>
        </ButtonGroup>
      </FechasContainer>

      {error && <ErrorMensaje>{error}</ErrorMensaje>}

      {loading ? (
        <Mensaje>Cargando estadísticas...</Mensaje>
      ) : dataGrafico.length === 0 ? (
        <Mensaje>No hay datos de asistencia para el período seleccionado</Mensaje>
      ) : (
        <>
          {/* Gráfico de líneas */}
          {/* Gráfico de Barras */}
<ChartContainer>
  <ResponsiveContainer width="100%" height={300}>
    <BarChart data={dataGrafico}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis 
        dataKey="fecha"
        tickFormatter={(fecha) => {
          const d = new Date(fecha);
          return `${d.getDate()}/${d.getMonth() + 1}`;
        }}
      />
      <YAxis />
      <Tooltip 
        formatter={(value, name) => {
          if (name === 'gimnasio') return [`${value} asistencias`, '🏋️ Gimnasio'];
          if (name === 'entrenamiento') return [`${value} asistencias`, '⚽ Entrenamiento'];
          return [value, name];
        }}
        labelFormatter={(label) => {
          const d = new Date(label);
          return `Fecha: ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
        }}
      />
      <Legend 
        formatter={(value) => {
          if (value === 'gimnasio') return '🏋️ Gimnasio';
          if (value === 'entrenamiento') return '⚽ Entrenamiento';
          return value;
        }}
      />
      
      <Bar 
        dataKey="gimnasio" 
        fill="#007bff" 
        name="gimnasio"
        radius={[4, 4, 0, 0]}
      />
      <Bar 
        dataKey="entrenamiento" 
        fill="#28a745" 
        name="entrenamiento"
        radius={[4, 4, 0, 0]}
      />
    </BarChart>
  </ResponsiveContainer>
</ChartContainer>

          {/* Calendario de Asistencias */}
          <CalendarioAsistencias
            dataGimnasio={dataGimnasio}
            dataEntrenamiento={dataEntrenamiento}
            fechaInicio={fechaInicio}
            fechaFin={fechaFin}
          />



          {/* ========== DETALLE SEMANAL ========== */}
          <DetalleContainer>
            <DetalleTitle>📋 Detalle Semanal</DetalleTitle>
            
            {detalleSemanal.map((semana, index) => (
              <SemanaCard key={index}>
                <SemanaHeader>
                  Semana: {semana.label}
                </SemanaHeader>
                
                <ActividadRow>
                  <ActividadNombre>🏋️ Gimnasio</ActividadNombre>
                  <ActividadValor>
                    {semana.gym}/{semana.esperadoGym}
                    <PorcentajeBadge porcentaje={semana.gymPorcentaje}>
                      {semana.gymPorcentaje}%
                    </PorcentajeBadge>
                  </ActividadValor>
                </ActividadRow>
                
                <ActividadRow>
                  <ActividadNombre><MdOutlineSportsRugby size={14} />  Entrenamiento</ActividadNombre>
                  <ActividadValor>
                    {semana.entrenamiento}/{semana.esperadoEntrenamiento}
                    <PorcentajeBadge porcentaje={semana.entrenamientoPorcentaje}>
                      {semana.entrenamientoPorcentaje}%
                    </PorcentajeBadge>
                  </ActividadValor>
                </ActividadRow>
                
                <TotalSemanaRow>
                  <span>Total semana:</span>
                  <strong>
                    {semana.total_asistencias}/{semana.total_esperado}
                    <PorcentajeBadge porcentaje={semana.semanaPorcentaje} grande>
                      {semana.semanaPorcentaje}%
                    </PorcentajeBadge>
                  </strong>
                </TotalSemanaRow>
              </SemanaCard>
            ))}

            {/* Resumen Global */}
            {resumenGlobal && (
              <ResumenGlobalCard>
                <h4>📊 Resumen Global</h4>
                <ResumenGlobalRow>
                  <span>Total asistencias:</span>
                  <strong>{resumenGlobal.totalAsistencias}/{resumenGlobal.totalEsperado}</strong>
                </ResumenGlobalRow>
                <ResumenGlobalRow>
                  <span>Porcentaje de cumplimiento:</span>
                  <PorcentajeBadge 
                    porcentaje={resumenGlobal.porcentajeGlobal} 
                    grande
                  >
                    {resumenGlobal.porcentajeGlobal}%
                  </PorcentajeBadge>
                </ResumenGlobalRow>
              </ResumenGlobalCard>
            )}
          </DetalleContainer>
        </>
      )}
    </Container>
  );
};

export default EstadisticasPersona;

/* =========================
   STYLES
   ========================= */

const Container = styled.div`
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin: 20px auto;
  max-width: 900px;
  width: 100%;
  box-shadow: 0 0 10px rgba(0,0,0,0.1);

  @media(max-width: 600px){
    padding: 10px;
  }
`;


const ChartContainer = styled.div`
  width: 100%;
  height: 300px;
  margin-top: 20px;
  
  @media (max-width: 768px) {
    height: 250px;
    
    /* Hacer el gráfico más legible en móvil */
    .recharts-xAxis .recharts-cartesian-axis-tick text {
      font-size: 10px;
    }
    
    .recharts-yAxis .recharts-cartesian-axis-tick text {
      font-size: 10px;
    }
    
    .recharts-legend-item text {
      font-size: 10px;
    }
  }
`;

const ChartContainerOld = styled.div`
  width: 100%;
  height: 350px;
  margin-top: 20px;
`;

const Mensaje = styled.div`
  text-align: center;
  padding: 40px;
  color: #666;
  font-size: 16px;
`;

const ErrorMensaje = styled.div`
  text-align: center;
  padding: 20px;
  color: #dc3545;
  background: #f8d7da;
  border-radius: 8px;
  margin: 10px 0;
  font-size: 14px;
`;

const FechasContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 15px;
  margin: 20px 0;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e0e0e0;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    padding: 12px;
  }
`;

const FechaWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
  flex: 1;
  min-width: 150px;

  @media (max-width: 768px) {
    min-width: auto;
  }
`;

const Label = styled.label`
  font-size: 13px;
  font-weight: 500;
  color: #495057;

  @media (max-width: 768px) {
    font-size: 12px;
  }
`;

const FechaInput = styled.input`
  padding: 10px;
  border-radius: 6px;
  border: 1px solid #ced4da;
  font-size: 14px;
  width: 100%;

  @media (max-width: 768px) {
    padding: 8px;
    font-size: 13px;
  }

  &:focus {
    outline: none;
    border-color: #80bdff;
    box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    width: 100%;
    justify-content: space-between;
  }
`;

const BaseButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-weight: 500;
  font-size: 14px;
  transition: all 0.2s ease;

  @media (max-width: 768px) {
    padding: 8px 12px;
    font-size: 12px;
    flex: 1;
    justify-content: center;
  }

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;
const SemanaButton = styled(BaseButton)`
  background: #6f42c1;
  color: white;

  &:hover:not(:disabled) {
    background: #5a32a3;
  }
`;

const Button90 = styled(BaseButton)`
  background: #fd7e14;
  color: white;

  &:hover:not(:disabled) {
    background: #dc6b0b;
  }
`;

const ActualizarButton = styled(BaseButton)`
  background: #28a745;
  color: white;
  min-width: 100px;
  justify-content: center;

  &:hover:not(:disabled) {
    background: #218838;
  }
`;

const DetalleContainer = styled.div`
  margin-top: 40px;
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

const DetalleTitle = styled.h4`
  font-size: 18px;
  color: #333;
  margin: 0 0 10px 0;
  padding-bottom: 8px;
  border-bottom: 2px solid #e0e0e0;
`;

const SemanaCard = styled.div`
  background: #f8f9fa;
  border-radius: 10px;
  padding: 15px;
  border-left: 4px solid #007bff;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
`;

const SemanaHeader = styled.div`
  font-weight: 700;
  font-size: 16px;
  color: #333;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #dee2e6;
`;

const ActividadRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px dashed #e9ecef;
  
  &:last-of-type {
    border-bottom: none;
  }
`;

const ActividadNombre = styled.span`
  font-weight: 500;
  color: #495057;
`;

const ActividadValor = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 500;
`;

const PorcentajeBadge = styled.span`
  background: ${props => {
    if (props.porcentaje >= 80) return '#28a745';
    if (props.porcentaje >= 60) return '#ffc107';
    return '#dc3545';
  }};
  color: white;
  padding: ${props => props.grande ? '4px 10px' : '2px 8px'};
  border-radius: 20px;
  font-weight: 600;
  font-size: ${props => props.grande ? '14px' : '12px'};
  min-width: ${props => props.grande ? '50px' : '40px'};
  text-align: center;
`;

const TotalSemanaRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 2px solid #dee2e6;
  font-weight: 700;
  color: #333;
`;

const ResumenGlobalCard = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 10px;
  padding: 20px;
  color: white;
  margin-top: 20px;
  
  h4 {
    margin: 0 0 15px 0;
    font-size: 18px;
  }
`;

const ResumenGlobalRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  font-size: 16px;
  
  strong {
    font-size: 18px;
  }
`;