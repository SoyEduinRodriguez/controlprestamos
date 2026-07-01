document.addEventListener("DOMContentLoaded", () => {
    cargarMetricasKPI();
    cargarAlertasMora();
    inicializarGraficaRecaudo();
});

const formatearMoneda = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

// 1. CARGAR CARDs INFORMATIVAs (KPIs) CON MATEMÁTICA PROPORCIONAL CORREGIDA
async function cargarMetricasKPI() {
    // A. Capital en la Calle (Suma de montos de préstamos activos)
    const { data: prestamos, error: errP } = await supabase
        .from('prestamos')
        .select('monto_prestado')
        .eq('estado', 'ACTIVO');

    if (!errP && prestamos) {
        const totalCalle = prestamos.reduce((sum, p) => sum + parseFloat(p.monto_prestado), 0);
        document.getElementById("txt-capital-calle").textContent = formatearMoneda.format(totalCalle);
    }

    // B. Calcular Intereses / Ganancia Real Limpia del Mes Actual
    const fechaActual = new Date();
    const primerDiaMes = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 1).toISOString();
    
    // Consultamos los pagos del mes en curso incluyendo datos de la cuota y la cabecera del préstamo
    const { data: pagosMes, error: errG } = await supabase
        .from('pagos_historial')
        .select(`
            monto_recibido,
            cuotas ( capital_cuota, monto_total_cuota, prestamos ( monto_prestado, cantidad_cuotas, valor_cuota_fija ) )
        `)
        .gte('fecha_pago', primerDiaMes);

    if (!errG && pagosMes) {
        let gananciasRealesInteres = 0;
        
        pagosMes.forEach(pago => {
            if (pago.cuotas) {
                const recibido = parseFloat(pago.monto_recibido);
                const totalCuota = parseFloat(pago.cuotas.monto_total_cuota);
                
                let capitalCuota = parseFloat(pago.cuotas.capital_cuota || 0);
                
                // RESPALDO CONTABLE: Si las columnas nuevas están en 0 o NULL (créditos antiguos), calculamos la proporción dinámicamente
                if (capitalCuota === 0 && pago.cuotas.prestamos) {
                    const pCabecera = pago.cuotas.prestamos;
                    capitalCuota = parseFloat(pCabecera.monto_prestado) / parseInt(pCabecera.cantidad_cuotas);
                }
                
                // Si el valor de la cuota es válido, extraemos el porcentaje exacto que es interés/ganancia
                if (totalCuota > 0) {
                    const porcentajeInteres = (totalCuota - capitalCuota) / totalCuota;
                    gananciasRealesInteres += (recibido * porcentajeInteres);
                }
            }
        });

        document.getElementById("txt-ganancia-mes").textContent = formatearMoneda.format(gananciasRealesInteres);
    }
}

// 2. DETECTAR CUOTAS VENCIDAS INCLUYENDO EL ID DE CRÉDITO
async function cargarAlertasMora() {
    const contenedorAlertas = document.getElementById("lista-alertas");
    const txtContadorMora = document.getElementById("txt-clientes-mora");
    
    const hoy = new Date().toISOString().split('T')[0];

    const { data: cuotasVencidas, error } = await supabase
        .from('cuotas')
        .select(`
            id, numero_cuota, fecha_vencimiento, monto_total_cuota, monto_pagado,
            prestamos ( id, clientes ( nombre, telefono ) )
        `)
        .neq('estado', 'PAGADO')
        .lt('fecha_vencimiento', hoy);

    if (error) {
        console.error("Error al cargar alertas de mora:", error.message);
        return;
    }

    if (!cuotasVencidas || cuotasVencidas.length === 0) {
        contenedorAlertas.innerHTML = `
            <div class="p-3 bg-green-50 border border-green-100 rounded-lg text-center">
                <p class="text-green-700 text-sm font-medium"><i class="fa-solid fa-circle-check mr-1"></i> ¡Al día! No hay cuotas retrasadas.</p>
            </div>
        `;
        txtContadorMora.textContent = "0";
        return;
    }

    txtContadorMora.textContent = cuotasVencidas.length;
    contenedorAlertas.innerHTML = "";

    cuotasVencidas.forEach(c => {
        if (c.prestamos && c.prestamos.clientes) {
            const prestamoId = c.prestamos.id;
            const cliente = c.prestamos.clientes;
            const deudaPendiente = parseFloat(c.monto_total_cuota) - parseFloat(c.monto_pagado);
            
            const div = document.createElement("div");
            div.className = "p-3 bg-red-50 border border-red-100 rounded-lg flex justify-between items-center shadow-xs text-xs";
            
            // Renderizado de la alerta incluyendo el ID del Crédito de manera destacada
            div.innerHTML = `
                <div>
                    <div class="flex items-center gap-2 mb-0.5">
                        <h4 class="font-bold text-gray-800">${cliente.nombre}</h4>
                        <span class="px-1.5 py-0.2 bg-red-200 text-red-900 rounded font-mono text-[9px] font-bold">Crédito #${prestamoId}</span>
                    </div>
                    <p class="text-red-600 font-semibold">Atrasado: Cuota ${c.numero_cuota} (Debe: ${formatearMoneda.format(deudaPendiente)})</p>
                    <p class="text-[10px] text-gray-400">Venció el: ${new Date(c.fecha_vencimiento + "T00:00:00").toLocaleDateString('es-CO')}</p>
                </div>
                <a href="https://wa.me/57${cliente.telefono}?text=Hola%20${encodeURIComponent(cliente.nombre)},%20te%20saludo%20de%20parte%20de%20Finanzas%20Yenny.%20Te%20recordamos%20que%20tienes%20pendiente%20el%20pago%20de%20la%20cuota%20${c.numero_cuota}%20del%20Cr%C3%A9dito%20%23${prestamoId}%20por%20un%20valor%20de%20${encodeURIComponent(formatearMoneda.format(deudaPendiente))}.%20Quedamos%20atentos!" 
                   target="_blank" 
                   class="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold flex items-center gap-1 transition-colors ml-2 shrink-0">
                    <i class="fa-brands fa-whatsapp text-sm"></i> Cobrar
                </a>
            `;
            contenedorAlertas.appendChild(div);
        }
    });
}

// 3. GENERAR GRÁFICA MENSUAL DE CONTROL DE RECAUDO
async function inicializarGraficaRecaudo() {
    const canvasElement = document.getElementById('chartRecaudo');
    if (!canvasElement) return;
    
    const ctx = canvasElement.getContext('2d');
    const añoActual = new Date().getFullYear();
    
    const { data: pagos, error } = await supabase
        .from('pagos_historial')
        .select('monto_recibido, fecha_pago')
        .gte('fecha_pago', `${añoActual}-01-01`);

    const mesesValores = Array(12).fill(0);

    if (!error && pagos) {
        pagos.forEach(pago => {
            const mesIndex = new Date(pago.fecha_pago).getMonth();
            mesesValores[mesIndex] += parseFloat(pago.monto_recibido);
        });
    }

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
            datasets: [{
                label: 'Total Recaudado ($)',
                data: mesesValores,
                backgroundColor: 'rgba(37, 99, 235, 0.2)',
                borderColor: 'rgba(37, 99, 235, 1)',
                borderWidth: 2,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) { return formatearMoneda.format(value); }
                    }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}
