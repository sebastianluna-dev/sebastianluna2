# Sebastian Luna: lo que Blue sabe

Fuentes: el CV de Sebastian, los casos de estudio de este portafolio y los textos de su portafolio anterior. Lo que no aparece aquí, Blue no lo sabe.

## Quién es

- **Sebastian Luna Rodríguez**, Senior Frontend Developer, en Boca del Río, Veracruz, México.
- Desarrollador frontend senior, diseñador de interfaces y entrenador de ajedrez, con seis años de experiencia profesional como desarrollador web y especialidad en frontend con React, Next.js y TypeScript.
- Convierte necesidades de negocio en productos: diseña la interfaz, escribe el código y lo lleva a producción, en salud, educación, música y turismo. Combina arquitectura frontend, diseño de interfaces y conocimiento de backend.
- Ha asumido la responsabilidad técnica del frontend en equipos pequeños y ha colaborado a diario, en inglés, con equipos internacionales.
- Se ha especializado en desarrollo asistido por IA con herramientas como Claude Code, bajo su propia dirección técnica: él define el producto y las decisiones de arquitectura.
- Su interés por la tecnología empezó de niño con los videojuegos; en 2019 empezó a aprender programación por su cuenta con cursos en línea.
- Lo que más disfruta de un proyecto empieza en la conversación con el cliente: conocer su negocio, entender qué necesita e imaginar cómo llevarlo a una interfaz.
- Busca un equipo con curiosidad compartida: personas con distintas experiencias, dispuestas a enseñar, aprender y apoyarse, donde cada quien aporte desde lo que sabe y tome la iniciativa cuando haga falta.
- **Disponibilidad**: Blue no conoce su disponibilidad actual, la modalidad que busca (tiempo completo, contrato o freelance), su zona horaria ni desde cuándo podría incorporarse. Para hablar de una vacante, lo mejor es escribirle por email.
- **Idiomas**: español nativo; inglés C1 Advanced (certificado EF SET, febrero de 2023).
- **Formación**: Ingeniería en Gestión Empresarial y Finanzas, Universidad de Oriente (2020–2024); Bootcamp de Desarrollo Web, Coderhouse (2022–2023).

## Experiencia

### 365 Días de Ajedrez · fundador y desarrollador · desde enero de 2026 (según su CV)

Su proyecto propio: creó la academia y su plataforma. La plataforma que describe el caso la construyó en unos tres meses. Caso completo más abajo.

### Page Consulting, consultor asignado a AstraZeneca · Frontend Developer · junio de 2023 a enero de 2026

- Equipo internacional de más de 30 profesionales de India, Japón, Estados Unidos y Reino Unido, con Scrum.
- Participó en la definición, el diseño y el desarrollo del frontend de «Comms App», una aplicación que estandarizó los comunicados de incidentes por correo y su seguimiento hasta la resolución.
- Implementó el tag de Tealium en varios sitios para medir el comportamiento de los usuarios y configuró las audiencias que alimentaban las campañas publicitarias.
- Formó parte del equipo de soporte de unos 500 sitios corporativos internacionales: liberaciones y bajas de sitios, redirecciones en la configuración de Apache versionada en Bitbucket, configuración de SSH y monitorización con Catchpoint (avisos de fallos y pruebas de vulnerabilidades).

### Mellow · Frontend Developer · agosto de 2021 a junio de 2023

Fue el desarrollador frontend de Mellow, la empresa detrás de Reto MD (caso más abajo), y tomó las decisiones de frontend de sus productos con backend, diseño y producto. Además de Reto MD:

- Diseñó la interfaz y desarrolló el frontend del backoffice de la Sociedad Mexicana de Oftalmología: aspirantes, especialistas, documentación, pagos, contenidos institucionales y acceso a eventos. Construyó el registro de nuevos miembros en seis pasos, con navegación para corregir pasos anteriores y recuperación del progreso desde localStorage, cuidando legibilidad, contraste e instrucciones claras porque muchos usuarios eran adultos mayores.
- Desarrolló landing pages para empresas farmacéuticas y otros colaboradores de Mellow; la más reciente, el sitio de Neo-Melubrina®, con una calculadora médica.

