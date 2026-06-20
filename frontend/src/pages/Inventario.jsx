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
    if (!nuevaCategoria.trim()) { setMensajeCat('⚠️ Escribe un nombre de categoría.'); return; }
    try {
      const res = await api.post('/categorias', { nombre: nuevaCategoria });
      if (res.ok) {
        setNuevaCategoria('');
        cargarCategorias();
        setMensajeCat('✅ Categoría agregada.');
      } else {
        // Antes esto se ignoraba y el botón parecía "no funcionar"
        setMensajeCat('❌ No se pudo agregar: ' + (res.mensaje || 'error del servidor.'));
      }
    } catch (e) {
      setMensajeCat('❌ Error de conexión con el servidor.');
    }
    setTimeout(() => setMensajeCat(''), 4000);
  };

  const guardarEditCategoria = async (id) => {
    if (!editCategoriaValor.trim()) return;
    const res = await api.put(`/categorias/${id}`, { nombre: editCategoriaValor });
    if (res.ok) { setEditCategoria(null); cargarCategorias(); }
  };

  const eliminarCategoria = async (id) => {
    if (!confirm('¿Eliminar esta categoría?')) return;
    const res = await api.delete(`/categorias/${id}`);
    if (res.ok) cargarCategorias();
  };

  const handleNombre = (e) => {
  const val = e.target.value;
  const palabras = val.split(' ');
  const formateado = palabras.map(p => 
    p.length > 0 ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : ''
  ).join(' ');
  setForm({...form, nombre: formateado});
};

  const handlePrecio = (campo, valor) => {
    if (/^\d*\.?\d*$/.test(valor)) setForm({...form, [campo]: valor});
  };

  const nombresSugeridos = productos
    .map(p => p.nombre)
    .filter(n => form.nombre.length > 1 && n.toLowerCase().startsWith(form.nombre.toLowerCase()) && n.toLowerCase() !== form.nombre.toLowerCase());

  const filtrados = Array.isArray(productos) ? productos.filter(p =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  ) : [];

  const inputStyle = {
    width:'100%', padding:'9px 12px', borderRadius:'6px',
    border:'1px solid #BBDEFB', background:'#fff',
    color:'#333', boxSizing:'border-box', fontSize:'13px'
  };

  return (
    <div style={{background:'#f8f9fa',minHeight:'100vh',width:'100%',padding:'20px',fontFamily:'sans-serif',boxSizing:'border-box'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
        <h1 style={{color:'#1565C0',fontSize:'22px',margin:0}}>📦 Inventario — Tienda Genovesa</h1>
        <button onClick={() => { setForm(VACIO); setEditId(null); setMostrarForm(true); setErrores(''); }}
          style={{background:'#1565C0',border:'none',borderRadius:'8px',padding:'10px 18px',fontWeight:'500',cursor:'pointer',color:'#fff',fontSize:'13px'}}>
          + Nuevo producto
        </button>
      </div>

      <input placeholder="🔍 Buscar producto..."
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
        style={{width:'100%',padding:'10px 12px',borderRadius:'8px',border:'1px solid #BBDEFB',background:'#fff',color:'#333',marginBottom:'16px',fontSize:'14px',boxSizing:'border-box'}}
      />

      {mostrarForm && (
        <div style={{background:'#fff',border:'0.5px solid #BBDEFB',borderRadius:'12px',padding:'20px',marginBottom:'16px',boxShadow:'0 1px 4px #00000010'}}>
          <h2 style={{color:'#1565C0',marginBottom:'14px',fontSize:'16px'}}>
            {editId ? '✏️ Editar producto' : '➕ Nuevo producto'}
          </h2>

          {errores && (
            <div style={{background:'#FFEBEE',border:'1px solid #FFCDD2',borderRadius:'8px',padding:'10px 14px',marginBottom:'12px',color:'#C62828',fontSize:'13px'}}>
              {errores}
            </div>
          )}

          {mensajeCat && (
            <div style={{background:'#E8F5E9',border:'1px solid #C8E6C9',borderRadius:'6px',padding:'8px 12px',marginBottom:'12px',color:'#2E7D32',fontSize:'13px'}}>
              {mensajeCat}
            </div>
          )}

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'14px'}}>

            <div style={{position:'relative'}}>
              <label style={{fontSize:'12px',color:'#1565C0',display:'block',marginBottom:'6px'}}>Nombre *</label>
              <input value={form.nombre} onChange={handleNombre}
                placeholder="Ej: Galletas Oreo" style={inputStyle} autoComplete="off" />
              {nombresSugeridos.length > 0 && (
                <div style={{position:'absolute',top:'100%',left:0,right:0,background:'#fff',border:'1px solid #BBDEFB',borderRadius:'0 0 8px 8px',zIndex:99,boxShadow:'0 4px 12px #00000020'}}>
                  {nombresSugeridos.slice(0,5).map(s => (
                    <div key={s} onClick={() => setForm({...form, nombre: s})}
                      style={{padding:'8px 12px',cursor:'pointer',fontSize:'13px',color:'#333',borderBottom:'0.5px solid #e0e0e0'}}
                      onMouseEnter={e => e.currentTarget.style.background='#E3F2FD'}
                      onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                      🔍 {s}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{position:'relative'}}>
              <label style={{fontSize:'12px',color:'#1565C0',display:'block',marginBottom:'6px'}}>Categoría *</label>
              <div onClick={() => setMostrarDropdownCat(!mostrarDropdownCat)}
                style={{...inputStyle, cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <span style={{color: form.categoria ? '#333' : '#999'}}>
                  {form.categoria || 'Selecciona una categoría'}
                </span>
                <span style={{color:'#1565C0'}}>▼</span>
              </div>

              {mostrarDropdownCat && (
                <div style={{position:'absolute',top:'100%',left:0,right:0,background:'#fff',border:'1px solid #BBDEFB',borderRadius:'8px',zIndex:999,boxShadow:'0 8px 24px #00000020',maxHeight:'280px',overflowY:'auto'}}>
                  {categorias.map(c => (
                    <div key={c.id} style={{display:'flex',alignItems:'center',padding:'8px 12px',borderBottom:'0.5px solid #e0e0e0'}}
                      onMouseEnter={e => e.currentTarget.style.background='#E3F2FD'}
                      onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                      {editCategoria === c.id ? (
                        <>
                          <input value={editCategoriaValor}
                            onChange={e => setEditCategoriaValor(e.target.value.toUpperCase())}
                            style={{...inputStyle, flex:1, padding:'4px 8px', fontSize:'12px'}}
                            autoFocus onClick={e => e.stopPropagation()} />
                          <button onClick={(e) => { e.stopPropagation(); guardarEditCategoria(c.id); }}
                            style={{background:'#2E7D32',border:'none',borderRadius:'4px',padding:'4px 8px',color:'#fff',cursor:'pointer',fontSize:'12px',marginLeft:'6px'}}>✅</button>
                          <button onClick={(e) => { e.stopPropagation(); setEditCategoria(null); }}
                            style={{background:'#e0e0e0',border:'none',borderRadius:'4px',padding:'4px 8px',color:'#333',cursor:'pointer',fontSize:'12px',marginLeft:'4px'}}>✖</button>
                        </>
                      ) : (
                        <>
                          <span onClick={() => { setForm({...form, categoria: c.nombre}); setMostrarDropdownCat(false); }}
                            style={{flex:1, fontSize:'13px', color:'#333', cursor:'pointer'}}>
                            {c.nombre}
                          </span>
                          <button onClick={(e) => { e.stopPropagation(); setEditCategoria(c.id); setEditCategoriaValor(c.nombre); }}
                            style={{background:'transparent',border:'none',color:'#1565C0',cursor:'pointer',fontSize:'13px',padding:'0 4px'}}>✏️</button>
                          <button onClick={(e) => { e.stopPropagation(); eliminarCategoria(c.id); }}
                            style={{background:'transparent',border:'none',color:'#C62828',cursor:'pointer',fontSize:'13px',padding:'0 4px'}}>🗑️</button>
                        </>
                      )}
                    </div>
                  ))}
                  <div style={{padding:'10px 12px',display:'flex',gap:'6px',borderTop:'1px solid #BBDEFB'}}>
                    <input value={nuevaCategoria}
                      onChange={e => setNuevaCategoria(e.target.value.toUpperCase())}
                      placeholder="+ Nueva categoría..."
                      style={{...inputStyle, flex:1, padding:'6px 8px', fontSize:'12px'}}
                      onClick={e => e.stopPropagation()}
                      onKeyDown={e => { if(e.key === 'Enter') { e.stopPropagation(); agregarCategoria(); }}}
                    />
                    <button onClick={(e) => { e.stopPropagation(); agregarCategoria(); }}
                      style={{background:'#1565C0',border:'none',borderRadius:'6px',padding:'6px 12px',color:'#fff',cursor:'pointer',fontSize:'12px',whiteSpace:'nowrap'}}>
                      + Agregar
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label style={{fontSize:'12px',color:'#1565C0',display:'block',marginBottom:'6px'}}>Precio venta * ($)</label>
              <input value={form.precio_venta}
                onChange={e => handlePrecio('precio_venta', e.target.value)}
                placeholder="0.00" inputMode="decimal" style={inputStyle} />
            </div>

            <div>
              <label style={{fontSize:'12px',color:'#1565C0',display:'block',marginBottom:'6px'}}>Precio compra ($)</label>
              <input value={form.precio_compra}
                onChange={e => handlePrecio('precio_compra', e.target.value)}
                placeholder="0.00" inputMode="decimal" style={inputStyle} />
            </div>

            <div>
              <label style={{fontSize:'12px',color:'#1565C0',display:'block',marginBottom:'6px'}}>Stock actual *</label>
              <input value={form.stock_actual}
                onChange={e => handlePrecio('stock_actual', e.target.value)}
                placeholder="0" inputMode="numeric" style={inputStyle} />
            </div>

            <div>
              <label style={{fontSize:'12px',color:'#1565C0',display:'block',marginBottom:'6px'}}>Stock mínimo *</label>
              <input value={form.stock_minimo}
                onChange={e => handlePrecio('stock_minimo', e.target.value)}
                placeholder="5" inputMode="numeric" style={inputStyle} />
            </div>
          </div>

          <div style={{display:'flex',gap:'8px',justifyContent:'flex-end'}}>
            <button onClick={() => { setMostrarForm(false); setForm(VACIO); setEditId(null); setErrores(''); setMostrarDropdownCat(false); }}
              style={{padding:'8px 16px',borderRadius:'6px',border:'1px solid #e0e0e0',background:'#fff',color:'#666',cursor:'pointer'}}>
              Cancelar
            </button>
            <button onClick={guardar}
              style={{padding:'8px 16px',borderRadius:'6px',border:'none',background:'#1565C0',color:'#fff',fontWeight:'500',cursor:'pointer'}}>
              💾 Guardar
            </button>
          </div>
        </div>
      )}

      <div style={{background:'#fff',borderRadius:'12px',border:'0.5px solid #e0e0e0',boxShadow:'0 1px 4px #00000010',overflowX:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
          <thead>
            <tr style={{background:'#E3F2FD'}}>
              {['Nombre','Categoría','Precio venta','Stock','Acciones'].map(h => (
                <th key={h} style={{padding:'12px',textAlign:'left',color:'#1565C0',borderBottom:'1px solid #BBDEFB',whiteSpace:'nowrap'}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr><td colSpan={5} style={{padding:'20px',textAlign:'center',color:'#999'}}>No hay productos registrados.</td></tr>
            ) : (
              filtrados.map(p => (
                <tr key={p.id} style={{borderBottom:'0.5px solid #e0e0e0'}}>
                  <td style={{padding:'12px',color:'#333',fontWeight:'500'}}>{p.nombre}</td>
                  <td style={{padding:'12px'}}>
                    <span style={{background:'#E3F2FD',color:'#1565C0',padding:'3px 10px',borderRadius:'20px',fontSize:'11px',fontWeight:'500'}}>
                      {p.categoria}
                    </span>
                  </td>
                  <td style={{padding:'12px',color:'#1565C0',fontWeight:'500'}}>${parseFloat(p.precio_venta).toFixed(2)}</td>
                  <td style={{padding:'12px',fontWeight:'500',color: p.stock_actual <= p.stock_minimo ? '#C62828' : '#2E7D32'}}>
                    {p.stock_actual} u.
                  </td>
                  <td style={{padding:'12px'}}>
                    <div style={{display:'flex',gap:'6px'}}>
                      <button onClick={() => editar(p)}
                        style={{padding:'5px 12px',borderRadius:'5px',border:'1px solid #BBDEFB',background:'#E3F2FD',color:'#1565C0',cursor:'pointer',fontSize:'12px'}}>
                        ✏️ Editar
                      </button>
                      <button onClick={() => eliminar(p.id)}
                        style={{padding:'5px 12px',borderRadius:'5px',border:'1px solid #FFCDD2',background:'#FFEBEE',color:'#C62828',cursor:'pointer',fontSize:'12px'}}>
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