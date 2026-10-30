# Estructura actual y estado de la arquitectura

Se recuperó la interfaz original para conservar diseño, comportamiento y
animaciones. El código activo se organiza por características bajo `/src`.
Los SQL siguen en `/database` y la documentación en `/docs`.

**La separación completa MVVM está pendiente.** Los archivos originales de Vista
conservan temporalmente la mezcla de estado y DOM y sus adaptadores globales.
La primera extracción está completada: el perfil delega autenticación y acceso
a datos en `auth-cuenta/models/cuentaModel.js`. La primera parte del ViewModel
ya concentra sesión, carga, datos cargados, errores y acceso/cierre de sesión.
También gestiona recetas pendientes, guardado, reintento y descarte.
También gestiona la elección, cambio y retirada del favorito/avatar.
También gestiona reacciones, motivos, historial y transferencia desde invitado.
También gestiona la edición de preferencias y las sugerencias de «Por descubrir».
También gestiona la retirada de recetas y la limpieza del avatar correspondiente.
Las acciones de cuenta están extraídas; permanecen los adaptadores de integración
en la Vista y la separación gradual del juego.
Las siguientes extracciones deben conservar las Vistas y pasar las pruebas de paridad.
La comprobación de restricciones del juego ya está en su dominio, conservando
el adaptador existente y todas sus reglas. También están extraídas las reglas de
recomendación, fuerza, coincidencias, porcentajes y desempates. Los datos principales
de partida ya están centralizados en una sola instancia; la navegación principal
entre etapas ya está en su ViewModel. Las demás acciones y la separación de etapas
siguen pendientes de extracción.
Las etapas de alcohol y frutas ya tienen su Vista y ViewModel; las demás conservan
su código actual hasta sus próximas extracciones.
La etapa de restricciones también tiene ahora su Vista y ViewModel: la inspección
VIP es un cambio funcional y visual autorizado, conectado al mismo estado y al
dominio compartido. Véase [inspeccion-vip.md](inspeccion-vip.md).
Los cálculos visuales del vaso están separados en `vaso/calculosVaso.js`; el
dibujo, los gestos y las animaciones permanecen en la Vista.

```text
src/
├── app/
│   └── iniciarSistema.js
├── assets/
│   └── fonts/
│       ├── familjen-grotesk-400.woff2
│       └── familjen-grotesk-600.woff2
├── features/
│   ├── auth-cuenta/
│   │   ├── domain/
│   │   │   ├── preferencias.js
│   │   │   └── reacciones.js
│   │   ├── models/
│   │   │   └── cuentaModel.js
│   │   ├── viewmodels/
│   │   │   └── cuentaViewModel.js
│   │   └── views/
│   │       ├── perfil.css
│   │       └── perfil.js
│   └── juego-trivia/
│       ├── etapas/
│       │   ├── alcohol/
│       │   │   ├── alcoholView.js
│       │   │   └── alcoholViewModel.js
│       │   └── frutas/
│       │       ├── frutasView.js
│       │       ├── frutasViewModel.js
│       │       └── frutasGestos.js
│       ├── partida/
│       │   ├── estadoPartida.js
│       │   ├── partidaViewModel.js
│       │   ├── recorridoPartida.js
│       │   ├── etapasPartida.js
│       │   └── persistenciaPartida.js
│       ├── domain/
│       │   ├── recomendarCocteles.js
│       │   └── restricciones.js
│       ├── data/
│       │   ├── cocteles.js
│       │   ├── frases-vaso.js
│       │   ├── preguntas-datos.js
│       │   └── voces.js
│       ├── models/
│       │   └── insignias.js
│       ├── vaso/
│       │   └── calculosVaso.js
│       └── views/
│           ├── arteFrutas.js
│           ├── juego.js
│           ├── preguntas.css
│           ├── preguntas.js
│           ├── saludos.js
│           └── vaso-dialogo.css
├── shared/
│   ├── infrastructure/
│   │   └── animaciones.js
│   └── styles/
│       └── base.css
└── main.js
```

`src/main.js` mantiene el orden de inicialización original. Los motores de
animación se cargan desde dependencias locales con sus versiones originales.
`src/app/iniciarSistema.js` contiene el script antes inline y delega la comprobación
de incompatibilidades y las reglas de recomendación a sus módulos de dominio.

Las excepciones visuales autorizadas incluyen el archivo actual `arteFrutas.js`
y la nueva etapa de inspección VIP de restricciones.
Las ubicaciones finales de Modelos, ViewModels y dominio se completarán mediante
extracciones pequeñas verificadas contra los originales.

Consulta [restauracion-interfaz.md](restauracion-interfaz.md) para el alcance de
la recuperación y las verificaciones visuales y funcionales.
La primera extracción está descrita en [modelo-cuenta.md](modelo-cuenta.md).
La extracción de sesión y carga está en [viewmodel-cuenta.md](viewmodel-cuenta.md).
La primera extracción del juego está en [restricciones-juego.md](restricciones-juego.md).
Las reglas de recomendación están descritas en [recomendaciones-juego.md](recomendaciones-juego.md).
La extracción del vaso está descrita en [calculos-vaso.md](calculos-vaso.md).
El estado compartido está descrito en [estado-partida.md](estado-partida.md).
La navegación está descrita en [navegacion-partida.md](navegacion-partida.md).
La etapa de alcohol está descrita en [etapa-alcohol.md](etapa-alcohol.md).
La etapa de frutas está descrita en [etapa-frutas.md](etapa-frutas.md).

## Recorrido y contratos actuales

La navegación usa identificadores estables y una secuencia común para ambas vistas.
El formato de partida v4 conserva compatibilidad de lectura con las sesiones antiguas.
Las pruebas verifican comportamiento y límites de dependencia; la comparación histórica
permanece para recomendaciones, vaso y alcohol, sin congelar el texto de las vistas.
Véanse [navegación](navegacion-partida.md) y [persistencia](estado-partida.md).
