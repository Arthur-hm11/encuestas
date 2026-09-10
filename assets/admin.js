/**
 * Panel de administrador.
 * La contrasena viaja en cada peticion y el servidor la verifica.
 * Si es incorrecta, el servidor no devuelve NADA: ni precios ni totales.
 */

let clave    = '';
let resumen  = null;
let opciones = [];

/* ============ Entrar ============ */
async function entrar() {
  const escrita = $('clave').value.trim();
  if (!escrita) { aviso('avisoEntrada', 'Escribe la contrasena.', 'error'); return; }

  const boton = $('btnEntrar');
  boton.disabled = true;
  boton.textContent = 'Comprobando...';
  ocultarAviso('avisoEntrada');

  try {
    clave = escrita;
    await cargarResumen();
    sessionStorage.setItem('encuesta_clave', clave);
    $('entrada').classList.add('oculto');
    $('panel').classList.remove('oculto');
  } catch (e) {
    clave = '';
    aviso('avisoEntrada', e.message, 'error');
  } finally {
    boton.disabled = false;
    boton.textContent = 'Entrar';
  }
}

/* ============ Resumen ============ */
async function cargarResumen() {
  resumen = await api({ accion: 'adminResumen', clave: clave });
  pintarResumen();
}

function pintarResumen() {
  const m = resumen.moneda;

  $('tituloResumen').textContent  = resumen.titulo;
  $('estadoEncuesta').textContent = resumen.abierta
    ? 'Abierta: sigue recibiendo respuestas.'
    : 'Cerrada: ya no acepta respuestas.';

  $('totalPiezas').textContent   = resumen.granTotalPiezas;
  $('totalDinero').textContent   = dinero(resumen.granTotalDinero, m);
  $('totalVotantes').textContent = resumen.votantes;

  // Tabla de totales por opcion
  $('cuerpoResumen').innerHTML =
    resumen.renglones.map(function (r) {
      return '<tr>' +
        '<td>' + limpio(r.nombre) + '</td>' +
        '<td class="num">' + r.cantidad + '</td>' +
        '<td class="num">' + dinero(r.precio, m) + '</td>' +
        '<td class="num">' + dinero(r.importe, m) + '</td>' +
      '</tr>';
    }).join('') +
    '<tr class="gran-total">' +
      '<td>TOTAL</td>' +
      '<td class="num">' + resumen.granTotalPiezas + '</td>' +
      '<td></td>' +
      '<td class="num">' + dinero(resumen.granTotalDinero, m) + '</td>' +
    '</tr>';

  // Detalle persona por persona
  const nombresOpciones = resumen.renglones.map(function (r) { return r.nombre; });

  $('encabezadoDetalle').innerHTML =
    '<th>Persona</th>' +
    nombresOpciones.map(function (n) { return '<th class="num">' + limpio(n) + '</th>'; }).join('') +
    '<th class="num">Total</th><th></th>';

  $('cuerpoDetalle').innerHTML = resumen.votos.length === 0
    ? '<tr><td colspan="' + (nombresOpciones.length + 3) + '" style="color:var(--suave)">Todavia no vota nadie.</td></tr>'
    : resumen.votos.map(function (v) {
        return '<tr>' +
          '<td>' + limpio(v.nombre) + '<br><span class="etiqueta">' + limpio(v.fecha) + '</span></td>' +
          nombresOpciones.map(function (n) {
            const cantidad = v.cantidades[n] || 0;
            return '<td class="num"' + (cantidad === 0 ? ' style="color:var(--suave)"' : '') + '>' + cantidad + '</td>';
          }).join('') +
          '<td class="num"><strong>' + v.total + '</strong></td>' +
          '<td><button type="button" class="borrar-voto" data-fila="' + v.fila +
              '" data-nombre="' + limpio(v.nombre) + '" title="Borrar este voto" ' +
              'style="border:0;background:none;color:var(--peligro);font-size:18px;cursor:pointer">&times;</button></td>' +
        '</tr>';
      }).join('');
}

