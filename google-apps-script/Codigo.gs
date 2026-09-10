/**
 * SISTEMA DE ENCUESTAS - "El portero" (backend)
 * ---------------------------------------------
 * Este archivo NO va en GitHub. Se pega dentro de tu hoja de
 * Google, en Extensiones > Apps Script.
 *
 * Es el unico que sabe los precios y la contrasena. La pagina
 * publica jamas recibe esa informacion.
 */

// ============================================================
//  CAMBIA ESTO ANTES DE PUBLICAR
// ============================================================
const CONTRASENA_ADMIN = 'cambiame123';

// Nombres de las pestanas. No hace falta tocarlos.
const HOJA_CONFIG   = 'Configuracion';
const HOJA_OPCIONES = 'Opciones';
const HOJA_VOTOS    = 'Votos';


// ============================================================
//  1. PREPARAR LA HOJA (ejecutar UNA sola vez, a mano)
// ============================================================
function inicializar() {
  const libro = SpreadsheetApp.getActiveSpreadsheet();

  let cfg = libro.getSheetByName(HOJA_CONFIG);
  if (!cfg) {
    cfg = libro.insertSheet(HOJA_CONFIG);
    cfg.getRange('A1:B1').setValues([['Clave', 'Valor']]).setFontWeight('bold');
    cfg.getRange('A2:B6').setValues([
      ['titulo',    'Tacos de canasta'],
      ['subtitulo', 'Anota cuantos quieres de cada uno'],
      ['maximo',    10],
      ['abierta',   'SI'],
      ['moneda',    '$']
    ]);
    cfg.setColumnWidth(1, 140);
    cfg.setColumnWidth(2, 320);
  }

  let ops = libro.getSheetByName(HOJA_OPCIONES);
  if (!ops) {
    ops = libro.insertSheet(HOJA_OPCIONES);
    ops.getRange('A1:C1').setValues([['Nombre', 'Precio', 'Activo']]).setFontWeight('bold');
    ops.getRange('A2:C5').setValues([
      ['Chicharron',      12, 'SI'],
      ['Papa con carne',  12, 'SI'],
      ['Adobo',           15, 'SI'],
      ['Frijol',          10, 'SI']
    ]);
    ops.setColumnWidth(1, 200);
  }

  let votos = libro.getSheetByName(HOJA_VOTOS);
  if (!votos) {
    votos = libro.insertSheet(HOJA_VOTOS);
    reconstruirEncabezadoVotos(votos, leerOpciones().map(function (o) { return o.nombre; }));
  }

  const hoja1 = libro.getSheetByName('Hoja 1') || libro.getSheetByName('Sheet1');
  if (hoja1 && libro.getSheets().length > 1) libro.deleteSheet(hoja1);

  SpreadsheetApp.getUi().alert(
    'Listo.\n\nSe crearon las pestanas Configuracion, Opciones y Votos.\n\n' +
    'Ahora ve a Implementar > Nueva implementacion.'
  );
}


// ============================================================
//  2. PUERTA DE ENTRADA (aqui llegan las peticiones)
// ============================================================
function doPost(e) {
  try {
    const datos = JSON.parse(e.postData.contents);
    let resultado;

    switch (datos.accion) {
      // --- Publico: cualquiera puede pedir esto ---
      case 'configPublica':  resultado = configPublica();            break;
      case 'votar':          resultado = registrarVoto(datos);       break;

      // --- Privado: exige contrasena ---
      case 'adminResumen':   exigirClave(datos); resultado = resumenAdmin();          break;
      case 'adminConfig':    exigirClave(datos); resultado = configAdmin();           break;
      case 'adminGuardar':   exigirClave(datos); resultado = guardarConfig(datos);    break;
      case 'adminArchivar':  exigirClave(datos); resultado = archivarVotacion();      break;
      case 'adminBorrarVoto':exigirClave(datos); resultado = borrarVoto(datos);       break;

      default: throw new Error('Accion desconocida: ' + datos.accion);
    }

    return responder({ ok: true, datos: resultado });
  } catch (err) {
    return responder({ ok: false, error: String(err.message || err) });
  }
}

function doGet() {
  return HtmlService.createHtmlOutput(
    '<h2>El portero esta funcionando</h2>' +
    '<p>Esta direccion es correcta. Copiala y pegala en <code>assets/config.js</code>.</p>'
  );
}

function responder(objeto) {
  return ContentService
    .createTextOutput(JSON.stringify(objeto))
    .setMimeType(ContentService.MimeType.JSON);
}

