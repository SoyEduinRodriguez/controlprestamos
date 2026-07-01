document.addEventListener("DOMContentLoaded", () => {
    listarClientes();

    const formCliente = document.getElementById("form-cliente");
    formCliente.addEventListener("submit", registrarCliente);
});

// 1. FUNCIÓN PARA LISTAR CLIENTES Y RENDERIZAR LA TABLA CON ACCIONES (EDITAR / BORRAR)
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
            <td class="p-3 text-center flex justify-center gap-3">
                <button onclick="editarCliente(${cliente.id}, '${cliente.nombre}', '${cliente.telefono}')" class="text-blue-500 hover:text-blue-700 p-1 transition-colors" title="Editar Cliente">
                    <i class="fa-solid fa-user-pen"></i>
                </button>
                <button onclick="eliminarCliente(${cliente.id})" class="text-red-500 hover:text-red-700 p-1 transition-colors" title="Eliminar Cliente">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </td>
        `;
        tbody.appendChild(fila);
    });
}

// 2. FUNCIÓN PARA CREAR CLIENTE (INSERT)
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

// 3. FUNCIÓN PARA ACTUALIZAR CLIENTE (UPDATE)
async function editarCliente(id, nombreActual, telefonoActual) {
    // Solicitar el nuevo nombre manteniendo el actual por defecto
    const nuevoNombre = prompt("Modificar el nombre del cliente:", nombreActual);
    if (nuevoNombre === null) return; // Si cancela, no hace nada
    
    if (nuevoNombre.trim() === "") {
        alert("El nombre no puede estar vacío.");
        return;
    }

    // Solicitar el nuevo teléfono manteniendo el actual por defecto
    const nuevoTelefono = prompt("Modificar el teléfono / WhatsApp:", telefonoActual);
    if (nuevoTelefono === null) return;

    if (nuevoTelefono.trim() === "") {
        alert("El teléfono no puede estar vacío.");
        return;
    }

    // Ejecutar el UPDATE en Supabase
    const { error } = await supabase
        .from('clientes')
        .update({ nombre: nuevoNombre.trim(), telefono: nuevoTelefono.trim() })
        .eq('id', id);

    if (error) {
        alert("No se pudieron guardar los cambios: " + error.message);
    } else {
        alert("¡Cliente actualizado con éxito!");
        listarClientes(); // Recargar la tabla con los nuevos datos
    }
}

// 4. FUNCIÓN PARA BORRAR CLIENTE (DELETE)
async function eliminarCliente(id) {
    const confirmar = confirm("¿Estás seguro de que deseas eliminar este cliente? Esto borrará de forma permanente sus préstamos e historiales asociados.");
    if (!confirmar) return;

    const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', id);

    if (error) {
        alert("No se pudo eliminar el cliente. Si tiene créditos activos, primero debes finalizarlos o borrarlos. Motivo: " + error.message);
    } else {
        alert("Cliente eliminado con éxito.");
        listarClientes();
    }
}
