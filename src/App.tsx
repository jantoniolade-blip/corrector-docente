import { useEffect, useState } from 'react'
import type { Estudiante, Examen } from './core/tipos'
import { cargarLote, guardarLote, borrarLote, type Lote } from './core/almacen'
import { formato, notasPorCriterio, prioridad, puntosVigentes } from './core/criterios'
import { extraerJson, normalizar, validarCorreccion } from './core/validar'
import { VisorPdf } from './VisorPdf'
import { Seudonimizar } from './Seudonimizar'
import { diagnosticar, perfil } from './core/diagnostico'

type Vista = 'seudonimizar' | 'preparar' | 'revisar' | 'diagnostico' | 'exportar'
const ETIQUETA: Record<Vista, string> = { seudonimizar: 'Seudonimizar', preparar: '1 · Preparar', revisar: '2 · Revisar', diagnostico: '3 · Diagnóstico', exportar: '4 · Exportar' }
const descargar = (datos: BlobPart, nombre: string, tipo: string) => {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([datos], { type: tipo })); a.download = nombre; a.click()
}
const codigoDe = (nombre: string) => nombre.replace(/\.[^.]+$/, '').split(/[_ ]/)[0]

export default function App() {
  const [lote, setLote] = useState<Lote>({ estudiantes: [] })
  const [vista, setVista] = useState<Vista>('preparar')
  const [sel, setSel] = useState<string>()
  const [avisos, setAvisos] = useState<string[]>([])
  const [listo, setListo] = useState(false)
  useEffect(() => { cargarLote().then((l) => { setLote(l); setListo(true) }) }, [])
  const cambiar = (l: Lote) => { setLote(l); guardarLote(l) }
  const { examen: ex, estudiantes } = lote

  const actualizar = (codigo: string, f: (e: Estudiante) => Estudiante) =>
    cambiar({ ...lote, estudiantes: estudiantes.map((e) => (e.codigo === codigo ? f(e) : e)) })
  const obtener = (lista: Estudiante[], codigo: string) => {
    let e = lista.find((x) => x.codigo === codigo)
    if (!e) { e = { codigo, revision: {}, aprobado: false }; lista.push(e) }
    return e
  }

  async function cargarArchivos(fs: FileList | null) {
    if (!fs) return
    const msg: string[] = []; let examen = ex; const lista = estudiantes.map((e) => ({ ...e }))
    const archivos = [...fs].sort((a, b) => Number(b.name === 'examen.json') - Number(a.name === 'examen.json'))
    for (const f of archivos) {
      try {
        if (f.name.toLowerCase().endsWith('.pdf')) obtener(lista, codigoDe(f.name)).pdf = f
        else if (f.name.toLowerCase().endsWith('.csv')) {
          for (const l of (await f.text()).split(/\r?\n/).slice(1)) {
            const m = l.match(/^([^,;]+)[,;]\s*(?:"([^"]*)"|([^,;]*))/); if (m) obtener(lista, m[1].trim()).nombre = (m[2] ?? m[3]).trim()
          }
        } else {
          const j: any = extraerJson(await f.text())
          if (j.criterios && j.actividades) { examen = j as Examen; msg.push(`Examen cargado: ${j.titulo}`) }
          else if (!examen) msg.push(`${f.name}: carga primero examen.json.`)
          else {
            const prob = validarCorreccion(j, examen)
            if (prob.length) msg.push(`${f.name} rechazado: ${prob.join(' ')}`)
            else { const e = obtener(lista, j.codigo_estudiante); e.correccion = normalizar(j); e.revision = {}; e.aprobado = false }
          }
        }
      } catch (err) { msg.push(`${f.name}: ${(err as Error).message}`) }
    }
    lista.sort((a, b) => a.codigo.localeCompare(b.codigo))
    setAvisos(msg); cambiar({ examen, estudiantes: lista })
  }

  async function exportarExcel() { if (!ex) return
    const { generarExcel } = await import('./core/excel')
    descargar(await generarExcel(ex, estudiantes), `notas_${ex.id}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') }
  async function exportarPdfs() {
    if (!ex) return
    const [{ default: JSZip }, { generarPdfCorregido }] = await Promise.all([import('jszip'), import('./core/pdf')])
    const zip = new JSZip()
    for (const e of estudiantes) if (e.pdf && e.correccion)
      zip.file(`${(e.nombre ?? e.codigo).replace(/[^\p{L}\p{N}]+/gu, '_')}_corregido.pdf`, await generarPdfCorregido(ex, e, await e.pdf.arrayBuffer()))
    descargar(await zip.generateAsync({ type: 'blob' }), `corregidos_${ex.id}.zip`, 'application/zip')
  }
  async function copiarInstrucciones() {
    const t = await (await fetch('contexto/instrucciones_correccion.md')).text()
    await navigator.clipboard.writeText(t); setAvisos(['Instrucciones copiadas. Adjunta en el asistente el PDF seudonimizado, examen.json y esquema_correccion.json.'])
  }

  const actual = estudiantes.find((e) => e.codigo === sel)
  const corregidos = estudiantes.filter((e) => e.correccion), aprobados = estudiantes.filter((e) => e.aprobado)
  if (!listo) return null
  return (
    <div className="app">
      <header>
        <strong>Corrector</strong>
        <nav>{(Object.keys(ETIQUETA) as Vista[]).map((v) => (
          <button key={v} className={vista === v ? 'activo' : ''} onClick={() => setVista(v)}>
            {ETIQUETA[v]}</button>))}</nav>
        <span className="estado">{ex ? `${aprobados.length}/${estudiantes.length} aprobados` : 'Sin examen'}</span>
      </header>

      {vista === 'preparar' && <main className="col">
        <h2>{ex ? ex.titulo : 'Carga el examen para empezar'}</h2>
        <label className="soltar">
          <input type="file" multiple accept=".json,.pdf,.csv,.txt" onChange={(e) => { cargarArchivos(e.target.files); e.target.value = '' }} />
          <b>Añadir archivos</b>
          <span>examen.json · PDF de cada estudiante (E21.pdf…) · correcciones de la IA (.json) · identidades.csv</span>
        </label>
        {avisos.map((a, i) => <p key={i} className="aviso">{a}</p>)}
        {ex && <>
          <p className="fila">
            <button onClick={copiarInstrucciones}>Copiar instrucciones para el asistente</button>
            <a href="contexto/esquema_correccion.json" download>Descargar esquema</a>
            <button onClick={() => descargar(JSON.stringify(ex, null, 1), 'examen.json', 'application/json')}>Descargar examen.json</button>
          </p>
          <table><thead><tr><th>Código</th><th>Nombre</th><th>Examen</th><th>Corrección</th><th>Estado</th></tr></thead>
            <tbody>{estudiantes.map((e) => <tr key={e.codigo} onClick={() => { setSel(e.codigo); setVista('revisar') }}>
              <td>{e.codigo}</td><td>{e.nombre ?? '—'}</td><td>{e.pdf ? 'PDF' : 'falta'}</td>
              <td>{e.correccion ? e.correccion.modelo_ia : 'pendiente'}</td>
              <td>{e.aprobado ? 'Aprobada' : e.correccion ? 'Por revisar' : '—'}</td></tr>)}</tbody></table>
          {ex.decisiones_docentes?.length ? <><h3>Decisiones docentes de este examen</h3>
            <ul>{ex.decisiones_docentes.map((d) => <li key={d.id}><b>{d.id}{d.actividad ? ` · act. ${d.actividad}` : ''}:</b> {d.regla}</li>)}</ul></> : null}
          <p><button className="peligro" onClick={() => { if (confirm('¿Borrar el lote de este dispositivo?')) { borrarLote(); setLote({ estudiantes: [] }) } }}>Borrar lote</button></p>
        </>}
      </main>}

      {vista === 'revisar' && ex && <main className="revisar">
        <aside>{estudiantes.map((e) => {
          const dud = e.correccion?.actividades.filter((a) => a.requiere_revision || a.confianza === 'baja').length ?? 0
          return <button key={e.codigo} className={e.codigo === sel ? 'activo' : ''} onClick={() => setSel(e.codigo)}>
            <span>{e.nombre ?? e.codigo}</span><small>{e.aprobado ? '✓' : !e.correccion ? 'sin corregir' : dud ? `${dud} dudosas` : 'por revisar'}</small></button>
        })}</aside>
        {actual ? <Revision ex={ex} e={actual} cambiar={(f) => actualizar(actual.codigo, f)} /> : <p className="vacio">Elige un estudiante.</p>}
      </main>}
      {vista === 'revisar' && !ex && <main className="col"><p>Carga primero el examen.</p></main>}

      {vista === 'seudonimizar' && <Seudonimizar />}
      {vista === 'diagnostico' && (ex ? <VistaDiagnostico ex={ex} estudiantes={estudiantes} /> : <main className="col"><p>Carga primero el examen.</p></main>)}

      {vista === 'exportar' && <main className="col">
        <h2>Exportar</h2>
        <p>{corregidos.length} con corrección, {aprobados.length} aprobadas por ti. Las no aprobadas se exportan marcadas como provisionales.</p>
        <p className="fila"><button disabled={!ex} onClick={exportarExcel}>Excel de notas por criterio</button>
          <button disabled={!ex} onClick={exportarPdfs}>PDF corregidos (zip)</button></p>
        {ex && <table><thead><tr><th>Estudiante</th>{Object.keys(ex.criterios).map((c) => <th key={c}>CR {c}</th>)}<th>Estado</th></tr></thead>
          <tbody>{estudiantes.map((e) => { const n = notasPorCriterio(puntosVigentes(e), ex.criterios)
            return <tr key={e.codigo}><td>{e.nombre ?? e.codigo}</td>{Object.keys(ex.criterios).map((c) => <td key={c}>{formato(n[c])}</td>)}<td>{e.aprobado ? 'Aprobada' : 'Provisional'}</td></tr> })}</tbody></table>}
      </main>}
    </div>
  )
}

function Revision({ ex, e, cambiar }: { ex: Examen; e: Estudiante; cambiar: (f: (e: Estudiante) => Estudiante) => void }) {
  const notas = notasPorCriterio(puntosVigentes(e), ex.criterios)
  if (!e.correccion) return <p className="vacio">Este estudiante aún no tiene corrección importada.</p>
  const acts = [...e.correccion.actividades].sort((a, b) => prioridad(a) - prioridad(b) || a.n - b.n)
  const rev = (n: number) => e.revision[n]
  const poner = (n: number, cambios: Partial<{ puntuacion: number; comentario: string; revisada: boolean }>) => cambiar((x) => {
    const a = x.correccion!.actividades.find((k) => k.n === n)!
    const base = x.revision[n] ?? { puntuacion: a.puntuacion, comentario: a.justificacion, revisada: false }
    return { ...x, aprobado: false, revision: { ...x.revision, [n]: { ...base, ...cambios } } }
  })
  const todas = () => cambiar((x) => ({ ...x, aprobado: true, revision: Object.fromEntries(x.correccion!.actividades.map((a) =>
    [a.n, { ...(x.revision[a.n] ?? { puntuacion: a.puntuacion, comentario: a.justificacion }), revisada: true }])) }))
  return <>
    <section className="visor">{e.pdf ? <VisorPdf pdf={e.pdf} /> : <p className="vacio">Falta el PDF del examen.</p>}</section>
    <section className="panel">
      <div className="criterios">{Object.keys(ex.criterios).map((c) => <div key={c}><small>CR {c}</small><b>{formato(notas[c])}</b></div>)}</div>
      {acts.map((a) => { const r = rev(a.n), enun = ex.actividades.find((k) => k.n === a.n)
        const dudosa = a.requiere_revision || a.confianza === 'baja', cambiada = r && r.puntuacion !== a.puntuacion
        return <article key={a.n} className={dudosa ? 'dudosa' : r?.revisada ? 'hecha' : ''}>
          <h4>Actividad {a.n} <span className={`conf ${a.confianza}`}>confianza {a.confianza}</span>
            {cambiada && <span className="conf media">IA proponía {formato(a.puntuacion)}</span>}</h4>
          {a.motivo_revision && <p className="aviso">{a.motivo_revision}</p>}
          <details><summary>Enunciado y solución</summary><p>{enun?.enunciado}</p><p><b>Solución:</b> {enun?.solucion}</p>{enun?.baremo && <p><b>Baremo:</b> {enun.baremo}</p>}</details>
          {a.transcripcion && <p className="trans"><b>Lectura de la IA:</b> {a.transcripcion}</p>}
          <textarea rows={3} value={r?.comentario ?? a.justificacion} onChange={(ev) => poner(a.n, { comentario: ev.target.value })} />
          <div className="fila"><label>Puntuación <input type="number" min={0} max={ex.puntuacion_maxima_actividad} step={0.25}
            value={r?.puntuacion ?? a.puntuacion} onChange={(ev) => poner(a.n, { puntuacion: Number(ev.target.value) })} /> / {ex.puntuacion_maxima_actividad}</label>
            <label><input type="checkbox" checked={!!r?.revisada} onChange={(ev) => poner(a.n, { revisada: ev.target.checked })} /> Revisada</label></div>
        </article> })}
      <h4>Feedback para el estudiante</h4>
      <textarea rows={4} value={e.feedback ?? e.correccion.feedback_global} onChange={(ev) => cambiar((x) => ({ ...x, feedback: ev.target.value, aprobado: false }))} />
      <p className="fila"><button className="primario" onClick={todas}>{e.aprobado ? 'Aprobada ✓' : 'Aprobar corrección'}</button></p>
    </section>
  </>
}

function VistaDiagnostico({ ex, estudiantes }: { ex: Examen; estudiantes: Estudiante[] }) {
  const [proyectar, setProyectar] = useState(false)
  const d = diagnosticar(ex, estudiantes)
  const nombre = (c: string) => estudiantes.find((e) => e.codigo === c)?.nombre ?? c
  const lista = (cs: string[]) => proyectar ? `${cs.length}` : cs.length ? cs.map(nombre).join(' · ') : '—'
  const pendientes = estudiantes.filter((e) => e.correccion && !e.aprobado).length
  return <main className="col">
    <h2>Diagnóstico del grupo</h2>
    <p className="fila"><label><input type="checkbox" checked={proyectar} onChange={(e) => setProyectar(e.target.checked)} /> Modo proyección (sin nombres ni notas individuales)</label></p>
    {pendientes > 0 && <p className="aviso">{pendientes} correcciones sin aprobar: el diagnóstico es provisional.</p>}
    <p>{d.corregidos} exámenes. Un examen es una sola evidencia: estos grupos describen esta prueba, no etiquetan al estudiante.</p>
    <div className="criterios">{Object.entries(d.criterios).map(([c, v]) => <div key={c}><small>CR {c} · media</small><b>{formato(v)}</b></div>)}</div>
    <h3>Por contenido</h3>
    <table><thead><tr><th>Act.</th><th>Contenido</th><th>Media</th><th>Reforzar (&lt;5)</th><th>Consolidar (5–8)</th><th>Domina</th></tr></thead>
      <tbody>{d.actividades.map((f) => <tr key={f.n}><td>{f.n}</td><td>{f.contenido}</td><td>{formato(f.media)}</td>
        <td>{lista(f.reforzar)}</td><td>{lista(f.consolidar)}</td><td>{f.domina.length}</td></tr>)}</tbody></table>
    <h3>Prioridades de refuerzo</h3>
    <ol>{d.prioridades.slice(0, 4).map((f) => <li key={f.n}><b>{f.contenido}</b> (act. {f.n}): {f.reforzar.length} para reforzar, {f.consolidar.length} para consolidar.</li>)}</ol>
    <p><b>Ampliación</b> (todos los criterios ≥ 9): {lista(d.ampliacion)}</p>
    {!proyectar && <><h3>Por estudiante</h3>
      <table><thead><tr><th>Estudiante</th><th>Reforzar</th><th>Consolidar</th><th>Domina</th></tr></thead>
        <tbody>{estudiantes.filter((e) => e.correccion).map((e) => { const p = perfil(ex, e)
          return <tr key={e.codigo}><td>{e.nombre ?? e.codigo}</td><td>{p.reforzar.map((x) => x.contenido).join('; ') || '—'}</td>
            <td>{p.consolidar.map((x) => x.contenido).join('; ') || '—'}</td><td>{p.domina.length} de {ex.actividades.length}</td></tr> })}</tbody></table></>}
  </main>
}
