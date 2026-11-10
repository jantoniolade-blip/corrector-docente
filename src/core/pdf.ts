import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import type { Estudiante, Examen } from './tipos'
import { formato, notasPorCriterio, puntosVigentes } from './criterios'

const ROJO = rgb(0.8, 0.05, 0.1), AZUL = rgb(0.08, 0.18, 0.29), VERDE = rgb(0, 0.42, 0.42), GRIS = rgb(0.25, 0.25, 0.28)
const SUST: Record<string, string> = { 'π': 'pi', '≈': 'aprox.', '−': '-', '→': '->', '≤': '<=', '≥': '>=', '√': 'raíz ', '­': '-' }

/** Sustituye los caracteres que la fuente estándar no puede dibujar. */
export function limpiar(t: string, f: PDFFont): string {
  return [...t.replace(/\s+/g, ' ')].map((ch) => {
    if (SUST[ch]) return SUST[ch]
    try { f.encodeText(ch); return ch } catch { return '?' }
  }).join('')
}
export function partir(t: string, f: PDFFont, tam: number, ancho: number): string[] {
  const lineas: string[] = []; let l = ''
  for (const w of t.split(' ')) {
    const prueba = l ? l + ' ' + w : w
    if (f.widthOfTextAtSize(prueba, tam) > ancho && l) { lineas.push(l); l = w } else l = prueba
  }
  if (l) lineas.push(l)
  return lineas
}

/**
 * PDF corregido: cada página original se conserva íntegra y se le añade un margen
 * (arriba en la primera, a la derecha en todas) donde van las notas, de modo que
 * nunca se tapa lo escrito por el estudiante. Al final se añade la hoja de informe.
 */
export async function generarPdfCorregido(ex: Examen, e: Estudiante, original: ArrayBuffer | Uint8Array): Promise<Uint8Array> {
  const src = await PDFDocument.load(original), out = await PDFDocument.create()
  const f = await out.embedFont(StandardFonts.Helvetica), fb = await out.embedFont(StandardFonts.HelveticaBold)
  const p = puntosVigentes(e), cr = notasPorCriterio(p, ex.criterios), crs = Object.keys(ex.criterios)
  const acts = e.correccion?.actividades ?? [], max = ex.puntuacion_maxima_actividad
  const MD = 78, MA = 64
  // Una página sin contenido (hoja en blanco) no se puede incrustar: se conserva como hoja vacía.
  const paginas = await Promise.all(src.getPages().map(async (pg) => {
    return pg.node.Contents() ? await out.embedPage(pg) : { width: pg.getWidth(), height: pg.getHeight(), vacia: true as const }
  }))

  const cajaCriterios = (pg: PDFPage, x: number, y: number, ancho: number, alto: number) => {
    const w = ancho / crs.length
    crs.forEach((c, i) => {
      pg.drawRectangle({ x: x + i * w, y, width: w, height: alto, borderColor: GRIS, borderWidth: 0.6 })
      pg.drawText(`CR ${c}`, { x: x + i * w + 6, y: y + alto - 13, size: 8, font: f, color: GRIS })
      const t = formato(cr[c]); pg.drawText(t, { x: x + i * w + (w - fb.widthOfTextAtSize(t, 20)) / 2, y: y + 8, size: 20, font: fb, color: ROJO })
    })
  }

  paginas.forEach((emb, i) => {
    const arriba = i === 0 ? MA : 0
    const pg = out.addPage([emb.width + MD, emb.height + arriba])
    if (!('vacia' in emb)) pg.drawPage(emb, { x: 0, y: 0 })
    if (i === 0) cajaCriterios(pg, 12, emb.height + 8, emb.width - 24, MA - 16)
    const aqui = acts.filter((a) => (a.pagina ?? 1) === i + 1)
    let y = emb.height - 30
    for (const a of aqui) {
      pg.drawText(`Act. ${a.n}`, { x: emb.width + 8, y, size: 9, font: f, color: GRIS })
      pg.drawText(`${formato(p[a.n]).replace(',00', '')}`, { x: emb.width + 8, y: y - 20, size: 20, font: fb, color: ROJO })
      pg.drawText(`/${max}`, { x: emb.width + 8 + fb.widthOfTextAtSize(formato(p[a.n]).replace(',00', ''), 20) + 2, y: y - 20, size: 9, font: f, color: GRIS })
      y -= 52
    }
  })

  // Hoja de informe
  const A4: [number, number] = [595.28, 841.89], M = 40, ANCHO = A4[0] - 2 * M
  let pg = out.addPage(A4), y = A4[1]
  const salto = (n: number) => { if (y - n < 50) { pg = out.addPage(A4); y = A4[1] - M } }
  const parrafo = (t: string, fuente: PDFFont, tam: number, color = GRIS, sep = 4) => {
    for (const l of partir(limpiar(t, fuente), fuente, tam, ANCHO)) { salto(tam + 3); y -= tam + 3; pg.drawText(l, { x: M, y, size: tam, font: fuente, color }) }
    y -= sep
  }
  pg.drawRectangle({ x: 0, y: A4[1] - 96, width: A4[0], height: 96, color: AZUL })
  pg.drawText(limpiar(e.nombre ?? e.codigo, fb), { x: M, y: A4[1] - 52, size: 19, font: fb, color: rgb(1, 1, 1) })
  pg.drawText(limpiar(`${ex.titulo}${ex.version ? ' · Versión ' + ex.version : ''}`, f), { x: M, y: A4[1] - 74, size: 10, font: f, color: rgb(0.85, 0.9, 0.95) })
  y = A4[1] - 110
  parrafo('NOTAS POR CRITERIO', fb, 11, VERDE, 2)
  cajaCriterios(pg, M, y - 50, ANCHO, 46); y -= 62
  if (!e.aprobado) parrafo('Corrección provisional: pendiente de aprobación del profesor.', fb, 9, ROJO)
  for (const a of acts) {
    salto(40)
    parrafo(`ACTIVIDAD ${a.n} · ${formato(p[a.n])}/${max}`, fb, 10, VERDE, 0)
    parrafo(e.revision[a.n]?.comentario || a.justificacion, f, 10, GRIS, 6)
  }
  const fbk = e.feedback ?? e.correccion?.feedback_global
  if (fbk) { salto(60); parrafo('PARA SEGUIR MEJORANDO', fb, 11, VERDE, 2); parrafo(fbk, f, 11.5, AZUL, 8) }
  const prop = (e.correccion?.propuestas_mejora ?? []).filter((x) => x.descripcion)
  if (prop.length) { salto(50); parrafo('ACTIVIDADES PROPUESTAS', fb, 11, VERDE, 2); for (const x of prop) parrafo(`- ${x.tipo_actividad ? x.tipo_actividad + ': ' : ''}${x.descripcion}`, f, 10) }
  return out.save()
}
