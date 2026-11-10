import { useEffect, useRef, useState } from 'react'
import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

/** Dibuja todas las páginas del examen. Funciona igual en móvil, tableta, ordenador y pizarra. */
export function VisorPdf({ pdf }: { pdf: Blob }) {
  const caja = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  const [error, setError] = useState<string>()
  useEffect(() => {
    let cancelado = false
    ;(async () => {
      try {
        const doc = await pdfjs.getDocument({ data: await pdf.arrayBuffer() }).promise
        const el = caja.current!; el.replaceChildren()
        for (let i = 1; i <= doc.numPages && !cancelado; i++) {
          const pagina = await doc.getPage(i), vp = pagina.getViewport({ scale: 1.6 })
          const lienzo = document.createElement('canvas'); lienzo.width = vp.width; lienzo.height = vp.height
          lienzo.setAttribute('aria-label', `Página ${i}`)
          el.appendChild(lienzo)
          await pagina.render({ canvas: lienzo, viewport: vp }).promise
        }
      } catch (e) { setError((e as Error).message) }
    })()
    return () => { cancelado = true }
  }, [pdf])
  return <div className="visorpdf">
    <div className="zoom"><button onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}>−</button>
      <span>{Math.round(zoom * 100)} %</span><button onClick={() => setZoom((z) => Math.min(3, z + 0.25))}>+</button></div>
    {error && <p className="aviso">No se puede mostrar el PDF: {error}</p>}
    <div ref={caja} className="paginas" style={{ ['--zoom' as any]: zoom }} />
  </div>
}
