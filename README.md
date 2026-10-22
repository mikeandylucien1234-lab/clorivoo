# Clorivo — Marketplace Multi-Vendeurs

Application mobile React Native (Expo) + prototype web, avec backend Supabase complet.

---

## Architecture

```
clorivoo/
├── Clorivo.html              ← Prototype web (React 18 + Babel CDN, 24 écrans)
├── *.jsx                     ← Écrans web (auth, home, pdp, cart, messages, seller, admin…)
├── supabase-client.jsx       ← Client Supabase + helpers web
├── supabase/
│   ├── schema.sql            ← Schéma DB complet + RLS (idempotent, safe to re-run)
│   ├── seed.sql              ← Données de démo (catégories + fonction seed_demo_products)
│   └── functions/
│       ├── send-notification/   ← Edge Function: envoi push + sauvegarde notif
│       ├── on-new-order/        ← Webhook: notifie acheteur + vendeur à chaque commande
│       └── on-new-message/      ← Webhook: notifie le destinataire de chaque message
└── mobile/clorivo-mobile/    ← App React Native / Expo (SDK 56)
    ├── App.js                ← Navigation Stack + BottomTabs
    └── src/
        ├── lib/
        │   ├── supabase.js   ← Client Supabase + tous les helpers API
        │   ├── tokens.js     ← Design tokens (couleurs, rayons, ombres)
        │   └── notifications.js ← Enregistrement + envoi push Expo
        ├── hooks/useSession.js  ← SessionProvider + useSession hook
        ├── components/UI.js  ← Btn, Input, Card, Avatar, ProductCard, EmptyState…
        └── screens/
            ├── auth/         LoginScreen, RegisterScreen
            ├── buyer/        Home, Product, Cart, Checkout, Tracking,
            │                 Messages, Chat, Profile, Orders, Categories
            ├── seller/       SellerDashboard, AddProduct, SellerOrders, ShopSetup
            └── notifications/ NotificationsScreen
```

---

## Setup Supabase (5 min)

