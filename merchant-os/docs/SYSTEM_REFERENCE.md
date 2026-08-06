# دليل النظام التقني الشامل — Waslak Merchant OS

مرجع تقني كامل لمنصة وصلك: البنية، الأدوار، دورة حياة العمل، نموذج البيانات الكامل،
كل موديول وقدراته، وخريطة سطح الـ API الخارجي بالكامل (تطبيق الفلاتر، السائق،
والويب هوك). موجّه لأي مطوّر يحتاج فهم النظام ككل قبل التكامل معه — وليس فقط جزء
توليد المتجر بالذكاء الاصطناعي (لهذا راجع
[`AI_STORE_GENERATOR.md`](./AI_STORE_GENERATOR.md)).

> **ملاحظة:** هذا الملف يوثّق الكود كما هو فعلياً في المستودع وقت الكتابة
> (2026-08-04)، وليس تصميماً مثالياً مفترضاً — بما في ذلك الفجوات والنواقص (قسم 9).

---

## 1. نظرة عامة

**وصلك (Waslak)** منصة SaaS للتجار — مطاعم، مقاهي، بقالات، صيدليات، متاجر تجزئة —
تدير المتجر، الطلبات، المخزون، التوصيل، والمالية. المنصة مكوّنة من جزئين:

| المكوّن | المسار | الوصف |
|---|---|---|
| **Merchant OS** | `/merchant-os` | تطبيق Next.js 16 واحد يستضيف 4 بوابات + متجر عام لكل تاجر |
| **تطبيق الفلاتر** | جذر المستودع | تطبيق موبايل للعميل النهائي (تصفح، طلب، تتبّع) |

### البوابات الأربع (تشترك في نفس التطبيق وقاعدة البيانات)

| البوابة | المسار | الفاعل |
|---|---|---|
| لوحة التاجر | `/dashboard/*` | `MERCHANT_OWNER`, `MERCHANT_ADMIN`, وأدوار موظفي المتجر |
| بوابة الموزّع | `/distributor/*` | `DISTRIBUTOR_OWNER`, `DISTRIBUTOR_ADMIN` |
| إدارة المنصة | `/admin/*` | `PLATFORM_OWNER` |
| المتجر العام | `/store/[slug]/*` | أي شخص — بدون تسجيل دخول |

### التقنيات

| الطبقة | التقنية |
|---|---|
| الإطار | Next.js 16 (App Router, Turbopack) |
| اللغة | TypeScript (strict) |
| التصميم | Tailwind CSS |
| قاعدة البيانات | PostgreSQL |
| ORM | Prisma 7 |
| المصادقة | NextAuth.js v5 (كوكي جلسة) + JWT مخصص (تطبيق الفلاتر) + مفاتيح API (الوكيل الذكي) |
| التحقق | Zod |
| الاستضافة | Dokploy (Docker) |

### البنية المعمارية — Modular Monolith

```
UI (Dashboard / Distributor / Admin / Store)
        ↓
Server Actions (داخلي)  ·  API Route Handlers (خارجي/webhooks/عام)
        ↓
Module Services (منطق العمل)
        ↓
Module Repositories (Prisma، دايماً مقيّد بـ tenant، آمن من ناحية Decimal)
        ↓
Prisma ORM / PostgreSQL
```

**مبدأ حاسم:** كل موديول (`src/modules/{name}/`) له نمط ثابت:
`schemas/` (Zod) → `repositories/` (Prisma) → `services/` (منطق) → `actions.ts`
(نقاط دخول `'use server'` تناديها الواجهة الداخلية) → `index.ts`. الاستثناء الوحيد:
موديولات مكشوفة كـ REST API خارجي (راجع قسم 6) تستخدم `route.ts` بدل الاعتماد فقط
على server actions.

---

## 2. الفاعلون والأدوار

النظام فيه **تسلسل هرمي من 4 مستويات**، وكل مستوى له نموذج بيانات مختلف تماماً:

```
Platform (PLATFORM_OWNER)
   └── Distributor (اختياري)  — يدير محفظة تجار
          └── Merchant  — التجار (وحدة الـ tenancy الأساسية)
                 └── Customer / CustomerAccount  — العميل النهائي
```

