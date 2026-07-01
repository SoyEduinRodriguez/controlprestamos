document.addEventListener("DOMContentLoaded", () => {
    listarClientes();

    const formCliente = document.getElementById("form-cliente");
    formCliente.addEventListener("submit", registrarCliente);
});

// FUNCIÓN PARA LISTAR CLIENTES Y RENDERIZAR LA TABLA CON ACCIONES
async function listarClientes() {
    const tbody = document.getElementById("tabla-clientes");
    
    const { data: clientes, error } = await supabase
        .from('clientes')
        .select('*')
        .order('id', { ascending: false });

    if (error) {
        console.error("Error al obtener clientes:", error.message);
        tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-red-500">Error al cargar datos.</td></tr>`;
        return;
    }

    if (clientes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-gray-500 italic">No hay clientes registrados aún.</td></tr>`;
        return;
    }

    tbody.innerHTML = "";
    clientes.forEach(cliente => {
        const fecha = new Date(cliente.fecha_registro).toLocaleDateString('es-CO');
        
        const fila = document.createElement("tr");
        fila.className = "hover:bg-gray-50 transition-colors";
        fila.innerHTML = `
            <td class="p-3 font-mono text-gray-500">#${cliente.id}</td>
            <td class="p-3 font-semibold text-gray-800">${cliente.nombre}</td>
            <td class="p-3">
                <a href="https://wa.me/57${cliente.telefono}" target="_blank" class="text-green-600 hover:text-green-700 font-medium">
                    <i class="fa-brands fa-whatsapp mr-1"></i>${cliente.telefono}
                </a>
            </td>
            <td class="p-3 text-gray-500">${fecha}</td>
            <td class="p-3 text-center">
                <button onclick="eliminarCliente(${cliente.id})" class="text-red-500 hover:text-red-700 p-1 transition-colors" title="Eliminar Cliente">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </td>
        `;
        tbody.appendChild(fila);
    });
}

// FUNCIÓN PARA CREAR CLIENTE
async function registrarCliente(e) {
    e.preventDefault();

    const nombreInput = document.getElementById("nombre").value.trim();
    const telefonoInput = document.getElementById("telefono").value.trim();

    const { error } = await supabase
        .from('clientes')
        .insert([{ nombre: nombreInput, telefono: telefonoInput }]);

    if (error) {
        alert("Hubo un error al registrar el cliente: " + error.message);
    } else {
        alert("¡Cliente registrado con éxito!");
        document.getElementById("form-cliente").reset();
        listarClientes();
    }
}

// FUNCIÓN PARA BORRAR CLIENTE
async function eliminarCliente(id) {
    const confirmar = confirm("¿Estás seguro de que deseas eliminar este cliente? Esto borrará de forma permanente sus préstamos e historiales asociados.");
    if (!confirmar) return;

    const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', id);

    if (error) {
        alert("No se pudo eliminar el
