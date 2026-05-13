/**
 * FormaSheet — FORMA 스프레드시트 컴포넌트 (jspreadsheet CE v4 래퍼)
 *
 * 사용법:
 *   var sheet = new FormaSheet('#container', {
 *       template: 'weekly-report',
 *       editable: true,
 *       showToolbar: true,
 *       height: 400,
 *       onCellChange: function(instance, cell, col, row, value) {},
 *       onReady: function(sheet) {}
 *   });
 *
 *   sheet.loadTemplate('weekly-report', { period: '...', ownerNm: '...', items: [...] });
 *   sheet.getJsonData();   // [{field:value}, ...]
 *   sheet.exportXlsx('파일명');
 *
 * 의존성: jsuites.js, jspreadsheet.js (lazy load)
 */
(function() {
    'use strict';

    // ═══════════════════════════════════════════════════════════════
    // Lazy Dependency Loader
    // ═══════════════════════════════════════════════════════════════
    var _depsLoaded = false;
    var _depsLoading = false;
    var _depsCallbacks = [];

    function _loadCSS(href) {
        if (document.querySelector('link[href*="' + href.split('/').pop() + '"]')) return;
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        document.head.appendChild(link);
    }

    function _loadScript(src, callback, errback) {
        if (document.querySelector('script[src*="' + src.split('/').pop() + '"]')) {
            callback && callback();
            return;
        }
        var script = document.createElement('script');
        script.src = src;
        script.onload = function() { callback && callback(); };
        script.onerror = function() {
            console.error('[FormaSheet] Failed to load: ' + src);
            errback && errback(src);
        };
        document.head.appendChild(script);
    }

    function _depsFailed(failedSrc) {
        _depsLoading = false;
        var cbs = _depsCallbacks.slice();
        _depsCallbacks = [];
        cbs.forEach(function(cb) {
            if (cb._formaSheetInstance && cb._formaSheetInstance._el) {
                cb._formaSheetInstance._el.innerHTML =
                    '<div style="padding:20px;color:#c0392b;font-size:13px;text-align:center;border:1px dashed #c0392b;border-radius:4px;">' +
                    '<b>스프레드시트 모듈 로드 실패</b><br><span style="font-size:11px;color:#888;">(' + failedSrc + ')</span></div>';
            }
        });
        if (typeof FormaPopup !== 'undefined') {
            FormaPopup.toast.error('스프레드시트 모듈을 불러올 수 없습니다.');
        }
    }

    function _ensureDeps(callback) {
        if (_depsLoaded && window.jspreadsheet) {
            callback();
            return;
        }
        _depsCallbacks.push(callback);
        if (_depsLoading) return;
        _depsLoading = true;

        var basePath = '/assets';
        _loadCSS(basePath + '/css/jsuites.css');
        _loadCSS(basePath + '/css/jspreadsheet.css');
        _loadCSS(basePath + '/css/forma-sheet.css');

        // jsuites must load before jspreadsheet
        _loadScript(basePath + '/js/lib/jsuites.js', function() {
            _loadScript(basePath + '/js/lib/jspreadsheet.js', function() {
                _depsLoaded = true;
                _depsLoading = false;
                var cbs = _depsCallbacks.slice();
                _depsCallbacks = [];
                cbs.forEach(function(cb) { cb(); });
            }, _depsFailed);
        }, _depsFailed);
    }


    // ═══════════════════════════════════════════════════════════════
    // FormaSheet Class
    // ═══════════════════════════════════════════════════════════════
    function FormaSheet(selector, options) {
        this._selector = selector;
        this._el = typeof selector === 'string' ? document.querySelector(selector) : selector;
        this._options = Object.assign({}, FormaSheet.DEFAULTS, options || {});
        this._jss = null;              // jspreadsheet instance
        this._template = null;         // active template definition
        this._templateData = null;     // bound template data
        this._dataStartRow = 0;        // template data region start row
        this._dataEndRow = 0;          // template data region end row (exclusive)
        this._footerStartRow = 0;      // footer region start row
        this._destroyed = false;

        var self = this;
        var initCallback = function() { self._init(); };
        initCallback._formaSheetInstance = this;
        _ensureDeps(initCallback);
    }

    FormaSheet.DEFAULTS = {
        data: null,
        columns: null,
        template: null,
        templateData: null,
        width: '100%',
        height: 400,
        minRows: 5,
        minCols: 6,
        editable: true,
        showToolbar: true,
        showTabs: false,
        showFormula: false,
        wordWrap: false,
        onCellChange: null,
        onSelectionChange: null,
        onReady: null
    };


    // ═══════════════════════════════════════════════════════════════
    // Initialization
    // ═══════════════════════════════════════════════════════════════
    FormaSheet.prototype._init = function() {
        if (this._destroyed) return;

        // If template specified, load it
        if (this._options.template && FormaSheet.templates[this._options.template]) {
            this._template = FormaSheet.templates[this._options.template];
            if (this._options.templateData) {
                this._buildFromTemplate(this._options.templateData);
                return;
            }
        }

        // Plain mode (no template)
        this._createInstance(this._buildPlainConfig());

        if (this._options.onReady) {
            this._options.onReady(this);
        }
    };

    FormaSheet.prototype._createInstance = function(config) {
        // Clear container
        this._el.innerHTML = '';

        var self = this;
        var baseConfig = {
            allowInsertRow: this._options.editable,
            allowDeleteRow: this._options.editable,
            allowInsertColumn: false,
            allowDeleteColumn: false,
            allowRenameColumn: false,
            allowComments: false,
            editable: this._options.editable,
            tableOverflow: true,
            tableWidth: this._options.width,
            tableHeight: typeof this._options.height === 'number' ? this._options.height + 'px' : this._options.height,
            defaultColWidth: 120,
            contextMenu: this._options.editable ? undefined : function() { return false; },
            onchange: function(instance, cell, col, row, value) {
                if (self._options.onCellChange) {
                    self._options.onCellChange(instance, cell, parseInt(col), parseInt(row), value);
                }
            },
            onselection: function(instance, x1, y1, x2, y2) {
                if (self._options.onSelectionChange) {
                    self._options.onSelectionChange({ x1: x1, y1: y1, x2: x2, y2: y2 });
                }
            }
        };

        // Build toolbar if enabled
        if (this._options.showToolbar) {
            baseConfig.toolbar = this._buildToolbar();
        }

        // Merge provided config
        Object.assign(baseConfig, config);

        this._jss = jspreadsheet(this._el, baseConfig);
    };

    FormaSheet.prototype._buildPlainConfig = function() {
        var opts = this._options;
        var config = {};

        if (opts.data && opts.data.length > 0) {
            config.data = opts.data;
        } else {
            // Empty sheet
            var rows = [];
            for (var i = 0; i < opts.minRows; i++) {
                var row = [];
                for (var j = 0; j < opts.minCols; j++) row.push('');
                rows.push(row);
            }
            config.data = rows;
        }

        if (opts.columns) {
            config.columns = opts.columns.map(function(col) {
                return {
                    title: col.label || col.title || col.field || '',
                    width: col.width || 120,
                    type: col.type || 'text',
                    readOnly: col.readOnly || false
                };
            });
        }

        return config;
    };


    // ═══════════════════════════════════════════════════════════════
    // Toolbar
    // ═══════════════════════════════════════════════════════════════
    FormaSheet.prototype._buildToolbar = function() {
        var self = this;
        return [
            { type: 'i', content: 'undo', onclick: function() { self.undo(); } },
            { type: 'i', content: 'redo', onclick: function() { self.redo(); } },
            { type: 'select', k: 'font-size', v: ['9px','10px','11px','12px','13px','14px','16px','18px','20px','24px'] },
            { type: 'i', content: 'format_bold', k: 'font-weight', v: 'bold' },
            { type: 'i', content: 'format_italic', k: 'font-style', v: 'italic' },
            { type: 'color', content: 'format_color_text', k: 'color' },
            { type: 'color', content: 'format_color_fill', k: 'background-color' },
            { type: 'i', content: 'format_align_left', k: 'text-align', v: 'left' },
            { type: 'i', content: 'format_align_center', k: 'text-align', v: 'center' },
            { type: 'i', content: 'format_align_right', k: 'text-align', v: 'right' }
        ];
    };

    FormaSheet.prototype._getSelectedRange = function() {
        if (!this._jss || !this._jss.selectedCell) return null;
        var sel = this._jss.selectedCell;
        return { x1: sel[0], y1: sel[1], x2: sel[2], y2: sel[3] };
    };

    FormaSheet.prototype._applyStyleToSelection = function(prop, value) {
        var range = this._getSelectedRange();
        if (!range) return;
        for (var row = range.y1; row <= range.y2; row++) {
            for (var col = range.x1; col <= range.x2; col++) {
                var cellName = jspreadsheet.getColumnNameFromId([col, row]);
                this._jss.setStyle(cellName, prop, value);
            }
        }
    };

    FormaSheet.prototype._toggleStyleSelection = function(prop, value) {
        var range = this._getSelectedRange();
        if (!range) return;
        // Check first cell to determine toggle direction
        var firstCell = jspreadsheet.getColumnNameFromId([range.x1, range.y1]);
        var current = this._jss.getStyle(firstCell, prop);
        var newVal = (current === value) ? '' : value;
        for (var row = range.y1; row <= range.y2; row++) {
            for (var col = range.x1; col <= range.x2; col++) {
                var cellName = jspreadsheet.getColumnNameFromId([col, row]);
                this._jss.setStyle(cellName, prop, newVal);
            }
        }
    };


    // ═══════════════════════════════════════════════════════════════
    // Template Engine
    // ═══════════════════════════════════════════════════════════════
    FormaSheet.templates = {};

    FormaSheet.prototype.loadTemplate = function(name, data) {
        var tpl = FormaSheet.templates[name];
        if (!tpl) {
            console.error('[FormaSheet] Template not found: ' + name);
            return;
        }
        this._template = tpl;
        this._templateData = data || {};

        var self = this;
        if (!_depsLoaded) {
            _ensureDeps(function() { self._buildFromTemplate(data); });
        } else {
            this._buildFromTemplate(data);
        }
    };

    FormaSheet.prototype._buildFromTemplate = function(data) {
        data = data || this._templateData || {};
        this._templateData = data;
        var tpl = this._template;
        if (!tpl) return;

        var allRows = [];
        var merges = {};
        var styles = {};
        var readOnlyCells = [];
        var currentRow = 0;

        // --- Header rows ---
        if (tpl.header) {
            tpl.header.forEach(function(hdr) {
                if (hdr.merge) {
                    // Single merged row
                    var col = hdr.merge[0], row = hdr.merge[1], colspan = hdr.merge[2], rowspan = hdr.merge[3];
                    var rowData = [];
                    var val = hdr.bind ? (data[hdr.bind] || '') : (hdr.value || '');
                    for (var c = 0; c < (tpl.dataColumns ? tpl.dataColumns.length : 6); c++) {
                        rowData.push(c === col ? val : '');
                    }
                    allRows.push(rowData);

                    var cellName = jspreadsheet.helpers.getColumnName(col) + (currentRow + 1);
                    merges[cellName] = [colspan, rowspan];

                    if (hdr.style) {
                        _applyCellStyle(styles, col, currentRow, hdr.style);
                    }
                    // Header cells are read-only unless explicitly editable
                    if (!hdr.editable) {
                        for (var rc = col; rc < col + colspan; rc++) {
                            readOnlyCells.push({ col: rc, row: currentRow });
                        }
                    }
                    currentRow++;
                } else if (hdr.cells) {
                    // Multi-cell row
                    var rowData = [];
                    var numCols = tpl.dataColumns ? tpl.dataColumns.length : 6;
                    for (var c = 0; c < numCols; c++) rowData.push('');

                    hdr.cells.forEach(function(cell) {
                        var col = cell.merge[0], row = cell.merge[1], colspan = cell.merge[2], rowspan = cell.merge[3];
                        var val = cell.bind ? (data[cell.bind] || '') : (cell.value || '');
                        rowData[col] = val;

                        // Use actual currentRow, not the merge's row hint
                        var cellName = jspreadsheet.helpers.getColumnName(col) + (currentRow + 1);
                        merges[cellName] = [colspan, rowspan];

                        if (cell.style) {
                            _applyCellStyle(styles, col, currentRow, cell.style);
                        }
                        if (!cell.editable) {
                            for (var rc = col; rc < col + colspan; rc++) {
                                readOnlyCells.push({ col: rc, row: currentRow });
                            }
                        }
                    });
                    allRows.push(rowData);
                    currentRow++;
                }
            });
        }

        // --- Column header row ---
        var dataCols = tpl.dataColumns || [];
        var headerRow = [];
        dataCols.forEach(function(dc) {
            headerRow.push(dc.label || dc.field || '');
        });
        allRows.push(headerRow);
        // Style column header
        dataCols.forEach(function(dc, idx) {
            _applyCellStyle(styles, idx, currentRow, {
                fontWeight: 'bold', textAlign: 'center',
                background: '#e8ecf0', color: '#333'
            });
            readOnlyCells.push({ col: idx, row: currentRow });
        });
        currentRow++;

        // --- Data rows ---
        this._dataStartRow = currentRow;
        var items = data.items || [];
        if (items.length === 0) {
            // Add empty rows
            for (var i = 0; i < (this._options.minRows || 3); i++) {
                var emptyRow = [];
                dataCols.forEach(function() { emptyRow.push(''); });
                allRows.push(emptyRow);
                currentRow++;
            }
        } else {
            items.forEach(function(item) {
                var row = [];
                dataCols.forEach(function(dc, colIdx) {
                    var val = item[dc.field] !== undefined ? item[dc.field] : '';
                    row.push(val);
                    // Read-only data cells
                    if (dc.readOnly) {
                        readOnlyCells.push({ col: colIdx, row: currentRow });
                    }
                });
                allRows.push(row);
                currentRow++;
            });
        }
        this._dataEndRow = currentRow;

        // --- Footer rows ---
        this._footerStartRow = currentRow;
        if (tpl.footer) {
            tpl.footer.forEach(function(ftr) {
                var numCols = dataCols.length;
                if (ftr.merge) {
                    var col = ftr.merge[0];
                    var colspan = ftr.merge[2];
                    var rowspan = ftr.merge[3] || 1;
                    var val = ftr.bind ? (data[ftr.bind] || '') : (ftr.value || '');

                    // Add the main row
                    var rowData = [];
                    for (var c = 0; c < numCols; c++) rowData.push(c === col ? val : '');
                    allRows.push(rowData);

                    var cellName = jspreadsheet.helpers.getColumnName(col) + (currentRow + 1);
                    merges[cellName] = [colspan, rowspan];

                    if (ftr.style) {
                        _applyCellStyle(styles, col, currentRow, ftr.style);
                    }
                    if (!ftr.editable) {
                        for (var rc = col; rc < col + colspan; rc++) {
                            readOnlyCells.push({ col: rc, row: currentRow });
                        }
                    }
                    currentRow++;

                    // Add extra empty rows for rowspan > 1
                    for (var rs = 1; rs < rowspan; rs++) {
                        var emptyRow = [];
                        for (var c = 0; c < numCols; c++) emptyRow.push('');
                        allRows.push(emptyRow);
                        currentRow++;
                    }
                }
            });
        }

        // --- Build jspreadsheet columns config ---
        var columns = dataCols.map(function(dc) {
            var colType = 'text';
            if (dc.type === 'checkbox') colType = 'checkbox';
            else if (dc.type === 'dropdown') colType = 'dropdown';

            var col = {
                title: dc.label || dc.field || '',
                width: dc.width || 120,
                type: colType,
                wordWrap: dc.wordWrap !== undefined ? dc.wordWrap : this._options.wordWrap
            };

            // dropdown 옵션 설정
            if (colType === 'dropdown') {
                col.source = dc.source || dc.options || [];
                if (dc.autocomplete) col.autocomplete = true;
                if (dc.multiple) col.multiple = true;
            }

            return col;
        });

        // --- Create instance ---
        var config = {
            data: allRows,
            columns: columns,
            mergeCells: merges,
            style: _flattenStyles(styles),
            nestedHeaders: null,
            columnSorting: false,
            allowInsertColumn: false,
            allowDeleteColumn: false,
            allowRenameColumn: false,
            wordWrap: this._options.wordWrap
        };

        this._createInstance(config);

        // Apply read-only cells
        var self = this;
        readOnlyCells.forEach(function(rc) {
            try {
                var cellName = jspreadsheet.helpers.getColumnName(rc.col) + (rc.row + 1);
                self._jss.setReadOnly(cellName, true);
            } catch(e) {}
        });

        if (this._options.onReady) {
            this._options.onReady(this);
        }
    };

    function _applyCellStyle(styles, col, row, styleObj) {
        var key = col + ',' + row;
        if (!styles[key]) styles[key] = {};
        if (styleObj.fontWeight) styles[key]['font-weight'] = styleObj.fontWeight;
        if (styleObj.fontSize) styles[key]['font-size'] = (typeof styleObj.fontSize === 'number' ? styleObj.fontSize + 'px' : styleObj.fontSize);
        if (styleObj.textAlign) styles[key]['text-align'] = styleObj.textAlign;
        if (styleObj.background) styles[key]['background-color'] = styleObj.background;
        if (styleObj.color) styles[key]['color'] = styleObj.color;
        if (styleObj.fontStyle) styles[key]['font-style'] = styleObj.fontStyle;
        if (styleObj.border) styles[key]['border'] = styleObj.border;
    }

    function _flattenStyles(styles) {
        var result = {};
        Object.keys(styles).forEach(function(key) {
            var parts = key.split(',');
            var col = parseInt(parts[0]);
            var row = parseInt(parts[1]);
            var cellName = jspreadsheet.helpers.getColumnName(col) + (row + 1);
            var cssStr = '';
            var props = styles[key];
            Object.keys(props).forEach(function(p) {
                cssStr += p + ':' + props[p] + ';';
            });
            result[cellName] = cssStr;
        });
        return result;
    }


    // ═══════════════════════════════════════════════════════════════
    // Data Methods
    // ═══════════════════════════════════════════════════════════════
    FormaSheet.prototype.getData = function() {
        if (!this._jss) return [];
        return this._jss.getData();
    };

    FormaSheet.prototype.setData = function(data) {
        if (!this._jss) return;
        this._jss.setData(data);
    };

    /**
     * Get data from the data region as JSON objects (template mode)
     * Maps cell values back to field names defined in dataColumns
     */
    FormaSheet.prototype.getJsonData = function() {
        if (!this._jss || !this._template) return [];
        var dataCols = this._template.dataColumns || [];
        var result = [];

        for (var row = this._dataStartRow; row < this._dataEndRow; row++) {
            var obj = {};
            var hasData = false;
            dataCols.forEach(function(dc, colIdx) {
                var val = '';
                try {
                    val = this._jss.getValueFromCoords(colIdx, row);
                } catch(e) {}
                obj[dc.field] = (val !== null && val !== undefined) ? val : '';
                if (val) hasData = true;
            }.bind(this));
            if (hasData) result.push(obj);
        }
        return result;
    };

    /**
     * Set data in the data region from JSON objects (template mode)
     */
    FormaSheet.prototype.setJsonData = function(items) {
        if (!this._jss || !this._template) return;
        var dataCols = this._template.dataColumns || [];
        var self = this;

        items.forEach(function(item, idx) {
            var row = self._dataStartRow + idx;
            dataCols.forEach(function(dc, colIdx) {
                var val = item[dc.field] !== undefined ? item[dc.field] : '';
                try {
                    self._jss.setValueFromCoords(colIdx, row, val);
                } catch(e) {}
            });
        });
    };


    // ═══════════════════════════════════════════════════════════════
    // Cell Operations
    // ═══════════════════════════════════════════════════════════════
    FormaSheet.prototype.getCellValue = function(row, col) {
        if (!this._jss) return '';
        return this._jss.getValueFromCoords(col, row);
    };

    FormaSheet.prototype.setCellValue = function(row, col, value) {
        if (!this._jss) return;
        this._jss.setValueFromCoords(col, row, value);
    };

    FormaSheet.prototype.setCellStyle = function(row, col, style) {
        if (!this._jss) return;
        var cellName = jspreadsheet.helpers.getColumnName(col) + (row + 1);
        var self = this;
        Object.keys(style).forEach(function(prop) {
            // Convert camelCase to kebab-case
            var cssProp = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
            self._jss.setStyle(cellName, cssProp, style[prop]);
        });
    };

    FormaSheet.prototype.mergeCells = function(row, col, colspan, rowspan) {
        if (!this._jss) return;
        var cellName = jspreadsheet.helpers.getColumnName(col) + (row + 1);
        this._jss.setMerge(cellName, colspan, rowspan);
    };

    FormaSheet.prototype.setReadonly = function(row, col, readonly) {
        if (!this._jss) return;
        var cellName = jspreadsheet.helpers.getColumnName(col) + (row + 1);
        this._jss.setReadOnly(cellName, readonly !== false);
    };

    /**
     * 시트 전체 편집 가능/불가 토글
     * @param {boolean} editable - true: 편집 가능, false: 읽기 전용
     */
    FormaSheet.prototype.setEditable = function(editable) {
        if (!this._jss) return;
        this._options.editable = editable;
        this._jss.options.editable = editable;
        this._jss.options.allowInsertRow = editable;
        this._jss.options.allowDeleteRow = editable;

        // 컨텍스트 메뉴 토글
        if (editable) {
            this._jss.options.contextMenu = undefined;
        } else {
            this._jss.options.contextMenu = function() { return false; };
            // 편집 중인 셀 닫기
            if (this._jss.edition) {
                try { this._jss.closeEditor(this._jss.edition[0], false); } catch(e) {}
            }
        }

        // 툴바 표시/숨김
        if (this._jss.toolbar) {
            this._jss.toolbar.style.display = (editable && this._options.showToolbar) ? '' : 'none';
        }
    };

    /**
     * 현재 편집 가능 상태 반환
     */
    FormaSheet.prototype.isEditable = function() {
        return this._options.editable;
    };


    // ═══════════════════════════════════════════════════════════════
    // Row Operations
    // ═══════════════════════════════════════════════════════════════
    FormaSheet.prototype.insertRow = function(idx, data) {
        if (!this._jss) return;
        var rowIdx = (idx !== undefined && idx !== null) ? idx : this._dataEndRow;
        var numCols = this._template ? this._template.dataColumns.length : (this._options.columns ? this._options.columns.length : this._options.minCols);
        var rowData = data || [];

        // If data is an object (template mode), convert to array
        if (this._template && data && !Array.isArray(data)) {
            var dataCols = this._template.dataColumns;
            rowData = dataCols.map(function(dc) {
                return data[dc.field] !== undefined ? data[dc.field] : '';
            });
        }

        // Pad to numCols
        while (rowData.length < numCols) rowData.push('');

        this._jss.insertRow(1, rowIdx, true, rowData);

        // Update data region tracking
        if (rowIdx <= this._dataEndRow) {
            this._dataEndRow++;
            this._footerStartRow++;
        }
    };

    FormaSheet.prototype.deleteRow = function(idx) {
        if (!this._jss) return;
        this._jss.deleteRow(idx);

        // Update data region tracking
        if (idx >= this._dataStartRow && idx < this._dataEndRow) {
            this._dataEndRow--;
            this._footerStartRow--;
        }
    };

    /**
     * Find a data row by field value (template mode)
     * Returns the absolute row index or -1
     */
    FormaSheet.prototype.findDataRow = function(field, value) {
        if (!this._jss || !this._template) return -1;
        var dataCols = this._template.dataColumns;
        var colIdx = -1;
        for (var i = 0; i < dataCols.length; i++) {
            if (dataCols[i].field === field) { colIdx = i; break; }
        }
        if (colIdx < 0) return -1;

        for (var row = this._dataStartRow; row < this._dataEndRow; row++) {
            var cellVal = this._jss.getValueFromCoords(colIdx, row);
            if (cellVal === value) return row;
        }
        return -1;
    };

    /**
     * Update a specific field in a data row (template mode)
     */
    FormaSheet.prototype.updateDataField = function(rowIdx, field, value) {
        if (!this._jss || !this._template) return;
        var dataCols = this._template.dataColumns;
        for (var i = 0; i < dataCols.length; i++) {
            if (dataCols[i].field === field) {
                this._jss.setValueFromCoords(i, rowIdx, value);
                return;
            }
        }
    };

    /**
     * Get all data for a specific data row as object (template mode)
     */
    FormaSheet.prototype.getDataRow = function(rowIdx) {
        if (!this._jss || !this._template) return null;
        var dataCols = this._template.dataColumns;
        var obj = {};
        var self = this;
        dataCols.forEach(function(dc, colIdx) {
            obj[dc.field] = self._jss.getValueFromCoords(colIdx, rowIdx) || '';
        });
        return obj;
    };

    /**
     * Get the number of data rows
     */
    FormaSheet.prototype.getDataRowCount = function() {
        return this._dataEndRow - this._dataStartRow;
    };


    // ═══════════════════════════════════════════════════════════════
    // Export / Print
    // ═══════════════════════════════════════════════════════════════
    FormaSheet.prototype.exportXlsx = function(filename) {
        if (!this._jss) return;
        filename = filename || 'export';
        if (!filename.endsWith('.csv')) filename += '.csv';
        this._jss.download(true);
    };

    FormaSheet.prototype.exportCsv = function(filename) {
        if (!this._jss) return;
        this._jss.download(true);
    };

    FormaSheet.prototype.print = function(title) {
        if (!this._jss) return;
        var printWin = window.open('', '_blank');
        if (!printWin) return;

        var table = this._el.querySelector('table');
        if (!table) return;

        var html = '<!DOCTYPE html><html><head><title>' + (title || 'FormaSheet') + '</title>';
        html += '<style>';
        html += 'body { font-family: "Pretendard", sans-serif; font-size: 12px; margin: 20px; }';
        html += 'table { border-collapse: collapse; width: 100%; }';
        html += 'td, th { border: 1px solid #ccc; padding: 4px 8px; }';
        html += 'th { background: #f0f0f0; font-weight: bold; }';
        html += '@media print { body { margin: 0; } }';
        html += '</style></head><body>';
        if (title) html += '<h2 style="text-align:center;margin-bottom:12px">' + title + '</h2>';
        html += table.outerHTML;
        html += '<script>window.onload=function(){window.print();}<\/script>';
        html += '</body></html>';

        printWin.document.write(html);
        printWin.document.close();
    };


    // ═══════════════════════════════════════════════════════════════
    // Lifecycle
    // ═══════════════════════════════════════════════════════════════
    FormaSheet.prototype.clear = function() {
        if (this._jss) {
            // Reset all data to empty
            var data = this._jss.getData();
            var empty = data.map(function(row) {
                return row.map(function() { return ''; });
            });
            this._jss.setData(empty);
        }
    };

    FormaSheet.prototype.destroy = function() {
        this._destroyed = true;
        if (this._jss) {
            // jspreadsheet CE v4 — 잔여 전역 이벤트 리스너 정리
            try {
                // jss가 document에 바인딩한 키보드/마우스 이벤트 해제
                if (this._jss.closeEditor) this._jss.closeEditor(this._jss, false);
                this._jss.destroy();
            } catch(e) {}
            this._jss = null;
        }
        // 컨테이너 내부 이벤트 리스너 일괄 해제 (cloneNode 트릭)
        if (this._el) {
            var clean = this._el.cloneNode(false);
            if (this._el.parentNode) {
                this._el.parentNode.replaceChild(clean, this._el);
            }
            clean.innerHTML = '';
            this._el = clean;
        }
        // 참조 정리
        this._template = null;
        this._templateData = null;
        this._options = null;
    };

    FormaSheet.prototype.undo = function() {
        if (this._jss) this._jss.undo();
    };

    FormaSheet.prototype.redo = function() {
        if (this._jss) this._jss.redo();
    };

    /**
     * Check if the sheet instance is ready
     */
    FormaSheet.prototype.isReady = function() {
        return !!this._jss;
    };


    // ═══════════════════════════════════════════════════════════════
    // Template: weekly-report (주간보고서)
    // ═══════════════════════════════════════════════════════════════
    FormaSheet.templates['weekly-report'] = {
        header: [
            {
                merge: [0, 0, 6, 1],
                value: '주 간 보 고 서',
                style: { fontSize: 16, fontWeight: 'bold', textAlign: 'center', background: '#e3effa' }
            },
            {
                cells: [
                    { merge: [0, 1, 1, 1], value: '보고기간', style: { fontWeight: 'bold', background: '#f0f4f8', textAlign: 'center' } },
                    { merge: [1, 1, 5, 1], bind: 'period' }
                ]
            },
            {
                cells: [
                    { merge: [0, 2, 1, 1], value: '작 성 자', style: { fontWeight: 'bold', background: '#f0f4f8', textAlign: 'center' } },
                    { merge: [1, 2, 5, 1], bind: 'ownerNm' }
                ]
            },
            {
                cells: [
                    { merge: [0, 3, 1, 1], value: '주    차', style: { fontWeight: 'bold', background: '#f0f4f8', textAlign: 'center' } },
                    { merge: [1, 3, 5, 1], bind: 'rptWeek' }
                ]
            }
        ],
        dataColumns: [
            { field: 'includeYn', label: '보고', width: 50, type: 'checkbox' },
            { field: 'custNm', label: '거래처', width: 100, readOnly: true },
            { field: 'bizNm', label: '사업명', width: 160, readOnly: true },
            { field: 'prevPlan', label: '전주계획', width: 200, readOnly: true },
            { field: 'thisWeek', label: '금주실적', width: 280 },
            { field: 'nextWeek', label: '차주계획', width: 280 }
        ],
        footer: [
            {
                merge: [0, -1, 6, 1],
                value: '비    고',
                style: { fontWeight: 'bold', background: '#f0f4f8', textAlign: 'center' }
            },
            {
                merge: [0, -1, 6, 3],
                bind: 'remark',
                editable: true
            }
        ]
    };


    // ═══════════════════════════════════════════════════════════════
    // Expose
    // ═══════════════════════════════════════════════════════════════
    window.FormaSheet = FormaSheet;

})();
