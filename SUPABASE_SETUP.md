# 🔧 Configuración de Supabase - Tabla Ventas

## 📋 Pasos para revisar y configurar la estructura de la tabla

### 1. **Acceder al Dashboard de Supabase**

1. Ve a [https://supabase.com](https://supabase.com)
2. Inicia sesión con tu cuenta
3. Selecciona tu proyecto: `pvgahmommdbfzphyywut`

### 2. **Verificar si la tabla 'ventas' existe**

1. En el dashboard, ve a **Table Editor** (en el menú lateral)
2. Busca si existe una tabla llamada `ventas`
3. Si no existe, continúa con el paso 3

### 3. **Crear la tabla 'ventas' (si no existe)**

1. Ve a **SQL Editor** en el menú lateral
2. Crea un nuevo query
3. Copia y pega el contenido del archivo `supabase_table_setup.sql`
4. Ejecuta el script completo

### 4. **Verificar la estructura de la tabla**

#### Opción A: Desde el Table Editor
1. Ve a **Table Editor** → **ventas**
2. Haz clic en **Schema** para ver la estructura
3. Verifica que tengas estas columnas:

| Columna | Tipo | Nullable | Default |
|---------|------|----------|---------|
| id | bigint | NO | nextval('ventas_id_seq'::regclass) |
| fecha | date | NO | |
| tipo_pago | text | NO | |
| producto | text | NO | |
| cantidad | numeric(10,2) | NO | |
| unidad | text | NO | |
| precio_unitario | numeric(10,2) | NO | |
| total_venta | numeric(10,2) | NO | |
| created_at | timestamptz | YES | now() |
| updated_at | timestamptz | YES | now() |

#### Opción B: Desde SQL Editor
Ejecuta esta consulta:

```sql
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'ventas' 
AND table_schema = 'public'
ORDER BY ordinal_position;
```

### 5. **Verificar las políticas RLS (Row Level Security)**

1. Ve a **Authentication** → **Policies**
2. Busca la tabla `ventas`
3. Verifica que tengas estas políticas:

- **Permitir lectura anónima de ventas** (SELECT)
- **Permitir inserción anónima de ventas** (INSERT)
- **Permitir actualización anónima de ventas** (UPDATE)
- **Permitir eliminación anónima de ventas** (DELETE)

#### O ejecuta esta consulta SQL:

```sql
SELECT 
    policyname,
    cmd,
    permissive
FROM pg_policies 
WHERE tablename = 'ventas';
```

### 6. **Probar la conexión desde la aplicación**

1. Abre tu aplicación React
2. Ve a la página de **Registro de Venta**
3. Haz clic en el botón **🔍 Verificar Estructura**
4. Revisa la consola del navegador para ver los logs

### 7. **Solución de problemas comunes**

#### ❌ Error: "relation 'ventas' does not exist"
- **Solución**: Ejecuta el script SQL para crear la tabla

#### ❌ Error: "new row violates row-level security policy"
- **Solución**: Verifica que las políticas RLS estén configuradas correctamente

#### ❌ Error: "column 'fecha' is of type date but expression is of type text"
- **Solución**: Asegúrate de que el campo fecha se envíe en formato YYYY-MM-DD

#### ❌ Error: "column 'cantidad' is of type numeric but expression is of type text"
- **Solución**: El código ya está corregido para convertir strings a números

### 8. **Verificar datos de prueba**

Si ejecutaste el script completo, deberías ver 3 registros de prueba:

```sql
SELECT * FROM ventas ORDER BY created_at DESC;
```

### 9. **Estructura esperada vs actual**

#### ✅ Estructura que espera tu código:
```javascript
{
  fecha: '2024-01-15',           // string (formato YYYY-MM-DD)
  tipo_pago: 'efectivo',         // string
  producto: 'Manzana Roja',      // string
  cantidad: 2.5,                 // number
  unidad: 'Kg',                  // string
  precio_unitario: 1250.00,      // number
  total_venta: 3125.00           // number
}
```

#### ✅ Estructura de la tabla en Supabase:
```sql
CREATE TABLE ventas (
    id BIGSERIAL PRIMARY KEY,
    fecha DATE NOT NULL,
    tipo_pago TEXT NOT NULL,
    producto TEXT NOT NULL,
    cantidad DECIMAL(10,2) NOT NULL,
    unidad TEXT NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    total_venta DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 10. **Comandos útiles para debugging**

```sql
-- Ver todos los registros
SELECT * FROM ventas;

-- Ver estructura de la tabla
\d ventas

-- Ver políticas RLS
SELECT * FROM pg_policies WHERE tablename = 'ventas';

-- Ver índices
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'ventas';

-- Limpiar tabla (cuidado!)
-- DELETE FROM ventas;
```

## 🎯 Próximos pasos

1. Ejecuta el script SQL en Supabase
2. Verifica la estructura de la tabla
3. Prueba la aplicación con el botón "Verificar Estructura"
4. Intenta registrar una venta real
5. Si hay errores, revisa los logs en la consola del navegador