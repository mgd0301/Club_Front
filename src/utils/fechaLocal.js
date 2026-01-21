// utils/fechaLocal.js

/**
 * Hook personalizado para manejo de fechas con zona horaria de Argentina
 * Detecta automáticamente si el usuario está en Argentina y ajusta las fechas
 */

import { useState, useEffect, useMemo } from 'react';

// Lista completa de zonas horarias de Argentina
const ZONAS_ARGENTINA = [
  "America/Argentina/Buenos_Aires",
  "America/Argentina/Cordoba",
  "America/Argentina/Salta",
  "America/Argentina/Jujuy",
  "America/Argentina/Tucuman",
  "America/Argentina/Catamarca",
  "America/Argentina/La_Rioja",
  "America/Argentina/San_Juan",
  "America/Argentina/Mendoza",
  "America/Argentina/San_Luis",
  "America/Argentina/Rio_Gallegos",
  "America/Argentina/Ushuaia",
  "America/Argentina/ComodRivadavia",
];

/**
 * Obtiene la zona horaria del navegador del usuario
 * @returns {string} Zona horaria detectada
 */
const detectarZonaUsuario = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    console.warn("No se pudo detectar zona horaria, usando Argentina por defecto:", error);
    return "America/Argentina/Buenos_Aires";
  }
};

/**
 * Verifica si una zona horaria es de Argentina
 * @param {string} zona - Zona horaria a verificar
 * @returns {boolean}
 */
const esZonaArgentina = (zona) => {
  return ZONAS_ARGENTINA.some(zonaArg => 
    zona === zonaArg || zona.includes('Argentina')
  );
};

/**
 * Hook principal para manejo de fechas
 * @returns {Object} Funciones y datos para manejo de fechas
 */
