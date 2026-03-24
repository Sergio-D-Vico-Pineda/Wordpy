# Requisitos

## Historias de usuario

- Como jugador, quiero recibir una combinacion de 3 caracteres para buscar una palabra valida del diccionario en espanol.
- Como jugador, quiero ver mi puntuacion para seguir mi progreso.
- Como jugador, quiero omitir combinaciones imposibles y bloquearlas para que no reaparezcan.
- Como jugador, quiero consultar el historial de intentos para revisar mi partida.
- Como jugador, quiero que la interfaz sea clara, accesible y utilizable en movil.

## Criterios de aceptacion (EARS)

- WHEN se inicia la aplicacion, THE SYSTEM SHALL generar una combinacion de 3 caracteres usando el alfabeto a-z y n.
- WHEN se genera una combinacion, THE SYSTEM SHALL aplicar 5% de probabilidad para incluir un unico comodin `?` en una sola posicion.
- WHEN el jugador envia una palabra, THE SYSTEM SHALL validar su existencia mediante `https://es.wiktionary.org/w/api.php` con `action=query`, `titles`, `redirects=1`, `format=json` y `origin=*`.
- WHEN la palabra existe y cumple la combinacion como subsecuencia en orden, THE SYSTEM SHALL sumar 1 punto, registrar historial y generar una nueva combinacion.
- WHEN la palabra no existe o no cumple la combinacion, THE SYSTEM SHALL mantener la combinacion actual y registrar el intento como invalido.
- WHEN el jugador pulsa "Saltar combinacion", THE SYSTEM SHALL registrar el evento como omitido, bloquear la combinacion y generar una nueva sin sumar puntos.
- WHEN el jugador envia un intento y la API responde correctamente, THE SYSTEM SHALL activar un cooldown aleatorio entre 5 y 10 segundos y deshabilitar la entrada durante la cuenta regresiva.
- IF la API devuelve un error de red o formato no valido THEN THE SYSTEM SHALL mostrar el error y no aplicar cooldown.
- WHEN una combinacion esta en la lista de bloqueadas, THE SYSTEM SHALL evitar volver a generarla.
- WHEN el jugador gestiona bloqueadas, THE SYSTEM SHALL permitir agregar, quitar y vaciar combinaciones manualmente.
- WHEN se guarda estado de juego, THE SYSTEM SHALL persistir puntos, combinacion, historial (maximo 200), bloqueadas, modo de aleatoriedad y API key en localStorage.
- WHILE el modo de frecuencia esta desactivado, THE SYSTEM SHALL generar letras de forma uniforme.
- WHILE el modo de frecuencia esta activado, THE SYSTEM SHALL generar letras ponderadas por frecuencia en espanol.
- WHERE la interfaz se renderiza, THE SYSTEM SHALL mostrar todo el contenido en espanol.
- WHERE se usan acentos, n o u con dieresis en entradas, THE SYSTEM SHALL aceptarlos y tratarlos como sus caracteres base para validar subsecuencia.