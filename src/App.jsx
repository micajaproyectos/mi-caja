import { Routes, Route, useNavigate } from 'react-router-dom';
import Home from './components/Home';
import RegistroVenta from './components/RegistroVenta';
import RegistroInventario from './components/RegistroInventario';
import Stock from './components/Stock';
import RegistroAsistencia from './components/RegistroAsistencia';
import FormularioGastos from './components/FormularioGastos';
import FormularioProveedores from './components/FormularioProveedores';
import Footer from './components/Footer';

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
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/ventas" element={<RegistroVenta />} />
      <Route path="/asistencia" element={<RegistroAsistencia />} />
      <Route path="/gastos" element={<FormularioGastos />} />
      <Route path="/inventario" element={<Inventario />} />
      <Route path="/stock" element={<StockComponent />} />
      <Route path="/proveedores" element={<Proveedores />} />
    </Routes>
  );
}

export default App;