- **موزّع اختياري:** `Merchant.distributorId` قابل لأن يكون `null` — يعني تاجر
  منصة مباشر بدون موزّع.
- **الأدوار (`UserRole` enum)** — enum واحد مسطّح يغطي الثلاث مستويات الأولى، مش
  enum منفصل لكل بوابة:

| الدور | البوابة |
|---|---|
| `PLATFORM_OWNER` | إدارة المنصة — وصول كامل |
| `DISTRIBUTOR_OWNER` / `DISTRIBUTOR_ADMIN` | بوابة الموزّع |
| `MERCHANT_OWNER` / `MERCHANT_ADMIN` | لوحة التاجر — وصول كامل |
| `BRANCH_MANAGER`, `CASHIER`, `INVENTORY_MANAGER`, `DELIVERY_STAFF`, `CUSTOMER_SERVICE`, `FINANCE_AGENT` | لوحة التاجر — مقيّد بصلاحيات (`Role`/`Permission` المخصصة) |

- **⚠️ هويّتان منفصلتان للعميل — سهل الخلط بينهما:**
  - **`Customer`** — سجل CRM مقيّد بتاجر واحد (`@@unique([merchantId, phone])`) —
    نفس الشخص له سجل `Customer` منفصل لكل تاجر طلب منه.
  - **`CustomerAccount`** — هويّة عالمية واحدة لتطبيق الفلاتر (`phone` فريد على
    مستوى المنصة كلها)، منفصلة تماماً عن `Customer` وعن `User` (هوية الموظفين).
    حساب واحد ممكن يرتبط بعدة سجلات `Customer` عبر `Customer.accountId`.

---

## 3. دورة حياة العمل (Business Lifecycle)

### 3.1 تسجيل تاجر جديد — مسارين

**أ) دعوة من موزّع (invite-by-link):**
1. الموزّع يضيف اسم المتجر + الهاتف + العنوان فقط (`POST /api/distributor/merchants`)
2. النظام ينشئ `Merchant` بحالة `PENDING` + `registrationToken` (صالح 7 أيام) + يبعت رابط واتساب
3. صاحب المتجر يفتح `/complete-registration/[token]` ويكمل (اسمه، كلمة السر، نوع النشاط)
4. الموزّع يُشعَر (`DistributorNotificationLog`, type `NEW_MERCHANT`) ويوافق يدوياً

**ب) تسجيل مباشر (بدون موزّع):** `POST /api/auth/register` — تاجر جديد ينشئ
حسابه ومتجره مباشرة، حالة `ACTIVE` فوراً، بدون مراجعة.

**ج) بمساعدة الذكاء الاصطناعي (الأحدث):** الموزّع يكتب وصفاً نصياً في
`/distributor/merchants/new` (وضع "بالذكاء الاصطناعي")، واصلك نفسها تنادي Claude
(`ANTHROPIC_API_KEY` في السيرفر — لا مفاتيح خارجية، لا وكيل طرف ثالث) لتوليد
اسم/وصف/فئات/منتجات، ثم الموزّع يضيف الهاتف/العنوان الحقيقيين (الذكاء الاصطناعي
ما يقدر يخترعهم) ويؤكد — عندها **مباشرة**، بدون خطوة مراجعة/موافقة منفصلة، يتحول
لـ `Merchant` بحالة `PENDING` + فئات/منتجات حقيقية، بنفس آلية الدعوة والتفعيل عبر
OTP الموجودة في المسار (أ). تفاصيل كاملة في
[`AI_STORE_GENERATOR.md`](./AI_STORE_GENERATOR.md).

### 3.2 إعداد المتجر
التاجر (أو الوكيل عبر المسار ج) يضيف `Category` → `Product` (مع `Branch` و
`InventoryItem` اختيارياً)، ويضبط `StorefrontSettings` (الثيم، ساعات العمل، حد
أدنى للطلب) وربط واتساب (`WhatsAppConfig`) إن أراد.

