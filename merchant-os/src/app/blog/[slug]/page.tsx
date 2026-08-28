import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Clock } from 'lucide-react';
import { notFound } from 'next/navigation';
import { LocaleProvider } from '@/lib/i18n/context';
import { PublicFooter, PublicHeader } from '@/components/marketing/public-chrome';
import { getPublicPageContext } from '@/lib/marketing/public-context';
import { blogPosts, getBlogPost } from '@/content/blog-posts';

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const post = getBlogPost((await params).slug);
  return post ? { title: post.title, description: post.excerpt } : {};
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const post = getBlogPost((await params).slug);
  if (!post) notFound();
  const ctx = await getPublicPageContext();
  return <LocaleProvider initialLocale={ctx.locale}><div className="min-h-screen bg-[#f8faf9] text-[#07111f] dark:bg-[#07111f] dark:text-white">
    <PublicHeader {...ctx} />
    <main className="mx-auto max-w-4xl px-5 py-14 lg:px-8 lg:py-20">
      <Link href="/blog" className="inline-flex items-center gap-2 text-sm font-bold text-[#087d82]"><ArrowRight className="h-4 w-4" />العودة للمدونة</Link>
      <header className="mt-8 border-b border-slate-200 pb-10 dark:border-white/10">
        <p className="text-sm font-bold text-[#087d82]">{post.category}</p>
        <h1 className="mt-4 text-4xl font-black leading-[1.3] tracking-tight sm:text-5xl">{post.title}</h1>
        <p className="mt-5 text-lg leading-8 text-slate-600 dark:text-slate-300">{post.excerpt}</p>
        <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-slate-500"><time dateTime={post.publishedAt}>{new Date(post.publishedAt).toLocaleDateString('ar-SD', { year: 'numeric', month: 'long', day: 'numeric' })}</time><span className="flex items-center gap-1"><Clock className="h-4 w-4" />{post.readingMinutes} دقائق قراءة</span></div>
      </header>
      <article className="py-10">{post.content.map((section) => <section key={section.heading} className="mb-10"><h2 className="text-2xl font-black">{section.heading}</h2><div className="mt-4 space-y-4">{section.paragraphs.map((paragraph) => <p key={paragraph} className="text-[17px] leading-9 text-slate-700 dark:text-slate-300">{paragraph}</p>)}</div></section>)}</article>
      <aside className="rounded-3xl border border-[#b9e4da] bg-[#edf9f6] p-7 dark:border-emerald-400/20 dark:bg-emerald-400/10"><h2 className="text-2xl font-black">طبّق الخطوات في متجرك</h2><p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">أنشئ متجر وصلة مجاناً ونظّم منتجاتك وطلباتك ومدفوعاتك من لوحة واحدة.</p><Link href={ctx.accountHref} className="mt-5 inline-flex rounded-xl bg-[#087d82] px-5 py-3 text-sm font-bold text-white">ابدأ مجاناً</Link></aside>
    </main>
    <PublicFooter locale={ctx.locale} />
  </div></LocaleProvider>;
}
