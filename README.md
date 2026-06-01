# 🌊 海風・數據・翅膀｜2026 AI × ESG × 無人機跨域研討會官網 Wireframe

> **當演算法學會呼吸，當翅膀承載永續**
> 2026 年 9 月 16-17 日｜高雄・本所演講廳＋香蕉碼頭｜150 人產官學研跨域論壇

---

## 🎯 專案目標

建置一個**可瀏覽原型等級**的官方活動網站，作為研討會正式啟動前的視覺與功能對焦工具。同時提供完整的報名系統原型，可實際接收並儲存報名資料。

### 核心設計語彙
- **主色**：深海藍 `#0A2540`（港都沉穩）+ 科技綠 `#00E5A0`（AI 生機）+ 港都金 `#F5B843`（價值光澤）
- **字型**：Noto Sans TC + Inter（中英雙軌無縫切換）
- **氛圍**：港都科技感、跨域專業、B2B 信任質地

---

## ✅ 已完成功能

### 📄 頁面模組（共 6 頁）

| 頁面 | 路徑 | 功能重點 |
|---|---|---|
| 🏠 **首頁** | `index.html` | Hero 視覺 + 倒數計時 + 三大主軸 + 10 大議題 + 講者預覽 + 展區預覽 |
| 📅 **議程表** | `agenda.html` | Day 1 / Day 2 雙日分頁切換・完整時間軸・類型色彩分類 |
| 🎤 **講者陣容** | `speakers.html` | 30+ 位講者卡片・產/官/學/研四類篩選器 |
| 🎪 **展區導覽** | `exhibition.html` | 8 大展區卡片・含 400㎡ 視覺化平面圖 wireframe |
| 💰 **贊助夥伴** | `sponsors.html` | 鑽石/金/銀/媒體四級贊助分區・權益對照表・招商 CTA |
| 📝 **報名系統** | `register.html` | 票種選擇 + 完整表單 + Table API 串接 |

### 🔧 共用模組
- `css/style.css`：全站設計系統（含 CSS 變數、深色導覽、RWD 斷點）
- `js/common.js`：導覽切換、倒數計時、Toast 通知

### 💾 資料儲存（RESTful Table API）
**Table 名稱**：`registrations`

| 欄位 | 型別 | 說明 |
|---|---|---|
| `id` | text | 唯一識別碼（自動產生） |
| `name` | text | 姓名 |
| `email` | text | 電子郵件 |
| `phone` | text | 聯絡電話 |
| `organization` | text | 服務單位 |
| `title` | text | 職稱 |
| `sector` | text (enum) | 參與身分（產/官/學/研/媒/他） |
| `ticket_type` | text (enum) | 票種（早鳥/產業/學研免費等） |
| `dietary` | text (enum) | 飲食需求 |
| `attend_day1` | bool | 參加第一天 |
| `attend_day2` | bool | 參加第二天 |
| `attend_gala` | bool | 參加晚宴 |
| `interests` | array | 感興趣議題（多選） |
| `remarks` | rich_text | 備註 |
| `status` | text (enum) | 報名狀態 |
| `submitted_at` | datetime | 報名時間 |

---

## 🔗 功能入口 URI 一覽

| URL | 方法 | 說明 |
|---|---|---|
| `/` 或 `/index.html` | GET | 首頁 |
| `/agenda.html` | GET | 議程表（切換參數 `?day=day1` 或 `day2`，由 JS 控制）|
| `/speakers.html` | GET | 講者列表（篩選由 JS 控制：`data-sector` 屬性）|
| `/exhibition.html` | GET | 展區導覽 + 平面圖 |
| `/sponsors.html` | GET | 贊助分級，錨點 `#become` 跳至招商區 |
| `/register.html` | GET | 報名表單 |
| `tables/registrations` | POST | 新增報名資料（JSON body） |
| `tables/registrations` | GET | 列出所有報名資料（分頁 `?page=1&limit=20`） |
| `tables/registrations/{id}` | GET / PATCH / DELETE | 單筆資料操作 |

