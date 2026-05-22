import { useEffect, useState } from 'react';
import { api } from '../services/api';

export default function Ventas() {
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [tipoPago, setTipoPago] = useState('efectivo');
  const [mensaje, setMensaje] = useState('');

  const cargarProductos = async () => {
    try {
      const data = await api.get('/productos');
      if (data.ok && Array.isArray(data.data)) setProductos(data.data);
    } catch { setProductos([]); }
  };

  useEffect(() => { cargarProductos(); }, []);

  const agregar = (p) => {
    setCarrito(prev => {
      const existe = prev.find(i => i.id === p.id);
      if (existe) {
        if (existe.cantidad >= p.stock_actual) return prev;
        return prev.map(i => i.id === p.id ? {...i, cantidad: i.cantidad + 1} : i);
      }
      return [...prev, {...p, cantidad: 1}];
    });
  };

  const cambiarCantidad = (id, delta) => {
    setCarrito(prev => prev
      .map(i => i.id === id ? {...i, cantidad: i.cantidad + delta} : i)
      .filter(i => i.cantidad > 0)
    );
  };

  const total = carrito.reduce((s, i) => s + i.precio_venta * i.cantidad, 0);

  const confirmar = async () => {
    if (carrito.length === 0) return;
    try {
      const res = await api.post('/ventas', {
        tipo_pago: tipoPago,
        items: carrito.map(i => ({
          producto_id: i.id,
          cantidad: i.cantidad,
          precio_unitario: i.precio_venta
        }))
      });
      if (res.ok) {
        setMensaje('✅ ¡Venta registrada con éxito!');
        setCarrito([]);
        cargarProductos();
        setTimeout(() => setMensaje(''), 3000);
      }
    } catch { setMensaje('❌ Error al registrar la venta'); }
  };

  const filtrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) && p.stock_actual > 0
  );

  return (
    <div style={{background:'#1a1a2e',minHeight:'100vh',padding:'20px',color:'#fff',fontFamily:'sans-serif'}}>
      <h1 style={{color:'#FFD600',fontSize:'20px',marginBottom:'16px'}}>🛍️ Ventas — Tienda Genovesa</h1>

      {mensaje && (
        <div style={{background:'#00C85320',border:'1px solid #00C85350',borderRadius:'8px',padding:'12px',marginBottom:'16px',color:'#00C853',fontSize:'14px'}}>
          {mensaje}
        </div>
      )}

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
        <div style={{background:'#16213e',borderRadius:'12px',padding:'16px',border:'1px solid #ffffff15'}}>
          <div style={{color:'#FFD600',fontSize:'14px',fontWeight:'500',marginBottom:'12px'}}>🛍️ Productos disponibles</div>
          <input placeholder="Buscar producto..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            style={{width:'100%',padding:'8px',borderRadius:'6px',border:'1px solid #ffffff30',background:'#0f172a',color:'#fff',fontSize:'13px',marginBottom:'10px',boxSizing:'border-box'}}
          />
          {filtrados.map(p => (
            <div key={p.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px',borderRadius:'6px',border:'1px solid #ffffff15',marginBottom:'6px'}}>
              <div>
                <div style={{fontSize:'13px',color:'#fff'}}>{p.nombre}</div>
                <div style={{fontSize:'11px',color: p.stock_actual <= p.stock_minimo ? '#ff6666' : '#ffffffaa'}}>
                  Stock: {p.stock_actual} u.
                </div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                <span style={{fontSize:'13px',color:'#FFD600',fontWeight:'500'}}>${parseFloat(p.precio_venta).toFixed(2)}</span>
                <button onClick={() => agregar(p)}
                  style={{background:'#FFD600',border:'none',borderRadius:'4px',padding:'4px 8px',fontSize:'11px',fontWeight:'500',cursor:'pointer',color:'#3D2B00'}}>
                  + Agregar
                </button>
              </div>
            </div>
          ))}
        </div>

        <div style={{background:'#16213e',borderRadius:'12px',padding:'16px',border:'1px solid #ffffff15'}}>
          <div style={{color:'#FFD600',fontSize:'14px',fontWeight:'500',marginBottom:'12px'}}>🧾 Carrito de venta</div>

          {carrito.length === 0 ? (
            <p style={{color:'#ffffff50',fontSize:'13px'}}>Agrega productos desde la izquierda.</p>
          ) : (
            carrito.map(i => (
              <div key={i.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px',borderBottom:'1px solid #ffffff15'}}>
                <div>
                  <div style={{fontSize:'13px',color:'#fff'}}>{i.nombre}</div>
                  <div style={{fontSize:'11px',color:'#ffffffaa'}}>${parseFloat(i.precio_venta).toFixed(2)} c/u</div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                  <button onClick={() => cambiarCantidad(i.id, -1)}
                    style={{background:'#ffffff20',border:'none',borderRadius:'4px',color:'#fff',width:'22px',height:'22px',cursor:'pointer',fontSize:'14px'}}>-</button>
                  <span style={{fontSize:'13px',color:'#fff',minWidth:'20px',textAlign:'center'}}>{i.cantidad}</span>
                  <button onClick={() => cambiarCantidad(i.id, 1)}
                    style={{background:'#ffffff20',border:'none',borderRadius:'4px',color:'#fff',width:'22px',height:'22px',cursor:'pointer',fontSize:'14px'}}>+</button>
                  <span style={{fontSize:'13px',color:'#FFD600',minWidth:'50px',textAlign:'right'}}>${(i.precio_venta * i.cantidad).toFixed(2)}</span>
                </div>
              </div>
            ))
          )}

          <div style={{background:'#0f172a',borderRadius:'8px',padding:'12px',marginTop:'10px'}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:'13px',color:'#ffffffcc',marginBottom:'6px'}}>
              <span>Productos</span><span>{carrito.reduce((s,i) => s + i.cantidad, 0)} items</span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:'16px',fontWeight:'500',color:'#FFD600',paddingTop:'8px',borderTop:'1px solid #FFD60030'}}>
              <span>TOTAL</span><span>${total.toFixed(2)}</span>
            </div>
          </div>

          <div style={{fontSize:'12px',color:'#FFD600',margin:'10px 0 6px'}}>Tipo de pago</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'6px',marginBottom:'10px'}}>
            {['efectivo','credito','transferencia'].map(t => (
              <button key={t} onClick={() => setTipoPago(t)}
                style={{padding:'8px',borderRadius:'6px',border: tipoPago===t ? '1px solid #FFD600' : '1px solid #ffffff30',background: tipoPago===t ? '#FFD60020' : 'transparent',color: tipoPago===t ? '#FFD600' : '#ffffffdd',fontSize:'11px',cursor:'pointer'}}>
                {t === 'efectivo' ? '💵 Efectivo' : t === 'credito' ? '💳 Crédito' : '📱 Transfer.'}
              </button>
            ))}
          </div>

          <button onClick={confirmar}
            style={{width:'100%',padding:'12px',borderRadius:'8px',border:'none',background: carrito.length > 0 ? '#FFD600' : '#ffffff20',fontSize:'14px',fontWeight:'500',cursor: carrito.length > 0 ? 'pointer' : 'default',color: carrito.length > 0 ? '#3D2B00' : '#ffffff50'}}>
            ✅ Confirmar venta — ${total.toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  );
}