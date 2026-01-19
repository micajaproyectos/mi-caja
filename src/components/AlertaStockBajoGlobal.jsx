import React from 'react';
import { useAlertasStock } from '../contexts/AlertasStockContext';
import AlertaStockBajo from './AlertaStockBajo';

/**
 * Componente Global de Alertas de Stock Bajo
 * Se renderiza en App.jsx y muestra el popup en cualquier parte de la aplicación
 */
const AlertaStockBajoGlobal = () => {
  const { 
    mostrarPopup, 
    alertaActiva, 
    insumosCriticos, 
    cerrarPopup, 
    manejarAplazamiento 
  } = useAlertasStock();

  // No renderizar nada si no debe mostrarse el popup
  if (!mostrarPopup || !alertaActiva || !insumosCriticos || insumosCriticos.length === 0) {
    return null;
  }

  return (
    <AlertaStockBajo
      alerta={alertaActiva}
      insumosCriticos={insumosCriticos}
      onClose={cerrarPopup}
      onAplazar={manejarAplazamiento}
    />
  );
};

export default AlertaStockBajoGlobal;
