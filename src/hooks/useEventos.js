import { useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config";

export const useEventos = (currentUser) => {
  const [loading, setLoading] = useState(false);

  const handleEventoEstado = async (codevento, estado, setEventos) => {
    if (currentUser?.tipo_usuario !== 1) {
      alert("No tiene permiso para modificar eventos");
      return;
    }

    // 🟡 Confirmar solo si estado = "B"
    if (estado === "B") {
      const confirmar = window.confirm("¿Seguro que desea eliminar (dar de baja) este evento?");
      if (!confirmar) return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      alert("No hay sesión activa");
      return;
    }

    setLoading(true);
    try {
      console.log("Enviando:", { codevento, estado });
      await axios.post(
        `${API_BASE_URL}/eventoEstadoActualizar`,
        { codevento, estado },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      // ✅ Actualizar solo el evento en memoria
      const traducirEstado = (valor) => {
        switch (valor) {
          case "A": return "Activo";
          case "F": return "Finalizado";
          case "S": return "Suspendido";
          case "B": return "Baja";
          default: return valor;
        }
      };

      setEventos((prev) =>
        prev.map((ev) =>
          ev.codevento === codevento
            ? { ...ev, estado: traducirEstado(estado) }
            : ev
        )
      );

    } catch (error) {
      console.error("Error completo:", error);
      if (error.response) {
        alert(error.response.data.error || "Error del servidor");
      }
    } finally {
      setLoading(false);
    }
  };

  return { handleEventoEstado, loading };
};