export const useFechaLocal = () => {
  const [zonaHoraria, setZonaHoraria] = useState(detectarZonaUsuario);
  const [cargando, setCargando] = useState(false);
  
  const esUsuarioArgentina = useMemo(() => 
    esZonaArgentina(zonaHoraria),
    [zonaHoraria]
  );

  // Zona horaria a usar para mostrar fechas
  const zonaParaMostrar = useMemo(() => 
    esUsuarioArgentina ? zonaHoraria : "America/Argentina/Buenos_Aires",
    [esUsuarioArgentina, zonaHoraria]
  );

  /**
   * Formatea una fecha UTC a la zona horaria correspondiente
   * @param {string|Date} fechaUTC - Fecha en UTC
   * @param {string} formato - Formato deseado
   * @param {boolean} mostrarInfoZona - Incluir información de zona
   * @returns {Object|string} Fecha formateada
   */
  const formatearFecha = useMemo(() => {
    return (fechaUTC, formato = "evento-header", mostrarInfoZona = false) => {
      if (!fechaUTC) {
        return mostrarInfoZona 
          ? { fecha: "---", hora: "--:--", zona: null, esArgentina: esUsuarioArgentina }
          : { fecha: "---", hora: "--:--" };
      }

      try {
        const fecha = new Date(fechaUTC);
        
        // Validar que la fecha sea válida
        if (isNaN(fecha.getTime())) {
          throw new Error("Fecha inválida");
        }

        const opcionesBase = {
          timeZone: zonaParaMostrar,
          hour12: false,
        };

        let resultado;
        
        switch (formato) {
          case "evento-header":
            resultado = {
              fecha: fecha.toLocaleDateString("es-AR", {
                ...opcionesBase,
                weekday: "short",
                day: "2-digit",
                month: "2-digit",
              }),
              hora: fecha.toLocaleTimeString("es-AR", {
                ...opcionesBase,
                hour: "2-digit",
                minute: "2-digit",
              }),
            };
            break;

          case "solo-hora":
            resultado = fecha.toLocaleTimeString("es-AR", {
              ...opcionesBase,
              hour: "2-digit",
              minute: "2-digit",
            });
            break;

          case "solo-fecha":
            resultado = fecha.toLocaleDateString("es-AR", {
              ...opcionesBase,
              weekday: "long",
              day: "2-digit",
              month: "long",
              year: "numeric",
            });
            break;

          case "fecha-corta":
            resultado = fecha.toLocaleDateString("es-AR", {
              ...opcionesBase,
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            });
            break;

          case "input-date": // Para inputs type="date" (formato YYYY-MM-DD)
            resultado = fecha.toLocaleDateString("fr-CA", {
              ...opcionesBase,
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            });
            break;

          case "completa":
            resultado = fecha.toLocaleString("es-AR", {
              ...opcionesBase,
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });
            break;

          default:
            resultado = fecha.toLocaleString("es-AR", opcionesBase);
        }

        // Si se solicita información de zona, agregarla
        if (mostrarInfoZona && typeof resultado === 'object') {
          resultado.zona = zonaParaMostrar;
          resultado.esArgentina = esUsuarioArgentina;
          resultado.zonaUsuario = zonaHoraria;
        }

        return resultado;

      } catch (error) {
        console.error("Error formateando fecha:", error, fechaUTC);
        const errorResult = mostrarInfoZona 
          ? { fecha: "Error", hora: "--:--", zona: null, esArgentina: false }
          : { fecha: "Error", hora: "--:--" };
        return errorResult;
      }
    };
  }, [zonaParaMostrar, esUsuarioArgentina, zonaHoraria]);

  /**
   * Convierte una fecha local a UTC para enviar al servidor
   * @param {string} fechaLocal - Fecha en formato local
   * @param {string} hora - Hora opcional (HH:mm)
   * @returns {string} Fecha en ISO string (UTC)
   */
  const convertirLocalAUTC = (fechaLocal, hora = "00:00") => {
    try {
      const [anio, mes, dia] = fechaLocal.split('-');
      const [horas, minutos] = hora.split(':');
      
      // Crear fecha en zona Argentina
      const fecha = new Date(Date.UTC(
        parseInt(anio),
        parseInt(mes) - 1,
        parseInt(dia),
        parseInt(horas),
        parseInt(minutos)
      ));
      
      return fecha.toISOString();
    } catch (error) {
      console.error("Error convirtiendo fecha a UTC:", error);
      return new Date().toISOString();
    }
  };

  /**
   * Obtiene la diferencia horaria entre la zona del usuario y Argentina
   * @returns {number} Diferencia en horas (positivo si Argentina está adelantada)
   */
  const obtenerDiferenciaHoraria = () => {
    try {
      const ahora = new Date();
      const horaArgentina = new Date(
        ahora.toLocaleString("en-US", { 
          timeZone: "America/Argentina/Buenos_Aires" 
        })
      );
      const horaUsuario = new Date(
        ahora.toLocaleString("en-US", { 
          timeZone: zonaHoraria 
        })
      );
      
      return (horaArgentina - horaUsuario) / (1000 * 60 * 60);
    } catch (error) {
      console.error("Error calculando diferencia horaria:", error);
      return 0;
    }
  };

  /**
   * Obtiene información legible sobre la diferencia horaria
   * @returns {Object} Información formateada
   */
  const getInfoDiferencia = () => {
    const diff = obtenerDiferenciaHoraria();
    
    if (diff === 0) return { 
      texto: "Misma hora", 
      emoji: "✅", 
      diff: 0 
    };
    
    if (diff > 0) return { 
      texto: `Argentina +${Math.abs(diff)}h`, 
      emoji: "⏫", 
      diff 
    };
    
    return { 
      texto: `Argentina -${Math.abs(diff)}h`, 
      emoji: "⏬", 
      diff 
    };
  };

  /**
   * Actualiza manualmente la zona horaria
   * @param {string} nuevaZona - Nueva zona horaria
   */
  const actualizarZonaHoraria = (nuevaZona) => {
    if (ZONAS_ARGENTINA.includes(nuevaZona) || nuevaZona.includes('Argentina')) {
      setZonaHoraria(nuevaZona);
    } else {
      console.warn(`Zona horaria "${nuevaZona}" no reconocida como Argentina`);
    }
  };

  return {
    // Estado
    zonaHoraria,
    zonaParaMostrar,
    esUsuarioArgentina,
    cargando,
    
    // Funciones principales
    formatearFecha,
    convertirLocalAUTC,
    
    // Utilidades
    obtenerDiferenciaHoraria,
    getInfoDiferencia,
    actualizarZonaHoraria,
    
    // Constantes útiles
    ZONAS_ARGENTINA,
  };
};

/**
 * Función independiente (sin hook) para usar fuera de componentes React
 * @param {string|Date} fechaUTC - Fecha en UTC
 * @param {string} zona - Zona horaria destino (opcional)
 * @returns {Object} Fecha formateada
 */
export const formatearFechaStandalone = (fechaUTC, zona = "America/Argentina/Buenos_Aires") => {
  if (!fechaUTC) return { fecha: "---", hora: "--:--" };
  
  try {
    const fecha = new Date(fechaUTC);
    const opciones = {
      timeZone: zona,
      hour12: false,
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    };
    
    return {
      fecha: fecha.toLocaleDateString("es-AR", opciones),
      hora: fecha.toLocaleTimeString("es-AR", opciones),
      zona,
    };
  } catch (error) {
    console.error("Error en formatearFechaStandalone:", error);
    return { fecha: "Error", hora: "--:--", zona };
  }
};

export default useFechaLocal;