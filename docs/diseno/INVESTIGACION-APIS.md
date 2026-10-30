# Qué APIs necesita ¿Qué tomamos?

Investigación del 29 de octubre de 2026, aplicada al perfil y al problema de elegir cócteles para un grupo.

## Decisión

La prioridad es poner en funcionamiento el perfil privado y su acceso por correo. El avatar de personalidad no necesita una API de imágenes: reutiliza los vasos, caras y colores del propio proyecto. Guardar un identificador de receta y de personalidad permite reproducir el mismo avatar en cualquier sesión autenticada, sin subir fotografías ni generar imágenes de nuevo.

Para recomendar recetas y planificar una carta, conviene primero estructurar y revisar el catálogo propio. Una API que trae más cócteles aporta contenido, pero no conoce las preferencias de los invitados, sus restricciones ni las cantidades que va a preparar quien organiza.

## Comparación aplicada

| Necesidad | Solución | Aporte | Prioridad |
|---|---|---|---|
| Cuenta, guardados, gustos y avatar | Supabase Auth + Data API + RLS, ya preparados en el código. | Persistencia privada por persona, accesible desde distintas sesiones. | Necesaria para activar lo implementado. |
| Códigos de acceso por correo | SMTP de producción conectado a Supabase Auth. | Entrega a invitados reales, no solo al equipo del proyecto. | Necesaria para publicar el acceso por correo. |
| Foto de perfil del personaje | SVG propio + receta y personalidad guardadas. | Conserva la cara original y el color del elemento; carga sin consultar un generador de imágenes. | Implementada; no necesita un servicio adicional. |
| Más recetas y fotografías reales | TheCocktailDB como fuente editorial opcional. | Búsqueda por nombre, ingrediente, identificador y recetas aleatorias. | Después de revisar cobertura y calidad del catálogo actual. |
| Recomendación personalizada | Lógica propia; eventualmente función de base de datos o servicio del proyecto. | Prioriza gustos, reacciones y opciones compatibles. | Mejorar datos y reglas antes de contratar otra API. |
| Carta para todos y compras | Función propia sobre recetas normalizadas y elecciones del evento. | Cobertura del grupo, ingredientes compartidos y cantidades por porción. | Siguiente fase funcional; una API externa no la resuelve automáticamente. |
| Cambios inmediatos del evento | Supabase Realtime, si existe un panel que necesite actualizarse en vivo. | Nuevas respuestas sin recargar. | Opcional; no es necesario para mostrar el avatar ni consultar el perfil. |
| Subida de fotografías personales | Almacenamiento de archivos, por ejemplo Supabase Storage. | Tendría sentido si se permite subir fotos en otra fase. | Fuera del alcance actual: el usuario eligió el personaje como foto. |
| Pedir cambios en lenguaje natural | Una API de IA podría traducir texto a filtros verificados. | Comodidad para peticiones como «más fresco y menos dulce». | Opcional, posterior a tener datos y evaluación; no se necesita para el flujo actual. |

Estas prioridades son recomendaciones de diseño para este proyecto, no garantías de mejora medidas.

## Lo necesario ahora: acceso y correo

Supabase documenta que el SMTP incluido se destina a pruebas, restringe los destinatarios a direcciones autorizadas y no está pensado para producción. Para que los invitados reciban códigos hay que configurar un proveedor SMTP, remitente y dominio, además de las plantillas con el código. Supabase enumera Resend, Amazon SES, Postmark, SendGrid y otros proveedores compatibles; no hay una elección universal sin conocer volumen y dominio. [Documentación oficial de SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

El correo lo envía Supabase Auth a través de ese proveedor. No hace falta añadir simultáneamente una segunda API de envío desde el navegador. Las credenciales SMTP se configuran en el servicio; no se incluyen en JavaScript público.

Las filas privadas deben seguir vinculadas a `auth.uid()`. Los nombres usados para una fiesta no demuestran que alguien sea dueño de una cuenta. [RLS de Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Catálogo externo: TheCocktailDB

La documentación oficial ofrece búsqueda por nombre e ingrediente, consulta por ID y receta aleatoria. Documenta filtros de múltiples ingredientes y otras funciones como opciones Premium. La clave `1` es de prueba/desarrollo; no debe asumirse que sirve para cualquier lanzamiento público. La página del API y la FAQ describen de forma distinta el acceso de producción/comercial, por lo que se deben confirmar las condiciones para el despliegue concreto antes de publicarlo. [API](https://www.thecocktaildb.com/api.php), [FAQ](https://www.thecocktaildb.com/faq.php).

Uso recomendado si se incorpora: importar propuestas a una zona de revisión, conservar el ID de origen y su atribución, normalizar nombres y unidades, revisar la receta y aprobarla antes de incorporarla al catálogo jugable. Así un fallo de red no impide terminar de crear el cóctel.

Antes de usar sus fotografías, comprobar atribución y derechos de cada imagen. La página de condiciones servida por TheCocktailDB se titula TheMealDB; no asumir por ello que todas las condiciones específicas de TheCocktailDB están resueltas. [Condiciones enlazadas por el proveedor](https://www.thecocktaildb.com/terms_of_use.php).

No usar la ausencia de una palabra en una receta externa como certificación de ausencia de alérgenos. Tampoco puede sustituir la comprobación de marcas, etiquetas y preparación.

## Qué aporta una API propia

Una API propia es la interfaz de nuestras reglas y datos, no necesariamente otro proveedor. Supabase permite exponer funciones de PostgreSQL. Recomienda `security invoker` como punto de partida y controlar permisos de ejecución. [Funciones de base de datos](https://supabase.com/docs/guides/database/functions).

Una futura función de carta podría recibir el evento y restricciones de preparación, y devolver recetas propuestas, invitados con opción y casos sin resolver. Necesitaría autorización del organizador y una definición explícita de «tiene una opción», sin exponer perfiles privados completos.

Para compras se necesitan cantidades y unidades normalizadas, rendimiento por receta, porciones previstas y existencias. Para restricciones se necesitan ingredientes y alérgenos revisados. Estas son dependencias de datos que una nueva API no elimina.

## Qué queda preparado y qué se activó

Se refinó el perfil local y se añadió la persistencia del favorito/avatar al esquema de Supabase. No se contrataron servicios, no se descargó un catálogo nuevo ni se enviaron correos reales. El proyecto sigue sin URL ni clave pública configuradas en el checkout revisado.

No se añadieron Realtime, Storage ni una API de IA, porque no son dependencias del avatar solicitado. [Realtime](https://supabase.com/docs/guides/realtime/subscribing-to-database-changes) y [Storage para imágenes](https://supabase.com/docs/guides/storage/serving/image-transformations) quedan como capacidades opcionales para necesidades futuras.
