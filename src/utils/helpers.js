/**
 * Convierte fecha y hora LOCAL del usuario a UTC
 * @param {string} fecha - Formato "YYYY-MM-DD"
 * @param {string} hora - Formato "HH:MM" (opcional, si no se pasa usa "00:00")
 * @returns {string} - Fecha UTC en formato "YYYY-MM-DD HH:MM:SS"
 * 
 * @example
 * localToUTC("2026-04-08", "23:00") // "2026-04-09 02:00:00" (Argentina UTC-3)
 */
export const localToUTC = (fecha, hora = "00:00:00") => {
  if (!fecha) return null;
  
  // Crear objeto Date con la hora local del usuario
  const fechaHoraLocal = `${fecha}T${hora}`;  // ← SACALE el ":00" extra
  const dateLocal = new Date(fechaHoraLocal);
  
  // Si la fecha es inválida, retornar null
  if (isNaN(dateLocal.getTime())) return null;
  
  // Extraer componentes en UTC
  const año = dateLocal.getUTCFullYear();
  const mes = String(dateLocal.getUTCMonth() + 1).padStart(2, '0');
  const dia = String(dateLocal.getUTCDate()).padStart(2, '0');
  const horasUTC = String(dateLocal.getUTCHours()).padStart(2, '0');
  const minutosUTC = String(dateLocal.getUTCMinutes()).padStart(2, '0');
  const segundosUTC = String(dateLocal.getUTCSeconds()).padStart(2, '0');
  
  return `${año}-${mes}-${dia} ${horasUTC}:${minutosUTC}:${segundosUTC}`;
};

/**
 * Convierte fecha UTC a hora LOCAL del usuario para mostrar
 * @param {string} fechaHoraUTC - Formato "YYYY-MM-DD HH:MM:SS" (asumido UTC)
 * @param {string} formato - 'datetime' | 'date' | 'time' | 'datetime_short'
 * @returns {string} - Fecha/hora formateada en zona local del usuario
 * 
 * @example
 * UTCToLocal("2026-04-09 02:00:00", "datetime") // "08/04/2026 23:00:00" (Argentina)
 * UTCToLocal("2026-04-09 02:00:00", "date")     // "08/04/2026"
 * UTCToLocal("2026-04-09 02:00:00", "time")     // "23:00:00"
 */



/**
 * Convierte fecha UTC a hora LOCAL del usuario para mostrar
 * @param {string} fechaHoraUTC - Formato "YYYY-MM-DD HH:MM:SS" o ISO "YYYY-MM-DDTHH:MM:SS.000Z"
 * @param {string} formato - 'datetime' | 'date' | 'time'
 * @returns {string} - Fecha/hora formateada en zona local (DD/MM/YYYY)
 */
export const UTCToLocalOld = (fechaHoraUTC, formato = 'datetime') => {
  if (!fechaHoraUTC) return '';
  
  // Crear objeto Date directamente (el string ya es ISO)
  const fecha = new Date(fechaHoraUTC);
  
  if (isNaN(fecha.getTime())) {
    console.error('❌ Fecha inválida:', fechaHoraUTC);
    return 'Fecha inválida';
  }
  
  // Obtener componentes en UTC
  const año = fecha.getUTCFullYear();
  const mes = String(fecha.getUTCMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getUTCDate()).padStart(2, '0');
  const horas = String(fecha.getUTCHours()).padStart(2, '0');
  const minutos = String(fecha.getUTCMinutes()).padStart(2, '0');
  
  const fechaLocalStr = `${dia}/${mes}/${año}`;  // DD/MM/YYYY
  const horaLocalStr = `${horas}:${minutos}`;
  
  console.log('🟢 UTCToLocal - Entrada:', fechaHoraUTC);
  console.log('🟢 UTCToLocal - Salida fecha:', fechaLocalStr);
  
  switch (formato) {
    case 'datetime':
      return `${fechaLocalStr} ${horaLocalStr}`;
    case 'date':
      return fechaLocalStr;
    case 'time':
      return horaLocalStr;
    default:
      return `${fechaLocalStr} ${horaLocalStr}`;
  }
};