async function borrarVoto(fila, nombre) {
  if (!window.confirm('Borrar el pedido de ' + nombre + '?')) return;
  try {
    await api({ accion: 'adminBorrarVoto', clave: clave, fila: fila });
    await cargarResumen();
    aviso('avisoAcciones', 'Se borro el pedido de ' + nombre + '.', 'exito');
  } catch (e) {
    aviso('avisoAcciones', e.message, 'error');
  }
}

/* ============ Configurar ============ */
async function cargarConfig() {
  const cfg = await api({ accion: 'adminConfig', clave: clave });
  $('cfgTitulo').value    = cfg.titulo;
  $('cfgSubtitulo').value = cfg.subtitulo;
  $('cfgMaximo').value    = cfg.maximo;
  $('cfgMoneda').value    = cfg.moneda;
  $('cfgAbierta').checked = cfg.abierta;
  opciones = cfg.opciones.slice();
  pintarOpciones();
}

function pintarOpciones() {
  $('cuerpoOpciones').innerHTML = opciones.map(function (o, i) {
    return '<tr>' +
      '<td><input type="text" data-campo="nombre" data-i="' + i + '" value="' + limpio(o.nombre) + '" maxlength="40"></td>' +
      '<td><input type="number" data-campo="precio" data-i="' + i + '" value="' + o.precio + '" min="0" step="0.5" style="text-align:right"></td>' +
      '<td style="text-align:center"><input type="checkbox" data-campo="activo" data-i="' + i + '"' +
          (o.activo ? ' checked' : '') + ' style="width:20px;height:20px"></td>' +
      '<td><button type="button" class="quitar-opcion" data-i="' + i + '" title="Quitar" ' +
          'style="border:0;background:none;color:var(--peligro);font-size:20px;cursor:pointer">&times;</button></td>' +
    '</tr>';
  }).join('');
}

/** Lee lo que hay escrito en la tabla y lo pasa a la lista. */
function leerTablaOpciones() {
  document.querySelectorAll('#cuerpoOpciones [data-campo]').forEach(function (campo) {
    const i = parseInt(campo.dataset.i, 10);
    if (!opciones[i]) return;
    if (campo.dataset.campo === 'nombre') opciones[i].nombre = campo.value;
    if (campo.dataset.campo === 'precio') opciones[i].precio = parseFloat(campo.value) || 0;
    if (campo.dataset.campo === 'activo') opciones[i].activo = campo.checked;
  });
}

async function guardar() {
  leerTablaOpciones();
  const boton = $('btnGuardar');
  boton.disabled = true;
  boton.textContent = 'Guardando...';
  ocultarAviso('avisoConfig');

  try {
    await api({
      accion:    'adminGuardar',
      clave:     clave,
      titulo:    $('cfgTitulo').value,
      subtitulo: $('cfgSubtitulo').value,
      maximo:    $('cfgMaximo').value,
      moneda:    $('cfgMoneda').value,
      abierta:   $('cfgAbierta').checked,
      opciones:  opciones
    });
    aviso('avisoConfig', 'Guardado. La pagina de votacion ya muestra los cambios.', 'exito');
    await cargarResumen();
  } catch (e) {
    aviso('avisoConfig', e.message, 'error');
    // El guardado se cancelo entero. Volvemos a mostrar las opciones tal como
    // estan realmente en el servidor, para que la pantalla no mienta.
    try {
      const real = await api({ accion: 'adminConfig', clave: clave });
      opciones = real.opciones.slice();
      pintarOpciones();
    } catch (sinRed) { /* si tampoco se puede leer, dejamos lo que hay */ }
  } finally {
    boton.disabled = false;
    boton.textContent = 'Guardar cambios';
  }
}

/* ============ Archivar ============ */
async function archivar() {
  if (!window.confirm(
    'Se guardaran los ' + resumen.votantes + ' pedidos actuales en una pestana con la fecha ' +
    'de hoy y la tabla quedara vacia para la siguiente encuesta.\n\nContinuar?'
  )) return;

  try {
    const r = await api({ accion: 'adminArchivar', clave: clave });
    await cargarResumen();
    aviso('avisoAcciones', 'Archivado en la pestana "' + r.archivadoEn + '".', 'exito');
  } catch (e) {
    aviso('avisoAcciones', e.message, 'error');
  }
}

