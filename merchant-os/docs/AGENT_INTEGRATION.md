# دليل تكامل الوكيل الذكي (AI Agent Integration Guide)

هذا الدليل موجّه لفريق/مطور خارجي يبني وكيلاً ذكياً (AI agent) يتكامل مع
**Waslak Merchant OS** لأداء مهمتين:

1. **توليد متاجر جديدة** — الوكيل يرسل اقتراح متجر كامل (اسم، وصف، فئات، منتجات) بناءً على
   وصف نصي، والنظام يحفظه كمسودة (`StoreDraft`) بانتظار مراجعة الموزّع (Distributor) البشرية.
2. **مهام أخرى للقراءة** — الاطلاع على محفظة متاجر الموزّع وملخص حالة الطلبات لكل متجر.

> **مبدأ أساسي:** الوكيل **لا يُنشئ** سجلات `Merchant` مباشرة في قاعدة البيانات أبداً.
> كل توليد محتوى يمرّ عبر مسار "اقتراح ← مراجعة بشرية ← موافقة" — تماماً كما تعمل ميزتا
> الذكاء الاصطناعي الموجودتان حالياً في لوحة التاجر (توليد محتوى المتجر، واقتراح ردود
> الشات). هذا يمنع الوكيل من إنشاء متاجر وهمية أو محتوى غير مُتحقَّق منه في المنصة الحية.

---

## 1. النموذج الأمني (Authentication)

النظام يستخدم ثلاث آليات مصادقة منفصلة، كل واحدة لعميل مختلف:

| العميل | الآلية | أين تُستخدم |
|---|---|---|
| موظفو/موزّعو المنصة (متصفح) | جلسة NextAuth (كوكي) | `/dashboard/*`, `/distributor/*` |
| تطبيق الفلاتر (عميل نهائي) | JWT bearer طويل الأمد | `/api/customer/*`, `/api/orders/*` |
| **الوكيل الذكي الخارجي** | **مفتاح API (Bearer)** | `/api/agent/v1/*` ← هذا الدليل |

مفتاح الـ API **مربوط بموزّع (Distributor) واحد فقط** — كل ما يفعله الوكيل بهذا المفتاح
(مسودات متاجر، قراءات) محصور داخل بيانات ذلك الموزّع فقط.

### 1.1 الحصول على مفتاح API

مالك/مدير الموزّع (`DISTRIBUTOR_OWNER` أو `DISTRIBUTOR_ADMIN`) يُصدر المفتاح بنفسه من لوحة
التحكم: **الإعدادات ← مفاتيح API** (`/distributor/settings/api-keys`) — يحدد اسماً للمفتاح
والصلاحيات المطلوبة، وينسخ المفتاح الخام فور ظهوره (يظهر مرة واحدة فقط).

نفس العملية متاحة برمجياً عبر طلب مُصادَق بجلسة الموزّع:

```http
POST /api/distributor/api-keys
Content-Type: application/json

{
  "name": "Store Generator Agent",
  "scopes": ["stores:draft", "merchants:read", "orders:read"]
}
```

**الاستجابة (201) — المفتاح الخام يظهر مرة واحدة فقط، احفظه فوراً:**

```json
{
  "key": {
    "id": "clx...",
    "name": "Store Generator Agent",
    "scopes": ["stores:draft", "merchants:read", "orders:read"],
    "key": "wsk_live_9f2a1c...64hexchars",
    "createdAt": "2026-08-01T21:00:00.000Z"
  }
}
```

بعد هذه اللحظة، القاعدة تحتفظ فقط بـ SHA-256 hash للمفتاح — لا توجد طريقة لاسترجاع القيمة
الخام مرة أخرى؛ لو فُقد يجب إلغاؤه (`DELETE /api/distributor/api-keys/{id}`) وإصدار غيره.

### 1.2 استخدام المفتاح

كل طلب إلى `/api/agent/v1/*` يجب أن يحمل:

```http
Authorization: Bearer wsk_live_9f2a1c...64hexchars
```

المفتاح له **نطاقات (scopes)** محددة عند الإصدار — أي طلب لعملية خارج نطاقات المفتاح يرجع
`403 Forbidden`. النطاقات المتاحة حالياً:

