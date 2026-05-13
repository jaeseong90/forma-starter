/**
 * FormaCalendar — 캘린더 컴포넌트 (월간/주간 뷰)
 *
 * var calendar = new FormaCalendar('#container', {
 *     view: 'month',
 *     startDay: 0,            // 0=일요일, 1=월요일
 *     locale: 'ko',
 *     events: [],
 *     onDateClick: function(date) {},
 *     onEventClick: function(event) {},
 *     onMonthChange: function(year, month) {},
 *     onViewChange: function(view) {},
 *     colorMap: { VISIT: '#4a90d9', CALL: '#34d399' }
 * });
 */
(function() {
    'use strict';

    /* ── CSS 주입 ─────────────────────────────────────── */
    const STYLE_ID = 'forma-calendar-style';
    if (!document.getElementById(STYLE_ID)) {
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = [
            '.forma-calendar { background:var(--bg-card,#fff); border:1px solid var(--border,#e0e0e0); border-radius:4px; font-family:inherit; font-size:12px; color:var(--text,#333); user-select:none; display:flex; flex-direction:column; overflow:hidden; }',

            /* 헤더 */
            '.forma-cal-header { display:flex; align-items:center; justify-content:space-between; padding:8px 12px; border-bottom:1px solid var(--border,#e0e0e0); background:var(--bg-header,#f8f8f8); }',
            '.forma-cal-nav { display:flex; align-items:center; gap:4px; }',
            '.forma-cal-nav-btn { width:28px; height:28px; border:1px solid var(--border,#e0e0e0); border-radius:3px; background:var(--bg-card,#fff); cursor:pointer; font-size:14px; line-height:28px; text-align:center; color:var(--text,#333); }',
            '.forma-cal-nav-btn:hover { background:var(--bg-alt,#fafbfc); }',
            '.forma-cal-title { font-size:14px; font-weight:600; margin:0 8px; white-space:nowrap; }',
            '.forma-cal-actions { display:flex; align-items:center; gap:4px; }',
            '.forma-cal-actions .forma-btn { height:26px; padding:0 10px; font-size:11px; }',
            '.forma-cal-actions .forma-btn.active { background:var(--primary,#4a90d9); color:var(--primary-text,#fff); border-color:var(--primary,#4a90d9); }',

            /* 월간 뷰 */
            '.forma-cal-month { display:flex; flex-direction:column; flex:1; }',
            '.forma-cal-dow { display:grid; grid-template-columns:repeat(7,1fr); border-bottom:1px solid var(--border,#e0e0e0); background:var(--bg-header,#f8f8f8); }',
            '.forma-cal-dow-cell { padding:6px 4px; text-align:center; font-weight:600; font-size:11px; color:var(--text-sub,#555); }',
            '.forma-cal-dow-cell.sun { color:var(--danger,#e24b4a); }',
            '.forma-cal-dow-cell.sat { color:var(--primary,#4a90d9); }',
            '.forma-cal-body { display:grid; grid-template-columns:repeat(7,1fr); flex:1; }',
            '.forma-cal-cell { border-right:1px solid var(--border-light,#eee); border-bottom:1px solid var(--border-light,#eee); padding:2px 4px; min-height:80px; cursor:pointer; overflow:hidden; position:relative; }',
            '.forma-cal-cell:nth-child(7n) { border-right:none; }',
            '.forma-cal-cell:hover { background:var(--bg-cal-hover,var(--bg-hover,#f0f7ff)); }',
            '.forma-cal-cell.other-month { background:var(--bg-alt,#fafbfc); }',
            '.forma-cal-cell.other-month .forma-cal-date { color:var(--text-muted,#999); }',
            '.forma-cal-cell.today { background:rgba(74,144,217,0.06); }',
            '.forma-cal-cell.today .forma-cal-date { background:var(--primary,#4a90d9); color:#fff; border-radius:50%; width:22px; height:22px; line-height:22px; text-align:center; }',
            '.forma-cal-date { font-size:12px; font-weight:500; margin-bottom:2px; display:inline-block; }',
            '.forma-cal-date.sun { color:var(--danger,#e24b4a); }',
            '.forma-cal-date.sat { color:var(--primary,#4a90d9); }',

            /* 이벤트 바 */
            '.forma-cal-event { display:flex; align-items:center; padding:1px 4px; margin-bottom:1px; border-radius:2px; font-size:10px; line-height:16px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:#fff; cursor:pointer; }',
            '.forma-cal-event:hover { opacity:0.85; }',
            '.forma-cal-more { font-size:10px; color:var(--primary,#4a90d9); cursor:pointer; padding:0 4px; }',
            '.forma-cal-more:hover { text-decoration:underline; }',

            /* 주간 뷰 */
            '.forma-cal-week { display:flex; flex-direction:column; flex:1; overflow:hidden; }',
            '.forma-cal-week-header { display:grid; grid-template-columns:56px repeat(7,1fr); border-bottom:1px solid var(--border,#e0e0e0); background:var(--bg-header,#f8f8f8); }',
            '.forma-cal-week-hcell { padding:6px 4px; text-align:center; font-size:11px; font-weight:600; color:var(--text-sub,#555); border-right:1px solid var(--border-light,#eee); }',
            '.forma-cal-week-hcell:last-child { border-right:none; }',
            '.forma-cal-week-hcell.sun { color:var(--danger,#e24b4a); }',
            '.forma-cal-week-hcell.sat { color:var(--primary,#4a90d9); }',
            '.forma-cal-week-hcell.today { background:rgba(74,144,217,0.08); }',
            '.forma-cal-week-body { flex:1; overflow-y:auto; position:relative; }',
            '.forma-cal-week-grid { display:grid; grid-template-columns:56px repeat(7,1fr); }',
            '.forma-cal-week-time { padding:4px 6px; text-align:right; font-size:10px; color:var(--text-muted,#999); border-right:1px solid var(--border-light,#eee); border-bottom:1px solid var(--border-light,#eee); height:48px; }',
            '.forma-cal-week-slot { border-right:1px solid var(--border-light,#eee); border-bottom:1px solid var(--border-light,#eee); height:48px; position:relative; cursor:pointer; }',
            '.forma-cal-week-slot:last-child { border-right:none; }',
            '.forma-cal-week-slot:hover { background:var(--bg-cal-hover,var(--bg-hover,#f0f7ff)); }',
            '.forma-cal-week-slot.today { background:rgba(74,144,217,0.04); }',
            '.forma-cal-week-event { position:absolute; left:2px; right:2px; padding:2px 4px; border-radius:2px; font-size:10px; line-height:14px; color:#fff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; cursor:pointer; z-index:1; }',
            '.forma-cal-week-event:hover { opacity:0.85; }'
        ].join('\n');
        document.head.appendChild(style);
    }

    /* ── 기본 색상맵 ─────────────────────────────────── */
    const DEFAULT_COLORS = {
        VISIT: '#4a90d9',
        CALL: '#34d399',
        MEETING: '#f59e0b',
        INTERNAL: '#8b5cf6',
        OTHER: '#6b7280'
    };

    const DAY_NAMES_KO = ['일', '월', '화', '수', '목', '금', '토'];
    const DAY_NAMES_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const MONTH_NAMES_KO = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
    const MAX_VISIBLE_EVENTS = 3;

    /* ── 유틸리티 ─────────────────────────────────────── */
    function pad2(n) { return n < 10 ? '0' + n : '' + n; }

    function formatYmd(d) {
        return '' + d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate());
    }

    function parseYmd(s) {
        if (!s) return null;
        const str = ('' + s).replace(/[-\/]/g, '');
        const y = parseInt(str.substring(0, 4), 10);
        const m = parseInt(str.substring(4, 6), 10) - 1;
        const day = parseInt(str.substring(6, 8), 10) || 1;
        return new Date(y, m, day);
    }

    function sameDay(a, b) {
        return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    }

    function addDays(d, n) {
        const r = new Date(d);
        r.setDate(r.getDate() + n);
        return r;
    }

    function todayDate() {
        const n = new Date();
        return new Date(n.getFullYear(), n.getMonth(), n.getDate());
    }

    function el(tag, cls, text) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text !== undefined) e.textContent = text;
        return e;
    }

    /* ── FormaCalendar 클래스 ────────────────────────── */
    function FormaCalendar(selector, options) {
        options = options || {};
        this.container = typeof selector === 'string' ? document.querySelector(selector) : selector;
        if (!this.container) return;

        this.view = options.view || 'month';
        this.startDay = options.startDay === 1 ? 1 : 0;
        this.locale = options.locale || 'ko';
        this.events = (options.events || []).slice();
        this.colorMap = Object.assign({}, DEFAULT_COLORS, options.colorMap || {});
        this.onDateClick = options.onDateClick || null;
        this.onEventClick = options.onEventClick || null;
        this.onMonthChange = options.onMonthChange || null;
        this.onViewChange = options.onViewChange || null;

        const now = new Date();
        this._year = now.getFullYear();
        this._month = now.getMonth();
        this._weekStart = null;
        this._destroyed = false;

        this._buildIndex();
        this._render();
    }

    /* 이벤트 날짜 인덱스 구축 */
    FormaCalendar.prototype._buildIndex = function() {
        this._eventMap = {};
        for (let i = 0; i < this.events.length; i++) {
            const ev = this.events[i];
            const dateStr = ('' + ev.date).replace(/[-\/]/g, '');
            if (!this._eventMap[dateStr]) this._eventMap[dateStr] = [];
            this._eventMap[dateStr].push(ev);
        }
    };

    FormaCalendar.prototype._getEventColor = function(ev) {
        if (ev.color) return ev.color;
        if (ev.type && this.colorMap[ev.type]) return this.colorMap[ev.type];
        return this.colorMap.OTHER || '#6b7280';
    };

    FormaCalendar.prototype._dayNames = function() {
        const names = this.locale === 'ko' ? DAY_NAMES_KO.slice() : DAY_NAMES_EN.slice();
        if (this.startDay === 1) {
            names.push(names.shift());
        }
        return names;
    };

    /* ── 렌더 진입점 ─────────────────────────────────── */
    FormaCalendar.prototype._render = function() {
        if (this._destroyed) return;
        this.container.innerHTML = '';
        this.container.classList.add('forma-calendar');

        this._renderHeader();
        if (this.view === 'month') {
            this._renderMonth();
        } else {
            this._renderWeek();
        }
    };

    /* ── 헤더 ─────────────────────────────────────────── */
    FormaCalendar.prototype._renderHeader = function() {
        const self = this;
        const header = el('div', 'forma-cal-header');

        /* 네비게이션 */
        const nav = el('div', 'forma-cal-nav');
        const prevBtn = el('button', 'forma-cal-nav-btn', '\u25C0');
        prevBtn.title = '이전';
        prevBtn.onclick = function() { self.prev(); };
        const nextBtn = el('button', 'forma-cal-nav-btn', '\u25B6');
        nextBtn.title = '다음';
        nextBtn.onclick = function() { self.next(); };

        const titleEl = el('span', 'forma-cal-title');
        titleEl.textContent = this._getTitle();
        this._titleEl = titleEl;

        nav.appendChild(prevBtn);
        nav.appendChild(titleEl);
        nav.appendChild(nextBtn);
        header.appendChild(nav);

        /* 액션 버튼 */
        const actions = el('div', 'forma-cal-actions');

        const todayBtn = el('button', 'forma-btn', '오늘');
        todayBtn.onclick = function() { self.today(); };
        actions.appendChild(todayBtn);

        const monthBtn = el('button', 'forma-btn' + (this.view === 'month' ? ' active' : ''), '월');
        monthBtn.onclick = function() { self.setView('month'); };
        const weekBtn = el('button', 'forma-btn' + (this.view === 'week' ? ' active' : ''), '주');
        weekBtn.onclick = function() { self.setView('week'); };
        actions.appendChild(monthBtn);
        actions.appendChild(weekBtn);

        header.appendChild(actions);
        this.container.appendChild(header);
    };

    FormaCalendar.prototype._getTitle = function() {
        if (this.view === 'month') {
            return this._year + '\uB144 ' + (this._month + 1) + '\uC6D4';
        }
        const ws = this._getWeekStart();
        const we = addDays(ws, 6);
        const fmt = function(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); };
        return fmt(ws) + ' ~ ' + fmt(we);
    };

    FormaCalendar.prototype._getWeekStart = function() {
        if (this._weekStart) return new Date(this._weekStart);
        const d = new Date(this._year, this._month, 1);
        const day = d.getDay();
        const diff = (day - this.startDay + 7) % 7;
        d.setDate(d.getDate() - diff);
        this._weekStart = new Date(d);
        return new Date(d);
    };

    /* ── 월간 뷰 ─────────────────────────────────────── */
    FormaCalendar.prototype._renderMonth = function() {
        const self = this;
        const wrap = el('div', 'forma-cal-month');

        /* 요일 헤더 */
        const dow = el('div', 'forma-cal-dow');
        const names = this._dayNames();
        for (let i = 0; i < 7; i++) {
            const dayIdx = (this.startDay + i) % 7;
            let cls = 'forma-cal-dow-cell';
            if (dayIdx === 0) cls += ' sun';
            if (dayIdx === 6) cls += ' sat';
            dow.appendChild(el('div', cls, names[i]));
        }
        wrap.appendChild(dow);

        /* 달력 셀 계산 */
        const firstDay = new Date(this._year, this._month, 1);
        const startOffset = (firstDay.getDay() - this.startDay + 7) % 7;
        const gridStart = addDays(firstDay, -startOffset);

        /* 행 수: 최소 5주, 6주가 필요하면 6주 */
        const lastDay = new Date(this._year, this._month + 1, 0);
        const endOffset = (6 - lastDay.getDay() + this.startDay) % 7;
        const gridEnd = addDays(lastDay, endOffset);
        let totalDays = Math.round((gridEnd - gridStart) / 86400000) + 1;
        if (totalDays < 42) totalDays = 42;

        const body = el('div', 'forma-cal-body');
        const todayStr = formatYmd(todayDate());

        for (let d = 0; d < totalDays; d++) {
            const cur = addDays(gridStart, d);
            const ymd = formatYmd(cur);
            const dayOfWeek = cur.getDay();
            const isOther = cur.getMonth() !== this._month;
            const isToday = ymd === todayStr;

            let cellCls = 'forma-cal-cell';
            if (isOther) cellCls += ' other-month';
            if (isToday) cellCls += ' today';

            const cell = el('div', cellCls);
            cell.dataset.date = ymd;

            /* 날짜 숫자 */
            let dateCls = 'forma-cal-date';
            if (dayOfWeek === 0) dateCls += ' sun';
            if (dayOfWeek === 6) dateCls += ' sat';
            cell.appendChild(el('div', dateCls, '' + cur.getDate()));

            /* 이벤트 */
            const dayEvents = this._eventMap[ymd] || [];
            const visCount = Math.min(dayEvents.length, MAX_VISIBLE_EVENTS);
            for (let e = 0; e < visCount; e++) {
                const evEl = this._createEventBar(dayEvents[e]);
                cell.appendChild(evEl);
            }
            if (dayEvents.length > MAX_VISIBLE_EVENTS) {
                const more = el('div', 'forma-cal-more', '+' + (dayEvents.length - MAX_VISIBLE_EVENTS) + ' more');
                (function(dateStr) {
                    more.onclick = function(evt) {
                        evt.stopPropagation();
                        if (self.onDateClick) self.onDateClick(dateStr);
                    };
                })(ymd);
                cell.appendChild(more);
            }

            /* 셀 클릭 */
            (function(dateStr) {
                cell.onclick = function() {
                    if (self.onDateClick) self.onDateClick(dateStr);
                };
            })(ymd);

            body.appendChild(cell);
        }

        wrap.appendChild(body);
        this.container.appendChild(wrap);
    };

    FormaCalendar.prototype._createEventBar = function(ev) {
        const self = this;
        const bar = el('div', 'forma-cal-event', ev.title || '');
        bar.style.backgroundColor = this._getEventColor(ev);
        bar.title = ev.title || '';
        bar.onclick = function(e) {
            e.stopPropagation();
            if (self.onEventClick) self.onEventClick(ev);
        };
        return bar;
    };

    /* ── 주간 뷰 ─────────────────────────────────────── */
    FormaCalendar.prototype._renderWeek = function() {
        const self = this;
        const wrap = el('div', 'forma-cal-week');
        const ws = this._getWeekStart();
        const todayStr = formatYmd(todayDate());
        const names = this._dayNames();

        /* 헤더 (시간 | 일~토) */
        const header = el('div', 'forma-cal-week-header');
        const corner = el('div', 'forma-cal-week-hcell', '시간');
        header.appendChild(corner);

        for (let c = 0; c < 7; c++) {
            const cd = addDays(ws, c);
            const dayOfWeek = cd.getDay();
            let cls = 'forma-cal-week-hcell';
            if (dayOfWeek === 0) cls += ' sun';
            if (dayOfWeek === 6) cls += ' sat';
            if (formatYmd(cd) === todayStr) cls += ' today';
            const label = names[c] + cd.getDate();
            header.appendChild(el('div', cls, label));
        }
        wrap.appendChild(header);

        /* 본문 (시간 슬롯) */
        const body = el('div', 'forma-cal-week-body');
        const grid = el('div', 'forma-cal-week-grid');

        for (let h = 0; h < 24; h++) {
            const timeLabel = pad2(h) + ':00';
            grid.appendChild(el('div', 'forma-cal-week-time', timeLabel));

            for (let col = 0; col < 7; col++) {
                const slotDate = addDays(ws, col);
                const slotYmd = formatYmd(slotDate);
                let slotCls = 'forma-cal-week-slot';
                if (slotYmd === todayStr) slotCls += ' today';

                const slot = el('div', slotCls);
                slot.dataset.date = slotYmd;
                slot.dataset.hour = h;

                /* 해당 시간의 이벤트 매칭 */
                const dayEvents = this._eventMap[slotYmd] || [];
                for (let ei = 0; ei < dayEvents.length; ei++) {
                    const ev = dayEvents[ei];
                    const evHour = this._getEventHour(ev);
                    if (evHour === h) {
                        const duration = this._getEventDuration(ev);
                        const evEl = el('div', 'forma-cal-week-event', ev.title || '');
                        evEl.style.backgroundColor = this._getEventColor(ev);
                        evEl.style.top = '1px';
                        evEl.style.height = (duration * 48 - 2) + 'px';
                        evEl.title = ev.title || '';
                        (function(event) {
                            evEl.onclick = function(e) {
                                e.stopPropagation();
                                if (self.onEventClick) self.onEventClick(event);
                            };
                        })(ev);
                        slot.appendChild(evEl);
                    }
                }

                /* 슬롯 클릭 */
                (function(dateStr) {
                    slot.onclick = function() {
                        if (self.onDateClick) self.onDateClick(dateStr);
                    };
                })(slotYmd);

                grid.appendChild(slot);
            }
        }

        body.appendChild(grid);
        wrap.appendChild(body);
        this.container.appendChild(wrap);

        /* 09:00으로 스크롤 */
        body.scrollTop = 48 * 9;
    };

    FormaCalendar.prototype._getEventHour = function(ev) {
        if (ev.time) {
            const t = ('' + ev.time).replace(/[:\-]/g, '');
            return parseInt(t.substring(0, 2), 10) || 0;
        }
        return 9;
    };

    FormaCalendar.prototype._getEventDuration = function(ev) {
        if (ev.time && ev.endTime) {
            const sh = parseInt(('' + ev.time).replace(/[:\-]/g, '').substring(0, 2), 10) || 0;
            const sm = parseInt(('' + ev.time).replace(/[:\-]/g, '').substring(2, 4), 10) || 0;
            const eh = parseInt(('' + ev.endTime).replace(/[:\-]/g, '').substring(0, 2), 10) || 0;
            const em = parseInt(('' + ev.endTime).replace(/[:\-]/g, '').substring(2, 4), 10) || 0;
            const diff = (eh * 60 + em) - (sh * 60 + sm);
            return Math.max(diff / 60, 0.5);
        }
        return 1;
    };

    /* ── Public API ───────────────────────────────────── */

    /** 이벤트 전체 교체 */
    FormaCalendar.prototype.setEvents = function(events) {
        this.events = (events || []).slice();
        this._buildIndex();
        this._render();
    };

    /** 이벤트 단건 추가 */
    FormaCalendar.prototype.addEvent = function(event) {
        if (!event) return;
        this.events.push(event);
        const dateStr = ('' + event.date).replace(/[-\/]/g, '');
        if (!this._eventMap[dateStr]) this._eventMap[dateStr] = [];
        this._eventMap[dateStr].push(event);
        this._render();
    };

    /** 이벤트 삭제 (id 기준) */
    FormaCalendar.prototype.removeEvent = function(id) {
        this.events = this.events.filter(function(ev) { return ev.id !== id; });
        this._buildIndex();
        this._render();
    };

    /** 뷰 전환 */
    FormaCalendar.prototype.setView = function(view) {
        if (view !== 'month' && view !== 'week') return;
        if (view === this.view) return;
        this.view = view;
        if (view === 'week') {
            let d = new Date(this._year, this._month, 1);
            const today = todayDate();
            if (today.getFullYear() === this._year && today.getMonth() === this._month) {
                d = today;
            }
            const dayOff = (d.getDay() - this.startDay + 7) % 7;
            this._weekStart = addDays(d, -dayOff);
        }
        this._render();
        if (this.onViewChange) this.onViewChange(view);
    };

    /** 특정 날짜로 이동 (YYYYMMDD) */
    FormaCalendar.prototype.goToDate = function(dateStr) {
        const d = parseYmd(dateStr);
        if (!d) return;
        this._year = d.getFullYear();
        this._month = d.getMonth();
        if (this.view === 'week') {
            const dayOff = (d.getDay() - this.startDay + 7) % 7;
            this._weekStart = addDays(d, -dayOff);
        }
        this._render();
        if (this.onMonthChange) this.onMonthChange(this._year, this._month + 1);
    };

    /** 오늘로 이동 */
    FormaCalendar.prototype.today = function() {
        const now = todayDate();
        this._year = now.getFullYear();
        this._month = now.getMonth();
        if (this.view === 'week') {
            const dayOff = (now.getDay() - this.startDay + 7) % 7;
            this._weekStart = addDays(now, -dayOff);
        }
        this._render();
        if (this.onMonthChange) this.onMonthChange(this._year, this._month + 1);
    };

    /** 이전 월/주 */
    FormaCalendar.prototype.prev = function() {
        if (this.view === 'month') {
            this._month--;
            if (this._month < 0) { this._month = 11; this._year--; }
        } else {
            this._weekStart = addDays(this._getWeekStart(), -7);
            this._year = this._weekStart.getFullYear();
            this._month = this._weekStart.getMonth();
        }
        this._render();
        if (this.onMonthChange) this.onMonthChange(this._year, this._month + 1);
    };

    /** 다음 월/주 */
    FormaCalendar.prototype.next = function() {
        if (this.view === 'month') {
            this._month++;
            if (this._month > 11) { this._month = 0; this._year++; }
        } else {
            this._weekStart = addDays(this._getWeekStart(), 7);
            this._year = this._weekStart.getFullYear();
            this._month = this._weekStart.getMonth();
        }
        this._render();
        if (this.onMonthChange) this.onMonthChange(this._year, this._month + 1);
    };

    /** 현재 표시 날짜 반환 (월: YYYYMM, 주: YYYYMMDD) */
    FormaCalendar.prototype.getDate = function() {
        if (this.view === 'month') {
            return '' + this._year + pad2(this._month + 1);
        }
        return formatYmd(this._getWeekStart());
    };

    /** 정리 */
    FormaCalendar.prototype.destroy = function() {
        this._destroyed = true;
        if (this.container) {
            this.container.innerHTML = '';
            this.container.classList.remove('forma-calendar');
        }
        this.events = [];
        this._eventMap = {};
        this.onDateClick = null;
        this.onEventClick = null;
        this.onMonthChange = null;
        this.onViewChange = null;
    };

    /* ── 전역 노출 ────────────────────────────────────── */
    window.FormaCalendar = FormaCalendar;
})();
