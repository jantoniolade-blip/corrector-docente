import type { Correccion, Examen } from './tipos'

/** Extrae el JSON de la respuesta de un asistente (admite texto alrededor y bloques ```json). */
export function extraerJson(texto: string): unknown {
  const bloque = texto.match(/```(?:json)?\s*([\s\S]*?)```/)
  const t = (bloque ? bloque[1] : texto).trim()
  const i = t.indexOf('{'), j = t.lastIndexOf('}')
  if (i < 0 || j < 0) throw new Error('No se ha encontrado ningún objeto JSON en el texto.')
  return JSON.parse(t.slice(i, j + 1))
}

/** Valida una corrección contra el examen. Devuelve la lista de problemas (vacía = válida). */
export function validarCorreccion(c: any, ex: Examen): string[] {
  const p: string[] = []
  if (!c || typeof c !== 'object') return ['La corrección no es un objeto JSON.']
  if (typeof c.codigo_estudiante !== 'string' || !c.codigo_estudiante) p.push('Falta codigo_estudiante.')
  if (c.examen_id !== ex.id) p.push(`examen_id «${c.examen_id}» no coincide con «${ex.id}».`)
  if (!Array.isArray(c.actividades)) return [...p, 'Falta la lista de actividades.']
  const esperadas = new Set(ex.actividades.map((a) => a.n)), vistas = new Set<number>()
  for (const a of c.actividades) {
    if (!esperadas.has(a.n)) { p.push(`Actividad ${a.n} no existe en el examen.`); continue }
    if (vistas.has(a.n)) p.push(`Actividad ${a.n} repetida.`)
    vistas.add(a.n)
    const max = ex.puntuacion_maxima_actividad
    if (typeof a.puntuacion !== 'number' || a.puntuacion < 0 || a.puntuacion > max)
      p.push(`Actividad ${a.n}: puntuación fuera de 0–${max}.`)
    else if (Math.abs(a.puntuacion * 4 - Math.round(a.puntuacion * 4)) > 1e-9)
      p.push(`Actividad ${a.n}: la puntuación no es múltiplo de 0,25.`)
    if (!['alta', 'media', 'baja'].includes(a.confianza)) p.push(`Actividad ${a.n}: confianza no válida.`)
    if (typeof a.justificacion !== 'string') p.push(`Actividad ${a.n}: falta la justificación.`)
  }
  for (const n of esperadas) if (!vistas.has(n)) p.push(`Falta la actividad ${n}.`)
  return p
}

export function normalizar(c: any): Correccion {
  return {
    ...c,
    actividades: [...c.actividades].sort((a: any, b: any) => a.n - b.n).map((a: any) => ({
      transcripcion: '', requiere_revision: false, ...a,
    })),
    feedback_global: c.feedback_global ?? '',
  }
}