| Scope | يسمح بـ |
|---|---|
| `stores:draft` | إرسال/قراءة مسودات المتاجر |
| `merchants:read` | قراءة قائمة متاجر الموزّع |
| `orders:read` | قراءة ملخص حالة طلبات متجر معيّن |

---

## 2. شكل الاستجابة والأخطاء

كل استجابات `/api/agent/v1/*` بصيغة:

**نجاح:**
```json
{ "data": { ... } }
```

**فشل:**
```json
{ "message": "وصف الخطأ" }
```

| Status | السبب |
|---|---|
| `400` | بيانات الطلب غير صالحة (فشل التحقق بـ zod) |
| `401` | مفتاح مفقود، غير صحيح، أو تم إلغاؤه |
| `403` | المفتاح لا يملك الـ scope المطلوب |
| `404` | المورد غير موجود أو لا ينتمي لموزّعك |
| `422` | مخالفة قاعدة عمل (مثال: مراجعة مسودة رُوجعت مسبقاً) |
| `429` | تجاوز حد معدّل الطلبات (rate limit) |
| `500` | خطأ داخلي غير متوقع |

---

## 3. توليد متجر (Store Draft)

### 3.1 إرسال مسودة — `POST /api/agent/v1/stores/drafts`

**Scope المطلوب:** `stores:draft` · **حد المعدل:** 30 طلب/ساعة لكل مفتاح

```http
POST /api/agent/v1/stores/drafts
Authorization: Bearer wsk_live_...
Content-Type: application/json

{
  "prompt": "مطعم برجر عصري في الخرطوم يستهدف الشباب",
  "name": "برجر هاوس",
  "description": "أشهى البرجر الطازج بلمسة عصرية",
  "slogan": "طعم لا يُنسى",
  "primaryColor": "#e11d48",
  "welcomeText": "أهلاً بيك في برجر هاوس!",
  "categories": [
    {
      "name": "برجر",
      "products": [
        { "name": "كلاسيك برجر", "price": 3500, "description": "لحم بقري، جبنة، خس وطماطم" },
        { "name": "دبل برجر", "price": 5000 }
      ]
    },
    {
      "name": "مشروبات",
      "products": [{ "name": "عصير مانجو", "price": 1200 }]
    }
  ]
}
```

**حقول الطلب:**

| الحقل | مطلوب | ملاحظات |
|---|---|---|
| `prompt` | ✅ | النص الأصلي الذي وُلِّد منه المحتوى — يُحفظ للمراجعة/التتبّع |
| `name` | ✅ | حتى 120 حرف |
| `description`, `slogan`, `welcomeText` | ❌ | |
| `primaryColor` | ❌ | صيغة hex مثل `#16a34a` |
| `categories` | ✅ | 1 إلى 30 فئة، كل فئة 1 إلى 50 منتج، السعر رقم غير سالب |

**الاستجابة (201):**
```json
{ "data": { "id": "cmxyz...", "status": "PENDING", "createdAt": "..." } }
```

### 3.2 متابعة حالة المسودة — `GET /api/agent/v1/stores/drafts/{id}`

**Scope:** `stores:draft`

```json
{
  "data": {
    "id": "cmxyz...",
    "status": "APPROVED",
    "merchantId": "cmabc...",
    "reviewedAt": "2026-08-02T09:00:00.000Z",
    "rejectionReason": null
  }
}
```

`status` تكون واحدة من: `PENDING` (بانتظار المراجعة) → `APPROVED` (تم إنشاء المتجر، تحقق من
`merchantId`) أو `REJECTED` (راجع `rejectionReason`).

> **لا يوجد webhook حالياً.** الوكيل يجب أن يستقصي (poll) هذا الـ endpoint دورياً (كل بضع
> دقائق مثلاً) لمعرفة قرار المراجعة، بدل التوقّع أن الحفظ فوري.

### 3.3 قائمة كل المسودات — `GET /api/agent/v1/stores/drafts`

**Scope:** `stores:draft` — يرجع آخر 50 مسودة أرسلها أي مفتاح تابع لنفس الموزّع.

### 3.4 ماذا يحدث بعد الموافقة؟

