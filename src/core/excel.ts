import ExcelJS from 'exceljs'
import type { Estudiante, Examen } from './tipos'
import { notasPorCriterio, puntosVigentes } from './criterios'

const col = (i: number) => { let s = ''; for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s; return s }

/** Fórmula de Excel para un criterio: media de sus actividades en la hoja «Actividades». */
export function formulaCriterio(acts: number[], todas: number[], fila: number): string {
  const refs = acts.map((n) => `Actividades!${col(todas.indexOf(n) + 1)}${fila}`)
  return `ROUND(AVERAGE(${refs.join(',')}),2)`
}

/** Libro con dos hojas: «Notas» (una columna por criterio, con fórmulas) y «Actividades». */
export async function generarExcel(ex: Examen, estudiantes: Estudiante[]): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook()
  const notas = wb.addWorksheet('Notas'), acts = wb.addWorksheet('Actividades')
  const ns = ex.actividades.map((a) => a.n), crs = Object.keys(ex.criterios)
  notas.addRow(['Apellidos y nombre', ...crs.map((c) => `CR ${c}`), 'Estado'])
  acts.addRow(['Apellidos y nombre', ...ns.map((n) => `Act. ${n}`), 'Modelo IA', 'Actividades modificadas'])
  const orden = [...estudiantes].sort((a, b) => (a.nombre ?? a.codigo).localeCompare(b.nombre ?? b.codigo, 'es'))
  orden.forEach((e, i) => {
    const fila = i + 2, p = puntosVigentes(e), cr = notasPorCriterio(p, ex.criterios), nombre = e.nombre ?? e.codigo
    const cambios = (e.correccion?.actividades ?? []).filter((a) => e.revision[a.n] && e.revision[a.n].puntuacion !== a.puntuacion).map((a) => a.n)
    acts.addRow([nombre, ...ns.map((n) => p[n] ?? null), e.correccion?.modelo_ia ?? '', cambios.join(', ')])
    notas.addRow([nombre, ...crs.map((c) => cr[c] === null ? null
      : { formula: formulaCriterio(ex.criterios[c], ns, fila), result: cr[c] as number }),
      e.aprobado ? 'Aprobada por el docente' : 'PROVISIONAL'])
  })
  for (const ws of [notas, acts]) {
    ws.getRow(1).font = { bold: true }; ws.getColumn(1).width = 34; ws.views = [{ state: 'frozen', xSplit: 1, ySplit: 1 }]
    ws.eachRow((r, n) => { if (n > 1) r.eachCell((c, k) => { if (k > 1) c.numFmt = '0.00' }) })
  }
  notas.getColumn(crs.length + 2).width = 26
  return wb.xlsx.writeBuffer() as Promise<ArrayBuffer>
}
