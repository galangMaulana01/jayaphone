# COD Commission System Design

## Overview
Daily earnings tracking for kurir based on COD transactions completed.

---

## Commission Rates Configuration

```python
# app/utils/commission.py
COMMISSION_RATES = {
    "beli": {
        "type": "percent",
        "value": 0.02,        # 2%
        "min": 15000,         # minimum Rp 15.000
        "description": "Komisi beli HP dari penjual"
    },
    "jual": {
        "type": "percent", 
        "value": 0.03,        # 3%
        "min": 20000,         # minimum Rp 20.000
        "description": "Komisi jual HP ke pembeli"
    },
    "delivery": {
        "type": "flat",
        "value": 10000,       # flat Rp 10.000
        "description": "Komisi antar/ambil barang"
    }
}
```

---

## Formula

| Type | Status Trigger | Formula |
|------|----------------|---------|
| Beli | `selesai` | `max(deal_price * 2%, 15000)` |
| Jual | `transaksi_berhasil` | `max(offer_price * 3%, 20000)` |
| Delivery | `terkirim` | `10000` (flat) |

**Contoh:**
- Kurir beli HP deal 5jt → komisi = max(5jt × 2%, 15rb) = **Rp 100.000**
- Kurir jual HP offer 8jt → komisi = max(8jt × 3%, 20rb) = **Rp 240.000**
- Kurir delivery 1 COD → komisi = **Rp 10.000**

---

## API Endpoints Needed

### 1. Kurir - Daily Earnings (Self)
```
GET /api/v1/cod/kurir/daily-earnings?date=2026-07-22
Response:
{
  "date": "2026-07-22",
  "total_earnings": 350000,
  "breakdown": [
    {"cod_id": "PMK-COD-001", "type": "beli", "deal_price": 5000000, "commission": 100000, "status": "selesai", "completed_at": "..."},
    {"cod_id": "PMK-COD-002", "type": "jual", "offer_price": 8000000, "commission": 240000, "status": "transaksi_berhasil", "completed_at": "..."}
  ],
  "summary": {"beli": 100000, "jual": 240000, "delivery": 10000}
}
```

### 2. Owner/KC - All Kurir Earnings Report
```
GET /api/v1/cod/kurir/earnings-report?date=2026-07-22&cabang=PMK
Response:
[
  {
    "kurir_id": "kurir_001",
    "kurir_name": "Adit Sopo",
    "total_earnings": 350000,
    "total_cod": 3,
    "breakdown": [...]
  }
]
```

### 3. Monthly Summary
```
GET /api/v1/cod/kurir/monthly-earnings?month=2026-07&cabang=PMK
Response:
{
  "month": "2026-07",
  "cabang": "PMK",
  "total_earnings_all_kurir": 8500000,
  "kurir_list": [...],
  "daily_breakdown": {...}
}
```

---

## Service Functions to Add

```python
# app/services/cod_service.py

async def get_kurir_daily_earnings(db, kurir_id: str, date: str) -> dict:
    """Get daily earnings for a specific kurir"""
    pass

async def get_all_kurir_daily_earnings(db, cabang: str, date: str) -> List[dict]:
    """Get daily earnings for all kurir in cabang (Owner/KC)"""
    pass

async def get_monthly_earnings(db, cabang: str, year: int, month: int) -> dict:
    """Monthly earnings report"""
    pass

def calculate_commission(cod_type: str, deal_price: int, offer_price: int = 0) -> int:
    """Calculate commission based on COD type and price"""
    pass
```

---

## Frontend Pages

### Kurir Dashboard - Add Earnings Card
```
┌─────────────────────────────────────┐
│  💰 Pendapatan Hari Ini (22 Jul)    │
│  Rp 350.000                         │
│  ┌────────┬────────┬──────────────┐ │
│  │ Beli   │ 2 COD  │ Rp 100.000   │ │
│  │ Jual   │ 1 COD  │ Rp 240.000   │ │
│  │ Delivery│ 1 COD │ Rp 10.000    │ │
│  └────────┴────────┴──────────────┘ │
│  [Lihat Detail →]                   │
└─────────────────────────────────────┘
```

### Owner/KC - Earnings Report Page
```
┌────────────────────────────────────────────┐
│  📊 Laporan Pendapatan Kurir - 22 Jul 2026 │
│  Cabang: [PMK ▼]  [Filter Tanggal]         │
├──────────────┬──────────┬──────┬───────────┤
│ Kurir        │ Pendapatan│ COD  │ Detail    │
├──────────────┼──────────┼──────┼───────────┤
│ Adit Sopo    │ Rp 350rb │ 3    │ [Lihat]   │
│ Budi         │ Rp 180rb │ 2    │ [Lihat]   │
│ Citra        │ Rp 0     │ 0    │ [Lihat]   │
├──────────────┼──────────┼──────┼───────────┤
│ TOTAL        │ Rp 530rb │ 5    │           │
└──────────────┴──────────┴──────┴───────────┘
```

---

## Database Index Needed

```javascript
// For efficient aggregation
db.cod_requests.createIndex({ "kurir_id": 1, "status": 1, "created_at": 1 })
db.cod_requests.createIndex({ "cabang": 1, "type": 1, "status": 1, "created_at": 1 })
```

---

## Implementation Priority

| Phase | Task | Effort |
|-------|------|--------|
| 1 | Create `commission.py` constants | ⭐ |
| 2 | Add `calculate_commission()` helper | ⭐ |
| 3 | Add `get_kurir_daily_earnings()` service | ⭐⭐ |
| 4 | Add route `/kurir/daily-earnings` | ⭐ |
| 5 | Add route `/kurir/earnings-report` (Owner/KC) | ⭐⭐ |
| 6 | Frontend: Kurir dashboard earnings card | ⭐⭐ |
| 7 | Frontend: Owner/KC earnings report page | ⭐⭐⭐ |

---

## Notes
- Commission rates should be configurable (env var or DB config)
- Only count COD with status `selesai` (beli) / `transaksi_berhasil` (jual) / `terkirim` (delivery)
- Date filter uses `updated_at` (when status changed to completed)
- Kurir only sees own earnings; Owner/KC sees all in cabang
- Consider adding "withdrawal" feature later (tarik komisi ke rekening)