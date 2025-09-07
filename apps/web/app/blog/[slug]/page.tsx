import { notFound } from 'next/navigation';

async function getPost(slug: string) {
  const base = process.env.NEXT_PUBLIC_API_URL ?? '';
  const url = base ? `${base}/api/blog/${slug}` : `/api/blog/${slug}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return null;
  const json = await res.json();
  return json.post ?? json;
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return notFound();

  const publishedAt = post.publishedAt || post.createdAt;
  const dateStr = publishedAt ? new Date(publishedAt).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) : '';

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <article>
        <header className="mb-8">
          <div className="flex items-center gap-3 text-sm text-gray-500">
            {post.categories?.[0]?.category?.name && (
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
                {post.categories[0].category.name}
              </span>
            )}
            {publishedAt && <time>{dateStr}</time>}
          </div>
          <h1 className="mt-3 text-3xl sm:text-4xl font-bold text-gray-900">{post.title}</h1>
          {post.excerpt && <p className="mt-3 text-gray-600">{post.excerpt}</p>}
        </header>

        {post.featuredImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.featuredImage} alt={post.title} className="w-full rounded-2xl mb-8" />
        )}

        <div className="prose prose-gray max-w-none">
          <div dangerouslySetInnerHTML={{ __html: post.content || '' }} />
        </div>
      </article>
    </main>
  );
}

export const dynamic = 'force-dynamic';

