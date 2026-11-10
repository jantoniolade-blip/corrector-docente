import { useEffect, useState } from 'react'
import type { Estudiante, Examen } from './core/tipos'
import { cargarBiblioteca, guardarBiblioteca } from './core/almacen'
import { BIBLIOTECA_INICIAL, OPCIONES, encargoParaIA, planCsv, proponerRefuerzo, type Recurso, type TipoRecurso } from './core/refuerzo'

const TIPOS: TipoRecurso[] = ['juego', 'relacion', 'ficha', 'video', 'interactivo', 'cooperativa', 'manipulativa', 'proyecto', 'cuestionario', 'otro']
const VACIO = { titulo: '', tipo: 'relacion' as TipoRecurso, url: '', contenidos: '', nivel: 'cualquiera' as Recurso['nivel'], minutos: '' }

export function Refuerzo({ ex, estudiantes }: { ex: Examen; estudiantes: Estudiante[] }) {
  const [bib, setBib] = useState<Recurso[]>([])
  const [nuevo, setNuevo] = useState(VACIO)
  const [minutos, setMinutos] = useState(20)
  const [consolidar, setConsolidar] = useState(true)
  const [aviso, setAviso] = useState('')
  useEffect(() => { cargarBiblioteca().then((b) => setBib(b ?? BIBLIOTECA_INICIAL)) }, [])
  const guardar = (b: Recurso[]) => { setBib(b); guardarBiblioteca(b) }
  const nombre = (c: string) => estudiantes.find((e) => e.codigo === c)?.nombre ?? c
  const grupos = proponerRefuerzo(ex, estudiantes, bib, { ...OPCIONES, minutosMaximos: minutos, incluirConsolidar: consolidar })
  const sinAprobar = estudiantes.filter((e) => e.correccion && !e.aprobado).length

  const anadir = () => {
    if (!nuevo.titulo.trim() || !nuevo.contenidos.trim()) { setAviso('Escribe al menos el título y un contenido.'); return }
    guardar([...bib, { id: `r${Date.now()}`, titulo: nuevo.titulo.trim(), tipo: nuevo.tipo, url: nuevo.url.trim() || undefined, nivel: nuevo.nivel,
      contenidos: nuevo.contenidos.split(',').map((x) => x.trim()).filter(Boolean), minutos: Number(nuevo.minutos) || undefined }])
    setNuevo(VACIO); setAviso('')
  }
  const bajar = (texto: string, archivo: string, tipo: string) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([texto], { type: tipo })); a.download = archivo; a.click() }

  return <main className="col">
    <h2>Refuerzo</h2>
    <p>Propuesta a partir del diagnóstico y de tu biblioteca. Nada se asigna ni se envía desde aquí: tú decides qué usar.</p>
    {sinAprobar > 0 && <p className="aviso">{sinAprobar} correcciones sin aprobar: la propuesta es provisional.</p>}
    <p className="fila">
      <label>Tiempo máximo por recurso <input className="codigo" type="number" min={5} step={5} value={minutos} onChange={(e) => setMinutos(Number(e.target.value))} /> min</label>
      <label><input type="checkbox" checked={consolidar} onChange={(e) => setConsolidar(e.target.checked)} /> Incluir a quienes solo necesitan consolidar</label>
      <button disabled={!grupos.length} onClick={() => bajar(planCsv(grupos, nombre), `refuerzo_${ex.id}.csv`, 'text/csv')}>Descargar plan por estudiante (CSV)</button>
    </p>
    {aviso && <p className="aviso">{aviso}</p>}
    {!grupos.length && <p>No hay necesidades de refuerzo con las correcciones cargadas.</p>}
    {grupos.map((g) => <article key={`${g.actividad}-${g.nivel}`} className={g.recursos.length ? 'hecha' : 'dudosa'}>
      <h4>{g.contenido} <span className="conf">{g.nivel} · {g.estudiantes.length} estudiante{g.estudiantes.length > 1 ? 's' : ''}</span></h4>
      <p className="trans">{g.estudiantes.map(nombre).join(' · ')}</p>
      {g.recursos.length ? <ul>{g.recursos.map((r) => <li key={r.id}><b>{r.tipo}:</b> {r.url ? <a href={r.url} target="_blank" rel="noreferrer">{r.titulo}</a> : r.titulo}{r.minutos ? ` · ${r.minutos} min` : ''}</li>)}</ul>
        : <p className="fila"><span>No hay nada adecuado en tu biblioteca.</span>
          <button onClick={async () => { await navigator.clipboard.writeText(encargoParaIA(g, ex, minutos)); setAviso(`Encargo copiado para «${g.contenido}». Pégalo en tu asistente; no contiene nombres.`) }}>Copiar encargo para la IA</button></p>}
    </article>)}

    <h3>Tu biblioteca de recursos ({bib.length})</h3>
    <p>Un recurso se propone cuando todas las palabras de uno de sus contenidos aparecen en el contenido de la actividad.</p>
    <table><thead><tr><th>Título</th><th>Tipo</th><th>Contenidos</th><th>Sirve para</th><th></th></tr></thead>
      <tbody>{bib.map((r) => <tr key={r.id}><td>{r.url ? <a href={r.url} target="_blank" rel="noreferrer">{r.titulo}</a> : r.titulo}</td><td>{r.tipo}</td>
        <td>{r.contenidos.join(', ')}</td><td>{r.nivel}</td><td><button onClick={() => guardar(bib.filter((x) => x.id !== r.id))} aria-label={`Quitar ${r.titulo}`}>Quitar</button></td></tr>)}</tbody></table>
    <div className="fila formulario">
      <input placeholder="Título" value={nuevo.titulo} onChange={(e) => setNuevo({ ...nuevo, titulo: e.target.value })} />
      <select value={nuevo.tipo} onChange={(e) => setNuevo({ ...nuevo, tipo: e.target.value as TipoRecurso })}>{TIPOS.map((t) => <option key={t}>{t}</option>)}</select>
      <input placeholder="Contenidos, separados por comas" value={nuevo.contenidos} onChange={(e) => setNuevo({ ...nuevo, contenidos: e.target.value })} />
      <select value={nuevo.nivel} onChange={(e) => setNuevo({ ...nuevo, nivel: e.target.value as Recurso['nivel'] })}>{['cualquiera', 'reforzar', 'consolidar', 'ampliar'].map((t) => <option key={t}>{t}</option>)}</select>
      <input placeholder="Enlace (opcional)" value={nuevo.url} onChange={(e) => setNuevo({ ...nuevo, url: e.target.value })} />
      <input placeholder="Min" className="codigo" value={nuevo.minutos} onChange={(e) => setNuevo({ ...nuevo, minutos: e.target.value })} />
      <button className="primario" onClick={anadir}>Añadir recurso</button>
    </div>
    <p className="fila"><button onClick={() => bajar(JSON.stringify(bib, null, 1), 'biblioteca.json', 'application/json')}>Guardar copia de la biblioteca</button>
      <label className="boton"><input type="file" accept=".json" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) try { guardar(JSON.parse(await f.text())) } catch { setAviso('El archivo no es una biblioteca válida.') } }} />Cargar biblioteca</label></p>
  </main>
}
