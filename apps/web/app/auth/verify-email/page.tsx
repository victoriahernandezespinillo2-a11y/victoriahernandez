'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, AlertCircle, ArrowLeft, Mail, Loader2 } from 'lucide-react';

function VerifyEmailContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
    const [errorMessage, setErrorMessage] = useState<string>('');

    useEffect(() => {
        const verifyEmail = async () => {
            if (!token) {
                setStatus('error');
                setErrorMessage('No se proporcionó un token de verificación. Verifica el enlace del email.');
                return;
            }

            try {
                const response = await fetch('/api/auth/verify-email', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ token }),
                });

                const data = await response.json();

                if (response.ok) {
                    setStatus('success');
                } else {
                    setStatus('error');
                    setErrorMessage(
                        data.error || 'El token de verificación es inválido o ha expirado.'
                    );
                }
            } catch (err) {
                setStatus('error');
                setErrorMessage('Error de conexión con el servidor. Intenta nuevamente más tarde.');
            }
        };

        verifyEmail();
    }, [token]);

    if (status === 'verifying') {
        return (
            <div className="w-full text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-6">
                    <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Verificando tu email...
                </h2>
                <p className="text-gray-600">
                    Por favor espera mientras verificamos tu dirección de correo electrónico.
                </p>
            </div>
        );
    }

    if (status === 'success') {
        return (
            <div className="w-full text-center">
                <div className="mb-8">
                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">
                        ¡Email Verificado!
                    </h2>
                    <p className="text-gray-600 mb-6">
                        Tu dirección de correo electrónico ha sido verificada exitosamente.
                        Ya puedes iniciar sesión con tu cuenta.
                    </p>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                        <p className="text-green-800 text-sm">
                            <strong>✅ Verificación completa.</strong> Tu cuenta está activa y lista para usar.
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    <Link
                        href="/auth/signin"
                        className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                        Iniciar Sesión
                    </Link>
                </div>
            </div>
        );
    }

    // Error state
    return (
        <div className="w-full text-center">
            <div className="mb-8">
                <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    Error de Verificación
                </h2>
                <p className="text-gray-600 mb-6">
                    {errorMessage}
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                    <p className="text-yellow-800 text-sm">
                        <strong>¿Qué puedes hacer?</strong>
                    </p>
                    <ul className="text-yellow-700 text-sm mt-2 text-left list-disc list-inside space-y-1">
                        <li>Si el enlace expiró, intenta iniciar sesión y se te enviará un nuevo email de verificación</li>
                        <li>Revisa que el enlace esté completo (a veces los clientes de email lo cortan)</li>
                        <li>Si el problema persiste, contacta al soporte</li>
                    </ul>
                </div>
            </div>

            <div className="space-y-4">
                <Link
                    href="/auth/signin"
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-500 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Ir al inicio de sesión
                </Link>
            </div>
        </div>
    );
}

export default function VerifyEmailPage() {
    return (
        <Suspense
            fallback={
                <div className="w-full text-center py-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-6">
                        <Mail className="h-8 w-8 text-blue-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        Verificación de Email
                    </h2>
                    <p className="text-gray-600">Cargando...</p>
                </div>
            }
        >
            <VerifyEmailContent />
        </Suspense>
    );
}
