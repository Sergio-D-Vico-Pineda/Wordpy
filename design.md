# Diseno tecnico

## Arquitectura

Aplicacion front-end estatica con tres capas:

1. Presentacion: [index.html](index.html) + [styles.css](styles.css)
2. Dominio: logica del juego en [app.js](app.js)
3. Persistencia local: `localStorage` (`reto-letras-v1`)

No hay backend propio. La validacion de existencia de palabras depende de `https://es.wiktionary.org/w/api.php`.

## Flujo principal

1. Cargar estado persistido.
2. Generar (o recuperar) combinacion activa no bloqueada.
3. Recibir palabra del usuario.
4. Activar cooldown 5-10 segundos.
5. Consultar API de Wiktionary (`action=query&titles=<palabra>&redirects=1&format=json&origin=*`).
6. Verificar subsecuencia con soporte de comodin.
7. Actualizar puntos/historial/combinaciones y re-renderizar UI.

## Modelo de datos

```text
state = {
  points: number,
  currentCombo: string[3],
  bannedCombos: Set<string>,
  history: Array<{
    timestamp: string (ISO),
    word: string,
    combo: string,
    result: "valido" | "invalido" | "omitido"
  }>,
  useWeightedRandom: boolean,
  cooldownUntilMs: number
}
```

## Estrategias clave

- Normalizacion: se aceptan acentos y dieresis en entrada; para matching de subsecuencia se reducen a base (`a,e,i,o,u`) preservando `\u00f1`.
- Comodin: `?` representa una sola posicion flexible dentro de la secuencia de 3.
- Historial: insercion al inicio con truncado a 200 eventos.
- Bloqueadas: clave canonica de 3 caracteres (`abc`, `a?r`).

## Manejo de errores

- Pagina faltante en Wiktionary: intento invalido.
- Error de red o formato de API: mostrar fallo temporal y no aplicar cooldown.

## Seguridad y privacidad

- No se usan `innerHTML` con datos del usuario para entradas directas.
- No se envian datos sensibles fuera de la palabra consultada.