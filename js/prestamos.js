document.addEventListener("DOMContentLoaded", () => {
    // Establecer la fecha de hoy por defecto en el campo del formulario
    const txtFechaInicio = document.getElementById("fecha-inicio");
    if (txtFechaInicio) {
        txtFechaInicio.value = new Date().toISOString().split('T')[0];
    }

    cargarClientesEnSelect();
    listarPrestamosActivos();

    const formPrestamo = document.getElementById("form-prestamo");
    formPrestamo.addEventListener("submit", registrarPrestamoYCuotas);
});

const formateador = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

// 1. CARGAR CLIENTES EN EL SELECT DEL FORMULARIO
async function cargarClientesEnSelect() {
    const select = document.getElementById("select-cliente");
    
    const { data: clientes, error } = await supabase
        .from('clientes')
        .select('id, nombre')
        .order('nombre', { ascending: true });

    if (error) {
        console.error("Error al cargar select de clientes:", error.message);
        return;
    }

    select.innerHTML = '<option value="">-- Seleccione un Cliente --</option>';
    clientes.forEach(c => {
        const option = document.createElement("option");
        option.value = c.id;
        option.textContent = c.nombre;
        select.appendChild(option);
    });
}

// 2. REGISTRAR PRÉSTAMO Y GENERAR PLAN DE CUOTAS
async function registrarPrestamoYCuotas(e) {
    e.preventDefault();

    const clienteId = document.getElementById("select-cliente").value;
    const monto = parseFloat(document.getElementById("monto").value);
    const cantidadCuotas = parseInt(document.getElementById("cuotas-cant").value);
    const diaPago = parseInt(document.getElementById("dia-pago").value);
    const valorCuota = parseFloat(document.getElementById("valor-cuota").value);
    const fechaInicioInput = document.getElementById("fecha-inicio").value;

    if (valorCuota * cantidadCuotas < monto) {
        alert("Advertencia: El recaudo total de las cuotas no puede ser menor al capital prestado.");
        return;
    }

    const capitalPorCuota = monto / cantidadCuotas;
    const interesPorCuota = valorCuota - capitalPorCuota;

    const { data: prestamoInsertado, error: errorPrestamo } = await supabase
        .from('prestamos')
        .insert([
            { 
                cliente_id: clienteId, 
                monto_prestado: monto, 
                cantidad_cuotas: cantidadCuotas, 
                valor_cuota_fija: valorCuota, 
                dia_pago_mensual: diaPago,
                fecha_inicio: fechaInicioInput
            }
        ])
        .select();

    if (errorPrestamo) {
        alert("Error al guardar la cabecera del préstamo: " + errorPrestamo.message);
        return;
    }

    const prestamoId = prestamoInsertado[0].id;
    const cuotasFilas = [];
    let fechaBase = new Date(fechaInicioInput + "T00:00:00"); 

    for (let i = 1; i <= cantidadCuotas; i++) {
        let añoTarget = fechaBase.getFullYear();
        let mesTarget = fechaBase.getMonth() + i; 
        
        let fechaVencimiento = new Date(añoTarget, mesTarget, diaPago);
        
        const yyyy = fechaVencimiento.getFullYear();
        const mm = String(fechaVencimiento.getMonth() + 1).padStart(2, '0');
        const dd = String(fechaVencimiento.getDate()).padStart(2, '0');
        const fechaFormateada = `${yyyy}-${mm}-${dd}`;

        cuotasFilas.push({
            prestamo_id: prestamoId,
            numero_cuota: i,
            fecha_vencimiento: fechaFormateada,
            monto_total_cuota: valorCuota,
            capital_cuota: capitalPorCuota,
            interes_cuota: interesPorCuota,
            monto_pagado: 0,
            estado: 'PENDIENTE'
        });
    }

    const { error: errorCuotas } = await supabase
        .from('cuotas')
        .insert(cuotasFilas);

    if (errorCuotas) {
        alert("El crédito se creó, pero hubo un error generando el plan de cuotas: " + errorCuotas.message);
    } else {
        alert("¡Crédito y Plan de Cuotas generados con éxito!");
        document.getElementById("form-prestamo").reset();
        document.getElementById("fecha-inicio").value = new Date().toISOString().split('T')[0];
        listarPrestamosActivos();
    }
}

