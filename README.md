# Álgebra v2.2.0

PWA móvil para resolver sistemas de ecuaciones con fracciones exactas, resultados decimales y procedimientos matemáticos visuales.

## Versión

Álgebra utiliza **Semantic Versioning**:

`MAJOR.MINOR.PATCH`

- **MAJOR**: cambios grandes o incompatibles.
- **MINOR**: nuevas funciones compatibles.
- **PATCH**: correcciones y mejoras menores.

La versión instalada se declara en `version.json` y debe actualizarse junto con `README.md`, `manifest.json`, `sw.js` y cualquier pantalla que muestre el número de versión.

## Actualizaciones

### Comprobación manual

El botón **Buscar actualización** consulta `version.json` usando la red. Si la versión remota es superior, la aplicación obtiene `update-manifest.json` y abre una pantalla dedicada con:

- Número de la nueva versión.
- Fecha de publicación.
- Lista de novedades.
- Opción de descargar o posponer la actualización.

La descarga es completamente opcional.

### Descarga de una actualización

Cuando el usuario decide descargarla, la pantalla muestra:

- Barra de progreso general.
- Porcentaje total.
- Velocidad de descarga en tiempo real.
- Progreso circular para cada archivo.
- Tamaño descargado y tamaño total cuando el servidor lo proporciona.

Los archivos se almacenan primero en una caché independiente. Al terminar, el usuario puede elegir **Aplicar y reiniciar**. El Service Worker marca esa caché como la versión activa y, después de reiniciar la aplicación, sirve los archivos descargados.

> Para publicar una actualización real, el servidor debe contener los archivos nuevos y un `version.json` con una versión superior a la instalada. `update-manifest.json` debe enumerar exactamente los archivos de esa versión.

### Comprobación automática

Si la opción **Actualización automática** está activada y existe conexión Wi-Fi o datos móviles, la aplicación comprueba si hay una versión superior. Si existe, muestra un recordatorio; la descarga sigue siendo opcional.

## Modo Offline

El botón **Offline** descarga los archivos necesarios para el funcionamiento sin conexión. Incluye:

- Barra de progreso general.
- Velocidad de descarga.
- Progreso individual por archivo.
- Tamaño de los archivos.

## Modos de resolución

### Automático

Analiza las ecuaciones escritas y detecta si corresponden a un sistema `2×2` o `3×3`.

### Manual

Permite seleccionar directamente el tamaño del sistema.

## Resultados

Cuando es posible, Álgebra muestra simultáneamente el resultado exacto y su aproximación decimal.

Ejemplo:

`y = 80/7 ≈ 11,428571`

La interfaz matemática renderiza las divisiones como fracciones visuales para evitar ambigüedades con el carácter `/`.

## Historial de versiones

### v2.2.0

- Nueva pantalla dedicada para actualizaciones disponibles.
- Descarga opcional de los archivos de una nueva versión.
- Progreso general e individual durante la actualización.
- Velocidad de descarga y tamaños de archivo.
- Botón **Aplicar y reiniciar** después de completar la descarga.
- Sistema de caché para activar una versión descargada.
- README sincronizado y ampliado con el sistema de versiones y actualizaciones.

### v2.1.2

- Más pasos lógicos y cálculos auxiliares.
- Mejor presentación de fracciones.
- Corrección de la interacción al volver desde otra aplicación.

### v2.1.1

- Pantalla de inicio con firma del desarrollador.
- Transiciones graduales al iniciar la aplicación.

### v2.1.0

- Resultado exacto y decimal.
- Detección automática o selección manual.
- Animación progresiva de generación.
- Vibración háptica opcional.
- Diseño optimizado para móviles.
- Modo Offline con progreso.
- Comprobación manual y automática de actualizaciones.

## Estructura principal

```text
sistema-pwa/
├── index.html
├── README.md
├── version.json
├── update-manifest.json
├── offline-manifest.json
├── sw.js
├── css/
├── js/
├── src/
└── icons/
```
