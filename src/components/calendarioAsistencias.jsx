import React, { useMemo } from "react";
import styled from "styled-components";
import { UTCToLocal } from "../utils/helpers";

const CalendarioAsistencias = ({ dataGimnasio, dataEntrenamiento, fechaInicio, fechaFin }) => {
  
  const formatFechaDDMMYY = (date) => {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = String(date.getFullYear()).slice(-2);
    return `${d}/${m}/${y}`;
  };

  // Convertir UTC a YYYY-MM-DD local
  const getLocalDateKey = (fechaUTC) => {
    if (!fechaUTC) return null;
    const fechaLocalStr = UTCToLocal(fechaUTC, 'date');
    if (!fechaLocalStr) return null;
    const [dia, mes, anio] = fechaLocalStr.split('/');
    return `${anio}-${mes}-${dia}`;
  };

  const diasCalendario = useMemo(() => {
    // 🔥 Generar días correctamente en LOCAL
    const start = new Date(fechaInicio + 'T00:00:00');
    const end = new Date(fechaFin + 'T00:00:00');
    const dias = [];
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const año = d.getFullYear();
      const mes = String(d.getMonth() + 1).padStart(2, '0');
      const dia = String(d.getDate()).padStart(2, '0');
      const fechaKey = `${año}-${mes}-${dia}`;
      
      dias.push({
        fecha: fechaKey,
        dia: d.getDate(),
        mes: d.getMonth() + 1,
        anio: año,
        asistioGym: false,
        tieneEntrenamiento: false,
        asistioEntrenamiento: false
      });
    }
    
    // MAP DE GIMNASIO
    if (Array.isArray(dataGimnasio)) {
      dataGimnasio.forEach(item => {
        const fechaLocalKey = getLocalDateKey(item.fecha);
        if (fechaLocalKey) {
          const diaEncontrado = dias.find(d => d.fecha === fechaLocalKey);
          if (diaEncontrado) {
            diaEncontrado.asistioGym = true;
           // console.log("🏋️ Gym asignado a:", fechaLocalKey);
          }
        }
      });
    }
    
    // MAP DE ENTRENAMIENTO
    if (Array.isArray(dataEntrenamiento)) {
      dataEntrenamiento.forEach(item => {
        const fechaLocalKey = getLocalDateKey(item.fecha);
        if (fechaLocalKey) {
          const diaEncontrado = dias.find(d => d.fecha === fechaLocalKey);
          if (diaEncontrado) {
            const cod = item.codigo_asistencia;
            diaEncontrado.tieneEntrenamiento = true;
            diaEncontrado.asistioEntrenamiento = cod === "P" || cod === "PN";
            diaEncontrado.codigoEntrenamiento = cod;
           // console.log("⚽ Entreno asignado a:", fechaLocalKey, "asistió:", diaEncontrado.asistioEntrenamiento);
          }
        }
      });
    }
    
    return dias;
  }, [dataGimnasio, dataEntrenamiento, fechaInicio, fechaFin]);
  
  // Agrupar por semana
  const semanas = useMemo(() => {
    const semanasMap = new Map();
    
    diasCalendario.forEach(dia => {
      const fecha = new Date(dia.fecha + 'T00:00:00');
      const diaSemana = fecha.getDay();
      const diff = fecha.getDate() - diaSemana + (diaSemana === 0 ? -6 : 1);
      const lunes = new Date(fecha);
      lunes.setDate(diff);
      const semanaKey = `${lunes.getFullYear()}-${String(lunes.getMonth() + 1).padStart(2, '0')}-${String(lunes.getDate()).padStart(2, '0')}`;
      
      if (!semanasMap.has(semanaKey)) {
        const domingo = new Date(lunes);
        domingo.setDate(lunes.getDate() + 6);
        semanasMap.set(semanaKey, {
          key: semanaKey,
          label: `${formatFechaDDMMYY(lunes)}-${formatFechaDDMMYY(domingo)}`,
          dias: []
        });
      }
      
      semanasMap.get(semanaKey).dias.push(dia);
    });
    
    return Array.from(semanasMap.values());
  }, [diasCalendario]);
  
  return (
    <CalendarioContainer>
      <h4>📅 Calendario de Asistencias</h4>
      
      <DiasHeader>
        <SemanaLabel>Semana</SemanaLabel>
        <DiasGrid>
          <DiaNombre>Lun</DiaNombre>
          <DiaNombre>Mar</DiaNombre>
          <DiaNombre>Mié</DiaNombre>
          <DiaNombre>Jue</DiaNombre>
          <DiaNombre>Vie</DiaNombre>
          <DiaNombre>Sáb</DiaNombre>
          <DiaNombre>Dom</DiaNombre>
        </DiasGrid>
      </DiasHeader>
      
      {semanas.map((semana, idx) => (
        <SemanaRow key={idx}>
          <SemanaLabel>{semana.label}</SemanaLabel>
          <DiasGrid>
            {semana.dias.map((dia, i) => (
              <DiaCell key={i}>
                <DiaNumero>{dia.dia}</DiaNumero>
                <IndicadoresContainer>
                  {dia.asistioGym && (
                    <GymIndicador title="Asistió a Gimnasio">🔵</GymIndicador>
                  )}
                  {dia.tieneEntrenamiento && (
                    dia.asistioEntrenamiento ? (
                      <EntrenoIndicador presente title="Asistió a Entrenamiento">🟢</EntrenoIndicador>
                    ) : (
                      <EntrenoIndicador ausente title="No asistió a Entrenamiento">🔴</EntrenoIndicador>
                    )
                  )}
                  {!dia.asistioGym && !dia.tieneEntrenamiento && (
                    <SinEvento title="Sin actividad">⚪</SinEvento>
                  )}
                </IndicadoresContainer>
              </DiaCell>
            ))}
          </DiasGrid>
        </SemanaRow>
      ))}
      
      <Leyenda>
        <LeyendaItem><LeyendaColor>🔵</LeyendaColor><span>Gimnasio</span></LeyendaItem>
        <LeyendaItem><LeyendaColor>🟢</LeyendaColor><span>Entrenamiento (presente)</span></LeyendaItem>
        <LeyendaItem><LeyendaColor>🔴</LeyendaColor><span>Entrenamiento (ausente)</span></LeyendaItem>
        <LeyendaItem><LeyendaColor>⚪</LeyendaColor><span>Sin actividad</span></LeyendaItem>
      </Leyenda>
    </CalendarioContainer>
  );
};

