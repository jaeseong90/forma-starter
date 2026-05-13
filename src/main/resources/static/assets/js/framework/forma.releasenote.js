// FORMA 릴리즈노트 자동 표시 모듈
// 사용: FormaReleaseNote.show({ target: 'DESKTOP' })
//   localStorage에 마지막 본 버전 저장 → 새 노트 있을 때만 모달
(function(global) {
    'use strict';

    var STORAGE_PREFIX = 'lastSeenReleaseVersion_';
    var CATEGORY_BADGE = {
        NEW:     { label: 'NEW',     color: '#3b82f6' },
        IMPROVE: { label: '개선',    color: '#10b981' },
        BUGFIX:  { label: 'FIX',     color: '#f59e0b' },
        NOTICE:  { label: '공지',    color: '#8b5cf6' }
    };

    function compareVersion(a, b) {
        // semver 단순 비교: '1.10.0' > '1.9.0'
        var ap = (a || '').split('.').map(Number);
        var bp = (b || '').split('.').map(Number);
        for (var i = 0; i < Math.max(ap.length, bp.length); i++) {
            var av = ap[i] || 0, bv = bp[i] || 0;
            if (av !== bv) return av - bv;
        }
        return 0;
    }

    function fmtDate(d) {
        if (!d) return '';
        var s = String(d);
        if (s.length === 8) return s.substring(0,4) + '.' + s.substring(4,6) + '.' + s.substring(6,8);
        return s;
    }

    function escapeHtml(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function buildModalHtml(notes) {
        var html = '';
        notes.forEach(function(n, idx) {
            html += '<div style="margin-bottom:18px;' + (idx > 0 ? 'border-top:1px solid var(--border-light);padding-top:14px;' : '') + '">';
            html += '<div style="display:flex;align-items:baseline;gap:10px;margin-bottom:6px">';
            html += '<span style="font-size:16px;font-weight:700;color:var(--primary)">v' + escapeHtml(n.version) + '</span>';
            html += '<span style="font-size:12px;color:var(--text-sub)">' + fmtDate(n.releaseDate) + '</span>';
            html += '</div>';
            html += '<div style="font-size:14px;font-weight:600;margin-bottom:8px;color:var(--text)">' + escapeHtml(n.title) + '</div>';
            if (n.summary) {
                html += '<div style="font-size:12px;color:var(--text-sub);margin-bottom:10px;white-space:pre-line">' + escapeHtml(n.summary) + '</div>';
            }
            var items = n.items || [];
            if (items.length > 0) {
                html += '<ul style="list-style:none;padding:0;margin:0">';
                items.forEach(function(it) {
                    var bg = CATEGORY_BADGE[it.category] || { label: it.category || '항목', color: '#6b7280' };
                    html += '<li style="display:flex;gap:8px;align-items:flex-start;padding:4px 0;font-size:13px;color:var(--text)">';
                    html += '<span style="flex:0 0 auto;background:' + bg.color + ';color:#fff;font-size:10px;font-weight:700;padding:2px 7px;border-radius:10px;margin-top:2px">' + escapeHtml(bg.label) + '</span>';
                    html += '<span style="white-space:pre-line">' + escapeHtml(it.content) + '</span>';
                    html += '</li>';
                });
                html += '</ul>';
            }
            html += '</div>';
        });
        return html;
    }

    function showModal(notes, target) {
        var overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;background:var(--bg-overlay,rgba(0,0,0,0.45));z-index:10000;display:flex;align-items:center;justify-content:center';

        var box = document.createElement('div');
        box.style.cssText = 'background:var(--bg-card);color:var(--text);border:1px solid var(--border);border-radius:10px;box-shadow:0 12px 48px var(--shadow);width:560px;max-height:78vh;display:flex;flex-direction:column;overflow:hidden';

        var header = document.createElement('div');
        header.style.cssText = 'padding:14px 20px;border-bottom:1px solid var(--border-light);display:flex;align-items:center;justify-content:space-between';
        header.innerHTML = '<div style="font-size:15px;font-weight:700">📢 새로운 업데이트 (' + notes.length + '건)</div>' +
            '<button id="rls-close" style="border:none;background:none;font-size:20px;cursor:pointer;color:var(--text-sub);line-height:1">&times;</button>';

        var body = document.createElement('div');
        body.style.cssText = 'flex:1;overflow-y:auto;padding:18px 20px';
        body.innerHTML = buildModalHtml(notes);

        var footer = document.createElement('div');
        footer.style.cssText = 'padding:10px 20px;border-top:1px solid var(--border-light);display:flex;justify-content:space-between;align-items:center';
        footer.innerHTML = '<label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;color:var(--text-sub)">' +
            '<input type="checkbox" id="rls-dont-show" checked> 다시 보지 않기</label>' +
            '<button class="forma-btn forma-btn-primary" id="rls-ok">확인</button>';

        box.appendChild(header);
        box.appendChild(body);
        box.appendChild(footer);
        overlay.appendChild(box);
        document.body.appendChild(overlay);

        function close() {
            var dontShow = box.querySelector('#rls-dont-show').checked;
            if (dontShow) {
                // 가장 최신 버전 저장
                var maxVer = notes.reduce(function(a, n) {
                    return compareVersion(n.version, a) > 0 ? n.version : a;
                }, '0.0.0');
                try { localStorage.setItem(STORAGE_PREFIX + target, maxVer); } catch(e) {}
            }
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        }
        box.querySelector('#rls-close').onclick = close;
        box.querySelector('#rls-ok').onclick = close;
    }

    async function show(opts) {
        opts = opts || {};
        var target = opts.target || 'DESKTOP';
        if (typeof platform === 'undefined' || !platform.post) return;

        var lastSeen = '';
        try { lastSeen = localStorage.getItem(STORAGE_PREFIX + target) || ''; } catch(e) {}

        try {
            var res = await platform.post('/rls010/selectActiveByTarget', { target: target }, { loading: false });
            if (!res || res.resultCode !== 'OK' || !res.resultData) return;
            var notes = res.resultData;
            var newNotes = notes.filter(function(n) {
                return !lastSeen || compareVersion(n.version, lastSeen) > 0;
            });
            if (newNotes.length === 0) return;
            showModal(newNotes, target);
        } catch (e) { /* 조용히 무시 */ }
    }

    global.FormaReleaseNote = { show: show };
})(typeof window !== 'undefined' ? window : this);
