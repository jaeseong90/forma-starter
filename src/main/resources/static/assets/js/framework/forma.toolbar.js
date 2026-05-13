/**
 * FormaToolbar — 화면 상단 공통 버튼바
 * pgmInfo/pgmAuth 기반 버튼 표시/숨김, 단축키 지원
 */
class FormaToolbar {

    static BUTTONS = [
        { key: 'search', label: '조회', shortcut: 'F3', primary: true, infoKey: 'srchYn' },
        { key: 'news',   label: '신규', shortcut: 'F4', infoKey: 'newYn' },
        { key: 'save',   label: '저장', shortcut: 'F9', infoKey: 'saveYn' },
        { key: 'del',    label: '삭제', shortcut: 'F8', infoKey: 'delYn' },
        { key: 'print',  label: '출력', shortcut: 'F11', infoKey: 'prntYn' },
        { key: 'upload', label: '업로드', infoKey: 'upldYn' },
        { key: 'init',   label: '초기화', shortcut: 'F12', infoKey: 'initYn' },
    ];

    static render(selector, options = {}) {
        const container = document.querySelector(selector);
        if (!container) return;
        const pgmInfo = options.pgmInfo || {};
        const pgmAuth = options.pgmAuth || {};
        const listener = options.listener || {};

        container.innerHTML = '';
        container.classList.add('forma-toolbar');

        for (const def of FormaToolbar.BUTTONS) {
            if (pgmInfo[def.infoKey] === 'N') continue;
            if (pgmAuth[def.infoKey] === 'N') continue;

            const btn = document.createElement('button');
            btn.className = 'forma-btn' + (def.primary ? ' forma-btn-primary' : '');
            btn.textContent = def.label + (def.shortcut ? ' [' + def.shortcut + ']' : '');
            btn.dataset.key = def.key;
            btn.onclick = () => listener.button?.[def.key]?.click();

            if (listener.button?.[def.key]) {
                listener.button[def.key]._el = btn;
                listener.button[def.key].hide = () => { btn.style.display = 'none'; };
                listener.button[def.key].show = () => { btn.style.display = ''; };
            }
            container.appendChild(btn);
        }

        // etc 버튼 (etcDesc1 ~ etcDesc5)
        for (let i = 1; i <= 5; i++) {
            const desc = pgmInfo['etcDesc' + i];
            if (!desc) continue;
            const key = 'etc' + i;
            const btn = document.createElement('button');
            btn.className = 'forma-btn';
            btn.textContent = desc;
            btn.dataset.key = key;
            btn.onclick = () => listener.button?.[key]?.click();
            if (listener.button?.[key]) {
                listener.button[key]._el = btn;
                listener.button[key].hide = () => { btn.style.display = 'none'; };
                listener.button[key].show = () => { btn.style.display = ''; };
            }
            container.appendChild(btn);
        }

        // 단축키 — 활성 MDI 탭 + 모달/로딩 없을 때만
        const pgmId = pgmInfo.pgmId || '';
        document.addEventListener('keydown', (e) => {
            // 모달이 열려있으면 무시
            if (document.querySelector('.forma-modal-overlay, .forma-loading-overlay, .forma-popup-overlay')) return;
            // MDI 환경에서 현재 활성 탭이 아니면 무시
            if (typeof FormaMdi !== 'undefined' && FormaMdi.getActiveId && pgmId) {
                if (FormaMdi.getActiveId() !== pgmId) return;
            }

            const map = { F3: 'search', F4: 'news', F8: 'del', F9: 'save', F11: 'print', F12: 'init' };
            const key = map[e.key];
            if (key && listener.button?.[key]?._el?.style.display !== 'none') {
                e.preventDefault();
                listener.button[key].click();
            }
        });
    }
}
