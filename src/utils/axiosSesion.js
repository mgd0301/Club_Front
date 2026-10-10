// Interceptor global: si cualquier request devuelve 401 (token vencido o inválido),
// avisa una sola vez y fuerza el re-login en vez de fallar en silencio.
import axios from "axios";
import Swal from "sweetalert2";

let sesionVencidaMostrada = false;

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !sesionVencidaMostrada) {
      sesionVencidaMostrada = true;
      Swal.fire({
        title: "Sesión vencida",
        text: "Tu sesión expiró, iniciá sesión de nuevo para seguir.",
        icon: "warning",
        confirmButtonText: "Ir a login",
      }).then(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("currentUser");
        window.location.hash = "#/";
        window.location.reload();
      });
    }
    return Promise.reject(error);
  }
);
