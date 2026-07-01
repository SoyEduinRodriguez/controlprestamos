document.addEventListener("DOMContentLoaded", () => {
    cargarMetricasKPI();
    cargarAlertasMora();
    inicializarGraficaRecaudo();
});

const formatearMoneda = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

// 1. CALCULAR LOS ENFOQUES PRINCIPALES (CAPITAL EN LA CALLE Y GANANCIAS)
async function cargarMetricasKPI() {
    // A. Calcular Capital en la Calle (Suma de montos de préstamos activos)
    const { data: prestamos, error: errP } = await supabase
        .from('prestamos')
        .select('monto_prestado')
        .eq('estado', 'ACTIVO');

    if (!errP && prestamos) {
        const totalCalle = prestamos.reduce((sum, p) => sum + parseFloat(p.monto_prestado), 0);
        document.getElementById("txt-capital-calle").textContent = formatearMoneda.format(totalCalle);
    }

    // B. Calcular Recaudo de Intereses / Ganancia del Mes Actual
    const fechaActual = new Date();
    const primerDiaMes = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 1).toISOString();
    
    // Consultamos los pagos del mes en curso
    const { data: pagosMes, error: errG } = await supabase
        .from('pagos_historial')
        .select('monto_recibido')
        .gte('fecha_pago', primerDiaMes);

    if (!errG && pagosMes) {
        const totalRecaudadoMes = pagosMes.reduce((sum, pago) => sum + parseFloat(pago.monto_recibido), 0);
        document.getElementById("txt-ganancia-mes").textContent = formatearMoneda.format(totalRecaudadoMes);
    }

    const { data: pagosMes, error: errG } = await supabase
        .from('pagos_historial')
        .select(`
            monto_recibido,
            cuotas ( capital_cuota, monto_total_cuota )
        `)
        .gte('fecha_pago', primerDiaMes);
    
    if (!errG && pagosMes) {
        let gananciasRealesInteres = 0;
        
        pagosMes.forEach(pago => {
            const recibido = parseFloat(pago.monto_recibido);
            const totalCuota = parseFloat(pago.cuotas.monto_total_cuota);
            const capitalCuota = parseFloat(pago.cuotas.capital_cuota);
            
            // Factor proporcional: ¿Qué porcentaje de lo cobrado representa el interés?
            const porcentajeInteres = (totalCuota - capitalCuota) / totalCuota;
            gananciasRealesInteres += (recibido * porcentajeInteres);
        });
    
        document.getElementById("txt-ganancia-mes").textContent = formatearMoneda.format(gananciasRealesInteres);
    }
    
}

// 2. DETECTAR CUOTAS VENCIDAS ("¿QUIÉN NO PAGÓ?")
async function cargarAlertasMora() {
    const contenedorAlertas = document.getElementById("lista-alertas");
    const txtContadorMora = document.getElementById("txt-clientes-mora");
    
    // Obtenemos la fecha de hoy en formato estricto YYYY-MM-DD
    const hoy = new Date().toISOString().split('T')[0];

    // Traer cuotas vencidas que no estén totalmente pagadas, incluyendo datos de la ruta relacional del cliente
    const { data: cuotasVencidas, error } = await supabase
        .from('cuotas')
        .select(`
            id, numero_cuota, fecha_vencimiento, monto_total_cuota, monto_pagado,
            prestamos ( id, clientes ( nombre, telefono ) )
        `)
        .neq('estado', 'PAGADO')
        .lt('fecha_vencimiento', hoy); // Menor que hoy (< hoy)

    if (error) {
        console.error("Error al cargar alertas de mora:", error.message);
        return;
    }

    if (cuotasVencidas.length === 0) {
        contenedorAlertas.innerHTML = `
            <div class="p-3 bg-green-50 border border-green-100 rounded-lg text-center">
                <p class="text-green-700 text-sm font-medium"><i class="fa-solid fa-circle-check mr-1"></i> ¡Al día! No hay cuotas retrasadas.</p>
            </div>
        `;
        txtContadorMora.textContent = "0";
        return;
    }

    // Actualizar el número de la tarjeta KPI de mora
    txtContadorMora.textContent = cuotasVencidas.length;
    contenedorAlertas.innerHTML = "";

    // Renderizar cada alerta con un botón de cobro rápido para WhatsApp
    cuotasVencidas.forEach(c => {
        const cliente = c.prestamos.clientes;
        const deudaPendiente = parseFloat(c.monto_total_cuota) - parseFloat(c.monto_pagado);
        
        const div = document.createElement("div");
        div.className = "p-3 bg-red-50 border border-red-100 rounded-lg flex justify-between items-center shadow-xs";
        div.innerHTML = `
            <div>
                <h4 class="text-sm font-bold text-gray-800">${cliente.nombre}</h4>
                <p class="text-xs text-red-600 font-semibold">Atrasado: Cuota ${c.numero_cuota} (Debe: ${formatearMoneda.format(deudaPendiente)})</p>
                <p class="text-[10px] text-gray-400">Venció el: ${new Date(c.fecha_vencimiento).toLocaleDateString('es-CO')}</p>
            </div>
            <a href="https://wa.me/57${cliente.telefono}?text=Hola%20${encodeURIComponent(cliente.nombre)},%20te%20saludo%20de%20parte%20de%20Finanzas%20Yenny.%20Te%20recordamos%20que%20tienes%20pendiente%20el%20pago%20de%20la%20cuota%20${c.numero_cuota}%20por%20un%20valor%20de%20${encodeURIComponent(formatearMoneda.format(deudaPendiente))}.%20Quedamos%20atentos!" 
               target="_blank" 
               class="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors">
                <i class="fa-brands fa-whatsapp text-sm"></i> Cobrar
            </a>
        `;
        contenedorAlertas.appendChild(div);
    });
}

// 3. GENERAR GRÁFICA MENSUAL DE CONTROL DE RECAUDO
async function inicializarGraficaRecaudo() {
    const ctx = document.getElementById('chartRecaudo').getContext('2d');
    
    // Consultar todo el historial de pagos del año actual
    const añoActual = new Date().getFullYear();
    const { data: pagos, error } = await supabase
        .from('pagos_historial')
        .select('monto_recibido, fecha_pago')
        .gte('fecha_pago', `${añoActual}-01-01`);

    // Inicializar un array con 12 posiciones en $0 para los meses del año
    const mesesValores = Array(12).fill(0);

    if (!error && pagos) {
        pagos.forEach(pago => {
            const mesIndex = new Date(pago.fecha_pago).getMonth(); // Ene = 0, Feb = 1...
            mesesValores[mesIndex] += parseFloat(pago.monto_recibido);
        });
    }

    // Dibujar la gráfica de barras usando Chart.js
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
            datasets: [{
                label: 'Total Recaudado ($)',
                data: mesesValores,
                backgroundColor: 'rgba(37, 99, 235, 0.2)', // Azul Tailwind transparente
                borderColor: 'rgba(37, 99, 235, 1)',      // Azul sólido
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
