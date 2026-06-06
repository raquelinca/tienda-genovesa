import { useEffect, useState } from 'react';
import { api } from '../services/api';

export default function Reportes() {
  const [ventas, setVentas] = useState([]);
  const [productos, setProductos] = useState([]);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [filtroTipoPago, setFiltroTipoPago] = useState('todos');
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(false);

  const cargar = async () => {
    setCargando(true);
    try {
      const v = await api.get('/reportes/ventas');
      if (v.ok && Array.isArray(v.data)) setVentas(v.data);
      const p = await api.get('/productos');
      if (p.ok && Array.isArray(p.data)) {
        setProductos(p.data);
        const cats = [...new Set(p.data.map(x => x.categoria).filter(Boolean))];
        setCategorias(cats);
      }
    } catch { setVentas([]); }
    setCargando(false);
  };

  useEffect(() => { cargar(); }, []);

  const ventasFiltradas = ventas.filter(v => {
    const fecha = new Date(v.fecha);
    const desde = fechaInicio ? new Date(fechaInicio) : null;
    const hasta = fechaFin ? new Date(fechaFin + 'T23:59:59') : null;
    if (desde && fecha < desde) return false;
    if (hasta && fecha > hasta) return false;
    if (filtroTipoPago !== 'todos' && v.tipo_pago !== filtroTipoPago) return false;
    return true;
  });

  const totalVentas = ventasFiltradas.reduce((s, v) => s + parseFloat(v.total), 0);
  const productosFiltrados = filtroCategoria === 'todas'
    ? productos
    : productos.filter(p => p.categoria === filtroCategoria);

  const inputStyle = {
    padding:'8px 12px', borderRadius:'6px',
    border:'1px solid #BBDEFB', background:'#fff',
    color:'#333', fontSize:'13px', boxSizing:'border-box'
  };

  return (
    <div style={{background:'#f8f9fa',minHeight:'100vh',padding:'20px',fontFamily:'sans-serif'}}>
      <h1 style={{color:'#1565C0',fontSize:'22px',marginBottom:'20px'}}>📊 Reportes — Tienda Genovesa</h1>

      {/* Filtros */}
      <div style={{background:'#fff',borderRadius:'12px',padding:'20px',border:'0.5px solid #e0e0e0',boxShadow:'0 1px 4px #00000010',marginBottom:'20px'}}>
        <h2 style={{color:'#1565C0',fontSize:'15px',marginBottom:'16px'}}>🔍 Filtros de búsqueda</h2>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:'12px'}}>
          <div>
            <label style={{fontSize:'12px',color:'#1565C0',display:'block',marginBottom:'4px'}}>Fecha inicio</label>
            <input type="date" value={fechaInicio}
              onChange={e => setFechaInicio(e.target.value)}
              style={{...inputStyle, width:'100%'}} />
          </div>
          <div>
            <label style={{fontSize:'12px',color:'#1565C0',display:'block',marginBottom:'4px'}}>Fecha fin</label>
            <input type="date" value={fechaFin}
              onChange={e => setFechaFin(e.target.value)}
              style={{...inputStyle, width:'100%'}} />
          </div>
          <div>
            <label style={{fontSize:'12px',color:'#1565C0',display:'block',marginBottom:'4px'}}>Tipo de pago</label>
            <select value={filtroTipoPago} onChange={e => setFiltroTipoPago(e.target.value)}
              style={{...inputStyle, width:'100%'}}>
              <option value="todos">Todos</option>
              <option value="efectivo">Efectivo</option>
              <option value="credito">Crédito</option>
              <option value="transferencia">Transferencia</option>
            </select>
          </div>
          <div>
            <label style={{fontSize:'12px',color:'#1565C0',display:'block',marginBottom:'4px'}}>Categoría</label>
            <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}
              style={{...inputStyle, width:'100%'}}>
              <option value="todas">Todas</option>
              {categorias.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div style={{display:'flex',gap:'8px',marginTop:'12px'}}>
          <button onClick={() => { setFechaInicio(''); setFechaFin(''); setFiltroCategoria('todas'); setFiltroTipoPago('todos'); }}
            style={{padding:'8px 16px',borderRadius:'6px',border:'1px solid #e0e0e0',background:'#fff',color:'#666',cursor:'pointer',fontSize:'13px'}}>
            🔄 Limpiar filtros
          </button>
        </div>
      </div>

      {/* Resumen */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'12px',marginBottom:'20px'}}>
        <div style={{background:'#fff',borderRadius:'12px',padding:'16px',border:'0.5px solid #BBDEFB',boxShadow:'0 1px 4px #00000010'}}>
          <div style={{fontSize:'12px',color:'#666',marginBottom:'4px'}}>Total ventas</div>
          <div style={{fontSize:'24px',color:'#1565C0',fontWeight:'500'}}>${totalVentas.toFixed(2)}</div>
          <div style={{fontSize:'11px',color:'#999'}}>{ventasFiltradas.length} transacciones</div>
        </div>
        <div style={{background:'#fff',borderRadius:'12px',padding:'16px',border:'0.5px solid #C8E6C9',boxShadow:'0 1px 4px #00000010'}}>
          <div style={{fontSize:'12px',color:'#666',marginBottom:'4px'}}>Productos en inventario</div>
          <div style={{fontSize:'24px',color:'#2E7D32',fontWeight:'500'}}>{productosFiltrados.length}</div>
          <div style={{fontSize:'11px',color:'#999'}}>productos activos</div>
        </div>
        <div style={{background:'#fff',borderRadius:'12px',padding:'16px',border:'0.5px solid #FFE0B2',boxShadow:'0 1px 4px #00000010'}}>
          <div style={{fontSize:'12px',color:'#666',marginBottom:'4px'}}>Promedio por venta</div>
          <div style={{fontSize:'24px',color:'#E65100',fontWeight:'500'}}>
            ${ventasFiltradas.length > 0 ? (totalVentas / ventasFiltradas.length).toFixed(2) : '0.00'}
          </div>
          <div style={{fontSize:'11px',color:'#999'}}>por transacción</div>
        </div>
      </div>

      {/* Tabla de ventas */}
      <div style={{background:'#fff',borderRadius:'12px',border:'0.5px solid #e0e0e0',boxShadow:'0 1px 4px #00000010',marginBottom:'20px'}}>
        <div style={{padding:'16px',borderBottom:'1px solid #E3F2FD'}}>
          <h2 style={{color:'#1565C0',fontSize:'15px',margin:0}}>🧾 Historial de ventas</h2>
        </div>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
            <thead>
              <tr style={{background:'#E3F2FD'}}>
                {['#','Fecha','Total','Tipo pago','Estado'].map(h => (
                  <th key={h} style={{padding:'12px 10px',textAlign:'left',color:'#1565C0',borderBottom:'1px solid #BBDEFB'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr><td colSpan={5} style={{padding:'20px',textAlign:'center',color:'#999'}}>Cargando...</td></tr>
              ) : ventasFiltradas.length === 0 ? (
                <tr><td colSpan={5} style={{padding:'20px',textAlign:'center',color:'#999'}}>No hay ventas con los filtros seleccionados.</td></tr>
              ) : (
                ventasFiltradas.map(v => (
                  <tr key={v.id} style={{borderBottom:'0.5px solid #e0e0e0'}}>
                    <td style={{padding:'10px',color:'#666'}}>#{v.id}</td>
                    <td style={{padding:'10px',color:'#333'}}>{new Date(v.fecha).toLocaleDateString()} {new Date(v.fecha).toLocaleTimeString()}</td>
                    <td style={{padding:'10px',color:'#1565C0',fontWeight:'500'}}>${parseFloat(v.total).toFixed(2)}</td>
                    <td style={{padding:'10px'}}>
                      <span style={{background:'#E3F2FD',color:'#1565C0',padding:'3px 8px',borderRadius:'20px',fontSize:'11px'}}>
                        {v.tipo_pago}
                      </span>
                    </td>
                    <td style={{padding:'10px'}}>
                      <span style={{background: v.estado === 'completada' ? '#E8F5E9' : '#FFEBEE',
                        color: v.estado === 'completada' ? '#2E7D32' : '#C62828',
                        padding:'3px 8px',borderRadius:'20px',fontSize:'11px'}}>
                        {v.estado}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabla de inventario filtrado */}
      <div style={{background:'#fff',borderRadius:'12px',border:'0.5px solid #e0e0e0',boxShadow:'0 1px 4px #00000010'}}>
        <div style={{padding:'16px',borderBottom:'1px solid #E3F2FD'}}>
          <h2 style={{color:'#1565C0',fontSize:'15px',margin:0}}>📦 Inventario por categoría</h2>
        </div>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
            <thead>
              <tr style={{background:'#E3F2FD'}}>
                {['Nombre','Categoría','Precio venta','Stock actual','Estado'].map(h => (
                  <th key={h} style={{padding:'12px 10px',textAlign:'left',color:'#1565C0',borderBottom:'1px solid #BBDEFB'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {productosFiltrados.length === 0 ? (
                <tr><td colSpan={5} style={{padding:'20px',textAlign:'center',color:'#999'}}>No hay productos.</td></tr>
              ) : (
                productosFiltrados.map(p => (
                  <tr key={p.id} style={{borderBottom:'0.5px solid #e0e0e0'}}>
                    <td style={{padding:'10px',color:'#333',fontWeight:'500'}}>{p.nombre}</td>
                    <td style={{padding:'10px'}}>
                      <span style={{background:'#E3F2FD',color:'#1565C0',padding:'3px 8px',borderRadius:'20px',fontSize:'11px'}}>{p.categoria}</span>
                    </td>
                    <td style={{padding:'10px',color:'#1565C0',fontWeight:'500'}}>${parseFloat(p.precio_venta).toFixed(2)}</td>
                    <td style={{padding:'10px',fontWeight:'500',color: p.stock_actual <= p.stock_minimo ? '#C62828' : '#2E7D32'}}>
                      {p.stock_actual} u.
                    </td>
                    <td style={{padding:'10px'}}>
                      <span style={{
                        background: p.stock_actual === 0 ? '#FFEBEE' : p.stock_actual <= p.stock_minimo ? '#FFF3E0' : '#E8F5E9',
                        color: p.stock_actual === 0 ? '#C62828' : p.stock_actual <= p.stock_minimo ? '#E65100' : '#2E7D32',
                        padding:'3px 8px',borderRadius:'20px',fontSize:'11px'}}>
                        {p.stock_actual === 0 ? 'Sin stock' : p.stock_actual <= p.stock_minimo ? 'Stock bajo' : 'Normal'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}