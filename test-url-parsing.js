const databaseUrl = "postgresql://postgres:gYcTjJo2N7wWW8ut@db.rcknclvzxheitotnhmhn.supabase.co:5432/postgres";

console.log('URL original:', databaseUrl);

// Probar la expresión regular
const urlMatch = databaseUrl.match(/postgresql:\/\/postgres:([^@]+)@db\.([^.]+)\.supabase\.co/);
console.log('Match result:', urlMatch);

if (urlMatch) {
  const [, password, projectRef] = urlMatch;
  console.log('Password:', password);
  console.log('Project Ref:', projectRef);
  console.log('Supabase URL:', `https://${projectRef}.supabase.co`);
} else {
  console.log('No match found');
  
  // Probar una regex más simple
  const simpleMatch = databaseUrl.match(/db\.([^.]+)\.supabase\.co/);
  console.log('Simple match:', simpleMatch);
  
  // Probar extraer manualmente
  const parts = databaseUrl.split('@');
  console.log('Parts:', parts);
  
  if (parts[1]) {
    const hostPart = parts[1].split(':')[0];
    console.log('Host part:', hostPart);
  }
}