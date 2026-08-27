# دليل ربط وصلة مع شركات الشحن والتوصيل

> الحالة: مرجع تنفيذي للإنتاج — آخر تحديث 2026-08-27
> النطاق: تعاقد وصلة مباشرة مع شركات التوصيل، إنشاء الشحنات، التتبع، إثبات التسليم، والتحصيل عند الاستلام.

## 1. الملخص التنفيذي

المنصة تملك حالياً أساساً جيداً للتسعير واختيار شركة التوصيل وإنشاء سجل الشحنة داخلياً، لكنها **لا ترسل شحنة `PlatformShipment` إلى API شركة حقيقية بعد**. يوجد Adapter أقدم يعمل على `DeliveryCompany` و`Delivery`، بينما نموذج التشغيل الجديد يعتمد `DeliveryPartner` و`PlatformShipment`. يجب توحيد المسارين على نموذج الشركاء الجديد قبل تفعيل `PLATFORM_DELIVERY_ENABLED=true`.

| الجزء | الحالة الحالية | المطلوب للإنتاج |
|---|---|---|
| مناطق الخدمة والأسعار | جاهز | تحميل أسعار وعقود الشركات المعتمدة |
| عروض التوصيل | جاهز داخلياً | خيار طلب سعر لحظي من الشركة لاحقاً |
| قبول العرض وتحديث إجمالي الطلب | جاهز وذري | لا تغيير |
| إنشاء سجل الشحنة ورقم تتبع وصلة | جاهز | إرسال الشحنة للشركة عبر Outbox |
| Adapter شركة خارجية | واجهة قديمة + Mock فقط | Adapter لكل شركة على `DeliveryPartner` |
| Webhook | موجود للمسار القديم | مسار موقع وموقّع للشركاء الجدد + منع التكرار |
| المندوب وإثبات التسليم | نماذج البيانات جاهزة | APIs وتحقق الملفات/OTP |
| تحصيل COD والتسويات | نماذج البيانات جاهزة | مطابقة وتحويل وتسوية قابلة للمراجعة |

## 2. المعمارية المعتمدة

المصدر المركزي الجديد هو:

```text
Order
  -> DeliveryQuote
  -> PlatformShipment
       -> DeliveryEvent[]
       -> DeliveryCourier
       -> PlatformProofOfDelivery
       -> CodCollection
       -> DeliveryPartner
            -> DeliveryPartnerProviderConfig
```

لا تُبنَ تكاملات جديدة فوق `DeliveryCompany` أو `DeliveryProviderConfig`. هذان المساران للتوافق مع النظام السابق فقط. التكامل الجديد يجب أن يستخدم `DeliveryPartnerProviderConfig` ويحدّث `PlatformShipment`.

## 3. ما هو متاح داخل وصلة الآن

### APIs المستهلكة من تطبيق العميل أو لوحة التاجر

| Method | Endpoint | المصادقة | الوظيفة |
|---|---|---|---|
| `POST` | `/api/orders/{orderId}/delivery-quotes` | جلسة العميل أو إجراء التاجر الداخلي | حساب أفضل عروض متاحة؛ الميزة خلف `PLATFORM_DELIVERY_ENABLED` |
| `POST` | `/api/orders/{orderId}/delivery-quotes/{quoteId}/accept` | جلسة العميل أو إجراء التاجر الداخلي | قبول العرض، إلغاء المنافسين، تحديث الرسوم والإجمالي، إنشاء الشحنة وCOD |
| `POST` | `/api/webhooks/delivery/{token}` | Token في الرابط + تحقق Adapter | Webhook للمسار القديم فقط؛ لا يُعتمد للشركاء الجدد قبل التوحيد |

ضوابط حالية مهمة:

- العروض تنتهي بعد 15 دقيقة.
- السعر والمسافة يحسبهما الخادم من إحداثيات الفرع والعميل.
- يعرض النظام أرخص عرض مؤهل لكل شركة وبحد أقصى ثلاث شركات.
- لا يسمح بأكثر من `PlatformShipment` للطلب نفسه.
- المرحلة التجريبية تدعم COD فقط عند اختيار توصيل وصلة.
- قبول العرض عملية واحدة داخل transaction، ويُنشئ `CodCollection` بالمبلغ المتوقع.

