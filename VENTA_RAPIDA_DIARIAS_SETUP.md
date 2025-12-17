# ⚡ Vista Ventas Rápidas Diarias - Configuración

## 🎯 Descripción

Vista SQL que muestra la **sumatoria diaria de ventas rápidas del mes actual** por usuario. Esta vista se actualiza automáticamente cada mes para mostrar solo los datos del mes en curso, sin acumular meses anteriores.

## 📋 Características

- ✅ **Sumatoria diaria**: Total de ventas rápidas por cada día
- ✅ **Solo mes actual**: Se filtra automáticamente por año y mes actual
- ✅ **Por usuario**: Agrupa por `usuario_id`
- ✅ **Actualización automática**: Cambia de mes en mes sin intervención manual
- ✅ **Desde inicio del mes**: Muestra todos los días desde el día 1 del mes
- ✅ **Basada en venta_rapida**: Usa el campo `monto` en lugar de `total_final`

## 🗃️ Estructura de la Vista

### Columnas

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `usuario_id` | UUID | ID del usuario que registró la venta rápida |
| `fecha` | DATE | Fecha completa de la venta (YYYY-MM-DD) |
| `anio` | NUMERIC | Año extraído (ej: 2024) |
| `mes_num` | NUMERIC | Número del mes (1-12) |
| `dia` | NUMERIC | Día del mes (1-31) |
| `total_dia` | NUMERIC | Suma total de ventas rápidas para ese día |

### Ejemplo de Datos

```
| usuario_id | fecha | anio | mes_num | dia | total_dia |
|------------|-----------|------|---------|-----|-----------|
| abc123...  | 2024-12-01| 2024 | 12      | 1   | 25000     |
| abc123...  | 2024-12-02| 2024 | 12      | 2   | 32500     |
| abc123...  | 2024-12-03| 2024 | 12      | 3   | 28900     |
```

## 🚀 Instalación

### Paso 1: Acceder a Supabase

