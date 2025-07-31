# Sistema de Registro de Asistencia - Configuración

## Descripción
El sistema de registro de asistencia permite gestionar las entradas y salidas de empleados de manera eficiente, con una interfaz moderna y funcionalidades avanzadas.

## Características Principales

### 📋 Funcionalidades
- **Registro de Entrada/Salida**: Botones intuitivos para registrar entrada o salida
- **Reloj en Tiempo Real**: Muestra la hora actual actualizada cada segundo
- **Estadísticas del Día**: Contador de entradas, salidas y total de registros
- **Filtros Avanzados**: Por fecha y empleado específico
- **Exportación CSV**: Descarga de registros en formato CSV
- **Observaciones**: Campo opcional para agregar notas adicionales
- **Interfaz Responsiva**: Diseño adaptativo para diferentes dispositivos

### 🎨 Diseño
- **Colorimetría Consistente**: Mantiene la misma paleta de colores del sistema
- **Efecto Glassmorphism**: Contenedores con efecto de vidrio esmerilado
- **Animaciones Suaves**: Transiciones y efectos hover modernos
- **Tipografía Inter**: Fuente consistente con el resto de la aplicación

## Configuración de Base de Datos

### 1. Ejecutar Script SQL
1. Abrir el **Supabase Dashboard**
2. Ir a **SQL Editor**
3. Copiar y pegar el contenido de `asistencia_table_setup.sql`
4. Ejecutar el script

### 2. Tablas Creadas

#### Tabla `empleados`
- `id`: Identificador único (UUID)
- `nombre`: Nombre del empleado
- `apellido`: Apellido del empleado
- `cargo`: Puesto o cargo
- `email`: Correo electrónico (opcional)
- `telefono`: Número de teléfono (opcional)
- `fecha_contratacion`: Fecha de contratación
- `activo`: Estado activo/inactivo
- `created_at`: Fecha de creación
- `updated_at`: Fecha de última actualización

#### Tabla `asistencias`
- `id`: Identificador único (UUID)
- `empleado_id`: Referencia al empleado
- `fecha`: Fecha del registro
- `hora`: Hora del registro
- `tipo`: Tipo de registro ('entrada' o 'salida')
- `observaciones`: Notas adicionales (opcional)
- `created_at`: Fecha de creación

### 3. Datos de Ejemplo
El script incluye 5 empleados de ejemplo:
- Juan Pérez - Vendedor
- María García - Cajero
- Carlos López - Supervisor
- Ana Martínez - Vendedor
- Luis Rodríguez - Cajero

## Uso del Sistema

### Registro de Asistencia
1. **Seleccionar Empleado**: Elegir de la lista desplegable
2. **Tipo de Registro**: Hacer clic en "Entrada" o "Salida"
3. **Observaciones** (opcional): Agregar notas si es necesario
4. **Registrar**: Hacer clic en el botón de registro

### Consulta de Registros
1. **Filtros**: Usar fecha y/o empleado específico
2. **Vista**: Los registros se muestran en orden cronológico
3. **Exportar**: Descargar datos en formato CSV

### Estadísticas
- **Entradas del día**: Contador de registros de entrada
- **Salidas del día**: Contador de registros de salida
- **Total**: Suma de todos los registros del día

## Navegación
- **Botón "Volver al Inicio"**: Regresa al dashboard principal
- **Menú de Navegación**: Acceso directo desde la barra superior

## Personalización

### Agregar Empleados
Para agregar nuevos empleados, insertar directamente en la tabla `empleados`:

```sql
INSERT INTO empleados (nombre, apellido, cargo, email, telefono) 
VALUES ('Nuevo', 'Empleado', 'Cargo', 'email@empresa.com', '+1234567890');
```

### Modificar Estilos
Los estilos están basados en Tailwind CSS y siguen el patrón de diseño del sistema:
- Colores principales: Verde (#1a3d1a, #0a1e0a)
- Efectos: Glassmorphism con `backdrop-blur-md`
- Bordes: `border-white/20` para transparencia

## Solución de Problemas

### Error de Conexión
- Verificar configuración de Supabase en `supabaseClient.js`
- Comprobar políticas RLS (Row Level Security)

### Registros No Aparecen
- Verificar que las tablas se crearon correctamente
- Comprobar que hay empleados activos en la tabla

### Problemas de Rendimiento
- Los índices están configurados para optimizar consultas
- La paginación está implementada para grandes volúmenes de datos

## Mantenimiento

### Backup de Datos
- Exportar regularmente los datos usando la función CSV
- Mantener copias de seguridad de la base de datos

### Actualizaciones
- Revisar periódicamente las políticas de seguridad
- Actualizar empleados inactivos según sea necesario

## Soporte
Para problemas técnicos o mejoras, revisar:
1. Logs de la consola del navegador
2. Logs de Supabase
3. Documentación de React y Tailwind CSS 