## 4. دورة الشحنة المستهدفة

1. يقبل العميل أو التاجر عرض التوصيل.
2. تنشئ وصلة `PlatformShipment` بحالة `REQUESTED` ورقم `WSL-*`.
3. في نفس المعاملة، تضيف وصلة مهمة Outbox بمفتاح تكرار ثابت.
4. العامل الخلفي يرسل `createShipment` إلى شركة الشحن.
5. تحفظ وصلة `providerReference` و`trackingUrl` وتنتقل إلى `ASSIGNED` عند قبول الشركة.
6. ترسل الشركة Webhooks موقعة للحالات، المندوب، الموقع، وإثبات التسليم.
7. تسجل وصلة كل حدث في `DeliveryEvent` ثم تحدّث الحالة الحالية للشحنة والطلب.
8. في COD تسجل الشركة المبلغ المحصل، ثم يطابقه فريق المالية ضمن التسوية.

## 5. عقد API المتوقع من شركة الشحن

يجوز تكييف أسماء الحقول داخل Adapter، لكن هذه هي القدرات الدنيا المطلوبة.

### 5.1 إنشاء شحنة

`POST {providerBaseUrl}/v1/shipments`

Headers:

```http
Authorization: Bearer <provider-api-token>
Content-Type: application/json
Idempotency-Key: wasla:shipment:<platformShipmentId>:create
X-Wasla-Request-Id: <uuid>
```

Request:

```json
{
  "externalReference": "clx_platform_shipment_id",
  "orderNumber": "WSL-ORDER-1042",
  "trackingCode": "WSL-N8Q2K7F4A1",
  "pickup": {
    "name": "فرع السوق العربي",
    "phone": "+249...",
    "address": "الخرطوم، السوق العربي",
    "latitude": 15.5932,
    "longitude": 32.5363,
    "readyAt": "2026-08-27T11:00:00Z"
  },
  "dropoff": {
    "name": "اسم العميل",
    "phone": "+249...",
    "address": "الخرطوم، الرياض",
    "latitude": 15.5701,
    "longitude": 32.5752,
    "notes": "الاتصال قبل الوصول"
  },
  "payment": {
    "method": "COD",
    "amountToCollect": 24500,
    "currency": "SDG"
  }
}
```

Success `201` أو إعادة نفس النتيجة عند تكرار `Idempotency-Key`:

```json
{
  "providerReference": "SHIP-883140",
  "status": "accepted",
  "trackingUrl": "https://courier.example/track/SHIP-883140",
  "estimatedPickupAt": "2026-08-27T11:15:00Z",
  "estimatedDeliveryAt": "2026-08-27T12:00:00Z"
}
```

### 5.2 إلغاء شحنة

`POST {providerBaseUrl}/v1/shipments/{providerReference}/cancel`

```json
{
  "externalReference": "clx_platform_shipment_id",
  "reasonCode": "CUSTOMER_CANCELLED",
  "reason": "ألغى العميل الطلب قبل الاستلام"
}
```

يجب أن يكون الإلغاء idempotent. إذا كانت الشحنة مسلّمة، تعيد الشركة `409` مع كود واضح مثل `SHIPMENT_NOT_CANCELLABLE`.

### 5.3 قراءة حالة الشحنة

`GET {providerBaseUrl}/v1/shipments/{providerReference}`

يستخدم للمطابقة والإصلاح عند فقد Webhook، وليس بديلاً عن Webhooks.

### 5.4 التسعير اللحظي — اختياري في المرحلة الثانية

`POST {providerBaseUrl}/v1/quotes`

يعيد `quoteReference`, `fee`, `currency`, `expiresAt`, وETA. الأسعار التعاقدية المخزنة داخل وصلة تظل المصدر في المرحلة الأولى لتقليل الاعتماد على الشبكة أثناء Checkout.

