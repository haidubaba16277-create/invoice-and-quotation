console.log('Environment variables present:');
for (const key of Object.keys(process.env)) {
  if (key.includes('SUPABASE') || key.includes('KEY') || key.includes('URL') || key.includes('SECRET')) {
    console.log(`- ${key}: length ${process.env[key]?.length || 0}`);
  }
}
