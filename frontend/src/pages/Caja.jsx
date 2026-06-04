import { useEffect, useState } from 'react';
import { api } from '../services/api';

export default function Caja() {
  const [cajaActiva, setCajaActiva] = useState(null);
  const [montoApertura, setMontoApertura] = useState('');
  const [movimientos, setMovimientos] = useState([]);
  const [descripcion, setDescripcion] = useState('');
  const [monto, setMonto] = useState('');
  const [tipoMov, setTipoMov] = useState('ingreso');
  const [mensaje, setMensaje] = useState('');
  const [cargando, setCargando] = useState(true);

  const cargar = async () => {
    try {
      const data = await api.get('/caja/activa');
      if (data.ok && data.caja) {
        setCajaActiva(data.caja);
        setMovimientos(data.movimientos || []);
      } else { setCajaActiva(null); }
    } catch { setCajaActiva(null); }
    setCargando(false);
  };

  useEffect(() => { cargar(); }, []);

  const abrirCaja = async () => {
    if (!montoApertura || parseFloat(montoApertura) < 0) {
      setMensaje('⚠️ Ingresa un monto válido.'); return;
    }
    const res = await api.post('/caja/abrir', { monto_apertura: parseFloat(montoApertura) });
    if (res.ok) { setMensaje('✅ Caja abierta.'); cargar(); }
    setTimeout(() => setMensaje(''), 3000);
  };

  const agregarMovimiento = async (tipo) => {
    if (!descripcion.trim() || !monto || parseFloat(monto) <= 0) {
      setMensaje('⚠️ Completa descripción y monto.'); return;
    }
    const res = await api.post('/caja/movimiento', {
      caja_id: cajaActiva.id, tipo, descripcion, monto: parseFloat(monto)
    });
    if (res.ok) {
      setMensaje(`✅ ${tipo === 'ingreso' ? 'Ingreso' : 'Egreso'} registrado.`);
      setDescripcion(''); setMonto(''); cargar();
    }
    setTimeout(() => setMensaje(''), 3000);
  };

  const cerrarCaja = async () => {
    if (!confirm('¿Cerrar la caja?')) return;
    const res = await api.post('/caja/cerrar', { caja_id: cajaActiva.id });
    if (res.ok) { setMensaje('✅ Caja cerrada.'); cargar(); }
    setTimeout(() => setMensaje(''), 3000);
  };

  const totalIngresos = movimientos.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + parseFloat(m.monto), 0);
  const totalEgresos = movimientos.filter(m => m.tipo === 'egreso').reduce((s, m) => s + parseFloat(m.monto), 0);
  const saldoActual = cajaActiva ? parseFloat(cajaActiva.monto_apertura) + totalIngresos - totalEgresos : 0;

  const inputStyle = {
    width:'100%', padding:'9px 12px', borderRadius:'6px',
    border:'1px solid #BBDEFB', background:'#fff',
    color:'#333', boxSizing:'border-box', fontSize:'13px'
  };

  if (cargando) return (
    <div style={{background:'#f8f9fa',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <p style={{color:'#1565C0'}}>Cargando...</p>
    </div>
  );

  return (
    <div style={{background:'#f8f9fa',minHeight:'100vh',padding:'20px',fontFamily:'sans-serif'}}>
      <h1 style={{color:'#1565C0',fontSize:'22px',marginBottom:'20px'}}>🏦 Módulo de Caja</h1>

      {mensaje && (
        <div style={{background: mensaje.includes('⚠️') ? '#FFEBEE' : '#E8F5E9',
          border:`1px solid ${mensaje.includes('⚠️') ? '#FFCDD2' : '#C8E6C9'}`,
          borderRadius:'8px',padding:'10px 14px',marginBottom:'16px',
          color: mensaje.includes('⚠️') ? '#C62828' : '#2E7D32',fontSize:'13px'}}>
          {mensaje}
        </div>
      )}

      {!cajaActiva ? (
        <div style={{background:'#fff',borderRadius:'12px',padding:'24px',maxWidth:'400px',border:'0.5px solid #e0e0e0',boxShadow:'0 1px 4px #00000010'}}>
          <h2 style={{color:'#1565C0',fontSize:'16px',marginBottom:'16px'}}>🔓 Abrir caja del día</h2>
          <label style={{fontSize:'12px',color:'#1565C0',display:'block',marginBottom:'6px'}}>Monto de apertura ($)</label>
          <input value={montoApertura}
            onChange={e => { if(/^\d*\.?\d*$/.test(e.target.value)) setMontoApertura(e.target.value); }}
            placeholder="0.00" style={{...inputStyle, marginBottom:'16px'}} />
          <button onClick={abrirCaja}
            style={{width:'100%',padding:'12px',borderRadius:'8px',border:'none',background:'#1565C0',color:'#fff',fontWeight:'500',cursor:'pointer',fontSize:'14px'}}>
            🔓 Abrir Caja
          </button>
        </div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
          <div>
            <div style={{background:'#fff',borderRadius:'12px',padding:'16px',border:'0.5px solid #e0e0e0',boxShadow:'0 1px 4px #00000010',marginBottom:'16px'}}>
              <h2 style={{color:'#1565C0',fontSize:'15px',marginBottom:'14px'}}>📊 Resumen de caja</h2>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'12px'}}>
                <div style={{background:'#E3F2FD',borderRadius:'8px',padding:'12px'}}>
                  <div style={{fontSize:'11px',color:'#666',marginBottom:'4px'}}>Apertura</div>
                  <div style={{fontSize:'18px',color:'#1565C0',fontWeight:'500'}}>${parseFloat(cajaActiva.monto_apertura).toFixed(2)}</div>
                </div>
                <div style={{background:'#E8F5E9',borderRadius:'8px',padding:'12px'}}>
                  <div style={{fontSize:'11px',color:'#666',marginBottom:'4px'}}>Saldo actual</div>
                  <div style={{fontSize:'18px',color:'#2E7D32',fontWeight:'500'}}>${saldoActual.toFixed(2)}</div>
                </div>
                <div style={{background:'#E8F5E9',borderRadius:'8px',padding:'12px'}}>
                  <div style={{fontSize:'11px',color:'#666',marginBottom:'4px'}}>Total ingresos</div>
                  <div style={{fontSize:'18px',color:'#2E7D32',fontWeight:'500'}}>+${totalIngresos.toFixed(2)}</div>
                </div>
                <div style={{background:'#FFEBEE',borderRadius:'8px',padding:'12px'}}>
                  <div style={{fontSize:'11px',color:'#666',marginBottom:'4px'}}>Total egresos</div>
                  <div style={{fontSize:'18px',color:'#C62828',fontWeight:'500'}}>-${totalEgresos.toFixed(2)}</div>
                </div>
              </div>
              <button onClick={cerrarCaja}
                style={{width:'100%',padding:'10px',borderRadius:'8px',border:'1px solid #FFCDD2',background:'#FFEBEE',color:'#C62828',cursor:'pointer',fontSize:'13px',fontWeight:'500'}}>
                🔒 Cerrar Caja y Generar Arqueo
              </button>
            </div>

            <div style={{background:'#fff',borderRadius:'12px',padding:'16px',border:'0.5px solid #e0e0e0',boxShadow:'0 1px 4px #00000010'}}>
              <h2 style={{color:'#1565C0',fontSize:'15px',marginBottom:'12px'}}>📋 Movimientos del día</h2>
              {movimientos.length === 0 ? (
                <p style={{color:'#999',fontSize:'13px'}}>No hay movimientos registrados.</p>
              ) : (
                movimientos.map((m, i) => (
                  <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px',borderBottom:'0.5px solid #e0e0e0',fontSize:'13px'}}>
                    <div>
                      <div style={{color:'#333'}}>{m.descripcion}</div>
                      <div style={{color:'#999',fontSize:'11px'}}>{new Date(m.fecha).toLocaleTimeString()}</div>
                    </div>
                    <span style={{fontWeight:'500',color: m.tipo === 'ingreso' ? '#2E7D32' : '#C62828'}}>
                      {m.tipo === 'ingreso' ? '+' : '-'}${parseFloat(m.monto).toFixed(2)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={{background:'#fff',borderRadius:'12px',padding:'16px',border:'0.5px solid #e0e0e0',boxShadow:'0 1px 4px #00000010',height:'fit-content'}}>
            <h2 style={{color:'#1565C0',fontSize:'15px',marginBottom:'14px'}}>➕ Registrar movimiento</h2>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'14px'}}>
              <button onClick={() => setTipoMov('ingreso')}
                style={{padding:'10px',borderRadius:'8px',
                  border: tipoMov==='ingreso' ? '1px solid #2E7D32' : '1px solid #e0e0e0',
                  background: tipoMov==='ingreso' ? '#E8F5E9' : '#fff',
                  color: tipoMov==='ingreso' ? '#2E7D32' : '#666',
                  cursor:'pointer',fontWeight:'500',fontSize:'13px'}}>
                💵 Ingreso
              </button>
              <button onClick={() => setTipoMov('egreso')}
                style={{padding:'10px',borderRadius:'8px',
                  border: tipoMov==='egreso' ? '1px solid #C62828' : '1px solid #e0e0e0',
                  background: tipoMov==='egreso' ? '#FFEBEE' : '#fff',
                  color: tipoMov==='egreso' ? '#C62828' : '#666',
                  cursor:'pointer',fontWeight:'500',fontSize:'13px'}}>
                💸 Egreso
              </button>
            </div>

            <label style={{fontSize:'12px',color:'#1565C0',display:'block',marginBottom:'6px'}}>Descripción</label>
            <input value={descripcion} onChange={e => setDescripcion(e.target.value)}
              placeholder="Ej: Pago de proveedor"
              style={{...inputStyle, marginBottom:'12px'}} />

            <label style={{fontSize:'12px',color:'#1565C0',display:'block',marginBottom:'6px'}}>Monto ($)</label>
            <input value={monto}
              onChange={e => { if(/^\d*\.?\d*$/.test(e.target.value)) setMonto(e.target.value); }}
              placeholder="0.00"
              style={{...inputStyle, marginBottom:'16px'}} />

            <button onClick={() => agregarMovimiento(tipoMov)}
              style={{width:'100%',padding:'12px',borderRadius:'8px',border:'none',
                background: tipoMov==='ingreso' ? '#2E7D32' : '#C62828',
                color:'#fff',fontWeight:'500',cursor:'pointer',fontSize:'14px'}}>
              {tipoMov === 'ingreso' ? '💵 Registrar Ingreso' : '💸 Registrar Egreso'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}