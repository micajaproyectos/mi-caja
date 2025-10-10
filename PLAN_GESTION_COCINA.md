# 📋 PLAN: Sistema de Gestión de Cocina en Tiempo Real

## 🎯 Objetivo Principal
Conectar el módulo **Pedidos.jsx** con **GestionCocina.jsx** para que los cocineros vean los pedidos en tiempo real y puedan marcarlos como "Pendiente" o "Terminado".

---

## 📊 Arquitectura de la Solución

### **Flujo del Sistema:**
```
Pedidos.jsx (Mesero)
    ↓ [Enviar a Cocina]
Base de Datos (pedidos_cocina)
    ↓ [Tiempo Real - Supabase Realtime]
GestionCocina.jsx (Cocinero)
    ↓ [Marcar: Pendiente/Terminado]
```

---

## 🗄️ FASE 1: Crear Tabla en Supabase

### **1.1 - Tabla: `pedidos_cocina`**

```sql
CREATE TABLE pedidos_cocina (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES auth.users(id),
  mesa VARCHAR(50) NOT NULL,
  productos JSONB NOT NULL, -- Array de productos con nombre, cantidad, precio
  total_pedido NUMERIC(10,2) NOT NULL,
  propina NUMERIC(10,2) DEFAULT 0,
  total_con_propina NUMERIC(10,2) NOT NULL,
  estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'terminado')),
  pedido_original_id UUID, -- Referencia al pedido en tabla 'pedidos'
  enviado_a_cocina_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  terminado_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para optimizar consultas
CREATE INDEX idx_pedidos_cocina_usuario ON pedidos_cocina(usuario_id);
CREATE INDEX idx_pedidos_cocina_estado ON pedidos_cocina(estado);
CREATE INDEX idx_pedidos_cocina_enviado ON pedidos_cocina(enviado_a_cocina_at DESC);

-- Habilitar Row Level Security
ALTER TABLE pedidos_cocina ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios solo ven sus propios pedidos
CREATE POLICY "usuarios_pueden_ver_sus_pedidos_cocina" 
ON pedidos_cocina FOR SELECT 
USING (auth.uid() = usuario_id);

CREATE POLICY "usuarios_pueden_insertar_sus_pedidos_cocina" 
ON pedidos_cocina FOR INSERT 
WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "usuarios_pueden_actualizar_sus_pedidos_cocina" 
ON pedidos_cocina FOR UPDATE 
USING (auth.uid() = usuario_id);

-- Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE pedidos_cocina;
```

**Archivo a crear:** `pedidos_cocina_table_setup.sql`

---

## 🔧 FASE 2: Modificar Pedidos.jsx

### **2.1 - Agregar estado para controlar envío a cocina**

```javascript
const [enviandoACocina, setEnviandoACocina] = useState(false);
```

### **2.2 - Crear función `enviarACocina`**

```javascript
const enviarACocina = async (mesa) => {
  // 1. Validar que haya productos en la mesa
  if (!productosPorMesa[mesa] || productosPorMesa[mesa].length === 0) {
    alert('❌ No hay productos en esta mesa para enviar a cocina');
    return;
  }

  try {
    setEnviandoACocina(true);

    // 2. Obtener usuario_id
    const usuarioId = await authService.getCurrentUserId();
    if (!usuarioId) {
      alert('❌ Error: Usuario no autenticado');
      return;
    }

    // 3. Calcular totales
    const productosMesa = productosPorMesa[mesa];
    const totalPedido = calcularTotalMesa(mesa);
    const propina = propinaActiva ? (totalPedido * porcentajePropina) / 100 : 0;
    const totalConPropina = totalPedido + propina;

    // 4. Preparar datos para cocina
    const pedidoCocina = {
      usuario_id: usuarioId,
      mesa: mesa,
      productos: productosMesa.map(p => ({
        producto: p.producto,
        cantidad: p.cantidad,
        unidad: p.unidad,
        precio_unitario: p.precio_unitario,
        subtotal: p.subtotal
      })),
      total_pedido: totalPedido,
      propina: propina,
      total_con_propina: totalConPropina,
      estado: 'pendiente'
    };

    // 5. Insertar en tabla pedidos_cocina
    const { error } = await supabase
      .from('pedidos_cocina')
      .insert([pedidoCocina]);

    if (error) {
      console.error('❌ Error al enviar a cocina:', error);
      alert('❌ Error al enviar pedido a cocina: ' + error.message);
      return;
    }

    alert(`✅ Pedido de ${mesa} enviado a cocina exitosamente`);

  } catch (error) {
    console.error('❌ Error inesperado:', error);
    alert('❌ Error al enviar a cocina');
  } finally {
    setEnviandoACocina(false);
  }
};
```

### **2.3 - Agregar botón "Enviar a Cocina"**