## 6. Webhook الذي يجب أن توفره وصلة للشريك

المسار المستهدف الجديد:

```text
POST https://wassla-sd.shop/api/webhooks/delivery-partners/{webhookToken}
```

> هذا المسار **مقترح وغير منفذ حالياً**. المسار الحالي `/api/webhooks/delivery/{token}` مرتبط بالنموذج القديم.

Headers القياسية:

```http
Content-Type: application/json
X-Delivery-Event-Id: evt_01J...
X-Delivery-Timestamp: 1787824800
X-Delivery-Signature: sha256=<hex-hmac>
```

التوقيع:

```text
HMAC_SHA256(webhookSecret, timestamp + "." + rawRequestBody)
```

قواعد التحقق:

- استخدام النص الخام للطلب قبل JSON parsing.
- مقارنة التوقيع بزمن ثابت.
- رفض timestamp أقدم من خمس دقائق.
- حفظ `eventId` كقيمة فريدة لمنع replay والتكرار.
- إعادة `200` للحدث المكرر بعد التأكد أنه عولج سابقاً.
- تدوير السر مع فترة تقاطع تسمح بسر حالي وسابق.

Payload:

```json
{
  "eventId": "evt_01J7QG8H2T",
  "eventType": "shipment.status_changed",
  "occurredAt": "2026-08-27T11:32:14Z",
  "providerReference": "SHIP-883140",
  "externalReference": "clx_platform_shipment_id",
  "status": "picked_up",
  "courier": {
    "providerCourierId": "DRV-90",
    "name": "محمد أحمد",
    "phone": "+249...",
    "vehicleType": "MOTORCYCLE",
    "vehiclePlate": "خ 12345"
  },
  "location": {
    "latitude": 15.582,
    "longitude": 32.556,
    "recordedAt": "2026-08-27T11:31:59Z"
  },
  "note": "تم الاستلام من المتجر"
}
```

حدث التسليم يمكن أن يضيف:

```json
{
  "proofOfDelivery": {
    "recipientName": "اسم المستلم",
    "deliveredAt": "2026-08-27T12:04:10Z",
    "otpVerified": true,
    "photoUrl": "https://provider.example/private-proof/..."
  },
  "cod": {
    "status": "collected",
    "expectedAmount": 24500,
    "collectedAmount": 24500,
    "currency": "SDG"
  }
}
```

## 7. توحيد الحالات

| حالة الشركة | `PlatformShipmentStatus` | أثر الطلب |
|---|---|---|
| `requested`, `pending` | `REQUESTED` | بدون تغيير |
| `accepted`, `courier_assigned` | `ASSIGNED` | بدون تغيير |
| `picked_up` | `PICKED_UP` | `OUT_FOR_DELIVERY` |
| `in_transit`, `arriving` | `IN_TRANSIT` | `OUT_FOR_DELIVERY` |
| `delivered` | `DELIVERED` | `DELIVERED` |
| `failed`, `delivery_failed` | `FAILED` | مراجعة تشغيلية؛ لا يُلغى الطلب تلقائياً |
| `cancelled` | `CANCELLED` | يطبق قرار الإلغاء حسب مصدره وحالة الطلب |

الأحداث الخارجة عن الترتيب تُحفظ في `DeliveryEvent`، لكن لا يجوز لها إعادة الحالة إلى الخلف. `DELIVERED` و`CANCELLED` حالتان نهائيتان، وأي تصحيح بعدهما يحتاج إجراء إداري مدقق.

## 8. تصميم Adapter داخل وصلة

الواجهة الحالية تحتوي `createShipment`, `cancelShipment`, و`parseWebhookEvent`. النسخة المستهدفة للشركاء الجدد:

```ts
interface DeliveryPartnerAdapter {
  key: string;
  createShipment(input: CreatePartnerShipmentInput, auth: ProviderAuth): Promise<CreatePartnerShipmentResult>;
  cancelShipment(providerReference: string, reason: string, auth: ProviderAuth): Promise<void>;
  getShipment(providerReference: string, auth: ProviderAuth): Promise<PartnerShipmentSnapshot>;
  quote?(input: DeliveryQuoteInput, auth: ProviderAuth): Promise<PartnerQuote>;
  verifyAndParseWebhook(rawBody: string, headers: Headers, secrets: WebhookSecrets): PartnerWebhookEvent;
}
```

