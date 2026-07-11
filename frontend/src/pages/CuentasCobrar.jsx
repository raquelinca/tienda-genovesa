import { Fragment, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { limpiarMonto, MAX_MONTO } from '../utils/numeros';
import Swal from 'sweetalert2';

export default function CuentasCobrar() {
  const [cuentas, setCuentas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [mostrarFormCliente, setMostrarFormCliente] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todas');
  const [busqueda, setBusqueda] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ cliente_id: '', monto_total: '', vencimiento: '', estado: 'pendiente' });
  const [formCliente, setFormCliente] = useState({ nombre: '', cedula: '', telefono: '', cupo_credito: '' });
  const [expandidos, setExpandidos] = useState(new Set());
  const [movimientos, setMovimientos] = useState({});
  const [cargandoMov, setCargandoMov] = useState(null);

  const toggleExpandido = async (clienteId) => {
    setExpandidos(prev => {
      const next = new Set(prev);
      if (next.has(clienteId)) next.delete(clienteId); else next.add(clienteId);
      return next;
    });
    // Cargar movimientos si no están cargados
    if (!movimientos[clienteId]) {
      setCargandoMov(clienteId);
      try {
        const res = await api.get(`/cuentas-cobrar/movimientos/${clienteId}`);
        if (res.ok && Array.isArray(res.data)) {
          setMovimientos(prev => ({ ...prev, [clienteId]: res.data }));
        }
      } catch {}
      setCargandoMov(null);
    }
  };

  const cargar = async () => {
    try {
      const params = new URLSearchParams();
      if (fechaInicio) params.set('desde', fechaInicio);
      if (fechaFin) params.set('hasta', fechaFin);
      const qs = params.toString();
      const c = await api.get(`/cuentas-cobrar${qs ? '?' + qs : ''}`);
      if (c.ok && Array.isArray(c.data)) setCuentas(c.data);
      const cl = await api.get('/clientes');
      if (cl.ok && Array.isArray(cl.data)) setClientes(cl.data);
    } catch { setCuentas([]); }
  };

  useEffect(() => { cargar(); }, [fechaInicio, fechaFin]);

  const limpiarFechas = () => { setFechaInicio(''); setFechaFin(''); };

  const guardar = async () => {
    if (!form.cliente_id) { setMensaje('⚠️ Selecciona un cliente.'); return; }
    if (!form.monto_total || parseFloat(form.monto_total) <= 0) { setMensaje('⚠️ El monto debe ser mayor a 0.'); return; }
    if (!/^\d+(\.\d{1,2})?$/.test(form.monto_total) || parseFloat(form.monto_total) > MAX_MONTO) {
      setMensaje(`⚠️ El monto debe ser un número válido de hasta 2 decimales y no mayor a ${MAX_MONTO}.`); return;
    }
    if (form.estado !== 'credito' && !form.vencimiento) { setMensaje('⚠️ La fecha de vencimiento es obligatoria.'); return; }
    const datos = {
      cliente_id: parseInt(form.cliente_id), monto_total: parseFloat(form.monto_total),
      vencimiento: form.estado === 'credito' ? null : form.vencimiento,
      ...(editId ? {} : { estado: form.estado }),
    };
    const res = editId ? await api.put(`/cuentas-cobrar/${editId}`, datos) : await api.post('/cuentas-cobrar', datos);
    if (res.ok) {
      setMensaje('✅ Cuenta guardada.');
      setForm({ cliente_id: '', monto_total: '', vencimiento: '', estado: 'pendiente' });
      setMostrarForm(false); setEditId(null); cargar();
    } else {
      setMensaje('⚠️ ' + (res.mensaje || 'No se pudo guardar la cuenta.'));
    }
    setTimeout(() => setMensaje(''), 3000);
  };

  const editar = (c) => {
    setForm({ cliente_id: c.cliente_id, monto_total: c.monto_total, vencimiento: c.vencimiento?.split('T')[0] });
    setEditId(c.id); setMostrarForm(true);
  };

  const eliminar = async (id) => {
    const result = await Swal.fire({
      title: '¿Eliminar esta cuenta?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#C62828',
      cancelButtonColor: '#1565C0',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;
    const res = await api.delete(`/cuentas-cobrar/${id}`);
    if (res.ok) { setMensaje('✅ Cuenta eliminada.'); cargar(); }
    setTimeout(() => setMensaje(''), 3000);
  };

  const abonar = async (id, saldo) => {
    const monto = prompt(`¿Cuánto deseas abonar? (Saldo: $${saldo})`);
    if (!monto || isNaN(monto) || parseFloat(monto) <= 0) return;
    if (parseFloat(monto) > MAX_MONTO) { alert(`El abono no puede ser mayor a ${MAX_MONTO}.`); return; }
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
    const nombre = formCliente.nombre.trim();
    if (!nombre) { setMensaje('⚠️ El nombre es obligatorio.'); return; }
    if (nombre.length < 2 || nombre.length > 60) { setMensaje('⚠️ El nombre debe tener entre 2 y 60 caracteres.'); return; }
    if (formCliente.cedula && formCliente.cedula.length !== 10 && formCliente.cedula.length !== 13) {
      setMensaje('⚠️ La cédula debe tener 10 dígitos o el RUC 13.'); return;
    }
    if (formCliente.telefono && (formCliente.telefono.length < 7 || formCliente.telefono.length > 10)) {
      setMensaje('⚠️ El teléfono debe tener entre 7 y 10 dígitos.'); return;
    }
    if (formCliente.cupo_credito) {
      if (parseFloat(formCliente.cupo_credito) < 0) { setMensaje('⚠️ El cupo de crédito no puede ser negativo.'); return; }
      if (parseFloat(formCliente.cupo_credito) > MAX_MONTO) { setMensaje(`⚠️ El cupo de crédito no puede ser mayor a ${MAX_MONTO}.`); return; }
    }
    const res = await api.post('/clientes', { ...formCliente, nombre });
    if (res.ok) {
      setMensaje(res.existente ? `ℹ️ ${res.mensaje}` : '✅ Cliente agregado.');
      setFormCliente({ nombre: '', cedula: '', telefono: '', cupo_credito: '' });
      setMostrarFormCliente(false); cargar();
    } else {
      setMensaje('⚠️ ' + (res.mensaje || 'No se pudo agregar el cliente.'));
    }
    setTimeout(() => setMensaje(''), 4000);
  };

  // El rango de fechas ya viene aplicado desde el backend (las pendientes/vencidas
  // siempre se incluyen ahí; el rango solo restringe las pagadas). Acá solo queda
  // el filtro por estado y la búsqueda de texto, que son puramente de UI.
  const filtradas = Array.isArray(cuentas) ? cuentas.filter(c => {
    if (filtroEstado !== 'todas' && c.estado !== filtroEstado) return false;
    if (busqueda && !String(c.cliente_nombre || '').toLowerCase().includes(busqueda.toLowerCase())) return false;
    return true;
  }) : [];
  const totalPendiente = Array.isArray(cuentas) ? cuentas.filter(c => c.estado === 'pendiente').reduce((s, c) => s + parseFloat(c.saldo), 0) : 0;

  // Info de clientes con cupo para mostrar en la tabla
  const clientesMap = useMemo(() => {
    const map = new Map();
    clientes.forEach(c => map.set(c.id, c));
    return map;
  }, [clientes]);

  // Una fila por cliente (no por cuenta): agrupa las cuentas ya filtradas.
  // Las pendientes/vencidas se resumen en el encabezado; el historial de
  // pagadas queda oculto hasta que se despliega la fila del cliente.
  const grupos = useMemo(() => {
    const map = new Map();
    filtradas.forEach(c => {
      if (!map.has(c.cliente_id)) map.set(c.cliente_id, { cliente_id: c.cliente_id, cliente_nombre: c.cliente_nombre, cuentas: [] });
      map.get(c.cliente_id).cuentas.push(c);
    });
    const arr = [...map.values()].map(g => {
      const activas = g.cuentas.filter(c => c.estado !== 'pagada');
      const totalActivo = activas.reduce((s, c) => s + parseFloat(c.saldo), 0);
      const tieneVencida = activas.some(c => c.estado === 'vencida');
      const proximoVencimiento = activas.reduce((min, c) => (!min || new Date(c.vencimiento) < new Date(min)) ? c.vencimiento : min, null);
      const infoCliente = clientesMap.get(g.cliente_id);
      const cupo = infoCliente ? parseFloat(infoCliente.cupo_credito) : 0;
      const disponible = cupo > 0 ? Math.max(cupo - totalActivo, 0) : 0;
      return {
        ...g, totalActivo, tieneVencida, proximoVencimiento,
        cantidadActivas: activas.length,
        cantidadPagadas: g.cuentas.length - activas.length,
        cupo, disponible,
      };
    });
    arr.sort((a, b) => {
      if (a.proximoVencimiento && b.proximoVencimiento) return new Date(a.proximoVencimiento) - new Date(b.proximoVencimiento);
      if (a.proximoVencimiento) return -1;
      if (b.proximoVencimiento) return 1;
      return a.cliente_nombre.localeCompare(b.cliente_nombre);
    });
    return arr;
  }, [filtradas]);

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
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:'12px',marginBottom:'14px'}}>
            <div>
              <label style={{fontSize:'12px',color:'#1565C0',display:'block',marginBottom:'6px'}}>Nombre *</label>
              <input value={formCliente.nombre} maxLength={60}
                onChange={e => setFormCliente({...formCliente, nombre: e.target.value.toLowerCase().replace(/(^|\s)\S/g, t => t.toUpperCase())})}
                placeholder="Ej: Juan Pérez" style={inputStyle} />
            </div>
            <div>
              <label style={{fontSize:'12px',color:'#1565C0',display:'block',marginBottom:'6px'}}>Cédula</label>
              <input value={formCliente.cedula} maxLength={13}
                onChange={e => { if(/^\d*$/.test(e.target.value)) setFormCliente({...formCliente, cedula: e.target.value}); }}
                placeholder="0000000000" style={inputStyle} />
            </div>
            <div>
              <label style={{fontSize:'12px',color:'#1565C0',display:'block',marginBottom:'6px'}}>Teléfono</label>
              <input value={formCliente.telefono} maxLength={10}
                onChange={e => { if(/^\d*$/.test(e.target.value)) setFormCliente({...formCliente, telefono: e.target.value}); }}
                placeholder="0991234567" style={inputStyle} />
            </div>
            <div>
              <label style={{fontSize:'12px',color:'#1565C0',display:'block',marginBottom:'6px'}}>Cupo crédito ($)</label>
              <input value={formCliente.cupo_credito} maxLength={9}
                onChange={e => setFormCliente({...formCliente, cupo_credito: limpiarMonto(e.target.value)})}
                placeholder="0 = sin límite" style={inputStyle} />
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
              <input value={form.monto_total} maxLength={9}
                onChange={e => setForm({...form, monto_total: limpiarMonto(e.target.value)})}
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
          📅 Desde:
          <input type="date" value={fechaInicio}
            onChange={e => setFechaInicio(e.target.value)}
            style={{padding:'7px 10px',borderRadius:'6px',border:'1px solid #BBDEFB',background:'#fff',color:'#333',fontSize:'13px'}} />
        </label>
        <label style={{fontSize:'12px',color:'#666',display:'flex',alignItems:'center',gap:'6px'}}>
          Hasta:
          <input type="date" value={fechaFin}
            onChange={e => setFechaFin(e.target.value)}
            style={{padding:'7px 10px',borderRadius:'6px',border:'1px solid #BBDEFB',background:'#fff',color:'#333',fontSize:'13px'}} />
        </label>
        {(fechaInicio || fechaFin) && (
          <button onClick={limpiarFechas}
            style={{padding:'7px 12px',borderRadius:'6px',border:'1px solid #e0e0e0',background:'#fff',color:'#666',cursor:'pointer',fontSize:'12px'}}>
            🔄 Limpiar fechas
          </button>
        )}
        <span style={{fontSize:'11px',color:'#999'}}>Las cuentas pendientes/vencidas siempre se muestran; el rango solo filtra las pagadas.</span>
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
            {grupos.length === 0 ? (
              <tr><td colSpan={7} style={{padding:'20px',textAlign:'center',color:'#999'}}>No hay cuentas registradas.</td></tr>
            ) : (
              grupos.map(g => {
                const abierto = expandidos.has(g.cliente_id);
                const estadoGrupo = g.cantidadActivas === 0 ? 'pagada' : g.tieneVencida ? 'vencida' : 'pendiente';
                return (
                  <Fragment key={g.cliente_id}>
                    <tr onClick={() => toggleExpandido(g.cliente_id)}
                      style={{borderBottom:'0.5px solid #e0e0e0', background:'#F8FAFF', cursor:'pointer'}}>
                      <td style={{padding:'12px 10px',color:'#1565C0',fontWeight:'500'}}>
                        {abierto ? '▾' : '▸'} {g.cliente_nombre}
                      </td>
                      <td colSpan={2} style={{padding:'12px 10px',color:'#999',fontSize:'12px'}}>
                        {g.cantidadActivas} activa{g.cantidadActivas !== 1 ? 's' : ''} · {g.cantidadPagadas} pagada{g.cantidadPagadas !== 1 ? 's' : ''}
                      </td>
                      <td style={{padding:'12px 10px',color:'#E65100',fontWeight:'500'}}>${g.totalActivo.toFixed(2)}</td>
                      <td style={{padding:'12px 10px',color:'#666',whiteSpace:'nowrap'}}>
                        {g.proximoVencimiento ? new Date(g.proximoVencimiento).toLocaleDateString() : '—'}
                      </td>
                      <td style={{padding:'12px 10px'}}>
                        <span style={{padding:'3px 10px',borderRadius:'20px',fontSize:'11px',fontWeight:'500',
                          background: bgEstado(estadoGrupo), color: colorEstado(estadoGrupo),
                          border:`1px solid ${colorEstado(estadoGrupo)}30`}}>
                          {estadoGrupo}
                        </span>
                      </td>
                      <td style={{padding:'12px 10px',color:'#999',fontSize:'11px'}}>{abierto ? 'Ocultar' : 'Ver cuentas'}</td>
                    </tr>
                    {abierto && (
                      <>
                        {/* Información de cupo de crédito */}
                        {g.cupo > 0 && (
                          <tr style={{background:'#FFF8E1'}}>
                            <td colSpan={7} style={{padding:'8px 14px',fontSize:'12px',color:'#E65100'}}>
                              💳 Cupo crédito: <strong>${g.cupo.toFixed(2)}</strong>
                              &nbsp;·&nbsp; Usado: <strong style={{color:'#C62828'}}>${g.totalActivo.toFixed(2)}</strong>
                              &nbsp;·&nbsp; Disponible: <strong style={{color:'#2E7D32'}}>${g.disponible.toFixed(2)}</strong>
                            </td>
                          </tr>
                        )}
                      </>
                    )}
                    {abierto && g.cuentas.map(c => (
                      <tr key={c.id} style={{borderBottom:'0.5px solid #e0e0e0'}}>
                        <td style={{padding:'10px 10px 10px 28px',color:'#999',fontSize:'12px'}}>↳ cuenta #{c.id}</td>
                        <td style={{padding:'10px',color:'#333'}}>${parseFloat(c.monto_total).toFixed(2)}</td>
                        <td style={{padding:'10px',color:'#2E7D32'}}>${parseFloat(c.monto_pagado).toFixed(2)}</td>
                        <td style={{padding:'10px',color:'#E65100',fontWeight:'500'}}>${parseFloat(c.saldo).toFixed(2)}</td>
                        <td style={{padding:'10px',color:'#666',whiteSpace:'nowrap'}}>{c.vencimiento ? new Date(c.vencimiento).toLocaleDateString() : '—'}</td>
                        <td style={{padding:'10px'}}>
                          <span style={{padding:'3px 10px',borderRadius:'20px',fontSize:'11px',fontWeight:'500',
                            background: bgEstado(c.estado), color: colorEstado(c.estado),
                            border:`1px solid ${colorEstado(c.estado)}30`}}>
                            {c.estado}
                          </span>
                        </td>
                        <td style={{padding:'10px'}}>
                          <div style={{display:'flex',gap:'4px'}}>
                            {c.estado !== 'pagada' && c.estado !== 'credito' && (
                              <button onClick={(e) => { e.stopPropagation(); abonar(c.id, c.saldo); }}
                                style={{padding:'4px 10px',borderRadius:'5px',border:'1px solid #1565C0',background:'#E3F2FD',color:'#1565C0',cursor:'pointer',fontSize:'11px'}}>
                                💵
                              </button>
                            )}
                            {c.estado !== 'credito' && (
                              <button onClick={(e) => { e.stopPropagation(); editar(c); }}
                                style={{padding:'4px 10px',borderRadius:'5px',border:'1px solid #BBDEFB',background:'#fff',color:'#1565C0',cursor:'pointer',fontSize:'11px'}}>
                                ✏️
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {/* Historial de movimientos */}
                    {abierto && (
                      <tr>
                        <td colSpan={7} style={{padding:'10px 20px',background:'#F8F9FA'}}>
                          <div style={{fontSize:'13px',color:'#1565C0',fontWeight:'500',marginBottom:'8px'}}>
                            📋 Historial de movimientos
                          </div>
                          {cargandoMov === g.cliente_id ? (
                            <div style={{fontSize:'12px',color:'#999'}}>Cargando movimientos...</div>
                          ) : movimientos[g.cliente_id] && movimientos[g.cliente_id].length > 0 ? (
                            <table style={{width:'100%',borderCollapse:'collapse',fontSize:'12px'}}>
                              <thead>
                                <tr style={{background:'#E3F2FD'}}>
                                  <th style={{padding:'6px 8px',textAlign:'left',color:'#1565C0',borderBottom:'1px solid #BBDEFB'}}>Fecha</th>
                                  <th style={{padding:'6px 8px',textAlign:'left',color:'#1565C0',borderBottom:'1px solid #BBDEFB'}}>Concepto</th>
                                  <th style={{padding:'6px 8px',textAlign:'right',color:'#1565C0',borderBottom:'1px solid #BBDEFB'}}>Cargo</th>
                                  <th style={{padding:'6px 8px',textAlign:'right',color:'#1565C0',borderBottom:'1px solid #BBDEFB'}}>Abono</th>
                                  <th style={{padding:'6px 8px',textAlign:'right',color:'#1565C0',borderBottom:'1px solid #BBDEFB'}}>Saldo</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(() => {
                                  let acumulado = 0;
                                  return movimientos[g.cliente_id].map(m => {
                                    const monto = parseFloat(m.monto);
                                    if (m.tipo === 'cargo') acumulado += monto;
                                    else acumulado -= monto;
                                    return (
                                      <tr key={m.id} style={{borderBottom:'0.5px solid #e0e0e0'}}>
                                        <td style={{padding:'6px 8px',color:'#666',whiteSpace:'nowrap'}}>
                                          {new Date(m.fecha).toLocaleDateString()} {new Date(m.fecha).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}
                                        </td>
                                        <td style={{padding:'6px 8px',color:'#333'}}>{m.descripcion}</td>
                                        <td style={{padding:'6px 8px',textAlign:'right',color:'#C62828'}}>
                                          {m.tipo === 'cargo' ? `$${monto.toFixed(2)}` : '—'}
                                        </td>
                                        <td style={{padding:'6px 8px',textAlign:'right',color:'#2E7D32'}}>
                                          {m.tipo === 'abono' ? `$${monto.toFixed(2)}` : '—'}
                                        </td>
                                        <td style={{padding:'6px 8px',textAlign:'right',color:'#333',fontWeight:'500'}}>
                                          ${acumulado.toFixed(2)}
                                        </td>
                                      </tr>
                                    );
                                  });
                                })()}
                              </tbody>
                            </table>
                          ) : (
                            <div style={{fontSize:'12px',color:'#999'}}>No hay movimientos registrados.</div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}