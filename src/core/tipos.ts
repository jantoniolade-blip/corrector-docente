// Modelo de datos del corrector. Independiente de la interfaz y del proveedor de IA.
export interface Actividad { n: number; enunciado: string; solucion: string; baremo?: string; contenido?: string }
export interface DecisionDocente { id: string; actividad?: number; fecha?: string; regla: string }
export interface Examen {
  id: string; titulo: string; version?: string
  puntuacion_maxima_actividad: number
  criterios: Record<string, number[]>           // criterio -> actividades asociadas
  actividades: Actividad[]
  baremo_general?: string[]
  decisiones_docentes?: DecisionDocente[]
}
export type Confianza = 'alta' | 'media' | 'baja'
export interface ErrorDetectado { tipo: string; descripcion: string; contenido?: string }
export interface ActividadCorregida {
  n: number; pagina?: number | null
  transcripcion: string; puntuacion: number; justificacion: string
  aciertos?: string; errores?: ErrorDetectado[]; metodo_alternativo?: boolean
  confianza: Confianza; requiere_revision: boolean; motivo_revision?: string
}
export interface Correccion {
  codigo_estudiante: string; examen_id: string; modelo_ia: string
  actividades: ActividadCorregida[]
  feedback_global: string
  propuestas_mejora?: { dificultad?: string; tipo_actividad?: string; descripcion?: string }[]
}
/** Lo que decide el docente sobre cada actividad. La propuesta de la IA nunca se sobrescribe. */
export interface RevisionActividad { puntuacion: number; comentario: string; revisada: boolean }
export interface Estudiante {
  codigo: string
  nombre?: string                                // solo en el dispositivo del docente
  pdf?: Blob                                     // examen original
  correccion?: Correccion                        // propuesta de la IA
  revision: Record<number, RevisionActividad>    // decisión docente
  feedback?: string
  aprobado: boolean
}
