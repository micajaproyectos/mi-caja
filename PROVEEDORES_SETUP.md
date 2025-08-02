# 🏢 Configuración del Sistema de Proveedores

## 📋 Descripción

El componente `FormularioProveedores` permite registrar y gestionar información de proveedores en la aplicación. Incluye funcionalidades para registrar proveedores, cambiar estados de pagos, filtrar registros y exportar datos.

## 🗄️ Configuración de la Base de Datos

### 1. Crear la tabla en Supabase

Ejecuta el script SQL `proveedores_table_setup.sql` en el SQL Editor de Supabase:

```sql
-- Crear la tabla proveedores
CREATE TABLE IF NOT EXISTS proveedores (
    id BIGSERIAL PRIMARY KEY,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    nombre_proveedor TEXT NOT NULL,
    monto DECIMAL(10,2) NOT NULL CHECK (monto >= 0),
    estado TEXT NOT NULL CHECK (estado IN ('Pendiente', 'Pagado')) DEFAULT 'Pendiente',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. Campos de la tabla

- **id**: Identificador único autoincremental
- **fecha**: Fecha del registro (se asigna automáticamente)
- **nombre_proveedor**: Nombre del proveedor (obligatorio)
- **monto**: Monto del pago (decimal, debe ser >= 0)
- **estado**: Estado del pago ('Pendiente' o 'Pagado')
- **fecha_pago**: Fecha en que se realizó el pago (se asigna automáticamente al marcar como pagado)
- **created_at**: Timestamp de creación
- **updated_at**: Timestamp de última actualización

## 🚀 Funcionalidades del Componente

### 📝 Registro de Proveedores

1. **Nombre del Proveedor**: Campo de texto obligatorio
2. **Monto**: Campo numérico obligatorio (solo números positivos)
3. **Estado**: Selector con opciones "Pendiente" o "Pagado"
4. **Fecha**: Se asigna automáticamente la fecha actual

### 📊 Gestión de Registros

- **Visualización**: Lista de todos los proveedores registrados
- **Filtros**: 
  - Búsqueda por nombre del proveedor
  - Filtro por fecha
  - Filtro por estado (Pendiente/Pagado)
- **Acciones**:
  - Cambiar estado (Pendiente ↔ Pagado)
  - Eliminar registro
  - Exportar a CSV

### 📈 Estadísticas

El componente muestra estadísticas en tiempo real:
- Total de registros
- Cantidad de pagos pendientes
- Cantidad de pagos realizados
- Monto total
- Monto pendiente por pagar
- Monto total pagado

## 🎨 Características de la Interfaz

### Diseño Consistente
- Mantiene la misma visualización que el resto de la aplicación
- Fondo degradado verde con efectos de vidrio esmerilado
- Tipografía Inter para consistencia
- Iconos emoji para mejor UX

### Responsive Design
- Adaptable a dispositivos móviles y desktop
- Grid responsivo para estadísticas
- Formularios optimizados para diferentes pantallas

### Estados de Carga
- Indicadores de carga durante operaciones
- Mensajes de confirmación y error
- Validaciones en tiempo real

## 🔧 Configuración del Componente

### 1. Importar el componente

El componente ya está importado en `App.jsx`:

```jsx
import FormularioProveedores from './components/FormularioProveedores';
```

### 2. Configurar la ruta

La ruta `/proveedores` ya está configurada para usar el componente:

```jsx
<Route path="/proveedores" element={<Proveedores />} />
```

### 3. Acceso desde el menú principal

El componente es accesible desde la página principal a través del módulo "Proveedores".

## 📱 Uso del Componente

### Registrar un nuevo proveedor:

1. Navegar a la sección "Proveedores"
2. Completar el formulario:
   - Ingresar nombre del proveedor
   - Ingresar monto
   - Seleccionar estado (por defecto "Pendiente")
3. Hacer clic en "Registrar Proveedor"

### Gestionar registros existentes:

1. **Cambiar estado**: Hacer clic en el botón de estado (✅/⏳)
   - Al marcar como "Pagado" se registra automáticamente la fecha de pago
   - Al marcar como "Pendiente" se limpia la fecha de pago
2. **Eliminar**: Hacer clic en el botón 🗑️
3. **Filtrar**: Usar los filtros en la sección de búsqueda
4. **Exportar**: Hacer clic en "Exportar CSV"

## 🔒 Validaciones

### Validaciones del formulario:
- Nombre del proveedor: Obligatorio, mínimo 1 carácter
- Monto: Obligatorio, debe ser mayor a 0
- Estado: Debe ser "Pendiente" o "Pagado"

### Validaciones de la base de datos:
- Monto: CHECK (monto >= 0)
- Estado: CHECK (estado IN ('Pendiente', 'Pagado'))
- Fecha: NOT NULL con valor por defecto

## 📊 Exportación de Datos

El componente permite exportar los datos a formato CSV con:
- Fecha de registro formateada (DD/MM/YYYY)
- Nombre del proveedor
- Monto formateado
- Estado
- Fecha de pago (si está pagado)

## 🐛 Solución de Problemas

### Error al cargar proveedores:
- Verificar conexión a Supabase
- Confirmar que la tabla existe
- Revisar permisos de RLS

### Error al registrar proveedor:
- Verificar que todos los campos estén completos
- Confirmar que el monto sea válido
- Revisar la conexión a la base de datos

### Error al cambiar estado:
- Verificar permisos de actualización
- Confirmar que el registro existe
- Revisar logs de la consola

## 🔄 Actualizaciones Futuras

Posibles mejoras para futuras versiones:
- Filtros por rango de fechas
- Búsqueda avanzada
- Historial de cambios de estado
- Notificaciones de pagos pendientes
- Integración con sistema de facturación
- Reportes personalizados

## 📞 Soporte

Para problemas o consultas sobre el componente:
1. Revisar los logs de la consola del navegador
2. Verificar la configuración de Supabase
3. Confirmar que la tabla está creada correctamente
4. Validar los permisos de la base de datos 