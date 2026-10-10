import React, { useContext, useEffect, useState, useCallback } from "react";
import styled from "styled-components";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Header from "../components/Common/Header";
import { AuthContext } from "../contexts/AuthContext";
import { API_BASE_URL } from "../config";
import Swal from "sweetalert2";

const vacio = {
  descripcion: "",
  puntos: 0,
  lleva_resultado: "S",
  lleva_jugador: "S",
  es_cambio: "N",
  expulsa: "N",
  dispara_codsuceso: "",
  puntos_condicionados: "N",
  label_positivo: "",
  label_negativo: "",
  motivo_positivo: "",
  motivo_negativo: "",
  motivo_dispara_codsuceso: "",
};

const SucesosAdmin = () => {
  const { currentDisciplina } = useContext(AuthContext);
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [sucesos, setSucesos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [nuevo, setNuevo] = useState(vacio);
  const [guardando, setGuardando] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [edicion, setEdicion] = useState(vacio);
  const [mostrandoNuevo, setMostrandoNuevo] = useState(false);

  const cargarSucesos = useCallback(async () => {
    if (!currentDisciplina?.coddisciplina) {
      setSucesos([]);
      setCargando(false);
      return;
    }
    setCargando(true);
    try {
      const resp = await axios.post(
        `${API_BASE_URL}/sucesos_disciplina`,
        { coddisciplina: currentDisciplina.coddisciplina, soloActivos: false },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSucesos(resp.data || []);
    } catch (err) {
      console.error("Error cargando sucesos:", err);
      Swal.fire({ title: "Error", text: "No se pudieron cargar los sucesos", icon: "error" });
    } finally {
      setCargando(false);
    }
  }, [currentDisciplina, token]);

  useEffect(() => {
    cargarSucesos();
  }, [cargarSucesos]);

  const handleCrear = async () => {
    if (!nuevo.descripcion.trim()) {
      Swal.fire({ title: "Falta la descripción", icon: "warning" });
      return;
    }
    setGuardando(true);
    try {
      await axios.post(
        `${API_BASE_URL}/suceso_crear`,
        {
          coddisciplina: currentDisciplina.coddisciplina,
          descripcion: nuevo.descripcion.trim(),
          puntos: Number(nuevo.puntos) || 0,
          lleva_resultado: nuevo.lleva_resultado,
          lleva_jugador: nuevo.lleva_jugador,
          es_cambio: nuevo.es_cambio,
          expulsa: nuevo.expulsa,
          dispara_codsuceso: nuevo.dispara_codsuceso || null,
          puntos_condicionados: nuevo.puntos_condicionados,
          label_positivo: nuevo.label_positivo.trim() || null,
          label_negativo: nuevo.label_negativo.trim() || null,
          motivo_positivo: nuevo.motivo_positivo.trim() || null,
          motivo_negativo: nuevo.motivo_negativo.trim() || null,
          motivo_dispara_codsuceso: nuevo.motivo_dispara_codsuceso || null,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNuevo(vacio);
      setMostrandoNuevo(false);
      await cargarSucesos();
    } catch (err) {
      console.error("Error creando suceso:", err);
      Swal.fire({ title: "Error", text: "No se pudo crear el suceso", icon: "error" });
    } finally {
      setGuardando(false);
    }
  };

  const iniciarEdicion = (s) => {
    setEditandoId(s.codsuceso);
    setEdicion({
      descripcion: s.descripcion,
      puntos: s.puntos,
      lleva_resultado: s.lleva_resultado,
      lleva_jugador: s.lleva_jugador,
      es_cambio: s.es_cambio,
      expulsa: s.expulsa || "N",
      dispara_codsuceso: s.dispara_codsuceso ? String(s.dispara_codsuceso) : "",
      puntos_condicionados: s.puntos_condicionados || "N",
      label_positivo: s.label_positivo || "",
      label_negativo: s.label_negativo || "",
      motivo_positivo: s.motivo_positivo || "",
      motivo_negativo: s.motivo_negativo || "",
      motivo_dispara_codsuceso: s.motivo_dispara_codsuceso ? String(s.motivo_dispara_codsuceso) : "",
    });
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setEdicion(vacio);
  };

  const cancelarNuevo = () => {
    setNuevo(vacio);
    setMostrandoNuevo(false);
  };

  const handleGuardarEdicion = async (codsuceso) => {
    if (!edicion.descripcion.trim()) {
      Swal.fire({ title: "Falta la descripción", icon: "warning" });
      return;
    }
    setGuardando(true);
    try {
      await axios.post(
        `${API_BASE_URL}/suceso_editar`,
        {
          codsuceso,
          descripcion: edicion.descripcion.trim(),
          puntos: Number(edicion.puntos) || 0,
          lleva_resultado: edicion.lleva_resultado,
          lleva_jugador: edicion.lleva_jugador,
          es_cambio: edicion.es_cambio,
          expulsa: edicion.expulsa,
          dispara_codsuceso: edicion.dispara_codsuceso || null,
          puntos_condicionados: edicion.puntos_condicionados,
          label_positivo: edicion.label_positivo.trim() || null,
          label_negativo: edicion.label_negativo.trim() || null,
          motivo_positivo: edicion.motivo_positivo.trim() || null,
          motivo_negativo: edicion.motivo_negativo.trim() || null,
          motivo_dispara_codsuceso: edicion.motivo_dispara_codsuceso || null,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      cancelarEdicion();
      await cargarSucesos();
    } catch (err) {
      console.error("Error editando suceso:", err);
      Swal.fire({ title: "Error", text: "No se pudo guardar", icon: "error" });
    } finally {
      setGuardando(false);
    }
  };

  const handleToggleEstado = async (s) => {
    const nuevoEstado = s.estado === "A" ? "B" : "A";
    try {
      await axios.post(
        `${API_BASE_URL}/suceso_editar`,
        { codsuceso: s.codsuceso, estado: nuevoEstado },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await cargarSucesos();
    } catch (err) {
      console.error("Error cambiando estado:", err);
      Swal.fire({ title: "Error", text: "No se pudo actualizar el estado", icon: "error" });
    }
  };

  return (
    <>
      <Header />
      <Container>
        <Title>Catálogo de sucesos</Title>
        <Subtitle>
          {currentDisciplina?.descripcion
            ? `Disciplina: ${currentDisciplina.descripcion}`
            : "Seleccioná una disciplina arriba"}
        </Subtitle>

        {currentDisciplina?.coddisciplina && (
          <>
            <Seccion>
              <SeccionTitulo>Nuevo suceso</SeccionTitulo>
              {!mostrandoNuevo ? (
                <AgregarBtn onClick={() => setMostrandoNuevo(true)}>+ Nuevo suceso</AgregarBtn>
              ) : (
              <NuevoFormBox>
              <FormRow>
                <Input
                  placeholder="Descripción (ej: Try)"
                  value={nuevo.descripcion}
                  onChange={(e) => setNuevo({ ...nuevo, descripcion: e.target.value })}
                />
                <InputPuntos
                  type="number"
                  placeholder="Puntos"
                  value={nuevo.puntos}
                  onChange={(e) => setNuevo({ ...nuevo, puntos: e.target.value })}
                />
                <CheckLabel>
                  <input
                    type="checkbox"
                    checked={nuevo.lleva_resultado === "S"}
                    onChange={(e) =>
                      setNuevo({ ...nuevo, lleva_resultado: e.target.checked ? "S" : "N" })
                    }
                  />
                  Lleva resultado
                </CheckLabel>
                <CheckLabel>
                  <input
                    type="checkbox"
                    checked={nuevo.lleva_jugador === "S"}
                    onChange={(e) =>
                      setNuevo({ ...nuevo, lleva_jugador: e.target.checked ? "S" : "N" })
                    }
                  />
                  Lleva jugador
                </CheckLabel>
                <CheckLabel>
                  <input
                    type="checkbox"
                    checked={nuevo.es_cambio === "S"}
                    onChange={(e) =>
                      setNuevo({ ...nuevo, es_cambio: e.target.checked ? "S" : "N" })
                    }
                  />
                  Es cambio (sale/entra)
                </CheckLabel>
                <CheckLabel>
                  <input
                    type="checkbox"
                    checked={nuevo.expulsa === "S"}
                    onChange={(e) =>
                      setNuevo({ ...nuevo, expulsa: e.target.checked ? "S" : "N" })
                    }
                  />
                  Expulsa al jugador (ej: Tarjeta Roja)
                </CheckLabel>
              </FormRow>
              <FormRow>
                <SelectDispara
                  value={nuevo.dispara_codsuceso}
                  onChange={(e) => setNuevo({ ...nuevo, dispara_codsuceso: e.target.value })}
                >
                  <option value="">No dispara otro suceso</option>
                  {sucesos.map((s) => (
                    <option key={s.codsuceso} value={s.codsuceso}>
                      Dispara: {s.descripcion}
                    </option>
                  ))}
                </SelectDispara>
                {nuevo.lleva_resultado === "S" && (
                  <>
                    <CheckLabel>
                      <input
                        type="checkbox"
                        checked={nuevo.puntos_condicionados === "S"}
                        onChange={(e) =>
                          setNuevo({ ...nuevo, puntos_condicionados: e.target.checked ? "S" : "N" })
                        }
                      />
                      Puntos solo si el resultado es positivo
                    </CheckLabel>
                    <Input
                      placeholder="Etiqueta positiva (ej: Convertida)"
                      value={nuevo.label_positivo}
                      onChange={(e) => setNuevo({ ...nuevo, label_positivo: e.target.value })}
                    />
                    <Input
                      placeholder="Etiqueta negativa (ej: Errada)"
                      value={nuevo.label_negativo}
                      onChange={(e) => setNuevo({ ...nuevo, label_negativo: e.target.value })}
                    />
                    <Input
                      placeholder="Motivo extra si ganó (ej: Penal a favor)"
                      value={nuevo.motivo_positivo}
                      onChange={(e) => setNuevo({ ...nuevo, motivo_positivo: e.target.value })}
                    />
                    <Input
                      placeholder="Motivo extra si perdió (ej: Penal en contra)"
                      value={nuevo.motivo_negativo}
                      onChange={(e) => setNuevo({ ...nuevo, motivo_negativo: e.target.value })}
                    />
                    <SelectDispara
                      value={nuevo.motivo_dispara_codsuceso}
                      onChange={(e) => setNuevo({ ...nuevo, motivo_dispara_codsuceso: e.target.value })}
                    >
                      <option value="">El motivo no dispara otro suceso</option>
                      {sucesos.map((s) => (
                        <option key={s.codsuceso} value={s.codsuceso}>
                          Motivo dispara: {s.descripcion}
                        </option>
                      ))}
                    </SelectDispara>
                  </>
                )}
                <AgregarBtn onClick={handleCrear} disabled={guardando}>
                  + Agregar
                </AgregarBtn>
                <CancelarBtn onClick={cancelarNuevo}>Cancelar</CancelarBtn>
              </FormRow>
              </NuevoFormBox>
              )}
            </Seccion>

            <Seccion>
              <SeccionTitulo>Sucesos existentes</SeccionTitulo>
              {cargando ? (
                <EmptyState>Cargando...</EmptyState>
              ) : sucesos.length === 0 ? (
                <EmptyState>Todavía no hay sucesos cargados para esta disciplina</EmptyState>
              ) : (
                <Lista>
                  {sucesos.map((s) =>
                    editandoId === s.codsuceso ? (
                      <ItemEdicion key={s.codsuceso}>
                        <FormRow>
                          <Input
                            value={edicion.descripcion}
                            onChange={(e) => setEdicion({ ...edicion, descripcion: e.target.value })}
                          />
                          <InputPuntos
                            type="number"
                            value={edicion.puntos}
                            onChange={(e) => setEdicion({ ...edicion, puntos: e.target.value })}
                          />
                          <CheckLabel>
                            <input
                              type="checkbox"
                              checked={edicion.lleva_resultado === "S"}
                              onChange={(e) =>
                                setEdicion({ ...edicion, lleva_resultado: e.target.checked ? "S" : "N" })
                              }
                            />
                            Lleva resultado
                          </CheckLabel>
                          <CheckLabel>
                            <input
                              type="checkbox"
                              checked={edicion.lleva_jugador === "S"}
                              onChange={(e) =>
                                setEdicion({ ...edicion, lleva_jugador: e.target.checked ? "S" : "N" })
                              }
                            />
                            Lleva jugador
                          </CheckLabel>
                          <CheckLabel>
                            <input
                              type="checkbox"
                              checked={edicion.es_cambio === "S"}
                              onChange={(e) =>
                                setEdicion({ ...edicion, es_cambio: e.target.checked ? "S" : "N" })
                              }
                            />
                            Es cambio (sale/entra)
                          </CheckLabel>
                          <CheckLabel>
                            <input
                              type="checkbox"
                              checked={edicion.expulsa === "S"}
                              onChange={(e) =>
                                setEdicion({ ...edicion, expulsa: e.target.checked ? "S" : "N" })
                              }
                            />
                            Expulsa al jugador (ej: Tarjeta Roja)
                          </CheckLabel>
                        </FormRow>
                        <FormRow>
                          <SelectDispara
                            value={edicion.dispara_codsuceso}
                            onChange={(e) => setEdicion({ ...edicion, dispara_codsuceso: e.target.value })}
                          >
                            <option value="">No dispara otro suceso</option>
                            {sucesos
                              .filter((o) => o.codsuceso !== s.codsuceso)
                              .map((o) => (
                                <option key={o.codsuceso} value={o.codsuceso}>
                                  Dispara: {o.descripcion}
                                </option>
                              ))}
                          </SelectDispara>
                          {edicion.lleva_resultado === "S" && (
                            <>
                              <CheckLabel>
                                <input
                                  type="checkbox"
                                  checked={edicion.puntos_condicionados === "S"}
                                  onChange={(e) =>
                                    setEdicion({
                                      ...edicion,
                                      puntos_condicionados: e.target.checked ? "S" : "N",
                                    })
                                  }
                                />
                                Puntos solo si el resultado es positivo
                              </CheckLabel>
                              <Input
                                placeholder="Etiqueta positiva (ej: Convertida)"
                                value={edicion.label_positivo}
                                onChange={(e) => setEdicion({ ...edicion, label_positivo: e.target.value })}
                              />
                              <Input
                                placeholder="Etiqueta negativa (ej: Errada)"
                                value={edicion.label_negativo}
                                onChange={(e) => setEdicion({ ...edicion, label_negativo: e.target.value })}
                              />
                              <Input
                                placeholder="Motivo extra si ganó (ej: Penal a favor)"
                                value={edicion.motivo_positivo}
                                onChange={(e) => setEdicion({ ...edicion, motivo_positivo: e.target.value })}
                              />
                              <Input
                                placeholder="Motivo extra si perdió (ej: Penal en contra)"
                                value={edicion.motivo_negativo}
                                onChange={(e) => setEdicion({ ...edicion, motivo_negativo: e.target.value })}
                              />
                              <SelectDispara
                                value={edicion.motivo_dispara_codsuceso}
                                onChange={(e) =>
                                  setEdicion({ ...edicion, motivo_dispara_codsuceso: e.target.value })
                                }
                              >
                                <option value="">El motivo no dispara otro suceso</option>
                                {sucesos.map((o) => (
                                  <option key={o.codsuceso} value={o.codsuceso}>
                                    Motivo dispara: {o.descripcion}
                                  </option>
                                ))}
                              </SelectDispara>
                            </>
                          )}
                          <GuardarBtn onClick={() => handleGuardarEdicion(s.codsuceso)} disabled={guardando}>
                            Guardar
                          </GuardarBtn>
                          <CancelarBtn onClick={cancelarEdicion}>Cancelar</CancelarBtn>
                        </FormRow>
                      </ItemEdicion>
                    ) : (
                      <Item key={s.codsuceso} baja={s.estado !== "A"}>
                        <ItemDescripcion>{s.descripcion}</ItemDescripcion>
                        <ItemPuntos>{s.puntos} pts</ItemPuntos>
                        <ItemTag activo={s.lleva_resultado === "S"}>
                          {s.lleva_resultado === "S" ? "Con resultado" : "Sin resultado"}
                        </ItemTag>
                        <ItemTag activo={s.lleva_jugador === "S"}>
                          {s.lleva_jugador === "S" ? "Con jugador" : "Sin jugador"}
                        </ItemTag>
                        {s.es_cambio === "S" && <ItemTag activo>Sale/entra</ItemTag>}
                        {s.expulsa === "S" && <ItemTag activo>Expulsa al jugador</ItemTag>}
                        {s.puntos_condicionados === "S" && (
                          <ItemTag activo>Puntos si {s.label_positivo || "Ganó"}</ItemTag>
                        )}
                        {(s.motivo_positivo || s.motivo_negativo) && (
                          <ItemTag activo>
                            Motivos: {s.motivo_positivo || "—"} / {s.motivo_negativo || "—"}
                          </ItemTag>
                        )}
                        {s.dispara_codsuceso && (
                          <ItemTag activo>
                            Dispara: {sucesos.find((o) => o.codsuceso === s.dispara_codsuceso)?.descripcion || "?"}
                          </ItemTag>
                        )}
                        {s.motivo_dispara_codsuceso && (
                          <ItemTag activo>
                            Motivo dispara: {sucesos.find((o) => o.codsuceso === s.motivo_dispara_codsuceso)?.descripcion || "?"}
                          </ItemTag>
                        )}
                        {s.estado !== "A" && <ItemBaja>Dado de baja</ItemBaja>}
                        <ItemAcciones>
                          <AccionBtn onClick={() => iniciarEdicion(s)}>Editar</AccionBtn>
                          <AccionBtn onClick={() => handleToggleEstado(s)}>
                            {s.estado === "A" ? "Dar de baja" : "Reactivar"}
                          </AccionBtn>
                        </ItemAcciones>
                      </Item>
                    )
                  )}
                </Lista>
              )}
            </Seccion>
          </>
        )}

        <FooterButtons>
          <BackButton onClick={() => navigate("/dashboard")}>← Volver al Dashboard</BackButton>
        </FooterButtons>
      </Container>
    </>
  );
};

export default SucesosAdmin;

const Container = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
`;

const Title = styled.h2`
  margin-bottom: 4px;
  text-align: center;
`;

const Subtitle = styled.div`
  text-align: center;
  color: #666;
  margin-bottom: 24px;
`;

const Seccion = styled.div`
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
`;

const SeccionTitulo = styled.h3`
  margin: 0 0 14px;
  font-size: 16px;
  color: #333;
`;

const NuevoFormBox = styled.div`
  background: #eef6ff;
  border: 1px solid #c3dbf5;
  border-radius: 10px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const FormRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
`;

const Input = styled.input`
  flex: 1 1 200px;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid #dfe4ea;
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: #4a90e2;
  }
`;

const InputPuntos = styled.input`
  width: 90px;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid #dfe4ea;
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: #4a90e2;
  }
`;

const SelectDispara = styled.select`
  flex: 1 1 220px;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid #dfe4ea;
  font-size: 14px;
  background: white;

  &:focus {
    outline: none;
    border-color: #4a90e2;
  }
`;

const CheckLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #555;
  cursor: pointer;
  white-space: nowrap;
`;

const AgregarBtn = styled.button`
  padding: 10px 18px;
  border-radius: 20px;
  border: none;
  background: #2ecc71;
  color: white;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;

  &:hover {
    background: #27ae60;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const Lista = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Item = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: ${({ baja }) => (baja ? "#f5f5f5" : "#f5f8fc")};
  border-radius: 8px;
  opacity: ${({ baja }) => (baja ? 0.6 : 1)};
`;

const ItemEdicion = styled.div`
  padding: 12px;
  background: #eef6ff;
  border-radius: 8px;
`;

const ItemDescripcion = styled.span`
  font-weight: 700;
  color: #1d3557;
  min-width: 120px;
`;

const ItemPuntos = styled.span`
  font-weight: 600;
  color: #2ecc71;
`;

const ItemTag = styled.span`
  font-size: 12px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 12px;
  color: ${({ activo }) => (activo ? "#1d3557" : "#999")};
  background: ${({ activo }) => (activo ? "#dfe9f7" : "#eee")};
`;

const ItemBaja = styled.span`
  font-size: 12px;
  font-weight: 700;
  color: #e63946;
`;

const ItemAcciones = styled.div`
  margin-left: auto;
  display: flex;
  gap: 8px;
`;

const AccionBtn = styled.button`
  padding: 6px 14px;
  border-radius: 14px;
  border: 1px solid #4a90e2;
  background: transparent;
  color: #4a90e2;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;

  &:hover {
    background: #4a90e2;
    color: white;
  }
`;

const GuardarBtn = styled.button`
  padding: 10px 18px;
  border-radius: 20px;
  border: none;
  background: #4a90e2;
  color: white;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const CancelarBtn = styled.button`
  padding: 10px 18px;
  border-radius: 20px;
  border: 1px solid #999;
  background: transparent;
  color: #555;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 16px;
  color: #999;
`;

const FooterButtons = styled.div`
  display: flex;
  justify-content: center;
  padding: 24px 0;
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

  &:hover {
    background: #4a90e2;
    color: white;
  }
`;
