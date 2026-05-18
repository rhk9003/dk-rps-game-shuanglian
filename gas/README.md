# DK 雙連店 · GAS 後端部署指南

此資料夾包含猜拳遊戲的後端（Google Apps Script）與 Google Sheet 模板說明。

---

## 🏗️ 架構圖

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│   平板 (HTML)    │─POST→│  Google Apps     │──→   │  Google Sheets  │
│  index.html      │←─────│  Script          │←──   │  3 個分頁         │
└─────────────────┘      └──────────────────┘      └─────────────────┘
      玩遊戲、掃 QR          驗證/抽獎/寫紀錄             Records 紀錄
                                                      Prizes_Ref 參考
                                                      Dashboard 即時庫存
```

---

## 📋 部署步驟（約 10 分鐘）

### 1. 建立 Google Sheet
1. 到 [sheets.google.com](https://sheets.google.com) 新建空白 Sheet
2. 命名：`DK雙連店_猜拳紀錄_20260518`（或你喜歡的名字）
3. 從網址複製 **Sheet ID**：
   ```
   https://docs.google.com/spreadsheets/d/★這一段★/edit
   ```

### 2. 貼上 Code.gs
1. 在剛剛的 Sheet 中，選單 → Extensions → Apps Script
2. 把編輯器裡預設的程式碼全部刪掉
3. 把 `Code.gs` 的內容全部貼上
4. **修改第 24 行**的 `SHEET_ID`：
   ```javascript
   const SHEET_ID = '★剛剛複製的 Sheet ID 貼這裡★';
   ```
5. 儲存（Ctrl+S / Cmd+S）

### 3. 初始化表頭
1. 在 Apps Script 編輯器頂端，選擇函式下拉：`setupSheets`
2. 按 ▶️ 執行
3. 第一次會跳 **Authorization required**：
   - 點 Review permissions
   - 選你的 Google 帳號
   - 跳「Google hasn't verified」→ Advanced → Go to (unsafe) → Allow
4. 執行成功會跳視窗「✅ 初始化完成」
5. 回 Sheet 會看到三個分頁：**Records / Prizes_Ref / Dashboard**

### 4. 部署為 Web App
1. Apps Script 右上角 → Deploy → **New deployment**
2. 齒輪圖示 → 選 **Web app**
3. 設定：
   - Description: `DK 猜拳後端 v1`
   - Execute as: **Me（你的帳號）**
   - Who has access: **Anyone**
4. 按 Deploy
5. 會產生一串 **Web app URL**，格式像：
   ```
   https://script.google.com/macros/s/XXXXXXXXXXXX/exec
   ```
6. **複製這個 URL**

### 5. 接到前端
編輯 `index.html`，找到第 1115 行：
```javascript
const GAS_URL = '';
```
改成：
```javascript
const GAS_URL = 'https://script.google.com/macros/s/XXXXXXXXXXXX/exec';
```

完成！

---

## 🧪 驗證部署成功

### 用瀏覽器測試 GET
打開部署 URL（就是 `/exec` 結尾那個），應該看到：
```json
{"ok":true,"stats":[...]}
```

### 在 Apps Script 裡測試
編輯器選擇函式下拉：
- `_test_check` → 檢查手機驗證邏輯
- `_test_draw_win` → 模擬一場贏家抽獎
- `_test_draw_lose` → 模擬一場輸家抽獎
- `_test_stats` → 印出目前所有獎項統計

執行後到 Records 分頁可以看到新增的紀錄。

---

## 📊 三個 Sheet 分頁說明

### Records（遊戲紀錄）
每一場遊戲一列。店員之後也從這裡核對兌換狀態。

| 欄 | 內容 | 範例 |
|---|---|---|
| date | 日期 | 2026-04-21 |
| phone | 手機號碼 | 0912345678 |
| result | 勝/敗 | 勝 |
| prize_id | 獎品 ID | A0220 |
| prize_name | 獎品名稱 | DK 動態釋壓鞋 $1,280 |
| code | 兌換碼 | K7M3PQ |
| timestamp | 時間戳 | 2026-04-21 14:32:15 |
| status | 兌換狀態 | 未兌換 / 已兌換 |

### Prizes_Ref（獎項參考）
**唯讀**，只是讓你在 Sheet 裡看設定。實際邏輯全在 Code.gs 的 `PRIZES` 常數。
改獎項機率請改 Code.gs，不要改這個分頁。

### Dashboard（即時庫存）
用公式自動計算：
| id | name | 總上限 | 已發 | 剩餘 | 今日已發 |
|---|---|---|---|---|---|
| A0220 | DK 動態釋壓鞋 $1,280 | 30 | 7 | 23 | 1 |

打開 Sheet 就能看到當下狀態，不用另外跑程式。

---

## 🔒 關鍵安全特性

1. **機率在伺服器決定** → 無法用 DevTools 改機率
2. **每日上限跨裝置** → 3 台平板共享同一支 Sheet 的計數
3. **手機每天限一次** → 用 Records 的 (date + phone) 判斷
4. **實體獎抽完自動改發 fallback** → `fallback` 欄位自動處理（純 LINE 券不會缺貨）
5. **兌換碼 6 碼** → 避開 0/O/1/I 等易混淆字元

---

## 🔧 常見狀況處理

### 想調整機率
改 Code.gs 的 `PRIZES` 陣列 → 儲存 → **不用重新部署**（Web App 會用最新版）

### 想手動作廢一筆紀錄
到 Records 分頁，該列 status 改成「作廢」。但目前程式不會因此讓那支號碼能再玩——這樣設計是為了防客人吵。
如果真的要讓他能再玩，就把那列 phone 清掉。

### 想手動送獎品給 VIP
直接到 Records 分頁加一列（勝/敗不重要，prize_id 寫對即可）。

### 想換新月份重跑
複製一份新的 Sheet → 換 Code.gs 的 SHEET_ID → 重新部署一次。

### 資料不會不見吧？
- Sheet 是 Google 自動備份的（版本歷史）
- 每次 `draw` 都是直接 appendRow，不會改到既有資料
- 最多重跑一次 `setupSheets`（會保留 Records 現有資料，只補 header）

---

## 📞 前端對應的 action

| 前端呼叫時機 | action | body |
|---|---|---|
| 輸入手機號碼後按「確認送出」 | `check` | `{ phone }` |
| 三戰兩勝結束、按下「轉動輪盤」 | `draw` | `{ phone, isWin }` |
| （管理用）即時看庫存 | `stats` | `{}` |

前端 `index.html` 已經把 check / draw / stats 的 fetch 寫好，只要填 GAS_URL 就會啟動。
