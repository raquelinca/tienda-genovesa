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
    } catch { setAlertas([]); }
  };

  useEffect(() => {
    cargar();
    const intervalo = setInterval(cargar, 60000);
    return () => clearInterval(intervalo);
  }, []);

  const normal  = productos.filter(p => p.stock_actual > p.stock_minimo).length;
  const bajo    = productos.filter(p => p.stock_actual <= p.stock_minimo && p.stock_actual > Math.floor(p.stock_minimo * 0.5)).length;
  const critico = productos.filter(p => p.stock_actual <= Math.floor(p.stock_minimo * 0.5)).length;

  const colorEstadoNivel = (nivel) => {
    if (nivel === 'critico' || nivel === 'sin_stock') return '#C62828';
    return '#E65100';
  };

  return (
    <div style={{background:'#f8f9fa',minHeight:'100vh',padding:'24px',color:'#333',fontFamily:'sans-serif'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'24px'}}>
        <div>
          <h1 style={{color:'#1565C0',fontSize:'22px',margin:'0 0 4px'}}>☀️ ¡Buenos días, Raquel!</h1>
          <p style={{color:'#666',fontSize:'14px',margin:0}}>Tienda Genovesa — Panel de control</p>
        </div>
        <div style={{background:'#E3F2FD',border:'1px solid #BBDEFB',borderRadius:'20px',padding:'6px 16px',color:'#1565C0',fontSize:'13px'}}>
          🔔 {alertas.length} alertas activas
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'16px',marginBottom:'24px'}}>
        <div style={{background:'#fff',borderRadius:'12px',padding:'20px',border:'0.5px solid #C8E6C9',boxShadow:'0 1px 4px #00000010'}}>
          <div style={{fontSize:'13px',color:'#666',marginBottom:'8px'}}>✅ Stock normal</div>
          <div style={{fontSize:'32px',fontWeight:'500',color:'#2E7D32'}}>{normal}</div>
          <div style={{fontSize:'12px',color:'#999',marginTop:'4px'}}>productos</div>
        </div>
        <div style={{background:'#fff',borderRadius:'12px',padding:'20px',border:'0.5px solid #FFE0B2',boxShadow:'0 1px 4px #00000010'}}>
          <div style={{fontSize:'13px',color:'#666',marginBottom:'8px'}}>⚠️ Stock bajo</div>
          <div style={{fontSize:'32px',fontWeight:'500',color:'#E65100'}}>{bajo}</div>
          <div style={{fontSize:'12px',color:'#999',marginTop:'4px'}}>productos</div>
        </div>
        <div style={{background:'#fff',borderRadius:'12px',padding:'20px',border:'0.5px solid #FFCDD2',boxShadow:'0 1px 4px #00000010'}}>
          <div style={{fontSize:'13px',color:'#666',marginBottom:'8px'}}>🚨 Stock crítico</div>
          <div style={{fontSize:'32px',fontWeight:'500',color:'#C62828'}}>{critico}</div>
          <div style={{fontSize:'12px',color:'#999',marginTop:'4px'}}>productos</div>
        </div>
      </div>

      <div style={{background:'#fff',borderRadius:'12px',padding:'20px',border:'0.5px solid #ddd',boxShadow:'0 1px 4px #00000010'}}>
        <h2 style={{color:'#1565C0',fontSize:'16px',marginBottom:'16px',margin:'0 0 16px'}}>🚨 Productos con stock bajo o crítico</h2>
        {alertas.length === 0 ? (
          <p style={{color:'#999',fontSize:'14px'}}>✅ Todos los productos tienen stock suficiente.</p>
        ) : (
          alertas.map(a => (
            <div key={a.id} style={{
              display:'flex',alignItems:'center',gap:'12px',
              padding:'12px 16px',borderRadius:'8px',marginBottom:'8px',
              background: a.nivel === 'critico' || a.nivel === 'sin_stock' ? '#FFEBEE' : '#FFF3E0',
              border: `1px solid ${a.nivel === 'critico' || a.nivel === 'sin_stock' ? '#FFCDD2' : '#FFE0B2'}`
            }}>
              <span style={{fontSize:'18px'}}>{a.nivel === 'critico' || a.nivel === 'sin_stock' ? '🚨' : '⚠️'}</span>
              <span style={{flex:1,fontSize:'14px',color:'#333',fontWeight:'500'}}>{a.nombre}</span>
              <span style={{fontSize:'13px',color:'#666'}}>Stock actual: {a.stock_actual} u.</span>
              <span style={{
                fontSize:'11px',padding:'3px 10px',borderRadius:'20px',fontWeight:'500',
                background:'#fff',
                color: colorEstadoNivel(a.nivel),
                border: `1px solid ${colorEstadoNivel(a.nivel)}40`
              }}>{a.nivel}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}