1. Instalacion

## ⚙️ Guía de Instalación y Despliegue Local

Sigue estos pasos para clonar el proyecto, configurar el entorno estático y enlazar la base de datos en la nube.

### 1. Clonar el Repositorio
Abre tu terminal y ejecuta los siguientes comandos para descargar el código fuente y ubicarte en el directorio raíz del proyecto:
```bash
git clone [https://github.com/SoyEduinRodriguez/controlprestamos.git](https://github.com/SoyEduinRodriguez/controlprestamos.git)
cd controlprestamos

2. El frontend se comunica directamente con la API de Supabase de manera asíncrona. Abre el archivo localizado en js/supabase-config.js e inyecta la URL de tu proyecto y tu clave pública anónima (anon public):

// js/supabase-config.js
const SUPABASE_URL = "[https://tu-proyecto-id.supabase.co](https://tu-proyecto-id.supabase.co)";
const SUPABASE_ANON_KEY = "tu-clave-anon-publica-jwt";

// Inicialización global del cliente de Supabase
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

3. Ejecución en Entorno Local
Dado que el proyecto está estructurado como una aplicación web estática pura (sin empaquetadores como Webpack, Vite o Node.js complejos), no requiere de un comando de instalación como npm install.

Opción A (Recomendada): Abre la carpeta del proyecto en VS Code, haz clic derecho sobre index.html y selecciona Open with Live Server.

Opción B: Puedes arrastrar el archivo index.html directamente a cualquier pestaña de tu navegador web para visualizarlo de inmediato.

4. Despliegue a Producción (Vercel)
El proyecto está optimizado para compilar en segundos en Vercel de forma automática:

Conecta tu cuenta de GitHub con Vercel.

Selecciona el repositorio controlprestamos.

Deja los comandos de compilación (Build Commands) por defecto vacíos.

Presiona Deploy. Cada vez que hagas un git push a la rama main, Vercel actualizará la plataforma en vivo en milisegundos.

---

### 2. Bloque de Script de Base de Datos (`database.sql`)

Copia y ejecuta este script completo directamente dentro del **SQL Editor** de tu consola de Supabase. Este script creará la arquitectura relacional exacta que consume la aplicación:

```sql
-- =========================================================================
-- SCRIPT SQL: ARQUITECTURA DE BASE DE DATOS - CONTROL DE PRÉSTAMOS
-- MOTOR: PostgreSQL (Supabase BaaS)
-- =========================================================================

-- 1. TABLA MAESTRA DE CLIENTES (DEUDORES)
CREATE TABLE IF NOT EXISTS clientes (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    telefono VARCHAR(50) NOT NULL,
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABLA DE CABECERA DE PRÉSTAMOS
-- Controla la metadata general del crédito desembolsado.
-- Incluye ON DELETE CASCADE: Si se borra un cliente, limpia sus créditos asociados.
CREATE TABLE IF NOT EXISTS prestamos (
    id SERIAL PRIMARY KEY,
    cliente_id INT REFERENCES clientes(id) ON DELETE CASCADE NOT NULL,
    monto_prestado DECIMAL(12, 2) NOT NULL,
    cantidad_cuotas INT NOT NULL,
    valor_cuota_fija DECIMAL(12, 2) NOT NULL,
    dia_pago_mensual INT NOT NULL CHECK (dia_pago_mensual >= 1 AND dia_pago_mensual <= 31),
    fecha_inicio DATE NOT NULL,
    estado VARCHAR(50) DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO', 'FINALIZADO')),
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABLA DEL PLAN DETALLADO DE CUOTAS
-- Segmentación exacta por cuota individual para calcular capital e interés.
-- ON DELETE CASCADE: Si se elimina un préstamo, purga su plan de cuotas automáticamente.
CREATE TABLE IF NOT EXISTS cuotas (
    id SERIAL PRIMARY KEY,
    prestamo_id INT REFERENCES prestamos(id) ON DELETE CASCADE NOT NULL,
    numero_cuota INT NOT NULL,
    fecha_vencimiento DATE NOT NULL,
    monto_total_cuota DECIMAL(12, 2) NOT NULL,
    capital_cuota DECIMAL(12, 2) NOT NULL,
    interes_cuota DECIMAL(12, 2) NOT NULL,
    monto_pagado DECIMAL(12, 2) DEFAULT 0.00,
    estado VARCHAR(50) DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'ABONADO', 'PAGADO'))
);

-- 4. TABLA DE HISTORIAL DE PAGOS / TRANSACCIONES
-- Registro de auditoría cronológica de cada abono físico recibido.
-- ON DELETE CASCADE: Si se purga una cuota, elimina su histórico de recaudos vinculados.
CREATE TABLE IF NOT EXISTS pagos_historial (
    id SERIAL PRIMARY KEY,
    cuota_id INT REFERENCES cuotas(id) ON DELETE CASCADE NOT NULL,
    monto_recibido DECIMAL(12, 2) NOT NULL,
    fecha_pago TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================================
-- CONFIGURACIÓN DE SEGURIDAD (IMPORTANTE PARA OPERACIÓN EN PRODUCCIÓN)
-- Si planeas deshabilitar las políticas estrictas de RLS para el uso público:
-- ALTER TABLE clientes DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE prestamos DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE cuotas DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE pagos_historial DISABLE ROW LEVEL SECURITY;
-- =========================================================================