### 3.3 الطلب — من العميل حتى التسليم
العميل يطلب إما من المتجر العام (`/store/[slug]`، بلا حساب) أو من تطبيق الفلاتر
(`CustomerAccount` مسجّل دخول). عند إنشاء الطلب:
- يُنشأ/يُربط سجل `Customer` تلقائياً
- **أسعار المنتجات تُلقَط (snapshot) داخل `OrderItem.productSnapshot`** — تغيير
  سعر منتج لاحقاً لا يغيّر طلبات قديمة إطلاقاً
- رقم الطلب يُولَّد بصيغة `ORD-XXXXXXXX`

**آلة الحالة (state machine) — انتقالات مسموحة فقط، مفروضة في الكود:**
```
NEW → ACCEPTED | REJECTED | CANCELLED
ACCEPTED → PREPARING | CANCELLED
PREPARING → READY | CANCELLED
READY → OUT_FOR_DELIVERY | DELIVERED | CANCELLED
OUT_FOR_DELIVERY → DELIVERED | CANCELLED
DELIVERED / CANCELLED / REJECTED → (نهائية، لا انتقال بعدها)
```
كل تغيير حالة يُسجَّل في `OrderStatusHistory` (سجل تدقيق دائم). المخزون
(`InventoryItem`/`StockMovement`) يتحرك تلقائياً مع دورة حياة الطلب (خصم عند
القبول، استرجاع عند الإلغاء).

للتتبّع الحي، تطبيق الفلاتر يفتح اتصال SSE على `GET /api/tracking/{orderId}`
(انظر قسم 6)، والحالة الداخلية أعلاه تُبسَّط لخمس قيم فقط
(`pending/preparing/delivering/completed/cancelled`) عبر
`mapOrderStatusForApp()` في `storefront.service.ts`.

### 3.4 التوصيل
إما توصيل داخلي (`Driver` تابع لموزّع، مع `DriverAssignment` + تتبّع GPS حي عبر
`DriverLocationLog`) أو شركة توصيل خارجية (`DeliveryCompany`) — الاثنان بديلان
لبعض عملياً، مش بيشتغلوا مع بعض على نفس الطلب.

### 3.5 المالية
كل طلب يولّد حركات مالية (`FinancialTransaction`، نمط دفتر مزدوج بـ
`CREDIT`/`DEBIT`) حسب `CommissionPlan` الخاص بالتاجر. الموزّع يجمّع رصيد كل تاجر
دورياً في `Settlement` (`PENDING → PROCESSING → COMPLETED/FAILED`).

---

## 4. نموذج البيانات الكامل (Data Model)

المخطط الكامل في `merchant-os/prisma/schema.prisma` — **63 نموذج/enum**. ملخّص
مجمّع حسب المجال:

### 4.1 المصادقة والمستخدمون
- **`User`** — هوية دخول الموظفين (منصة/موزّع/تاجر). `email` فريد، `phone` فريد
  اختياري، `passwordHash` قابل للـ null (بدون دخول حتى يُضبط)، `role: UserRole`.
- **`PasswordResetToken`** / **`PhoneVerification`** — كلاهما يخزّن **hash فقط**
  (sha256) للتوكن/الكود، أبداً القيمة الخام — نفس نمط `passwordHash`.
- **`Account`** / **`Session`** — جداول NextAuth القياسية.

### 4.2 طبقة الموزّع
- **`Distributor`** — `slug` فريد، `status`, `commissionRate: Decimal(5,2)`.
- **`DistributorUser`** — جدول ربط الموظف بالموزّع (`@@unique([userId, distributorId])`).
- **`DeliveryCompany`** — شركة توصيل خارجية يتعامل معها الموزّع.

### 4.3 التاجر / نواة الـ tenant
- **`Merchant`** — حدود الـ tenant الأساسية. `slug` فريد، `businessType`,
  `storeType`, `status`, `currency` (افتراضي `SDG`)، `timezone` (افتراضي
  `Africa/Khartoum`)، `distributorId` اختياري (`null` = تاجر منصة مباشر).
  `registrationToken`/`registrationTokenExpiresAt` لمسار الدعوة بالرابط.
