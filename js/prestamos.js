document.addEventListener("DOMContentLoaded", () => {
    // Establecer la fecha de hoy por defecto en el nuevo campo del formulario
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

// 2. REGISTRAR PRÉSTAMO Y GENERAR PLAN DE CUOTAS (CON SOPORTE PARA FECHAS PASADAS Y SEGMENTACIÓN DE INTERÉS)
async function registrarPrestamoYCuotas(e) {
    e.preventDefault();

    const clienteId = document.getElementById("select-cliente").value;
    const monto = parseFloat(document.getElementById("monto").value);
    const cantidadCuotas = parseInt(document.getElementById("cuotas-cant").value);
    const diaPago = parseInt(document.getElementById("dia-pago").value);
    const valorCuota = parseFloat(document.getElementById("valor-cuota").value);
    const fechaInicioInput = document.getElementById("fecha-inicio").value; // Captura 'YYYY-MM-DD'

    // Validación matemática rápida
    if (valorCuota * cantidadCuotas < monto) {
        alert("Advertencia: El recaudo total de las cuotas no puede ser menor al capital prestado.");
        return;
    }

    // MATEMÁTICA INTERNA PARA LA SEGMENTACIÓN CONTABLE:
    const capitalPorCuota = monto / cantidadCuotas;
    const interesPorCuota = valorCuota - capitalPorCuota;

    // A. Insertar el Préstamo Cabecera (Soporta la fecha del pasado seleccionada)
    const { data: prestamoInsertado, error: errorPrestamo } = await supabase
        .from('prestamos')
        .insert([
            { 
                cliente_id: clienteId, 
                monto_prestado: monto, 
                cantidad_cuotas: cantidadCuotas, 
                valor_cuota_fija: valorCuota, 
                dia_pago_mensual: diaPago,
                fecha_inicio: fechaInicioInput // Guarda la fecha real elegida (del pasado o presente)
            }
        ])
        .select();

    if (errorPrestamo) {
        alert("Error al guardar la cabecera del préstamo: " + errorPrestamo.message);
        return;
    }

    const prestamoId = prestamoInsertado[0].id;
    const cuotasFilas = [];
    
    // B. Lógica de generación de fechas amarradas a la fecha de inicio elegida
    // Agregamos "T00:00:00" para evitar desfases de zona horaria del navegador
    let fechaBase = new Date(fechaInicioInput + "T00:00:00"); 

    for (let i = 1; i <= cantidadCuotas; i++) {
        let añoTarget = fechaBase.getFullYear();
        let mesTarget = fechaBase.getMonth() + i; // Suma un mes de forma secuencial
        
        // El constructor de Date maneja automáticamente los desbordamientos de fin de año/mes
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
            capital_cuota: capitalPorCuota,   // Almacena la proporción de capital
            interes_cuota: interesPorCuota,   // Almacena la proporción de ganancia limpia
            monto_pagado: 0,
            estado: 'PENDIENTE'
        });
    }

    // C. Insertar todas las cuotas calculadas (Bulk Insert)
    const { error: errorCuotas } = await supabase
        .from('cuotas')
        .insert(cuotasFilas);

    if (errorCuotas) {
        alert("El crédito se creó, pero hubo un error generando el plan de cuotas: " + errorCuotas.message);
    } else {
        alert("¡Crédito y Plan de Cuotas (Capital/Interés) generados con éxito!");
        document.getElementById("form-prestamo").reset();
        
        // Re-establecer la fecha de hoy por comodidad tras el reinicio
        document.getElementById("fecha-inicio").value = new Date().toISOString().split('T')[0];
        
        listarPrestamosActivos();
    }
}

// 3. MOSTRAR LOS PRÉSTAMOS ACTIVOS EN LA TABLA DE CONTROL DERECHA
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
            <div>
                <h4 class="font-bold text-gray-800 text-base">${p.clientes ? p.clientes.nombre : 'Cliente Eliminado'}</h4>
                <p class="text-xs text-gray-500 mt-0.5">Desembolsado el: ${new Date(p.fecha_inicio + "T00:00:00").toLocaleDateString('es-CO')}</p>
                <div class="flex gap-4 mt-2 text-xs font-medium text-gray-600">
                    <span><i class="fa-solid fa-hand-holding-dollar text-blue-500 mr-1"></i> Capital: ${formateador.format(p.monto_prestado)}</span>
                    <span><i class="fa-solid fa-calendar text-gray-400 mr-1"></i> Cobro: Día ${p.dia_pago_mensual}</span>
                </div>
            </div>
            <div class="text-left md:text-right">
                <span class="text-sm font-semibold text-gray-700 block">${p.cantidad_cuotas} cuotas de ${formateador.format(p.valor_cuota_fija)}</span>
                <span class="inline-flex items-center px-2 py-0.5 mt-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    ID Crédito: #${p.id}
                </span>
            </div>
        `;
        contenedor.appendChild(div);
    });
}
