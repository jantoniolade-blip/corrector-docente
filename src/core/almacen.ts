// Almacenamiento local (IndexedDB). Los datos no salen del dispositivo.
// Esta interfaz es la frontera para sustituirlo más adelante por PostgreSQL.
import { get, set, del } from 'idb-keyval'
import type { Estudiante, Examen } from './tipos'

export interface Lote { examen?: Examen; estudiantes: Estudiante[] }
const CLAVE = 'lote-actual'
export const cargarLote = async (): Promise<Lote> => (await get(CLAVE)) ?? { estudiantes: [] }
export const guardarLote = (l: Lote) => set(CLAVE, l)
export const borrarLote = () => del(CLAVE)
