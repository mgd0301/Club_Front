import { useState, useEffect, useCallback, useRef } from 'react';

export const useTimer = (seconds = 15, shouldRun = false) => {
  const [timeLeft, setTimeLeft] = useState(seconds);
  const intervalRef = useRef(null);

  // Efecto principal
  useEffect(() => {
    //console.log(`🔄 useTimer efecto: shouldRun=${shouldRun}, timeLeft=${timeLeft}`);
    
    // Limpiar intervalo previo
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!shouldRun) {
      //console.log("⏸ Timer pausado");
      return;
    }

    if (timeLeft <= 0) {
      //console.log("🎯 Timer ya en 0, disparando evento...");
      window.dispatchEvent(new Event('timerReachedZero'));
      return;
    }

    //console.log(`▶ Iniciando timer desde ${timeLeft}s`);
    
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        const newTime = prev - 1;
        //console.log(`⏱ Tick: ${prev} -> ${newTime}`);
        
        if (newTime <= 0) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        //  console.log("🎯 Timer llegó a 0 - disparando evento");
          window.dispatchEvent(new Event('timerReachedZero'));
          return 0;
        }
        
        return newTime;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        //console.log("🧹 Limpiando intervalo");
        clearInterval(intervalRef.current);
      }
    };
  }, [shouldRun, timeLeft]);

  const reset = useCallback(() => {
    //console.log(`🔄 Reset llamado - estableciendo ${seconds}s`);
    setTimeLeft(seconds);
  }, [seconds]);

  return { timeLeft, reset };
};