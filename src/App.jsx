import { Routes, Route, useLocation } from 'react-router-dom';
import Home from './components/Home';
import RegistroInventario from './components/RegistroInventario';
import Stock from './components/Stock';
import RegistroAsistencia from './components/RegistroAsistencia';
import FormularioGastos from './components/FormularioGastos';
import FormularioProveedores from './components/FormularioProveedores';
import Login from './components/Login';
import Dashboard from './pages/Dashboard';
import Ventas from './pages/Ventas';
import RutaPrivada from './components/RutaPrivada';
import NavBar from './components/NavBar';
import InventarioIA from './components/InventarioIA';
import Clientes from './components/Clientes';
import Seguimiento from './components/Seguimiento';
import Pedidos from './components/Pedidos';
import Comunidad from './components/Comunidad';
import Calendario from './components/Calendario';
import Insumos from './components/Insumos';
import VentaRapida from './components/VentaRapida';
import Auditoria from './components/Auditoria';
import Autoservicio from './components/Autoservicio';
import GestionCocina from './components/GestionCocina';
import Transporte from './components/Transporte';

// Componentes placeholder para las otras secciones
const Inventario = () => {
  return <RegistroInventario />;
};

const StockComponent = () => {
  return <Stock />;
};

const Proveedores = () => {
  return <FormularioProveedores />;
};

function App() {
  const location = useLocation();
  const showOffset = location.pathname !== '/login';

  return (
    <>
      {/* Portal container para mensajes y modales */}
      <div id="portal-root" />
      
      <NavBar />
      <div className={showOffset ? 'pt-16' : ''}>
        <Routes>
          <Route path="/" element={
            <RutaPrivada>
              <Home />
            </RutaPrivada>
          } />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={
            <RutaPrivada>
              <Dashboard />
            </RutaPrivada>
          } />
          <Route path="/ventas" element={
            <RutaPrivada>
              <Ventas />
            </RutaPrivada>
          } />
          <Route path="/asistencia" element={
            <RutaPrivada>
              <RegistroAsistencia />
            </RutaPrivada>
          } />
          <Route path="/gastos" element={
            <RutaPrivada>
              <FormularioGastos />
            </RutaPrivada>
          } />
          <Route path="/proveedores" element={
            <RutaPrivada>
              <Proveedores />
            </RutaPrivada>
          } />
          <Route path="/inventario" element={
            <RutaPrivada>
              <Inventario />
            </RutaPrivada>
          } />
          <Route path="/stock" element={
            <RutaPrivada>
              <StockComponent />
            </RutaPrivada>
          } />
          <Route path="/inventario-ia" element={
            <RutaPrivada>
              <InventarioIA />
            </RutaPrivada>
          } />
          <Route path="/clientes" element={
            <RutaPrivada>
              <Clientes />
            </RutaPrivada>
          } />
          <Route path="/pedidos" element={
            <RutaPrivada>
              <Pedidos />
            </RutaPrivada>
          } />
          <Route path="/seguimiento" element={
            <RutaPrivada>
              <Seguimiento />
            </RutaPrivada>
          } />
          <Route path="/comunidad" element={
            <RutaPrivada>
              <Comunidad />
            </RutaPrivada>
          } />
          <Route path="/calendario" element={
            <RutaPrivada>
              <Calendario />
            </RutaPrivada>
          } />
          <Route path="/insumos" element={
            <RutaPrivada>
              <Insumos />
            </RutaPrivada>
          } />
          <Route path="/venta-rapida" element={
            <RutaPrivada>
              <VentaRapida />
            </RutaPrivada>
          } />
          <Route path="/auditoria" element={
            <RutaPrivada>
              <Auditoria />
            </RutaPrivada>
          } />
          <Route path="/autoservicio" element={
            <RutaPrivada>
              <Autoservicio />
            </RutaPrivada>
          } />
          <Route path="/gestion-cocina" element={
            <RutaPrivada>
              <GestionCocina />
            </RutaPrivada>
          } />
          <Route path="/transporte" element={
            <RutaPrivada>
              <Transporte />
            </RutaPrivada>
          } />
        </Routes>
      </div>
    </>
  );
}

export default App;