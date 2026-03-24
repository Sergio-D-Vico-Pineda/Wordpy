# Reto de Letras

Juego web en espanol (single-player) hecho con HTML, CSS, TailwindCSS (CDN) y JavaScript puro.

## Como ejecutar

1. Usa un servidor estatico local.

Ejemplo de servidor estatico:

```bash
python -m http.server 5500
```

Luego visita `http://localhost:5500`.

## Reglas implementadas

- Se genera una combinacion de 3 caracteres (a-z + n).
- El orden debe cumplirse como subsecuencia (no necesariamente consecutiva).
- Hay 5% de probabilidad de un comodin `?` por combinacion (maximo uno).
- +1 punto por palabra valida (existe en Wiktionary y cumple la combinacion).
- Si la palabra es invalida, se mantiene la combinacion actual.
- Boton de omitir: bloquea la combinacion y genera una nueva sin sumar puntos.
- En cada envio con respuesta valida de API, hay cooldown aleatorio entre 5 y 10 segundos.
- Si hay error de red/API, se muestra error y no se aplica cooldown.
- Historial: fecha/hora, palabra, combinacion, estado (valido/invalido/omitido), limitado a 200 registros.
- Persistencia completa en `localStorage` (puntos, combinaciones bloqueadas, historial y preferencias).

## API usada

- Base URL: `https://es.wiktionary.org/w/api.php`
- Validacion de palabra: `action=query&titles=<palabra>&redirects=1&format=json&origin=*`
- Regla de validez: se considera valida si existe una pagina no marcada como faltante (incluye redirecciones y desambiguacion).

## Estructura

- [index.html](index.html): estructura y componentes de UI.
- [styles.css](styles.css): diseno, tokens de color y accesibilidad visual.
- [app.js](app.js): logica del juego, validacion, cooldown y persistencia.