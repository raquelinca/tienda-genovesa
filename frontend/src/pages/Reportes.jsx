import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { theme } from '../theme';

const API_BASE = 'http://localhost:3001/api';
const money = (n) => '$' + (Number(n) || 0).toFixed(2);
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const pad = (n) => String(n).padStart(2, '0');

export default function Reportes() {
  const [ventas, setVentas] = useState([]);
  const [productos, setProductos] = useState([]);
  const [masVendidos, setMasVendidos] = useState([]);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [agrupacion, setAgrupacion] = useState('dia'); // 'dia' | 'mes'
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(false);

  const cargar = async () => {
    setCargando(true);
    try {
      const v = await api.get('/reportes/ventas');
      if (v.ok && Array.isArray(v.data)) setVentas(v.data);
      const p = await api.get('/productos');
      if (p.ok && Array.isArray(p.data)) {
        setProductos(p.data);
        const cats = [...new Set(p.data.map(x => x.categoria).filter(Boolean))];
        setCategorias(cats);
      }
    } catch { setVentas([]); }
    setCargando(false);
  };

  const cargarMasVendidos = async () => {
    const params = new URLSearchParams();
    if (fechaInicio) params.set('desde', fechaInicio);
    if (fechaFin) params.set('hasta', fechaFin);
    const qs = params.toString();
    try {
      const r = await api.get(`/reportes/productos-vendidos${qs ? '?' + qs : ''}`);
      if (r.ok && Array.isArray(r.data)) setMasVendidos(r.data);
      else setMasVendidos([]);
    } catch { setMasVendidos([]); }
  };

  useEffect(() => { cargar(); }, []);
  useEffect(() => { cargarMasVendidos(); }, [fechaInicio, fechaFin]);

  // ---- VENTAS (filtro: solo rango de fechas) ----
  const ventasFiltradas = useMemo(() => ventas.filter(v => {
    const fecha = new Date(v.fecha);
    const desde = fechaInicio ? new Date(fechaInicio) : null;
    const hasta = fechaFin ? new Date(fechaFin + 'T23:59:59') : null;
    if (desde && fecha < desde) return false;
    if (hasta && fecha > hasta) return false;
    return true;
  }), [ventas, fechaInicio, fechaFin]);

  const totalVentas = ventasFiltradas.reduce((s, v) => s + parseFloat(v.total), 0);
  const promedio = ventasFiltradas.length > 0 ? totalVentas / ventasFiltradas.length : 0;

  const serie = useMemo(() => {
    const map = new Map();
    ventasFiltradas.forEach(v => {
      const d = new Date(v.fecha);
      let sortKey, label;
      if (agrupacion === 'mes') {
        sortKey = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
        label = `${MESES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
      } else {
        sortKey = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        label = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
      }
      const prev = map.get(sortKey) || { label, valor: 0 };
      prev.valor += parseFloat(v.total);
      map.set(sortKey, prev);
    });
    return [...map.entries()].sort((a, b) => a[0] < b[0] ? -1 : 1).map(([, val]) => val);
  }, [ventasFiltradas, agrupacion]);

  // ---- INVENTARIO ----
  const productosFiltrados = filtroCategoria === 'todas'
    ? productos
    : productos.filter(p => p.categoria === filtroCategoria);

  const stockBajo = productosFiltrados.filter(p => p.stock_actual > 0 && p.stock_actual <= p.stock_minimo).length;
  const sinStock = productosFiltrados.filter(p => p.stock_actual === 0).length;

  const porCategoria = useMemo(() => {
    const map = new Map();
    productos.forEach(p => {
      const c = p.categoria || 'Sin categoría';
      map.set(c, (map.get(c) || 0) + 1);
    });
    return [...map.entries()].map(([label, valor]) => ({ label, valor })).sort((a, b) => b.valor - a.valor);
  }, [productos]);

  // ---- Exportar ----
  const exportUrl = (formato) => {
    const params = new URLSearchParams();
    if (fechaInicio) params.set('desde', fechaInicio);
    if (fechaFin) params.set('hasta', fechaFin);
    if (filtroCategoria !== 'todas') params.set('categoria', filtroCategoria);
    const qs = params.toString();
    return `${API_BASE}/reportes/exportar-${formato}${qs ? '?' + qs : ''}`;
  };

  const limpiarVentas = () => { setFechaInicio(''); setFechaFin(''); setAgrupacion('dia'); };

  // ---- Estilos (mismos colores/formato de siempre) ----
  const card = { background: theme.bgCard, borderRadius: '12px', boxShadow: '0 1px 4px #00000010' };
  const inputStyle = {
    padding: '9px 12px', borderRadius: '6px', border: `1px solid ${theme.inputBorder}`,
    background: theme.inputBg, color: theme.textPrimary, fontSize: '13px', width: '100%', boxSizing: 'border-box',
  };
  const labelStyle = { fontSize: '12px', color: theme.primary, display: 'block', marginBottom: '4px' };
  const sectionTitle = { color: theme.primary, fontSize: '16px', margin: 0 };
  const th = { padding: '12px 10px', textAlign: 'left', color: theme.primary, borderBottom: `1px solid ${theme.primaryBorder}`, position: 'sticky', top: 0, background: theme.primaryLight };
  const td = { padding: '10px' };
  const pill = (bg, color) => ({ background: bg, color, padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '500' });

  const KpiCard = ({ titulo, valor, sub, color, borde, icono }) => (
    <div className="rep-card" style={{ ...card, padding: '18px', border: `0.5px solid ${borde}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
        <span style={{ fontSize: '14px' }}>{icono}</span>
        <span style={{ fontSize: '12px', color: theme.textSecondary }}>{titulo}</span>
      </div>
      <div style={{ fontSize: '26px', color, fontWeight: '500' }}>{valor}</div>
      <div style={{ fontSize: '11px', color: theme.textMuted, marginTop: '2px' }}>{sub}</div>
    </div>
  );

  // Barras verticales con líneas de guía, valores y animación de crecimiento
  const BarrasVerticales = ({ data, alto = 200 }) => {
    if (data.length === 0) return <p style={{ color: theme.textMuted, fontSize: '13px', margin: 0 }}>Sin ventas en el período seleccionado.</p>;
    const max = Math.max(...data.map(d => d.valor), 1);
    const usable = alto - 44;
    const anchoBarra = Math.max(26, Math.min(64, Math.floor(680 / data.length)));
    const lineas = [1, 0.75, 0.5, 0.25, 0];
    return (
      <div style={{ display: 'flex', gap: '8px' }}>
        {/* Eje Y */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: usable + 'px', paddingTop: '20px' }}>
          {lineas.map((f, i) => (
            <div key={i} style={{ fontSize: '10px', color: theme.textMuted, textAlign: 'right', whiteSpace: 'nowrap' }}>
              {money(max * f)}
            </div>
          ))}
        </div>
        {/* Área de barras con líneas de guía */}
        <div style={{ flex: 1, overflowX: 'auto' }}>
          <div style={{ position: 'relative', minWidth: 'min-content' }}>
            <div style={{ position: 'absolute', top: '20px', left: 0, right: 0, height: usable + 'px' }}>
              {lineas.map((f, i) => (
                <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: `${(1 - f) * usable}px`, borderTop: `1px ${i === lineas.length - 1 ? 'solid' : 'dashed'} ${theme.borderLight}` }} />
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: alto + 'px', position: 'relative' }}>
              {data.map((d, i) => (
                <div key={`${agrupacion}-${i}-${d.label}`} className="rep-bar-vwrap"
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: anchoBarra + 'px', height: '100%', justifyContent: 'flex-end' }}>
                  <div className="rep-bar-tip" style={{ fontSize: '10px', color: theme.textSecondary, marginBottom: '4px', whiteSpace: 'nowrap' }}>{money(d.valor)}</div>
                  <div className="rep-bar-v" title={`${d.label}: ${money(d.valor)}`}
                    style={{ width: '100%', height: `${(d.valor / max) * usable}px`, background: theme.primary, borderRadius: '5px 5px 0 0', minHeight: '3px' }} />
                  <div style={{ fontSize: '10px', color: theme.textMuted, marginTop: '6px', whiteSpace: 'nowrap' }}>{d.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Barras horizontales animadas (con ranking opcional)
  const BarrasHorizontales = ({ data, sufijo = '', color = theme.primary, ranking = false }) => {
    if (data.length === 0) return <p style={{ color: theme.textMuted, fontSize: '13px', margin: 0 }}>Sin datos para mostrar.</p>;
    const max = Math.max(...data.map(d => d.valor), 1);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {data.map((d, i) => (
          <div key={`${d.label}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {ranking && (
              <span style={{
                flexShrink: 0, width: '22px', height: '22px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', fontWeight: '500',
                background: i < 3 ? theme.primary : theme.primaryLight,
                color: i < 3 ? '#fff' : theme.primary,
              }}>{i + 1}</span>
            )}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span style={{ color: theme.textPrimary }}>{d.label}</span>
                <span style={{ color: theme.textSecondary }}>{d.valor}{sufijo}</span>
              </div>
              <div style={{ background: theme.primaryLight, borderRadius: '20px', height: '9px', overflow: 'hidden' }}>
                <div className="rep-bar-h" style={{ width: `${(d.valor / max) * 100}%`, height: '100%', background: color, borderRadius: '20px' }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ background: theme.bgPage, minHeight: '100vh', padding: '24px', fontFamily: 'sans-serif' }}>
      <style>{`
        @keyframes repGrowV { from { transform: scaleY(0); } to { transform: scaleY(1); } }
        @keyframes repGrowH { from { transform: scaleX(0); } to { transform: scaleX(1); } }
        .rep-bar-v { transform-origin: bottom; animation: repGrowV .55s cubic-bezier(.4,0,.2,1); transition: filter .15s ease; }
        .rep-bar-h { transform-origin: left; animation: repGrowH .6s cubic-bezier(.4,0,.2,1); }
        .rep-bar-vwrap .rep-bar-tip { opacity: 0; transition: opacity .15s ease; }
        .rep-bar-vwrap:hover .rep-bar-tip { opacity: 1; }
        .rep-bar-vwrap:hover .rep-bar-v { filter: brightness(.82); }
        .rep-card { transition: transform .15s ease, box-shadow .15s ease; }
        .rep-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px #00000018; }
        .rep-row { transition: background .12s ease; }
        .rep-row:hover { background: ${theme.bgCardHover}; }
      `}</style>

      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ color: theme.primary, fontSize: '22px', margin: '0 0 4px' }}>📊 Reportes</h1>
        <p style={{ color: theme.textSecondary, fontSize: '14px', margin: 0 }}>Tienda Genovesa — Ventas e inventario</p>
      </div>

      {/* ============ SECCIÓN VENTAS ============ */}
      <h2 style={{ ...sectionTitle, marginBottom: '12px' }}>🧾 Ventas</h2>

      {/* Filtros */}
      <div style={{ ...card, padding: '20px', border: `0.5px solid ${theme.border}`, marginBottom: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Fecha inicio</label>
            <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Fecha fin</label>
            <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Agrupar por</label>
            <div style={{ display: 'flex', border: `1px solid ${theme.inputBorder}`, borderRadius: '6px', overflow: 'hidden' }}>
              {[['dia', 'Día'], ['mes', 'Mes']].map(([val, txt]) => (
                <button key={val} onClick={() => setAgrupacion(val)}
                  style={{
                    flex: 1, padding: '9px 0', border: 'none', cursor: 'pointer', fontSize: '13px',
                    background: agrupacion === val ? theme.primary : '#fff',
                    color: agrupacion === val ? '#fff' : theme.textSecondary,
                    fontWeight: agrupacion === val ? '500' : '400',
                  }}>{txt}</button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
          <button onClick={() => window.open(exportUrl('excel'), '_blank')}
            style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: theme.success, color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
            📥 Exportar Excel
          </button>
          <button onClick={() => window.open(exportUrl('pdf'), '_blank')}
            style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: theme.danger, color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
            📄 Exportar PDF
          </button>
          <button onClick={limpiarVentas}
            style={{ padding: '8px 16px', borderRadius: '6px', border: `1px solid ${theme.border}`, background: '#fff', color: theme.textSecondary, cursor: 'pointer', fontSize: '13px' }}>
            🔄 Limpiar filtros
          </button>
        </div>
      </div>

      {/* KPIs de ventas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px' }}>
        <KpiCard icono="💵" titulo="Total vendido" valor={money(totalVentas)} sub="en el período filtrado" color={theme.primary} borde={theme.primaryBorder} />
        <KpiCard icono="🧾" titulo="Transacciones" valor={ventasFiltradas.length} sub="ventas registradas" color={theme.success} borde={theme.successBorder} />
        <KpiCard icono="📈" titulo="Promedio por venta" valor={money(promedio)} sub="por transacción" color={theme.warning} borde={theme.warningBorder} />
      </div>

      {/* Gráfico ventas por período (centro de la página) */}
      <div style={{ ...card, border: `0.5px solid ${theme.border}`, padding: '20px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ ...sectionTitle, fontSize: '14px' }}>📈 Ventas por {agrupacion === 'mes' ? 'mes' : 'día'}</h3>
          <span style={{ fontSize: '11px', color: theme.textMuted }}>Pasa el mouse sobre cada barra para ver el monto</span>
        </div>
        <BarrasVerticales data={serie} />
      </div>

      {/* Gráfico productos más vendidos */}
      <div style={{ ...card, border: `0.5px solid ${theme.border}`, padding: '20px', marginBottom: '16px' }}>
        <h3 style={{ ...sectionTitle, fontSize: '14px', marginBottom: '16px' }}>🏆 Productos más vendidos</h3>
        <BarrasHorizontales
          data={masVendidos.slice(0, 8).map(p => ({ label: p.nombre, valor: Number(p.unidades) || 0 }))}
          sufijo=" u." color={theme.success} ranking />
      </div>

      {/* Tabla de ventas */}
      <div style={{ ...card, border: `0.5px solid ${theme.border}`, marginBottom: '32px' }}>
        <div style={{ padding: '16px', borderBottom: `1px solid ${theme.primaryLight}` }}>
          <h3 style={{ ...sectionTitle, fontSize: '14px' }}>Historial de ventas</h3>
        </div>
        <div style={{ overflow: 'auto', maxHeight: '380px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr>{['#', 'Fecha', 'Total', 'Tipo pago', 'Estado'].map(h => <th key={h} style={th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr><td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: theme.textMuted }}>Cargando...</td></tr>
              ) : ventasFiltradas.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: theme.textMuted }}>No hay ventas con los filtros seleccionados.</td></tr>
              ) : (
                ventasFiltradas.map(v => (
                  <tr key={v.id} className="rep-row" style={{ borderBottom: `0.5px solid ${theme.border}` }}>
                    <td style={{ ...td, color: theme.textSecondary }}>#{v.id}</td>
                    <td style={{ ...td, color: theme.textPrimary }}>{new Date(v.fecha).toLocaleDateString()} {new Date(v.fecha).toLocaleTimeString()}</td>
                    <td style={{ ...td, color: theme.primary, fontWeight: '500' }}>{money(v.total)}</td>
                    <td style={td}><span style={{ ...pill(theme.primaryLight, theme.primary), textTransform: 'capitalize' }}>{v.tipo_pago}</span></td>
                    <td style={td}>
                      <span style={pill(
                        v.estado === 'completada' ? theme.successBg : theme.dangerBg,
                        v.estado === 'completada' ? theme.success : theme.danger
                      )}>{v.estado}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============ SECCIÓN INVENTARIO ============ */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <h2 style={sectionTitle}>📦 Inventario</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '12px', color: theme.textSecondary }}>Categoría:</label>
          <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}
            style={{ ...inputStyle, width: 'auto', minWidth: '160px' }}>
            <option value="todas">Todas</option>
            {categorias.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* KPIs inventario */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px' }}>
        <KpiCard icono="📦" titulo="Productos" valor={productosFiltrados.length}
          sub={filtroCategoria === 'todas' ? 'en todo el inventario' : `en "${filtroCategoria}"`}
          color={theme.primary} borde={theme.primaryBorder} />
        <KpiCard icono="⚠️" titulo="Stock bajo" valor={stockBajo} sub="por debajo del mínimo" color={theme.warning} borde={theme.warningBorder} />
        <KpiCard icono="🚨" titulo="Sin stock" valor={sinStock} sub="agotados" color={theme.danger} borde={theme.dangerBorder} />
      </div>

      {/* Gráfico inventario por categoría */}
      <div style={{ ...card, border: `0.5px solid ${theme.border}`, padding: '20px', marginBottom: '16px' }}>
        <h3 style={{ ...sectionTitle, fontSize: '14px', marginBottom: '16px' }}>📦 Productos por categoría</h3>
        <BarrasHorizontales data={porCategoria} sufijo=" prod." />
      </div>

      {/* Tabla de inventario */}
      <div style={{ ...card, border: `0.5px solid ${theme.border}` }}>
        <div style={{ padding: '16px', borderBottom: `1px solid ${theme.primaryLight}` }}>
          <h3 style={{ ...sectionTitle, fontSize: '14px' }}>Detalle de productos</h3>
        </div>
        <div style={{ overflow: 'auto', maxHeight: '420px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr>{['Nombre', 'Categoría', 'Precio venta', 'Stock actual', 'Estado'].map(h => <th key={h} style={th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {productosFiltrados.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: theme.textMuted }}>No hay productos.</td></tr>
              ) : (
                productosFiltrados.map(p => (
                  <tr key={p.id} className="rep-row" style={{ borderBottom: `0.5px solid ${theme.border}` }}>
                    <td style={{ ...td, color: theme.textPrimary, fontWeight: '500' }}>{p.nombre}</td>
                    <td style={td}><span style={pill(theme.primaryLight, theme.primary)}>{p.categoria}</span></td>
                    <td style={{ ...td, color: theme.primary, fontWeight: '500' }}>{money(p.precio_venta)}</td>
                    <td style={{ ...td, fontWeight: '500', color: p.stock_actual <= p.stock_minimo ? theme.danger : theme.success }}>
                      {p.stock_actual} u.
                    </td>
                    <td style={td}>
                      <span style={pill(
                        p.stock_actual === 0 ? theme.dangerBg : p.stock_actual <= p.stock_minimo ? theme.warningBg : theme.successBg,
                        p.stock_actual === 0 ? theme.danger : p.stock_actual <= p.stock_minimo ? theme.warning : theme.success
                      )}>
                        {p.stock_actual === 0 ? 'Sin stock' : p.stock_actual <= p.stock_minimo ? 'Stock bajo' : 'Normal'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
