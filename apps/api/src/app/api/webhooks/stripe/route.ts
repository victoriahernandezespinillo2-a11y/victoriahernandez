// Ruta eliminada: Stripe no se utiliza en el proyecto. Se mantiene archivo para evitar 404 en despliegues antiguos.
export async function POST() {
  return new Response(null, { status: 410 }); // Gone
}




