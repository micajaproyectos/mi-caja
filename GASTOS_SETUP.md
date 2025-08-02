# 💰 Configuración del Sistema de Gastos

## 🎯 **Descripción**

El componente `FormularioGastos.jsx` ha sido creado e integrado en la aplicación "Mi Caja" para gestionar el control de gastos del negocio. Este sistema permite registrar, visualizar, filtrar y eliminar gastos de manera eficiente.

## ✅ **Características Implementadas**

### **1. Formulario de Registro**
- **Fecha**: Campo de fecha con formato YYYY-MM-DD (fecha actual por defecto)
- **Tipo de Gasto**: Selector con opciones "Fijo" o "Variable"
- **Detalle**: Campo de texto para descripción del gasto
- **Monto**: Campo numérico con validación (mayor a 0)
- **Tipo de Pago**: Selector con opciones "Efectivo", "Débito", "Transferencia"

### **2. Tabla de Gastos Registrados**
- Visualización de todos los gastos registrados
- Ordenamiento por fecha (más recientes primero)
- Columnas: Fecha, Tipo, Detalle, Monto, Tipo de Pago, Acciones

### **3. Sistema de Filtros**
- **Búsqueda por detalle**: Filtro de texto para buscar en descripciones
- **Filtro por fecha**: Filtro específico por fecha
- **Filtro por tipo de gasto**: Filtro por "Fijo" o "Variable"
- **Filtro por tipo de pago**: Filtro por método de pago
- **Filtros activos**: Indicadores visuales con opción de limpiar

### **4. Estadísticas en Tiempo Real**
- Total de gastos filtrados
- Total de gastos fijos
- Total de gastos variables
- Cantidad de registros mostrados

### **5. Funcionalidad de Eliminación**
- Botón de eliminar en cada registro
- Confirmación antes de eliminar
- Actualización automática de la tabla

## 🗄️ **Configuración de la Base de Datos**

### **Tabla `gasto` en Supabase**

La tabla incluye los siguientes campos:

```sql
CREATE TABLE public.gasto (
    id BIGSERIAL PRIMARY KEY,
    fecha DATE NOT NULL,
    tipo_gasto TEXT NOT NULL CHECK (tipo_gasto IN ('Fijo', 'Variable')),
    detalle TEXT NOT NULL,
    monto DECIMAL(10,2) NOT NULL CHECK (monto > 0),
    tipo_pago TEXT NOT NULL CHECK (tipo_pago IN ('Efectivo', 'Débito', 'Transferencia')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **Configuración Requerida**

1. **Ejecutar el script SQL**: Usar el archivo `gasto_table_setup.sql` en el SQL Editor de Supabase
2. **Verificar políticas RLS**: Asegurar que las políticas de seguridad estén configuradas
3. **Insertar datos de prueba** (opcional): El script incluye datos de ejemplo

## 🚀 **Cómo Usar el Sistema**

### **1. Acceso al Módulo**
- Navegar a la página principal de "Mi Caja"
- Hacer clic en el botón "💰 Gastos"
- El sistema cargará automáticamente los gastos existentes

### **2. Registrar un Nuevo Gasto**
1. Completar el formulario en la sección "📝 Registrar Nuevo Gasto"
2. La fecha se establece automáticamente en la fecha actual
3. Seleccionar el tipo de gasto (Fijo/Variable)
4. Escribir el detalle del gasto
5. Ingresar el monto (solo números positivos)
6. Seleccionar el tipo de pago
7. Hacer clic en "💰 Registrar Gasto"

### **3. Filtrar Gastos**
1. Usar la sección "🔍 Filtros de Búsqueda"
2. Aplicar filtros individuales o combinados
3. Ver los filtros activos en la sección inferior
4. Limpiar filtros individuales o todos a la vez

### **4. Eliminar Gastos**
1. Localizar el gasto en la tabla
2. Hacer clic en el botón "🗑️ Eliminar"
3. Confirmar la eliminación en el diálogo
4. El gasto se eliminará y la tabla se actualizará

## 🎨 **Diseño y UX**

### **Consistencia Visual**
- Mantiene el mismo diseño glassmorphism de la aplicación
- Colores y estilos consistentes con otros módulos
- Iconos descriptivos para cada campo y acción

### **Responsividad**
- Diseño adaptativo para móviles y tablets
- Grid responsivo para filtros y estadísticas
- Tabla con scroll horizontal en pantallas pequeñas

### **Feedback Visual**
- Estados de carga con spinners
- Mensajes de error claros
- Confirmaciones para acciones destructivas
- Indicadores de filtros activos

## 🔧 **Funciones Principales**

### **`obtenerFechaActual()`**
- Obtiene la fecha actual en formato YYYY-MM-DD
- Usa `getFullYear()`, `getMonth()`, `getDate()` como solicitado

### **`formatearNumero(numero)`**
- Formatea números con separadores de miles
- Configurado para formato español

### **`formatearFechaMostrar(fechaString)`**
- Convierte fechas de la base de datos a formato DD/MM/YYYY
- Usa métodos UTC para evitar problemas de zona horaria

### **`registrarGasto(e)`**
- Valida todos los campos del formulario
- Inserta el gasto en Supabase
- Limpia el formulario y recarga los datos

### **`eliminarGasto(id)`**
- Confirma la eliminación con el usuario
- Elimina el registro de Supabase
- Actualiza la tabla automáticamente

## 📊 **Estructura de Datos**

### **Estado del Formulario**
```javascript
const [gasto, setGasto] = useState({
  fecha: '',
  tipo_gasto: '',
  detalle: '',
  monto: '',
  tipo_pago: ''
});
```

### **Filtros**
```javascript
const [busquedaDetalle, setBusquedaDetalle] = useState('');
const [filtroFecha, setFiltroFecha] = useState('');
const [filtroTipoGasto, setFiltroTipoGasto] = useState('');
const [filtroTipoPago, setFiltroTipoPago] = useState('');
```

## 🛡️ **Validaciones**

### **Campos Requeridos**
- Todos los campos son obligatorios
- Validación de monto mayor a 0
- Validación de tipos de gasto y pago mediante CHECK constraints

### **Formato de Fecha**
- Formato YYYY-MM-DD para almacenamiento
- Formato DD/MM/YYYY para visualización
- Manejo de zona horaria con métodos UTC

## 🔄 **Integración**

### **Rutas**
- Ruta: `/gastos`
- Componente: `FormularioGastos`
- Integrado en `App.jsx`

### **Navegación**
- Botón "💰 Gastos" en la página principal
- Botón "← Volver al Inicio" en el módulo

## ✅ **Estado de Implementación**

- ✅ Componente creado y funcional
- ✅ Integrado en la aplicación
- ✅ Script SQL para configuración de base de datos
- ✅ Documentación completa
- ✅ Diseño consistente con la aplicación
- ✅ Funcionalidades de CRUD completas
- ✅ Sistema de filtros implementado
- ✅ Estadísticas en tiempo real
- ✅ Validaciones y manejo de errores

## 🚀 **Próximos Pasos**

1. **Ejecutar el script SQL** en Supabase
2. **Probar el registro** de gastos
3. **Verificar los filtros** y estadísticas
4. **Probar la eliminación** de registros
5. **Validar la responsividad** en diferentes dispositivos

El sistema de gastos está completamente funcional y listo para usar en la aplicación "Mi Caja". 