- **`MerchantUser`** — ربط الموظف بالتاجر، اختيارياً مقيّد بفرع (`branchId`).
- **`Role`/`Permission`/`RolePermission`** — RBAC مخصص فوق الـ enum المسطّح
  (`Role.merchantId = null` يعني دور عام على مستوى المنصة).

### 4.4 الكتالوج
- **`Category`** — تسلسل هرمي ذاتي المرجع (`parent`/`children`).
- **`Product`** — `price`/`compareAtPrice: Decimal(10,2)`, `images: Json`.
  حذف الفئة اللي فيها منتجات ممنوع (`onDelete: Restrict`).
- **`ProductModifier`** — مجموعة خيارات إضافية (مثلاً "الحجم") مع أسعار فرعية.
- **`InventoryItem`** / **`StockMovement`** — تتبّع مخزون + سجل حركات دائم لا يُعدَّل.

### 4.5 العملاء
راجع قسم 2 للفرق بين `Customer` (CRM مقيّد بتاجر) و`CustomerAccount` (هوية
تطبيق الفلاتر العالمية). + `CustomerAddress` (عناوين محفوظة، تابعة لـ `Customer` لا `CustomerAccount`).

### 4.6 الطلبات والتوصيل
- **`Order`** — `@@unique([merchantId, orderNumber])`. حقول مالية `Decimal(10,2)`.
  **حقول مُلقَطة (`customerName/Phone/Address`)** تحافظ على دقة السجل التاريخي
  حتى لو تغيّر سجل العميل لاحقاً.
- **`OrderItem`** — `productSnapshot: Json` + `productId` اختياري
  (`onDelete: SetNull`) — السطر يبقى حتى لو حُذف المنتج.
- **`OrderStatusHistory`** — سجل تدقيق دائم لكل تغيير حالة.
- **`Delivery`** (1:1 مع الطلب) / **`Payment`** (1:1 مع الطلب، `metadata: Json`
  لبيانات بوابة الدفع).
- **`Driver`** (مقيّد بموزّع لا تاجر) — `locationToken` فريد (`@default(cuid())`)
  يُشترَط كـ Bearer على `POST /api/driver/location` بدل الثقة بـ `driverId` خام؛
  مُستبعَد عمداً من استعلام قائمة السائقين (`omit`) ولا يظهر إلا في صفحة تفاصيل
  السائق. / **`DriverAssignment`** / **`DriverLocationLog`** (سجل GPS عالي
  التردد) / **`DriverEarning`** / **`ProofOfDelivery`** (علاقات `Order`/`Driver`
  معرّفة بالكامل، `onDelete: Cascade`).

### 4.7 المالية
**`CommissionPlan`** (`PERCENTAGE/FLAT_FEE/HYBRID/SUBSCRIPTION`) / **`FinancialTransaction`**
(دفتر مزدوج `CREDIT`/`DEBIT`) / **`Settlement`** (دفعة تسوية مجمّعة) / **`DeliveryZone`**
(تسعير حسب المنطقة: رسم أساسي + رسم/كم).

### 4.8 الـ CRM والولاء
**`PromoCode`** / **`LoyaltyAccount`** (1:1 مع `Customer`) / **`LoyaltyTransaction`**
/ **`LoyaltyConfig`** (نقاط لكل طلب، قيمة الاسترداد، إلخ — قابلة للتعديل لكل تاجر).

### 4.9 الإشعارات
**ثلاثة جداول متوازية بنفس الشكل** بدل جدول واحد متعدد الأشكال — كل واحد مقيّد
بمستوى مختلف: `NotificationLog` (تاجر) / `DistributorNotificationLog` (موزّع) /
`PlatformNotificationLog` (منصة، **بدون** تقييد بمشرف معيّن — مشترك بين كل مشرفي المنصة).

### 4.10 المتجر العام وصندوق الوارد
**`StorefrontSettings`** (1:1 لكل تاجر: الثيم، ساعات العمل، الحد الأدنى للطلب) /
**`Conversation`** (`WEB/WHATSAPP/MESSENGER/INSTAGRAM`) / **`InboxMessage`** /
**`WhatsAppConfig`** (1:1 لكل تاجر، `accessToken` **مشفّر عند التخزين** —
`src/lib/crypto/secret.ts`، `phoneNumberId` فريد يوجّه الويب هوك الوارد للتاجر الصح).

