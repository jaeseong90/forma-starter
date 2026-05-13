/**
 * FORMA Export Utility — PDF/Excel 내보내기 (SheetJS XLSX + 브라우저 인쇄)
 */
var FormaExport = (function() {

    /**
     * 회의록 PDF 내보내기 (인쇄 → PDF 저장)
     */
    function meetingToPdf(data, actions) {
        var html = _buildMeetingHtml(data, actions);
        var win = window.open('', '_blank', 'width=800,height=600');
        win.document.write(html);
        win.document.close();
        setTimeout(function() {
            win.print();
            win.onafterprint = function() { win.close(); };
        }, 300);
    }

    /**
     * 회의록 Excel 내보내기 (xlsx-js-style XLSX — 서식 포함)
     */
    function meetingToExcel(data, actions) {
        var fmtDate = _fmtDate;

        // ── 스타일 상수 ──
        var B = { style: 'thin', color: { rgb: '999999' } };
        var BORDERS = { left: B, right: B, top: B, bottom: B };
        var TITLE  = { font: { bold: true, name: 'KoPub돋움체 Medium', sz: 16 }, alignment: { horizontal: 'center', vertical: 'center' } };
        var LABEL  = { font: { bold: true, name: 'KoPub돋움체 Medium', sz: 10 }, fill: { fgColor: { rgb: 'F5F6FA' } }, border: BORDERS, alignment: { vertical: 'center' } };
        var VALUE  = { font: { name: 'KoPub돋움체 Medium', sz: 10 }, border: BORDERS, alignment: { vertical: 'center' } };
        var SECTION = { font: { bold: true, name: 'KoPub돋움체 Medium', sz: 11 }, fill: { fgColor: { rgb: 'E2E8F0' } }, border: BORDERS };
        var CONTENT = { font: { name: 'KoPub돋움체 Medium', sz: 10 }, border: BORDERS, alignment: { wrapText: true, vertical: 'top' } };
        var TH     = { font: { bold: true, name: 'KoPub돋움체 Medium', sz: 10 }, fill: { fgColor: { rgb: 'F5F6FA' } }, border: BORDERS, alignment: { horizontal: 'center', vertical: 'center' } };
        var TD     = { font: { name: 'KoPub돋움체 Medium', sz: 10 }, border: BORDERS };

        var rows = [];
        var merges = [];
        var rowStyles = {};  // { rowIdx: { colIdx: style } }
        var rowHeights = {}; // { rowIdx: height }
        var r = 0;

        function pushRow(arr, styles) {
            rows.push(arr);
            if (styles) rowStyles[r] = styles;
            r++;
        }
        function merge(r1, c1, r2, c2) {
            merges.push({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } });
        }

        // ── 제목 ──
        pushRow(['회 의 록', '', '', ''], { 0: TITLE, 1: TITLE, 2: TITLE, 3: TITLE });
        merge(0, 0, 0, 3);
        rowHeights[0] = 32;
        pushRow([]);
        r = 2; // after empty row

        // ── 기본정보 ──
        pushRow(['회의번호', data.mtgNo || '', '회의일자', fmtDate(data.mtgDate)], { 0: LABEL, 1: VALUE, 2: LABEL, 3: VALUE });
        pushRow(['회의제목', data.mtgTitle || '', '', ''], { 0: LABEL, 1: VALUE, 2: VALUE, 3: VALUE });
        merge(r - 1, 1, r - 1, 3);
        pushRow(['거래처', data.custNm || '', '사업', data.bizNm || ''], { 0: LABEL, 1: VALUE, 2: LABEL, 3: VALUE });
        pushRow(['참석자', data.participants || '', '', ''], { 0: LABEL, 1: VALUE, 2: VALUE, 3: VALUE });
        merge(r - 1, 1, r - 1, 3);
        pushRow(['장소', data.location || '', '', ''], { 0: LABEL, 1: VALUE, 2: VALUE, 3: VALUE });
        merge(r - 1, 1, r - 1, 3);
        pushRow([]);

        // ── 회의 내용 ──
        if (data.userContent) {
            pushRow(['회의 내용', '', '', ''], { 0: SECTION, 1: SECTION, 2: SECTION, 3: SECTION });
            merge(r - 1, 0, r - 1, 3);
            var ucText = data.userContent;
            pushRow([ucText, '', '', ''], { 0: CONTENT, 1: CONTENT, 2: CONTENT, 3: CONTENT });
            merge(r - 1, 0, r - 1, 3);
            rowHeights[r - 1] = Math.max(30, Math.min(ucText.split('\n').length * 15, 400));
            pushRow([]);
        }

        // ── AI 회의록 ──
        if (data.aiSummary) {
            pushRow(['AI 회의록', '', '', ''], { 0: SECTION, 1: SECTION, 2: SECTION, 3: SECTION });
            merge(r - 1, 0, r - 1, 3);
            var aiText = _stripMarkdown(data.aiSummary);
            pushRow([aiText, '', '', ''], { 0: CONTENT, 1: CONTENT, 2: CONTENT, 3: CONTENT });
            merge(r - 1, 0, r - 1, 3);
            rowHeights[r - 1] = Math.max(30, Math.min(aiText.split('\n').length * 15, 400));
            pushRow([]);
        }

        // ── Action Items ──
        if (actions && actions.length > 0) {
            pushRow(['Action Items', '', '', ''], { 0: SECTION, 1: SECTION, 2: SECTION, 3: SECTION });
            merge(r - 1, 0, r - 1, 3);
            pushRow(['할 일', '담당자', '기한', ''], { 0: TH, 1: TH, 2: TH, 3: TH });
            merge(r - 1, 2, r - 1, 3);
            for (var i = 0; i < actions.length; i++) {
                var a = actions[i];
                pushRow([a.actionItem || '', a.assignee || '', fmtDate(a.dueDate), ''], { 0: TD, 1: TD, 2: TD, 3: TD });
                merge(r - 1, 2, r - 1, 3);
            }
        }

        // ── 시트 생성 + 스타일 적용 ──
        var ws = XLSX.utils.aoa_to_sheet(rows);
        ws['!merges'] = merges;
        ws['!cols'] = [{ wch: 14 }, { wch: 22 }, { wch: 14 }, { wch: 22 }];

        // 행 높이
        var wsRows = [];
        for (var ri = 0; ri < rows.length; ri++) {
            wsRows.push(rowHeights[ri] ? { hpt: rowHeights[ri] } : {});
        }
        ws['!rows'] = wsRows;

        // 셀 스타일 적용
        for (var rowIdx in rowStyles) {
            var cols = rowStyles[rowIdx];
            for (var colIdx in cols) {
                var addr = XLSX.utils.encode_cell({ r: parseInt(rowIdx), c: parseInt(colIdx) });
                if (!ws[addr]) ws[addr] = { v: '', t: 's' };
                ws[addr].s = cols[colIdx];
            }
        }

        var wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '회의록');
        XLSX.writeFile(wb, '회의록_' + (data.mtgNo || 'export') + '.xlsx');
    }

    // ── 내부 함수 ──

    function _fmtDate(d) {
        if (!d || d.length < 8) return d || '';
        return d.substring(0, 4) + '-' + d.substring(4, 6) + '-' + d.substring(6, 8);
    }

    function _stripMarkdown(text) {
        if (!text) return '';
        return text
            .replace(/^#{1,6}\s+/gm, '')          // ### 헤더 제거
            .replace(/\*\*(.+?)\*\*/g, '$1')       // **볼드** → 볼드
            .replace(/\*(.+?)\*/g, '$1')           // *이탤릭* → 이탤릭
            .replace(/^[-*]\s+\[\s?\]\s*/gm, '- ') // - [ ] 체크박스 → -
            .replace(/^[-*]\s+\[x\]\s*/gm, '- ')  // - [x] 체크박스 → -
            .replace(/^>\s+/gm, '')                // > 인용 제거
            .replace(/`(.+?)`/g, '$1')             // `코드` → 코드
            .replace(/\n{3,}/g, '\n\n');           // 3줄 이상 빈줄 → 2줄
    }

    function _escHtml(s) {
        if (!s) return '';
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
    }

    function _buildMeetingHtml(data, actions) {
        var fmtDate = _fmtDate;
        var esc = _escHtml;
        var h = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>회의록 - ' + esc(data.mtgTitle) + '</title>';
        h += '<style>';
        h += 'body { font-family: "Malgun Gothic","맑은 고딕",sans-serif; font-size: 13px; color: #333; margin: 40px; line-height: 1.6; }';
        h += 'h1 { font-size: 22px; margin: 0 0 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }';
        h += '.info-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }';
        h += '.info-table td { padding: 6px 10px; border: 1px solid #ddd; vertical-align: top; }';
        h += '.info-table .label { background: #f5f6fa; font-weight: 600; width: 100px; white-space: nowrap; }';
        h += '.section-title { font-size: 15px; font-weight: 700; margin: 24px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #ccc; }';
        h += '.content { white-space: pre-wrap; margin-bottom: 16px; }';
        h += '.action-table { width: 100%; border-collapse: collapse; }';
        h += '.action-table th, .action-table td { padding: 6px 10px; border: 1px solid #ddd; text-align: left; }';
        h += '.action-table th { background: #f5f6fa; font-weight: 600; }';
        h += '.done { text-decoration: line-through; color: #999; }';
        h += '@media print { body { margin: 20px; } }';
        h += '</style></head><body>';

        h += '<h1>회의록</h1>';
        h += '<table class="info-table">';
        h += '<tr><td class="label">회의번호</td><td>' + esc(data.mtgNo) + '</td><td class="label">회의일자</td><td>' + fmtDate(data.mtgDate) + '</td></tr>';
        h += '<tr><td class="label">회의제목</td><td colspan="3">' + esc(data.mtgTitle) + '</td></tr>';
        h += '<tr><td class="label">거래처</td><td>' + esc(data.custNm) + '</td><td class="label">사업</td><td>' + esc(data.bizNm) + '</td></tr>';
        h += '<tr><td class="label">참석자</td><td colspan="3">' + esc(data.participants) + '</td></tr>';
        h += '<tr><td class="label">장소</td><td colspan="3">' + esc(data.location) + '</td></tr>';
        h += '</table>';

        if (data.userContent) {
            h += '<div class="section-title">회의 내용</div>';
            h += '<div class="content">' + esc(data.userContent) + '</div>';
        }
        if (data.aiSummary) {
            h += '<div class="section-title">AI 회의록</div>';
            h += '<div class="content">' + esc(data.aiSummary) + '</div>';
        }

        if (actions && actions.length > 0) {
            h += '<div class="section-title">Action Items</div>';
            h += '<table class="action-table"><thead><tr><th>할 일</th><th>담당자</th><th>기한</th></tr></thead><tbody>';
            for (var i = 0; i < actions.length; i++) {
                var a = actions[i];
                h += '<tr><td>' + esc(a.actionItem) + '</td><td>' + esc(a.assignee) + '</td><td>' + fmtDate(a.dueDate) + '</td></tr>';
            }
            h += '</tbody></table>';
        }

        h += '</body></html>';
        return h;
    }

    function _downloadCsv(rows, filename) {
        var BOM = '\uFEFF';
        var csv = BOM;
        for (var i = 0; i < rows.length; i++) {
            var line = [];
            for (var j = 0; j < rows[i].length; j++) {
                var val = String(rows[i][j] || '').replace(/"/g, '""');
                if (val.indexOf(',') >= 0 || val.indexOf('"') >= 0 || val.indexOf('\n') >= 0) {
                    val = '"' + val + '"';
                }
                line.push(val);
            }
            csv += line.join(',') + '\n';
        }
        var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
    }

    var APPR_LABELS = { PRELIMINARY: '사전', CONFIRMED: '확정', CHANGED: '변경', CLOSED: '마감' };
    var APPR_ORDER = ['PRELIMINARY', 'CONFIRMED', 'CHANGED', 'CLOSED'];

    /**
     * 매출기안 + 세부원가분석서 Excel — 회사 표준 양식 (SA2601-xx 형식)
     * 시트 구성: [기안] + [세부원가분석×N] (기안 수만큼)
     * @param {Array} dataList - [{master, cost, details, version}, ...]
     */
    function approvalToExcel(dataList) {
        if (!dataList || dataList.length === 0) { FormaPopup.alert.show('출력할 데이터가 없습니다.'); return; }

        var B = { style: 'thin', color: { rgb: '999999' } };
        var BD = { left: B, right: B, top: B, bottom: B };

        // 스타일 정의
        var S_TITLE = { font: { bold: true, name: 'KoPub돋움체 Medium', sz: 11 } };
        var S_RIGHT = { font: { name: 'KoPub돋움체 Medium', sz: 10 }, alignment: { horizontal: 'right' } };
        var S_HDR   = { font: { bold: true, name: 'KoPub돋움체 Medium', sz: 10, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '003399' } }, border: BD, alignment: { horizontal: 'center', vertical: 'center' } };
        var S_N     = { font: { name: 'KoPub돋움체 Medium', sz: 10 }, border: BD };
        var S_B     = { font: { bold: true, name: 'KoPub돋움체 Medium', sz: 10 }, border: BD };
        var S_Y     = { font: { bold: true, name: 'KoPub돋움체 Medium', sz: 10 }, fill: { fgColor: { rgb: 'FFFFCC' } }, border: BD };
        var S_G     = { font: { bold: true, name: 'KoPub돋움체 Medium', sz: 10 }, fill: { fgColor: { rgb: '92D050' } }, border: BD };
        var S_NC    = { font: { name: 'KoPub돋움체 Medium', sz: 10 }, border: BD, alignment: { horizontal: 'center' } };

        function numS(base) { return Object.assign({}, base, { numFmt: '#,##0', alignment: { horizontal: 'right', vertical: 'center' } }); }
        function pctS(base) { return Object.assign({}, base, { numFmt: '0.00%', alignment: { horizontal: 'right', vertical: 'center' } }); }

        var S_NUM = numS(S_N), S_NUM_Y = numS(S_Y), S_NUM_G = numS(S_G);
        var S_PCT = pctS(S_N), S_PCT_Y = pctS(S_Y), S_PCT_G = pctS(S_G);

        function n(v) { return v != null ? Number(v) || 0 : 0; }
        function calcMonths(from, to) {
            if (!from || !to || from.length < 6 || to.length < 6) return 12;
            var y1 = parseInt(from.substring(0,4)), m1 = parseInt(from.substring(4,6));
            var y2 = parseInt(to.substring(0,4)), m2 = parseInt(to.substring(4,6));
            return Math.max((y2 - y1) * 12 + (m2 - m1) + 1, 1);
        }

        // ── 기안서 본문 시트 작성 ──
        function _writeApprovalSheet(wb, master, cost) {
            // 11 columns (A-K)
            var S_LBL    = { font: { name: 'KoPub돋움체 Medium', sz: 12 }, border: BD, alignment: { horizontal: 'center', vertical: 'center', wrapText: true } };
            var S_VAL_C  = { font: { name: 'KoPub돋움체 Medium', sz: 12 }, border: BD, alignment: { horizontal: 'center', vertical: 'center', wrapText: true } };
            var S_VAL_L  = { font: { name: 'KoPub돋움체 Medium', sz: 12 }, border: BD, alignment: { horizontal: 'left', vertical: 'center', wrapText: true, indent: 1 } };
            var S_CHK    = { font: { bold: true, name: 'KoPub돋움체 Medium', sz: 18 }, border: BD, alignment: { horizontal: 'center', vertical: 'center' } };
            var S_DOCTYPE = { font: { name: 'KoPub돋움체 Medium', sz: 11 }, border: BD, alignment: { horizontal: 'left', vertical: 'center', wrapText: true, indent: 1 } };
            var S_SIGN   = { font: { name: 'KoPub돋움체 Medium', sz: 12 }, border: BD, alignment: { horizontal: 'center', vertical: 'center' } };
            var S_CONTENT = { font: { name: 'KoPub돋움체 Medium', sz: 12 }, border: BD, alignment: { horizontal: 'left', vertical: 'top', wrapText: true, indent: 1 } };

            var rows = [], merges = [], ov = {}, rh = {};
            var r = 0;
            function push(a) { rows.push(a); return r++; }
            function mg(r1, c1, r2, c2) { merges.push({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } }); }
            function st(row, col, v, t, s) { ov[XLSX.utils.encode_cell({ r: row, c: col })] = { v: v, t: t || 's', s: s }; }
            // 병합 + 외곽 테두리만 적용 (병합 내부 보더 중복 방지)
            function mgst(r1, c1, r2, c2, v, t, s) {
                if (r1 === r2 && c1 === c2) {
                    st(r1, c1, v, t, s);
                    return;
                }
                var bSide = (s && s.border && s.border.top) || B;
                for (var rr = r1; rr <= r2; rr++) {
                    for (var cc = c1; cc <= c2; cc++) {
                        var edge = {};
                        if (rr === r1) edge.top = bSide;
                        if (rr === r2) edge.bottom = bSide;
                        if (cc === c1) edge.left = bSide;
                        if (cc === c2) edge.right = bSide;
                        var cellS = Object.assign({}, s, { border: edge });
                        var vv = (rr === r1 && cc === c1) ? v : '';
                        st(rr, cc, vv, t, cellS);
                    }
                }
                mg(r1, c1, r2, c2);
            }
            function emptyRow() { return ['','','','','','','','','']; }

            // 날짜 yyyymmdd → yyyy.mm.dd 변환
            function fmtDate(v) {
                var s = String(v || '').replace(/[^0-9]/g, '');
                if (s.length === 8) return s.substring(0,4) + '.' + s.substring(4,6) + '.' + s.substring(6,8);
                if (s.length === 6) return s.substring(0,4) + '.' + s.substring(4,6);
                return v || '';
            }
            function fmtYM(v) {
                var s = String(v || '').replace(/[^0-9]/g, '');
                if (s.length >= 6) return s.substring(0,4) + '.' + s.substring(4,6);
                return v || '';
            }
            function fmtPeriod(from, to) {
                var f = fmtYM(from), t = fmtYM(to);
                if (!f && !t) return '';
                return f + ' ~ ' + t;
            }

            var typeLabel = APPR_LABELS[master.apprType] || master.apprType || '';
            var titleText = '(' + typeLabel + ') ' + (master.bizNm || master.projectNm || '');
            var docTypeText = '【문서종류】\n□ 보통          □ 극비\n□ 사내외비    ■ 대외비';

            // ── Row 1 (index 0): 빈 여백 ──
            push(emptyRow());
            rh[0] = { hpt: 8 };

            // ── Row 2: 문서번호 | 품의(D-H 병합) ──
            var rDocNo = r; push(emptyRow());
            mgst(rDocNo, 0, rDocNo, 0, '문서번호', 's', S_LBL);
            mgst(rDocNo, 1, rDocNo, 2, master.apprNo || '', 's', S_VAL_C);
            mgst(rDocNo, 3, rDocNo, 7, '☑  품    의', 's', S_CHK);
            rh[rDocNo] = { hpt: 32 };

            // ── Row 3: 보존년한 | 보고(D-H 병합) ──
            var rKeep = r; push(emptyRow());
            mgst(rKeep, 0, rKeep, 0, '보존년한', 's', S_LBL);
            mgst(rKeep, 1, rKeep, 2, '', 's', S_VAL_C);
            mgst(rKeep, 3, rKeep, 7, '☐  보    고', 's', S_CHK);
            rh[rKeep] = { hpt: 32 };

            // 문서종류: I열 × row 2-3 단일 병합
            mgst(rDocNo, 8, rKeep, 8, docTypeText, 's', S_DOCTYPE);

            // ── Row 4: 기안일자 + 결재자 헤더 ──
            var rDate = r; push(emptyRow());
            mgst(rDate, 0, rDate, 0, '기안일자', 's', S_LBL);
            mgst(rDate, 1, rDate, 2, fmtDate(master.apprDate), 's', S_VAL_C);
            mgst(rDate, 3, rDate, 3, '담당', 's', S_LBL);
            mgst(rDate, 4, rDate, 4, '팀장', 's', S_LBL);
            mgst(rDate, 5, rDate, 5, '본부장', 's', S_LBL);
            mgst(rDate, 6, rDate, 6, '총괄임원', 's', S_LBL);
            mgst(rDate, 7, rDate, 7, '대표이사', 's', S_LBL);
            mgst(rDate, 8, rDate, 8, '회장님', 's', S_LBL);
            rh[rDate] = { hpt: 26 };

            // ── Row 5: 기안부서 (사인영역 상단) ──
            var rDept = r; push(emptyRow());
            mgst(rDept, 0, rDept, 0, '기안부서', 's', S_LBL);
            mgst(rDept, 1, rDept, 2, master.apprDept || '', 's', S_VAL_C);
            rh[rDept] = { hpt: 34 };

            // ── Row 6: 기 안 자 (사인영역 하단) ──
            var rUser = r; push(emptyRow());
            mgst(rUser, 0, rUser, 0, '기 안 자', 's', S_LBL);
            mgst(rUser, 1, rUser, 2, master.apprUserNm || '', 's', S_VAL_C);
            rh[rUser] = { hpt: 34 };

            // 결재 사인 영역 (담당~회장님 모두 1컬럼 × 2행 세로병합)
            mgst(rDept, 3, rUser, 3, '', 's', S_SIGN);
            mgst(rDept, 4, rUser, 4, '', 's', S_SIGN);
            mgst(rDept, 5, rUser, 5, '', 's', S_SIGN);
            mgst(rDept, 6, rUser, 6, '', 's', S_SIGN);
            mgst(rDept, 7, rUser, 7, '', 's', S_SIGN);
            mgst(rDept, 8, rUser, 8, '', 's', S_SIGN);

            // ── Row 7: 최종결정 + / / / / / / ──
            var rFinal = r; push(emptyRow());
            mgst(rFinal, 0, rFinal, 0, '최종결정', 's', S_LBL);
            mgst(rFinal, 1, rFinal, 2, '부.보류', 's', S_VAL_C);
            mgst(rFinal, 3, rFinal, 3, '/', 's', S_SIGN);
            mgst(rFinal, 4, rFinal, 4, '/', 's', S_SIGN);
            mgst(rFinal, 5, rFinal, 5, '/', 's', S_SIGN);
            mgst(rFinal, 6, rFinal, 6, '/', 's', S_SIGN);
            mgst(rFinal, 7, rFinal, 7, '/', 's', S_SIGN);
            mgst(rFinal, 8, rFinal, 8, '/', 's', S_SIGN);
            rh[rFinal] = { hpt: 26 };

            // ── Row 8: 지시사항 ──
            var rInstr = r; push(emptyRow());
            mgst(rInstr, 0, rInstr, 0, '지시사항', 's', S_LBL);
            mgst(rInstr, 1, rInstr, 8, '', 's', S_VAL_L);
            rh[rInstr] = { hpt: 34 };

            // ── Row 9: 합의협조 및 의견 ──
            var rAgree = r; push(emptyRow());
            mgst(rAgree, 0, rAgree, 0, '합의협조\n및 의견', 's', S_LBL);
            mgst(rAgree, 1, rAgree, 8, '', 's', S_VAL_L);
            rh[rAgree] = { hpt: 42 };

            // ── Row 10: 제 목 ──
            var rTitle = r; push(emptyRow());
            mgst(rTitle, 0, rTitle, 0, '제    목', 's', S_LBL);
            mgst(rTitle, 1, rTitle, 8, titleText, 's', S_VAL_L);
            rh[rTitle] = { hpt: 30 };

            // ── 빈행 (8.15pt) ──
            push(emptyRow()); rh[r-1] = { hpt: 8.15 };

            // ── 인사말 2줄 (회사양식 Row 12-13) ──
            var S_BODY_L = { font: { name: 'KoPub돋움체 Medium', sz: 12 }, alignment: { horizontal: 'left', vertical: 'center', wrapText: true, indent: 1 } };
            var S_BODY_C = { font: { name: 'KoPub돋움체 Medium', sz: 12 }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true } };

            var rGreet1 = r; push(emptyRow());
            mgst(rGreet1, 1, rGreet1, 8, (master.custNm || '') + ' "' + (master.bizNm || '') + '" 사업과 관련하여', 's', S_BODY_L);
            rh[rGreet1] = { hpt: 21 };

            var rGreet2 = r; push(emptyRow());
            mgst(rGreet2, 1, rGreet2, 8, '아래와 같이 진행하고자 하오니 검토하신 후 裁可 바랍니다.', 's', S_BODY_L);
            rh[rGreet2] = { hpt: 21 };

            // ── 빈행 (10.5pt) ──
            push(emptyRow()); rh[r-1] = { hpt: 10.5 };

            // ── <아래> ──
            var rArrow = r; push(emptyRow());
            mgst(rArrow, 0, rArrow, 8, '<아       래 >', 's', S_BODY_C);
            rh[rArrow] = { hpt: 21 };

            // ── 1. 사업명 ──
            var r1nm = r; push(emptyRow());
            mgst(r1nm, 1, r1nm, 8, '1. 사업명 : ' + (master.custNm || '') + ' "' + (master.bizNm || '') + '"', 's', S_BODY_L);
            rh[r1nm] = { hpt: 21 };

            push(emptyRow()); rh[r-1] = { hpt: 10.5 };

            // ── 2. 사업내용 ──
            var months = calcMonths(master.projectFrom, master.projectTo);
            var r2nm = r; push(emptyRow()); mgst(r2nm, 1, r2nm, 8, '2. 사업내용', 's', S_BODY_L); rh[r2nm] = { hpt: 21 };
            var r2a = r; push(emptyRow()); mgst(r2a, 1, r2a, 8, '   - 계약업체 : ' + (master.custNm || ''), 's', S_BODY_L); rh[r2a] = { hpt: 21 };
            var r2b = r; push(emptyRow()); mgst(r2b, 1, r2b, 8, '   - 사업기간 : ' + fmtPeriod(master.projectFrom, master.projectTo) + ' (' + months + '개월)', 's', S_BODY_L); rh[r2b] = { hpt: 21 };
            var r2c = r; push(emptyRow()); mgst(r2c, 1, r2c, 8, '   - 사업내용 : ' + (master.bizNm || ''), 's', S_BODY_L); rh[r2c] = { hpt: 21 };

            push(emptyRow()); rh[r-1] = { hpt: 10.5 };

            // ── 3. 투찰내용 ──
            var salesAmtNum = Number(master.salesAmt) || 0;
            var salesAmtFmt = salesAmtNum.toLocaleString() + '원(VAT별도)';
            var r3nm = r; push(emptyRow()); mgst(r3nm, 1, r3nm, 8, '3. 투찰내용', 's', S_BODY_L); rh[r3nm] = { hpt: 21 };
            var r3a = r; push(emptyRow()); mgst(r3a, 1, r3a, 8, '   - 매출금액 : ' + salesAmtFmt, 's', S_BODY_L); rh[r3a] = { hpt: 21 };
            var r3b = r; push(emptyRow()); mgst(r3b, 1, r3b, 8, '   - 기안일자 : ' + fmtDate(master.apprDate), 's', S_BODY_L); rh[r3b] = { hpt: 21 };
            var r3c = r; push(emptyRow()); mgst(r3c, 1, r3c, 8, '   - 사업기간 : ' + fmtPeriod(master.projectFrom, master.projectTo), 's', S_BODY_L); rh[r3c] = { hpt: 21 };

            push(emptyRow()); rh[r-1] = { hpt: 10.5 };

            // ── 4. 기타 (content TEXT 흡수 — 줄 단위) ──
            var r4nm = r; push(emptyRow()); mgst(r4nm, 1, r4nm, 8, '4. 기타', 's', S_BODY_L); rh[r4nm] = { hpt: 21 };
            var contentLines = (master.content || '').split('\n').map(function(s){ return s.trim(); }).filter(function(s){ return s !== ''; });
            if (contentLines.length === 0) contentLines = ['(내용 없음)'];
            for (var ci = 0; ci < contentLines.length; ci++) {
                var line = contentLines[ci];
                if (/^[-·*•]/.test(line)) line = '   ' + line;
                else line = '   - ' + line;
                var rc = r; push(emptyRow());
                mgst(rc, 1, rc, 8, line, 's', S_BODY_L);
                rh[rc] = { hpt: 21 };
            }

            push(emptyRow()); rh[r-1] = { hpt: 10.5 };

            // ── 5. 예상손익(부가세 별도) — 선택 기안 손익 요약표 ──
            var r5nm = r; push(emptyRow()); mgst(r5nm, 1, r5nm, 8, '5. 예상손익(부가세 별도)', 's', S_BODY_L); rh[r5nm] = { hpt: 21 };

            var S_TBL_HDR = { font: { bold: true, name: 'KoPub돋움체 Medium', sz: 11, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '003399' } }, border: BD, alignment: { horizontal: 'center', vertical: 'center' } };
            var S_TBL_LBL = { font: { bold: true, name: 'KoPub돋움체 Medium', sz: 11 }, border: BD, alignment: { horizontal: 'center', vertical: 'center' } };
            var S_TBL_NUM = Object.assign({}, { font: { name: 'KoPub돋움체 Medium', sz: 11 }, border: BD, alignment: { horizontal: 'right', vertical: 'center' } }, { numFmt: '#,##0' });
            var S_TBL_PCT = Object.assign({}, { font: { name: 'KoPub돋움체 Medium', sz: 11 }, border: BD, alignment: { horizontal: 'right', vertical: 'center' } }, { numFmt: '0.00%' });
            var S_TBL_GLBL = { font: { bold: true, name: 'KoPub돋움체 Medium', sz: 11 }, fill: { fgColor: { rgb: '92D050' } }, border: BD, alignment: { horizontal: 'center', vertical: 'center' } };
            var S_TBL_GNUM = Object.assign({}, { font: { bold: true, name: 'KoPub돋움체 Medium', sz: 11 }, fill: { fgColor: { rgb: '92D050' } }, border: BD, alignment: { horizontal: 'right', vertical: 'center' } }, { numFmt: '#,##0' });
            var S_TBL_GPCT = Object.assign({}, { font: { bold: true, name: 'KoPub돋움체 Medium', sz: 11 }, fill: { fgColor: { rgb: '92D050' } }, border: BD, alignment: { horizontal: 'right', vertical: 'center' } }, { numFmt: '0.00%' });

            var rTblH = r; push(emptyRow());
            mgst(rTblH, 1, rTblH, 3, '구분', 's', S_TBL_HDR);
            mgst(rTblH, 4, rTblH, 6, '금액', 's', S_TBL_HDR);
            mgst(rTblH, 7, rTblH, 8, '구성비', 's', S_TBL_HDR);
            rh[rTblH] = { hpt: 21 };

            var costData = cost || {};
            var baseSales = Number(costData.salesAmt || master.salesAmt || 0);
            var profitFields = [
                { key: 'salesAmt',           label: '매출액',     green: false },
                { key: 'costAmt',            label: '매출원가',   green: false },
                { key: 'grossProfit',        label: '매출총이익', green: true },
                { key: 'directCost',         label: '직접비',     green: false },
                { key: 'contributionMargin', label: '공헌이익',   green: true },
                { key: 'indirectCost',       label: '간접비',     green: false },
                { key: 'operatingProfit',    label: '영업이익',   green: true }
            ];
            profitFields.forEach(function(f) {
                var rf = r; push(emptyRow());
                var lblS = f.green ? S_TBL_GLBL : S_TBL_LBL;
                var numS = f.green ? S_TBL_GNUM : S_TBL_NUM;
                var pctS = f.green ? S_TBL_GPCT : S_TBL_PCT;
                var v = Number(costData[f.key]);
                if (!v && f.key === 'salesAmt') v = Number(master.salesAmt) || 0;
                if (isNaN(v)) v = 0;
                var pctVal = baseSales > 0 ? v / baseSales : 0;
                mgst(rf, 1, rf, 3, f.label, 's', lblS);
                mgst(rf, 4, rf, 6, v, 'n', numS);
                mgst(rf, 7, rf, 8, pctVal, 'n', pctS);
                rh[rf] = { hpt: 21 };
            });

            push(emptyRow()); rh[r-1] = { hpt: 10.5 };

            // ── * 첨부 : 세부원가분석 ──
            var rAttach = r; push(emptyRow());
            mgst(rAttach, 1, rAttach, 8, '* 첨부 : 세부원가분석', 's', S_BODY_L);
            rh[rAttach] = { hpt: 21 };

            push(emptyRow()); rh[r-1] = { hpt: 18.75 };

            // ── 회사명 푸터 ──
            var S_FOOTER = { font: { name: 'KoPub돋움체 Medium', sz: 12 }, alignment: { horizontal: 'center', vertical: 'center' } };
            var rFooter = r; push(emptyRow());
            mgst(rFooter, 0, rFooter, 8, '(주)세정아이앤씨', 's', S_FOOTER);
            rh[rFooter] = { hpt: 21 };

            // 시트 생성
            var ws = XLSX.utils.aoa_to_sheet(rows);
            ws['!merges'] = merges;
            ws['!cols'] = [
                { wch: 12 }, // A: 라벨
                { wch: 12 }, // B
                { wch: 12 }, // C
                { wch: 9 },  // D: 담당
                { wch: 9 },  // E: 팀장
                { wch: 9 },  // F: 본부장
                { wch: 10 }, // G: 총괄임원
                { wch: 10 }, // H: 대표이사
                { wch: 18 }  // I: 회장님 / 문서종류
            ];
            var rowsArr = [];
            for (var k in rh) { if (rh.hasOwnProperty(k)) rowsArr[Number(k)] = rh[k]; }
            ws['!rows'] = rowsArr;
            for (var addr in ov) { if (ov.hasOwnProperty(addr)) ws[addr] = ov[addr]; }
            ws['!pageSetup'] = { orientation: 'portrait', paperSize: 9 };
            ws['!margins'] = { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 };

            var sheetName = '기안';
            var existNames = wb.SheetNames || [];
            if (existNames.indexOf(sheetName) >= 0) sheetName = '기안_' + (existNames.length + 1);
            XLSX.utils.book_append_sheet(wb, ws, sheetName);
        }

        var wb = XLSX.utils.book_new();

        // ── 첫 시트: 기안 (선택된 버전 = 마지막 항목 기준) ──
        var lastItem = dataList[dataList.length - 1];
        _writeApprovalSheet(wb, lastItem.master || {}, lastItem.cost);

        var firstApprNo = '';

        // 원가분석 시트는 최신 버전부터 왼쪽 순서로 추가 (dataList는 오름차순으로 들어옴)
        for (var di = dataList.length - 1; di >= 0; di--) {
            var master = dataList[di].master || {};
            var cost = dataList[di].cost;
            var details = dataList[di].details || [];
            var ver = dataList[di].version || 1;
            if (di === 0) firstApprNo = master.apprNo || '';

            var typeLabel = APPR_LABELS[master.apprType] || master.apprType || '사전';
            var sheetName = '(' + typeLabel + ')원가분석_v' + ver;
            // 시트명 중복 방지
            var existNames = wb.SheetNames || [];
            if (existNames.indexOf(sheetName) >= 0) {
                sheetName = '(' + typeLabel + ')원가분석_v' + ver + '_' + (di + 1);
            }
            if (sheetName.length > 31) sheetName = sheetName.substring(0, 31);

            var rows = [];
            var merges = [];
            var cellOverrides = {}; // { 'A1': {v, t, s} }
            var r = 0;

            function push(arr) { rows.push(arr); return r++; }
            function mg(r1, c1, r2, c2) { merges.push({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } }); }
            function setCell(row, col, val, type, style) {
                var addr = XLSX.utils.encode_cell({ r: row, c: col });
                cellOverrides[addr] = { v: val, t: type, s: style };
            }

            var months = calcMonths(master.projectFrom, master.projectTo);
            var salesAmt = n(cost ? cost.salesAmt : master.salesAmt);
            var productAmt = n(cost ? cost.productAmt : 0);
            var outsourceAmt = n(cost ? cost.outsourceAmt : 0);
            var costAmt = n(cost ? cost.costAmt : 0);
            var grossProfit = n(cost ? cost.grossProfit : 0);
            var laborCost = n(cost ? cost.laborCost : 0);
            var otherExpense = n(cost ? cost.otherExpense : 0);
            var otherExpRate = n(cost ? cost.otherExpenseRate : 10);
            var projectExpense = n(cost ? cost.projectExpense : 0);
            var directCost = n(cost ? cost.directCost : 0);
            var contributionMargin = n(cost ? cost.contributionMargin : 0);
            var indirectCost = n(cost ? cost.indirectCost : 0);
            var indirectRate = n(cost ? cost.indirectCostRate : 60);
            var operatingProfit = n(cost ? cost.operatingProfit : 0);
            function pct(v) { return salesAmt > 0 ? v / salesAmt : 0; }

            // ── 상단: 원가분석 요약 ──
            // Row 0: 타이틀
            var titleText = '[원가분석서] - ' + (master.custNm || '') + ' "' + (master.bizNm || '') + '"  (기간: ' + months + '개월)';
            var rr = push([titleText, '', '', '', '', '', '']);
            mg(rr, 0, rr, 6);

            // Row 1: VAT 제외
            rr = push(['', '', '', '', '', '', '[VAT 제외]']);

            // Row 2: 헤더
            rr = push(['', '구분', '', '금액', '구성비', '비고', '']);
            mg(rr, 0, rr, 2); mg(rr, 5, rr, 6);

            // Row 3: 1. 매출금액
            rr = push(['1. 매출금액', '', '', salesAmt, '', '', '']);
            mg(rr, 0, rr, 2);
            setCell(rr, 3, salesAmt, 'n', S_NUM);

            // Row 4: 2.1 상품
            rr = push(['2. 매출원가', '2.1 상품', '', productAmt, pct(productAmt), '', '']);
            setCell(rr, 3, productAmt, 'n', S_NUM);
            setCell(rr, 4, pct(productAmt), 'n', S_PCT);

            // Row 5: 2.2 외주
            rr = push(['', '2.2 외주 용역비', '', outsourceAmt, pct(outsourceAmt), '', '']);
            setCell(rr, 3, outsourceAmt, 'n', S_NUM);
            setCell(rr, 4, pct(outsourceAmt), 'n', S_PCT);

            // Row 6: 소계
            rr = push(['', '소계', '소계', costAmt, pct(costAmt), '', '']);
            setCell(rr, 3, costAmt, 'n', S_NUM_Y);

            // Row 7: 3. 매출 총이익
            rr = push(['3. 매출 총이익', '', '', grossProfit, pct(grossProfit), '매출액-매출원가', '']);
            mg(rr, 0, rr, 2); mg(rr, 5, rr, 6);
            setCell(rr, 3, grossProfit, 'n', S_NUM_Y);
            setCell(rr, 4, pct(grossProfit), 'n', S_PCT_Y);

            // Row 8: 4.1 인건비
            rr = push(['4. 직접비', '4.1 인건비', '직접노무비', laborCost, pct(laborCost), '투입인력 M/M', '']);
            setCell(rr, 3, laborCost, 'n', S_NUM);
            setCell(rr, 4, pct(laborCost), 'n', S_PCT);

            // Row 9: 4.2 기타경비
            rr = push(['', '4.2 기타경비', '기타경비', otherExpense, pct(otherExpense), '직접인건비대비', otherExpRate + '%']);
            setCell(rr, 3, otherExpense, 'n', S_NUM);
            setCell(rr, 4, pct(otherExpense), 'n', S_PCT);

            // Row 10: 4.3 프로젝트 경비
            rr = push(['', '4.3 프로젝트 경비', '프로젝트경비', projectExpense, pct(projectExpense), '프로젝트 직접경비', '']);
            setCell(rr, 3, projectExpense, 'n', S_NUM);
            setCell(rr, 4, pct(projectExpense), 'n', S_PCT);

            // Row 11: 직접비 소계
            rr = push(['', '소계', '소계', directCost, pct(directCost), '', '']);
            setCell(rr, 3, directCost, 'n', S_NUM_Y);

            // Row 12: 5. 공헌이익
            rr = push(['5. 공헌이익', '', '', contributionMargin, pct(contributionMargin), '매출총이익 - 직접비', '']);
            mg(rr, 0, rr, 2); mg(rr, 5, rr, 6);
            setCell(rr, 3, contributionMargin, 'n', S_NUM_Y);
            setCell(rr, 4, pct(contributionMargin), 'n', S_PCT_Y);

            // Row 13: 6. 간접비
            rr = push(['6. 간접비', '', '소계', indirectCost, pct(indirectCost), '직접인건비대비', indirectRate + '%']);
            mg(rr, 0, rr, 1);
            setCell(rr, 3, indirectCost, 'n', S_NUM_Y);
            setCell(rr, 4, pct(indirectCost), 'n', S_PCT_Y);

            // Row 14: 7. 영업이익
            rr = push(['7. 영업이익', '', '-', operatingProfit, pct(operatingProfit), '공헌이익 - 공통비', '']);
            mg(rr, 0, rr, 1); mg(rr, 5, rr, 6);
            setCell(rr, 3, operatingProfit, 'n', S_NUM_G);
            setCell(rr, 4, pct(operatingProfit), 'n', S_PCT_G);

            // 빈 행 2개
            push([]); push([]);

            // ── 하단: 세부내역 산출 근거 ──
            var products = details.filter(function(d) { return d.detail_type === 'PRODUCT' || d.detailType === 'PRODUCT'; });
            var outsources = details.filter(function(d) { return d.detail_type === 'OUTSOURCE' || d.detailType === 'OUTSOURCE'; });
            var labors = details.filter(function(d) { return d.detail_type === 'LABOR' || d.detailType === 'LABOR'; });
            var expenses = details.filter(function(d) { return d.detail_type === 'EXPENSE' || d.detailType === 'EXPENSE' || d.detail_type === 'PROJECT_EXPENSE' || d.detailType === 'PROJECT_EXPENSE'; });

            rr = push(['[세부내역 산출 근거]', '', '', '', '', '', '']);
            mg(rr, 0, rr, 6);

            // 2. 매출 원가
            rr = push(['2. 매출 원가', '', '', '', '', '', '[VAT 제외]']);
            rr = push(['', '구분', '평균단가(월)', '개,투입 M/M', '금액', '비고', '']);
            mg(rr, 5, rr, 6);

            // 2.1 상품
            rr = push(['2.1.상품', '', '', '', '', '', '']);
            var pTotal = 0;
            for (var pi = 0; pi < products.length; pi++) {
                var p = products[pi];
                var pAmt = n(p.total_amt || p.totalAmt);
                rr = push(['', p.item_nm || p.itemNm || '', n(p.unit_cost || p.unitCost), n(p.qty), pAmt, p.remark || '', '']);
                setCell(rr, 2, n(p.unit_cost || p.unitCost), 'n', S_NUM);
                setCell(rr, 3, n(p.qty), 'n', Object.assign({}, S_N, { numFmt: '#,##0.00', alignment: { horizontal: 'right' } }));
                setCell(rr, 4, pAmt, 'n', S_NUM);
                pTotal += pAmt;
            }
            rr = push(['', '소계', '', '', pTotal, '', '']);
            setCell(rr, 4, pTotal, 'n', S_NUM_Y);

            push([]);

            // 2.2 외주
            rr = push(['2.2 외주', '', '', '', '', '', '']);
            var oTotal = 0;
            for (var oi = 0; oi < outsources.length; oi++) {
                var o = outsources[oi];
                var oAmt = n(o.total_amt || o.totalAmt);
                rr = push(['', o.item_nm || o.itemNm || '', n(o.unit_cost || o.unitCost), n(o.qty), oAmt, o.remark || '', '']);
                setCell(rr, 2, n(o.unit_cost || o.unitCost), 'n', S_NUM);
                setCell(rr, 3, n(o.qty), 'n', Object.assign({}, S_N, { numFmt: '#,##0.00', alignment: { horizontal: 'right' } }));
                setCell(rr, 4, oAmt, 'n', S_NUM);
                oTotal += oAmt;
            }
            rr = push(['', '소계', '', '', oTotal, '', '']);
            setCell(rr, 4, oTotal, 'n', S_NUM_Y);

            rr = push(['', '합계', '', '', pTotal + oTotal, '', '']);
            setCell(rr, 4, pTotal + oTotal, 'n', S_NUM_Y);

            push([]); push([]);

            // 3. 제경비
            rr = push(['3. 제경비', '', '', '', '', '', '[VAT 제외]']);
            rr = push(['', '구분', '평균단가', '개,투입 M/M', '금액', '비고', '']);
            mg(rr, 5, rr, 6);

            // 3.1 직접비
            rr = push(['3.1 직접비', '', '', '', '', '', '']);
            var lTotal = 0, lMmTotal = 0;
            for (var li = 0; li < labors.length; li++) {
                var l = labors[li];
                var lAmt = n(l.total_amt || l.totalAmt);
                var lQty = n(l.qty);
                rr = push(['', l.item_nm || l.itemNm || '', n(l.unit_cost || l.unitCost), lQty || '-', lAmt || '-', l.remark || '', '']);
                setCell(rr, 2, n(l.unit_cost || l.unitCost), 'n', S_NUM);
                if (lQty > 0) setCell(rr, 3, lQty, 'n', Object.assign({}, S_N, { numFmt: '#,##0.00', alignment: { horizontal: 'right' } }));
                if (lAmt > 0) setCell(rr, 4, lAmt, 'n', S_NUM);
                lTotal += lAmt;
                lMmTotal += lQty;
            }
            rr = push(['', '소계', '', lMmTotal, lTotal, '', '']);
            setCell(rr, 3, lMmTotal, 'n', Object.assign({}, S_Y, { numFmt: '#,##0.00', alignment: { horizontal: 'right' } }));
            setCell(rr, 4, lTotal, 'n', S_NUM_Y);

            push([]);

            // 3.2 프로젝트 경비
            rr = push(['3.2 프로젝트', '', '', '', '', '', '']);
            rr = push(['경비', '', '', '', '', '', '']);
            var eTotal = 0;
            for (var ei = 0; ei < expenses.length; ei++) {
                var e = expenses[ei];
                var eAmt = n(e.total_amt || e.totalAmt);
                var eQty = n(e.qty);
                rr = push(['', e.item_nm || e.itemNm || '', n(e.unit_cost || e.unitCost), eQty || '-', eAmt || '-', e.remark || '', '']);
                setCell(rr, 2, n(e.unit_cost || e.unitCost), 'n', S_NUM);
                if (eQty > 0) setCell(rr, 3, eQty, 'n', Object.assign({}, S_N, { numFmt: '#,##0.00', alignment: { horizontal: 'right' } }));
                if (eAmt > 0) setCell(rr, 4, eAmt, 'n', S_NUM);
                eTotal += eAmt;
            }
            rr = push(['', '소계', '', '-', eTotal, '', '']);
            setCell(rr, 4, eTotal, 'n', S_NUM_Y);

            rr = push(['', '합계', '', '', lTotal + eTotal, '', '']);
            setCell(rr, 4, lTotal + eTotal, 'n', S_NUM_Y);

            // ── 시트 생성 ──
            var ws = XLSX.utils.aoa_to_sheet(rows);
            ws['!merges'] = merges;
            ws['!cols'] = [{ wch: 15.33 }, { wch: 21.08 }, { wch: 13 }, { wch: 15.66 }, { wch: 11 }, { wch: 28.41 }, { wch: 9.41 }];
            ws['!pageSetup'] = { orientation: 'portrait', paperSize: 9, scale: 69 };
            ws['!margins'] = { left: 0.4, right: 0.4, top: 0.4, bottom: 0.4, header: 0.3, footer: 0.3 };
            ws['!printArea'] = 'A1:G' + rows.length;

            // 행별 스타일 일괄 적용
            var summaryEnd = 16; // 원가분석 요약 끝 (row 0~14 + 빈행 2개)
            for (var ri = 0; ri < rows.length; ri++) {
                for (var ci = 0; ci < 7; ci++) {
                    var addr = XLSX.utils.encode_cell({ r: ri, c: ci });
                    if (!ws[addr]) ws[addr] = { v: '', t: 's' };
                    // cellOverrides가 있으면 우선 적용
                    if (cellOverrides[addr]) {
                        ws[addr] = cellOverrides[addr];
                        continue;
                    }
                    // 기본 스타일
                    var rv = rows[ri];
                    if (ri === 0) { ws[addr].s = S_TITLE; }
                    else if (ri === 1 && ci === 6) { ws[addr].s = S_RIGHT; }
                    else if (ri === 2) { ws[addr].s = S_HDR; }
                    else if (ri >= 3 && ri <= 14) {
                        // 원가분석 요약 영역
                        var label0 = String(rv[0] || '');
                        if (label0.indexOf('3. 매출') >= 0 || label0.indexOf('5. 공헌') >= 0) { ws[addr].s = S_Y; }
                        else if (label0.indexOf('6. 간접') >= 0) { ws[addr].s = S_Y; }
                        else if (label0.indexOf('7. 영업') >= 0) { ws[addr].s = S_G; }
                        else if (String(rv[1] || '') === '소계') { ws[addr].s = (ci <= 2) ? S_Y : S_N; }
                        else if (label0.indexOf('0. 총') >= 0 || label0.indexOf('2. 매출') >= 0 || label0.indexOf('4. 직접') >= 0) { ws[addr].s = (ci === 0) ? S_B : S_N; }
                        else { ws[addr].s = S_N; }
                    }
                    else if (ri > summaryEnd) {
                        // 세부내역 영역
                        var lbl = String(rv[0] || '');
                        var lbl1 = String(rv[1] || '');
                        if (lbl.indexOf('[세부내역') >= 0) { ws[addr].s = S_TITLE; }
                        else if (lbl.indexOf('2. 매출') >= 0 || lbl.indexOf('3. 제경비') >= 0) { ws[addr].s = S_B; }
                        else if (lbl1 === '구분') { ws[addr].s = S_HDR; }
                        else if (lbl1 === '소계' || lbl1 === '합계') { ws[addr].s = (ci <= 3) ? S_Y : S_N; }
                        else if (lbl.indexOf('.') >= 0 && lbl.indexOf('상품') >= 0 || lbl.indexOf('외주') >= 0 || lbl.indexOf('직접비') >= 0 || lbl.indexOf('프로젝트') >= 0 || lbl.indexOf('경비') >= 0) { ws[addr].s = S_B; }
                        else if (rv.length > 1 && rv[1]) { ws[addr].s = S_N; }
                    }
                }
            }

            XLSX.utils.book_append_sheet(wb, ws, sheetName);
        }

        // 파일명: (선택된 기안종류)사업명_문서번호.xlsx
        var selMaster = lastItem.master || {};
        var selTypeLbl = APPR_LABELS[selMaster.apprType] || selMaster.apprType || '';
        var selBizNm = selMaster.bizNm || selMaster.projectNm || '';
        var selApprNo = selMaster.apprNo || firstApprNo || 'export';
        var safeName = function(s) { return String(s || '').replace(/[\\/:*?"<>|]/g, ''); };
        var fileName = '(' + selTypeLbl + ')' + safeName(selBizNm) + '_' + safeName(selApprNo) + '.xlsx';
        XLSX.writeFile(wb, fileName);
    }

    /**
     * 범용 서버사이드 Excel 다운로드
     * @param {string} url - POST 엔드포인트
     * @param {Object} param - 요청 파라미터
     * @param {string} filename - 다운로드 파일명 (.xlsx 포함)
     */
    function downloadExcel(url, param, filename) {
        FormaPopup.loading.show();
        fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(param)
        }).then(function(res) {
            FormaPopup.loading.hide();
            if (res.status === 401) { location.href = '/login.html?error=token_expired'; return; }
            if (!res.ok) { FormaPopup.toast.error('Excel 다운로드에 실패했습니다.'); return; }
            return res.blob();
        }).then(function(blob) {
            if (!blob) return;
            var a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = filename;
            a.click();
            URL.revokeObjectURL(a.href);
            FormaPopup.toast.success('Excel 다운로드 완료');
        }).catch(function() {
            FormaPopup.loading.hide();
            FormaPopup.toast.error('Excel 다운로드에 실패했습니다.');
        });
    }

    return {
        meetingToPdf: meetingToPdf,
        meetingToExcel: meetingToExcel,
        approvalToExcel: approvalToExcel,
        downloadExcel: downloadExcel
    };
})();
