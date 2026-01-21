// src/pages/Persona.js
import React, { useState, useContext, useEffect, useRef } from "react";
import styled from "styled-components";
import { AuthContext } from "../contexts/AuthContext";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { FaFutbol } from "react-icons/fa";
import { API_BASE_URL } from '../config';
import axios from "axios";

const Persona = () => {
  const [loading, setLoading] = useState(false);
  const { currentUser, setCurrentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [localidades, setLocalidades] = useState([]);
  const [asocGrupo, setAsocGrupo] = useState(false);

  
  const nombreRef = useRef();
  const emailRef = useRef();
  const telefonoRef = useRef();
  const usuarioRef = useRef();
  const passwordRef = useRef();
  const password2Ref = useRef();

  const [errores, setErrores] = useState({});
  const { codpersona } = useParams();
  const { state } = useLocation();

  const codgrupo = state?.codgrupo;
  const grupo = state?.grupo;

  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({
    codigo: 0,
    nombre: "",
    telefono: "",
    email: "",
    sexo: "M",
    fechanacimiento: "",
    localidad: "",
    estado: "1",
    apodo: "",
    peso: "",
    altura: "",
    posiciones: [],
    usuario: "",
    password: "",
    password2: "",
    tipousuario: "2",
    fotoperfil: "",
  });

  useEffect(() => {
    if (!isNaN(codgrupo) && Number(codgrupo) > 0) {
      setAsocGrupo(true);
    }
  }, []);

  
  // ====== Fetch Persona ======
  useEffect(() => {
    if (codpersona) {
      const fetchPersona = async () => {
        try {
          const token = localStorage.getItem("token");
          
          

          const res = await axios.post(
            `${API_BASE_URL}/Persona`,
            { codpersona },
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (res.data && res.data.length > 0) {
            const persona = res.data[0];

            const safeData = {
              ...persona,
              codigo: persona.codpersona,
              nombre: persona.nombre || "",
              telefono: persona.telefono || "",
              email: persona.email || "",
              usuario: persona.usuario || "",
              password: persona.password || "", // Agrega esta línea para establec
              password2: persona.password || "",
              apodo: persona.apodo || "",
              sexo: persona.sexo || "M",
              fotoperfil: persona.fotoperfil || "",
              localidad: persona.localidad || "",
              fechanacimiento: persona.fechanacimiento || "",
              posiciones: persona.posiciones || [],
              tipousuario: String(persona.tipousuario || "2"),
              estado: persona.estado || "1",
              peso: persona.peso || "",
              altura: persona.altura || "",
            };

            setFormData((prev) => ({
              ...prev,
              ...safeData,
              codigo: safeData.codpersona,
              tipousuario: safeData.tipousuario === "1" ? "1" : "2",
            }));
            console.log("Persona cargada:", persona);

            
          }
        } catch (err) {
          console.error("Error cargando persona:", err);
          alert("No se pudo cargar la persona");
        }
      };

      fetchPersona();
    }
  }, [codpersona]);

  // ====== Fetch Localidades ======
  useEffect(() => {
    const fetchLocalidades = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(`${API_BASE_URL}/localidades`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setLocalidades(response.data);

        // Intentar detectar la localidad del usuario
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            try {
              const res = await axios.get(
                `${API_BASE_URL}/geo-reverse`,
                {
                  params: { lat: latitude, lon: longitude },
                  headers: { Authorization: `Bearer ${token}` }
                }
              );
              

              const normalizar = (str) =>
                str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

              const localidadDetectada =
                res.data.address.city ||
                res.data.address.town ||
                res.data.address.village ||
                res.data.address.county;

                console.log("Localidad detectada:", localidadDetectada);
              if (localidadDetectada) {
                const localidadClean = normalizar(localidadDetectada);
                const match = response.data.find(
                  (loc) => normalizar(loc.localidad) === localidadClean
                );
                if (match) {
                  setFormData((prev) => ({ ...prev, localidad: match.localidad }));
                }
              }
            } catch (error) {
              console.error("Error al obtener localidad desde Nominatim:", error);
            }
          }, (error) => {
            console.error("Error al obtener ubicación:", error);
          });
        }
      } catch (error) {
        console.error("Error fetching localidades:", error);
      }
    };
    fetchLocalidades();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validarCampos = () => {
    const erroresTemp = {};
    if (!formData.nombre.trim()) erroresTemp.nombre = "Nombre obligatorio";
    if (formData.email && !/^\S+@\S+\.\S+$/.test(formData.email))
      erroresTemp.email = "Email inválido";
    if (formData.telefono && !/^\d+$/.test(formData.telefono))
      erroresTemp.telefono = "Teléfono inválido";
    if (formData.usuario) {
      if (!formData.password) erroresTemp.password = "Contraseña obligatoria";
      if (formData.password !== formData.password2)
        erroresTemp.password2 = "Las contraseñas no coinciden";
    }
    setErrores(erroresTemp);

    if (erroresTemp.nombre) nombreRef.current.focus();
    else if (erroresTemp.email) emailRef.current.focus();
    else if (erroresTemp.telefono) telefonoRef.current.focus();
    else if (erroresTemp.password) passwordRef.current.focus();
    else if (erroresTemp.password2) password2Ref.current.focus();

    return Object.keys(erroresTemp).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    console.log("por validar");
    if (!validarCampos()) return;
    console.log("Valido !!");
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      //console.log(Number(formData.codigo));

      console.log("Se envia..." + asocGrupo);
      if (!asocGrupo){
        codgrupo=0;
      }
      console.log("Enviando..." + codgrupo);
      
      const body = {
        codpersona: Number(formData.codigo) || 0,
        nombre: formData.nombre,
        email: formData.email,
        telefono: formData.telefono,
        password: formData.password,
        apodo: formData.apodo,
        color: "#1877f2",
        codgrupo: codgrupo,
        codlocalidad: localidades.find(l => l.localidad === formData.localidad)?.codlocalidad,
        fotoperfil: formData.fotoperfil,
        usuario: formData.usuario,
        fechanacimiento: formData.fechanacimiento,
        sexo: formData.sexo,
        instagram: "",
        facebook: "",
        tipousuario: formData.tipousuario,
        estado: formData.estado,
      };
      

      const res = await axios.post(`${API_BASE_URL}/nuevaPersona`, body, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("Persona guardada:", res.data);
      //ert("Persona guardada correctamente");
      navigate("/dashboard?tab=personas");

    } catch (error) {
      console.error("Error guardando persona:", error);
      alert("Error al guardar la persona");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckboxChange = (e) => {
    setFormData({
      ...formData,
      tipousuario: e.target.checked ? "1" : "2"
    });
  };

  return (
    <Container>
      <Header>
        <CenterSection>
          <Deporte>
            <FaFutbol size={30} color="#1877f2" />
            <DeporteNombre>Fútbol</DeporteNombre>
          </Deporte>
        </CenterSection>
        <RightSection>
          {currentUser?.photoURL && <Avatar src={currentUser.photoURL} alt={currentUser.persona} />}
          <UserName>{currentUser?.apodo || currentUser?.email}</UserName>
          <LogoutButton onClick={() => { localStorage.removeItem("token"); setCurrentUser(null); navigate("/"); }}>
            Cerrar sesión
          </LogoutButton>
        </RightSection>
      </Header>

      <FormCard onSubmit={handleSubmit}>
        <SectionTitle>Datos</SectionTitle>

        <FormRow>
          <AvatarGrande
            src={formData.fotoperfil || "https://dummyimage.com/150x150/cccccc/000000&text=No+Image"}
            alt="Foto persona"
            onError={(e) => { e.target.onerror = null; e.target.src = "https://dummyimage.com/150x150/cccccc/000000&text=No+Image"; }}
          />

          <Datos>
            
          {!isNaN(Number(codgrupo)) && Number(codgrupo) > 0 && (
            
            <FormRow>            
            <GrupoLabel>
              <GrupoCheckbox                
                    type="checkbox"
                    name="grupo"                    
                    checked={asocGrupo}                          
                    onChange={(e) => setAsocGrupo(e.target.checked)}

                  />  
                  Asociar al grupo {grupo}            
              </GrupoLabel>  
            </FormRow>
            )}
            <FormRow>
              
              
              <Input
                ref={nombreRef}
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                placeholder="Nombre"
                style={{ borderColor: errores.nombre ? "red" : "#ddd" }}
              />
              <Input
                ref={telefonoRef}
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
                placeholder="Teléfono"
                style={{ borderColor: errores.telefono ? "red" : "#ddd" }}
              />
            </FormRow>
            <FormRow>
              <Input
                ref={emailRef}
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Email"
                style={{ borderColor: errores.email ? "red" : "#ddd" }}
              />
            </FormRow>
          </Datos>
        </FormRow>

        <input type="hidden" name="codigo" value={formData.codigo} />

        <FormRow>
          <Select name="sexo" value={formData.sexo} onChange={handleChange}>
            <option value="M">Masculino</option>
            <option value="F">Femenino</option>
            <option value="O">Otro</option>
          </Select>

          <Input
            type="date"
            name="fechanacimiento"
            value={formData.fechanacimiento}
            onChange={handleChange}
          />

          <Select name="localidad" value={formData.localidad} onChange={handleChange}>
            {localidades.map((loc) => (
              <option key={loc.codlocalidad} value={loc.localidad}>
                {loc.localidad}
              </option>
            ))}
          </Select>

          <Select name="estado" value={formData.estado} onChange={handleChange}>
            <option value="1">Activo</option>
            <option value="0">Inactivo</option>
            <option value="2">Lesionado</option>
            <option value="3">Suspendido</option>
            <option value="4">Viaje</option>
            <option value="5">Enfermo</option>
          </Select>
        </FormRow>
        {console.log(currentUser.tipo_usuario)}
        {(currentUser.tipo_usuario === 1) && (
        <CheckboxContainer>
          <input type="checkbox" checked={formData.tipousuario === "1"} onChange={handleCheckboxChange} />
          
          <label htmlFor="usuarioAdmin">Usuario Admin</label>
          
        </CheckboxContainer>
        )}

        <Divider />

        <SectionTitle>Otros Datos</SectionTitle>
        <FormRow>
          <SmallInput name="apodo" value={formData.apodo} onChange={handleChange} placeholder="Apodo" />
          <SmallInput type="number" name="peso" value={formData.peso} onChange={handleChange} placeholder="Peso (kg)" />
          <SmallInput type="number" name="altura" value={formData.altura} onChange={handleChange} placeholder="Altura (cm)" />
        </FormRow>

        <PosicionContainer>
          <SectionTitle>Posiciones</SectionTitle>
          <PosicionRow>
            {[{ num: 1, nombre: "Arquero" }, { num: 2, nombre: "Defensor" }, { num: 3, nombre: "Lat. Izquierdo" },
              { num: 4, nombre: "Lat. Derecho" }, { num: 5, nombre: "Mediocampista" }, { num: 6, nombre: "Delantero" }].map((pos) => (
              <PosicionOption key={pos.num}>
                <input
                  type="checkbox"
                  value={pos.num}
                  checked={formData.posiciones.includes(pos.num)}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setFormData({
                      ...formData,
                      posiciones: checked
                        ? [...formData.posiciones, pos.num]
                        : formData.posiciones.filter((n) => n !== pos.num),
                    });
                  }}
                />
                <label>{pos.nombre}</label>
              </PosicionOption>
            ))}
          </PosicionRow>
        </PosicionContainer>

        <SectionTitle>Datos sesión</SectionTitle>
        <div>
        <GuardarButton
              onClick={() => {
                const width = 600;
                const height = 400;
                const left = (window.innerWidth - width) / 2;
                const top = (window.innerHeight - height) / 2;

                //const url = `${window.location.origin}/invitaciones/${formData.codigo}`;
                const url = `${window.location.origin}/#/invitaciones/${formData.codigo}`;


                window.open(
                  url,
                  "_blank",
                  `width=${width},height=${height},left=${left},top=${top}`
                );
              }}
            >
              Invitar
            </GuardarButton>

            


        </div>
        
        <FormRow>
          <Input
            ref={usuarioRef}
            name="usuario"
            value={formData.usuario || ""}
            onChange={handleChange}
            placeholder="Usuario"
            style={{ borderColor: errores.password ? "red" : "#ddd" }}
          />
          <Input
            ref={passwordRef}
            type="password"
            name="password"
            value={formData.password || ""}
            onChange={handleChange}
            placeholder="Contraseña"
            style={{ borderColor: errores.password ? "red" : "#ddd" }}
          />
          <Input
            ref={password2Ref}
            type="password"
            name="password2"
            value={formData.password2 || ""}
            onChange={handleChange}
            placeholder="Repite Contraseña"
            style={{ borderColor: errores.password2 ? "red" : "#ddd" }}
          />
        </FormRow>

        <ButtonRow>
          <GuardarButton type="submit" disabled={loading}>
            {loading ? "Guardando..." : "Guardar"}
          </GuardarButton>
          <CancelarButton type="button" onClick={() =>  navigate("/dashboard?tab=personas")} disabled={loading}>
            Cancelar
          </CancelarButton>
        </ButtonRow>
      </FormCard>
    </Container>
  );
};