### أنماط متكررة عبر النموذج كله
- **soft-state لا حذف صلب:** أعلام `isActive` منتشرة في كل مكان (منتج، فئة، فرع،
  شركة توصيل، خطة عمولة، منطقة توصيل، كود خصم...)؛ حالات `Merchant`/`Distributor`
  تتبع نفس الفلسفة — تقريباً لا شيء يُحذف صلباً إلا عبر `onDelete: Cascade` من أصل.
- **hash فقط للأسرار العابرة:** `PasswordResetToken.tokenHash`,
  `PhoneVerification.codeHash` — نمط واحد متكرر بتعليقات متبادلة بينهم في الكود نفسه.
- **حقول لقطة للدقة التاريخية:** `Order.customerName/Phone/Address` و
  `OrderItem.productSnapshot` عمداً غير مطبَّعة (denormalized) وقت الكتابة.
- **مراجع فضفاضة (بدون FK) متكررة:** `createdById`, `changedById`, `assignedToId`،
  وعدة حقول `orderId` في نماذج المالية/الولاء/أرباح السائق — أعمدة نصية عادية،
  على الأغلب لتفادي سلاسل حذف تلقائي عبر جداول السجل/التدقيق.
- **حقول `Json` كمخرج للبيانات متغيّرة الشكل** بدل جداول جديدة:
  `Product.images`, `OrderItem.productSnapshot`, `Payment.metadata`,
  `StorefrontSettings.theme`.

---

## 5. الموديولات وقدراتها

كل الموديولات تتبع نمط `schemas/repositories/services/actions.ts` (قسم 1) وتُقيَّد
تلقائياً بـ `merchantId` أو `distributorId` كأول معامل، مصدره جلسة المستخدم — **لا
يُستقبل أبداً من المستخدم مباشرة**.

