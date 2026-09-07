# Álgebra v2.3.1

Aplicación móvil PWA para resolver sistemas de ecuaciones de forma visual, con cálculos exactos, pasos matemáticos y funcionamiento sin conexión.

## Versión actual

**2.3.1** siguiendo el formato **MAJOR.MINOR.PATCH**:

- **MAJOR:** cambios grandes o incompatibles.
- **MINOR:** nuevas funciones importantes.
- **PATCH:** correcciones y mejoras menores.

## Novedades de v2.3.1

- Corrección crítica del inicio: la pantalla de bienvenida ya no puede bloquear la interfaz si falla una tarea secundaria.
- Recuperación segura ante datos dañados en el almacenamiento local.
- Nueva red de seguridad para retirar la pantalla de carga ante errores de JavaScript.
- Service Worker actualizado a v2.3.1 para evitar reutilizar recursos antiguos.

## Novedades heredadas de v2.3.0

- Rediseño completo orientado a dispositivos móviles.
- Navegación mediante pestañas: **Resolver, Historial, Herramientas y Ajustes**.
- Iconos SVG para una interfaz nítida en cualquier pantalla.
- Historial local de hasta 50 resoluciones.
- Selector de detalle: **Básico, Detallado y Completo**.
- Comprobación automática de la solución en las ecuaciones originales.
- Validación mientras se escriben las ecuaciones.
- Copiar y compartir la solución.
- Pantalla de inicio gradual con el nombre de la aplicación, versión y desarrollador.
- Conservación del modo Automático y Manual.
- Sistema de actualizaciones opcionales con descarga detallada.
- Modo Offline con progreso general, progreso individual y velocidad de descarga.

## Resolución

La aplicación soporta actualmente sistemas lineales **2×2** y **3×3** mediante:

- Adición
- Sustitución
- Gauss-Jordan
- Determinante
- Matriz inversa

Las operaciones usan **E1, E2 y E3** para identificar las ecuaciones y se acompañan de instrucciones claras y cálculos auxiliares.

Los resultados se muestran en formato exacto y decimal cuando corresponde:

`80/7 ≈ 11,428571`

## Actualizaciones

### Manual

Desde **Herramientas → Buscar actualización**, Álgebra consulta `version.json`. Si existe una versión superior, muestra una pantalla dedicada con las novedades. La descarga es opcional.

### Automática

Cuando hay conexión y esta opción está activada, Álgebra busca una versión nueva al abrirse y al recuperar la conexión. Nunca descarga una actualización sin intervención del usuario.

## Offline

La opción **Offline** descarga los recursos necesarios y muestra:

- Progreso general.
- Velocidad de descarga.
- Progreso individual de cada archivo.
- Tamaño descargado y tamaño total cuando el servidor proporciona esa información.

## Desarrollador

**Oscar Antonio Alvarez Collado**
