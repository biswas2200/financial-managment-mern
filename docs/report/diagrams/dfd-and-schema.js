/*
 * Draws the data-flow diagrams and the schema from window.KOSHA_MODEL (kosha-model.js). No libraries, no network.
 */
(function () {
  'use strict';

  var M = window.KOSHA_MODEL;
  var NS = 'http://www.w3.org/2000/svg';
  var $ = function (sel, root) { return (root || document).querySelector(sel); };

  function el(tag, attrs) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v === false || v == null) return;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else n.setAttribute(k, v === true ? '' : v);
    });
    for (var i = 2; i < arguments.length; i += 1) [].concat(arguments[i]).forEach(function (kid) { if (kid != null) n.append(kid); });
    return n;
  }

  function sv(tag, attrs) {
    var n = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'text') n.textContent = v;
      else n.setAttribute(k, v);
    });
    for (var i = 2; i < arguments.length; i += 1) [].concat(arguments[i]).forEach(function (kid) { if (kid != null) n.append(kid); });
    return n;
  }

  /** Splits text into lines of about `max` characters, at spaces. */
  function wrap(text, max) {
    var words = String(text).split(' ');
    var lines = [];
    var line = '';
    words.forEach(function (w) {
      if (line && (line + ' ' + w).length > max) { lines.push(line); line = w; } else { line = line ? line + ' ' + w : w; }
    });
    if (line) lines.push(line);
    return lines;
  }

  function lines(x, y, text, max, lineHeight, attrs) {
    var parts = wrap(text, max);
    var t = sv('text', Object.assign({ x: x, 'text-anchor': 'middle' }, attrs || {}));
    var top = y - ((parts.length - 1) * lineHeight) / 2;
    parts.forEach(function (p, i) { t.append(sv('tspan', { x: x, y: top + i * lineHeight + 4, text: p })); });
    return t;
  }

  // ------------------------------------------------------------------ tabs
  var TABS = [
    { id: 'context', label: 'Level 0: context', level: 'context' },
    { id: 'level1', label: 'Level 1: processes', level: 'level1' },
    { id: 'level2', label: 'Level 2: inside Copilot', level: 'level2' },
    { id: 'schema', label: 'Database schema' },
  ];
  var current = 'context';
  var zoom = 1;
  var picked = null;

  var tabsEl = $('#tabs');
  TABS.forEach(function (t) {
    tabsEl.append(el('button', { type: 'button', class: 'tab', role: 'tab', id: 'tab-' + t.id, 'aria-controls': t.id === 'schema' ? 'panel-schema' : 'panel-diagram', text: t.label, 'data-tab': t.id }));
  });
  tabsEl.addEventListener('click', function (e) { var b = e.target.closest('[data-tab]'); if (b) show(b.dataset.tab); });
  tabsEl.addEventListener('keydown', function (e) {
    var i = TABS.findIndex(function (t) { return t.id === current; });
    if (e.key === 'ArrowRight') { show(TABS[(i + 1) % TABS.length].id); $('#tab-' + current).focus(); }
    if (e.key === 'ArrowLeft') { show(TABS[(i + TABS.length - 1) % TABS.length].id); $('#tab-' + current).focus(); }
  });

  function show(id, keepHash) {
    var tab = TABS.find(function (t) { return t.id === id; }) || TABS[0];
    current = tab.id;
    TABS.forEach(function (t) {
      var b = $('#tab-' + t.id);
      b.setAttribute('aria-selected', String(t.id === current));
      b.tabIndex = t.id === current ? 0 : -1;
    });
    $('#panel-diagram').hidden = tab.id === 'schema';
    $('#panel-schema').hidden = tab.id !== 'schema';
    if (tab.id === 'schema') {
      drawRelations();
    } else {
      $('#panel-diagram').setAttribute('aria-labelledby', 'tab-' + tab.id);
      renderLevel(tab.level);
    }
    if (!keepHash) history.replaceState(null, '', '#' + tab.id);
  }

  // ------------------------------------------------------------------ data-flow diagrams
  var SIZE = { external: [150, 58], process: [250, 78], store: [210, 50] };
  var KIND_CLASS = { external: 'ext', process: 'proc', store: 'store' };

  function infoOf(node) {
    var base = ({ external: M.externals, process: M.processes, store: M.stores })[node[1]][node[0]] || {};
    return Object.assign({ id: node[0], kind: node[1] }, base, node[6] || {});
  }

  function boxOf(node) {
    var d = SIZE[node[1]];
    return { cx: node[2], cy: node[3], w: node[4] || d[0], h: node[5] || d[1] };
  }

  /** Where a line from the middle of the box towards (tx, ty) leaves the box. */
  function edgePoint(b, tx, ty) {
    var dx = tx - b.cx;
    var dy = ty - b.cy;
    if (!dx && !dy) return [b.cx, b.cy];
    var s = Math.min(b.w / 2 / Math.max(Math.abs(dx), 1e-9), b.h / 2 / Math.max(Math.abs(dy), 1e-9));
    return [b.cx + dx * s, b.cy + dy * s];
  }

  function drawNode(node) {
    var info = infoOf(node);
    var b = boxOf(node);
    var x = b.cx - b.w / 2;
    var y = b.cy - b.h / 2;
    var g = sv('g', { class: 'node ' + KIND_CLASS[node[1]], tabindex: 0, role: 'button', 'data-id': node[0], 'aria-label': (info.n ? info.n + ' ' : '') + info.label + ' (' + node[1] + ')' });
    if (node[1] === 'external') {
      g.append(sv('rect', { x: x, y: y, width: b.w, height: b.h, rx: 7 }));
      g.append(lines(b.cx, b.cy, info.label, 18, 15));
    } else if (node[1] === 'process') {
      g.append(sv('rect', { x: x, y: y, width: b.w, height: b.h, rx: 14 }));
      g.append(sv('rect', { class: 'num-band', x: x + 9, y: y + 9, width: info.n.length > 2 ? 36 : 28, height: 22, rx: 6 }));
      g.append(sv('text', { class: 'num', x: x + 9 + (info.n.length > 2 ? 18 : 14), y: y + 24, 'text-anchor': 'middle', text: info.n }));
      g.append(lines(b.cx + 16, b.cy + (b.h > 100 ? 0 : 6), info.label, Math.floor((b.w - 70) / 7), 16));
    } else {
      g.append(sv('path', { class: 'store-shape', d: 'M' + (x + b.w) + ' ' + y + ' H' + x + ' V' + (y + b.h) + ' H' + (x + b.w) }));
      g.append(sv('line', { class: 'store-bar', x1: x + 46, y1: y, x2: x + 46, y2: y + b.h }));
      g.append(sv('text', { class: 'num', x: x + 23, y: b.cy + 4, 'text-anchor': 'middle', text: info.n }));
      g.append(lines(x + 46 + (b.w - 46) / 2, b.cy, info.label, 20, 15));
    }
    return g;
  }

  function drawFlow(flow, nodes, index) {
    var a = boxOf(nodes[flow[0]]);
    var b = boxOf(nodes[flow[1]]);
    var bend = (flow[3] && flow[3].bend) || 0;
    var dx = b.cx - a.cx;
    var dy = b.cy - a.cy;
    var len = Math.hypot(dx, dy) || 1;
    var nx = -dy / len;
    var ny = dx / len;
    var ox = nx * bend * 24;
    var oy = ny * bend * 24;
    var p1 = edgePoint(a, b.cx + ox, b.cy + oy);
    var p2 = edgePoint(b, a.cx + ox, a.cy + oy);
    var g = sv('g', { class: 'flow', 'data-from': flow[0], 'data-to': flow[1], 'data-i': index });
    g.append(sv('path', { d: 'M' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1) + ' L' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1) }));
    var mx = (p1[0] + p2[0]) / 2;
    var my = (p1[1] + p2[1]) / 2;
    // two-way flows run side by side: keep each label on its own line's side
    g.append(lines(mx + nx * bend * 12, my + ny * bend * 12, flow[2], 24, 13));
    return g;
  }

  function marker(id, extra) {
    return sv('marker', { id: id, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 8, markerHeight: 8, orient: 'auto-start-reverse' }, sv('path', { d: 'M0 0 L10 5 L0 10 z' }));
  }

  function renderLevel(levelId) {
    var level = M.levels[levelId];
    picked = null;
    $('#lead').textContent = level.lead;
    var nodes = {};
    level.nodes.forEach(function (n) { nodes[n[0]] = n; });
    var svg = sv('svg', { class: 'dfd', viewBox: '0 0 ' + level.size[0] + ' ' + level.size[1], role: 'group', 'aria-label': level.title + '. ' + level.lead });
    svg.append(sv('defs', {}, marker('arrow'), marker('arrow-on')));
    var flows = sv('g', { class: 'flows' });
    level.flows.forEach(function (f, i) { flows.append(drawFlow(f, nodes, i)); });
    var nodeLayer = sv('g', { class: 'nodes' });
    level.nodes.forEach(function (n) { nodeLayer.append(drawNode(n)); });
    svg.append(flows, nodeLayer);
    $('#figure').replaceChildren(svg);
    applyZoom();
    renderDetails(null, level);

    function focusOn(id) {
      svg.classList.add('focusing');
      svg.querySelectorAll('.on').forEach(function (n) { n.classList.remove('on'); });
      var related = { };
      related[id] = true;
      svg.querySelectorAll('.flow').forEach(function (f) {
        if (f.dataset.from === id || f.dataset.to === id) { f.classList.add('on'); related[f.dataset.from] = true; related[f.dataset.to] = true; }
      });
      svg.querySelectorAll('.node').forEach(function (n) { if (related[n.dataset.id]) n.classList.add('on'); });
    }
    function clear() {
      if (picked) { focusOn(picked); return; }
      svg.classList.remove('focusing');
      svg.querySelectorAll('.on').forEach(function (n) { n.classList.remove('on'); });
    }
    svg.querySelectorAll('.node').forEach(function (g) {
      var id = g.dataset.id;
      g.addEventListener('mouseenter', function () { focusOn(id); });
      g.addEventListener('focus', function () { focusOn(id); });
      g.addEventListener('mouseleave', clear);
      g.addEventListener('blur', clear);
      g.addEventListener('click', function () { pick(id); });
      g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(id); } });
    });
    svg.addEventListener('click', function (e) { if (!e.target.closest('.node')) { picked = null; svg.querySelectorAll('.picked').forEach(function (n) { n.classList.remove('picked'); }); clear(); renderDetails(null, level); } });

    function pick(id) {
      picked = id;
      svg.querySelectorAll('.picked').forEach(function (n) { n.classList.remove('picked'); });
      svg.querySelector('.node[data-id="' + id + '"]').classList.add('picked');
      focusOn(id);
      renderDetails(nodes[id], level, nodes);
    }
  }

  function renderDetails(node, level, nodes) {
    var box = $('#details');
    if (!node) {
      box.replaceChildren(el('h2', { text: level.title }), el('p', { text: level.lead }), el('p', { text: 'Hover or focus a box to follow its flows. Select it to read what it is and what goes in and out.' }));
      return;
    }
    var info = infoOf(node);
    var tagText = { external: 'External entity', process: 'Process', store: 'Data store' }[node[1]];
    var title = (info.n ? info.n + '  ' : '') + info.label;
    var kids = [el('span', { class: 'tag tag-' + KIND_CLASS[node[1]], text: tagText }), el('h2', { text: title })];
    if (info.note) kids.push(el('p', { text: info.note }));
    if (info.routes) kids.push(el('h3', { text: 'API' }), el('ul', {}, info.routes.map(function (r) { return el('li', {}, el('code', { text: '/api/v1/' + r })); })));
    if (info.files) kids.push(el('h3', { text: 'Code (server/src)' }), el('ul', {}, info.files.map(function (f) { return el('li', {}, el('code', { text: f })); })));
    if (info.collection) kids.push(el('p', {}, el('button', { type: 'button', class: 'link', text: 'See the fields of ' + info.collection, 'data-collection': info.collection })));
    var inFlows = level.flows.filter(function (f) { return f[1] === node[0]; });
    var outFlows = level.flows.filter(function (f) { return f[0] === node[0]; });
    var name = function (id) { return infoOf(nodes[id]).label; };
    if (inFlows.length) kids.push(el('h3', { text: 'Data in' }), el('ul', {}, inFlows.map(function (f) { return el('li', { text: f[2] + ' (from ' + name(f[0]) + ')' }); })));
    if (outFlows.length) kids.push(el('h3', { text: 'Data out' }), el('ul', {}, outFlows.map(function (f) { return el('li', { text: f[2] + ' (to ' + name(f[1]) + ')' }); })));
    box.replaceChildren.apply(box, kids);
    var link = box.querySelector('[data-collection]');
    if (link) link.addEventListener('click', function () { showSchema(link.dataset.collection); });
  }

  // zoom
  function applyZoom() {
    var svg = $('#figure svg');
    if (svg) { svg.style.width = zoom * 100 + '%'; svg.style.minWidth = 720 * zoom + 'px'; }
    $('#zoom-level').textContent = Math.round(zoom * 100) + '%';
  }
  $('#zoom-in').addEventListener('click', function () { zoom = Math.min(2.5, zoom + 0.25); applyZoom(); });
  $('#zoom-out').addEventListener('click', function () { zoom = Math.max(0.5, zoom - 0.25); applyZoom(); });

  // download the diagram as a stand-alone SVG
  $('#download').addEventListener('click', function () {
    var svg = $('#figure svg');
    var cs = getComputedStyle(svg);
    var resolve = function (t) { return t.replace(/var\((--[\w-]+)\)/g, function (_, name) { return cs.getPropertyValue(name).trim(); }); };
    var css = '';
    [].forEach.call(document.styleSheets, function (sheet) {
      var rules;
      try { rules = sheet.cssRules; } catch (e) { return; }
      [].forEach.call(rules, function (r) { if (r.selectorText && /\.dfd|marker#arrow/.test(r.selectorText)) css += resolve(r.cssText) + '\n'; });
    });
    var copy = svg.cloneNode(true);
    copy.removeAttribute('style');
    copy.setAttribute('xmlns', NS);
    var vb = copy.getAttribute('viewBox').split(' ');
    copy.setAttribute('width', vb[2]);
    copy.setAttribute('height', vb[3]);
    copy.insertBefore(sv('rect', { width: vb[2], height: vb[3], fill: cs.getPropertyValue('--paper').trim() }), copy.firstChild);
    copy.insertBefore(sv('style', { text: css }), copy.firstChild);
    var blob = new Blob([new XMLSerializer().serializeToString(copy)], { type: 'image/svg+xml' });
    var a = el('a', { href: URL.createObjectURL(blob), download: 'kosha-' + current + '.svg' });
    document.body.append(a);
    a.click();
    a.remove();
  });

  // ------------------------------------------------------------------ schema
  var FLAG = { r: 'required', u: 'unique', i: 'indexed', k: 'ref', e: 'enum', p: 'private' };

  function card(c) {
    var rows = [el('tr', { 'data-field': '_id' }, el('td', { class: 'f', text: '_id' }), el('td', { class: 't', text: 'ObjectId' }), el('td', { class: 'n' }, el('span', { class: 'badge', text: 'primary key' })))];
    c.fields.forEach(function (f) {
      var flags = (f.flags || '').split(' ').filter(Boolean);
      var badges = flags.filter(function (x) { return x !== 'i' || flags.indexOf('u') < 0; }).map(function (x) { return el('span', { class: 'badge', text: FLAG[x] }); });
      var type = f.t + (f.ref ? ' → ' + f.ref : '');
      rows.push(el('tr', { class: flags.indexOf('k') >= 0 ? 'fk' : '', 'data-field': f.f }, el('td', { class: 'f', text: f.f }), el('td', { class: 't', text: type }), el('td', { class: 'n' }, badges, f.n || '')));
    });
    var idx = c.indexes.map(function (i) { return el('li', {}, el('code', { text: i.on }), i.unique ? ' (unique)' : '', i.note ? ': ' + i.note : ''); });
    return el('article', { class: 'card', id: 'c-' + c.name, 'data-name': c.name },
      el('header', {}, el('h2', {}, c.name, el('small', { text: 'model ' + c.model })), el('p', { text: c.note })),
      el('table', {}, el('thead', {}, el('tr', {}, el('th', { text: 'Field' }), el('th', { text: 'Type' }), el('th', { text: 'Notes' }))), el('tbody', {}, rows)),
      el('div', { class: 'indexes' }, el('h3', { text: 'Indexes' }), el('ul', {}, idx)));
  }

  function renderSchema() {
    var cards = $('#cards');
    cards.replaceChildren.apply(cards, M.collections.map(card));
    cards.querySelectorAll('.card').forEach(function (c) {
      c.addEventListener('mouseenter', function () { hot(c.dataset.name); });
      c.addEventListener('mouseleave', function () { hot(null); });
    });
  }

  function drawRelations() {
    var svg = $('#relations');
    var wrap = $('#schema');
    if (!svg || $('#panel-schema').hidden || getComputedStyle(svg).display === 'none') return;
    var base = wrap.getBoundingClientRect();
    svg.setAttribute('viewBox', '0 0 ' + base.width + ' ' + base.height);
    svg.replaceChildren(sv('defs', {}, marker('rel-arrow'), marker('rel-arrow-on')));
    M.collections.forEach(function (c) {
      var from = $('#c-' + c.name);
      if (from.hidden) return;
      c.fields.forEach(function (f) {
        if (!f.ref) return;
        var to = $('#c-' + f.ref);
        if (!to || to.hidden) return;
        var row = from.querySelector('[data-field="' + f.f + '"]').getBoundingClientRect();
        var fr = from.getBoundingClientRect();
        var tr = to.getBoundingClientRect();
        var toHead = to.querySelector('header').getBoundingClientRect();
        var targetRight = tr.left + tr.width / 2 > fr.left + fr.width / 2 + 20;
        var targetLeft = tr.left + tr.width / 2 < fr.left + fr.width / 2 - 20;
        var y1 = row.top + row.height / 2 - base.top;
        var y2 = toHead.top + toHead.height / 2 - base.top;
        var x1;
        var x2;
        var c1;
        var c2;
        if (targetRight) { x1 = fr.right - base.left; x2 = tr.left - base.left; c1 = x1 + 40; c2 = x2 - 40; }
        else if (targetLeft) { x1 = fr.left - base.left; x2 = tr.right - base.left; c1 = x1 - 40; c2 = x2 + 40; }
        else if (fr.left + fr.width / 2 - base.left > base.width / 2) { x1 = fr.left - base.left; x2 = tr.left - base.left; c1 = x1 - 34; c2 = x2 - 34; }
        else { x1 = fr.right - base.left; x2 = tr.right - base.left; c1 = x1 + 34; c2 = x2 + 34; }
        var p = sv('path', { d: 'M' + x1 + ' ' + y1 + ' C' + c1 + ' ' + y1 + ' ' + c2 + ' ' + y2 + ' ' + x2 + ' ' + y2, 'data-from': c.name, 'data-to': f.ref });
        if ((f.flags || '').indexOf('k') < 0) p.setAttribute('stroke-dasharray', '5 4'); // points at an id or a slug, not a hard reference
        svg.append(p);
      });
    });
  }

  function hot(name) {
    var svg = $('#relations');
    var related = {};
    if (name) related[name] = true;
    svg.querySelectorAll('path').forEach(function (p) {
      var on = name && (p.dataset.from === name || p.dataset.to === name);
      p.classList.toggle('on', Boolean(on));
      if (on) { related[p.dataset.from] = true; related[p.dataset.to] = true; }
    });
    svg.classList.toggle('focusing', Boolean(name));
    $('#cards').querySelectorAll('.card').forEach(function (c) {
      c.classList.toggle('hot', c.dataset.name === name);
      c.classList.toggle('dim', Boolean(name) && !related[c.dataset.name]);
    });
  }

  function showSchema(name) {
    show('schema');
    var c = $('#c-' + name);
    if (!c) return;
    c.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    hot(name);
    setTimeout(function () { hot(null); }, 1800);
  }

  $('#search').addEventListener('input', function (e) {
    var q = e.target.value.trim().toLowerCase();
    $('#cards').querySelectorAll('.card').forEach(function (c) { c.hidden = Boolean(q) && c.textContent.toLowerCase().indexOf(q) < 0; });
    drawRelations();
  });

  // ------------------------------------------------------------------ page tools
  var theme = 'auto';
  $('#theme').addEventListener('click', function () {
    theme = { auto: 'light', light: 'dark', dark: 'auto' }[theme];
    if (theme === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.dataset.theme = theme;
    $('#theme').textContent = 'Theme: ' + theme;
  });
  $('#print').addEventListener('click', function () { window.print(); });

  window.addEventListener('resize', drawRelations);
  if (typeof ResizeObserver === 'function') new ResizeObserver(drawRelations).observe($('#schema'));
  window.addEventListener('hashchange', function () { var id = location.hash.slice(1); if (TABS.some(function (t) { return t.id === id; }) && id !== current) show(id, true); });

  renderSchema();
  show(TABS.some(function (t) { return '#' + t.id === location.hash; }) ? location.hash.slice(1) : 'context', true);
  document.body.dataset.ready = 'true';
})();
