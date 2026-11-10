// Diagnóstico determinista a partir de las correcciones. No usa IA.
// Un examen es UNA evidencia: los niveles describen este examen, no al estudiante.
import type { Estudiante, Examen } from './tipos'
import { mediaRedondeada, notasPorCriterio, puntosVigentes } from './criterios'

export type Nivel = 'reforzar' | 'consolidar' | 'domina'
export const UMBRALES = { reforzar: 5, domina: 8 }           // sobre 10: <5 reforzar, 5–<8 consolidar, ≥8 domina
export function nivel(p: number, max = 10): Nivel {
  const x = (p / max) * 10
  return x < UMBRALES.reforzar ? 'reforzar' : x < UMBRALES.domina ? 'consolidar' : 'domina'
}

export interface FilaActividad {
  n: number; contenido: string; corregidos: number; media: number | null
  reforzar: string[]; consolidar: string[]; domina: string[]
  errores: Record<string, number>
}
export interface Diagnostico {
  corregidos: number
  actividades: FilaActividad[]
  criterios: Record<string, number | null>      // media del grupo por criterio
  ampliacion: string[]                           // todos los criterios ≥ 9
  prioridades: FilaActividad[]                   // actividades ordenadas por necesidad de refuerzo
}

export function diagnosticar(ex: Examen, estudiantes: Estudiante[]): Diagnostico {
  const con = estudiantes.filter((e) => e.correccion), max = ex.puntuacion_maxima_actividad
  const actividades = ex.actividades.map((a): FilaActividad => {
    const f: FilaActividad = { n: a.n, contenido: a.contenido ?? `Actividad ${a.n}`, corregidos: 0, media: null, reforzar: [], consolidar: [], domina: [], errores: {} }
    const pts: number[] = []
    for (const e of con) {
      const p = puntosVigentes(e)[a.n]; if (p === undefined) continue
      pts.push(p); f[nivel(p, max)].push(e.codigo)
      for (const err of e.correccion!.actividades.find((k) => k.n === a.n)?.errores ?? []) f.errores[err.tipo] = (f.errores[err.tipo] ?? 0) + 1
    }
    f.corregidos = pts.length; f.media = pts.length ? mediaRedondeada(pts) : null
    return f
  })
  const criterios: Record<string, number | null> = {}
  for (const c of Object.keys(ex.criterios)) {
    const v = con.map((e) => notasPorCriterio(puntosVigentes(e), ex.criterios)[c]).filter((x): x is number => x !== null)
    criterios[c] = v.length ? mediaRedondeada(v) : null
  }
  const ampliacion = con.filter((e) => Object.values(notasPorCriterio(puntosVigentes(e), ex.criterios)).every((x) => x !== null && x >= 9)).map((e) => e.codigo)
  const prioridades = actividades.filter((f) => f.reforzar.length + f.consolidar.length > 0)
    .sort((a, b) => b.reforzar.length - a.reforzar.length || b.consolidar.length - a.consolidar.length || (a.media ?? 0) - (b.media ?? 0))
  return { corregidos: con.length, actividades, criterios, ampliacion, prioridades }
}

/** Perfil de un estudiante en este examen: qué domina, qué consolidar y qué reforzar. */
export function perfil(ex: Examen, e: Estudiante): Record<Nivel, { n: number; contenido: string }[]> {
  const out: Record<Nivel, { n: number; contenido: string }[]> = { reforzar: [], consolidar: [], domina: [] }
  const p = puntosVigentes(e)
  for (const a of ex.actividades) if (p[a.n] !== undefined) out[nivel(p[a.n]!, ex.puntuacion_maxima_actividad)].push({ n: a.n, contenido: a.contenido ?? `Actividad ${a.n}` })
  return out
}
