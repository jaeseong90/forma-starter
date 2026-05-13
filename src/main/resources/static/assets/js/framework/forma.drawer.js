/**
 * FormaDrawer — 우측에서 슬라이드로 밀려들어오는 상세 패널.
 *
 * 언제 쓰나:
 *   · 목록(그리드)을 그대로 두고 한 건의 상세를 봐야 할 때
 *   · 모달처럼 차단하지 않고 문맥(뒤 그리드)을 유지하고 싶을 때
 *
 * 사용법:
 *   const drawer = new FormaDrawer({ title: '사업 상세', width: 560 });
 *   await drawer.show();
 *   drawer.body().innerHTML = '...';
 *   drawer.setFooter('<button class="forma-btn">닫기</button>');
 *   drawer.close();
 *
 *   // 인스턴스 메서드:
 *   drawer.body()                    // 본문 element
 *   drawer.setFooter(htmlOrElement)  // 푸터(선택). 없으면 푸터 영역 자체 생성 안 함
 *   drawer.close()                   // 닫기 (onClose 콜백 호출)
 *
 * 스택 관리: 여러 드로어가 겹치면 z-index 자동 조정, ESC 는 최상단만 닫힘.
 */

const _formaDrawerStack = [];
const _formaDrawerBaseZ = 6000;

class FormaDrawer {
    constructor(config) {
        config = config || {};
        this.config = {
            title: config.title || '상세',
            width: config.width || 560,
            closeOnEsc: config.closeOnEsc !== false,
            closeOnOverlay: config.closeOnOverlay !== false,
            onClose: config.onClose || function() {},
        };
        this.overlay = null;
        this.drawer = null;
        this._footer = null;
        this._destroyed = false;
    }

    async show() {
        _formaDrawerStack.push(this);
        const zIndex = _formaDrawerBaseZ + (_formaDrawerStack.length * 10);

        // 오버레이
        this.overlay = document.createElement('div');
        this.overlay.className = 'forma-drawer-overlay';
        this.overlay.style.zIndex = zIndex;

        // 드로어 패널
        this.drawer = document.createElement('div');
        this.drawer.className = 'forma-drawer';
        this.drawer.style.width = this.config.width + 'px';
        this.drawer.style.zIndex = zIndex + 1;

        // 헤더
        const header = document.createElement('div');
        header.className = 'forma-drawer-header';
        const title = document.createElement('span');
        title.textContent = this.config.title;
        header.appendChild(title);

        const closeBtn = document.createElement('button');
        closeBtn.className = 'forma-drawer-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.setAttribute('aria-label', '닫기');
        const self = this;
        closeBtn.onclick = function() { self.close(); };
        header.appendChild(closeBtn);

        this.drawer.appendChild(header);

        // 바디
        this._body = document.createElement('div');
        this._body.className = 'forma-drawer-body';
        this.drawer.appendChild(this._body);

        // 오버레이/드로어 DOM 에 추가
        document.body.appendChild(this.overlay);
        document.body.appendChild(this.drawer);

        // 슬라이드-인 (브라우저 다음 프레임에 class 토글)
        requestAnimationFrame(function() {
            self.overlay.classList.add('is-open');
            self.drawer.classList.add('is-open');
        });

        // 오버레이 클릭
        if (this.config.closeOnOverlay) {
            this.overlay.onclick = function() { self.close(); };
        }

        // ESC
        if (this.config.closeOnEsc) {
            this._escHandler = function(e) {
                if (e.key === 'Escape') {
                    const top = _formaDrawerStack[_formaDrawerStack.length - 1];
                    if (top === self) self.close();
                }
            };
            document.addEventListener('keydown', this._escHandler);
        }
    }

    body() { return this._body; }

    setFooter(htmlOrEl) {
        if (!this._footer) {
            this._footer = document.createElement('div');
            this._footer.className = 'forma-drawer-footer';
            this.drawer.appendChild(this._footer);
        }
        if (typeof htmlOrEl === 'string') this._footer.innerHTML = htmlOrEl;
        else { this._footer.innerHTML = ''; this._footer.appendChild(htmlOrEl); }
        return this._footer;
    }

    close() {
        if (this._destroyed) return;
        this._destroyed = true;

        const self = this;
        if (this.overlay) this.overlay.classList.remove('is-open');
        if (this.drawer) this.drawer.classList.remove('is-open');

        // 애니메이션 종료 후 DOM 제거
        setTimeout(function() {
            if (self.overlay) { self.overlay.remove(); self.overlay = null; }
            if (self.drawer)  { self.drawer.remove();  self.drawer = null; }
        }, 240);

        if (this._escHandler) {
            document.removeEventListener('keydown', this._escHandler);
            this._escHandler = null;
        }
        const idx = _formaDrawerStack.indexOf(this);
        if (idx >= 0) _formaDrawerStack.splice(idx, 1);

        try { this.config.onClose(); } catch (e) {}
    }

    static current() {
        return _formaDrawerStack[_formaDrawerStack.length - 1] || null;
    }
}

window.FormaDrawer = FormaDrawer;
