import { useEffect, useState } from 'react';
import { api } from '../services/api';

export default function Dashboard() {
  const [alertas, setAlertas] = useState([]);
  const [productos, setProductos] = useState([]);

  const cargar = async () => {
    try {
      const a = await api.get('/productos/alertas');
      if (a.ok && Array.isArray(a.data)) setAlertas(a.data);
      const p = await api.get('/productos');
      if (p.ok && Array.isArray(p.data)) setProductos(p.data);
    } catch {
      setAlertas([]);
    }
  };

  useEffect(() => {
    cargar();
    const intervalo = setInterval(cargar, 60000);
    return () => clearInterval(intervalo);
  }, []);

  const normal  = productos.filter(p => p.stock_actual > p.stock_minimo).length;
  const bajo    = productos.filter(p => p.stock_actual <= p.stock_minimo && p.stock_actual > Math.floor(p.stock_minimo * 0.5)).length;
  const critico = productos.filter(p => p.stock_actual <= Math.floor(p.stock_minimo * 0.5)).length;

  return (
    <div style={{background:'#0f172a',minHeight:'100vh',padding:'20px',color:'#fff',fontFamily:'sans-serif'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'24px'}}>
        <div>
          <h1 style={{color:'#06b6d4',fontSize:'22px'}}>☀️ ¡Buen día, Raquel!</h1>
          <p style={{color:'#cbd5e1',fontSize:'15px',marginTop:'6px'}}>Tienda Genovesa — Panel de control</p>
        </div>
        <div style={{background:'#0891b220',border:'1px solid #0891b240',borderRadius:'20px',padding:'6px 16px',color:'#06b6d4',fontSize:'12px'}}>
          🔔 {alertas.length} alertas activas
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'12px',marginBottom:'20px'}}>
        <div style={{background:'#1e293b',borderRadius:'12px',padding:'16px',border:'1px solid #00C85340'}}>
          <div style={{fontSize:'17px',color:'#94a3b8',marginBottom:'6px'}}>✅ Stock Normal</div>
          <div style={{fontSize:'28px',fontWeight:'500',color:'#00C853'}}>{normal}</div>
          <div style={{fontSize:'14px',color:'#cbd5e1',marginTop:'4px'}}>Productos</div>
        </div>
        <div style={{background:'#1e293b',borderRadius:'12px',padding:'16px',border:'1px solid #fb923c40'}}>
          <div style={{fontSize:'17px',color:'#94a3b8',marginBottom:'6px'}}>⚠️ Stock Bajo</div>
          <div style={{fontSize:'28px',fontWeight:'500',color:'#fb923c'}}>{bajo}</div>
          <div style={{fontSize:'14px',color:'#cbd5e1',marginTop:'4px'}}>Productos</div>
        </div>
        <div style={{background:'#1e293b',borderRadius:'12px',padding:'16px',border:'1px solid #ff444440'}}>
          <div style={{fontSize:'17px',color:'#94a3b8',marginBottom:'6px'}}>🚨 Stock Crítico</div>
          <div style={{fontSize:'28px',fontWeight:'500',color:'#ff4444'}}>{critico}</div>
          <div style={{fontSize:'14px',color:'#cbd5e1',marginTop:'4px'}}>Productos</div>
        </div>
      </div>

      <div style={{background:'#1e293b',borderRadius:'12px',padding:'16px',border:'1px solid #ffffff10'}}>
        <h2 style={{color:'#06b6d4',fontSize:'15px',marginBottom:'14px'}}>🚨 Productos con stock bajo o crítico</h2>
        {alertas.length === 0 ? (
          <p style={{color:'#94a3b8',fontSize:'13px'}}>✅ Todos los productos tienen stock suficiente.</p>
        ) : (
          alertas.map(a => (
            <div key={a.id} style={{
              display:'flex',alignItems:'center',gap:'12px',
              padding:'10px 14px',borderRadius:'8px',marginBottom:'8px',
              background: a.nivel === 'critico' ? '#ff444415' : '#fb923c15',
              border: `1px solid ${a.nivel === 'critico' ? '#ff444430' : '#fb923c30'}`
            }}>
              <span style={{fontSize:'18px'}}>{a.nivel === 'critico' ? '🚨' : '⚠️'}</span>
              <span style={{flex:1,fontSize:'13px',color:'#e2e8f0'}}>{a.nombre}</span>
              <span style={{fontSize:'12px',color:'#94a3b8'}}>Stock actual: {a.stock_actual} u.</span>
              <span style={{
                fontSize:'10px',padding:'3px 10px',borderRadius:'20px',fontWeight:'500',
                background: a.nivel === 'critico' ? '#ff444420' : '#fb923c20',
                color: a.nivel === 'critico' ? '#ff4444' : '#fb923c',
                border: `1px solid ${a.nivel === 'critico' ? '#ff444440' : '#fb923c40'}`
              }}>{a.nivel}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}