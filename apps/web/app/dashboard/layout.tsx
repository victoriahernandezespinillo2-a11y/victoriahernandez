import { auth } from '@repo/auth';
import { redirect } from 'next/navigation';
import { DashboardSidebar } from './components/DashboardSidebar';
import { DashboardHeader } from './components/DashboardHeader';

// Configurar para usar Node.js Runtime en lugar de Edge Runtime
export const runtime = 'nodejs';

export const metadata = {
  title: 'Dashboard - Polideportivo Oroquieta',
  description: 'Panel de usuario del Polideportivo Oroquieta',
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

  // Mock user data - En producción esto vendría de la API
  const user = {
    id: session.user.id || '1',
    email: session.user.email || '',
    name: session.user.name,
    image: session.user.image,
    role: session.user.role || 'user',
    membershipType: 'premium',
    creditsBalance: 150,
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