# Sistema de encuestas

App de encuestas con cantidades (tipo "cuántos tacos quieres de cada uno").
Quien vota **nunca** ve los precios ni los totales del grupo: solo quien
administra, con contraseña.

Sirve para cualquier votación, no solo tacos: se reconfigura desde el panel
sin tocar una sola línea de código.

---

## Cómo está armado

```
   Votante (celular)              Tú (administrador)
         |                              |
         v                              v
   index.html                      admin.html
         |                              |
         +--------------+---------------+
                        v
             Google Apps Script          <- el "portero"
             (sabe la contraseña             valida y decide
              y los precios)                 qué entrega
                        v
             Google Sheets               <- aquí se guarda todo
                        v
                 archivo .xlsx
```

**Por qué el votante no puede ver los precios:** no es que se los escondamos
con CSS. El servidor sencillamente **nunca se los envía**. Aunque alguien abra
las herramientas del navegador, no hay nada que encontrar.

---

## Instalación (una sola vez, ~10 minutos)

### Paso 1 — Crear la hoja de cálculo

1. Entra a <https://sheets.google.com> y crea una hoja en blanco.
2. Ponle un nombre, por ejemplo **Encuestas**.

### Paso 2 — Pegar el portero

1. En esa hoja, menú **Extensiones > Apps Script**.
2. Se abre una pestaña nueva con un archivo `Código.gs` que trae
   `function myFunction() {}`. **Bórralo todo.**
3. Abre `google-apps-script/Codigo.gs` de este proyecto, copia **todo** su
   contenido y pégalo ahí.
4. En la línea 20, cambia la contraseña:

   ```js
   const CONTRASENA_ADMIN = 'cambiame123';   //  <-- pon la tuya
   ```

5. Guarda con `Cmd + S`.

### Paso 3 — Preparar las pestañas

1. Arriba, en el menú desplegable de funciones, elige **`inicializar`**.
2. Pulsa **Ejecutar**.
3. Google te pedirá permiso la primera vez:
   - **Revisar permisos** > elige tu cuenta.
   - Aparecerá "Google no ha verificado esta aplicación".
     Pulsa **Configuración avanzada** > **Ir a (nombre del proyecto)**.
     Esto es normal: la app la escribiste tú, no está en ninguna tienda.
   - **Permitir**.
4. Vuelve a la hoja: ya tiene las pestañas `Configuracion`, `Opciones` y `Votos`
   con tacos de ejemplo.

### Paso 4 — Publicar

1. Arriba a la derecha: **Implementar > Nueva implementación**.
2. Icono del engrane > **Aplicación web**.
3. Rellena así:

   | Campo | Valor |
   |---|---|
   | Descripción | Encuestas |
   | Ejecutar como | **Yo** (tu correo) |
   | Quién tiene acceso | **Cualquier usuario** |

   > "Cualquier usuario" significa que cualquiera puede *tocar el timbre*,
   > no que pueda ver los datos. El portero sigue pidiendo contraseña para
   > todo lo privado.

4. **Implementar** > copia la **URL de la aplicación web**.
   Termina en `/exec`.

### Paso 5 — Conectar la página

Abre `assets/config.js` y pega ahí la dirección:

```js
const API_URL = 'https://script.google.com/macros/s/AKfyc..../exec';
```

Listo.

---

## Uso diario

### Lanzar una votación

1. Entra a `admin.html`, escribe tu contraseña.
2. Pestaña **Configurar**: pon título, opciones y precios. Marca
   *La votación está abierta*. **Guardar**.
3. Manda el enlace de `index.html` por WhatsApp.

### Ver los resultados

Pestaña **Resumen**: totales por opción, importe, detalle persona por persona.
Botón **Descargar .xlsx** para el archivo de Excel.

### Reutilizarla para otra encuesta

1. **Cerrar y archivar votación** — los votos de hoy se guardan en una pestaña
   con su fecha (`Votos 2026-09-10_1430 Tacos`) y la tabla queda limpia.
2. **Configurar** — cambia título y opciones. Guarda.
3. Manda **el mismo enlace de siempre**.

---

## Preguntas frecuentes

**¿Puede alguien votar dos veces?**
Sí, pero no se duplica: si vuelve a votar con el mismo nombre, se **reemplaza**
su pedido anterior. Así puede corregirse sin ensuciar la cuenta.

**¿Y si dos personas se llaman igual?**
El sistema las tomaría como la misma. Que pongan apellido.

**No puedo quitar una opción.**
Es a propósito: ya hay votos registrados con ella. Archiva primero.

**Aparece "El servidor respondió algo inesperado".**
Casi siempre es una de dos:
- La dirección en `config.js` termina en `/dev` en vez de `/exec`.
- Al publicar no elegiste **Cualquier usuario** en "Quién tiene acceso".

**Cambié el `Codigo.gs`, ¿por qué no se nota?**
Hay que volver a implementar: **Implementar > Gestionar implementaciones >**
icono del lápiz **> Versión: Nueva versión > Implementar**. La dirección
no cambia.

---

## Límites que conviene saber

- Apps Script gratuito aguanta ~20 000 ejecuciones al día. De sobra.
- Si diez personas votan **exactamente** en el mismo segundo, el sistema las
  pone en fila (hay un candado). Nadie pierde su voto.
- La contraseña protege los datos, pero no está cifrada de forma profesional.
  Es adecuada para tacos de oficina, no para información confidencial.

---

## Seguridad: qué vive en cada sitio

Este repositorio es **público en cuanto a su contenido interno** (aunque esté
en privado): conviene que nunca guarde secretos. El reparto es:

| Dato | Dónde vive | ¿Está en GitHub? |
|---|---|---|
| Contraseña de administrador | Apps Script, en Google | **No** |
| Precios de cada opción | Hoja de Google | **No** |
| Votos y nombres | Hoja de Google | **No** |
| Dirección `/exec` del script | `assets/config.js` | Sí |
| Diseño y lógica de la página | Los archivos `.html`, `.js`, `.css` | Sí |

El valor `cambiame123` que ves en `Codigo.gs` es solo un marcador de posición.
**Tu contraseña real la escribes dentro del editor de Apps Script, en Google,
y no vuelve nunca a este repositorio.**

Si alguna vez quieres guardar en tu Mac una copia del script con tu contraseña
ya puesta, ponle un nombre terminado en `.local.gs`: el `.gitignore` está
preparado para ignorarlo.

### ¿La dirección `/exec` es un secreto?

No, y no pasa nada si se ve. Es como el timbre de una casa: cualquiera puede
tocarlo, pero el portero sigue pidiendo contraseña para todo lo privado.
Sin la contraseña, esa dirección solo devuelve los nombres de las opciones.
