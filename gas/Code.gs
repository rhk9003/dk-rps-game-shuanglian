/**
 * ====================================================================
 * DK 雙連店 · 猜拳遊戲後端（Google Apps Script）
 * --------------------------------------------------------------------
 * 功能：
 *   1. 驗證手機號碼（每支每天限玩一次）
 *   2. 伺服器端抽獎（依機率 + 庫存 + 每日上限）
 *   3. 寫入遊戲紀錄到 Google Sheet
 *   4. 實體獎抽完自動改發 fallback（純 LINE 券，不會缺貨）
 * --------------------------------------------------------------------
 * 部署步驟：
 *   1. 新建 Google Sheet（隨意命名，例如「DK雙連店_猜拳紀錄」）
 *   2. 複製 Sheet 網址中的 ID（d/ 與 /edit 之間那串）
 *   3. Extensions → Apps Script，貼上此檔
 *   4. 修改 SHEET_ID 常數為剛剛複製的 ID
 *   5. 儲存後，先手動執行 setupSheets() 一次，初始化表頭
 *      （會跳權限視窗，授權後就好）
 *   6. Deploy → New deployment → Web app
 *        • Execute as: Me
 *        • Who has access: Anyone
 *   7. 把產生的 URL 填入 index.html 第 1115 行 GAS_URL
 * ====================================================================
 */

// ★ 部署前必填：Google Sheet ID
const SHEET_ID = '1hrvHmJDtCNqVAaJWVXm_N2-FxJ5OTqBVHhKs1kAtN0w';

const TZ = 'Asia/Taipei';

/**
 * 獎項主表（與 index.html 的 WIN_PRIZES / LOSE_PRIZES 必須 id 對齊）
 * totalLimit / dailyLimit = -1 代表不限
 * fallback = 抽完後自動改發哪個 id（通常指向純 LINE 券，不會缺貨）
 */
const PRIZES = [
  // 🏆 贏家池（100% / 375 場）
  { id: 'A0220',         pool: 'win', name: 'DK 動態足弓拖鞋 $1,280', prob: 8,    totalLimit: 30, dailyLimit: 1,  fallback: 'W_500_VOUCHER' },
  { id: 'A0119',         pool: 'win', name: 'DK 五趾隱形襪 $250',    prob: 25,   totalLimit: 60, dailyLimit: 2,  fallback: 'W_500_VOUCHER' },
  { id: 'W_500_CASH',    pool: 'win', name: '官網鞋款滿 $2,000 折 $500', prob: 20,   totalLimit: -1, dailyLimit: -1 },
  { id: 'W_7_OFF',       pool: 'win', name: '門市 7 折券',            prob: 25,   totalLimit: -1, dailyLimit: -1 },
  { id: 'W_500_VOUCHER', pool: 'win', name: '門市 $500 折價券',       prob: 22,   totalLimit: -1, dailyLimit: -1 },

  // 🎁 輸家 / 參加池
  { id: 'A0114',         pool: 'lose', name: 'DK 涼感底紗襪 $180',    prob: 20,   totalLimit: 60, dailyLimit: 2,  fallback: 'L_100_VOUCHER' },
  { id: 'L_50_CASH',     pool: 'lose', name: '$50 官網抵用金',        prob: 20,   totalLimit: -1, dailyLimit: -1 },
  { id: 'L_8_OFF',       pool: 'lose', name: '門市 8 折券',            prob: 27.5, totalLimit: -1, dailyLimit: -1 },
  { id: 'L_100_VOUCHER', pool: 'lose', name: '門市 $100 折價券',       prob: 30,   totalLimit: -1, dailyLimit: -1 },
];

// ====================================================================
//  HTTP 入口
// ====================================================================
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents || '{}');
    const action = data.action;

    if (action === 'check') return _json(check(data.phone));
    if (action === 'draw')  return _json(draw(data.phone, !!data.isWin));
    if (action === 'stats') return _json(getStats());

    return _json({ ok: false, error: 'unknown action: ' + action });
  } catch (err) {
    return _json({ ok: false, error: err.toString(), stack: err.stack });
  }
}

// GET 提供簡單測試用（打開部署 URL 就能看到目前統計）
function doGet() {
  return _json({ ok: true, stats: getStats() });
}

function _json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ====================================================================
//  action: check  —— 確認手機號碼今天是否已玩過
// ====================================================================
function check(phone) {
  const p = _normalizePhone(phone);
  if (!/^09\d{8}$/.test(p)) {
    return { ok: false, canPlay: false, reason: 'invalid_phone' };
  }

  const records = _allRecords();
  const today = _today();
  const hit = records.some(r => r.date === today && r.phone === p);

  return {
    ok: true,
    canPlay: !hit,
    reason: hit ? 'already_played_today' : 'ok'
  };
}

