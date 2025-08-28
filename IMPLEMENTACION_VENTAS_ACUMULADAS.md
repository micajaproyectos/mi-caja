# Implementación del Gráfico de Ventas Acumuladas Mensuales

## Resumen
Se ha implementado exitosamente un gráfico de ventas acumuladas mensuales en el componente `Seguimiento.jsx` que muestra el total acumulado mensual (enero-diciembre) para el cliente del usuario logueado.

## Características Implementadas

### ✅ 1. Preparación
- Importados componentes de Recharts: `ResponsiveContainer`, `LineChart`, `Line`, `XAxis`, `YAxis`, `Tooltip`, `CartesianGrid`
- Cliente de Supabase importado desde `../lib/supabaseClient`

### ✅ 2. Resolución del cliente_id
- Función `obtenerClienteId()` que obtiene el usuario actual usando `authService.getCurrentUserId()`
- Consulta a la tabla `cliente` para recuperar el `cliente_id` del `usuario_id` autenticado
- Estado local `clienteId` que se resuelve antes de continuar

### ✅ 3. Datos de la vista
- Año objetivo: año calendario actual
- Consulta a la vista `ventas_mensual_acum` filtrando por:
  - `cliente_id = clienteId`
  - `anio = año actual`
- Selección de `mes_num` y `total_acumulado`
- Ordenamiento por `mes_num` ascendente
- Array de 12 elementos (enero a diciembre) con abreviaturas de meses
- Relleno con 0 para meses sin datos

### ✅ 4. UI del gráfico
- Contenedor con altura fija: `h-64` en mobile, `md:h-80` en desktop
- `ResponsiveContainer` al 100% de ancho y alto
- `LineChart` usando los datos de `rows`
- Grilla con líneas punteadas (`CartesianGrid`)
- Eje X: etiquetas de meses abreviados
- Eje Y: formato CLP (locale es-CL, miles con punto)
- Tooltip: valor en CLP y mes como etiqueta
- Solo puntos visibles (línea transparente)
- Estilo de punto: 16px, borde blanco fino, color verde (#10b981)
- Título: "Ventas Acumuladas {año}"

### ✅ 5. Estados y mensajes
- Loading: texto centrado "Cargando..." mientras se resuelve `clienteId` o consulta
- Error: recuadro con mensaje del error si falla autenticación o consulta
- Vacío: gráfico muestra 12 meses con puntos en 0

### ✅ 6. Responsividad y layout
- Contenedor padre con ancho disponible
- Márgenes internos del chart para evitar cortes de etiquetas

### ✅ 7. Formato y accesibilidad
- Locale es-CL para formatear números
- Atributo `aria-label` en el contenedor del chart

### ✅ 8. Registro mínimo
- Logs con prefijo `[chart]`:
  - `[chart] cliente_id:<...>`
  - `[chart] fetch ventas_mensual_acum ok (N filas)`
  - `[chart] error:<mensaje>`

## Vista SQL Requerida

### Archivo: `ventas_mensual_acum_view.sql`

```sql
-- Vista para calcular ventas acumuladas mensuales por cliente
CREATE OR REPLACE VIEW public.ventas_mensual_acum AS
WITH ventas_mensuales AS (
  SELECT 
    v.usuario_id,
    c.id as cliente_id,
    EXTRACT(YEAR FROM v.fecha_cl) as anio,
    EXTRACT(MONTH FROM v.fecha_cl) as mes_num,
    SUM(COALESCE(v.total_final, v.total_venta, 0)) as total_mes
  FROM public.ventas v
  LEFT JOIN public.cliente c ON v.usuario_id = c.usuario_id
  WHERE v.fecha_cl IS NOT NULL
    AND (v.total_final IS NOT NULL OR v.total_venta IS NOT NULL)
  GROUP BY v.usuario_id, c.id, EXTRACT(YEAR FROM v.fecha_cl), EXTRACT(MONTH FROM v.fecha_cl)
),
ventas_acumuladas AS (
  SELECT 
    vm.usuario_id,
    vm.cliente_id,
    vm.anio,
    vm.mes_num,
    vm.total_mes,
    SUM(vm.total_mes) OVER (
      PARTITION BY vm.usuario_id, vm.cliente_id, vm.anio 
      ORDER BY vm.mes_num 
      ROWS UNBOUNDED PRECEDING
    ) as total_acumulado
  FROM ventas_mensuales vm
)
SELECT 
  va.cliente_id,
  va.anio,
  va.mes_num,
  va.total_acumulado
FROM ventas_acumuladas va
WHERE va.cliente_id IS NOT NULL
ORDER BY va.cliente_id, va.anio, va.mes_num;
```

## Pasos para Implementar en Supabase

### 1. Ejecutar la Vista SQL
```sql
-- Copiar y ejecutar el contenido de ventas_mensual_acum_view.sql
-- en el SQL Editor de Supabase
```

### 2. Verificar Permisos
- La vista tiene RLS habilitado
- Política de acceso para usuarios autenticados
- Verificar que la tabla `cliente` existe y tiene la relación correcta

### 3. Probar la Vista
```sql
-- Consulta de prueba
SELECT * FROM public.ventas_mensual_acum 
WHERE cliente_id = [ID_DEL_CLIENTE] 
AND anio = 2025;
```

## Funcionalidades del Componente

### Estados
- `clienteId`: ID del cliente del usuario autenticado
- `datosVentasAcumuladas`: Array de 12 meses con totales acumulados
- `loadingVentasAcumuladas`: Estado de carga
- `errorVentasAcumuladas`: Mensajes de error

### Funciones
- `obtenerClienteId()`: Obtiene el cliente_id del usuario
- `cargarVentasAcumuladas()`: Carga datos de la vista
- Botón de recarga para actualizar datos

### Características del Gráfico
- Gráfico de líneas con solo puntos visibles
- Eje Y formateado en CLP
- Tooltip informativo
- Responsive design
- Manejo de estados de carga, error y vacío

## Notas Técnicas

- El gráfico se carga automáticamente al montar el componente
- Se recarga cuando se obtiene el `clienteId`
- Maneja casos donde no hay datos (muestra 12 meses con 0)
- Formato de moneda chilena (CLP) con separadores de miles
- Logs discretos para debugging

## Próximos Pasos

1. **Implementar la vista en Supabase** ejecutando el SQL
2. **Verificar la relación** entre `ventas.usuario_id` y `cliente.usuario_id`
3. **Probar con datos reales** para validar el cálculo acumulado
4. **Optimizar consultas** si es necesario para grandes volúmenes de datos
