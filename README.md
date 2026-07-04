# 💰 Control de Préstamos - Finanzas Yenny

Plataforma web responsiva y segura diseñada para la administración contable, control de deudores, simulación de cuotas y seguimiento de recaudo para microcréditos de libranza o préstamos personales. Desarrollada a medida bajo un modelo SPA (*Single Page Application*) con persistencia en la nube.

---

## 🚀 Características Principales

* **📊 Panel de Control Inteligente (Dashboard):** * Cálculo automatizado del *Capital en la Calle* (dinero activo en circulación).
    * Métrica de *Intereses / Ganancia Real del Mes* basada en la segmentación matemática proporcional de abonos (discriminación de capital vs. interés neto).
    * Gráfico de barras dinámico (*Chart.js*) para auditar el histórico de recaudo mensual.
* **🚨 Alertas Urgentes de Mora:** Detección en tiempo real de cuotas vencidas emparejadas con el ID del Crédito correspondiente. Incluye un botón de cobro automatizado con plantillas dinámicas preparadas para abrir la API de WhatsApp con el mensaje personalizado listo.
* **👥 Gestión de Clientes Robusta:** Registro con filtro preventivo inteligente anti-duplicados (por coincidencia de nombre o número telefónico), actualización de metadatos (`UPDATE`) y borrado preventivo.
* **💵 Módulo de Préstamos en Cascada:** Segmentación de cuotas amortizadas de forma proporcional, control de parámetros rápidos de cobro y separación automática de **Créditos en Curso** e **Historial de Créditos Finalizados**.
* **🧮 Amortización Decreciente en Pagos:** Panel de recaudo parcial o completo que calcula el *Saldo del Crédito* decreciente fila por fila en tiempo real, reflejando el saldo global deudor sin necesidad de cálculos manuales.
* **🔮 Simulador Aislado:** Sección nativa para proyectar cronogramas estimados con clientes en caliente sin alterar la base de datos. Incluye una función de acoplamiento directo (`Convertir en Crédito Real`) que migra el ejercicio aprobado a producción con un solo clic.

---

## 🛠️ Stack Tecnológico

* **Frontend:** HTML5, JavaScript Moderno (ES6+), CSS3.
* **Estilos y Maquetación:** Tailwind CSS (Engine v4.0 distribuido vía cliente web).
* **Iconografía:** Font Awesome v6.4 (CDN).
* **Gráficas:** Chart.js v4.x.
* **BaaS (Backend as a Service):** Supabase (PostgreSQL relacional y motor de políticas de seguridad).
* **Despliegue / Hosting:** Vercel CI/CD (integración continua amarrada a la rama `main`).

---

## 📂 Estructura del Proyecto

```text
├── index.html               # Panel principal / Dashboard y KPIs
├── clientes.html            # Gestión e inserción de deudores
├── prestamos.html           # Creación y visualización de planes de crédito
├── pagos.html               # Pasarela interna de recaudo y amortizaciones
├── simulador.html           # Proyecciones aisladas y migración a producción
├── js/
│   ├── supabase-config.js   # Inicialización y llaves de la API de Supabase
│   ├── dashboard.js         # Lógica de analítica y render de gráficos
│   ├── clientes.js          # Controladores y filtros del módulo clientes
│   ├── prestamos.js         # Matemática de desembolsos y cálculo de cuotas
│   ├── pagos.js             # Transacciones parciales y cálculo decreciente
│   └── simulador.js         # Proyección pura de cuotas y migración directa
└── README.md                # Documentación técnica del repositorio



⚙️ Configuración e Instalación Local
Clonar el repositorio:
git clone [https://github.com/SoyEduinRodriguez/controlprestamos.git](https://github.com/SoyEduinRodriguez/controlprestamos.git)
cd controlprestamos

Estructura del Esquema SQL (Supabase):
Asegúrate de tener corriendo en tu SQL Editor las tablas relacionales con soporte para llaves foráneas (FOREIGN KEY) y borrados en cascada (ON DELETE CASCADE):

clientes (id, nombre, telefono, fecha_registro)

prestamos (id, cliente_id, monto_prestado, cantidad_cuotas, valor_cuota_fija, dia_pago_mensual, fecha_inicio, estado)

cuotas (id, prestamo_id, numero_cuota, fecha_vencimiento, monto_total_cuota, capital_cuota, interes_cuota, monto_pagado, estado)

pagos_historial (id, cuota_id, monto_recibido, fecha_pago)

Ejecución:
Al ser un entorno estático sin empaquetadores estrictos de dependencias, puedes desplegarlo localmente abriendo cualquier archivo HTML con la extensión Live Server de VS Code o montarlo directamente en tu proveedor de hosting favorito (Vercel, Netlify, GitHub Pages).

📝 Licencia
Este proyecto fue desarrollado como una solución de software privada y personalizada para optimización de procesos financieros domésticos. Uso libre para fines académicos o adaptaciones de homelabs.
