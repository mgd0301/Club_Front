// src/pages/Invitaciones.jsx
import { useEffect, useState, useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { API_BASE_URL } from "../config";
import styled from "styled-components";
import { useNavigate, useLocation } from 'react-router-dom';
import axios from "axios";

const Invitaciones = () => {
  const { currentUser } = useContext(AuthContext);
  const [personas, setPersonas] = useState([]);
  const [destinos, setDestinos] = useState({});
  const navigate = useNavigate();
  const location = useLocation();
  // ===========================
  // TRAER PERSONAS SIN USUARIO
  // ===========================
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
  
        // 1️⃣ Primero traemos los grupos del usuario logueado
        const respGrupos = await fetch(`${API_BASE_URL}/grupos_persona`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            codpersona: currentUser.codpersona,
            codgrupo: currentUser.codgrupo 
          }),
        });
  
        const dataGrupos = await respGrupos.json();
        if (!dataGrupos.length) return;
  
        const codgrupo = dataGrupos[0].codgrupo; // 👈 usamos el primer grupo
  
        // 2️⃣ Ahora traemos las personas de ese grupo
        const respPersonas = await fetch(`${API_BASE_URL}/Personas_grupo`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ codgrupo }),
        });
  
        const lista = await respPersonas.json();
        //setPersonas(lista);
        setPersonas(Array.isArray(lista) ? lista : []);

      } catch (error) {
        console.log("Error:", error);
      }
    };
  
    if (currentUser) fetchData();
  }, [currentUser]);
  

  const handleDestinoChange = (codpersona, value) => {
    setDestinos((prev) => ({ ...prev, [codpersona]: value }));
  };

  return (
    <Container>
      <Titulo>Invitar Personas</Titulo>
      <GeneralButton onClick={() => navigate("/Dashboard")} >Atras</GeneralButton>
      {personas.length === 0 && (
        <Mensaje>No hay personas pendientes de invitación</Mensaje>
      )}

      {console.log(personas)}
      {
      
      personas.map((p) => (
        <Item key={p.codpersona}>
          


          <Nombre>{p.apodo?.trim() || p.persona}</Nombre>




          <Input
              placeholder="Email"
              autoComplete="new-email"
              value={
                destinos[p.codpersona] !== undefined
                  ? destinos[p.codpersona]
                  : (p.email || "")
              }
              onChange={(e) => handleDestinoChange(p.codpersona, e.target.value)}
            />



<EnviarBtn
onClick={async () => {
 try {
 const emailDestino = destinos[p.codpersona]?.trim() || "";

   if (!emailDestino) {
        alert("Debe ingresar un email para enviar la invitación");
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailDestino)) {
        alert("El email ingresado no es válido");
        return;
      }

      const resp = await axios.post(`${API_BASE_URL}/generar_token_invitacion`, {
        email: emailDestino
      });

      const token = resp.data.token;
      console.log("Token generado:", token);

      // 🔑 CAMBIO CLAVE: Usar encodeURIComponent() al construir el link
      const baseUrl = window.location.origin;
      const link = `${baseUrl}/#/UsuarioClave?token=${encodeURIComponent(token)}`;

      await navigator.clipboard.writeText(link);
      console.log("LINK COPIADO:", link);
      alert("Link copiado al portapapeles");

    } catch (err) {
      console.error("Error generando token de invitación:", err);
      if (err.response?.data?.error) {
        alert(err.response.data.error);
      } else {
        alert("No se pudo generar el token");
      }
    }
  }}
>
  Enviar
</EnviarBtn>






        </Item>
      ))}
    </Container>
  );
};

export default Invitaciones;

/* ===========================
   STYLED COMPONENTS
=========================== */

const Container = styled.div`
  width: 100%;
  padding: 20px;
  max-width: 650px;
  margin: auto;
  font-family: sans-serif;
`;

const Titulo = styled.h2`
  margin-bottom: 20px;
  text-align: center;
  color: #1877f2;
`;

const Mensaje = styled.div`
  padding: 15px;
  background: #eee;
  text-align: center;
  border-radius: 8px;
`;

const Item = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: #fafafa;
  border-radius: 8px;
  margin-bottom: 10px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.08);

  /* Mobile */
  @media (max-width: 600px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const Nombre = styled.div`
  font-weight: bold;
  flex: 1;
  color: #333;

  @media (max-width: 600px) {
    text-align: center;
  }
`;

const Input = styled.input`
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 6px;
  width: 180px;

  @media (max-width: 600px) {
    width: 100%;
  }
`;

const EnviarBtn = styled.button`
  padding: 8px 12px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    background: #218838;
  }

  @media (max-width: 600px) {
    width: 100%;
  }
`;


const GeneralButton = styled.button`
  padding: 0.6rem 1.2rem;
  background:rgb(68, 43, 207);
  border: none;
  border-radius: 6px;
  color: white;
  font-weight: bold;
  cursor: pointer;
  width: 100%;
  max-width: 100px;

  &:hover {
    background:rgb(228, 34, 34);
  }

  &:disabled {
    background: #6c757d;
    cursor: not-allowed;
  }
`;