الموافقة/الرفض عملية **بشرية فقط** — يقوم بها موظف الموزّع من داخل لوحة التحكم
(**الطلبيات والتشغيل ← مسودات المتاجر**، `/distributor/store-drafts`)، وليست جزءاً من واجهة
الوكيل. من تلك الصفحة، الموظف يشوف كل مسودة (الاسم، الوصف، الفئات/المنتجات، الوصف الأصلي)
ويوافق (بعد إدخال رقم الهاتف والعنوان الحقيقيين — الوكيل لا يقدر يخترعهما) أو يرفض مع سبب
اختياري. نفس العملية متاحة برمجياً لمن يحتاجها:

- `POST /api/distributor/store-drafts/{id}/approve` بجسم `{ "phone": "...", "address": "..." }`.
  ينشئ هذا `Merchant` بحالة `PENDING` + كل الفئات/المنتجات المقترحة، ويرسل رابط تسجيل عبر
  واتساب لصاحب المتجر لإكمال بياناته (نفس آلية "إضافة تاجر" اليدوية الموجودة أصلاً).
- `POST /api/distributor/store-drafts/{id}/reject` بجسم اختياري `{ "reason": "..." }`.

---

## 4. مهام أخرى (قراءة فقط)

### 4.1 قائمة متاجر الموزّع — `GET /api/agent/v1/merchants`

**Scope:** `merchants:read`

```json
{
  "data": [
    { "id": "cmabc...", "name": "برجر هاوس", "slug": "burger-house-1a2b3c", "status": "ACTIVE", "businessType": "RESTAURANT", "createdAt": "..." }
  ]
}
```

مفيد قبل توليد مسودة جديدة — للتحقق من عدم وجود متجر مشابه مسبقاً.

### 4.2 ملخص حالة طلبات متجر — `GET /api/agent/v1/merchants/{id}/orders`

**Scope:** `orders:read` — `{id}` يجب أن يكون متجراً تابعاً لنفس الموزّع (غير ذلك → 404).

```json
{ "data": { "pending": 5, "preparing": 2, "delivering": 1, "completed": 120, "cancelled": 3 } }
```

القيم مجمّعة من enum الطلبات الداخلي (`NEW/ACCEPTED→pending`, `PREPARING/READY→preparing`,
`OUT_FOR_DELIVERY→delivering`, `DELIVERED→completed`, `CANCELLED/REJECTED→cancelled`).

---

## 5. مثال كامل (curl)

```bash
API_KEY="wsk_live_..."
BASE="https://your-merchant-os-domain.com"

# 1) إرسال مسودة متجر
curl -sX POST "$BASE/api/agent/v1/stores/drafts" \
  -H "Authorization: Bearer $API_KEY" -H "Content-Type: application/json" \
  -d '{"prompt":"صيدلية حي الرياض","name":"صيدلية الشفاء","categories":[{"name":"أدوية","products":[{"name":"باراسيتامول","price":500}]}]}'
# → { "data": { "id": "draft_123", "status": "PENDING" } }

# 2) استقصاء الحالة كل بضع دقائق
curl -s "$BASE/api/agent/v1/stores/drafts/draft_123" -H "Authorization: Bearer $API_KEY"
# → status: PENDING ثم لاحقاً APPROVED أو REJECTED

# 3) عند الموافقة، التحقق من المتجر الجديد
curl -s "$BASE/api/agent/v1/merchants" -H "Authorization: Bearer $API_KEY"
```

---

## 6. فجوات معروفة (يجب التنسيق مع الفريق الداخلي)

- **لا يوجد webhook لإشعار الوكيل بقرار المراجعة** — الاستقصاء الدوري (polling) هو الطريقة
  الوحيدة حالياً لمعرفة أن الموزّع وافق أو رفض مسودة.
- **حد معدل 30 مسودة/ساعة لكل مفتاح** ثابت حالياً في الكود — تواصل مع الفريق الداخلي إذا
  احتجت رفعه لحجم استخدام أكبر.
- **لوحة الموزّع** لإصدار/إلغاء مفاتيح API (`/distributor/settings/api-keys`) ومراجعة
  المسودات (`/distributor/store-drafts`) جاهزتان ومربوطتان بنفس الـ endpoints الموثّقة أعلاه.
