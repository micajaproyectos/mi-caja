# 📱 Configuración de QR de Instagram - Mi Caja

## 🎯 Funcionalidad

Esta funcionalidad permite a los usuarios generar un código QR con su link de Instagram para compartir con sus clientes. El QR se puede descargar e imprimir para colocarlo en el negocio.

## ✅ Configuración Completada

La columna `link_instagram` ya ha sido creada en la tabla `usuarios` de Supabase con las siguientes características:
- **Nombre**: `link_instagram`
- **Tipo**: `text`
- **Nullable**: `YES` (puede estar vacío)

La funcionalidad está lista para usar. No se requieren pasos adicionales de configuración.

## 🎨 Cómo Usar la Funcionalidad

### Desde la Aplicación

1. **Acceder al Perfil**
   - Haz clic en el menú de hamburguesa (≡) en la esquina superior derecha
   - Selecciona "Perfil"

2. **Agregar Link de Instagram**
   - En la sección "QR de Instagram", ingresa tu link de Instagram
   - Ejemplo: `https://instagram.com/tu_usuario`
   - Haz clic en "💾 Guardar y Generar QR"

3. **Descargar el QR**
   - Una vez generado, verás el código QR en pantalla
   - Haz clic en "📥 Descargar QR" para guardar la imagen
   - El archivo se guardará como `instagram-qr.png`

4. **Compartir el QR**
   - Imprime el código QR
   - Colócalo en un lugar visible de tu negocio
   - Tus clientes podrán escanearlo con su celular para seguirte en Instagram

## ✨ Características

- ✅ Genera código QR de alta calidad (300x300px)
- ✅ Se guarda en la base de datos (no se pierde al cerrar sesión)
- ✅ Se puede actualizar en cualquier momento
- ✅ Descarga directa como imagen PNG
- ✅ Compatible con cualquier lector de códigos QR

## 🔧 Tecnologías Utilizadas

- **qrcode**: Librería para generar códigos QR
- **Supabase**: Base de datos para almacenar el link de Instagram
- **React**: Para la interfaz de usuario

## 📝 Notas

- Solo se puede guardar **un link de Instagram** por usuario
- El link se puede actualizar cuantas veces sea necesario
- El código QR se genera automáticamente al guardar el link
- La imagen descargada tiene un tamaño óptimo para impresión

## 🐛 Solución de Problemas

### El QR no se genera
- Verifica que el link de Instagram sea válido
- Revisa la consola del navegador para ver errores
- Asegúrate de que el link incluya `https://`

### No puedo guardar el link
- Verifica que estés autenticado
- Asegúrate de que la tabla `usuarios` existe en Supabase
- Verifica que la columna `link_instagram` existe en la tabla

### El QR no funciona al escanearlo
- Verifica que el link de Instagram sea correcto
- Asegúrate de que el link incluya `https://`
- Prueba escaneando el QR con diferentes aplicaciones de cámara

## 📧 Soporte

Si tienes problemas con esta funcionalidad, verifica:
1. Que la columna `link_instagram` existe en la tabla `usuarios` de Supabase
2. Que estás usando un link de Instagram válido
3. Que tu navegador permite descargas automáticas

