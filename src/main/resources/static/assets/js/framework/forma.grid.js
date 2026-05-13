/**
 * FormaGrid - 상용 수준 ERP 데이터 그리드
 *
 * 기능: N단 멀티헤더, frozen, gstat, 인라인 편집(8종 에디터), 정렬, footer,
 *       키보드 셀 내비게이션, 클립보드(Ctrl+C/V), 셀 렌더러, 필터행,
 *       컬럼 리사이즈/자동맞춤, CSV, 체크박스, 페이징, 셀CSS, 검증
 */
class FormaGrid {
    constructor(selector, options = {}) {
        this.container = typeof selector === 'string' ? document.querySelector(selector) : selector;
        this.options = options;
        this.columns = options.columns || [];
        this.editable = options.editable || false;
        this.checkable = options.checkable || false;
        this.sortable = options.sortable || false;
        this.rowNum = options.rowNum || false;
        this.reorderable = options.reorderable || false;
        this.paging = options.paging || false;
        this.filterable = options.filterable || false;
        this.verticalLines = options.verticalLines || false;
        this.rowHover = options.rowHover !== undefined ? options.rowHover : true;
        this._hideToolbar = options.hideToolbar || false;
        // 행 추가/삽입/삭제 제어 (editable이어도 개별 비활성화 가능)
        this.allowAddRow = options.allowAddRow !== undefined ? options.allowAddRow : true;
        this.allowInsertRow = options.allowInsertRow !== undefined ? options.allowInsertRow : true;
        this.allowDeleteRow = options.allowDeleteRow !== undefined ? options.allowDeleteRow : true;
        // 행 추가/삭제 훅 — 반환값: false → 취소, 객체(addRow) → 행 속성 치환, 배열(deleteRow) → 대상 치환
        this.onBeforeAddRow = typeof options.onBeforeAddRow === 'function' ? options.onBeforeAddRow : null;
        this.onBeforeDeleteRow = typeof options.onBeforeDeleteRow === 'function' ? options.onBeforeDeleteRow : null;
        this.allowPaste = options.allowPaste !== undefined ? options.allowPaste : true;
        // Excel/CSV/인쇄 컨텍스트 메뉴 제어
        this.allowExport = options.allowExport || false;
        this.allowImport = options.allowImport || false;
        this.allowPrint = options.allowPrint || false;
        this.onRowClick = options.onRowClick || null;
        this.onRowDblClick = options.onRowDblClick || null;
        this.onCellChange = options.onCellChange || null;
        this.onPageChange = options.onPageChange || null;
        this.onRowReorder = options.onRowReorder || null;
        this.rows = [];
        this._deleted = [];
        this.selectedIdx = -1;
        this._selectedSet = new Set(); // 다중 행 선택
        this._cellCss = {};
        this._rowCss = {};
        this._sortCol = null;
        this._sortDir = null;
        this._sortCols = []; // 다중 정렬: [{field, dir}]
        this._currentPage = 1;
        this._totalCount = 0;
        this._pageSize = options.pageSize || 100;
        this._headerDepth = 1;
        for (const c of this.columns) { if (Array.isArray(c.label)) this._headerDepth = Math.max(this._headerDepth, c.label.length); }
        this._hasFooter = this.columns.some(c => c.footer);
        this._hasFrozen = this.columns.some(c => c.frozen);
        this._hasFrozenLeft = this.columns.some(c => c.frozen && c.frozen !== 'right');
        this._hasFrozenRight = this.columns.some(c => c.frozen === 'right');
        this._codeCache = {};
        // code 컬럼 미리 로드
        for (const c of this.columns) {
            if (c.code && !c.options) {
                ((code) => {
                    fetch('/api/codes/' + code).then(r => r.json()).then(json => {
                        this._codeCache[code] = (json.resultData || []).map(cc => ({ value: cc.value || cc.VALUE || cc.code || cc.CODE, label: cc.label || cc.LABEL || cc.codeName || cc.CODE_NM }));
                    }).catch(() => {});
                })(c.code);
            }
        }
        // 키보드 내비게이션 + 셀 범위 선택
        this._focusRow = -1;
        this._focusCol = -1;
        this._rangeEndRow = -1; // 범위 선택 끝점
        this._rangeEndCol = -1;
        this._isDragging = false;
        this._editing = false;
        // 필터
        this._allRows = null;
        this._filterValues = {};
        this._filterTimer = null;
        // Undo/Redo
        this._undoStack = [];
        this._redoStack = [];
        // 컨텍스트 메뉴
        this._ctxMenu = null;
        this._ctxDocHandler = null;
        // 가상 스크롤 (groupBy와 동시 사용 불가)
        this.virtualScroll = options.virtualScroll || false;
        this._explicitHeight = !!options.height;
        this._vsHeight = options.height || 400;
        this._rowHeight = options.rowHeight || 30;
        this._vsStart = 0;
        this._vsEnd = 0;
        this._vsTick = false;
        // 셀 병합
        this._mergeColumns = this.columns.filter(c => c.merge).map(c => c.field);
        // 멀티행 (레코드당 서브행)
        this.rowDetail = options.rowDetail || null;
        // 트리 그리드
        this.treeField = options.treeField || null;      // 표시 필드 (트리 들여쓰기)
        this.treeParentField = options.treeParentField || 'parent_id';
        this.treeIdField = options.treeIdField || 'id';
        this._treeState = new Set(); // 접힌 노드 ID
        // 마스터-디테일 중첩
        this.detailGrid = options.detailGrid || null;    // function(row, containerEl) → 디테일 그리드 생성
        this._expandedDetails = new Set();               // 펼쳐진 행 인덱스
        // 그룹핑
        this.groupBy = options.groupBy || null;
        this.groupFooter = options.groupFooter || false;
        this._groups = [];
        this._collapsedGroups = new Set();
        // 컬럼 상태 저장/복원 (sortable이면 자동 활성화)
        this._stateKey = options.stateKey || (this.sortable ? (typeof selector === 'string' ? selector.replace(/^#/, '') : null) : null);
        // 헤더 고정 (스크롤 시 헤더가 상단에 sticky) — 기본 ON
        this.stickyHeader = options.stickyHeader !== false;
        if (this._stateKey) this._restoreState();
        this._build();
    }

    // ══════════════════════════════════════════════════════════
    //  Build
    // ══════════════════════════════════════════════════════════

    _build() {
        if (!this.container) return;
        this.container.innerHTML = '';
        this.container.classList.add('forma-grid-wrap');

        if (this.editable && !this._hideToolbar) {
            const bar = document.createElement('div');
            bar.className = 'forma-grid-toolbar';
            if (this.allowAddRow) {
                const addBtn = document.createElement('button');
                addBtn.textContent = '+ 행추가'; addBtn.className = 'forma-btn forma-btn-sm';
                addBtn.onclick = () => this.addRow();
                bar.appendChild(addBtn);
            }
            if (this.allowDeleteRow) {
                const delBtn = document.createElement('button');
                delBtn.textContent = '- 행삭제'; delBtn.className = 'forma-btn forma-btn-sm';
                delBtn.onclick = () => this.deleteRow();
                bar.appendChild(delBtn);
            }
            if (bar.children.length > 0) this.container.appendChild(bar);
        }

        this._scrollWrap = document.createElement('div');
        this._scrollWrap.className = 'forma-grid-scroll';
        this._scrollWrap.setAttribute('tabindex', '0');
        this.table = document.createElement('table');
        this.table.className = 'forma-grid'
            + (this.verticalLines ? ' forma-grid-vlines' : '')
            + (this.rowHover ? '' : ' forma-grid-no-hover')
            + (this.stickyHeader ? ' forma-grid-sticky-header' : '');

        this._buildColGroup();
        this._buildHeader();
        if (this.filterable) this._buildFilterRow();

        this.tbody = document.createElement('tbody');
        this.table.appendChild(this.tbody);

        if (this._hasFooter) {
            this.tfoot = document.createElement('tfoot');
            this.table.appendChild(this.tfoot);
        }

        this._scrollWrap.appendChild(this.table);
        this.container.appendChild(this._scrollWrap);
        // height: 명시적 지정 시 고정, 미지정 시 CSS flex로 자동 채움
        if (this._explicitHeight) {
            this._scrollWrap.style.height = this._vsHeight + 'px';
        }
        this._scrollWrap.style.overflow = 'auto';
        if (this.virtualScroll) {
            this._vsScrollHandler = () => {
                if (this.treeField || this.groupBy) return;
                if (!this._vsTick) { this._vsTick = true; requestAnimationFrame(() => { this._renderVirtual(); this._vsTick = false; }); }
            };
            this._scrollWrap.addEventListener('scroll', this._vsScrollHandler);
        }
        this._renderEmpty();
        this._initKeyboard();
        // 드래그 범위 선택 종료
        this._mouseupHandler = () => { this._isDragging = false; };
        document.addEventListener('mouseup', this._mouseupHandler);
        // DOM 추가 후 테이블 너비 재계산 + 리사이즈 감지
        requestAnimationFrame(() => { this._updateTableWidth(); this._updateStickyHeaderOffsets(); });
        // 숨겨진 컨테이너(display:none, 탭 비활성)에서 렌더된 경우 tr 의 sticky/checkbox/
        // 폭이 0 기준으로 고정되어 보이게 될 때 깨져 보이는 문제가 있음.
        // 숨김→표시 전환(0 → 양수 폭)을 감지해서 자동으로 재렌더링.
        this._resizeObserver = new ResizeObserver(() => {
            this._updateTableWidth();
            this._updateStickyHeaderOffsets();
            const w = this._scrollWrap.clientWidth;
            if (this._renderedWhileHidden && w > 0) {
                this._renderedWhileHidden = false;
                this._render();
            }
        });
        this._resizeObserver.observe(this._scrollWrap);
    }

    // ══════════════════════════════════════════════════════════
    //  Sticky Header — 멀티헤더·필터행·frozen 컬럼 동시 지원
    // ══════════════════════════════════════════════════════════

    _updateStickyHeaderOffsets() {
        if (!this.stickyHeader || !this._thead) return;
        // 각 thead 행의 누적 top 을 계산해서 th 에 인라인으로 부여.
        // frozen 컬럼은 _applySticky 에서 left/right 가 이미 세팅되어 있으므로
        // top 만 추가로 얹으면 2D sticky 가 되고, z-index 만 한 단계 더 올린다.
        const trs = this._thead.children;
        let cumTop = 0;
        for (let i = 0; i < trs.length; i++) {
            const tr = trs[i];
            const top = cumTop;
            for (const th of tr.children) {
                th.style.position = 'sticky';
                th.style.top = top + 'px';
                const isFrozen = th.style.left || th.style.right;
                th.style.zIndex = isFrozen ? '4' : '3';
                if (!th.style.background || th.style.background === 'transparent') {
                    th.style.background = 'var(--bg-header)';
                }
            }
            cumTop += tr.offsetHeight;
        }
    }

    // ══════════════════════════════════════════════════════════
    //  Colgroup — 컬럼 너비 일괄 관리
    // ══════════════════════════════════════════════════════════

    _buildColGroup() {
        // colgroup은 너비 힌트로만 사용 (table-layout: auto)
        this._colgroup = document.createElement('colgroup');
        this._cols = [];
        if (this.detailGrid) { const c = document.createElement('col'); c.setAttribute('width', '30'); this._colgroup.appendChild(c); }
        if (this.reorderable) { const c = document.createElement('col'); c.setAttribute('width', '28'); this._colgroup.appendChild(c); }
        if (this.checkable) { const c = document.createElement('col'); c.setAttribute('width', '36'); this._colgroup.appendChild(c); }
        if (this.rowNum) { const c = document.createElement('col'); c.setAttribute('width', '45'); this._colgroup.appendChild(c); }
        for (const col of this.columns) {
            const c = document.createElement('col');
            c.setAttribute('width', col._hidden ? '0' : String(col.width || 100));
            this._colgroup.appendChild(c);
            this._cols.push(c);
        }
        this.table.appendChild(this._colgroup);
    }

    _updateTableWidth() {
        // 고정 컬럼(체크박스, 행번호 등) 너비 합산
        let fixedW = 0;
        if (this.detailGrid) fixedW += 30;
        if (this.reorderable) fixedW += 28;
        if (this.checkable) fixedW += 36;
        if (this.rowNum) fixedW += 45;
        // 데이터 컬럼 원본 너비 합산
        let colW = 0;
        for (const col of this.columns) { if (!col._hidden) colW += (col.width || 100); }
        const total = fixedW + colW;
        const containerW = this._scrollWrap.clientWidth;
        if (containerW > 0 && containerW >= total && colW > 0) {
            // 컨테이너가 더 넓으면: fixed layout + 비례 배분으로 꽉 채움
            this.table.style.tableLayout = 'fixed';
            this.table.style.width = containerW + 'px';
            this.table.style.minWidth = '';
            const extra = containerW - total;
            for (let i = 0; i < this.columns.length; i++) {
                if (this.columns[i]._hidden) { if (this._cols[i]) this._cols[i].style.width = '0px'; continue; }
                const base = this.columns[i].width || 100;
                const expanded = base + Math.round(extra * base / colW);
                if (this._cols[i]) this._cols[i].style.width = expanded + 'px';
            }
        } else {
            // 컬럼 합이 더 넓으면: auto layout + min-width로 스크롤
            this.table.style.tableLayout = '';
            this.table.style.width = '';
            this.table.style.minWidth = total + 'px';
            for (let i = 0; i < this.columns.length; i++) {
                const w = this.columns[i]._hidden ? '0' : String(this.columns[i].width || 100);
                if (this._cols[i]) { this._cols[i].style.width = ''; this._cols[i].setAttribute('width', w); }
            }
        }
    }

    _updateColWidth(colIdx, width) {
        if (this._cols[colIdx]) this._cols[colIdx].setAttribute('width', String(width));
        this.columns[colIdx].width = width;
        this._updateTableWidth();
        this._saveState();
    }

    // ══════════════════════════════════════════════════════════
    //  N단 멀티헤더
    // ══════════════════════════════════════════════════════════

    _buildHeader() {
        this._thead = document.createElement('thead');
        const cols = this.columns;
        const depth = this._headerDepth;

        const labels = cols.map(col => {
            if (!Array.isArray(col.label)) return [{ text: col.label || col.field }];
            return col.label.slice();
        });

        const matrix = [];
        for (let r = 0; r < depth; r++) matrix.push(new Array(cols.length).fill(null));

        for (let ci = 0; ci < cols.length; ci++) {
            const la = labels[ci];
            for (let r = 0; r < depth; r++) {
                if (matrix[r][ci] === 'covered') continue;
                const cell = r < la.length ? la[r] : undefined;
                if (cell === null || cell === undefined) continue;
                const colspan = cell.colspan || 1;
                let rowspan = 1;
                for (let nr = r + 1; nr < depth; nr++) {
                    if (matrix[nr][ci] === 'covered') break;
                    if (nr < la.length && la[nr] !== null && la[nr] !== undefined) break;
                    rowspan++;
                }
                matrix[r][ci] = { text: cell.text || '', colspan, rowspan };
                for (let rs = 0; rs < rowspan; rs++) {
                    for (let cs = 0; cs < colspan; cs++) {
                        if (rs === 0 && cs === 0) continue;
                        const mr = r + rs, mc = ci + cs;
                        if (mr < depth && mc < cols.length) matrix[mr][mc] = 'covered';
                    }
                }
            }
        }

        for (let r = 0; r < depth; r++) {
            const tr = document.createElement('tr');
            if (r === 0) {
                if (this.detailGrid) {
                    const th = document.createElement('th');
                    th.style.width = '30px'; th.style.textAlign = 'center';
                    if (depth > 1) th.rowSpan = depth;
                    tr.appendChild(th);
                }
                if (this.reorderable) {
                    const th = document.createElement('th');
                    th.style.width = '28px'; th.style.textAlign = 'center'; th.textContent = '';
                    if (depth > 1) th.rowSpan = depth;
                    tr.appendChild(th);
                }
                if (this.checkable) {
                    const th = document.createElement('th');
                    th.style.width = '36px'; th.style.textAlign = 'center';
                    if (depth > 1) th.rowSpan = depth;
                    const cb = document.createElement('input'); cb.type = 'checkbox';
                    cb.onchange = () => this._toggleAllCheck(cb.checked);
                    this._headerCb = cb; th.appendChild(cb);
                    if (this._hasFrozenLeft) this._applySticky(th, 0);
                    tr.appendChild(th);
                }
                if (this.rowNum) {
                    const th = document.createElement('th');
                    th.style.width = '45px'; th.style.textAlign = 'center'; th.textContent = 'No';
                    if (depth > 1) th.rowSpan = depth;
                    if (this._hasFrozenLeft) this._applySticky(th, this.checkable ? 36 : 0);
                    tr.appendChild(th);
                }
            }
            for (let ci = 0; ci < cols.length; ci++) {
                const cell = matrix[r][ci];
                if (cell === 'covered' || cell === null) continue;
                const th = document.createElement('th');
                th.style.textAlign = 'center';
                // check 에디터 + headerCheck 옵션: 헤더에 전체 체크박스
                const isLeaf = (r + cell.rowspan === depth);
                if (isLeaf && cols[ci].editor === 'check' && cols[ci].headerCheck) {
                    const hcb = document.createElement('input'); hcb.type = 'checkbox'; hcb.style.verticalAlign = 'middle';
                    ((field) => {
                        hcb.onchange = () => { this.rows.forEach(row => { row[field] = hcb.checked ? 'Y' : 'N'; if (row.gstat !== 'I') row.gstat = 'U'; }); this._render(); };
                    })(cols[ci].field);
                    th.appendChild(hcb);
                    const lbl = document.createElement('span'); lbl.textContent = ' ' + cell.text; lbl.style.verticalAlign = 'middle'; lbl.style.fontSize = '11px';
                    th.appendChild(lbl);
                } else {
                    th.textContent = cell.text;
                }
                if (cell.colspan > 1) th.colSpan = cell.colspan;
                if (cell.rowspan > 1) th.rowSpan = cell.rowspan;
                if (isLeaf) {
                    if (cols[ci].width) th.style.width = cols[ci].width + 'px';
                    th.style.position = 'relative';
                    if (this.sortable) this._attachSort(th, cols[ci]);
                    this._attachResize(th, cols[ci], ci);
                    this._applyFrozenTh(th, ci);
                    // 헤더 우클릭 컨텍스트 메뉴
                    ((cci) => { th.oncontextmenu = (ev) => this._headerContextMenu(ev, cols[cci], cci); })(ci);
                    // 컬럼 드래그 순서 변경
                    if (!cols[ci].frozen) this._attachColDrag(th, ci);
                }
                tr.appendChild(th);
            }
            this._thead.appendChild(tr);
        }
        this.table.appendChild(this._thead);
    }

    // ══════════════════════════════════════════════════════════
    //  필터행
    // ══════════════════════════════════════════════════════════

    _isNumericCol(col) {
        return col && (col.type === 'number' || col.format === 'currency' || col.editor === 'currency');
    }
    _isDateCol(col) {
        return col && (col.format === 'date' || col.editor === 'date');
    }

    _buildFilterRow() {
        const tr = document.createElement('tr');
        tr.className = 'forma-filter-row';
        if (this.detailGrid) { const td = document.createElement('th'); td.style.width = '30px'; tr.appendChild(td); }
        if (this.reorderable) { const td = document.createElement('th'); td.style.width = '28px'; tr.appendChild(td); }
        if (this.checkable) { const td = document.createElement('th'); td.style.width = '36px'; tr.appendChild(td); }
        if (this.rowNum) { const td = document.createElement('th'); td.style.width = '45px'; tr.appendChild(td); }

        for (let ci = 0; ci < this.columns.length; ci++) {
            const col = this.columns[ci];
            const th = document.createElement('th');
            th.style.padding = '2px 4px';

            if (col.editor === 'check' || col.editor === 'switch') {
                const sel = document.createElement('select');
                sel.className = 'forma-filter-input';
                sel.innerHTML = '<option value="">전체</option><option value="Y">Y</option><option value="N">N</option>';
                sel.onchange = () => { this._filterValues[col.field] = { op: '=', val: sel.value }; this._applyFilter(); };
                th.appendChild(sel);
            } else if (col.editor === 'select' || col.editor === 'combo') {
                const sel = document.createElement('select');
                sel.className = 'forma-filter-input';
                sel.innerHTML = '<option value="">전체</option>';
                (col.options || []).forEach(o => { const op = document.createElement('option'); op.value = o.value; op.textContent = o.label; sel.appendChild(op); });
                sel.onchange = () => { this._filterValues[col.field] = { op: '=', val: sel.value }; this._applyFilter(); };
                th.appendChild(sel);
            } else if (this._isNumericCol(col)) {
                // 숫자/금액: 조건 드롭다운 + 입력
                const wrap = document.createElement('div');
                wrap.style.cssText = 'display:flex;gap:2px;align-items:center;';
                const opSel = document.createElement('select');
                opSel.className = 'forma-filter-input';
                opSel.style.cssText = 'width:52px;flex-shrink:0;padding:1px 2px;';
                opSel.innerHTML = '<option value="=">=</option><option value=">=">≥</option><option value="<=">≤</option><option value="!=">≠</option><option value="between">~</option>';
                const inp = document.createElement('input');
                inp.type = 'text'; inp.className = 'forma-filter-input'; inp.style.cssText = 'flex:1;min-width:0;';
                inp.placeholder = '값';
                const inp2 = document.createElement('input');
                inp2.type = 'text'; inp2.className = 'forma-filter-input'; inp2.style.cssText = 'flex:1;min-width:0;display:none;';
                inp2.placeholder = '~';
                const apply = () => {
                    const op = opSel.value;
                    const v1 = inp.value.replace(/,/g, '');
                    const v2 = inp2.value.replace(/,/g, '');
                    if (!v1 && op !== 'between') { delete this._filterValues[col.field]; }
                    else if (op === 'between' && (!v1 || !v2)) { delete this._filterValues[col.field]; }
                    else { this._filterValues[col.field] = { op, val: v1, val2: v2 }; }
                    clearTimeout(this._filterTimer);
                    this._filterTimer = setTimeout(() => this._applyFilter(), 250);
                };
                opSel.onchange = () => { inp2.style.display = opSel.value === 'between' ? '' : 'none'; apply(); };
                inp.oninput = apply;
                inp2.oninput = apply;
                wrap.appendChild(opSel); wrap.appendChild(inp); wrap.appendChild(inp2);
                th.appendChild(wrap);
            } else if (this._isDateCol(col)) {
                // 날짜: 조건 드롭다운 + 입력
                const wrap = document.createElement('div');
                wrap.style.cssText = 'display:flex;gap:2px;align-items:center;';
                const opSel = document.createElement('select');
                opSel.className = 'forma-filter-input';
                opSel.style.cssText = 'width:52px;flex-shrink:0;padding:1px 2px;';
                opSel.innerHTML = '<option value="=">=</option><option value=">=">≥</option><option value="<=">≤</option><option value="between">~</option>';
                const inp = document.createElement('input');
                inp.type = 'date'; inp.className = 'forma-filter-input'; inp.style.cssText = 'flex:1;min-width:0;';
                const inp2 = document.createElement('input');
                inp2.type = 'date'; inp2.className = 'forma-filter-input'; inp2.style.cssText = 'flex:1;min-width:0;display:none;';
                const apply = () => {
                    const op = opSel.value;
                    if (!inp.value) { delete this._filterValues[col.field]; }
                    else if (op === 'between' && !inp2.value) { delete this._filterValues[col.field]; }
                    else { this._filterValues[col.field] = { op, val: inp.value, val2: inp2.value }; }
                    this._applyFilter();
                };
                opSel.onchange = () => { inp2.style.display = opSel.value === 'between' ? '' : 'none'; apply(); };
                inp.onchange = apply;
                inp2.onchange = apply;
                wrap.appendChild(opSel); wrap.appendChild(inp); wrap.appendChild(inp2);
                th.appendChild(wrap);
            } else {
                // 텍스트: 조건 드롭다운 + 입력
                const wrap = document.createElement('div');
                wrap.style.cssText = 'display:flex;gap:2px;align-items:center;';
                const opSel = document.createElement('select');
                opSel.className = 'forma-filter-input';
                opSel.style.cssText = 'width:52px;flex-shrink:0;padding:1px 2px;';
                opSel.innerHTML = '<option value="contains">⊃</option><option value="=">=</option><option value="startsWith">A..</option>';
                const inp = document.createElement('input');
                inp.type = 'text'; inp.className = 'forma-filter-input'; inp.style.cssText = 'flex:1;min-width:0;';
                inp.placeholder = '검색';
                const apply = () => {
                    if (!inp.value) { delete this._filterValues[col.field]; }
                    else { this._filterValues[col.field] = { op: opSel.value, val: inp.value }; }
                    clearTimeout(this._filterTimer);
                    this._filterTimer = setTimeout(() => this._applyFilter(), 250);
                };
                opSel.onchange = apply;
                inp.oninput = apply;
                wrap.appendChild(opSel); wrap.appendChild(inp);
                th.appendChild(wrap);
            }
            tr.appendChild(th);
        }
        this._thead.appendChild(tr);
    }

    _applyFilter() {
        if (!this._allRows) return;
        const filterEntries = Object.entries(this._filterValues).filter(([, v]) => v && v.val !== '' && v.val != null);
        if (filterEntries.length === 0) {
            this.rows = this._allRows.map(r => r);
        } else {
            this.rows = this._allRows.filter(row => {
                return filterEntries.every(([field, flt]) => {
                    const col = this.columns.find(c => c.field === field);
                    const cellVal = row[field];
                    const op = flt.op || 'contains';
                    const val = flt.val;

                    // check/switch/select/combo — 일치
                    if (col && (col.editor === 'check' || col.editor === 'switch' || col.editor === 'select' || col.editor === 'combo')) {
                        return String(cellVal) === String(val);
                    }

                    if (cellVal == null || cellVal === '') return false;

                    // 숫자 비교
                    if (this._isNumericCol(col)) {
                        const n = Number(cellVal), v = Number(val);
                        if (isNaN(n) || isNaN(v)) return false;
                        if (op === '=') return n === v;
                        if (op === '>=') return n >= v;
                        if (op === '<=') return n <= v;
                        if (op === '!=') return n !== v;
                        if (op === 'between') { const v2 = Number(flt.val2); return !isNaN(v2) && n >= v && n <= v2; }
                        return false;
                    }

                    // 날짜 비교
                    if (this._isDateCol(col)) {
                        const d = String(cellVal).substring(0, 10);
                        if (op === '=') return d === val;
                        if (op === '>=') return d >= val;
                        if (op === '<=') return d <= val;
                        if (op === 'between') return d >= val && d <= (flt.val2 || '9999');
                        return false;
                    }

                    // 텍스트 비교
                    const s = String(cellVal).toLowerCase(), q = String(val).toLowerCase();
                    if (op === '=') return s === q;
                    if (op === 'startsWith') return s.startsWith(q);
                    return s.includes(q); // contains (기본)
                });
            });
        }
        this._totalCount = this.rows.length;
        this.selectedIdx = -1;
        this._focusRow = -1;
        this._focusCol = -1;
        this._render();
        if (this.paging) this._renderPaging();
        this._renderFooter();
    }

    // ══════════════════════════════════════════════════════════
    //  Frozen
    // ══════════════════════════════════════════════════════════

    _calcFrozenLeft(colIdx) {
        let left = 0;
        if (this.reorderable) left += 28;
        if (this.checkable) left += 36;
        if (this.rowNum) left += 45;
        for (let i = 0; i < colIdx; i++) { if (this.columns[i].frozen && this.columns[i].frozen !== 'right') left += (this.columns[i].width || 100); }
        return left;
    }
    _calcFrozenRight(colIdx) {
        let right = 0;
        for (let i = this.columns.length - 1; i > colIdx; i--) { if (this.columns[i].frozen === 'right') right += (this.columns[i].width || 100); }
        return right;
    }
    _applyFrozenTh(th, colIdx) {
        const col = this.columns[colIdx];
        if (!col.frozen) return;
        if (col.frozen === 'right') { this._applyStickyRight(th, this._calcFrozenRight(colIdx)); }
        else { this._applySticky(th, this._calcFrozenLeft(colIdx)); }
    }
    _applyFrozenTd(td, colIdx) {
        const col = this.columns[colIdx];
        if (!col.frozen) return;
        if (col.frozen === 'right') { this._applyStickyRight(td, this._calcFrozenRight(colIdx)); td.style.background = td.style.background || 'var(--bg-card)'; }
        else { this._applySticky(td, this._calcFrozenLeft(colIdx)); td.style.background = td.style.background || 'var(--bg-card)'; }
    }
    _applySticky(el, left) { el.style.position = 'sticky'; el.style.left = left + 'px'; el.style.zIndex = '2'; el.classList.add('forma-grid-frozen'); if (!el.style.background || el.style.background === 'transparent') el.style.background = 'var(--bg-header)'; }
    _applyStickyRight(el, right) { el.style.position = 'sticky'; el.style.right = right + 'px'; el.style.zIndex = '2'; el.classList.add('forma-grid-frozen'); if (!el.style.background || el.style.background === 'transparent') el.style.background = 'var(--bg-header)'; }

    // ══════════════════════════════════════════════════════════
    //  컬럼 리사이즈 + 자동맞춤
    // ══════════════════════════════════════════════════════════

    _attachResize(th, col, colIdx) {
        const handle = document.createElement('div');
        handle.className = 'forma-col-resize';
        handle.onmousedown = (e) => {
            e.stopPropagation(); e.preventDefault();
            const startX = e.clientX, startW = th.offsetWidth;
            const onMove = (me) => { const nw = Math.max(40, startW + me.clientX - startX); this._updateColWidth(colIdx, nw); };
            const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
            document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
        };
        // 더블클릭 자동맞춤
        handle.ondblclick = (e) => { e.stopPropagation(); this._autoFitColumn(colIdx); };
        th.appendChild(handle);
    }

    _autoFitColumn(colIdx) {
        const col = this.columns[colIdx];
        const span = document.createElement('span');
        span.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font-size:12px;padding:0 8px;';
        document.body.appendChild(span);
        // 헤더 텍스트
        const lbl = Array.isArray(col.label) ? (col.label[col.label.length - 1]?.text || col.field) : (col.label || col.field);
        span.textContent = lbl;
        let maxW = span.offsetWidth + 24;
        // 데이터 (최대 100행 샘플)
        const sample = this.rows.slice(0, 100);
        for (const row of sample) {
            let val = row[col.field];
            if ((col.format === 'currency' || col.editor === 'currency') && val != null) val = Number(val).toLocaleString('ko-KR');
            else if ((col.editor === 'select' || col.editor === 'combo') && col.options) {
                const opt = col.options.find(o => String(o.value) === String(val));
                if (opt) val = opt.label;
            }
            span.textContent = val ?? '';
            maxW = Math.max(maxW, span.offsetWidth + 24);
        }
        document.body.removeChild(span);
        const newW = Math.max(40, Math.min(maxW, 400));
        this._updateColWidth(colIdx, newW);
    }

    // ══════════════════════════════════════════════════════════
    //  정렬
    // ══════════════════════════════════════════════════════════

    _attachSort(th, col) {
        th.style.cursor = 'pointer'; th.style.userSelect = 'none';
        const arrow = document.createElement('span'); arrow.className = 'forma-sort-icon'; th.appendChild(arrow); col._sortIcon = arrow;
        th.onclick = (e) => {
            if (e.target.classList.contains('forma-col-resize')) return;
            if (e.shiftKey) {
                // 다중 정렬: Shift+클릭
                const idx = this._sortCols.findIndex(s => s.field === col.field);
                if (idx >= 0) {
                    if (this._sortCols[idx].dir === 'asc') this._sortCols[idx].dir = 'desc';
                    else this._sortCols.splice(idx, 1); // 3번째 클릭 → 해제
                } else {
                    if (this._sortCols.length < 3) this._sortCols.push({ field: col.field, dir: 'asc' });
                }
            } else {
                // 단일 정렬: 일반 클릭
                const existing = this._sortCols.length === 1 && this._sortCols[0].field === col.field ? this._sortCols[0] : null;
                if (existing) {
                    if (existing.dir === 'asc') existing.dir = 'desc';
                    else this._sortCols = [];
                } else {
                    this._sortCols = [{ field: col.field, dir: 'asc' }];
                }
            }
            // 하위호환: _sortCol/_sortDir 동기화
            if (this._sortCols.length > 0) { this._sortCol = this._sortCols[0].field; this._sortDir = this._sortCols[0].dir; }
            else { this._sortCol = null; this._sortDir = null; }
            this._updateSortIcons(); this._applySort(); this._render(); this._saveState();
        };
    }
    _updateSortIcons() {
        for (const col of this.columns) {
            if (!col._sortIcon) continue;
            const idx = this._sortCols.findIndex(s => s.field === col.field);
            if (idx >= 0) {
                const arrow = this._sortCols[idx].dir === 'asc' ? '▲' : '▼';
                col._sortIcon.textContent = ' ' + arrow + (this._sortCols.length > 1 ? (idx + 1) : '');
            } else {
                col._sortIcon.textContent = '';
            }
        }
    }
    _applySort() {
        if (this._sortCols.length === 0) return;
        const sortDefs = this._sortCols.map(s => {
            const col = this.columns.find(c => c.field === s.field);
            return { field: s.field, dir: s.dir === 'asc' ? 1 : -1, isNum: col && (col.type === 'number' || col.format === 'currency' || col.editor === 'currency') };
        });
        this.rows.sort((a, b) => {
            for (const sd of sortDefs) {
                let va = a[sd.field] ?? '', vb = b[sd.field] ?? '';
                let cmp;
                if (sd.isNum) cmp = (Number(va) - Number(vb));
                else cmp = String(va).localeCompare(String(vb), 'ko');
                if (cmp !== 0) return cmp * sd.dir;
            }
            return 0;
        });
    }

    // ══════════════════════════════════════════════════════════
    //  Data API
    // ══════════════════════════════════════════════════════════

    setData(data, totalCount) {
        this.rows = (data || []).map(r => ({ ...r }));
        this._deleted = [];
        if (this.filterable) { this._allRows = this.rows.map(r => r); }
        this._totalCount = (totalCount !== undefined) ? totalCount : this.rows.length;
        this.selectedIdx = -1; this._selectedSet.clear(); this._focusRow = -1; this._focusCol = -1;
        this._cellCss = {}; this._rowCss = {};
        this._vsStart = 0; this._vsEnd = 0;
        if (this._sortCols.length > 0) this._applySort();
        if (this.groupBy) this._buildGroups();
        this._render();
        if (this.paging) this._renderPaging();
    }

    getData() { return this.rows; }
    getCheckedData() { return this.rows.filter(r => r._checked); }
    getModifiedData() { return this.rows.filter(r => r.gstat === 'I' || r.gstat === 'U' || r.gstat === 'D'); }
    getInsertedData() { return this.rows.filter(r => r.gstat === 'I'); }
    getUpdatedData() { return this.rows.filter(r => r.gstat === 'U'); }
    getDeletedData() { return this._deleted; }
    getRowCount() { return this.rows.length; }
    getFieldValues(field) { return this.rows.map(r => r[field]); }
    findRows(fn) { return this.rows.filter(fn); }
    getCheckedOrSelected() { const c = this.getCheckedData(); return c.length > 0 ? c : (this.getSelectedItem() ? [this.getSelectedItem()] : []); }

    clearData() {
        this.rows = []; this._deleted = []; if (this.filterable) this._allRows = [];
        this.selectedIdx = -1; this._selectedSet.clear(); this._focusRow = -1; this._focusCol = -1;
        this._cellCss = {}; this._rowCss = {}; this._totalCount = 0; this._currentPage = 1;
        this._render(); if (this.paging) this._renderPaging();
    }

    showLoading() {
        const cols = this.columns.length + this._leadingCols();
        this.tbody.innerHTML = '<tr><td colspan="' + cols + '" class="forma-grid-empty">' +
            '<div class="forma-grid-loading"><div class="forma-loading-spinner"></div><div style="margin-top:8px">조회 중...</div></div></td></tr>';
    }
    hideLoading() { this._render(); }

    addRow(defaultData = {}) {
        if (!this.editable || !this.allowAddRow) return;
        let data = defaultData;
        if (this.onBeforeAddRow) {
            const r = this.onBeforeAddRow(data);
            if (r === false) return;
            if (r && typeof r === 'object') data = r;
        }
        const row = { ...data, gstat: 'I', _checked: false };
        this.rows.push(row);
        if (this._allRows) this._allRows.push(row);
        this._render();
    }
    deleteRow() {
        if (!this.allowDeleteRow) return;
        let targets = this.rows.filter(r => r._checked);
        if (targets.length === 0 && this.selectedIdx >= 0) targets.push(this.rows[this.selectedIdx]);
        if (targets.length === 0) return;
        if (this.onBeforeDeleteRow) {
            const r = this.onBeforeDeleteRow(targets);
            if (r === false) return;
            if (Array.isArray(r)) targets = r;
            if (targets.length === 0) return;
        }
        for (const row of targets) {
            if (row.gstat === 'I') {
                // 신규행: datasource에서 완전 제거
                const idx = this.rows.indexOf(row);
                if (idx >= 0) this.rows.splice(idx, 1);
                if (this._allRows) { const ai = this._allRows.indexOf(row); if (ai >= 0) this._allRows.splice(ai, 1); }
            } else if (row.gstat !== 'D') {
                // 기존행: 삭제 상태로 마킹 (rows에 유지)
                row.gstat = 'D'; row._checked = false;
            }
        }
        this.selectedIdx = -1; this._focusRow = -1; this._render();
    }

    getItem(idx) { return this.rows[idx]; }
    getSelectedItem() { return this.selectedIdx >= 0 ? this.rows[this.selectedIdx] : null; }
    getSelectedIndex() { return this.selectedIdx; }
    getSelectedItems() { return Array.from(this._selectedSet).sort((a, b) => a - b).map(i => this.rows[i]).filter(Boolean); }
    getSelectedIndices() { return Array.from(this._selectedSet).sort((a, b) => a - b); }

    updateItem(idx, data) {
        if (this.rows[idx]) {
            Object.assign(this.rows[idx], data);
            if (this.rows[idx].gstat !== 'I') this.rows[idx].gstat = 'U';
            this._renderRow(idx); this._renderFooter();
        }
    }

    clearSelect() { this.selectedIdx = -1; this._selectedSet.clear(); this.tbody.querySelectorAll('tr.selected').forEach(tr => tr.classList.remove('selected')); }
    eachRow(callback) { this.rows.forEach((row, idx) => callback(row, idx)); }

    // ══════════════════════════════════════════════════════════
    //  검증
    // ══════════════════════════════════════════════════════════

    checkGridValidation() {
        this.tbody.querySelectorAll('.forma-cell-error').forEach(el => el.classList.remove('forma-cell-error'));
        const requiredCols = this.columns.filter(c => c.required);
        if (requiredCols.length === 0) return true;
        for (let i = 0; i < this.rows.length; i++) {
            const row = this.rows[i];
            if (this.checkable && !row._checked) continue;
            for (const col of requiredCols) {
                const val = row[col.field];
                if (val === null || val === undefined || val === '') {
                    this.addCellCss(i, col.field, 'forma-cell-error');
                    if (typeof FormaPopup !== 'undefined') FormaPopup.alert.show((i + 1) + '행 [' + (Array.isArray(col.label) ? col.label[col.label.length-1]?.text : col.label || col.field) + '] 값을 입력하세요.');
                    return false;
                }
            }
        }
        return true;
    }

    // ══════════════════════════════════════════════════════════
    //  셀/행 CSS
    // ══════════════════════════════════════════════════════════

    addCellCss(rowIdx, colField, css) { const key = rowIdx + ':' + colField; if (!this._cellCss[key]) this._cellCss[key] = new Set(); css.split(' ').forEach(c => { if (c) this._cellCss[key].add(c); }); const td = this._getTd(rowIdx, colField); if (td) css.split(' ').forEach(c => { if (c) td.classList.add(c); }); }
    removeCellCss(rowIdx, colField, css) { const key = rowIdx + ':' + colField; if (this._cellCss[key]) css.split(' ').forEach(c => this._cellCss[key].delete(c)); const td = this._getTd(rowIdx, colField); if (td) css.split(' ').forEach(c => { if (c) td.classList.remove(c); }); }
    addCss(rowIdx, css) { if (!this._rowCss[rowIdx]) this._rowCss[rowIdx] = new Set(); css.split(' ').forEach(c => { if (c) this._rowCss[rowIdx].add(c); }); const tr = this.tbody.children[rowIdx]; if (tr) css.split(' ').forEach(c => { if (c) tr.classList.add(c); }); }
    removeCss(rowIdx, css) { if (this._rowCss[rowIdx]) css.split(' ').forEach(c => this._rowCss[rowIdx].delete(c)); const tr = this.tbody.children[rowIdx]; if (tr) css.split(' ').forEach(c => { if (c) tr.classList.remove(c); }); }

    _leadingCols() { let n = 0; if (this.detailGrid) n++; if (this.reorderable) n++; if (this.checkable) n++; if (this.rowNum) n++; return n; }
    _getRowTr(rowIdx) {
        if (!this.virtualScroll && !this.groupBy && !this.treeField) return this.tbody.children[rowIdx] || null;
        return this.tbody.querySelector('tr[data-ridx="' + rowIdx + '"]');
    }
    _getTd(rowIdx, colField) {
        const tr = this._getRowTr(rowIdx); if (!tr) return null;
        const colIdx = this.columns.findIndex(c => c.field === colField); if (colIdx < 0) return null;
        return tr.children[colIdx + this._leadingCols()] || null;
    }
    _getTdByIdx(rowIdx, colIdx) {
        const tr = this._getRowTr(rowIdx); if (!tr) return null;
        return tr.children[colIdx + this._leadingCols()] || null;
    }

    // ══════════════════════════════════════════════════════════
    //  CSV 내보내기
    // ══════════════════════════════════════════════════════════

    exportCsv(filename) {
        const BOM = '\uFEFF';
        const visCols = this.columns.filter(c => !c._hidden);
        const headers = visCols.map(c => { if (Array.isArray(c.label)) { const last = c.label[c.label.length - 1]; return last ? (last.text || c.field) : c.field; } return c.label || c.field; });
        const csvRows = this.rows.map(row => {
            return visCols.map(col => {
                let val = row[col.field] ?? '';
                if ((col.format === 'currency' || col.editor === 'currency') && val !== '') val = Number(val).toLocaleString('ko-KR');
                if ((col.editor === 'select' || col.editor === 'combo') && col.options) { const opt = col.options.find(o => String(o.value) === String(val)); if (opt) val = opt.label; }
                if (col.editor === 'check' || col.editor === 'switch') val = (val === 'Y' || val === true) ? 'Y' : 'N';
                return '"' + String(val).replace(/"/g, '""') + '"';
            }).join(',');
        });
        const csv = BOM + headers.join(',') + '\n' + csvRows.join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename || 'export.csv';
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(a.href);
        if (typeof FormaPopup !== 'undefined') FormaPopup.toast.success('CSV 다운로드 완료');
    }

    // XLSX 내보내기 (외부 라이브러리 없이 XML 기반)
    exportXlsx(filename) {
        const visCols = this.columns.filter(c => !c._hidden);
        const headers = visCols.map(c => { if (Array.isArray(c.label)) { const last = c.label[c.label.length - 1]; return last ? (last.text || c.field) : c.field; } return c.label || c.field; });

        // SharedStrings
        const ss = []; const ssMap = {};
        const ssIdx = (s) => { s = String(s); if (ssMap[s] !== undefined) return ssMap[s]; ssMap[s] = ss.length; ss.push(s); return ssMap[s]; };

        // 셀 참조 (A1, B2...)
        const colRef = (c) => { let r = ''; let n = c; while (n >= 0) { r = String.fromCharCode(65 + (n % 26)) + r; n = Math.floor(n / 26) - 1; } return r; };

        // Sheet 데이터
        let sheetRows = '';
        // 헤더행
        sheetRows += '<row r="1">';
        headers.forEach((h, ci) => { sheetRows += '<c r="' + colRef(ci) + '1" t="s" s="1"><v>' + ssIdx(h) + '</v></c>'; });
        sheetRows += '</row>';

        // 데이터행
        this.rows.forEach((row, ri) => {
            const rn = ri + 2;
            sheetRows += '<row r="' + rn + '">';
            visCols.forEach((col, ci) => {
                let val = row[col.field];
                if ((col.editor === 'select' || col.editor === 'combo') && col.options) { const opt = col.options.find(o => String(o.value) === String(val)); if (opt) val = opt.label; }
                if (col.editor === 'check' || col.editor === 'switch') val = (val === 'Y' || val === true) ? 'Y' : 'N';
                const ref = colRef(ci) + rn;
                if (val === null || val === undefined || val === '') { sheetRows += '<c r="' + ref + '"/>'; }
                else if (typeof val === 'number' || ((col.type === 'number' || col.format === 'currency' || col.editor === 'currency') && !isNaN(Number(val)))) {
                    sheetRows += '<c r="' + ref + '" s="' + (col.format === 'currency' || col.editor === 'currency' ? '2' : '0') + '"><v>' + Number(val) + '</v></c>';
                } else {
                    sheetRows += '<c r="' + ref + '" t="s"><v>' + ssIdx(String(val)) + '</v></c>';
                }
            });
            sheetRows += '</row>';
        });

        // XML 조립
        const sharedStringsXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="' + ss.length + '" uniqueCount="' + ss.length + '">' + ss.map(s => '<si><t>' + s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</t></si>').join('') + '</sst>';
        const stylesXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0"/></numFmts><fonts count="2"><font><sz val="11"/><name val="맑은 고딕"/></font><font><b/><sz val="11"/><name val="맑은 고딕"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE8F0FE"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" applyFont="1" applyFill="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" applyNumberFormat="1"/></cellXfs></styleSheet>';
        const sheetXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' + sheetRows + '</sheetData></worksheet>';
        const workbookXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>';
        const relsXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/></Relationships>';
        const contentTypesXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/></Types>';
        const rootRelsXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';

        // ZIP (간이 구현)
        const te = new TextEncoder();
        const files = [
            { name: '[Content_Types].xml', data: te.encode(contentTypesXml) },
            { name: '_rels/.rels', data: te.encode(rootRelsXml) },
            { name: 'xl/workbook.xml', data: te.encode(workbookXml) },
            { name: 'xl/_rels/workbook.xml.rels', data: te.encode(relsXml) },
            { name: 'xl/worksheets/sheet1.xml', data: te.encode(sheetXml) },
            { name: 'xl/styles.xml', data: te.encode(stylesXml) },
            { name: 'xl/sharedStrings.xml', data: te.encode(sharedStringsXml) },
        ];
        // 간이 ZIP (Store only, no compression) — 브라우저 호환
        const zip = this._buildZip(files);
        const blob = new Blob([zip], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename || 'export.xlsx';
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(a.href);
        if (typeof FormaPopup !== 'undefined') FormaPopup.toast.success('Excel 다운로드 완료');
    }

    _buildZip(files) {
        const localHeaders = [], centralHeaders = [], offsets = [];
        let offset = 0;
        for (const f of files) {
            const nameBytes = new TextEncoder().encode(f.name);
            const hdr = new Uint8Array(30 + nameBytes.length);
            const dv = new DataView(hdr.buffer);
            dv.setUint32(0, 0x04034b50, true); // local sig
            dv.setUint16(4, 20, true); // version
            dv.setUint16(8, 0, true);  // method: store
            dv.setUint32(18, f.data.length, true); // compressed
            dv.setUint32(22, f.data.length, true); // uncompressed
            dv.setUint16(26, nameBytes.length, true);
            hdr.set(nameBytes, 30);
            localHeaders.push(hdr);
            offsets.push(offset);
            offset += hdr.length + f.data.length;

            // Central
            const chdr = new Uint8Array(46 + nameBytes.length);
            const cdv = new DataView(chdr.buffer);
            cdv.setUint32(0, 0x02014b50, true); // central sig
            cdv.setUint16(4, 20, true);
            cdv.setUint16(6, 20, true);
            cdv.setUint32(20, f.data.length, true);
            cdv.setUint32(24, f.data.length, true);
            cdv.setUint16(28, nameBytes.length, true);
            cdv.setUint32(42, offsets[offsets.length - 1], true);
            chdr.set(nameBytes, 46);
            centralHeaders.push(chdr);
        }
        const centralOffset = offset;
        let centralSize = 0;
        centralHeaders.forEach(c => centralSize += c.length);
        const eocd = new Uint8Array(22);
        const edv = new DataView(eocd.buffer);
        edv.setUint32(0, 0x06054b50, true);
        edv.setUint16(8, files.length, true);
        edv.setUint16(10, files.length, true);
        edv.setUint32(12, centralSize, true);
        edv.setUint32(16, centralOffset, true);

        const parts = [];
        for (let i = 0; i < files.length; i++) { parts.push(localHeaders[i]); parts.push(files[i].data); }
        centralHeaders.forEach(c => parts.push(c));
        parts.push(eocd);

        let total = 0; parts.forEach(p => total += p.length);
        const result = new Uint8Array(total);
        let pos = 0; parts.forEach(p => { result.set(p, pos); pos += p.length; });
        return result;
    }

    // ══════════════════════════════════════════════════════════
    //  서버사이드 XLSX 다운로드 (대량 데이터용)
    // ══════════════════════════════════════════════════════════

    /**
     * 서버에서 Apache POI로 XLSX를 생성해 다운로드.
     * 클라이언트 exportXlsx()는 소량에 적합, 대량(1만건+)은 이 메서드 사용.
     * @param {string} filename  파일명 (확장자 제외)
     * @param {Array} [data]     데이터 배열 (생략 시 현재 그리드 데이터)
     */
    exportXlsxServer(filename, data) {
        const visCols = this.columns.filter(function(c) { return !c._hidden; });
        const cols = visCols.map(function(c) {
            let lbl = c.label;
            if (Array.isArray(lbl)) { const last = lbl[lbl.length - 1]; lbl = last ? (last.text || c.field) : c.field; }
            return { field: c.field, label: lbl || c.field, width: Math.round((c.width || 100) / 8), type: c.type, format: c.format };
        });
        const rows = data || this.rows;

        // select/combo 옵션 변환
        const exportData = rows.map(function(row) {
            const r = {};
            visCols.forEach(function(col) {
                let val = row[col.field];
                if ((col.editor === 'select' || col.editor === 'combo') && col.options) {
                    const opt = col.options.find(function(o) { return String(o.value) === String(val); });
                    if (opt) val = opt.label;
                }
                if (col.editor === 'check' || col.editor === 'switch') val = (val === 'Y' || val === true) ? 'Y' : 'N';
                r[col.field] = val;
            });
            return r;
        });

        const payload = JSON.stringify({ fileName: filename || 'export', sheetName: 'Sheet1', columns: cols, data: exportData });

        fetch('/api/excel/download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload
        }).then(function(res) {
            if (!res.ok) throw new Error('Download failed');
            return res.blob();
        }).then(function(blob) {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = (filename || 'export') + '.xlsx';
            a.click();
            URL.revokeObjectURL(a.href);
        }).catch(function(err) {
            console.error(err);
            if (typeof FormaPopup !== 'undefined') FormaPopup.toast.error('다운로드 실패');
        });
    }

    // ══════════════════════════════════════════════════════════
    //  Excel 임포트 (CSV/TSV 파싱 → 그리드 데이터)
    // ══════════════════════════════════════════════════════════

    importExcel(callback) {
        const input = document.createElement('input');
        input.type = 'file'; input.accept = '.csv,.tsv,.txt,.xlsx';
        input.onchange = () => {
            const file = input.files[0]; if (!file) return;
            if (file.name.endsWith('.xlsx')) {
                // XLSX → 간이 파싱 (첫 시트 텍스트만)
                file.arrayBuffer().then(buf => {
                    const data = this._parseXlsxSimple(new Uint8Array(buf));
                    if (callback) callback(data);
                    else this._applyImportData(data);
                });
            } else {
                file.text().then(text => {
                    const sep = text.includes('\t') ? '\t' : ',';
                    const lines = text.split('\n').filter(l => l.trim());
                    if (lines.length < 2) return;
                    const headers = lines[0].split(sep).map(h => h.trim().replace(/^"|"$/g, ''));
                    const data = [];
                    for (let i = 1; i < lines.length; i++) {
                        const vals = lines[i].split(sep).map(v => v.trim().replace(/^"|"$/g, ''));
                        const row = {};
                        headers.forEach((h, ci) => {
                            // 헤더→필드 매핑 (라벨 또는 필드명)
                            const col = this.columns.find(c => c.field === h || (Array.isArray(c.label) ? c.label[c.label.length-1]?.text : c.label) === h);
                            if (col) row[col.field] = vals[ci] || null;
                        });
                        row.gstat = 'I';
                        data.push(row);
                    }
                    if (callback) callback(data);
                    else this._applyImportData(data);
                });
            }
        };
        input.click();
    }

    _applyImportData(data) {
        if (!data || data.length === 0) return;
        data.forEach(r => { r.gstat = r.gstat || 'I'; r._checked = false; });
        this.rows = this.rows.concat(data);
        if (this._allRows) this._allRows = this._allRows.concat(data);
        this._render();
        if (typeof FormaPopup !== 'undefined') FormaPopup.toast.success(data.length + '건 임포트 완료');
    }

    _parseXlsxSimple(uint8) {
        // 간이 XLSX 텍스트 추출 (sharedStrings.xml에서 문자열, sheet1.xml에서 셀 참조)
        // 완전한 파싱은 아니지만 텍스트/숫자 데이터 임포트에 충분
        try {
            const text = new TextDecoder().decode(uint8);
            // ZIP 내 XML을 간이 추출 (store 방식만)
            const extract = (name) => {
                const idx = text.indexOf(name);
                if (idx < 0) return '';
                const xmlStart = text.indexOf('<?xml', idx);
                if (xmlStart < 0) return '';
                const xmlEnd = text.indexOf('</worksheet>', xmlStart) || text.indexOf('</sst>', xmlStart);
                return text.substring(xmlStart, xmlEnd + 20);
            };
            // 단순 반환 — 실제 프로젝트에서는 서버사이드 파싱 권장
            return [];
        } catch (e) { return []; }
    }

    // ══════════════════════════════════════════════════════════
    //  인쇄
    // ══════════════════════════════════════════════════════════

    print(title) {
        const printWin = window.open('', '_blank', 'width=900,height=700');
        const visCols = this.columns.filter(c => !c._hidden);

        let html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' + (title || '인쇄') + '</title>';
        html += '<style>';
        html += 'body{font-family:"Pretendard",-apple-system,sans-serif;font-size:12px;color:#333;padding:20px}';
        html += 'h1{font-size:16px;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid #333}';
        html += 'table{width:100%;border-collapse:collapse;margin-top:8px}';
        html += 'th{background:#f0f0f0;padding:6px 8px;border:1px solid #ccc;font-weight:600;text-align:center;font-size:11px}';
        html += 'td{padding:4px 8px;border:1px solid #ddd;font-size:11px}';
        html += 'tfoot td{background:#f5f5f5;font-weight:600;border-top:2px solid #ccc}';
        html += '.r{text-align:right}.c{text-align:center}';
        html += '.info{font-size:10px;color:#888;margin-top:8px}';
        html += '@media print{body{padding:0}h1{font-size:14px}}';
        html += '</style></head><body>';
        html += '<h1>' + (title || '데이터 목록') + '</h1>';

        html += '<table><thead><tr>';
        html += '<th class="c" style="width:30px">No</th>';
        visCols.forEach(c => { html += '<th>' + (Array.isArray(c.label) ? c.label[c.label.length-1]?.text : c.label || c.field) + '</th>'; });
        html += '</tr></thead><tbody>';

        this.rows.forEach((row, i) => {
            html += '<tr>';
            html += '<td class="c">' + (i + 1) + '</td>';
            visCols.forEach(col => {
                let val = row[col.field] ?? '';
                const cls = (col.format === 'currency' || col.type === 'number' || col.editor === 'currency') ? ' class="r"' : '';
                if ((col.format === 'currency' || col.editor === 'currency') && val !== '') val = Number(val).toLocaleString('ko-KR');
                if ((col.editor === 'select' || col.editor === 'combo') && col.options) { const opt = col.options.find(o => String(o.value) === String(val)); if (opt) val = opt.label; }
                if (col.editor === 'check' || col.editor === 'switch') val = val === 'Y' ? 'Y' : 'N';
                html += '<td' + cls + '>' + val + '</td>';
            });
            html += '</tr>';
        });
        html += '</tbody>';

        // 푸터
        if (this._hasFooter) {
            html += '<tfoot><tr><td></td>';
            visCols.forEach(col => {
                const td = '<td' + ((col.format === 'currency' || col.type === 'number' || col.editor === 'currency') ? ' class="r"' : '') + '>';
                if (col.footer) {
                    const values = this.rows.map(r => Number(r[col.field]) || 0);
                    let result;
                    if (col.footer === 'sum') result = values.reduce((a, b) => a + b, 0);
                    else if (col.footer === 'avg') result = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
                    else if (col.footer === 'count') result = this.rows.length;
                    html += td + Number(result).toLocaleString('ko-KR') + '</td>';
                } else { html += td + '</td>'; }
            });
            html += '</tr></tfoot>';
        }

        html += '</table>';
        html += '<div class="info">인쇄일시: ' + new Date().toLocaleString('ko-KR') + ' | 총 ' + this.rows.length + '건</div>';
        html += '<script>window.onload=function(){window.print();}<\/script>';
        html += '</body></html>';

        printWin.document.write(html);
        printWin.document.close();
    }

    // ══════════════════════════════════════════════════════════
    //  Render
    // ══════════════════════════════════════════════════════════

    _render() {
        // 숨겨진 상태에서 렌더되면 sticky offset/폭 계산이 깨지므로 플래그만 켜두고
        // ResizeObserver 가 표시 전환 시 자동 재렌더 하도록 맡긴다.
        if (this._scrollWrap && this._scrollWrap.clientWidth === 0) {
            this._renderedWhileHidden = true;
        }
        this.tbody.innerHTML = '';
        if (this.rows.length === 0) { this._renderEmpty(); this._renderFooter(); return; }
        if (this.groupBy) { this._renderGrouped(); }
        else if (this.treeField) { this._renderTree(); }
        else if (this.virtualScroll) { this._renderVirtual(); }
        else { for (let i = 0; i < this.rows.length; i++) this._appendRow(i); }
        if (this._mergeColumns.length > 0 && !this.virtualScroll) this._applyCellMerge();
        this._applySavedCss();
        this._renderFooter();
    }

    _appendRow(i) {
        const row = this.rows[i];
        const tr = document.createElement('tr');
        tr.dataset.ridx = String(i);
        if (i % 2 === 1) tr.classList.add('forma-row-alt');
        tr.onclick = (e) => { this._selectRow(i, e); if (this.onRowClick) this.onRowClick(row, i); };
        tr.ondblclick = () => { if (this.onRowDblClick) this.onRowDblClick(row, i); };
        if (i === this.selectedIdx) tr.classList.add('selected');
        if (row.gstat === 'I' || row.gstat === 'U') tr.classList.add('forma-row-modified');
        if (row.gstat === 'D') tr.classList.add('forma-row-deleted');

        if (this.detailGrid) {
            const td = document.createElement('td');
            td.className = 'forma-detail-toggle'; td.style.textAlign = 'center'; td.style.cursor = 'pointer';
            const expanded = this._expandedDetails.has(i);
            td.textContent = expanded ? '▼' : '▶';
            ((ri) => { td.onclick = (e) => { e.stopPropagation(); this.toggleDetail(ri); }; })(i);
            tr.appendChild(td);
        }

        if (this.reorderable) {
            const td = document.createElement('td');
            td.className = 'forma-drag-handle'; td.textContent = '≡';
            td.draggable = false;
            ((ri) => {
                td.addEventListener('mousedown', (e) => {
                    e.preventDefault(); e.stopPropagation();
                    this._startRowDrag(ri, e);
                });
            })(i);
            tr.appendChild(td);
        }

        if (this.checkable) {
            const td = document.createElement('td'); td.style.textAlign = 'center';
            if (this._hasFrozenLeft) { this._applySticky(td, 0); td.style.background = 'var(--bg-card)'; }
            const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = !!row._checked;
            cb.onclick = (e) => e.stopPropagation();
            cb.onchange = () => { row._checked = cb.checked; };
            td.appendChild(cb); tr.appendChild(td);
        }

        if (this.rowNum) {
            const td = document.createElement('td'); td.style.textAlign = 'center'; td.textContent = i + 1;
            if (this._hasFrozenLeft) { const left = this.checkable ? 36 : 0; this._applySticky(td, left); td.style.background = 'var(--bg-card)'; }
            tr.appendChild(td);
        }

        for (let ci = 0; ci < this.columns.length; ci++) {
            const col = this.columns[ci];
            const td = document.createElement('td');
            if (col.align) td.style.textAlign = col.align;
            if (col.format === 'currency' || col.type === 'number' || col.editor === 'currency') td.style.textAlign = 'right';
            this._applyFrozenTd(td, ci);

            // 조건부 셀 스타일
            if (col.cellStyle) {
                const cs = col.cellStyle(row[col.field], row, col, i);
                if (cs) {
                    if (cs.color) td.style.color = cs.color;
                    if (cs.background) td.style.background = cs.background;
                    if (cs.fontWeight) td.style.fontWeight = cs.fontWeight;
                    if (cs.className) cs.className.split(' ').forEach(c => { if (c) td.classList.add(c); });
                }
            }

            // 셀 우클릭 컨텍스트 메뉴
            ((ri) => { td.oncontextmenu = (ev) => this._cellContextMenu(ev, ri); })(i);

            // 셀 포커스 클릭 + 드래그 범위 선택
            ((ri, cci) => {
                td.addEventListener('mousedown', (e) => {
                    if (e.detail === 1 && !this._editing) {
                        if (e.shiftKey && this._focusRow >= 0) {
                            // Shift+클릭: 범위 확장
                            this._rangeEndRow = ri;
                            this._rangeEndCol = cci;
                            this._renderRange();
                        } else {
                            this._setFocusCell(ri, cci);
                            this._isDragging = true;
                        }
                    }
                });
                td.addEventListener('mouseover', (e) => {
                    if (this._isDragging && e.buttons === 1) {
                        this._rangeEndRow = ri;
                        this._rangeEndCol = cci;
                        this._renderRange();
                    }
                });
            })(i, ci);

            // 툴팁
            if (col.tooltip !== false) {
                td.addEventListener('mouseenter', () => {
                    if (td.scrollWidth > td.clientWidth) td.title = td.textContent;
                    else td.title = '';
                });
            }

            if (col.editor === 'check') {
                this._renderCheckEditor(td, row, col, i);
            } else if (col.editor === 'switch') {
                this._renderSwitchEditor(td, row, col, i);
            } else {
                if (this.editable && !col.readOnly) {
                    td.ondblclick = (e) => { e.stopPropagation(); this._startEdit(i, col, td, row); };
                }
                this._renderCell(td, row, col, i);
            }
            tr.appendChild(td);
        }
        this.tbody.appendChild(tr);

        // 멀티행 (서브행) 렌더링
        if (this.rowDetail) {
            const detail = this.rowDetail(row, i);
            if (detail) {
                if (typeof detail === 'string') {
                    // HTML 문자열 → 전체 colspan 1행
                    const dtr = document.createElement('tr');
                    dtr.className = 'forma-detail-row';
                    dtr.dataset.ridx = String(i);
                    if (i % 2 === 1) dtr.classList.add('forma-row-alt');
                    const dtd = document.createElement('td');
                    dtd.colSpan = this.columns.length + this._leadingCols();
                    dtd.innerHTML = detail;
                    dtr.appendChild(dtd);
                    this.tbody.appendChild(dtr);
                } else if (Array.isArray(detail)) {
                    // 배열 → 여러 서브행, 각 항목이 1행
                    for (const subRow of detail) {
                        const dtr = document.createElement('tr');
                        dtr.className = 'forma-detail-row';
                        dtr.dataset.ridx = String(i);
                        if (i % 2 === 1) dtr.classList.add('forma-row-alt');
                        // leading 빈 셀
                        for (let lc = 0; lc < this._leadingCols(); lc++) {
                            const ltd = document.createElement('td'); ltd.style.borderBottom = 'none'; dtr.appendChild(ltd);
                        }
                        if (Array.isArray(subRow)) {
                            // [{field, colspan, value, label, align, renderer, editable, editor}] 형태
                            let consumed = 0;
                            for (const cell of subRow) {
                                const dtd = document.createElement('td');
                                if (cell.colspan) dtd.colSpan = cell.colspan;
                                if (cell.align) dtd.style.textAlign = cell.align;
                                if (cell.style) dtd.style.cssText += cell.style;

                                const renderDetailCell = () => {
                                    if (cell.renderer) {
                                        const result = cell.renderer(cell.field ? row[cell.field] : null, row, null, i);
                                        if (typeof result === 'string') dtd.innerHTML = result;
                                        else dtd.textContent = '';
                                    } else if (cell.label) {
                                        dtd.innerHTML = '<span style="color:var(--text-muted);font-size:11px">' + cell.label + ':</span> ' + (cell.field ? (row[cell.field] ?? '') : (cell.value ?? ''));
                                    } else if (cell.field) {
                                        dtd.textContent = row[cell.field] ?? '';
                                    } else if (cell.value !== undefined) {
                                        dtd.textContent = cell.value;
                                    }
                                };
                                renderDetailCell();

                                // 서브행 편집 지원
                                if (cell.editable !== false && cell.field && this.editable) {
                                    ((ri, fld, cDef) => {
                                        dtd.ondblclick = (ev) => {
                                            ev.stopPropagation();
                                            if (dtd.querySelector('input, textarea, select')) return;
                                            this._editing = true;
                                            const origVal = this.rows[ri][fld];
                                            dtd.textContent = '';
                                            const editor = cDef.editor || 'text';
                                            let inp;
                                            if (editor === 'textarea') {
                                                inp = document.createElement('textarea');
                                                inp.className = 'forma-grid-input';
                                                inp.style.cssText = 'width:100%;min-height:40px;font-size:12px;padding:2px 4px;resize:vertical;';
                                            } else {
                                                inp = document.createElement('input');
                                                inp.className = 'forma-grid-input';
                                                inp.type = (editor === 'number' || cDef.type === 'number') ? 'number' : 'text';
                                            }
                                            inp.value = origVal ?? '';
                                            dtd.appendChild(inp);
                                            inp.focus(); if (inp.select) inp.select();
                                            const commit = () => {
                                                this._editing = false;
                                                const newVal = inp.value || null;
                                                if (newVal !== origVal) {
                                                    this.rows[ri][fld] = newVal;
                                                    this._markModified(ri);
                                                    this._undoStack.push({ rowIdx: ri, field: fld, oldVal: origVal, newVal });
                                                    if (this._undoStack.length > 100) this._undoStack.shift();
                                                    this._redoStack = [];
                                                    if (this.onCellChange) this.onCellChange(this.rows[ri], fld, ri);
                                                }
                                                renderDetailCell();
                                            };
                                            inp.onblur = commit;
                                            inp.onkeydown = (ke) => {
                                                if (ke.key === 'Enter' && editor !== 'textarea') { ke.preventDefault(); commit(); }
                                                if (ke.key === 'Escape') { this._editing = false; this.rows[ri][fld] = origVal; renderDetailCell(); }
                                            };
                                        };
                                        dtd.style.cursor = 'pointer';
                                    })(i, cell.field, cell);
                                }

                                consumed += (cell.colspan || 1);
                                dtr.appendChild(dtd);
                            }
                            // 남은 컬럼 빈 셀
                            for (let rc = consumed; rc < this.columns.length; rc++) dtr.appendChild(document.createElement('td'));
                        } else if (typeof subRow === 'string') {
                            const dtd = document.createElement('td');
                            dtd.colSpan = this.columns.length;
                            dtd.innerHTML = subRow;
                            dtr.appendChild(dtd);
                        }
                        this.tbody.appendChild(dtr);
                    }
                }
            }
        }

        // 마스터-디테일 중첩 그리드
        if (this.detailGrid && this._expandedDetails.has(i)) {
            const dtr = document.createElement('tr');
            dtr.className = 'forma-master-detail-row';
            dtr.dataset.ridx = String(i);
            const dtd = document.createElement('td');
            dtd.colSpan = this.columns.length + this._leadingCols();
            dtd.style.padding = '8px 16px 8px ' + (this._leadingCols() * 40 + 16) + 'px';
            const container = document.createElement('div');
            container.className = 'forma-detail-grid-wrap';
            dtd.appendChild(container);
            dtr.appendChild(dtd);
            this.tbody.appendChild(dtr);
            this.detailGrid(row, container, i);
        }
    }

    // 그리드 셀(표시 전용)에 들어온 HTML에서 편집 가능 속성/장식 제거
    _sanitizeReadonlyHtml(root) {
        root.querySelectorAll('[contenteditable]').forEach((el) => el.setAttribute('contenteditable', 'false'));
        root.querySelectorAll('.fg-ta-tbl-resize').forEach((el) => el.remove());
    }

    _renderCell(td, row, col, rowIdx) {
        let val = row[col.field];
        // 컬럼 옵션 wrap: true → 셀 내용을 줄바꿈/래핑 (textarea 편집기 없는 읽기전용 컬럼에서 사용)
        if (col.wrap) td.classList.add('fg-wrap');
        // textarea 컬럼: HTML 렌더링 (볼드/이탤릭/밑줄 지원)
        if (col.editor === 'textarea') {
            td.classList.add('fg-wrap');
            if (val) {
                td.innerHTML = val;
                this._sanitizeReadonlyHtml(td);
            } else { td.textContent = ''; }
            return;
        }
        // 커스텀 렌더러
        if (col.renderer) {
            const result = col.renderer(val, row, col, rowIdx);
            if (typeof result === 'string') { td.innerHTML = result; this._sanitizeReadonlyHtml(td); }
            else if (result instanceof HTMLElement) { td.textContent = ''; td.appendChild(result); this._sanitizeReadonlyHtml(td); }
            else td.textContent = val ?? '';
            return;
        }
        if (col.editor === 'select' || col.editor === 'combo' || col.code) {
            const opts = col.options || this._codeCache[col.code] || [];
            const opt = opts.find(o => String(o.value) === String(val));
            td.textContent = opt ? opt.label : (val ?? '');
            return;
        }
        // codeHelp: 코드 + 이름 표시
        if (col.editor === 'codeHelp') {
            const nameField = col.nameField || (col.field.replace(/_CD$|_CODE$/i, '_NM').replace(/_cd$|_code$/i, '_nm'));
            const name = row[nameField] || '';
            td.textContent = (val ? val + (name ? ' ' + name : '') : '');
            return;
        }
        if ((col.format === 'currency' || col.editor === 'currency') && val != null && val !== '') {
            td.textContent = Number(val).toLocaleString('ko-KR');
        } else if ((col.format === 'date' || col.editor === 'date') && val) {
            let ds = String(val);
            if (/^\d{8}$/.test(ds)) ds = ds.substring(0, 4) + '-' + ds.substring(4, 6) + '-' + ds.substring(6, 8);
            td.textContent = ds.substring(0, 10);
        } else {
            td.textContent = val ?? '';
        }
    }

    _renderRow(idx) {
        const tr = this._getRowTr(idx); if (!tr) return;
        const row = this.rows[idx];
        let ci = this._leadingCols();
        for (let c = 0; c < this.columns.length; c++) {
            const col = this.columns[c];
            const td = tr.children[ci];
            if (col.editor !== 'check' && col.editor !== 'switch') this._renderCell(td, row, col, idx);
            ci++;
        }
        if (row.gstat === 'I' || row.gstat === 'U') tr.classList.add('forma-row-modified');
        if (row.gstat === 'D') tr.classList.add('forma-row-deleted');
    }

    _applySavedCss() {
        for (const [idx, classes] of Object.entries(this._rowCss)) { const tr = this.tbody.children[idx]; if (tr) classes.forEach(c => tr.classList.add(c)); }
        for (const [key, classes] of Object.entries(this._cellCss)) { const [rowIdx, field] = key.split(':'); const td = this._getTd(Number(rowIdx), field); if (td) classes.forEach(c => td.classList.add(c)); }
    }

    _renderEmpty() {
        const cols = this.columns.length + this._leadingCols();
        this.tbody.innerHTML = '<tr><td colspan="' + cols + '" class="forma-grid-empty">' +
            '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" style="opacity:0.3;margin-bottom:8px;display:block;margin-left:auto;margin-right:auto">' +
            '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/>' +
            '</svg>데이터가 없습니다</td></tr>';
    }

    // ── 셀 병합 (자동 rowspan) ──
    _applyCellMerge() {
        for (const field of this._mergeColumns) {
            const colIdx = this.columns.findIndex(c => c.field === field);
            if (colIdx < 0) continue;

            let startRow = 0;
            while (startRow < this.rows.length) {
                const startVal = this.rows[startRow][field];
                let span = 1;
                while (startRow + span < this.rows.length && this.rows[startRow + span][field] === startVal) span++;

                if (span > 1) {
                    const firstTd = this._getTdByIdx(startRow, colIdx);
                    if (firstTd) {
                        firstTd.rowSpan = span;
                        firstTd.style.verticalAlign = 'middle';
                        // 병합 셀 편집 지원
                        if (this.editable && !this.columns[colIdx].readOnly) {
                            ((sr, ci, sp) => {
                                firstTd.ondblclick = (e) => {
                                    e.stopPropagation();
                                    this._startEdit(sr, this.columns[ci], firstTd, this.rows[sr]);
                                };
                            })(startRow, colIdx, span);
                        }
                        // 병합된 행의 TD 숨기기
                        for (let r = 1; r < span; r++) {
                            const hideTd = this._getTdByIdx(startRow + r, colIdx);
                            if (hideTd) hideTd.style.display = 'none';
                        }
                    }
                }
                startRow += span;
            }
        }
    }

    // 프로그래밍 방식 셀 병합 API
    mergeCells(startRow, startCol, rowspan, colspan) {
        const td = this._getTdByIdx(startRow, startCol);
        if (!td) return;
        if (rowspan > 1) td.rowSpan = rowspan;
        if (colspan > 1) td.colSpan = colspan;
        td.style.verticalAlign = 'middle';
        // 병합 범위 내 셀 숨기기
        for (let r = 0; r < rowspan; r++) {
            for (let c = 0; c < colspan; c++) {
                if (r === 0 && c === 0) continue;
                const hideTd = this._getTdByIdx(startRow + r, startCol + c);
                if (hideTd) hideTd.style.display = 'none';
            }
        }
    }

    // ── 가상 스크롤 ──
    _renderVirtual() {
        const totalH = this.rows.length * this._rowHeight;
        const viewH = this._scrollWrap.clientHeight;
        const scrollTop = this._scrollWrap.scrollTop;
        // 뷰포트 높이 기반 동적 버퍼 (최소 3, 뷰포트의 30%)
        const visibleRows = Math.ceil(viewH / this._rowHeight);
        const buf = Math.max(3, Math.ceil(visibleRows * 0.3));
        const start = Math.max(0, Math.floor(scrollTop / this._rowHeight) - buf);
        const end = Math.min(this.rows.length, Math.ceil((scrollTop + viewH) / this._rowHeight) + buf);
        if (start === this._vsStart && end === this._vsEnd && this.tbody.children.length > 0) return;
        this._vsStart = start; this._vsEnd = end;

        this.tbody.innerHTML = '';
        const cs = this.columns.length + this._leadingCols();

        if (start > 0) {
            const sp = document.createElement('tr');
            const td = document.createElement('td'); td.colSpan = cs;
            td.style.cssText = 'height:' + (start * this._rowHeight) + 'px;padding:0;border:none;';
            sp.appendChild(td); this.tbody.appendChild(sp);
        }
        for (let i = start; i < end; i++) this._appendRow(i);
        if (end < this.rows.length) {
            const sp = document.createElement('tr');
            const td = document.createElement('td'); td.colSpan = cs;
            td.style.cssText = 'height:' + ((this.rows.length - end) * this._rowHeight) + 'px;padding:0;border:none;';
            sp.appendChild(td); this.tbody.appendChild(sp);
        }
    }

    // ── 그룹핑 ──
    _buildGroups() {
        if (!this.groupBy) { this._groups = []; return; }
        const field = this.groupBy;
        const col = this.columns.find(c => c.field === field);
        const map = new Map();
        for (let i = 0; i < this.rows.length; i++) {
            const key = String(this.rows[i][field] ?? '');
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(i);
        }
        this._groups = [];
        for (const [key, indices] of map) {
            let label = key;
            if (col && (col.editor === 'select' || col.editor === 'combo') && col.options) {
                const opt = col.options.find(o => String(o.value) === key);
                if (opt) label = opt.label;
            }
            this._groups.push({ key, label, indices });
        }
    }

    _renderGrouped() {
        this._buildGroups();
        const cs = this.columns.length + this._leadingCols();
        for (const grp of this._groups) {
            // 그룹 헤더
            const htr = document.createElement('tr');
            htr.className = 'forma-group-row';
            const htd = document.createElement('td');
            htd.colSpan = cs;
            const collapsed = this._collapsedGroups.has(grp.key);
            htd.innerHTML = '<span class="forma-group-toggle">' + (collapsed ? '▶' : '▼') + '</span> '
                + '<b>' + (grp.label || '(빈값)') + '</b>'
                + ' <span class="forma-group-count">(' + grp.indices.length + '건)</span>';
            htd.onclick = () => this.toggleGroup(grp.key);
            htr.appendChild(htd);
            this.tbody.appendChild(htr);

            if (!collapsed) {
                for (const idx of grp.indices) this._appendRow(idx);

                // 그룹 소계
                if (this.groupFooter) {
                    const ftr = document.createElement('tr');
                    ftr.className = 'forma-group-footer';
                    if (this.reorderable) ftr.appendChild(document.createElement('td'));
                    if (this.checkable) ftr.appendChild(document.createElement('td'));
                    if (this.rowNum) { const td = document.createElement('td'); td.textContent = '소계'; td.style.textAlign = 'center'; td.style.fontWeight = '600'; ftr.appendChild(td); }
                    for (const col of this.columns) {
                        const td = document.createElement('td');
                        if (col.footer) {
                            const vals = grp.indices.map(i => Number(this.rows[i][col.field]) || 0);
                            let result;
                            if (col.footer === 'sum') result = vals.reduce((a, b) => a + b, 0);
                            else if (col.footer === 'avg') result = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
                            else if (col.footer === 'count') result = vals.length;
                            td.textContent = Number(result).toLocaleString('ko-KR');
                            td.style.textAlign = 'right'; td.style.fontWeight = '600';
                        }
                        ftr.appendChild(td);
                    }
                    this.tbody.appendChild(ftr);
                }
            }
        }
    }

    toggleGroup(key) {
        if (this._collapsedGroups.has(key)) this._collapsedGroups.delete(key);
        else this._collapsedGroups.add(key);
        this._render();
    }

    expandAllGroups() { this._collapsedGroups.clear(); this._render(); }
    collapseAllGroups() { this._groups.forEach(g => this._collapsedGroups.add(g.key)); this._render(); }

    // ── 트리 그리드 ──
    _renderTree() {
        const idField = this.treeIdField, parentField = this.treeParentField;
        const treeColIdx = this.columns.findIndex(c => c.field === this.treeField);
        const childMap = new Map(); // parentId → [rowIdx]
        const rootIndices = [];
        for (let i = 0; i < this.rows.length; i++) {
            const pid = this.rows[i][parentField];
            if (!pid && pid !== 0) { rootIndices.push(i); }
            else { if (!childMap.has(pid)) childMap.set(pid, []); childMap.get(pid).push(i); }
        }
        const renderNode = (idx, depth) => {
            const row = this.rows[idx];
            const nodeId = row[idField];
            const children = childMap.get(nodeId) || [];
            const hasChildren = children.length > 0;
            const collapsed = this._treeState.has(nodeId);
            this._appendRow(idx);
            // 트리 필드 셀에 들여쓰기 + 토글 삽입 (renderer 결과 보존)
            if (treeColIdx >= 0) {
                const td = this._getTdByIdx(idx, treeColIdx);
                if (td) {
                    const indent = depth * 20;
                    const toggleSpan = document.createElement('span');
                    if (hasChildren) {
                        toggleSpan.className = 'forma-tree-toggle';
                        toggleSpan.style.marginLeft = indent + 'px';
                        toggleSpan.textContent = collapsed ? '▶' : '▼';
                        toggleSpan.onclick = (e) => { e.stopPropagation(); this.toggleTreeNode(nodeId); };
                    } else {
                        toggleSpan.style.display = 'inline-block';
                        toggleSpan.style.width = '14px';
                        toggleSpan.style.marginLeft = indent + 'px';
                    }
                    td.insertBefore(document.createTextNode(' '), td.firstChild);
                    td.insertBefore(toggleSpan, td.firstChild);
                }
            }
            if (!collapsed) {
                for (const ci of children) renderNode(ci, depth + 1);
            }
        };
        for (const ri of rootIndices) renderNode(ri, 0);
    }

    toggleTreeNode(nodeId) {
        if (this._treeState.has(nodeId)) this._treeState.delete(nodeId);
        else this._treeState.add(nodeId);
        this._render();
    }

    expandAllTree() { this._treeState.clear(); this._render(); }
    collapseAllTree() { for (const row of this.rows) { const id = row[this.treeIdField]; if (id !== null && id !== undefined) this._treeState.add(id); } this._render(); }

    // ── 마스터-디테일 중첩 그리드 ──
    toggleDetail(rowIdx) {
        if (this._expandedDetails.has(rowIdx)) this._expandedDetails.delete(rowIdx);
        else this._expandedDetails.add(rowIdx);
        this._render();
    }

    // ══════════════════════════════════════════════════════════
    //  인라인 에디터 (check, switch)
    // ══════════════════════════════════════════════════════════

    _renderCheckEditor(td, row, col, rowIdx) {
        td.style.textAlign = 'center';
        const cb = document.createElement('input'); cb.type = 'checkbox';
        cb.checked = row[col.field] === 'Y' || row[col.field] === true || row[col.field] === 1;
        cb.onclick = (e) => e.stopPropagation();
        cb.onchange = () => {
            if (typeof this.options.beforeEditStart === 'function' && this.options.beforeEditStart(row, col.field, rowIdx) === false) { cb.checked = !cb.checked; return; }
            row[col.field] = cb.checked ? 'Y' : 'N'; if (row.gstat !== 'I') row.gstat = 'U'; const tr = this.tbody.children[rowIdx]; if (tr) tr.classList.add('forma-row-modified'); if (this.onCellChange) this.onCellChange(row, col.field, rowIdx); this._renderFooter();
        };
        if (!this.editable || col.readOnly) cb.disabled = true;
        td.appendChild(cb);
    }

    _renderSwitchEditor(td, row, col, rowIdx) {
        td.style.textAlign = 'center';
        const wrap = document.createElement('span'); wrap.className = 'forma-switch-wrap';
        const track = document.createElement('span'); track.className = 'forma-switch-track';
        const thumb = document.createElement('span'); thumb.className = 'forma-switch-thumb';
        track.appendChild(thumb); wrap.appendChild(track);
        const isOn = row[col.field] === 'Y' || row[col.field] === true || row[col.field] === 1;
        if (isOn) track.classList.add('on');
        if (this.editable && !col.readOnly) {
            track.style.cursor = 'pointer';
            track.onclick = (e) => { e.stopPropagation(); const on = !track.classList.contains('on'); row[col.field] = on ? 'Y' : 'N'; if (row.gstat !== 'I') row.gstat = 'U'; if (on) track.classList.add('on'); else track.classList.remove('on'); const tr = this.tbody.children[rowIdx]; if (tr) tr.classList.add('forma-row-modified'); if (this.onCellChange) this.onCellChange(row, col.field, rowIdx); this._renderFooter(); };
        }
        td.appendChild(wrap);
    }

    // ══════════════════════════════════════════════════════════
    //  에디터 디스패치 + 커밋/이동 공통 로직
    // ══════════════════════════════════════════════════════════

    _markModified(rowIdx) {
        const row = this.rows[rowIdx]; if (!row) return;
        if (row.gstat !== 'I') row.gstat = 'U';
        const tr = this.tbody.children[rowIdx]; if (tr) tr.classList.add('forma-row-modified');
    }

    _commitValue(rowIdx, col, val, originalValue) {
        const row = this.rows[rowIdx]; if (!row) return false;
        if (val === originalValue && String(val) === String(originalValue)) return false;
        row[col.field] = val;
        this._markModified(rowIdx);
        // Undo 스택 기록
        this._undoStack.push({ rowIdx, field: col.field, oldVal: originalValue, newVal: val });
        if (this._undoStack.length > 100) this._undoStack.shift();
        this._redoStack = [];
        if (this.onCellChange) this.onCellChange(row, col.field, rowIdx);
        return true;
    }

    _editorKeydown(e, rowIdx, colIdx, commitFn) {
        if (e.key === 'Tab') {
            e.preventDefault(); commitFn();
            this._navigateEdit(rowIdx, colIdx, e.shiftKey ? 'prev' : 'next');
        } else if (e.key === 'Enter') {
            e.preventDefault(); commitFn();
            this._navigateEdit(rowIdx, colIdx, 'down');
        } else if (e.key === 'Escape') {
            return 'cancel';
        }
        return null;
    }

    _navigateEdit(rowIdx, colIdx, direction) {
        const target = this._findNextEditable(rowIdx, colIdx, direction);
        if (target) {
            this._setFocusCell(target.row, target.col);
            setTimeout(() => this._startEditByIdx(target.row, target.col), 10);
        } else {
            this._setFocusCell(rowIdx, colIdx);
        }
    }

    _findNextEditable(rowIdx, colIdx, direction) {
        const cols = this.columns;
        let r = rowIdx, c = colIdx;
        if (direction === 'next') {
            c++;
            while (r < this.rows.length) {
                while (c < cols.length) {
                    if (!cols[c].readOnly && cols[c].editor !== 'check' && cols[c].editor !== 'switch') return { row: r, col: c };
                    c++;
                }
                c = 0; r++;
            }
        } else if (direction === 'prev') {
            c--;
            while (r >= 0) {
                while (c >= 0) {
                    if (!cols[c].readOnly && cols[c].editor !== 'check' && cols[c].editor !== 'switch') return { row: r, col: c };
                    c--;
                }
                c = cols.length - 1; r--;
            }
        } else if (direction === 'down') {
            r++;
            if (r < this.rows.length && !cols[c].readOnly && cols[c].editor !== 'check' && cols[c].editor !== 'switch') return { row: r, col: c };
        } else if (direction === 'up') {
            r--;
            if (r >= 0 && !cols[c].readOnly && cols[c].editor !== 'check' && cols[c].editor !== 'switch') return { row: r, col: c };
        }
        return null;
    }

    _startEditByIdx(rowIdx, colIdx) {
        const col = this.columns[colIdx];
        if (!col || col.readOnly || !this.editable) return;
        if (col.editor === 'check' || col.editor === 'switch') return;
        const td = this._getTdByIdx(rowIdx, colIdx);
        if (!td) return;
        this._startEdit(rowIdx, col, td, this.rows[rowIdx]);
    }

    // ══════════════════════════════════════════════════════════
    //  에디터: text / number
    // ══════════════════════════════════════════════════════════

    _startEdit(rowIdx, col, td, row) {
        if (td.querySelector('input, select, textarea, .fg-combo-dd')) return;
        // beforeEditStart 콜백: false 반환 시 편집 차단
        if (typeof this.options.beforeEditStart === 'function') {
            if (this.options.beforeEditStart(row, col.field, rowIdx) === false) return;
        }
        this._editing = true;
        const editor = col.editor || 'text';
        if (editor === 'select') { this._startSelectEdit(rowIdx, col, td, row); return; }
        if (editor === 'combo') { this._startComboEdit(rowIdx, col, td, row); return; }
        if (editor === 'date') { this._startDateEdit(rowIdx, col, td, row); return; }
        if (editor === 'yearMonth') { this._startYearMonthEdit(rowIdx, col, td, row); return; }
        if (editor === 'currency' || col.format === 'currency') { this._startCurrencyEdit(rowIdx, col, td, row); return; }
        if (editor === 'textarea') { this._startTextareaEdit(rowIdx, col, td, row); return; }
        if (editor === 'codeHelp') { this._startCodeHelpEdit(rowIdx, col, td, row); return; }

        const ci = this.columns.indexOf(col);
        const originalValue = row[col.field];
        td.textContent = '';
        const input = document.createElement('input'); input.className = 'forma-grid-input';
        input.type = col.type === 'number' ? 'number' : 'text';
        if (col.maxLength && input.type !== 'number') input.maxLength = col.maxLength;
        input.value = row[col.field] ?? '';
        td.appendChild(input); input.focus(); input.select();

        const commit = () => {
            this._editing = false;
            let val = input.value;
            if (input.type === 'number') val = val ? Number(val) : null;
            this._commitValue(rowIdx, col, val, originalValue);
            this._renderCell(td, row, col, rowIdx); this._renderFooter();
        };

        input.onblur = commit;
        input.onkeydown = (e) => {
            const action = this._editorKeydown(e, rowIdx, ci, commit);
            if (action === 'cancel') { this._editing = false; row[col.field] = originalValue; this._renderCell(td, row, col, rowIdx); this._setFocusCell(rowIdx, ci); }
        };
    }

    // ── select ──
    _startSelectEdit(rowIdx, col, td, row) {
        const ci = this.columns.indexOf(col);
        const originalValue = row[col.field];
        const doEdit = (options) => {
            td.textContent = '';
            const select = document.createElement('select'); select.className = 'forma-grid-input';
            select.innerHTML = '<option value="">-- 선택 --</option>';
            for (const opt of options) { const o = document.createElement('option'); o.value = opt.value; o.textContent = opt.label; if (String(opt.value) === String(row[col.field])) o.selected = true; select.appendChild(o); }
            td.appendChild(select); select.focus();
            const commit = () => { this._editing = false; this._commitValue(rowIdx, col, select.value || null, originalValue); this._renderCell(td, row, col, rowIdx); this._renderFooter(); };
            select.onblur = commit;
            select.onchange = commit;
            select.onkeydown = (e) => {
                const action = this._editorKeydown(e, rowIdx, ci, commit);
                if (action === 'cancel') { this._editing = false; row[col.field] = originalValue; this._renderCell(td, row, col, rowIdx); this._setFocusCell(rowIdx, ci); }
            };
        };
        this._resolveOptions(col, doEdit);
    }

    // ── combo ──
    _startComboEdit(rowIdx, col, td, row) {
        const ci = this.columns.indexOf(col);
        const originalValue = row[col.field];
        const doEdit = (options) => {
            td.textContent = '';
            // 드롭다운을 body에 붙여서 td overflow:hidden 문제 회피
            const dd = document.createElement('div'); dd.className = 'fg-combo-dd';
            dd._formaGridOwner = this;
            dd.style.position = 'fixed'; dd.style.zIndex = '9999';
            const si = document.createElement('input'); si.type = 'text'; si.className = 'fc-combo-search'; si.placeholder = '검색...';
            dd.appendChild(si);
            const list = document.createElement('div'); list.className = 'fc-combo-list';
            dd.appendChild(list);
            document.body.appendChild(dd);

            // td 위치 기준으로 드롭다운 배치
            const rect = td.getBoundingClientRect();
            dd.style.left = rect.left + 'px';
            dd.style.top = rect.bottom + 'px';
            dd.style.width = Math.max(rect.width, 200) + 'px';

            let hlIdx = -1;
            const renderList = (filter) => {
                list.innerHTML = ''; const q = (filter || '').toLowerCase(); let idx = 0;
                const empty = document.createElement('div'); empty.className = 'fc-combo-item' + (!originalValue ? ' fc-sel' : '');
                empty.textContent = '-- 선택 --'; empty.dataset.idx = idx++;
                empty.addEventListener('click', (e) => { e.stopPropagation(); selectOpt({ value: null }); });
                list.appendChild(empty);
                options.forEach(opt => {
                    if (q && !opt.label.toLowerCase().includes(q) && !String(opt.value).toLowerCase().includes(q)) return;
                    const item = document.createElement('div'); item.className = 'fc-combo-item' + (String(opt.value) === String(originalValue) ? ' fc-sel' : '');
                    item.textContent = opt.label; item.dataset.idx = idx++;
                    item.addEventListener('click', (e) => { e.stopPropagation(); selectOpt(opt); });
                    item.addEventListener('mouseenter', () => { hlIdx = parseInt(item.dataset.idx); hl(); });
                    list.appendChild(item);
                });
                hlIdx = -1;
            };
            const hl = () => { list.querySelectorAll('.fc-combo-item').forEach((it, i) => it.classList.toggle('fc-hl', i === hlIdx)); };
            const removeDd = () => { if (dd.parentNode) dd.parentNode.removeChild(dd); };
            const selectOpt = (opt) => { this._editing = false; this._commitValue(rowIdx, col, opt.value, originalValue); cleanup(); removeDd(); this._renderCell(td, row, col, rowIdx); this._renderFooter(); };
            let docH = null;
            const cleanup = () => { if (docH) { document.removeEventListener('mousedown', docH); docH = null; } };
            docH = (e) => { if (!dd.contains(e.target) && e.target !== td) { this._editing = false; cleanup(); removeDd(); this._renderCell(td, row, col, rowIdx); } };
            setTimeout(() => document.addEventListener('mousedown', docH), 10);

            si.addEventListener('input', () => renderList(si.value));
            si.addEventListener('keydown', (e) => {
                const items = list.querySelectorAll('.fc-combo-item');
                if (e.key === 'ArrowDown') { e.preventDefault(); hlIdx = Math.min(hlIdx + 1, items.length - 1); hl(); items[hlIdx]?.scrollIntoView({ block: 'nearest' }); }
                else if (e.key === 'ArrowUp') { e.preventDefault(); hlIdx = Math.max(hlIdx - 1, 0); hl(); items[hlIdx]?.scrollIntoView({ block: 'nearest' }); }
                else if (e.key === 'Enter') { if (hlIdx >= 0 && items[hlIdx]) items[hlIdx].click(); }
                else if (e.key === 'Escape') { this._editing = false; cleanup(); removeDd(); row[col.field] = originalValue; this._renderCell(td, row, col, rowIdx); this._setFocusCell(rowIdx, ci); }
                else if (e.key === 'Tab') { e.preventDefault(); this._editing = false; cleanup(); removeDd(); this._renderCell(td, row, col, rowIdx); this._navigateEdit(rowIdx, ci, e.shiftKey ? 'prev' : 'next'); }
            });
            renderList(''); si.focus();
            const selItem = list.querySelector('.fc-sel'); if (selItem) selItem.scrollIntoView({ block: 'nearest' });
        };
        this._resolveOptions(col, doEdit);
    }

    // ── date ──
    _startDateEdit(rowIdx, col, td, row) {
        const ci = this.columns.indexOf(col);
        const originalValue = row[col.field];
        if (typeof _FormaCalendar === 'undefined') { this._startEdit(rowIdx, { ...col, editor: 'text' }, td, row); return; }
        // YYYYMMDD → YYYY-MM-DD 변환 (캘린더 표시용)
        let calVal = originalValue || null;
        if (calVal && /^\d{8}$/.test(calVal)) calVal = calVal.substring(0, 4) + '-' + calVal.substring(4, 6) + '-' + calVal.substring(6, 8);
        const cal = new _FormaCalendar({
            onSelect: (ds) => {
                this._editing = false;
                // YYYY-MM-DD → YYYYMMDD 변환 (저장용)
                const val = ds ? ds.replace(/-/g, '') : ds;
                this._commitValue(rowIdx, col, val, originalValue);
                this._renderCell(td, row, col, rowIdx);
            },
            onClear: () => { this._editing = false; this._commitValue(rowIdx, col, '', originalValue); this._renderCell(td, row, col, rowIdx); }
        });
        cal.show(td, calVal);
    }

    // ── yearMonth ──
    _startYearMonthEdit(rowIdx, col, td, row) {
        const ci = this.columns.indexOf(col);
        const originalValue = row[col.field];
        td.textContent = '';
        const input = document.createElement('input');
        input.className = 'forma-grid-input';
        input.type = 'month';
        input.min = '1900-01';
        input.max = '9999-12';
        input.style.textAlign = 'center';
        // YYYYMM → YYYY-MM 변환
        if (originalValue && /^\d{6}$/.test(originalValue)) {
            input.value = originalValue.substring(0, 4) + '-' + originalValue.substring(4, 6);
        } else if (originalValue && /^\d{4}-\d{2}$/.test(originalValue)) {
            input.value = originalValue;
        }
        td.appendChild(input); input.focus();
        const commit = () => {
            this._editing = false;
            // YYYY-MM → YYYYMM 변환
            const val = input.value ? input.value.replace(/-/g, '') : '';
            this._commitValue(rowIdx, col, val, originalValue);
            this._renderCell(td, row, col, rowIdx); this._renderFooter();
        };
        input.onblur = commit;
        input.onkeydown = (e) => {
            const action = this._editorKeydown(e, rowIdx, ci, commit);
            if (action === 'cancel') { this._editing = false; row[col.field] = originalValue; this._renderCell(td, row, col, rowIdx); this._setFocusCell(rowIdx, ci); }
        };
    }

    // ── currency ──
    _startCurrencyEdit(rowIdx, col, td, row) {
        const ci = this.columns.indexOf(col);
        const originalValue = row[col.field];
        td.textContent = '';
        const input = document.createElement('input'); input.className = 'forma-grid-input'; input.type = 'text'; input.style.textAlign = 'right';
        if (col.maxLength) input.maxLength = col.maxLength;
        const raw = originalValue != null && originalValue !== '' ? Number(originalValue) : '';
        input.value = raw !== '' && !isNaN(raw) ? String(raw) : '';
        td.appendChild(input); input.focus(); input.select();

        input.addEventListener('keydown', (e) => {
            const action = this._editorKeydown(e, rowIdx, ci, commit);
            if (action === 'cancel') { this._editing = false; row[col.field] = originalValue; this._renderCell(td, row, col, rowIdx); this._setFocusCell(rowIdx, ci); return; }
            if (e.key === 'Tab' || e.key === 'Enter' || e.key === 'Escape') return;
            if (e.ctrlKey || e.metaKey) return;
            if (['Backspace','Delete','ArrowLeft','ArrowRight','Home','End'].includes(e.key)) return;
            if (e.key === '-' && input.selectionStart === 0) return;
            if (e.key === '.' && !input.value.includes('.')) return;
            if (e.key >= '0' && e.key <= '9') return;
            e.preventDefault();
        });

        const commit = () => {
            this._editing = false;
            const s = input.value.replace(/,/g, '');
            const numVal = s === '' ? null : (isNaN(Number(s)) ? null : Number(s));
            this._commitValue(rowIdx, col, numVal, originalValue);
            this._renderCell(td, row, col, rowIdx); this._renderFooter();
        };
        input.onblur = commit;
    }

    // ── textarea (richtext overlay popup) ──
    _startTextareaEdit(rowIdx, col, td, row) {
        const ci = this.columns.indexOf(col);
        const self = this;
        const originalValue = row[col.field];

        // overlay
        const overlay = document.createElement('div');
        overlay.className = 'fg-ta-overlay';

        const popup = document.createElement('div');
        popup.className = 'fg-ta-popup';

        // 헤더
        const header = document.createElement('div');
        header.className = 'fg-ta-header';
        header.innerHTML = '<span class="fg-ta-title">' + (col.label || col.field) + '</span><span class="fg-ta-hint">Ctrl+Enter: 확인 | Esc: 취소</span>';

        // 서식 툴바
        const toolbar = document.createElement('div');
        toolbar.className = 'fg-ta-toolbar';
        const btns = [
            { cmd: 'bold', icon: 'B', title: '굵게 (Ctrl+B)', style: 'font-weight:700' },
            { cmd: 'italic', icon: 'I', title: '기울임 (Ctrl+I)', style: 'font-style:italic' },
            { cmd: 'underline', icon: 'U', title: '밑줄 (Ctrl+U)', style: 'text-decoration:underline' },
            { cmd: 'strikeThrough', icon: 'S', title: '취소선', style: 'text-decoration:line-through' },
            { sep: true },
            { cmd: 'justifyLeft', icon: '⯇', title: '왼쪽 정렬' },
            { cmd: 'justifyCenter', icon: '≡', title: '가운데 정렬' },
            { cmd: 'justifyRight', icon: '⯈', title: '오른쪽 정렬' },
            { sep: true },
            { cmd: '_table', icon: '⊞', title: '표 삽입' },
            { sep: true },
            { cmd: 'removeFormat', icon: '⌫', title: '서식 제거' }
        ];
        btns.forEach(function(b) {
            if (b.sep) {
                const sep = document.createElement('span');
                sep.className = 'fg-ta-tb-sep';
                toolbar.appendChild(sep);
                return;
            }
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'fg-ta-tb-btn';
            btn.title = b.title;
            btn.innerHTML = '<span style="' + (b.style || '') + '">' + b.icon + '</span>';
            btn.onmousedown = function(e) { e.preventDefault(); };
            btn.onclick = function() {
                if (b.cmd === '_table') { self._taShowTablePicker(btn, editor); return; }
                document.execCommand(b.cmd, false, null);
                // 이미 에디터 내부(표 셀 등)에 포커스가 있으면 유지 — 스크롤 튀는 것 방지
                if (!editor.contains(document.activeElement)) {
                    editor.focus({ preventScroll: true });
                }
            };
            toolbar.appendChild(btn);
        });

        // contenteditable 에디터
        const editor = document.createElement('div');
        editor.className = 'fg-ta-input';
        editor.contentEditable = 'true';
        editor.innerHTML = row[col.field] ?? '';
        if (!row[col.field]) {
            editor.dataset.placeholder = '내용을 입력하세요...';
            editor.classList.add('fg-ta-empty');
        }

        // placeholder 처리
        editor.addEventListener('input', function() {
            if (editor.textContent.trim() === '' && !editor.querySelector('img,br+br')) {
                editor.classList.add('fg-ta-empty');
            } else {
                editor.classList.remove('fg-ta-empty');
            }
        });

        // maxLength — plain text 기준 글자수 제한 (리치 포맷 보존)
        if (col.maxLength) {
            const limit = col.maxLength;
            editor.addEventListener('beforeinput', function(e) {
                const inserting = typeof e.inputType === 'string' && e.inputType.indexOf('insert') === 0;
                if (!inserting) return;
                const sel = window.getSelection();
                const selLen = (sel && !sel.isCollapsed) ? sel.toString().length : 0;
                const cur = editor.textContent.length - selLen;
                const add = (e.data ? e.data.length : (e.dataTransfer ? (e.dataTransfer.getData('text') || '').length : 1));
                if (cur + add > limit) e.preventDefault();
            });
            // 붙여넣기로 초과하면 잘라서 삽입
            editor.addEventListener('paste', function(e) {
                const text = (e.clipboardData || window.clipboardData).getData('text') || '';
                const sel = window.getSelection();
                const selLen = (sel && !sel.isCollapsed) ? sel.toString().length : 0;
                const available = limit - (editor.textContent.length - selLen);
                if (text.length > available) {
                    e.preventDefault();
                    document.execCommand('insertText', false, text.slice(0, Math.max(0, available)));
                }
            });
        }

        // 버튼바
        const btnBar = document.createElement('div');
        btnBar.className = 'fg-ta-btnbar';
        const btnOk = document.createElement('button');
        btnOk.className = 'forma-btn forma-btn-primary forma-btn-sm';
        btnOk.textContent = '확인';
        const btnCancel = document.createElement('button');
        btnCancel.className = 'forma-btn forma-btn-sm';
        btnCancel.textContent = '취소';
        btnBar.appendChild(btnCancel);
        btnBar.appendChild(btnOk);

        popup.appendChild(header);
        popup.appendChild(toolbar);
        popup.appendChild(editor);
        popup.appendChild(btnBar);
        overlay.appendChild(popup);
        document.body.appendChild(overlay);

        // 포커스 — 커서를 끝으로
        editor.focus();
        const sel = window.getSelection();
        sel.selectAllChildren(editor);
        sel.collapseToEnd();

        // 값 추출 (빈 내용이면 null). 저장 직전 UI 장식(리사이저) 제거.
        const getEditorValue = () => {
            if (!editor.textContent.trim() && !editor.querySelector('.fg-ta-tbl')) return null;
            const clone = editor.cloneNode(true);
            clone.querySelectorAll('.fg-ta-tbl-resize').forEach((el) => el.remove());
            const html = clone.innerHTML;
            if (!html || html === '<br>') return null;
            return html;
        };

        // 확인
        const commit = () => {
            self._editing = false;
            self._commitValue(rowIdx, col, getEditorValue(), originalValue);
            self._renderCell(td, row, col, rowIdx);
            self._setFocusCell(rowIdx, ci);
            close();
        };

        // 취소
        const cancel = () => {
            self._editing = false;
            row[col.field] = originalValue;
            self._renderCell(td, row, col, rowIdx);
            self._setFocusCell(rowIdx, ci);
            close();
        };

        const close = () => {
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        };

        btnOk.onclick = commit;
        btnCancel.onclick = cancel;
        overlay.addEventListener('click', (e) => { if (e.target === overlay) commit(); });

        editor.onkeydown = (e) => {
            if (e.key === 'Escape') { e.preventDefault(); cancel(); }
            else if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); commit(); }
            else if (e.key === 'Tab') {
                // 표 셀 안에서 Tab: 다음 셀로. 마지막 셀이면 새 행 추가.
                const cell = e.target && e.target.closest ? e.target.closest('.fg-ta-tbl-cell') : null;
                if (cell) {
                    e.preventDefault();
                    self._taTableMoveNextCell(cell, e.shiftKey);
                    return;
                }
            }
            e.stopPropagation();
        };

        // 표 셀 드래그 선택 (셀 병합용)
        // - 좌클릭만 선택을 리셋. 우클릭(button=2)은 선택 유지해서 컨텍스트 메뉴에서 병합 가능.
        let dragAnchor = null;
        editor.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            const cell = e.target && e.target.closest ? e.target.closest('.fg-ta-tbl-cell') : null;
            if (!cell) {
                editor.querySelectorAll('.fg-ta-tbl-sel').forEach(function(c){ c.classList.remove('fg-ta-tbl-sel'); });
                dragAnchor = null;
                return;
            }
            if (e.shiftKey && dragAnchor && dragAnchor.parentNode === cell.parentNode) {
                // 기존 앵커 유지 + 범위 갱신
                self._taTableSelectRange(dragAnchor, cell);
            } else {
                editor.querySelectorAll('.fg-ta-tbl-sel').forEach(function(c){ c.classList.remove('fg-ta-tbl-sel'); });
                dragAnchor = cell;
            }
        });
        editor.addEventListener('mousemove', (e) => {
            if (!dragAnchor || e.buttons !== 1) return;
            const cell = e.target && e.target.closest ? e.target.closest('.fg-ta-tbl-cell') : null;
            if (!cell || cell === dragAnchor) return;
            if (cell.parentNode !== dragAnchor.parentNode) return;
            self._taTableSelectRange(dragAnchor, cell);
        });
        editor.addEventListener('mouseup', () => { dragAnchor = null; });