### Proficient Systems · Frontend Developer · enero de 2020 a agosto de 2021

Equipo de cinco desarrolladores en una consultora de software, con clientes de distintos sectores. Entró como practicante junior.

- Tiendas de Shopify con Liquid, HTML, CSS, Sass y JavaScript, y aplicaciones con Node.js y Express sobre las APIs GraphQL y REST de Shopify; entre ellas, la facturación automática de cada compra para un cliente de Uruguay.
- Diseñó y desarrolló de principio a fin la plataforma inmobiliaria Ocho Seis Uno: entrevistas con el cliente, alcance, diseño en Figma, base de datos con Prisma y PostgreSQL, y la aplicación con Next.js y Docker. Incluía propiedades, rentas, pagos, ingresos y gastos, facturación automática con la API de Facturama, un panel de análisis con Chart.js y un sitio público configurable desde el panel.
- El sitio de una operadora de tours en barco en Puerto Vallarta (caso Vallarta TOURS, más abajo).

## Tecnologías

- **Principales**: React, Next.js, TypeScript, JavaScript, HTML, CSS, Tailwind CSS, Sass, CSS Modules, shadcn/ui, Radix UI, Material UI, Bootstrap, Framer Motion, React Router, Chart.js · TanStack Query, Zustand, Formik, Zod, Axios, REST, GraphQL · Node.js, Express, Prisma, PostgreSQL, SQL, Firebase, Payload CMS, Shopify y Liquid, Tealium, SnapLogic · Vitest, Jest, Storybook, Lighthouse, Figma · Git, GitHub, Bitbucket, Vite, Vercel, Jenkins, Apache, ESLint, Prettier.
- **Conocimiento adicional** (proyectos personales y cursos): MongoDB, WebSockets (Socket.IO), Strapi, GitLab, Less, Redux, React Hook Form.

## Los cuatro proyectos del portafolio

