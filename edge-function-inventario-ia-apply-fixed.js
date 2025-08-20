// Tipos del runtime (solo para autocompletado)
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ===== FUNCIÓN toNumberStrict IMPLEMENTADA =====
function toNumberStrict(value) {
  if (value === null || value === undefined || value === '') {
    return NaN;
  }
  
  // Convertir a string y limpiar
  let str = String(value).trim();
  
  // Si está vacío, retornar NaN
  if (str === '') {
    return NaN;
  }
  
  // Reemplazar separador de miles chileno (.) por nada
  str = str.replace(/\./g, '');
  
  // Reemplazar coma decimal (,) por punto (.)
  str = str.replace(/,/g, '.');
  
  // Convertir a número
  const num = parseFloat(str);
  
  // Verificar que sea un número finito
  if (!Number.isFinite(num)) {
    return NaN;
  }
  
  return num;
}

// ===== CORS =====
const allowedOrigins = [
  "https://mi-caja.vercel.app",
  "https://www.appmicaja.cl",
  "http://localhost:5173",
  "http://localhost:5177"
];

function makeCorsHeaders(origin) {
  const base = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin"
  };
  if (allowedOrigins.includes(origin)) {
    base["Access-Control-Allow-Origin"] = origin;
  }
  return base;
}

// ===== SUPABASE =====
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const UNIDADES = new Set([
  "unidad",
  "kg",
  "gr"
]);

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") ?? "";
  const cors = makeCorsHeaders(origin);
  
  // Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: cors
    });
  }
  
  if (req.method !== "POST") {
    return new Response(JSON.stringify({
      error: "Método no permitido"
    }), {
      status: 405,
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
  }
  
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) {
      return new Response(JSON.stringify({
        error: "Sin token Authorization"
      }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          ...cors
        }
      });
    }
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: auth
        }
      }
    });
    
    // Usuario actual
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({
        error: "Auth inválida"
      }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          ...cors
        }
      });
    }
    
    const userId = userData.user.id;
    
    // cliente_id desde public.usuarios
    const { data: urow, error: uerr } = await supabase.from("usuarios").select("cliente_id").eq("usuario_id", userId).single();
    if (uerr || !urow?.cliente_id) {
      return new Response(JSON.stringify({
        error: "No se encontró cliente_id del usuario"
      }), {
        status: 403,
        headers: {
          "Content-Type": "application/json",
          ...cors
        }
      });
    }
    
    const clienteId = urow.cliente_id;
    
    // Body
    const body = await req.json();
    if (!body?.fechaIngreso || !Array.isArray(body.items) || body.items.length === 0) {
      return new Response(JSON.stringify({
        error: "Payload inválido"
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...cors
        }
      });
    }
    
    const errores = [];
    const filasInsert = [];
    
    for (let i = 0; i < body.items.length; i++) {
      const fila = body.items[i];
      const unidad = String(fila.unidad ?? "").toLowerCase().trim();
      
      if (!UNIDADES.has(unidad)) {
        errores.push({
          index: i,
          reason: `Unidad inválida: ${fila.unidad}`
        });
        continue;
      }
      
      if (!fila.producto || typeof fila.producto !== "string") {
        errores.push({
          index: i,
          reason: "Producto vacío"
        });
        continue;
      }
      
      // Parseos básicos (sin cálculos)
      const cantidad = toNumberStrict(fila.cantidad);
      const costo = toNumberStrict(fila.costo_total);
      const precioUnitario = toNumberStrict(fila.precio_unitario);
      const precioVenta = toNumberStrict(fila.precio_venta);
      
      if (![
        cantidad,
        costo,
        precioUnitario,
        precioVenta
      ].every(Number.isFinite)) {
        errores.push({
          index: i,
          reason: "Valores numéricos inválidos (revisa separadores . ,)"
        });
        continue;
      }
      
      if (!(cantidad > 0)) {
        errores.push({
          index: i,
          reason: "Cantidad debe ser > 0"
        });
        continue;
      }
      
      if (!(costo >= 0)) {
        errores.push({
          index: i,
          reason: "Costo total debe ser >= 0"
        });
        continue;
      }
      
      if (!(precioUnitario >= 0)) {
        errores.push({
          index: i,
          reason: "precio_unitario faltante o inválido"
        });
        continue;
      }
      
      if (!(precioVenta >= 0)) {
        errores.push({
          index: i,
          reason: "precio_venta faltante o inválido"
        });
        continue;
      }
      
      filasInsert.push({
        fecha_ingreso: body.fechaIngreso,
        producto: String(fila.producto).trim(),
        cantidad,
        unidad,
        costo_total: costo,
        precio_unitario: precioUnitario,
        precio_venta: precioVenta,
        usuario_id: userId,
        cliente_id: clienteId
      });
    }
    
    if (filasInsert.length === 0) {
      return new Response(JSON.stringify({
        error: "No hay filas válidas",
        detalles: errores
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...cors
        }
      });
    }
    
    // Inserción (RLS aplica con el JWT del usuario)
    const { data, error } = await supabase.from("inventario").insert(filasInsert).select();
    if (error) {
      return new Response(JSON.stringify({
        error: error.message,
        detalles: errores
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...cors
        }
      });
    }
    
    return new Response(JSON.stringify({
      applied: data?.length ?? 0,
      errors: errores,
      rows: data
    }), {
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
    
  } catch (e) {
    return new Response(JSON.stringify({
      error: "Excepción",
      detalle: String(e)
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
  }
});