```javascript
{mesaSeleccionada && productosPorMesa[mesaSeleccionada]?.length > 0 && (
  <div className="text-center mt-6 space-y-3">
    {/* Botón NUEVO: Enviar a Cocina */}
    <button
      onClick={() => enviarACocina(mesaSeleccionada)}
      disabled={enviandoACocina}
      className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white font-bold py-3 px-8 rounded-lg transition-all duration-300 transform hover:scale-105 text-lg shadow-lg disabled:transform-none"
    >
      {enviandoACocina ? '⏳ Enviando...' : '🍳 Enviar a Cocina'}
    </button>
    
    {/* Botón EXISTENTE: Registrar Pedido (para pago) */}
    <button
      onClick={() => registrarPedido(mesaSeleccionada)}
      className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg transition-all duration-300 transform hover:scale-105 text-lg shadow-lg"
    >
      📝 Registrar Pedido de {mesaSeleccionada}
    </button>
  </div>
)}
```

**✅ IMPORTANTE:** El botón "Enviar a Cocina" es **independiente** del botón "Registrar Pedido". NO interfiere con la lógica de pago.

---

## 🍳 FASE 3: Implementar GestionCocina.jsx

### **3.1 - Estados necesarios**

```javascript
const [pedidosCocina, setPedidosCocina] = useState([]);
const [loading, setLoading] = useState(true);
const [filtroEstado, setFiltroEstado] = useState('todos'); // 'todos', 'pendiente', 'terminado'
const [actualizandoPedido, setActualizandoPedido] = useState(null);
```

### **3.2 - Función para cargar pedidos**

```javascript
const cargarPedidosCocina = async () => {
  try {
    setLoading(true);

    const usuarioId = await authService.getCurrentUserId();
    if (!usuarioId) {
      console.error('❌ No hay usuario autenticado');
      return;
    }

    const { data, error } = await supabase
      .from('pedidos_cocina')
      .select('*')
      .eq('usuario_id', usuarioId)
      .order('enviado_a_cocina_at', { ascending: false });

    if (error) {
      console.error('❌ Error al cargar pedidos:', error);
      return;
    }

    setPedidosCocina(data || []);
    console.log('✅ Pedidos de cocina cargados:', data?.length || 0);

  } catch (error) {
    console.error('❌ Error inesperado:', error);
  } finally {
    setLoading(false);
  }
};
```

### **3.3 - Suscripción en tiempo real**

```javascript
useEffect(() => {
  cargarPedidosCocina();

  // Configurar suscripción en tiempo real
  const channel = supabase
    .channel('pedidos_cocina_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'pedidos_cocina'
      },
      (payload) => {
        console.log('🔄 Cambio detectado en pedidos_cocina:', payload);
        cargarPedidosCocina(); // Recargar pedidos
      }
    )
    .subscribe();

  // Cleanup
  return () => {
    supabase.removeChannel(channel);
  };
}, []);
```

### **3.4 - Función para cambiar estado**

```javascript
const cambiarEstadoPedido = async (pedidoId, nuevoEstado) => {
  try {
    setActualizandoPedido(pedidoId);

    const actualizacion = {
      estado: nuevoEstado
    };

    // Si se marca como terminado, guardar timestamp
    if (nuevoEstado === 'terminado') {
      actualizacion.terminado_at = new Date().toISOString();
    } else {
      actualizacion.terminado_at = null;
    }

    const { error } = await supabase
      .from('pedidos_cocina')
      .update(actualizacion)
      .eq('id', pedidoId);

    if (error) {
      console.error('❌ Error al actualizar estado:', error);
      alert('❌ Error al actualizar el estado del pedido');
      return;
    }

    console.log(`✅ Pedido ${pedidoId} marcado como ${nuevoEstado}`);

  } catch (error) {
    console.error('❌ Error inesperado:', error);
  } finally {
    setActualizandoPedido(null);
  }
};
```

### **3.5 - Interfaz de usuario**

