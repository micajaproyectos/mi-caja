# 📦 Sistema de Stock de Insumos - Implementación Completa

## ✅ Cambios Realizados

### **1. Base de Datos (Backend)**

#### **Vista SQL: `vista_stock_insumos`**
Calcula automáticamente el stock de ingredientes basado en:

| Columna | Cálculo | Descripción |
|---------|---------|-------------|
| `nombre_insumo` | Único de recetas | Nombre del ingrediente (LECHE, HUEVOS, etc.) |
| `unidad` | De recetas | Unidad de medida (Lt, kg, unidad, etc.) |
| `stock_comprado` | `SUM(compras_insumos.cantidad)` | **Total acumulativo de todas las compras** |
| `stock_consumido` | Vía triggers en pedidos | **Total consumido según ventas** |
| `stock_disponible` | `stock_comprado - stock_consumido` | **Stock real disponible** |

**Archivo SQL:** `setup_stock_insumos_completo.sql`

---

### **2. Frontend (Insumos.jsx)**

#### **Tabla "Stock de Ingredientes"**
```
┌─────────────┬────────┬────────────────┬──────────────────┬──────────────────┐
│ Ingrediente │ Unidad │ Stock Comprado │ Stock Consumido  │ Stock Disponible │
├─────────────┼────────┼────────────────┼──────────────────┼──────────────────┤
│ LECHE       │ Lt     │ 80.00          │ 35.00            │ 45.00            │
│ HUEVOS      │ unidad │ 200.00         │ 150.00           │ 50.00            │
└─────────────┴────────┴────────────────┴──────────────────┴──────────────────┘
```

#### **Texto instructivo en formulario de compras**
Se agregó un mensaje informativo:
> 💡 **Importante:** En tu primera compra de cada ingrediente, ingresa el **stock total físico** que tienes actualmente (lo que ya tenías + lo que acabas de comprar).

#### **Estadísticas actualizadas**
- Total Ingredientes
- Con Consumo Activo
- Stock Bajo/Crítico (≤ 10 unidades)

---

## 🚀 Pasos de Implementación

### **Paso 1: Ejecutar SQL en Supabase**

1. Abre el **SQL Editor** en Supabase
2. Ejecuta el archivo: `setup_stock_insumos_completo.sql`
3. Verifica el resultado final mostrando algunos registros

**Resultado esperado:**
```
Ingrediente | Unidad | Stock Comprado | Stock Consumido | Stock Disponible
------------|--------|----------------|-----------------|------------------
LECHE       | Lt     | 50.00          | 15.00           | 35.00
```

---

### **Paso 2: Verificar Frontend**

1. Recarga la aplicación
2. Ve a la sección **"Insumos"**
3. Verifica que aparezca:
   - Si NO hay compras → Mensaje: "No hay stock de ingredientes registrado"
   - Si HAY compras → Tabla con las columnas correctas

---

## 📊 Flujo de Uso Completo

### **1. Usuario crea una receta**
```
Producto: HELADO
Ingredientes:
  - LECHE: 1 Lt por 5 unidades
  - AZUCAR: 0.5 kg por 5 unidades
```

### **2. Usuario registra PRIMERA compra**
```
Formulario "Ingresar Compra":
  Ingrediente: LECHE
  Cantidad: 50 Lt  ← Stock total físico actual
```

**Resultado en tabla:**
```
LECHE | Lt | 50.00 | 0.00 | 50.00
```

### **3. Usuario vende productos**
```
En Pedidos.jsx:
  - Vende 5 HELADO
  
Trigger automático:
  - Descuenta 1 Lt LECHE
```

**Resultado en tabla:**
```
LECHE | Lt | 50.00 | 1.00 | 49.00
```

### **4. Usuario registra SEGUNDA compra**
```
Formulario "Ingresar Compra":
  Ingrediente: LECHE
  Cantidad: 30 Lt  ← Nueva compra
```

**Resultado en tabla:**
```
LECHE | Lt | 80.00 | 1.00 | 79.00
```

---

## 🔧 Lógica del Sistema

### **Triggers activos:**
1. ✅ `trigger_descontar_ingredientes_pedidos` → Descuenta al vender en Pedidos
2. ✅ `trigger_descontar_ingredientes_ventas` → Descuenta al vender en Ventas
3. ✅ `trigger_devolver_ingredientes_pedidos` → Reintegra al eliminar pedidos

### **Cálculo automático:**
```sql
Stock Comprado = SUM(todas las compras en compras_insumos)
Stock Consumido = SUM(consumos vía triggers desde primera compra)
Stock Disponible = Stock Comprado - Stock Consumido
```

---

## ⚠️ Notas Importantes

### **Primera compra = Stock total físico**
El usuario debe ingresar en la **primera compra** el stock real que tiene actualmente (incluyendo lo que tenía antes + lo nuevo).

**Ejemplo:**
- Tenía 30 Lt de LECHE
- Compró 20 Lt nuevos
- **Debe ingresar: 50 Lt** en la primera compra

### **Sistema acumulativo**
- El sistema **SUMA todas las compras históricas**
- El sistema **DESCUENTA todos los consumos desde la primera compra**
- La diferencia es el **stock real disponible**

### **Stock negativo = Alerta**
Si Stock Disponible < 0:
- Significa que vendió más de lo que compró
- **Acción requerida:** Registrar compras pasadas o ajustar stock

---

## 🎯 Próximos Pasos (Pendientes)

1. ⏳ **Sistema de alertas visuales** (cuando Stock Disponible ≤ umbral)
2. ⏳ **Umbral mínimo configurable** por ingrediente
3. ⏳ **Notificaciones push** cuando stock sea crítico
4. ⏳ **Reportes de consumo** por período

---

## ✅ Checklist de Verificación

- [ ] Vista `vista_stock_insumos` creada en Supabase
- [ ] Frontend carga datos desde la nueva vista
- [ ] Tabla muestra: Ingrediente, Unidad, Stock Comprado, Consumido, Disponible
- [ ] Texto instructivo visible en formulario de compras
- [ ] Estadísticas actualizadas correctamente
- [ ] Prueba: Crear receta → Ingresar compra → Vender producto → Verificar descuento

---

**Fecha:** 2026-01-17  
**Versión:** 1.0  
**Estado:** ✅ Base backend implementada
