// PersonasAdministrar.jsx
import React, { useEffect, useState, useContext, useCallback, useRef } from "react";
import { AuthContext } from "../contexts/AuthContext";
import styled from "styled-components";
import Header from "../components/Common/Header";
import { API_BASE_URL } from "../config";
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import ImportarDatos from "./ImportarDatos";

const PersonasAdministrar = () => {
  // 🔹 Obtener datos del contexto
  const { currentClub, currentDisciplina } = useContext(AuthContext);
  const navigate = useNavigate();
  
  // Estado para columna 1
  const [filtro, setFiltro] = useState("");
  const [personas, setPersonas] = useState([]);
  const [seleccionadas, setSeleccionadas] = useState([]);
  const [buscando, setBuscando] = useState(false);
  
  // Estado para columna 2
  const [divisiones, setDivisiones] = useState([]);
  const [roles, setRoles] = useState([]);
  const [divisionSeleccionada, setDivisionSeleccionada] = useState("");
  const [rolSeleccionado, setRolSeleccionado] = useState("");
  
  // Estado para columna 3
  const [personasDivision, setPersonasDivision] = useState([]);
  const [cargandoPersonasDivision, setCargandoPersonasDivision] = useState(false);
  
  const [cargando, setCargando] = useState(true);
  // Estado para el modal de importación
  const [mostrarImportarModal, setMostrarImportarModal] = useState(false);
  
  // Referencia para el timeout de búsqueda
  const searchTimeout = useRef(null);

  const token = localStorage.getItem("token");

  // 🔹 Cargar personas del club con filtro (columna 1)
  const cargarPersonas = useCallback(async (filtroActual, soloSinDivision = false) => {
    if (!currentClub?.codclub) return;
    
    setBuscando(true);
    
    try {
      console.log("Cargando personas desde:", `${API_BASE_URL}/personas_club`);
      const res = await fetch(`${API_BASE_URL}/personas_club`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          codclub: currentClub.codclub,
          coddisciplina: 0,
          filtro: filtroActual,
          soloSinDivision: soloSinDivision
        })
      });

      if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);

      const data = await res.json();
      console.log("Personas cargadas:", data);
      setPersonas(data);
    } catch (error) {
      console.error("Error cargando personas:", error);
      Swal.fire({
        title: 'Error',
        text: 'No se pudieron cargar las personas',
        icon: 'error',
        timer: 2000
      });
    } finally {
      setBuscando(false);
    }
  }, [currentClub, token]);

  // 🔹 Función para manejar datos importados desde Excel
// En PersonasAdministrar.jsx, reemplaza handleDatosImportados con esto:

