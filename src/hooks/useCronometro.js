import { useState, useRef, useCallback, useEffect } from "react";

const storageKey = (codevento) => `cronometro_partido_${codevento}`;

const leerEstado = (codevento) => {
  try {
    const raw = localStorage.getItem(storageKey(codevento));
    if (!raw) return { acumulado: 0, inicioTs: null };
    const parsed = JSON.parse(raw);
    return { acumulado: parsed.acumulado || 0, inicioTs: parsed.inicioTs || null };
  } catch {
    return { acumulado: 0, inicioTs: null };
  }
};

const guardarEstado = (codevento, estado) => {
  try {
    localStorage.setItem(storageKey(codevento), JSON.stringify(estado));
  } catch {
    // localStorage no disponible: el cronómetro sigue funcionando en memoria
  }
};

const calcularSegundos = ({ acumulado, inicioTs }) => {
  if (!inicioTs) return acumulado;
  return acumulado + Math.floor((Date.now() - inicioTs) / 1000);
};

export const useCronometro = (codevento) => {
  const estadoRef = useRef(leerEstado(codevento));
  const [segundosTotales, setSegundosTotales] = useState(() => calcularSegundos(estadoRef.current));
  const [corriendo, setCorriendo] = useState(() => !!estadoRef.current.inicioTs);
  const intervalRef = useRef(null);

  const persistir = useCallback(() => {
    guardarEstado(codevento, estadoRef.current);
  }, [codevento]);

  const tick = useCallback(() => {
    setSegundosTotales(calcularSegundos(estadoRef.current));
  }, []);

  const iniciar = useCallback(() => {
    if (estadoRef.current.inicioTs) return;
    estadoRef.current = { ...estadoRef.current, inicioTs: Date.now() };
    setCorriendo(true);
    persistir();
    tick();
  }, [persistir, tick]);

  const pausar = useCallback(() => {
    if (!estadoRef.current.inicioTs) return;
    estadoRef.current = { acumulado: calcularSegundos(estadoRef.current), inicioTs: null };
    setCorriendo(false);
    persistir();
    tick();
  }, [persistir, tick]);

  const ajustar = useCallback(
    (deltaSegundos) => {
      const actual = calcularSegundos(estadoRef.current);
      const nuevoAcumulado = Math.max(0, actual + deltaSegundos);
      estadoRef.current = {
        acumulado: nuevoAcumulado,
        inicioTs: estadoRef.current.inicioTs ? Date.now() : null,
      };
      persistir();
      tick();
    },
    [persistir, tick]
  );

  const setTiempo = useCallback(
    (minuto, segundo) => {
      const nuevoAcumulado = Math.max(0, minuto * 60 + segundo);
      estadoRef.current = {
        acumulado: nuevoAcumulado,
        inicioTs: estadoRef.current.inicioTs ? Date.now() : null,
      };
      persistir();
      tick();
    },
    [persistir, tick]
  );

  const reiniciar = useCallback(() => {
    estadoRef.current = { acumulado: 0, inicioTs: null };
    setCorriendo(false);
    persistir();
    tick();
  }, [persistir, tick]);

  useEffect(() => {
    // Recargar el estado guardado si cambia el partido que se está siguiendo
    estadoRef.current = leerEstado(codevento);
    setSegundosTotales(calcularSegundos(estadoRef.current));
    setCorriendo(!!estadoRef.current.inicioTs);
  }, [codevento]);

  useEffect(() => {
    if (!corriendo) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    intervalRef.current = setInterval(tick, 1000);
    return () => {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [corriendo, tick]);

  const minuto = Math.floor(segundosTotales / 60);
  const segundo = segundosTotales % 60;
  const iniciado = corriendo || segundosTotales > 0;

  return { segundosTotales, minuto, segundo, corriendo, iniciado, iniciar, pausar, ajustar, setTiempo, reiniciar };
};