// ====================================================================
//  action: draw  —— 伺服器端抽獎
//  流程：
//    1. 過濾出本池尚有庫存的獎項（檢查 totalLimit + dailyLimit）
//    2. 依剩餘獎項的機率加權抽籤
//    3. 寫入 Records Sheet
//    4. 回傳 { prize, code }
// ====================================================================
function draw(phone, isWin) {
  const p = _normalizePhone(phone);
  const pool = isWin ? 'win' : 'lose';

  // 1. 撈出本池所有獎項
  const candidates = PRIZES.filter(x => x.pool === pool);

  // 2. 計算每個獎項已發出多少
  const records = _allRecords();
  const today = _today();
  const stats = {};
  records.forEach(r => {
    if (!stats[r.prizeId]) stats[r.prizeId] = { total: 0, today: 0 };
    stats[r.prizeId].total++;
    if (r.date === today) stats[r.prizeId].today++;
  });

  // 3. 過濾：排除已達總上限或今日上限的
  let available = candidates.filter(x => {
    const s = stats[x.id] || { total: 0, today: 0 };
    if (x.totalLimit !== -1 && s.total >= x.totalLimit) return false;
    if (x.dailyLimit !== -1 && s.today >= x.dailyLimit) return false;
    return true;
  });

  // 4. 極端情況：整池都沒了 → 用 fallback（純 LINE 券）
  if (available.length === 0) {
    available = candidates.filter(x => x.totalLimit === -1);
  }

  // 5. 依機率加權抽
  const totalProb = available.reduce((s, x) => s + x.prob, 0);
  let r = Math.random() * totalProb;
  let drawn = available[available.length - 1];
  for (const x of available) {
    if (r < x.prob) { drawn = x; break; }
    r -= x.prob;
  }

  // 6. 產生兌換碼
  const code = _makeCode();

  // 7. 寫入 Records
  // ★ 手機號碼與日期加 ' 前綴強制文字格式，避免 Sheets 吃掉開頭的 0 或把日期轉成 Date 物件
  _sheet('Records').appendRow([
    "'" + today,             // A: date（強制字串，不讓 Sheets 自動轉 Date）
    "'" + p,                 // B: phone（強制字串，保留開頭的 0）
    isWin ? '勝' : '敗',      // C: result
    drawn.id,                // D: prize_id
    drawn.name,              // E: prize_name
    code,                    // F: code
    new Date(),              // G: timestamp（這個保留成 Date 物件方便排序）
    '未兌換'                  // H: status（給店員人工更新）
  ]);

  // 8. 回傳
  return {
    ok: true,
    prize: {
      id: drawn.id,
      name: drawn.name,
      isPhysical: drawn.totalLimit !== -1  // true 表示實體獎品，店員需核對
    },
    code: code
  };
}

// ====================================================================
//  action: stats  —— 給管理頁面看即時庫存（選用）
// ====================================================================
function getStats() {
  const records = _allRecords();
  const today = _today();

  return PRIZES.map(p => {
    const total = records.filter(r => r.prizeId === p.id).length;
    const todayN = records.filter(r => r.prizeId === p.id && r.date === today).length;
    return {
      id: p.id,
      pool: p.pool,
      name: p.name,
      prob: p.prob,
      totalLimit: p.totalLimit,
      dailyLimit: p.dailyLimit,
      totalUsed: total,
      todayUsed: todayN,
      remaining: p.totalLimit === -1 ? '不限' : (p.totalLimit - total),
      soldOut: p.totalLimit !== -1 && total >= p.totalLimit
    };
  });
}

// ====================================================================
//  Helpers
// ====================================================================
function _sheet(name) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  return ss.getSheetByName(name);
}

function _today() {
  return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
}

function _normalizePhone(p) {
  return String(p || '').replace(/\D/g, '');
}

function _allRecords() {
  const sheet = _sheet('Records');
  if (!sheet) return [];
  const last = sheet.getLastRow();
  if (last < 2) return [];
  const rows = sheet.getRange(2, 1, last - 1, 6).getValues();
  return rows.map(r => ({
    date: _toDateStr(r[0]),
    phone: _normalizePhone(r[1]),
    result: r[2],
    prizeId: r[3],
    prizeName: r[4],
    code: r[5]
  }));
}

/**
 * Google Sheets 會把 "2026-04-22" 這種字串自動轉成 Date 物件儲存
 * 讀回來時需要統一格式成 yyyy-MM-dd 字串
 */
function _toDateStr(v) {
  if (!v) return '';
  if (v instanceof Date) {
    return Utilities.formatDate(v, TZ, 'yyyy-MM-dd');
  }
  return String(v);
}

