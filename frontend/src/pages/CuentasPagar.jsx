import { useEffect, useState } from 'react';
import { api } from '../services/api';

export default function CuentasPagar() {
  const [cuentas, setCuentas] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [mostrarFormProveedor, setMostrarFormProveedor] = useState(false);
  const [mostrarListaProveedores, setMostrarListaProveedores] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todas');
  const [editId, setEditId] = useState(null);
  const [editProveedorId, setEditProveedorId] = useState(null);
  const [form, setForm] = useState({ proveedor_id: '', monto_total: '', vencimiento: '' });
  const [formProveedor, setFormProveedor] = useState({ nombre: '', ruc: '', telefono: '' });

  const cargar = async () => {
    try {
      const c = await api.get('/cuentas-pagar');
      if (c.ok && Array.isArray(c.data)) setCuentas(c.data);
      const p = await api.get('/proveedores');
      if (p.ok && Array.isArray(p.data)) setProveedores(p.data);
    } catch { setCuentas([]); }
  };

  useEffect(() => { cargar(); }, []);

  const guardar = async () => {
    if (!form.proveedor_id || !form.monto_total || !form.vencimiento) {
      setMensaje('⚠️ Completa todos los campos.'); return;
    }
    const datos = { proveedor_id: parseInt(form.proveedor_id), monto_total: parseFloat(form.monto_total), vencimiento: form.vencimiento };
    const res = editId ? await api.put(`/cuentas-pagar/${editId}`, datos) : await api.post('/cuentas-pagar', datos);
    if (res.ok) {
      setMensaje('✅ Cuenta guardada.');
      setForm({ proveedor_id: '', monto_total: '', vencimiento: '' });
      setMostrarForm(false); setEditId(null); cargar();
    }
    setTimeout(() => setMensaje(''), 3000);
  };

  const editar = (c) => {
    setForm({ proveedor_id: c.proveedor_id, monto_total: c.monto_total, vencimiento: c.vencimiento?.split('T')[0] });
    setEditId(c.id); setMostrarForm(true);
  };

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar esta cuenta?')) return;
    const res = await api.delete(`/cuentas-pagar/${id}`);
    if (res.ok) { setMensaje('✅ Cuenta eliminada.'); cargar(); }
    setTimeout(() => setMensaje(''), 3000);
  };

  const abonar = async (id, saldo) => {
    const monto = prompt(`¿Cuánto deseas pagar? (Saldo: $${saldo})`);
    if (!monto || isNaN(monto) || parseFloat(monto) <= 0) return;
    if (parseFloat(monto) > parseFloat(saldo)) { alert('El pago no puede ser mayor al saldo.'); return; }
    const res = await api.post(`/cuentas-pagar/${id}/abonar`, { monto: parseFloat(monto) });
    if (res.ok) { setMensaje('✅ Pago registrado.'); cargar(); }
    setTimeout(() => setMensaje(''), 3000);
  };

  const guardarProveedor = async () => {
    if (!formProveedor.nombre.trim()) { setMensaje('⚠️ El nombre es obligatorio.'); return; }
    const res = editProveedorId
      ? await api.put(`/proveedores/${editProveedorId}`, formProveedor)
      : await api.post('/proveedores', formProveedor);
    if (res.ok) {
      setMensaje('✅ Proveedor guardado.');
      setFormProveedor({ nombre: '', ruc: '', telefono: '' });
      setMostrarFormProveedor(false);
      setEditProveedorId(null);
      cargar();
    }
    setTimeout(() => setMensaje(''), 3000);
  };

  const editarProveedor = (p) => {
    setFormProveedor({ nombre: p.nombre, ruc: p.ruc || '', telefono: p.telefono || '' });
    setEditProveedorId(p.id);
    setMostrarFormProveedor(true);
  };

  const eliminarProveedor = async (id) => {
    if (!confirm('¿Eliminar este proveedor?')) return;
    const res = await api.delete(`/proveedores/${id}`);
    if (res.ok) { setMensaje('✅ Proveedor eliminado.'); cargar(); }
    setTimeout(() => setMensaje(''), 3000);
  };

  const formatearNombre = (val) => val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();

  const filtradas = cuentas.filter(c => filtroEstado === 'todas' ? true : c.estado === filtroEstado);
  const totalPendiente = cuentas.filter(c => c.estado === 'pendiente').reduce((s, c) => s + parseFloat(c.saldo), 0);

  const inputStyle = {
    width:'100%', padding:'9px 12px', borderRadius:'6px',
    border:'1px solid #334155', background:'#0f172a',
    color:'#e2e8f0', boxSizing:'border-box', fontSize:'13px'
  };

  const colorEstado = (e) => {
    if (e === 'pagada') return '#00C853';
    if (e === 'vencida') return '#ff4444';
    return '#fb923c';
  };

  return (
    <div style={{background:'#0f172a',minHeight:'100vh',padding:'20px',color:'#fff',fontFamily:'sans-serif'}}>

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
        <h1 style={{color:'#06b6d4',fontSize:'22px',margin:0}}>🏪 Cuentas por Pagar</h1>
        <div style={{display:'flex',gap:'8px'}}>
          <button onClick={() => setMostrarListaProveedores(!mostrarListaProveedores)}
            style={{background:'#1e293b',border:'1px solid #0891b2',borderRadius:'8px',padding:'8px 12px',cursor:'pointer',color:'#06b6d4',fontSize:'12px'}}>
            🏭 Proveedores
          </button>
          <button onClick={() => { setForm({ proveedor_id:'', monto_total:'', vencimiento:'' }); setEditId(null); setMostrarForm(true); }}
            style={{background:'linear-gradient(135deg,#0891b2,#06b6d4)',border:'none',borderRadius:'8px',padding:'8px 14px',fontWeight:'500',cursor:'pointer',color:'#fff',fontSize:'12px'}}>
            + Nueva cuenta
          </button>
        </div>
      </div>

      {/* Resumen */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'12px',marginBottom:'20px'}}>
        <div style={{background:'#1e293b',borderRadius:'12px',padding:'16px',border:'1px solid #fb923c40'}}>
          <div style={{fontSize:'11px',color:'#94a3b8',marginBottom:'4px'}}>Total por pagar</div>
          <div style={{fontSize:'24px',color:'#fb923c',fontWeight:'500'}}>${totalPendiente.toFixed(2)}</div>
        </div>
        <div style={{background:'#1e293b',borderRadius:'12px',padding:'16px',border:'1px solid #ff444440'}}>
          <div style={{fontSize:'11px',color:'#94a3b8',marginBottom:'4px'}}>Cuentas vencidas</div>
          <div style={{fontSize:'24px',color:'#ff4444',fontWeight:'500'}}>{cuentas.filter(c => c.estado === 'vencida').length}</div>
        </div>
        <div style={{background:'#1e293b',borderRadius:'12px',padding:'16px',border:'1px solid #00C85340'}}>
          <div style={{fontSize:'11px',color:'#94a3b8',marginBottom:'4px'}}>Cuentas pagadas</div>
          <div style={{fontSize:'24px',color:'#00C853',fontWeight:'500'}}>{cuentas.filter(c => c.estado === 'pagada').length}</div>
        </div>
      </div>

      {mensaje && (
        <div style={{background: mensaje.includes('⚠️') ? '#ff444420' : '#00C85320',
          border:`1px solid ${mensaje.includes('⚠️') ? '#ff444440' : '#00C85340'}`,
          borderRadius:'8px',padding:'10px 14px',marginBottom:'16px',
          color: mensaje.includes('⚠️') ? '#ff6666' : '#00C853',fontSize:'13px'}}>
          {mensaje}
        </div>
      )}

      {/* Lista de proveedores */}
      {mostrarListaProveedores && (
        <div style={{background:'#1e293b',border:'1px solid #0891b240',borderRadius:'12px',padding:'20px',marginBottom:'16px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'14px'}}>
            <h2 style={{color:'#06b6d4',fontSize:'15px',margin:0}}>🏭 Gestión de Proveedores</h2>
            <button onClick={() => { setFormProveedor({ nombre:'', ruc:'', telefono:'' }); setEditProveedorId(null); setMostrarFormProveedor(true); }}
              style={{background:'linear-gradient(135deg,#0891b2,#06b6d4)',border:'none',borderRadius:'6px',padding:'6px 12px',color:'#fff',cursor:'pointer',fontSize:'12px'}}>
              + Nuevo proveedor
            </button>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(250px,1fr))',gap:'8px'}}>
            {proveedores.map(p => (
              <div key={p.id} style={{background:'#0f172a',borderRadius:'8px',padding:'10px 12px',border:'1px solid #334155',display:'flex',alignItems:'center',gap:'8px'}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:'13px',color:'#e2e8f0',fontWeight:'500'}}>{p.nombre}</div>
                  <div style={{fontSize:'11px',color:'#64748b'}}>{p.ruc || 'Sin RUC'} {p.telefono ? `· ${p.telefono}` : ''}</div>
                </div>
                <button onClick={() => editarProveedor(p)}
                  style={{background:'transparent',border:'none',color:'#06b6d4',cursor:'pointer',fontSize:'14px',padding:'0'}}>✏️</button>
                <button onClick={() => eliminarProveedor(p.id)}
                  style={{background:'transparent',border:'none',color:'#ff4444',cursor:'pointer',fontSize:'14px',padding:'0'}}>🗑️</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Formulario proveedor */}
      {mostrarFormProveedor && (
        <div style={{background:'#1e293b',border:'1px solid #0891b240',borderRadius:'12px',padding:'20px',marginBottom:'16px'}}>
          <h2 style={{color:'#06b6d4',fontSize:'16px',marginBottom:'14px'}}>{editProveedorId ? '✏️ Editar proveedor' : '🏭 Nuevo proveedor'}</h2>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'12px',marginBottom:'14px'}}>
            <div>
              <label style={{fontSize:'12px',color:'#06b6d4',display:'block',marginBottom:'6px'}}>Nombre *</label>
              <input value={formProveedor.nombre}
                onChange={e => setFormProveedor({...formProveedor, nombre: formatearNombre(e.target.value)})}
                placeholder="Ej: Distribuidora Xyz" style={inputStyle} />
            </div>
            <div>
              <label style={{fontSize:'12px',color:'#06b6d4',display:'block',marginBottom:'6px'}}>RUC</label>
              <input value={formProveedor.ruc}
                onChange={e => { if(/^\d*$/.test(e.target.value)) setFormProveedor({...formProveedor, ruc: e.target.value}); }}
                placeholder="0000000000001" style={inputStyle} />
            </div>
            <div>
              <label style={{fontSize:'12px',color:'#06b6d4',display:'block',marginBottom:'6px'}}>Teléfono</label>
              <input value={formProveedor.telefono}
                onChange={e => { if(/^\d*$/.test(e.target.value)) setFormProveedor({...formProveedor, telefono: e.target.value}); }}
                placeholder="0991234567" style={inputStyle} />
            </div>
          </div>
          <div style={{display:'flex',gap:'8px',justifyContent:'flex-end'}}>
            <button onClick={() => { setMostrarFormProveedor(false); setEditProveedorId(null); }}
              style={{padding:'8px 16px',borderRadius:'6px',border:'1px solid #334155',background:'transparent',color:'#e2e8f0',cursor:'pointer'}}>
              Cancelar
            </button>
            <button onClick={guardarProveedor}
              style={{padding:'8px 16px',borderRadius:'6px',border:'none',background:'linear-gradient(135deg,#0891b2,#06b6d4)',color:'#fff',fontWeight:'500',cursor:'pointer'}}>
              💾 Guardar proveedor
            </button>
          </div>
        </div>
      )}

      {/* Formulario cuenta */}
      {mostrarForm && (
        <div style={{background:'#1e293b',border:'1px solid #0891b240',borderRadius:'12px',padding:'20px',marginBottom:'16px'}}>
          <h2 style={{color:'#06b6d4',fontSize:'16px',marginBottom:'14px'}}>{editId ? '✏️ Editar cuenta' : '➕ Nueva cuenta por pagar'}</h2>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'12px',marginBottom:'14px'}}>
            <div>
              <label style={{fontSize:'12px',color:'#06b6d4',display:'block',marginBottom:'6px'}}>Proveedor *</label>
              <select value={form.proveedor_id} onChange={e => setForm({...form, proveedor_id: e.target.value})} style={inputStyle}>
                <option value="">Selecciona un proveedor</option>
                {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
            <div>
              <label style={{fontSize:'12px',color:'#06b6d4',display:'block',marginBottom:'6px'}}>Monto ($) *</label>
              <input value={form.monto_total}
                onChange={e => { if(/^\d*\.?\d*$/.test(e.target.value)) setForm({...form, monto_total: e.target.value}); }}
                placeholder="0.00" style={inputStyle} />
            </div>
            <div>
              <label style={{fontSize:'12px',color:'#06b6d4',display:'block',marginBottom:'6px'}}>Vencimiento *</label>
              <input type="date" value={form.vencimiento} onChange={e => setForm({...form, vencimiento: e.target.value})} style={inputStyle} />
            </div>
          </div>
          <div style={{display:'flex',gap:'8px',justifyContent:'flex-end'}}>
            <button onClick={() => { setMostrarForm(false); setEditId(null); }}
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

      {/* Filtros */}
      <div style={{display:'flex',gap:'8px',marginBottom:'16px'}}>
        {['todas','pendiente','pagada','vencida'].map(f => (
          <button key={f} onClick={() => setFiltroEstado(f)}
            style={{padding:'6px 14px',borderRadius:'20px',border:'none',fontSize:'12px',cursor:'pointer',
              background: filtroEstado===f ? 'linear-gradient(135deg,#0891b2,#06b6d4)' : '#1e293b',
              color: filtroEstado===f ? '#fff' : '#94a3b8'}}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Tabla */}
      <div style={{overflowX:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:'12px'}}>
          <thead>
            <tr style={{background:'#1e293b'}}>
              {['Proveedor','Total','Pagado','Saldo','Vence','Estado','Acciones'].map(h => (
                <th key={h} style={{padding:'10px 8px',textAlign:'left',color:'#06b6d4',borderBottom:'2px solid #0891b2',whiteSpace:'nowrap'}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtradas.length === 0 ? (
              <tr><td colSpan={7} style={{padding:'20px',textAlign:'center',color:'#94a3b8'}}>No hay cuentas registradas.</td></tr>
            ) : (
              filtradas.map(c => (
                <tr key={c.id} style={{borderBottom:'1px solid #1e293b'}}>
                  <td style={{padding:'10px 8px',color:'#e2e8f0',fontWeight:'500'}}>{c.proveedor_nombre}</td>
                  <td style={{padding:'10px 8px',color:'#e2e8f0'}}>${parseFloat(c.monto_total).toFixed(2)}</td>
                  <td style={{padding:'10px 8px',color:'#00C853'}}>${parseFloat(c.monto_pagado).toFixed(2)}</td>
                  <td style={{padding:'10px 8px',color:'#fb923c',fontWeight:'500'}}>${parseFloat(c.saldo).toFixed(2)}</td>
                  <td style={{padding:'10px 8px',color:'#94a3b8',whiteSpace:'nowrap'}}>{new Date(c.vencimiento).toLocaleDateString()}</td>
                  <td style={{padding:'10px 8px'}}>
                    <span style={{padding:'3px 8px',borderRadius:'20px',fontSize:'10px',fontWeight:'500',whiteSpace:'nowrap',
                      background:`${colorEstado(c.estado)}20`,color:colorEstado(c.estado),
                      border:`1px solid ${colorEstado(c.estado)}40`}}>
                      {c.estado}
                    </span>
                  </td>
                  <td style={{padding:'10px 8px'}}>
                    <div style={{display:'flex',gap:'4px'}}>
                      {c.estado !== 'pagada' && (
                        <button onClick={() => abonar(c.id, c.saldo)}
                          style={{padding:'3px 8px',borderRadius:'5px',border:'1px solid #06b6d4',background:'transparent',color:'#06b6d4',cursor:'pointer',fontSize:'11px'}}>
                          💵
                        </button>
                      )}
                      <button onClick={() => editar(c)}
                        style={{padding:'3px 8px',borderRadius:'5px',border:'1px solid #0891b2',background:'transparent',color:'#06b6d4',cursor:'pointer',fontSize:'11px'}}>
                        ✏️
                      </button>
                      <button onClick={() => eliminar(c.id)}
                        style={{padding:'3px 8px',borderRadius:'5px',border:'1px solid #ff4444',background:'transparent',color:'#ff4444',cursor:'pointer',fontSize:'11px'}}>
                        🗑️
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
