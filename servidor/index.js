/**
 * BUZON DE VOTOS
 * ---------------------------------------------------------------
 * Lo unico que hace este servidor es recibir votos y devolverselos
 * a quien organiza. No sabe precios, no calcula totales y no manda
 * correos. Los precios y la cuenta viven en la app, no aqui.
 *
 * Cada encuesta tiene dos claves distintas:
 *   - id    : va dentro del enlace que repartes. Sirve para ESCRIBIR.
 *   - clave : se queda en tu navegador. Sirve para LEER.
 * Por eso quien vota puede mandar su pedido pero no puede ver los
 * de los demas: no tiene la clave de lectura.
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400"
};

const NOVENTA_DIAS = 60 * 60 * 24 * 90;
const ID_VALIDO = /^[A-Za-z0-9_-]{8,64}$/;

const responder = (objeto, estado = 200) =>
  new Response(JSON.stringify(objeto), {
    status: estado,
    headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" }
  });

/** Normaliza el nombre para que "Juan  Perez" y "juan perez" sean el mismo. */
function claveDePersona(nombre) {
  return nombre.trim().toLowerCase().replace(/\s+/g, " ");
}

async function leerCuerpo(peticion) {
  try {
    const d = await peticion.json();
    return d && typeof d === "object" ? d : null;
  } catch (e) {
    return null;
  }
}

export default {
  async fetch(peticion, env) {
    const url = new URL(peticion.url);
    const ruta = url.pathname.replace(/\/+$/, "") || "/";

    if (peticion.method === "OPTIONS") return new Response(null, { headers: CORS });

    try {
      /* ---------- Dar de alta una encuesta ---------- */
      if (ruta === "/crear" && peticion.method === "POST") {
        const d = await leerCuerpo(peticion);
        if (!d || !ID_VALIDO.test(d.id || "") || !ID_VALIDO.test(d.clave || "")) {
          return responder({ ok: false, error: "Datos de encuesta invalidos." }, 400);
        }
        const yaExiste = await env.VOTOS.get("m:" + d.id);
        if (yaExiste) {
          // Ya estaba dada de alta. Solo vale si trae la misma clave.
          const m = JSON.parse(yaExiste);
          if (m.clave !== d.clave) return responder({ ok: false, error: "Esa encuesta ya existe." }, 409);
          return responder({ ok: true, yaExistia: true });
        }
        await env.VOTOS.put(
          "m:" + d.id,
          JSON.stringify({ clave: d.clave, creada: new Date().toISOString() }),
          { expirationTtl: NOVENTA_DIAS }
        );
        return responder({ ok: true });
      }

      /* ---------- Recibir un voto ---------- */
      if (ruta === "/voto" && peticion.method === "POST") {
        const d = await leerCuerpo(peticion);
        if (!d || !ID_VALIDO.test(d.id || "")) {
          return responder({ ok: false, error: "Encuesta invalida." }, 400);
        }
        if (!(await env.VOTOS.get("m:" + d.id))) {
          return responder({ ok: false, error: "Esta encuesta ya no existe o caduco." }, 404);
        }

        const nombre = String(d.nombre || "").trim().replace(/\s+/g, " ").slice(0, 50);
        if (nombre.length < 2) return responder({ ok: false, error: "Falta el nombre." }, 400);

        const cants = (Array.isArray(d.cants) ? d.cants : [])
          .slice(0, 40)
          .map((n) => Math.max(0, Math.min(99, parseInt(n, 10) || 0)));
        if (cants.length === 0 || cants.reduce((a, b) => a + b, 0) === 0) {
          return responder({ ok: false, error: "El pedido viene vacio." }, 400);
        }

        // La misma persona votando otra vez REEMPLAZA su pedido anterior.
        await env.VOTOS.put(
          "v:" + d.id + ":" + claveDePersona(nombre),
          JSON.stringify({ nombre, cants, cuando: new Date().toISOString() }),
          { expirationTtl: NOVENTA_DIAS }
        );
        return responder({ ok: true, total: cants.reduce((a, b) => a + b, 0) });
      }

      /* ---------- Entregar los votos a quien organiza ---------- */
      if (ruta === "/votos" && peticion.method === "GET") {
        const id = url.searchParams.get("id") || "";
        const clave = url.searchParams.get("clave") || "";
        if (!ID_VALIDO.test(id)) return responder({ ok: false, error: "Encuesta invalida." }, 400);

        const meta = await env.VOTOS.get("m:" + id);
        if (!meta) return responder({ ok: false, error: "Esta encuesta ya no existe." }, 404);
        if (JSON.parse(meta).clave !== clave) {
          return responder({ ok: false, error: "Sin permiso para leer esta encuesta." }, 403);
        }

        const votos = [];
        let cursor;
        do {
          const pagina = await env.VOTOS.list({ prefix: "v:" + id + ":", cursor });
          for (const k of pagina.keys) {
            const crudo = await env.VOTOS.get(k.name);
            if (crudo) votos.push(JSON.parse(crudo));
          }
          cursor = pagina.list_complete ? null : pagina.cursor;
        } while (cursor);

        votos.sort((a, b) => String(a.cuando).localeCompare(String(b.cuando)));
        return responder({ ok: true, votos });
      }

      /* ---------- Vaciar una encuesta ---------- */
      if (ruta === "/vaciar" && peticion.method === "POST") {
        const d = await leerCuerpo(peticion);
        if (!d || !ID_VALIDO.test(d.id || "")) return responder({ ok: false, error: "Encuesta invalida." }, 400);

        const meta = await env.VOTOS.get("m:" + d.id);
        if (!meta) return responder({ ok: false, error: "Esta encuesta ya no existe." }, 404);
        if (JSON.parse(meta).clave !== d.clave) {
          return responder({ ok: false, error: "Sin permiso." }, 403);
        }

        let borrados = 0, cursor;
        do {
          const pagina = await env.VOTOS.list({ prefix: "v:" + d.id + ":", cursor });
          for (const k of pagina.keys) { await env.VOTOS.delete(k.name); borrados++; }
          cursor = pagina.list_complete ? null : pagina.cursor;
        } while (cursor);

        return responder({ ok: true, borrados });
      }

      /* ---------- Comprobacion de vida ---------- */
      if (ruta === "/") {
        return responder({ ok: true, buzon: "encuestas", version: 1 });
      }

      return responder({ ok: false, error: "Ruta desconocida." }, 404);
    } catch (e) {
      return responder({ ok: false, error: "Error en el buzon: " + e.message }, 500);
    }
  }
};

/* ------------------------------------------------------------------
   Para volver a desplegar este buzón:
     cd servidor && npx wrangler login && npx wrangler deploy
   Dirección en servicio: https://encuestas-buzon.popular-metal.workers.dev
   ------------------------------------------------------------------ */