function _makeCode() {
  // 去掉容易混淆的字元（0/O、1/I/l）
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

// ====================================================================
//  一次性初始化（部署時執行一次）
// ====================================================================
function setupSheets() {
  if (SHEET_ID === 'PASTE_YOUR_SHEET_ID_HERE') {
    throw new Error('請先在 Code.gs 頂部填入 SHEET_ID');
  }

  const ss = SpreadsheetApp.openById(SHEET_ID);

  // 1) Records 遊戲紀錄表
  let records = ss.getSheetByName('Records');
  if (!records) records = ss.insertSheet('Records');
  if (records.getLastRow() === 0) {
    const headers = ['date', 'phone', 'result', 'prize_id', 'prize_name', 'code', 'timestamp', 'status'];
    records.appendRow(headers);
    records.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#2D3142')
      .setFontColor('#ffffff');
    records.setFrozenRows(1);
    // 欄寬
    records.setColumnWidth(1, 90);   // date
    records.setColumnWidth(2, 110);  // phone
    records.setColumnWidth(3, 60);   // result
    records.setColumnWidth(4, 120);  // prize_id
    records.setColumnWidth(5, 240);  // prize_name
    records.setColumnWidth(6, 90);   // code
    records.setColumnWidth(7, 160);  // timestamp
    records.setColumnWidth(8, 80);   // status
  }
  // ★ 強制 A 欄（date）為純文字格式，避免 Sheets 自動把 "2026-04-22" 轉成 Date 物件
  records.getRange('A:A').setNumberFormat('@');
  // B 欄（phone）也強制文字，避免 09xxxx 開頭 0 被吃掉
  records.getRange('B:B').setNumberFormat('@');

  // 2) Prizes_Ref 參考表（只供查閱用，邏輯全在 Code.gs 的 PRIZES 常數）
  let prizes = ss.getSheetByName('Prizes_Ref');
  if (!prizes) prizes = ss.insertSheet('Prizes_Ref');
  prizes.clear();
  const prizeHeaders = ['id', 'pool', 'name', 'prob(%)', 'total_limit', 'daily_limit', 'fallback'];
  prizes.appendRow(prizeHeaders);
  PRIZES.forEach(p => prizes.appendRow([
    p.id, p.pool, p.name, p.prob,
    p.totalLimit === -1 ? '不限' : p.totalLimit,
    p.dailyLimit === -1 ? '不限' : p.dailyLimit,
    p.fallback || ''
  ]));
  prizes.getRange(1, 1, 1, prizeHeaders.length)
    .setFontWeight('bold')
    .setBackground('#2D3142')
    .setFontColor('#ffffff');
  prizes.setFrozenRows(1);
  prizes.autoResizeColumns(1, prizeHeaders.length);

  // 3) Dashboard 即時庫存（公式自動計算）
  let dash = ss.getSheetByName('Dashboard');
  if (!dash) dash = ss.insertSheet('Dashboard');
  dash.clear();
  dash.appendRow(['id', 'name', 'total_limit', '已發', '剩餘', '今日已發']);
  const row = 2;
  PRIZES.forEach((p, i) => {
    const r = row + i;
    dash.getRange(r, 1).setValue(p.id);
    dash.getRange(r, 2).setValue(p.name);
    dash.getRange(r, 3).setValue(p.totalLimit === -1 ? '不限' : p.totalLimit);
    dash.getRange(r, 4).setFormula(`=COUNTIF(Records!D:D,"${p.id}")`);
    if (p.totalLimit === -1) {
      dash.getRange(r, 5).setValue('不限');
    } else {
      dash.getRange(r, 5).setFormula(`=C${r}-D${r}`);
    }
    dash.getRange(r, 6).setFormula(
      `=COUNTIFS(Records!D:D,"${p.id}",Records!A:A,TEXT(TODAY(),"yyyy-mm-dd"))`
    );
  });
  dash.getRange(1, 1, 1, 6)
    .setFontWeight('bold')
    .setBackground('#2D3142')
    .setFontColor('#ffffff');
  dash.setFrozenRows(1);
  dash.autoResizeColumns(1, 6);

  SpreadsheetApp.getUi().alert('✅ 初始化完成！\n已建立：Records / Prizes_Ref / Dashboard 三個分頁');
}

// ====================================================================
//  本機測試（在 Apps Script 編輯器直接執行就可以）
// ====================================================================
function _test_check() {
  console.log(check('0912345678'));
}

function _test_draw_win() {
  console.log(draw('0912345678', true));
}

function _test_draw_lose() {
  console.log(draw('0987654321', false));
}

function _test_stats() {
  console.log(JSON.stringify(getStats(), null, 2));
}
