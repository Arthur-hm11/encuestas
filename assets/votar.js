/**
 * Pantalla de votacion (la que ve todo el mundo).
 * Aqui NO existen los precios ni los totales del grupo:
 * el servidor nunca los envia a esta pagina.
 */

const estado = { config: null, cantidades: {} };

/* ---------- 1. Cargar la encuesta ---------- */
async function cargar() {
  try {
    const cfg = await api({ accion: 'configPublica' });
    estado.config = cfg;

    document.title = cfg.titulo;

    if (!cfg.abierta) {
      $('cargando').classList.add('oculto');
      $('tituloBloqueo').textContent = 'Votacion cerrada';
      $('detalleBloqueo').textContent = 'Esta encuesta ya no admite respuestas. Gracias.';
      $('bloqueo').classList.remove('oculto');
      return;
    }

    if (!cfg.opciones.length) {
      throw new Error('Esta encuesta todavia no tiene opciones configuradas.');
    }

    $('titulo').textContent = cfg.titulo;
    $('subtitulo').textContent = cfg.subtitulo;
    cfg.opciones.forEach(function (nombre) { estado.cantidades[nombre] = 0; });

    dibujarOpciones();
    actualizarTotal();

    // Si ya voto antes desde este celular, recordamos su nombre
    const guardado = localStorage.getItem('encuesta_nombre');
    if (guardado) $('nombre').value = guardado;

    $('cargando').classList.add('oculto');
    $('formulario').classList.remove('oculto');
  } catch (e) {
    $('cargando').classList.add('oculto');
    $('tituloBloqueo').textContent = 'No se pudo cargar';
    $('detalleBloqueo').textContent = e.message;
    $('bloqueo').classList.remove('oculto');
  }
}

/* ---------- 2. Dibujar los contadores ---------- */
function dibujarOpciones() {
  const caja = $('opciones');
  caja.innerHTML = '';

  estado.config.opciones.forEach(function (nombre, i) {
    const fila = document.createElement('div');
    fila.className = 'opcion';
    fila.innerHTML =
      '<span class="nombre">' + limpio(nombre) + '</span>' +
      '<span class="contador">' +
        '<button type="button" data-menos="' + i + '" aria-label="Quitar uno de ' + limpio(nombre) + '">&minus;</button>' +
        '<span class="valor cero" id="valor-' + i + '">0</span>' +
        '<button type="button" data-mas="' + i + '" aria-label="Agregar uno de ' + limpio(nombre) + '">+</button>' +
      '</span>';
    caja.appendChild(fila);
  });

  caja.addEventListener('click', function (evento) {
    const boton = evento.target.closest('button');
    if (!boton) return;
    if (boton.dataset.mas   !== undefined) cambiar(parseInt(boton.dataset.mas, 10),  +1);
    if (boton.dataset.menos !== undefined) cambiar(parseInt(boton.dataset.menos, 10), -1);
  });
}

function cambiar(indice, paso) {
  const nombre = estado.config.opciones[indice];
  const nuevo  = (estado.cantidades[nombre] || 0) + paso;
  if (nuevo < 0 || nuevo > estado.config.maximo) return;

  estado.cantidades[nombre] = nuevo;

  const celda = $('valor-' + indice);
  celda.textContent = nuevo;
  celda.classList.toggle('cero', nuevo === 0);

  actualizarTotal();
  ocultarAviso('avisoFormulario');
}

function actualizarTotal() {
  let total = 0;
  Object.keys(estado.cantidades).forEach(function (k) { total += estado.cantidades[k]; });

  $('totalVivo').textContent = total === 0
    ? 'Aun no eliges nada'
    : 'Tu pediste: ' + total + (total === 1 ? ' pieza' : ' piezas');

  $('enviar').disabled = total === 0;
}

/* ---------- 3. Enviar ---------- */
async function enviar() {
  const nombre = $('nombre').value.trim();
  if (nombre.length < 2) {
    aviso('avisoFormulario', 'Escribe tu nombre para poder identificar tu pedido.', 'error');
    $('nombre').focus();
    return;
  }

  const boton = $('enviar');
  boton.disabled = true;
  boton.textContent = 'Enviando...';
  ocultarAviso('avisoFormulario');

  try {
    const r = await api({ accion: 'votar', nombre: nombre, cantidades: estado.cantidades });
    localStorage.setItem('encuesta_nombre', nombre);

    $('tituloGracias').textContent  = r.actualizado ? 'Pedido actualizado' : 'Pedido registrado';
    $('detalleGracias').textContent =
      'Gracias, ' + nombre.split(' ')[0] + '. Anotamos ' + r.total +
      (r.total === 1 ? ' pieza.' : ' piezas.') +
      (r.actualizado ? ' Reemplazamos lo que habias pedido antes.' : '');

    $('formulario').classList.add('oculto');
    $('gracias').classList.remove('oculto');
    window.scrollTo(0, 0);
  } catch (e) {
    aviso('avisoFormulario', e.message, 'error');
    boton.disabled = false;
    boton.textContent = 'Enviar mi pedido';
  }
}

/* ---------- 4. Arranque ---------- */
$('enviar').addEventListener('click', enviar);
$('corregir').addEventListener('click', function () {
  $('gracias').classList.add('oculto');
  $('formulario').classList.remove('oculto');
  $('enviar').disabled = false;
  $('enviar').textContent = 'Enviar mi pedido';
});
cargar();
