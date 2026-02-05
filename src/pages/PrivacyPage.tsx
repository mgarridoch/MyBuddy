import React from 'react';
import { Link } from 'react-router-dom';

export const PrivacyPage: React.FC = () => {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px', fontFamily: 'sans-serif', lineHeight: '1.6' }}>
      <Link to="/login" style={{ color: 'var(--color-primary)' }}>← Volver al inicio</Link>
      
      <h1 style={{ marginTop: '20px' }}>Política de Privacidad de MyBuddy</h1>
      <p>Última actualización: {new Date().toLocaleDateString()}</p>

      <h2>1. Información que recopilamos</h2>
      <p>MyBuddy utiliza la autenticación de Google para permitir el acceso a la aplicación. Al iniciar sesión, accedemos a su dirección de correo electrónico y a su nombre para crear su perfil personal.</p>

      <h2>2. Uso de Google Calendar</h2>
      <p>Nuestra aplicación solicita acceso a su Google Calendar para:</p>
      <ul>
        <li>Visualizar sus eventos existentes en nuestro panel diario y calendario mensual.</li>
        <li>Permitirle crear nuevos eventos directamente desde MyBuddy.</li>
        <li>Eliminar eventos que usted decida borrar desde nuestra interfaz.</li>
      </ul>
      <p><strong>No almacenamos sus eventos de Google en nuestros servidores permanentes.</strong> Los datos se consultan en tiempo real y se mantienen temporalmente en la memoria de su navegador (cache) para mejorar el rendimiento.</p>

      <h2>3. Protección de Datos</h2>
      <p>No vendemos, alquilamos ni compartimos sus datos personales con terceros. Su información se utiliza exclusivamente para el funcionamiento de las herramientas de productividad de MyBuddy.</p>

      <h2>4. Seguridad</h2>
      <p>Utilizamos Supabase y Google OAuth como proveedores de seguridad líderes en la industria para asegurar que su sesión y sus datos estén protegidos.</p>

      <h2>5. Contacto</h2>
      <p>Si tiene dudas sobre esta política, puede contactarnos a través de nuestro repositorio de GitHub o el correo asociado a la cuenta de desarrollador.</p>
    </div>
  );
};