// 3. MOSTRAR LOS PRÉSTAMOS ACTIVOS CON LOS BOTONES DE ACCIÓN
async function listarPrestamosActivos() {
    const contenedor = document.getElementById("lista-prestamos");

    const { data: prestamos, error } = await supabase
        .from('prestamos')
        .select(`
            id, monto_prestado, cantidad_cuotas, valor_cuota_fija, dia_pago_mensual, fecha_inicio,
            clientes ( nombre )
        `)
        .eq('estado', 'ACTIVO')
        .order('id', { ascending: false });

    if (error) {
        contenedor.innerHTML = `<p class="text-red-500">Error al cargar créditos: ${error.message}</p>`;
        return;
    }

    if (prestamos.length === 0) {
        contenedor.innerHTML = `<p class="text-gray-500 italic text-sm">No hay créditos activos en este momento.</p>`;
        return;
    }

    contenedor.innerHTML = "";
    
    prestamos.forEach(p => {
        const div = document.createElement("div");
        div.className = "p-4 border border-gray-100 bg-gray-50 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xs hover:bg-gray-100 transition-colors";
        
        div.innerHTML = `
            <div class="flex-1">
                <h4 class="font-bold text-gray-800 text-base">${p.clientes ? p.clientes.nombre : 'Cliente Eliminado'}</h4>
                <p class="text-xs text-gray-500 mt-0.5">Desembolsado el: ${new Date(p.fecha_inicio + "T00:00:00").toLocaleDateString('es-CO')}</p>
                <div class="flex flex-wrap gap-4 mt-2 text-xs font-medium text-gray-600">
                    <span><i class="fa-solid fa-hand-holding-dollar text-blue-500 mr-1"></i> Capital: ${formateador.format(p.monto_prestado)}</span>
                    <span><i class="fa-solid fa-calendar text-gray-400 mr-1"></i> Cobro: Día ${p.dia_pago_mensual}</span>
                    <span><i class="fa-solid fa-layer-group text-purple-500 mr-1"></i> ${p.cantidad_cuotas} cuotas de ${formateador.format(p.valor_cuota_fija)}</span>
                </div>
            </div>
            <div class="flex flex-row md:flex-col items-end gap-3 w-full md:w-auto justify-between md:justify-center border-t md:border-t-0 pt-2 md:pt-0 border-gray-200">
                <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    ID Crédito: #${p.id}
                </span>
                <div class="flex gap-3">
                    <button onclick="editarPrestamo(${p.id}, ${p.dia_pago_mensual}, ${p.valor_cuota_fija})" class="text-blue-500 hover:text-blue-700 text-sm p-1 transition-colors" title="Modificar Parámetros">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button onclick="eliminarPrestamo(${p.id})" class="text-red-500 hover:text-red-700 text-sm p-1 transition-colors" title="Eliminar Crédito">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            </div>
        `;
        contenedor.appendChild(div);
    });
}

// 4. FUNCIÓN PARA EDITAR PARAMETROS DEL PRÉSTAMO (DÍA DE PAGO O VALOR CUOTA)
async function editarPrestamo(id, diaActual, valorActual) {
    const nuevoDia = prompt("Modificar el día de cobro mensual (1 al 31):", diaActual);
    if (nuevoDia === null) return;
    
    const diaNum = parseInt(nuevoDia);
    if (isNaN(diaNum) || diaNum < 1 || diaNum > 31) {
        alert("Por favor introduce un día del mes válido (1-31).");
        return;
    }

    const nuevoValor = prompt("Modificar el valor de la cuota fija ($):", valorActual);
    if (nuevoValor === null) return;

    const valorNum = parseFloat(nuevoValor);
    if (isNaN(valorNum) || valorNum <= 0) {
        alert("Por favor introduce un valor de cuota válido.");
        return;
    }

    // Ejecutar el UPDATE en la cabecera del préstamo
    const { error: errP } = await supabase
        .from('prestamos')
        .update({ dia_pago_mensual: diaNum, valor_cuota_fija: valorNum })
        .eq('id', id);

    if (errP) {
        alert("No se pudo actualizar el préstamo: " + errP.message);
        return;
    }

    // OPCIONAL: Actualizar el valor y el día en las cuotas que sigan 'PENDIENTES'
    const { error: errC } = await supabase
        .from('cuotas')
        .update({ monto_total_cuota: valorNum })
        .eq('prestamo_id', id)
        .eq('estado', 'PENDIENTE');

    if (errC) {
        console.warn("Préstamo actualizado, pero algunas cuotas no cambiaron su valor base:", errC.message);
    }

    alert("¡Parámetros del crédito actualizados con éxito!");
    listarPrestamosActivos();
}

// 5. FUNCIÓN PARA ELIMINAR EL PRÉSTAMO POR COMPLETO
async function eliminarPrestamo(id) {
    const confirmar = confirm(`¿Estás completamente seguro de eliminar el Crédito #${id}?\n\nEsto borrará permanentemente todo su plan de cuotas y el historial de abonos recaudados. Esta acción no se puede deshacer.`);
    if (!confirmar) return;

    const { error } = await supabase
        .from('prestamos')
        .delete()
        .eq('id', id);

    if (error) {
        alert("No se pudo eliminar el crédito. Motivo: " + error.message);
    } else {
        alert("¡Crédito e historial de cuotas eliminados correctamente!");
        listarPrestamosActivos();
    }
}
