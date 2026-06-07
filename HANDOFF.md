# 接手清單（HANDOFF）

> 最後更新：2026-05-19
> 換電腦 / 過幾天才回來繼續做的時候，照這個清單跑完雙連店就能正式上線。

---

## 現況

- ✅ Repo 從府中 fork 出來，店名字串全換成「雙連店」
- ✅ `index.html` 加 **welcome idle attract 系統**：每 20 秒隨機播一段 MP3 招呼路人；進手機/猜拳/輪盤畫面自動停；回 welcome 自動恢復；welcome 觸控會 reset timer
- ✅ `assets/audio/` 有 3 段 ElevenLabs 暫用錄音（**發音偏怪，待用真人錄音覆蓋**）
- ✅ 共用府中的 GAS Web App + Google Sheet（府中活動已停、雙連接棒，省掉重新部署）
- ✅ GitHub Pages 已開：https://rhk9003.github.io/dk-rps-game-shuanglian/
- ✅ 獎品設定（WIN_PRIZES / LOSE_PRIZES / totalLimit / 機率）與府中完全一致

---

## ⚠️ 已知問題：袖套（A0003）還會被抽到 → 後端 GAS 要重新部署

**症狀**：雙連店有客人抽到「石墨烯袖套」，但前端 / 後端的 repo 早在 commit `fe89e27` 就移除了。

**原因**：GAS Web App 是**手動部署**的，改了 `gas/Code.gs` 不會自動生效。目前共用的那份線上 GAS 仍是**含袖套（A0003）的舊版**，所以伺服器端還抽得出袖套，前端只能照實顯示（且查無領獎 QR）。

**根本解（必做，約 2 分鐘）**：把現在的 `gas/Code.gs` 重新部署到線上：

1. 開 [Google Sheet](https://docs.google.com/spreadsheets/d/1hrvHmJDtCNqVAaJWVXm_N2-FxJ5OTqBVHhKs1kAtN0w/edit) → 上方選單 **擴充功能 → Apps Script**
2. 把整支 `gas/Code.gs` 內容貼上覆蓋（確認 `PRIZES` 裡**沒有 A0003**、`SHEET_ID` 沒被動到）
3. 右上 **部署 → 管理部署作業** → 點現有部署右邊的 ✏️ → **版本：新版本** → **部署**
   - ⚠️ 一定要「**編輯現有部署 + 新版本**」，這樣 `/exec` 網址不變、`index.html` 的 `GAS_URL` 不用改。另開全新部署網址會變，得回頭改 `index.html`。
4. 完成後直接用瀏覽器打開那個 `/exec` 網址（GET），確認回傳的 `stats` 清單裡**沒有袖套 / A0003**。

**已加的前端保險（已生效）**：`index.html` 的 `spinWheel()` 現在只要收到前端獎池沒有的獎品 id，就改抽一個本地有效獎項、不會把未知獎品顯示給客人。但這只是安全網——**後端沒重新部署前，後台 Records 仍可能記到 A0003**，請務必完成上面的重新部署。

---

## 待辦（依優先序）

### 1. 換真人錄音 ⭐ 最重要

ElevenLabs 中文女聲都是 narration 沉穩風，硬做愉悅吸客 callout 跑不出真人溫度。**手機自己錄 3 段約 5-8 秒**：

| 檔名 | 建議內容 |
|---|---|
| `attract_1.mp3` | 「來玩猜拳～通通有獎喔～」 |
| `attract_2.mp3` | 「贏家抽五百元折價券～」 |
| `attract_3.mp3` | 「免費的喔～來玩看看～」 |

錄完直接覆蓋 `assets/audio/attract_{1,2,3}.mp3`，git push。Pages 1-2 分鐘 redeploy。

> 想試別的 voice / TTS：腳本在 `scripts/gen_attract_audio.py`，目前用 Tiffy + `eleven_multilingual_v2`。但**強烈建議走真人錄音這條**。

### 2. 切換 Google Sheet（30 秒）

開 [Sheet](https://docs.google.com/spreadsheets/d/1hrvHmJDtCNqVAaJWVXm_N2-FxJ5OTqBVHhKs1kAtN0w/edit)：

1. 右鍵 `Records` 分頁 → 複製 → 重命名「`Records_府中_backup`」（**保留府中歷史，永久不動**）
2. 回原 `Records` 分頁 → 選第 2 列到最後 → 右鍵 → 刪除列
3. Dashboard 數字應該瞬間歸零（公式是 `COUNTIF(Records!D:D, ...)`，清掉就重置）

雙連從此用乾淨的 `Records` 從 0 開始記。**獎品 / 庫存 / 機率不用改 Code.gs。**

### 3. 米家螢幕上線

1. 米家螢幕的瀏覽器打開 https://rhk9003.github.io/dk-rps-game-shuanglian/
2. 全螢幕
3. **店員手動點一下螢幕**（解鎖 audio autoplay；每次 reload 都要一次。建議店長開店時做）
4. 確認 attract 錄音 20 秒後會自己喊話、音量在店門口夠大
5. 跑一輪完整流程確認：手機 → 猜拳 → 輪盤 → 領獎 → 回 welcome

### 4. 可選後續

- **一鍵清空後台**：把 commit `b562c58` revert 掉的 `clearRecords()` 函式加回 `gas/Code.gs`
- **多店未來架構**：`Records` 加 `store` 欄、`Code.gs` 寫入時帶 store、Dashboard 公式改 `COUNTIFS` 加店別篩選

---

## 重要連結

| 項目 | URL |
|---|---|
| Live 頁面（雙連） | https://rhk9003.github.io/dk-rps-game-shuanglian/ |
| GitHub repo（雙連） | https://github.com/rhk9003/dk-rps-game-shuanglian |
| GAS Web App | https://script.google.com/macros/s/AKfycbwk5U3.../exec |
| Google Sheet | https://docs.google.com/spreadsheets/d/1hrvHmJDtCNqVAaJWVXm_N2-FxJ5OTqBVHhKs1kAtN0w/edit |
| 府中 repo（已停） | https://github.com/rhk9003/dk-rps-game |

---

## 換電腦設定

```bash
git clone https://github.com/rhk9003/dk-rps-game-shuanglian.git ~/Downloads/dk-rps-game-shuanglian
cd ~/Downloads/dk-rps-game-shuanglian
# 開瀏覽器本機測試：
python3 -m http.server 8000
# → http://localhost:8000
```

如果要重生 ElevenLabs 錄音：腳本會自動 fallback 到 `~/Video/OpenMontage/.env` 抓 `ELEVENLABS_API_KEY`。新電腦沒有那檔案就 `cp .env.example .env` 自己填 key。

---

## 程式碼地圖（找東西用）

| 想改什麼 | 在哪 |
|---|---|
| 店名顯示文字 | `index.html:6` (title), `index.html:990` (welcome badge) |
| GAS_URL | `index.html:1119` |
| Attract 錄音檔案路徑 / 間隔秒數 | `index.html:1125-1163` (config + functions 區塊) |
| Attract 啟動/解鎖 / 觸控 reset | `index.html` 接近檔尾 `</script>` 之前 |
| `showScreen()` 切畫面邏輯 | `index.html:1178` |
| 獎品 / 機率 / QR URL | `index.html:1104-1117` (`WIN_PRIZES` / `LOSE_PRIZES`) |
| 後端獎品邏輯（庫存 / 抽獎 / 寫紀錄） | `gas/Code.gs:35-48` (`PRIZES`) + 整支 Code.gs |
| ElevenLabs 重生腳本 | `scripts/gen_attract_audio.py` |