Cada caso tiene seis secciones con ancla: `overview` (resumen), `challenge` (reto), `approach` (enfoque), `research` (investigación), `design` (soluciones de diseño) y `outcome` (resultado). El listado de trabajos está en [/#works](/#works).

### 365 Días de Ajedrez · proyecto propio · 2026

- **Rol**: fundador; producto, arquitectura, diseño y código, como única persona en el proyecto. Sitio: https://www.365diasdeajedrez.com
- **Qué es**: la plataforma de su academia de ajedrez en línea, donde se enseña, se estudia y se entrena: cursos, clases con profesor, ejercicios, estudios de partidas, un explorador de aperturas con más de 4 millones de partidas (responde en unos 25 ms por jugada) y un modo aventura para jugar contra la computadora. El sitio de la academia está en línea, pero todavía muestra su versión anterior; la plataforma está construida y probada en desarrollo, pendiente de liberar, así que lo que describe el caso (ejercicios, aventura, administración y el sitio nuevo) solo se ve en las capturas del caso.
- **El problema**: el material de cada alumno vivía en WhatsApp, los pagos y asistencias en una hoja de cálculo y la práctica en Lichess. El progreso tenía que ser confiable: una racha que se infla recargando la página hace que el profesor decida con datos falsos. Y tenía que servir a una academia, un club, una escuela o un profesor independiente sin que nadie vea lo que no le toca.
- **Lo más fuerte**:
  - Todo cuelga de una organización (un profesor independiente es una organización de una persona), así que una sola Administración sirve a todos, con permisos resueltos en un solo lugar.
  - Decisiones por escrito antes de dibujar: 40 decisiones de producto para los ejercicios antes de escribir código y 11 durante la construcción.
  - Ejercicios: más de 30,000, importados de la base pública de Lichess con un filtro estricto (pasó uno de cada 200), en 6 niveles y 32 temas. Un intento puntuado por ejercicio y por día, la primera jugada equivocada decide y «Ver la solución» cuenta como fallo; el servidor arbitra las reglas.
  - Modo aventura de papel recortado: doce rivales en seis zonas, que toman prestada la fuerza de los 45 bots que ya tenía «Jugar» (de 412 a 2798 de Elo, calibrados con más de 6,500 partidas contra Stockfish).
  - Sistema de diseño: 177 tokens, 144 de ellos colores con par claro y oscuro; las pruebas exigen que todo texto llegue a 4.5:1 de contraste sobre su fondo en los dos temas, y vigilan otras reglas visuales.
  - Resultado: 111 pantallas para cinco roles (alumno, profesor, editor de contenido, administración y operador de la plataforma), sobre 104 modelos de datos, en escritorio, tableta y teléfono, con tema claro y oscuro; más de 2,300 pruebas automáticas, 192 archivos de historias de Storybook que pasan axe en los dos temas y más de 400 páginas de documentación técnica. La simulación de tres meses usa **548 alumnos simulados** (no reales) en 19 organizaciones, con unas 4,200 clases y más de 1,100 pagos.
  - Trabajó con Claude Code como equipo de construcción, bajo reglas que él escribió y que vigilan las pruebas.
  - El CV en PDF describe una etapa anterior del proyecto (menciona Payload CMS para el sitio público y 338 pruebas unitarias); las cifras de este caso son más recientes.
- **Herramientas**: Next.js, React, TypeScript, PostgreSQL, Prisma, Material Web, Chessground, chessops, Stockfish, LiveKit, Storybook, Vitest, Vercel.
- **Enlaces**: [resumen](/works/365-dias-de-ajedrez#overview) · [reto](/works/365-dias-de-ajedrez#challenge) · [enfoque](/works/365-dias-de-ajedrez#approach) · [investigación](/works/365-dias-de-ajedrez#research) · [soluciones de diseño](/works/365-dias-de-ajedrez#design) · [resultado](/works/365-dias-de-ajedrez#outcome)

### Cuarteto Fratres · sitio de un cuarteto de cuerdas · 2026

- **Rol**: diseñador y desarrollador; producto, diseño, desarrollo, modelado del CMS y despliegue. Sitio: https://cuartetofratres.com
- **Qué es**: el sitio de un cuarteto de cuerdas de Boca del Río, Veracruz, para presentar su propuesta musical y facilitar contrataciones para conciertos, bodas y eventos privados. Una sola página: próximas fechas, presentación, los cuatro músicos, repertorio con reproductor y formulario de contacto.
- **Lo más fuerte**:
  - Payload CMS dentro de la misma aplicación de Next.js (en /admin, sobre PostgreSQL): el grupo publica fechas, ajusta su repertorio y atiende solicitudes sin tocar código. Cada sección pide sus datos a un servicio con contenido de respaldo, así que la página nunca queda en blanco.
  - Un reproductor dibujado como partitura: la barra de progreso es un pentagrama cuyas notas se encienden al avanzar, accesible con teclado; un minirreproductor fijo aparece si la tarjeta sale de pantalla. Aún no hay grabaciones: simula la reproducción con la duración de cada obra.
  - El formulario se envía a una server action, funciona antes de que cargue el JavaScript, y cada solicitud se guarda en el CMS con su estado.
  - Al guardar en el CMS, el cambio se ve en la siguiente visita; integración continua con estilo, tipos, pruebas y compilación en cada push.
- **Herramientas**: Figma, Next.js, React, TypeScript, Payload CMS, PostgreSQL, Vercel Blob, Vitest, Vercel.
- **Enlaces**: [resumen](/works/cuarteto-fratres#overview) · [reto](/works/cuarteto-fratres#challenge) · [enfoque](/works/cuarteto-fratres#approach) · [investigación](/works/cuarteto-fratres#research) · [soluciones de diseño](/works/cuarteto-fratres#design) · [resultado](/works/cuarteto-fratres#outcome)

### Reto MD · red de sitios médicos · 2021–2023

- **Rol**: desarrollador frontend en Mellow; escribió todo el código de la presencia web de Reto MD. El diseño visual es del equipo de diseño de Mellow. Sitio: https://retomd.com (el sitio actual puede incluir cambios posteriores a su salida en junio de 2023).
- **Qué es**: Reto MD es una app que prepara a médicos mexicanos para el ENARM, el examen nacional de residencias médicas. Sebastian construyó su sitio corporativo (blog, bolsa de trabajo, eventos, webinars, podcasts, información de la app y del ENARM, «Nosotros») y la red de sitios por especialidad de la marca Reto.
- **Lo más fuerte**:
  - Primero desarrolló los sitios de Reto Dermatología, Reto Cardiología y Reto Oftalmología, cada uno en su propio repositorio.
  - Unificó los repositorios de las especialidades en una aplicación multi-tenant con el App Router de Next.js: una interfaz de configuración en TypeScript donde cada marca declara sus colores, sus páginas y secciones visibles y su lenguaje de marca, con internacionalización con next-intl.
  - Un único repositorio genera seis despliegues independientes en Vercel (Cardiología, Dermatología, Oftalmología, Pediatría, Psiquiatría y Nefrología); con el contenido listo, una marca nueva se ponía en producción en aproximadamente una hora.
  - Blog con generación estática de Next.js en lugar de consultar la API en cada visita, TanStack Query para cachear listados con filtros y optimización con los reportes de Lighthouse.
  - Autenticación híbrida entre Firebase y la API de la plataforma, validación de formularios estandarizada con Zod y la migración del Pages Router al App Router con Next.js 14.
- **Herramientas**: Next.js, React, TypeScript, Tailwind CSS, TanStack Query, NextAuth, Firebase, next-intl, Zod, Vercel.
- **Enlaces**: [resumen](/works/reto-md#overview) · [reto](/works/reto-md#challenge) · [enfoque](/works/reto-md#approach) · [investigación](/works/reto-md#research) · [soluciones de diseño](/works/reto-md#design) · [resultado](/works/reto-md#outcome)

### Vallarta TOURS · turismo, tours en barco · 2020–2021 y 2025

- **Rol**: diseñador y desarrollador. Sitio de muestra: https://vallartatours.vercel.app
- **Qué es**: Vallarta TOURS es una **marca ficticia**: la usa para presentar el sitio que diseñó y desarrolló en Proficient Systems para una operadora de tours en barco en Puerto Vallarta. El sitio original estuvo en línea y se dio de baja. En el original hizo la investigación con el cliente, wireframes y diseños de alta fidelidad en Figma, participó en el lenguaje del sitio y la experiencia, y construyó el frontend con reservas, pagos y disponibilidad integrados mediante Shopify. En 2025 lo reconstruyó como **sitio de muestra**: sus precios, reseñas, datos de contacto y textos legales son de relleno.
- **Lo más fuerte** (la reconstrucción de 2025):
  - Cinco salidas en Bahía de Banderas, cada una con su precio, duración, horarios, cupo por barco, muelle y temporada (las ballenas solo de diciembre a marzo; el charter privado se cotiza).
  - Bilingüe con next-intl y direcciones traducidas (`/servicios` es `/en/services`); el selector de idioma deja en la misma página.
  - La tarjeta de reserva suma el total, calcula el anticipo del 30 % y abre WhatsApp con el mensaje ya escrito en el idioma de quien visita.
  - Campos propios de fecha y personas con React Day Picker y Radix UI; 67 pruebas en 17 archivos e integración continua; todo se sirve estático desde Vercel.
- **Herramientas**: Figma, Next.js, React, TypeScript, next-intl, Radix UI, React Day Picker, Vitest, Vercel.
- **Enlaces**: [resumen](/works/vallarta-tours#overview) · [reto](/works/vallarta-tours#challenge) · [enfoque](/works/vallarta-tours#approach) · [investigación](/works/vallarta-tours#research) · [soluciones de diseño](/works/vallarta-tours#design) · [resultado](/works/vallarta-tours#outcome)

## Este portafolio

Está hecho con Astro y React, en español e inglés, y publicado en Vercel. Blue responde con un modelo de Claude a partir de esta información. Blue no tiene detalles sobre quién diseñó este sitio ni sobre cómo se hizo; para eso, escríbele a Sebastian.
