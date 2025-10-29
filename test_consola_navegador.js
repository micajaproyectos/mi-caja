// =====================================================
// TEST DESDE LA CONSOLA DEL NAVEGADOR
// =====================================================
// Copia y pega este código en la consola del navegador (F12)
// en el DISPOSITIVO donde NO aparecen los productos

// Test 1: Verificar sesión de Supabase Auth
console.log('🔍 Test 1: Verificando sesión de Supabase Auth...');
const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
console.log('Sesión actual:', sessionData);
console.log('Error de sesión:', sessionError);
console.log('Usuario autenticado:', sessionData?.session?.user?.id);

// Test 2: Verificar que puedes consultar usuarios
console.log('\n🔍 Test 2: Intentando consultar tabla usuarios...');
const userId = sessionData?.session?.user?.id;
if (userId) {
    const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('usuario_id, nombre, email, rol, cliente_id')
        .eq('usuario_id', userId)
        .single();
    
    console.log('Datos del usuario:', userData);
    console.log('Error al consultar usuario:', userError);
} else {
    console.log('❌ No hay sesión activa');
}

// Test 3: Verificar productos temporales
console.log('\n🔍 Test 3: Consultando productos_mesas_temp...');
if (userId) {
    const { data: productos, error: productosError } = await supabase
        .from('productos_mesas_temp')
        .select('*')
        .eq('usuario_id', userId);
    
    console.log('Productos temporales:', productos);
    console.log('Total de productos:', productos?.length || 0);
    console.log('Error:', productosError);
} else {
    console.log('❌ No hay sesión activa');
}

console.log('\n✅ Tests completados. Comparte los resultados.');

