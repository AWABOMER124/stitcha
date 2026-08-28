"use client";
import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function NewComplaintPage() {
  const { slug } = useParams<{ slug: string }>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    ticketNumber: string;
    url: string;
  } | null>(null);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const response = await fetch(`/api/store/${slug}/complaints`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(
        Object.fromEntries(new FormData(event.currentTarget)),
      ),
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) return setError(data.error ?? "تعذر إرسال الشكوى");
    localStorage.setItem(`complaint-${data.ticketNumber}`, data.token);
    setResult(data);
  }
  if (result)
    return (
      <main className="mx-auto max-w-xl px-5 py-16 text-center" dir="rtl">
        <div className="rounded-3xl border bg-white p-8 shadow-sm">
          <div className="text-5xl">✅</div>
          <h1 className="mt-4 text-2xl font-black">تم استلام شكواك</h1>
          <p className="mt-2 text-stone-500">
            رقم التذكرة: <b>{result.ticketNumber}</b>
          </p>
          <Link
            href={result.url}
            className="mt-6 inline-flex rounded-xl bg-stone-900 px-5 py-3 font-bold text-white"
          >
            متابعة الشكوى والردود
          </Link>
        </div>
      </main>
    );
  return (
    <main className="mx-auto max-w-2xl px-5 py-12" dir="rtl">
      <Link href={`/store/${slug}`} className="text-sm text-stone-500">
        ← العودة للمتجر
      </Link>
      <h1 className="mt-5 text-3xl font-black">تقديم شكوى</h1>
      <p className="mt-2 text-sm leading-7 text-stone-500">
        أدخل تفاصيل واضحة، وسيتمكن المتجر وفريق وصلة من متابعتها حتى الحل.
      </p>
      <form
        onSubmit={submit}
        className="mt-7 space-y-4 rounded-3xl border bg-white p-6 shadow-sm"
      >
        {error && (
          <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="customerName" label="الاسم" />
          <Field name="customerPhone" label="رقم الهاتف" />
          <Field
            name="customerEmail"
            label="البريد الإلكتروني"
            type="email"
            required={false}
          />
          <Field
            name="orderNumber"
            label="رقم الطلب (اختياري)"
            required={false}
          />
        </div>
        <label className="block text-sm font-bold">
          نوع الشكوى
          <select
            name="category"
            className="mt-2 w-full rounded-xl border px-3 py-3"
          >
            <option value="ORDER">الطلب</option>
            <option value="DELIVERY">التوصيل</option>
            <option value="PAYMENT">الدفع</option>
            <option value="PRODUCT">المنتج</option>
            <option value="SERVICE">الخدمة</option>
            <option value="OTHER">أخرى</option>
          </select>
        </label>
        <Field name="title" label="عنوان مختصر" />
        <label className="block text-sm font-bold">
          التفاصيل
          <textarea
            name="description"
            required
            minLength={10}
            rows={6}
            className="mt-2 w-full rounded-xl border px-3 py-3"
          />
        </label>
        <button
          disabled={loading}
          className="w-full rounded-xl bg-stone-900 px-5 py-3 font-bold text-white disabled:opacity-50"
        >
          {loading ? "جارٍ الإرسال…" : "إرسال الشكوى"}
        </button>
      </form>
    </main>
  );
}
function Field({
  name,
  label,
  type = "text",
  required = true,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-bold">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        className="mt-2 w-full rounded-xl border px-3 py-3"
      />
    </label>
  );
}
