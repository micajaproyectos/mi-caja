# 🏪 Mi Caja - Sistema de Gestión Comercial

## 📋 Descripción

**Mi Caja** es una aplicación web completa para la gestión de negocios comerciales, desarrollada con React y Supabase. Permite el control de ventas, inventario, gastos, proveedores y asistencia de empleados.

## ✨ Funcionalidades Principales

- 🛒 **Gestión de Ventas** - Registro y seguimiento de ventas con filtros por fecha
- 📦 **Control de Inventario** - Gestión de stock, precios y ganancias
- 💰 **Control de Gastos** - Seguimiento de gastos fijos y variables
- 🏢 **Gestión de Proveedores** - Control de pagos y estados
- 👥 **Asistencia de Empleados** - Registro de entradas y salidas
- 📊 **Reportes y Estadísticas** - Exportación CSV y análisis de datos

## 🚀 Tecnologías Utilizadas

- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Supabase (PostgreSQL)
- **Autenticación**: Supabase Auth
- **Despliegue**: Vercel
- **Funciones Edge**: Vercel Edge Functions

## 🔧 Instalación y Configuración

### Prerrequisitos
- Node.js 18+ 
- npm o yarn
- Cuenta en Supabase

### Pasos de Instalación

1. **Clonar el repositorio**
```bash
git clone <url-del-repositorio>
cd mi-caja
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
```bash
# Crear archivo .env.local
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_clave_anonima
```

4. **Configurar base de datos**
- Ejecutar los scripts SQL en Supabase (ver `SUPABASE_SETUP.md`)
- Configurar políticas RLS según sea necesario

5. **Ejecutar en desarrollo**
```bash
npm run dev
```

## 📚 Documentación

### 📋 Changelog Consolidado
Para ver todos los cambios, mejoras y correcciones implementadas, consulta:
**[`CHANGELOG_CONSOLIDADO.md`](./CHANGELOG_CONSOLIDADO.md)**

### 🔧 Configuración de Base de Datos
- [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md) - Configuración principal
- Scripts SQL para cada tabla en la raíz del proyecto

### 📱 Características Técnicas
- **Responsive Design** - Adaptable a móviles y desktop
- **Tiempo Real** - Suscripciones en tiempo real con Supabase
- **Offline** - Almacenamiento local con IndexedDB
- **Seguridad** - Políticas RLS configuradas
- **Performance** - Optimizado para velocidad

## 🎯 Scripts Disponibles

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Construir para producción
npm run preview      # Vista previa de producción
npm run lint         # Verificar código con ESLint
```

## 🌐 Despliegue

La aplicación está configurada para desplegarse en Vercel con:
- Configuración automática de funciones edge
- Optimización de assets
- Configuración de CORS

## 📞 Soporte

Para reportar problemas o solicitar mejoras:
1. Revisar la documentación existente
2. Consultar el changelog consolidado
3. Crear un issue en el repositorio

## 📄 Licencia

Este proyecto es privado y personalizado para micajaproyectos.

---

**🎉 ¡Proyecto completamente funcional y optimizado!**

*Desarrollado con ❤️ usando React y Supabase*