كل Adapter مسؤول عن:

- تحويل عقد وصلة إلى أسماء وحقول الشركة.
- timeouts واضحة: اتصال 3 ثوانٍ وإجمالي 10 ثوانٍ كقيمة أولية.
- عدم تسجيل tokens أو بيانات العميل الحساسة.
- تصنيف الأخطاء إلى: مؤقت، دائم، مصادقة، وRate limit.
- التحقق من Webhook الخاص بالشركة قبل إرجاع حدث موحد.

يسجل Adapter في `src/modules/delivery-integrations/registry.ts`، لكن يجب أولاً تحويل الخدمة لتقرأ `DeliveryPartnerProviderConfig` وتكتب في `PlatformShipment`.

## 9. الاعتمادية وإعادة المحاولة

### Idempotency

- إنشاء: `delivery:<shipmentId>:create`
- إلغاء: `delivery:<shipmentId>:cancel:<version>`
- حدث Webhook: `delivery-webhook:<partnerId>:<eventId>`
- تسوية COD: `cod-settlement:<partnerId>:<periodFrom>:<periodTo>`

### سياسة المحاولة

| الاستجابة | القرار |
|---|---|
| `2xx` | نجاح |
| `400`, `404`, `422` | خطأ دائم؛ للمراجعة البشرية |
| `401`, `403` | إيقاف التكامل وتنبيه العمليات |
| `409` | قراءة الحالة؛ يعتبر نجاحاً إذا كان نفس المفتاح/المرجع |
| `429` | إعادة بعد `Retry-After` |
| `5xx` أو timeout | exponential backoff مع jitter |

القيم الأولية: 30 ثانية، دقيقتان، 10 دقائق، ساعة، ثم Dead Letter بعد 8 محاولات. تستخدم خدمة Outbox الموجودة؛ لا ترسل API الشركة داخل معاملة قاعدة البيانات.

## 10. COD والتسوية

1. `expectedAmount` يأتي من إجمالي الطلب بعد قبول عرض التوصيل.
2. عند التسليم تحدث الشركة `collectedAmount` ووقت التحصيل.
3. لا تتحول الحالة إلى `REMITTED` بمجرد Webhook التسليم.
4. تستورد وصلة كشف تحويل/تسوية الشركة وتطابق: الشحنة، العملة، المتوقع، المحصل، والمحّول.
5. أي فرق ينقل الحالة إلى `DISPUTED` مع سبب ومرفقات خاصة.
6. بعد مطابقة التحويل فقط تسجل `remittedAmount`, `remittedAt`, والحالة `REMITTED`.

المطلوب من الشركة في ملف التسوية أو API: `providerReference`, `trackingCode`, `deliveredAt`, `collectedAmount`, `deliveryFee`, `netRemittance`, `currency`, و`bankTransferReference`.

## 11. الأمان والخصوصية

- تشفير API tokens وWebhook secrets في قاعدة البيانات، وعدم تخزينها كنص صريح.
- صلاحية مستقلة لإدارة إعدادات الشركاء، مع Audit log لكل تغيير.
- IP allowlist طبقة إضافية فقط وليست بديلاً عن HMAC.
- أقل بيانات لازمة: الاسم والهاتف والعنوان والموقع وملاحظات التوصيل فقط.
- عدم إرسال تفاصيل منتجات حساسة إلا إذا تطلب العقد ذلك.
- روابط إثبات التسليم قصيرة الصلاحية أو تنسخ إلى التخزين الخاص لوصلة.
- Rate limits لكل شريك، وحجم Webhook أقصى 256KB.
- فصل بيئة Sandbox عن Production بمفاتيح وtokens وwebhook URLs مختلفة.

## 12. خطة التنفيذ الفنية

### P0 — قبل أول شحنة حقيقية

