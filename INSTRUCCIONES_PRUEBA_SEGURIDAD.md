# 🔒 Instrucciones de Prueba - Separación de Datos por Usuario

## ✅ Mejoras Implementadas

### 1. **Session Manager Avanzado**
- ✅ Listener automático para cambios de sesión
- ✅ Limpieza automática de datos al cambiar de usuario
- ✅ Claves únicas por usuario en localStorage (formato: `clave:usuario_id`)
- ✅ Invalidación de cache tras login exitoso

### 2. **Filtrado por Usuario en Todas las Consultas**
- ✅ **Ventas**: Todas las consultas filtran por `usuario_id`
- ✅ **Inventario**: Todas las consultas filtran por `usuario_id`
- ✅ **Asistencia**: Todas las consultas filtran por `usuario_id`
- ✅ **Gastos**: Todas las consultas filtran por `usuario_id`
- ✅ **Proveedores**: Todas las consultas filtran por `usuario_id`

### 3. **Operaciones Seguras**
- ✅ **Insertar**: Todas incluyen `usuario_id` automáticamente
- ✅ **Actualizar**: Solo registros del usuario actual
- ✅ **Eliminar**: Solo registros del usuario actual

### 4. **Gestión de Sesión Reactiva**
- ✅ Componentes se recargan automáticamente tras login
- ✅ Datos se limpian automáticamente tras logout
- ✅ Prevención de datos residuales entre sesiones

---

## 🧪 Plan de Pruebas

### **PASO 1: Preparación**
1. Asegurar que tienes al menos 2 usuarios diferentes en la base de datos
2. Tener datos de prueba (ventas, inventario, etc.) para cada usuario
3. Abrir las herramientas de desarrollador del navegador (F12)

### **PASO 2: Prueba de Separación de Datos**

#### **Test A: Datos Iniciales**
1. **Iniciar sesión con Usuario A**
   ```
   - Ir a login
   - Ingresar credenciales del Usuario A
   - Verificar que aparece el nombre correcto en el menú
   ```

2. **Registrar datos como Usuario A**
   ```
   - Agregar 2-3 ventas
   - Agregar 2-3 productos al inventario
   - Registrar asistencia
   - Anotar cuántos registros ves en cada sección
   ```

3. **Verificar en consola**
   ```
   - Abrir F12 -> Console
   - Buscar mensajes como: "📊 Cargadas X ventas para usuario [ID]"
   - Verificar que el ID corresponde al Usuario A
   ```

#### **Test B: Cambio de Usuario**
1. **Cerrar sesión**
   ```
   - Hacer clic en "Cerrar sesión"
   - Verificar en consola: "🧹 Limpieza completa: X elementos eliminados"
   - Verificar que regresa a la página de login
   ```

2. **Iniciar sesión con Usuario B**
   ```
   - Ingresar credenciales del Usuario B
   - Verificar que aparece el nombre correcto en el menú
   - Verificar en consola: "✅ Login exitoso, marcando datos para recargar"
   ```

3. **Verificar datos del Usuario B**
   ```
   - Ir a Ventas: NO debe ver las ventas del Usuario A
   - Ir a Inventario: NO debe ver productos del Usuario A
   - Ir a Asistencia: NO debe ver registros del Usuario A
   - Solo debe ver sus propios datos (si los tiene)
   ```

#### **Test C: Agregar Datos como Usuario B**
1. **Registrar datos nuevos**
   ```
   - Agregar 1-2 ventas diferentes
   - Agregar 1-2 productos diferentes al inventario
   - Verificar que solo aparecen estos nuevos datos
   ```

#### **Test D: Volver al Usuario A**
1. **Cerrar sesión y volver al Usuario A**
   ```
   - Cerrar sesión del Usuario B
   - Iniciar sesión con Usuario A
   ```

