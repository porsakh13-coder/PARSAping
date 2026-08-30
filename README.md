# PARSAping

پنل مدیریت حرفه‌ای **WireGuard Gaming VPN** — طراحی Cyberpunk / Dark Mode، با تمرکز بر پایداری اتصال، مانیتورینگ کیفیت شبکه (Ping/Jitter/Packet Loss)، و مدیریت آسان کاربران، Nodeها و Subscriptionها.

> ⚠️ **مهم / قانونی:** این نرم‌افزار فقط باید روی سرورها و شبکه‌هایی نصب و اجرا شود که شما مالک آن‌ها هستید یا مجوز رسمی مدیریت آن‌ها را دارید. راه‌اندازی VPN روی زیرساخت متعلق به دیگران بدون اجازه می‌تواند نقض قانون باشد.

---

## معماری

```
PARSAping/
├── backend/          # Node.js + TypeScript + Express API
├── frontend/         # Next.js 14 (App Router) + Tailwind CSS
├── db/migrations/     # SQL Migrations برای PostgreSQL
├── docker-compose.yml
└── .env.example
```

### تکنولوژی
| لایه | تکنولوژی |
|---|---|
| Frontend | Next.js 14 + Tailwind CSS (Dark/Cyberpunk theme) |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL 16 |
| Auth | JWT (Access + Refresh) + bcrypt |
| VPN | WireGuard (`wg`, `wg-quick`) از طریق `wireguard-tools` |
| QR | `qrcode` |
| Infra | Docker + docker-compose |

---

## قابلیت‌ها

- **Auth**: ثبت‌نام/ورود، Session امن با JWT (Access کوتاه‌مدت + Refresh با rotation)، پنل کاربر و پنل Admin جدا.
- **Dashboard**: Ping / Jitter / Packet Loss / Upload-Download / Uptime / وضعیت اتصال / سرور فعلی + دکمه CONNECT/DISCONNECT (تولید و دانلود کانفیگ برای اتصال دستی از طریق اپ WireGuard رسمی).
- **Server Management**: لیست Nodeها با Region/Ping/Jitter/Loss/Load/Online-Offline، انتخاب خودکار بهترین Node، Health Check دوره‌ای.
- **WireGuard Peer Manager**: ساخت Key Pair (`wg genkey`/`wg pubkey`)، تولید `.conf`، تولید QR Code، Revoke و Regenerate.
- **Subscription Link**: هر کاربر یک لینک اختصاصی `(BASE_URL)/sub/:token` دارد که کانفیگ فعلی‌اش را برمی‌گرداند. توکن با `crypto.randomBytes` تولید می‌شود.
- **Admin Panel**: مدیریت کاربران/Nodeها/Peerها/Subscriptionها، Audit Log، Server Monitoring، فعال/غیرفعال‌سازی، Revoke.
- **Statistics**: نمودار Ping/Jitter/Loss/Traffic/Connection History/Uptime (Recharts).
- **Security**: bcrypt، JWT با httpOnly cookie، Rate Limiting (`express-rate-limit`)، Validation (`zod`)، Helmet (CSRF/XSS headers)، Private Key هرگز در لاگ ذخیره نمی‌شود، همه Secretها در `.env`.

---

## اجرا (Docker)

```bash
cp .env.example .env
# مقادیر .env را ویرایش کن (خصوصاً JWT_SECRET, ADMIN_DEFAULT_PASSWORD, ENCRYPTION_KEY)
docker compose up -d --build
```

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:4000`
- اولین کاربر Admin از روی `ADMIN_DEFAULT_EMAIL` / `ADMIN_DEFAULT_PASSWORD` در `.env` هنگام migrate ساخته می‌شود (نه هاردکد در کد).

## اجرای دستی (بدون Docker)

```bash
# دیتابیس
createdb parsaping

# بک‌اند
cd backend
npm install
npm run migrate
npm run seed        # ساخت ادمین از env
npm run dev

# فرانت‌اند
cd frontend
npm install
npm run dev
```

## نکته درباره WireGuard واقعی

برای این‌که سرور واقعاً بتواند peer اضافه/حذف کند، باید:
1. روی هاست، `wireguard-tools` نصب باشد (`apt install wireguard-tools`).
2. کانتینر بک‌اند با `--cap-add=NET_ADMIN` و دسترسی به `/etc/wireguard` اجرا شود (در `docker-compose.yml` تنظیم شده، اما پیش‌فرض کامنت است چون نیاز به دسترسی root/هاست دارد).
3. یک اینترفیس پایه (مثلاً `wg0`) از قبل روی هر Node بالا باشد؛ بک‌اند با اجرای `wg set wg0 peer <pubkey> allowed-ips <ip>/32` peer را اضافه می‌کند.

بدون این دسترسی‌ها (مثلاً در محیط توسعه)، سرویس WireGuard به‌صورت **Simulated Mode** کار می‌کند: Key/Config/QR واقعی تولید می‌شوند اما دستور `wg set` روی هاست واقعی اجرا نمی‌شود — این حالت با `WG_SIMULATED=true` در `.env` کنترل می‌شود.

## متغیرهای محیطی مهم

ببینید `.env.example` — هیچ Secret یا پسورد پیش‌فرضی در کد هاردکد نشده است.
