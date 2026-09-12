# Panduan Setup Addon di Vercel (Subdomain addon.drizzev.web.id)

Laman ni **berasingan** dari laman utama Drizz — laman utama (`drizzev.web.id`) kekal
di Cloudflare, cuma laman Addon (`addon.drizzev.web.id`) pindah ke Vercel.

## Struktur fail dalam folder ini
```
public/
  index.html            ← ini sebenarnya addon.html (dinamakan semula supaya
                            subdomain terus papar dia tanpa perlu /addon.html)
api/
  addons.js               ← urus data addon + kumpulan
  addon-versions.js         ← upload/padam fail versi addon
  login.js                   ← semak login admin
package.json
vercel.json
```

## Langkah 1 — Buat repo GitHub BERASINGAN untuk addon ni
Disyorkan buat repo **baharu** (contoh: `drizz-addon`) supaya tak bercampur dengan
repo laman utama (`drizz-pro`). Ini juga buat Vercel auto-deploy hanya bila fail
addon berubah, tak terjejas oleh perubahan laman utama.

1. Buat repo baharu di GitHub, nama contoh: `drizz-addon`
2. Upload semua fail dan folder dalam ZIP ni ke repo tersebut

## Langkah 2 — Buat projek Vercel
1. https://vercel.com/signup — daftar guna GitHub (percuma, tiada kad)
2. **Add New → Project** → import repo `drizz-addon`
3. Framework Preset: **Other**
4. **Deploy** (mungkin nampak ralat buat masa ni sebab storan belum disambung — normal, teruskan)

## Langkah 3 — Sambungkan Upstash Redis
1. Projek Vercel → tab **Storage** → **Create Database** → **Upstash** → **Redis**
2. Region terdekat (contoh Singapore) → Create → **Connect** ke projek `drizz-addon`
3. Ini auto-tambah `KV_REST_API_URL` & `KV_REST_API_TOKEN`

## Langkah 4 — Sambungkan Vercel Blob
1. Tab **Storage** → **Create Database** → **Blob**
2. Nama: `drizz-addon-files` → Create → **Connect** ke projek `drizz-addon`
3. Auto-tambah `BLOB_READ_WRITE_TOKEN`

## Langkah 5 — Tambah kata laluan admin
1. **Settings → Environment Variables**:
   - `ADMIN_EMAIL` = `dariskeas@gmail.com`
   - `ADMIN_PASSWORD` = `digicomprs`
2. Save

## Langkah 6 — Redeploy
Tab **Deployments** → **⋯** → **Redeploy** (supaya env vars baharu aktif)

## Langkah 7 — Sambung subdomain addon.drizzev.web.id
Ini bahagian yang sikit berbeza sebab domain utama masih di Cloudflare:

**Di Vercel:**
1. Projek → **Settings → Domains** → **Add**
2. Masukkan `addon.drizzev.web.id` → Add
3. Vercel akan tunjukkan rekod DNS yang perlu ditambah — biasanya:
   ```
   Jenis: CNAME
   Nama: addon
   Nilai: cname.vercel-dns.com
   ```
   (Salin nilai **sebenar** yang Vercel bagi — kadang berbeza sikit)

**Di Cloudflare (sebab domain drizzev.web.id di sana):**
1. Dashboard Cloudflare → pilih domain `drizzev.web.id` → **DNS** → **Records**
2. **Add record**:
   - Type: **CNAME**
   - Name: `addon`
   - Target: (paste nilai dari Vercel tadi, contoh `cname.vercel-dns.com`)
   - Proxy status: **DNS only** (klik ikon awan supaya jadi kelabu, **bukan** oren) — ini penting supaya Vercel boleh keluarkan SSL sendiri untuk subdomain ni
3. Save
4. Balik ke Vercel, tunggu beberapa minit — status domain patut tukar jadi "Valid"

## Selesai!
- `https://addon.drizzev.web.id` — laman addon, live
- Taip **"admin"** di laman tu, atau lawati `.../#admin-login`
- Login → urus kumpulan, addon, dan versi fail — semua fail dimuat naik terus ke Vercel Blob

## Nota
- Laman utama (`drizzev.web.id`) dan laman addon (`addon.drizzev.web.id`) kini **dua projek berasingan sepenuhnya** — ubah satu tak terjejas yang lain
- Had saiz upload fail: sekitar **4.5MB** setiap fail (had Vercel Edge Function). Kalau addon anda lebih besar, bagitahu saya — ada cara upload terus ke Blob tanpa had ni (guna client-side upload token), boleh saya sediakan.
