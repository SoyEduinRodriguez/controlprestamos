document.addEventListener("DOMContentLoaded", () => {
    // Establecer la fecha de hoy por defecto en el formulario
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById("sim-fecha").value = hoy;

    document.getElementById("form-simulador").addEventListener("submit", ejecutarSimulacion);
});

const formateador = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

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

    // 1. Cálculos Globales Ex-ante
    const totalARecaudar = valorCuota * cantCuotas;
    const interesesGanados = totalARecaudar - monto;

    // Pintar bloques de resumen
    document.getElementById("txt-sim-total").textContent = formateador.format(totalARecaudar);
    document.getElementById("txt-sim-interes").textContent = formateador.format(interesesGanados);
    divResumen.classList.remove("hidden");

    let saldoDecrecienteCredito = totalARecaudar;
    let fechaBase = new Date(fechaInicioStr + "T00:00:00");

    // 2. Iteración matemática para proyectar las cuotas consecutivas en los meses venideros
    for (let i = 1; i <= cantCuotas; i++) {
        let fechaVencimiento = new Date(fechaBase.getFullYear(), fechaBase.getMonth() + i, diaPago);
        
        // Ajuste técnico por si el mes tiene menos días que el día de cobro pactado (Ej: 31 de Febrero)
        if (fechaVencimiento.getDate() !== diaPago) {
            fechaVencimiento.setDate(0); 
        }

        // Al saldo total del crédito le restamos el valor de la cuota simulación actual
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
