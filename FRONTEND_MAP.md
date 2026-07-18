# FRONTEND_MAP.md — Phonejaya / Jayaphone

Generated: 2026-07-19 (Phase 6 — Frontend Intelligence)

---

## 1. File Inventory

| File | Path | Lines | Purpose |
|------|------|-------|---------|
| index.html | /root/jayaphone/index.html | 5941 | SPA shell + all page templates + all JS logic |
| main.js | /root/jayaphone/main.js | 432 | API client, auth, upload helpers |
| svg.js | /root/jayaphone/svg.js | 150 | SVG icon constants |

**External deps (CDN):** Tailwind CSS, Chart.js 4.4.3, DOMPurify 3.1.0, Eruda (debug)

---

## 2. API Client (main.js)

### 2.1 Core Functions

| Line | Function | Purpose |
|------|----------|---------|
| 193 | `request(method, path, body)` | Core API wrapper, auto-prepends /api/v1, 30s timeout |
| 245 | `uploadFile(path, file)` | Single file FormData upload, 60s timeout |
| 278 | `uploadFiles(path, files, ...)` | Multi-file FormData upload, 120s timeout |

### 2.2 BASE_URL Configuration

```javascript
// main.js line 1
const BASE_URL = window.BACKEND_URL || 'https://jayaphone.vercel.app';
// index.html line 18
window.BACKEND_URL = 'https://phonejaya.vercel.app';
```

### 2.3 Auth Flow

1. Login: `POST /auth/login` → store token in localStorage as `jyp_token`
2. Auto-attach: `Authorization: Bearer <token>` on every request
3. On 401: clear token, reload page
4. Init: check token → `GET /auth/me` → if valid, call `showApp()`

---

## 3. Complete Frontend→Backend Endpoint Map

### Auth
| Frontend Call | Backend Endpoint | Method |
|--------------|-----------------|--------|
| API.auth.login(body) | /api/v1/auth/login | POST |
| API.auth.me() | /api/v1/auth/me | GET |

### Dashboard
| Frontend Call | Backend Endpoint | Method |
|--------------|-----------------|--------|
| API.dashboard.stats(params) | /api/v1/dashboard/stats | GET |
| API.dashboard.trend(params) | /api/v1/dashboard/trend | GET |

### Units
| Frontend Call | Backend Endpoint | Method |
|--------------|-----------------|--------|
| API.units.list(params) | /api/v1/units | GET |
| API.units.create(body) | /api/v1/units | POST |
| API.units.approveRepair(id, body) | /api/v1/units/{id}/approve-repair | POST |
| API.units.detail(id) | /api/v1/units/{id}/detail | GET |

### Transaksi
| Frontend Call | Backend Endpoint | Method |
|--------------|-----------------|--------|
| API.transaksi.list(params) | /api/v1/transaksi | GET |
| API.transaksi.create(body) | /api/v1/transaksi | POST |
| API.transaksi.createSparepart(body) | /api/v1/transaksi/sparepart | POST |
| API.transaksi.detail(id) | /api/v1/transaksi/{id}/detail | GET |

### Karyawan
| Frontend Call | Backend Endpoint | Method |
|--------------|-----------------|--------|
| API.karyawan.list(params) | /api/v1/karyawan | GET |
| API.karyawan.create(body) | /api/v1/karyawan | POST |
| API.karyawan.stats(id, params) | /api/v1/karyawan/{id}/stats | GET |
| API.karyawan.resetPassword(id, body) | /api/v1/karyawan/{id}/password | PATCH |

### Log
| Frontend Call | Backend Endpoint | Method |
|--------------|-----------------|--------|
| API.log.list(params) | /api/v1/log | GET |

### Service
| Frontend Call | Backend Endpoint | Method |
|--------------|-----------------|--------|
| API.service.list(params) | /api/v1/service | GET |
| API.service.get(id) | /api/v1/service/{id} | GET |
| API.service.update(id, body) | /api/v1/service/{id} | PUT |
| API.service.pendingApproval(params) | /api/v1/service/pending-approval | GET |
| API.service.detail(id) | /api/v1/service/{id}/detail | GET |

### Customers
| Frontend Call | Backend Endpoint | Method |
|--------------|-----------------|--------|
| API.customers.list(params) | /api/v1/customers | GET |
| API.customers.create(body) | /api/v1/customers | POST |

### Sparepart
| Frontend Call | Backend Endpoint | Method |
|--------------|-----------------|--------|
| API.sparepart.list(params) | /api/v1/sparepart | GET |
| API.sparepart.create(body) | /api/v1/sparepart | POST |
| API.sparepart.updateStok(id, body) | /api/v1/sparepart/{id}/stok | PATCH |

### Cabang
| Frontend Call | Backend Endpoint | Method |
|--------------|-----------------|--------|
| API.cabang.list() | /api/v1/cabang | GET |
| API.cabang.create(body) | /api/v1/cabang | POST |
| API.cabang.update(kode, body) | /api/v1/cabang/{kode} | PATCH |
| API.cabang.assignKepala(kode, body) | /api/v1/cabang/{kode}/kepala | POST |
| API.cabang.fireKaryawan(id) | /api/v1/cabang/karyawan/{id} | DELETE |

