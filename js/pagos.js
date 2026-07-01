document.addEventListener("DOMContentLoaded", () => {
    cargarPrestamosActivos();

    document.getElementById("select-prestamo").addEventListener("change", cargarCuotasDelPrestamo);
    document.getElementById("select-cuota").addEventListener("change", actualizarMontoSugerido);
    document.getElementById("form-pago").addEventListener("submit", procesarPago);
});

const formateador = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

// 1. CARGAR LOS PRÉSTAMOS EN EL SELECT PRINCIPAL
async function cargarPrestamosActivos() {
    const select = document.getElementById("select-prestamo");
    
    const { data: prestamos, error } = await supabase
        .from('prestamos')
        .select(`id, clientes ( nombre )`)
        .eq('estado', 'ACTIVO')
        .order('id', { ascending: false });

    if (error) {
        console.error("Error al cargar créditos activos:", error.message);
        return;
    }

    select.innerHTML = '<option value="">-- Seleccione un Crédito --</option>';
    prestamos.forEach(p => {
        const option = document.createElement("option");
        option.value = p.id;
        option.textContent = `Crédito #${p.id} - ${p.clientes.nombre}`;
        select.appendChild(option);
    });
}

// 2. CARGAR CUOTAS Y RENDERIZAR LA TABLA DETALLADA
async function cargarCuotasDelPrestamo() {
    const prestamoId = document.getElementById("select-prestamo").value;
    const selectCuota = document.getElementById("select-cuota");
    const tbody = document.getElementById("tabla-estado-cuotas");
    const inputMonto = document.getElementById("monto-recibido");
    const btnGuardar = document.getElementById("btn-guardar-pago");
    const txtAyuda = document.getElementById("txt-ayuda-cuota");

    if (!prestamoId) {
        selectCuota.innerHTML = '<option value="">Primero elija un crédito...</option>';
        selectCuota.disabled = true;
        inputMonto.disabled = true;
        btnGuardar.disabled = true;
        tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-gray-500 italic">Selecciona un crédito para auditar sus cuotas.</td></tr>`;
        return;
    }

    // Traer todas las cuotas ligadas al préstamo elegido
    const { data: cuotas, error } = await supabase
        .from('cuotas')
        .select('*')
        .eq('prestamo_id', prestamoId)
        .order('numero_cuota', { ascending: true });

    if (error) {
        console.error(error);
        return;
    }

    // Habilitar campos del formulario
    selectCuota.disabled = false;
    inputMonto.disabled = false;
    btnGuardar.disabled = false;
    btnGuardar.className = "w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition duration-200";

    selectCuota.innerHTML = '<option value="">-- Seleccione la Cuota --</option>';
    tbody.innerHTML = "";

    cuotas.forEach(c => {
        // Formatear estados con colores de Tailwind
        let badgeColor = "bg-gray-100 text-gray-800";
        if (c.estado === 'ABONADO') badgeColor = "bg-yellow-100 text-yellow-800";
        if (c.estado === 'PAGADO') badgeColor = "bg-green-100 text-green-800";

        // Solo permitimos abonar a cuotas que no estén completamente pagadas
        if (c.estado !== 'PAGADO') {
            const option = document.createElement("option");
            option.value = c.id;
            option.dataset.pendiente = c.monto_total_cuota - c.monto_pagado;
            option.textContent = `Cuota Nº ${c.numero_cuota} (Falta: ${formateador.format(c.monto_total_cuota - c.monto_pagado)})`;
            selectCuota.appendChild(option);
        }

        // Pintar fila en la tabla de auditoría
        const fila = document.createElement("tr");
        fila.className = "hover:bg-gray-50 transition-colors";
        fila.innerHTML = `
            <td class="p-3 font-mono font-bold">Cuota ${c.numero_cuota}</td>
            <td class="p-3 text-gray-500">${new Date(c.fecha_vencimiento).toLocaleDateString('es-CO')}</td>
            <td class="p-3 font-semibold">${formateador.format(c.monto_total_cuota)}</td>
            <td class="p-3 text-blue-600 font-medium">${formateador.format(c.monto_pagado)}</td>
            <td class="p-3"><span class="px-2 py-0.5 rounded text-xs font-bold ${badgeColor}">${c.estado}</span></td>
        `;
        tbody.appendChild(fila);
    });

    if (selectCuota.options.length === 1) {
        selectCuota.innerHTML = '<option value="">¡Todas las cuotas de este crédito están pagadas!</option>';
        selectCuota.disabled = true;
        inputMonto.disabled = true;
        btnGuardar.disabled = true;
        btnGuardar.className = "w-full bg-gray-400 text-white font-medium py-2 rounded-lg cursor-not-allowed";
    }
}

