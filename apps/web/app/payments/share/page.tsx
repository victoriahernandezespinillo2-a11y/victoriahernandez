import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import AutoRedirect from './AutoRedirect';

const WEB_BASE_URL = (process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000').replace(/\/$/, '');
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002').replace(/\/$/, '');
const DEFAULT_IMAGE = new URL('/images/logo.png', WEB_BASE_URL).toString();

type SharePageSearchParams = {
  target?: string;
  court?: string;
  date?: string;
  time?: string;
  duration?: string;
  amount?: string;
};

type SharePageRawSearchParams = Record<string, string | string[] | undefined>;

type SharePageProps = Readonly<{
  searchParams?: Promise<SharePageRawSearchParams>;
}>;

const decode = (value?: string) => {
  try {
    return value ? decodeURIComponent(value) : undefined;
  } catch {
    return value;
  }
};

const ensureAbsoluteUrl = (value?: string | null) => {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
  } catch {
    // noop
  }
  return null;
};

const normalizeSearchParams = (raw?: SharePageRawSearchParams): SharePageSearchParams => {
  if (!raw) return {};
  const pickFirst = (value?: string | string[]) =>
    Array.isArray(value) ? value[0] : value;

  return {
    target: pickFirst(raw.target),
    court: pickFirst(raw.court),
    date: pickFirst(raw.date),
    time: pickFirst(raw.time),
    duration: pickFirst(raw.duration),
    amount: pickFirst(raw.amount),
  };
};

const resolveSearchParams = async (
  searchParams?: Promise<SharePageRawSearchParams>,
): Promise<SharePageSearchParams> => {
  if (!searchParams) return {};
  try {
    const raw = await searchParams;
    return normalizeSearchParams(raw ?? {});
  } catch {
    return {};
  }
};

export async function generateMetadata({ searchParams }: SharePageProps): Promise<Metadata> {
  const resolved = await resolveSearchParams(searchParams);

  const court = decode(resolved.court);
  const date = decode(resolved.date);
  const time = decode(resolved.time);
  const amount = decode(resolved.amount);

  const titleParts = ['Completa tu pago'];
  if (court) titleParts.push(court);
  const title = `${titleParts.join(' · ')} | Polideportivo Victoria Hernández`;

  const descriptionSegments: string[] = [];
  if (court) descriptionSegments.push(`Cancha ${court}`);
  if (date) descriptionSegments.push(date);
  if (time) descriptionSegments.push(`Hora ${time}`);
  if (amount) descriptionSegments.push(`Importe ${amount}`);
  const description =
    descriptionSegments.length > 0
      ? `${descriptionSegments.join(' • ')}. Finaliza tu pago de manera segura.`
      : 'Finaliza tu pago con un solo clic en el Polideportivo Victoria Hernández.';

  const pageUrl = `${WEB_BASE_URL}/payments/share`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: 'Polideportivo Victoria Hernández',
      type: 'website',
      images: [
        {
          url: DEFAULT_IMAGE,
          width: 1200,
          height: 630,
          alt: 'Polideportivo Victoria Hernández',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [DEFAULT_IMAGE],
    },
  };
}

export default async function PaymentSharePage({ searchParams }: SharePageProps) {
  const resolved = await resolveSearchParams(searchParams);

  const target = ensureAbsoluteUrl(decode(resolved.target));
  const court = decode(resolved.court);
  const date = decode(resolved.date);
  const time = decode(resolved.time);
  const duration = decode(resolved.duration);
  const amount = decode(resolved.amount);

  const fallbackRedirect = target ?? `${API_BASE_URL}/api/payments/redsys/redirect`;

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center px-4 py-16">
      <AutoRedirect url={target} delay={2500} />
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-blue-100 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8 text-white text-center">
          <div className="flex items-center justify-center mb-4">
            <Image src="/images/logo.png" alt="Polideportivo Victoria Hernández" width={72} height={72} className="rounded-xl bg-white/90 p-2" />
          </div>
          <h1 className="text-2xl font-bold">Completa tu pago</h1>
          <p className="text-blue-100 mt-2">Redirigiéndote al TPV seguro en unos segundos…</p>
        </div>

        <div className="px-6 py-8 space-y-4">
          <div className="space-y-2 text-gray-700">
            {court && (
              <p>
                <span className="font-semibold">Cancha:</span> {court}
              </p>
            )}
            {date && (
              <p>
                <span className="font-semibold">Fecha:</span> {date}
              </p>
            )}
            {time && (
              <p>
                <span className="font-semibold">Hora:</span> {time}
              </p>
            )}
            {duration && (
              <p>
                <span className="font-semibold">Duración:</span> {duration}
              </p>
            )}
            {amount && (
              <p>
                <span className="font-semibold">Total:</span> {amount}
              </p>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 text-sm text-blue-700">
            Si no eres redirigido automáticamente, toca el botón para continuar con el pago.
          </div>

          {target ? (
            <Link
              href={target}
              className="block text-center w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl shadow-lg transition-colors"
            >
              Ir al TPV Seguro
            </Link>
          ) : (
            <Link
              href={fallbackRedirect}
              className="block text-center w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl shadow-lg transition-colors"
            >
              Ir al TPV Seguro
            </Link>
          )}
        </div>

        <div className="px-6 py-4 bg-gray-50 text-xs text-gray-500 text-center">
          Polideportivo Victoria Hernández • Pagos protegidos por Redsys
        </div>
      </div>
    </main>
  );
}