### 報名 POST 範例
```json
POST tables/registrations
{
  "name": "王小明",
  "email": "ming@example.com",
  "phone": "0912-345-678",
  "organization": "XX 科技",
  "title": "資深工程師",
  "sector": "產業界",
  "ticket_type": "產業票",
  "dietary": "葷食",
  "attend_day1": true,
  "attend_day2": true,
  "attend_gala": false,
  "interests": ["AI 碳盤查", "無人機巡檢"],
  "status": "待繳費",
  "submitted_at": 1756310400000
}
```

---

## 🎨 視覺設計亮點

1. **Hero 動態視覺**：三環旋轉軌道 + 浮動光球 + 三張數據卡片（10 議題/30+ 講者/8 展區）
2. **倒數計時條**：毛玻璃效果，即時顯示距離 2026/9/16 開幕的天時分秒
3. **三大主軸漸層卡**：AI 深藍 / ESG 翠綠 / UAV 琥珀金，視覺隱喻清晰
4. **議題卡微動畫**：hover 時頂部浮現漸層線 + 上移陰影
5. **議程時間軸**：類型標籤色彩分流（Keynote 金、Panel 綠、Ceremony 紅、Break 灰）
6. **展區平面圖**：手繪 wireframe 風格，方格網點背景，清楚呈現環形動線
7. **報名票種卡**：可點擊切換的選取狀態，左側 sticky 固定陪伴表單滾動

---

## 🚧 尚未實作 / 下一步建議

### 短期（正式案啟動時補強）
- [ ] 真實講者照片與簡歷頁（目前為 placeholder 文字 avatar）
- [ ] 報名確認信自動發送（需接 Email SaaS，如 SendGrid）
- [ ] 金流串接（綠界、藍新）—目前為「待繳費」狀態原型
- [ ] 早鳥票倒數限額顯示（即時 API 查詢剩餘數）
- [ ] 後台管理頁（可瀏覽/匯出報名名單為 CSV）

### 中期
- [ ] 英文版（i18n 切換）—目標吸引國際講者與媒體
- [ ] 新聞稿與媒體資料下載區
- [ ] 海報徵稿投稿頁（含檔案上傳原型）
- [ ] Google 地圖嵌入（香蕉碼頭 + 停車指引）

### 長期
- [ ] 活動當日互動：行動版議程 App / 即時 QA 投稿
- [ ] 會後成果頁：論壇影片、簡報下載、合影相簿

---

## 🏗️ 技術架構

- **純前端靜態網站**（HTML5 + CSS3 + Vanilla JS）
- **CSS 架構**：CSS 變數 + BEM-ish 命名，不依賴框架
- **CDN 資源**：Google Fonts（Noto Sans TC + Inter）、Font Awesome 6.5.1
- **資料層**：RESTful Table API（內建於部署環境）

### 檔案結構
```
/
├── index.html          主頁
├── agenda.html         議程
├── speakers.html       講者
├── exhibition.html     展區
├── register.html       報名
├── sponsors.html       贊助
├── css/
│   └── style.css       全站設計系統
├── js/
│   └── common.js       共用互動腳本
└── README.md           本文件
```

---

## 📐 設計決策說明

### 為什麼選「深海藍 × 科技綠」而非典型科技藍？
深海藍有港都的重量感與歷史縱深，避開一般科技業常見的「LinkedIn 藍」；科技綠則呼應 ESG 永續意象，同時讓畫面有青春感——這個配色組合**拒絕讓觀者在第一眼就猜到是政府標案**。

### 為什麼要有 Wireframe 等級的平面圖？
展區是這場活動的記憶點。讓贊助商、講者、報名者在看網站時就能「心裡有那張圖」，大大減少現場無法想像的距離感。

### 為什麼報名表單切成卡片 + 右側主體？
sticky ticket panel 是 SaaS 商業票務網站的標準模式（KKTIX、Accupass 都是這種動線）——讓使用者在填表時始終看得到自己選的票種與價格，降低「填一半忘記價格」的流失率。

---

## 🚀 部署說明

本專案為靜態網站，所有頁面皆可透過 Publish tab 一鍵發佈。

> 💡 **提示**：部署後可透過 `/tables/registrations` API 直接存取報名資料，建議在正式啟動前搭配 basic auth 或後台頁面保護。

---

*Designed with 🌊 in Kaohsiung · 本專案為 Wireframe 原型，實際執行時請依最終需求調整。*