// 3. ACTUALIZAR EL TEXTO AUXILIAR QUE LE AYUDA A MAMÁ A VER CUÁNTO DEBEN
function actualizarMontoSugerido() {
    const select = document.getElementById("select-cuota");
    const txtAyuda = document.getElementById("txt-ayuda-cuota");
    const inputMonto = document.getElementById("monto-recibido");
    const opcionSeleccionada = select.options[select.selectedIndex];

    if (!opcionSeleccionada || !opcionSeleccionada.value) {
        txtAyuda.classList.add("hidden");
        return;
    }

    const saldoPendiente = parseFloat(opcionSeleccionada.dataset.pendiente);
    inputMonto.value = saldoPendiente; // Le pre-cargamos el valor total sugerido
    txtAyuda.textContent = `El cliente cancela la cuota con: ${formateador.format(saldoPendiente)}`;
    txtAyuda.classList.remove("hidden");
}

// 4. PROCESAR LA TRANSACCIÓN (INSERT EN HISTORIAL + UPDATE EN CUOTAS)
async function procesarPago(e) {
    e.preventDefault();

    const cuotaId = document.getElementById("select-cuota").value;
    const montoRecibido = parseFloat(document.getElementById("monto-recibido").value);
    const select = document.getElementById("select-cuota");
    const opcionSeleccionada = select.options[select.selectedIndex];
    const saldoPendienteActual = parseFloat(opcionSeleccionada.dataset.pendiente);

    if (montoRecibido <= 0) {
        alert("Por favor introduce un monto de dinero válido.");
        return;
    }

    // A. Registrar el movimiento en la tabla 'pagos_historial'
    const { error: errorHistorial } = await supabase
        .from('pagos_historial')
        .insert([{ cuota_id: cuotaId, monto_recibido: montoRecibido }]);

    if (errorHistorial) {
        alert("Error al registrar el historial del pago: " + errorHistorial.message);
        return;
    }

    // B. Calcular el nuevo estado lógico de la cuota
    // Traer primero los datos guardados de la cuota para no perder el acumulado
    const { data: cuotaActual, error: errorGet } = await supabase
        .from('cuotas')
        .select('monto_pagado, monto_total_cuota')
        .eq('id', cuotaId)
        .single();

    const nuevoMontoPagado = parseFloat(cuotaActual.monto_pagado) + montoRecibido;
    let nuevoEstado = 'ABONADO';

    if (nuevoMontoPagado >= parseFloat(cuotaActual.monto_total_cuota)) {
        nuevoEstado = 'PAGADO';
    }

    // C. Actualizar la tabla 'cuotas' con el nuevo acumulado y estado
    const { error: errorUpdate } = await supabase
        .from('cuotas')
        .update({ monto_pagado: nuevoMontoPagado, estado: nuevoEstado })
        .eq('id', cuotaId);

    if (errorUpdate) {
        alert("El pago se guardó, pero no se pudo actualizar el estado de la cuota: " + errorUpdate.message);
    } else {
        alert("¡Pago procesado y registrado con éxito!");
        document.getElementById("form-pago").reset();
        document.getElementById("txt-ayuda-cuota").classList.add("hidden");
        cargarCuotasDelPrestamo(); // Recarga la tabla de inmediato
    }
}
