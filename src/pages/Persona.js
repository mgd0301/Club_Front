import React, { useContext, useState, useEffect } from "react";
import styled from "styled-components";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";
import { API_BASE_URL } from "../config";
import Header from "../components/Common/Header";
import Container80 from "../components/Common/Container80";

import {
  FaUser,
  FaIdCard,
  FaCalendarAlt,
  FaEnvelope,
  FaPhone,
  FaPalette,
  FaArrowLeft,
  FaSave,
  FaUsers,
  FaSpinner,
  FaLock
} from "react-icons/fa";

import { MdEmail } from "react-icons/md";

const Persona = () => {

  const location = useLocation();
  const navigate = useNavigate();

  const { currentClub, currentDisciplina } = useContext(AuthContext);

  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [error,setError] = useState(null);

  const [divisionesDisponibles,setDivisionesDisponibles] = useState([]);
  const [rolesDisponibles,setRolesDisponibles] = useState([]);

  const [nuevaDivision,setNuevaDivision] = useState("");
  const [nuevoRol,setNuevoRol] = useState("");

  const [formData,setFormData] = useState({
    codpersona:"",
    nombre:"",
    apodo:"",
    dni:"",
    fecha_nacimiento:"",
    email:"",
    telefono:"",
    usuario:"",
    clave:"",
    repetir_clave:"",
    activo:1,
    color:"#000000",
    estado:1,
    tipo_usuario:"Jugador",
    divisiones:[]
  });

  const divisionesFiltradas = divisionesDisponibles.filter(div =>
    !formData.divisiones.some(d => d.coddivision == div.coddivision)
  );

  useEffect(()=>{

    if(!currentDisciplina) return;

    cargarDivisiones();
    cargarRoles();

    const codpersona = location.state?.codpersona;

    if(codpersona){
      fetchPersonaDetalle(codpersona);
    }else{
      setLoading(false);
    }

  },[location.state,currentDisciplina]);

  const cargarDivisiones = async ()=>{

    try{

      const response = await axios.post(
        `${API_BASE_URL}/divisiones_disciplina`,
        {
          coddisciplina: currentDisciplina?.coddisciplina,
          codclub: currentClub?.codclub
        },
        {
          headers:{ Authorization:`Bearer ${localStorage.getItem("token")}` }
        }
      );

      setDivisionesDisponibles(response.data);

    }catch(err){
      console.error(err);
    }

  };

  const cargarRoles = async ()=>{

    try{

      const response = await axios.post(
        `${API_BASE_URL}/roles_por_club`,
        { codclub: currentClub?.codclub },
        {
          headers:{ Authorization:`Bearer ${localStorage.getItem("token")}` }
        }
      );

      setRolesDisponibles(response.data);

    }catch(err){
      console.error(err);
    }

  };

  const fetchPersonaDetalle = async (codpersona)=>{

    try{

      const response = await axios.post(
        `${API_BASE_URL}/persona_detalle`,
        { codpersona },
        {
          headers:{ Authorization:`Bearer ${localStorage.getItem("token")}` }
        }
      );

      const p = response.data;
      console.log(p);
      setFormData({
        codpersona:p.codpersona || "",
        nombre:p.nombre || "",
        apodo:p.apodo || "",
        dni:p.dni || "",
        fecha_nacimiento:p.fecha_nacimiento ? p.fecha_nacimiento.split("T")[0] : "",
        email:p.email || "",
        telefono:p.telefono || "",
        usuario:p.usuario || "",
        clave:p.clave || "",
        repetir_clave:p.clave || "",
        activo:p.activo ?? 1,
        color:p.color || "#000000",
        estado:p.estado || 1,
        tipo_usuario:p.tipo_usuario || "Jugador",
        divisiones:p.divisiones || []
      });

    }catch(err){
      setError("Error cargando persona");
    }finally{
      setLoading(false);
    }

  };

  const handleInputChange = (e)=>{

    const {name,value} = e.target;

    setFormData(prev=>({
      ...prev,
      [name]:value
    }));

  };

  const agregarDivision = ()=>{

    if(!nuevaDivision || !nuevoRol) return;

    const division = divisionesDisponibles.find(d=>d.coddivision==nuevaDivision);
    const rol = rolesDisponibles.find(r=>r.codrol==nuevoRol);

    const nueva = {
      coddivision:nuevaDivision,
      descripcion:division?.descripcion,
      codrol:nuevoRol,
      rol:rol?.descripcion
    };

    setFormData(prev=>({
      ...prev,
      divisiones:[...prev.divisiones,nueva]
    }));

    setNuevaDivision("");
    setNuevoRol("");

  };

  const eliminarDivision = (index)=>{

    const nuevas = [...formData.divisiones];
    nuevas.splice(index,1);

    setFormData(prev=>({
      ...prev,
      divisiones:nuevas
    }));

  };

  const handleSave = async ()=>{

    if(formData.clave !== formData.repetir_clave){
      alert("Las contraseñas no coinciden");
      return;
    }

    try{

      setSaving(true);
      console.log(formData);
      await axios.post(
        `${API_BASE_URL}/persona_guardar`,
        {
          ...formData,
          codclub: currentClub?.codclub,
          coddisciplina: currentDisciplina?.coddisciplina
        },
        {
          headers:{ Authorization:`Bearer ${localStorage.getItem("token")}` }
        }
      );

      navigate("/dashboard");

    }catch(err){

          console.error(err);

          const mensaje = err.response?.data?.mensaje || "Error guardando";

          setError(mensaje);

          // 🔥 OPCIONAL PRO: si viene codpersona existente
          const codExistente = err.response?.data?.codpersona_existente;

          if (codExistente) {

            const ir = window.confirm(
              mensaje + "\n\n¿Querés ir a esa persona?"
            );

            if (ir) {
              navigate("/persona", {
                state: { codpersona: codExistente }
              });
            }}

    }finally{
      setSaving(false);
    }

  };

  if(loading){

    return(
      <Container80>
        <Header/>
        <LoadingContainer>
          <Spinner><FaSpinner/></Spinner>
          <p>Cargando...</p>
        </LoadingContainer>
      </Container80>
    );

  }

  return(

    <Container80>

      <Header/>

      <NavigationBar>

        <BackButton onClick={()=>navigate("/dashboard")}>
          <FaArrowLeft/> Volver
        </BackButton>

        <PageTitle>
          {formData.codpersona ? "Editar Persona" : "Nueva Persona"}
        </PageTitle>

        <SaveButton onClick={handleSave} disabled={saving}>
          {saving ? <FaSpinner className="spin"/> : <FaSave/>}
          Guardar
        </SaveButton>

      </NavigationBar>

      <ContentContainer>

        <InfoGrid>

          <InfoCard>

            <CardTitle>
              <FaIdCard/> Información
            </CardTitle>

            <InputRow>
              <Label>Nombre</Label>
              <Input name="nombre" value={formData.nombre} onChange={handleInputChange}/>
            </InputRow>

            <InputRow>
              <Label>Apodo</Label>
              <Input name="apodo" value={formData.apodo} onChange={handleInputChange}/>
            </InputRow>

            <InputRow>
              <Label>DNI</Label>
              <Input name="dni" value={formData.dni} onChange={handleInputChange}/>
            </InputRow>

            <InputRow>
              <Label>Fecha nacimiento</Label>
              <Input type="date" name="fecha_nacimiento" value={formData.fecha_nacimiento} onChange={handleInputChange}/>
            </InputRow>

            <InputRow>
              <Label>Activo</Label>
              <Select name="activo" value={formData.activo} onChange={handleInputChange}>
                <option value={1}>Activo</option>
                <option value={0}>Inactivo</option>
                <option value={2}>Lesionado</option>
                <option value={3}>Suspendido</option>
                <option value={4}>Viaje</option>
                <option value={5}>Enfermo</option>
                
              </Select>
            </InputRow>

          </InfoCard>

          <InfoCard>

            <CardTitle>
              <MdEmail/> Contacto
            </CardTitle>

            <InputRow>
              <Label>Email</Label>
              <Input name="email" value={formData.email} onChange={handleInputChange}/>
            </InputRow>

            <InputRow>
              <Label>Teléfono</Label>
              <Input name="telefono" value={formData.telefono} onChange={handleInputChange}/>
            </InputRow>

          </InfoCard>

          <InfoCard>

            <CardTitle>
              <FaLock/> Usuario
            </CardTitle>

            <InputRow>
              <Label>Usuario</Label>
              <Input name="usuario" value={formData.usuario} onChange={handleInputChange} autoComplete="new-username"/>
            </InputRow>

            <InputRow>
              <Label>Contraseña</Label>
              <Input type="password" name="clave" value={formData.clave} onChange={handleInputChange} autoComplete="new-password"/>
            </InputRow>

            <InputRow>
              <Label>Repetir contraseña</Label>
              <Input type="password" name="repetir_clave" value={formData.repetir_clave} onChange={handleInputChange} autoComplete="new-password"/>
            </InputRow>

          </InfoCard>

        </InfoGrid>

        <DivisionesCard>

          <CardTitle>
            <FaUsers/> Divisiones
          </CardTitle>

          <DivisionesList>

            {formData.divisiones.map((div,index)=>(

              <DivisionItem key={index}>

                <DivisionNombre>
                  {div.descripcion}
                </DivisionNombre>

                <div style={{display:"flex",gap:"10px"}}>

                  <RolBadge>
                    {div.rol}
                  </RolBadge>

                  <DeleteButton onClick={()=>eliminarDivision(index)}>
                    ✕
                  </DeleteButton>

                </div>

              </DivisionItem>

            ))}

          </DivisionesList>

          <AddRow>

            <Select
              value={nuevaDivision}
              onChange={(e)=>setNuevaDivision(e.target.value)}
            >
              <option value="">División</option>

              {divisionesFiltradas.map(div=>(
                <option key={div.coddivision} value={div.coddivision}>
                  {div.descripcion}
                </option>
              ))}

            </Select>

            <Select
              value={nuevoRol}
              onChange={(e)=>setNuevoRol(e.target.value)}
            >
              <option value="">Rol</option>

              {rolesDisponibles.map(rol=>(
                <option key={rol.codrol} value={rol.codrol}>
                  {rol.descripcion}
                </option>
              ))}

            </Select>

            <AddButton
              onClick={agregarDivision}
              disabled={!nuevaDivision || !nuevoRol}
            >
              + Agregar
            </AddButton>

          </AddRow>

        </DivisionesCard>

      </ContentContainer>

    </Container80>

  );

};

