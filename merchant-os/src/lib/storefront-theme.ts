export const STOREFRONT_SECTIONS = ['announcement', 'hero', 'trust', 'categories', 'featured', 'products', 'testimonials', 'social'] as const;
export type StorefrontSection = typeof STOREFRONT_SECTIONS[number];
export type HeroStyle = 'centered' | 'split' | 'immersive';
export type ProductCardStyle = 'soft' | 'bordered' | 'minimal';

export type StorefrontTheme = {
  templateId: string;
  primaryColor: string;
  accentColor: string;
  surfaceColor: string;
  sectionOrder: StorefrontSection[];
  hiddenSections: StorefrontSection[];
  heroStyle: HeroStyle;
  productCardStyle: ProductCardStyle;
  announcementText: string;
  heroTitle: string;
  heroSubtitle: string;
  heroCtaLabel: string;
  trustItems: string[];
  testimonialQuote: string;
  testimonialName: string;
};

export type StorefrontTemplate = {
  id: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  preview: string;
  theme: StorefrontTheme;
};

const ORDER: StorefrontSection[] = ['announcement', 'hero', 'trust', 'categories', 'featured', 'products', 'testimonials', 'social'];

export const STOREFRONT_TEMPLATES: StorefrontTemplate[] = [
  {
    id: 'wasla-modern', nameAr: 'وصلة مودرن', nameEn: 'Wasla Modern', preview: 'linear-gradient(135deg,#07111f,#13c4a3)',
    descriptionAr: 'قالب متوازن يناسب أغلب المتاجر', descriptionEn: 'A balanced template for most stores',
    theme: { templateId: 'wasla-modern', primaryColor: '#0f766e', accentColor: '#3b82f6', surfaceColor: '#f8fafc', sectionOrder: ORDER, hiddenSections: [], heroStyle: 'split', productCardStyle: 'soft', announcementText: 'توصيل سريع وعروض مختارة كل يوم', heroTitle: 'كل ما تحتاجه، أقرب إليك', heroSubtitle: 'تسوق بسهولة واستلم طلبك بالطريقة التي تناسبك.', heroCtaLabel: 'تسوق الآن', trustItems: ['دفع آمن', 'خدمة موثوقة', 'طلب سريع'], testimonialQuote: 'تجربة طلب سهلة ومنظمة من البداية للنهاية.', testimonialName: 'أحد عملائنا' },
  },
  {
    id: 'boutique-elegant', nameAr: 'بوتيك أنيق', nameEn: 'Elegant Boutique', preview: 'linear-gradient(135deg,#3f2b45,#d4a373)',
    descriptionAr: 'مساحات هادئة وعرض فاخر للمنتجات', descriptionEn: 'Calm spacing and premium product presentation',
    theme: { templateId: 'boutique-elegant', primaryColor: '#7c3f58', accentColor: '#d4a373', surfaceColor: '#fffaf6', sectionOrder: ['announcement','hero','featured','categories','products','testimonials','trust','social'], hiddenSections: [], heroStyle: 'immersive', productCardStyle: 'minimal', announcementText: 'تشكيلة منتقاة بعناية', heroTitle: 'تفاصيل صنعت لتلفت النظر', heroSubtitle: 'اكتشف أحدث المنتجات والقطع المختارة لمتجرك.', heroCtaLabel: 'اكتشف المجموعة', trustItems: ['جودة مختارة', 'تغليف أنيق', 'دعم مباشر'], testimonialQuote: 'الجودة أجمل من الصور، والتجربة راقية جداً.', testimonialName: 'عميلة المتجر' },
  },
  {
    id: 'food-fast', nameAr: 'مطعم سريع', nameEn: 'Fast Food', preview: 'linear-gradient(135deg,#7f1d1d,#f59e0b)',
    descriptionAr: 'أزرار واضحة ومنتجات بارزة للطلبات السريعة', descriptionEn: 'Clear actions and bold products for quick ordering',
    theme: { templateId: 'food-fast', primaryColor: '#b91c1c', accentColor: '#f59e0b', surfaceColor: '#fff7ed', sectionOrder: ['announcement','hero','categories','featured','products','trust','testimonials','social'], hiddenSections: [], heroStyle: 'centered', productCardStyle: 'bordered', announcementText: 'اطلب الآن — التحضير يبدأ فور تأكيد الطلب', heroTitle: 'وجبتك المفضلة جاهزة للطلب', heroSubtitle: 'اختر، خصص طلبك، واستلمه ساخناً.', heroCtaLabel: 'شاهد المنيو', trustItems: ['مكونات طازجة', 'تحضير سريع', 'تغليف محكم'], testimonialQuote: 'الطلب وصل سريعاً والأكل كان ممتازاً.', testimonialName: 'عميل المطعم' },
  },
];

function text(value: unknown, fallback: string, max = 180) {
  return typeof value === 'string' ? value.trim().slice(0, max) || fallback : fallback;
}
function color(value: unknown, fallback: string) {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}
function sectionList(value: unknown, fallback: StorefrontSection[]) {
  if (!Array.isArray(value)) return fallback;
  const valid = value.filter((item): item is StorefrontSection => STOREFRONT_SECTIONS.includes(item as StorefrontSection));
  return [...new Set(valid), ...STOREFRONT_SECTIONS.filter(item => !valid.includes(item))];
}

export function normalizeStorefrontTheme(value: unknown, merchantName: string): StorefrontTheme {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const template = STOREFRONT_TEMPLATES.find(item => item.id === source.templateId) ?? STOREFRONT_TEMPLATES[0];
  const base = template.theme;
  const hidden = Array.isArray(source.hiddenSections)
    ? source.hiddenSections.filter((item): item is StorefrontSection => STOREFRONT_SECTIONS.includes(item as StorefrontSection))
    : base.hiddenSections;
  const trustItems = Array.isArray(source.trustItems) ? source.trustItems.filter(item => typeof item === 'string').slice(0, 3) as string[] : base.trustItems;
  return {
    templateId: text(source.templateId, base.templateId, 40),
    primaryColor: color(source.primaryColor, base.primaryColor),
    accentColor: color(source.accentColor, base.accentColor),
    surfaceColor: color(source.surfaceColor, base.surfaceColor),
    sectionOrder: sectionList(source.sectionOrder, base.sectionOrder),
    hiddenSections: [...new Set(hidden)],
    heroStyle: ['centered', 'split', 'immersive'].includes(String(source.heroStyle)) ? source.heroStyle as HeroStyle : base.heroStyle,
    productCardStyle: ['soft', 'bordered', 'minimal'].includes(String(source.productCardStyle)) ? source.productCardStyle as ProductCardStyle : base.productCardStyle,
    announcementText: text(source.announcementText, base.announcementText),
    heroTitle: text(source.heroTitle, `مرحباً بك في ${merchantName}`),
    heroSubtitle: text(source.heroSubtitle, base.heroSubtitle, 260),
    heroCtaLabel: text(source.heroCtaLabel, base.heroCtaLabel, 40),
    trustItems: trustItems.length ? trustItems.map(item => item.slice(0, 50)) : base.trustItems,
    testimonialQuote: text(source.testimonialQuote, base.testimonialQuote, 240),
    testimonialName: text(source.testimonialName, base.testimonialName, 80),
  };
}
