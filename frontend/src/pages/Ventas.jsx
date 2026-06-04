import { useEffect, useState } from 'react';
import { api } from '../services/api';

export default function Ventas() {
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [tipoPago, setTipoPago] = useState('efectivo');
  const [mensaje, setMensaje] = useState('');
  const [montoRecibido, setMontoRecibido] = useState('');
  const [tipoCliente, setTipoCliente] = useState('consumidor');
  const [datosCliente, setDatosCliente] = useState({ nombre: '', cedula: '' });

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

  const total = carrito.reduce((s, i) => s + parseFloat(i.precio_venta) * i.cantidad, 0);
  const vuelto = montoRecibido && parseFloat(montoRecibido) >= total ? parseFloat(montoRecibido) - total : 0;

  const confirmar = async () => {
    if (carrito.length === 0) return;
    if (tipoPago === 'efectivo' && montoRecibido && parseFloat(montoRecibido) < total) {
      setMensaje('❌ El monto recibido es menor al total.'); return;
    }
    if (tipoCliente === 'factura' && (!datosCliente.nombre.trim() || !datosCliente.cedula.trim())) {
      setMensaje('❌ Ingresa el nombre y cédula/RUC del cliente.'); return;
    }
    try {
      const res = await api.post('/ventas', {
        tipo_pago: tipoPago,
        tipo_cliente: tipoCliente,
        cliente_nombre: datosCliente.nombre,
        cliente_cedula: datosCliente.cedula,
        items: carrito.map(i => ({
          producto_id: i.id,
          cantidad: i.cantidad,
          precio_unitario: i.precio_venta
        }))
      });
      if (res.ok) {
        setMensaje(`✅ ¡Venta registrada! ${tipoPago === 'efectivo' && montoRecibido ? `Vuelto: $${vuelto.toFixed(2)}` : ''}`);
        setCarrito([]);
        setMontoRecibido('');
        setDatosCliente({ nombre: '', cedula: '' });
        setTipoCliente('consumidor');
        cargarProductos();
        setTimeout(() => setMensaje(''), 4000);
      }
    } catch { setMensaje('❌ Error al registrar la venta'); }
  };

  const filtrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) && p.stock_actual > 0
  );

  return (
    <div style={{background:'#f8f9fa',minHeight:'100vh',padding:'20px',fontFamily:'sans-serif'}}>
      <h1 style={{color:'#1565C0',fontSize:'22px',marginBottom:'16px'}}>🛍️ Ventas — Tienda Genovesa</h1>

      {mensaje && (
        <div style={{background: mensaje.includes('❌') ? '#FFEBEE' : '#E8F5E9',
          border:`1px solid ${mensaje.includes('❌') ? '#FFCDD2' : '#C8E6C9'}`,
          borderRadius:'8px',padding:'12px',marginBottom:'16px',
          color: mensaje.includes('❌') ? '#C62828' : '#2E7D32',fontSize:'14px',fontWeight:'500'}}>
          {mensaje}
        </div>
      )}

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>

        {/* Panel izquierdo - Productos */}
        <div style={{background:'#fff',borderRadius:'12px',padding:'16px',border:'0.5px solid #e0e0e0',boxShadow:'0 1px 4px #00000010'}}>
          <div style={{color:'#1565C0',fontSize:'14px',fontWeight:'500',marginBottom:'12px'}}>🛍️ Productos disponibles</div>
          <input placeholder="Buscar producto..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            style={{width:'100%',padding:'8px 12px',borderRadius:'6px',border:'1px solid #BBDEFB',background:'#fff',color:'#333',fontSize:'13px',marginBottom:'10px',boxSizing:'border-box'}}
          />
          {filtrados.length === 0 ? (
            <p style={{color:'#999',fontSize:'13px'}}>No hay productos disponibles.</p>
          ) : (
            filtrados.map(p => (
              <div key={p.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px',borderRadius:'8px',border:'0.5px solid #e0e0e0',marginBottom:'6px'}}>
                <div>
                  <div style={{fontSize:'13px',color:'#333',fontWeight:'500'}}>{p.nombre}</div>
                  <div style={{fontSize:'11px',color: p.stock_actual <= p.stock_minimo ? '#C62828' : '#666'}}>
                    Stock: {p.stock_actual} u.
                  </div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                  <span style={{fontSize:'13px',color:'#1565C0',fontWeight:'500'}}>${parseFloat(p.precio_venta).toFixed(2)}</span>
                  <button onClick={() => agregar(p)}
                    style={{background:'#1565C0',border:'none',borderRadius:'6px',padding:'5px 10px',fontSize:'12px',fontWeight:'500',cursor:'pointer',color:'#fff'}}>
                    + Agregar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Panel derecho - Carrito */}
        <div style={{background:'#fff',borderRadius:'12px',padding:'16px',border:'0.5px solid #e0e0e0',boxShadow:'0 1px 4px #00000010'}}>
          <div style={{color:'#1565C0',fontSize:'14px',fontWeight:'500',marginBottom:'12px'}}>🧾 Carrito de venta</div>

          {carrito.length === 0 ? (
            <p style={{color:'#999',fontSize:'13px',marginBottom:'12px'}}>Agrega productos desde la izquierda.</p>
          ) : (
            carrito.map(i => (
              <div key={i.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px',borderBottom:'0.5px solid #e0e0e0'}}>
                <div>
                  <div style={{fontSize:'13px',color:'#333',fontWeight:'500'}}>{i.nombre}</div>
                  <div style={{fontSize:'11px',color:'#666'}}>${parseFloat(i.precio_venta).toFixed(2)} c/u</div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                  <button onClick={() => cambiarCantidad(i.id, -1)}
                    style={{background:'#E3F2FD',border:'none',borderRadius:'4px',color:'#1565C0',width:'24px',height:'24px',cursor:'pointer',fontSize:'14px',fontWeight:'500'}}>-</button>
                  <span style={{fontSize:'13px',color:'#333',minWidth:'20px',textAlign:'center'}}>{i.cantidad}</span>
                  <button onClick={() => cambiarCantidad(i.id, 1)}
                    style={{background:'#E3F2FD',border:'none',borderRadius:'4px',color:'#1565C0',width:'24px',height:'24px',cursor:'pointer',fontSize:'14px',fontWeight:'500'}}>+</button>
                  <span style={{fontSize:'13px',color:'#1565C0',fontWeight:'500',minWidth:'50px',textAlign:'right'}}>${(parseFloat(i.precio_venta) * i.cantidad).toFixed(2)}</span>
                </div>
              </div>
            ))
          )}

          {/* Total */}
          <div style={{background:'#E3F2FD',borderRadius:'8px',padding:'12px',marginTop:'10px'}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:'13px',color:'#666',marginBottom:'6px'}}>
              <span>Productos</span>
              <span>{carrito.reduce((s,i) => s + i.cantidad, 0)} items</span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:'18px',fontWeight:'500',color:'#1565C0',paddingTop:'8px',borderTop:'1px solid #BBDEFB'}}>
              <span>TOTAL</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Tipo de cliente */}
          <div style={{fontSize:'13px',color:'#1565C0',margin:'12px 0 6px',fontWeight:'500'}}>Tipo de cliente</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px',marginBottom:'10px'}}>
            <button onClick={() => { setTipoCliente('consumidor'); setDatosCliente({ nombre:'', cedula:'' }); }}
              style={{padding:'8px',borderRadius:'6px',
                border: tipoCliente==='consumidor' ? '1px solid #1565C0' : '1px solid #e0e0e0',
                background: tipoCliente==='consumidor' ? '#E3F2FD' : '#fff',
                color: tipoCliente==='consumidor' ? '#1565C0' : '#666',
                fontSize:'12px',cursor:'pointer',fontWeight: tipoCliente==='consumidor' ? '500' : '400'}}>
              👤 Consumidor Final
            </button>
            <button onClick={() => setTipoCliente('factura')}
              style={{padding:'8px',borderRadius:'6px',
                border: tipoCliente==='factura' ? '1px solid #1565C0' : '1px solid #e0e0e0',
                background: tipoCliente==='factura' ? '#E3F2FD' : '#fff',
                color: tipoCliente==='factura' ? '#1565C0' : '#666',
                fontSize:'12px',cursor:'pointer',fontWeight: tipoCliente==='factura' ? '500' : '400'}}>
              🧾 Con datos de factura
            </button>
          </div>

          {/* Datos del cliente para factura */}
          {tipoCliente === 'factura' && (
            <div style={{background:'#F3F8FF',borderRadius:'8px',padding:'12px',marginBottom:'10px',border:'1px solid #BBDEFB'}}>
              <div style={{fontSize:'13px',color:'#1565C0',fontWeight:'500',marginBottom:'10px'}}>📋 Datos para factura</div>
              <div style={{marginBottom:'8px'}}>
                <label style={{fontSize:'12px',color:'#1565C0',display:'block',marginBottom:'4px'}}>Nombre o Razón Social *</label>
                <input value={datosCliente.nombre}
                  onChange={e => setDatosCliente({...datosCliente, nombre: e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1)})}
                  placeholder="Ej: Juan Pérez"
                  style={{width:'100%',padding:'8px 12px',borderRadius:'6px',border:'1px solid #BBDEFB',background:'#fff',color:'#333',fontSize:'13px',boxSizing:'border-box'}} />
              </div>
              <div>
                <label style={{fontSize:'12px',color:'#1565C0',display:'block',marginBottom:'4px'}}>Cédula o RUC *</label>
                <input value={datosCliente.cedula}
                  onChange={e => { if(/^\d*$/.test(e.target.value)) setDatosCliente({...datosCliente, cedula: e.target.value}); }}
                  placeholder="0000000000"
                  style={{width:'100%',padding:'8px 12px',borderRadius:'6px',border:'1px solid #BBDEFB',background:'#fff',color:'#333',fontSize:'13px',boxSizing:'border-box'}} />
              </div>
            </div>
          )}

          {/* Tipo de pago */}
          <div style={{fontSize:'13px',color:'#1565C0',margin:'10px 0 6px',fontWeight:'500'}}>Tipo de pago</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'6px',marginBottom:'10px'}}>
            {['efectivo','credito','transferencia'].map(t => (
              <button key={t} onClick={() => { setTipoPago(t); setMontoRecibido(''); }}
                style={{padding:'8px',borderRadius:'6px',
                  border: tipoPago===t ? '1px solid #1565C0' : '1px solid #e0e0e0',
                  background: tipoPago===t ? '#E3F2FD' : '#fff',
                  color: tipoPago===t ? '#1565C0' : '#666',
                  fontSize:'12px',cursor:'pointer',fontWeight: tipoPago===t ? '500' : '400'}}>
                {t === 'efectivo' ? '💵 Efectivo' : t === 'credito' ? '💳 Crédito' : '📱 Transfer.'}
              </button>
            ))}
          </div>

          {/* Cálculo de vuelto */}
          {tipoPago === 'efectivo' && carrito.length > 0 && (
            <div style={{background:'#F3F8FF',borderRadius:'8px',padding:'12px',marginBottom:'10px',border:'1px solid #BBDEFB'}}>
              <label style={{fontSize:'13px',color:'#1565C0',display:'block',marginBottom:'6px',fontWeight:'500'}}>
                💵 Monto recibido del cliente ($)
              </label>
              <input
                value={montoRecibido}
                onChange={e => { if(/^\d*\.?\d*$/.test(e.target.value)) setMontoRecibido(e.target.value); }}
                placeholder="0.00"
                inputMode="decimal"
                style={{width:'100%',padding:'10px 12px',borderRadius:'6px',border:'1px solid #BBDEFB',background:'#fff',color:'#333',fontSize:'15px',boxSizing:'border-box',fontWeight:'500'}}
              />
              {montoRecibido && parseFloat(montoRecibido) >= total && (
                <div style={{marginTop:'10px',background:'#E8F5E9',borderRadius:'6px',padding:'10px 12px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontSize:'14px',color:'#2E7D32',fontWeight:'500'}}>💰 Vuelto a dar:</span>
                  <span style={{fontSize:'22px',fontWeight:'500',color:'#2E7D32'}}>${vuelto.toFixed(2)}</span>
                </div>
              )}
              {montoRecibido && parseFloat(montoRecibido) < total && (
                <div style={{marginTop:'8px',background:'#FFEBEE',borderRadius:'6px',padding:'8px 12px',color:'#C62828',fontSize:'13px'}}>
                  ⚠️ Faltan ${(total - parseFloat(montoRecibido)).toFixed(2)} para completar el pago.
                </div>
              )}
            </div>
          )}

          <button onClick={confirmar}
            style={{width:'100%',padding:'13px',borderRadius:'8px',border:'none',
              background: carrito.length > 0 ? '#1565C0' : '#e0e0e0',
              fontSize:'14px',fontWeight:'500',
              cursor: carrito.length > 0 ? 'pointer' : 'default',
              color: carrito.length > 0 ? '#fff' : '#999'}}>
            ✅ Confirmar venta — ${total.toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  );
}