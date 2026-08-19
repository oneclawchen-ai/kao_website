# 安全報名系統

此網站已改為由後端 API 接收報名資料。報名資料會先以 AES-256-GCM 加密保存，再由授權管理端匯出為 `registrations.xlsx`；Excel 檔案不放在公開網站目錄。

## 啟動前設定

1. 將 `server.mjs`、`.env.example`、所有 HTML、`css/` 與 `js/` 放在同一個網站資料夾。
2. 將 `.env.example` 複製為 `.env`，填入：
   - `PUBLIC_ORIGIN`：正式網站的 HTTPS 網址。
   - `ADMIN_TOKEN`：管理者匯出 Excel 使用的長隨機密碼，不要放進前端。
   - `REGISTRATION_ENCRYPTION_KEY`：64 個十六進位字元的 AES-256 金鑰。
3. `DATA_DIR` 應指向網站公開目錄之外的資料夾，並限制只有伺服器帳號可以讀寫。
4. 使用 HTTPS 反向代理後再對外開放，不要直接把 Node 服務暴露在網際網路。

## 產生安全金鑰

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 啟動

```powershell
node server.mjs
```

使用者必須由 `http://localhost:8080/` 或正式 HTTPS 網址開啟報名頁，不能直接雙擊 `register.html`，因為瀏覽器的 `file://` 頁面無法安全呼叫 API。

## GitHub Pages + Render 部署

1. 將 `server.mjs`、`package.json`、`render.yaml` 與 `.env.example` 放在 GitHub repository 根目錄；前端 HTML、`css/`、`js/` 也可放在同一個 repository。
2. 在 Render 選擇 **New → Blueprint**，連接 GitHub repository，讓 Render 讀取 `render.yaml`。
3. 在 Render 的 Environment 補上三個 Secret：
   - `PUBLIC_ORIGIN`：只填 GitHub Pages 的來源，例如 `https://yourname.github.io`，不要加 repository 路徑。
   - `ADMIN_TOKEN`：長隨機管理 Token。
   - `REGISTRATION_ENCRYPTION_KEY`：32 bytes、64 個十六進位字元。
4. Render 建立 Web Service 後，將 `register.html` 裡的 `registration-api` 改成 Render 網址，例如 `https://secure-registration-api.onrender.com`，再推送到 GitHub。
5. GitHub Pages 只發布前端檔案；報名資料由 Render API 接收。不要把 `private-data/`、`.env`、`registrations.xlsx` 或管理 Token 推送到 GitHub。
6. `render.yaml` 已配置 `/var/data` 持久磁碟。Render 預設檔案系統是暫存的；若要保存 Excel 與加密資料，必須使用持久磁碟或改接資料庫。

## 管理者匯出 Excel

使用管理者工具或 API client，帶上 `x-admin-token` header 呼叫：

```text
GET /admin/export.xlsx
x-admin-token: <ADMIN_TOKEN>
```

不要將 token 放在 URL、HTML、JavaScript、Git 或錯誤訊息中。正式環境還應搭配防火牆、HTTPS、備份、最小權限帳號、存取稽核與個資保存期限政策。
