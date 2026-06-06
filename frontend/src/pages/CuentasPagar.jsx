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
      setMostrarFormProveedor(false); setEditProveedorId(null); cargar();
    }
    setTimeout(() => setMensaje(''), 3000);
  };

  const editarProveedor = (p) => {
    setFormProveedor({ nombre: p.nombre, ruc: p.ruc || '', telefono: p.telefono || '' });
    setEditProveedorId(p.id); setMostrarFormProveedor(true);
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
        <h1 style={{color:'#1565C0',fontSize:'22px',margin:0}}>🏪 Cuentas por Pagar</h1>
        <div style={{display:'flex',gap:'8px'}}>
          <button onClick={() => setMostrarListaProveedores(!mostrarListaProveedores)}
            style={{background:'#fff',border:'1px solid #BBDEFB',borderRadius:'8px',padding:'8px 14px',cursor:'pointer',color:'#1565C0',fontSize:'13px'}}>
            🏭 Proveedores
          </button>
          <button onClick={() => { setForm({ proveedor_id:'', monto_total:'', vencimiento:'' }); setEditId(null); setMostrarForm(true); }}
            style={{background:'#1565C0',border:'none',borderRadius:'8px',padding:'8px 16px',fontWeight:'500',cursor:'pointer',color:'#fff',fontSize:'13px'}}>
            + Nueva cuenta
          </button>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'12px',marginBottom:'20px'}}>
        <div style={{background:'#fff',borderRadius:'12px',padding:'16px',border:'0.5px solid #FFE0B2',boxShadow:'0 1px 4px #00000010'}}>
          <div style={{fontSize:'12px',color:'#666',marginBottom:'4px'}}>Total por pagar</div>
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

      {mostrarListaProveedores && (
        <div style={{background:'#fff',border:'0.5px solid #BBDEFB',borderRadius:'12px',padding:'20px',marginBottom:'16px',boxShadow:'0 1px 4px #00000010'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'14px'}}>
            <h2 style={{color:'#1565C0',fontSize:'15px',margin:0}}>🏭 Gestión de Proveedores</h2>
            <button onClick={() => { setFormProveedor({ nombre:'', ruc:'', telefono:'' }); setEditProveedorId(null); setMostrarFormProveedor(true); }}
              style={{background:'#1565C0',border:'none',borderRadius:'6px',padding:'6px 12px',color:'#fff',cursor:'pointer',fontSize:'12px'}}>
              + Nuevo proveedor
            </button>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(250px,1fr))',gap:'8px'}}>
            {proveedores.map(p => (
              <div key={p.id} style={{background:'#f8f9fa',borderRadius:'8px',padding:'10px 12px',border:'0.5px solid #e0e0e0',display:'flex',alignItems:'center',gap:'8px'}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:'13px',color:'#333',fontWeight:'500'}}>{p.nombre}</div>
                  <div style={{fontSize:'11px',color:'#999'}}>{p.ruc || 'Sin RUC'}</div>
                </div>
                <button onClick={() => editarProveedor(p)}
                  style={{background:'transparent',border:'none',color:'#1565C0',cursor:'pointer',fontSize:'14px'}}>✏️</button>
                <button onClick={() => eliminarProveedor(p.id)}
                  style={{background:'transparent',border:'none',color:'#C62828',cursor:'pointer',fontSize:'14px'}}>🗑️</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {mostrarFormProveedor && (
        <div style={{background:'#fff',border:'0.5px solid #BBDEFB',borderRadius:'12px',padding:'20px',marginBottom:'16px',boxShadow:'0 1px 4px #00000010'}}>
          <h2 style={{color:'#1565C0',fontSize:'16px',marginBottom:'14px'}}>{editProveedorId ? '✏️ Editar proveedor' : '🏭 Nuevo proveedor'}</h2>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'12px',marginBottom:'14px'}}>
            <div>
              <label style={{fontSize:'12px',color:'#1565C0',display:'block',marginBottom:'6px'}}>Nombre *</label>
              <input value={formProveedor.nombre}
                onChange={e => setFormProveedor({...formProveedor, nombre: formatearNombre(e.target.value)})}
                placeholder="Ej: Distribuidora Xyz" style={inputStyle} />
            </div>
            <div>
              <label style={{fontSize:'12px',color:'#1565C0',display:'block',marginBottom:'6px'}}>RUC</label>
              <input value={formProveedor.ruc}
                onChange={e => { if(/^\d*$/.test(e.target.value)) setFormProveedor({...formProveedor, ruc: e.target.value}); }}
                placeholder="0000000000001" style={inputStyle} />
            </div>
            <div>
              <label style={{fontSize:'12px',color:'#1565C0',display:'block',marginBottom:'6px'}}>Teléfono</label>
              <input value={formProveedor.telefono}
                onChange={e => { if(/^\d*$/.test(e.target.value)) setFormProveedor({...formProveedor, telefono: e.target.value}); }}
                placeholder="0991234567" style={inputStyle} />
            </div>
          </div>
          <div style={{display:'flex',gap:'8px',justifyContent:'flex-end'}}>
            <button onClick={() => { setMostrarFormProveedor(false); setEditProveedorId(null); }}
              style={{padding:'8px 16px',borderRadius:'6px',border:'1px solid #e0e0e0',background:'#fff',color:'#666',cursor:'pointer'}}>
              Cancelar
            </button>
            <button onClick={guardarProveedor}
              style={{padding:'8px 16px',borderRadius:'6px',border:'none',background:'#1565C0',color:'#fff',fontWeight:'500',cursor:'pointer'}}>
              💾 Guardar proveedor
            </button>
          </div>
        </div>
      )}

      {mostrarForm && (
        <div style={{background:'#fff',border:'0.5px solid #BBDEFB',borderRadius:'12px',padding:'20px',marginBottom:'16px',boxShadow:'0 1px 4px #00000010'}}>
          <h2 style={{color:'#1565C0',fontSize:'16px',marginBottom:'14px'}}>{editId ? '✏️ Editar cuenta' : '➕ Nueva cuenta por pagar'}</h2>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'12px',marginBottom:'14px'}}>
            <div>
              <label style={{fontSize:'12px',color:'#1565C0',display:'block',marginBottom:'6px'}}>Proveedor *</label>
              <select value={form.proveedor_id} onChange={e => setForm({...form, proveedor_id: e.target.value})} style={inputStyle}>
                <option value="">Selecciona un proveedor</option>
                {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
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

      <div style={{display:'flex',gap:'8px',marginBottom:'16px'}}>
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

      <div style={{background:'#fff',borderRadius:'12px',border:'0.5px solid #e0e0e0',boxShadow:'0 1px 4px #00000010',overflowX:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
          <thead>
            <tr style={{background:'#E3F2FD'}}>
              {['Proveedor','Total','Pagado','Saldo','Vence','Estado','Acciones'].map(h => (
                <th key={h} style={{padding:'12px 10px',textAlign:'left',color:'#1565C0',borderBottom:'1px solid #BBDEFB',whiteSpace:'nowrap'}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtradas.length === 0 ? (
              <tr><td colSpan={7} style={{padding:'20px',textAlign:'center',color:'#999'}}>No hay cuentas registradas.</td></tr>
            ) : (
              filtradas.map(c => (
                <tr key={c.id} style={{borderBottom:'0.5px solid #e0e0e0'}}>
                  <td style={{padding:'12px 10px',color:'#333',fontWeight:'500'}}>{c.proveedor_nombre}</td>
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
                      <button onClick={() => eliminar(c.id)}
                        style={{padding:'4px 10px',borderRadius:'5px',border:'1px solid #FFCDD2',background:'#FFEBEE',color:'#C62828',cursor:'pointer',fontSize:'11px'}}>
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