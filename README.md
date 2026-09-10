# Comanda

Encuestas con cantidades: *¿cuántos tacos quieres de cada uno?*

Quien vota anota sus piezas y recibe un **folio** corto que te manda por
WhatsApp. Tú pegas los folios y sale el total, el importe y el Excel.

**Nadie más que tú ve los precios ni la cuenta.**

---

## Por qué funciona sin servidor

No hay base de datos, ni cuenta de Google, ni contraseñas. Todo viaja en
dos textos:

```
   TÚ                                     QUIEN VOTA
   |                                          |
   | 1. Armas la encuesta                     |
   |    -> sale un ENLACE que lleva dentro    |
   |       los nombres de las opciones        |
   |------------- por WhatsApp -------------->|
   |                                          | 2. Anota sus piezas
   |                                          |    -> sale un FOLIO que
   |                                          |       lleva su respuesta
   |<------------ por WhatsApp ---------------|
   | 3. Pegas los folios                      |
   |    -> total, importe y Excel             |
```

Los **precios nunca salen de tu dispositivo**: no van en el enlace, así que
no hay forma de que quien vota los vea. La cuenta se arma en tu navegador.

---

## Cómo se usa

### 1. Armar
Título, instrucción, máximo por opción, y la lista de opciones con su precio.
Pulsa **Crear enlace** y repártelo.

### 2. Recibir
Pega en el recuadro lo que te mandaron. Puedes pegar **la conversación entera
de WhatsApp**: la app saca sola todos los folios que encuentre.

- Si alguien manda su folio dos veces, se queda el último.
- Si llega un folio de otra encuesta, lo avisa y no lo cuenta.
- Para quien te conteste de palabra, hay **Agregar a mano**.

### 3. Cuenta
Totales, importes, quién pidió qué, y **Descargar Excel (.xlsx)** con dos
hojas: resumen y detalle.

### Reutilizarla
Descarga el Excel, pulsa **Borrar los pedidos y empezar otra**, cambia el
título y las opciones, y crea un enlace nuevo. La app no sabe nada de tacos:
las opciones son datos que tú escribes.

---

## Dónde vive cada cosa

| Dato | Dónde | ¿En este repositorio? |
|---|---|---|
| Precios | Tu navegador | No |
| Pedidos recibidos | Tu navegador | No |
| Nombres de las opciones | Dentro del enlace que repartes | No |
| La app | `index.html` | Sí |

No hay contraseñas, tokens ni claves en el código. No hace falta esconder nada
porque no hay nada que esconder.

---

## Detalles técnicos

- Un solo archivo, `index.html`. Sin compilar, sin dependencias que instalar.
- La única librería externa es [SheetJS](https://sheetjs.com) desde cdnjs,
  y solo para escribir el `.xlsx`.
- El enlace y el folio son JSON comprimido en base64url (soporta acentos y ñ).
- Cada folio lleva una **huella** de 4 letras de la lista de opciones. Si las
  cambias después de repartir el enlace, los folios viejos se detectan y no se
  cuentan mal.
- Los pedidos se guardan en `localStorage`. Si borras los datos del navegador
  o cambias de dispositivo, se pierden: **descarga el Excel**.

## Límites que conviene saber

- Cada persona tiene que devolverte su folio. La app no puede ir a buscarlo.
- Si dos personas se llaman igual, cuentan como una. Que pongan apellido.
- El folio crece con el número de opciones. Con 10 opciones ronda los 90
  caracteres: cabe de sobra en un mensaje.
