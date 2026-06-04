import { useState } from 'react';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('⚠️ Por favor ingresa tu correo y contraseña.');
      return;
    }
    setCargando(true);
    setError('');
    try {
      const res = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (data.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('usuario', JSON.stringify(data.usuario));
        onLogin(data.usuario);
      } else {
        setError('❌ Correo o contraseña incorrectos.');
      }
    } catch {
      setError('❌ No se pudo conectar con el servidor.');
    }
    setCargando(false);
  };

  return (
    <div style={{background:'#0f172a',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'sans-serif'}}>
      <div style={{background:'#1e293b',borderRadius:'16px',padding:'40px',width:'100%',maxWidth:'400px',border:'1px solid #334155',boxShadow:'0 8px 32px #00000060'}}>
        
        {/* Logo */}
        <div style={{textAlign:'center',marginBottom:'32px'}}>
          <div style={{background:'linear-gradient(135deg,#0891b2,#06b6d4)',borderRadius:'16px',width:'64px',height:'64px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'32px',margin:'0 auto 12px'}}>🛒</div>
          <h1 style={{color:'#06b6d4',fontSize:'22px',margin:'0 0 4px'}}>Tienda Genovesa</h1>
          <p style={{color:'#94a3b8',fontSize:'13px',margin:0}}>Sistema de Gestión Comercial</p>
        </div>

        {/* Error */}
        {error && (
          <div style={{background:'#ff444420',border:'1px solid #ff444440',borderRadius:'8px',padding:'10px 14px',marginBottom:'16px',color:'#ff6666',fontSize:'13px'}}>
            {error}
          </div>
        )}

        {/* Email */}
        <div style={{marginBottom:'16px'}}>
          <label style={{fontSize:'12px',color:'#06b6d4',display:'block',marginBottom:'6px'}}>Correo electrónico</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="admin@tienda.com"
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            style={{width:'100%',padding:'10px 12px',borderRadius:'8px',border:'1px solid #334155',background:'#0f172a',color:'#e2e8f0',fontSize:'14px',boxSizing:'border-box'}}
          />
        </div>

        {/* Contraseña */}
        <div style={{marginBottom:'24px'}}>
          <label style={{fontSize:'12px',color:'#06b6d4',display:'block',marginBottom:'6px'}}>Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            style={{width:'100%',padding:'10px 12px',borderRadius:'8px',border:'1px solid #334155',background:'#0f172a',color:'#e2e8f0',fontSize:'14px',boxSizing:'border-box'}}
          />
        </div>

        {/* Botón */}
        <button
          onClick={handleLogin}
          disabled={cargando}
          style={{width:'100%',padding:'12px',borderRadius:'8px',border:'none',background:'linear-gradient(135deg,#0891b2,#06b6d4)',color:'#fff',fontSize:'15px',fontWeight:'500',cursor: cargando ? 'default' : 'pointer',opacity: cargando ? 0.7 : 1}}>
          {cargando ? '⏳ Ingresando...' : '🔐 Ingresar'}
        </button>

        <p style={{textAlign:'center',color:'#64748b',fontSize:'11px',marginTop:'20px'}}>
          Usuario de prueba: admin@tienda.com / 1234
        </p>
      </div>
    </div>
  );
}