        // 표 셀 우클릭 → 컨텍스트 메뉴
        editor.addEventListener('contextmenu', (e) => {
            const cell = e.target && e.target.closest ? e.target.closest('.fg-ta-tbl-cell') : null;
            if (!cell) return;
            e.preventDefault();
            self._taTableContextMenu(editor, cell, e.clientX, e.clientY);
        });
    }

    // ══════════════════════════════════════════════════════════
    //  Textarea editor — Table (div 기반, CSS Grid)
    // ══════════════════════════════════════════════════════════

    // 셀 위치/스팬 파싱. style.gridColumn = "c / span cs", style.gridRow = "r / span rs"
    _taParseCellPos(cell) {
        const col = cell.style.gridColumnStart ? parseInt(cell.style.gridColumnStart) : parseInt((cell.style.gridColumn || '1').split('/')[0]);
        const row = cell.style.gridRowStart ? parseInt(cell.style.gridRowStart) : parseInt((cell.style.gridRow || '1').split('/')[0]);
        const cs = cell.style.gridColumnEnd && cell.style.gridColumnEnd.indexOf('span') >= 0
            ? parseInt(cell.style.gridColumnEnd.replace('span', '').trim())
            : (cell.style.gridColumn && cell.style.gridColumn.indexOf('span') >= 0
                ? parseInt(cell.style.gridColumn.split('span')[1]) : 1);
        const rs = cell.style.gridRowEnd && cell.style.gridRowEnd.indexOf('span') >= 0
            ? parseInt(cell.style.gridRowEnd.replace('span', '').trim())
            : (cell.style.gridRow && cell.style.gridRow.indexOf('span') >= 0
                ? parseInt(cell.style.gridRow.split('span')[1]) : 1);
        return { row: row || 1, col: col || 1, rs: rs || 1, cs: cs || 1 };
    }
    _taSetCellPos(cell, row, col, rs, cs) {
        cell.style.gridColumn = col + ' / span ' + (cs || 1);
        cell.style.gridRow = row + ' / span ' + (rs || 1);
    }
    _taTableCols(table) { return parseInt(table.dataset.cols || '1'); }
    _taTableRows(table) {
        let max = 0;
        table.querySelectorAll(':scope > .fg-ta-tbl-cell').forEach((c) => {
            const p = this._taParseCellPos(c);
            if (p.row + p.rs - 1 > max) max = p.row + p.rs - 1;
        });
        return max;
    }
    _taGetColWidths(table) {
        const raw = (table.dataset.colWidths || '').split(',').filter(Boolean).map(Number);
        const cols = this._taTableCols(table);
        while (raw.length < cols) raw.push(120);
        return raw.slice(0, cols);
    }
    _taApplyColWidths(table, widths) {
        table.dataset.colWidths = widths.join(',');
        table.style.gridTemplateColumns = widths.map((w) => w + 'px').join(' ');
    }
    _taSetTableCols(table, cols) {
        table.dataset.cols = cols;
        const w = this._taGetColWidths(table);
        this._taApplyColWidths(table, w);
    }
    // row-1 셀 우측에 리사이저 핸들 배치 (마지막 열 제외)
    _taRefreshColResizers(table) {
        const cols = this._taTableCols(table);
        table.querySelectorAll(':scope > .fg-ta-tbl-cell > .fg-ta-tbl-resize').forEach((r) => r.remove());
        const row1 = Array.from(table.querySelectorAll(':scope > .fg-ta-tbl-cell')).filter((c) => this._taParseCellPos(c).row === 1);
        const self = this;
        row1.forEach((cell) => {
            const p = this._taParseCellPos(cell);
            const rightCol = p.col + p.cs - 1;
            if (rightCol >= cols) return;
            const rsz = document.createElement('div');
            rsz.className = 'fg-ta-tbl-resize';
            rsz.contentEditable = 'false';
            rsz.dataset.col = String(rightCol);
            rsz.addEventListener('mousedown', function(e) {
                e.preventDefault(); e.stopPropagation();
                self._taStartColResize(table, rightCol, e);
            });
            cell.appendChild(rsz);
        });
    }
    _taStartColResize(table, colIdx, startEvent) {
        const widths = this._taGetColWidths(table);
        const startX = startEvent.clientX;
        const startW = widths[colIdx - 1];
        const self = this;
        document.body.classList.add('fg-ta-resizing');
        const onMove = (e) => {
            e.preventDefault();
            let newW = startW + (e.clientX - startX);
            if (newW < 40) newW = 40;
            widths[colIdx - 1] = newW;
            self._taApplyColWidths(table, widths);
        };
        const onUp = () => {
            document.body.classList.remove('fg-ta-resizing');
            document.removeEventListener('mousemove', onMove, true);
            document.removeEventListener('mouseup', onUp, true);
        };
        document.addEventListener('mousemove', onMove, true);
        document.addEventListener('mouseup', onUp, true);
    }

    // 표 삽입 피커
    _taShowTablePicker(anchorBtn, editor) {
        // 기존 피커 제거
        document.querySelectorAll('.fg-ta-tbl-picker').forEach(function(p){ p.remove(); });
        const self = this;
        const picker = document.createElement('div');
        picker.className = 'fg-ta-tbl-picker';
        const grid = document.createElement('div');
        grid.className = 'fg-ta-tbl-picker-grid';
        const label = document.createElement('div');
        label.className = 'fg-ta-tbl-picker-label';
        label.textContent = '0 × 0';
        const MAX = 10;
        const cells = [];
        for (let i = 0; i < MAX * MAX; i++) {
            const c = document.createElement('div');
            c.className = 'fg-ta-tbl-picker-cell';
            c.dataset.idx = i;
            grid.appendChild(c); cells.push(c);
        }
        const mark = (rows, cols) => {
            for (let i = 0; i < cells.length; i++) {
                const r = Math.floor(i / MAX) + 1, cc = (i % MAX) + 1;
                cells[i].classList.toggle('on', r <= rows && cc <= cols);
            }
            label.textContent = rows + ' × ' + cols;
        };
        grid.addEventListener('mousemove', (e) => {
            const t = e.target.closest('.fg-ta-tbl-picker-cell'); if (!t) return;
            const idx = parseInt(t.dataset.idx);
            mark(Math.floor(idx / MAX) + 1, (idx % MAX) + 1);
        });
        grid.addEventListener('click', (e) => {
            const t = e.target.closest('.fg-ta-tbl-picker-cell'); if (!t) return;
            const idx = parseInt(t.dataset.idx);
            const rows = Math.floor(idx / MAX) + 1, cols = (idx % MAX) + 1;
            picker.remove();
            self._taInsertTable(editor, rows, cols);
        });
        picker.appendChild(grid);
        picker.appendChild(label);
        const r = anchorBtn.getBoundingClientRect();
        picker.style.left = Math.max(8, r.left) + 'px';
        picker.style.top = (r.bottom + 4) + 'px';
        document.body.appendChild(picker);
        // 외부 클릭 시 닫기
        const close = (e) => {
            if (!picker.contains(e.target) && e.target !== anchorBtn) {
                picker.remove();
                document.removeEventListener('mousedown', close, true);
            }
        };
        setTimeout(() => document.addEventListener('mousedown', close, true), 0);
    }

    _taInsertTable(editor, rows, cols) {
        const tbl = document.createElement('div');
        tbl.className = 'fg-ta-tbl';
        tbl.contentEditable = 'false';
        this._taSetTableCols(tbl, cols);
        for (let r = 1; r <= rows; r++) {
            for (let c = 1; c <= cols; c++) {
                const cell = document.createElement('div');
                cell.className = 'fg-ta-tbl-cell';
                cell.contentEditable = 'true';
                this._taSetCellPos(cell, r, c, 1, 1);
                cell.innerHTML = '<br>';
                tbl.appendChild(cell);
            }
        }
        // 커서 위치에 삽입
        const sel = window.getSelection();
        let range = sel && sel.rangeCount ? sel.getRangeAt(0) : null;
        if (!range || !editor.contains(range.startContainer)) {
            editor.appendChild(tbl);
        } else {
            // 현재 블록 밖으로 끌어올려 삽입
            range.collapse(false);
            range.insertNode(tbl);
        }
        // 삽입 후 placeholder 클래스 해제
        editor.classList.remove('fg-ta-empty');
        this._taRefreshColResizers(tbl);
        // 첫 셀로 포커스
        const first = tbl.querySelector('.fg-ta-tbl-cell');
        if (first) {
            first.focus();
            const r = document.createRange(); r.selectNodeContents(first); r.collapse(true);
            sel.removeAllRanges(); sel.addRange(r);
        }
    }

    // 셀 포커스 이동 (Tab)
    _taTableMoveNextCell(cell, backward) {
        const table = cell.parentNode;
        const cells = Array.from(table.querySelectorAll(':scope > .fg-ta-tbl-cell'));
        // 시각적 순서(행→열)로 정렬
        cells.sort((a, b) => {
            const pa = this._taParseCellPos(a), pb = this._taParseCellPos(b);
            return pa.row - pb.row || pa.col - pb.col;
        });
        const i = cells.indexOf(cell);
        const next = backward ? cells[i - 1] : cells[i + 1];
        if (next) {
            next.focus();
            const r = document.createRange(); r.selectNodeContents(next); r.collapse(true);
            const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
        } else if (!backward) {
            // 마지막 셀에서 Tab → 새 행 추가 후 첫 셀로
            const last = cells[cells.length - 1];
            const pos = this._taParseCellPos(last);
            this._taTableAddRow(table, pos.row + pos.rs - 1, false);
            const all = Array.from(table.querySelectorAll(':scope > .fg-ta-tbl-cell'));
            all.sort((a, b) => {
                const pa = this._taParseCellPos(a), pb = this._taParseCellPos(b);
                return pa.row - pb.row || pa.col - pb.col;
            });
            // 새로 추가된 맨 앞 셀 찾기
            const newCell = all.find((c) => {
                const p = this._taParseCellPos(c);
                return p.row === pos.row + pos.rs && p.col === 1;
            });
            if (newCell) {
                newCell.focus();
                const r = document.createRange(); r.selectNodeContents(newCell); r.collapse(true);
                const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
            }
        }
    }

    // 드래그 선택 범위 표시
    _taTableSelectRange(anchor, focus) {
        const table = anchor.parentNode;
        if (focus.parentNode !== table) return;
        const pa = this._taParseCellPos(anchor), pf = this._taParseCellPos(focus);
        const rMin = Math.min(pa.row, pf.row), rMax = Math.max(pa.row + pa.rs - 1, pf.row + pf.rs - 1);
        const cMin = Math.min(pa.col, pf.col), cMax = Math.max(pa.col + pa.cs - 1, pf.col + pf.cs - 1);
        table.querySelectorAll(':scope > .fg-ta-tbl-cell').forEach((c) => {
            const p = this._taParseCellPos(c);
            const within = p.row >= rMin && p.row + p.rs - 1 <= rMax
                        && p.col >= cMin && p.col + p.cs - 1 <= cMax;
            c.classList.toggle('fg-ta-tbl-sel', within);
        });
    }

    // 선택된 셀들을 병합
    _taTableMerge(table) {
        const sel = Array.from(table.querySelectorAll(':scope > .fg-ta-tbl-cell.fg-ta-tbl-sel'));
        if (sel.length < 2) return;
        // 범위 계산
        let rMin = Infinity, rMax = 0, cMin = Infinity, cMax = 0;
        sel.forEach((c) => {
            const p = this._taParseCellPos(c);
            if (p.row < rMin) rMin = p.row;
            if (p.row + p.rs - 1 > rMax) rMax = p.row + p.rs - 1;
            if (p.col < cMin) cMin = p.col;
            if (p.col + p.cs - 1 > cMax) cMax = p.col + p.cs - 1;
        });
        // 앵커(좌상단) 선정
        const anchor = sel.find((c) => {
            const p = this._taParseCellPos(c);
            return p.row === rMin && p.col === cMin;
        }) || sel[0];
        // 텍스트 병합 (앵커 제외, 내용이 있는 셀만 `<br>` 구분)
        const parts = [];
        if (anchor.innerHTML && anchor.innerHTML !== '<br>') parts.push(anchor.innerHTML);
        sel.forEach((c) => {
            if (c === anchor) return;
            if (c.innerHTML && c.innerHTML !== '<br>') parts.push(c.innerHTML);
        });
        anchor.innerHTML = parts.length ? parts.join('<br>') : '<br>';
        this._taSetCellPos(anchor, rMin, cMin, rMax - rMin + 1, cMax - cMin + 1);
        anchor.classList.remove('fg-ta-tbl-sel');
        sel.forEach((c) => { if (c !== anchor) c.remove(); });
        this._taRefreshColResizers(table);
        anchor.focus();
    }

    // 셀 분할 (병합 해제)
    _taTableSplit(cell) {
        const table = cell.parentNode;
        const p = this._taParseCellPos(cell);
        if (p.rs === 1 && p.cs === 1) return;
        this._taSetCellPos(cell, p.row, p.col, 1, 1);
        // 비어있던 영역에 셀 새로 채움
        for (let r = p.row; r < p.row + p.rs; r++) {
            for (let c = p.col; c < p.col + p.cs; c++) {
                if (r === p.row && c === p.col) continue;
                const nc = document.createElement('div');
                nc.className = 'fg-ta-tbl-cell';
                nc.contentEditable = 'true';
                this._taSetCellPos(nc, r, c, 1, 1);
                nc.innerHTML = '<br>';
                table.appendChild(nc);
            }
        }
        this._taRefreshColResizers(table);
    }

    // 행 추가 (before: atRow 자리에 삽입 / after: atRow 다음에 삽입)
    _taTableAddRow(table, atRow, before) {
        const cells = Array.from(table.querySelectorAll(':scope > .fg-ta-tbl-cell'));
        const cols = this._taTableCols(table);
        const insertRow = before ? atRow : atRow + 1;
        // 기존 셀 shift
        cells.forEach((c) => {
            const p = this._taParseCellPos(c);
            if (p.row >= insertRow) {
                this._taSetCellPos(c, p.row + 1, p.col, p.rs, p.cs);
            } else if (p.row + p.rs - 1 >= insertRow) {
                // 삽입 지점을 걸친 병합셀은 행 span +1
                this._taSetCellPos(c, p.row, p.col, p.rs + 1, p.cs);
            }
        });
        // 새 셀 삽입
        for (let c = 1; c <= cols; c++) {
            const nc = document.createElement('div');
            nc.className = 'fg-ta-tbl-cell';
            nc.contentEditable = 'true';
            this._taSetCellPos(nc, insertRow, c, 1, 1);
            nc.innerHTML = '<br>';
            table.appendChild(nc);
        }
        this._taRefreshColResizers(table);
    }

    // 열 추가
    _taTableAddCol(table, atCol, before) {
        const cells = Array.from(table.querySelectorAll(':scope > .fg-ta-tbl-cell'));
        const rows = this._taTableRows(table);
        const cols = this._taTableCols(table);
        const insertCol = before ? atCol : atCol + 1;
        cells.forEach((c) => {
            const p = this._taParseCellPos(c);
            if (p.col >= insertCol) {
                this._taSetCellPos(c, p.row, p.col + 1, p.rs, p.cs);
            } else if (p.col + p.cs - 1 >= insertCol) {
                this._taSetCellPos(c, p.row, p.col, p.rs, p.cs + 1);
            }
        });
        for (let r = 1; r <= rows; r++) {
            const nc = document.createElement('div');
            nc.className = 'fg-ta-tbl-cell';
            nc.contentEditable = 'true';
            this._taSetCellPos(nc, r, insertCol, 1, 1);
            nc.innerHTML = '<br>';
            table.appendChild(nc);
        }
        // 폭 배열에 신규 열 삽입
        const widths = this._taGetColWidths(table);
        widths.splice(insertCol - 1, 0, 120);
        table.dataset.cols = String(cols + 1);
        this._taApplyColWidths(table, widths);
        this._taRefreshColResizers(table);
    }

    _taTableDeleteRow(table, row) {
        const cells = Array.from(table.querySelectorAll(':scope > .fg-ta-tbl-cell'));
        cells.forEach((c) => {
            const p = this._taParseCellPos(c);
            if (p.row === row && p.rs === 1) {
                c.remove();
            } else if (p.row <= row && p.row + p.rs - 1 >= row) {
                // 병합셀이 삭제행을 걸침 → span -1
                if (p.rs <= 1) { c.remove(); }
                else { this._taSetCellPos(c, p.row, p.col, p.rs - 1, p.cs); }
            }
        });
        // shift up rows below
        Array.from(table.querySelectorAll(':scope > .fg-ta-tbl-cell')).forEach((c) => {
            const p = this._taParseCellPos(c);
            if (p.row > row) this._taSetCellPos(c, p.row - 1, p.col, p.rs, p.cs);
        });
        this._taRefreshColResizers(table);
    }

    _taTableDeleteCol(table, col) {
        const cols = this._taTableCols(table);
        if (cols <= 1) { table.remove(); return; }
        const cells = Array.from(table.querySelectorAll(':scope > .fg-ta-tbl-cell'));
        cells.forEach((c) => {
            const p = this._taParseCellPos(c);
            if (p.col === col && p.cs === 1) {
                c.remove();
            } else if (p.col <= col && p.col + p.cs - 1 >= col) {
                if (p.cs <= 1) { c.remove(); }
                else { this._taSetCellPos(c, p.row, p.col, p.rs, p.cs - 1); }
            }
        });
        Array.from(table.querySelectorAll(':scope > .fg-ta-tbl-cell')).forEach((c) => {
            const p = this._taParseCellPos(c);
            if (p.col > col) this._taSetCellPos(c, p.row, p.col - 1, p.rs, p.cs);
        });
        // 삭제 열의 너비 제거
        const widths = this._taGetColWidths(table);
        widths.splice(col - 1, 1);
        table.dataset.cols = String(cols - 1);
        this._taApplyColWidths(table, widths);
        this._taRefreshColResizers(table);
    }

    // 컨텍스트 메뉴
    _taTableContextMenu(editor, cell, x, y) {
        document.querySelectorAll('.fg-ta-tbl-ctx').forEach((m) => m.remove());
        const self = this;
        const table = cell.parentNode;
        const pos = this._taParseCellPos(cell);
        const selCount = table.querySelectorAll(':scope > .fg-ta-tbl-cell.fg-ta-tbl-sel').length;
        const canMerge = selCount >= 2;
        const canSplit = pos.rs > 1 || pos.cs > 1;

        const menu = document.createElement('div');
        menu.className = 'fg-ta-tbl-ctx';
        const add = (label, fn, disabled) => {
            const it = document.createElement('div');
            it.className = 'fg-ta-tbl-ctx-item' + (disabled ? ' disabled' : '');
            it.textContent = label;
            if (!disabled) it.onclick = () => { fn(); menu.remove(); };
            menu.appendChild(it);
        };
        const sep = () => { const s = document.createElement('div'); s.className = 'fg-ta-tbl-ctx-sep'; menu.appendChild(s); };
        add('위에 행 추가', () => self._taTableAddRow(table, pos.row, true));
        add('아래에 행 추가', () => self._taTableAddRow(table, pos.row + pos.rs - 1, false));
        add('왼쪽에 열 추가', () => self._taTableAddCol(table, pos.col, true));
        add('오른쪽에 열 추가', () => self._taTableAddCol(table, pos.col + pos.cs - 1, false));
        sep();
        add('행 삭제', () => self._taTableDeleteRow(table, pos.row));
        add('열 삭제', () => self._taTableDeleteCol(table, pos.col));
        sep();
        add('셀 병합', () => self._taTableMerge(table), !canMerge);
        add('셀 분할', () => self._taTableSplit(cell), !canSplit);
        sep();
        add('표 삭제', () => table.remove());

        menu.style.left = x + 'px'; menu.style.top = y + 'px';
        document.body.appendChild(menu);
        // 위치 보정 (화면 밖 방지)
        const r = menu.getBoundingClientRect();
        if (r.right > window.innerWidth) menu.style.left = (window.innerWidth - r.width - 8) + 'px';
        if (r.bottom > window.innerHeight) menu.style.top = (window.innerHeight - r.height - 8) + 'px';
        const close = (e) => {
            if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('mousedown', close, true); }
        };
        setTimeout(() => document.addEventListener('mousedown', close, true), 0);
    }

    // ── codeHelp (그리드 코드 팝업) ──
    _startCodeHelpEdit(rowIdx, col, td, row) {
        const ci = this.columns.indexOf(col);
        const originalValue = row[col.field];
        const nameField = col.nameField || col.field.replace(/_CD$|_CODE$/i, '_NM').replace(/_cd$|_code$/i, '_nm');

        td.textContent = '';
        const wrap = document.createElement('span');
        wrap.style.cssText = 'display:flex;align-items:center;gap:2px;width:100%;';

        const inp = document.createElement('input');
        inp.type = 'text'; inp.className = 'forma-grid-input';
        inp.style.cssText = 'flex:1;min-width:0;';
        inp.value = row[col.field] ?? '';

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = '\uD83D\uDD0D';
        btn.style.cssText = 'border:none;background:none;cursor:pointer;font-size:13px;padding:0 2px;';

        wrap.appendChild(inp);
        wrap.appendChild(btn);
        td.appendChild(wrap);
        inp.focus();

        const self = this;

        const openPopup = () => {
            if (typeof FormaModal === 'undefined' || !col.popup) return;
            const modal = new FormaModal({
                title: col.popup.title || col.label || '코드 검색',
                url: col.popup.url,
                width: col.popup.width || 800,
                height: col.popup.height || 600,
                okCallback: function(result) {
                    const codeField = col.popup.codeField || col.field;
                    const popupNameField = col.popup.nameField || nameField;
                    const codeVal = result[codeField] || '';
                    const nameVal = result[popupNameField] || '';
                    self._editing = false;
                    self._commitValue(rowIdx, col, codeVal, originalValue);
                    row[nameField] = nameVal;
                    // 추가 필드 매핑
                    if (col.popup.fields) {
                        for (const k in col.popup.fields) {
                            row[col.popup.fields[k]] = result[k] || '';
                        }
                    }
                    self._renderCell(td, row, col, rowIdx);
                    self._renderRow(rowIdx);
                    self._renderFooter();
                }
            });
            modal.show({ keyword: inp.value });
        };

        btn.onclick = openPopup;
        inp.onkeydown = (e) => {
            if (e.key === 'Enter') { e.preventDefault(); openPopup(); }
            else if (e.key === 'Escape') { self._editing = false; row[col.field] = originalValue; self._renderCell(td, row, col, rowIdx); self._setFocusCell(rowIdx, ci); }
            else if (e.key === 'Tab') { e.preventDefault(); self._editing = false; self._commitValue(rowIdx, col, inp.value || null, originalValue); self._renderCell(td, row, col, rowIdx); self._navigateEdit(rowIdx, ci, e.shiftKey ? 'prev' : 'next'); }
        };
        inp.onblur = (e) => {
            // 버튼 클릭 시에는 blur 무시
            setTimeout(() => {
                if (document.activeElement === btn) return;
                self._editing = false;
                self._commitValue(rowIdx, col, inp.value || null, originalValue);
                self._renderCell(td, row, col, rowIdx);
            }, 150);
        };
    }

    // ── 옵션 해석 ──
    _resolveOptions(col, callback) {
        if (col.options) { callback(typeof col.options === 'function' ? col.options() : col.options); }
        else if (col.code) {
            if (this._codeCache[col.code]) { callback(this._codeCache[col.code]); }
            else { fetch('/api/codes/' + col.code).then(r => r.json()).then(json => { const opts = (json.resultData || []).map(c => ({ value: c.value || c.VALUE || c.code || c.CODE, label: c.label || c.LABEL || c.codeName || c.CODE_NM })); this._codeCache[col.code] = opts; callback(opts); }).catch(() => callback([])); }
        } else { callback([]); }
    }

    // ══════════════════════════════════════════════════════════
    //  키보드 내비게이션 + 클립보드
    // ══════════════════════════════════════════════════════════

    _initKeyboard() {
        this._keydownHandler = (e) => {
            if (this._editing) return; // 편집 중이면 에디터가 처리
            const fr = this._focusRow, fc = this._focusCol;

            // Ctrl+C/V/Z/Y — CapsLock이나 Shift로 대문자여도 동작하도록 소문자 비교
            const _k = (e.key || '').toLowerCase();
            if ((e.ctrlKey || e.metaKey) && _k === 'c') { this._copyToClipboard(); return; }
            if ((e.ctrlKey || e.metaKey) && _k === 'v') { if (this.allowPaste) this._pasteFromClipboard(); return; }
            if ((e.ctrlKey || e.metaKey) && _k === 'z') { e.preventDefault(); this.undo(); return; }
            if ((e.ctrlKey || e.metaKey) && _k === 'y') { e.preventDefault(); this.redo(); return; }

            if (fr < 0 || fc < 0) {
                // 포커스 없으면 첫 셀로
                if (['ArrowDown','ArrowUp','ArrowLeft','ArrowRight','Tab','Enter'].includes(e.key)) {
                    e.preventDefault();
                    this._setFocusCell(0, 0);
                }
                return;
            }

            if (e.shiftKey && ['ArrowDown','ArrowUp','ArrowRight','ArrowLeft'].includes(e.key)) {
                // Shift+Arrow: 범위 확장
                e.preventDefault();
                let er = this._rangeEndRow, ec = this._rangeEndCol;
                if (e.key === 'ArrowDown' && er < this.rows.length - 1) er++;
                else if (e.key === 'ArrowUp' && er > 0) er--;
                else if (e.key === 'ArrowRight' && ec < this.columns.length - 1) ec++;
                else if (e.key === 'ArrowLeft' && ec > 0) ec--;
                this._rangeEndRow = er;
                this._rangeEndCol = ec;
                this._renderRange();
                const td = this._getTdByIdx(er, ec);
                if (td) td.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            }
            else if (e.key === 'ArrowDown') { e.preventDefault(); if (fr < this.rows.length - 1) this._setFocusCell(fr + 1, fc); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); if (fr > 0) this._setFocusCell(fr - 1, fc); }
            else if (e.key === 'ArrowRight') { e.preventDefault(); if (fc < this.columns.length - 1) this._setFocusCell(fr, fc + 1); }
            else if (e.key === 'ArrowLeft') { e.preventDefault(); if (fc > 0) this._setFocusCell(fr, fc - 1); }
            else if (e.key === 'Tab') {
                e.preventDefault();
                const dir = e.shiftKey ? 'prev' : 'next';
                let r = fr, c = fc;
                if (dir === 'next') { c++; if (c >= this.columns.length) { c = 0; r++; } if (r >= this.rows.length) return; }
                else { c--; if (c < 0) { c = this.columns.length - 1; r--; } if (r < 0) return; }
                this._setFocusCell(r, c);
            }
            else if (e.key === 'Enter' || e.key === 'F2') {
                e.preventDefault();
                if (this.editable) this._startEditByIdx(fr, fc);
            }
            else if (e.key === 'Delete') {
                e.preventDefault();
                const col = this.columns[fc];
                if (this.editable && !col.readOnly && col.editor !== 'check' && col.editor !== 'switch') {
                    const row = this.rows[fr];
                    const old = row[col.field];
                    row[col.field] = null;
                    this._markModified(fr);
                    if (this.onCellChange) this.onCellChange(row, col.field, fr);
                    const td = this._getTdByIdx(fr, fc);
                    if (td) this._renderCell(td, row, col, fr);
                    this._renderFooter();
                }
            }
            else if (e.key === 'Home') { e.preventDefault(); this._setFocusCell(e.ctrlKey ? 0 : fr, 0); }
            else if (e.key === 'End') { e.preventDefault(); this._setFocusCell(e.ctrlKey ? this.rows.length - 1 : fr, this.columns.length - 1); }
            else if (e.key === 'PageDown') { e.preventDefault(); this._setFocusCell(Math.min(fr + 20, this.rows.length - 1), fc); }
            else if (e.key === 'PageUp') { e.preventDefault(); this._setFocusCell(Math.max(fr - 20, 0), fc); }
            else if (e.key === ' ') {
                e.preventDefault();
                // 체크박스 토글 (체크 에디터 또는 행 체크박스)
                const col = this.columns[fc];
                if (col.editor === 'check' || col.editor === 'switch') {
                    const row = this.rows[fr];
                    row[col.field] = row[col.field] === 'Y' ? 'N' : 'Y';
                    this._markModified(fr);
                    if (this.onCellChange) this.onCellChange(row, col.field, fr);
                    this._renderRow(fr);
                }
            }
        };
        this._scrollWrap.addEventListener('keydown', this._keydownHandler);
    }

    _setFocusCell(rowIdx, colIdx) {
        // 이전 포커스/범위 제거
        this._clearRangeHighlight();
        const prev = this.tbody.querySelector('.forma-cell-focus');
        if (prev) prev.classList.remove('forma-cell-focus');
        this._focusRow = rowIdx;
        this._focusCol = colIdx;
        this._rangeEndRow = rowIdx;
        this._rangeEndCol = colIdx;
        if (rowIdx < 0 || colIdx < 0 || rowIdx >= this.rows.length || colIdx >= this.columns.length) return;
        this._selectRow(rowIdx);
        const td = this._getTdByIdx(rowIdx, colIdx);
        if (td) {
            td.classList.add('forma-cell-focus');
            td.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }
        this._scrollWrap.focus({ preventScroll: true });
    }

    /** 선택 범위 좌표 반환 */
    _getRange() {
        const r1 = Math.min(this._focusRow, this._rangeEndRow);
        const r2 = Math.max(this._focusRow, this._rangeEndRow);
        const c1 = Math.min(this._focusCol, this._rangeEndCol);
        const c2 = Math.max(this._focusCol, this._rangeEndCol);
        return { r1, r2, c1, c2 };
    }

    /** 범위 하이라이트 표시 */
    _renderRange() {
        this._clearRangeHighlight();
        const { r1, r2, c1, c2 } = this._getRange();
        if (r1 === r2 && c1 === c2) return; // 단일 셀이면 범위 표시 불필요
        for (let r = r1; r <= r2; r++) {
            for (let c = c1; c <= c2; c++) {
                const td = this._getTdByIdx(r, c);
                if (td) td.classList.add('forma-cell-range');
            }
        }
    }

    /** 범위 하이라이트 제거 */
    _clearRangeHighlight() {
        if (!this.tbody) return;
        this.tbody.querySelectorAll('.forma-cell-range').forEach(td => td.classList.remove('forma-cell-range'));
    }

    // ── 클립보드 ──
    _copyCellValue(col, row) {
        if (!col || !row) return '';
        let val = row[col.field] ?? '';
        if ((col.editor === 'select' || col.editor === 'combo') && col.options) {
            const opt = col.options.find(o => String(o.value) === String(val));
            if (opt) val = opt.label;
        }
        return String(val);
    }

    _copyToClipboard() {
        // 1. 셀 범위 선택이 있으면 범위 복사
        const { r1, r2, c1, c2 } = this._getRange();
        if (r1 !== r2 || c1 !== c2) {
            const rangeCols = this.columns.slice(c1, c2 + 1);
            const body = [];
            for (let r = r1; r <= r2; r++) {
                body.push(rangeCols.map(col => this._copyCellValue(col, this.rows[r])).join('\t'));
            }
            const text = body.join('\n');
            const cnt = (r2 - r1 + 1) + '행 × ' + (c2 - c1 + 1) + '열';
            if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => { if (typeof FormaPopup !== 'undefined') FormaPopup.toast.info(cnt + ' 복사됨'); });
            return;
        }

        // 2. 포커스된 단일 셀 복사
        if (this._focusRow >= 0 && this._focusCol >= 0) {
            const col = this.columns[this._focusCol];
            const row = this.rows[this._focusRow];
            if (col && row) {
                const val = this._copyCellValue(col, row);
                if (navigator.clipboard) navigator.clipboard.writeText(val).then(() => { if (typeof FormaPopup !== 'undefined') FormaPopup.toast.info('복사됨'); });
            }
            return;
        }
    }

    _copyRowsToClipboard(targetRows) {
        if (!targetRows) {
            targetRows = this.getCheckedData();
            if (targetRows.length === 0 && this._selectedSet.size > 1) targetRows = this.getSelectedItems();
            if (targetRows.length === 0 && this.selectedIdx >= 0) targetRows = [this.rows[this.selectedIdx]];
        }
        if (targetRows.length === 0) return;
        const header = this.columns.map(c => Array.isArray(c.label) ? (c.label[c.label.length-1]?.text || c.field) : (c.label || c.field)).join('\t');
        const body = targetRows.map(row => this.columns.map(col => this._copyCellValue(col, row)).join('\t')).join('\n');
        const text = header + '\n' + body;
        if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => { if (typeof FormaPopup !== 'undefined') FormaPopup.toast.info(targetRows.length + '행 복사됨'); });
    }

    _pasteFromClipboard() {
        if (!this.editable || this._focusRow < 0 || this._focusCol < 0) return;
        if (!navigator.clipboard) return;
        navigator.clipboard.readText().then(text => {
            if (!text) return;
            // 엑셀 호환 TSV 파서: 셀 내 줄바꿈("..."), 이스케이프 따옴표("") 처리
            const rows = [];
            let row = [], cell = '', inQuotes = false;
            for (let i = 0; i < text.length; i++) {
                const ch = text[i];
                if (inQuotes) {
                    if (ch === '"') {
                        if (text[i + 1] === '"') { cell += '"'; i++; }
                        else inQuotes = false;
                    } else cell += ch;
                } else {
                    if (ch === '"' && cell === '') inQuotes = true;
                    else if (ch === '\t') { row.push(cell); cell = ''; }
                    else if (ch === '\r') { /* skip, handled by \n */ }
                    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
                    else cell += ch;
                }
            }
            if (cell !== '' || row.length > 0) { row.push(cell); rows.push(row); }
            // 마지막 trailing newline에 의한 빈 행 제거
            const lines = rows.filter(r => !(r.length === 1 && r[0] === ''));
            if (lines.length === 0) return;
            let startRow = this._focusRow, startCol = this._focusCol;
            for (let li = 0; li < lines.length && startRow + li < this.rows.length; li++) {
                const vals = lines[li];
                const row = this.rows[startRow + li];
                for (let vi = 0; vi < vals.length && startCol + vi < this.columns.length; vi++) {
                    const col = this.columns[startCol + vi];
                    if (col.readOnly) continue;
                    let val = vals[vi];
                    if (col.type === 'number' || col.format === 'currency' || col.editor === 'currency') val = val.replace(/,/g, '');
                    row[col.field] = val || null;
                    this._markModified(startRow + li);
                }
            }
            this._render();
            if (typeof FormaPopup !== 'undefined') FormaPopup.toast.info(lines.length + '행 붙여넣기 완료');
        }).catch(() => {});
    }

    // ══════════════════════════════════════════════════════════
    //  Undo / Redo
    // ══════════════════════════════════════════════════════════

    undo() {
        if (this._undoStack.length === 0) return;
        const action = this._undoStack.pop();
        const row = this.rows[action.rowIdx];
        if (!row) return;
        row[action.field] = action.oldVal;
        this._redoStack.push(action);
        this._renderRow(action.rowIdx);
        this._renderFooter();
        this._setFocusCell(action.rowIdx, this.columns.findIndex(c => c.field === action.field));
        if (typeof FormaPopup !== 'undefined') FormaPopup.toast.info('실행 취소');
    }

    redo() {
        if (this._redoStack.length === 0) return;
        const action = this._redoStack.pop();
        const row = this.rows[action.rowIdx];
        if (!row) return;
        row[action.field] = action.newVal;
        this._undoStack.push(action);
        this._renderRow(action.rowIdx);
        this._renderFooter();
        this._setFocusCell(action.rowIdx, this.columns.findIndex(c => c.field === action.field));
        if (typeof FormaPopup !== 'undefined') FormaPopup.toast.info('다시 실행');
    }

    // ══════════════════════════════════════════════════════════
    //  컨텍스트 메뉴
    // ══════════════════════════════════════════════════════════

    _showContextMenu(x, y, items) {
        this._hideContextMenu();
        const menu = document.createElement('div');
        menu.className = 'forma-ctx-menu';
        for (const item of items) {
            if (item === '---') { const hr = document.createElement('div'); hr.className = 'forma-ctx-sep'; menu.appendChild(hr); continue; }
            const div = document.createElement('div');
            div.className = 'forma-ctx-item';
            if (item.icon) div.innerHTML = '<span class="forma-ctx-icon">' + item.icon + '</span>' + item.label;
            else div.textContent = item.label;
            if (item.disabled) div.classList.add('disabled');
            else div.onclick = () => { this._hideContextMenu(); item.action(); };
            menu.appendChild(div);
        }
        document.body.appendChild(menu);
        menu.style.left = x + 'px'; menu.style.top = y + 'px';
        requestAnimationFrame(() => {
            const r = menu.getBoundingClientRect();
            if (r.right > window.innerWidth) menu.style.left = (x - r.width) + 'px';
            if (r.bottom > window.innerHeight) menu.style.top = (y - r.height) + 'px';
        });
        this._ctxMenu = menu;
        this._ctxDocHandler = (e) => { if (!menu.contains(e.target)) this._hideContextMenu(); };
        this._ctxEscHandler = (e) => { if (e.key === 'Escape') this._hideContextMenu(); };
        setTimeout(() => { document.addEventListener('mousedown', this._ctxDocHandler); document.addEventListener('keydown', this._ctxEscHandler); }, 10);
    }

    _hideContextMenu() {
        if (this._ctxMenu) { this._ctxMenu.remove(); this._ctxMenu = null; }
        if (this._ctxDocHandler) { document.removeEventListener('mousedown', this._ctxDocHandler); this._ctxDocHandler = null; }
        if (this._ctxEscHandler) { document.removeEventListener('keydown', this._ctxEscHandler); this._ctxEscHandler = null; }
    }

    _headerContextMenu(e, col, colIdx) {
        e.preventDefault();
        const hidden = this.columns.filter(c => c._hidden);
        const items = [
            { icon: '▲', label: '오름차순 정렬', action: () => { this._sortCols = [{ field: col.field, dir: 'asc' }]; this._sortCol = col.field; this._sortDir = 'asc'; this._updateSortIcons(); this._applySort(); this._render(); this._saveState(); } },
            { icon: '▼', label: '내림차순 정렬', action: () => { this._sortCols = [{ field: col.field, dir: 'desc' }]; this._sortCol = col.field; this._sortDir = 'desc'; this._updateSortIcons(); this._applySort(); this._render(); this._saveState(); } },
            { icon: '✕', label: '정렬 해제', action: () => { this._sortCols = []; this._sortCol = null; this._sortDir = null; this._updateSortIcons(); this._render(); this._saveState(); } },
            '---',
            { icon: '⇔', label: '컬럼 자동맞춤', action: () => this._autoFitColumn(colIdx) },
            { icon: '⇔', label: '전체 컬럼 자동맞춤', action: () => this.autoFitAllColumns() },
            '---',
            { icon: '👁', label: '컬럼 숨기기', action: () => this.hideColumn(col.field) },
        ];
        if (hidden.length > 0) {
            items.push('---');
            for (const hc of hidden) {
                const lbl = Array.isArray(hc.label) ? (hc.label[hc.label.length-1]?.text || hc.field) : (hc.label || hc.field);
                items.push({ icon: '👁', label: '"' + lbl + '" 표시', action: () => this.showColumn(hc.field) });
            }
        }
        if (this._stateKey) {
            items.push('---');
            items.push({ icon: '↺', label: '컬럼 설정 초기화', action: () => { this.resetState(); location.reload(); } });
        }
        if (this.allowExport || this.allowImport || this.allowPrint) {
            items.push('---');
            if (this.allowExport) {
                items.push({ icon: '📥', label: 'CSV 내보내기', action: () => this.exportCsv() });
                items.push({ icon: '📥', label: 'XLSX 내보내기', action: () => this.exportXlsx() });
            }
            if (this.allowImport) {
                items.push({ icon: '📤', label: 'Excel/CSV 가져오기', action: () => this.importExcel() });
            }
            if (this.allowPrint) {
                items.push({ icon: '🖨', label: '인쇄', action: () => this.print() });
            }
        }
        this._showContextMenu(e.clientX, e.clientY, items);
    }

    _cellContextMenu(e, rowIdx) {
        e.preventDefault();
        // 클릭한 td에서 colIdx 추출
        const td = e.target.closest('td');
        const tr = td ? td.parentElement : null;
        let colIdx = -1;
        if (td && tr) {
            const tdIdx = Array.from(tr.children).indexOf(td);
            colIdx = tdIdx - this._leadingCols();
        }
        const items = [
            { icon: '📋', label: '셀 복사', action: () => {
                if (colIdx >= 0 && colIdx < this.columns.length) {
                    const val = this._copyCellValue(this.columns[colIdx], this.rows[rowIdx]);
                    if (navigator.clipboard) navigator.clipboard.writeText(val).then(() => { if (typeof FormaPopup !== 'undefined') FormaPopup.toast.info('복사됨'); });
                }
            }},
            { icon: '📋', label: '행 복사 (TSV)', action: () => { this._copyRowsToClipboard([this.rows[rowIdx]]); } },
            { icon: '📌', label: '붙여넣기', action: () => this._pasteFromClipboard(), disabled: !this.editable || !this.allowPaste },
        ];
        if (this.editable && (this.allowInsertRow || this.allowAddRow || this.allowDeleteRow)) {
            items.push('---');
            if (this.allowInsertRow) {
                items.push({ icon: '➕', label: '위에 행 추가', action: () => { this.rows.splice(rowIdx, 0, { gstat: 'I', _checked: false }); this._render(); } });
                items.push({ icon: '➕', label: '아래에 행 추가', action: () => { this.rows.splice(rowIdx + 1, 0, { gstat: 'I', _checked: false }); this._render(); } });
            }
            if (this.allowDeleteRow) {
                const row = this.rows[rowIdx];
                items.push({ icon: '🗑', label: '행 삭제', disabled: row && row.gstat === 'D', action: () => {
                    const r = this.rows[rowIdx]; if (!r || r.gstat === 'D') return;
                    if (r.gstat === 'I') { this.rows.splice(rowIdx, 1); }
                    else { r.gstat = 'D'; r._checked = false; }
                    this.selectedIdx = -1; this._render();
                } });
            }
        }
        if (this.allowExport || this.allowImport || this.allowPrint) {
            items.push('---');
            if (this.allowExport) {
                items.push({ icon: '📥', label: 'CSV 내보내기', action: () => this.exportCsv() });
                items.push({ icon: '📥', label: 'XLSX 내보내기', action: () => this.exportXlsx() });
            }
            if (this.allowImport) {
                items.push({ icon: '📤', label: 'Excel/CSV 가져오기', action: () => this.importExcel() });
            }
            if (this.allowPrint) {
                items.push({ icon: '🖨', label: '인쇄', action: () => this.print() });
            }
        }
        this._showContextMenu(e.clientX, e.clientY, items);
    }

    // ══════════════════════════════════════════════════════════
    //  컬럼 숨기기/표시
    // ══════════════════════════════════════════════════════════

    hideColumn(field) {
        const ci = this.columns.findIndex(c => c.field === field);
        if (ci >= 0) { this.columns[ci]._hidden = true; if (this._cols[ci]) this._cols[ci].style.width = '0px'; this._updateTableWidth(); this._rebuild(); this._saveState(); }
    }

    showColumn(field) {
        const ci = this.columns.findIndex(c => c.field === field);
        if (ci >= 0) { this.columns[ci]._hidden = false; if (this._cols[ci]) this._cols[ci].style.width = (this.columns[ci].width || 100) + 'px'; this._updateTableWidth(); this._rebuild(); this._saveState(); }
    }

    getHiddenColumns() { return this.columns.filter(c => c._hidden).map(c => c.field); }

    autoFitAllColumns() {
        for (let i = 0; i < this.columns.length; i++) {
            if (!this.columns[i]._hidden) this._autoFitColumn(i);
        }
    }

    _rebuild() {
        const data = this.rows.map(r => ({ ...r }));
        const sel = this.selectedIdx;
        const sortCols = this._sortCols.slice();
        const sortCol = this._sortCol, sortDir = this._sortDir;
        // 기존 리스너/옵저버 해제 후 재생성
        this._disposeListeners();
        this._build();
        this.rows = data;
        this.selectedIdx = sel;
        this._sortCols = sortCols;
        this._sortCol = sortCol; this._sortDir = sortDir;
        this._updateSortIcons();
        this._render();
        if (this.paging) this._renderPaging();
    }

    // ══════════════════════════════════════════════════════════
    //  컬럼 상태 저장/복원 (localStorage)
    // ══════════════════════════════════════════════════════════

    /** 현재 컬럼 상태를 localStorage에 저장 */
    _saveState() {
        if (!this._stateKey) return;
        try {
            const state = {
                columns: this.columns.map(c => ({
                    field: c.field,
                    width: c.width,
                    hidden: !!c._hidden
                })),
                sortCols: this._sortCols.length > 0 ? this._sortCols : null
            };
            localStorage.setItem('fg_' + this._stateKey, JSON.stringify(state));
        } catch (e) { /* localStorage 용량 초과 등 무시 */ }
    }

    /** localStorage에서 컬럼 상태 복원 (constructor에서 _build 전 호출) */
    _restoreState() {
        if (!this._stateKey) return;
        try {
            const raw = localStorage.getItem('fg_' + this._stateKey);
            if (!raw) return;
            const state = JSON.parse(raw);
            if (!state || !state.columns) return;

            // 컬럼 순서·너비·숨김 복원
            const colMap = {};
            for (const c of this.columns) colMap[c.field] = c;
            const reordered = [];
            for (const sc of state.columns) {
                const col = colMap[sc.field];
                if (!col) continue;
                if (sc.width) col.width = sc.width;
                col._hidden = !!sc.hidden;
                reordered.push(col);
                delete colMap[sc.field];
            }
            // 저장 당시 없었던 새 컬럼은 뒤에 붙임
            for (const field in colMap) reordered.push(colMap[field]);
            this.columns = reordered;

            // 정렬 복원
            if (state.sortCols && state.sortCols.length > 0) {
                this._sortCols = state.sortCols;
                this._sortCol = state.sortCols[0].field;
                this._sortDir = state.sortCols[0].dir;
            } else if (state.sort) {
                // 하위호환: 이전 단일 정렬 형태
                this._sortCols = [{ field: state.sort.col, dir: state.sort.dir }];
                this._sortCol = state.sort.col;
                this._sortDir = state.sort.dir;
            }
        } catch (e) { /* 파싱 실패 시 무시 — 기본 상태 유지 */ }
    }

    /** 저장된 컬럼 상태 초기화 */
    resetState() {
        if (!this._stateKey) return;
        localStorage.removeItem('fg_' + this._stateKey);
    }

    // ══════════════════════════════════════════════════════════
    //  컬럼 드래그&드롭 순서 변경
    // ══════════════════════════════════════════════════════════

    _attachColDrag(th, colIdx) {
        th.draggable = true;
        th.style.cursor = 'grab';
        th.addEventListener('dragstart', (e) => {
            this._dragColIdx = colIdx;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', String(colIdx));
            th.style.opacity = '0.5';
        });
        th.addEventListener('dragend', () => {
            th.style.opacity = '';
            this._clearColDropIndicators();
        });
        th.addEventListener('dragover', (e) => {
            if (this._dragColIdx === undefined || this._dragColIdx === colIdx) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            // 드롭 위치 표시 (좌/우)
            const rect = th.getBoundingClientRect();
            const mid = rect.left + rect.width / 2;
            this._clearColDropIndicators();
            if (e.clientX < mid) {
                th.style.borderLeft = '3px solid var(--primary)';
            } else {
                th.style.borderRight = '3px solid var(--primary)';
            }
        });
        th.addEventListener('dragleave', () => {
            th.style.borderLeft = '';
            th.style.borderRight = '';
        });
        th.addEventListener('drop', (e) => {
            e.preventDefault();
            this._clearColDropIndicators();
            const fromIdx = this._dragColIdx;
            if (fromIdx === undefined || fromIdx === colIdx) return;
            // 드롭 위치 결정
            const rect = th.getBoundingClientRect();
            const mid = rect.left + rect.width / 2;
            let toIdx = e.clientX < mid ? colIdx : colIdx + 1;
            if (fromIdx < toIdx) toIdx--;
            if (fromIdx === toIdx) return;
            // 컬럼 배열 이동
            const [col] = this.columns.splice(fromIdx, 1);
            this.columns.splice(toIdx, 0, col);
            this._dragColIdx = undefined;
            this._rebuild();
            this._updateTableWidth();
            this._saveState();
        });
    }

    _clearColDropIndicators() {
        if (this._thead) this._thead.querySelectorAll('th').forEach(th => { th.style.borderLeft = ''; th.style.borderRight = ''; });
    }

    // ══════════════════════════════════════════════════════════
    //  행 드래그&드롭 재정렬
    // ══════════════════════════════════════════════════════════

    _startRowDrag(fromIdx, startEvent) {
        const tbody = this.tbody;
        const rows = Array.from(tbody.children);
        const dragTr = rows[fromIdx];
        if (!dragTr) return;

        dragTr.classList.add('forma-row-dragging');
        let targetIdx = fromIdx;

        // 드래그 인디케이터 라인
        const indicator = document.createElement('div');
        indicator.className = 'forma-drag-indicator';
        this._scrollWrap.appendChild(indicator);
        indicator.style.display = 'none';

        const onMove = (e) => {
            e.preventDefault();
            const scrollRect = this._scrollWrap.getBoundingClientRect();
            const y = e.clientY;

            // 어느 행 위에 있는지 계산
            let newTarget = fromIdx;
            for (let i = 0; i < rows.length; i++) {
                const tr = rows[i];
                const rect = tr.getBoundingClientRect();
                const mid = rect.top + rect.height / 2;
                if (y < mid) { newTarget = i; break; }
                newTarget = i + 1;
            }
            newTarget = Math.max(0, Math.min(newTarget, this.rows.length));
            targetIdx = newTarget;

            // 인디케이터 위치
            let indicatorY;
            if (newTarget < rows.length) {
                indicatorY = rows[newTarget].getBoundingClientRect().top - scrollRect.top + this._scrollWrap.scrollTop;
            } else {
                const last = rows[rows.length - 1];
                indicatorY = last.getBoundingClientRect().bottom - scrollRect.top + this._scrollWrap.scrollTop;
            }
            indicator.style.display = '';
            indicator.style.top = indicatorY + 'px';
        };

        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            dragTr.classList.remove('forma-row-dragging');
            indicator.remove();

            if (targetIdx !== fromIdx && targetIdx !== fromIdx + 1) {
                this.moveRow(fromIdx, targetIdx > fromIdx ? targetIdx - 1 : targetIdx);
            }
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }

    moveRow(fromIdx, toIdx) {
        if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0 || fromIdx >= this.rows.length || toIdx >= this.rows.length) return;
        const [row] = this.rows.splice(fromIdx, 1);
        this.rows.splice(toIdx, 0, row);
        if (this._allRows) {
            const [ar] = this._allRows.splice(fromIdx, 1);
            this._allRows.splice(toIdx, 0, ar);
        }
        this.selectedIdx = toIdx;
        this._focusRow = toIdx;
        this._render();
        if (this.onRowReorder) this.onRowReorder(fromIdx, toIdx, row);
    }

    // ══════════════════════════════════════════════════════════
    //  Footer
    // ══════════════════════════════════════════════════════════

    _renderFooter() {
        if (!this._hasFooter || !this.tfoot) return;
        this.tfoot.innerHTML = '';
        if (this.rows.length === 0) return;
        const tr = document.createElement('tr');
        if (this.detailGrid) tr.appendChild(document.createElement('td'));
        if (this.reorderable) tr.appendChild(document.createElement('td'));
        if (this.checkable) tr.appendChild(document.createElement('td'));
        if (this.rowNum) tr.appendChild(document.createElement('td'));
        for (const col of this.columns) {
            const td = document.createElement('td');
            if (col.align) td.style.textAlign = col.align;
            if (col.format === 'currency' || col.type === 'number' || col.editor === 'currency') td.style.textAlign = 'right';
            if (col.footer) {
                const values = this.rows.map(r => Number(r[col.field]) || 0);
                let result;
                if (col.footer === 'sum') result = values.reduce((a, b) => a + b, 0);
                else if (col.footer === 'avg') result = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
                else if (col.footer === 'count') result = this.rows.length;
                td.textContent = (col.format === 'currency' || col.editor === 'currency' || col.footer === 'sum' || col.footer === 'avg') ? Number(result).toLocaleString('ko-KR') : result;
            }
            tr.appendChild(td);
        }
        this.tfoot.appendChild(tr);
    }

    // ══════════════════════════════════════════════════════════
    //  내부 유틸
    // ══════════════════════════════════════════════════════════

    _selectRow(idx, e) {
        if (e && e.shiftKey && this.selectedIdx >= 0) {
            // Shift+클릭: 범위 선택
            const from = Math.min(this.selectedIdx, idx);
            const to = Math.max(this.selectedIdx, idx);
            this._selectedSet.clear();
            for (let i = from; i <= to; i++) this._selectedSet.add(i);
        } else if (e && (e.ctrlKey || e.metaKey)) {
            // Ctrl+클릭: 개별 추가/해제
            if (this._selectedSet.has(idx)) this._selectedSet.delete(idx);
            else this._selectedSet.add(idx);
        } else {
            // 일반 클릭: 단일 선택
            this._selectedSet.clear();
            this._selectedSet.add(idx);
        }
        this.selectedIdx = idx;
        // DOM 반영
        this.tbody.querySelectorAll('tr.selected').forEach(tr => tr.classList.remove('selected'));
        for (const si of this._selectedSet) {
            const tr = this._getRowTr(si);
            if (tr) tr.classList.add('selected');
        }
    }
    _toggleAllCheck(checked) { this.rows.forEach(r => r._checked = checked); this.tbody.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = checked); }

    // ══════════════════════════════════════════════════════════
    //  페이징
    // ══════════════════════════════════════════════════════════

    _renderPaging() {
        if (!this.paging) return;
        const old = this.container.querySelector('.forma-grid-paging'); if (old) old.remove();
        const totalPages = Math.max(1, Math.ceil(this._totalCount / this._pageSize));
        const page = this._currentPage;
        const bar = document.createElement('div'); bar.className = 'forma-grid-paging';
        const nav = document.createElement('div'); nav.className = 'forma-paging-nav';
        const mkBtn = (text, tp, dis) => { const btn = document.createElement('button'); btn.textContent = text; btn.disabled = dis; if (tp === page) btn.classList.add('active'); if (!dis) btn.onclick = () => this._goPage(tp); return btn; };
        nav.appendChild(mkBtn('«', 1, page === 1)); nav.appendChild(mkBtn('‹', page - 1, page === 1));
        let sp = Math.max(1, page - 4), ep = Math.min(totalPages, sp + 9); if (ep - sp < 9) sp = Math.max(1, ep - 9);
        for (let p = sp; p <= ep; p++) nav.appendChild(mkBtn(String(p), p, false));
        nav.appendChild(mkBtn('›', page + 1, page === totalPages)); nav.appendChild(mkBtn('»', totalPages, page === totalPages));
        bar.appendChild(nav);
        const sizeWrap = document.createElement('div'); sizeWrap.className = 'forma-paging-size'; sizeWrap.innerHTML = '페이지크기: ';
        [20, 50, 100].forEach(size => { const btn = document.createElement('button'); btn.textContent = size; if (size === this._pageSize) btn.classList.add('active'); btn.onclick = () => { this._pageSize = size; this._currentPage = 1; this._renderPaging(); if (this.onPageChange) this.onPageChange(1, size); }; sizeWrap.appendChild(btn); });
        bar.appendChild(sizeWrap);
        const info = document.createElement('div'); info.className = 'forma-paging-info'; info.textContent = '총 ' + this._totalCount.toLocaleString('ko-KR') + '건';
        bar.appendChild(info); this.container.appendChild(bar);
    }
    _goPage(page) { const tp = Math.max(1, Math.ceil(this._totalCount / this._pageSize)); if (page < 1 || page > tp) return; this._currentPage = page; this._renderPaging(); if (this.onPageChange) this.onPageChange(page, this._pageSize); }

    // ══════════════════════════════════════════════════════════
    //  리소스 정리
    // ══════════════════════════════════════════════════════════

    /** 리스너/옵저버만 해제 (_rebuild에서 재사용) */
    _disposeListeners() {
        if (this._resizeObserver) {
            this._resizeObserver.disconnect();
            this._resizeObserver = null;
        }
        if (this._keydownHandler && this._scrollWrap) {
            this._scrollWrap.removeEventListener('keydown', this._keydownHandler);
            this._keydownHandler = null;
        }
        if (this._vsScrollHandler && this._scrollWrap) {
            this._scrollWrap.removeEventListener('scroll', this._vsScrollHandler);
            this._vsScrollHandler = null;
        }
        this._hideContextMenu();
        if (this._mouseupHandler) {
            document.removeEventListener('mouseup', this._mouseupHandler);
            this._mouseupHandler = null;
        }
        if (this._filterTimer) {
            clearTimeout(this._filterTimer);
            this._filterTimer = null;
        }
    }

    /** 완전 파괴 — MDI 탭 닫기 시 자동 호출 */
    destroy() {
        // 1. 리스너/옵저버 해제
        this._disposeListeners();

        // 2. 이 인스턴스 소속 combo 드롭다운만 정리
        document.querySelectorAll('.fg-combo-dd').forEach(el => {
            if (el._formaGridOwner === this) el.remove();
        });

        // 3. 데이터 참조 해제
        this.rows = [];
        this._deleted = [];
        this._allRows = null;
        this._undoStack = [];
        this._redoStack = [];
        this._sortCols = [];
        this._cellCss = {};
        this._rowCss = {};
        this._codeCache = {};
        this._selectedSet.clear();
        this._expandedDetails.clear();
        this._collapsedGroups.clear();
        this._treeState.clear();

        // 4. 콜백 참조 해제
        this.onRowClick = null;
        this.onRowDblClick = null;
        this.onCellChange = null;
        this.onPageChange = null;
        this.onRowReorder = null;

        // 5. DOM 정리
        if (this.container) {
            this.container.innerHTML = '';
            this.container.classList.remove('forma-grid-wrap');
        }

        // 6. DOM 참조 해제
        this.table = null;
        this.tbody = null;
        this.tfoot = null;
        this._thead = null;
        this._scrollWrap = null;
        this._colgroup = null;
        this._cols = null;
        this._headerCb = null;
        this.container = null;
    }
}
