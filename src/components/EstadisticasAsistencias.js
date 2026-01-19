import React, { useEffect, useState, useMemo } from "react";
import styled from "styled-components";
import axios from "axios";
import { PiEyeClosed, PiEyeBold } from "react-icons/pi";
import { API_BASE_URL } from "../config";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts";

const EstadisticasAsistencias = ({
  fechaDesde,
  fechaHasta,
  coddivision
}) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mostrarDetalle, setMostrarDetalle] = useState(true);
  const [buscarpersona, setBuscarPersona] = useState("");

  useEffect(() => {
    if (!fechaDesde || !fechaHasta) return;
    fetchData();
  }, [fechaDesde, fechaHasta, coddivision]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const resp = await axios.post(
        `${API_BASE_URL}/asistencias_divisiones`,
        {
          fecha_desde: fechaDesde.replaceAll("-", "") + "000000",
          fecha_hasta: fechaHasta.replaceAll("-", "") + "235959",
          coddivisiones: coddivision ? [coddivision] : []
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        }
      );
      setRows(resp.data);
    } catch (err) {
      console.error("Error estadísticas:", err);
    } finally {
      setLoading(false);
    }
  };

  const jugadores = useMemo(() => agruparPorJugador(rows), [rows]);

  const ranking = useMemo(() => [...jugadores].sort((a, b) => b.porcentaje - a.porcentaje), [jugadores]);

 return (
  <Container>
    <Header>
      <h3>📊 Estadísticas de Asistencia</h3>
    </Header>

    {loading ? (
      <Loading>Cargando estadísticas...</Loading>
    ) : (
      <>
        {/* ================= BOTÓN PARA MOSTRAR/OCULTAR DETALLE ================= */}
       

        {/* ================= RESUMEN ================= */}
        <Resumen>
          <ResumenItem>
            <span>Jugadores</span>
            <strong>{jugadores.length}</strong>
          </ResumenItem>
          <ResumenItem>
            <span>Asistencia promedio</span>
            <strong>{promedioAsistencia(jugadores)}%</strong>
          </ResumenItem>
        </Resumen>

        {/* ================= GRAFICO ================= */}
        <SectionTitle>Asistencia (%)</SectionTitle>
        <ChartContainer>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={jugadores}>
              <XAxis dataKey="nombre" tick={{ fontSize: 12 }} interval={0} />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="porcentaje" fill="#28a745" />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* ================= RANKING ================= */}
        {/* Contenedor del título + botón */}
           {/* Contenedor del título + botón */}
<SectionHeader>
  <SectionTitle>🏆 Detalle por Jugador</SectionTitle>

  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
    {/* Botón de ojo para mostrar/ocultar detalle */}
    <button
      onClick={() => setMostrarDetalle(prev => !prev)}
      style={{
        padding: "6px 10px",
        borderRadius: "6px",
        border: "1px solid #ccc",
        background: "#f0f0f0",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      {mostrarDetalle ? <PiEyeBold size={20} /> : <PiEyeClosed size={20} />}
    </button>

    {/* Input para filtrar jugador */}
    <SearchInput
      type="text"
      placeholder="Filtrar jugador..."
      value={buscarpersona}
      onChange={e => setBuscarPersona(e.target.value)}
    />
  </div>
</SectionHeader>



        <RankingTable>
          <thead>
            <tr>
              <th>Jugador</th>
              
              {mostrarDetalle && (
                <>
                  <th title="PRESENTE">P</th>
                  <th title="PRESENTE NO ENTRENA">PN</th>
                  <th title="AUSENTE">A</th>
                  <th title="AUSENTE CON AVISO">AA</th>
                  <th title="DESCONOCIDO">I</th>
                </>
              )}
              <th>% Asistencia</th>
            </tr>
          </thead>
          <tbody>
            {ranking.filter(j => j.nombre.toLowerCase().includes(buscarpersona.toLowerCase()))            
            .map((j, i) => (
              <tr key={j.codpersona} className={i % 2 === 0 ? "even" : "odd"}>
                <td style={{alignContent: "initial", fontSize: "16px", fontWeight: "500"}} >{j.nombre}</td>
                
                {mostrarDetalle && (
                  <>
                    <td>{j.P || 0}</td>
                    <td>{j.PN || 0}</td>
                    <td>{j.A || 0}</td>
                    <td>{j.AA || 0}</td>
                    <td>{j.I || 0}</td>
                  </>
                )}
                <td>
                  <Badge>{j.porcentaje}%</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </RankingTable>
      </>
    )}
  </Container>
);

};

export default EstadisticasAsistencias;

/* ======================================================
   Utils
====================================================== */
const agruparPorJugador = (rows) => {
  const map = {};

  rows.forEach(r => {
    const code = r.codigo_asistencia || 'I'; // Si no hay código, lo consideramos 'Desconocido'

    if (!map[r.codpersona]) {
      map[r.codpersona] = {
        codpersona: r.codpersona,
        nombre: r.apodo || r.nombre,
        P: 0,
        PN: 0,
        A: 0,
        AA: 0,
        I: 0,
        total: 0,
        porcentaje: 0
      };
    }

    // Incrementamos el contador del tipo de asistencia
    map[r.codpersona][code]++;
    // Incrementamos el total de registros de este jugador
    map[r.codpersona].total++;
  });

  // Calculamos el porcentaje de asistencia P sobre el total de registros del jugador
  Object.values(map).forEach(j => {
    j.porcentaje = j.total ? Math.round((j.P / j.total) * 100) : 0;
  });

  return Object.values(map);
};


const promedioAsistencia = (jugadores) => {
  if (!jugadores.length) return 0;
  const total = jugadores.reduce((acc, j) => acc + j.porcentaje, 0);
  return Math.round(total / jugadores.length);
};

/* ======================================================
   Styles
====================================================== */

const Container = styled.div`
  background: white;
  border-radius: 14px;
  padding: 20px;
  margin: 20px auto;
  max-width: 1000px;
  width: 95%;
  box-shadow: 0 0 12px rgba(0,0,0,0.15);

  @media(max-width: 600px){
    padding: 10px;
  }
`;

const Header = styled.div`
  margin-bottom: 16px;
`;

const Loading = styled.div`
  padding: 50px;
  text-align: center;
`;

const Resumen = styled.div`
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  margin-bottom: 20px;
`;

const ResumenItem = styled.div`
  flex: 1;
  min-width: 140px;
  background: #f8f9fa;
  border-radius: 10px;
  padding: 16px;
  text-align: center;

  span { display: block; font-size: 14px; color: #666; }
  strong { font-size: 26px; }
`;

const SectionTitle = styled.h4`
  margin: 0;
  font-size: 18px;
`;


const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px; /* Espacio entre título y botón */
  margin: 20px 20px 10px 20px; 
  flex-wrap: wrap; /* Permite que el botón baje en pantallas muy chicas */
`;



const ChartContainer = styled.div`
  padding: 0 0 20px;
`;
const RankingTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;

  th, td {
    padding: 6px 8px;
    border-bottom: 1px solid #eee;
    text-align: center;
    white-space: nowrap;
  }

  th {
    background: #f8f9fa;
    font-size: 12px;
  }

  td {
    font-size: 12px;
  }

  tbody tr:nth-child(even) {
    background: #f9f9f9;
  }

  tbody tr:nth-child(odd) {
    background: #fff;
  }

  @media(max-width: 600px){
    th, td {
      font-size: 10px;
      padding: 4px 6px;
    }
  }
`;



const Badge = styled.span`
  background: #28a745;
  color: white;
  padding: 4px 10px;
  border-radius: 20px;
  font-weight: 600;
`;


const SearchInput = styled.input`
  width: 45%;
  padding: 10px 10px 10px 36px;
  border-radius: 6px;
  border: 1px solid #ced4da;
  font-size: 14px;
  transition: all 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: #80bdff;
    box-shadow: 0 0 0 0.2rem rgba(0,123,255,0.25);
  }
  
  &::placeholder {
    color: #6c757d;
  }
`;