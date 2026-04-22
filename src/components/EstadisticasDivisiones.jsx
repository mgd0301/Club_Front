import React, { useEffect, useState, useMemo } from "react";
import styled from "styled-components";
import axios from "axios";
import { API_BASE_URL } from "../config";
import { localToUTC } from "../utils/helpers";
import  EstadisticasPersona  from "./EstadisticasPersona";

const EstadisticasDivisiones = ({ coddivisiones = [], nombresDivisiones = [], codactividad, fecha_desde, fecha_hasta }) => {
  const [dataGimnasio, setDataGimnasio] = useState([]);
  const [dataEntrenamiento, setDataEntrenamiento] = useState([]);
  const [loading, setLoading] = useState(false);

  const [fechasConsultada, setFechasConsultada] = useState({ desde: fecha_desde, hasta: fecha_hasta });
  const [consultaRealizada, setConsultaRealizada] = useState(false);
  // 🔥 input configurable
  const [esperadoGymSemanal, setEsperadoGymSemanal] = useState(3);
  const [orden, setOrden] = useState("total_desc");


  const [personaExpandida, setPersonaExpandida] = useState(null);  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

useEffect(() => {
  const handleResize = () => setIsMobile(window.innerWidth < 768);
  window.addEventListener("resize", handleResize);
  return () => window.removeEventListener("resize", handleResize);
}, []);



const fetchData = async () => {
  try {
    setLoading(true);

    const config = {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    };

    // 👇 USAR fechasConsultada
    const fechaDesde = localToUTC(fechasConsultada.desde, "00:00:00");
    const fechaHasta = localToUTC(fechasConsultada.hasta, "23:59:59");

    console.log("Ejecutando fetchData con:", {
      coddivisiones,
      fecha_desde: fechaDesde,
      fecha_hasta: fechaHasta,
      codactividad
    });
    
    const [respGym, respEntrenamiento] = await Promise.all([
      axios.post(`${API_BASE_URL}/historial_asistencia_actividades`, {
        codactividad,
        coddivisiones,
        fecha_desde: fechaDesde,
        fecha_hasta: fechaHasta
      }, config),

      axios.post(`${API_BASE_URL}/asistencias_divisiones`, {
        coddivisiones,
        fecha_desde: fechaDesde,
        fecha_hasta: fechaHasta
      }, config)
    ]);

    setDataGimnasio(respGym.data?.detalle || []);
    setDataEntrenamiento(respEntrenamiento.data || []);

  } catch (err) {
    console.error(err);
  } finally {
    setLoading(false);
  }
};



  // Escuchar cuando el padre cambia las fechas (porque se hizo click en consultar)
useEffect(() => {
  if (fecha_desde && fecha_hasta) {
    setFechasConsultada({
      desde: fecha_desde,
      hasta: fecha_hasta
    });
    setConsultaRealizada(true); // 👈 Marcar que se hizo consulta
  }
}, [fecha_desde, fecha_hasta]);

useEffect(() => {
  if (
    coddivisiones.length > 0 &&
    fechasConsultada.desde &&
    fechasConsultada.hasta &&
    codactividad &&
    consultaRealizada
  ) {
    fetchData();
  }
}, [coddivisiones, fechasConsultada, codactividad, consultaRealizada]); // 👈 CAMBIADO

  const semanas = useMemo(() => {
    const d1 = new Date(fecha_desde);
    const d2 = new Date(fecha_hasta);
    return Math.max(1, Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24 * 7)));
  }, [fecha_desde, fecha_hasta]);

  
