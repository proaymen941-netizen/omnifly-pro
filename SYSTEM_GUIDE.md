# OmniFly Pro — Travel & Tourism ERP System Guide
## دليل نظام السفريات والسياحة والمؤسسات المتكامل

### 📌 نبذة عامة عن النظام
**OmniFly Pro** هو نظام إدارة وتخطيط موارد مؤسسي (ERP) سحابي وسطح مكتب متكامل مصمم خصيصاً لوكالات السفر والسياحة وشركات الطيران ومقدمي الخدمات السياحية.

---

### 🏛️ مكونات وبنية النظام المعمارية

```
┌────────────────────────────────────────────────────────┐
│                   Front-End Client                     │
│         (React 19 + TypeScript + Tailwind CSS)         │
│     Single-screen & Multi-department Operations Hub    │
└───────────────────────────┬────────────────────────────┘
                            │ REST APIs & WebSocket
┌───────────────────────────▼────────────────────────────┐
│                    Back-End Server                     │
│             (Node.js + Express + Vite + TSX)           │
│        Port: 4000 (Default Travel ERP Isolated Port)    │
└───────────────────────────┬────────────────────────────┘
                            │ Persistent Storage
┌───────────────────────────▼────────────────────────────┐
│                   Database & State                     │
│    Relational Schemas / SQLite / Enterprise Cloud      │
│  Chart of Accounts • Bookings • CRM • Audit • Invoices │
└────────────────────────────────────────────────────────┘
```

---

### 🚀 الأنظمة والإدارات الرئيسية في OmniFly Pro:

1. **العمليات اليومية ومعالج الحجز الذكي**:
   - مركز العمليات والمتابعة اليومية (`/travel-operations`)
   - معالج الحجز السريع الذكي (`/travel-wizard`)
   - إدارة المهام والمتابعات (`/travel-tasks`)

2. **خدمات وحجوزات السفر**:
   - حجوزات وتذاكر الطيران (`/travel-bookings`)
   - موجه ومحلل أوامر أنظمة التوزيع GDS Terminal (`/travel-gds-terminal`)
   - إلغاء واسترجاع التذاكر (`/travel-refunds`)
   - تعديلات وإعادة إصدار الرحلات (`/travel-modifications`)
   - مطابقة فواتير الإياتا BSP & ADM (`/travel-bsp-reconciliation`)
   - حجوزات الفنادق والمنتجعات (`/travel-hotels`)
   - دليل الفنادق المركزي (`/travel-hotels-db`)
   - معاملات وخدمات التأشيرات (`/travel-visas`)
   - البرامج والباقات السياحية (`/travel-packages`)
   - إدارة النقل واللوجستيات (`/travel-transport`)
   - تأمين السفر الدولي (`/travel-insurance`)

3. **المبيعات والفواتير والبوابات الرقمية**:
   - الفواتير والمبيعات المركزية (`/travel-invoices`)
   - عروض الأسعار السياحية (`/travel-quotations`)
   - إدارة العمولات والأرباح (`/travel-commissions`)
   - بوابة الشركات B2B Portal (`/travel-b2b-portal`)
   - بوابة المسافر B2C Portal (`/travel-b2c-portal`)

4. **مشتريات الخدمات والموردين**:
   - شبكة الموردين وخطوط الطيران (`/travel-suppliers`)
   - فواتير المشتريات وسندات الصرف (`/travel-procurement`)

5. **النظام المحاسبي والمالي**:
   - شجرة الحسابات والدليل المحاسبي المتخصص (`/accounting?tab=chart`)
   - دفتر اليومية والقيود المزدوجة التلقائية (`/accounting?tab=journal`)
   - سندات القبض والصرف وإدارة الصناديق والبنوك (`/accounting?tab=vouchers`)
   - ميزان المراجعة، قائمة الدخل، والميزانية العمومية (`/accounting?tab=trial_balance`)

6. **إدارة المسافرين والجوازات CRM**:
   - قاعدة بيانات المسافرين وتنبيهات صلاحية الجواز 6 أشهر (`/passengers`)
   - أرشيف الوثائق وتخزين صور الجوازات (`/travel-documents`)

7. **الفروع والموافقات والرقابة**:
   - فروع ومكاتب السياحة Multi-Branch (`/travel-branches-hub`)
   - سلسلة الموافقات والاعتمادات (`/travel-approvals`)
   - سجل التدقيق والرقابة الأمني Audit Log (`/audit`)
