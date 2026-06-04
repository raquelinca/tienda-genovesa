import { useState } from 'react';
import Dashboard from './pages/Dashboard';
import Inventario from './pages/Inventario';
import Ventas from './pages/Ventas';

function App() {
  const [pantalla, setPantalla] = useState('dashboard');

  return (
    <div>
      <div style={{background:'linear-gradient(135deg, #0891b2, #06b6d4)',padding:'0 20px',display:'flex',alignItems:'center',gap:'6px',height:'50px',boxShadow:'0 2px 8px #0891b240'}}>
        <div style={{display:'flex',alignItems:'center',gap:'8px',marginRight:'20px'}}>
          <div style={{background:'#164e63',borderRadius:'8px',width:'50px',height:'50px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'28px'}}>🛒</div>
          <div>
            <div style={{fontSize:'20px',fontWeight:'700',color:'#ffffff'}}>Genovesa</div>
            <div style={{fontSize:'17px',color:'#cffafe',fontWeight:'500'}}>Tienda de barrio</div>
          </div>
        </div>
        <button onClick={() => setPantalla('dashboard')}
          style={{background: pantalla==='dashboard' ? '#164e63' : 'transparent',color:'#ffffff',border:'none',borderRadius:'6px',padding:'6px 12px',fontSize:'16px',fontWeight:'500',cursor:'pointer'}}>
          Dashboard
        </button>
        <button onClick={() => setPantalla('inventario')}
          style={{background: pantalla==='inventario' ? '#164e63' : 'transparent',color:'#ffffff',border:'none',borderRadius:'6px',padding:'6px 12px',fontSize:'16px',fontWeight:'500',cursor:'pointer'}}>
          Inventario
        </button>
        <button onClick={() => setPantalla('ventas')}
          style={{background: pantalla==='ventas' ? '#164e63' : 'transparent',color:'#ffffff',border:'none',borderRadius:'6px',padding:'6px 12px',fontSize:'16px',fontWeight:'500',cursor:'pointer'}}>
          Ventas
        </button>
      </div>

      {pantalla === 'dashboard'  && <Dashboard />}
      {pantalla === 'inventario' && <Inventario />}
      {pantalla === 'ventas'     && <Ventas />}
    </div>
  );
}

export default App;