2. **Verificar datos del Usuario A**
   ```
   - Verificar que aparecen SOLO los datos del Usuario A
   - NO deben aparecer los datos agregados por Usuario B
   - Los datos originales del Usuario A deben seguir ahí
   ```

### **PASO 3: Pruebas de Seguridad Específicas**

#### **Test E: Intentos de Manipulación**
1. **Prueba de localStorage**
   ```
   - Con Usuario B logueado, abrir F12 -> Application -> Local Storage
   - Buscar claves con formato "clave:usuario_id"
   - Verificar que NO hay claves del Usuario A
   ```

2. **Prueba de eliminación de datos**
   ```
   - Como Usuario B, intentar eliminar registros
   - Verificar que solo se pueden eliminar registros propios
   - Cambiar a Usuario A y verificar que sus datos siguen intactos
   ```

#### **Test F: Validación de Filtros en Base de Datos**
1. **Verificar logs de consola**
   ```
   - Al cargar datos, buscar mensajes como:
   - "📊 Cargadas X ventas para usuario [ID]"
   - "📋 Asistencias cargadas para usuario [ID]"
   - "✅ Inventario cargado para usuario [ID]"
   ```

2. **Verificar que el ID es consistente**
   ```
   - El usuario_id en los logs debe ser el mismo siempre para un usuario
   - Al cambiar de usuario, el ID debe cambiar
   ```

---

## 🚨 Señales de Problemas

### **❌ FALLOS CRÍTICOS** (deben reportarse inmediatamente):
- Ver datos de otro usuario
- Poder eliminar/modificar datos de otro usuario
- Datos persistiendo después de cerrar sesión
- Usuario_id incorrecto en los logs

### **⚠️ ADVERTENCIAS** (revisar pero no críticos):
- Tiempos de carga más lentos (esperado por seguridad adicional)
- Mensajes de "No hay datos" al cambiar usuarios (normal)

---

## 🛠️ Comandos de Desarrollo Útiles

### **Verificar Estado de Sesión**
```javascript
// En la consola del navegador
console.log('Usuario actual:', localStorage.getItem('usuario_id'));
console.log('Datos en localStorage:', Object.keys(localStorage));
```

### **Limpiar Todo (solo para desarrollo)**
```javascript
// En la consola del navegador - ¡CUIDADO! Borra todo
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### **Ver Logs Filtrados**
```javascript
// En la consola del navegador
console.clear();
// Luego recargar la página y buscar mensajes con emojis como 📊 🔒 ✅
```

---

## 📋 Checklist de Validación

- [ ] Usuario A no ve datos de Usuario B
- [ ] Usuario B no ve datos de Usuario A
- [ ] Logout limpia todos los datos locales
- [ ] Login recarga datos del usuario correcto
- [ ] No se pueden eliminar datos de otros usuarios
- [ ] No se pueden modificar datos de otros usuarios
- [ ] LocalStorage usa claves únicas por usuario
- [ ] Logs muestran usuario_id correcto en todas las operaciones
- [ ] Cambio rápido entre usuarios funciona correctamente
- [ ] Datos persisten correctamente para cada usuario

---

## 🎯 Resultados Esperados

Al completar todas las pruebas exitosamente:

1. **Separación Total**: Cada usuario ve únicamente sus propios datos
2. **Seguridad**: Imposible acceder o modificar datos de otros usuarios
3. **Limpieza**: No hay datos residuales entre sesiones
4. **Reactividad**: Los componentes se actualizan automáticamente
5. **Consistencia**: El comportamiento es predecible y confiable

---

## 📞 Soporte

Si encuentras algún problema durante las pruebas:

1. **Captura de pantalla** de la consola con errores
2. **Pasos exactos** para reproducir el problema
3. **Usuarios utilizados** en la prueba
4. **Datos esperados** vs **datos obtenidos**

Las mejoras implementadas garantizan la separación completa de datos entre usuarios y previenen cualquier mezcla de información personal o empresarial.
