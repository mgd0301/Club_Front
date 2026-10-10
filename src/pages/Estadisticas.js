import React, { useState, useMemo, useContext, useEffect, useCallback } from "react";
import styled from "styled-components";
import EstadisticasDivisiones from "../components/EstadisticasDivisiones";
import { AuthContext } from "../contexts/AuthContext";
import { API_BASE_URL } from "../config";

const Estadisticas = (props) => {
  const { currentClub } = useContext(AuthContext);
  const [vista, setVista] = useState("division");

  const [grupos, setGrupos] = useState([]);
  const [codgrupoSeleccionado, setCodgrupoSeleccionado] = useState("");
  const [miembrosGrupo, setMiembrosGrupo] = useState([]);
  const [cargandoMiembrosGrupo, setCargandoMiembrosGrupo] = useState(false);

  const token = localStorage.getItem("token");

  const cargarGrupos = useCallback(async () => {
    if (!currentClub?.codclub) return;
    try {
      const res = await fetch(`${API_BASE_URL}/grupos_listar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ codclub: currentClub.codclub })
      });
      const data = await res.json();
      setGrupos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error cargando grupos:", err);
    }
  }, [currentClub, token]);

  useEffect(() => {
    if (vista === "grupo") {
      cargarGrupos();
    }
  }, [vista, cargarGrupos]);

  useEffect(() => {
    if (!codgrupoSeleccionado) {
      setMiembrosGrupo([]);
      return;
    }

    const cargarMiembros = async () => {
      setCargandoMiembrosGrupo(true);
      try {
        const res = await fetch(`${API_BASE_URL}/grupo_personas_listar`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ codgrupo: codgrupoSeleccionado })
        });
        const data = await res.json();
        setMiembrosGrupo(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error cargando integrantes del grupo:", err);
      } finally {
        setCargandoMiembrosGrupo(false);
      }
    };

    cargarMiembros();
  }, [codgrupoSeleccionado, token]);

  const codpersonasGrupo = useMemo(
    () => miembrosGrupo.map((m) => m.codpersona),
    [miembrosGrupo]
  );

  const nombreGrupoSeleccionado = useMemo(() => {
    const g = grupos.find((g) => String(g.codgrupo) === String(codgrupoSeleccionado));
    return g?.descripcion || "";
  }, [grupos, codgrupoSeleccionado]);

  const getFechaDefaultDesde = () => {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - 7);
    return fecha.toISOString().split("T")[0];
  }

  const getFechaDefaultHasta = () => {
    return new Date().toISOString().split("T")[0];
  }

  const [fechaDesde, setFechaDesde] = useState(getFechaDefaultDesde());
  const [fechaHasta, setFechaHasta] = useState(getFechaDefaultHasta());
  const [fechasConsultadas, setFechasConsultadas] = useState({ 
    desde: getFechaDefaultDesde(), 
    hasta: getFechaDefaultHasta() 
  });

  // 👇 MEMOIZAR las props que cambian
  const divisionesMemo = useMemo(() => 
    props.divisionesSeleccionadas?.map(d => d.coddivision) || [], 
    [props.divisionesSeleccionadas]
  );

  const nombresMemo = useMemo(() => 
    props.divisionesSeleccionadas?.map(d => d.descripcion) || [], 
    [props.divisionesSeleccionadas]
  );

  const handleConsultar = () => {
    setFechasConsultadas({
      desde: fechaDesde,
      hasta: fechaHasta
    });
  };

  return (
    <Container>
      <Header>
        <h2>📊 Estadísticas</h2>
      </Header>

      <FiltrosContainer>
        <InputGroup>
          <label>Fecha desde:</label>
          <input 
            type="date" 
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
          />
        </InputGroup>
        
        <InputGroup>
          <label>Fecha hasta:</label>
          <input 
            type="date" 
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
          />
        </InputGroup>
        
        <ButtonConsultar onClick={handleConsultar}>
          🔍 Consultar
        </ButtonConsultar>
      </FiltrosContainer>

      <Tabs>
        <Tab active={vista === "division"} onClick={() => setVista("division")}>
          División
        </Tab>
        <Tab active={vista === "persona"} onClick={() => setVista("persona")}>
          Persona
        </Tab>
        <Tab active={vista === "grupo"} onClick={() => setVista("grupo")}>
          Grupo
        </Tab>
      </Tabs>

      <Content>
        {vista === "division" && (
          <EstadisticasDivisiones
            coddivisiones={divisionesMemo}
            nombresDivisiones={nombresMemo}
            codactividad={props.codactividad}
            fecha_desde={fechasConsultadas.desde}
            fecha_hasta={fechasConsultadas.hasta}
          />
        )}

        {vista === "grupo" && (
          <>
            <SelectorGrupo>
              <label>Elegí un grupo:</label>
              <select
                value={codgrupoSeleccionado}
                onChange={(e) => setCodgrupoSeleccionado(e.target.value)}
              >
                <option value="">Seleccionar...</option>
                {grupos.map((g) => (
                  <option key={g.codgrupo} value={g.codgrupo}>
                    {g.descripcion} ({g.cantidad_personas})
                  </option>
                ))}
              </select>
            </SelectorGrupo>

            {!codgrupoSeleccionado && (
              <MensajeVacio>Seleccioná un grupo para ver sus estadísticas.</MensajeVacio>
            )}

            {codgrupoSeleccionado && cargandoMiembrosGrupo && (
              <MensajeVacio>Cargando integrantes...</MensajeVacio>
            )}

            {codgrupoSeleccionado && !cargandoMiembrosGrupo && codpersonasGrupo.length === 0 && (
              <MensajeVacio>Este grupo no tiene integrantes.</MensajeVacio>
            )}

            {codgrupoSeleccionado && !cargandoMiembrosGrupo && codpersonasGrupo.length > 0 && (
              <EstadisticasDivisiones
                codpersonas={codpersonasGrupo}
                integrantesGrupo={miembrosGrupo}
                tituloGrupo={nombreGrupoSeleccionado}
                codactividad={props.codactividad}
                fecha_desde={fechasConsultadas.desde}
                fecha_hasta={fechasConsultadas.hasta}
              />
            )}
          </>
        )}
      </Content>
    </Container>
  );
};

export default Estadisticas;

// ===== STYLES =====

const Container = styled.div`
  max-width: 1100px;
  margin: auto;
  padding: 10px;
`;

const Header = styled.div`
  margin-bottom: 10px;
`;

const FiltrosContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
`;

const InputGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  
  label {
    font-weight: 500;
    color: #333;
  }
  
  input {
    padding: 8px 12px;
    border-radius: 6px;
    border: 1px solid #ced4da;
    font-size: 14px;
    
    &:focus {
      outline: none;
      border-color: #80bdff;
      box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
    }
  }
`;

const ButtonConsultar = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 20px;
  background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const Tabs = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  border-bottom: 2px solid #e9ecef;
`;

const Tab = styled.button`
  padding: 10px 20px;
  border: none;
  background: none;
  cursor: pointer;
  font-weight: ${({ active }) => (active ? "600" : "400")};
  color: ${({ active }) => (active ? "#007bff" : "#6c757d")};
  border-bottom: ${({ active }) => (active ? "2px solid #007bff" : "none")};
  transition: all 0.2s ease;
  
  &:hover {
    color: #007bff;
  }
`;

const Content = styled.div`
  background: #fff;
  padding: 10px;
  border-radius: 10px;
`;

const SelectorGrupo = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;

  label {
    font-weight: 500;
    color: #333;
  }

  select {
    padding: 8px 12px;
    border-radius: 6px;
    border: 1px solid #ced4da;
    font-size: 14px;
    min-width: 220px;

    &:focus {
      outline: none;
      border-color: #80bdff;
      box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
    }
  }
`;

const MensajeVacio = styled.div`
  padding: 20px;
  text-align: center;
  color: #6c757d;
`;