export const UTCToLocal = (fechaHoraUTC, formato = 'datetime') => {
  if (!fechaHoraUTC) return '';
  
  // 🔥 Normalizar formato: convertir "2026-04-07T20:30:00.000Z" a "2026-04-07 20:30:00"
  let fechaNormalizada = fechaHoraUTC;
  
  // Si viene con 'T' (formato ISO), reemplazar por espacio
  if (fechaNormalizada.includes('T')) {
    fechaNormalizada = fechaNormalizada.replace('T', ' ');
  }
  
  // Si viene con '.000Z' o 'Z', eliminarlos
  fechaNormalizada = fechaNormalizada.replace('.000Z', '').replace('Z', '');
  
  // Agregar 'Z' para indicar que es UTC
  const fechaUTC = new Date(fechaNormalizada + 'Z');
  
  if (isNaN(fechaUTC.getTime())) return '';
  
  const zonaUsuario = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  const opciones = {
    timeZone: zonaUsuario,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  };
  
  if (formato === 'datetime' || formato === 'time') {
    opciones.hour = '2-digit';
    opciones.minute = '2-digit';
    opciones.hour12 = false;
  }
  
  if (formato === 'datetime') {
    opciones.second = '2-digit';
  }
  
  switch (formato) {
    case 'datetime':
      return fechaUTC.toLocaleString('es-AR', opciones);
    case 'date':
      return fechaUTC.toLocaleDateString('es-AR', opciones);
    case 'time':
      return fechaUTC.toLocaleTimeString('es-AR', { 
        timeZone: zonaUsuario, 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    default:
      return fechaUTC.toLocaleString('es-AR', opciones);
  }
};

export const UTCToLocalreOld = (fechaHoraUTC, formato = 'datetime') => {
  if (!fechaHoraUTC) return '';
  
  // Agregar 'Z' para indicar que es UTC
  const fechaUTC = new Date(fechaHoraUTC + 'Z');
  
  // Si la fecha es inválida, retornar string vacío
  if (isNaN(fechaUTC.getTime())) return '';
  
  // Detectar zona horaria del usuario automáticamente
  const zonaUsuario = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  const opciones = {
    timeZone: zonaUsuario,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  };
  
  if (formato === 'datetime' || formato === 'time') {
    opciones.hour = '2-digit';
    opciones.minute = '2-digit';
    opciones.second = '2-digit';
    opciones.hour12 = false;
  }
  
  if (formato === 'datetime_short') {
    opciones.hour = '2-digit';
    opciones.minute = '2-digit';
    opciones.hour12 = false;
  }
  
  switch (formato) {
    case 'datetime':
      return fechaUTC.toLocaleString('es-AR', opciones);
    case 'datetime_short':
      return fechaUTC.toLocaleString('es-AR', opciones);
    case 'date':
      return fechaUTC.toLocaleDateString('es-AR', opciones);
    case 'time':
      return fechaUTC.toLocaleTimeString('es-AR', { 
        timeZone: zonaUsuario, 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit',
        hour12: false 
      });
    default:
      return fechaUTC.toLocaleString('es-AR', opciones);
  }
};

/**
 * Obtiene la fecha y hora actual del usuario en UTC
 * @returns {string} - Fecha UTC actual "YYYY-MM-DD HH:MM:SS"
 */
export const getCurrentUTC = () => {
  const ahora = new Date();
  const año = ahora.getUTCFullYear();
  const mes = String(ahora.getUTCMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getUTCDate()).padStart(2, '0');
  const horas = String(ahora.getUTCHours()).padStart(2, '0');
  const minutos = String(ahora.getUTCMinutes()).padStart(2, '0');
  const segundos = String(ahora.getUTCSeconds()).padStart(2, '0');
  
  return `${año}-${mes}-${dia} ${horas}:${minutos}:${segundos}`;
};

/**
 * Convierte un rango de fechas LOCAL a rango UTC para búsquedas
 * @param {string} fechaLocalInicio - Formato "YYYY-MM-DD"
 * @param {string} fechaLocalFin - Formato "YYYY-MM-DD" (opcional, mismo día si no se pasa)
 * @returns {object} - { desdeUTC, hastaUTC }
 * 
 * @example
 * getRangoUTC("2026-04-08") 
 * // { desdeUTC: "2026-04-08 03:00:00", hastaUTC: "2026-04-09 02:59:59" }
 */
export const getRangoUTC = (fechaLocalInicio, fechaLocalFin = null) => {
  const fechaFin = fechaLocalFin || fechaLocalInicio;
  
  const desdeUTC = localToUTC(fechaLocalInicio, "00:00:00");
  const hastaUTC = localToUTC(fechaLocalFin, "23:59:59");
  
  return { desdeUTC, hastaUTC };
};

/**
 * Formatea una fecha UTC para enviar al backend (desde el front)
 * @param {Date} date - Objeto Date de JavaScript
 * @returns {string} - Fecha UTC en formato "YYYY-MM-DD HH:MM:SS"
 */
export const dateToUTCString = (date) => {
  if (!date || isNaN(date.getTime())) return null;
  
  const año = date.getUTCFullYear();
  const mes = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dia = String(date.getUTCDate()).padStart(2, '0');
  const horas = String(date.getUTCHours()).padStart(2, '0');
  const minutos = String(date.getUTCMinutes()).padStart(2, '0');
  const segundos = String(date.getUTCSeconds()).padStart(2, '0');
  
  return `${año}-${mes}-${dia} ${horas}:${minutos}:${segundos}`;
};