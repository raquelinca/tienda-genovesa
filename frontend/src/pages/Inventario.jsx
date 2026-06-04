import { useEffect, useState } from 'react';
import { api } from '../services/api';

const VACIO = {
  nombre:'', categoria:'', precio_venta:'',
  precio_compra:'', stock_actual:'', stock_minimo:'5'
};

export default function Inventario() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [form, setForm] = useState(VACIO);
  const [editId, setEditId] = useState(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [errores, setErrores] = useState('');
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [editCategoria, setEditCategoria] = useState(null);
  const [editCategoriaValor, setEditCategoriaValor] = useState('');
  const [mensajeCat, setMensajeCat] = useState('');
  const [mostrarDropdownCat, setMostrarDropdownCat] = useState(false);

  const cargar = async () => {
    try {
      const data = await api.get('/productos');
      if (data.ok && Array.isArray(data.data)) setProductos(data.data);
      else setProductos([]);
    } catch { setProductos([]); }
  };

  const cargarCategorias = async () => {
    try {
      const data = await api.get('/categorias');
      if (data.ok && Array.isArray(data.data)) setCategorias(data.data);
    } catch { setCategorias([]); }
  };

  useEffect(() => { cargar(); cargarCategorias(); }, []);

  const guardar = async () => {
    if (!form.nombre.trim()) { setErrores('⚠️ El nombre es obligatorio.'); return; }
    if (!form.categoria.trim()) { setErrores('⚠️ La categoría es obligatoria.'); return; }
    if (!form.precio_venta || parseFloat(form.precio_venta) <= 0) { setErrores('⚠️ El precio de venta debe ser mayor a 0.'); return; }
    if (form.stock_actual === '') { setErrores('⚠️ El stock actual es obligatorio.'); return; }
    setErrores('');
    if (editId) await api.put(`/productos/${editId}`, form);
    else await api.post('/productos', form);
    setForm(VACIO); setEditId(null);
    setMostrarForm(false); cargar();
  };

  const editar = (p) => { setForm(p); setEditId(p.id); setMostrarForm(true); };

  const eliminar = async (id) => {
    if (confirm('¿Eliminar este producto?')) {
      await api.delete(`/productos/${id}`); cargar();
    }
  };

  const agregarCategoria = async () => {
    if (!nuevaCategoria.trim()) return;
    const res = await api.post('/categorias', { nombre: nuevaCategoria });
    if (res.ok) {
      setNuevaCategoria('');
      cargarCategorias();
      setMensajeCat('✅ Categoría agregada.');
    }
    setTimeout(() => setMensajeCat(''), 2000);
  };

  const guardarEditCategoria = async (id) => {
    if (!editCategoriaValor.trim()) return;
    const res = await api.put(`/categorias/${id}`, { nombre: editCategoriaValor });
    if (res.ok) {
      setEditCategoria(null);
      cargarCategorias();
      setMensajeCat('✅ Categoría actualizada.');
    }
    setTimeout(() => setMensajeCat(''), 2000);
  };

  const eliminarCategoria = async (id) => {
    if (!confirm('¿Eliminar esta categoría?')) return;
    const res = await api.delete(`/categorias/${id}`);
    if (res.ok) {
      cargarCategorias();
      setMensajeCat('✅ Categoría eliminada.');
    }
    setTimeout(() => setMensajeCat(''), 2000);
  };

  const handleNombre = (e) => {
    const val = e.target.value;
    const conMayuscula = val.replace(/\b\w/g, l => l.toUpperCase());
    setForm({...form, nombre: conMayuscula});
  };

  const handlePrecio = (campo, valor) => {
    if (/^\d*\.?\d*$/.test(valor)) setForm({...form, [campo]: valor});
  };

  const nombresSugeridos = productos
    .map(p => p.nombre)
    .filter(n =>
      form.nombre.length > 1 &&
      n.toLowerCase().startsWith(form.nombre.toLowerCase()) &&
      n.toLowerCase() !== form.nombre.toLowerCase()
    );

  const filtrados = Array.isArray(productos) ? productos.filter(p =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  ) : [];

  const inputStyle = {
    width:'100%', padding:'9px 12px', borderRadius:'6px',
    border:'1px solid #334155', background:'#0f172a',
    color:'#e2e8f0', boxSizing:'border-box', fontSize:'13px'
  };

  return (
    <div style={{background:'#0f172a',minHeight:'100vh',width:'100%',padding:'20px',color:'#fff',fontFamily:'sans-serif',boxSizing:'border-box'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
        <h1 style={{color:'#06b6d4',fontSize:'22px',margin:0}}>📦 Inventario — Tienda Genovesa</h1>
        <button onClick={() => { setForm(VACIO); setEditId(null); setMostrarForm(true); setErrores(''); }}
          style={{background:'linear-gradient(135deg,#0891b2,#06b6d4)',border:'none',borderRadius:'8px',padding:'10px 18px',fontWeight:'500',cursor:'pointer',color:'#fff',fontSize:'13px'}}>
          + Nuevo producto
        </button>
      </div>

      <input placeholder="🔍 Buscar producto..."
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
        style={{width:'100%',padding:'10px 12px',borderRadius:'8px',border:'1px solid #334155',background:'#1e293b',color:'#e2e8f0',marginBottom:'16px',fontSize:'14px',boxSizing:'border-box'}}
      />

      {mostrarForm && (
        <div style={{background:'#1e293b',border:'1px solid #0891b240',borderRadius:'12px',padding:'20px',marginBottom:'16px'}}>
          <h2 style={{color:'#06b6d4',marginBottom:'14px',fontSize:'16px'}}>
            {editId ? '✏️ Editar producto' : '➕ Nuevo producto'}
          </h2>

          {errores && (
            <div style={{background:'#ff444420',border:'1px solid #ff444440',borderRadius:'8px',padding:'10px 14px',marginBottom:'12px',color:'#ff6666',fontSize:'13px'}}>
              {errores}
            </div>
          )}

          {mensajeCat && (
            <div style={{background:'#00C85320',border:'1px solid #00C85340',borderRadius:'6px',padding:'8px 12px',marginBottom:'12px',color:'#00C853',fontSize:'13px'}}>
              {mensajeCat}
            </div>
          )}

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'14px'}}>

            {/* NOMBRE con autocompletado */}
            <div style={{position:'relative'}}>
              <label style={{fontSize:'12px',color:'#06b6d4',display:'block',marginBottom:'6px'}}>Nombre *</label>
              <input
                value={form.nombre}
                onChange={handleNombre}
                placeholder="Ej: Galletas Oreo"
                style={inputStyle}
                autoComplete="off"
              />
              {nombresSugeridos.length > 0 && (
                <div style={{position:'absolute',top:'100%',left:0,right:0,background:'#1e293b',border:'1px solid #0891b2',borderRadius:'0 0 8px 8px',zIndex:99,boxShadow:'0 4px 12px #00000040'}}>
                  {nombresSugeridos.slice(0,5).map(s => (
                    <div key={s}
                      onClick={() => setForm({...form, nombre: s})}
                      style={{padding:'8px 12px',cursor:'pointer',fontSize:'13px',color:'#e2e8f0',borderBottom:'1px solid #334155'}}
                      onMouseEnter={e => e.currentTarget.style.background='#0891b230'}
                      onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                      🔍 {s}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* CATEGORÍA con dropdown */}
            <div style={{position:'relative'}}>
              <label style={{fontSize:'12px',color:'#06b6d4',display:'block',marginBottom:'6px'}}>Categoría *</label>
              <div
                onClick={() => setMostrarDropdownCat(!mostrarDropdownCat)}
                style={{...inputStyle, cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <span style={{color: form.categoria ? '#e2e8f0' : '#64748b'}}>
                  {form.categoria || 'Selecciona una categoría'}
                </span>
                <span style={{color:'#06b6d4'}}>▼</span>
              </div>

              {mostrarDropdownCat && (
                <div style={{position:'absolute',top:'100%',left:0,right:0,background:'#1e293b',border:'1px solid #0891b2',borderRadius:'8px',zIndex:999,boxShadow:'0 8px 24px #00000060',maxHeight:'280px',overflowY:'auto'}}>

                  {categorias.map(c => (
                    <div key={c.id}
                      style={{display:'flex',alignItems:'center',padding:'8px 12px',borderBottom:'1px solid #334155'}}
                      onMouseEnter={e => e.currentTarget.style.background='#0891b220'}
                      onMouseLeave={e => e.currentTarget.style.background='transparent'}>

                      {editCategoria === c.id ? (
                        <>
                          <input
                            value={editCategoriaValor}
                            onChange={e => setEditCategoriaValor(e.target.value.toUpperCase())}
                            style={{...inputStyle, flex:1, padding:'4px 8px', fontSize:'12px'}}
                            autoFocus
                            onClick={e => e.stopPropagation()}
                          />
                          <button onClick={(e) => { e.stopPropagation(); guardarEditCategoria(c.id); }}
                            style={{background:'#00C853',border:'none',borderRadius:'4px',padding:'4px 8px',color:'#fff',cursor:'pointer',fontSize:'12px',marginLeft:'6px'}}>✅</button>
                          <button onClick={(e) => { e.stopPropagation(); setEditCategoria(null); }}
                            style={{background:'#334155',border:'none',borderRadius:'4px',padding:'4px 8px',color:'#fff',cursor:'pointer',fontSize:'12px',marginLeft:'4px'}}>✖</button>
                        </>
                      ) : (
                        <>
                          <span
                            onClick={() => { setForm({...form, categoria: c.nombre}); setMostrarDropdownCat(false); }}
                            style={{flex:1, fontSize:'13px', color:'#e2e8f0', cursor:'pointer'}}>
                            {c.nombre}
                          </span>
                          <button onClick={(e) => { e.stopPropagation(); setEditCategoria(c.id); setEditCategoriaValor(c.nombre); }}
                            style={{background:'transparent',border:'none',color:'#06b6d4',cursor:'pointer',fontSize:'13px',padding:'0 4px'}}>✏️</button>
                          <button onClick={(e) => { e.stopPropagation(); eliminarCategoria(c.id); }}
                            style={{background:'transparent',border:'none',color:'#ff4444',cursor:'pointer',fontSize:'13px',padding:'0 4px'}}>🗑️</button>
                        </>
                      )}
                    </div>
                  ))}

                  {/* Agregar nueva */}
                  <div style={{padding:'10px 12px',display:'flex',gap:'6px',borderTop:'2px solid #0891b240'}}>
                    <input
                      value={nuevaCategoria}
                      onChange={e => setNuevaCategoria(e.target.value.toUpperCase())}
                      placeholder="+ Nueva categoría..."
                      style={{...inputStyle, flex:1, padding:'6px 8px', fontSize:'12px'}}
                      onClick={e => e.stopPropagation()}
                      onKeyDown={e => { if(e.key === 'Enter') { e.stopPropagation(); agregarCategoria(); }}}
                    />
                    <button onClick={(e) => { e.stopPropagation(); agregarCategoria(); }}
                      style={{background:'linear-gradient(135deg,#0891b2,#06b6d4)',border:'none',borderRadius:'6px',padding:'6px 12px',color:'#fff',cursor:'pointer',fontSize:'12px',whiteSpace:'nowrap'}}>
                      + Agregar
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* PRECIO VENTA */}
            <div>
              <label style={{fontSize:'12px',color:'#06b6d4',display:'block',marginBottom:'6px'}}>Precio venta * ($)</label>
              <input
                value={form.precio_venta}
                onChange={e => handlePrecio('precio_venta', e.target.value)}
                placeholder="0.00"
                inputMode="decimal"
                style={inputStyle}
              />
            </div>

            {/* PRECIO COMPRA */}
            <div>
              <label style={{fontSize:'12px',color:'#06b6d4',display:'block',marginBottom:'6px'}}>Precio compra ($)</label>
              <input
                value={form.precio_compra}
                onChange={e => handlePrecio('precio_compra', e.target.value)}
                placeholder="0.00"
                inputMode="decimal"
                style={inputStyle}
              />
            </div>

            {/* STOCK ACTUAL */}
            <div>
              <label style={{fontSize:'12px',color:'#06b6d4',display:'block',marginBottom:'6px'}}>Stock actual *</label>
              <input
                value={form.stock_actual}
                onChange={e => handlePrecio('stock_actual', e.target.value)}
                placeholder="0"
                inputMode="numeric"
                style={inputStyle}
              />
            </div>

            {/* STOCK MÍNIMO */}
            <div>
              <label style={{fontSize:'12px',color:'#06b6d4',display:'block',marginBottom:'6px'}}>Stock mínimo *</label>
              <input
                value={form.stock_minimo}
                onChange={e => handlePrecio('stock_minimo', e.target.value)}
                placeholder="5"
                inputMode="numeric"
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{display:'flex',gap:'8px',justifyContent:'flex-end'}}>
            <button onClick={() => { setMostrarForm(false); setForm(VACIO); setEditId(null); setErrores(''); setMostrarDropdownCat(false); }}
              style={{padding:'8px 16px',borderRadius:'6px',border:'1px solid #334155',background:'transparent',color:'#e2e8f0',cursor:'pointer'}}>
              Cancelar
            </button>
            <button onClick={guardar}
              style={{padding:'8px 16px',borderRadius:'6px',border:'none',background:'linear-gradient(135deg,#0891b2,#06b6d4)',color:'#fff',fontWeight:'500',cursor:'pointer'}}>
              💾 Guardar
            </button>
          </div>
        </div>
      )}

      <div style={{width:'100%',overflowX:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
          <thead>
            <tr style={{background:'#1e293b'}}>
              {['Nombre','Categoría','Precio venta','Stock','Acciones'].map(h => (
                <th key={h} style={{padding:'12px',textAlign:'left',color:'#06b6d4',borderBottom:'2px solid #0891b2',whiteSpace:'nowrap'}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr><td colSpan={5} style={{padding:'20px',textAlign:'center',color:'#94a3b8'}}>No hay productos registrados.</td></tr>
            ) : (
              filtrados.map(p => (
                <tr key={p.id} style={{borderBottom:'1px solid #1e293b'}}>
                  <td style={{padding:'12px',color:'#e2e8f0',fontWeight:'500'}}>{p.nombre}</td>
                  <td style={{padding:'12px'}}>
                    <span style={{background:'#0891b220',color:'#06b6d4',padding:'3px 10px',borderRadius:'20px',fontSize:'11px',fontWeight:'500'}}>
                      {p.categoria}
                    </span>
                  </td>
                  <td style={{padding:'12px',color:'#06b6d4',fontWeight:'500'}}>${parseFloat(p.precio_venta).toFixed(2)}</td>
                  <td style={{padding:'12px',fontWeight:'500',color: p.stock_actual <= p.stock_minimo ? '#ff4444' : '#00C853'}}>
                    {p.stock_actual} u.
                  </td>
                  <td style={{padding:'12px'}}>
                    <div style={{display:'flex',gap:'6px'}}>
                      <button onClick={() => editar(p)}
                        style={{padding:'5px 12px',borderRadius:'5px',border:'1px solid #0891b2',background:'transparent',color:'#06b6d4',cursor:'pointer',fontSize:'12px'}}>
                        ✏️ Editar
                      </button>
                      <button onClick={() => eliminar(p.id)}
                        style={{padding:'5px 12px',borderRadius:'5px',border:'1px solid #ff4444',background:'transparent',color:'#ff4444',cursor:'pointer',fontSize:'12px'}}>
                        🗑️ Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}