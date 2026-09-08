'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createProductAction, updateProductAction } from '@/modules/products/actions';
import { useLocale } from '@/lib/i18n/context';
import { ProductImageStudio } from './product-image-studio';

interface Category {
  id: string;
  name: string;
}

interface ProductFormData {
  id?: string;
  name?: string;
  description?: string;
  categoryId?: string;
  price?: number;
  compareAtPrice?: number;
  sku?: string;
  isActive?: boolean;
  isFeatured?: boolean;
  images?: string[];
  itemType?: 'PRODUCT' | 'SERVICE';
  serviceProfile?: { durationMinutes: number; bufferMinutes: number; bookingRequired: boolean; fulfillmentType: 'AT_BRANCH' | 'AT_CUSTOMER_LOCATION' | 'ONLINE' | 'REQUEST_ONLY'; minimumNoticeMinutes: number; maxParticipants: number; advancePaymentPercent: number; cancellationPolicy?: string | null } | null;
}

interface ProductFormProps {
  categories: Category[];
  product?: ProductFormData;
  aiImageEnabled?: boolean;
  aiImageUpgradeRequired?: boolean;
}

export function ProductForm({ categories, product, aiImageEnabled = false, aiImageUpgradeRequired = false }: ProductFormProps) {
  const { dict } = useLocale();
  const t = dict.productFormPage;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [imageBusy, setImageBusy] = useState(false);
  const [itemType, setItemType] = useState<'PRODUCT' | 'SERVICE'>(product?.itemType ?? 'PRODUCT');

  const isEdit = !!product?.id;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (imageBusy) {
      setError(t.imageUploadInProgress);
      return;
    }

    const fd = new FormData(e.currentTarget);

    const serviceProfile = itemType === 'SERVICE' ? {
      durationMinutes: Number(fd.get('durationMinutes') || 60),
      bufferMinutes: Number(fd.get('bufferMinutes') || 0),
      bookingRequired: fd.get('bookingRequired') === 'on',
      fulfillmentType: fd.get('fulfillmentType') as 'AT_BRANCH' | 'AT_CUSTOMER_LOCATION' | 'ONLINE' | 'REQUEST_ONLY',
      minimumNoticeMinutes: Number(fd.get('minimumNoticeMinutes') || 0),
      maxParticipants: Number(fd.get('maxParticipants') || 1),
      advancePaymentPercent: Number(fd.get('advancePaymentPercent') || 0),
      cancellationPolicy: (fd.get('cancellationPolicy') as string) || undefined,
    } : undefined;
    const payload = {
      itemType,
      name: fd.get('name') as string,
      description: (fd.get('description') as string) || undefined,
      categoryId: fd.get('categoryId') as string,
      price: Number(fd.get('price')),
      compareAtPrice: fd.get('compareAtPrice') ? Number(fd.get('compareAtPrice')) : undefined,
      sku: (fd.get('sku') as string) || undefined,
      isActive: fd.get('isActive') === 'on',
      isFeatured: fd.get('isFeatured') === 'on',
      images,
      serviceProfile,
    };

    startTransition(async () => {
      const result = isEdit
        ? await updateProductAction(product!.id!, payload)
        : await createProductAction(payload);

      if (!result.success) {
        setError(result.error ?? t.genericError);
        return;
      }
      router.push('/dashboard/products');
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Name */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--muted)]/30 p-4">
        <p className="text-sm font-bold text-[var(--foreground)]">نوع ما تعرضه</p>
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">المنتج له مخزون وتوصيل؛ الخدمة لها حجز أو طلب تنفيذ.</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setItemType('PRODUCT')} className={`rounded-xl border px-3 py-3 text-right text-sm font-bold ${itemType === 'PRODUCT' ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]' : 'bg-[var(--background)]'}`}>📦 منتج</button>
          <button type="button" onClick={() => setItemType('SERVICE')} className={`rounded-xl border px-3 py-3 text-right text-sm font-bold ${itemType === 'SERVICE' ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]' : 'bg-[var(--background)]'}`}>🗓️ خدمة</button>
        </div>
      </section>
      <div className="space-y-1.5">
        <label htmlFor="name" className="text-sm font-medium text-[var(--foreground)]">
          {t.nameLabel} <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          minLength={2}
          defaultValue={product?.name}
          placeholder={t.namePlaceholder}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label htmlFor="description" className="text-sm font-medium text-[var(--foreground)]">
          {t.descriptionLabel}
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={product?.description}
          placeholder={t.descriptionPlaceholder}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent resize-none"
        />
      </div>

      <ProductImageStudio images={images} onChange={setImages} copy={t} aiEnabled={aiImageEnabled} upgradeRequired={aiImageUpgradeRequired} onBusyChange={setImageBusy} />

      {/* Category */}
      <div className="space-y-1.5">
        <label htmlFor="categoryId" className="text-sm font-medium text-[var(--foreground)]">
          {t.categoryLabel} <span className="text-red-500">*</span>
        </label>
        <select
          id="categoryId"
          name="categoryId"
          required
          defaultValue={product?.categoryId ?? ''}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
        >
          <option value="" disabled>{t.selectCategoryPlaceholder}</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      {/* Price row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="price" className="text-sm font-medium text-[var(--foreground)]">
            {t.priceLabel} <span className="text-red-500">*</span>
          </label>
          <input
            id="price"
            name="price"
            type="number"
            required
            min={0}
            step="0.01"
            defaultValue={product?.price}
            placeholder="0.00"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="compareAtPrice" className="text-sm font-medium text-[var(--foreground)]">
            {t.comparePriceLabel}
          </label>
          <input
            id="compareAtPrice"
            name="compareAtPrice"
            type="number"
            min={0}
            step="0.01"
            defaultValue={product?.compareAtPrice}
            placeholder={t.comparePricePlaceholder}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
          />
        </div>
      </div>

      {itemType === 'SERVICE' && <section className="space-y-4 rounded-xl border border-teal-200 bg-teal-50/50 p-4 dark:border-teal-900 dark:bg-teal-950/20">
        <div><h2 className="font-bold text-[var(--foreground)]">إعدادات الخدمة والحجز</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">يمكنك تعديل أوقات التوفر من صفحة الخدمات بعد الحفظ.</p></div>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm font-medium">مدة الخدمة (دقيقة)<input name="durationMinutes" type="number" min="5" max="1440" defaultValue={product?.serviceProfile?.durationMinutes ?? 60} className="mt-1 w-full rounded-lg border bg-[var(--background)] p-2" /></label>
          <label className="text-sm font-medium">فاصل بين المواعيد<input name="bufferMinutes" type="number" min="0" max="480" defaultValue={product?.serviceProfile?.bufferMinutes ?? 0} className="mt-1 w-full rounded-lg border bg-[var(--background)] p-2" /></label>
          <label className="text-sm font-medium">طريقة التنفيذ<select name="fulfillmentType" defaultValue={product?.serviceProfile?.fulfillmentType ?? 'AT_BRANCH'} className="mt-1 w-full rounded-lg border bg-[var(--background)] p-2"><option value="AT_BRANCH">في الفرع</option><option value="AT_CUSTOMER_LOCATION">عند العميل</option><option value="ONLINE">أونلاين</option><option value="REQUEST_ONLY">طلب بدون موعد</option></select></label>
          <label className="text-sm font-medium">الحد الأدنى قبل الموعد (دقيقة)<input name="minimumNoticeMinutes" type="number" min="0" defaultValue={product?.serviceProfile?.minimumNoticeMinutes ?? 120} className="mt-1 w-full rounded-lg border bg-[var(--background)] p-2" /></label>
          <label className="text-sm font-medium">السعة لكل موعد<input name="maxParticipants" type="number" min="1" max="100" defaultValue={product?.serviceProfile?.maxParticipants ?? 1} className="mt-1 w-full rounded-lg border bg-[var(--background)] p-2" /></label>
          <label className="text-sm font-medium">عربون مقدم %<input name="advancePaymentPercent" type="number" min="0" max="100" defaultValue={product?.serviceProfile?.advancePaymentPercent ?? 0} className="mt-1 w-full rounded-lg border bg-[var(--background)] p-2" /></label>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" name="bookingRequired" defaultChecked={product?.serviceProfile?.bookingRequired ?? true} /> تتطلب اختيار موعد قبل الطلب</label>
        <label className="block text-sm font-medium">سياسة الإلغاء<textarea name="cancellationPolicy" rows={2} maxLength={2000} defaultValue={product?.serviceProfile?.cancellationPolicy ?? ''} className="mt-1 w-full rounded-lg border bg-[var(--background)] p-2 font-normal" placeholder="مثال: يمكن الإلغاء قبل 24 ساعة." /></label>
      </section>}

      {/* SKU */}
      <div className="space-y-1.5">
        <label htmlFor="sku" className="text-sm font-medium text-[var(--foreground)]">
          {t.skuLabel}
        </label>
        <input
          id="sku"
          name="sku"
          type="text"
          defaultValue={product?.sku}
          placeholder={t.skuPlaceholder}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
        />
      </div>

      {/* Toggles */}
      <div className="flex items-center gap-6">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--foreground)]">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={product?.isActive ?? true}
            className="h-4 w-4 rounded border-[var(--border)] accent-[var(--primary)]"
          />
          {t.activeToggleLabel}
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--foreground)]">
          <input
            type="checkbox"
            name="isFeatured"
            defaultChecked={product?.isFeatured ?? false}
            className="h-4 w-4 rounded border-[var(--border)] accent-[var(--primary)]"
          />
          {t.featuredToggleLabel}
        </label>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 border-t border-[var(--border)] pt-6">
        <a
          href="/dashboard/products"
          className="rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--muted)]"
        >
          {t.cancel}
        </a>
        <button
          type="submit"
          disabled={isPending || imageBusy}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-[var(--primary-foreground)] shadow-sm transition-all hover:bg-[var(--primary)]/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending || imageBusy ? (
            <>
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              {imageBusy ? t.uploadingImage : t.saving}
            </>
          ) : (
            isEdit ? t.saveChanges : t.createProduct
          )}
        </button>
      </div>
    </form>
  );
}
