// AdministrarDivisiones.jsx
import React, { useEffect, useState, useContext, useCallback } from "react";
import { AuthContext } from "../contexts/AuthContext";
import styled from "styled-components";
import Header from "../components/Common/Header";
import { API_BASE_URL } from "../config";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";

const FORM_VACIO = {
  coddivision: 0,
  descripcion: "",
  coddivision_padre: "",
  estado: "A"
};

const AdministrarDivisiones = () => {
  const { currentClub, currentDisciplina } = useContext(AuthContext);
  const navigate = useNavigate();

  const [divisiones, setDivisiones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);

  const token = localStorage.getItem("token");

  const cargarDivisiones = useCallback(async () => {
    if (!currentClub?.codclub || !currentDisciplina?.coddisciplina) return;

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
      setDivisiones(data);
    } catch (error) {
      console.error("Error cargando divisiones:", error);
      Swal.fire({
        title: "Error",
        text: "No se pudieron cargar las divisiones",
        icon: "error",
        timer: 2000
      });
    } finally {
      setCargando(false);
    }
  }, [currentClub, currentDisciplina, token]);

  useEffect(() => {
    setCargando(true);
    cargarDivisiones();
  }, [cargarDivisiones]);

  const padres = divisiones.filter((d) => !d.coddivision_padre);
  const hijosDe = (coddivision) =>
    divisiones.filter((d) => d.coddivision_padre === coddivision);

  const abrirNueva = (coddivisionPadre = "") => {
    setForm({ ...FORM_VACIO, coddivision_padre: coddivisionPadre });
  };

  const abrirEditar = (division) => {
    setForm({
      coddivision: division.coddivision,
      descripcion: division.descripcion,
      coddivision_padre: division.coddivision_padre || "",
      estado: division.estado || "A"
    });
  };

  const guardar = async (e) => {
    e.preventDefault();

    if (!form.descripcion.trim()) {
      Swal.fire({
        title: "Falta el nombre",
        text: "Ingrese una descripción para la división",
        icon: "warning",
        timer: 2000
      });
      return;
    }

    setGuardando(true);

    try {
      const res = await fetch(`${API_BASE_URL}/division_guardar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          coddivision: form.coddivision,
          descripcion: form.descripcion.trim(),
          coddisciplina: currentDisciplina.coddisciplina,
          codclub: currentClub.codclub,
          coddivision_padre: form.coddivision_padre || null,
          estado: form.estado
        })
      });

      const data = await res.json();

      if (!res.ok) {
        Swal.fire({
          title: "No se pudo guardar",
          text: data.mensaje || "Error desconocido",
          icon: "error"
        });
        return;
      }

      await Swal.fire({
        title: "¡Listo!",
        text: "División guardada correctamente",
        icon: "success",
        timer: 1500,
        showConfirmButton: false
      });

      setForm(FORM_VACIO);
      await cargarDivisiones();
    } catch (error) {
      console.error("Error guardando división:", error);
      Swal.fire({
        title: "Error",
        text: "No se pudo guardar la división",
        icon: "error"
      });
    } finally {
      setGuardando(false);
    }
  };

  const darDeBaja = async (division) => {
    const result = await Swal.fire({
      title: "¿Dar de baja?",
      html: `¿Dar de baja la división <strong>${division.descripcion}</strong>?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Sí, dar de baja",
      cancelButtonText: "Cancelar"
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`${API_BASE_URL}/divisiones_baja`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ coddivision: division.coddivision })
      });

      const data = await res.json();

      if (!res.ok) {
        Swal.fire({
          title: "No se pudo dar de baja",
          text: data.mensaje || "Error desconocido",
          icon: "error"
        });
        return;
      }

      if (form.coddivision === division.coddivision) {
        setForm(FORM_VACIO);
      }
      await cargarDivisiones();
    } catch (error) {
      console.error("Error dando de baja división:", error);
      Swal.fire({
        title: "Error",
        text: "No se pudo dar de baja la división",
        icon: "error"
      });
    }
  };

  const volverAlDashboard = () => navigate("/dashboard");

  if (cargando) {
    return (
      <>
        <Header />
        <LoadingContainer>
          <LoadingSpinner />
          <p>Cargando divisiones...</p>
        </LoadingContainer>
      </>
    );
  }

  if (!currentClub || !currentDisciplina) {
    return (
      <>
        <Header />
        <EmptyStateContainer>
          <h3>Seleccione un club y disciplina primero</h3>
          <p>Vuelva al dashboard y seleccione un club y disciplina.</p>
          <BackButton onClick={volverAlDashboard} style={{ marginTop: "20px" }}>
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
        {/* COLUMNA 1: árbol de divisiones */}
        <Column>
          <Title>
            Divisiones
            <span style={{ fontSize: "12px", fontWeight: "normal", marginLeft: "8px", color: "#666" }}>
              ({currentDisciplina.descripcion})
            </span>
          </Title>

          <Button onClick={() => abrirNueva()}>+ Nueva categoría</Button>

          <DivisionTree>
            {padres.length === 0 ? (
              <EmptyListItem>No hay divisiones cargadas todavía</EmptyListItem>
            ) : (
              padres.map((padre) => (
                <div key={padre.coddivision}>
                  <DivisionRow nivel={0}>
                    <DivisionNombre onClick={() => abrirEditar(padre)}>
                      {padre.descripcion}
                    </DivisionNombre>
                    <RowActions>
                      <SmallLink onClick={() => abrirNueva(padre.coddivision)}>
                        + sub-división
                      </SmallLink>
                      <RemoveButton
                        onClick={() => darDeBaja(padre)}
                        title="Dar de baja"
                      >
                        ✕
                      </RemoveButton>
                    </RowActions>
                  </DivisionRow>

                  {hijosDe(padre.coddivision).map((hijo) => (
                    <DivisionRow nivel={1} key={hijo.coddivision}>
                      <DivisionNombre onClick={() => abrirEditar(hijo)}>
                        {hijo.descripcion}
                      </DivisionNombre>
                      <RowActions>
                        <RemoveButton
                          onClick={() => darDeBaja(hijo)}
                          title="Dar de baja"
                        >
                          ✕
                        </RemoveButton>
                      </RowActions>
                    </DivisionRow>
                  ))}
                </div>
              ))
            )}
          </DivisionTree>
        </Column>

        {/* COLUMNA 2: formulario crear/editar */}
        <Column>
          <Title>
            {form.coddivision ? "Editar división" : "Nueva división"}
          </Title>

          <Form onSubmit={guardar}>
            <Label>Nombre:</Label>
            <TextInput
              type="text"
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              placeholder="Ej: M14, Reserva, M14-A..."
            />

            <Label>Es sub-división de:</Label>
            <Select
              value={form.coddivision_padre}
              onChange={(e) => setForm({ ...form, coddivision_padre: e.target.value })}
            >
              <option value="">Ninguna (es una categoría principal)</option>
              {padres
                .filter((p) => p.coddivision !== form.coddivision)
                .map((p) => (
                  <option key={p.coddivision} value={p.coddivision}>
                    {p.descripcion}
                  </option>
                ))}
            </Select>

            <ButtonGroup>
              <Button type="submit" disabled={guardando}>
                {guardando ? "Guardando..." : "💾 Guardar"}
              </Button>
              {form.coddivision !== 0 && (
                <Button type="button" secondary onClick={() => setForm(FORM_VACIO)}>
                  Cancelar
                </Button>
              )}
            </ButtonGroup>
          </Form>

          <InfoBox>
            <strong>📝 Cómo funciona:</strong>
            <ul>
              <li>Una categoría principal (ej: M14) puede tener sub-divisiones (ej: M14-A, M14-B).</li>
              <li>No se permite anidar más de un nivel.</li>
              <li>Una división con sub-divisiones activas no se puede dar de baja.</li>
            </ul>
          </InfoBox>
        </Column>
      </Container>

      <FooterButtons>
        <BackButton onClick={volverAlDashboard}>← Volver al Dashboard</BackButton>
      </FooterButtons>
    </>
  );
};