export default Persona;

const NavigationBar = styled.div`
display:flex;
justify-content:space-between;
align-items:center;
margin:20px 0;
`;

const PageTitle = styled.h2`
margin:0;
`;

const BackButton = styled.button`
padding:8px 14px;
background:#6c757d;
color:white;
border:none;
border-radius:6px;
cursor:pointer;
display:flex;
gap:6px;
align-items:center;
`;

const SaveButton = styled.button`
padding:8px 14px;
background:#007bff;
color:white;
border:none;
border-radius:6px;
cursor:pointer;
display:flex;
gap:6px;
align-items:center;
`;


const ContentContainer = styled.div`
  background:#f8f9fa;
  padding:20px;
  border-radius:10px;
  min-height:600px; // 👈 esto le da aire
`;

const InfoGrid = styled.div`
display:grid;
grid-template-columns:1fr 1fr;
gap:20px;
`;

const InfoCard = styled.div`
background:white;
padding:20px;
border-radius:10px;
`;

const CardTitle = styled.h3`
margin-bottom:12px;
display:flex;
align-items:center;
gap:6px;
`;

const InputRow = styled.div`
display:flex;
flex-direction:column;
margin-bottom:10px;
`;

const Label = styled.label`
font-size:13px;
color:#666;
`;

const Input = styled.input`
padding:6px;
border:1px solid #ccc;
border-radius:6px;
`;

