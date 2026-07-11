import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { limpiarMonto } from '../utils/numeros';
import { validarIdentificacion } from '../utils/validacionCedula';

export default function Ventas() {
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [tipoPago, setTipoPago] = useState('efectivo');
  const [mensaje, setMensaje] = useState('');
  const [montoRecibido, setMontoRecibido] = useState('');
  const [tipoCliente, setTipoCliente] = useState('consumidor');
  const [datosCliente, setDatosCliente] = useState({ nombre: '', cedula: '', correo: '', celular: '' });
  const [ultimaVentaId, setUltimaVentaId] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [clienteId, setClienteId] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [consultandoSri, setConsultandoSri] = useState(false);
  const [validacionCedula, setValidacionCedula] = useState({ valido: false, tipo: 'invalido', mensaje: '' });
  const [clienteLocal, setClienteLocal] = useState(null);
  const [esClienteNuevo, setEsClienteNuevo] = useState(false);

  const cargarClientes = async () => {
    try {
      const data = await api.get('/clientes');
      if (data.ok && Array.isArray(data.data)) setClientes(data.data);
    } catch { setClientes([]); }
  };

  const cargarProductos = async () => {
    try {
      const data = await api.get('/productos');
      if (data.ok && Array.isArray(data.data)) setProductos(data.data);
    } catch { setProductos([]); }
  };

  useEffect(() => { cargarProductos(); cargarClientes(); }, []);

  /**
   * FLUJO DE CAPTURA DE DATOS DEL CLIENTE
   * ======================================
   * Paso 1: Al escribir la cédula/RUC, se ejecuta validación Módulo 10 en tiempo real.
   * Paso 2: Si pasa Módulo 10, se busca el cliente en la BD local (clientes[]).
   * Paso 3: Si existe local → autocompleta nombre, correo, celular.
   * Paso 4: Si no existe local → consulta SRI externo para obtener razón social.
   * Paso 5: Si el SRI responde, autocompleta el nombre. Si no, el usuario lo escribe.
   * Paso 6: Si es cliente nuevo (no está en BD local), habilita correo* y celular.
   */
  const manejarCambioCedula = (valor) => {
    // Solo permitir dígitos
    const soloDigitos = valor.replace(/\D/g, '');
    setDatosCliente(prev => ({ ...prev, cedula: soloDigitos }));

    // Reiniciar estados de búsqueda
    setClienteLocal(null);
    setEsClienteNuevo(false);

    // Validar solo cuando tenga 10 o 13 dígitos
    if (soloDigitos.length === 10 || soloDigitos.length === 13) {
      const resultado = validarIdentificacion(soloDigitos);
      setValidacionCedula(resultado);

      if (resultado.valido) {
        // PASO 2: Buscar en BD local primero
        const encontrado = clientes.find(c =>
          c.cedula && c.cedula.replace(/\D/g, '') === soloDigitos
        );

        if (encontrado) {
          // PASO 3: Cliente existe en BD local
          setClienteLocal(encontrado);
          setEsClienteNuevo(false);
          setDatosCliente(prev => ({
            ...prev,
            nombre: encontrado.nombre,
            correo: encontrado.correo || '',
            celular: encontrado.celular || '',
          }));
          setValidacionCedula({
            valido: true,
            tipo: resultado.tipo,
            mensaje: `✅ ${resultado.tipo === 'cedula' ? 'Cédula' : 'RUC'} válido — Cliente registrado`,
          });
        } else {
          // PASO 4: No existe en local → consultar SRI
          setEsClienteNuevo(true);
          consultarSri(soloDigitos);
        }
      }
    } else if (soloDigitos.length > 0) {
      setValidacionCedula({
        valido: false,
        tipo: 'invalido',
        mensaje: `Ingresando... (${soloDigitos.length}/10 o 13)`,
      });
    } else {
      setValidacionCedula({ valido: false, tipo: 'invalido', mensaje: '' });
    }
  };

  const consultarSri = async (cedula) => {
    if (cedula.length !== 10 && cedula.length !== 13) return;
    setConsultandoSri(true);
    try {
      const res = await api.get(`/sri/contribuyente/${cedula}`);
      if (res.ok && res.razonSocial) {
        const nombreFormateado = res.razonSocial
          .toLowerCase()
          .replace(/(^|\s)\S/g, t => t.toUpperCase());
        setDatosCliente(prev => ({
          ...prev,
          nombre: nombreFormateado,
        }));
        setValidacionCedula({
          valido: true,
          tipo: cedula.length === 10 ? 'cedula' : 'ruc',
          mensaje: `✅ Dato obtenido del SRI: ${res.razonSocial}`,
        });
      } else {
        // PASO 5: SRI no respondió, el usuario debe escribir manualmente
        setValidacionCedula({
          valido: true,
          tipo: cedula.length === 10 ? 'cedula' : 'ruc',
          mensaje: `⚠️ No se encontró en SRI. Ingresa los datos manualmente.`,
        });
      }
    } catch {
      setValidacionCedula({
        valido: true,
        tipo: cedula.length === 10 ? 'cedula' : 'ruc',
        mensaje: `⚠️ SRI no disponible. Ingresa los datos manualmente.`,
      });
    } finally {
      setConsultandoSri(false);
    }
  };

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
      .map(i => {
        if (i.id !== id) return i;
        const nueva = i.cantidad + delta;
        if (delta > 0 && nueva > i.stock_actual) return i;
        return { ...i, cantidad: nueva };
      })
      .filter(i => i.cantidad > 0)
    );
  };

  const total = carrito.reduce((s, i) => s + parseFloat(i.precio_venta) * i.cantidad, 0);
  const vuelto = montoRecibido && parseFloat(montoRecibido) >= total ? parseFloat(montoRecibido) - total : 0;

  const confirmar = async () => {
    if (carrito.length === 0 || enviando) return;
    if (tipoPago === 'efectivo' && montoRecibido && parseFloat(montoRecibido) < total) {
      setMensaje('❌ El monto recibido es menor al total.'); return;
    }
    if (tipoCliente === 'factura') {
      const nombre = datosCliente.nombre.trim();
      if (!nombre || !datosCliente.cedula.trim()) { setMensaje('❌ Ingresa el nombre y cédula/RUC del cliente.'); return; }
      if (nombre.length < 2 || nombre.length > 60) { setMensaje('❌ El nombre debe tener entre 2 y 60 caracteres.'); return; }
      if (datosCliente.cedula.length !== 10 && datosCliente.cedula.length !== 13) {
        setMensaje('❌ La cédula debe tener 10 dígitos o el RUC 13.'); return;
      }
      // Validación Módulo 10 al confirmar
      const val = validarIdentificacion(datosCliente.cedula);
      if (!val.valido) {
        setMensaje('❌ ' + val.mensaje); return;
      }
      // Para clientes nuevos, correo es obligatorio (facturación electrónica)
      if (esClienteNuevo && !datosCliente.correo.trim()) {
        setMensaje('❌ El correo electrónico es obligatorio para facturación electrónica.'); return;
      }
    }
    if (tipoPago === 'credito') {
      if (!clienteId) { setMensaje('❌ Para crédito, elige un cliente o "Cliente nuevo".'); return; }
      if (clienteId === 'nuevo') {
        const nombre = datosCliente.nombre.trim();
        if (!nombre) { setMensaje('❌ Escribe el nombre del cliente nuevo.'); return; }
        if (nombre.length < 2 || nombre.length > 60) { setMensaje('❌ El nombre debe tener entre 2 y 60 caracteres.'); return; }
        if (datosCliente.cedula && datosCliente.cedula.length !== 10 && datosCliente.cedula.length !== 13) {
          setMensaje('❌ La cédula debe tener 10 dígitos o el RUC 13.'); return;
        }
      }
    }
    setEnviando(true);
    try {
      const res = await api.post('/ventas', {
        tipo_pago: tipoPago,
        tipo_cliente: tipoCliente,
        cliente_nombre: datosCliente.nombre || 'CONSUMIDOR FINAL',
        cliente_cedula: datosCliente.cedula || '9999999999999',
        cliente_correo: datosCliente.correo || '',
        cliente_celular: datosCliente.celular || '',
        cliente_id: (tipoPago === 'credito' && clienteId !== 'nuevo') ? parseInt(clienteId) : null,
        items: carrito.map(i => ({
          producto_id: i.id,
          cantidad: i.cantidad,
          precio_unitario: i.precio_venta
        }))
      });
      if (res.ok) {
        setUltimaVentaId(res.venta_id);
        let extra = '';
        if (res.cuentaCreada) extra = ' Cuenta creada en C×C.';
        else if (res.cajaRegistrada) extra = ' Sumado a caja.';
        else if (tipoPago === 'efectivo' && montoRecibido) extra = ` Vuelto: $${vuelto.toFixed(2)}`;
        setMensaje('✅ ¡Venta registrada!' + extra);
        setCarrito([]);
        setMontoRecibido('');
        setDatosCliente({ nombre: '', cedula: '', correo: '', celular: '' });
        setClienteId('');
        setTipoCliente('consumidor');
        setClienteLocal(null);
        setEsClienteNuevo(false);
        setValidacionCedula({ valido: false, tipo: 'invalido', mensaje: '' });
        cargarProductos();
        cargarClientes(); // refrescar clientes por si se creó uno nuevo
        setTimeout(() => { setMensaje(''); setUltimaVentaId(null); }, 8000);
      } else {
        setMensaje('❌ ' + (res.mensaje || 'No se pudo registrar la venta'));
        cargarProductos();
      }
    } catch { setMensaje('❌ Error al registrar la venta'); }
    finally { setEnviando(false); }
  };

  const filtrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) && p.stock_actual > 0
  );

  const enviarAlSRI = async (ventaId) => {
    setMensaje('⏳ Firmando y enviando al SRI...');
    try {
      const res = await api.post(`/factura/enviar-sri/${ventaId}`, {});
      const mensajesSri = Array.isArray(res.mensajes) && res.mensajes.length ? ' — ' + res.mensajes.join(' | ') : '';

      if (res.estadoAutorizacion === 'AUTORIZADO') {
        setMensaje(`✅ Factura AUTORIZADA por el SRI. No. autorización: ${res.numeroAutorizacion}`);
      } else if (res.estadoRecepcion === 'DEVUELTA') {
        setMensaje(`❌ El SRI DEVOLVIÓ el comprobante en la recepción.${mensajesSri}`);
      } else if (res.estadoAutorizacion === 'EN PROCESAMIENTO') {
        setMensaje(`❌ El SRI aún está procesando el comprobante. Vuelve a intentar en unos segundos.${mensajesSri}`);
      } else if (res.estadoAutorizacion === 'NO AUTORIZADO') {
        setMensaje(`❌ El SRI NO AUTORIZÓ la factura.${mensajesSri}`);
      } else {
        setMensaje('❌ ' + (res.mensaje || 'No se pudo enviar al SRI.') + mensajesSri);
      }
    } catch {
      setMensaje('❌ Error de conexión al enviar al SRI.');
    }
  };

  // Estilos comunes
  const inputStyle = {
    width:'100%', padding:'8px 12px', borderRadius:'6px',
    border:'1px solid #BBDEFB', background:'#fff',
    color:'#333', fontSize:'13px', boxSizing:'border-box'
  };

  return (
    <div style={{background:'#f8f9fa',minHeight:'100vh',padding:'20px',fontFamily:'sans-serif'}}>
      <h1 style={{color:'#1565C0',fontSize:'22px',marginBottom:'16px'}}>🛍️ Ventas — Tienda Genovesa</h1>

      {mensaje && (
        <div style={{background: mensaje.includes('❌') ? '#FFEBEE' : '#E8F5E9',
          border:`1px solid ${mensaje.includes('❌') ? '#FFCDD2' : '#C8E6C9'}`,
          borderRadius:'8px',padding:'12px',marginBottom:'16px',
          color: mensaje.includes('❌') ? '#C62828' : '#2E7D32',fontSize:'14px',fontWeight:'500',
          display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span>{mensaje}</span>
          {ultimaVentaId && (
            <div style={{display:'flex',gap:'8px',marginLeft:'12px'}}>
              <button onClick={() => window.open(`http://localhost:3001/api/factura/xml/${ultimaVentaId}`, '_blank')}
                style={{background:'#1565C0',border:'none',borderRadius:'6px',padding:'8px 16px',color:'#fff',cursor:'pointer',fontSize:'13px',fontWeight:'500',whiteSpace:'nowrap'}}>
                ⬇️ Descargar XML
              </button>
              <button onClick={() => window.open(`http://localhost:3001/api/factura/${ultimaVentaId}`, '_blank')}
                style={{background:'#fff',border:'1px solid #1565C0',borderRadius:'6px',padding:'8px 16px',color:'#1565C0',cursor:'pointer',fontSize:'13px',fontWeight:'500',whiteSpace:'nowrap'}}>
                🧾 Ver PDF
              </button>
              <button onClick={() => enviarAlSRI(ultimaVentaId)}
                style={{background:'#2E7D32',border:'none',borderRadius:'6px',padding:'8px 16px',color:'#fff',cursor:'pointer',fontSize:'13px',fontWeight:'500',whiteSpace:'nowrap'}}>
                📤 Firmar y enviar al SRI
              </button>
            </div>
          )}
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
                  <button onClick={() => cambiarCantidad(i.id, 1)} disabled={i.cantidad >= i.stock_actual}
                    title={i.cantidad >= i.stock_actual ? `Solo hay ${i.stock_actual} en stock` : ''}
                    style={{background: i.cantidad >= i.stock_actual ? '#f0f0f0' : '#E3F2FD',border:'none',borderRadius:'4px',color: i.cantidad >= i.stock_actual ? '#bbb' : '#1565C0',width:'24px',height:'24px',cursor: i.cantidad >= i.stock_actual ? 'not-allowed' : 'pointer',fontSize:'14px',fontWeight:'500'}}>+</button>
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
            <button onClick={() => { setTipoCliente('consumidor'); setDatosCliente({ nombre:'', cedula:'', correo:'', celular:'' }); setValidacionCedula({ valido:false, tipo:'invalido', mensaje:'' }); setClienteLocal(null); setEsClienteNuevo(false); }}
              style={{padding:'8px',borderRadius:'6px',
                border: tipoCliente==='consumidor' ? '1px solid #1565C0' : '1px solid #e0e0e0',
                background: tipoCliente==='consumidor' ? '#E3F2FD' : '#fff',
                color: tipoCliente==='consumidor' ? '#1565C0' : '#666',
                fontSize:'12px',cursor:'pointer',fontWeight: tipoCliente==='consumidor' ? '500' : '400'}}>
              👤 Consumidor Final
            </button>
            <button onClick={() => { setTipoCliente('factura'); setClienteLocal(null); setEsClienteNuevo(false); }}
              style={{padding:'8px',borderRadius:'6px',
                border: tipoCliente==='factura' ? '1px solid #1565C0' : '1px solid #e0e0e0',
                background: tipoCliente==='factura' ? '#E3F2FD' : '#fff',
                color: tipoCliente==='factura' ? '#1565C0' : '#666',
                fontSize:'12px',cursor:'pointer',fontWeight: tipoCliente==='factura' ? '500' : '400'}}>
              🧾 Con datos de factura
            </button>
          </div>

          {/* ========== FORMULARIO DE DATOS DEL CLIENTE (con Módulo 10 + SRI + Local) ========== */}
          {tipoCliente === 'factura' && (
            <div style={{background:'#F3F8FF',borderRadius:'8px',padding:'12px',marginBottom:'10px',border:'1px solid #BBDEFB'}}>
              <div style={{fontSize:'13px',color:'#1565C0',fontWeight:'500',marginBottom:'10px'}}>
                📋 Datos para factura
                {consultandoSri && <span style={{color:'#E65100',fontWeight:'400',marginLeft:'8px',fontSize:'12px'}}>⏳ Consultando SRI...</span>}
              </div>

              {/* Cédula / RUC con validación Módulo 10 */}
              <div style={{marginBottom:'8px', position:'relative'}}>
                <label style={{fontSize:'12px',color:'#1565C0',display:'block',marginBottom:'4px'}}>
                  Cédula o RUC *
                </label>
                <input value={datosCliente.cedula} maxLength={13}
                  onChange={e => manejarCambioCedula(e.target.value)}
                  placeholder="0000000000"
                  style={{
                    ...inputStyle,
                    borderColor: validacionCedula.valido ? '#2E7D32' :
                                 validacionCedula.mensaje.includes('⚠️') ? '#E65100' :
                                 validacionCedula.mensaje && !validacionCedula.valido ? '#C62828' : '#BBDEFB',
                    background: validacionCedula.valido ? '#F1F8E9' :
                                validacionCedula.mensaje && !validacionCedula.valido ? '#FFF5F5' : '#fff',
                  }} />
                {/* Indicador visual de validación Módulo 10 */}
                {validacionCedula.mensaje && (
                  <div style={{
                    fontSize:'11px', marginTop:'4px', padding:'4px 8px', borderRadius:'4px',
                    color: validacionCedula.valido ? '#2E7D32' : '#C62828',
                    background: validacionCedula.valido ? '#E8F5E9' : '#FFEBEE',
                    display:'flex', alignItems:'center', gap:'4px',
                  }}>
                    {consultandoSri && <span>⏳</span>}
                    {!consultandoSri && (validacionCedula.valido ? '✅' : '⚠️')}
                    {validacionCedula.mensaje}
                  </div>
                )}
              </div>

              {/* Nombre / Razón Social */}
              <div style={{marginBottom:'8px'}}>
                <label style={{fontSize:'12px',color:'#1565C0',display:'block',marginBottom:'4px'}}>Nombre o Razón Social *</label>
                <input value={datosCliente.nombre} maxLength={60}
                  onChange={e => setDatosCliente({...datosCliente, nombre: e.target.value.toLowerCase().replace(/(^|\s)\S/g, t => t.toUpperCase())})}
                  placeholder={consultandoSri ? "⏳ Consultando SRI..." : "Ej: Juan Pérez"}
                  disabled={consultandoSri}
                  style={{...inputStyle, opacity: consultandoSri ? 0.6 : 1}} />
              </div>

              {/* Correo y Celular — solo para clientes nuevos (no registrados en BD local) */}
              {esClienteNuevo && (
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginTop:'6px', padding:'8px', background:'#FFF8E1', borderRadius:'6px', border:'1px solid #FFE082'}}>
                  <div>
                    <label style={{fontSize:'12px',color:'#E65100',display:'block',marginBottom:'4px',fontWeight:'500'}}>
                      Correo electrónico * <span style={{fontWeight:'400',fontSize:'11px'}}>(para facturación electrónica)</span>
                    </label>
                    <input value={datosCliente.correo} maxLength={100}
                      onChange={e => setDatosCliente({...datosCliente, correo: e.target.value})}
                      placeholder="cliente@ejemplo.com"
                      type="email"
                      style={inputStyle} />
                  </div>
                  <div>
                    <label style={{fontSize:'12px',color:'#E65100',display:'block',marginBottom:'4px',fontWeight:'500'}}>
                      Celular <span style={{fontWeight:'400',fontSize:'11px'}}>(opcional)</span>
                    </label>
                    <input value={datosCliente.celular} maxLength={10}
                      onChange={e => {
                        if(/^\d*$/.test(e.target.value)) setDatosCliente({...datosCliente, celular: e.target.value});
                      }}
                      placeholder="0991234567"
                      style={inputStyle} />
                  </div>
                </div>
              )}

              {/* Si el cliente ya estaba registrado, mostrar datos guardados */}
              {clienteLocal && (
                <div style={{marginTop:'6px', padding:'8px 10px', background:'#E8F5E9', borderRadius:'6px', fontSize:'12px', color:'#2E7D32'}}>
                  <div>✅ Cliente registrado: <strong>{clienteLocal.nombre}</strong></div>
                  {clienteLocal.correo && <div>📧 {clienteLocal.correo}</div>}
                  {clienteLocal.celular && <div>📱 {clienteLocal.celular}</div>}
                  {clienteLocal.telefono && <div>📞 {clienteLocal.telefono}</div>}
                </div>
              )}
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

          {/* Cliente para crédito */}
          {tipoPago === 'credito' && (
            <div style={{background:'#FFF8E1',borderRadius:'8px',padding:'12px',marginBottom:'10px',border:'1px solid #FFE082'}}>
              <label style={{fontSize:'13px',color:'#E65100',display:'block',marginBottom:'6px',fontWeight:'500'}}>
                💳 Cliente del crédito
              </label>
              <select value={clienteId} onChange={e => setClienteId(e.target.value)}
                style={{width:'100%',padding:'10px 12px',borderRadius:'6px',border:'1px solid #FFE082',background:'#fff',color:'#333',fontSize:'14px',boxSizing:'border-box'}}>
                <option value="">— Selecciona —</option>
                <option value="nuevo">➕ Cliente nuevo (no registrado)</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}{c.cedula ? ` (${c.cedula})` : ''}</option>)}
              </select>

              {clienteId === 'nuevo' && (
                <div style={{marginTop:'10px',display:'flex',flexDirection:'column',gap:'8px'}}>
                  <input value={datosCliente.nombre} maxLength={60}
                    onChange={e => setDatosCliente({...datosCliente, nombre: e.target.value.toLowerCase().replace(/(^|\s)\S/g, t => t.toUpperCase())})}
                    placeholder="Nombre del cliente nuevo *"
                    style={{width:'100%',padding:'10px 12px',borderRadius:'6px',border:'1px solid #FFE082',background:'#fff',color:'#333',fontSize:'14px',boxSizing:'border-box'}} />
                  <input value={datosCliente.cedula} maxLength={13}
                    onChange={e => manejarCambioCedula(e.target.value)}
                    placeholder="Cédula / RUC (opcional)"
                    style={{width:'100%',padding:'10px 12px',borderRadius:'6px',border:'1px solid #FFE082',background:'#fff',color:'#333',fontSize:'14px',boxSizing:'border-box'}} />
                  {/* Correo y celular también para clientes nuevos en crédito */}
                  {esClienteNuevo && datosCliente.cedula.length >= 10 && (
                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', padding:'8px', background:'#FFF8E1', borderRadius:'6px'}}>
                      <input value={datosCliente.correo} maxLength={100}
                        onChange={e => setDatosCliente({...datosCliente, correo: e.target.value})}
                        placeholder="Correo electrónico"
                        type="email"
                        style={inputStyle} />
                      <input value={datosCliente.celular} maxLength={10}
                        onChange={e => { if(/^\d*$/.test(e.target.value)) setDatosCliente({...datosCliente, celular: e.target.value}); }}
                        placeholder="Celular"
                        style={inputStyle} />
                    </div>
                  )}
                  <p style={{fontSize:'11px',color:'#E65100',margin:0}}>Se registrará automáticamente y se le abrirá su cuenta.</p>
                </div>
              )}
            </div>
          )}

          {/* Cálculo de vuelto */}
          {tipoPago === 'efectivo' && carrito.length > 0 && (
            <div style={{background:'#F3F8FF',borderRadius:'8px',padding:'12px',marginBottom:'10px',border:'1px solid #BBDEFB'}}>
              <label style={{fontSize:'13px',color:'#1565C0',display:'block',marginBottom:'6px',fontWeight:'500'}}>
                💵 Monto recibido del cliente ($)
              </label>
              <input
                value={montoRecibido} maxLength={9}
                onChange={e => setMontoRecibido(limpiarMonto(e.target.value))}
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

          <button onClick={confirmar} disabled={carrito.length === 0 || enviando}
            style={{width:'100%',padding:'13px',borderRadius:'8px',border:'none',
              background: carrito.length > 0 && !enviando ? '#1565C0' : '#e0e0e0',
              fontSize:'14px',fontWeight:'500',
              cursor: carrito.length > 0 && !enviando ? 'pointer' : 'default',
              color: carrito.length > 0 && !enviando ? '#fff' : '#999'}}>
            {enviando ? '⏳ Registrando...' : `✅ Confirmar venta — $${total.toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );
}