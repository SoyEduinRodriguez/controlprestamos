// Esperar a que el HTML cargue por completo
document.addEventListener("DOMContentLoaded", () => {
    listarClientes();

    const formCliente = document.getElementById("form-cliente");
    formCliente.addEventListener("submit", registrarCliente);
});

// FUNCIÓN PARA LISTAR CLIENTES (SELECT)
async function listarClientes() {
    const tbody = document.getElementById("tabla-clientes");
    
    // Consultar a Supabase ordenando por ID descendente (últimos registrados primero)
    const { data: clientes, error } = await supabase
        .from('clientes')
        .select('*')
        .order('id', { ascending: false });

    if (error) {
        console.error("Error al obtener clientes:", error.message);
        tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-red-500">Error al cargar datos.</td></tr>`;
        return;
    }

    if (clientes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-gray-500 italic">No hay clientes registrados aún.</td></tr>`;
        return;
    }

    // Limpiar tabla e insertar filas
    tbody.innerHTML = "";
    clientes.forEach(cliente => {
        // Formatear la fecha para que sea legible
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
        `;
        tbody.appendChild(fila);
    });
}

// FUNCIÓN PARA CREAR CLIENTE (INSERT)
async function registrarCliente(e) {
    e.preventDefault(); // Evitar que la página se recargue

    const nombreInput = document.getElementById("nombre").value.trim();
    const telefonoInput = document.getElementById("telefono").value.trim();

    // Insertar en la tabla 'clientes' de Supabase
    const { data, error } = await supabase
        .from('clientes')
        .insert([
            { nombre: nombreInput, telefono: telefonoInput }
        ]);

    if (error) {
        alert("Hubo un error al registrar el cliente: " + error.message);
        console.error(error);
    } else {
        alert("¡Cliente registrado con éxito!");
        document.getElementById("form-cliente").reset(); // Limpiar el formulario
        listarClientes(); // Recargar la lista automáticamente
    }
}