function exigirClave(datos) {
  if (!datos || datos.clave !== CONTRASENA_ADMIN) {
    throw new Error('Contrasena incorrecta');
  }
}


// ============================================================
//  3. LEER LA HOJA
// ============================================================
function libro() { return SpreadsheetApp.getActiveSpreadsheet(); }

function hoja(nombre) {
  const h = libro().getSheetByName(nombre);
  if (!h) throw new Error('Falta la pestana "' + nombre + '". Ejecuta inicializar().');
  return h;
}

function leerConfig() {
  const filas = hoja(HOJA_CONFIG).getDataRange().getValues();
  const cfg = {};
  for (let i = 1; i < filas.length; i++) {
    const clave = String(filas[i][0]).trim();
    if (clave) cfg[clave] = filas[i][1];
  }
  return {
    titulo:    String(cfg.titulo || 'Encuesta'),
    subtitulo: String(cfg.subtitulo || ''),
    maximo:    Math.max(1, parseInt(cfg.maximo, 10) || 10),
    abierta:   String(cfg.abierta).toUpperCase().trim() === 'SI',
    moneda:    String(cfg.moneda || '$')
  };
}

function leerOpciones() {
  const filas = hoja(HOJA_OPCIONES).getDataRange().getValues();
  const lista = [];
  for (let i = 1; i < filas.length; i++) {
    const nombre = String(filas[i][0]).trim();
    if (!nombre) continue;
    lista.push({
      nombre: nombre,
      precio: Number(filas[i][1]) || 0,
      activo: String(filas[i][2]).toUpperCase().trim() !== 'NO'
    });
  }
  return lista;
}

/** Lo que ve el votante: nombres, nada de precios. */
function configPublica() {
  const cfg = leerConfig();
  return {
    titulo:    cfg.titulo,
    subtitulo: cfg.subtitulo,
    maximo:    cfg.maximo,
    abierta:   cfg.abierta,
    opciones:  leerOpciones()
                 .filter(function (o) { return o.activo; })
                 .map(function (o) { return o.nombre; })
  };
}

/** Lo que ve el administrador: todo, incluidos precios. */
function configAdmin() {
  const cfg = leerConfig();
  cfg.opciones = leerOpciones();
  cfg.hayVotos = contarVotos() > 0;
  return cfg;
}


// ============================================================
//  4. REGISTRAR UN VOTO
// ============================================================
function encabezadoVotos() {
  const h = hoja(HOJA_VOTOS);
  if (h.getLastColumn() === 0) return [];
  return h.getRange(1, 1, 1, h.getLastColumn()).getValues()[0].map(String);
}

function reconstruirEncabezadoVotos(h, nombresOpciones) {
  const encabezado = ['Fecha y hora', 'Nombre'].concat(nombresOpciones).concat(['Total']);
  h.getRange(1, 1, 1, encabezado.length).setValues([encabezado]).setFontWeight('bold');
  h.setFrozenRows(1);
  h.setColumnWidth(1, 150);
  h.setColumnWidth(2, 200);
}

function contarVotos() {
  return Math.max(0, hoja(HOJA_VOTOS).getLastRow() - 1);
}

function registrarVoto(datos) {
  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(20000);
  try {
    const cfg = leerConfig();
    if (!cfg.abierta) throw new Error('La votacion esta cerrada.');

    const nombre = String(datos.nombre || '').trim().slice(0, 60);
    if (nombre.length < 2) throw new Error('Escribe tu nombre.');

    const activas = leerOpciones().filter(function (o) { return o.activo; });
    const cantidades = datos.cantidades || {};
    let total = 0;

    activas.forEach(function (o) {
      const n = parseInt(cantidades[o.nombre], 10) || 0;
      if (n < 0) throw new Error('Las cantidades no pueden ser negativas.');
      if (n > cfg.maximo) throw new Error('El maximo por opcion es ' + cfg.maximo + '.');
      total += n;
    });

    if (total === 0) throw new Error('Elige al menos 1.');

    const h = hoja(HOJA_VOTOS);
    let encabezado = encabezadoVotos();
    if (encabezado.length === 0) {
      reconstruirEncabezadoVotos(h, activas.map(function (o) { return o.nombre; }));
      encabezado = encabezadoVotos();
    }

    // Armar la fila siguiendo el orden exacto del encabezado
    const fila = encabezado.map(function (col) {
      if (col === 'Fecha y hora') return new Date();
      if (col === 'Nombre') return nombre;
      if (col === 'Total') return total;
      return parseInt(cantidades[col], 10) || 0;
    });

    // Si esa persona ya voto, se actualiza su fila en vez de duplicarla
    const filaExistente = buscarFilaPorNombre(h, nombre);
    if (filaExistente > 0) {
      h.getRange(filaExistente, 1, 1, fila.length).setValues([fila]);
      return { total: total, actualizado: true };
    }

    h.appendRow(fila);
    return { total: total, actualizado: false };
  } finally {
    bloqueo.releaseLock();
  }
}

