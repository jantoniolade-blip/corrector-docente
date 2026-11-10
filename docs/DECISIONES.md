# Registro de decisiones

| Nº | Fecha | Decisión | Motivo |
|---|---|---|---|
| 1 | 2026-11-10 | PWA única en TypeScript/React | Un solo código para móvil, tableta, ordenador y pizarra |
| 2 | 2026-11-10 | La IA propone puntuaciones; el cálculo por criterios es código con pruebas | Notas verificables y reproducibles |
| 3 | 2026-11-10 | Formato de corrección único (`esquema_correccion.json`) para cualquier proveedor | Independencia de proveedor; modo asistente y API comparten formato |
| 4 | 2026-11-10 | La propuesta de la IA nunca se sobrescribe; la revisión docente se guarda aparte | Trazabilidad de qué cambió el profesor |
| 5 | 2026-11-10 | v0.1 guarda en el dispositivo (IndexedDB) tras la interfaz `almacen.ts` | 0 € y sin datos personales en la nube; PostgreSQL se conecta detrás de la misma interfaz |
| 6 | 2026-11-10 | PDF corregido: página original intacta con márgenes añadidos + hoja de informe | Nunca se tapa lo escrito por el estudiante |
| 7 | 2026-11-10 | Decisiones docentes como datos del examen (`decisiones_docentes`) | Se aplican de forma uniforme y revisable, solo a ese examen |
| 8 | 2026-11-10 | Seudonimización antes de enviar a una IA; identidades solo en local | Minimización de datos |
| 9 | 2026-11-10 | El profesor valida como referencia la corrección previa de 5 exámenes y el baremo «Método de calificación» | Base de comparación de la Fase 1 |
| 10 | 2026-11-10 | D1: en la actividad 7, razonamiento correcto de la elección = puntos completos de la elección | Decisión del profesor |
| 11 | 2026-11-10 | El código se guarda en una rama del repositorio público, sin datos de alumnado | El repositorio publica en la web todo lo que llega a `main` |
| 12 | 2026-11-10 | Diagnóstico determinista con umbrales <5 reforzar, 5–8 consolidar, ≥8 domina; ampliación con todos los criterios ≥9 | Transparente y ajustable; un examen es una sola evidencia |
| 13 | 2026-11-10 | La copia seudonimizada se genera como imagen | Elimina texto oculto y metadatos del original |

## Pendiente (por orden)
1. Corregir los cinco exámenes con ChatGPT y con Claude en conversaciones nuevas e importar los JSON: es la medida real de la Fase 1.
3. Agrupación automática de páginas escaneadas por estudiante.
4. Adaptadores de API (OpenAI, Anthropic) con estimación y tope de gasto.
5. Sincronización entre dispositivos (PostgreSQL) y copia en Drive.
6. Propuestas de actividades de refuerzo a partir del diagnóstico y de la biblioteca de recursos (incluidos los juegos).
7. Alojamiento de la aplicación.
