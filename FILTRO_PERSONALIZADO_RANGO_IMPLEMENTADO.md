# Filtro Personalizado de Rango de Fecha/Hora - Implementado

## 📋 Resumen

Se ha implementado exitosamente un **Filtro Personalizado** en el módulo de Pedidos que permite seleccionar un rango específico de fecha y hora para resolver el problema de jornadas laborales que cruzan medianoche.

## ✅ Problema Resuelto

**Problema original:**
- Los clientes trabajan de 19:00 a 01:00 (cruza medianoche)
- Los pedidos después de las 00:00 se contabilizan como del día siguiente
- Al hacer cierre de caja, las sumatorias no cuadran

**Solución:**
- Filtro personalizado con fecha-hora inicio y fin
- Permite seleccionar: "7-feb 19:00 hasta 8-feb 01:00"
- Las estadísticas se calculan correctamente para ese rango

## 🎯 Funcionalidades Implementadas

### 1. **Nuevos Estados**
- `filtroPersonalizadoInicio`: Fecha y hora de inicio del rango
- `filtroPersonalizadoFin`: Fecha y hora de fin del rango

### 2. **Lógica de Filtrado**
- El filtro personalizado tiene **prioridad** sobre otros filtros
- Filtra usando `created_at` (timestamp con zona horaria UTC)
- Convierte automáticamente a hora de Chile para mostrar

### 3. **Interfaz de Usuario**
- 2 campos `datetime-local` (HTML5 nativo)
- Separación visual clara del resto de filtros
- Indicador visual cuando el filtro está activo
- Formato de fecha en español chileno

### 4. **Integración con Filtros Existentes**
- Los filtros se excluyen mutuamente
- Al usar el filtro personalizado, se limpian los demás
- Al usar otros filtros, se limpia el personalizado
- El filtro de tipo de pago funciona en conjunto con cualquier filtro

### 5. **Título Dinámico**
- Muestra el rango seleccionado en el resumen
- Formato: "Resumen de Pedidos - DD/MM/AAAA HH:MM hasta DD/MM/AAAA HH:MM"

## 🕐 Manejo de Zona Horaria

### **Almacenamiento en Base de Datos:**
```
created_at: timestamp with time zone
Ejemplo: 2026-02-08 01:28:46.820905+00 (UTC)
```

### **Conversión Automática:**
- JavaScript convierte hora Chile → UTC para filtrar
- PostgreSQL convierte UTC → Chile para mostrar
- Horario de verano/invierno se maneja automáticamente

### **Ejemplo de Uso:**
```
Usuario selecciona:
  Desde: 7-feb-2026 19:00 (Chile)
  Hasta: 8-feb-2026 01:00 (Chile)

Sistema filtra:
  created_at >= '2026-02-07 22:00:00+00' AND
  created_at <= '2026-02-08 04:00:00+00'
  (Convertido a UTC automáticamente)
```

## 📱 Interfaz de Usuario

### **Ubicación:**
- Módulo: Pedidos
- Sección: Filtros (debajo de filtros estándar)
- Separado visualmente con borde y título

### **Campos:**
1. **Desde (Fecha y Hora):** `<input type="datetime-local">`
2. **Hasta (Fecha y Hora):** `<input type="datetime-local">`
3. **Indicador Visual:** Muestra el rango seleccionado en formato legible

### **Comportamiento:**
- Al llenar "Desde" o "Hasta": se limpian filtros estándar
- Al usar filtros estándar: se limpia el filtro personalizado
- Botón "Limpiar" limpia todos los filtros incluyendo el personalizado

## 🎨 Estilo Visual

```jsx
- Título: "🕐 Filtro Personalizado (Rango de Fecha y Hora)"
- Campos: Fondo transparente con borde blanco/20
- Indicador: Texto verde cuando está activo
- Formato fecha: DD/MM/AAAA HH:MM (español chileno)
```

## 📊 Casos de Uso

### **Caso 1: Jornada Nocturna**
```
Desde: 7-feb-2026 19:00
Hasta: 8-feb-2026 01:00
Resultado: Todos los pedidos de esa jornada
```

### **Caso 2: Turno Específico**
```
Desde: 7-feb-2026 08:00
Hasta: 7-feb-2026 14:00
Resultado: Solo pedidos del turno mañana
```

### **Caso 3: Múltiples Días**
```
Desde: 5-feb-2026 00:00
Hasta: 7-feb-2026 23:59
Resultado: Todos los pedidos de 3 días completos
```

## 🔧 Archivos Modificados

### `src/components/Pedidos.jsx`
- ✅ Línea 195-200: Agregados estados filtroPersonalizadoInicio y filtroPersonalizadoFin
- ✅ Línea 1788-1817: Actualizada función pedidosFiltradosMemo con filtro personalizado
- ✅ Línea 1897: Actualizado useMemo dependencies
- ✅ Línea 1905-1910: Actualizada función limpiarFiltros
- ✅ Línea 1970-2028: Actualizada función obtenerTituloResumenPedidos
- ✅ Línea 3764-3916: Agregada UI del filtro personalizado

## ✅ Testing Recomendado

1. **Filtro básico:**
   - Seleccionar "Desde: 7-feb 19:00" y "Hasta: 8-feb 01:00"
   - Verificar que aparecen pedidos de ambos días
   - Verificar que el resumen muestra el total correcto

2. **Exclusión mutua:**
   - Usar filtro personalizado
   - Luego usar filtro de fecha → personalizado debe limpiarse
   - Viceversa

3. **Zona horaria:**
   - Crear pedido a las 23:00
   - Crear pedido a las 01:00 (día siguiente)
   - Filtrar desde 19:00 hasta 05:00
   - Verificar que ambos aparecen

4. **Estadísticas:**
   - Verificar que Total, Efectivo, Débito, Transferencia sumen correctamente
   - Verificar que las propinas se calculen bien

## 🎉 Resultado

Los usuarios ahora pueden:
- ✅ Seleccionar rangos específicos de fecha-hora
- ✅ Hacer cierre de caja de jornadas nocturnas correctamente
- ✅ Ver estadísticas precisas del rango seleccionado
- ✅ No preocuparse por el cambio de día a las 00:00

## 📝 Notas Adicionales

- El filtro personalizado tiene **prioridad** sobre filtros estándar
- El filtro de tipo de pago funciona **en conjunto** con el personalizado
- El formato de fecha-hora se adapta al navegador del usuario
- La conversión de zona horaria es automática y transparente
