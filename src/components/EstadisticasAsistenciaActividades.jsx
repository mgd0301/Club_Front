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

const EstadisticasAsistenciaActividades = ({
  fechaDesde,
  fechaHasta,
  coddivisiones = [], // Array de divisiones
  codactividad,
  esperado = 3 // Valor por defecto
}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mostrarDetalle, setMostrarDetalle] = useState(true);
  const [buscarpersona, setBuscarPersona] = useState("");

  // DEBUG: Ver qué datos estamos recibiendo
  console.log("=== EstadisticasAsistencias ===");
  console.log("fechaDesde:", fechaDesde);
  console.log("fechaHasta:", fechaHasta);
  console.log("coddivisiones:", coddivisiones);
  console.log("codactividad:", codactividad);
  console.log("esperado:", esperado);
  console.log("==============================");

  useEffect(() => {
    // Validar que tengamos todos los datos necesarios
    if (!fechaDesde || !fechaHasta || !codactividad) {
      console.log("Faltan datos para cargar estadísticas");
      if (data) setData(null);
      return;
    }
    
    console.log("Cargando estadísticas...");
    fetchData();
  }, [fechaDesde, fechaHasta, coddivisiones, codactividad, esperado]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const requestBody = {
        codactividad,
        esperado,
        dias: calcularDias(fechaDesde, fechaHasta)
      };
      
      // Solo incluir coddivisiones si tiene al menos un elemento
      if (coddivisiones && coddivisiones.length > 0) {
        requestBody.coddivisiones = coddivisiones;
      }

      console.log("Enviando al backend:", requestBody);

      const resp = await axios.post(
        `${API_BASE_URL}/historial_asistencia_actividades`,
        requestBody,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        }
      );
      
      console.log("Respuesta del servidor:", resp.data);
      setData(resp.data);
      
    } catch (err) {
      console.error("Error cargando estadísticas:", err);
      if (err.response) {
        console.error("Error del servidor:", err.response.data);
      }
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  // Procesar los datos para el ranking por jugador
  const jugadores = useMemo(() => {
    if (!data?.detalle) return [];
    
    const map = {};
    
    data.detalle.forEach(item => {
      const codpersona = item.codpersona;
      
      if (!map[codpersona]) {
        map[codpersona] = {
          codpersona: item.codpersona,
          nombre: item.persona,
          division: item.coddivision,
          total_asistencias: 0,
          total_esperado: 0,
          semanas: [],
          porcentaje: 0
        };
      }
      
      // Acumular por jugador
      map[codpersona].total_asistencias += item.asistencias;
      map[codpersona].total_esperado += item.esperado;
      map[codpersona].semanas.push({
        semana: item.semana,
        asistencias: item.asistencias,
        esperado: item.esperado,
        porcentaje: item['% asistencia']
      });
    });
    
    // Calcular porcentaje global
    Object.values(map).forEach(j => {
      j.porcentaje = j.total_esperado > 0 
        ? Math.round((j.total_asistencias / j.total_esperado) * 100) 
        : 0;
    });
    
    return Object.values(map);
  }, [data]);

  const ranking = useMemo(() => 
    [...jugadores].sort((a, b) => b.porcentaje - a.porcentaje), 
    [jugadores]
  );

  // Calcular promedio de asistencia
  const promedioAsistencia = useMemo(() => {
    if (!jugadores.length) return 0;
    const total = jugadores.reduce((acc, j) => acc + j.porcentaje, 0);
    return Math.round(total / jugadores.length);
  }, [jugadores]);

  // Filtrar jugadores por búsqueda
  const jugadoresFiltrados = useMemo(() => {
    return ranking.filter(j => 
      j.nombre.toLowerCase().includes(buscarpersona.toLowerCase())
    );
  }, [ranking, buscarpersona]);

  if (!fechaDesde || !fechaHasta || !codactividad) {
    return (
      <Container>
        <MensajeAdvertencia>
          ⚠️ Complete los filtros (fecha y actividad) para ver estadísticas
        </MensajeAdvertencia>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <h3>📊 Estadísticas de Asistencia</h3>
        {data && (
          <Subtitle>
            {coddivisiones?.length > 0 
              ? `Mostrando datos para ${coddivisiones.length} división(es) seleccionada(s)`
              : 'Mostrando datos de todas las divisiones'
            }
            {data.parametros_consulta && (
              <span> · Período: {data.parametros_consulta.dias_consultados} días</span>
            )}
          </Subtitle>
        )}
      </Header>

      {loading ? (
        <Loading>Cargando estadísticas...</Loading>
      ) : !data ? (
        <MensajeAdvertencia>
          📭 No hay datos para los filtros seleccionados
        </MensajeAdvertencia>
      ) : (
        <>
          {/* ================= RESUMEN ================= */}
          <Resumen>
            <ResumenItem>
              <span>Jugadores</span>
              <strong>{data.resumen_global?.total_personas || 0}</strong>
            </ResumenItem>
            <ResumenItem>
              <span>Asistencia promedio</span>
              <strong>{promedioAsistencia}%</strong>
            </ResumenItem>
            <ResumenItem>
              <span>Divisiones</span>
              <strong>{coddivisiones?.length || 'Todas'}</strong>
            </ResumenItem>
            <ResumenItem>
              <span>Semanas</span>
              <strong>{data.resumen_global?.total_semanas || 0}</strong>
            </ResumenItem>
          </Resumen>

          {jugadores.length === 0 ? (
            <MensajeAdvertencia>
              📭 No hay jugadores con asistencia en el período seleccionado
            </MensajeAdvertencia>
          ) : (
            <>
              {/* ================= GRAFICO ================= */}
              <SectionTitle>Asistencia Global (%)</SectionTitle>
              <ChartContainer>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={jugadoresFiltrados.slice(0, 20)}>
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
                    {coddivisiones?.length > 0 && <th>División</th>}
                    <th>Total Asistencias</th>
                    <th>Total Esperado</th>
                    {mostrarDetalle && <th>Detalle por Semana</th>}
                    <th>% Asistencia</th>
                  </tr>
                </thead>
                <tbody>
                  {jugadoresFiltrados.map((j, i) => (
                    <tr key={j.codpersona} className={i % 2 === 0 ? "even" : "odd"}>
                      <td style={{fontSize: "16px", fontWeight: "500"}}>
                        {j.nombre}
                      </td>
                      
                      {coddivisiones?.length > 0 && (
                        <td>{j.division || '-'}</td>
                      )}
                      
                      <td>{j.total_asistencias}</td>
                      <td>{j.total_esperado}</td>
                      
                      {mostrarDetalle && (
                        <td>
                          <SemanaDetalle>
                            {j.semanas.map((s, idx) => (
                              <SemanaItem key={idx} title={`${s.semana}: ${s.asistencias}/${s.esperado}`}>
                                <span>{s.semana}</span>
                                <BadgeSmall porcentaje={parseFloat(s.porcentaje)}>
                                  {s.asistencias}/{s.esperado}
                                </BadgeSmall>
                              </SemanaItem>
                            ))}
                          </SemanaDetalle>
                        </td>
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

// Función helper para calcular días entre dos fechas
const calcularDias = (fechaDesde, fechaHasta) => {
  if (!fechaDesde || !fechaHasta) return 90;
  const desde = new Date(fechaDesde);
  const hasta = new Date(fechaHasta);
  const diffTime = Math.abs(hasta - desde);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays || 90; // Si es 0, devolver 90 por defecto
};

export default EstadisticasAsistenciaActividades;

/* ======================================================
   Styles
====================================================== */

const Container = styled.div`
  background: white;
  border-radius: 14px;
  padding: 20px;
  margin: 20px auto;
  max-width: 1200px;
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
  
  span {
    display: block;
    margin-top: 4px;
    font-size: 12px;
    color: #888;
  }
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
  margin: 20px 0 10px;
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
    padding: 12px 10px;
    border-bottom: 1px solid #eee;
    text-align: center;
    vertical-align: middle;
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
      padding: 8px 4px;
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

const BadgeSmall = styled.span`
  background: ${props => {
    const valor = parseFloat(props.porcentaje) || 0;
    if (valor >= 80) return '#28a745';
    if (valor >= 60) return '#ffc107';
    return '#dc3545';
  }};
  color: white;
  padding: 3px 8px;
  border-radius: 12px;
  font-weight: 500;
  font-size: 11px;
  display: inline-block;
  white-space: nowrap;
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

const SemanaDetalle = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 150px;
  overflow-y: auto;
  padding: 4px;
`;

const SemanaItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 4px;
  background: #f5f5f5;
  border-radius: 4px;
  font-size: 10px;
  
  span {
    font-weight: 600;
    color: #555;
  }
`;