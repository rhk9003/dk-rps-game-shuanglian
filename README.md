# 🎮 DK 雙連店 - 猜拳拿好禮

為 DK 雙連店門口的閨密機（米家 Android 螢幕）開發的互動遊戲，吸引路過客加入 LINE 官方帳號、領取折價券。

## 📖 遊戲流程

1. **歡迎畫面** — 「來玩猜拳 通通有獎」
2. **輸入手機號碼** — 每支手機每天限玩一次
3. **猜拳遊戲** — 三戰兩勝，玩家 vs 電腦
4. **輪盤遊戲** — 贏家轉大獎輪盤 / 輸家轉安慰輪盤
5. **領獎畫面** — 掃 QR code 加入 LINE 領取獎品
6. **冷卻畫面** — 10 秒後自動回首頁

## 🚀 本機測試

```bash
pip install -r requirements.txt
streamlit run streamlit_app.py
```

開啟瀏覽器到 `http://localhost:8501` 即可測試。

## 🌐 Streamlit Cloud 部署

1. Fork / Push 這個 repo 到你的 GitHub
2. 到 [share.streamlit.io](https://share.streamlit.io) 登入
3. New app → 選擇此 repo → Main file 填 `streamlit_app.py`
4. Deploy → 拿到網址給同事測試

## 📱 實機部署（米家螢幕）

直接把 `index.html` 丟到螢幕裡，用瀏覽器全螢幕打開即可（不需要 Streamlit）。

## 📂 檔案結構

```
.
├── index.html           # 遊戲主程式（純 HTML/CSS/JS，可獨立運作）
├── streamlit_app.py     # Streamlit 封裝（給同事測試用）
├── requirements.txt     # Python 依賴
└── README.md
```

## 🎁 獎品配置

### 🏆 大獎輪盤（贏家）
| 獎品 | 機率 |
|------|------|
| 200 元折價券 | 10% |
| 100 元折價券 | 25% |
| 免費鞋墊券 | 30% |
| 免費襪子券 | 35% |

### 🎁 安慰輪盤（輸家）
| 獎品 | 機率 |
|------|------|
| 50 元折價券 | 20% |
| 購物袋兌換券 | 30% |
| 鞋帶兌換券 | 25% |
| 保養品體驗組 | 25% |

獎品項目與機率可在 `index.html` 中的 `WIN_PRIZES` / `LOSE_PRIZES` 常數區塊調整。

## 🔧 後續整合

- [ ] 串接 Google Apps Script 進行手機號碼防重複驗證
- [ ] 串接 Google Sheets 儲存遊玩紀錄
- [ ] 串接 LINE 官方帳號優惠券系統
- [ ] 根據實機測試微調 UI

## 📊 根據問卷數據設計

本遊戲設計參考 **DK 府中店滿意度調查**（2026/3/24-4/13, 148 份有效回覆）：
- 62% 客群為 50 歲以上女性 → 介面採大字體、高對比、簡單操作
- 57 次提及「路過看到」為第一認知管道 → 門口閨密機強化吸引力
- 64% 新會員「聽過沒買過」 → 用遊戲獎品推動首購轉換
- 「舒適好穿」107 次提及 → 獎品主打鞋墊、保養相關贈品
