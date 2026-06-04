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
      } else {
        setCajaActiva(null);
      }
    } catch { setCajaActiva(null); }
    setCargando(false);
  };

  useEffect(() => { cargar(); }, []);

  const abrirCaja = async () => {
    if (!montoApertura || parseFloat(montoApertura) < 0) {
      setMensaje('⚠️ Ingresa un monto de apertura válido.');
      return;
    }
    const res = await api.post('/caja/abrir', { monto_apertura: parseFloat(montoApertura) });
    if (res.ok) { setMensaje('✅ Caja abierta exitosamente.'); cargar(); }
  };

  const agregarMovimiento = async (tipo) => {
    if (!descripcion.trim() || !monto || parseFloat(monto) <= 0) {
      setMensaje('⚠️ Completa descripción y monto.');
      return;
    }
    const res = await api.post('/caja/movimiento', {
      caja_id: cajaActiva.id,
      tipo,
      descripcion,
      monto: parseFloat(monto)
    });
    if (res.ok) {
      setMensaje(`✅ ${tipo === 'ingreso' ? 'Ingreso' : 'Egreso'} registrado.`);
      setDescripcion(''); setMonto('');
      cargar();
    }
    setTimeout(() => setMensaje(''), 3000);
  };

  const cerrarCaja = async () => {
    if (!confirm('¿Estás segura de cerrar la caja?')) return;
    const res = await api.post('/caja/cerrar', { caja_id: cajaActiva.id });
    if (res.ok) { setMensaje('✅ Caja cerrada. Arqueo generado.'); cargar(); }
  };

  const totalIngresos = movimientos.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + parseFloat(m.monto), 0);
  const totalEgresos = movimientos.filter(m => m.tipo === 'egreso').reduce((s, m) => s + parseFloat(m.monto), 0);
  const saldoActual = cajaActiva ? parseFloat(cajaActiva.monto_apertura) + totalIngresos - totalEgresos : 0;

  const inputStyle = {
    width:'100%', padding:'8px', borderRadius:'6px',
    border:'1px solid #334155', background:'#0f172a',
    color:'#e2e8f0', boxSizing:'border-box', fontSize:'13px'
  };

  if (cargando) return (
    <div style={{background:'#0f172a',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <p style={{color:'#06b6d4'}}>Cargando...</p>
    </div>
  );

  return (
    <div style={{background:'#0f172a',minHeight:'100vh',padding:'20px',color:'#fff',fontFamily:'sans-serif'}}>
      <h1 style={{color:'#06b6d4',fontSize:'22px',marginBottom:'20px'}}>🏦 Módulo de Caja</h1>

      {mensaje && (
        <div style={{background: mensaje.includes('⚠️') ? '#ff444420' : '#00C85320',
          border:`1px solid ${mensaje.includes('⚠️') ? '#ff444440' : '#00C85340'}`,
          borderRadius:'8px',padding:'10px 14px',marginBottom:'16px',
          color: mensaje.includes('⚠️') ? '#ff6666' : '#00C853',fontSize:'13px'}}>
          {mensaje}
        </div>
      )}

      {!cajaActiva ? (
        /* APERTURA DE CAJA */
        <div style={{background:'#1e293b',borderRadius:'12px',padding:'24px',maxWidth:'400px',border:'1px solid #334155'}}>
          <h2 style={{color:'#06b6d4',fontSize:'16px',marginBottom:'16px'}}>🔓 Abrir caja del día</h2>
          <label style={{fontSize:'12px',color:'#06b6d4',display:'block',marginBottom:'6px'}}>Monto de apertura ($)</label>
          <input
            value={montoApertura}
            onChange={e => { if(/^\d*\.?\d*$/.test(e.target.value)) setMontoApertura(e.target.value); }}
            placeholder="0.00"
            style={{...inputStyle, marginBottom:'16px'}}
          />
          <button onClick={abrirCaja}
            style={{width:'100%',padding:'12px',borderRadius:'8px',border:'none',background:'linear-gradient(135deg,#0891b2,#06b6d4)',color:'#fff',fontWeight:'500',cursor:'pointer',fontSize:'14px'}}>
            🔓 Abrir Caja
          </button>
        </div>
      ) : (
        /* CAJA ACTIVA */
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>

          {/* Panel izquierdo — Resumen */}
          <div>
            <div style={{background:'#1e293b',borderRadius:'12px',padding:'16px',border:'1px solid #334155',marginBottom:'16px'}}>
              <h2 style={{color:'#06b6d4',fontSize:'15px',marginBottom:'14px'}}>📊 Resumen de caja</h2>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'12px'}}>
                <div style={{background:'#0f172a',borderRadius:'8px',padding:'12px',border:'1px solid #334155'}}>
                  <div style={{fontSize:'11px',color:'#94a3b8',marginBottom:'4px'}}>Apertura</div>
                  <div style={{fontSize:'18px',color:'#06b6d4',fontWeight:'500'}}>${parseFloat(cajaActiva.monto_apertura).toFixed(2)}</div>
                </div>
                <div style={{background:'#0f172a',borderRadius:'8px',padding:'12px',border:'1px solid #334155'}}>
                  <div style={{fontSize:'11px',color:'#94a3b8',marginBottom:'4px'}}>Saldo actual</div>
                  <div style={{fontSize:'18px',color:'#00C853',fontWeight:'500'}}>${saldoActual.toFixed(2)}</div>
                </div>
                <div style={{background:'#0f172a',borderRadius:'8px',padding:'12px',border:'1px solid #00C85330'}}>
                  <div style={{fontSize:'11px',color:'#94a3b8',marginBottom:'4px'}}>Total ingresos</div>
                  <div style={{fontSize:'18px',color:'#00C853',fontWeight:'500'}}>+${totalIngresos.toFixed(2)}</div>
                </div>
                <div style={{background:'#0f172a',borderRadius:'8px',padding:'12px',border:'1px solid #ff444430'}}>
                  <div style={{fontSize:'11px',color:'#94a3b8',marginBottom:'4px'}}>Total egresos</div>
                  <div style={{fontSize:'18px',color:'#ff4444',fontWeight:'500'}}>-${totalEgresos.toFixed(2)}</div>
                </div>
              </div>
              <button onClick={cerrarCaja}
                style={{width:'100%',padding:'10px',borderRadius:'8px',border:'1px solid #ff444440',background:'#ff444415',color:'#ff6666',cursor:'pointer',fontSize:'13px',fontWeight:'500'}}>
                🔒 Cerrar Caja y Generar Arqueo
              </button>
            </div>

            {/* Movimientos del día */}
            <div style={{background:'#1e293b',borderRadius:'12px',padding:'16px',border:'1px solid #334155'}}>
              <h2 style={{color:'#06b6d4',fontSize:'15px',marginBottom:'12px'}}>📋 Movimientos del día</h2>
              {movimientos.length === 0 ? (
                <p style={{color:'#94a3b8',fontSize:'13px'}}>No hay movimientos registrados.</p>
              ) : (
                movimientos.map((m, i) => (
                  <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px',borderBottom:'1px solid #334155',fontSize:'13px'}}>
                    <div>
                      <div style={{color:'#e2e8f0'}}>{m.descripcion}</div>
                      <div style={{color:'#64748b',fontSize:'11px'}}>{new Date(m.fecha).toLocaleTimeString()}</div>
                    </div>
                    <span style={{fontWeight:'500',color: m.tipo === 'ingreso' ? '#00C853' : '#ff4444'}}>
                      {m.tipo === 'ingreso' ? '+' : '-'}${parseFloat(m.monto).toFixed(2)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Panel derecho — Registrar movimiento */}
          <div style={{background:'#1e293b',borderRadius:'12px',padding:'16px',border:'1px solid #334155',height:'fit-content'}}>
            <h2 style={{color:'#06b6d4',fontSize:'15px',marginBottom:'14px'}}>➕ Registrar movimiento</h2>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'14px'}}>
              <button onClick={() => setTipoMov('ingreso')}
                style={{padding:'10px',borderRadius:'8px',border: tipoMov==='ingreso' ? '1px solid #00C853' : '1px solid #334155',background: tipoMov==='ingreso' ? '#00C85320' : 'transparent',color: tipoMov==='ingreso' ? '#00C853' : '#94a3b8',cursor:'pointer',fontWeight:'500',fontSize:'13px'}}>
                💵 Ingreso
              </button>
              <button onClick={() => setTipoMov('egreso')}
                style={{padding:'10px',borderRadius:'8px',border: tipoMov==='egreso' ? '1px solid #ff4444' : '1px solid #334155',background: tipoMov==='egreso' ? '#ff444420' : 'transparent',color: tipoMov==='egreso' ? '#ff4444' : '#94a3b8',cursor:'pointer',fontWeight:'500',fontSize:'13px'}}>
                💸 Egreso
              </button>
            </div>

            <label style={{fontSize:'12px',color:'#06b6d4',display:'block',marginBottom:'6px'}}>Descripción</label>
            <input value={descripcion} onChange={e => setDescripcion(e.target.value)}
              placeholder="Ej: Pago de proveedor"
              style={{...inputStyle, marginBottom:'12px'}} />

            <label style={{fontSize:'12px',color:'#06b6d4',display:'block',marginBottom:'6px'}}>Monto ($)</label>
            <input value={monto}
              onChange={e => { if(/^\d*\.?\d*$/.test(e.target.value)) setMonto(e.target.value); }}
              placeholder="0.00"
              style={{...inputStyle, marginBottom:'16px'}} />

            <button onClick={() => agregarMovimiento(tipoMov)}
              style={{width:'100%',padding:'12px',borderRadius:'8px',border:'none',
                background: tipoMov==='ingreso' ? 'linear-gradient(135deg,#059669,#10b981)' : 'linear-gradient(135deg,#dc2626,#ef4444)',
                color:'#fff',fontWeight:'500',cursor:'pointer',fontSize:'14px'}}>
              {tipoMov === 'ingreso' ? '💵 Registrar Ingreso' : '💸 Registrar Egreso'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}