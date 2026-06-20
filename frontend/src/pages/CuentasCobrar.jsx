import { useEffect, useState } from 'react';
import { api } from '../services/api';

export default function CuentasCobrar() {
  const [cuentas, setCuentas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [mostrarFormCliente, setMostrarFormCliente] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todas');
  const [busqueda, setBusqueda] = useState('');
  const [mesFiltro, setMesFiltro] = useState(() => new Date().toISOString().slice(0, 7));
  const [todosMeses, setTodosMeses] = useState(false);
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
    if (res.ok) {
      setMensaje(res.cajaRegistrada
        ? '✅ Abono registrado y sumado a caja como INGRESO.'
        : '✅ Abono registrado. ⚠️ No hay caja abierta, no se sumó a caja.');
      cargar();
    } else {
      setMensaje('⚠️ ' + (res.mensaje || 'No se pudo registrar el abono.'));
    }
    setTimeout(() => setMensaje(''), 4000);
  };

  const guardarCliente = async () => {
    if (!formCliente.nombre.trim()) { setMensaje('⚠️ El nombre es obligatorio.'); return; }
    const res = await api.post('/clientes', formCliente);
    if (res.ok) {
      setMensaje('✅ Cliente agregado.');
      setFormCliente({ nombre: '', cedula: '', telefono: '' });
      setMostrarFormCliente(false); cargar();
    } else {
      setMensaje('⚠️ ' + (res.mensaje || 'No se pudo agregar el cliente.'));
    }
    setTimeout(() => setMensaje(''), 4000);
  };

  const filtradas = cuentas.filter(c => {
    if (filtroEstado !== 'todas' && c.estado !== filtroEstado) return false;
    if (busqueda && !String(c.cliente_nombre || '').toLowerCase().includes(busqueda.toLowerCase())) return false;
    // Las deudas activas (pendiente/vencida) SIEMPRE se ven; el mes solo filtra las pagadas
    if (!todosMeses && c.estado === 'pagada' && String(c.vencimiento).slice(0, 7) !== mesFiltro) return false;
    return true;
  });
  const totalPendiente = cuentas.filter(c => c.estado === 'pendiente').reduce((s, c) => s + parseFloat(c.saldo), 0);

  const inputStyle = {
    width:'100%', padding:'9px 12px', borderRadius:'6px',
    border:'1px solid #BBDEFB', background:'#fff',
    color:'#333', boxSizing:'border-box', fontSize:'13px'
  };

  const colorEstado = (e) => {
    if (e === 'pagada') return '#2E7D32';
    if (e === 'vencida') return '#C62828';
    return '#E65100';
  };

  const bgEstado = (e) => {
    if (e === 'pagada') return '#E8F5E9';
    if (e === 'vencida') return '#FFEBEE';
    return '#FFF3E0';
  };

  return (
    <div style={{background:'#f8f9fa',minHeight:'100vh',padding:'20px',fontFamily:'sans-serif'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
        <h1 style={{color:'#1565C0',fontSize:'22px',margin:0}}>💰 Cuentas por Cobrar</h1>
        <div style={{display:'flex',gap:'8px'}}>
          <button onClick={() => setMostrarFormCliente(true)}
            style={{background:'#fff',border:'1px solid #BBDEFB',borderRadius:'8px',padding:'8px 14px',cursor:'pointer',color:'#1565C0',fontSize:'13px'}}>
            👤 Nuevo cliente
          </button>
          <button onClick={() => { setForm({ cliente_id:'', monto_total:'', vencimiento:'' }); setEditId(null); setMostrarForm(true); }}
            style={{background:'#1565C0',border:'none',borderRadius:'8px',padding:'8px 16px',fontWeight:'500',cursor:'pointer',color:'#fff',fontSize:'13px'}}>
            + Nueva cuenta
          </button>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'12px',marginBottom:'20px'}}>
        <div style={{background:'#fff',borderRadius:'12px',padding:'16px',border:'0.5px solid #FFE0B2',boxShadow:'0 1px 4px #00000010'}}>
          <div style={{fontSize:'12px',color:'#666',marginBottom:'4px'}}>Total pendiente</div>
          <div style={{fontSize:'24px',color:'#E65100',fontWeight:'500'}}>${totalPendiente.toFixed(2)}</div>
        </div>
        <div style={{background:'#fff',borderRadius:'12px',padding:'16px',border:'0.5px solid #FFCDD2',boxShadow:'0 1px 4px #00000010'}}>
          <div style={{fontSize:'12px',color:'#666',marginBottom:'4px'}}>Cuentas vencidas</div>
          <div style={{fontSize:'24px',color:'#C62828',fontWeight:'500'}}>{cuentas.filter(c => c.estado === 'vencida').length}</div>
        </div>
        <div style={{background:'#fff',borderRadius:'12px',padding:'16px',border:'0.5px solid #C8E6C9',boxShadow:'0 1px 4px #00000010'}}>
          <div style={{fontSize:'12px',color:'#666',marginBottom:'4px'}}>Cuentas pagadas</div>
          <div style={{fontSize:'24px',color:'#2E7D32',fontWeight:'500'}}>{cuentas.filter(c => c.estado === 'pagada').length}</div>
        </div>
      </div>

      {mensaje && (
        <div style={{background: mensaje.includes('⚠️') ? '#FFEBEE' : '#E8F5E9',
          border:`1px solid ${mensaje.includes('⚠️') ? '#FFCDD2' : '#C8E6C9'}`,
          borderRadius:'8px',padding:'10px 14px',marginBottom:'16px',
          color: mensaje.includes('⚠️') ? '#C62828' : '#2E7D32',fontSize:'13px'}}>
          {mensaje}
        </div>
      )}

      {mostrarFormCliente && (
        <div style={{background:'#fff',border:'0.5px solid #BBDEFB',borderRadius:'12px',padding:'20px',marginBottom:'16px',boxShadow:'0 1px 4px #00000010'}}>
          <h2 style={{color:'#1565C0',fontSize:'16px',marginBottom:'14px'}}>👤 Nuevo cliente</h2>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'12px',marginBottom:'14px'}}>
            <div>
              <label style={{fontSize:'12px',color:'#1565C0',display:'block',marginBottom:'6px'}}>Nombre *</label>
              <input value={formCliente.nombre}
                onChange={e => setFormCliente({...formCliente, nombre: e.target.value.toLowerCase().replace(/(^|\s)\S/g, t => t.toUpperCase())})}
                placeholder="Ej: Juan Pérez" style={inputStyle} />
            </div>
            <div>
              <label style={{fontSize:'12px',color:'#1565C0',display:'block',marginBottom:'6px'}}>Cédula</label>
              <input value={formCliente.cedula}
                onChange={e => { if(/^\d*$/.test(e.target.value)) setFormCliente({...formCliente, cedula: e.target.value}); }}
                placeholder="0000000000" style={inputStyle} />
            </div>
            <div>
              <label style={{fontSize:'12px',color:'#1565C0',display:'block',marginBottom:'6px'}}>Teléfono</label>
              <input value={formCliente.telefono}
                onChange={e => { if(/^\d*$/.test(e.target.value)) setFormCliente({...formCliente, telefono: e.target.value}); }}
                placeholder="0991234567" style={inputStyle} />
            </div>
          </div>
          <div style={{display:'flex',gap:'8px',justifyContent:'flex-end'}}>
            <button onClick={() => setMostrarFormCliente(false)}
              style={{padding:'8px 16px',borderRadius:'6px',border:'1px solid #e0e0e0',background:'#fff',color:'#666',cursor:'pointer'}}>
              Cancelar
            </button>
            <button onClick={guardarCliente}
              style={{padding:'8px 16px',borderRadius:'6px',border:'none',background:'#1565C0',color:'#fff',fontWeight:'500',cursor:'pointer'}}>
              💾 Guardar cliente
            </button>
          </div>
        </div>
      )}

      {mostrarForm && (
        <div style={{background:'#fff',border:'0.5px solid #BBDEFB',borderRadius:'12px',padding:'20px',marginBottom:'16px',boxShadow:'0 1px 4px #00000010'}}>
          <h2 style={{color:'#1565C0',fontSize:'16px',marginBottom:'14px'}}>{editId ? '✏️ Editar cuenta' : '➕ Nueva cuenta'}</h2>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'12px',marginBottom:'14px'}}>
            <div>
              <label style={{fontSize:'12px',color:'#1565C0',display:'block',marginBottom:'6px'}}>Cliente *</label>
              <select value={form.cliente_id} onChange={e => setForm({...form, cliente_id: e.target.value})} style={inputStyle}>
                <option value="">Selecciona un cliente</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label style={{fontSize:'12px',color:'#1565C0',display:'block',marginBottom:'6px'}}>Monto ($) *</label>
              <input value={form.monto_total}
                onChange={e => { if(/^\d*\.?\d*$/.test(e.target.value)) setForm({...form, monto_total: e.target.value}); }}
                placeholder="0.00" style={inputStyle} />
            </div>
            <div>
              <label style={{fontSize:'12px',color:'#1565C0',display:'block',marginBottom:'6px'}}>Vencimiento *</label>
              <input type="date" value={form.vencimiento} onChange={e => setForm({...form, vencimiento: e.target.value})} style={inputStyle} />
            </div>
          </div>
          <div style={{display:'flex',gap:'8px',justifyContent:'flex-end'}}>
            <button onClick={() => { setMostrarForm(false); setEditId(null); }}
              style={{padding:'8px 16px',borderRadius:'6px',border:'1px solid #e0e0e0',background:'#fff',color:'#666',cursor:'pointer'}}>
              Cancelar
            </button>
            <button onClick={guardar}
              style={{padding:'8px 16px',borderRadius:'6px',border:'none',background:'#1565C0',color:'#fff',fontWeight:'500',cursor:'pointer'}}>
              💾 Guardar
            </button>
          </div>
        </div>
      )}

      <div style={{display:'flex',gap:'8px',marginBottom:'12px',flexWrap:'wrap'}}>
        {['todas','pendiente','pagada','vencida'].map(f => (
          <button key={f} onClick={() => setFiltroEstado(f)}
            style={{padding:'6px 14px',borderRadius:'20px',border:'none',fontSize:'12px',cursor:'pointer',
              background: filtroEstado===f ? '#1565C0' : '#fff',
              color: filtroEstado===f ? '#fff' : '#666',
              boxShadow:'0 1px 3px #00000015'}}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div style={{display:'flex',gap:'12px',marginBottom:'16px',flexWrap:'wrap',alignItems:'center'}}>
        <label style={{fontSize:'12px',color:'#666',display:'flex',alignItems:'center',gap:'6px'}}>
          📅 Mes:
          <input type="month" value={mesFiltro} disabled={todosMeses}
            onChange={e => setMesFiltro(e.target.value)}
            style={{padding:'7px 10px',borderRadius:'6px',border:'1px solid #BBDEFB',background: todosMeses ? '#f0f0f0' : '#fff',color:'#333',fontSize:'13px'}} />
        </label>
        <label style={{fontSize:'12px',color:'#666',display:'flex',alignItems:'center',gap:'6px',cursor:'pointer'}}>
          <input type="checkbox" checked={todosMeses} onChange={e => setTodosMeses(e.target.checked)} />
          Ver todos los meses
        </label>
        <input placeholder="🔍 Buscar cliente..." value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          style={{flex:1,minWidth:'160px',padding:'8px 12px',borderRadius:'6px',border:'1px solid #BBDEFB',background:'#fff',color:'#333',fontSize:'13px',boxSizing:'border-box'}} />
      </div>

      <div style={{background:'#fff',borderRadius:'12px',border:'0.5px solid #e0e0e0',boxShadow:'0 1px 4px #00000010',overflowX:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
          <thead>
            <tr style={{background:'#E3F2FD'}}>
              {['Cliente','Total','Pagado','Saldo','Vence','Estado','Acciones'].map(h => (
                <th key={h} style={{padding:'12px 10px',textAlign:'left',color:'#1565C0',borderBottom:'1px solid #BBDEFB',fontSize:'13px',whiteSpace:'nowrap'}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtradas.length === 0 ? (
              <tr><td colSpan={7} style={{padding:'20px',textAlign:'center',color:'#999'}}>No hay cuentas registradas.</td></tr>
            ) : (
              filtradas.map(c => (
                <tr key={c.id} style={{borderBottom:'0.5px solid #e0e0e0'}}>
                  <td style={{padding:'12px 10px',color:'#333',fontWeight:'500'}}>{c.cliente_nombre}</td>
                  <td style={{padding:'12px 10px',color:'#333'}}>${parseFloat(c.monto_total).toFixed(2)}</td>
                  <td style={{padding:'12px 10px',color:'#2E7D32'}}>${parseFloat(c.monto_pagado).toFixed(2)}</td>
                  <td style={{padding:'12px 10px',color:'#E65100',fontWeight:'500'}}>${parseFloat(c.saldo).toFixed(2)}</td>
                  <td style={{padding:'12px 10px',color:'#666',whiteSpace:'nowrap'}}>{new Date(c.vencimiento).toLocaleDateString()}</td>
                  <td style={{padding:'12px 10px'}}>
                    <span style={{padding:'3px 10px',borderRadius:'20px',fontSize:'11px',fontWeight:'500',
                      background: bgEstado(c.estado), color: colorEstado(c.estado),
                      border:`1px solid ${colorEstado(c.estado)}30`}}>
                      {c.estado}
                    </span>
                  </td>
                  <td style={{padding:'12px 10px'}}>
                    <div style={{display:'flex',gap:'4px'}}>
                      {c.estado !== 'pagada' && (
                        <button onClick={() => abonar(c.id, c.saldo)}
                          style={{padding:'4px 10px',borderRadius:'5px',border:'1px solid #1565C0',background:'#E3F2FD',color:'#1565C0',cursor:'pointer',fontSize:'11px'}}>
                          💵
                        </button>
                      )}
                      <button onClick={() => editar(c)}
                        style={{padding:'4px 10px',borderRadius:'5px',border:'1px solid #BBDEFB',background:'#fff',color:'#1565C0',cursor:'pointer',fontSize:'11px'}}>
                        ✏️
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