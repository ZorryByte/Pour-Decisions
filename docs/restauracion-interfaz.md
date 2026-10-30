# Recuperación de la interfaz original

La migración anterior reescribió las pantallas en Vue y cambió diseños,
interacciones y animaciones que debían conservarse. Se retiró esa implementación
de la aplicación activa y se recuperó el código anterior desde
`artifacts/antes-mvvm/`. La versión descartada se conserva en
`artifacts/migracion-vue-descartada/` para trazabilidad.

La única excepción visual autorizada es conservar el archivo actual de frutas:
`src/features/juego-trivia/views/arteFrutas.js`. El juego original lo utiliza para
sus iconos y adornos. El resto del juego no se reescribió.

## Cambios de integración

- El HTML visible vuelve a ser el original; solo cambian las rutas de recursos
  y el punto de entrada del empaquetador.
- Los cuatro CSS vuelven a ser los originales, sin la capa de ajustes de la
  migración Vue.
- `juego.js`, `perfil.js`, `preguntas.js`, `saludos.js`, insignias y datos se
  recuperaron del respaldo y se ubicaron bajo `/src`.
- El script inline anterior se extrae a `src/app/iniciarSistema.js`. Sus acciones
  y funciones permanecen; URL y clave pública se leen de `import.meta.env`.
- GSAP **3.15.0**, Interact **1.10.28** y canvas-confetti **1.9.4** se instalan como
  dependencias con las mismas versiones originales. Ya no dependen de un CDN
  para cargar y se incluyen al compilar.
- `/docs`, `/database` y sus montajes Docker conservan la organización anterior.

Después de recuperar la interfaz, se realizó la primera extracción del
[Modelo de cuenta](modelo-cuenta.md). `perfil.js` conserva sus pantallas y delega
las peticiones a ese Modelo. Su código deja de ser idéntico al respaldo en esa
parte; las comparaciones visuales y las pruebas de sus acciones siguen vigentes.

## Estado real de la arquitectura

El código está organizado por características y se ejecuta con Vite. **La
separación completa MVVM no está terminada.** Para recuperar la experiencia se
conservan temporalmente los adaptadores globales y la lógica DOM originales.
No se debe volver a sustituir esta interfaz por componentes genéricos ni afirmar
que mover archivos equivale a completar MVVM.

Cualquier extracción posterior de Modelos o ViewModels debe conservar la Vista,
los gestos, el foco, las animaciones y los datos. El respaldo es la referencia;
las pruebas de igualdad deben seguir pasando antes de activar cambios.

## Verificación

```powershell
npm test
npm run test:browser
npm run build
npm run dev
```

- Pruebas originales de las 48 preguntas, sus 128 reacciones, 81 insignias y 105
  frases de alcohol, además del diálogo sincronizado del vaso.
- Pruebas de igualdad del código restaurado frente al respaldo, con las únicas
  excepciones de integración descritas arriba.
- Comparación de nueve pantallas (bienvenida, alcohol, frutas, estilos,
  intensidad, alergias, preguntas, resultado y perfil) a 1440, 768 y 390 px.
  El test exige igualdad de texto y de los PNG, además de comprobar animación
  real del vaso con movimiento habilitado.
- Recorrido del perfil con API local simulada: OTP, guardados, reintentos,
  favoritos, avatar, restricciones, recarga, renovación y cierre de sesión.

Las capturas comparativas están en `artifacts/restauracion/`. Las pruebas de
navegador usan el helper CDP ya incluido en el proyecto y requieren Chromium,
Chrome o Edge. Ninguna de estas pruebas envía correos ni escribe en Supabase real.

Para Docker con un volumen de dependencias creado anteriormente:

```powershell
docker compose build app
docker compose run --rm --no-deps app npm ci
docker compose up -d
```

La base local y los archivos SQL no se reinicializan ni se modifican por esta
recuperación.