export default AdministrarDivisiones;

// ========== STYLED COMPONENTS ==========
const Container = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  width: 100%;
  padding: 20px;
  max-width: 1000px;
  margin: 0 auto;

  @media (max-width: 900px) {
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
`;

const Title = styled.h3`
  margin-bottom: 16px;
  font-size: 18px;
  font-weight: 600;
  color: #333;
  padding-bottom: 8px;
  border-bottom: 2px solid #4a90e2;
`;

const DivisionTree = styled.div`
  margin-top: 16px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  overflow: hidden;
`;

const DivisionRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  padding-left: ${(props) => 12 + props.nivel * 24}px;
  border-bottom: 1px solid #f0f0f0;
  background: ${(props) => (props.nivel > 0 ? "#fafbfc" : "#fff")};

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: #f5f8fc;
  }
`;

const DivisionNombre = styled.span`
  cursor: pointer;
  font-weight: ${(props) => (props.nivel > 0 ? "400" : "600")};
  color: #333;

  &:hover {
    color: #4a90e2;
  }
`;

const RowActions = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const SmallLink = styled.span`
  font-size: 12px;
  color: #4a90e2;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`;

const EmptyListItem = styled.div`
  padding: 20px;
  text-align: center;
  color: #999;
  font-size: 14px;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 4px;
  font-size: 13px;
  font-weight: 600;
  color: #555;
`;

const TextInput = styled.input`
  width: 100%;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid #ddd;
  margin-bottom: 14px;
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: #4a90e2;
  }
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

const ButtonGroup = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 4px;
`;

const Button = styled.button`
  padding: 12px;
  border-radius: 8px;
  border: none;
  background-color: ${(props) => (props.disabled ? "#ccc" : props.secondary ? "#6c757d" : "#4a90e2")};
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
  transition: 0.2s ease;
  flex: 1;
  margin-bottom: 16px;

  &:hover:not(:disabled) {
    background-color: ${(props) => (props.secondary ? "#5a6268" : "#357abd")};
    transform: translateY(-1px);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }
`;

const RemoveButton = styled.button`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: #dc3545;
  color: white;
  font-size: 13px;
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
  margin-top: 8px;
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
  width: 50px;
  height: 50px;
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
