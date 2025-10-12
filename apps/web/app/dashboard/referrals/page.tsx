'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { ShareIcon, UserPlusIcon, GiftIcon, ClipboardDocumentIcon, DevicePhoneMobileIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { apiRequest } from '@/lib/api';

interface ReferralStats {
  totalReferrals: number;
  totalCreditsEarned: number;
  recentReferrals: Array<{
    id: string;
    name: string;
    email: string;
    joinedAt: string;
  }>;
  referralBonuses: Array<{
    id: string;
    promotionName: string;
    creditsAwarded: number;
    appliedAt: string;
    referredUserId: string;
  }>;
}

interface ReferralLink {
  referralCode: string;
  referralLinks: {
    direct: string;
    share: string;
    code: string;
  };
  user: {
    id: string;
    name: string;
  };
}

export default function ReferralsPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [referralLink, setReferralLink] = useState<ReferralLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user) {
      loadReferralData();
    }
  }, [session]);

  const loadReferralData = async () => {
    try {
      setLoading(true);
      
      console.log('🔄 [REFERRALS] Cargando datos de referidos...');
      
      // Usar apiRequest que maneja autenticación automáticamente
      const [statsData, linkData] = await Promise.all([
        apiRequest<ReferralStats>('/api/referrals/stats'),
        apiRequest<ReferralLink>('/api/referrals/generate-link')
      ]);

      console.log('✅ [REFERRALS] Datos recibidos:', { stats: !!statsData, link: !!linkData });
      console.log('🔍 [REFERRALS] Stats data completo:', statsData);
      console.log('🔍 [REFERRALS] Link data completo:', linkData);
      console.log('🔍 [REFERRALS] Stats data:', statsData);
      console.log('🔍 [REFERRALS] Link data:', linkData);

      // Los datos ya vienen procesados por apiRequest, no necesitamos .data
      if (statsData) {
        setStats(statsData);
        console.log('📊 [REFERRALS] Stats establecido:', statsData);
      }

      if (linkData) {
        setReferralLink(linkData);
        console.log('📝 [REFERRALS] ReferralLink establecido:', linkData);
      }
    } catch (error) {
      console.error('❌ [REFERRALS] Error cargando datos:', error);
      toast.error('Error cargando datos de referidos');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async (link: string, type: string) => {
    try {
      setCopying(type);
      await navigator.clipboard.writeText(link);
      toast.success(`${type === 'direct' ? 'Enlace directo' : type === 'share' ? 'Enlace de invitación' : 'Código'} copiado al portapapeles`);
    } catch (error) {
      toast.error('Error al copiar enlace');
    } finally {
      setCopying(null);
    }
  };

  const handleShareWhatsApp = () => {
    if (!referralLink?.referralLinks?.share) return;
    
    const message = encodeURIComponent(
      `¡Hola! Te invito a unirte al Polideportivo Victoria Hernández. ` +
      `Usa mi código de referido ${referralLink.referralCode} al registrarte y ambos ganaremos créditos. ` +
      `¡Regístrate aquí: ${referralLink.referralLinks.share}`
    );
    
    const whatsappUrl = `https://wa.me/?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleShareEmail = () => {
    if (!referralLink?.referralLinks?.share) return;
    
    const subject = encodeURIComponent('¡Únete al Polideportivo Victoria Hernández!');
    const body = encodeURIComponent(
      `¡Hola!\n\n` +
      `Te invito a unirte al Polideportivo Victoria Hernández. ` +
      `Es un lugar increíble para hacer deporte y mantenerte activo.\n\n` +
      `Usa mi código de referido: ${referralLink.referralCode}\n` +
      `O haz clic en este enlace: ${referralLink.referralLinks.share}\n\n` +
      `Cuando te registres, ambos ganaremos créditos que puedes usar para reservar canchas y actividades.\n\n` +
      `¡Espero verte pronto!\n` +
      `Un saludo`
    );
    
    const mailtoUrl = `mailto:?subject=${subject}&body=${body}`;
    window.location.href = mailtoUrl;
  };

  const handleShareTwitter = () => {
    if (!referralLink?.referralLinks?.share) return;
    
    const text = encodeURIComponent(
      `¡Únete al Polideportivo Victoria Hernández! Usa mi código ${referralLink.referralCode} y ambos ganaremos créditos. `
    );
    const url = encodeURIComponent(referralLink.referralLinks.share);
    
    const twitterUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
    window.open(twitterUrl, '_blank');
  };

  const handleShareFacebook = () => {
    if (!referralLink?.referralLinks?.share) return;
    
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink.referralLinks.share)}`;
    window.open(facebookUrl, '_blank');
  };

  const handleNativeShare = async () => {
    if (!referralLink?.referralLinks?.share) return;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: '¡Únete al Polideportivo Victoria Hernández!',
          text: `¡Hola! Te invito a unirte al Polideportivo Victoria Hernández. Usa mi código de referido ${referralLink.referralCode} al registrarte y ambos ganaremos créditos.`,
          url: referralLink.referralLinks.share,
        });
        toast.success('¡Compartido exitosamente!');
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Error compartiendo:', error);
          toast.error('Error al compartir');
        }
      }
    } else {
      // Fallback: copiar al portapapeles
      await handleCopyLink(referralLink.referralLinks.share, 'share');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando referidos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 pb-24">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Invita Amigos y Gana Créditos
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Comparte tu enlace de referido y gana créditos cada vez que un amigo se registre
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <UserPlusIcon className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {stats?.totalReferrals || 0}
            </h3>
            <p className="text-gray-600">Amigos Invitados</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <GiftIcon className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {stats?.totalCreditsEarned || 0}
            </h3>
            <p className="text-gray-600">Créditos Ganados</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <ShareIcon className="h-12 w-12 text-purple-600 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {loading ? 'Cargando...' : (referralLink?.referralCode || 'N/A')}
            </h3>
            <p className="text-gray-600">Tu Código</p>
          </div>
        </div>

        {/* Referral Link Section */}
        {referralLink && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Comparte tu Enlace de Referido
            </h2>
            
            <div className="space-y-4">
              {/* Direct Link */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enlace Directo
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={referralLink.referralLinks.direct}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
                  />
                  <button
                    onClick={() => handleCopyLink(referralLink.referralLinks.direct, 'direct')}
                    disabled={copying === 'direct'}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    <ClipboardDocumentIcon className="h-4 w-4" />
                    {copying === 'direct' ? 'Copiando...' : 'Copiar'}
                  </button>
                </div>
              </div>

              {/* Share Link */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enlace de Invitación
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={referralLink.referralLinks.share}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
                  />
                  <button
                    onClick={() => handleCopyLink(referralLink.referralLinks.share, 'share')}
                    disabled={copying === 'share'}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    <ClipboardDocumentIcon className="h-4 w-4" />
                    {copying === 'share' ? 'Copiando...' : 'Copiar'}
                  </button>
                </div>
              </div>

              {/* Referral Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tu Código de Referido
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={referralLink.referralCode}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm font-mono text-center"
                  />
                  <button
                    onClick={() => handleCopyLink(referralLink.referralCode, 'code')}
                    disabled={copying === 'code'}
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    <ClipboardDocumentIcon className="h-4 w-4" />
                    {copying === 'code' ? 'Copiando...' : 'Copiar'}
                  </button>
                </div>
              </div>
            </div>

            {/* Share Buttons */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                📤 Compartir con Amigos
              </h3>
              
              {/* Native Share Button (Mobile) */}
              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <div className="mb-4">
                  <button
                    onClick={handleNativeShare}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg"
                  >
                    <ShareIcon className="h-5 w-5" />
                    <span className="font-medium">Compartir</span>
                  </button>
                  <p className="text-xs text-gray-500 text-center mt-2">
                    Usa el menú nativo de compartir de tu dispositivo
                  </p>
                </div>
              )}
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* WhatsApp */}
                <button
                  onClick={handleShareWhatsApp}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <DevicePhoneMobileIcon className="h-5 w-5" />
                  <span className="text-sm font-medium">WhatsApp</span>
                </button>

                {/* Email */}
                <button
                  onClick={handleShareEmail}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <EnvelopeIcon className="h-5 w-5" />
                  <span className="text-sm font-medium">Email</span>
                </button>

                {/* Twitter */}
                <button
                  onClick={handleShareTwitter}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  <span className="text-sm font-medium">Twitter</span>
                </button>

                {/* Facebook */}
                <button
                  onClick={handleShareFacebook}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  <span className="text-sm font-medium">Facebook</span>
                </button>
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="text-sm font-medium text-blue-900 mb-2">
                💡 Cómo funciona:
              </h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Comparte tu enlace o código con amigos</li>
                <li>• Cuando se registren usando tu enlace, recibirás créditos automáticamente</li>
                <li>• Los créditos se acreditan cuando tu amigo complete el registro</li>
                <li>• Puedes ver tus ganancias en el historial de promociones</li>
              </ul>
            </div>
          </div>
        )}

        {/* Recent Referrals */}
        {stats && stats.recentReferrals.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Amigos Recientes
            </h2>
            <div className="space-y-3">
              {stats.recentReferrals.map((referral) => (
                <div key={referral.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{referral.name}</p>
                    <p className="text-sm text-gray-600">{referral.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">
                      {new Date(referral.joinedAt).toLocaleDateString('es-ES')}
                    </p>
                    <p className="text-xs text-green-600 font-medium">¡Registrado!</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Referral Bonuses */}
        {stats && stats.referralBonuses.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Créditos Ganados por Referidos
            </h2>
            <div className="space-y-3">
              {stats.referralBonuses.map((bonus) => (
                <div key={bonus.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{bonus.promotionName}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(bonus.appliedAt).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">
                      +{bonus.creditsAwarded} créditos
                    </p>
                    <p className="text-xs text-gray-600">Por referido</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