1. إنشاء `DeliveryPartnerAdapter` وربطه بـ`DeliveryPartnerProviderConfig` و`PlatformShipment`.
2. إضافة Outbox handler باسم `delivery.shipment.create` مع idempotency وإعادة المحاولة.
3. إضافة endpoint الشركاء الجديد للتحقق من HMAC وحفظ event IDs ومنع replay.
4. إضافة جدول `DeliveryWebhookEvent` أو حقل فريد مكافئ لأحداث الشركة.
5. دعم `ASSIGNED`, `PICKED_UP`, `IN_TRANSIT`, `DELIVERED`, `FAILED`, `CANCELLED` بدون رجوع حالة للخلف.
6. شاشة إعداد آمنة للـbase URL والمفاتيح وWebhook secret واختبار الاتصال.
7. Adapter لشركة Sandbox واحدة، ثم Contract tests مسجلة بدون أسرار.
8. إبقاء `PLATFORM_DELIVERY_ENABLED=false` حتى اجتياز UAT.

### P1 — التشغيل المالي والميداني

1. إسناد المندوب وتحديث موقعه بمعدل مضبوط.
2. إثبات تسليم بصورة خاصة وOTP واسم المستلم.
3. استيراد ومطابقة COD وتسويات الشركة والتعامل مع الفروقات.
4. لوحة مراقبة: زمن إنشاء الشحنة، آخر Webhook، المحاولات الفاشلة، والشحنات العالقة.
5. تنبيهات عند توقف Webhooks أو ارتفاع الفشل أو اختلاف COD.

### P2 — التوسع

1. أسعار لحظية وحجز SLA من أكثر من شركة.
2. إعادة توزيع الشحنة على شركة بديلة وفق قواعد وعقود واضحة.
3. Webhook خروج من وصلة إلى أنظمة التجار وERPs.
4. Partner portal أو API للمندوبين المستقلين.

## 13. اختبار القبول مع كل شركة

- إنشاء نفس الشحنة مرتين بنفس `Idempotency-Key` لا ينشئ شحنتين.
- رفض توقيع Webhook خاطئ أو قديم أو معاد الإرسال دون أثر جانبي.
- حفظ الحدث المكرر مرة واحدة وإرجاع `200`.
- عدم رجوع `DELIVERED` إلى `IN_TRANSIT` بسبب حدث متأخر.
- إلغاء قبل الاستلام ينجح، وبعد التسليم يفشل بوضوح.
- تطابق رقم الشركة، رقم وصلة، المندوب، ETA، وإثبات التسليم.
- تطابق `expectedAmount`, `collectedAmount`, و`remittedAmount` بالعملة نفسها.
- معالجة timeout و`429` و`5xx` دون فقد الشحنة أو إنشاء نسخة مكررة.
- عدم ظهور أسرار أو أرقام العملاء كاملة في logs.
- نجاح سيناريو داخل منطقة الخدمة ورفض سيناريو خارجها.

## 14. بيانات مطلوبة من شركة الشحن قبل البدء

- وثائق Sandbox وProduction وBase URLs.
- طريقة المصادقة، حدود الطلبات، وtimeouts الموصى بها.
- API إنشاء/إلغاء/قراءة الشحنة والتسعير إن وجد.
- قائمة الحالات ومعانيها وتسلسلها.
- طريقة توقيع Webhooks وإعادة المحاولة.
- نموذج المناطق والأسعار وSLA.
- دعم COD، دورة التحويل، رسوم الشركة، وملف/واجهة التسوية.
- سياسة إثبات التسليم والاحتفاظ بالصور.
- بيانات مسؤول تقني ومسؤول عمليات ومسؤول مالية للتصعيد.

## 15. قرار الإطلاق

لا تُفعّل `PLATFORM_DELIVERY_ENABLED=true` إلا بعد اكتمال P0، نجاح اختبارات العقد والميدان، إدخال شركتين على الأقل أو اعتماد خطة بديل يدوي، توقيع SLA وCOD، وتجربة مغلقة في مدينة واحدة مع خطة رجوع موثقة.
