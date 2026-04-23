import React from 'react';
import './Home.css';

const Home: React.FC = () => {
  const logoUrl = `${import.meta.env.BASE_URL}logo.png`;
  
  return (
    <div className="home-view fade-in">
      <div className="home-content card">
        <div className="home-logo-container">
          <img src={logoUrl} alt="Escandallo KB Logo" className="home-logo" />
        </div>
        
        <p className="home-text lead">
          Con el escandallo de Khaoula Beyuki, poner precio a tu producto deja de ser una decisión a ciegas y se convierte en una estrategia inteligente. Solo tienes que introducir tus datos, calcular costes, márgenes y variables clave, y descubrir de forma rápida cuál es el precio ideal para vender con rentabilidad y seguridad.
        </p>

        <p className="home-text">
          Esta herramienta te ayuda a entender mejor tu negocio, evitar errores frecuentes y tomar decisiones más claras antes de lanzar, ajustar o mejorar tu oferta. Tanto si estás empezando como si ya vendes, contar con un escandallo bien hecho puede marcar la diferencia entre improvisar o crecer con criterio.
        </p>

        <p className="home-text">
          Analiza cada detalle, optimiza tus números y gana tranquilidad sabiendo que tu precio responde a una lógica real. Introduce tus datos y obtén al instante una referencia útil, práctica y pensada para ayudarte a valorar mejor lo que ofreces, impulsar tus ventas y tomar decisiones con más confianza y visión.
        </p>
      </div>
    </div>
  );
};

export default Home;