1. Ve a [https://supabase.com](https://supabase.com)
2. Inicia sesión con tu cuenta
3. Selecciona tu proyecto

### Paso 2: Ejecutar el Script SQL

1. Ve a **SQL Editor** en el menú lateral
2. Crea un nuevo query
3. Copia y pega el contenido del archivo `venta_rapida_diarias.sql`
4. Haz clic en **Run** para ejecutar el script

### Paso 3: Verificar la Vista

Ejecuta este query para verificar que se creó correctamente:

```sql
SELECT * FROM public.venta_rapida_diarias
LIMIT 10;
```

## 📊 Uso en la Aplicación

### Consulta Básica

```javascript
// Obtener ventas rápidas diarias del mes actual para un usuario
const { data, error } = await supabase
  .from('venta_rapida_diarias')
  .select('*')
  .eq('usuario_id', userId)
  .order('fecha', { ascending: true });
```

### Ejemplo con Fechas Específicas

```javascript
// Obtener ventas rápidas de una semana específica
const { data, error } = await supabase
  .from('venta_rapida_diarias')
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
-- Muestra ventas rápidas desde 01-12-2024 hasta 31-12-2024
WHERE EXTRACT(YEAR FROM fecha_cl) = 2024
  AND EXTRACT(MONTH FROM fecha_cl) = 12
```

### Enero 2025
```sql
-- Automáticamente cambia a enero 2025
WHERE EXTRACT(YEAR FROM fecha_cl) = 2025
  AND EXTRACT(MONTH FROM fecha_cl) = 1
```

**Nota importante**: La vista **NO acumula** datos de meses anteriores. Cada mes muestra solo las ventas rápidas de ese mes específico.

## 🎨 Visualización Sugerida

### Componente React con Recharts

```jsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const VentasRapidasDiarias = ({ datos }) => (
  <BarChart width={600} height={300} data={datos}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="dia" label={{ value: 'Día', position: 'insideBottom', offset: -5 }} />
    <YAxis label={{ value: 'Ventas ($)', angle: -90, position: 'insideLeft' }} />
    <Tooltip formatter={(value) => `$${value.toLocaleString('es-CL')}`} />
    <Bar dataKey="total" fill="#22c55e" radius={[8, 8, 0, 0]} />
  </BarChart>
);
```

## 🔍 Diferencias con Otras Vistas

| Característica | ventas_diarias | **venta_rapida_diarias** |
|----------------|----------------|--------------------------|
| **Tabla origen** | ventas | **venta_rapida** |
| **Campo monto** | total_final | **monto** |
| **Agrupación** | Por día | **Por día** |
| **Periodo** | Mes actual | **Mes actual** |
| **Uso principal** | Gráfico diario ventas | **Gráfico diario ventas rápidas** |

## 📈 Casos de Uso

1. **Dashboard diario**: Mostrar ventas rápidas de cada día del mes actual
2. **Comparación**: Comparar ventas normales vs ventas rápidas por día
3. **Análisis de eficiencia**: Ver qué días se usan más las ventas rápidas
4. **Tendencias diarias**: Identificar patrones en ventas rápidas
5. **Reportes**: Generar reportes diarios de ventas rápidas

## 🛠️ Mantenimiento

### La vista se mantiene sola
- ✅ **No requiere actualizaciones manuales**
- ✅ **Cambia automáticamente de mes**
- ✅ **Siempre muestra datos actuales**

### Consultas útiles

```sql
-- Ver resumen del mes actual de ventas rápidas
SELECT 
  usuario_id,
  COUNT(*) as dias_con_ventas,
  SUM(total_dia) as total_mes,
  AVG(total_dia) as promedio_diario,
  MAX(total_dia) as mejor_dia,
  MIN(total_dia) as peor_dia
FROM public.venta_rapida_diarias
GROUP BY usuario_id;

-- Comparar ventas normales vs ventas rápidas por día
SELECT 
  COALESCE(v.fecha, vr.fecha) as fecha,
  COALESCE(v.total_dia, 0) as ventas_normales,
  COALESCE(vr.total_dia, 0) as ventas_rapidas,
  COALESCE(v.total_dia, 0) + COALESCE(vr.total_dia, 0) as total_dia
FROM public.ventas_diarias v
FULL OUTER JOIN public.venta_rapida_diarias vr 
  ON v.fecha = vr.fecha AND v.usuario_id = vr.usuario_id
WHERE v.usuario_id = 'tu-usuario-id' OR vr.usuario_id = 'tu-usuario-id'
ORDER BY fecha;
```

## 📝 Notas Importantes

1. **Solo mes actual**: Esta vista **no muestra meses anteriores**
2. **Sin acumulación**: Cada día muestra solo el total de ese día
3. **Campo monto**: Usa `monto` de la tabla `venta_rapida` (no `total_final`)
4. **Actualización automática**: El filtro `CURRENT_DATE` hace que la vista siempre muestre el mes actual
5. **Complementaria**: Se usa junto con `ventas_diarias` para tener vista completa

## 🚨 Solución de Problemas

### No veo datos
- Verifica que tengas ventas rápidas registradas en el mes actual
- Verifica que `fecha_cl` esté correctamente poblada
- Verifica que `monto` no sea NULL

### Datos incorrectos
- Verifica que la zona horaria sea correcta en `fecha_cl`
- Revisa que no haya duplicados en la tabla `venta_rapida`

### Vista no existe
- Ejecuta nuevamente el script `venta_rapida_diarias.sql`
- Verifica permisos en Supabase

## 🔗 Vistas Relacionadas

- **ventas_diarias**: Vista equivalente para ventas normales
- **venta_rapida_mensual_acum_v2**: Vista de ventas rápidas acumuladas mensuales
- **venta_rapida_tipo_pago_mensual**: Vista de ventas rápidas por tipo de pago

