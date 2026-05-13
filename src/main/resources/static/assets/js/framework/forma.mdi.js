/**
 * FormaMdi — SPA 기반 MDI (iframe 없음)
 *
 * 각 화면을 div 컨테이너로 관리한다.
 * YAML 정의 화면은 자동 렌더링, 커스텀 화면은 loadHtml로 로딩.
 *
 * FormaMdi.init('#tab-bar', '#content-area');
 * FormaMdi.open({ id: 'MMA010', label: '품목관리', url: '/pages/screen.html?id=MMA010' });
 */
const FormaMdi = {
    _tabBarEl: null,
    _contentEl: null,
    _tabs: {},        // id → { id, label, url, btn, container, ctx, listener, type }
    _order: [],       // 탭 순서 (id 배열)
    _activeId: null,
    _maxTabs: 30,

    _skipHashChange: false,  // popstate 처리 중 pushState 방지 플래그

    init(tabBarSelector, contentSelector) {
        this._tabBarEl = document.querySelector(tabBarSelector);
        this._contentEl = document.querySelector(contentSelector);

        // 브라우저 뒤로가기/앞으로가기 대응
        const self = this;
        window.addEventListener('popstate', function() {
            const hash = location.hash.replace('#', '');
            const pgmId = hash ? hash.split('?')[0] : null;

            self._skipHashChange = true;

            if (pgmId && self._tabs[pgmId]) {
                // 이미 열린 탭 → 활성화만
                self._activate(pgmId);
                self._skipHashChange = false;
            } else if (pgmId) {
                // 안 열린 화면 → 메뉴에서 찾아서 open (async이므로 then에서 플래그 해제)
                const menu = self._findMenu(pgmId);
                if (menu) {
                    self.open({ id: menu.id || menu.pgmId, label: menu.label || menu.menuNm, url: menu.url, params: self.getHashParams() })
                        .then(function() { self._skipHashChange = false; });
                } else {
                    self._skipHashChange = false;
                }
            } else if (self._activeId) {
                // hash 없음 → welcome 표시
                self._showWelcome();
                self._skipHashChange = false;
            } else {
                self._skipHashChange = false;
            }
        });
    },

    /**
     * 화면 열기
     * @param {Object} page { id, label, url, icon }
     *   url이 /pages/screen.html?id=XXX 형태면 YAML 엔진으로 렌더링
     *   아니면 HTML fetch 후 삽입
     */
    async open(page) {
        if (!page || !page.id) return;

        // 이미 열린 탭 → 활성화
        if (this._tabs[page.id]) {
            this._activate(page.id);
            return;
        }

        if (this._order.length >= this._maxTabs) {
            FormaPopup.alert.show('최대 ' + this._maxTabs + '개까지 열 수 있습니다.');
            return;
        }

        // 탭 데이터
        const tab = {
            id: page.id,
            label: page.label,
            url: page.url,
            _params: page.params || {},
            ctx: {},        // FormaForm, FormaGrid 등 컴포넌트 참조
            listener: null  // platform listener
        };

        // 탭 버튼
        tab.btn = this._createTabBtn(tab);
        this._tabBarEl.appendChild(tab.btn);

        // 콘텐츠 컨테이너
        tab.container = document.createElement('div');
        tab.container.className = 'forma-mdi-panel';
        tab.container.style.display = 'none';
        tab.container.dataset.tabId = page.id;
        this._contentEl.appendChild(tab.container);

        this._tabs[page.id] = tab;
        this._order.push(page.id);

        // welcome 숨기기
        const welcome = this._contentEl.querySelector('.erp-welcome');
        if (welcome) welcome.style.display = 'none';

        // 화면 로딩
        const screenId = this._extractScreenId(page.url);
        if (screenId) {
            await this._loadYamlScreen(tab, screenId);
        } else if (page.url) {
            await this._loadHtmlScreen(tab, page.url);
        }

        this._activate(page.id);
    },

    /**
     * YAML 정의 화면을 동적 렌더링 (레이아웃 타입별 분기)
     */
    async _loadYamlScreen(tab, screenId) {
        const defRes = await platform.get('/api/screen/' + screenId + '/definition');
        if (!defRes || defRes.resultCode !== RESULT_CODE.OK || !defRes.resultData) {
            tab.container.innerHTML = '<div style="padding:40px;color:#999;">화면 정의를 찾을 수 없습니다: ' + screenId + '</div>';
            return;
        }
        const def = defRes.resultData;
        tab.type = 'yaml';

        const S = screenId; // DOM id 접두사
        const PGM = screenId;
        const listener = platform.initListener(PGM);
        const ctx = tab.ctx;
        const apiBase = '/api/screen/' + screenId;
        const layoutType = (def.layout && def.layout.type) || 'full';
        const screenType = def.screen.type || 'list';

        // ── 1. HTML 구조 생성 (레이아웃별) ──
        const headerHtml =
            '<div class="forma-page-header">' +
                '<h1 class="forma-page-title">' + def.screen.name + ' (' + S + ')</h1>' +
                '<div id="toolbar-' + S + '"></div>' +
            '</div>';

        const searchHtml = '<div id="search-' + S + '"></div>';

        if (screenType === 'split-detail' || layoutType === 'split-h') {
            // 좌우 분할: grid1 | grid2
            const sw = (def.layout && def.layout.splitWidth) || 400;
            tab.container.innerHTML =
                '<div class="forma-page">' + headerHtml +
                '<div class="forma-content">' + searchHtml +
                    '<div class="forma-split-h" id="split-' + S + '">' +
                        '<div class="forma-split-panel" style="width:' + sw + 'px"><div id="grid1-' + S + '"></div></div>' +
                        '<div class="forma-split-handle"></div>' +
                        '<div class="forma-split-panel" style="flex:1"><div id="grid2-' + S + '"></div></div>' +
                    '</div>' +
                '</div></div>';
        } else if (screenType === 'master-detail') {
            // 상하: grid1 → form → grid2
            tab.container.innerHTML =
                '<div class="forma-page">' + headerHtml +
                '<div class="forma-content">' + searchHtml +
                    '<div id="grid1-' + S + '"></div>' +
                    '<div id="form-' + S + '" style="margin:8px 0"></div>' +
                    '<div id="grid2-' + S + '"></div>' +
                '</div></div>';
        } else {
            // list (기본)
            tab.container.innerHTML =
                '<div class="forma-page">' + headerHtml +
                '<div class="forma-content">' + searchHtml +
                    '<div id="grid1-' + S + '"></div>' +
                '</div></div>';
        }

        // ── 2. 컴포넌트 초기화 ──
        listener.initPgm = function() {
            // 검색폼
            if (def.search && def.search.length > 0) {
                ctx.searchForm = new FormaForm('#search-' + S, { search: true, elements: def.search });
            }

            // grid1
            if (def.grids && def.grids.grid1) {
                const gd = def.grids.grid1;
                ctx.grid1 = new FormaGrid('#grid1-' + S, {
                    editable: gd.editable || false,
                    checkable: gd.checkable || false,
                    sortable: gd.sortable || false,
                    columns: gd.columns || []
                });
            }

            // grid2 (split-detail, master-detail)
            if (def.grids && def.grids.grid2) {
                const gd2 = def.grids.grid2;
                ctx.grid2 = new FormaGrid('#grid2-' + S, {
                    editable: gd2.editable || false,
                    checkable: gd2.checkable || false,
                    sortable: gd2.sortable || false,
                    rowNum: gd2.rowNum || false,
                    columns: gd2.columns || []
                });
            }

            // masterForm (master-detail)
            if (def.form) {
                const formKey = Object.keys(def.form)[0]; // 첫 번째 폼
                if (formKey && def.form[formKey]) {
                    const fd = def.form[formKey];
                    ctx.masterForm = new FormaForm('#form-' + S, {
                        columns: fd.columns || 2,
                        labelWidth: fd.labelWidth || 120,
                        elements: fd.elements || []
                    });
                    ctx.masterForm.formReadonly(true); // 초기 읽기전용
                }
            }

            // grid1 클릭 → grid2 로딩 (split-detail / master-detail)
            if (ctx.grid2) {
                listener.gridRow.click = function(record) {
                    ctx._selectedRow = record;
                    // masterForm에 세팅
                    if (ctx.masterForm) {
                        ctx.masterForm.setData(record);
                    }
                    // grid2 로딩
                    const params = {};
                    for (const key in record) {
                        params[key.toLowerCase()] = record[key];
                    }
                    const cb = new Callback(function(r) {
                        if (r.resultCode === RESULT_CODE.OK && ctx.grid2) ctx.grid2.setData(r.resultData);
                    });
                    cb.setShowLoading(false);
                    platform.post(apiBase + '/selectGrid2', params, cb);
                };
                // FormaGrid에 onRowClick 연결
                if (ctx.grid1) {
                    ctx.grid1.options = ctx.grid1.options || {};
                    ctx.grid1.onRowClick = function(row) { listener.gridRow.click(row); };
                }
            }

            // 스플릿 초기화
            if (typeof FormaUtil !== 'undefined' && FormaUtil.initSplit) {
                FormaUtil.initSplit('#split-' + S);
            }

            listener.button.search.click();
        };

        // ── 3. 버튼 핸들러 ──
        listener.button.search.click = function() {
            const params = ctx.searchForm ? ctx.searchForm.getData() : {};
            platform.post(apiBase + '/selectGrid1', params, new Callback(function(r) {
                if (r.resultCode === RESULT_CODE.OK && ctx.grid1) {
                    ctx.grid1.setData(r.resultData);
                    if (ctx.grid2) ctx.grid2.clearData();
                    if (ctx.masterForm) { ctx.masterForm.clear(); ctx.masterForm.formReadonly(true); }
                }
            }));
        };

        listener.button.save.click = function() {
            // 편집 가능한 그리드를 찾아서 저장
            let targetGrid = null;
            let targetAction = null;
            if (ctx.grid2 && def.grids.grid2 && def.grids.grid2.editable) {
                targetGrid = ctx.grid2;
                targetAction = '/saveGrid2';
            } else if (ctx.grid1 && def.grids.grid1 && def.grids.grid1.editable) {
                targetGrid = ctx.grid1;
                targetAction = '/saveGrid1';
            }
            if (!targetGrid) return;

            let data = targetGrid.getCheckedData();
            if (data.length === 0) data = targetGrid.getModifiedData ? targetGrid.getModifiedData() : [];
            if (data.length === 0) { FormaPopup.alert.show('저장할 항목이 없습니다.'); return; }

            // split-detail: 선택된 마스터 행 정보를 디테일에 주입
            if (ctx._selectedRow && targetAction === '/saveGrid2') {
                data.forEach(function(row) {
                    for (const key in ctx._selectedRow) {
                        if (!row.hasOwnProperty(key)) row[key] = ctx._selectedRow[key];
                    }
                });
            }

            FormaPopup.confirm.show('저장하시겠습니까?', function(ok) {
                if (ok) platform.post(apiBase + targetAction, data, new Callback(function(r) {
                    if (r.resultCode === RESULT_CODE.OK) {
                        FormaPopup.toast.success('저장되었습니다.');
                        if (targetAction === '/saveGrid2' && ctx._selectedRow) {
                            listener.gridRow.click(ctx._selectedRow); // 디테일 재로딩
                        } else {
                            listener.button.search.click();
                        }
                    }
                }));
            });
        };

        listener.button.del.click = function() {
            let targetGrid = null;
            let targetAction = null;
            if (ctx.grid2 && def.grids.grid2 && def.grids.grid2.editable && def.grids.grid2.checkable) {
                targetGrid = ctx.grid2;
                targetAction = '/deleteGrid2';
            } else if (ctx.grid1 && def.grids.grid1) {
                targetGrid = ctx.grid1;
                targetAction = '/deleteGrid1';
            }
            if (!targetGrid) return;

            const data = targetGrid.getCheckedData();
            if (data.length === 0) { FormaPopup.alert.show('삭제할 항목을 선택하세요.'); return; }

            FormaPopup.confirm.show(data.length + '건 삭제하시겠습니까?', function(ok) {
                if (ok) platform.post(apiBase + targetAction, data, new Callback(function(r) {
                    if (r.resultCode === RESULT_CODE.OK) {
                        FormaPopup.toast.success('삭제되었습니다.');
                        if (targetAction.indexOf('Grid2') >= 0 && ctx._selectedRow) {
                            listener.gridRow.click(ctx._selectedRow);
                        } else {
                            listener.button.search.click();
                        }
                    }
                }));
            });
        };

        listener.button.news.click = function() {
            const targetGrid = (ctx.grid2 && def.grids.grid2 && def.grids.grid2.editable) ? ctx.grid2 : ctx.grid1;
            if (!targetGrid) return;
            const defaults = {};
            // 마스터 행 키 값을 기본값으로 주입
            if (targetGrid === ctx.grid2 && ctx._selectedRow) {
                for (const key in ctx._selectedRow) defaults[key] = ctx._selectedRow[key];
            }
            targetGrid.addRow(defaults);
        };

        listener.button.init.click = function() {
            if (ctx.searchForm) ctx.searchForm.clear();
            if (ctx.grid1) ctx.grid1.clearData();
            if (ctx.grid2) ctx.grid2.clearData();
            if (ctx.masterForm) { ctx.masterForm.clear(); ctx.masterForm.formReadonly(true); }
        };

        tab.listener = listener;

        // ── 4. PGM init + 툴바 ──
        try {
            const initRes = await platform.get('/api/pgm/' + PGM + '/init');
            if (initRes.resultCode === RESULT_CODE.OK) {
                listener.pgmInfo = initRes.resultData.pgmInfo;
                listener.pgmAuth = initRes.resultData.pgmAuth;
            }
        } catch (e) {
            listener.pgmInfo = {};
            listener.pgmAuth = {};
        }

        FormaToolbar.render('#toolbar-' + S, {
            listener: listener,
            pgmInfo: listener.pgmInfo,
            pgmAuth: listener.pgmAuth
        });

        listener.initPgm();
        listener.initializedPgm = true;
    },

    /**
     * 커스텀 HTML 화면 로딩 (fetch → script 실행)
     */
    async _loadHtmlScreen(tab, url) {
        tab.type = 'html';
        try {
            const res = await fetch(url);
            const html = await res.text();

            // HTML에서 body 내용만 추출
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const body = doc.body;

            // 스크립트 분리
            const scripts = body.querySelectorAll('script');
            const scriptContents = [];
            scripts.forEach(function(s) {
                if (s.src) {
                    // 외부 스크립트는 이미 로딩된 프레임워크이므로 스킵
                } else {
                    scriptContents.push(s.textContent);
                }
                s.remove();
            });

            // DOM 삽입
            tab.container.innerHTML = body.innerHTML;

            // 스크립트 실행
            scriptContents.forEach(function(code) {
                try { new Function(code)(); } catch (e) { console.error('Script error in', tab.id, e); }
            });
        } catch (e) {
            tab.container.innerHTML = '<div style="padding:40px;color:#e53935;">화면 로딩 실패: ' + url + '</div>';
            console.error('Load failed:', url, e);
        }
    },

    /**
     * URL에서 screen ID 추출
     * /pages/screen.html?id=MMA010 → MMA010
     */
    _extractScreenId(url) {
        if (!url) return null;
        if (url.indexOf('screen.html') < 0) return null;
        const match = url.match(/[?&]id=([^&]+)/);
        return match ? match[1] : null;
    },

    _createTabBtn(tab) {
        const self = this;
        const btn = document.createElement('div');
        btn.className = 'forma-mdi-tab';
        btn.dataset.tabId = tab.id;

        const label = document.createElement('span');
        label.className = 'forma-mdi-tab-label';
        label.textContent = tab.label;
        label.onclick = function() { self._activate(tab.id); };

        const close = document.createElement('span');
        close.className = 'forma-mdi-tab-close';
        close.innerHTML = '&times;';
        close.onclick = function(e) { e.stopPropagation(); self.close(tab.id); };

        btn.appendChild(label);
        btn.appendChild(close);

        // 우클릭 컨텍스트 메뉴
        btn.oncontextmenu = function(e) {
            e.preventDefault();
            self._showTabContextMenu(e, tab.id);
        };

        return btn;
    },

    _activate(id) {
        this._activeId = id;
        for (const key in this._tabs) {
            const t = this._tabs[key];
            const active = t.id === id;
            t.btn.classList.toggle('active', active);
            t.container.style.display = active ? '' : 'none';
        }
        // 활성 탭의 listener를 platform._currentListener에 동기화
        // — 검색 폼 Enter 키 등 글로벌 핸들러가 올바른 화면의 search.click을 호출하도록
        if (typeof platform !== 'undefined' && platform.listener && platform.listener[id]) {
            platform._currentListener = platform.listener[id];
        }
        // URL hash 업데이트 (pushState로 히스토리 쌓기, popstate 처리 중엔 스킵)
        if (id && !this._skipHashChange) {
            let hash = '#' + id;
            if (this._tabs[id] && this._tabs[id]._params) {
                const params = this._tabs[id]._params;
                const qs = Object.keys(params).map(function(k) { return k + '=' + encodeURIComponent(params[k]); }).join('&');
                if (qs) hash += '?' + qs;
            }
            if (location.hash !== hash) history.pushState(null, '', hash);
        }
        if (this.onTabChange) this.onTabChange(id);
    },

    close(id) {
        const tab = this._tabs[id];
        if (!tab) return;

        // 컴포넌트 정리
        if (tab.ctx) {
            for (const key in tab.ctx) {
                if (tab.ctx[key] && typeof tab.ctx[key].destroy === 'function') {
                    tab.ctx[key].destroy();
                }
            }
        }
        // listener 정리
        if (tab.listener && tab.listener.pgmId) {
            delete platform.listener[tab.listener.pgmId];
        }

        tab.btn.remove();
        tab.container.remove();
        delete this._tabs[id];
        this._order = this._order.filter(function(i) { return i !== id; });

        if (this._activeId === id) {
            if (this._order.length > 0) {
                this._activate(this._order[this._order.length - 1]);
            } else {
                this._showWelcome();
            }
        }
    },

    /** welcome 화면 표시 (탭이 모두 닫혔을 때) */
    _showWelcome() {
        const prevId = this._activeId;
        this._activeId = null;
        // 모든 패널 숨기기
        for (const key in this._tabs) {
            this._tabs[key].container.style.display = 'none';
            this._tabs[key].btn.classList.remove('active');
        }
        if (!this._skipHashChange) {
            history.pushState(null, '', location.pathname);
        }
        const welcome = this._contentEl.querySelector('.erp-welcome');
        if (welcome) welcome.style.display = '';
        if (this.onTabChange) this.onTabChange(null);
    },

    closeAll() {
        const ids = this._order.slice();
        for (let i = 0; i < ids.length; i++) this.close(ids[i]);
    },

    closeOthers(keepId) {
        const ids = this._order.filter(function(i) { return i !== keepId; });
        for (let i = 0; i < ids.length; i++) this.close(ids[i]);
    },

    _showTabContextMenu(e, tabId) {
        // 기존 메뉴 제거
        const old = document.querySelector('.forma-tab-ctx');
        if (old) old.remove();

        const self = this;
        const menu = document.createElement('div');
        menu.className = 'forma-tab-ctx';
        menu.style.cssText = 'position:fixed;z-index:9999;background:var(--bg-card);color:var(--text);border:1px solid var(--border);border-radius:4px;box-shadow:0 2px 8px var(--shadow);padding:4px 0;font-size:12px;';
        menu.style.left = e.clientX + 'px';
        menu.style.top = e.clientY + 'px';

        const items = [
            { label: '닫기', fn: function() { self.close(tabId); } },
            { label: '다른 탭 모두 닫기', fn: function() { self.closeOthers(tabId); } },
            { label: '전체 닫기', fn: function() { self.closeAll(); } }
        ];

        items.forEach(function(item) {
            const div = document.createElement('div');
            div.textContent = item.label;
            div.style.cssText = 'padding:6px 16px;cursor:pointer;';
            div.onmouseover = function() { div.style.background = 'var(--bg-hover)'; };
            div.onmouseout = function() { div.style.background = ''; };
            div.onclick = function() { menu.remove(); item.fn(); };
            menu.appendChild(div);
        });

        document.body.appendChild(menu);
        setTimeout(function() {
            document.addEventListener('click', function handler() {
                menu.remove();
                document.removeEventListener('click', handler);
            });
        }, 0);
    },

    /** pgmId로 메뉴 항목 찾기 (FormaMenu 연동) */
    _findMenu(pgmId) {
        if (typeof FormaMenu !== 'undefined' && FormaMenu._flatMenuList) {
            return FormaMenu._flatMenuList.find(function(m) {
                return (m.id || m.pgmId) === pgmId;
            }) || null;
        }
        return null;
    },

    getActiveId() { return this._activeId; },
    getOpenTabs() { return this._order.map(function(id) { const t = this._tabs[id]; return { id: t.id, label: t.label }; }.bind(this)); },
    isOpen(id) { return !!this._tabs[id]; },

    /** 현재 탭의 hash params 설정 */
    setParams(params) {
        if (this._activeId && this._tabs[this._activeId]) {
            this._tabs[this._activeId]._params = params || {};
            this._activate(this._activeId); // hash 업데이트
        }
    },

    /** 현재 hash에서 params 조회 */
    getHashParams() {
        const hash = location.hash.replace('#', '');
        const qIdx = hash.indexOf('?');
        if (qIdx < 0) return {};
        const qs = hash.substring(qIdx + 1);
        const params = {};
        qs.split('&').forEach(function(p) {
            const kv = p.split('=');
            if (kv.length === 2) params[kv[0]] = decodeURIComponent(kv[1]);
        });
        return params;
    },

    /** hash에서 화면 복원 (main.html 로딩 후 호출) */
    restoreFromHash(menuList) {
        const hash = location.hash.replace('#', '');
        if (!hash) return;
        const pgmId = hash.split('?')[0];
        if (!pgmId) return;
        // menuList에서 해당 pgm 찾기 (인자 우선, 없으면 _findMenu 폴백)
        let menu = menuList.find(function(m) { return m.pgmId === pgmId; });
        if (!menu) menu = this._findMenu(pgmId);
        if (menu) {
            this.open({ id: menu.pgmId || menu.id, label: menu.menuNm || menu.label, url: menu.url, params: this.getHashParams() });
        }
    },

    onTabChange: null
};