function buscarFilaPorNombre(h, nombre) {
  const ultima = h.getLastRow();
  if (ultima < 2) return -1;
  const nombres = h.getRange(2, 2, ultima - 1, 1).getValues();
  const buscado = nombre.toLowerCase();
  for (let i = 0; i < nombres.length; i++) {
    if (String(nombres[i][0]).trim().toLowerCase() === buscado) return i + 2;
  }
  return -1;
}


// ============================================================
//  5. PANEL DE ADMINISTRADOR
// ============================================================
function resumenAdmin() {
  const cfg        = leerConfig();
  const opciones   = leerOpciones();
  const precios    = {};
  opciones.forEach(function (o) { precios[o.nombre] = o.precio; });

  const h          = hoja(HOJA_VOTOS);
  const encabezado = encabezadoVotos();
  const ultima     = h.getLastRow();

  const totales = {};
  opciones.forEach(function (o) { totales[o.nombre] = 0; });

  const votos = [];

  if (ultima > 1 && encabezado.length > 0) {
    const filas = h.getRange(2, 1, ultima - 1, encabezado.length).getValues();
    filas.forEach(function (f, indice) {
      const voto = { fila: indice + 2, nombre: String(f[1]), cantidades: {}, total: 0 };
      encabezado.forEach(function (col, c) {
        if (col === 'Fecha y hora' || col === 'Nombre' || col === 'Total') return;
        const n = parseInt(f[c], 10) || 0;
        voto.cantidades[col] = n;
        voto.total += n;
        if (totales[col] === undefined) totales[col] = 0;
        totales[col] += n;
      });
      voto.fecha = f[0] ? Utilities.formatDate(new Date(f[0]), Session.getScriptTimeZone(), 'dd/MM HH:mm') : '';
      votos.push(voto);
    });
  }

  // Renglones del resumen, con dinero
  const renglones = [];
  let granTotalPiezas = 0;
  let granTotalDinero = 0;

  Object.keys(totales).forEach(function (nombre) {
    const cantidad = totales[nombre];
    const precio   = precios[nombre] !== undefined ? precios[nombre] : 0;
    const importe  = cantidad * precio;
    granTotalPiezas += cantidad;
    granTotalDinero += importe;
    renglones.push({ nombre: nombre, cantidad: cantidad, precio: precio, importe: importe });
  });

  return {
    titulo:          cfg.titulo,
    moneda:          cfg.moneda,
    abierta:         cfg.abierta,
    renglones:       renglones,
    granTotalPiezas: granTotalPiezas,
    granTotalDinero: granTotalDinero,
    votantes:        votos.length,
    votos:           votos,
    urlHoja:         libro().getUrl(),
    urlExcel:        libro().getUrl().replace(/\/edit.*$/, '') + '/export?format=xlsx'
  };
}


/** Suma cuanto se ha pedido de cada opcion, leyendo la pestana Votos. */
function totalesPorColumna() {
  const h          = hoja(HOJA_VOTOS);
  const encabezado = encabezadoVotos();
  const totales    = {};
  if (encabezado.length === 0 || h.getLastRow() < 2) return totales;

  const filas = h.getRange(2, 1, h.getLastRow() - 1, encabezado.length).getValues();
  encabezado.forEach(function (col, c) {
    if (col === 'Fecha y hora' || col === 'Nombre' || col === 'Total') return;
    totales[col] = 0;
    filas.forEach(function (f) { totales[col] += parseInt(f[c], 10) || 0; });
  });
  return totales;
}