### 1. Créer le projet
1. Aller sur [supabase.com](https://supabase.com) → New project
2. Copier **Project URL** et **anon public key**

### 2. Exécuter le schéma
Dans Supabase → **SQL Editor** → coller et exécuter `supabase/schema.sql`

### 3. Insérer les données de démo
Dans SQL Editor → exécuter `supabase/seed.sql`, puis créer un compte dans l'app et exécuter :
```sql
select seed_demo_products('VOTRE-USER-UUID');
```
→ Crée la boutique "Luna Studio" avec **18 produits réels** sur 4 catégories.

### 4. Configurer les credentials
**App mobile** (`mobile/clorivo-mobile/src/lib/supabase.js`) :
```js
const SUPABASE_URL      = 'https://VOTRE-PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'VOTRE-ANON-KEY';
```

**Prototype web** (`supabase-client.jsx`) : mêmes valeurs.

---

## Lancer l'app mobile

```bash
cd mobile/clorivo-mobile
npm install
npx expo start
```

Scanner le QR code avec **Expo Go** (App Store / Play Store) — l'app se lance en quelques secondes.

---

## Push Notifications — Deploy Edge Functions

```bash
npm install -g supabase
supabase login
supabase link --project-ref VOTRE-PROJECT-REF

supabase functions deploy send-notification
supabase functions deploy send-broadcast
supabase functions deploy send-individual-notification
supabase functions deploy on-new-order
supabase functions deploy on-order-status
supabase functions deploy on-shipment-status
supabase functions deploy on-new-message
```

### Phase 6 deployment checklist — `INTERNAL_FUNCTION_SECRET`

`send-notification` is the only entry point for system-generated
(order/payment/KYC/shipping/message) notifications and is called
server-to-server by the four webhook functions below, with no "acting
user" to run `has_permission()` against. It is instead gated by a shared
secret, `INTERNAL_FUNCTION_SECRET`, compared with a constant-time check
and **no fallback**: a missing or incorrectly configured secret on either
side fails the request closed (`401 Unauthorized`), it never falls back to
accepting the request anyway. Get the order below right or transactional
notifications will stop working until it's fixed — which is the intended,
safe failure mode, not a bug to work around with a fallback.

1. **Generate one secret value** (e.g. `openssl rand -hex 32`). Treat it
   like any other credential — never commit it, never put it in a
   `.jsx`/`.js` file read by the web app or the mobile app.
2. **Set it as a Supabase Function secret, project-wide, before deploying
   any of the functions below**:
   ```bash
   supabase secrets set INTERNAL_FUNCTION_SECRET=<your-generated-value>
   ```
   Function secrets set this way are available to every deployed Edge
   Function in the project, so this one `secrets set` covers
   `send-notification` and all four webhook functions — there is nothing
   function-specific to configure beyond this single step.
3. **Deploy `send-notification` first**, then the four webhook functions
   (`on-new-order`, `on-order-status`, `on-shipment-status`,
   `on-new-message`) — all five already read `INTERNAL_FUNCTION_SECRET`
   from this same project secret via `Deno.env.get('INTERNAL_FUNCTION_SECRET')`,
   so no per-function configuration step is needed once step 2 is done.
4. **Verify before relying on it in production**:
   - Call `send-notification` directly with no `x-internal-secret` header,
     and again with a wrong value → both must return `401`.
   - Trigger one real event of each kind (place a test order, change an
     order/shipment status, send a chat message) and confirm the
     recipient's `notifications` row and push notification arrive —
     this is the only way to confirm the secret is actually configured
     correctly end-to-end; a passing deploy does not by itself prove the
     secret matches on both sides.
5. **If you ever rotate the secret**, update the Supabase Function secret
   first, then redeploy `send-notification` and the four webhook functions
   together — a mismatched secret between them fails closed (401), it
   does not silently keep working with the old value.

This checklist exists because of a second-pass audit finding: the
fail-closed behavior above is correct, but it means a deploy that skips
step 2, or runs the functions in a different order, silently breaks every
transactional notification until the secret is set everywhere it's read
from — there is deliberately no insecure fallback to mask that mistake.

Puis dans Supabase Dashboard → **Database → Webhooks** → créer 2 webhooks :

| Table | Événement | URL de la fonction |
|---|---|---|
| `orders` | INSERT | `.../functions/v1/on-new-order` |
| `messages` | INSERT | `.../functions/v1/on-new-message` |

---

## Prototype Web

Ouvrir `Clorivo.html` dans un navigateur (Chrome/Firefox). Fonctionne offline avec données de démo.

---

## Fonctionnalités

### 📱 Acheteur (mobile)
- Inscription / Connexion (Supabase Auth + session persistée)
- Accueil : produits, boutiques, catégories, recherche live
- Page produit : galerie, sélecteur taille/couleur, avis, livraison
- Panier persisté en DB avec modification quantité
- Checkout : adresse + choix livraison standard/express
- Suivi de commande avec timeline de statuts
- Messagerie temps réel (Supabase Realtime)
- Notifications push (Expo Notifications + Edge Functions)
- Historique des commandes
- Navigation par catégories avec sidebar

### 🏪 Vendeur (mobile)
- Création de boutique (logo upload, couleur de marque, aperçu live)
- Création / édition de produits avec upload photos
- Dashboard KPIs : revenus 30j, commandes, produits actifs, note
- Gestion des commandes : avancement statut en 1 tap

### 🛠️ Admin (prototype web)
- Statistiques globales (utilisateurs, revenus, commandes)
- File de validation KYC vendeurs
- CMS bannières homepage (CRUD)

---

## Stack

| Couche | Technologie |
|---|---|
| Mobile | React Native + Expo SDK 56 |
| Navigation | React Navigation 7 (Stack + BottomTabs) |
| Backend | Supabase (PostgreSQL + Auth + Storage + Realtime) |
| Push notifications | Expo Notifications + Supabase Edge Functions (Deno) |
| Upload images | Supabase Storage (bucket `products`) |
| Session mobile | AsyncStorage adapter |
| Prototype web | React 18 + Babel CDN (zero build step) |