const jugadores = useMemo(() => {
  const map = {};

  // Entrenamiento
  dataEntrenamiento.forEach(r => {
    const id = r.codpersona;
    if (!map[id]) {
      map[id] = {
        codpersona: id,
        nombre: r.nombre || "",
        total_entrenamiento: 0,
        asistio_entrenamiento: 0,
        gym: 0
      };
    } else if (!map[id].nombre && r.nombre) {
      map[id].nombre = r.nombre;
    }

    map[id].total_entrenamiento++;

    if (r.codigo_asistencia === "P" || r.codigo_asistencia === "PN") {
      map[id].asistio_entrenamiento++;
    }
  });

  // Gimnasio
  dataGimnasio.forEach(r => {
    const id = r.codpersona;
    if (!map[id]) {
      map[id] = {
        codpersona: id,
        nombre: r.nombre || "",
        total_entrenamiento: 0,
        asistio_entrenamiento: 0,
        gym: 0
      };
    } else if (!map[id].nombre && r.nombre) {
      map[id].nombre = r.nombre;
    }
    map[id].gym++;
  });

  return Object.values(map).map(j => {
    const esperadoGym = semanas * esperadoGymSemanal;

    const pctEntrenamiento = j.total_entrenamiento > 0
      ? Math.round((j.asistio_entrenamiento / j.total_entrenamiento) * 100)
      : 0;

    const pctGym = esperadoGym > 0
      ? Math.round((j.gym / esperadoGym) * 100)
      : 0;

    const totalEsperado = j.total_entrenamiento + esperadoGym;
    const totalAsistencias = j.asistio_entrenamiento + j.gym;

    const pctTotal = totalEsperado > 0
      ? Math.round((totalAsistencias / totalEsperado) * 100)
      : 0;

    return {
      ...j,
      pctEntrenamiento,
      pctGym,
      pctTotal
    };
  }).sort((a, b) => b.pctTotal - a.pctTotal);

}, [dataEntrenamiento, dataGimnasio, semanas, esperadoGymSemanal]);


  const jugadoresOrdenados = useMemo(() => {
  const lista = [...jugadores];
  
  switch(orden) {
    case "total_desc":
      return lista.sort((a, b) => b.pctTotal - a.pctTotal);
    case "total_asc":
      return lista.sort((a, b) => a.pctTotal - b.pctTotal);
    case "entrenamiento_desc":
      return lista.sort((a, b) => b.pctEntrenamiento - a.pctEntrenamiento);
    case "entrenamiento_asc":
      return lista.sort((a, b) => a.pctEntrenamiento - b.pctEntrenamiento);
    case "gimnasio_desc":
      return lista.sort((a, b) => b.pctGym - a.pctGym);
    case "gimnasio_asc":
      return lista.sort((a, b) => a.pctGym - b.pctGym);
    default:
      return lista;
  }
}, [jugadores, orden]);




