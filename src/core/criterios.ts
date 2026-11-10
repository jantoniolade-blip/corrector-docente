import type { Estudiante, Examen } from './tipos'

/** Media redondeada a 2 decimales (mitad hacia arriba) con aritmética entera. */
export function mediaRedondeada(puntos: number[]): number {
  const c = puntos.map((p) => Math.round(p * 100))          // centésimas exactas
  const suma = c.reduce((a, b) => a + b, 0)
  return Math.floor((2 * suma + c.length) / (2 * c.length)) / 100
}

/** Nota por criterio. null si falta alguna actividad asociada: no se cierra el criterio. */
export function notasPorCriterio(
  puntos: Record<number, number | undefined>, criterios: Examen['criterios'],
): Record<string, number | null> {
  const out: Record<string, number | null> = {}
  for (const [cr, acts] of Object.entries(criterios)) {
    const v = acts.map((a) => puntos[a])
    out[cr] = v.some((x) => x === undefined) ? null : mediaRedondeada(v as number[])
  }
  return out
}

/** Puntuaciones vigentes de un estudiante: la revisión docente manda sobre la propuesta. */
export function puntosVigentes(e: Estudiante): Record<number, number | undefined> {
  const out: Record<number, number | undefined> = {}
  for (const a of e.correccion?.actividades ?? []) out[a.n] = a.puntuacion
  for (const [n, r] of Object.entries(e.revision)) out[Number(n)] = r.puntuacion
  return out
}

export const formato = (x: number | null | undefined) =>
  x === null || x === undefined ? '—' : x.toFixed(2).replace('.', ',')

/** Orden de revisión: primero lo dudoso. */
export function prioridad(a: { requiere_revision: boolean; confianza: string }): number {
  return (a.requiere_revision ? 0 : 2) + (a.confianza === 'baja' ? 0 : a.confianza === 'media' ? 1 : 2)
}
