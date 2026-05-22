import { useState } from 'react';
import Dashboard from './pages/Dashboard';
import Inventario from './pages/Inventario';
import Ventas from './pages/Ventas';

function App() {
  const [pantalla, setPantalla] = useState('dashboard');

  return (
    <div>
      <div style={{background:'#FFD600',padding:'0 20px',display:'flex',alignItems:'center',gap:'6px',height:'50px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'8px',marginRight:'20px'}}>
          <div style={{background:'#3D2B00',borderRadius:'8px',width:'32px',height:'32px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px'}}>🛒</div>
          <div>
            <div style={{fontSize:'14px',fontWeight:'500',color:'#3D2B00'}}>Genovesa</div>
            <div style={{fontSize:'10px',color:'#7A5F00'}}>Tienda de barrio</div>
          </div>
        </div>
        <button onClick={() => setPantalla('dashboard')}
          style={{background: pantalla==='dashboard' ? '#3D2B00' : 'transparent',color: pantalla==='dashboard' ? '#FFD600' : '#3D2B00',border:'none',borderRadius:'6px',padding:'6px 12px',fontSize:'12px',fontWeight:'500',cursor:'pointer'}}>
          Dashboard
        </button>
        <button onClick={() => setPantalla('inventario')}
          style={{background: pantalla==='inventario' ? '#3D2B00' : 'transparent',color: pantalla==='inventario' ? '#FFD600' : '#3D2B00',border:'none',borderRadius:'6px',padding:'6px 12px',fontSize:'12px',fontWeight:'500',cursor:'pointer'}}>
          Inventario
        </button>
        <button onClick={() => setPantalla('ventas')}
          style={{background: pantalla==='ventas' ? '#3D2B00' : 'transparent',color: pantalla==='ventas' ? '#FFD600' : '#3D2B00',border:'none',borderRadius:'6px',padding:'6px 12px',fontSize:'12px',fontWeight:'500',cursor:'pointer'}}>
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