const getColorPorPorcentaje = (porcentaje) => {
  if (porcentaje >= 80) return "#28a745"; // Verde
  if (porcentaje >= 60) return "#ffc107"; // Amarillo
  return "#dc3545"; // Rojo
};


  

  if (loading) return <Msg>Cargando...</Msg>;



  

  return (
  <Container>
    <Header>
      <TituloContainer>
        <h3>📊 Estadísticas de Divisiónes: {nombresDivisiones.join(", ")}</h3>
      </TituloContainer>

      <ControlesContainer>
        <InputGroup>
          <label>Esperados Gimnasio / semana:</label>
          <input
            type="number"
            value={esperadoGymSemanal}
            onChange={(e) => setEsperadoGymSemanal(Number(e.target.value))}
            min={0}
          />
        </InputGroup>

        <SelectOrden value={orden} onChange={(e) => setOrden(e.target.value)}>
          <option value="total_desc">📊 Total ↓</option>
          <option value="total_asc">📊 Total ↑</option>
          <option value="entrenamiento_desc">⚽ Entrenamiento ↓</option>
          <option value="entrenamiento_asc">⚽ Entrenamiento ↑</option>
          <option value="gimnasio_desc">💪 Gimnasio ↓</option>
          <option value="gimnasio_asc">💪 Gimnasio ↑</option>
        </SelectOrden>
      </ControlesContainer>
    </Header>

    {isMobile ? (
      // 📱 MOBILE → CARDS
      <CardList>
        {jugadoresOrdenados.map((j) => (
          <Card
            key={j.codpersona}
            onClick={() =>
              setPersonaExpandida(
                personaExpandida === j.codpersona ? null : j.codpersona
              )
            }
          >
            <CardHeader>
              <span className="nombre" title={j.nombre}>
                {j.nombre}
              </span>

              <PorcentajeBadge color={getColorPorPorcentaje(j.pctTotal)} bold>
                {j.pctTotal}%
              </PorcentajeBadge>
            </CardHeader>

            <ExpandWrapper
              open={personaExpandida === j.codpersona}
            >
              <CardBody>
                <div>⚽ Entrenamiento: {j.pctEntrenamiento}%</div>
                <div>💪 Gimnasio: {j.pctGym}%</div>
                
                

                {(() => {
                  console.log("Enviando a EstadisticasPersona:", {
                    codpersona: j.codpersona,
                    fecha_desde,
                    fecha_hasta
                  });
                  return null;
                })()}

                
                <EstadisticasPersona

                  
                  //key={`${j.codpersona}-${fecha_desde}-${fecha_hasta}`}
                  codpersona={j.codpersona}
                  nombre={j.nombre}
                  fecha_desde={fecha_desde}
                  fecha_hasta={fecha_hasta}
                  codactividad={codactividad}
                  coddivisiones={coddivisiones}
                />
              </CardBody>
            </ExpandWrapper>
          </Card>
        ))}
      </CardList>
    ) : (
      // 🖥 DESKTOP → TABLA
      <TableWrapper>
        <Table>
          <thead>
            <tr>
              <th>Jugador</th>
              <th>Entrenamiento</th>
              <th>Gimnasio</th>
              <th>Total</th>
            </tr>
          </thead>

          <tbody>
            {jugadoresOrdenados.map((j) => (
              <React.Fragment key={j.codpersona}>
                
                {/* FILA */}
                <tr
                  onClick={() =>
                    setPersonaExpandida(
                      personaExpandida === j.codpersona
                        ? null
                        : j.codpersona
                    )
                  }
                  style={{ cursor: "pointer" }}
                >
                  <NombreCelda title={j.nombre}>
                    {j.nombre}
                  </NombreCelda>

                  <td>
                    <div>
                      {j.asistio_entrenamiento}/{j.total_entrenamiento}
                    </div>
                    <PorcentajeColor
                      color={getColorPorPorcentaje(j.pctEntrenamiento)}
                    >
                      {j.pctEntrenamiento}%
                    </PorcentajeColor>
                  </td>

                  <td>
                    <div>
                      {j.gym}/{semanas * esperadoGymSemanal}
                    </div>
                    <PorcentajeColor
                      color={getColorPorPorcentaje(j.pctGym)}
                    >
                      {j.pctGym}%
                    </PorcentajeColor>
                  </td>

                  <td>
                    <PorcentajeBadge
                      color={getColorPorPorcentaje(j.pctTotal)}
                      bold
                    >
                      {j.pctTotal}%
                    </PorcentajeBadge>
                  </td>
                </tr>

                {/* EXPANDIDO */}
                {personaExpandida === j.codpersona && (
                  <tr>
                    <td colSpan="100%" style={{ padding: 0 }}>
                      <ExpandWrapper open={true}>                      
                        <ContenidoExpandido>
                          <MobileResumen>
                            ⚽ {j.pctEntrenamiento}% | 💪 {j.pctGym}%
                          </MobileResumen>

                          <EstadisticasPersona
                          //key={`${j.codpersona}-${fecha_desde}-${fecha_hasta}`}
                            codpersona={j.codpersona}
                            nombre={j.nombre}
                            fecha_desde={fecha_desde}
                            fecha_hasta={fecha_hasta}
                            codactividad={codactividad}
                            coddivisiones={coddivisiones}
                          />
                        </ContenidoExpandido>
                      </ExpandWrapper>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </Table>
      </TableWrapper>
    )}
  </Container>
);
};

export default React.memo(EstadisticasDivisiones);

// ===== STYLES =====

const Container = styled.div`
  background: white;  
  border-radius: 10px;
  max-width: 1000px;
  margin: auto;  
  padding: 10px;
  border-radius: 10px;
  width: 100%;

`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 15px;
  margin-bottom: 20px;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;
const InputGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;

  input {
    width: 60px;
    padding: 5px;
    border-radius: 5px;
    border: 1px solid #ccc;
  }
`;

const TableOld = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 600px; /* Para que no se rompa en mobile */

  th, td {
    padding: 12px 8px;
    text-align: center;
    border-bottom: 1px solid #e5e7eb;
    vertical-align: middle;
  }

  th {
    background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
    font-weight: 600;
    color: #374151;
    font-size: 14px;
  }

  tr:hover {
    background: #f9fafb;
  }

  @media (max-width: 768px) {
    th, td {
      padding: 8px 4px;
      font-size: 12px;
    }
    
    th:nth-child(3), td:nth-child(3) {
      display: table-cell; /* Mostrar gimnasio igual */
    }
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 600px;

  th, td {
    padding: 12px 8px;
    text-align: center;
    border-bottom: 1px solid #e5e7eb;
    vertical-align: middle;
  }

  th {
    background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
    font-weight: 600;
    color: #374151;
    font-size: 14px;
  }

  tr:hover {
    background: #f9fafb;
  }

  /* 👇 ACÁ VA */
  @media (max-width: 768px) {
    th, td {
      padding: 6px 4px;
      font-size: 12px;
    }
  }

  @media (max-width: 768px) {
  th:nth-child(2),
  td:nth-child(2),
  th:nth-child(3),
  td:nth-child(3) {
    display: none;
  }

  th, td {
    padding: 6px 4px;
    font-size: 12px;
  }
}

`;

const Msg = styled.div`
  text-align: center;
  padding: 20px;
`;

const SelectOrden = styled.select`
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid #ced4da;
  background: white;
  cursor: pointer;
  font-size: 14px;
  margin-left: auto;
  
  &:focus {
    outline: none;
    border-color: #80bdff;
  }
`;

const PorcentajeColor = styled.span`
  color: ${props => props.color};
  font-weight: ${props => props.bold ? "bold" : "normal"};
  font-size: ${props => props.bold ? "18px" : "14px"};
`;





















const NombreCelda = styled.td`
  text-align: left !important;
  font-weight: 500;
  padding-left: 10px;
  max-width: 120px;

  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const PorcentajeBadge = styled.span`
  display: inline-block;
  background-color: ${props => props.color};
  color: white;
  font-weight: bold;
  padding: 6px 12px;
  border-radius: 25px;
  font-size: ${props => props.bold ? "16px" : "13px"};
  min-width: 65px;
  text-align: center;
  box-shadow: 0 2px 5px rgba(0,0,0,0.15);
  letter-spacing: 0.5px;
  
  &:hover {
    transform: scale(1.02);
    transition: transform 0.2s;
  }


  

  @media (max-width: 768px) {
    font-size: 12px;
    padding: 4px 8px;
  }
`;

const BotonEstadistica = styled.button`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  color: white;
  font-size: 18px;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 8px;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  
  &:hover {
    transform: scale(1.05);
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
  }
  
  &:active {
    transform: scale(0.95);
  }
`;


const BotónEstadistica = styled.button`
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  padding: 5px 10px;
  border-radius: 8px;
  transition: all 0.2s;
  
  &:hover {
    background: #f0f0f0;
    transform: scale(1.1);
  }
`;




const TableWrapper = styled.div`
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  margin-top: 15px;
  
  @media (max-width: 768px) {
    border-radius: 8px;
  }
`;

const Subtitulo = styled.div`
  font-size: 14px;
  color: #6c757d;
  margin-top: 5px;
  font-weight: normal;
`;

const TituloContainer = styled.div`
  flex: 1;
  
  h3 {
    margin: 0;
    font-size: 18px;
    
    @media (max-width: 768px) {
      font-size: 14px;
    }
  }
`;

const ControlesContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
  
  @media (max-width: 768px) {
    gap: 8px;
  }
`;






const ContenidoExpandidoOld = styled.div`
  background: #f9f9f9;
  padding: 12px;
`;

const MobileResumenOld = styled.div`
  display: none;

  @media (max-width: 768px) {
    display: block;
    font-size: 13px;
    margin-bottom: 8px;
  }
`;





const ContenidoExpandido = styled.div`
  background: #f9f9f9;
  padding: 12px;
`;

const MobileResumen = styled.div`
  display: none;

  @media (max-width: 768px) {
    display: block;
    font-size: 13px;
    margin-bottom: 8px;
  }
`;

const CardList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const Card = styled.div`
  background: white;
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);
  cursor: pointer;
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;

  .nombre {
    max-width: 70%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

const CardBody = styled.div`
  margin-top: 10px;
  font-size: 13px;
`;




const ExpandWrapper = ({ open, children }) => {
  const [height, setHeight] = useState(0);
  const contentRef = React.useRef(null);

  useEffect(() => {
    if (!contentRef.current) return;

    const observer = new ResizeObserver(() => {
      if (open) {
        setHeight(contentRef.current.scrollHeight);
      }
    });

    observer.observe(contentRef.current);

    // set inicial
    if (open) {
      setHeight(contentRef.current.scrollHeight);
    } else {
      setHeight(0);
    }

    return () => observer.disconnect();
  }, [open]);

  return (
    <div
      style={{
        overflow: "hidden",
        transition: "height 0.35s ease",
        height: height
      }}
    >
      <div ref={contentRef}>
        {children}
      </div>
    </div>
  );
};


const ExpandWrapperOld = ({ open, children }) => {
  const [height, setHeight] = useState(0);
  const contentRef = React.useRef(null);

  useEffect(() => {
    if (contentRef.current) {
      setHeight(open ? contentRef.current.scrollHeight : 0);
    }
  }, [open, children]);

  return (
    <div
      style={{
        overflow: "hidden",
        transition: "height 0.35s ease",
        height: height
      }}
    >
      <div ref={contentRef}>
        {children}
      </div>
    </div>
  );
};