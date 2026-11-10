// Del diagnóstico a una propuesta de refuerzo. Determinista: empareja contenidos del examen
// con la biblioteca de recursos del docente. Nada se asigna ni se envía: solo se propone.
import type { Estudiante, Examen } from './tipos'
import { diagnosticar, type Nivel } from './diagnostico'

export type TipoRecurso = 'juego' | 'relacion' | 'ficha' | 'video' | 'interactivo' | 'cooperativa' | 'manipulativa' | 'proyecto' | 'cuestionario' | 'otro'
export interface Recurso {
  id: string; titulo: string; tipo: TipoRecurso; url?: string
  contenidos: string[]                      // palabras clave: «proporcionalidad inversa», «porcentajes»…
  nivel: Nivel | 'ampliar' | 'cualquiera'   // para qué necesidad sirve
  curso?: string; minutos?: number
}
export interface GrupoRefuerzo {
  actividad: number; contenido: string; nivel: 'reforzar' | 'consolidar'
  estudiantes: string[]; recursos: Recurso[]; errores: string[]
}
export interface Opciones { maxRecursosPorGrupo: number; minutosMaximos?: number; incluirConsolidar: boolean }
export const OPCIONES: Opciones = { maxRecursosPorGrupo: 2, incluirConsolidar: true }

const VACIAS = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'y', 'e', 'a', 'en', 'con', 'sin', 'por', 'para'])
export const palabras = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !VACIAS.has(w)).map((w) => w.replace(/(es|s)$/, ''))

/** Coincidencia entre un contenido del examen y un recurso: fracción de palabras clave del recurso presentes (0–1). */
export function afinidad(contenido: string, r: Recurso): number {
  const c = new Set(palabras(contenido)); let mejor = 0
  for (const clave of r.contenidos) {
    const p = palabras(clave); if (!p.length) continue
    mejor = Math.max(mejor, p.filter((w) => c.has(w)).length / p.length)
  }
  return mejor
}

export function buscarRecursos(contenido: string, nivel: Recurso['nivel'], biblioteca: Recurso[], o: Opciones = OPCIONES): Recurso[] {
  return biblioteca
    .filter((r) => (r.nivel === nivel || r.nivel === 'cualquiera') && (!o.minutosMaximos || !r.minutos || r.minutos <= o.minutosMaximos))
    .map((r) => ({ r, a: afinidad(contenido, r) })).filter((x) => x.a >= 0.99)
    .sort((x, y) => y.a - x.a || (x.r.minutos ?? 0) - (y.r.minutos ?? 0))
    .slice(0, o.maxRecursosPorGrupo).map((x) => x.r)
}

/** Grupos de estudiantes con la misma necesidad y los recursos de la biblioteca que les sirven. */
export function proponerRefuerzo(ex: Examen, estudiantes: Estudiante[], biblioteca: Recurso[], o: Opciones = OPCIONES): GrupoRefuerzo[] {
  const grupos: GrupoRefuerzo[] = []
  for (const f of diagnosticar(ex, estudiantes).prioridades) {
    for (const nivel of ['reforzar', 'consolidar'] as const) {
      if (nivel === 'consolidar' && !o.incluirConsolidar) continue
      const cods = f[nivel]; if (!cods.length) continue
      const errores = estudiantes.filter((e) => cods.includes(e.codigo))
        .map((e) => e.revision[f.n]?.comentario || e.correccion?.actividades.find((a) => a.n === f.n)?.justificacion || '').filter(Boolean)
      grupos.push({ actividad: f.n, contenido: f.contenido, nivel, estudiantes: cods, recursos: buscarRecursos(f.contenido, nivel, biblioteca, o), errores })
    }
  }
  return grupos
}

/** Qué recibiría cada estudiante. */
export function planPorEstudiante(grupos: GrupoRefuerzo[]): Record<string, { contenido: string; nivel: string; recursos: Recurso[] }[]> {
  const out: Record<string, { contenido: string; nivel: string; recursos: Recurso[] }[]> = {}
  for (const g of grupos) for (const c of g.estudiantes) (out[c] ??= []).push({ contenido: g.contenido, nivel: g.nivel, recursos: g.recursos })
  return out
}

/** Encargo para una IA cuando la biblioteca no tiene nada adecuado. No incluye nombres ni códigos. */
export function encargoParaIA(g: GrupoRefuerzo, ex: Examen, minutos = 20): string {
  const act = ex.actividades.find((a) => a.n === g.actividad)
  return [
    `Prepara una actividad de ${g.nivel === 'reforzar' ? 'refuerzo' : 'consolidación'} sobre «${g.contenido}» para ${g.estudiantes.length} estudiante(s) de ${ex.titulo}.`,
    `Duración máxima: ${minutos} minutos.`,
    act ? `Actividad del examen que originó la necesidad: ${act.enunciado}` : '',
    g.errores.length ? `Errores observados (anónimos):\n${[...new Set(g.errores)].map((e) => `- ${e}`).join('\n')}` : '',
    'No propongas solo más ejercicios escritos: elige el formato que mejor ataque estos errores (ejemplo resuelto con huecos, actividad manipulativa, reto por parejas, cuestionario con retroalimentación, pequeño juego…).',
    'Incluye: objetivo, material necesario, enunciado para el alumnado, solución comprobada y un criterio sencillo para saber si la dificultad se ha superado.',
  ].filter(Boolean).join('\n\n')
}

export function planCsv(grupos: GrupoRefuerzo[], nombre: (c: string) => string): string {
  const q = (t: string) => `"${t.replace(/"/g, '""')}"`
  const filas = [['Estudiante', 'Contenido', 'Necesidad', 'Recurso', 'Tipo', 'Enlace']]
  for (const [c, items] of Object.entries(planPorEstudiante(grupos))) for (const it of items) {
    if (!it.recursos.length) filas.push([nombre(c), it.contenido, it.nivel, '(pendiente de crear)', '', ''])
    for (const r of it.recursos) filas.push([nombre(c), it.contenido, it.nivel, r.titulo, r.tipo, r.url ?? ''])
  }
  return '﻿' + filas.map((f) => f.map(q).join(';')).join('\r\n')
}

/** Juegos ya publicados por el docente: punto de partida de la biblioteca. */
export const BIBLIOTECA_INICIAL: Recurso[] = [
  { id: 'factor-clash', titulo: 'Factor Clash · duelos de divisibilidad', tipo: 'juego', url: 'https://jcamjim584-star.github.io/pichu-lab/applets/expres/', contenidos: ['divisibilidad', 'múltiplos', 'divisores'], nivel: 'cualquiera', curso: '1.º ESO', minutos: 15 },
  { id: 'pizza-rush', titulo: 'Pizza Rush · fracciones', tipo: 'juego', url: 'https://jcamjim584-star.github.io/pichu-lab/applets/pizzeria/', contenidos: ['fracciones', 'fracciones equivalentes'], nivel: 'cualquiera', curso: '1.º ESO', minutos: 15 },
  { id: 'integer-ninja', titulo: 'Integer Ninja · números enteros', tipo: 'juego', url: 'https://jcamjim584-star.github.io/pichu-lab/applets/integer-ninja/', contenidos: ['enteros', 'números enteros'], nivel: 'cualquiera', curso: '1.º ESO', minutos: 15 },
]
