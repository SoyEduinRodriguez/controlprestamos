// Configuración de las credenciales de tu proyecto Supabase
const SUPABASE_URL = "https://awasxaaojamhnpwqrtct.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3YXN4YWFvamFtaG5wd3FydGN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MjY0NDUsImV4cCI6MjA5ODUwMjQ0NX0.bic3txP0aDxXmewonayd7xaQmn-cIpC536W_fJLm_qg";

// ASIGNACIÓN DIRECTA (Sin el "const" al principio)
supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Registro de verificación en consola
console.log("Conexión con Supabase inicializada correctamente.");
