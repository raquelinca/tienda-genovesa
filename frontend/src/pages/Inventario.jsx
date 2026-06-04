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

  const guardar = async () => {
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

  const handleCategoria = (e) => {
    setForm({...form, categoria: e.target.value.toUpperCase()});
  };

  const handlePrecio = (campo, valor) => {
    if (/^\d*\.?\d*$/.test(valor)) setForm({...form, [campo]: valor});
  };

  const filtrados = Array.isArray(productos) ? productos.filter(p =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  ) : [];

  const inputStyle = {width:'100%',padding:'8px',borderRadius:'6px',border:'1px solid #334155',background:'#0f172a',color:'#e2e8f0'};

  return (
    <div style={{background:'#0f172a',minHeight:'100vh',padding:'20px',color:'#fff',fontFamily:'sans-serif'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
        <h1 style={{color:'#5898e0',fontSize:'22px'}}>📦 Inventario — Tienda Genovesa</h1>
        <button onClick={() => { setForm(VACIO); setMostrarForm(true); }}
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
          <h2 style={{color:'#36d406',marginBottom:'14px'}}>{editId ? 'Editar producto' : 'Nuevo producto'}</h2>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'14px'}}>
            <div>
              <label style={{fontSize:'11px',color:'#36d406',display:'block',marginBottom:'4px'}}>Nombre</label>
              <input value={form.nombre}
                onChange={e => setForm({...form, nombre: e.target.value})}
                style={inputStyle} />
            </div>
            <div>
              <label style={{fontSize:'11px',color:'#36d406',display:'block',marginBottom:'4px'}}>Categoria</label>
              <input value={form.categoria}
                onChange={handleCategoria}
                placeholder="Ej: SNACKS"
                style={inputStyle} />
            </div>
            <div>
              <label style={{fontSize:'11px',color:'#36d406',display:'block',marginBottom:'4px'}}>Precio Venta</label>
              <input value={form.precio_venta}
                onChange={e => handlePrecio('precio_venta', e.target.value)}
                inputMode="decimal"
                style={inputStyle} />
            </div>
            <div>
              <label style={{fontSize:'11px',color:'#36d406',display:'block',marginBottom:'4px'}}>Precio Compra</label>
              <input value={form.precio_compra}
                onChange={e => handlePrecio('precio_compra', e.target.value)}
                inputMode="decimal"
                style={inputStyle} />
            </div>
            <div>
              <label style={{fontSize:'11px',color:'#36d406',display:'block',marginBottom:'4px'}}>Stock Actual</label>
              <input value={form.stock_actual}
                onChange={e => handlePrecio('stock_actual', e.target.value)}
                inputMode="numeric"
                style={inputStyle} />
            </div>
            <div>
              <label style={{fontSize:'11px',color:'#36d406',display:'block',marginBottom:'4px'}}>Stock Mínimo</label>
              <input value={form.stock_minimo}
                onChange={e => handlePrecio('stock_minimo', e.target.value)}
                inputMode="numeric"
                style={inputStyle} />
            </div>
          </div>
          <div style={{display:'flex',gap:'8px',justifyContent:'flex-end'}}>
            <button onClick={() => setMostrarForm(false)}
              style={{padding:'8px 16px',borderRadius:'6px',border:'1px solid #334155',background:'transparent',color:'#e2e8f0',cursor:'pointer'}}>
              Cancelar
            </button>
            <button onClick={guardar}
              style={{padding:'8px 16px',borderRadius:'6px',border:'none',background:'linear-gradient(135deg,#0891b2,#06b6d4)',color:'#fff',fontWeight:'500',cursor:'pointer'}}>
              Guardar
            </button>
          </div>
        </div>
      )}

      <table style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
        <thead>
          <tr style={{background:'#1e293b'}}>
            {['Nombre','Categoría','Precio','Stock','Acciones'].map(h => (
              <th key={h} style={{padding:'10px',textAlign:'left',color:'#06b6d4',borderBottom:'2px solid #0891b2'}}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtrados.map(p => (
            <tr key={p.id} style={{borderBottom:'1px solid #1e293b'}}>
              <td style={{padding:'10px',color:'#e2e8f0'}}>{p.nombre}</td>
              <td style={{padding:'10px',color:'#94a3b8'}}>{p.categoria}</td>
              <td style={{padding:'10px',color:'#06b6d4'}}>${p.precio_venta}</td>
              <td style={{padding:'10px',color: p.stock_actual <= p.stock_minimo ? '#ff4444' : '#00C853'}}>
                {p.stock_actual} u.
              </td>
              <td style={{padding:'10px',display:'flex',gap:'6px'}}>
                <button onClick={() => editar(p)}
                  style={{padding:'4px 10px',borderRadius:'5px',border:'1px solid #0891b2',background:'transparent',color:'#06b6d4',cursor:'pointer'}}>
                  Editar
                </button>
                <button onClick={() => eliminar(p.id)}
                  style={{padding:'4px 10px',borderRadius:'5px',border:'1px solid #ff4444',background:'transparent',color:'#ff4444',cursor:'pointer'}}>
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}