const Select = styled.select`
padding:6px;
border:1px solid #ccc;
border-radius:6px;
`;


const DivisionesCard = styled(InfoCard)`
  margin-top:20px;
  max-width:500px;
  margin-bottom:200px; // 👈 hack rápido
`;

const DivisionesList = styled.div`
display:flex;
flex-direction:column;
gap:6px;
`;

const DivisionItem = styled.div`
display:flex;
justify-content:space-between;
padding:8px;
background:#f1f3f5;
border-radius:6px;
`;

const DivisionNombre = styled.span`
font-weight:500;
`;

const RolBadge = styled.span`
padding:2px 8px;
border-radius:12px;
font-size:12px;
background:#e2e3e5;
`;

const AddRow = styled.div`
display:flex;
gap:10px;
margin-top:10px;
`;

const AddButton = styled.button`
padding:6px 10px;
border:2px dashed #28a745;
background:white;
color:#28a745;
border-radius:6px;
cursor:pointer;

:disabled{
opacity:0.4;
cursor:not-allowed;
}
`;

const DeleteButton = styled.button`
border:none;
background:transparent;
color:#dc3545;
cursor:pointer;
`;

const LoadingContainer = styled.div`
display:flex;
flex-direction:column;
align-items:center;
padding:40px;
`;

const Spinner = styled.div`
font-size:30px;
animation:spin 1s linear infinite;

@keyframes spin{
0%{transform:rotate(0deg)}
100%{transform:rotate(360deg)}
}
`;