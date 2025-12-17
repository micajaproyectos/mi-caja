# 📊 Vista Ventas Diarias - Configuración

## 🎯 Descripción

Vista SQL que muestra la **sumatoria diaria de ventas del mes actual** por usuario. Esta vista se actualiza automáticamente cada mes para mostrar solo los datos del mes en curso, sin acumular meses anteriores.

## 📋 Características

- ✅ **Sumatoria diaria**: Total de ventas por cada día
- ✅ **Solo mes actual**: Se filtra automáticamente por año y mes actual
- ✅ **Por usuario**: Agrupa por `usuario_id`
- ✅ **Actualización automática**: Cambia de mes en mes sin intervención manual
- ✅ **Desde inicio del mes**: Muestra todos los días desde el día 1 del mes

## 🗃️ Estructura de la Vista

### Columnas

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `usuario_id` | UUID | ID del usuario que registró la venta |
| `fecha` | DATE | Fecha completa de la venta (YYYY-MM-DD) |
| `anio` | NUMERIC | Año extraído (ej: 2024) |
| `mes_num` | NUMERIC | Número del mes (1-12) |
| `dia` | NUMERIC | Día del mes (1-31) |
| `total_dia` | NUMERIC | Suma total de ventas para ese día |

### Ejemplo de Datos

```
| usuario_id | fecha | anio | mes_num | dia | total_dia |
|------------|-----------|------|---------|-----|-----------|
| abc123...  | 2024-12-01| 2024 | 12      | 1   | 45000     |
| abc123...  | 2024-12-02| 2024 | 12      | 2   | 52300     |
| abc123...  | 2024-12-03| 2024 | 12      | 3   | 38900     |
```

## 🚀 Instalación

### Paso 1: Acceder a Supabase

1. Ve a [https://supabase.com](https://supabase.com)
2. Inicia sesión con tu cuenta
3. Selecciona tu proyecto

### Paso 2: Ejecutar el Script SQL

1. Ve a **SQL Editor** en el menú lateral
2. Crea un nuevo query
3. Copia y pega el contenido del archivo `ventas_diarias.sql`
4. Haz clic en **Run** para ejecutar el script

### Paso 3: Verificar la Vista

Ejecuta este query para verificar que se creó correctamente:

```sql
SELECT * FROM public.ventas_diarias
LIMIT 10;
```

## 📊 Uso en la Aplicación

### Consulta Básica

```javascript
// Obtener ventas diarias del mes actual para un usuario
const { data, error } = await supabase
  .from('ventas_diarias')
  .select('*')
  .eq('usuario_id', userId)
  .order('fecha', { ascending: true });
```

### Ejemplo con Fechas Específicas

```javascript
// Obtener ventas de una semana específica
const { data, error } = await supabase
  .from('ventas_diarias')
  .select('fecha, total_dia')
  .eq('usuario_id', userId)
  .gte('fecha', '2024-12-01')
  .lte('fecha', '2024-12-07')
  .order('fecha', { ascending: true });
```

### Para Gráficos

```javascript
// Formatear datos para usar en recharts
const datosGrafico = data?.map(d => ({
  dia: d.dia,
  total: parseFloat(d.total_dia) || 0,
  fecha: d.fecha
})) || [];
```

## 🔄 Comportamiento por Mes

### Diciembre 2024
```sql
-- Muestra ventas desde 01-12-2024 hasta 31-12-2024
WHERE EXTRACT(YEAR FROM fecha_cl) = 2024
  AND EXTRACT(MONTH FROM fecha_cl) = 12
```

### Enero 2025
```sql
-- Automáticamente cambia a enero 2025
WHERE EXTRACT(YEAR FROM fecha_cl) = 2025
  AND EXTRACT(MONTH FROM fecha_cl) = 1
```

**Nota importante**: La vista **NO acumula** datos de meses anteriores. Cada mes muestra solo las ventas de ese mes específico.

## 🎨 Visualización Sugerida

### Componente React con Recharts

```jsx
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const VentasDiarias = ({ datos }) => (
  <LineChart width={600} height={300} data={datos}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="dia" label={{ value: 'Día', position: 'insideBottom', offset: -5 }} />
    <YAxis label={{ value: 'Ventas ($)', angle: -90, position: 'insideLeft' }} />
    <Tooltip formatter={(value) => `$${value.toLocaleString('es-CL')}`} />
    <Line type="monotone" dataKey="total" stroke="#1a3d1a" strokeWidth={2} />
  </LineChart>
);
```

## 🔍 Diferencias con ventas_mensual_acum_v2

| Característica | ventas_mensual_acum_v2 | ventas_diarias |
|----------------|------------------------|----------------|
| **Agrupación** | Por mes | Por día |
| **Acumulación** | Sí (acumula meses del año) | No (solo suma del día) |
| **Periodo** | Todo el año | Solo mes actual |
| **Filtro temporal** | Por año | Por año + mes actual |
| **Uso principal** | Gráfico anual acumulado | Gráfico diario del mes |

## 📈 Casos de Uso

1. **Dashboard diario**: Mostrar ventas de cada día del mes actual
2. **Análisis semanal**: Comparar ventas por semana dentro del mes
3. **Tendencias diarias**: Identificar días con mayores/menores ventas
4. **Metas diarias**: Comparar ventas reales vs metas por día
5. **Alertas**: Detectar días sin ventas o con ventas bajas

## 🛠️ Mantenimiento

### La vista se mantiene sola
- ✅ **No requiere actualizaciones manuales**
- ✅ **Cambia automáticamente de mes**
- ✅ **Siempre muestra datos actuales**

### Consultas útiles

```sql
-- Ver resumen del mes actual
SELECT 
  usuario_id,
  COUNT(*) as dias_con_ventas,
  SUM(total_dia) as total_mes,
  AVG(total_dia) as promedio_diario,
  MAX(total_dia) as mejor_dia,
  MIN(total_dia) as peor_dia
FROM public.ventas_diarias
GROUP BY usuario_id;

-- Ver días sin ventas en el mes
WITH dias_mes AS (
  SELECT generate_series(
    date_trunc('month', CURRENT_DATE),
    date_trunc('month', CURRENT_DATE) + interval '1 month' - interval '1 day',
    interval '1 day'
  )::date as fecha
)
SELECT dm.fecha
FROM dias_mes dm
LEFT JOIN public.ventas_diarias vd ON dm.fecha = vd.fecha AND vd.usuario_id = 'tu-usuario-id'
WHERE vd.fecha IS NULL
ORDER BY dm.fecha;
```

## 📝 Notas Importantes

1. **Solo mes actual**: Esta vista **no muestra meses anteriores**
2. **Sin acumulación**: Cada día muestra solo el total de ese día
3. **Actualización automática**: El filtro `CURRENT_DATE` hace que la vista siempre muestre el mes actual
4. **Rendimiento**: La vista es eficiente porque solo consulta un mes de datos

## 🚨 Solución de Problemas

### No veo datos
- Verifica que tengas ventas registradas en el mes actual
- Verifica que `fecha_cl` esté correctamente poblada
- Verifica que `total_final` no sea NULL

### Datos incorrectos
- Verifica que la zona horaria sea correcta en `fecha_cl`
- Revisa que no haya duplicados en la tabla `ventas`

### Vista no existe
- Ejecuta nuevamente el script `ventas_diarias.sql`
- Verifica permisos en Supabase

