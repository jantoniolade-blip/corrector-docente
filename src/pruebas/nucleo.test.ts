import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { PDFDocument } from 'pdf-lib'
import ExcelJS from 'exceljs'
import type { Estudiante, Examen } from '../core/tipos'
import { mediaRedondeada, notasPorCriterio, puntosVigentes } from '../core/criterios'
import { extraerJson, normalizar, validarCorreccion } from '../core/validar'
import { formulaCriterio, generarExcel } from '../core/excel'
import { generarPdfCorregido } from '../core/pdf'
import { diagnosticar, nivel, perfil } from '../core/diagnostico'

const dato = (f: string) => readFileSync(new URL(`./datos/${f}`, import.meta.url), 'utf8')
const ex: Examen = JSON.parse(dato('examen.json'))
const est = (cod: string): Estudiante => ({ codigo: cod, revision: {}, aprobado: false, correccion: normalizar(JSON.parse(dato(`${cod}.json`))) })
// Notas por criterio validadas por el profesor (E21 con la decisión docente D1 aplicada)
const REF: Record<string, number[]> = {
  E21: [9.13, 9.13, 9.5, 8.25, 9.75], E22: [6.75, 6.75, 7, 7.25, 7.75], E23: [9.38, 9.38, 9.5, 9.75, 9.75],
  E24: [5.38, 5.38, 3.5, 8, 7.5], E25: [9.5, 9.5, 9, 9, 9.5],
}

describe('criterios', () => {
  it('redondea la mitad hacia arriba', () => { expect(mediaRedondeada([1, 3, 8, 1, 6, 10, 6, 8])).toBe(5.38) })
  it('reproduce las notas de referencia de los cinco exámenes', () => {
    for (const [cod, esperado] of Object.entries(REF)) {
      const n = notasPorCriterio(puntosVigentes(est(cod)), ex.criterios)
      expect(['1.1', '1.2', '1.3', '3.2', '8.2'].map((c) => n[c]), cod).toEqual(esperado)
    }
  })
  it('no cierra un criterio con actividades pendientes', () => { expect(notasPorCriterio({ 1: 10 }, { '1.3': [1, 7] })['1.3']).toBeNull() })
  it('la revisión docente manda sobre la propuesta', () => {
    const e = est('E24'); e.revision[1] = { puntuacion: 5, comentario: '', revisada: true }
    expect(notasPorCriterio(puntosVigentes(e), ex.criterios)['1.3']).toBe(5.5)
  })
})

describe('validación', () => {
  it('acepta las correcciones de referencia', () => { for (const c of Object.keys(REF)) expect(validarCorreccion(JSON.parse(dato(`${c}.json`)), ex)).toEqual([]) })
  it('extrae el JSON de una respuesta con texto', () => { expect(extraerJson('Aquí tienes:\n```json\n{"a":1}\n```')).toEqual({ a: 1 }) })
  it('rechaza puntuaciones imposibles, actividades ausentes y otro examen', () => {
    const c = JSON.parse(dato('E21.json')); c.actividades[0].puntuacion = 11; c.actividades.pop(); c.examen_id = 'otro'
    const p = validarCorreccion(c, ex).join(' ')
    expect(p).toMatch(/fuera de 0–10/); expect(p).toMatch(/Falta la actividad 8/); expect(p).toMatch(/no coincide/)
  })
})

describe('exportación', () => {
  it('escribe fórmulas verificables en el Excel', async () => {
    expect(formulaCriterio([1, 7], [1, 2, 3, 4, 5, 6, 7, 8], 2)).toBe('ROUND(AVERAGE(Actividades!B2,Actividades!H2),2)')
    const wb = new ExcelJS.Workbook(); await wb.xlsx.load(await generarExcel(ex, [{ ...est('E24'), nombre: 'Prueba, Estudiante', aprobado: true }]))
    const ws = wb.getWorksheet('Notas')!
    expect(ws.getCell('A2').value).toBe('Prueba, Estudiante')
    expect((ws.getCell('D2').value as any).result).toBe(3.5)
    expect(wb.getWorksheet('Actividades')!.getCell('B2').value).toBe(1)
  })
  it('genera el PDF corregido conservando las páginas originales y añadiendo el informe', async () => {
    const orig = await PDFDocument.create(); orig.addPage([595, 842]); orig.addPage([595, 842])
    const pdf = await PDFDocument.load(await generarPdfCorregido(ex, est('E21'), await orig.save()))
    expect(pdf.getPageCount()).toBe(3)
    expect(pdf.getPage(0).getWidth()).toBeGreaterThan(595)
  })
})

describe('diagnóstico', () => {
  const todos = Object.keys(REF).map(est)
  it('clasifica por umbrales', () => { expect([nivel(4.75), nivel(5), nivel(7.75), nivel(8)]).toEqual(['reforzar', 'consolidar', 'consolidar', 'domina']) })
  it('agrupa a los estudiantes por contenido y calcula medias', () => {
    const d = diagnosticar(ex, todos), a4 = d.actividades.find((f) => f.n === 4)!
    expect(d.corregidos).toBe(5)
    expect(a4.reforzar.sort()).toEqual(['E22', 'E24'])
    expect(a4.media).toBe(6.2)
    expect(d.ampliacion.sort()).toEqual(['E23', 'E25'])
    expect(d.prioridades[0].reforzar.length).toBeGreaterThanOrEqual(d.prioridades[1].reforzar.length)
  })
  it('da el perfil de un estudiante sin perder actividades', () => {
    const p = perfil(ex, est('E24'))
    expect(p.reforzar.map((x) => x.n)).toEqual([1, 2, 4]); expect(p.reforzar.length + p.consolidar.length + p.domina.length).toBe(8)
  })
})
