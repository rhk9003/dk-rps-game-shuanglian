"""
DK 雙連店 - 猜拳拿好禮 閨密機遊戲
Streamlit 封裝版 - 用於團隊測試
"""
import streamlit as st
import streamlit.components.v1 as components
from pathlib import Path

# ====== 頁面設定 ======
st.set_page_config(
    page_title="DK 雙連店 - 猜拳拿好禮",
    page_icon="✊",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# ====== 隱藏 Streamlit 預設介面元素 ======
HIDE_STREAMLIT_STYLE = """
<style>
    /* 隱藏 Streamlit 頂部選單、footer、header */
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    header {visibility: hidden;}
    .stDeployButton {display: none;}

    /* 移除主容器的 padding，讓遊戲可以全螢幕 */
    .main .block-container {
        padding-top: 0rem;
        padding-bottom: 0rem;
        padding-left: 0rem;
        padding-right: 0rem;
        max-width: 100%;
    }

    /* 隱藏 iframe 邊框 */
    iframe {
        border: none !important;
    }
</style>
"""
st.markdown(HIDE_STREAMLIT_STYLE, unsafe_allow_html=True)

# ====== 讀取並嵌入遊戲 HTML ======
HTML_FILE = Path(__file__).parent / "index.html"

if not HTML_FILE.exists():
    st.error(f"❌ 找不到遊戲檔案: {HTML_FILE}")
    st.stop()

html_content = HTML_FILE.read_text(encoding="utf-8")

# 嵌入遊戲（高度設成 900 給直式/橫式都能顯示）
components.html(html_content, height=900, scrolling=False)

# ====== 側邊欄：測試用資訊 ======
with st.sidebar:
    st.title("🎮 DK 猜拳遊戲")
    st.caption("Demo 版本 - 供團隊測試")

    st.markdown("---")
    st.markdown("### 📋 測試說明")
    st.markdown("""
    - 點擊「**開始遊戲**」進入
    - 輸入任意 10 碼 09 開頭手機號碼
    - 每支手機**每天限玩一次**
    - 三戰兩勝決定輸贏
    - 勝者轉大獎輪盤、敗者轉安慰輪盤
    - 結果畫面會顯示 QR code（Demo 版為示意圖）
    - 領獎後提示「明天再來玩」
    """)

    st.markdown("---")
    st.markdown("### 🎁 獎品配置")
    st.markdown("""
    **🏆 大獎輪盤（贏家）**
    - 200元折價券（10%）
    - 100元折價券（25%）
    - 免費鞋墊券（30%）
    - 免費襪子券（35%）

    **🎁 安慰輪盤（輸家）**
    - 50元折價券（20%）
    - 購物袋兌換券（30%）
    - 鞋帶兌換券（25%）
    - 保養品體驗組（25%）
    """)

    st.markdown("---")
    st.markdown("### 🔧 待整合項目")
    st.markdown("""
    - [ ] Google Apps Script 手機驗證
    - [ ] Google Sheets 紀錄儲存
    - [ ] 真實 LINE QR code 產生
    - [ ] 實機 UI 微調
    """)

    st.markdown("---")
    st.caption("Powered by DK 雙連店")
