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
  coddivisiones  // ← CAMBIADO: de coddivision a coddivisiones (plural)
}) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mostrarDetalle, setMostrarDetalle] = useState(true);
  const [buscarpersona, setBuscarPersona] = useState("");

  // DEBUG: Ver qué datos estamos recibiendo
  console.log("=== EstadisticasAsistencias ===");
  console.log("fechaDesde:", fechaDesde);
  console.log("fechaHasta:", fechaHasta);
  console.log("coddivisiones:", coddivisiones);
  console.log("Es array?", Array.isArray(coddivisiones));
  console.log("Cantidad:", coddivisiones?.length || 0);
  console.log("==============================");

  useEffect(() => {
    // Validar que tengamos todos los datos necesarios
    if (!fechaDesde || !fechaHasta || !coddivisiones || coddivisiones.length === 0) {
      console.log("Faltan datos para cargar estadísticas");
      if (rows.length > 0) setRows([]); // Limpiar datos si antes había
      return;
    }
    
    console.log("Cargando estadísticas para divisiones:", coddivisiones);
    fetchData();
  }, [fechaDesde, fechaHasta, coddivisiones]);

  const fetchData = async () => {
    try {
      // Validación adicional
      if (!coddivisiones || coddivisiones.length === 0) {
        console.log("Debe seleccionar al menos una división");
        setRows([]);
        return;
      }

      setLoading(true);
      console.log("Enviando al backend:", {
        fecha_desde: fechaDesde.replaceAll("-", "") + "000000",
        fecha_hasta: fechaHasta.replaceAll("-", "") + "235959",
        coddivisiones: coddivisiones  // ← array completo, no solo el primero
      });

      const resp = await axios.post(
        `${API_BASE_URL}/asistencias_divisiones`,
        {
          fecha_desde: fechaDesde.replaceAll("-", "") + "000000",
          fecha_hasta: fechaHasta.replaceAll("-", "") + "235959",
          coddivisiones: coddivisiones  // ← ENVIAMOS EL ARRAY COMPLETO
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        }
      );
      
      console.log("Estadísticas recibidas. Registros:", resp.data?.length || 0);
      setRows(resp.data || []);
      
    } catch (err) {
      console.error("Error cargando estadísticas:", err);
      if (err.response) {
        console.error("Error del servidor:", err.response.data);
      }
      setRows([]); // Limpiar en caso de error
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
      {coddivisiones && coddivisiones.length > 0 && (
        <Subtitle>
          Mostrando datos para {coddivisiones.length} división(es) seleccionada(s)
        </Subtitle>
      )}
    </Header>

    {!coddivisiones || coddivisiones.length === 0 ? (
      <MensajeAdvertencia>
        ⚠️ Selecciona al menos una división para ver estadísticas
      </MensajeAdvertencia>
    ) : loading ? (
      <Loading>Cargando estadísticas...</Loading>
    ) : (
      <>
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
          <ResumenItem>
            <span>Divisiones</span>
            <strong>{coddivisiones.length}</strong>
          </ResumenItem>
        </Resumen>

        {jugadores.length === 0 ? (
          <MensajeAdvertencia>
            📭 No hay datos de asistencia para las fechas y divisiones seleccionadas
          </MensajeAdvertencia>
        ) : (
          <>
            {/* ================= GRAFICO ================= */}
            <SectionTitle>Asistencia (%)</SectionTitle>
            <ChartContainer>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={jugadores.slice(0, 20)}> {/* Mostrar solo primeros 20 para mejor visualización */}
                  <XAxis 
                    dataKey="nombre" 
                    tick={{ fontSize: 12 }} 
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis domain={[0, 100]} />
                  <Tooltip 
                    formatter={(value) => [`${value}%`, 'Asistencia']}
                    labelFormatter={(label) => `Jugador: ${label}`}
                  />
                  <Bar dataKey="porcentaje" fill="#28a745" name="Asistencia %" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>

            {/* ================= RANKING ================= */}
            <SectionHeader>
              <SectionTitle>🏆 Detalle por Jugador ({jugadores.length})</SectionTitle>

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
                      <th>Total</th>
                    </>
                  )}
                  <th>% Asistencia</th>
                </tr>
              </thead>
              <tbody>
                {ranking
                  .filter(j => j.nombre.toLowerCase().includes(buscarpersona.toLowerCase()))            
                  .map((j, i) => (
                    <tr key={j.codpersona} className={i % 2 === 0 ? "even" : "odd"}>
                      <td style={{alignContent: "initial", fontSize: "16px", fontWeight: "500"}}>
                        {j.nombre}
                      </td>
                      
                      {mostrarDetalle && (
                        <>
                          <td>{j.P || 0}</td>
                          <td>{j.PN || 0}</td>
                          <td>{j.A || 0}</td>
                          <td>{j.AA || 0}</td>
                          <td>{j.I || 0}</td>
                          <td><strong>{j.total || 0}</strong></td>
                        </>
                      )}
                      <td>
                        <Badge porcentaje={j.porcentaje}>{j.porcentaje}%</Badge>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </RankingTable>
          </>
        )}
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
    if (map[r.codpersona][code] !== undefined) {
      map[r.codpersona][code]++;
    }
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
  text-align: center;
`;

const Subtitle = styled.div`
  font-size: 14px;
  color: #666;
  margin-top: 5px;
  font-weight: normal;
`;

const Loading = styled.div`
  padding: 50px;
  text-align: center;
  color: #666;
  font-size: 16px;
`;

const MensajeAdvertencia = styled.div`
  padding: 20px;
  text-align: center;
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 8px;
  color: #856404;
  margin: 20px 0;
  font-size: 15px;
`;

const Resumen = styled.div`
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  margin-bottom: 20px;
  justify-content: center;
`;

const ResumenItem = styled.div`
  flex: 1;
  min-width: 140px;
  background: #f8f9fa;
  border-radius: 10px;
  padding: 16px;
  text-align: center;

  span { 
    display: block; 
    font-size: 14px; 
    color: #666; 
    margin-bottom: 8px;
  }
  
  strong { 
    font-size: 26px; 
    color: #333;
  }
`;

const SectionTitle = styled.h4`
  margin: 0;
  font-size: 18px;
  color: #333;
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin: 25px 0 15px 0;
  flex-wrap: wrap;
`;

const ChartContainer = styled.div`
  padding: 0 0 20px;
  height: 300px;
`;

const RankingTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;

  th, td {
    padding: 8px 10px;
    border-bottom: 1px solid #eee;
    text-align: center;
  }

  th {
    background: #f8f9fa;
    font-size: 13px;
    font-weight: 600;
    color: #555;
    white-space: nowrap;
  }

  td {
    font-size: 14px;
  }

  tbody tr:nth-child(even) {
    background: #f9f9f9;
  }

  tbody tr:nth-child(odd) {
    background: #fff;
  }

  tbody tr:hover {
    background: #f0f8ff;
  }

  @media(max-width: 600px){
    th, td {
      font-size: 11px;
      padding: 6px 8px;
    }
  }
`;

const Badge = styled.span`
  background: ${props => {
    if (props.porcentaje >= 80) return '#28a745';
    if (props.porcentaje >= 60) return '#ffc107';
    return '#dc3545';
  }};
  color: white;
  padding: 6px 12px;
  border-radius: 20px;
  font-weight: 600;
  font-size: 14px;
  display: inline-block;
  min-width: 60px;
`;

const SearchInput = styled.input`
  width: 200px;
  padding: 8px 12px;
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
  
  @media(max-width: 600px){
    width: 150px;
  }
`;