| الموديول | الفاعل | القدرات الأساسية | ملاحظات |
|---|---|---|---|
| `tenancy` | داخلي | `createTenantContext`/`withTenantScope` — مساعد مشترك | معظم الموديولات تُضمّن التقييد يدوياً بدل استخدامه |
| `merchants` | منصة/موزّع | إدارة سجلات التاجر (منفصل عن مسار الدعوة بالرابط) | |
| `admin` | منصة فقط | CRUD موزّعين، إحصائيات منصة شاملة | استعلامات غير مقيّدة عمداً — الدور الوحيد المسموح له رؤية كل شيء |
| `branches` | لوحة التاجر | CRUD فروع + تحديد الفرع الرئيسي | CRUD بسيط |
| `categories` | لوحة التاجر | CRUD + إعادة ترتيب | CRUD بسيط |
| `products` | لوحة التاجر | CRUD + تفعيل/تعطيل | CRUD بسيط |
| `customers` | لوحة التاجر | CRUD عميل/عنوان (CRM خفيف) | منفصل عن `crm` و`CustomerAccount` |
| `crm` | لوحة التاجر | تصنيف عملاء، أكواد خصم + تحقق، إعداد/رصيد الولاء | الطبقة الأغنى فوق نموذج `Customer` |
| `inventory` | لوحة التاجر + داخلي | تعديل مخزون يدوي، خصم/استرجاع تلقائي مع الطلبات، تنبيهات نقص | `deductForOrder`/`restoreForCancellation` تُنادى داخلياً من `orders`، مش actions مباشرة |
| **`orders`** | لوحة التاجر + بوابة الموزّع | إنشاء طلب (لقطة سعر + مخزون)، **آلة حالة مفروضة بالكود** (قسم 3.3)، عرض طلبات الموزّع الشامل | الموديول الأهم في النظام |
| `fulfillment` | موظف مطبخ/كاشير | عرض الطلبات النشطة فقط (غير النهائية)، تقديم الحالة | غلاف تشغيلي فوق `orders` |
| `delivery` | لوحة التاجر | سجلات توصيل + تعيين سائق | |
| `delivery-companies` | بوابة الموزّع | شركات توصيل خارجية، تعيين افتراضي لتاجر | |
| `drivers` | بوابة الموزّع + **عميل السائق الخارجي** | تعيين سائق، **تحديث موقع GPS**، طابور الانتظار، الأرباح | `updateLocation` مكشوف عبر `POST /api/driver/location` بمصادقة ضعيفة (`driverId` خام فقط) — ⚠️ راجع قسم 9 |
| `phone-verification` | أي مسار تسجيل | OTP واتساب — **عمداً غير مقيّد بـ tenant** (يحدث قبل وجود Merchant/Distributor) | |
| `notifications` | لوحة التاجر | جرس إشعارات داخل التطبيق | القنوات الأخرى (SMS/Email/Push/WhatsApp) موجودة بالـ enum بس مش مفعّلة هنا |
| `distributor-notifications` / `platform-notifications` | بوابة الموزّع / منصة | نفس نمط `notifications`، جداول منفصلة | تُطلَق كأثر جانبي من موديولات تانية (مثلاً تسجيل تاجر يُشعر موزّعه) |
| `payments` | لوحة التاجر | تسجيل دفعة، تعليم كمدفوعة، استرداد | |
| `settings` | لوحة التاجر | ملف التاجر + إعدادات المتجر العام (`StorefrontSettings`) | |
| `distributor-settings` | بوابة الموزّع | ملف الموزّع | |
| `roles` | لوحة التاجر (مالك) | RBAC مخصص فوق الـ enum المسطّح | |
| `users` | لوحة التاجر + بوابة الموزّع | دعوة/تعديل/تعطيل موظفين (نسختين متوازيتين) | |
| `whatsapp-channel` | لوحة التاجر + **ويب هوك خارجي** | إعداد WhatsApp Business API لكل تاجر | يشغّل `/api/webhooks/whatsapp` (HMAC) و`/api/inbox/*` |
| `reports` | لوحة التاجر | تقارير | ⚠️ **بدون `actions.ts`** — الوحيد المخالف للنمط الموحّد، غالباً يُستدعى مباشرة من صفحات Server Component |
| `ai-store-generator` | **بوابة الموزّع** | توليد متجر (اسم/فئات/منتجات) من وصف نصي عبر Claude، وإنشاء `Merchant` حقيقي مباشرة | راجع [`AI_STORE_GENERATOR.md`](./AI_STORE_GENERATOR.md) |
| `customer-auth` | **تطبيق الفلاتر** | تسجيل/دخول `CustomerAccount` (JWT) | راجع قسم 6 |
| `storefront` | المتجر العام + تطبيق الفلاتر | تصفح متجر/منتجات، دفع طلب، حالة طلب | يخدم البوابتين معاً |
| `finance` | بوابة الموزّع | خطط عمولة، تسويات، مناطق توصيل | مبني 2026-06-27، انظر ملاحظة الذاكرة |

---

## 6. خريطة سطح الـ API الخارجي (Public/External Surface)

**معظم النظام (كل صف بلا ملاحظة في الجدول أعلاه) يُستخدم فقط عبر Server Actions
من داخل الواجهة — لا يوجد لها REST endpoint إطلاقاً.** الاستثناءات الوحيدة، وكلها
تحت `src/app/api/`:

### 6.1 تطبيق الفلاتر (Customer JWT bearer)
| Endpoint | الوصف |
|---|---|
| `POST /api/customer/auth/register`, `/login` | تسجيل/دخول `CustomerAccount`، يرجّع JWT (`AUTH_SECRET`، صلاحية 90 يوم) |
| `POST /api/customer/notifications/device-token` | تسجيل FCM token |
| `GET /api/stores/featured`, `/api/stores/{id}`, `/api/stores/{id}/products` | تصفح المتاجر/المنتجات (بلا مصادقة) |
| `POST /api/orders` | تقديم طلب |
| `GET /api/orders/history` | طلبات العميل الحالي |
| `GET /api/tracking/{orderId}` | **Server-Sent Events** حي لحالة الطلب (ليس WebSocket) |

### 6.2 السائق
`POST /api/driver/location` — مصادقة `Authorization: Bearer <Driver.locationToken>`
(توكن فريد لكل سائق، يظهر في صفحة تفاصيل السائق ببوابة الموزّع). `driverId` يُشتَق
من التوكن نفسه، لا يُقبَل أبداً من جسم الطلب.

