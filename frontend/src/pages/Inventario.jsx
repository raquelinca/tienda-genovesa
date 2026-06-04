import { useEffect, useState } from 'react';
import { api } from '../services/api';

const VACIO = {
  nombre:'', categoria:'', precio_venta:'',
  precio_compra:'', stock_actual:'', stock_minimo:'5'
};

export default function Inventario() {
  const [productos, setProductos] = useState([]);
  const [form, setForm] = useState(VACIO);
  const [editId, setEditId] = useState(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  const cargar = async () => {
    try {
      const data = await api.get('/productos');
      if (data.ok && Array.isArray(data.data)) setProductos(data.data);
      else setProductos([]);
    } catch { setProductos([]); }
  };

  useEffect(() => { cargar(); }, []);

  const [errores, setErrores] = useState('');

const guardar = async () => {
    if (!form.nombre.trim()) {
      setErrores('⚠️ El nombre es obligatorio.');
      return;
    }
    if (!form.categoria.trim()) {
      setErrores('⚠️ La categoría es obligatoria.');
      return;
    }
    if (!form.precio_venta || parseFloat(form.precio_venta) <= 0) {
      setErrores('⚠️ El precio de venta es obligatorio y debe ser mayor a 0.');
      return;
    }
    if (!form.stock_actual && form.stock_actual !== 0) {
      setErrores('⚠️ El stock actual es obligatorio.');
      return;
    }
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

  const handleNombre = (e) => {
    const val = e.target.value;
    const conMayuscula = val.replace(/\b\w/g, l => l.toUpperCase());
    setForm({...form, nombre: conMayuscula});
  };

  const handleCategoria = (e) => {
    setForm({...form, categoria: e.target.value.toUpperCase()});
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
    width:'100%', padding:'8px', borderRadius:'6px',
    border:'1px solid #334155', background:'#0f172a',
    color:'#e2e8f0', boxSizing:'border-box', fontSize:'13px'
  };

  return (
    <div style={{background:'#0f172a',minHeight:'100vh',padding:'20px',color:'#fff',fontFamily:'sans-serif'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
        <h1 style={{color:'#06b6d4',fontSize:'22px'}}>📦 Inventario — Tienda Genovesa</h1>
        <button onClick={() => { setForm(VACIO); setEditId(null); setMostrarForm(true); }}
          style={{background:'linear-gradient(135deg,#0891b2,#06b6d4)',border:'none',borderRadius:'8px',padding:'10px 18px',fontWeight:'500',cursor:'pointer',color:'#fff'}}>
          + Nuevo producto
        </button>
      </div>

      <input placeholder="🔍 Buscar producto..."
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
        style={{width:'100%',padding:'10px',borderRadius:'8px',border:'1px solid #334155',background:'#1e293b',color:'#e2e8f0',marginBottom:'16px',fontSize:'14px',boxSizing:'border-box'}}
      />

      {mostrarForm && (
        <div style={{background:'#1e293b',border:'1px solid #0891b240',borderRadius:'12px',padding:'20px',marginBottom:'16px'}}>
          <h2 style={{color:'#06b6d4',marginBottom:'14px',fontSize:'16px'}}>
            {errores && (
            <div style={{background:'#ff444420',border:'1px solid #ff444440',borderRadius:'8px',padding:'10px 14px',marginBottom:'12px',color:'#ff6666',fontSize:'13px'}}>
             {errores}
            </div>
          )}
            
            {editId ? '✏️ Editar producto' : '➕ Nuevo producto'}
          </h2>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'14px'}}>

            {/* NOMBRE con autocompletado */}
            <div style={{position:'relative'}}>
              <label style={{fontSize:'11px',color:'#06b6d4',display:'block',marginBottom:'4px'}}>Nombre *</label>
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
                      style={{padding:'8px 12px',cursor:'pointer',fontSize:'13px',color:'#e2e8f0',borderBottom:'1px solid #334155',transition:'background 0.15s'}}
                      onMouseEnter={e => e.currentTarget.style.background='#0891b230'}
                      onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                      🔍 {s}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* CATEGORÍA en mayúsculas */}
            <div>
              <label style={{fontSize:'11px',color:'#06b6d4',display:'block',marginBottom:'4px'}}>Categoría *</label>
              <input
                value={form.categoria}
                onChange={handleCategoria}
                placeholder="Ej: SNACKS"
                style={inputStyle}
              />
            </div>

            {/* PRECIO VENTA solo números */}
            <div>
              <label style={{fontSize:'11px',color:'#06b6d4',display:'block',marginBottom:'4px'}}>Precio venta *</label>
              <input
                value={form.precio_venta}
                onChange={e => handlePrecio('precio_venta', e.target.value)}
                placeholder="0.00"
                inputMode="decimal"
                style={inputStyle}
              />
            </div>

            {/* PRECIO COMPRA solo números */}
            <div>
              <label style={{fontSize:'11px',color:'#06b6d4',display:'block',marginBottom:'4px'}}>Precio compra</label>
              <input
                value={form.precio_compra}
                onChange={e => handlePrecio('precio_compra', e.target.value)}
                placeholder="0.00"
                inputMode="decimal"
                style={inputStyle}
              />
            </div>

            {/* STOCK ACTUAL solo números */}
            <div>
              <label style={{fontSize:'11px',color:'#06b6d4',display:'block',marginBottom:'4px'}}>Stock actual *</label>
              <input
                value={form.stock_actual}
                onChange={e => handlePrecio('stock_actual', e.target.value)}
                placeholder="0"
                inputMode="numeric"
                style={inputStyle}
              />
            </div>

            {/* STOCK MÍNIMO solo números */}
            <div>
              <label style={{fontSize:'11px',color:'#06b6d4',display:'block',marginBottom:'4px'}}>Stock mínimo *</label>
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
            <button onClick={() => { setMostrarForm(false); setForm(VACIO); setEditId(null); }}
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

      <table style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
        <thead>
          <tr style={{background:'#1e293b'}}>
            {['Nombre','Categoría','Precio venta','Stock','Acciones'].map(h => (
              <th key={h} style={{padding:'10px',textAlign:'left',color:'#06b6d4',borderBottom:'2px solid #0891b2',fontSize:'13px'}}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtrados.length === 0 ? (
            <tr><td colSpan={5} style={{padding:'20px',textAlign:'center',color:'#94a3b8'}}>No hay productos registrados.</td></tr>
          ) : (
            filtrados.map(p => (
              <tr key={p.id} style={{borderBottom:'1px solid #1e293b'}}>
                <td style={{padding:'10px',color:'#e2e8f0',fontWeight:'500'}}>{p.nombre}</td>
                <td style={{padding:'10px',color:'#94a3b8'}}>{p.categoria}</td>
                <td style={{padding:'10px',color:'#06b6d4',fontWeight:'500'}}>${parseFloat(p.precio_venta).toFixed(2)}</td>
                <td style={{padding:'10px',fontWeight:'500',color: p.stock_actual <= p.stock_minimo ? '#ff4444' : '#00C853'}}>
                  {p.stock_actual} u.
                </td>
                <td style={{padding:'10px'}}>
                  <div style={{display:'flex',gap:'6px'}}>
                    <button onClick={() => editar(p)}
                      style={{padding:'4px 12px',borderRadius:'5px',border:'1px solid #0891b2',background:'transparent',color:'#06b6d4',cursor:'pointer',fontSize:'12px'}}>
                      ✏️ Editar
                    </button>
                    <button onClick={() => eliminar(p.id)}
                      style={{padding:'4px 12px',borderRadius:'5px',border:'1px solid #ff4444',background:'transparent',color:'#ff4444',cursor:'pointer',fontSize:'12px'}}>
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
  );
}