# Dino on Set — Brief para generar assets (ChatGPT / IA)

Copiá el bloque **PROMPT COMPLETO** al final y pedile una tanda a la vez.

---

## Resumen del juego

Easter egg runner estilo dinosaurio de Chrome, temática **productora audiovisual argentina** (SKA Studio). Pixel art premium, humor de set, minimalista. El personaje corre de izquierda a derecha esquivando obstáculos de producción.

**Paleta de referencia (web SKA):**
- Fondo / tinta: `#5C0C0E`, `#7A0F12`
- Cuerpo / blanco principal: `#F2F2F2`
- Acento producción (dorado): `#C9A227`
- Detalle ojo / rojo: `#5C0C0E`
- Luz cálida: `#FFE08A`
- Post / frío: `#78C8FF`
- Suelo: `#2A0809`

---

## Reglas técnicas OBLIGATORIAS (todas las tandas)

1. **Formato:** PNG con transparencia (canal alpha).
2. **Canvas:** **512×512 px** exactos (todas las imágenes del mismo tamaño).
3. **Estilo:** pixel art limpio, bordes definidos, **sin anti-aliasing suave** (look retro nítido).
4. **Anclaje al suelo:** el punto de apoyo del personaje u objeto debe estar a **8 px del borde inferior** del canvas, centrado horizontalmente (pivot pies = centro-abajo).
5. **Margen:** dejar ~10% de padding transparente en los lados; el arte ocupa ~80% del alto útil.
6. **Sin texto** dentro de los sprites (salvo detalles mínimos de claqueta).
7. **Sin fondo** de color sólido — solo transparencia fuera del dibujo.
8. **Naming:** respetar el nombre de archivo exacto (minúsculas, guiones).
9. **Entrega:** un ZIP o archivos sueltos listos para copiar a `public/game/`.

### Overlays de gear (muy importante)

Los archivos `gear-*.png` son **capas transparentes** que se superponen al dino:
- Mismo canvas 512×512.
- El dino debe estar **invisible** (100% transparente) en esos PNG.
- Solo se dibuja el accesorio (auricular, chaleco, etc.) **en la misma posición** que ocuparía sobre el `dino-run-1.png` de referencia.
- Pedí primero `dino-run-1.png` y usalo como referencia para alinear todos los `gear-*.png`.

---

## TANDA 1 — Personaje (10 archivos)

| # | Archivo | Descripción |
|---|---------|-------------|
| 1 | `dino-run-1.png` | Dino corriendo, pose 1. Cámara de video en una mano. Auriculares de producción opcionales en la cabeza. |
| 2 | `dino-run-2.png` | Misma escala y posición que run-1, piernas en pose alternada. |
| 3 | `dino-jump.png` | Salto. Mismos pies de referencia (más abajo en canvas = más aire abajo). |
| 4 | `dino-duck.png` | Agachado / esquivar. Misma anchura de personaje, menos alto, pies al suelo. |
| 5 | `gear-headset.png` | **Solo** auricular de producción + micrófono boom. Overlay transparente. |
| 6 | `gear-vest.png` | **Solo** chaleco de producción / utility vest. Overlay. |
| 7 | `gear-mate.png` | **Solo** mate en la mano libre. Overlay. |
| 8 | `gear-glasses.png` | **Solo** anteojos de director / sunstrip. Overlay. |
| 9 | `gear-megaphone.png` | **Solo** megáfono de dirección. Overlay. |
| 10 | `ui-rec-dot.png` | Círculo rojo REC pequeño (16–24 px lógicos), para HUD. Centrado en canvas. |

---

## TANDA 2 — Gameplay (10 archivos)

Obstáculos y pickups. Mismo canvas 512×512; objetos de piso con **base en el borde inferior** (8 px).

| # | Archivo | Descripción |
|---|---------|-------------|
| 1 | `xlr.png` | Cable XLR en el piso, enredado, vista lateral. |
| 2 | `tripod.png` | Trípode de cámara, alto, patas visibles, base en el suelo. |
| 3 | `clapper.png` | Claqueta de cine cerrada, apoyada. |
| 4 | `flight.png` | Flight case / anvil case de producción. |
| 5 | `gaffer-roll.png` | Rollo de cinta gaffer (negro/plata). |
| 6 | `drone.png` | Drone con cámara, **flotando** — centro del arte ~40% desde abajo (obstáculo aéreo). |
| 7 | `boom.png` | Micrófono boom / percha en horizontal, obstáculo aéreo bajo. |
| 8 | `pickup-mate.png` | Mate con bombilla, brillo sutil (ítem coleccionable). |
| 9 | `pickup-cafe.png` | Vaso de café de producción. |
| 10 | `pickup-battery.png` | Batería V-Mount o NP-F, ícono de carga. |

---

## TANDA 3 — Fondo y entorno (10 archivos)

Capas decorativas y parallax. Pueden ser **más anchas** si querés: **1024×512 px** (solo esta tanda), fondo transparente o degradado suave en la parte superior.

| # | Archivo | Descripción |
|---|---------|-------------|
| 1 | `decor-storyboard.png` | Storyboard / post-its en pared, etapa preproducción. Sutil, ~40% opacidad visual. |
| 2 | `decor-cam-a.png` | Cámara en trípode + foco, set de rodaje interior. |
| 3 | `decor-street-ext.png` | Edificios / calle argentina estilizada, exterior. |
| 4 | `decor-night-moon.png` | Luna + farol tenue, noche de rodaje. |
| 5 | `decor-timeline.png` | Línea de tiempo / timeline de edición (post). |
| 6 | `decor-export.png` | Ícono export / render / flecha de delivery. |
| 7 | `decor-aura.png` | Destellos / aura “cine” muy sutil. |
| 8 | `bg-parallax-hills.png` | Siluetas de colinas lejanas, tile horizontal. |
| 9 | `bg-parallax-city.png` | Silueta ciudad baja, tile horizontal. |
| 10 | `bg-clouds-subtle.png` | Nubes o grain atmosférico muy suave. |

---

## PROMPT COMPLETO (copiar en ChatGPT)

```
Sos un artista de pixel art para videojuegos. Necesito sprites para "Dino on Set", un endless runner de una productora audiovisual argentina (SKA Studio).

ESTILO:
- Pixel art retro premium, nítido, sin blur
- Paleta: cuerpo #F2F2F2, acento dorado #C9A227, rojos #5C0C0E, detalles cálidos #FFE08A
- Humor de set de filmación, identidad AV argentina, NO copiar el dino de Chrome
- Personaje: dinosaurio minimalista con cámara de video en la mano

REGLAS TÉCNICAS (obligatorio):
- PNG transparente, canvas 512×512 px (tanda 3 parallax: 1024×512 opcional)
- Pies / base de objetos de piso a 8 px del borde inferior, centrado horizontal
- Sin fondo sólido, sin texto (salvo detalle mínimo en claqueta)
- nearest-neighbor look, bordes limpios

TANDA A GENERAR AHORA: [TANDA 1 / TANDA 2 / TANDA 3 — elegir una]

[Listar aquí los 10 archivos de la tanda con nombres exactos y descripciones de la tabla]

Para TANDA 1: primero generá dino-run-1.png. Los gear-*.png son OVERLAYS: solo el accesorio, resto transparente, misma posición que sobre el dino de referencia.

Entregá cada imagen por separado con el nombre de archivo indicado.
```

---

## Después de generar

1. Copiar PNGs a `public/game/`
2. Agregar nombres a `PNG_SPRITE_FILES` en `src/scripts/dino/sprites.ts`
3. Probar en local: botón play o escribir `dino` en el home