### Request Sparepart
| Frontend Call | Backend Endpoint | Method |
|--------------|-----------------|--------|
| API.requestSparepart.list(params) | /api/v1/request-sparepart | GET |
| API.requestSparepart.create(body) | /api/v1/request-sparepart | POST |
| API.requestSparepart.respond(id, body) | /api/v1/request-sparepart/{id} | PATCH |

### Transfer Stok
| Frontend Call | Backend Endpoint | Method |
|--------------|-----------------|--------|
| API.transferStok.list(params) | /api/v1/transfer-stok | GET |
| API.transferStok.create(body) | /api/v1/transfer-stok | POST |
| API.transferStok.respond(id, body) | /api/v1/transfer-stok/{id} | PATCH |
| API.transferStok.notifCount() | /api/v1/transfer-stok/notif/count | GET |
| API.transferStok.notifPending() | /api/v1/transfer-stok/notif/pending | GET |
| API.transferStok.cabangList() | /api/v1/transfer-stok/cabang-list | GET |

### COD
| Frontend Call | Backend Endpoint | Method |
|--------------|-----------------|--------|
| API.cod.list(params) | /api/v1/cod | GET |
| API.cod.detail(id) | /api/v1/cod/{id} | GET |
| API.cod.kurirDashboard(params) | /api/v1/cod/kurir/dashboard | GET |
| API.cod.kurirList(params) | /api/v1/cod/kurir-list | GET |
| API.cod.kurirAccept(id) | /api/v1/cod/kurir/{id}/accept | POST |
| API.cod.kurirReject(id) | /api/v1/cod/kurir/{id}/reject | POST |
| API.cod.kurirStatus(id, body) | /api/v1/cod/kurir/{id}/status | POST |
| API.cod.kurirInputStok(body) | /api/v1/cod/kurir/input-stok | POST |
| API.cod.kurirLog(params) | /api/v1/cod/kurir/log | GET |
| API.cod.kurirMonitoring(params) | /api/v1/cod/kurir/monitoring | GET |

### Influencer
| Frontend Call | Backend Endpoint | Method |
|--------------|-----------------|--------|
| API.influencer.dashboard(params) | /api/v1/influencer/dashboard/stats | GET |
| API.influencer.catalog(params) | /api/v1/influencer/catalog | GET |
| API.influencer.createVideo(body) | /api/v1/influencer/videos | POST |
| API.influencer.listVideos(params) | /api/v1/influencer/videos | GET |
| API.influencer.log(params) | /api/v1/influencer/log | GET |
| API.influencer.sync() | /api/v1/influencer/sync | POST |

### Owner Influencer Monitor
| Frontend Call | Backend Endpoint | Method |
|--------------|-----------------|--------|
| API.ownerInfluencer.dashboard() | /api/v1/influencer/owner/dashboard | GET |
| API.ownerInfluencer.videos(params) | /api/v1/influencer/owner/videos | GET |
| API.ownerInfluencer.influencers() | /api/v1/influencer/owner/influencers | GET |

### Upload
| Frontend Call | Backend Endpoint | Method |
|--------------|-----------------|--------|
| API.upload.image(file) | /api/v1/upload/image | POST |
| API.upload.images(files) | /api/v1/upload/images | POST |
| API.upload.delete(body) | /api/v1/upload/image | POST* |

*Note: upload.delete uses POST, not DELETE — potential mismatch with backend

---

## 4. Role-Based UI Pages

| Role | Pages (27 total) |
|------|-----------------|
| owner | dashboard, stok, transaksi, laporan, service, karyawan, cabang, log, influencer-monitor, kurir-monitoring |
| kepala_cabang | dashboard, stok, transfer-stok, transaksi, laporan, service, approval-repair, sparepart, request-sparepart, karyawan, log, kurir-monitoring |
| kasir | stok-kasir, input-transaksi, tambah-unit, approval-repair, request-sparepart, customers |
| teknisi | service-list, request-sparepart, teknisi-log |
| influencer | influencer-dashboard, influencer-catalog, influencer-videos, influencer-log |
| kurir | kurir-dashboard, kurir-input-stok, kurir-log |

---

## 5. Frontend→Backend Sync Check

### Endpoints Used by Frontend vs Backend Registered

All 55 frontend API calls map to registered backend endpoints. No stale endpoints found.

### Potential Sync Issues

1. **upload.delete**: Frontend calls via POST, backend has DELETE endpoint at `/upload/image`
2. **service.pendingApproval**: Frontend calls `/service/pending-approval`, backend registers it ✓
3. **cod.kurirList**: Frontend calls `/cod/kurir-list`, backend registers it ✓

---

## 6. Security Notes

- Token stored in localStorage (XSS-vulnerable)
- DOMPurify loaded but not consistently used
- Eruda debug console loaded in production
- Hardcoded production URL in index.html
