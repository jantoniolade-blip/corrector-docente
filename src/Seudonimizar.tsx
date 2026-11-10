import { useEffect, useRef, useState } from 'react'
import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

type Rect = { pagina: number; x: number; y: number; w: number; h: number }   // en fracciones de la página (0–1)

/** Tapa zonas del examen (nombre, grupo…) y descarga una copia en imagen, sin texto ni metadatos del original. */
export function Seudonimizar() {
  const [pdf, setPdf] = useState<File>()
  const [codigo, setCodigo] = useState('')
  const [rects, setRects] = useState<Rect[]>([])
  const [nPag, setNPag] = useState(0)
  const lienzos = useRef<HTMLCanvasElement[]>([])
  const arrastre = useRef<{ pagina: number; x: number; y: number } | null>(null)
  const [tmp, setTmp] = useState<Rect | null>(null)

  useEffect(() => {
    if (!pdf) return
    let cancelado = false
    setRects([]); setNPag(0); lienzos.current = []
    ;(async () => {
      const doc = await pdfjs.getDocument({ data: await pdf.arrayBuffer() }).promise
      const nuevos: HTMLCanvasElement[] = []
      for (let i = 1; i <= doc.numPages && !cancelado; i++) {
        const pg = await doc.getPage(i), vp = pg.getViewport({ scale: 2 })
        const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height
        await pg.render({ canvas: c, viewport: vp }).promise; nuevos.push(c)
      }
      if (!cancelado) { lienzos.current = nuevos; setNPag(nuevos.length) }
    })()
    return () => { cancelado = true }
  }, [pdf])

  const pos = (ev: React.PointerEvent, el: HTMLElement) => { const r = el.getBoundingClientRect(); return { x: (ev.clientX - r.left) / r.width, y: (ev.clientY - r.top) / r.height } }
  const mover = (ev: React.PointerEvent<HTMLDivElement>) => {
    const a = arrastre.current; if (!a) return
    const p = pos(ev, ev.currentTarget)
    setTmp({ pagina: a.pagina, x: Math.min(a.x, p.x), y: Math.min(a.y, p.y), w: Math.abs(p.x - a.x), h: Math.abs(p.y - a.y) })
  }
  const soltar = () => { if (tmp && tmp.w > 0.01 && tmp.h > 0.005) setRects((r) => [...r, tmp]); setTmp(null); arrastre.current = null }

  async function descargar() {
    const { PDFDocument } = await import('pdf-lib')
    const out = await PDFDocument.create()
    for (let i = 0; i < lienzos.current.length; i++) {
      const o = lienzos.current[i], c = document.createElement('canvas'); c.width = o.width; c.height = o.height
      const g = c.getContext('2d')!; g.drawImage(o, 0, 0); g.fillStyle = '#222'
      for (const r of rects.filter((k) => k.pagina === i)) g.fillRect(r.x * c.width, r.y * c.height, r.w * c.width, r.h * c.height)
      const jpg = await out.embedJpg(await (await new Promise<Blob>((ok) => c.toBlob((b) => ok(b!), 'image/jpeg', 0.85))).arrayBuffer())
      out.addPage([c.width / 2, c.height / 2]).drawImage(jpg, { x: 0, y: 0, width: c.width / 2, height: c.height / 2 })
    }
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([await out.save() as BlobPart], { type: 'application/pdf' })); a.download = `${codigo.trim()}.pdf`; a.click()
  }

  return <main className="col">
    <h2>Seudonimizar un examen</h2>
    <p>Elige el PDF original, arrastra sobre cada zona que identifique al estudiante (nombre, grupo, tu nombre) y descarga la copia. El original no se modifica y nada sale de este dispositivo.</p>
    <p className="fila">
      <label className="boton"><input type="file" accept=".pdf" hidden onChange={(e) => setPdf(e.target.files?.[0])} />Elegir PDF</label>
      <label>Código <input className="codigo" value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="E26" /></label>
      <button onClick={() => setRects((r) => r.slice(0, -1))} disabled={!rects.length}>Deshacer</button>
      <button className="primario" disabled={!nPag || !codigo.trim()} onClick={descargar}>Descargar copia ({rects.length} zonas tapadas)</button>
    </p>
    {nPag > 0 && <p className="aviso">Revisa todas las páginas: los nombres aparecen a veces en hojas sueltas y en los bordes.</p>}
    {Array.from({ length: nPag }, (_, i) => <div key={`${pdf?.name}-${i}`} className="pagmask" onPointerMove={mover} onPointerUp={soltar} onPointerLeave={soltar}
      onPointerDown={(ev) => { arrastre.current = { pagina: i, ...pos(ev, ev.currentTarget) } }}>
      <img src={lienzos.current[i].toDataURL('image/jpeg', 0.7)} alt={`Página ${i + 1}`} draggable={false} />
      {[...rects, ...(tmp ? [tmp] : [])].filter((r) => r.pagina === i).map((r, k) =>
        <span key={k} style={{ left: `${r.x * 100}%`, top: `${r.y * 100}%`, width: `${r.w * 100}%`, height: `${r.h * 100}%` }} />)}
    </div>)}
  </main>
}