```javascript
// Filtrar pedidos según estado seleccionado
const pedidosFiltrados = pedidosCocina.filter(pedido => {
  if (filtroEstado === 'todos') return true;
  return pedido.estado === filtroEstado;
});

// Separar pendientes y terminados
const pedidosPendientes = pedidosFiltrados.filter(p => p.estado === 'pendiente');
const pedidosTerminados = pedidosFiltrados.filter(p => p.estado === 'terminado');

return (
  <div className="min-h-screen" style={{ backgroundColor: '#1a3d1a' }}>
    {/* Header */}
    <h1>🍳 Gestión de Cocina</h1>
    
    {/* Filtros */}
    <div className="flex gap-4 mb-6">
      <button 
        onClick={() => setFiltroEstado('todos')}
        className={filtroEstado === 'todos' ? 'bg-blue-600' : 'bg-gray-600'}
      >
        Todos ({pedidosCocina.length})
      </button>
      <button 
        onClick={() => setFiltroEstado('pendiente')}
        className={filtroEstado === 'pendiente' ? 'bg-orange-600' : 'bg-gray-600'}
      >
        Pendientes ({pedidosPendientes.length})
      </button>
      <button 
        onClick={() => setFiltroEstado('terminado')}
        className={filtroEstado === 'terminado' ? 'bg-green-600' : 'bg-gray-600'}
      >
        Terminados ({pedidosTerminados.length})
      </button>
    </div>

    {/* Grid de pedidos */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {pedidosFiltrados.map(pedido => (
        <div 
          key={pedido.id}
          className={`rounded-xl p-6 border-2 ${
            pedido.estado === 'pendiente' 
              ? 'bg-orange-500/20 border-orange-500' 
              : 'bg-green-500/20 border-green-500'
          }`}
        >
          {/* Header del pedido */}
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-2xl font-bold text-white">
              {pedido.mesa}
            </h3>
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${
              pedido.estado === 'pendiente'
                ? 'bg-orange-600 text-white'
                : 'bg-green-600 text-white'
            }`}>
              {pedido.estado === 'pendiente' ? '⏳ Pendiente' : '✅ Terminado'}
            </span>
          </div>

          {/* Lista de productos */}
          <div className="mb-4 bg-black/20 rounded-lg p-4">
            <h4 className="text-white font-semibold mb-2">Productos:</h4>
            {pedido.productos.map((prod, idx) => (
              <div key={idx} className="text-gray-200 text-sm flex justify-between py-1">
                <span>{prod.producto}</span>
                <span className="font-semibold">x{prod.cantidad}</span>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="mb-4 text-white">
            <div className="flex justify-between">
              <span>Total:</span>
              <span className="font-bold">${pedido.total_pedido.toLocaleString()}</span>
            </div>
            {pedido.propina > 0 && (
              <div className="flex justify-between text-sm">
                <span>Propina:</span>
                <span>+${pedido.propina.toLocaleString()}</span>
              </div>
            )}
          </div>

          {/* Botones de acción */}
          <div className="flex gap-2">
            <button
              onClick={() => cambiarEstadoPedido(pedido.id, 'pendiente')}
              disabled={pedido.estado === 'pendiente' || actualizandoPedido === pedido.id}
              className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:opacity-50 text-white font-bold py-2 rounded-lg transition-all"
            >
              ⏳ Pendiente
            </button>
            <button
              onClick={() => cambiarEstadoPedido(pedido.id, 'terminado')}
              disabled={pedido.estado === 'terminado' || actualizandoPedido === pedido.id}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:opacity-50 text-white font-bold py-2 rounded-lg transition-all"
            >
              ✅ Terminado
            </button>
          </div>

          {/* Timestamp */}
          <div className="mt-3 text-xs text-gray-400 text-center">
            Enviado: {new Date(pedido.enviado_a_cocina_at).toLocaleTimeString()}
            {pedido.terminado_at && (
              <> | Terminado: {new Date(pedido.terminado_at).toLocaleTimeString()}</>
            )}
          </div>
        </div>
      ))}
    </div>

    {/* Mensaje si no hay pedidos */}
    {pedidosFiltrados.length === 0 && (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🍽️</div>
        <p className="text-gray-300 text-xl">
          {filtroEstado === 'pendiente' && 'No hay pedidos pendientes'}
          {filtroEstado === 'terminado' && 'No hay pedidos terminados'}
          {filtroEstado === 'todos' && 'No hay pedidos aún'}
        </p>
      </div>
    )}
  </div>
);
```

---

## 📝 FASE 4: Orden de Implementación

### **Paso 1: Base de Datos**
1. Ejecutar `pedidos_cocina_table_setup.sql` en Supabase
2. Verificar que RLS y Realtime estén habilitados

### **Paso 2: Pedidos.jsx**
1. Agregar estado `enviandoACocina`
2. Crear función `enviarACocina`
3. Agregar botón "Enviar a Cocina"
4. Probar envío de pedidos

### **Paso 3: GestionCocina.jsx**
1. Implementar estados y funciones
2. Configurar suscripción en tiempo real
3. Crear interfaz de usuario
4. Probar cambios de estado

### **Paso 4: Testing**
1. Enviar pedido desde Pedidos.jsx
2. Verificar que aparece en GestionCocina.jsx en tiempo real
3. Cambiar estado a "Terminado"
4. Verificar que se actualiza instantáneamente

---

## 🎨 Características Adicionales (Opcionales)

### **1. Sonido de notificación**
Cuando llega un nuevo pedido, reproducir un sonido en GestionCocina.jsx

### **2. Contador de tiempo**
Mostrar cuánto tiempo lleva cada pedido pendiente

### **3. Priorización**
Los pedidos más antiguos aparecen primero

### **4. Vista compacta**
Para pantallas pequeñas en la cocina

---

## ✅ Resumen

**Ventajas de esta arquitectura:**
- ✅ Tiempo real usando Supabase Realtime
- ✅ No interfiere con lógica de pago
- ✅ Seguridad con RLS (cada usuario ve solo sus pedidos)
- ✅ Estados simples: Pendiente/Terminado
- ✅ Escalable (puede agregar más estados después)
- ✅ Independiente (tabla separada de 'pedidos')

**¿Empezamos con la implementación?**

