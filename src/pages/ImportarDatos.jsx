// ImportarDatos.jsx
import React, { useState, useEffect } from "react";
import styled from "styled-components";
import Swal from 'sweetalert2';
import { API_BASE_URL } from "../config";

const ImportarDatos = ({ isOpen, onClose, onImportar, currentClub, currentDisciplina, token }) => {
  const [rawData, setRawData] = useState("");
  const [parsedData, setParsedData] = useState([]);
  const [columnas, setColumnas] = useState([]);
  const [vistaPrevia, setVistaPrevia] = useState([]);
  const [mapeoColumnas, setMapeoColumnas] = useState({});
  const [separador, setSeparador] = useState("auto");
  
  // Estados para datos del club
  const [divisiones, setDivisiones] = useState([]);
  const [roles, setRoles] = useState([]);
  const [divisionSeleccionada, setDivisionSeleccionada] = useState("");
  const [rolesPorFila, setRolesPorFila] = useState({});
  const [filasEliminadas, setFilasEliminadas] = useState([]);
  
  // Estados de carga
  const [cargandoDivisiones, setCargandoDivisiones] = useState(false);
  const [cargandoRoles, setCargandoRoles] = useState(false);
  const [procesandoImportacion, setProcesandoImportacion] = useState(false);

  const opcionesMapeo = [
    { value: "nombre", label: "📛 Nombre", required: true },
    { value: "dni", label: "🆔 DNI", required: false },
    { value: "email", label: "📧 Email", required: false },
    { value: "telefono", label: "📞 Teléfono", required: false },
    { value: "ignorar", label: "🚫 Ignorar", required: false }
  ];

  // Cargar divisiones y roles cuando se abre el modal
  useEffect(() => {
    if (isOpen && currentClub?.codclub && currentDisciplina?.coddisciplina) {
      cargarDivisiones();
      cargarRoles();
    } else if (isOpen) {
      Swal.fire({
        title: 'Error',
        text: 'No hay club o disciplina seleccionada',
        icon: 'error'
      });
      onClose();
    }
  }, [isOpen, currentClub, currentDisciplina]);

  const cargarDivisiones = async () => {
    if (!currentDisciplina?.coddisciplina || !currentClub?.codclub) return;
    
    setCargandoDivisiones(true);
    
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
      console.log("Divisiones cargadas en importador:", data);
      setDivisiones(data);
    } catch (error) {
      console.error("Error cargando divisiones:", error);
      Swal.fire({
        title: 'Error',
        text: 'No se pudieron cargar las divisiones',
        icon: 'error',
        timer: 2000
      });
    } finally {
      setCargandoDivisiones(false);
    }
  };

  const cargarRoles = async () => {
    if (!currentClub?.codclub) return;
    
    setCargandoRoles(true);
    
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
      console.log("Roles cargados en importador:", data);
      setRoles(data);
    } catch (error) {
      console.error("Error cargando roles:", error);
      Swal.fire({
        title: 'Error',
        text: 'No se pudieron cargar los roles',
        icon: 'error',
        timer: 2000
      });
    } finally {
      setCargandoRoles(false);
    }
  };

  const detectarSeparador = (texto) => {
    const primerasLineas = texto.split('\n').slice(0, 5).join('\n');
    if (primerasLineas.includes('\t')) return '\t';
    if (primerasLineas.includes(';')) return ';';
    if (primerasLineas.includes(',')) return ',';
    return '\t';
  };

  const parsearDatos = () => {
    if (!rawData.trim()) {
      Swal.fire('Sin datos', 'Pegá algo primero', 'info');
      return;
    }

    try {
      const sep = separador === "auto" ? detectarSeparador(rawData) : separador;
      const lineas = rawData.split('\n').filter(linea => linea.trim() !== '');
      if (lineas.length === 0) return;

      const datos = lineas.map(linea => {
        return linea.split(sep).map(celda => celda.trim());
      });

      const maxColumnas = Math.max(...datos.map(d => d.length));
      
      const datosNormalizados = datos.map(fila => {
        const nuevaFila = [...fila];
        while (nuevaFila.length < maxColumnas) nuevaFila.push('');
        return nuevaFila;
      });

      setParsedData(datosNormalizados);
      setFilasEliminadas([]);
      
      // Inicializar roles por fila con el primer rol disponible
      const rolesIniciales = {};
      const rolJugador = roles.find(r => r.descripcion?.toLowerCase().includes('jugador'));
      const rolDefault = rolJugador ? rolJugador.codrol : (roles[0]?.codrol || "");
      
      datosNormalizados.forEach((_, index) => {
        rolesIniciales[index] = rolDefault;
      });
      setRolesPorFila(rolesIniciales);
      
      const nuevasColumnas = Array.from({ length: maxColumnas }, (_, i) => `Columna ${i + 1}`);
      setColumnas(nuevasColumnas);
      
      const mapeoInicial = {};
      nuevasColumnas.forEach((_, idx) => {
        mapeoInicial[idx] = "";
      });
      setMapeoColumnas(mapeoInicial);
      
      setVistaPrevia(datosNormalizados);
      
      Swal.fire({
        title: '✅ Datos cargados',
        text: `Se detectaron ${datosNormalizados.length} filas y ${maxColumnas} columnas`,
        icon: 'success',
        timer: 2000
      });
      
    } catch (error) {
      console.error("Error parseando datos:", error);
      Swal.fire('Error', 'No se pudieron parsear los datos', 'error');
    }
  };

  const cambiarMapeo = (colIndex, valor) => {
    if (valor !== "ignorar" && valor !== "") {
      const columnaExistente = Object.entries(mapeoColumnas).find(
        ([idx, v]) => v === valor && parseInt(idx) !== colIndex
      );
      
      if (columnaExistente) {
        Swal.fire({
          title: '⚠️ Ya existe',
          text: `La columna ${parseInt(columnaExistente[0]) + 1} ya está asignada como "${valor}".`,
          icon: 'warning',
          timer: 2000
        });
        return;
      }
    }
    
    setMapeoColumnas({
      ...mapeoColumnas,
      [colIndex]: valor
    });
  };

  const cambiarRolFila = (filaIndex, codrol) => {
    setRolesPorFila({
      ...rolesPorFila,
      [filaIndex]: codrol
    });
  };

  const eliminarFila = (indiceFila) => {
    setFilasEliminadas([...filasEliminadas, indiceFila]);
  };

  const restaurarFila = (indiceFila) => {
    setFilasEliminadas(filasEliminadas.filter(i => i !== indiceFila));
  };

  // Preparar datos para enviar al backend
  const prepararDatosParaImportar = () => {
    const resultados = [];
    const errores = [];
    const filasSinRol = [];
    const filasSinNombre = [];
    
    parsedData.forEach((fila, indexFila) => {
      // Saltar filas eliminadas
      if (filasEliminadas.includes(indexFila)) return;
      
      const codrol = rolesPorFila[indexFila];
      
      // Verificar si tiene rol
      if (!codrol) {
        filasSinRol.push(indexFila + 1);
        return;
      }
      
      const registro = {
        codclub: currentClub.codclub,
        coddivision: divisionSeleccionada,
        codrol: codrol
      };
      
      Object.entries(mapeoColumnas).forEach(([colIndex, tipo]) => {
        if (tipo && tipo !== "ignorar" && fila[colIndex] && fila[colIndex].trim() !== '') {
          registro[tipo] = fila[colIndex].trim();
        }
      });
      
      // Validar que tiene nombre
      if (!registro.nombre || registro.nombre.trim() === '') {
        filasSinNombre.push(indexFila + 1);
        return;
      }
      
      resultados.push(registro);
    });
    
    return { 
      resultados, 
      errores: {
        sinRol: filasSinRol,
        sinNombre: filasSinNombre
      }
    };
  };

  // 🔥 NUEVO: Validar duplicados antes de importar
  const validarDuplicados = async (datos) => {
  try {
    const res = await fetch(`${API_BASE_URL}/validar_personas_importacion`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        codclub: currentClub.codclub,
        personas: datos.map(d => ({
          nombre: d.nombre,
          dni: d.dni || null
        }))
      })
    });

    if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Error validando duplicados:", error);
    throw error;
  }
};

  // 🔥 NUEVO: Función que hace la importación con validaciones
  const ejecutarImportacion = async (datos) => {
    try {
      // Mostrar indicador de carga
      Swal.fire({
        title: 'Validando datos...',
        html: `Verificando ${datos.length} registros...`,
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      // PASO 1: Validar duplicados (por nombre y DNI)
      const validacion = await validarDuplicados(datos);
      
      // Cerrar el loading de validación
      Swal.close();

      // Si hay duplicados, preguntar qué hacer
      if (validacion.duplicados && validacion.duplicados.length > 0) {
        const result = await Swal.fire({
          title: '⚠️ Personas duplicadas',
          html: `
            <div style="text-align: left; max-height: 300px; overflow-y: auto;">
              <p>Se encontraron las siguientes personas que ya existen:</p>
              <ul style="font-size: 12px; color: #dc3545;">
                ${validacion.duplicados.slice(0, 5).map(d => 
                  `<li>${d.nombre} ${d.dni ? `(DNI: ${d.dni})` : ''}</li>`
                ).join('')}
                ${validacion.duplicados.length > 5 ? 
                  `<li>... y ${validacion.duplicados.length - 5} más</li>` : ''}
              </ul>
              <p><strong>¿Qué deseas hacer?</strong></p>
            </div>
          `,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Ignorar duplicados',
          cancelButtonText: 'Cancelar importación',
          confirmButtonColor: '#4a90e2'
        });

        if (!result.isConfirmed) {
          return false; // Cancelar importación
        }

        // Filtrar duplicados
        const idsDuplicados = new Set(validacion.duplicados.map(d => d.id));
        datos = datos.filter(d => {
          const key = `${d.nombre}|${d.dni || ''}`;
          return !idsDuplicados.has(key);
        });

        if (datos.length === 0) {
          await Swal.fire({
            title: 'Sin datos',
            text: 'Todos los registros eran duplicados',
            icon: 'info'
          });
          return false;
        }
      }

      // PASO 2: Importar los datos
      Swal.fire({
        title: 'Importando...',
        html: `Procesando ${datos.length} registros...`,
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

    const res = await fetch(`${API_BASE_URL}/importar_personas_masivo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`   // ✅ token ya está en el ámbito del componente
        },
        body: JSON.stringify({
          codclub: currentClub.codclub,
          personas: datos.map(d => ({
            nombre: d.nombre,
            dni: d.dni || null,
            telefono: d.telefono || null,
            email: d.email || null,
            coddivision: Number(d.coddivision),
            codrol: Number(d.codrol)
          }))
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Error HTTP: ${res.status}`);
      }

      const data = await res.json();
      
      // Cerrar el loading
      Swal.close();
      
      // Mostrar resumen de importación
      // En ImportarDatos.jsx, actualizá la parte que muestra el resumen:

// Mostrar resumen de importación
await Swal.fire({
  title: '¡Importación exitosa!',
  html: `
    <div style="text-align: left">
      <p><strong>📊 Personas:</strong></p>
      <p>✅ Creadas: ${data.creadas || 0}</p>
      <p>🔄 Ya existían: ${data.ya_existian || 0}</p>
      
      <p><strong>🏢 Asociaciones al club:</strong></p>
      <p>✅ Nuevas: ${data.asociaciones_club_nuevas || 0}</p>
      <p>🔄 Ya estaban: ${data.asociaciones_club_existentes || 0}</p>
      
      <p><strong>📋 Asociaciones a división:</strong></p>
      <p>✅ Nuevas: ${data.asociaciones_division_nuevas || 0}</p>
      <p>🔄 Ya estaban: ${data.asociaciones_division_existentes || 0}</p>
      
      <hr />
      <p>📊 Total procesadas: ${data.total_procesadas || datos.length}</p>
      ${data.errores ? `<p style="color: #dc3545;">⚠️ ${data.errores.length} errores</p>` : ''}
    </div>
  `,
  icon: 'success',
  timer: 5000
});

      return true; // Importación exitosa
      
    } catch (error) {
      console.error("Error en importación:", error);
      Swal.close();
      await Swal.fire({
        title: 'Error',
        text: error.message || 'No se pudieron importar los datos',
        icon: 'error',
        confirmButtonText: 'Entendido'
      });
      return false; // Importación fallida
    }
  };

  const handleImportar = async () => {
    // Prevenir múltiples clics
    if (procesandoImportacion) return;
    
    // Validaciones básicas
    if (!divisionSeleccionada || divisionSeleccionada === "") {
      await Swal.fire({
        title: 'Falta división',
        text: 'Debés seleccionar una división',
        icon: 'warning',
        confirmButtonText: 'Entendido'
      });
      return;
    }

    const tieneNombre = Object.values(mapeoColumnas).includes("nombre");
    if (!tieneNombre) {
      await Swal.fire({
        title: 'Falta columna obligatoria',
        text: 'Debés asignar al menos una columna como "Nombre"',
        icon: 'warning',
        confirmButtonText: 'Entendido'
      });
      return;
    }

    if (roles.length === 0) {
      await Swal.fire({
        title: 'Sin roles',
        text: 'No hay roles disponibles para asignar',
        icon: 'error',
        confirmButtonText: 'Entendido'
      });
      return;
    }

    setProcesandoImportacion(true);
    
    try {
      // Preparar datos
      const { resultados, errores } = prepararDatosParaImportar();
      
      // Mostrar advertencias de filas inválidas
      const advertencias = [];
      if (errores.sinRol.length > 0) {
        advertencias.push(`⚠️ ${errores.sinRol.length} filas sin rol`);
      }
      if (errores.sinNombre.length > 0) {
        advertencias.push(`⚠️ ${errores.sinNombre.length} filas sin nombre`);
      }

      if (advertencias.length > 0) {
        const result = await Swal.fire({
          title: '⚠️ Filas con problemas',
          html: `
            <div style="text-align: left;">
              <p>Se encontraron los siguientes problemas:</p>
              <ul style="color: #dc3545;">
                ${advertencias.map(a => `<li>${a}</li>`).join('')}
              </ul>
              <p><strong>Registros válidos: ${resultados.length}</strong></p>
              <p>¿Deseas continuar solo con los registros válidos?</p>
            </div>
          `,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Sí, continuar',
          cancelButtonText: 'Cancelar',
          confirmButtonColor: '#4a90e2'
        });
        
        if (!result.isConfirmed) {
          setProcesandoImportacion(false);
          return;
        }
      }
      
      // Si no hay registros válidos, mostrar mensaje y salir
      if (resultados.length === 0) {
        await Swal.fire({
          title: 'Sin datos',
          text: 'No hay registros válidos para importar',
          icon: 'info',
          confirmButtonText: 'Entendido'
        });
        setProcesandoImportacion(false);
        return;
      }
      
      // Mostrar confirmación final
      const divisionDesc = divisiones.find(d => String(d.coddivision) === String(divisionSeleccionada))?.descripcion || 'División seleccionada';
      
      const confirmResult = await Swal.fire({
        title: '¿Confirmar importación?',
        html: `
          <div style="text-align: left; max-height: 300px; overflow-y: auto;">
            <p><strong>📊 Resumen final:</strong></p>
            <p>✅ Registros a importar: ${resultados.length}</p>
            <p>📋 División: ${divisionDesc}</p>
            <p>🗑️ Filas omitidas: ${filasEliminadas.length + errores.sinRol.length + errores.sinNombre.length}</p>
            <hr />
            <p><strong>👥 Primeros registros:</strong></p>
            <ul style="font-size: 12px;">
              ${resultados.slice(0, 3).map(d => 
                `<li>${d.nombre} ${d.dni ? `(DNI: ${d.dni})` : ''} - ${roles.find(r => String(r.codrol) === String(d.codrol))?.descripcion || 'Sin rol'}</li>`
              ).join('')}
              ${resultados.length > 3 ? `<li>... y ${resultados.length - 3} más</li>` : ''}
            </ul>
          </div>
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#4a90e2',
        confirmButtonText: 'Sí, importar',
        cancelButtonText: 'Cancelar'
      });
      
      if (confirmResult.isConfirmed) {
        // 🔥 EJECUTAR LA IMPORTACIÓN CON VALIDACIONES
        const exito = await ejecutarImportacion(resultados);
        
        if (exito) {
          limpiarTodo();
          onClose();
          
          // Notificar al padre que la importación fue exitosa
          if (onImportar) {
            onImportar({ 
              success: true, 
              cantidad: resultados.length 
            });
          }
        }
      }
    } catch (error) {
      console.error("Error en importación:", error);
      await Swal.fire({
        title: 'Error',
        text: 'Ocurrió un error durante la importación',
        icon: 'error',
        confirmButtonText: 'Entendido'
      });
    } finally {
      setProcesandoImportacion(false);
    }
  };

  const limpiarTodo = () => {
    setRawData("");
    setParsedData([]);
    setVistaPrevia([]);
    setColumnas([]);
    setMapeoColumnas({});
    setFilasEliminadas([]);
    setRolesPorFila({});
    setDivisionSeleccionada("");
  };

  const handleCancelar = () => {
    limpiarTodo();
    onClose();
  };

  // Calcular cantidad de registros válidos para mostrar en el botón
  const calcularRegistrosValidos = () => {
    if (!parsedData.length) return 0;
    const { resultados } = prepararDatosParaImportar();
    return resultados.length;
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={handleCancelar}>
      <ModalContent onClick={e => e.stopPropagation()}>
        <ModalHeader>
          <h3>📋 Importar desde Excel</h3>
          <CloseButton onClick={handleCancelar}>✕</CloseButton>
        </ModalHeader>
        
        <ModalBody>
          <InfoBox>
            <strong>📝 Instrucciones:</strong>
            <ol style={{ marginLeft: '20px', marginTop: '8px' }}>
              <li>Copiá los datos desde Excel (Ctrl+C)</li>
              <li>Pegalos abajo (Ctrl+V)</li>
              <li>Seleccioná la división destino</li>
              <li>Indicá qué representa cada columna</li>
              <li>Ajustá el rol por fila si es necesario</li>
              <li>¡Importá!</li>
            </ol>
          </InfoBox>
          
          <Label>📋 Datos copiados:</Label>
          <TextArea
            value={rawData}
            onChange={(e) => setRawData(e.target.value)}
            placeholder="Pegá acá los datos copiados de Excel..."
            rows={3}
          />
          
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Label style={{ marginBottom: 0 }}>🔧 Separador:</Label>
              <select 
                value={separador} 
                onChange={(e) => setSeparador(e.target.value)}
                style={{ padding: '5px', borderRadius: '4px' }}
              >
                <option value="auto">🤖 Auto-detectar</option>
                <option value="\t">📊 Tabulación (Excel)</option>
                <option value=";">📝 Punto y coma (;)</option>
                <option value=",">📝 Coma (,)</option>
              </select>
            </div>
            
            <SmallButton onClick={parsearDatos} primary>
              🔄 Procesar
            </SmallButton>
          </div>
          
          {vistaPrevia.length > 0 && (
            <>
              {/* Selector de división */}
              <div style={{ marginBottom: '20px', padding: '15px', background: '#f0f7ff', borderRadius: '8px' }}>
                <Label style={{ marginBottom: '8px' }}>📋 División destino *</Label>
                {cargandoDivisiones ? (
                  <div>Cargando divisiones...</div>
                ) : (
                  <select
                    value={divisionSeleccionada}
                    onChange={(e) => setDivisionSeleccionada(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #4a90e2' }}
                  >
                    <option value="">Seleccioná una división</option>
                    {divisiones.map(d => (
                      <option key={d.coddivision} value={d.coddivision}>
                        {d.descripcion}
                      </option>
                    ))}
                  </select>
                )}
                {divisionSeleccionada && (
                  <div style={{ marginTop: '5px', fontSize: '12px', color: '#28a745' }}>
                    ✓ División seleccionada: {divisiones.find(d => String(d.coddivision) === String(divisionSeleccionada))?.descripcion}
                  </div>
                )}
              </div>

              <h4 style={{ marginBottom: '10px' }}>👁️ Vista previa ({vistaPrevia.length} filas):</h4>
              
              {/* Selectores de columnas */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', overflowX: 'auto' }}>
                {columnas.map((col, idx) => (
                  <div key={idx} style={{ minWidth: '150px' }}>
                    <Label>{col}:</Label>
                    <select
                      value={mapeoColumnas[idx] || ""}
                      onChange={(e) => cambiarMapeo(idx, e.target.value)}
                      style={{ width: '100%', padding: '5px' }}
                    >
                      <option value="">🔘 Seleccionar...</option>
                      {opcionesMapeo.map(op => (
                        <option key={op.value} value={op.value}>
                          {op.label} {op.required && '*'}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              
              {/* Tabla con rol por fila */}
              <TablaContainer>
                <TablaPreview>
                  <thead>
                    <tr>
                      <th style={{ width: '30px' }}>🗑️</th>
                      <th style={{ minWidth: '120px' }}>👤 ROL</th>
                      {columnas.map((col, idx) => (
                        <th key={idx}>
                          {col}
                          {mapeoColumnas[idx] && (
                            <div style={{ fontSize: '10px', color: '#4a90e2' }}>
                              → {opcionesMapeo.find(o => o.value === mapeoColumnas[idx])?.label}
                            </div>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {vistaPrevia.map((fila, filaIdx) => (
                      <tr key={filaIdx} className={filasEliminadas.includes(filaIdx) ? 'eliminada' : ''}>
                        <td style={{ textAlign: 'center' }}>
                          {filasEliminadas.includes(filaIdx) ? (
                            <RestoreButton onClick={() => restaurarFila(filaIdx)} title="Restaurar fila">
                              ↩️
                            </RestoreButton>
                          ) : (
                            <DeleteButton onClick={() => eliminarFila(filaIdx)} title="Eliminar fila">
                              ✕
                            </DeleteButton>
                          )}
                        </td>
                        <td>
                          {cargandoRoles ? (
                            "Cargando..."
                          ) : (
                            <select
                              value={rolesPorFila[filaIdx] || ""}
                              onChange={(e) => cambiarRolFila(filaIdx, e.target.value)}
                              disabled={filasEliminadas.includes(filaIdx)}
                              style={{ width: '100%', padding: '4px' }}
                            >
                              <option value="">Seleccionar rol...</option>
                              {roles.map(rol => (
                                <option key={rol.codrol} value={rol.codrol}>
                                  {rol.descripcion}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>
                        {fila.map((celda, colIdx) => (
                          <td key={colIdx}>{celda || '-'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </TablaPreview>
              </TablaContainer>
              
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <Button 
                  onClick={handleImportar} 
                  primary 
                  disabled={procesandoImportacion || !divisionSeleccionada || roles.length === 0}
                >
                  {procesandoImportacion ? '⏳ Procesando...' : `📌 Importar ${calcularRegistrosValidos()} registros`}
                </Button>
                <Button onClick={limpiarTodo} secondary disabled={procesandoImportacion}>
                  🧹 Limpiar todo
                </Button>
              </div>
            </>
          )}
        </ModalBody>
      </ModalContent>
    </ModalOverlay>
  );
};

// Styled Components (mantener los mismos)
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 12px;
  width: 95%;
  max-width: 1400px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #eee;
  
  h3 {
    margin: 0;
    color: #333;
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #999;
  
  &:hover {
    color: #333;
  }
`;

const ModalBody = styled.div`
  padding: 20px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 5px;
  font-size: 13px;
  font-weight: 600;
  color: #555;
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-family: monospace;
  margin-bottom: 15px;
  
  &:focus {
    outline: none;
    border-color: #4a90e2;
  }
`;

const SmallButton = styled.button`
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  background-color: ${props => props.primary ? '#4a90e2' : '#6c757d'};
  color: white;
  font-size: 13px;
  cursor: pointer;
  
  &:hover {
    opacity: 0.9;
  }
`;

const Button = styled.button`
  padding: 10px 20px;
  border-radius: 8px;
  border: none;
  background-color: ${props => props.primary ? '#4a90e2' : props.secondary ? '#6c757d' : '#4a90e2'};
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  flex: 1;
  
  &:hover:not(:disabled) {
    opacity: 0.9;
    transform: translateY(-1px);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const InfoBox = styled.div`
  background: #f8f9fa;
  border-left: 4px solid #4a90e2;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 13px;
`;

const TablaContainer = styled.div`
  overflow-x: auto;
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid #ddd;
  border-radius: 8px;
`;

const TablaPreview = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  
  th, td {
    border: 1px solid #ddd;
    padding: 8px;
    text-align: left;
  }
  
  th {
    background: #f5f5f5;
    font-weight: 600;
    position: sticky;
    top: 0;
    z-index: 10;
  }
  
  td {
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  tr:hover {
    background: #f9f9f9;
  }
  
  tr.eliminada {
    background: #ffebee;
    text-decoration: line-through;
    opacity: 0.7;
  }
`;

const DeleteButton = styled.button`
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: none;
  background: #dc3545;
  color: white;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background: #c82333;
  }
`;

const RestoreButton = styled.button`
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: none;
  background: #28a745;
  color: white;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background: #218838;
  }
`;

export default ImportarDatos;