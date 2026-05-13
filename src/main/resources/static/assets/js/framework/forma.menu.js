/**
 * FormaMenu — 좌측 트리 메뉴 + 즐겨찾기
 *
 * FormaMenu.init('#menu-area', menuData);
 * FormaMenu.initFavorites(favoritesData);  // 즐겨찾기 섹션 추가
 */
const FormaMenu = {
    _menuEl: null,
    _favSection: null,
    _menuData: null,

    /**
     * 메뉴 트리 렌더링
     * @param {string} selector  메뉴 컨테이너
     * @param {Array} menuData   트리 구조 [{id, label, icon, url, children:[...]}]
     */
    _CHO: ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'],

    _getChosung(str) {
        let result = '';
        for (let i = 0; i < str.length; i++) {
            const code = str.charCodeAt(i) - 0xAC00;
            if (code >= 0 && code <= 11172) {
                result += this._CHO[Math.floor(code / 588)];
            } else {
                result += str[i];
            }
        }
        return result;
    },

    _flattenMenus(items, result) {
        result = result || [];
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.children && item.children.length > 0) {
                this._flattenMenus(item.children, result);
            } else {
                result.push(item);
            }
        }
        return result;
    },

    init(selector, menuData, opts) {
        this._menuEl = document.querySelector(selector);
        if (!this._menuEl) return;
        this._menuData = menuData;
        this._flatMenuList = this._flattenMenus(menuData);

        this._menuEl.innerHTML = '';
        this._menuEl.className = 'forma-menu';

        // 검색 UI 위치 (opts.searchTarget 지정 시 외부 컨테이너에 부착 — 예: 상단 헤더)
        const searchTargetEl = opts && opts.searchTarget
            ? (typeof opts.searchTarget === 'string' ? document.querySelector(opts.searchTarget) : opts.searchTarget)
            : null;
        const headerMode = !!searchTargetEl;

        // 메뉴 검색
        const searchWrap = document.createElement('div');
        searchWrap.className = 'forma-menu-search' + (headerMode ? ' header-mode' : '');
        searchWrap.style.cssText = headerMode
            ? 'position:relative;width:100%;'
            : 'padding:8px 10px;position:sticky;top:0;z-index:1;background:var(--bg-card);';
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'forma-input';
        searchInput.placeholder = '메뉴 검색 (이름, ID, 초성)';
        searchInput.style.cssText = headerMode
            ? 'width:100%;font-size:12px;padding:4px 10px;height:28px;border-radius:4px;color:var(--text);background:var(--bg-card);'
            : 'width:100%;font-size:12px;padding:6px 8px;color:var(--text);background:var(--bg-card);';
        searchWrap.appendChild(searchInput);

        const searchResult = document.createElement('div');
        searchResult.className = 'forma-menu-search-result' + (headerMode ? ' header-mode' : '');
        searchResult.style.display = 'none';
        if (headerMode) {
            // 헤더 모드: 드롭다운으로 표시
            searchResult.style.cssText = 'display:none;position:absolute;top:calc(100% + 4px);left:0;right:0;' +
                'background:var(--bg-card);color:var(--text);border:1px solid var(--border);border-radius:6px;' +
                'box-shadow:0 6px 24px var(--shadow);max-height:400px;overflow-y:auto;z-index:200;padding:4px;';
        }
        searchWrap.appendChild(searchResult);

        const self = this;
        let timer = null;
        searchInput.addEventListener('input', function() {
            if (timer) clearTimeout(timer);
            timer = setTimeout(function() { self._searchMenu(searchInput.value, searchResult); }, 150);
        });
        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                searchInput.value = '';
                searchResult.style.display = 'none';
                searchInput.blur();
                return;
            }
            if (searchResult.style.display === 'none') return;
            const items = searchResult.querySelectorAll('[data-search-idx]');
            if (items.length === 0) return;
            let idx = typeof searchResult._activeIdx === 'number' ? searchResult._activeIdx : -1;
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                idx = (idx + 1) % items.length;
                self._highlightSearchItem(searchResult, idx);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                idx = (idx - 1 + items.length) % items.length;
                self._highlightSearchItem(searchResult, idx);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const target = idx >= 0 ? items[idx] : items[0];
                if (target) target.click();
            }
        });

        if (headerMode) {
            searchTargetEl.innerHTML = '';
            searchTargetEl.appendChild(searchWrap);
            // 드롭다운 외부 클릭 시 닫기
            document.addEventListener('mousedown', function(e) {
                if (!searchWrap.contains(e.target)) {
                    searchResult.style.display = 'none';
                }
            });
        } else {
            this._menuEl.appendChild(searchWrap);
        }

        // 즐겨찾기 섹션 (초기에는 비어있음)
        this._favSection = document.createElement('div');
        this._favSection.className = 'forma-menu-fav-section';
        this._favSection.style.display = 'none';
        this._menuEl.appendChild(this._favSection);

        const ul = this._buildTree(menuData);
        this._menuEl.appendChild(ul);

        // MDI 탭 변경 시 메뉴 하이라이트 동기화
        if (typeof FormaMdi !== 'undefined') {
            const self = this;
            FormaMdi.onTabChange = function(id) { self._highlightMenu(id); };
        }
    },

    /**
     * 즐겨찾기 데이터 로드 및 렌더링
     * @param {Array} favorites  [{MENU_ID, MENU_NM, PGM_ID, URL, ICON}]
     */
    initFavorites(favorites) {
        if (!this._favSection) return;
        this._favSection.innerHTML = '';

        if (!favorites || favorites.length === 0) {
            this._favSection.style.display = 'none';
            return;
        }

        this._favSection.style.display = '';

        const header = document.createElement('div');
        header.className = 'forma-menu-group';
        header.textContent = '\u2605 \uC990\uACA8\uCC3E\uAE30';
        this._favSection.appendChild(header);

        const ul = document.createElement('ul');
        ul.className = 'forma-menu-root';
        const self = this;

        for (let i = 0; i < favorites.length; i++) {
            const fav = favorites[i];
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.className = 'forma-menu-item forma-menu-fav-item';
            a.style.paddingLeft = '12px';
            a.dataset.menuId = fav.PGM_ID || fav.MENU_ID || '';

            if (fav.ICON) {
                const ic = document.createElement('span');
                ic.className = 'forma-menu-icon';
                ic.textContent = fav.ICON;
                a.appendChild(ic);
            }

            const txt = document.createElement('span');
            txt.textContent = fav.MENU_NM;
            a.appendChild(txt);

            // 즐겨찾기 해제 버튼
            const removeBtn = document.createElement('span');
            removeBtn.className = 'forma-menu-fav-remove';
            removeBtn.textContent = '\u00D7';
            removeBtn.title = '\uC990\uACA8\uCC3E\uAE30 \uD574\uC81C';
            a.appendChild(removeBtn);

            (function(favItem, removeEl) {
                a.onclick = function(e) {
                    if (e.target === removeEl) {
                        e.preventDefault();
                        self.removeFavorite(favItem.MENU_ID);
                        return;
                    }
                    e.preventDefault();
                    if (typeof FormaMdi !== 'undefined') {
                        FormaMdi.open({
                            id: favItem.PGM_ID || favItem.MENU_ID,
                            label: favItem.MENU_NM,
                            url: favItem.URL
                        });
                    }
                };
            })(fav, removeBtn);

            li.appendChild(a);
            ul.appendChild(li);
        }

        this._favSection.appendChild(ul);

        // 구분선
        const hr = document.createElement('div');
        hr.className = 'forma-menu-fav-divider';
        this._favSection.appendChild(hr);
    },

    /**
     * 즐겨찾기 추가 (서버 호출)
     */
    async addFavorite(menuId) {
        const res = await platform.post('/api/user/favorites/add', { menu_id: menuId });
        if (res.resultCode === RESULT_CODE.OK) {
            await this.reloadFavorites();
            if (typeof FormaPopup !== 'undefined') FormaPopup.toast.success('\uC990\uACA8\uCC3E\uAE30\uC5D0 \uCD94\uAC00\uB418\uC5C8\uC2B5\uB2C8\uB2E4.');
        }
    },

    /**
     * 즐겨찾기 제거 (서버 호출)
     */
    async removeFavorite(menuId) {
        const res = await platform.post('/api/user/favorites/remove', { menu_id: menuId });
        if (res.resultCode === RESULT_CODE.OK) {
            await this.reloadFavorites();
            if (typeof FormaPopup !== 'undefined') FormaPopup.toast.info('\uC990\uACA8\uCC3E\uAE30\uC5D0\uC11C \uC81C\uAC70\uB418\uC5C8\uC2B5\uB2C8\uB2E4.');
        }
    },

    /**
     * 즐겨찾기 서버에서 다시 로드
     */
    async reloadFavorites() {
        const res = await platform.get('/api/user/favorites');
        if (res.resultCode === RESULT_CODE.OK) {
            this.initFavorites(res.resultData);
        }
    },

    _buildTree(items, depth) {
        depth = depth || 0;
        const ul = document.createElement('ul');
        ul.className = depth === 0 ? 'forma-menu-root' : 'forma-menu-sub';

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.className = 'forma-menu-item';
            a.style.paddingLeft = (12 + depth * 16) + 'px';

            if (item.children && item.children.length > 0) {
                // 그룹 (폴더)
                const toggle = document.createElement('span');
                toggle.className = 'forma-menu-toggle';
                toggle.textContent = '\u25BC';
                a.appendChild(toggle);

                const txt = document.createElement('span');
                txt.textContent = item.label;
                a.appendChild(txt);

                const sub = this._buildTree(item.children, depth + 1);
                li.appendChild(a);
                li.appendChild(sub);

                (function(subEl, toggleEl) {
                    a.onclick = function(e) {
                        e.preventDefault();
                        const open = subEl.style.display !== 'none';
                        subEl.style.display = open ? 'none' : '';
                        toggleEl.textContent = open ? '\u25B6' : '\u25BC';
                    };
                })(sub, toggle);
            } else {
                // 리프 (화면)
                if (item.icon) {
                    const ic = document.createElement('span');
                    ic.className = 'forma-menu-icon';
                    ic.textContent = item.icon;
                    a.appendChild(ic);
                }

                const txt2 = document.createElement('span');
                txt2.textContent = item.label;
                a.appendChild(txt2);

                if (item.id) {
                    const badge = document.createElement('span');
                    badge.className = 'forma-menu-badge';
                    badge.textContent = item.id;
                    a.appendChild(badge);
                }

                a.href = item.url || '#';
                a.dataset.menuId = item.id || '';

                // 우클릭 → 즐겨찾기 추가
                const self = this;
                (function(pageItem, menuItem) {
                    a.onclick = function(e) {
                        e.preventDefault();
                        if (typeof FormaMdi !== 'undefined') {
                            FormaMdi.open(pageItem);
                        } else {
                            location.href = pageItem.url;
                        }
                    };
                    a.oncontextmenu = function(e) {
                        e.preventDefault();
                        self._showFavContextMenu(e, menuItem);
                    };
                })(item, item);

                li.appendChild(a);
            }
            ul.appendChild(li);
        }
        return ul;
    },

    /**
     * 우클릭 시 즐겨찾기 추가 컨텍스트 메뉴
     */
    _showFavContextMenu(e, menuItem) {
        // 기존 컨텍스트 메뉴 제거
        const old = document.querySelector('.forma-menu-ctx');
        if (old) old.remove();

        const menu = document.createElement('div');
        menu.className = 'forma-menu-ctx';
        menu.style.position = 'fixed';
        menu.style.left = e.clientX + 'px';
        menu.style.top = e.clientY + 'px';
        menu.style.zIndex = '9999';
        menu.style.background = 'var(--bg-card)';
        menu.style.border = '1px solid var(--border)';
        menu.style.borderRadius = '4px';
        menu.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
        menu.style.padding = '4px 0';
        menu.style.fontSize = '12px';
        menu.style.minWidth = '120px';

        const self = this;

        // 메뉴 항목의 실제 menu_id를 찾기 (menuData의 원본 id가 아닌 MENU_ID 기반)
        const addItem = document.createElement('div');
        addItem.style.padding = '6px 12px';
        addItem.style.cursor = 'pointer';
        addItem.textContent = '\u2605 \uC990\uACA8\uCC3E\uAE30 \uCD94\uAC00';
        addItem.onmouseover = function() { this.style.background = '#f0f7ff'; };
        addItem.onmouseout = function() { this.style.background = ''; };
        addItem.onclick = function() {
            menu.remove();
            // menuItem에서 연결된 menu_id 찾기: FormaMenu의 flatMenus에서 pgm_id로 찾기
            self._addFavoriteByPgmId(menuItem.id);
        };
        menu.appendChild(addItem);

        document.body.appendChild(menu);

        // 클릭 시 닫기
        setTimeout(function() {
            document.addEventListener('click', function handler() {
                menu.remove();
                document.removeEventListener('click', handler);
            });
        }, 0);
    },

    async _addFavoriteByPgmId(pgmId) {
        // pgmId로 menu_id 조회 — 서버에서 처리
        const res = await platform.post('/api/user/favorites/add', { pgm_id: pgmId });
        if (res.resultCode === RESULT_CODE.OK) {
            await this.reloadFavorites();
            if (typeof FormaPopup !== 'undefined') FormaPopup.toast.success('\uC990\uACA8\uCC3E\uAE30\uC5D0 \uCD94\uAC00\uB418\uC5C8\uC2B5\uB2C8\uB2E4.');
        }
    },

    _searchMenu(keyword, resultEl) {
        if (!keyword || keyword.trim().length === 0) {
            resultEl.style.display = 'none';
            resultEl.innerHTML = '';
            return;
        }
        const kw = keyword.trim().toLowerCase();
        const kwChosung = this._getChosung(kw);
        const self = this;

        const matches = this._flatMenuList.filter(function(item) {
            const label = (item.label || '').toLowerCase();
            const id = (item.id || '').toLowerCase();
            const chosung = self._getChosung(label).toLowerCase();
            return label.indexOf(kw) >= 0 || id.indexOf(kw) >= 0 || chosung.indexOf(kwChosung) >= 0;
        });

        resultEl.innerHTML = '';
        if (matches.length === 0) {
            resultEl.style.display = 'block';
            resultEl.innerHTML = '<div style="padding:8px 4px;color:var(--text-muted);font-size:12px;">검색 결과가 없습니다</div>';
            return;
        }

        resultEl.style.display = 'block';
        resultEl._activeIdx = -1;
        for (let i = 0; i < matches.length && i < 10; i++) {
            const item = matches[i];
            const div = document.createElement('div');
            div.setAttribute('data-search-idx', String(i));
            div.style.cssText = 'padding:6px 8px;cursor:pointer;font-size:12px;border-radius:4px;display:flex;align-items:center;gap:6px;color:var(--text);';
            div.innerHTML =
                (item.icon ? '<span>' + item.icon + '</span>' : '') +
                '<span style="flex:1;color:var(--text)">' + item.label + '</span>' +
                '<span style="font-size:10px;color:var(--text-muted);">' + (item.id || '') + '</span>';
            (function(menuItem, idx) {
                div.onmouseover = function() { self._highlightSearchItem(resultEl, idx); };
                div.onclick = function() {
                    resultEl.style.display = 'none';
                    resultEl.parentElement.querySelector('input').value = '';
                    if (typeof FormaMdi !== 'undefined') {
                        FormaMdi.open(menuItem);
                    } else {
                        location.href = menuItem.url;
                    }
                };
            })(item, i);
            resultEl.appendChild(div);
        }
        if (matches.length > 10) {
            const more = document.createElement('div');
            more.style.cssText = 'padding:4px 8px;font-size:11px;color:var(--text-muted);';
            more.textContent = '외 ' + (matches.length - 10) + '건...';
            resultEl.appendChild(more);
        }
        // 첫 항목 자동 하이라이트 (Enter 즉시 실행 가능)
        if (matches.length > 0) this._highlightSearchItem(resultEl, 0);
    },

    _highlightSearchItem(resultEl, idx) {
        const items = resultEl.querySelectorAll('[data-search-idx]');
        const active = 'var(--bg-selected, var(--bg-hover))';
        for (let i = 0; i < items.length; i++) {
            items[i].style.background = (i === idx) ? active : '';
        }
        resultEl._activeIdx = idx;
        if (items[idx] && typeof items[idx].scrollIntoView === 'function') {
            items[idx].scrollIntoView({ block: 'nearest' });
        }
    },

    /**
     * 활성 탭에 해당하는 메뉴 항목 하이라이트
     */
    _highlightMenu(id) {
        if (!this._menuEl) return;
        const items = this._menuEl.querySelectorAll('.forma-menu-item');
        for (let i = 0; i < items.length; i++) {
            items[i].classList.toggle('active', items[i].dataset.menuId === id);
        }
    }
};