/* ============ Descargar Excel ============ */
function descargarExcel() {
  const m     = resumen.moneda;
  const libro = XLSX.utils.book_new();

  const hojaResumen = [['Opcion', 'Cantidad', 'Precio unitario', 'Importe']];
  resumen.renglones.forEach(function (r) {
    hojaResumen.push([r.nombre, r.cantidad, r.precio, r.importe]);
  });
  hojaResumen.push([]);
  hojaResumen.push(['TOTAL', resumen.granTotalPiezas, '', resumen.granTotalDinero]);
  hojaResumen.push(['Personas que votaron', resumen.votantes]);
  hojaResumen.push(['Moneda', m]);

  XLSX.utils.book_append_sheet(libro, XLSX.utils.aoa_to_sheet(hojaResumen), 'Resumen');

  const nombresOpciones = resumen.renglones.map(function (r) { return r.nombre; });
  const hojaDetalle = [['Fecha', 'Persona'].concat(nombresOpciones).concat(['Total'])];
  resumen.votos.forEach(function (v) {
    hojaDetalle.push(
      [v.fecha, v.nombre]
        .concat(nombresOpciones.map(function (n) { return v.cantidades[n] || 0; }))
        .concat([v.total])
    );
  });
  XLSX.utils.book_append_sheet(libro, XLSX.utils.aoa_to_sheet(hojaDetalle), 'Detalle');

  const fecha  = new Date().toISOString().slice(0, 10);
  const limpio2 = resumen.titulo.replace(/[^A-Za-z0-9 ]/g, '').trim().replace(/\s+/g, '-');
  XLSX.writeFile(libro, (limpio2 || 'encuesta') + '_' + fecha + '.xlsx');
}

/* ============ Conectar botones ============ */
$('btnEntrar').addEventListener('click', entrar);
$('clave').addEventListener('keydown', function (e) { if (e.key === 'Enter') entrar(); });

$('btnVerResumen').addEventListener('click', function () {
  $('vistaResumen').classList.remove('oculto');
  $('vistaConfig').classList.add('oculto');
  $('btnVerResumen').className = 'boton';
  $('btnVerConfig').className  = 'boton secundario';
});

$('btnVerConfig').addEventListener('click', async function () {
  $('vistaResumen').classList.add('oculto');
  $('vistaConfig').classList.remove('oculto');
  $('btnVerConfig').className  = 'boton';
  $('btnVerResumen').className = 'boton secundario';
  try { await cargarConfig(); }
  catch (e) { aviso('avisoConfig', e.message, 'error'); }
});

$('btnActualizar').addEventListener('click', async function () {
  ocultarAviso('avisoAcciones');
  try { await cargarResumen(); aviso('avisoAcciones', 'Datos actualizados.', 'exito'); }
  catch (e) { aviso('avisoAcciones', e.message, 'error'); }
});

$('btnExcel').addEventListener('click', descargarExcel);
$('btnHoja').addEventListener('click', function () { window.open(resumen.urlHoja, '_blank'); });
$('btnArchivar').addEventListener('click', archivar);
$('btnGuardar').addEventListener('click', guardar);

$('btnAgregarOpcion').addEventListener('click', function () {
  leerTablaOpciones();
  opciones.push({ nombre: '', precio: 0, activo: true });
  pintarOpciones();
  const campos = document.querySelectorAll('#cuerpoOpciones [data-campo="nombre"]');
  if (campos.length) campos[campos.length - 1].focus();
});

$('cuerpoOpciones').addEventListener('click', function (e) {
  const boton = e.target.closest('.quitar-opcion');
  if (!boton) return;
  leerTablaOpciones();
  opciones.splice(parseInt(boton.dataset.i, 10), 1);
  pintarOpciones();
});

$('cuerpoDetalle').addEventListener('click', function (e) {
  const boton = e.target.closest('.borrar-voto');
  if (boton) borrarVoto(parseInt(boton.dataset.fila, 10), boton.dataset.nombre);
});

// Si ya habia sesion abierta en esta pestana, entrar solo
(function () {
  const guardada = sessionStorage.getItem('encuesta_clave');
  if (guardada) { $('clave').value = guardada; entrar(); }
})();
