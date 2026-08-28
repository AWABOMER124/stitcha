import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, BookOpen, Clock } from 'lucide-react';
import { LocaleProvider } from '@/lib/i18n/context';
import { PublicFooter, PublicHeader } from '@/components/marketing/public-chrome';
import { getPublicPageContext } from '@/lib/marketing/public-context';
import { blogPosts } from '@/content/blog-posts';

export const metadata: Metadata = {
  title: 'مدونة وصلة',
  description: 'أدلة عملية للتجارة الإلكترونية وإدارة المتاجر والمدفوعات والتوصيل في السودان.',
};

export default async function BlogPage() {
  const ctx = await getPublicPageContext();
  return <LocaleProvider initialLocale={ctx.locale}><div className="min-h-screen bg-[#f8faf9] text-[#07111f] dark:bg-[#07111f] dark:text-white">
    <PublicHeader {...ctx} />
    <main>
      <section className="border-b border-slate-200 bg-white dark:border-white/10 dark:bg-[#07111f]">
        <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#b9e4da] bg-[#edf9f6] px-4 py-2 text-sm font-bold text-[#087d82]"><BookOpen className="h-4 w-4" />معرفة تنفع تجارتك</span>
          <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">أفكار وأدلة عملية لبناء متجر أقوى</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">محتوى واضح للتاجر السوداني: من تجهيز أول منتج إلى تنظيم الدفع والتوصيل وخدمة العملاء.</p>
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-14 md:grid-cols-2 lg:grid-cols-3 lg:px-8 lg:py-20">
        {blogPosts.map((post, index) => <article key={post.slug} className="flex min-h-[330px] flex-col rounded-3xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:border-[#7fcabc] dark:border-white/10 dark:bg-white/5">
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl font-black ${index === 0 ? 'bg-[#087d82] text-white' : 'bg-[#e9f7f4] text-[#087d82]'}`}>0{index + 1}</div>
          <p className="mt-6 text-xs font-bold text-[#087d82]">{post.category}</p>
          <h2 className="mt-3 text-xl font-black leading-8">{post.title}</h2>
          <p className="mt-3 flex-1 text-sm leading-7 text-slate-600 dark:text-slate-300">{post.excerpt}</p>
          <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5 text-xs text-slate-500 dark:border-white/10"><span className="flex items-center gap-1"><Clock className="h-4 w-4" />{post.readingMinutes} دقائق</span><Link href={`/blog/${post.slug}`} className="flex items-center gap-1 font-bold text-[#087d82]">اقرأ المقال<ArrowLeft className="h-4 w-4" /></Link></div>
        </article>)}
      </section>
    </main>
    <PublicFooter locale={ctx.locale} />
  </div></LocaleProvider>;
}