function guardarConfig(datos) {
  const nuevas = (datos.opciones || [])
    .map(function (o) {
      return {
        nombre: String(o.nombre || '').trim().slice(0, 40),
        precio: Number(o.precio) || 0,
        activo: o.activo !== false
      };
    })
    .filter(function (o) { return o.nombre.length > 0; });

  if (nuevas.length === 0) throw new Error('Necesitas al menos una opcion.');

  const vistos = {};
  nuevas.forEach(function (o) {
    const clave = o.nombre.toLowerCase();
    if (vistos[clave]) throw new Error('La opcion "' + o.nombre + '" esta repetida.');
    vistos[clave] = true;
  });

  // Proteccion: solo se bloquea quitar una opcion que YA tiene pedidos.
  // Si nadie pidio nada de ella, se puede quitar sin problema.
  const nombresNuevos = nuevas.map(function (o) { return o.nombre; });
  const anteriores    = leerOpciones().map(function (o) { return o.nombre; });
  const perdidas      = anteriores.filter(function (n) { return nombresNuevos.indexOf(n) === -1; });

  if (perdidas.length > 0) {
    const totales   = totalesPorColumna();
    const conPedidos = perdidas.filter(function (n) { return (totales[n] || 0) > 0; });
    if (conPedidos.length > 0) {
      throw new Error(
        'No puedes quitar o renombrar "' + conPedidos.join('", "') + '" porque ya hay ' +
        'pedidos registrados con esa opcion. Primero pulsa "Cerrar y archivar votacion".'
      );
    }
  }

  // Guardar configuracion general
  const cfgHoja = hoja(HOJA_CONFIG);
  cfgHoja.clear();
  cfgHoja.getRange('A1:B1').setValues([['Clave', 'Valor']]).setFontWeight('bold');
  cfgHoja.getRange('A2:B6').setValues([
    ['titulo',    String(datos.titulo || 'Encuesta').slice(0, 80)],
    ['subtitulo', String(datos.subtitulo || '').slice(0, 120)],
    ['maximo',    Math.min(99, Math.max(1, parseInt(datos.maximo, 10) || 10))],
    ['abierta',   datos.abierta ? 'SI' : 'NO'],
    ['moneda',    String(datos.moneda || '$').slice(0, 3)]
  ]);

  // Guardar opciones
  const opHoja = hoja(HOJA_OPCIONES);
  opHoja.clear();
  opHoja.getRange('A1:C1').setValues([['Nombre', 'Precio', 'Activo']]).setFontWeight('bold');
  opHoja.getRange(2, 1, nuevas.length, 3).setValues(
    nuevas.map(function (o) { return [o.nombre, o.precio, o.activo ? 'SI' : 'NO']; })
  );

  // Quitar de Votos las columnas de opciones eliminadas (todas tenian 0)
  const hv = hoja(HOJA_VOTOS);
  perdidas.forEach(function (nombre) {
    const columna = encabezadoVotos().indexOf(nombre);
    if (columna >= 0) hv.deleteColumn(columna + 1);
  });

  // Agregar columnas nuevas a Votos, sin tocar lo ya registrado
  let encabezado = encabezadoVotos();
  if (encabezado.length === 0) {
    reconstruirEncabezadoVotos(hv, nombresNuevos);
  } else {
    const faltantes = nombresNuevos.filter(function (n) { return encabezado.indexOf(n) === -1; });
    faltantes.forEach(function (nombre) {
      const columnaTotal = encabezado.indexOf('Total') + 1;
      hv.insertColumnBefore(columnaTotal);
      hv.getRange(1, columnaTotal).setValue(nombre).setFontWeight('bold');
      if (hv.getLastRow() > 1) {
        hv.getRange(2, columnaTotal, hv.getLastRow() - 1, 1).setValue(0);
      }
      encabezado = encabezadoVotos();
    });
  }

  return { guardado: true, opciones: nuevas.length };
}


function archivarVotacion() {
  const h = hoja(HOJA_VOTOS);
  if (contarVotos() === 0) throw new Error('No hay votos que archivar.');

  const sello   = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd_HHmm');
  const titulo  = leerConfig().titulo.replace(/[^A-Za-z0-9 ]/g, '').slice(0, 20).trim();
  const copia   = h.copyTo(libro());
  copia.setName(('Votos ' + sello + ' ' + titulo).slice(0, 95));
  libro().setActiveSheet(copia);
  libro().moveActiveSheet(libro().getSheets().length);

  h.getRange(2, 1, h.getMaxRows() - 1, h.getMaxColumns()).clearContent();
  return { archivadoEn: copia.getName() };
}


function borrarVoto(datos) {
  const h = hoja(HOJA_VOTOS);
  const fila = parseInt(datos.fila, 10);
  if (!fila || fila < 2 || fila > h.getLastRow()) throw new Error('Ese voto ya no existe.');
  h.deleteRow(fila);
  return { borrado: true };
}
