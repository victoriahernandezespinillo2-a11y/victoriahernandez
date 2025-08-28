import { authWeb as auth } from '@repo/auth';
import { redirect } from 'next/navigation';
import { DashboardSidebar } from './components/DashboardSidebar';
import { DashboardHeader } from './components/DashboardHeader';



// Configurar para usar Node.js Runtime en lugar de Edge Runtime
export const runtime = 'nodejs';

export const metadata = {
  title: 'Dashboard - Polideportivo Victoria Hernandez',
  description: 'Panel de usuario del Polideportivo Victoria Hernandez',
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/signin');
  }

  // Los datos dinámicos como créditos se obtendrán del lado del cliente
  const user = {
    id: session.user.id || '1',
    email: session.user.email || '',
    name: session.user.name,
    image: session.user.image,
    role: session.user.role || 'user',
    membershipType: session.user.membershipType || 'basic',
    creditsBalance: session.user.creditsBalance || 0,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <DashboardSidebar />

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Header */}
        <DashboardHeader user={user} />

        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}