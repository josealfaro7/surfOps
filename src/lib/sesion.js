// Mira si hay una sesión de Supabase guardada, sin cargar el SDK.
//
// La portada es lo primero que descarga quien llega al sitio, y traer
// @supabase/supabase-js solo para preguntar "¿ya entró?" costaría más que la
// portada entera. Supabase guarda la sesión en localStorage bajo una clave
// con la forma sb-<ref-del-proyecto>-auth-token, así que la leemos directo.
//
// Es un detalle interno del SDK: si algún día cambia, esta función devuelve
// false y el visitante ve la portada. Nunca da un falso positivo que lo deje
// atrapado, porque el ERP vuelve a pedir credenciales si la sesión no sirve.

const CLAVE = /^sb-.+-auth-token$/;

function leerJson(crudo) {
  if (!crudo) return null;
  try {
    // Las versiones recientes guardan el JSON en base64 con este prefijo.
    const texto = crudo.startsWith('base64-') ? atob(crudo.slice(7)) : crudo;
    return JSON.parse(texto);
  } catch {
    return null;
  }
}

export function haySesionGuardada() {
  if (typeof window === 'undefined' || !window.localStorage) return false;

  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const clave = localStorage.key(i);
      if (!clave || !CLAVE.test(clave)) continue;

      const datos = leerJson(localStorage.getItem(clave));
      if (!datos || !datos.access_token) continue;

      // Vencida: que vea la portada en vez de rebotar contra el login.
      if (typeof datos.expires_at === 'number' && datos.expires_at * 1000 <= Date.now()) {
        continue;
      }

      return true;
    }
  } catch {
    // localStorage bloqueado (modo privado, cookies de terceros): portada.
    return false;
  }

  return false;
}
