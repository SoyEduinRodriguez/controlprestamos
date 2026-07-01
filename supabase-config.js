// Configuración de las credenciales de tu proyecto Supabase
const SUPABASE_URL = "https://awasxaaojamhnpwqrtct.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3YXN4YWFvamFtaG5wd3FydGN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MjY0NDUsImV4cCI6MjA5ODUwMjQ0NX0.bic3txP0aDxXmewonayd7xaQmn-cIpC536W_fJLm_qg";

// Inicializar el cliente de Supabase de manera global
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Exportar de forma implícita para que otros scripts lo usen en el navegador
console.log("Conexión con Supabase inicializada correctamente.");
