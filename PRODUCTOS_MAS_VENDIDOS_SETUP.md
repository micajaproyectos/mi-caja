# Configuración de la Tabla "productos_mas_vendidos"

## Problema Identificado

El componente `Stock.jsx` está intentando consultar la tabla `productos_mas_vendidos` que no existe en la base de datos de Supabase. Esto causa que la sección "Producto Más Vendido" no muestre datos, incluso cuando hay ventas registradas como el producto T1 con cantidad 150.

## Solución

Se ha creado el archivo `productos_mas_vendidos_setup.sql` que contiene todo el código necesario para:

1. **Crear la tabla `productos_mas_vendidos`**
2. **Configurar triggers automáticos** para actualizar la tabla cuando se registren ventas
3. **Poblar la tabla con datos existentes** de la tabla `ventas`
4. **Configurar políticas de seguridad** (RLS)

## Pasos para Implementar

### 1. Acceder a Supabase
- Ve al [Dashboard de Supabase](https://supabase.com/dashboard)
- Selecciona tu proyecto
- Ve a la sección "SQL Editor"

### 2. Ejecutar el Script
- Copia todo el contenido del archivo `productos_mas_vendidos_setup.sql`
- Pégalo en el SQL Editor de Supabase
- Haz clic en "Run" para ejecutar el script

### 3. Verificar la Implementación
El script incluye comandos de verificación que mostrarán:
- La estructura de la tabla creada
- Los datos insertados (incluyendo el producto T1)
- Las políticas de seguridad configuradas

## Funcionalidades Implementadas

### ✅ Actualización Automática
- **Trigger en tiempo real**: Cuando se registra una nueva venta, automáticamente se actualiza la tabla `productos_mas_vendidos`
- **Suma de cantidades**: Si el producto ya existe, se suma la nueva cantidad vendida
- **Fecha de última venta**: Se actualiza automáticamente con la fecha más reciente

### ✅ Datos Existentes
- **Población automática**: El script incluye una función que procesa todas las ventas existentes
- **Producto T1**: Aparecerá en la tabla con su cantidad total vendida (150)

### ✅ Seguridad
- **Row Level Security (RLS)**: Configurado para permitir operaciones anónimas
- **Políticas de acceso**: Permite lectura, inserción, actualización y eliminación

## Estructura de la Tabla

```sql
productos_mas_vendidos (
    id BIGSERIAL PRIMARY KEY,
    producto TEXT NOT NULL,
    cantidad_vendida DECIMAL(10,2) NOT NULL DEFAULT 0,
    fecha_ultima_venta TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(producto)
)
```

## Resultado Esperado

Después de ejecutar el script:

1. **La tabla `productos_mas_vendidos` estará creada y poblada**
2. **El producto T1 aparecerá con cantidad_vendida = 150**
3. **La sección "Producto Más Vendido" en la aplicación mostrará los datos correctos**
4. **Nuevas ventas actualizarán automáticamente la tabla**

## Verificación

Para verificar que todo funciona correctamente:

1. Ejecuta el script en Supabase
2. Ve a la aplicación y navega a la sección Stock
3. La sección "Producto Más Vendido" debería mostrar el producto T1
4. Registra una nueva venta y verifica que se actualice automáticamente

## Notas Importantes

- **Backup**: Antes de ejecutar el script, asegúrate de tener un backup de tu base de datos
- **Permisos**: El script requiere permisos de administrador en Supabase
- **Dependencias**: La tabla `ventas` debe existir antes de ejecutar este script 