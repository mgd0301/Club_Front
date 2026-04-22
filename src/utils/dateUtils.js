import { DateTime } from 'luxon';

/**
 * Convierte una fecha local (del input date) a UTC para enviar al backend
 * @param {string} fechaStr - Fecha en formato 'YYYY-MM-DD'
 * @param {boolean} finDelDia - true para 23:59:59, false para 00:00:00
 * @returns {string} Fecha en formato 'YYYYMMDDHHmmss' UTC
 */
export const localToUTC = (fechaStr, finDelDia = false) => {
  if (!fechaStr) return '';
  
  // Crear fecha en zona horaria local del usuario
  let fechaLocal;
  
  if (finDelDia) {
    // Para "hasta": 23:59:59 en hora local
    fechaLocal = DateTime.fromISO(fechaStr, { zone: 'local' })
      .set({ hour: 23, minute: 59, second: 59 });
  } else {
    // Para "desde": 00:00:00 en hora local
    fechaLocal = DateTime.fromISO(fechaStr, { zone: 'local' })
      .set({ hour: 0, minute: 0, second: 0 });
  }
  
  // Convertir a UTC y formatear
  return fechaLocal.toUTC().toFormat('yyyyMMddHHmmss');
};

/**
 * Convierte una fecha UTC del backend a hora local para mostrar
 * @param {string} fechaUTC - Fecha en formato 'YYYY-MM-DD HH:mm:ss' (UTC)
 * @param {string} formato - Formato de salida (ej: 'dd/MM/yyyy HH:mm', 'HH:mm', etc.)
 * @returns {string} Fecha formateada en hora local
 */
export const UTCToLocal = (fechaUTC, formato = 'dd/MM/yyyy HH:mm') => {
  if (!fechaUTC) return '';
  
  // Crear fecha en UTC y convertir a local
  return DateTime.fromSQL(fechaUTC, { zone: 'utc' })
    .setZone('local')
    .toFormat(formato);
};

/**
 * Obtiene la fecha y hora actual en UTC para registrar asistencias
 * @returns {string} Fecha en formato 'YYYYMMDDHHmmss' UTC
 */
export const getCurrentUTC = () => {
  return DateTime.now().toUTC().toFormat('yyyyMMddHHmmss');
};