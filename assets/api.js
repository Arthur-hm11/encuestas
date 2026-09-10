/**
 * Funciones compartidas por la pagina de votar y el panel.
 */

/**
 * Manda una peticion al portero (Apps Script) y devuelve los datos.
 *
 * Nota tecnica: usamos "text/plain" a proposito. Si usaramos
 * "application/json" el navegador haria una peticion previa de permiso
 * que Apps Script no sabe contestar, y todo fallaria.
 */
async function api(cuerpo) {
  if (!API_URL || API_URL.indexOf('PEGA_AQUI') === 0) {
    throw new Error('Falta configurar la direccion del script en assets/config.js');
  }

  let respuesta;
  try {
    respuesta = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(cuerpo),
      redirect: 'follow'
    });
  } catch (e) {
    throw new Error('No se pudo conectar. Revisa tu internet e intenta de nuevo.');
  }

  const texto = await respuesta.text();
  let json;
  try {
    json = JSON.parse(texto);
  } catch (e) {
    throw new Error(
      'El servidor respondio algo inesperado. Comprueba que la direccion termine ' +
      'en /exec y que al publicar elegiste acceso para "Cualquier usuario".'
    );
  }

  if (!json.ok) throw new Error(json.error || 'Ocurrio un error.');
  return json.datos;
}

/** Atajo para buscar un elemento por su id. */
function $(id) { return document.getElementById(id); }

/** Escapa texto para que nadie pueda inyectar HTML desde un nombre. */
function limpio(texto) {
  const d = document.createElement('div');
  d.textContent = texto == null ? '' : String(texto);
  return d.innerHTML;
}

/** Formatea dinero: 489 -> $489.00 */
function dinero(cantidad, moneda) {
  return (moneda || '$') + Number(cantidad || 0).toFixed(2);
}

/** Muestra un aviso en pantalla. tipo = 'error' | 'exito' */
function aviso(contenedor, mensaje, tipo) {
  const caja = $(contenedor);
  if (!caja) return;
  caja.className = 'aviso ' + (tipo || 'error');
  caja.textContent = mensaje;
  caja.classList.remove('oculto');
}

function ocultarAviso(contenedor) {
  const caja = $(contenedor);
  if (caja) caja.classList.add('oculto');
}