### 6.3 الويب هوك (خارجي، موقّع)
`POST /api/webhooks/whatsapp` — Meta WhatsApp Cloud API، توقيع HMAC عبر
`WHATSAPP_APP_SECRET`، `GET` منفصل للمصافحة الأولية عبر `WHATSAPP_WEBHOOK_VERIFY_TOKEN`.

### 6.4 توليد المتجر بالذكاء الاصطناعي (جلسة NextAuth فقط — لا مفاتيح خارجية)
واصلك نفسها تنادي Claude مباشرة (`ANTHROPIC_API_KEY` في السيرفر، `fetch` خام
بدون SDK) عبر `src/services/ai/` — لا وكيل طرف ثالث، لا `ApiKey` تُصدَر لأحد.
نقطتان تستهلكان نفس `generateStoreContent()`:
- **لوحة التاجر** (`generateStoreContentAction` / `applyAiStoreContentAction` في
  `src/modules/storefront/actions.ts`) — التاجر يطلب اقتراح محتوى لمتجره
  **الموجود بالفعل**، ثم يطبّقه فيُنشئ `Category`/`Product` حقيقية ويحدّث
  `StorefrontSettings.theme`/`welcomeText`. لا بوابة ثقة جديدة — جلسة موثّقة أصلاً.
- **بوابة الموزّع** (`src/modules/ai-store-generator/`، وضع "بالذكاء الاصطناعي" في
  `/distributor/merchants/new`) — الموزّع يولّد محتوى متجر **جديد** كلياً، يضيف
  الهاتف/العنوان الحقيقيين، ويؤكد — عندها **مباشرة** (بدون خطوة مراجعة/موافقة
  منفصلة) يتحول لـ `Merchant` بحالة `PENDING`، بنفس مسار الدعوة عبر واتساب
  وتفعيل OTP الموجود أصلاً (قسم 3.1أ). تفاصيل كاملة في
  [`AI_STORE_GENERATOR.md`](./AI_STORE_GENERATOR.md).

`POST /api/inbox/{convId}/suggest-reply` — نقطة ذكاء اصطناعي ثالثة مستقلة، تقترح
رداً على آخر رسالة عميل في صندوق الوارد؛ اقتراح فقط بدون حفظ/إرسال تلقائي.

الثلاثة تفشل بأمان لو `ANTHROPIC_API_KEY` غير مضبوط.

---

## 7. الأمان والـ Tenancy

1. **كل استعلام مقيّد بتاجر لازم يشمل `merchantId` في `where`** (أو `distributorId`
   للموزّع). لا يُوثَق أبداً بمعرّف من العميل وحده — للتعديل/الحذف: إما تحقق ملكية
   أولاً (`findFirst({id, merchantId})`) أو قيّد العملية نفسها (`updateMany`/`deleteMany`).
2. **التخطيطات (layouts) لا الواجهة فقط تفرض صلاحية الدور** — `dashboard/layout.tsx`،
   `distributor/layout.tsx`، `admin/layout.tsx` كلها تعيد التوجيه حسب `session.user.role`
   على مستوى السيرفر لكل طلب.
3. **الأمان في الأمثلة الثلاثة للمصادقة (قسم 1) منفصل تماماً** — كوكي جلسة، JWT
   عميل، مفتاح API وكيل — لا يوجد تداخل بينهم.
4. **سلامة الـ Decimal:** أي دالة repository ترجّع نتيجة Prisma فيها حقل `Decimal`
   (مال/نسبة/تقييم) **لازم** تمر عبر `serializePrismaObject`/`serializePrismaArray`
   (`src/lib/serialization/`) قبل ما تعبر حد Server Action أو Server→Client
   Component — وإلا Next.js يفشل بصمت (صفحة فاضية بدل خطأ واضح).
   `sh scripts/check-raw-prisma-returns.sh` فحص heuristic لهذا قبل أي شحن.

---

## 8. متغيرات البيئة

