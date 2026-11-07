# Powerball & Mega Millions

Los números ganadores de las dos grandes loterías estadounidenses multiestatales, Powerball y Mega Millions, en
Gladys: el último sorteo de cada juego, el próximo en su hora local y, si usted juega, el resultado de sus
jugadas. Los disparadores de escena reaccionan a la publicación de los números, y un widget del panel lo resume
todo.

Los números proceden de los datos abiertos del Estado de Nueva York (data.ny.gov), publicados por la New York
State Gaming Commission. **Son solo informativos: no son una fuente oficial para validar un premio.** Compruebe
siempre sus boletos con la lotería oficial o en un punto de venta.

## Lo que necesita

- Gladys Assistant 5.3.0 o posterior.
- Acceso a Internet desde Gladys. Sin cuenta ni clave.

## Configuración

### Idioma

El idioma de los nombres de las funciones y de las frases enviadas a las escenas (francés por defecto). Los
nombres se fijan al añadir un dispositivo: cambie primero el idioma y luego añada los dispositivos.

### Sus jugadas

Opcional. Escriba las jugadas que juega, un campo por juego, separadas por un punto y coma:

- Powerball: 5 números del 1 al 69, luego `+` y el Powerball del 1 al 26, por ejemplo
  `5 12 23 34 45 + 6; 1 7 19 28 60 + 13`;
- Mega Millions: 5 números del 1 al 70, luego `+` y la Mega Ball del 1 al 24.

Una barra también sirve en lugar de `+`, y seis números seguidos se leen como cinco números y la bola extra.
Hasta 10 jugadas por juego. Una jugada ilegible aparece en el estado de la conexión: el botón **Comprobar** la
indica.

Con jugadas, cada dispositivo recibe cuatro funciones más: aciertos de la mejor jugada, su categoría de premio,
el número de jugadas ganadoras y un resumen en texto. Haga clic en **Actualizar** en la pestaña Descubrir para
añadirlas a un dispositivo ya añadido.

## Los dispositivos

En la pestaña Descubrir aparecen dos dispositivos, **Powerball** y **Mega Millions**:

| Función                            | Valor                                                      |
| ---------------------------------- | ---------------------------------------------------------- |
| Fecha del último sorteo            | p. ej. `mié, 4 nov`                                        |
| Últimos números ganadores          | p. ej. `15 34 41 53 56 + 21`                               |
| Power Play (Powerball)             | el multiplicador del último sorteo, p. ej. `×2`            |
| Números del Double Play            | el sorteo Double Play del Powerball                        |
| Próximo sorteo                     | en la zona horaria de Gladys, p. ej. `mar, 10 nov · 04:59` |
| Sorteo hoy / mañana                | 1 o 0, en la zona horaria de Gladys                        |
| Aciertos (mejor jugada)            | 0 a 6, Powerball o Mega Ball incluida                      |
| Categoría de premio (mejor jugada) | 1 (bote) a 9, 0 sin premio                                 |
| Jugadas ganadoras                  | cuántas de sus jugadas ganan un premio                     |
| Resultado de sus jugadas           | p. ej. `3 + Powerball (categoría 5) · 1/2 jugada ganadora` |

Las nueve categorías de premio son las mismas en ambos juegos:

| Categoría | Bolas acertadas       |
| --------- | --------------------- |
| 1         | 5 + bola extra (bote) |
| 2         | 5                     |
| 3         | 4 + bola extra        |
| 4         | 4                     |
| 5         | 3 + bola extra        |
| 6         | 3                     |
| 7         | 2 + bola extra        |
| 8         | 1 + bola extra        |
| 9         | solo bola extra       |

No se muestra ningún importe: el bote no está en los datos abiertos, el Power Play y el multiplicador de Mega
Millions cambian los demás premios, y California paga importes de apuesta mutua.

## Widget del panel

El widget **Loterías de EE. UU.** muestra los últimos números de cada juego, una insignia con el mejor resultado
de sus jugadas (toque un juego para ver el detalle jugada por jugada), los próximos sorteos y un breve aviso. Sus
ajustes eligen los juegos y ocultan el resultado de las jugadas, los próximos sorteos o el aviso.

## Disparadores de escena

Cada disparador puede limitarse a un juego. Se activan una vez por sorteo, al publicarse los números, para un
sorteo de los últimos cuatro días.

### Nuevo sorteo publicado

En cada nuevo sorteo. Variables: el juego, la frase de resumen (lista para enviar), la fecha, los números, la
bola extra, el Power Play y el resultado de sus jugadas.

### Números acertados

En cada nuevo sorteo, si ha escrito jugadas, con el número de bolas acertadas por su mejor jugada (0 a 6).
Marque 3, 4, 5 y 6 para «al menos 3».

### Jugada ganadora

Cuando una de sus jugadas alcanza una categoría de premio. El filtro puede quedarse solo con algunas categorías
(1 y 2 para los premios grandes).

## Acción de escena

**Leer el último sorteo** devuelve una frase lista para enviar («Los números del Powerball del miércoles 4 de
noviembre: …»), con el resultado de sus jugadas y el próximo sorteo, además de los números, la fecha, el próximo
sorteo, los aciertos y la categoría de premio para las acciones siguientes.

## Ejemplos de escenas

- Disparador **Nuevo sorteo publicado**, y luego enviar la variable `summary` en un mensaje.
- Disparador **Jugada ganadora**, categorías 1 a 4: notificación «¡Compruebe su boleto!».
- Cada día a las 18:00, condición **Sorteo mañana** = 1 en Powerball (en Europa, el sorteo cae de noche), o
  **Sorteo hoy** = 1 en América: un recordatorio para jugar.

## Solución de problemas

- **Sin números**: la integración lee data.ny.gov una vez por hora (cada 10 minutos tras un fallo).
  **Comprobar** lo lee al momento; el informe dice si data.ny.gov respondió.
- **Una jugada no se entiende**: compruebe el formato (5 números, `+`, la bola extra) y los rangos.
- **Faltan funciones nuevas**: las jugadas añadidas después del dispositivo necesitan **Actualizar** en la
  pestaña Descubrir.
- **Registros**: `LOG_LEVEL=debug` muestra cada lectura.

## Límites

- data.ny.gov publica los números la mañana siguiente al sorteo (hora de Nueva York): llegan a Gladys unas horas
  después del sorteo, dentro de la hora siguiente a su publicación.
- Las horas de los sorteos siguen el calendario oficial (Powerball: lunes, miércoles y sábado a las 22:59, hora
  del Este; Mega Millions: martes y viernes a las 23:00). Un cambio excepcional de calendario no se conoce.
- Sus jugadas se comparan con el sorteo principal del Powerball, no con el Double Play.
- Sin importes ni bote: vea más arriba.
- Sus comentarios son bienvenidos en el foro o en las issues de GitHub.

## Datos y créditos

Datos: [Lottery Powerball Winning Numbers](https://data.ny.gov/d/d6yy-54nr) y
[Lottery Mega Millions Winning Numbers](https://data.ny.gov/d/5xaw-6ayf), New York State Gaming Commission, en
data.ny.gov. Leídos una vez por hora y por juego, sin token de aplicación. Esta integración no está afiliada a
Powerball, Mega Millions, la Multi-State Lottery Association ni la New York Lottery.

## Juego responsable

Las loterías están prohibidas a los menores (18 años o más según el estado). Juegue solo lo que pueda permitirse
perder. Si el juego se convierte en un problema, llame al 1-800-GAMBLER (Estados Unidos) o, en España, consulte
jugarbien.es.
