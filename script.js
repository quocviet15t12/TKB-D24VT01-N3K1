document.addEventListener("DOMContentLoaded", () => {
  const COURSES = JSON.parse(document.getElementById('courses-data').textContent);
  const TOTAL_WEEKS = 22;
  const WEEK1_START = new Date(2026, 7, 10);
  const DAY_COLS = [
    {thu:2,label:'Thứ 2'},{thu:3,label:'Thứ 3'},{thu:4,label:'Thứ 4'},
    {thu:5,label:'Thứ 5'},{thu:6,label:'Thứ 6'},{thu:7,label:'Thứ 7'}
  ];
  const TIET_COUNT = 10;
  const dayNames = {2:'Thứ 2',3:'Thứ 3',4:'Thứ 4',5:'Thứ 5',6:'Thứ 6',7:'Thứ 7',8:'CN'};

  function addDays(d,n){ const r=new Date(d); r.setDate(r.getDate()+n); return r; }
  function fmt(d){ const dd=String(d.getDate()).padStart(2,'0'), mm=String(d.getMonth()+1).padStart(2,'0'); return `${dd}/${mm}/${d.getFullYear()}`; }
  function weekStart(n){ return addDays(WEEK1_START,(n-1)*7); }
  function weekEnd(n){ return addDays(weekStart(n),6); }
  function dateForThu(weekN, thu){ const offset = thu===8?6:thu-2; return addDays(weekStart(weekN), offset); }
  function inRange(d,s,e){ return d>=new Date(s) && d<=new Date(e); }
  function weekNumberOf(dateStr){
    const diff = Math.round((new Date(dateStr) - WEEK1_START)/(1000*60*60*24));
    return Math.floor(diff/7)+1;
  }

  function occurrencesInWeek(weekN, selectedToMap){
    const occ = [];
    COURSES.forEach(c=>{
      c.lich.forEach(l=>{
        if(l.loai==='TH'){
          const sel = selectedToMap[c.ma_mh];
          if(sel && sel!=='all' && c.to!==sel) return;
        }
        const d = dateForThu(weekN, l.thu);
        if(inRange(d, l.tu_ngay, l.den_ngay)){
          occ.push({ma_mh:c.ma_mh, ten_mon:c.ten_mon, nhom:c.nhom, to:c.to, lop:c.lop,
                     thu:l.thu, tiet_start:l.tiet_start, tiet_end:l.tiet_end, loai:l.loai});
        }
      });
    });
    return occ;
  }

  function mergeDuplicates(occ){
    const map = new Map();
    occ.forEach(o=>{
      const key = o.loai==='TH'
        ? [o.ma_mh,o.nhom,o.to,o.thu,o.tiet_start,o.tiet_end,o.loai].join('|')
        : [o.ma_mh,o.nhom,o.thu,o.tiet_start,o.tiet_end,o.loai].join('|');
      if(map.has(key)){
        const e = map.get(key);
        if(!e.lop_list.includes(o.lop)) e.lop_list.push(o.lop);
        if(o.to && !e.to_list.includes(o.to)) e.to_list.push(o.to);
      } else {
        map.set(key, {...o, lop_list:[o.lop], to_list:o.to?[o.to]:[]});
      }
    });
    return [...map.values()];
  }

  function signatureOf(mergedOcc){
    return JSON.stringify(
      mergedOcc.map(o=>({m:o.ma_mh,th:o.thu,ts:o.tiet_start,te:o.tiet_end,l:o.loai,
                          to:o.to_list.slice().sort(), lp:o.lop_list.slice().sort()}))
        .sort((a,b)=> (a.th-b.th)||(a.ts-b.ts)||a.m.localeCompare(b.m))
    );
  }

  function computePhases(selectedToMap){
    const phases = [];
    let prevSig = null;
    for(let w=1; w<=TOTAL_WEEKS; w++){
      const merged = mergeDuplicates(occurrencesInWeek(w, selectedToMap));
      const sig = signatureOf(merged);
      if(phases.length && sig===prevSig){
        phases[phases.length-1].endWeek = w;
      } else {
        phases.push({startWeek:w, endWeek:w, occ:merged});
      }
      prevSig = sig;
    }
    return phases;
  }

  function renderGridFor(occ){
    const table = document.createElement('table');
    table.className = 'grid';

    const thead = document.createElement('thead');
    const trh = document.createElement('tr');
    trh.appendChild(document.createElement('th'));
    DAY_COLS.forEach(dc=>{
      const th = document.createElement('th');
      th.textContent = dc.label;
      trh.appendChild(th);
    });
    thead.appendChild(trh);
    table.appendChild(thead);

    const cellMap = {};
    const skip = new Set();
    occ.forEach(o=>{
      cellMap[`${o.thu}-${o.tiet_start}`] = o;
      for(let t=o.tiet_start; t<=o.tiet_end; t++) if(t!==o.tiet_start) skip.add(`${o.thu}-${t}`);
    });

    const tbody = document.createElement('tbody');
    for(let t=1;t<=TIET_COUNT;t++){
      const tr = document.createElement('tr');
      const tdLabel = document.createElement('td');
      tdLabel.className = 'tiet-label mono';
      tdLabel.textContent = `Tiết ${String(t).padStart(2,'0')}`;
      tr.appendChild(tdLabel);

      DAY_COLS.forEach(dc=>{
        const key = `${dc.thu}-${t}`;
        if(skip.has(key)) return;
        const o = cellMap[key];
        const td = document.createElement('td');
        const shade = t<=4 ? 'morning' : (t>=7 ? 'afternoon' : '');
        td.className = 'slot ' + shade;
        if(o){
          td.rowSpan = o.tiet_end - o.tiet_start + 1;
          const isDup = o.lop_list.length > 1;
          const cls = isDup ? 'dup' : o.loai;
          const toText = o.to_list.length>1 ? `Tổ ${o.to_list.slice().sort().join(', ')}`
                       : o.to_list.length===1 ? `Tổ ${o.to_list[0]}` : '';
          const lopText = isDup ? o.lop_list.join(', ') : o.lop;
          td.innerHTML = `<div class="block ${cls}">
              <span class="ma">${o.ma_mh}</span>
              <span class="ten">${o.ten_mon}</span>
              <span class="meta">Nhóm ${o.nhom}${toText?(' · '+toText):''} · Tiết ${o.tiet_start}-${o.tiet_end}</span>
              <span class="meta">${lopText}</span>
              ${isDup?'<span class="meta">⤷ trùng lịch, khác lớp</span>':''}
            </div>`;
        }
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    return table;
  }

  function renderPhases(selectedToMap){
    const phases = computePhases(selectedToMap);
    const main = document.getElementById('main');
    const toc = document.getElementById('toc');
    main.innerHTML = '';
    toc.innerHTML = '';

    phases.forEach((p, idx)=>{
      const id = `phase-${idx}`;
      const label = p.startWeek===p.endWeek ? `Tuần ${p.startWeek}` : `Tuần ${p.startWeek}–${p.endWeek}`;

      const a = document.createElement('a');
      a.href = `#${id}`;
      a.textContent = label + (p.occ.length===0 ? ' (nghỉ)' : '');
      if(p.occ.length===0) a.classList.add('empty');
      toc.appendChild(a);

      const card = document.createElement('div');
      card.className = 'phase';
      card.id = id;

      const head = document.createElement('div');
      head.className = 'phase-head';
      head.innerHTML = `<span class="weeks">${label}</span>
        <span class="dates mono">${fmt(weekStart(p.startWeek))} – ${fmt(weekEnd(p.endWeek))}</span>`;
      card.appendChild(head);

      if(p.occ.length===0){
        const empty = document.createElement('div');
        empty.className = 'no-class';
        empty.textContent = 'Không có buổi học nào trong giai đoạn này.';
        card.appendChild(empty);
      } else {
        const scroll = document.createElement('div');
        scroll.className = 'grid-scroll';
        scroll.appendChild(renderGridFor(p.occ));
        card.appendChild(scroll);
      }
      main.appendChild(card);
    });

    // ---- THANH TRACKER THÔNG MINH ----
    const track = document.getElementById('semesterTrack');
    const preview = document.getElementById('trackPreview');
    track.innerHTML = '';
    
    for(let w=1; w<=TOTAL_WEEKS; w++){
      const dot = document.createElement('div');
      dot.className = 'dot';
      const dateText = `Tuần ${w}: ${fmt(weekStart(w))} – ${fmt(weekEnd(w))}`;
      dot.dataset.week = w;
      dot.dataset.info = dateText;
      track.appendChild(dot);
      
      dot.addEventListener('mouseenter', () => {
        preview.textContent = `🔍 Đang xem: ${dateText}`;
      });
    }

    track.addEventListener('mouseleave', () => {
      preview.textContent = "Di chuyển hoặc nhấn vào các vạch để xem ngày chi tiết";
    });

    track.addEventListener('click', e=>{
      const dot = e.target.closest('.dot');
      if(!dot) return;
      
      document.querySelectorAll('.semester-track .dot').forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
      
      const w = +dot.dataset.week;
      preview.textContent = `📌 Đang hiển thị: ${dot.dataset.info}`;

      const phaseIdx = phases.findIndex(p=>w>=p.startWeek && w<=p.endWeek);
      if(phaseIdx<0) return;
      
      const el = document.getElementById(`phase-${phaseIdx}`);
      el.scrollIntoView({behavior:'smooth', block:'start'});
      el.classList.add('flash');
      setTimeout(()=>el.classList.remove('flash'), 1150);
    });

    buildCompare(phases);
  }

  function buildCompare(phases){
    const bySubject = {};
    COURSES.forEach(c=>{
      if(!c.to) return;
      bySubject[c.ma_mh] = bySubject[c.ma_mh] || {ten_mon:c.ten_mon, rows:[], lt:null};
      const th = c.lich.find(l=>l.loai==='TH');
      const lt = c.lich.find(l=>l.loai==='LT');
      if(lt) bySubject[c.ma_mh].lt = lt;
      if(th){
        bySubject[c.ma_mh].rows.push({
          to:c.to,
          w1: weekNumberOf(th.tu_ngay),
          w2: weekNumberOf(th.den_ngay),
          range: `${fmt(new Date(th.tu_ngay))} – ${fmt(new Date(th.den_ngay))}`,
          thu: th.thu, tiet:`${th.tiet_start}-${th.tiet_end}`
        });
      }
    });

    let section = document.getElementById('compareSection');
    if(!section){
      section = document.createElement('section');
      section.className = 'compare';
      section.id = 'compareSection';
      document.getElementById('main').appendChild(section);
    }
    section.innerHTML = `<h2>So sánh lịch thực hành (TH) giữa các tổ</h2>
      <div class="hint">Buổi lý thuyết (LT) giống nhau cho mọi tổ trong cùng môn — chỉ tuần thực hành (TH) khác nhau. Bấm một dòng để cuộn tới giai đoạn chứa tuần đó.</div>
      <div class="compare-cards"></div>`;
    const cardsWrap = section.querySelector('.compare-cards');

    Object.entries(bySubject).forEach(([ma_mh, info])=>{
      info.rows.sort((a,b)=>a.w1-b.w1);
      const card = document.createElement('div');
      card.className = 'compare-card';
      const ltText = info.lt ? `${dayNames[info.lt.thu]}, tiết ${info.lt.tiet_start}-${info.lt.tiet_end}, ${fmt(new Date(info.lt.tu_ngay))} – ${fmt(new Date(info.lt.den_ngay))}` : '—';
      card.innerHTML = `<h3>${ma_mh}</h3><div class="name">${info.ten_mon}</div>` +
        info.rows.map(r=>`<div class="compare-row" data-week="${r.w1}">
            <span class="to-tag">Tổ ${r.to}</span>
            <span class="th-range mono">${dayNames[r.thu]}, tiết ${r.tiet} · Tuần ${r.w1===r.w2?r.w1:(r.w1+'–'+r.w2)}<br>${r.range}</span>
          </div>`).join('') +
        `<div class="common-lt">Lý thuyết chung: <b>${ltText}</b></div>`;
      cardsWrap.appendChild(card);
    });

    cardsWrap.addEventListener('click', e=>{
      const row = e.target.closest('.compare-row');
      if(!row) return;
      const w = +row.dataset.week;
      const phaseIdx = phases.findIndex(p=>w>=p.startWeek && w<=p.endWeek);
      if(phaseIdx<0) return;
      const el = document.getElementById(`phase-${phaseIdx}`);
      el.scrollIntoView({behavior:'smooth', block:'start'});
      el.classList.add('flash');
      setTimeout(()=>el.classList.remove('flash'), 1150);
    });
  }

  const subjectsWithTo = {};
  COURSES.forEach(c=>{
    if(!c.to) return;
    subjectsWithTo[c.ma_mh] = subjectsWithTo[c.ma_mh] || {ten_mon:c.ten_mon, tos:new Set()};
    subjectsWithTo[c.ma_mh].tos.add(c.to);
  });

  const selectedToMap = {};
  const toFieldsWrap = document.getElementById('toFieldsWrap');

  Object.entries(subjectsWithTo).forEach(([ma_mh, info])=>{
    selectedToMap[ma_mh] = 'all';

    const field = document.createElement('div');
    field.className = 'to-field';
    const label = document.createElement('label');
    label.innerHTML = `${ma_mh} <span class="mh">(${info.ten_mon})</span>`;
    const select = document.createElement('select');

    const optAll = document.createElement('option');
    optAll.value = 'all';
    optAll.textContent = 'Tất cả tổ';
    select.appendChild(optAll);

    [...info.tos].sort().forEach(to=>{
      const opt = document.createElement('option');
      opt.value = to;
      opt.textContent = `Tổ ${to}`;
      select.appendChild(opt);
    });

    select.addEventListener('change', ()=>{
      selectedToMap[ma_mh] = select.value;
      renderPhases(selectedToMap);
    });

    field.appendChild(label);
    field.appendChild(select);
    toFieldsWrap.appendChild(field);
  });

  renderPhases(selectedToMap);
});