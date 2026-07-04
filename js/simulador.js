document.addEventListener("DOMContentLoaded", () => {
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById("sim-fecha").value = hoy;

    cargarClientesEnSimulador();
    document.getElementById("form-simulador").addEventListener("submit", ejecutarSimulacion);
    document.getElementById("btn-crear-desde-sim").addEventListener("click", convertirEnCreditoReal);
});

const formateador = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

// Variables globales temporales para retener los datos calculados de la simulación activa
let datosSimulacionActiva = null;

// 1. TRAER LOS CLIENTES DESDE SUPABASE AL SIMULADOR
async function cargarClientesEnSimulador() {
    const select = document.getElementById("select-cliente-sim");
    const { data: clientes, error } = await supabase
        .from('clientes')
        .select('id, nombre')
        .order('nombre', { ascending: true });

    if (!error && clientes) {
        select.innerHTML = '<option value="">-- Seleccione Cliente Real --</option>';
        clientes.forEach(c => {
            const op = document.createElement("option");
            op.value = c.id;
            op.textContent = c.nombre;
            select.appendChild(op);
        });
    }
}

// 2. EJECUTAR PROYECCIÓN VISUAL
function ejecutarSimulacion(e) {
    e.preventDefault();

    const monto = parseFloat(document.getElementById("sim-monto").value);
    const cantCuotas = parseInt(document.getElementById("sim-cuotas").value);
    const diaPago = parseInt(document.getElementById("sim-dia").value);
    const valorCuota = parseFloat(document.getElementById("sim-valor-cuota").value);
    const fechaInicioStr = document.getElementById("sim-fecha").value;

    const tbody = document.getElementById("tabla-simulacion");
    const divResumen = document.getElementById("resumen-simulacion");
    
    tbody.innerHTML = "";

    const totalARecaudar = valorCuota * cantCuotas;
    const interesesGanados = totalARecaudar - monto;

    document.getElementById("txt-sim-total").textContent = formateador.format(totalARecaudar);
    document.getElementById("txt-sim-interes").textContent = formateador.format(interesesGanados);
    divResumen.classList.remove("hidden");

    // Guardar en la variable global para el botón de conversión posterior
    datosSimulacionActiva = { monto, cantCuotas, diaPago, valorCuota, fechaInicioStr };

    let saldoDecrecienteCredito = totalARecaudar;
    let fechaBase = new Date(fechaInicioStr + "T00:00:00");

    for (let i = 1; i <= cantCuotas; i++) {
        let fechaVencimiento = new Date(fechaBase.getFullYear(), fechaBase.getMonth() + i, diaPago);
        saldoDecrecienteCredito -= valorCuota;

        const fila = document.createElement("tr");
        fila.className = "hover:bg-gray-50 transition-colors";
        fila.innerHTML = `
            <td class="p-3 font-mono font-bold">Cuota ${i}</td>
            <td class="p-3 text-gray-500">${fechaVencimiento.toLocaleDateString('es-CO')}</td>
            <td class="p-3 font-semibold">${formateador.format(valorCuota)}</td>
            <td class="p-3 text-gray-800 font-bold bg-blue-50/50">${formateador.format(Math.max(0, saldoDecrecienteCredito))}</td>
        `;
        tbody.appendChild(fila);
    }
}

// 3. CONVERTIR SIMULACIÓN EN CRÉDITO REAL (PRODUCCIÓN EN SUPABASE)
async function convertirEnCreditoReal() {
    const clienteId = document.getElementById("select-cliente-sim").value;
    
    if (!clienteId) {
        alert("Por favor selecciona primero el cliente al cual le vas a desembolsar este crédito.");
        return;
    }

    if (!datosSimulacionActiva) {
        alert("No hay una simulación de cuotas activa calculada.");
        return;
    }

    const { monto, cantCuotas, diaPago, valorCuota, fechaInicioStr } = datosSimulacionActiva;

    const confirmar = confirm("¿Estás seguro de inyectar esta simulación como un Crédito Real en curso?");
    if (!confirmar) return;

    const capitalPorCuota = monto / cantCuotas;
    const interesPorCuota = valorCuota - capitalPorCuota;

    // A. Insertar Préstamo Cabecera
    const { data: prestamoInsertado, error: errorP } = await supabase
        .from('prestamos')
        .insert([{ 
            cliente_id: clienteId, 
            monto_prestado: monto, 
            cantidad_cuotas: cantCuotas, 
            valor_cuota_fija: valorCuota, 
            dia_pago_mensual: diaPago,
            fecha_inicio: fechaInicioStr
        }]).select();

    if (errorP) {
        alert("Error al inyectar cabecera desde el simulador: " + errorP.message);
        return;
    }

    const prestamoId = prestamoInsertado[0].id;
    const cuotasFilas = [];
    let fechaBase = new Date(fechaInicioStr + "T00:00:00");

    // B. Lazo de generación de cuotas contables
    for (let i = 1; i <= cantCuotas; i++) {
        let fechaVencimiento = new Date(fechaBase.getFullYear(), fechaBase.getMonth() + i, diaPago);
        
        const yyyy = fechaVencimiento.getFullYear();
        const mm = String(fechaVencimiento.getMonth() + 1).padStart(2, '0');
        const dd = String(fechaVencimiento.getDate()).padStart(2, '0');

        cuotasFilas.push({
            prestamo_id: prestamoId,
            numero_cuota: i,
            fecha_vencimiento: `${yyyy}-${mm}-${dd}`,
            monto_total_cuota: valorCuota,
            capital_cuota: capitalPorCuota,
            interes_cuota: interesPorCuota,
            monto_pagado: 0,
            estado: 'PENDIENTE'
        });
    }

    // C. Bulk Insert en la tabla cuotas
    const { error: errorCuotas } = await supabase.from('cuotas').insert(cuotasFilas);

    if (errorCuotas) {
        alert("El préstamo se creó pero fallaron las cuotas correlativas: " + errorCuotas.message);
    } else {
        alert("¡Éxito total! La simulación fue migrada y dada de alta como crédito activo.");
        // Limpiar formulario y redireccionar a la sección de préstamos
        document.getElementById("form-simulador").reset();
        document.getElementById("resumen-simulacion").classList.add("hidden");
        document.getElementById("tabla-simulacion").innerHTML = `<tr><td colspan="4" class="p-4 text-center text-gray-500 italic">Completa los parámetros para proyectar el crédito.</td></tr>`;
        window.location.href = "prestamos.html";
    }
}