// ========== ESTILOS (iguales) ==========


const DiasHeader = styled.div`
  display: flex;
  margin-bottom: 15px;
  font-weight: 600;
`;

const SemanaRow = styled.div`
  display: flex;
  margin-bottom: 15px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;



const CalendarioContainer = styled.div`
  margin-top: 30px;
  padding: 15px;
  background: white;
  border-radius: 12px;
  border: 1px solid #e0e0e0;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch; /* Scroll suave en iOS */
  
  /* Indicador visual de que se puede desplazar */
  @media (max-width: 768px) {
    &::after {
      content: '← deslizar →';
      display: block;
      text-align: center;
      font-size: 10px;
      color: #999;
      margin-top: 8px;
    }
  }
`;

const SemanaLabel = styled.div`
  width: 85px;
  font-size: 10px;
  color: #666;
  display: flex;
  align-items: center;
  padding-right: 8px;
  
  @media (max-width: 768px) {
    width: 70px;
    font-size: 8px;
    padding-right: 5px;
  }
`;

const DiasGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  flex: 1;
  
  @media (max-width: 768px) {
    gap: 2px;
  }
`;

const DiaNombre = styled.div`
  text-align: center;
  font-size: 11px;
  font-weight: 600;
  color: #666;
  padding: 4px;
  
  @media (max-width: 768px) {
    font-size: 9px;
    padding: 2px;
  }
`;

const DiaCell = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 6px 2px;
  background: #f8f9fa;
  border-radius: 8px;
  transition: all 0.2s;
  
  @media (max-width: 768px) {
    padding: 4px 2px;
    gap: 2px;
    border-radius: 4px;
  }
  
  &:hover {
    background: #e9ecef;
    transform: translateY(-2px);
  }
`;

const DiaNumero = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: #333;
  
  @media (max-width: 768px) {
    font-size: 10px;
  }
`;

const IndicadoresContainer = styled.div`
  display: flex;
  gap: 3px;
  justify-content: center;
  flex-wrap: wrap;
  min-height: 24px;
  
  @media (max-width: 768px) {
    gap: 2px;
    min-height: 20px;
  }
`;

const GymIndicador = styled.div`
  font-size: 12px;
  cursor: pointer;
  transition: transform 0.2s;
  
  @media (max-width: 768px) {
    font-size: 10px;
  }
  
  &:hover {
    transform: scale(1.2);
  }
`;

const EntrenoIndicador = styled.div`
  font-size: 12px;
  cursor: pointer;
  transition: transform 0.2s;
  
  @media (max-width: 768px) {
    font-size: 10px;
  }
  
  &:hover {
    transform: scale(1.2);
  }
`;

const SinEvento = styled.div`
  font-size: 12px;
  color: #adb5bd;
  opacity: 0.5;
  
  @media (max-width: 768px) {
    font-size: 10px;
  }
`;

const Leyenda = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin-top: 15px;
  padding-top: 12px;
  border-top: 1px solid #e0e0e0;
  justify-content: center;
  
  @media (max-width: 768px) {
    gap: 10px;
  }
`;

const LeyendaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: #666;
  
  @media (max-width: 768px) {
    font-size: 9px;
    gap: 3px;
  }
`;

const LeyendaColor = styled.span`
  font-size: 12px;
  
  @media (max-width: 768px) {
    font-size: 10px;
  }
`;

export default CalendarioAsistencias;