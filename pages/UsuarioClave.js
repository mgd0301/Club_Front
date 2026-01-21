import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import styled from "styled-components";
import { API_BASE_URL } from '../config';

function useQuery() {
  const hash = window.location.hash; // "#/UsuarioClave?token=123"
  const queryString = hash.includes("?") ? hash.split("?")[1] : "";
  return new URLSearchParams(queryString);
}



export default function UsuarioClave() {

  const query = useQuery();
//const token = query.get("token"); // ✅ token listo para enviar al backend
const token = decodeURIComponent(query.get("token") || "");


  const [persona, setPersona] = useState(null);
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [confirmClave, setConfirmClave] = useState("");
  const [mostrarClave, setMostrarClave] = useState(false);
  const [mostrarConfirmClave, setMostrarConfirmClave] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(true);

// UsuarioClave.jsx

  useEffect(() => {
      if (!token) {
        setMensaje("Token no encontrado");
        setLoading(false);
        return;
      }
    
      const fetchPersona = async () => {
        try {
          // Ya no es necesario el reemplazo manual. El token se envía directo.
          console.log("Token recibido en UsuarioClave:", token);
    
          const resp = await axios.post(`${API_BASE_URL}/invitar/persona`, { token });
    
          if (resp.data?.error) {
            setMensaje(resp.data.error);
            setPersona(null);
          } else if (resp.data?.persona) {
            setPersona(resp.data.persona);
            setMensaje("");
          } else {
            setMensaje("No se encontró la persona");
            setPersona(null);
          }
        } catch (err) {
          console.error("Error al verificar token:", err);
          setMensaje("Token inválido");
          setPersona(null);
        } finally {
          setLoading(false);
        }
      };
    
      fetchPersona();
    }, [token]);
  
  

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!usuario && !persona.email) {
      setMensaje("Debes ingresar un usuario o la persona debe tener email");
      return;
    }

    const regex = /^[A-Za-z0-9!@#$%^&*()_+=\-{}[\]|:;"'<>,.?/~`]+$/;
    if (!regex.test(clave)) {
      setMensaje("La contraseña contiene caracteres no permitidos");
      return;
    }

    if (clave !== confirmClave) {
      setMensaje("Las contraseñas no coinciden");
      return;
    }

    try {
        await axios.post(`${API_BASE_URL}/usuario_clave`, {
          codpersona: persona.codpersona,
          usuario: usuario || null,
          clave,
        });
        

        setMensaje("Usuario creado correctamente");
      } catch (err) {
        setMensaje(err.response?.data?.error || "Error al crear usuario");
        
      }

  };

  if (loading) return <p>Cargando...</p>;
  if (!persona) return <p>{mensaje}</p>;

  return (
    <Container>
      <Title>Crear Usuario</Title>

      <Label><strong>Nombre:</strong> {persona.nombre}</Label>
      <Label><strong>Apodo:</strong> {persona.apodo}</Label>
      <Label><strong>Email:</strong> {persona.email}</Label>

      <Form onSubmit={handleSubmit}>
        <InputGroup>
          <InputLabel>Usuario:</InputLabel>
          <Input
            type="text"
            placeholder="Opcional"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
          />
        </InputGroup>

        <InputGroup>
          <InputLabel>Contraseña:</InputLabel>
          <PasswordWrapper>
            <Input
              type={mostrarClave ? "text" : "password"}
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              required
              placeholder="Letras, números y caracteres especiales"
            />
            <ToggleButton type="button" onClick={() => setMostrarClave(!mostrarClave)}>
              {mostrarClave ? "🙈" : "👁️"}
            </ToggleButton>
          </PasswordWrapper>
        </InputGroup>

        <InputGroup>
          <InputLabel>Confirmar Contraseña:</InputLabel>
          <PasswordWrapper>
            <Input
              type={mostrarConfirmClave ? "text" : "password"}
              value={confirmClave}
              onChange={(e) => setConfirmClave(e.target.value)}
              required
              placeholder="Letras, números y caracteres especiales"
            />
            <ToggleButton type="button" onClick={() => setMostrarConfirmClave(!mostrarConfirmClave)}>
              {mostrarConfirmClave ? "🙈" : "👁️"}
            </ToggleButton>
          </PasswordWrapper>
        </InputGroup>

        <Button type="submit">Crear Usuario</Button>
      </Form>

      {mensaje && <Mensaje>{mensaje}</Mensaje>}
    </Container>
  );
}


// ===== Styled Components =====
const Container = styled.div`
  max-width: 400px;
  margin: 2rem auto;
  padding: 2rem;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 3px 12px rgba(0,0,0,0.15);
  @media (max-width: 480px) {
    padding: 1rem;
    margin: 1rem;
  }
`;

const Title = styled.h2`
  text-align: center;
  margin-bottom: 1rem;
  color: #333;
`;

const Label = styled.p`
  font-size: 16px;
  margin: 6px 0;
  color: #555;
  font-weight: bold;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
`;

const InputLabel = styled.label`
  margin-bottom: 4px;
  font-weight: bold;
  color: #333;
`;

const PasswordWrapper = styled.div`
  display: flex;
  align-items: center;
`;

const Input = styled.input`
  flex: 1;
  padding: 10px;
  border-radius: 6px;
  border: 1px solid #ccc;
  font-size: 15px;
  outline: none;
  &:focus { border-color: #1877f2; }
`;

const ToggleButton = styled.button`
  margin-left: 8px;
  padding: 0 8px;
  border: none;
  background: none;
  font-size: 18px;
  cursor: pointer;
`;

const Button = styled.button`
  margin-top: 10px;
  padding: 12px;
  background: #1877f2;
  color: #fff;
  font-weight: 600;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.3s;
  &:hover { background: #166fe5; }
`;

const Mensaje = styled.p`
  margin-top: 12px;
  color: red;
  font-weight: 500;
  text-align: center;
`;