const handleDatosImportados = async (resultado) => {
  console.log("Importación completada:", resultado);
  
  if (resultado?.success) {
    // Recargar las listas para mostrar los cambios
    await cargarPersonas(filtro);
    if (divisionSeleccionada) {
      await cargarPersonasDivision();
    }
    
    // Opcional: mostrar mensaje de éxito
    Swal.fire({
      title: '¡Listo!',
      text: `Se importaron ${resultado.cantidad} registros correctamente`,
      icon: 'success',
      timer: 2000
    });
  }
};
  // 🔹 Efecto para búsqueda con debounce
  useEffect(() => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    if (filtro.trim() === "") {
      setPersonas([]);
      setSeleccionadas([]);
      setBuscando(false);
      return;
    }

    if (filtro.trim().length >= 1) {
      setBuscando(true);
      searchTimeout.current = setTimeout(() => {
        cargarPersonas(filtro);
      }, 400);
    }

    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [filtro, cargarPersonas]);

  // 🔹 Buscar personas sin división
  const buscarSinDivision = () => {
    cargarPersonas("", true);
    setSeleccionadas([]);
  };

  // 🔹 Cargar divisiones (columna 2)
  const cargarDivisiones = async () => {
    if (!currentDisciplina?.coddisciplina || !currentClub?.codclub) return;
    
    try {
      const res = await fetch(`${API_BASE_URL}/divisiones_disciplina`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          coddisciplina: currentDisciplina.coddisciplina,
          codclub: currentClub.codclub
        })
      });

      if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);

      const data = await res.json();
      console.log("Divisiones cargadas:", data);
      setDivisiones(data);
    } catch (error) {
      console.error("Error cargando divisiones:", error);
      Swal.fire({
        title: 'Error',
        text: 'No se pudieron cargar las divisiones',
        icon: 'error',
        timer: 2000
      });
    }
  };

  // 🔹 Cargar roles (columna 2)
  const cargarRoles = async () => {
    if (!currentClub?.codclub) return;
    
    try {
      const res = await fetch(`${API_BASE_URL}/roles_por_club`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          codclub: currentClub.codclub 
        })
      });

      if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);

      const data = await res.json();
      console.log("Roles cargados:", data);
      setRoles(data);
    } catch (error) {
      console.error("Error cargando roles:", error);
      Swal.fire({
        title: 'Error',
        text: 'No se pudieron cargar los roles',
        icon: 'error',
        timer: 2000
      });
    }
  };

  // 🔹 Cargar personas de la división seleccionada (columna 3)
  const cargarPersonasDivision = async () => {
    if (!divisionSeleccionada) return;
    
    setCargandoPersonasDivision(true);
    
    try {
      const res = await fetch(`${API_BASE_URL}/personas_division`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          coddivision: divisionSeleccionada
        })
      });

      if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);

      const data = await res.json();
      console.log("Personas de la división:", data);
      setPersonasDivision(data);
    } catch (error) {
      console.error("Error cargando personas de la división:", error);
      Swal.fire({
        title: 'Error',
        text: 'No se pudieron cargar las personas de la división',
        icon: 'error',
        timer: 2000
      });
    } finally {
      setCargandoPersonasDivision(false);
    }
  };

  // Efecto para carga inicial
  useEffect(() => {
    if (currentClub?.codclub && currentDisciplina?.coddisciplina) {
      const cargarDatos = async () => {
        await Promise.all([
          cargarDivisiones(),
          cargarRoles()
        ]);
        setCargando(false);
      };
      
      cargarDatos();
    } else {
      setCargando(false);
    }
  }, [currentClub, currentDisciplina]);

  // Efecto para cargar personas cuando cambia la división seleccionada
  useEffect(() => {
    if (divisionSeleccionada) {
      cargarPersonasDivision();
    } else {
      setPersonasDivision([]);
    }
  }, [divisionSeleccionada]);

  // 🔹 Seleccionar persona (columna 1)
  const toggleSeleccion = (codpersona) => {
    if (seleccionadas.includes(codpersona)) {
      setSeleccionadas(seleccionadas.filter(p => p !== codpersona));
    } else {
      setSeleccionadas([...seleccionadas, codpersona]);
    }
  };

  // 🔹 Seleccionar/deseleccionar todas
  const seleccionarTodas = () => {
    if (seleccionadas.length === personas.length) {
      setSeleccionadas([]);
    } else {
      setSeleccionadas(personas.map(p => p.codpersona));
    }
  };

  // 🔹 Verificar si una persona ya está en la división seleccionada
  const verificarYaExisten = () => {
    const personasEnDivision = new Set(personasDivision.map(p => p.codpersona));
    const yaExistentes = seleccionadas.filter(cod => personasEnDivision.has(cod));
    return yaExistentes;
  };

  // 🔹 Asociar personas a división
  const asociarPersonas = async () => {
    if (!divisionSeleccionada || !rolSeleccionado) {
      Swal.fire({
        title: 'Campos incompletos',
        text: 'Debe seleccionar división y rol',
        icon: 'warning',
        timer: 2000
      });
      return;
    }

    if (seleccionadas.length === 0) {
      Swal.fire({
        title: 'Sin selección',
        text: 'Debe seleccionar al menos una persona',
        icon: 'warning',
        timer: 2000
      });
      return;
    }

    const yaExistentes = verificarYaExisten();
    
    if (yaExistentes.length > 0) {
      const nombresExistentes = personasDivision
        .filter(p => yaExistentes.includes(p.codpersona))
        .map(p => p.nombre)
        .join(', ');

      await Swal.fire({
        title: '⚠️ Personas ya asignadas',
        html: `
          <p>Las siguientes personas ya pertenecen a esta división:</p>
          <p style="color: #dc3545; font-weight: bold; margin: 10px 0;">${nombresExistentes}</p>
        `,
        icon: 'warning',
        confirmButtonColor: '#4a90e2',
      });
      return;
    }

    const result = await Swal.fire({
      title: 'Asignar personas',
      text: `Se asignarán ${seleccionadas.length} persona(s) a la división`,
      icon: 'info',
      showCancelButton: true,
      confirmButtonColor: '#4a90e2',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, asignar',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`${API_BASE_URL}/asociar_personas_division`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          coddivision: divisionSeleccionada,
          codrol: rolSeleccionado,
          personas: seleccionadas
        })
      });

      if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);

      const data = await res.json();

      Swal.fire({
        title: '¡Asignación completada!',
        html: `
          <div style="text-align: left">
            <p>✅ Insertadas: ${data.insertadas?.length || 0}</p>
            <p>🔄 Ya existían: ${data.ya_existian?.length || 0}</p>
          </div>
        `,
        icon: 'success',
        timer: 3000
      });

      setSeleccionadas([]);
      if (filtro.trim() !== "") {
        await cargarPersonas(filtro);
      }
      await cargarPersonasDivision();
    } catch (error) {
      console.error("Error asociando personas:", error);
      Swal.fire({
        title: 'Error',
        text: 'No se pudieron asociar las personas',
        icon: 'error'
      });
    }
  };

  // 🔹 Quitar persona de la división
  const quitarPersonaDivision = async (codpersona, nombrePersona) => {
    const result = await Swal.fire({
      title: '¿Está seguro?',
      html: `¿Quitar a <strong>${nombrePersona}</strong> de la división?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, quitar',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;
    
    try {
      const res = await fetch(`${API_BASE_URL}/quitar_persona_division`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          coddivision: divisionSeleccionada,
          codpersona
        })
      });

      if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);

      await Swal.fire({
        title: '¡Quitada!',
        text: 'La persona ha sido quitada de la división',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });

      await cargarPersonasDivision();
      if (filtro.trim() !== "") {
        await cargarPersonas(filtro);
      }
    } catch (error) {
      console.error("Error quitando persona:", error);
      Swal.fire({
        title: 'Error',
        text: 'No se pudo quitar la persona',
        icon: 'error'
      });
    }
  };

  // 🔹 Volver al dashboard
  const volverAlDashboard = () => {
    navigate('/dashboard');
  };

  // Si está cargando
  if (cargando) {
    return (
      <>
        <Header />
        <LoadingContainer>
          <LoadingSpinner />
          <p>Cargando datos...</p>
        </LoadingContainer>
      </>
    );
  }

  // Si no hay club seleccionado
  if (!currentClub || !currentDisciplina) {
    return (
      <>
        <Header />
        <EmptyStateContainer>
          <h3>Seleccione un club y disciplina primero</h3>
          <p>Vuelva al dashboard y seleccione un club y disciplina.</p>
          <BackButton onClick={volverAlDashboard} style={{ marginTop: '20px' }}>
            ← Volver al Dashboard
          </BackButton>
        </EmptyStateContainer>
      </>
    );
  }

  return (
    <>
      <Header />
      <Container>
        {/* 🔹 COLUMNA 1: Búsqueda y lista de personas */}
        <Column>
          <Title>
            Buscar persona
            <span style={{ fontSize: '12px', fontWeight: 'normal', marginLeft: '8px', color: '#666' }}>
              (Total: {personas.length})
            </span>
          </Title>

          <SearchInput
            type="text"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="Escriba para buscar por nombre..."
          />

          {buscando && (
            <SearchingIndicator>
              <SmallSpinner /> Buscando...
            </SearchingIndicator>
          )}

          <ButtonGroup>
            <Button onClick={seleccionarTodas} small secondary>
              {seleccionadas.length === personas.length ? '🔓 Deseleccionar todas' : '✅ Seleccionar todas'}
            </Button>
            <Button onClick={buscarSinDivision} small secondary>
              👥 Sin división
            </Button>
          </ButtonGroup>

          <SelectionInfo>
            Seleccionadas: <strong>{seleccionadas.length}</strong> de {personas.length}
          </SelectionInfo>

          <PersonList>
            {personas.length === 0 ? (
              <EmptyListItem>
                {filtro ? 'No se encontraron personas' : 'Escriba para buscar personas'}
              </EmptyListItem>
            ) : (
              personas.map(p => (
                <PersonItem key={p.codpersona}>
                  <label>
                    <input
                      type="checkbox"
                      checked={seleccionadas.includes(p.codpersona)}
                      onChange={() => toggleSeleccion(p.codpersona)}
                    />
                    <PersonInfo>
                      <PersonName>{p.nombre}</PersonName>
                      {p.apodo && <PersonApodo>"{p.apodo}"</PersonApodo>}
                      {p.divisiones && p.divisiones.length > 0 && (
                        <PersonDivisiones>
                          📍 {p.divisiones.map(div => {
                            if (typeof div === 'object' && div !== null) {
                              return div.descripcion || div.nombre || JSON.stringify(div);
                            }
                            return div;
                          }).join(' • ')}
                        </PersonDivisiones>
                      )}
                    </PersonInfo>
                  </label>
                </PersonItem>
              ))
            )}
          </PersonList>
        </Column>

        {/* 🔹 COLUMNA 2: Asignación */}
        <Column>
          <Title>Asignar a División</Title>

          <Label>📋 División:</Label>
          <Select
            value={divisionSeleccionada}
            onChange={(e) => setDivisionSeleccionada(e.target.value)}
          >
            <option value="">Seleccione una división</option>
            {divisiones.map(d => (
              <option key={d.coddivision} value={d.coddivision}>
                {d.descripcion}
              </option>
            ))}
          </Select>

          <Label>👤 Rol:</Label>
          <Select
            value={rolSeleccionado}
            onChange={(e) => setRolSeleccionado(e.target.value)}
          >
            <option value="">Seleccione un rol</option>
            {roles.map(r => (
              <option key={r.codrol} value={r.codrol}>
                {r.descripcion}
              </option>
            ))}
          </Select>

          <ButtonGroup style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
            <Button 
              onClick={asociarPersonas} 
              disabled={!divisionSeleccionada || !rolSeleccionado || seleccionadas.length === 0}
              style={{ flex: 2 }}
            >
              📌 Asociar {seleccionadas.length > 0 && `(${seleccionadas.length})`}
            </Button>
            <Button 
              onClick={() => setMostrarImportarModal(true)} 
              small secondary 
              style={{ flex: 1 }}
            >
              📋 Importar Excel
            </Button>
          </ButtonGroup>

          <InfoBox>
            <strong>📝 Instrucciones:</strong>
            <ul>
              <li>Escriba para buscar personas</li>
              <li>Seleccione personas de la columna izquierda</li>
              <li>Elija división y rol</li>
              <li>Haga clic en "Asociar"</li>
            </ul>
          </InfoBox>
        </Column>

        {/* 🔹 COLUMNA 3: Personas de la división */}
        <Column>
          <Title>
            👥 Miembros de la División
          </Title>

          {!divisionSeleccionada && (
            <EmptyState>
              <span style={{ fontSize: '32px', marginBottom: '10px', display: 'block' }}>📋</span>
              Seleccione una división para ver sus miembros
            </EmptyState>
          )}

          {divisionSeleccionada && cargandoPersonasDivision && (
            <LoadingContainer>
              <LoadingSpinner small />
              <p>Cargando miembros...</p>
            </LoadingContainer>
          )}

          {divisionSeleccionada && !cargandoPersonasDivision && (
            <>
              <DivisionHeader>
                <span>
                  {divisiones.find(d => d.coddivision == divisionSeleccionada)?.descripcion || 'División'}
                </span>
                <MemberCount>{personasDivision.length} miembros</MemberCount>
              </DivisionHeader>
              
              <PersonList>
                {personasDivision.length === 0 ? (
                  <EmptyListItem>No hay personas en esta división</EmptyListItem>
                ) : (
                  personasDivision.map(p => (
                    <PersonItem key={p.codpersona}>
                      <PersonInfo>
                        <PersonName>{p.nombre}</PersonName>
                        {p.apodo && <PersonApodo>"{p.apodo}"</PersonApodo>}
                        {p.rol && <PersonRol>Rol: {p.rol}</PersonRol>}
                      </PersonInfo>
                      <RemoveButton 
                        onClick={() => quitarPersonaDivision(p.codpersona, p.nombre)}
                        title="Quitar de la división"
                      >
                        ✕
                      </RemoveButton>
                    </PersonItem>
                  ))
                )}
              </PersonList>
            </>
          )}
        </Column>
      </Container>
      
      {/* 🔹 Botón Atras */}
      <FooterButtons>
        <BackButton onClick={volverAlDashboard}>
          ← Volver al Dashboard
        </BackButton>
      </FooterButtons>

      {/* 🔹 Modal de Importación */}
      <ImportarDatos
        isOpen={mostrarImportarModal}
        onClose={() => setMostrarImportarModal(false)}
        onImportar={handleDatosImportados}
        currentClub={currentClub}
        currentDisciplina={currentDisciplina}
        token={token}
      />
    </>
  );
};

export default PersonasAdministrar;

// ========== STYLED COMPONENTS ==========
const Container = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 24px;
  width: 100%;
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const Column = styled.div`
  background: #ffffff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  height: fit-content;
  max-height: calc(100vh - 120px);
  overflow-y: auto;
`;

const Title = styled.h3`
  margin-bottom: 16px;
  font-size: 18px;
  font-weight: 600;
  color: #333;
  position: sticky;
  top: 0;
  background: white;
  padding-bottom: 8px;
  border-bottom: 2px solid #4a90e2;
  z-index: 10;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid #ddd;
  margin-bottom: 12px;
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: #4a90e2;
  }
`;

const SearchingIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #666;
  margin-bottom: 10px;
  padding: 5px 10px;
  background: #f0f7ff;
  border-radius: 6px;
`;

const SmallSpinner = styled.div`
  width: 16px;
  height: 16px;
  border: 2px solid #e0e0e0;
  border-top: 2px solid #4a90e2;
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
`;

const Button = styled.button`
  width: ${props => props.small ? 'auto' : '100%'};
  padding: ${props => props.small ? '8px 12px' : '12px'};
  border-radius: 8px;
  border: none;
  background-color: ${props => props.disabled ? '#ccc' : props.secondary ? '#6c757d' : '#4a90e2'};
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: 0.2s ease;
  flex: ${props => props.small ? '1' : 'none'};

  &:hover:not(:disabled) {
    background-color: ${props => props.secondary ? '#5a6268' : '#357abd'};
    transform: translateY(-1px);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }
`;

const SelectionInfo = styled.div`
  font-size: 13px;
  color: #666;
  margin-bottom: 10px;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 6px;
  text-align: center;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 4px;
  font-size: 13px;
  font-weight: 600;
  color: #555;
`;

const Select = styled.select`
  width: 100%;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #ddd;
  margin-bottom: 14px;
  font-size: 14px;
  background: #fff;

  &:focus {
    outline: none;
    border-color: #4a90e2;
  }
`;

const PersonList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 12px 0;
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  flex: 1;
`;

const PersonItem = styled.li`
  padding: 10px 12px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: space-between;

  &:last-child {
    border-bottom: none;
  }

  label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-size: 14px;
    flex: 1;
  }

  &:hover {
    background: #f9f9f9;
  }
`;

const EmptyListItem = styled.li`
  padding: 20px;
  text-align: center;
  color: #999;
  font-size: 14px;
`;

const PersonInfo = styled.div`
  flex: 1;
`;

const PersonName = styled.div`
  font-weight: 500;
  color: #333;
`;

const PersonApodo = styled.div`
  font-size: 12px;
  color: #666;
  font-style: italic;
`;

const PersonDivisiones = styled.div`
  font-size: 11px;
  color: #28a745;
  margin-top: 2px;
  display: flex;
  align-items: center;
  gap: 4px;
`;

const PersonRol = styled.div`
  font-size: 11px;
  color: #4a90e2;
  margin-top: 2px;
`;

const RemoveButton = styled.button`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: #dc3545;
  color: white;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.7;
  transition: 0.2s ease;

  &:hover {
    opacity: 1;
    transform: scale(1.1);
    background: #c82333;
  }
`;

const InfoBox = styled.div`
  margin-top: 20px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #4a90e2;
  font-size: 13px;
  color: #555;

  ul {
    margin: 8px 0 0 20px;
    padding: 0;
  }

  li {
    margin-bottom: 4px;
  }
`;

const DivisionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-weight: 600;
  color: #333;
`;

const MemberCount = styled.span`
  background: #e9ecef;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  color: #495057;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: #999;
  font-size: 14px;
  background: #f8f9fa;
  border-radius: 8px;
`;

const EmptyStateContainer = styled.div`
  text-align: center;
  padding: 60px 20px;
  max-width: 600px;
  margin: 0 auto;
  
  h3 {
    color: #333;
    margin-bottom: 10px;
  }
  
  p {
    color: #666;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #666;
`;

const LoadingSpinner = styled.div`
  width: ${props => props.small ? '30px' : '50px'};
  height: ${props => props.small ? '30px' : '50px'};
  border: 3px solid #f3f3f3;
  border-top: 3px solid #4a90e2;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 15px;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const FooterButtons = styled.div`
  display: flex;
  justify-content: center;
  padding: 20px;
  margin-top: 20px;
  border-top: 1px solid #eee;
`;

const BackButton = styled.button`
  background: transparent;
  border: 2px solid #4a90e2;
  color: #4a90e2;
  padding: 10px 24px;
  border-radius: 30px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;

  &:hover {
    background: #4a90e2;
    color: white;
    transform: translateY(-2px);
    box-shadow: 0 4px 10px rgba(74, 144, 226, 0.3);
  }

  &:active {
    transform: translateY(0);
  }
`;