# Servizato mobile apps (Android)

One React Native (Expo SDK 58) codebase that builds **three separate Play Store apps**. All three talk to the live backend at `https://servizato.in`; the website code does not need to change.

| App | Package | Who signs in | Main screens |
|---|---|---|---|
| **Servizato** | `in.servizato.customer` | Customers | Find services by city/PIN/location, book, booking status and timeline, live Pro location, start OTP, bills and Razorpay payment, reviews, cancellation, saved addresses |
| **Servizato Partner** | `in.servizato.partner` | Service providers **and** Pros (technicians) | **Provider:** dashboard, accept/decline booking requests, bookings, assign a Pro, add Pros (with temporary password). **Pro:** my jobs, accept and travel (shares location), arrive, start with the customer's OTP, parts, photo proof, complete |
| **Servizato Ops** | `in.servizato.ops` | Admins and dispatchers | **Admin:** overview, approve providers and services. **Both:** jobs with Pro assignment, bookings search, leads (list and create) |

Each app only lets in the roles it's built for. Anyone else sees "This account uses a different app".

## How it works

- **Sign-in** uses the same NextAuth login as the website (email/password or phone OTP). Android keeps the session cookie, so users stay signed in.
- **Write requests** send `Origin: https://servizato.in`, which the backend's origin checks require (finance, job assignment, address lookup).
- **Payments** use Razorpay's native checkout. The order is created and the payment verified through the existing `/api/customer/invoices/:id/pay` and `/api/razorpay/verify` routes.
- **Photos** upload to Cloudinary using the existing `/api/upload/signature` route.
- **Pro location** is shared only while the job screen is open and the server says tracking is allowed. The app never requests background location.

## Run it on your phone (development)

```sh
npm install
npx eas-cli@latest login
npx eas-cli@latest init        # creates the Expo project; paste the ID into EAS_PROJECT_ID in app.config.ts
npx eas-cli@latest build --profile customer-preview --platform android
```

When the build finishes, install the APK it gives you. Use `partner-preview` or `ops-preview` for the other apps.

`npm run start:customer` (or `start:partner`, `start:ops`) starts the dev server. Expo Go can show most screens, but **payments need an installed build** because Razorpay is a native module.

Run `npm run typecheck` to check the code.

## Publish to Google Play

1. **Create a Play Console developer account** (one-time US$25). A *personal* account created now must run a **closed test with at least 12 testers for 14 days in a row** before each app can go to production. An *organization* account (needs a D-U-N-S number) skips that.
2. In Play Console, **create three apps**: Servizato, Servizato Partner and Servizato Ops.
3. **Build release bundles** (`.aab`):
   ```sh
   npx eas-cli@latest build --profile customer --platform android
   npx eas-cli@latest build --profile partner  --platform android
   npx eas-cli@latest build --profile ops      --platform android
   ```
   EAS creates and keeps the signing key for each app.
4. **Upload each `.aab`** to that app's *Internal testing* track first, then *Closed testing* for the 12-tester / 14-day run. `eas submit --profile customer` can upload for you once you add a Google service-account key.
5. For **each app, fill in App content**:
   - Privacy policy URL: `https://servizato.in/privacy`
   - Data safety: name, email, phone, address, precise location, photos (Partner only), and payment info (handled by Razorpay)
   - Account deletion (see blockers below)
   - Content rating questionnaire, target audience (18+), and ads (none)
6. **Store listing:** each app needs a short description, a full description, screenshots, a 512×512 icon (`assets/icon-*.png`) and a 1024×500 feature graphic.
7. **Servizato Ops** is for staff only. Publish it on a closed or internal track only, never production, so the public can't find it.

## Must fix before going public

- **Account deletion:** Play requires apps that let people create accounts to offer deletion both in the app and through a web link. The app has a "Request account deletion" button that emails `servizato.in@gmail.com`. The website still needs a public page explaining how to request deletion, and that page's link goes in the Data safety form.
- **Legal pages:** the website README says `/privacy` and `/terms` are still waiting for business/legal approval. Play needs a final privacy policy.
- **Backend secret:** `scripts/fixCustomers.ts` in the website repo contains a real MongoDB username and password. Change that password and remove it from the file.

## Not in v1 (opens the website instead)

- **Provider setup:** onboarding, services and pricing, service areas, finance and payouts, business profile. These are in Account and open servizato.in.
- **Admin tools:** finance, price master, analytics and billing.
- **Phone push notifications:** the website uses browser Web Push, which doesn't reach native apps. The apps show the in-app notification feed (bell icon). Native push needs a backend change: store Expo/FCM tokens and send through FCM.
- Chat, Google sign-in, Pro attendance, and the customer "repeat booking" button.

## Project layout

```
app.config.ts      three variants (name, package, icon, permissions)
eas.json           build profiles: customer / partner / ops (+ -preview APKs)
src/app/           screens (Expo Router)
  customer/        customer app
  provider/        provider part of Partner
  technician/      Pro part of Partner
  staff/           admin + dispatcher (Ops)
src/lib/           API client, auth, payments, location, uploads
src/components/    shared UI
```

The icons in `assets/` were made from the website's logo, which is only about 190px. Replace them with a sharp 1024px version before launch.
