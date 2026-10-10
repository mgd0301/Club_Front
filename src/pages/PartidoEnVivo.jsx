import React, { useEffect, useState, useCallback, useContext, useMemo, useRef } from "react";
import styled from "styled-components";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../components/Common/Header";
import { API_BASE_URL } from "../config";
import { useCronometro } from "../hooks/useCronometro";
import { AuthContext } from "../contexts/AuthContext";
import Swal from "sweetalert2";

const pad = (n) => String(n).padStart(2, "0");
const REGISTRADOS_VISIBLES = 5;

// Identifica esta pestaña/sesión del navegador (sessionStorage no se comparte
// entre pestañas, a diferencia de localStorage), para distinguir "otra pestaña
// mía" de "otro usuario" cuando se pelea el control del partido en vivo.
const obtenerSesionId = () => {
  try {
    let id = sessionStorage.getItem("partido_en_vivo_sesion_id");
    if (!id) {
      id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem("partido_en_vivo_sesion_id", id);
    }
    return id;
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
};

const resultadoLabel = (r) => {
  if (r.resultado === "G") return r.observacion || r.label_positivo || "Ganó";
  if (r.resultado === "P") return r.observacion || r.label_negativo || "Perdió";
  return "Sin resultado";
};

const puntosSuceso = (r) => {
  if (!r.puntos) return 0;
  if (r.puntos_condicionados === "S") return r.resultado === "G" ? r.puntos : 0;
  return r.puntos;
};

// Ícono de tarjeta para mostrar junto al nombre del jugador en el registro.
const tarjetaIcono = (r) => {
  const desc = (r.descripcion || "").toLowerCase();
  if (desc.includes("tarjeta roja")) return "🟥";
  if (desc.includes("tarjeta amarilla")) return "🟨";
  return null;
};

const formatearFechaEvento = (fecha) => {
  if (!fecha) return "";
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return "";
  const texto = d.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

const EscudoClub = ({ src, nombre }) => {
  if (src) {
    const url = /^https?:\/\//.test(src) ? src : `${API_BASE_URL}${src.startsWith("/") ? "" : "/"}${src}`;
    return <EscudoImg src={url} alt={nombre || "Escudo"} />;
  }
  return <EscudoFallback>{(nombre || "?").trim().charAt(0).toUpperCase()}</EscudoFallback>;
};

const PartidoEnVivo = () => {
  const { codevento } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const { setPartidoEnCurso, currentUser } = useContext(AuthContext);
  const miCodpersona = currentUser?.codpersona;
  const LOCK_TIMEOUT_MS = 15 * 60 * 1000;
  const sesionId = useRef(obtenerSesionId()).current;

  const [evento, setEvento] = useState(null);
  const [catalogo, setCatalogo] = useState([]);
  const [jugadores, setJugadores] = useState([]);
  const [registrados, setRegistrados] = useState([]);
  const [resultadoTotal, setResultadoTotal] = useState(0);
  const [resultadoRival, setResultadoRival] = useState(0); // ajuste manual (+/-), independiente de los sucesos registrados
  const [resultadoRivalSucesos, setResultadoRivalSucesos] = useState(0); // suma de sucesos registrados a favor del rival
  const resultadoRivalSkipGuardado = useRef(true);
  const [cargando, setCargando] = useState(true);
  const [sucesoParaEquipo, setSucesoParaEquipo] = useState(null); // suceso esperando elegir para qué equipo es
  const [sucesoParaJugador, setSucesoParaJugador] = useState(null); // suceso esperando elegir jugador
  const [sucesoParaJugadorEquipo, setSucesoParaJugadorEquipo] = useState("N"); // equipo con el que se registra el suceso (puede diferir del equipo del jugador, ej: penal en contra)
  const [sucesoParaCambio, setSucesoParaCambio] = useState(null); // suceso "Cambio" esperando elegir sale/entra
  const [jugadorSale, setJugadorSale] = useState(null); // jugador elegido que sale, esperando elegir quién entra
  const [sucesoSeleccionado, setSucesoSeleccionado] = useState(null); // { codeventosuceso, descripcion, minuto, segundo }
  const [flujoChain, setFlujoChain] = useState(null); // suceso que dispara otro (ej: Try -> Conversión), todo en un mismo panel
  const [eligiendoVarianteRival, setEligiendoVarianteRival] = useState(null); // { root, target, equipo } del rival esperando elegir Try/Try Penal/Try de Maul, con cuenta regresiva
  const [cuentaRegresivaRival, setCuentaRegresivaRival] = useState(3);
  const [confirmarDisparo, setConfirmarDisparo] = useState(null); // { target, targetEquipo, equipoJugador, codpersonaCulpable } esperando confirmar si se patea el suceso vinculado (ej: Penal de Scrum)
  const [culpaPenalPendiente, setCulpaPenalPendiente] = useState(null); // { target, targetEquipo } Penal en contra: primero se elige qué jugador propio cometió la falta, antes de confirmar si se patea
  const [guardando, setGuardando] = useState(false);
  const [procesandoKey, setProcesandoKey] = useState(null); // qué botón está procesando, para mostrar el spinner ahí
  const [mostrarTodosRegistrados, setMostrarTodosRegistrados] = useState(false);
  const [filtroEquipoRegistrados, setFiltroEquipoRegistrados] = useState("T"); // "T"=todos, "N"=nosotros, "R"=rival
  const [vistaRegistros, setVistaRegistros] = useState("registros"); // "registros" | "resumen"
  const [mostrarMinutos, setMostrarMinutos] = useState(false);
  const [editandoTiempo, setEditandoTiempo] = useState(false);
  const [irAMinutoValor, setIrAMinutoValor] = useState("");
  const [irASegundoValor, setIrASegundoValor] = useState("");
  const [espectador, setEspectador] = useState(false); // true = otro usuario (u otra pestaña mía) tiene el control
  const [nombreEnVivo, setNombreEnVivo] = useState("");
  const [mismoUsuarioOtraSesion, setMismoUsuarioOtraSesion] = useState(false); // true = soy yo, desde otra pestaña/dispositivo
  const [forzandoControl, setForzandoControl] = useState(false);

  const cronometro = useCronometro(codevento);

  const cargarSucesos = useCallback(async () => {
    const resp = await axios.post(
      `${API_BASE_URL}/evento_sucesos`,
      { codevento },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setRegistrados(resp.data.sucesos || []);
    setResultadoTotal(Number(resp.data.resultado) || 0);
    setResultadoRivalSucesos(Number(resp.data.resultadoRivalSucesos) || 0);
  }, [codevento, token]);

  // Intenta tomar (o refrescar) el control del partido en el backend.
  // Si otro usuario ya lo está manejando (y no venció el timeout de inactividad), no lo deja.
  // Si soy yo mismo desde otra pestaña/dispositivo, tampoco lo deja salvo que forzar=true.
  const intentarTomarControl = useCallback(
    async (forzar = false) => {
      try {
        await axios.post(
          `${API_BASE_URL}/evento_en_vivo_tomar`,
          { codevento, codsesion: sesionId, forzar },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setEspectador(false);
        setMismoUsuarioOtraSesion(false);
        return { ok: true };
      } catch (err) {
        if (err.response?.status === 409) {
          const nombre = err.response.data?.nombre_usuario_en_vivo || "otro usuario";
          const propia = !!err.response.data?.mismoUsuarioOtraSesion;
          setEspectador(true);
          setMismoUsuarioOtraSesion(propia);
          setNombreEnVivo(nombre);
          return { ok: false, nombre, mismoUsuarioOtraSesion: propia };
        }
        console.error("Error tomando control del partido:", err);
        return { ok: false, nombre: null, mismoUsuarioOtraSesion: false };
      }
    },
    [codevento, token, sesionId]
  );

  useEffect(() => {
    const cargar = async () => {
      try {
        const respEvento = await axios.post(
          `${API_BASE_URL}/evento_convocatoria`,
          { codevento },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const ev = respEvento.data.evento;
        setEvento(ev);
        resultadoRivalSkipGuardado.current = true;
        setResultadoRival(ev?.resultado_rival ?? 0);
        setJugadores(
          (respEvento.data.jugadores || []).filter((j) => j.convocatoria === "T" || j.convocatoria === "S")
        );

        const actividadMs = ev?.fecha_actividad_en_vivo ? new Date(ev.fecha_actividad_en_vivo).getTime() : 0;
        const lockVigente = ev?.codusuario_en_vivo && Date.now() - actividadMs < LOCK_TIMEOUT_MS;
        const bloqueadoPorOtroUsuario = lockVigente && ev.codusuario_en_vivo !== miCodpersona;
        const bloqueadoPorOtraSesionMia =
          lockVigente && ev.codusuario_en_vivo === miCodpersona && ev.codsesion_en_vivo && ev.codsesion_en_vivo !== sesionId;
        const bloqueado = bloqueadoPorOtroUsuario || bloqueadoPorOtraSesionMia;
        setEspectador(!!bloqueado);
        setMismoUsuarioOtraSesion(!!bloqueadoPorOtraSesionMia);
        setNombreEnVivo(ev?.apodo_usuario_en_vivo || ev?.nombre_usuario_en_vivo || "otro usuario");

        if (ev?.coddisciplina) {
          const respCatalogo = await axios.post(
            `${API_BASE_URL}/sucesos_disciplina`,
            { coddisciplina: ev.coddisciplina },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setCatalogo(respCatalogo.data || []);
        }

        await cargarSucesos();

        // Si ya lo había iniciado yo en este mismo navegador, refresco/reafirmo el control.
        if (!bloqueado && cronometro.iniciado) {
          intentarTomarControl();
        }
      } catch (err) {
        console.error("Error cargando partido:", err);
        Swal.fire({ title: "Error", text: "No se pudo cargar el partido", icon: "error" });
      } finally {
        setCargando(false);
      }
    };

    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codevento]);

  const soloLectura = evento?.estado === "F" || evento?.estado === "B";

  // Mientras tengo el control y el cronómetro está corriendo, aviso periódicamente
  // que sigo activo para no perder el control por el timeout de inactividad.
  useEffect(() => {
    if (soloLectura || espectador || !cronometro.iniciado) return;

    const id = setInterval(async () => {
      try {
        await axios.post(
          `${API_BASE_URL}/evento_en_vivo_heartbeat`,
          { codevento, codsesion: sesionId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (err) {
        if (err.response?.status === 409) {
          const nombre = err.response.data?.nombre_usuario_en_vivo || "otro usuario";
          const propia = !!err.response.data?.mismoUsuarioOtraSesion;
          setEspectador(true);
          setMismoUsuarioOtraSesion(propia);
          setNombreEnVivo(nombre);
          Swal.fire({
            title: "Perdiste el control del partido",
            text: propia
              ? "Tomaste el control desde otra pestaña o dispositivo. Esta pestaña pasó a modo espectador."
              : `Por inactividad, ahora lo está manejando ${nombre}. Pasaste a modo espectador.`,
            icon: "warning",
          });
        } else {
          console.error("Error en heartbeat del partido:", err);
        }
      }
    }, 3 * 60 * 1000);

    return () => clearInterval(id);
  }, [soloLectura, espectador, cronometro.iniciado, codevento, token, sesionId]);

  // En modo espectador, refresco la lista de sucesos cada pocos segundos
  // para seguir la línea de tiempo de lo que va registrando el otro usuario.
  useEffect(() => {
    if (soloLectura || !espectador) return;

    const id = setInterval(() => {
      cargarSucesos().catch((err) => console.error("Error refrescando sucesos:", err));
    }, 8000);

    return () => clearInterval(id);
  }, [soloLectura, espectador, cargarSucesos]);

  const divisionLabel = (evento?.divisiones || [])
    .map((d) => (d.division_padre_descripcion ? `${d.division_padre_descripcion} - ${d.descripcion}` : d.descripcion))
    .join(" · ");

  const fechaEventoLabel = formatearFechaEvento(evento?.fecha);

  // Quiénes están en cancha en este momento, reconstruido a partir de los
  // titulares iniciales + los cambios registrados en orden cronológico.
  // Sucesos que pueden dispararse automáticamente como consecuencia de otro (ej: Conversión
  // tras un Try) también se muestran en la grilla principal como botón independiente,
  // además de habilitarse dentro del flujo encadenado cuando corresponda.
  const catalogoPrincipal = useMemo(() => {
    return catalogo.filter((s) => !s.variante_de_codsuceso);
  }, [catalogo]);

  // Variantes de un suceso (ej: Try Penal / Try de Maul son variantes de Try):
  // no tienen botón propio en la grilla ni llevan jugador; se ofrecen como
  // alternativa al elegir jugador dentro del flujo del suceso padre.
  const variantesDe = useCallback(
    (suceso) => catalogo.filter((s) => s.variante_de_codsuceso === suceso.codsuceso),
    [catalogo]
  );

  // Jugadores propios expulsados (tarjeta roja u otro suceso marcado como
  // "expulsa"): quedan afuera de cancha, banco y de cualquier selección de
  // jugador (no pueden hacer un cambio ni protagonizar otro suceso).
  const jugadoresExpulsadosIds = useMemo(() => {
    return new Set(
      registrados
        .filter((r) => r.expulsa === "S" && r.equipo === "N" && r.codpersona)
        .map((r) => r.codpersona)
    );
  }, [registrados]);

  const jugadoresEnCanchaIds = useMemo(() => {
    const enCancha = new Set(
      jugadores.filter((j) => j.convocatoria === "T").map((j) => j.codpersona)
    );
    const cambios = registrados
      .filter((r) => r.es_cambio === "S" && r.codpersona)
      .slice()
      .sort((a, b) => a.minuto - b.minuto || a.segundo - b.segundo);
    cambios.forEach((r) => {
      enCancha.delete(r.codpersona);
      if (r.codpersona_entra) enCancha.add(r.codpersona_entra);
    });
    jugadoresExpulsadosIds.forEach((codpersona) => enCancha.delete(codpersona));
    return enCancha;
  }, [jugadores, registrados, jugadoresExpulsadosIds]);

  // Sólo los jugadores actualmente en cancha (titulares + los que entraron por
  // cambio) pueden protagonizar un suceso: ya excluye expulsados porque
  // jugadoresEnCanchaIds los quita.
  const jugadoresSeleccionables = useMemo(
    () => jugadores.filter((j) => jugadoresEnCanchaIds.has(j.codpersona)),
    [jugadores, jugadoresEnCanchaIds]
  );

  // Minutos jugados por cada convocado: titulares desde el minuto 0,
  // suplentes desde que entran, sumando hasta que salen (o hasta ahora).
  const minutosJugados = useMemo(() => {
    const finMinuto = cronometro.minuto;
    const desde = {};
    jugadores
      .filter((j) => j.convocatoria === "T")
      .forEach((j) => {
        desde[j.codpersona] = 0;
      });

    const cambios = registrados
      .filter((r) => r.es_cambio === "S")
      .slice()
      .sort((a, b) => a.minuto - b.minuto || a.segundo - b.segundo);

    const total = {};
    cambios.forEach((r) => {
      if (r.codpersona && desde[r.codpersona] !== undefined) {
        total[r.codpersona] = (total[r.codpersona] || 0) + (r.minuto - desde[r.codpersona]);
        delete desde[r.codpersona];
      }
      if (r.codpersona_entra) {
        desde[r.codpersona_entra] = r.minuto;
      }
    });

    Object.entries(desde).forEach(([cod, minutoDesde]) => {
      const codpersona = Number(cod);
      total[codpersona] = (total[codpersona] || 0) + Math.max(0, finMinuto - minutoDesde);
    });

    return total;
  }, [jugadores, registrados, cronometro.minuto]);

  const confirmarSalida = async () => {
    if (soloLectura || !cronometro.iniciado) return true;
    const result = await Swal.fire({
      title: "Hay un partido en curso",
      text: "El cronómetro sigue corriendo. Si salís ahora podés volver más tarde al mismo momento del partido.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Salir igual",
      cancelButtonText: "Quedarme",
    });
    return result.isConfirmed;
  };

  // Mantener el contexto global al tanto de si hay un partido en curso,
  // para que otras pantallas (ej. Header) puedan confirmar antes de navegar.
  // Se limpia al desmontar para que ese aviso sólo aparezca estando en esta
  // pantalla, no al navegar por el resto de la app después de haber salido.
  useEffect(() => {
    setPartidoEnCurso(!soloLectura && cronometro.iniciado ? codevento : null);
    return () => setPartidoEnCurso((prev) => (prev === codevento ? null : prev));
  }, [soloLectura, cronometro.iniciado, codevento, setPartidoEnCurso]);

  // Avisar antes de cerrar/recargar la pestaña si el partido sigue en curso.
  useEffect(() => {
    const handler = (e) => {
      if (!soloLectura && cronometro.iniciado) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [soloLectura, cronometro.iniciado]);

  // Si el suceso raíz de un flujo encadenado no requiere elegir jugador
  // (caso poco común), se registra solo apenas se abre el panel.
  useEffect(() => {
    if (flujoChain && !flujoChain.rootCodeventosuceso && flujoChain.root.lleva_jugador !== "S") {
      registrarPasoRootChain(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flujoChain]);

  // Cuenta regresiva del panel "Try / Try Penal / Try de Maul" del rival: si no
  // se elige nada en 3 segundos, se registra como Try convencional.
  useEffect(() => {
    if (!eligiendoVarianteRival) return;
    setCuentaRegresivaRival(3);
    const interval = setInterval(() => {
      setCuentaRegresivaRival((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [eligiendoVarianteRival]);

  useEffect(() => {
    if (eligiendoVarianteRival && cuentaRegresivaRival === 0) {
      const { root, target, equipo } = eligiendoVarianteRival;
      setEligiendoVarianteRival(null);
      registrarFlujoRival(root, target, equipo, root);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cuentaRegresivaRival]);

  // Guarda el resultado del rival (se carga a mano) con un pequeño debounce,
  // salteando el disparo inicial que ocurre al cargar el valor desde el servidor.
  useEffect(() => {
    if (resultadoRivalSkipGuardado.current) {
      resultadoRivalSkipGuardado.current = false;
      return;
    }
    const timer = setTimeout(() => {
      axios
        .post(
          `${API_BASE_URL}/evento_resultado_rival_actualizar`,
          { codevento, resultado_rival: resultadoRival },
          { headers: { Authorization: `Bearer ${token}` } }
        )
        .catch((err) => console.error("Error guardando resultado del rival:", err));
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultadoRival]);


  // Interceptar el botón "atrás" del navegador mientras el partido está en curso.
  useEffect(() => {
    if (soloLectura || !cronometro.iniciado) return;

    window.history.pushState(null, "", window.location.href);
    const handlePopState = async () => {
      const salir = await confirmarSalida();
      if (salir) {
        window.removeEventListener("popstate", handlePopState);
        window.history.back();
      } else {
        window.history.pushState(null, "", window.location.href);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soloLectura, cronometro.iniciado]);

  const handleIniciarPartido = async () => {
    if (jugadores.length === 0) {
      const result = await Swal.fire({
        title: "No armaste la convocatoria",
        text: "Todavía no citaste jugadores para este partido. Podés armarla ahora o iniciar igual.",
        icon: "warning",
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: "Armar convocatoria",
        denyButtonText: "Iniciar igual",
        cancelButtonText: "Cancelar",
      });
      if (result.isConfirmed) {
        navigate(`/convocatoria/${codevento}`);
        return;
      }
      if (!result.isDenied) return;
    }

    const resultadoControl = await intentarTomarControl();
    if (!resultadoControl.ok) {
      if (resultadoControl.mismoUsuarioOtraSesion) {
        const result = await Swal.fire({
          title: "Ya tenés este partido abierto en otro lado",
          text: "Lo estás manejando desde otra pestaña o dispositivo. Si tomás el control acá, la otra pestaña pasará a modo espectador.",
          icon: "warning",
          showDenyButton: true,
          denyButtonText: "Tomar el control desde acá",
          confirmButtonText: "Cancelar",
        });
        if (result.isDenied) {
          const reintento = await intentarTomarControl(true);
          if (reintento.ok) cronometro.iniciar();
        }
        return;
      }
      if (resultadoControl.nombre) {
        Swal.fire({
          title: "Este partido ya está en curso",
          text: `Lo está manejando ${resultadoControl.nombre} en este momento. Podés seguir los sucesos en la lista de abajo.`,
          icon: "info",
        });
      }
      return;
    }
    cronometro.iniciar();
  };

  const handleTomarControlDesdeAca = async () => {
    setForzandoControl(true);
    try {
      await intentarTomarControl(true);
    } finally {
      setForzandoControl(false);
    }
  };

  const handleClickSuceso = (suceso) => {
    if (guardando) return;
    if (suceso.es_cambio === "S") {
      setJugadorSale(null);
      setSucesoParaCambio(suceso);
      return;
    }
    setSucesoParaEquipo(suceso);
  };

  // Registra el flujo del rival (no tiene roster cargado, así que nunca se
  // pasa por selección de jugador) para el suceso "elegido": puede ser el
  // root tal cual, o una variante sin jugador (ej: Try Penal/Try de Maul).
  // Si el elegido dispara otro suceso (ej: Try/Try de Maul -> Conversión) se
  // registra también ese paso y se abre el panel para cargar el resultado;
  // si no dispara nada (ej: Try Penal), queda registrado y listo.
  const registrarFlujoRival = async (root, target, equipo, elegido) => {
    setGuardando(true);
    setProcesandoKey(`suceso-${elegido.codsuceso}`);
    try {
      const minuto = cronometro.minuto;
      const segundo = cronometro.segundo;
      const respRoot = await axios.post(
        `${API_BASE_URL}/evento_suceso_registrar`,
        { codevento, codsuceso: elegido.codsuceso, minuto, segundo, equipo },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const targetElegido = elegido.dispara_codsuceso
        ? catalogo.find((s) => s.codsuceso === elegido.dispara_codsuceso) || target
        : null;
      if (!targetElegido) {
        await cargarSucesos();
        setFlujoChain(null);
        return;
      }
      const respTarget = await axios.post(
        `${API_BASE_URL}/evento_suceso_registrar`,
        { codevento, codsuceso: targetElegido.codsuceso, minuto, segundo, equipo },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await cargarSucesos();
      if (targetElegido.lleva_resultado === "S") {
        setFlujoChain({
          root: elegido,
          target: targetElegido,
          equipo,
          rootJugador: null,
          rootCodeventosuceso: respRoot.data.codeventosuceso,
          targetJugador: null,
          targetCodeventosuceso: respTarget.data.codeventosuceso,
        });
      } else {
        setFlujoChain(null);
      }
    } catch (err) {
      console.error("Error registrando el flujo del rival:", err);
      Swal.fire({ title: "Error", text: "No se pudo registrar el suceso", icon: "error" });
    } finally {
      setGuardando(false);
      setProcesandoKey(null);
    }
  };

  // El rival no tiene roster cargado: sus sucesos se registran directo, sin
  // pasar por la selección de jugador que sí existe para los nuestros. Si el
  // suceso tiene variantes sin jugador (ej: Try Penal/Try de Maul), primero
  // se ofrece elegir con un margen de tiempo antes de registrar el común.
  const iniciarFlujoChain = async (root, target, equipo) => {
    if (guardando) return;
    if (equipo === "N") {
      setFlujoChain({
        root,
        target,
        equipo,
        rootJugador: null,
        rootCodeventosuceso: null,
        targetJugador: null,
        targetCodeventosuceso: null,
      });
      return;
    }
    if (variantesDe(root).length > 0) {
      setEligiendoVarianteRival({ root, target, equipo });
      return;
    }
    await registrarFlujoRival(root, target, equipo, root);
  };

  // Registra una marca simple del suceso para el equipo indicado, sin jugador
  // ni resultado (ej: deja constancia de qué equipo cometió un Penal), sin
  // disparar el panel de Convirtió/Erró.
  const registrarMarcaEquipo = async (suceso, equipo) => {
    if (guardando) return;
    setGuardando(true);
    setProcesandoKey(`suceso-${suceso.codsuceso}`);
    try {
      const minuto = cronometro.minuto;
      const segundo = cronometro.segundo;
      await axios.post(
        `${API_BASE_URL}/evento_suceso_registrar`,
        { codevento, codsuceso: suceso.codsuceso, minuto, segundo, codpersona: null, equipo },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await cargarSucesos();
    } catch (err) {
      console.error("Error registrando suceso:", err);
      Swal.fire({ title: "Error", text: "No se pudo registrar el suceso", icon: "error" });
    } finally {
      setGuardando(false);
      setProcesandoKey(null);
    }
  };

  const registrarConEquipo = (suceso, equipo, equipoJugador = equipo) => {
    if (equipoJugador === "N" && suceso.lleva_jugador === "S") {
      setSucesoParaJugador(suceso);
      setSucesoParaJugadorEquipo(equipo);
      return;
    }
    registrarSuceso(suceso, null, equipo);
  };

  // Sucesos "pateables" (ej: Penal): son el destino de un motivo_dispara_codsuceso
  // de otro suceso (ej: Scrum). Al hacerse click directo, el equipo elegido es el
  // que INFRINGIÓ (no el que se beneficia), y siempre se confirma Patea/Juega
  // antes de pedir el pateador.
  const esSucesoPateable = (suceso) =>
    catalogo.some((s) => s.motivo_dispara_codsuceso === suceso.codsuceso);

  // Título para la fila del registro. Para sucesos pateables (ej: Penal) se
  // distingue la marca del infractor ("Penal Cometido") de la del pateo
  // ("Penal a los palos"), y el badge de resultado indica si convirtió o erró.
  const descripcionRegistro = (r) => {
    if (r.lleva_resultado === "S" && esSucesoPateable(r)) {
      return `${r.descripcion} ${r.resultado == null ? "Cometido" : "a los palos"}`;
    }
    return r.descripcion;
  };

  const handleElegirEquipo = (suceso, equipo) => {
    setSucesoParaEquipo(null);
    if (suceso.dispara_codsuceso) {
      // Suceso que dispara otro (ej: Try -> Conversión): se muestran ambos
      // pasos en un mismo panel, el segundo bloqueado hasta completar el primero.
      const target = catalogo.find((s) => s.codsuceso === suceso.dispara_codsuceso);
      if (target) {
        iniciarFlujoChain(suceso, target, equipo);
        return;
      }
    }
    if (esSucesoPateable(suceso)) {
      const equipoBeneficiario = equipo === "N" ? "R" : "N";
      setConfirmarDisparo({
        target: suceso,
        targetEquipo: equipoBeneficiario,
        equipoJugador: equipoBeneficiario,
        equipoInfractor: equipo,
      });
      return;
    }
    registrarConEquipo(suceso, equipo);
  };

  const registrarPasoRootChain = async (codpersona) => {
    if (!flujoChain || guardando) return;
    setGuardando(true);
    setProcesandoKey(`jugador-${codpersona}`);
    try {
      const minuto = cronometro.minuto;
      const segundo = cronometro.segundo;
      const resp = await axios.post(
        `${API_BASE_URL}/evento_suceso_registrar`,
        { codevento, codsuceso: flujoChain.root.codsuceso, minuto, segundo, codpersona, equipo: flujoChain.equipo },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const jugador = jugadores.find((j) => j.codpersona === codpersona);
      setFlujoChain((prev) =>
        prev && {
          ...prev,
          rootJugador: jugador ? jugador.apodo || jugador.nombre : "—",
          rootCodeventosuceso: resp.data.codeventosuceso,
        }
      );
      await cargarSucesos();
    } catch (err) {
      console.error("Error registrando paso del flujo:", err);
      Swal.fire({ title: "Error", text: "No se pudo registrar el suceso", icon: "error" });
    } finally {
      setGuardando(false);
      setProcesandoKey(null);
    }
  };

  // Registra una variante del suceso root que no lleva jugador (ej: Try Penal,
  // Try de Maul): es una alternativa a elegir un jugador, no un paso posterior.
  // Si la variante dispara otro suceso (ej: Try de Maul -> Conversión), el
  // flujo sigue pidiendo ese paso; si no (ej: Try Penal), termina ahí.
  const registrarVarianteRootChain = async (variante) => {
    if (!flujoChain || guardando) return;
    setGuardando(true);
    setProcesandoKey(`variante-${variante.codsuceso}`);
    try {
      const minuto = cronometro.minuto;
      const segundo = cronometro.segundo;
      const resp = await axios.post(
        `${API_BASE_URL}/evento_suceso_registrar`,
        { codevento, codsuceso: variante.codsuceso, minuto, segundo, codpersona: null, equipo: flujoChain.equipo },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const nuevoTarget = variante.dispara_codsuceso
        ? catalogo.find((s) => s.codsuceso === variante.dispara_codsuceso)
        : null;
      await cargarSucesos();
      if (nuevoTarget) {
        setFlujoChain((prev) =>
          prev && {
            ...prev,
            root: variante,
            target: nuevoTarget,
            rootJugador: null,
            rootCodeventosuceso: resp.data.codeventosuceso,
          }
        );
      } else {
        setFlujoChain(null);
      }
    } catch (err) {
      console.error("Error registrando la variante del suceso:", err);
      Swal.fire({ title: "Error", text: "No se pudo registrar el suceso", icon: "error" });
    } finally {
      setGuardando(false);
      setProcesandoKey(null);
    }
  };

  const registrarPasoTargetChain = async (codpersona) => {
    if (!flujoChain || !flujoChain.rootCodeventosuceso || guardando) return;
    setGuardando(true);
    setProcesandoKey(`jugador-${codpersona}`);
    try {
      const minuto = cronometro.minuto;
      const segundo = cronometro.segundo;
      const resp = await axios.post(
        `${API_BASE_URL}/evento_suceso_registrar`,
        { codevento, codsuceso: flujoChain.target.codsuceso, minuto, segundo, codpersona, equipo: flujoChain.equipo },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const jugador = jugadores.find((j) => j.codpersona === codpersona);
      const targetLlevaResultado = flujoChain.target.lleva_resultado === "S";
      await cargarSucesos();
      if (targetLlevaResultado) {
        setFlujoChain((prev) =>
          prev && {
            ...prev,
            targetJugador: jugador ? jugador.apodo || jugador.nombre : "—",
            targetCodeventosuceso: resp.data.codeventosuceso,
          }
        );
      } else {
        setFlujoChain(null);
      }
    } catch (err) {
      console.error("Error registrando paso del flujo:", err);
      Swal.fire({ title: "Error", text: "No se pudo registrar el suceso", icon: "error" });
    } finally {
      setGuardando(false);
      setProcesandoKey(null);
    }
  };

  const finalizarResultadoChain = async (resultado) => {
    if (!flujoChain || !flujoChain.targetCodeventosuceso || guardando) return;
    setGuardando(true);
    setProcesandoKey(`resultado-${resultado || "none"}`);
    try {
      await axios.post(
        `${API_BASE_URL}/evento_suceso_resultado`,
        { codeventosuceso: flujoChain.targetCodeventosuceso, resultado },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await cargarSucesos();
      setFlujoChain(null);
    } catch (err) {
      console.error("Error guardando resultado del flujo:", err);
      Swal.fire({ title: "Error", text: "No se pudo guardar el resultado", icon: "error" });
    } finally {
      setGuardando(false);
      setProcesandoKey(null);
    }
  };

  const registrarSuceso = async (suceso, codpersona, equipo = "N") => {
    if (guardando) return;
    setGuardando(true);
    setProcesandoKey(codpersona ? `jugador-${codpersona}` : `suceso-${suceso.codsuceso}`);
    try {
      const minuto = cronometro.minuto;
      const segundo = cronometro.segundo;

      const resp = await axios.post(
        `${API_BASE_URL}/evento_suceso_registrar`,
        { codevento, codsuceso: suceso.codsuceso, minuto, segundo, codpersona, equipo },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSucesoParaJugador(null);

      if (suceso.lleva_resultado === "S") {
        setSucesoSeleccionado({
          codeventosuceso: resp.data.codeventosuceso,
          descripcion: suceso.descripcion,
          minuto,
          segundo,
          equipo,
          label_positivo: suceso.label_positivo,
          label_negativo: suceso.label_negativo,
          motivo_positivo: suceso.motivo_positivo,
          motivo_negativo: suceso.motivo_negativo,
          motivo_dispara_codsuceso: suceso.motivo_dispara_codsuceso,
        });
      }

      await cargarSucesos();
    } catch (err) {
      console.error("Error registrando suceso:", err);
      Swal.fire({ title: "Error", text: "No se pudo registrar el suceso", icon: "error" });
    } finally {
      setGuardando(false);
      setProcesandoKey(null);
    }
  };

  const registrarCambio = async (suceso, codpersonaSale, codpersonaEntra) => {
    if (guardando) return;
    setGuardando(true);
    setProcesandoKey(`entra-${codpersonaEntra}`);
    try {
      const minuto = cronometro.minuto;
      const segundo = cronometro.segundo;

      const resp = await axios.post(
        `${API_BASE_URL}/evento_suceso_registrar`,
        {
          codevento,
          codsuceso: suceso.codsuceso,
          minuto,
          segundo,
          codpersona: codpersonaSale,
          codpersona_entra: codpersonaEntra,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSucesoParaCambio(null);
      setJugadorSale(null);

      if (suceso.lleva_resultado === "S") {
        setSucesoSeleccionado({
          codeventosuceso: resp.data.codeventosuceso,
          descripcion: suceso.descripcion,
          minuto,
          segundo,
        });
      }

      await cargarSucesos();
    } catch (err) {
      console.error("Error registrando cambio:", err);
      Swal.fire({ title: "Error", text: "No se pudo registrar el cambio", icon: "error" });
    } finally {
      setGuardando(false);
      setProcesandoKey(null);
    }
  };

  const handleResultado = async (resultado, observacion = null) => {
    if (!sucesoSeleccionado || guardando) return;
    setGuardando(true);
    setProcesandoKey(`resultado-${resultado || "none"}${observacion ? `-${observacion}` : ""}`);
    try {
      await axios.post(
        `${API_BASE_URL}/evento_suceso_resultado`,
        { codeventosuceso: sucesoSeleccionado.codeventosuceso, resultado, observacion },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await cargarSucesos();

      const { motivo_dispara_codsuceso, equipo } = sucesoSeleccionado;
      setSucesoSeleccionado(null);

      if (observacion && motivo_dispara_codsuceso) {
        // Motivo especial (ej: "Penal a favor" en un Scrum): antes de registrar
        // el suceso vinculado (ej: Penal) se confirma si efectivamente se patea,
        // ya que también puede optarse por seguir jugando.
        const target = catalogo.find((s) => s.codsuceso === motivo_dispara_codsuceso);
        if (target) {
          const targetEquipo = resultado === "G" ? equipo : equipo === "N" ? "R" : "N";
          // Jugador a preguntar: el nuestro, salvo que sea "a favor" del propio
          // scrum del rival (ahí el que patea es un jugador rival, no registrado).
          const equipoJugador = equipo === "R" && resultado === "G" ? null : "N";
          if (equipoJugador === "N" && targetEquipo === "R" && target.lleva_jugador === "S") {
            // Penal en contra: el jugador a elegir es quien cometió la falta (nuestro),
            // no quien patea (rival, no registrado) — se pregunta antes de Palos/Juega.
            setCulpaPenalPendiente({ target, targetEquipo });
          } else {
            setConfirmarDisparo({ target, targetEquipo, equipoJugador });
          }
        }
      }
    } catch (err) {
      console.error("Error guardando resultado:", err);
      Swal.fire({ title: "Error", text: "No se pudo guardar el resultado", icon: "error" });
    } finally {
      setGuardando(false);
      setProcesandoKey(null);
    }
  };

  const handleEliminar = async (codeventosuceso) => {
    const result = await Swal.fire({
      title: "¿Eliminar registro?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar",
    });
    if (!result.isConfirmed) return;

    try {
      await axios.post(
        `${API_BASE_URL}/evento_suceso_eliminar`,
        { codeventosuceso },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await cargarSucesos();
    } catch (err) {
      console.error("Error eliminando suceso:", err);
      Swal.fire({ title: "Error", text: "No se pudo eliminar", icon: "error" });
    }
  };

  const abrirEdicionTiempo = () => {
    setIrAMinutoValor(String(cronometro.minuto));
    setIrASegundoValor(String(cronometro.segundo));
    setEditandoTiempo(true);
  };

  const handleIrAMinuto = () => {
    const minuto = parseInt(irAMinutoValor, 10);
    const segundo = parseInt(irASegundoValor, 10) || 0;
    if (isNaN(minuto) || minuto < 0) return;
    cronometro.setTiempo(minuto, Math.min(Math.max(segundo, 0), 59));
    setEditandoTiempo(false);
  };

  const handleFinalizar = async () => {
    const result = await Swal.fire({
      title: "¿Finalizar partido?",
      text: "No vas a poder seguir registrando sucesos después de esto",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Finalizar",
      cancelButtonText: "Cancelar",
    });
    if (!result.isConfirmed) return;

    try {
      await axios.post(
        `${API_BASE_URL}/evento_estado`,
        { codevento, tipo: "F" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      cronometro.pausar();
      setEvento((prev) => ({ ...prev, estado: "F" }));
      setPartidoEnCurso(null);
      Swal.fire({ title: "Partido finalizado", icon: "success", timer: 1500, showConfirmButton: false });
    } catch (err) {
      console.error("Error finalizando partido:", err);
      Swal.fire({ title: "Error", text: "No se pudo finalizar el partido", icon: "error" });
    }
  };

  const handleReiniciar = async () => {
    const result = await Swal.fire({
      title: "¿Reiniciar partido?",
      text: "Se va a borrar toda la información cargada hasta el momento: todos los sucesos registrados y los minutos jugados. Esta acción no se puede deshacer.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, reiniciar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#e63946",
    });
    if (!result.isConfirmed) return;

    try {
      await axios.post(
        `${API_BASE_URL}/evento_sucesos_reiniciar`,
        { codevento },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      cronometro.reiniciar();
      setSucesoSeleccionado(null);
      setSucesoParaJugador(null);
      setSucesoParaCambio(null);
      setJugadorSale(null);
      await cargarSucesos();
      Swal.fire({ title: "Partido reiniciado", icon: "success", timer: 1500, showConfirmButton: false });
    } catch (err) {
      console.error("Error reiniciando partido:", err);
      Swal.fire({ title: "Error", text: "No se pudo reiniciar el partido", icon: "error" });
    }
  };

  if (cargando) {
    return (
      <>
        <Header />
        <Centrado>Cargando partido...</Centrado>
      </>
    );
  }

  const registradosFiltrados =
    filtroEquipoRegistrados === "T"
      ? registrados
      : registrados.filter((r) =>
          filtroEquipoRegistrados === "R" ? r.equipo === "R" : r.equipo !== "R"
        );

  // Cantidad de cada tipo de suceso, separado por equipo, para la vista "Resumen".
  const resumenPorEquipo = { N: {}, R: {} };
  registrados.forEach((r) => {
    const equipo = r.equipo === "R" ? "R" : "N";
    const clave = descripcionRegistro(r);
    resumenPorEquipo[equipo][clave] = (resumenPorEquipo[equipo][clave] || 0) + 1;
  });
  const descripcionesResumen = Array.from(
    new Set([...Object.keys(resumenPorEquipo.N), ...Object.keys(resumenPorEquipo.R)])
  ).sort((a, b) => {
    const totalA = (resumenPorEquipo.N[a] || 0) + (resumenPorEquipo.R[a] || 0);
    const totalB = (resumenPorEquipo.N[b] || 0) + (resumenPorEquipo.R[b] || 0);
    return totalB - totalA || a.localeCompare(b);
  });

  return (
    <>
      <Header />
      <Container>
        <Title>Partido en vivo</Title>
        {divisionLabel && <DivisionSubtitle>{divisionLabel}</DivisionSubtitle>}

        <PanelPartido>
          {fechaEventoLabel && <FechaEvento>{fechaEventoLabel}</FechaEvento>}
          <Tanteador>
            <EquipoBox>
              <EscudoClub src={evento?.club_escudo} nombre={evento?.club_descripcion} />
              <EquipoNombre>{evento?.club_descripcion || "Nosotros"}</EquipoNombre>
              <Puntaje>{resultadoTotal}</Puntaje>
            </EquipoBox>

            <TanteadorVs>VS</TanteadorVs>

            <EquipoBox>
              <EscudoClub src={evento?.rival_escudo} nombre={evento?.rival_descripcion || "Rival"} />
              <EquipoNombre>{evento?.rival_descripcion || "Rival"}</EquipoNombre>
              <Puntaje>{resultadoRival + resultadoRivalSucesos}</Puntaje>
            </EquipoBox>
          </Tanteador>
        </PanelPartido>

        {soloLectura && <SoloLecturaBadge>Evento finalizado · solo lectura</SoloLecturaBadge>}
        {!soloLectura && espectador && (
          <EspectadorBadge>
            {mismoUsuarioOtraSesion ? (
              <>
                👀 Estás manejando este partido desde otra pestaña o dispositivo · acá estás en modo espectador
                <TomarControlBtn onClick={handleTomarControlDesdeAca} disabled={forzandoControl}>
                  {forzandoControl ? "Tomando control..." : "Tomar el control desde acá"}
                </TomarControlBtn>
              </>
            ) : (
              <>
                👀 Lo está manejando <b>{nombreEnVivo}</b> en este momento · estás viendo en modo espectador
              </>
            )}
          </EspectadorBadge>
        )}

        {!espectador && (
        <PanelPartido>
          <CronometroRow>
            <Cronometro onDoubleClick={() => !soloLectura && abrirEdicionTiempo()}>
              {pad(cronometro.minuto)}:{pad(cronometro.segundo)}
            </Cronometro>
            {!soloLectura && (
              <EditarTiempoBtn onClick={abrirEdicionTiempo} title="Ir a un minuto exacto">
                ✏️
              </EditarTiempoBtn>
            )}
          </CronometroRow>

          {editandoTiempo && (
            <IrAMinutoRow>
              <IrAMinutoInput
                type="number"
                min="0"
                inputMode="numeric"
                placeholder="Min"
                autoFocus
                value={irAMinutoValor}
                onChange={(e) => setIrAMinutoValor(e.target.value)}
              />
              <IrAMinutoSeparador>:</IrAMinutoSeparador>
              <IrAMinutoInput
                type="number"
                min="0"
                max="59"
                inputMode="numeric"
                placeholder="Seg"
                value={irASegundoValor}
                onChange={(e) => setIrASegundoValor(e.target.value)}
              />
              <IrAMinutoBtn onClick={handleIrAMinuto} disabled={irAMinutoValor === ""}>
                Ir
              </IrAMinutoBtn>
              <IrAMinutoBtn tipo="cancelar" onClick={() => setEditandoTiempo(false)}>
                Cancelar
              </IrAMinutoBtn>
            </IrAMinutoRow>
          )}

          {!soloLectura && !cronometro.iniciado && !sucesoSeleccionado && !sucesoParaJugador && !sucesoParaCambio && !flujoChain && (
            <Centrado>
              <IniciarButton onClick={handleIniciarPartido}>▶ Iniciar partido</IniciarButton>
            </Centrado>
          )}

          {!soloLectura && cronometro.iniciado && !sucesoSeleccionado && !sucesoParaEquipo && !sucesoParaJugador && !sucesoParaCambio && !flujoChain && (
            <>
              <ControlesRow>
                {cronometro.corriendo ? (
                  <ControlBtn onClick={cronometro.pausar}>⏸ Pausar</ControlBtn>
                ) : (
                  <ControlBtn onClick={cronometro.iniciar}>▶ Reanudar</ControlBtn>
                )}
                <AjusteBtn onClick={() => cronometro.ajustar(-60)}>-1'</AjusteBtn>
                <AjusteBtn onClick={() => cronometro.ajustar(-10)}>-10s</AjusteBtn>
                <AjusteBtn onClick={() => cronometro.ajustar(10)}>+10s</AjusteBtn>
                <AjusteBtn onClick={() => cronometro.ajustar(60)}>+1'</AjusteBtn>
                <ReiniciarBtn onClick={handleReiniciar}>↺ Reiniciar</ReiniciarBtn>
                <FinalizarBtn onClick={handleFinalizar}>🏁 Finalizar</FinalizarBtn>
              </ControlesRow>

              {cronometro.corriendo ? (
                <>
                  <Label>Registrar suceso</Label>
                  <SucesosGrid>
                    {catalogoPrincipal.map((s) => (
                      <SucesoBtn key={s.codsuceso} onClick={() => handleClickSuceso(s)} disabled={guardando}>
                        {procesandoKey === `suceso-${s.codsuceso}` ? <Spinner /> : s.descripcion}
                      </SucesoBtn>
                    ))}
                    {catalogoPrincipal.length === 0 && (
                      <EmptyState>No hay sucesos configurados para esta disciplina</EmptyState>
                    )}
                  </SucesosGrid>
                </>
              ) : (
                <PausadoAviso>⏸ Cronómetro pausado — tocá Reanudar para seguir registrando sucesos</PausadoAviso>
              )}
            </>
          )}
        </PanelPartido>
        )}

        {(sucesoParaEquipo || flujoChain || eligiendoVarianteRival || sucesoParaJugador || sucesoParaCambio || sucesoSeleccionado || confirmarDisparo || culpaPenalPendiente) && (
          <ModalOverlay>
          {culpaPenalPendiente && (
          <ResultadoPanel>
            <ResultadoTexto>
              <b>{culpaPenalPendiente.target.descripcion}</b> — ¿qué jugador cometió el penal?
            </ResultadoTexto>
            <ResultadoBotones>
              <ResultadoBtn
                tipo="N"
                onClick={() => {
                  const { target, targetEquipo } = culpaPenalPendiente;
                  setCulpaPenalPendiente(null);
                  setConfirmarDisparo({ target, targetEquipo, equipoJugador: null, codpersonaCulpable: null });
                }}
                disabled={guardando}
              >
                Sin Jugador
              </ResultadoBtn>
              <ResultadoBtn tipo="P" onClick={() => setCulpaPenalPendiente(null)} disabled={guardando}>
                Cancelar
              </ResultadoBtn>
            </ResultadoBotones>
            <JugadoresGrid>
              {jugadoresSeleccionables.map((j) => (
                <JugadorBtn
                  key={j.codpersona}
                  onClick={() => {
                    const { target, targetEquipo } = culpaPenalPendiente;
                    setCulpaPenalPendiente(null);
                    setConfirmarDisparo({ target, targetEquipo, equipoJugador: null, codpersonaCulpable: j.codpersona });
                  }}
                  disabled={guardando}
                >
                  {j.apodo || j.nombre}
                </JugadorBtn>
              ))}
            </JugadoresGrid>
          </ResultadoPanel>
        )}

          {confirmarDisparo && (
          <ResultadoPanel>
            <ResultadoTexto>
              ¿Patea a los palos o sigue jugando?
            </ResultadoTexto>
            <ResultadoBotones>
              <ResultadoBtn
                tipo="G"
                onClick={async () => {
                  const { target, targetEquipo, equipoJugador, codpersonaCulpable, equipoInfractor } = confirmarDisparo;
                  setConfirmarDisparo(null);
                  if (codpersonaCulpable !== undefined) {
                    registrarSuceso(target, codpersonaCulpable, targetEquipo);
                  } else {
                    if (equipoInfractor) {
                      // Deja constancia del Penal del equipo infractor antes de
                      // registrar el resultado (Convertido/Errado) del beneficiario.
                      await registrarMarcaEquipo(target, equipoInfractor);
                    }
                    registrarConEquipo(target, targetEquipo, equipoJugador);
                  }
                }}
                disabled={guardando}
              >
                Palos
              </ResultadoBtn>
              <ResultadoBtn
                tipo="N"
                onClick={() => {
                  const { target, equipoInfractor } = confirmarDisparo;
                  setConfirmarDisparo(null);
                  if (equipoInfractor) {
                    // Aunque no se patee, queda constancia de que el penal se cometió.
                    registrarMarcaEquipo(target, equipoInfractor);
                  }
                }}
                disabled={guardando}
              >
                Juega
              </ResultadoBtn>
            </ResultadoBotones>
          </ResultadoPanel>
        )}

          {sucesoParaEquipo && (
          <ResultadoPanel>
            <ResultadoTexto>
              <b>{sucesoParaEquipo.descripcion}</b> —{" "}
              {esSucesoPateable(sucesoParaEquipo) ? "¿qué equipo hizo el penal?" : "¿para qué equipo?"}
            </ResultadoTexto>
            <EquipoBotones>
              <EquipoBtn onClick={() => handleElegirEquipo(sucesoParaEquipo, "N")} disabled={guardando}>
                <EscudoClub src={evento?.club_escudo} nombre={evento?.club_descripcion} />
                <EquipoBtnNombre>{evento?.club_descripcion || "Nosotros"}</EquipoBtnNombre>
              </EquipoBtn>
              <EquipoBtn onClick={() => handleElegirEquipo(sucesoParaEquipo, "R")} disabled={guardando}>
                <EscudoClub src={evento?.rival_escudo} nombre={evento?.rival_descripcion || "Rival"} />
                <EquipoBtnNombre>{evento?.rival_descripcion || "Rival"}</EquipoBtnNombre>
              </EquipoBtn>
            </EquipoBotones>
            <VolverLink onClick={() => setSucesoParaEquipo(null)}>← Cancelar</VolverLink>
          </ResultadoPanel>
        )}

        {eligiendoVarianteRival && (
          <ResultadoPanel>
            <FlujoChainEquipo>
              <EscudoClub src={evento?.rival_escudo} nombre={evento?.rival_descripcion || "Rival"} />
              <span>{evento?.rival_descripcion || "Rival"}</span>
            </FlujoChainEquipo>
            <ResultadoTexto>
              <b>{eligiendoVarianteRival.root.descripcion}</b> — ¿de qué tipo?
            </ResultadoTexto>
            <ResultadoBotones>
              <ResultadoBtn
                tipo="N"
                onClick={() => {
                  const { root, target, equipo } = eligiendoVarianteRival;
                  setEligiendoVarianteRival(null);
                  registrarFlujoRival(root, target, equipo, root);
                }}
                disabled={guardando}
              >
                {eligiendoVarianteRival.root.descripcion}
              </ResultadoBtn>
              {variantesDe(eligiendoVarianteRival.root).map((v) => (
                <ResultadoBtn
                  key={v.codsuceso}
                  tipo="N"
                  onClick={() => {
                    const { root, target, equipo } = eligiendoVarianteRival;
                    setEligiendoVarianteRival(null);
                    registrarFlujoRival(root, target, equipo, v);
                  }}
                  disabled={guardando}
                >
                  {v.descripcion}
                </ResultadoBtn>
              ))}
            </ResultadoBotones>
            <CuentaRegresivaTexto>
              Se registra como {eligiendoVarianteRival.root.descripcion} en {cuentaRegresivaRival}...
            </CuentaRegresivaTexto>
            <VolverLink onClick={() => setEligiendoVarianteRival(null)}>← Cancelar</VolverLink>
          </ResultadoPanel>
        )}

        {flujoChain && (
          <ResultadoPanel>
            <FlujoChainEquipo>
              <EscudoClub
                src={flujoChain.equipo === "R" ? evento?.rival_escudo : evento?.club_escudo}
                nombre={flujoChain.equipo === "R" ? evento?.rival_descripcion || "Rival" : evento?.club_descripcion}
              />
              <span>{flujoChain.equipo === "R" ? evento?.rival_descripcion || "Rival" : evento?.club_descripcion || "Nosotros"}</span>
            </FlujoChainEquipo>
            <ResultadoTexto>
              <b>{flujoChain.root.descripcion}</b>
            </ResultadoTexto>

            {!flujoChain.rootCodeventosuceso ? (
              <>
                <ResultadoTexto>¿Qué jugador hizo {flujoChain.root.descripcion.toLowerCase()}?</ResultadoTexto>
                <JugadoresGrid>
                  {jugadoresSeleccionables.map((j) => (
                    <JugadorBtn
                      key={j.codpersona}
                      onClick={() => registrarPasoRootChain(j.codpersona)}
                      disabled={guardando}
                    >
                      {procesandoKey === `jugador-${j.codpersona}` ? <Spinner /> : (j.apodo || j.nombre)}
                    </JugadorBtn>
                  ))}
                  {jugadoresSeleccionables.length === 0 && (
                    <EmptyState>No hay jugadores citados en la convocatoria</EmptyState>
                  )}
                </JugadoresGrid>
                {variantesDe(flujoChain.root).length > 0 && (
                  <>
                    <ResultadoTexto>...o sin jugador:</ResultadoTexto>
                    <ResultadoBotones>
                      {variantesDe(flujoChain.root).map((v) => (
                        <ResultadoBtn
                          key={v.codsuceso}
                          tipo="N"
                          onClick={() => registrarVarianteRootChain(v)}
                          disabled={guardando}
                        >
                          {procesandoKey === `variante-${v.codsuceso}` ? <Spinner /> : v.descripcion}
                        </ResultadoBtn>
                      ))}
                    </ResultadoBotones>
                  </>
                )}
                <ChainStepLocked>
                  🔒 {flujoChain.target.descripcion} (elegí primero quién hizo {flujoChain.root.descripcion.toLowerCase()})
                </ChainStepLocked>
                <VolverLink onClick={() => setFlujoChain(null)}>← Cancelar</VolverLink>
              </>
            ) : (
              <>
                <ChainStepDone>
                  ✓ {flujoChain.root.descripcion}
                  {flujoChain.rootJugador ? `: ${flujoChain.rootJugador}` : ""}
                </ChainStepDone>

                <ChainStepBlock>
                  <ChainStepLabel>{flujoChain.target.descripcion}</ChainStepLabel>

                  {!flujoChain.targetCodeventosuceso ? (
                    <>
                      <ResultadoTexto>¿Quién la patea?</ResultadoTexto>
                      <JugadoresGrid>
                        {jugadoresSeleccionables.map((j) => (
                          <JugadorBtn
                            key={j.codpersona}
                            onClick={() => registrarPasoTargetChain(j.codpersona)}
                            disabled={guardando}
                          >
                            {procesandoKey === `jugador-${j.codpersona}` ? <Spinner /> : (j.apodo || j.nombre)}
                          </JugadorBtn>
                        ))}
                        {jugadoresSeleccionables.length === 0 && (
                          <EmptyState>No hay jugadores citados en la convocatoria</EmptyState>
                        )}
                      </JugadoresGrid>
                    </>
                  ) : (
                    <>
                      <ChainStepDone>
                        ✓ {flujoChain.target.descripcion}
                        {flujoChain.targetJugador ? `: ${flujoChain.targetJugador}` : ""}
                      </ChainStepDone>
                      <ResultadoBotones>
                        <ResultadoBtn tipo="G" onClick={() => finalizarResultadoChain("G")} disabled={guardando}>
                          {procesandoKey === "resultado-G" ? <Spinner /> : flujoChain.target.label_positivo || "Ganó"}
                        </ResultadoBtn>
                        <ResultadoBtn tipo="P" onClick={() => finalizarResultadoChain("P")} disabled={guardando}>
                          {procesandoKey === "resultado-P" ? <Spinner /> : flujoChain.target.label_negativo || "Perdió"}
                        </ResultadoBtn>
                        <ResultadoBtn tipo="N" onClick={() => finalizarResultadoChain(null)} disabled={guardando}>
                          {procesandoKey === "resultado-none" ? <Spinner /> : "Sin resultado"}
                        </ResultadoBtn>
                      </ResultadoBotones>
                    </>
                  )}
                </ChainStepBlock>
              </>
            )}
          </ResultadoPanel>
        )}

        {sucesoParaJugador && (
          <ResultadoPanel>
            <ResultadoTexto>
              <b>{sucesoParaJugador.descripcion}</b> —{" "}
              {sucesoParaJugadorEquipo === "R" ? "¿qué jugador cometió el penal?" : "¿de qué jugador?"}
            </ResultadoTexto>
            <ResultadoBotones>
              <ResultadoBtn
                tipo="N"
                onClick={() => registrarSuceso(sucesoParaJugador, null, sucesoParaJugadorEquipo)}
                disabled={guardando}
              >
                {procesandoKey === `suceso-${sucesoParaJugador.codsuceso}` ? <Spinner /> : "Sin Jugador"}
              </ResultadoBtn>
              <ResultadoBtn tipo="P" onClick={() => setSucesoParaJugador(null)} disabled={guardando}>
                Cancelar
              </ResultadoBtn>
            </ResultadoBotones>
            <JugadoresGrid>
              {jugadoresSeleccionables.map((j) => (
                <JugadorBtn
                  key={j.codpersona}
                  onClick={() => registrarSuceso(sucesoParaJugador, j.codpersona, sucesoParaJugadorEquipo)}
                  disabled={guardando}
                >
                  {procesandoKey === `jugador-${j.codpersona}` ? <Spinner /> : (j.apodo || j.nombre)}
                </JugadorBtn>
              ))}
              {jugadoresSeleccionables.length === 0 && (
                <EmptyState>No hay jugadores citados en la convocatoria</EmptyState>
              )}
            </JugadoresGrid>
          </ResultadoPanel>
        )}

        {sucesoParaCambio && (
          <ResultadoPanel>
            <CambioHeader>
              <CambioTitulo>🔄 {sucesoParaCambio.descripcion}</CambioTitulo>
              <CambioPasos>
                <CambioPaso tipo="sale" activo={!jugadorSale}>
                  <CambioPasoIcono tipo="sale">↓</CambioPasoIcono>
                  <CambioPasoTexto>
                    <CambioPasoLabel>Sale</CambioPasoLabel>
                    <CambioPasoJugador>
                      {jugadorSale ? jugadorSale.apodo || jugadorSale.nombre : "Elegir…"}
                    </CambioPasoJugador>
                  </CambioPasoTexto>
                </CambioPaso>
                <CambioFlecha>→</CambioFlecha>
                <CambioPaso tipo="entra" activo={!!jugadorSale}>
                  <CambioPasoIcono tipo="entra">↑</CambioPasoIcono>
                  <CambioPasoTexto>
                    <CambioPasoLabel>Entra</CambioPasoLabel>
                    <CambioPasoJugador>{jugadorSale ? "Elegir…" : "—"}</CambioPasoJugador>
                  </CambioPasoTexto>
                </CambioPaso>
              </CambioPasos>
            </CambioHeader>

            {!jugadorSale ? (
              <>
                <ResultadoTexto>¿Qué jugador sale? (en cancha)</ResultadoTexto>
                <JugadoresGrid>
                  {jugadores
                    .filter((j) => jugadoresEnCanchaIds.has(j.codpersona))
                    .map((j) => (
                      <JugadorBtn
                        key={j.codpersona}
                        tipo="sale"
                        onClick={() => setJugadorSale(j)}
                        disabled={guardando}
                      >
                        {j.apodo || j.nombre}
                      </JugadorBtn>
                    ))}
                  {jugadoresEnCanchaIds.size === 0 && (
                    <EmptyState>No hay jugadores en cancha</EmptyState>
                  )}
                </JugadoresGrid>
                <VolverLinks>
                  <VolverLink onClick={() => setSucesoParaCambio(null)}>← Volver al cronómetro</VolverLink>
                </VolverLinks>
              </>
            ) : (
              <>
                <ResultadoTexto>¿Quién entra? (en el banco)</ResultadoTexto>
                <JugadoresGrid>
                  {jugadores
                    .filter(
                      (j) =>
                        j.codpersona !== jugadorSale.codpersona &&
                        !jugadoresEnCanchaIds.has(j.codpersona) &&
                        !jugadoresExpulsadosIds.has(j.codpersona)
                    )
                    .map((j) => (
                      <JugadorBtn
                        key={j.codpersona}
                        tipo="entra"
                        onClick={() => registrarCambio(sucesoParaCambio, jugadorSale.codpersona, j.codpersona)}
                        disabled={guardando}
                      >
                        {procesandoKey === `entra-${j.codpersona}` ? <Spinner /> : (j.apodo || j.nombre)}
                      </JugadorBtn>
                    ))}
                  {jugadores.filter(
                    (j) =>
                      j.codpersona !== jugadorSale.codpersona &&
                      !jugadoresEnCanchaIds.has(j.codpersona) &&
                      !jugadoresExpulsadosIds.has(j.codpersona)
                  ).length === 0 && <EmptyState>No hay jugadores en el banco</EmptyState>}
                </JugadoresGrid>
                <VolverLinks>
                  <VolverLink onClick={() => setJugadorSale(null)}>← Elegir otro jugador que sale</VolverLink>
                  <VolverLink
                    onClick={() => {
                      setSucesoParaCambio(null);
                      setJugadorSale(null);
                    }}
                  >
                    ← Volver al cronómetro
                  </VolverLink>
                </VolverLinks>
              </>
            )}
          </ResultadoPanel>
        )}

        {sucesoSeleccionado && (
          <ResultadoPanel>
            <ResultadoTexto>
              Registraste <b>{sucesoSeleccionado.descripcion}</b> a los{" "}
              {pad(sucesoSeleccionado.minuto)}:{pad(sucesoSeleccionado.segundo)}
            </ResultadoTexto>
            <ResultadoBotones>
              <ResultadoBtn tipo="G" onClick={() => handleResultado("G")} disabled={guardando}>
                {procesandoKey === "resultado-G" ? <Spinner /> : sucesoSeleccionado.label_positivo || "Ganó"}
              </ResultadoBtn>
              <ResultadoBtn tipo="P" onClick={() => handleResultado("P")} disabled={guardando}>
                {procesandoKey === "resultado-P" ? <Spinner /> : sucesoSeleccionado.label_negativo || "Perdió"}
              </ResultadoBtn>
              <ResultadoBtn tipo="N" onClick={() => handleResultado(null)} disabled={guardando}>
                {procesandoKey === "resultado-none" ? <Spinner /> : "Sin resultado"}
              </ResultadoBtn>
            </ResultadoBotones>
            {(sucesoSeleccionado.motivo_positivo || sucesoSeleccionado.motivo_negativo) && (
              <ResultadoBotones>
                {sucesoSeleccionado.motivo_positivo && (
                  <ResultadoBtn
                    tipo="G"
                    onClick={() => handleResultado("G", sucesoSeleccionado.motivo_positivo)}
                    disabled={guardando}
                  >
                    {procesandoKey === `resultado-G-${sucesoSeleccionado.motivo_positivo}` ? (
                      <Spinner />
                    ) : (
                      sucesoSeleccionado.motivo_positivo
                    )}
                  </ResultadoBtn>
                )}
                {sucesoSeleccionado.motivo_negativo && (
                  <ResultadoBtn
                    tipo="P"
                    onClick={() => handleResultado("P", sucesoSeleccionado.motivo_negativo)}
                    disabled={guardando}
                  >
                    {procesandoKey === `resultado-P-${sucesoSeleccionado.motivo_negativo}` ? (
                      <Spinner />
                    ) : (
                      sucesoSeleccionado.motivo_negativo
                    )}
                  </ResultadoBtn>
                )}
              </ResultadoBotones>
            )}
            <VolverLink onClick={() => setSucesoSeleccionado(null)}>← Volver al cronómetro</VolverLink>
          </ResultadoPanel>
          )}
          </ModalOverlay>
        )}

        <Seccion>
          <SeccionHeader>
            <SeccionTitulo>
              <TituloTab activo={vistaRegistros === "registros"} onClick={() => setVistaRegistros("registros")}>
                Registros
              </TituloTab>
              {" / "}
              <TituloTab activo={vistaRegistros === "resumen"} onClick={() => setVistaRegistros("resumen")}>
                Resumen
              </TituloTab>
            </SeccionTitulo>
            {vistaRegistros === "registros" && (
            <FiltroEquipoBotones>
              <FiltroEquipoBtn
                activo={filtroEquipoRegistrados === "T"}
                color="#4a90e2"
                onClick={() => setFiltroEquipoRegistrados("T")}
              >
                Todos
              </FiltroEquipoBtn>
              <FiltroEquipoBtn
                activo={filtroEquipoRegistrados === "N"}
                color="#1d3557"
                title={evento?.club_descripcion || "Nosotros"}
                onClick={() => setFiltroEquipoRegistrados("N")}
              >
                <EscudoClub src={evento?.club_escudo} nombre={evento?.club_descripcion} />
              </FiltroEquipoBtn>
              <FiltroEquipoBtn
                activo={filtroEquipoRegistrados === "R"}
                color="#e63946"
                title={evento?.rival_descripcion || "Rival"}
                onClick={() => setFiltroEquipoRegistrados("R")}
              >
                <EscudoClub src={evento?.rival_escudo} nombre={evento?.rival_descripcion || "Rival"} />
              </FiltroEquipoBtn>
            </FiltroEquipoBotones>
            )}
          </SeccionHeader>
          {vistaRegistros === "resumen" ? (
            <ResumenTabla>
              <ResumenHeaderFila>
                <ResumenCeldaNombre />
                <ResumenHeaderEquipo title={evento?.club_descripcion || "Nosotros"}>
                  <EscudoClub src={evento?.club_escudo} nombre={evento?.club_descripcion} />
                  {evento?.club_descripcion || "Nosotros"}
                </ResumenHeaderEquipo>
                <ResumenHeaderEquipo title={evento?.rival_descripcion || "Rival"}>
                  <EscudoClub src={evento?.rival_escudo} nombre={evento?.rival_descripcion || "Rival"} />
                  {evento?.rival_descripcion || "Rival"}
                </ResumenHeaderEquipo>
              </ResumenHeaderFila>
              {descripcionesResumen.map((descripcion) => (
                <ResumenFila key={descripcion}>
                  <ResumenCeldaNombre>{descripcion}</ResumenCeldaNombre>
                  <ResumenCantidad>{resumenPorEquipo.N[descripcion] || 0}</ResumenCantidad>
                  <ResumenCantidad>{resumenPorEquipo.R[descripcion] || 0}</ResumenCantidad>
                </ResumenFila>
              ))}
              {descripcionesResumen.length === 0 && (
                <EmptyState>Sin sucesos registrados</EmptyState>
              )}
            </ResumenTabla>
          ) : (
          <Lista>
            {(mostrarTodosRegistrados
              ? registradosFiltrados
              : registradosFiltrados.slice(-REGISTRADOS_VISIBLES)
            ).map((r) => (
              <ItemRegistrado key={r.codeventosuceso} equipo={r.equipo}>
                <ItemTiempo>{pad(r.minuto)}:{pad(r.segundo)}</ItemTiempo>
                {r.equipo === "R" ? (
                  <ItemEquipoBadge title={evento?.rival_descripcion || "Rival"}>
                    <EscudoClub src={evento?.rival_escudo} nombre={evento?.rival_descripcion || "Rival"} />
                  </ItemEquipoBadge>
                ) : (
                  <ItemEquipoBadge title={evento?.club_descripcion || "Nosotros"}>
                    <EscudoClub src={evento?.club_escudo} nombre={evento?.club_descripcion} />
                  </ItemEquipoBadge>
                )}
                <ItemDescripcion>
                  {descripcionRegistro(r)}
                  {r.es_cambio === "S" ? (
                    <ItemCambioRow>
                      {r.persona && <ItemCambioTag tipo="sale">↓ {r.persona}</ItemCambioTag>}
                      {r.persona_entra && <ItemCambioTag tipo="entra">↑ {r.persona_entra}</ItemCambioTag>}
                    </ItemCambioRow>
                  ) : (
                    r.persona && (
                      <ItemJugador>
                        {" "}
                        · {tarjetaIcono(r) && `${tarjetaIcono(r)} `}
                        {r.persona}
                      </ItemJugador>
                    )
                  )}
                </ItemDescripcion>
                {r.lleva_resultado === "S" && !(r.resultado == null && esSucesoPateable(r)) && (
                  <ItemResultado tipo={r.resultado}>{resultadoLabel(r)}</ItemResultado>
                )}
                {puntosSuceso(r) > 0 && <ItemPuntos>+{puntosSuceso(r)}</ItemPuntos>}
                {!soloLectura && !espectador && (
                  <QuitarBtn onClick={() => handleEliminar(r.codeventosuceso)}>✕</QuitarBtn>
                )}
              </ItemRegistrado>
            ))}
            {registradosFiltrados.length === 0 && (
              <EmptyState>
                {registrados.length === 0 ? "Todavía no hay sucesos registrados" : "No hay sucesos registrados de este equipo"}
              </EmptyState>
            )}
          </Lista>
          )}
          {vistaRegistros === "registros" && registradosFiltrados.length > REGISTRADOS_VISIBLES && (
            <ToggleBtn onClick={() => setMostrarTodosRegistrados((v) => !v)}>
              {mostrarTodosRegistrados
                ? "▲ Ver menos"
                : `▼ Ver los ${registradosFiltrados.length - REGISTRADOS_VISIBLES} anteriores`}
            </ToggleBtn>
          )}
        </Seccion>

        {jugadores.length > 0 && (
          <Seccion>
            <SeccionTitulo>Minutos jugados</SeccionTitulo>
            {mostrarMinutos && (
              <MinutosLista>
                {jugadores
                  .slice()
                  .sort((a, b) => (minutosJugados[b.codpersona] || 0) - (minutosJugados[a.codpersona] || 0))
                  .map((j) => (
                    <MinutosItem key={j.codpersona}>
                      <MinutosNombre>{j.apodo || j.nombre}</MinutosNombre>
                      <MinutosEstado enCancha={jugadoresEnCanchaIds.has(j.codpersona)}>
                        {jugadoresEnCanchaIds.has(j.codpersona) ? "En cancha" : "Banco"}
                      </MinutosEstado>
                      <MinutosValor>{minutosJugados[j.codpersona] || 0}'</MinutosValor>
                    </MinutosItem>
                  ))}
              </MinutosLista>
            )}
            <ToggleBtn onClick={() => setMostrarMinutos((v) => !v)}>
              {mostrarMinutos ? "▲ Ocultar minutos jugados" : "▼ Ver minutos jugados"}
            </ToggleBtn>
          </Seccion>
        )}

        <FooterButtons>
          <BackButton
            onClick={async () => {
              if (await confirmarSalida())
                navigate("/dashboard", { state: { activeTab: "eventos" } });
            }}
          >
            ← Volver al Dashboard
          </BackButton>
        </FooterButtons>
      </Container>
    </>
  );
};

export default PartidoEnVivo;

const Container = styled.div`
  max-width: 700px;
  margin: 0 auto;
  padding: 20px;
`;

const Spinner = styled.span`
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spinnerRotate 0.6s linear infinite;
  vertical-align: middle;

  @keyframes spinnerRotate {
    to {
      transform: rotate(360deg);
    }
  }
`;

const Centrado = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: #666;
`;

const Title = styled.h2`
  margin-bottom: 4px;
  text-align: center;
`;

const DivisionSubtitle = styled.div`
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
`;

const FechaEvento = styled.div`
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  color: #999;
  margin-bottom: 14px;
`;

const Tanteador = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;

  @media (max-width: 480px) {
    gap: 10px;
  }
`;

const EquipoBox = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 90px;
`;

const EquipoNombre = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: #333;
  text-align: center;
  max-width: 120px;
`;

const Puntaje = styled.div`
  font-size: 32px;
  font-weight: 800;
  color: #1d3557;
  font-variant-numeric: tabular-nums;
`;

const TanteadorVs = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: #aaa;
`;

const EscudoImg = styled.img`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
  background: #f4f4f4;
`;

const EscudoFallback = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #eef2f7;
  color: #4a90e2;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
`;

const SoloLecturaBadge = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #856404;
  background: #fff3cd;
  display: inline-block;
  padding: 4px 12px;
  border-radius: 14px;
  margin: 0 auto 12px;
`;

const EspectadorBadge = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #084298;
  background: #cfe2ff;
  text-align: center;
  padding: 10px 16px;
  border-radius: 14px;
  margin: 0 auto 20px;
`;

const TomarControlBtn = styled.button`
  display: block;
  margin: 10px auto 0;
  background: #084298;
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
`;

const CronometroRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 16px 0 4px;
`;

const Cronometro = styled.div`
  text-align: center;
  font-size: 48px;
  font-weight: 700;
  color: #1d3557;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  user-select: none;
`;

const EditarTiempoBtn = styled.button`
  border: none;
  background: #eef2f7;
  color: #4a90e2;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  font-size: 14px;
  cursor: pointer;
  flex-shrink: 0;

  &:hover {
    background: #e0e8f2;
  }
`;

const IniciarButton = styled.button`
  padding: 14px 32px;
  border-radius: 30px;
  border: none;
  background: #2ecc71;
  color: white;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    background: #27ae60;
  }
`;

const ControlesRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  margin-bottom: 20px;

  @media (max-width: 480px) {
    flex-wrap: nowrap;
    justify-content: flex-start;
    overflow-x: auto;
    gap: 6px;
    padding-bottom: 4px;
    -webkit-overflow-scrolling: touch;
  }
`;

const ControlBtn = styled.button`
  padding: 10px 18px;
  border-radius: 20px;
  border: none;
  background: #4a90e2;
  color: white;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;

  &:hover {
    background: #3b7dc4;
  }

  @media (max-width: 480px) {
    padding: 8px 12px;
    font-size: 12px;
    flex-shrink: 0;
    white-space: nowrap;
  }
`;

const AjusteBtn = styled.button`
  padding: 10px 14px;
  border-radius: 20px;
  border: none;
  background: #ecf0f1;
  color: #333;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;

  &:hover {
    background: #dbe4ea;
  }

  @media (max-width: 480px) {
    padding: 8px 10px;
    font-size: 12px;
    flex-shrink: 0;
    white-space: nowrap;
  }
`;

const ReiniciarBtn = styled.button`
  padding: 10px 18px;
  border-radius: 20px;
  border: none;
  background: #f4a261;
  color: white;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;

  &:hover {
    background: #e08b47;
  }

  @media (max-width: 480px) {
    padding: 8px 12px;
    font-size: 12px;
    flex-shrink: 0;
    white-space: nowrap;
  }
`;

const FinalizarBtn = styled.button`
  padding: 10px 18px;
  border-radius: 20px;
  border: none;
  background: #e63946;
  color: white;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;

  &:hover {
    background: #c62d3a;
  }

  @media (max-width: 480px) {
    padding: 8px 12px;
    font-size: 12px;
    flex-shrink: 0;
    white-space: nowrap;
  }
`;

const IrAMinutoRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-bottom: 20px;
`;

const IrAMinutoInput = styled.input`
  width: 52px;
  padding: 8px 6px;
  border-radius: 8px;
  border: 1px solid #dbe4ea;
  text-align: center;
  font-size: 14px;
  font-variant-numeric: tabular-nums;

  &::-webkit-inner-spin-button,
  &::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
`;

const IrAMinutoSeparador = styled.span`
  font-weight: 700;
  color: #888;
`;

const IrAMinutoBtn = styled.button`
  padding: 8px 16px;
  border-radius: 20px;
  border: none;
  background: ${({ tipo }) => (tipo === "cancelar" ? "#ecf0f1" : "#1d3557")};
  color: ${({ tipo }) => (tipo === "cancelar" ? "#333" : "white")};
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: ${({ tipo }) => (tipo === "cancelar" ? "#dbe4ea" : "#16273f")};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const PausadoAviso = styled.div`
  text-align: center;
  padding: 20px;
  color: #856404;
  background: #fff3cd;
  border-radius: 12px;
  font-weight: 600;
  margin-bottom: 24px;
`;

const Label = styled.div`
  font-weight: 600;
  color: #333;
  margin-bottom: 10px;
`;

const SucesosGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 24px;

  @media (max-width: 480px) {
    gap: 4px;
  }
`;

const SucesoBtn = styled.button`
  padding: 14px 18px;
  border-radius: 12px;
  border: none;
  background: #1d3557;
  color: white;
  font-weight: 600;
  font-size: 15px;
  cursor: pointer;
  flex: 1 1 calc(33% - 10px);
  min-width: 100px;

  &:hover {
    background: #16273f;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  @media (max-width: 480px) {
    padding: 10px 6px;
    font-size: 13px;
    font-weight: 600;
    border-radius: 8px;
    flex: 1 1 calc(33% - 8px);
    min-width: 0;
    min-height: 44px;
    line-height: 1.25;
  }
`;

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(20, 24, 30, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  padding-top: calc(16px + env(safe-area-inset-top, 0px));
  padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  z-index: 1000;
  overflow-y: auto;
`;

const ResultadoPanel = styled.div`
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
  text-align: center;
  width: 100%;
  max-width: 480px;
  max-height: 100%;
  overflow-y: auto;
`;

const PanelPartido = styled.div`
  background: #fff;
  border-radius: 14px;
  padding: 20px;
  margin-bottom: 24px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  border: 2px solid #d8dee6;
`;

const ResultadoTexto = styled.div`
  font-size: 16px;
  color: #333;
  margin-bottom: 16px;
`;

const CuentaRegresivaTexto = styled.div`
  font-size: 14px;
  color: #888;
  text-align: center;
  margin-bottom: 16px;
`;

const ResultadoBotones = styled.div`
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 14px;
`;

const ResultadoBtn = styled.button`
  padding: 12px 20px;
  border-radius: 20px;
  border: none;
  color: white;
  font-weight: 700;
  cursor: pointer;
  background: ${({ tipo }) => (tipo === "G" ? "#2ecc71" : tipo === "P" ? "#e63946" : "#95a5a6")};

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const VolverLinks = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  margin-bottom: 16px;
`;

const VolverLink = styled.div`
  display: inline-block;
  color: #fff;
  background: #e63946;
  font-weight: 700;
  cursor: pointer;
  font-size: 14px;
  padding: 10px 18px;
  border-radius: 10px;
  box-shadow: 0 2px 4px rgba(230, 57, 70, 0.35);
  text-align: center;

  &:hover {
    background: #d62839;
  }

  &:active {
    transform: translateY(1px);
  }
`;

const JugadoresGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  margin-bottom: 16px;
`;

const JugadorBtn = styled.button`
  padding: 10px 16px;
  border-radius: 20px;
  border: none;
  background: ${({ tipo }) => (tipo === "sale" ? "#e63946" : tipo === "entra" ? "#2ecc71" : "#4a90e2")};
  color: white;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;

  &:hover {
    background: ${({ tipo }) => (tipo === "sale" ? "#c62d3a" : tipo === "entra" ? "#27ae60" : "#3b7dc4")};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  @media (max-width: 480px) {
    padding: 7px 12px;
    font-size: 12px;
  }
`;

const EquipoBotones = styled.div`
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 14px;
`;

const EquipoBtn = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 14px 22px;
  border-radius: 14px;
  border: 2px solid #d8dee6;
  background: #fff;
  cursor: pointer;
  min-width: 110px;

  &:hover {
    border-color: #4a90e2;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const EquipoBtnNombre = styled.div`
  font-weight: 700;
  font-size: 14px;
  color: #333;
`;

const FlujoChainEquipo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
  margin-bottom: 10px;
  font-size: 13px;
  font-weight: 600;
  color: #555;

  img,
  div {
    width: 24px;
    height: 24px;
    font-size: 12px;
  }
`;

const ChainStepBlock = styled.div`
  margin-top: 18px;
  padding-top: 18px;
  border-top: 1px dashed #ddd;
`;

const ChainStepLabel = styled.div`
  font-weight: 800;
  font-size: 18px;
  color: #e76f51;
  margin-bottom: 10px;
  text-align: center;
`;

const ChainStepDone = styled.div`
  font-weight: 600;
  color: #2ecc71;
  font-size: 15px;
  margin-bottom: 6px;
  text-align: center;
`;

const ChainStepLocked = styled.div`
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px dashed #eee;
  color: #aaa;
  font-size: 14px;
  font-style: italic;
  text-align: center;
`;

const CambioHeader = styled.div`
  margin-bottom: 18px;
`;

const CambioTitulo = styled.div`
  font-weight: 700;
  font-size: 16px;
  color: #1d3557;
  margin-bottom: 14px;
  text-align: center;
`;

const CambioPasos = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
`;

const CambioFlecha = styled.div`
  font-size: 20px;
  color: #ccc;
  font-weight: 700;
`;

const CambioPaso = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 12px;
  min-width: 130px;
  background: ${({ activo, tipo }) => (activo ? (tipo === "sale" ? "#fdecea" : "#e8f8ef") : "#f4f4f4")};
  border: 2px solid ${({ activo, tipo }) => (activo ? (tipo === "sale" ? "#e63946" : "#2ecc71") : "transparent")};
  opacity: ${({ activo }) => (activo ? 1 : 0.6)};
`;

const CambioPasoIcono = styled.div`
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: white;
  background: ${({ tipo }) => (tipo === "sale" ? "#e63946" : "#2ecc71")};
`;

const CambioPasoTexto = styled.div`
  display: flex;
  flex-direction: column;
  line-height: 1.25;
  text-align: left;
`;

const CambioPasoLabel = styled.span`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #888;
`;

const CambioPasoJugador = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: #333;
`;

const MinutosLista = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const MinutosItem = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  background: #f5f8fc;
  border-radius: 8px;
`;

const MinutosNombre = styled.div`
  flex: 1;
  font-weight: 600;
  color: #333;
  font-size: 14px;
`;

const MinutosEstado = styled.span`
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 10px;
  color: ${({ enCancha }) => (enCancha ? "#2ecc71" : "#888")};
  background: ${({ enCancha }) => (enCancha ? "#e8f8ef" : "#eee")};
`;

const MinutosValor = styled.span`
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  color: #1d3557;
  width: 36px;
  text-align: right;
  flex-shrink: 0;
`;

const Seccion = styled.div`
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
`;

const SeccionTitulo = styled.h3`
  margin: 0 0 12px;
  font-size: 16px;
  color: #333;
`;

const TituloTab = styled.span`
  cursor: pointer;
  color: ${({ activo }) => (activo ? "#333" : "#aaa")};
  text-decoration: ${({ activo }) => (activo ? "underline" : "none")};

  &:hover {
    color: #333;
  }
`;

const ResumenTabla = styled.div`
  display: flex;
  flex-direction: column;
  background: #f8f9fa;
  border-radius: 10px;
  padding: 4px 14px;
`;

const ResumenFila = styled.div`
  display: grid;
  grid-template-columns: 1fr 70px 70px;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid #e9e9e9;
  font-size: 14px;
  color: #333;

  &:last-child {
    border-bottom: none;
  }
`;

const ResumenHeaderFila = styled(ResumenFila)`
  border-bottom: 2px solid #ddd;
`;

const ResumenHeaderEquipo = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-weight: 700;
  color: #333;
  text-align: center;

  img, svg {
    width: 20px;
    height: 20px;
  }
`;

const ResumenCeldaNombre = styled.div``;

const ResumenCantidad = styled.div`
  font-weight: 700;
  color: #4a90e2;
  text-align: center;
`;

const SeccionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;

  ${SeccionTitulo} {
    margin-bottom: 0;
  }
`;

const FiltroEquipoBotones = styled.div`
  display: flex;
  gap: 6px;
`;

const FiltroEquipoBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 14px;
  border: 2px solid ${({ activo, color }) => (activo ? color : "transparent")};
  background: ${({ activo }) => (activo ? "#fff" : "#f0f2f5")};
  font-size: 12px;
  font-weight: 600;
  color: #333;
  cursor: pointer;

  img,
  div {
    width: 16px;
    height: 16px;
    font-size: 8px;
  }

  &:hover {
    background: #e4e8ed;
  }
`;

const ToggleBtn = styled.button`
  display: block;
  margin: 10px auto 0;
  padding: 6px 14px;
  border-radius: 14px;
  border: none;
  background: #eef2f7;
  color: #4a90e2;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;

  &:hover {
    background: #e0e8f2;
  }
`;

const Lista = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const ItemRegistrado = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  border-left: 4px solid ${({ equipo }) => (equipo === "R" ? "#e63946" : "#1d3557")};
  background: ${({ equipo }) => (equipo === "R" ? "#fdecea" : "#eef3f9")};
`;

const ItemTiempo = styled.span`
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  color: #1d3557;
  width: 48px;
  flex-shrink: 0;
`;

const ItemEquipoBadge = styled.span`
  display: flex;
  align-items: center;
  flex-shrink: 0;

  img,
  div {
    width: 20px;
    height: 20px;
    font-size: 10px;
  }
`;

const ItemDescripcion = styled.div`
  flex: 1;
  font-weight: 600;
  color: #333;
`;

const ItemJugador = styled.span`
  font-weight: 400;
  color: #888;
  font-size: 13px;
`;

const ItemCambioRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
`;

const ItemCambioTag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 12px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 10px;
  color: ${({ tipo }) => (tipo === "sale" ? "#e63946" : "#2ecc71")};
  background: ${({ tipo }) => (tipo === "sale" ? "#fdecea" : "#e8f8ef")};
`;

const ItemResultado = styled.span`
  font-size: 12px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 12px;
  color: white;
  background: ${({ tipo }) => (tipo === "G" ? "#2ecc71" : tipo === "P" ? "#e63946" : "#95a5a6")};
`;

const ItemPuntos = styled.span`
  font-size: 12px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 12px;
  color: white;
  background: #2ecc71;
  flex-shrink: 0;
`;

const QuitarBtn = styled.button`
  border: none;
  background: transparent;
  color: #dc3545;
  cursor: pointer;
  font-size: 14px;
  padding: 4px;

  &:hover {
    opacity: 0.7;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 16px;
  color: #999;
  width: 100%;
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
