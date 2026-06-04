import { useEffect, useState } from 'react';
import { api } from '../services/api';

export default function CuentasCobrar() {
  const [cuentas, setCuentas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [mostrarFormCliente, setMostrarFormCliente] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todas');
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ cliente_id: '', monto_total: '', vencimiento: '' });
  const [formCliente, setFormCliente] = useState({ nombre: '', cedula: '', telefono: '' });

  const cargar = async () => {
    try {
      const c = await api.get('/cuentas-cobrar');
      if (c.ok && Array.isArray(c.data)) setCuentas(c.data);
      const cl = await api.get('/clientes');
      if (cl.ok && Array.isArray(cl.data)) setClientes(cl.data);
    } catch { setCuentas([]); }
  };

  useEffect(() => { cargar(); }, []);

  const guardar = async () => {
    if (!form.cliente_id || !form.monto_total || !form.vencimiento) {
      setMensaje('⚠️ Completa todos los campos.'); return;
    }
    const datos = { cliente_id: parseInt(form.cliente_id), monto_total: parseFloat(form.monto_total), vencimiento: form.vencimiento };
    const res = editId ? await api.put(`/cuentas-cobrar/${editId}`, datos) : await api.post('/cuentas-cobrar', datos);
    if (res.ok) {
      setMensaje('✅ Cuenta guardada.');
      setForm({ cliente_id: '', monto_total: '', vencimiento: '' });
      setMostrarForm(false); setEditId(null); cargar();
    }
    setTimeout(() => setMensaje(''), 3000);
  };

  const editar = (c) => {
    setForm({ cliente_id: c.cliente_id, monto_total: c.monto_total, vencimiento: c.vencimiento?.split('T')[0] });
    setEditId(c.id); setMostrarForm(true);
  };

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar esta cuenta?')) return;
    const res = await api.delete(`/cuentas-cobrar/${id}`);
    if (res.ok) { setMensaje('✅ Cuenta eliminada.'); cargar(); }
    setTimeout(() => setMensaje(''), 3000);
  };

  const abonar = async (id, saldo) => {
    const monto = prompt(`¿Cuánto deseas abonar? (Saldo: $${saldo})`);
    if (!monto || isNaN(monto) || parseFloat(monto) <= 0) return;
    if (parseFloat(monto) > parseFloat(saldo)) { alert('El abono no puede ser mayor al saldo.'); return; }
    const res = await api.post(`/cuentas-cobrar/${id}/abonar`, { monto: parseFloat(monto) });
    if (res.ok) { setMensaje('✅ Abono registrado.'); cargar(); }
    setTimeout(() => setMensaje(''), 3000);
  };

  const guardarCliente = async () => {
    if (!formCliente.nombre.trim()) { setMensaje('⚠️ El nombre es obligatorio.'); return; }
    const res = await api.post('/clientes', formCliente);
    if (res.ok) {
      setMensaje('✅ Cliente agregado.');
      setFormCliente({ nombre: '', cedula: '', telefono: '' });
      setMostrarFormCliente(false); cargar();
    }
    setTimeout(() => setMensaje(''), 3000);
  };

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

      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
        <h1 style={{color:'#06b6d4',fontSize:'22px',margin:0}}>💰 Cuentas por Cobrar</h1>
        <div style={{display:'flex',gap:'8px'}}>
          <button onClick={() => setMostrarFormCliente(true)}
            style={{background:'#1e293b',border:'1px solid #0891b2',borderRadius:'8px',padding:'8px 12px',cursor:'pointer',color:'#06b6d4',fontSize:'12px'}}>
            👤 Cliente
          </button>
          <button onClick={() => { setForm({ cliente_id:'', monto_total:'', vencimiento:'' }); setEditId(null); setMostrarForm(true); }}
            style={{background:'linear-gradient(135deg,#0891b2,#06b6d4)',border:'none',borderRadius:'8px',padding:'8px 14px',fontWeight:'500',cursor:'pointer',color:'#fff',fontSize:'12px'}}>
            + Nueva cuenta
          </button>
        </div>
      </div>

      {/* Resumen */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'12px',marginBottom:'20px'}}>
        <div style={{background:'#1e293b',borderRadius:'12px',padding:'16px',border:'1px solid #fb923c40'}}>
          <div style={{fontSize:'11px',color:'#94a3b8',marginBottom:'4px'}}>Total pendiente</div>
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

      {/* Formulario nuevo cliente */}
      {mostrarFormCliente && (
        <div style={{background:'#1e293b',border:'1px solid #0891b240',borderRadius:'12px',padding:'20px',marginBottom:'16px'}}>
          <h2 style={{color:'#06b6d4',fontSize:'16px',marginBottom:'14px'}}>👤 Nuevo cliente</h2>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'12px',marginBottom:'14px'}}>
            <div>
              <label style={{fontSize:'12px',color:'#06b6d4',display:'block',marginBottom:'6px'}}>Nombre *</label>
              <input value={formCliente.nombre}
                onChange={e => setFormCliente({...formCliente, nombre: e.target.value.replace(/\b\w/g, l => l.toUpperCase())})}
                placeholder="Ej: Juan Pérez" style={inputStyle} />
            </div>
            <div>
              <label style={{fontSize:'12px',color:'#06b6d4',display:'block',marginBottom:'6px'}}>Cédula</label>
              <input value={formCliente.cedula}
                onChange={e => { if(/^\d*$/.test(e.target.value)) setFormCliente({...formCliente, cedula: e.target.value}); }}
                placeholder="0000000000" style={inputStyle} />
            </div>
            <div>
              <label style={{fontSize:'12px',color:'#06b6d4',display:'block',marginBottom:'6px'}}>Teléfono</label>
              <input value={formCliente.telefono}
                onChange={e => { if(/^\d*$/.test(e.target.value)) setFormCliente({...formCliente, telefono: e.target.value}); }}
                placeholder="0991234567" style={inputStyle} />
            </div>
          </div>
          <div style={{display:'flex',gap:'8px',justifyContent:'flex-end'}}>
            <button onClick={() => setMostrarFormCliente(false)}
              style={{padding:'8px 16px',borderRadius:'6px',border:'1px solid #334155',background:'transparent',color:'#e2e8f0',cursor:'pointer'}}>
              Cancelar
            </button>
            <button onClick={guardarCliente}
              style={{padding:'8px 16px',borderRadius:'6px',border:'none',background:'linear-gradient(135deg,#0891b2,#06b6d4)',color:'#fff',fontWeight:'500',cursor:'pointer'}}>
              💾 Guardar cliente
            </button>
          </div>
        </div>
      )}

      {/* Formulario cuenta */}
      {mostrarForm && (
        <div style={{background:'#1e293b',border:'1px solid #0891b240',borderRadius:'12px',padding:'20px',marginBottom:'16px'}}>
          <h2 style={{color:'#06b6d4',fontSize:'16px',marginBottom:'14px'}}>{editId ? '✏️ Editar cuenta' : '➕ Nueva cuenta'}</h2>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'12px',marginBottom:'14px'}}>
            <div>
              <label style={{fontSize:'12px',color:'#06b6d4',display:'block',marginBottom:'6px'}}>Cliente *</label>
              <select value={form.cliente_id} onChange={e => setForm({...form, cliente_id: e.target.value})} style={inputStyle}>
                <option value="">Selecciona un cliente</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
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
              {['Cliente','Total','Pagado','Saldo','Vence','Estado','Acciones'].map(h => (
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
                  <td style={{padding:'10px 8px',color:'#e2e8f0',fontWeight:'500'}}>{c.cliente_nombre}</td>
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
                          style={{padding:'3px 8px',borderRadius:'5px',border:'1px solid #06b6d4',background:'transparent',color:'#06b6d4',cursor:'pointer',fontSize:'11px',whiteSpace:'nowrap'}}>
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