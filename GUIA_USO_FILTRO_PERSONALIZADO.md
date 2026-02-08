# 🎯 Guía de Uso: Filtro Personalizado de Rango de Fecha/Hora

## 📌 Ubicación

**Módulo:** Pedidos  
**Sección:** Pedidos Registrados → Filtros (parte inferior)

---

## 🚀 Caso de Uso Principal: Jornada Nocturna

### **Problema:**
Tu negocio abre a las 19:00 y cierra a la 01:00 del día siguiente.  
Al hacer el cierre de caja del "7 de febrero", faltan los pedidos de 00:00 a 01:00 que están registrados como del "8 de febrero".

### **Solución:**

1. **Ir al módulo Pedidos**
2. **Desplazarse hasta "Pedidos Registrados"**
3. **Buscar la sección "Filtro Personalizado"** (debajo de los filtros estándar)
4. **Llenar los campos:**
   ```
   Desde: 07/02/2026  19:00
   Hasta: 08/02/2026  01:00
   ```
5. **Resultado:**
   - La tabla mostrará TODOS los pedidos entre esas fechas/horas
   - Las estadísticas sumarán correctamente (Total, Efectivo, Débito, etc.)
   - El título mostrará: "Resumen de Pedidos - 07/02/2026 19:00 hasta 08/02/2026 01:00"

---

## 📋 Ejemplos de Uso

### **Ejemplo 1: Turno Completo Nocturno**
```
Desde: 07/02/2026  19:00
Hasta: 08/02/2026  03:00

Uso: Para negocios que cierran de madrugada
```

### **Ejemplo 2: Turno Matutino**
```
Desde: 07/02/2026  08:00
Hasta: 07/02/2026  14:00

Uso: Para ver solo las ventas de la mañana
```

### **Ejemplo 3: Fin de Semana Completo**
```
Desde: 07/02/2026  00:00
Hasta: 09/02/2026  23:59

Uso: Para reportes de varios días
```

### **Ejemplo 4: Evento Especial**
```
Desde: 14/02/2026  20:00
Hasta: 15/02/2026  02:00

Uso: Para eventos como San Valentín que terminan tarde
```

---

## 🎨 Interfaz Visual

```
┌────────────────────────────────────────────────────────┐
│ 🕐 Filtro Personalizado (Rango de Fecha y Hora)       │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Desde (Fecha y Hora)    Hasta (Fecha y Hora)        │
│  ┌──────────────────┐    ┌──────────────────┐        │
│  │ 07/02/2026 19:00 │    │ 08/02/2026 01:00 │        │
│  └──────────────────┘    └──────────────────┘        │
│                                                        │
│  ✓ Mostrando pedidos desde 07/02/2026, 19:00         │
│    hasta 08/02/2026, 01:00                            │
└────────────────────────────────────────────────────────┘
```

---

## ⚙️ Comportamiento de Filtros

### **Exclusión Automática:**
- ✅ Si usas el **filtro personalizado**, los filtros estándar (Fecha, Mes, Año) se limpian automáticamente
- ✅ Si usas un **filtro estándar**, el filtro personalizado se limpia automáticamente

### **Combinación con Tipo de Pago:**
- ✅ El filtro de **Tipo de Pago** funciona en conjunto con el filtro personalizado
- Ejemplo:
  ```
  Filtro Personalizado: 07/02 19:00 hasta 08/02 01:00
  Tipo de Pago: Efectivo
  
  Resultado: Solo pedidos en efectivo en ese rango
  ```

### **Botón Limpiar:**
- El botón **"🧹 Limpiar"** limpia TODOS los filtros incluyendo el personalizado

---

## 📊 Estadísticas Calculadas

Cuando usas el filtro personalizado, verás:

```
┌─────────────────────────────────────────────────────┐
│ Resumen de Pedidos                                  │
│ 07/02/2026 19:00 hasta 08/02/2026 01:00           │
├─────────────────────────────────────────────────────┤
│ Total: $125,500 (23 pedidos)                       │
│ Efectivo: $45,000 (8 pedidos)                      │
│ Débito: $55,500 (10 pedidos)                       │
│ Transferencia: $25,000 (5 pedidos)                 │
│ Propinas: $5,200                                    │
└─────────────────────────────────────────────────────┘
```

---

## 🔔 Notas Importantes

### ✅ **Ventajas:**
1. **Precisión:** Filtra por hora exacta, no solo por día
2. **Flexible:** Funciona para cualquier rango de tiempo
3. **Automático:** La conversión de zona horaria es transparente
4. **Intuitivo:** Los campos son nativos del navegador

### ⚠️ **Consideraciones:**
1. **Ambos campos son necesarios:** Debes llenar tanto "Desde" como "Hasta"
2. **Validación de rango:** "Hasta" debe ser posterior a "Desde"
3. **Zona horaria:** Siempre usa hora de Chile (se convierte automáticamente)

---

## 💡 Tips de Uso

### **Para Cierre de Caja Diario:**
1. Al abrir tu negocio (ej: 19:00), anota la hora
2. Al cerrar (ej: 01:00 del día siguiente), anota la hora
3. Usa esas horas exactas en el filtro personalizado
4. Las estadísticas te darán el total exacto de la jornada

### **Para Reportes Semanales:**
1. Desde: Lunes 00:00
2. Hasta: Domingo 23:59
3. Obtendrás el resumen completo de la semana

### **Para Comparar Turnos:**
1. Turno Mañana: 08:00 - 14:00
2. Turno Tarde: 14:00 - 20:00
3. Turno Noche: 20:00 - 02:00
4. Puedes comparar las ventas de cada turno

---

## ❓ Preguntas Frecuentes

### **¿Por qué necesito este filtro?**
Porque el sistema registra la fecha/hora exacta de cada pedido. Si tu negocio cruza medianoche, los pedidos se dividen en dos días diferentes, haciendo difícil el cierre de caja.

### **¿Afecta el horario de verano?**
No, el sistema maneja automáticamente el horario de verano/invierno de Chile.

### **¿Puedo usarlo para ver pedidos de hace meses?**
Sí, puedes seleccionar cualquier rango de fechas histórico.

### **¿Qué pasa si solo lleno uno de los campos?**
El filtro solo se activa cuando llenas AMBOS campos (Desde y Hasta).

### **¿Puedo exportar estos datos?**
Los datos filtrados se muestran en la tabla y puedes copiarlos manualmente o usar las estadísticas para tu reporte.

---

## 🎉 ¡Listo!

Ahora puedes hacer cierres de caja precisos sin importar a qué hora termines tu jornada laboral.

**¿Necesitas ayuda?** Consulta el archivo `FILTRO_PERSONALIZADO_RANGO_IMPLEMENTADO.md` para detalles técnicos.