| المتغيّر | مطلوب | ملاحظة |
|---|---|---|
| `DATABASE_URL` | ✅ | اتصال Postgres |
| `AUTH_SECRET` | ✅ | سر جلسة NextAuth — **نفسه يُستخدم لتوقيع JWT عميل تطبيق الفلاتر** (`customer-session.ts`) |
| `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL` | ✅ | رابط التطبيق العام |
| `SECRETS_ENCRYPTION_KEY` | ⚠️ **مطلوب فعلياً، غير موثّق في `.env.example`/README** | يُشفّر `WhatsAppConfig.accessToken` — النظام يرمي خطأ فوراً لو ناقص أو أقصر من 16 حرف أول مرة يحاول تاجر يحفظ إعداد واتساب |
| `WHATSAPP_APP_SECRET`, `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | ⚠️ **مطلوبان للويب هوك، غير موثّقين في `.env.example`** | بدونهم `/api/webhooks/whatsapp` يفشل التحقق من التوقيع |
| `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_CDN_URL` | ❌ | بدونهم: تخزين محلي على القرص (`public/uploads/`) — غير دائم على استضافة متعددة النسخ |
| `ANTHROPIC_API_KEY` | ❌ | يشغّل `ai/generate-store` و`inbox/suggest-reply` — 503 نظيف لو ناقص |
| `RESEND_API_KEY`/`SENDGRID_API_KEY`, `TWILIO_ACCOUNT_SID`/`AFRICASTALKING_API_KEY` | ❌ | غير مفعّلين فعلياً بعد — راجع قسم 9 |
| `ALLOW_SEED` | ❌ | لازم يكون `true` عشان `db seed` يشتغل لما `NODE_ENV=production` |

---

## 9. فجوات ومحدوديات معروفة

- **البريد/SMS كلاهما mock فقط** — `EmailProvider`/`SmsProvider` يطبعوا في
  console/`NotificationLog` بدل الإرسال الحقيقي. يعني تدفق "نسيت كلمة المرور"
  حالياً لازم تتفحص لوقات الحاوية (container logs) يدوياً لالتقاط الرابط.
- **صف الانتظار (Queue) synchronous stub** — `SyncQueueService`
  (`src/services/queue/`) ينفّذ أي job فوراً في نفس الطلب، مفيش طابور حقيقي
  (BullMQ إلخ). غير مذكور في قائمة "Known Limitations" الأصلية في README.
- **تخزين الملفات محلي افتراضياً** — غير دائم على استضافة متعددة النسخ/ephemeral
  بدون S3.
- **لا اختبارات آلية** — `scripts/check-raw-prisma-returns.sh` حارس heuristic
  بسيط، مش بديل عن تغطية اختبارات حقيقية (باستثناء الموديولات المبنية حديثاً:
  `ai-store-generator`, `customer-auth`, `storefront.mapOrderStatusForApp`,
  `rate-limit` — هذي عندها اختبارات vitest فعلية).
- **قسم "Scope" في `README.md` قديم/غير دقيق** — بينص إن "تطبيق موبايل للعميل"
  و"تطبيق موبايل للسائق" خارج نطاق المعمارية الحالية عمداً، بينما فعلياً:
  تطبيق الفلاتر متكامل بالكامل مع باكند حقيقي (قسم 6.1)، ونموذج `Driver` +
  `POST /api/driver/location` موجودان في الكود من قبل. يستحق تحديث README لو حد
  هيعتمد عليه كمرجع نطاق دقيق.
- **`reports` هو الموديول الوحيد بدون `actions.ts`** — مخالف لنمط الموديولات
  الموحّد (قسم 1)، على الأغلب يُستدعى مباشرة من صفحات Server Component.

---

## 10. مراجع ذات صلة

- **[`AI_STORE_GENERATOR.md`](./AI_STORE_GENERATOR.md)** — المرجع الكامل لتوليد
  المتجر بالذكاء الاصطناعي (كيف يعمل، نقطتا الاستهلاك، بوابة الثقة عبر OTP).
- **`../README.md`** — دليل المطوّر الداخلي (إعداد بيئة التطوير، قواعد الـ tenancy
  والـ serialization بالتفصيل، قائمة الفحص اليدوي قبل الشحن).
