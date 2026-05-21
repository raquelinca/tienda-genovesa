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
    const data = await api.get('/productos');
    if (data.ok) setProductos(data.data);
  };

  useEffect(() => { cargar(); }, []);

  const guardar = async () => {
    if (editId) await api.put(`/productos/${editId}`, form);
    else await api.post('/productos', form);
    setForm(VACIO); setEditId(null);
    setMostrarForm(false); cargar();
  };

  const editar = (p) => {
    setForm(p); setEditId(p.id);
    setMostrarForm(true);
  };

  const eliminar = async (id) => {
    if (confirm('¿Eliminar este producto?')) {
      await api.delete(`/productos/${id}`);
      cargar();
    }
  };

  const filtrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div style={{background:'#1a1a2e',minHeight:'100vh',padding:'20px',color:'#fff',fontFamily:'sans-serif'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
        <h1 style={{color:'#FFD600',fontSize:'22px'}}>📦 Inventario — Tienda Genovesa</h1>
        <button onClick={() => { setForm(VACIO); setMostrarForm(true); }}
          style={{background:'#FFD600',border:'none',borderRadius:'8px',padding:'10px 18px',fontWeight:'500',cursor:'pointer'}}>
          + Nuevo producto
        </button>
      </div>

      <input placeholder="🔍 Buscar producto..."
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
        style={{width:'100%',padding:'10px',borderRadius:'8px',border:'1px solid #ffffff20',background:'#16213e',color:'#fff',marginBottom:'16px',fontSize:'14px'}}
      />

      {mostrarForm && (
        <div style={{background:'#0f172a',border:'1px solid #FFD60040',borderRadius:'12px',padding:'20px',marginBottom:'16px'}}>
          <h2 style={{color:'#FFD600',marginBottom:'14px'}}>{editId ? 'Editar producto' : 'Nuevo producto'}</h2>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'14px'}}>
            {['nombre','categoria','precio_venta','precio_compra','stock_actual','stock_minimo'].map(campo => (
              <div key={campo}>
                <label style={{fontSize:'11px',color:'#FFD600',display:'block',marginBottom:'4px'}}>{campo.replace('_',' ')}</label>
                <input value={form[campo]}
                  onChange={e => setForm({...form,[campo]:e.target.value})}
                  style={{width:'100%',padding:'8px',borderRadius:'6px',border:'1px solid #ffffff20',background:'#16213e',color:'#fff'}}
                />
              </div>
            ))}
          </div>
          <div style={{display:'flex',gap:'8px',justifyContent:'flex-end'}}>
            <button onClick={() => setMostrarForm(false)}
              style={{padding:'8px 16px',borderRadius:'6px',border:'1px solid #ffffff20',background:'transparent',color:'#fff',cursor:'pointer'}}>
              Cancelar
            </button>
            <button onClick={guardar}
              style={{padding:'8px 16px',borderRadius:'6px',border:'none',background:'#FFD600',fontWeight:'500',cursor:'pointer'}}>
              Guardar
            </button>
          </div>
        </div>
      )}

      <table style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
        <thead>
          <tr style={{background:'#16213e'}}>
            <th style={{padding:'10px',textAlign:'left',color:'#FFD600',borderBottom:'2px solid #FFD600'}}>Nombre</th>
            <th style={{padding:'10px',textAlign:'left',color:'#FFD600',borderBottom:'2px solid #FFD600'}}>Categoría</th>
            <th style={{padding:'10px',textAlign:'left',color:'#FFD600',borderBottom:'2px solid #FFD600'}}>Precio</th>
            <th style={{padding:'10px',textAlign:'left',color:'#FFD600',borderBottom:'2px solid #FFD600'}}>Stock</th>
            <th style={{padding:'10px',textAlign:'left',color:'#FFD600',borderBottom:'2px solid #FFD600'}}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {filtrados.map(p => (
            <tr key={p.id} style={{borderBottom:'1px solid #ffffff10'}}>
              <td style={{padding:'10px'}}>{p.nombre}</td>
              <td style={{padding:'10px',color:'#ffffff60'}}>{p.categoria}</td>
              <td style={{padding:'10px',color:'#FFD600'}}>${p.precio_venta}</td>
              <td style={{padding:'10px',color: p.stock_actual <= p.stock_minimo ? '#ff4444' : '#00C853'}}>
                {p.stock_actual} u.
              </td>
              <td style={{padding:'10px',display:'flex',gap:'6px'}}>
                <button onClick={() => editar(p)}
                  style={{padding:'4px 10px',borderRadius:'5px',border:'1px solid #FFD600',background:'transparent',color:'#FFD600',cursor:'pointer'}}>
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