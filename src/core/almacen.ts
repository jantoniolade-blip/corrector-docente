// Almacenamiento local (IndexedDB). Los datos no salen del dispositivo.
// Esta interfaz es la frontera para sustituirlo más adelante por PostgreSQL.
import { get, set, del } from 'idb-keyval'
import type { Estudiante, Examen } from './tipos'

export interface Lote { examen?: Examen; estudiantes: Estudiante[] }
const CLAVE = 'lote-actual'
export const cargarLote = async (): Promise<Lote> => (await get(CLAVE)) ?? { estudiantes: [] }
export const guardarLote = (l: Lote) => set(CLAVE, l)
export const borrarLote = () => del(CLAVE)

// La biblioteca de recursos es del docente, no de un examen: se guarda aparte y sobrevive al borrado de un lote.
import type { Recurso } from './refuerzo'
export const cargarBiblioteca = async (): Promise<Recurso[] | undefined> => get('biblioteca')
export const guardarBiblioteca = (b: Recurso[]) => set('biblioteca', b)