// ==== STYLES ==== //
const Container = styled.div`padding: 2rem; max-width: 90%; width: 100%; margin: 0 auto; box-sizing: border-box;`;
const Header = styled.header`display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; margin-bottom: 0.2rem;`;
const CenterSection = styled.div`display: flex; align-items: center; justify-content: center; flex: 1;`;
const RightSection = styled.div`display: flex; align-items: center; gap: 1rem;`;
const Deporte = styled.div`display: flex; align-items: center; gap: 0.5rem;`;
const DeporteNombre = styled.span`font-weight: bold; color: #1877f2;`;
const Select = styled.select`padding: 8px 12px; border-radius: 6px; border: 1px solid #ccc; font-weight: 500; cursor: pointer; min-width: 150px; max-width: 100%;`;
const Avatar = styled.img`width: 40px; height: 40px; border-radius: 50%;`;
const UserName = styled.span`font-weight: 600; color: #333;`;
const LogoutButton = styled.button`padding: 6px 12px; background: #ff4d4f; color: white; border: none; border-radius: 4px; cursor: pointer;`;
const FormCard = styled.form`background: #fafafa; padding: 2rem; border-radius: 12px; box-shadow: 0px 2px 6px rgba(0, 0, 0, 0.1); display: flex; flex-direction: column; gap: 1rem; width: 100%; box-sizing: border-box;`;
const FormRow = styled.div`display: flex; gap: 1rem; flex-wrap: wrap;`;
const AvatarGrande = styled.img`width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 3px solid #1877f2; @media (max-width: 650px){width:100px;height:100px;}`;
const Datos = styled.div`display: flex; flex-direction: column; flex: 1; gap: 0.5rem;`;
const Input = styled.input`flex: 1; min-width: 80px; max-width: 60%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 1rem;`;
const SmallInput = styled(Input)`max-width: 120px; @media (max-width: 650px){max-width:100%;}`;
const Divider = styled.hr`border: none; height: 1px; background: #ddd; margin: 1rem 0;`;
const SectionTitle = styled.h3`font-size: 1rem; font-weight: 600; color: #444; margin: 0.1rem 0;`;
const ButtonRow = styled.div`display: flex; justify-content: flex-end; gap: 1rem; flex-wrap: wrap;`;
const GuardarButton = styled.button`padding: 0.6rem 1.2rem; background: #28a745; border: none; border-radius: 6px; color: white; font-weight: bold; cursor: pointer; &:hover{background:#218838;}`;
const CancelarButton = styled.button`padding: 0.6rem 1.2rem; background: #6c757d; border: none; border-radius: 6px; color: white; font-weight: bold; cursor: pointer; &:hover{background:#5a6268;}`;
const PosicionContainer = styled.div`display:flex;flex-direction:column;margin-top:1rem;`;
const PosicionRow = styled.div`display:flex;flex-wrap:wrap;gap:1rem;margin-bottom:1rem;`;
const PosicionOption = styled.label`display:flex;align-items:center;gap:0.3rem;input[type="checkbox"]{width:16px;height:16px;}label{font-size:0.9rem;color:#333;cursor:pointer;}`;
const CheckboxContainer = styled.div`display:flex;align-items:center;gap:0.5rem;margin-top:0.5rem;margin-left:0;`;
const GrupoLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  background: #1877f210;
  padding: 0.7rem 1.2rem;
  border-radius: 999px;
  font-weight: 600;
  color:rgb(12, 44, 85);
  border: 2px solid #1877f245;
  cursor: pointer;
  transition: 0.2s ease;
  user-select: none;

  &:hover {
    background: #1877f225;
    transform: translateY(-2px);
  }
`;

const GrupoCheckbox = styled.input`
  transform: scale(1.3);
  cursor: pointer;
`;

export default Persona;
