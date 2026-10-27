'use strict';
(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const icons = {
    arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z"/>',
    play: '<path d="m9 5 10 7-10 7Z"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    expand: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    link: '<path d="m10 13 4-4m-6 6-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 3 1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0"/>',
    file: '<path d="M5 3h9l5 5v13H5Zm9 0v6h5M9 13h6m-6 4h4"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    external: '<path d="M14 3h7v7m0-7L10 14M9 5H4v15h15v-5"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
    spark: '<path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5Z"/>',
    refresh: '<path d="M20 10a8 8 0 1 0-1 8M20 3v7h-7"/>',
  };
  const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.spark}</svg>`;
  const crew = [
    {id:'scout', name:'Scout', color:'#e6b66f', shape:'drop', job:'THE PATHFINDER', verb:'Mapping pages', quote:'“I know a shortcut.”', description:'Opens the website, follows its internal links and brings the page map back to the desk.', idle:'Looking busy', tool:'Routes & discovery'},
    {id:'patch', name:'Patch', color:'#f18d79', shape:'tile', job:'THE LINK CHECKER', verb:'Checking links', quote:'“That door is painted on.”', description:'Checks the routes Scout found. Missing pages, server errors and blocked requests get different labels.', idle:'On a snack break', tool:'Links & responses'},
    {id:'pixel', name:'Pixel', color:'#b79bd4', shape:'flower', job:'THE DETAIL PERSON', verb:'Inspecting details', quote:'“You forgot something.”', description:'Checks titles, descriptions, image alt attributes, viewport tags and same-origin resources.', idle:'Counting pixels', tool:'Documents & assets'},
    {id:'echo', name:'Echo', color:'#86bac9', shape:'pill', job:'THE SECOND OPINION', verb:'Rechecking findings', quote:'“Let me try that again.”', description:'Requests missing pages and resources again. A second observation earns a confirmation, not a guess.', idle:'Skeptical, as usual', tool:'Independent rechecks'},
    {id:'chief', name:'Chief', color:'#df95ad', shape:'blob', job:'THE RECEIPT KEEPER', verb:'Writing the report', quote:'“Show me the receipts.”', description:'Collects the evidence into a readable report. With a configured Grok API, the final summary is model-written.', idle:'Definitely not napping', tool:'Evidence & summary'},
  ];
  window.GROKER_CREW = crew;
  const headPaths = {
    drop:'M41 4C52-2 84 17 83 43S63 85 39 79 9 54 18 31 29 10 41 4Z',
    tile:'M28 10Q30 5 37 7L78 21Q85 23 83 31L69 73Q67 80 59 77L18 62Q11 60 14 52Z',
    flower:'M39 8Q49-4 57 12L62 24 76 21Q93 24 78 39L70 46 78 57Q86 73 67 69L55 65 49 78Q40 92 33 75L29 62 15 64Q-1 61 13 48L23 39 17 26Q13 10 29 17L37 21Z',
    pill:'M20 23Q12 6 32 4L65 4Q82 6 82 24L82 58Q81 78 62 79L29 79Q11 75 13 58Z',
    blob:'M20 20Q21 6 36 10L46 15Q60 1 70 14L73 27Q91 34 82 48L73 54Q75 73 56 75L43 68Q29 84 18 67L19 54Q1 44 13 31Z',
  };
  function botSvg(person, className = '', headOnly = false) {
    return `<svg class="bot-svg ${className}" viewBox="0 0 100 ${headOnly ? '90' : '150'}" aria-hidden="true" style="--bot-color:${person.color}">
      ${headOnly ? '' : '<ellipse cx="50" cy="142" rx="27" ry="5" fill="#000" opacity=".19"/><path d="m37 113-3 23m29-23 3 23" stroke="#52584a" stroke-width="10" stroke-linecap="round"/><path d="M26 138h13m23 0h13" stroke="#a6ac99" stroke-width="9" stroke-linecap="round"/><path d="m26 89-9 22m57-22 9 22" stroke="'+person.color+'" stroke-width="9" stroke-linecap="round"/><rect x="28" y="79" width="44" height="40" rx="15" fill="'+person.color+'"/><path d="M37 84v19q13 8 26 0V84" fill="#33382b"/><rect x="44" y="94" width="12" height="4" rx="2" fill="'+person.color+'"/>'}
      <g class="bot-head"><path d="${headPaths[person.shape]}" fill="${person.color}"/><path d="m43 29 4 9m10-15 4 9" stroke="#20241b" stroke-width="6" stroke-linecap="round"/></g></svg>`;
  }
  const date = value => new Date(value).toLocaleString('en-GB', {day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
  const age = value => {
    const minutes = Math.max(0, Math.round((Date.now()-new Date(value))/60000));
    return minutes < 1 ? 'Just now' : minutes < 60 ? `${minutes}m ago` : date(value);
  };
  let room, activeJob = null, lastReport = null, pollTimer, findingFilter = 'all', selectedAgent = null;
  let currentRuns = [];
  const route = location.pathname;
  const activeRoute = route.startsWith('/runs') ? 'runs' : route === '/crew' ? 'crew' : route === '/guide' ? 'guide' : 'desk';
  $(`[data-nav="${activeRoute}"]`).classList.add('active');
  $(`[data-nav="${activeRoute}"]`).setAttribute('aria-current', 'page');

  function toast(message) {
    const el = $('#toast');
    el.textContent = message;
    el.classList.add('visible');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove('visible'), 3500);
  }
  async function request(path, options) {
    const response = await fetch(path, options);
    let body;
    try { body = await response.json(); } catch { throw new Error('The local server returned an unexpected response.'); }
    if (!response.ok) throw new Error(body.error || 'Something went wrong. Please try again.');
    return body;
  }
  function saveDownload(name, content, type = 'application/json') {
    const url = URL.createObjectURL(new Blob([content], {type}));
    const a = document.createElement('a'); a.href=url; a.download=name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function renderDesk() {
    $('#main').innerHTML = `
      <section class="desk-intro studio-heading"><div class="intro-copy"><div class="eyebrow">YOUR LITTLE RESEARCH STUDIO</div><h1>A good day to<br><span class="muted">find loose ends.</span></h1><p>One website. A curious crew. A notebook worth keeping.</p></div><div class="studio-presence"><span class="presence-orbit">✳</span><span>Everyone's in.<small>Five little specialists, ready to wander.</small></span></div></section>
      <section class="dispatch" aria-label="Start an inspection">
        <form id="scan-form" novalidate><label class="url-field" for="website-url">${icon('globe')}<input id="website-url" name="url" type="text" inputmode="url" autocomplete="url" placeholder="Your website goes here. example.com" aria-describedby="scan-help" required><kbd>URL</kbd></label>
          <button class="button primary dispatch-button" id="scan-button" type="submit">Send in the crew ${icon('arrow')}</button></form>
        <div class="dispatch-meta"><span id="scan-help"><span class="status-dot"></span> Public websites only. Small crew, bounded checks.</span><button class="text-button" id="demo-button">Just looking? <span>Try a demo ${icon('arrow')}</span></button></div>
        <p id="form-error" class="form-error" role="alert" hidden></p>
      </section>

      <section class="workshop-section" aria-labelledby="workshop-heading">
        <div class="section-line"><div><h2 id="workshop-heading">Inside the studio</h2><span class="pill tiny" id="room-status-pill"><span class="status-dot"></span> Standing by</span></div><span class="section-aside">A LITTLE WALK. A LITTLE WORK. A LOT OF CURIOSITY.</span></div>
        <div class="crew-strip" aria-label="Meet your inspection crew">${crew.map((person, i) => `<button class="crew-mini" data-person="${person.id}" style="--accent:${person.color}" aria-pressed="false">${botSvg(person)}<span class="crew-mini-copy"><span class="crew-mini-name">${person.name}</span><span class="crew-mini-job">${person.job}</span><span class="crew-mini-state"><span class="mini-dot"></span>${person.idle}</span></span><span class="crew-mini-arrow">↗</span></button>`).join('')}</div>
        <div class="bench-layout">
          <div class="room-panel" id="room-panel"><div class="room-topbar"><span><span class="live-square"></span> GROKER HQ <span class="dim">/ THE STUDIO</span></span><div><button class="room-control" id="pause-room" aria-label="Pause room animation" title="Pause animation">${icon('pause')}</button><button class="room-control" id="expand-room" aria-label="Expand workshop" title="Expand workshop">${icon('expand')}</button></div></div>
            <div class="room-stage"><canvas id="room-canvas" aria-label="Five colorful GROKER bots with arms and legs in their workshop. The crew walks around during downtime and works on your inspection when you start a run."></canvas><div class="room-loading" id="room-loading">Opening the workshop<span>One very small moment.</span></div><div class="room-nameplate">${icon('spark')} <span id="room-caption">A little idle time never hurt anybody.</span></div><div class="room-hint">Click a little guy to say hi <span>↗</span></div></div>
            <div class="room-bottom"><span><span class="status-dot"></span><span id="room-footer-label">5 crew online</span></span><span id="room-target">No URL on the desk</span><span class="room-clock">LOCAL WORKSHOP <span id="room-clock"></span></span></div>
          </div>

        </div>
          <aside class="run-panel mission-strip" id="run-panel" aria-label="Current inspection"><div class="run-panel-top"><span class="eyebrow">CURRENT MISSION</span><span class="mission-number"># —</span></div>
            <div id="mission-content"><span class="mission-idle-dot"></span><div class="mission-idle-copy"><h3>No mission on the desk. Yet.</h3><p>The crew is making the rounds. Give them a website, or open the sample notebook.</p></div><button class="button secondary" id="aside-demo">Take a little test run ${icon('play')}</button></div></aside>
        <div class="agent-detail" id="agent-detail" hidden></div>
      </section>
      <section class="results-section" id="results-section"><div class="section-line"><div><h2>The receipts</h2><span class="pill tiny" id="result-count">Nothing filed yet</span></div><button class="text-button" id="export-report" hidden>${icon('download')} Export report</button></div>
        <div id="report-content"><div class="empty-report"><div class="receipt-stack">${icon('file')}${icon('file')}${icon('file')}</div><div><h3>Good work leaves a paper trail.</h3><p>Your pages, checked links and findings land here.<br>Every observation comes with its source.</p></div><span class="empty-arrow">↖</span></div></div>
      </section>
      <section class="desk-bottom-note"><span class="asterisk">✳</span><p>They bring the personality.<br><strong>The evidence does the talking.</strong></p><a href="/guide">See how it works ${icon('arrow')}</a><span class="small-print">CODE COLLECTS. CHECKS VERIFY.<br>THE FINAL SUMMARY MAKES SENSE OF IT.</span></section>`;
    $('#scan-form').addEventListener('submit', event => { event.preventDefault(); startRun(false); });
    $('#demo-button').addEventListener('click', () => startRun(true));
    $('#aside-demo').addEventListener('click', () => startRun(true));
    $$('.crew-mini').forEach(button => button.addEventListener('click', () => selectPerson(button.dataset.person)));
    $('#export-report').addEventListener('click', () => lastReport && saveDownload(`groker-${lastReport.domain}.json`, JSON.stringify(lastReport, null, 2)));
    $('#pause-room').addEventListener('click', () => {
      const paused = room?.togglePause();
      $('#pause-room').innerHTML = icon(paused ? 'play' : 'pause');
      $('#pause-room').setAttribute('aria-label', paused ? 'Resume room animation' : 'Pause room animation');
      $('#pause-room').title = paused ? 'Resume animation' : 'Pause animation';
    });
    $('#expand-room').addEventListener('click', async () => {
      try { if (document.fullscreenElement) await document.exitFullscreen(); else await $('#room-panel').requestFullscreen(); }
      catch { toast('Fullscreen is unavailable in this browser.'); }
    });
    if (window.createGrokerRoom) {
      try { room = window.createGrokerRoom($('#room-canvas')); $('#room-loading').hidden=true; }
      catch (error) { showRoomFallback(); }
    } else showRoomFallback();
    function clock() { const el=$('#room-clock'); if(el) el.textContent=new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}); }
    clock(); setInterval(clock, 15000);
  }
  function showRoomFallback() {
    $('#room-loading').innerHTML = `<div class="fallback-crew">${crew.map(p=>botSvg(p)).join('')}</div><strong>The crew is here.</strong><span>3D rendering is unavailable. Inspections still work.</span>`;
    $('#room-loading').classList.add('room-fallback');
    $('#pause-room').disabled=true;
  }
  function selectPerson(id) {
    const person = crew.find(p => p.id === id); if (!person) return;
    selectedAgent = selectedAgent === id ? null : id;
    $$('.crew-mini').forEach(button => {
      button.classList.toggle('selected', button.dataset.person === selectedAgent);
      button.setAttribute('aria-pressed', String(button.dataset.person === selectedAgent));
    });
    const detail = $('#agent-detail'); if (!detail) return;
    detail.hidden = !selectedAgent;
    if (selectedAgent) detail.innerHTML = `<span class="person-quote" style="color:${person.color}">${person.quote}</span><p><strong>${person.name}</strong> · ${person.description}</p><a href="/crew#${person.id}">Full profile ${icon('arrow')}</a>`;
    room?.selectAgent(selectedAgent);
  }
  window.addEventListener('groker:select', event => selectPerson(event.detail));
  async function startRun(demo) {
    if (activeJob) { toast('The crew already has a mission. Let them finish or stop the run.'); return; }
    const input = $('#website-url');
    const error = $('#form-error'); error.hidden=true;
    if (!demo && !input.value.trim()) { error.textContent='Give the little guys a website address first.'; error.hidden=false; input.focus(); return; }
    if (!demo) {
      try { const url=new URL(input.value.includes('://') ? input.value : `https://${input.value}`); if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) throw new Error(); }
      catch { error.textContent='That address does not look right. Try example.com or https://example.com.'; error.hidden=false; input.focus(); return; }
    }
    setBusy(true);
    try {
      const {id} = await request('/api/runs', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:input.value,demo})});
      activeJob=id; await pollJob(id);
    } catch (exc) { error.textContent=exc.message; error.hidden=false; setBusy(false); }
  }
  function setBusy(busy) {
    $('#scan-button').disabled=busy; $('#demo-button').disabled=busy;
    $('#website-url').disabled=busy;
    $('#scan-button').innerHTML=busy ? `<span class="button-spinner"></span> Crew at work` : `Send in the crew ${icon('arrow')}`;
  }
  async function pollJob(id) {
    clearTimeout(pollTimer);
    try {
      const job=await request(`/api/runs/${id}`);
      renderMission(job);
      if (job.status === 'running') { activeJob=id; pollTimer=setTimeout(()=>pollJob(id),650); }
      else {
        activeJob=null; setBusy(false);
        if (job.status==='complete') { renderReport(job.report); updateRunCount(); }
        if (job.status==='error') { $('#form-error').textContent=job.error; $('#form-error').hidden=false; }
      }
    } catch (exc) {
      activeJob=null; setBusy(false); room?.setState({status:'idle'});
      $('#form-error').textContent=`Could not read the run: ${exc.message} Open Runs to check its status.`; $('#form-error').hidden=false;
    }
  }
  function renderMission(job) {
    const running=job.status==='running', done=job.status==='complete';
    const person=crew.find(p=>p.id===job.agent) || crew[0];
    let domain; try { domain=new URL(job.url).hostname; } catch { domain=job.url; }
    const percent=job.progress || 0;
    $('#room-status-pill').innerHTML=`<span class="status-dot ${running?'working':''}"></span> ${running?'Crew at work':done?'Mission complete':job.status==='cancelled'?'Taking a breather':'Standing by'}`;
    $('#room-caption').textContent=running ? `${person.name}: ${person.verb.toLowerCase()}.` : done ? 'Findings filed. Snack break earned.' : 'A little idle time never hurt anybody.';
    $('#room-footer-label').textContent=running?'5 crew on the case':'5 crew online';
    $('#room-target').textContent=domain+(job.demo?' · DEMO':'');
    $('.mission-number').textContent='# '+job.id.slice(0,4).toUpperCase();
    $('#mission-content').innerHTML=`<div class="mission-target"><span class="target-icon">${icon(done?'check':'globe')}</span><div><span class="mission-type">${job.demo?'DEMO INSPECTION':'WEBSITE INSPECTION'}</span><strong>${esc(domain)}</strong></div></div>
      <div class="mission-current"><span class="eyebrow">${done?'THE CREW HAS CLOCKED OUT':running?`${esc(person.name.toUpperCase())} IS ON IT`:'MISSION STATUS'}</span><h3>${esc(job.title)}</h3></div>
      <div class="mission-progress"><div><span>${done?'All receipts filed':running?'Inspection in progress':job.status==='cancelled'?'Stopped by you':'Could not finish'}</span><strong>${percent}%</strong></div><div class="progress-track"><i style="width:${percent}%"></i></div></div>
      <div class="mission-steps">${crew.map((p,i)=>{
        const current=crew.indexOf(person), completed=done || (running && i<current), working=running && p.id===job.agent;
        return `<div class="mission-step ${completed?'done':''} ${working?'current':''}"><span class="step-status">${completed?icon('check'):working?'<i></i>':icon('clock')}</span><span>${p.tool}</span>${working?'<span class="working-bars"><i></i><i></i><i></i></span>':''}</div>`;
      }).join('')}</div>
      ${done?`<a class="button primary full" href="#results-section">Open the receipts ${icon('arrow')}</a><a class="mission-history-link" href="/runs/${job.id}">Permanent run page ${icon('external')}</a>`:running?`<button class="text-button cancel-button" id="cancel-run">${icon('stop')} Stop inspection</button>`:`<p class="mission-error">${esc(job.error || 'The crew is ready for another mission.')}</p>`}
      <div class="latest-event"><span class="status-dot"></span>${esc(job.events?.at(-1)?.detail || 'Getting everything ready.')}</div>`;
    $('#cancel-run')?.addEventListener('click',async()=>{ try {await request(`/api/runs/${job.id}/cancel`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}); await pollJob(job.id);}catch(exc){toast(exc.message);} });
    $$('.crew-mini').forEach(button=>{
      const p=crew.find(c=>c.id===button.dataset.person), working=running&&p.id===job.agent;
      button.classList.toggle('on-task',working);
      $('.crew-mini-state',button).innerHTML=`<span class="mini-dot"></span>${working?p.verb:done?'Receipts filed':p.idle}`;
    });
    room?.setState({status:running?'working':done?'complete':'idle',agent:job.agent,progress:percent,domain});
  }
  function renderReport(report) {
    lastReport=report;
    $('#result-count').textContent=`${report.findings.length} findings${report.demo?' · Demo':''}`;
    $('#export-report').hidden=false;
    if(report.report_version>=2 && window.GrokerReport){window.GrokerReport.mount(report,{esc,icon,crew,botSvg,openFinding});return;}
    $('#report-content').innerHTML=`<div class="report-summary"><div class="report-summary-title">${botSvg(crew[4],'',true)}<div><span class="eyebrow">CHIEF'S ${report.summary_source==='grok'?'GROK SUMMARY':'EVIDENCE SUMMARY'}</span><h3>${esc(report.domain)} <span class="pill tiny">${report.demo?'Sample website':'Public website'}</span></h3></div></div><p>${esc(report.summary)}</p><div class="report-stats"><span>${icon('file')} <strong>${report.pages}</strong> pages read</span><span>${icon('link')} <strong>${report.links}</strong> links checked</span><span>${icon('check')} <strong>${report.verified}</strong> confirmed observations</span><span>${icon('clock')} ${report.duration}s</span></div></div>
      <div class="findings-toolbar"><div class="filter-tabs" role="group" aria-label="Filter findings"><button data-filter="all" class="active">All findings <span>${report.findings.length}</span></button><button data-filter="error">Issues <span>${report.counts.error}</span></button><button data-filter="warning">Warnings <span>${report.counts.warning}</span></button><button data-filter="notice">Notes <span>${report.counts.notice}</span></button></div><span class="findings-hint">CLICK A FINDING FOR ITS RECEIPT ↗</span></div><div id="findings-list"></div><p class="scope-note">${icon('globe')} ${esc(report.limits.scope)} <a href="/guide#scope">Read the scope ↗</a></p>`;
    findingFilter='all'; renderFindings();
    $$('[data-filter]').forEach(button=>button.addEventListener('click',()=>{findingFilter=button.dataset.filter;$$('[data-filter]').forEach(b=>b.classList.toggle('active',b===button));renderFindings();}));
  }
  function renderFindings() {
    const filtered=lastReport.findings.filter(f=>findingFilter==='all'||f.severity===findingFilter);
    $('#findings-list').innerHTML=filtered.length ? filtered.map(f=>{
      const person=crew.find(p=>p.id===f.agent)||crew[0]; let path; try{path=new URL(f.url).pathname;}catch{path=f.url;}
      return `<button class="finding-row" data-finding="${f.id}"><span class="severity-marker ${f.severity}">${f.severity==='error'?'!':f.severity==='warning'?'!':'i'}</span><span class="finding-main"><strong>${esc(f.title)}</strong><span>${esc(path)}</span></span><span class="finding-agent"><span style="background:${person.color}"></span>${person.name}</span><span class="finding-confirmed">${f.confirmed?icon('check'):'—'} ${f.confirmed?'Observed':'Needs review'}</span><span class="finding-chevron">↗</span></button>`;
    }).join('') : `<div class="filter-empty">${icon('check')} No ${findingFilter==='all'?'findings':findingFilter==='error'?'issues':findingFilter==='warning'?'warnings':'notes'} in this sample.</div>`;
    $$('[data-finding]').forEach(button=>button.addEventListener('click',()=>openFinding(button.dataset.finding)));
  }
  function openFinding(id) {
    const f=lastReport.findings.find(item=>item.id===id);if(!f)return;
    const person=crew.find(p=>p.id===f.agent)||crew[0];
    $('#finding-content').innerHTML=`<div class="eyebrow"><span class="severity-marker ${f.severity}">${f.severity==='notice'?'i':'!'}</span> ${esc(f.severity.toUpperCase())} · RECEIPT ${f.id.slice(0,6).toUpperCase()}</div><h2>${esc(f.title)}</h2><p>${esc(f.detail)}</p><div class="evidence-block"><span class="eyebrow">OBSERVED EVIDENCE</span><code>${esc(f.evidence)}</code></div><div class="finding-source"><span class="eyebrow">SOURCE</span>${lastReport.demo?`<code>${esc(f.url)}</code><small>Fixture address used for this demo; not a live website.</small>`:`<a href="${esc(f.url)}" target="_blank" rel="noopener noreferrer">${esc(f.url)} ${icon('external')}</a>`}</div><div class="receipt-footer"><span style="color:${person.color}">${person.name} · ${person.tool}</span><span>${f.confirmed?'Observed in the inspected data':'Requires review'}</span></div>`;
    $('#finding-dialog').showModal();
  }
  $('.dialog-close').addEventListener('click',()=>$('#finding-dialog').close());
  $('#finding-dialog').addEventListener('click',event=>{if(event.target===$('#finding-dialog'))$('#finding-dialog').close();});

  function pageHeading(label,title,description,extra='') {
    return `<section class="page-heading"><div class="eyebrow"><span class="mini-star">✳</span> ${label}</div><h1>${title}</h1><p>${description}</p>${extra}</section>`;
  }
  function renderCrew() {
    document.title='The crew — GROKER';
    $('#main').innerHTML=pageHeading('MEET THE LITTLE GUYS','A very small<br><span class="muted">big deal.</span>','Five specialists. A shared set of evidence. Questionable snack habits.')+
      `<div class="crew-profiles">${crew.map((p,i)=>`<article class="crew-profile" id="${p.id}" style="--accent:${p.color}"><div class="profile-art"><span class="profile-number">HERE TO HELP</span>${botSvg(p)}<span class="profile-sticker">${p.id==='chief'?'THE BOSS, APPARENTLY':p.id==='echo'?'TRUST, THEN VERIFY':p.id==='patch'?'404? NOT ON MY WATCH':p.id==='pixel'?'DETAILS ARE A PERSONALITY':'WILL FOLLOW ANY LINK'}</span></div><div class="profile-copy"><span class="eyebrow">${p.job}</span><h2>${p.name}</h2><blockquote>${p.quote}</blockquote><p>${p.description}</p><div class="profile-tool">${icon('spark')} ${p.tool}</div></div></article>`).join('')}</div>
      <section class="crew-contract"><span class="asterisk">✳</span><h2>One crew.<br><span class="muted">One set of receipts.</span></h2><p>Scout passes the map to Patch. Pixel inspects the documents. Echo rechecks missing responses. Chief reports only what the crew actually found.</p><a class="button primary" href="/">Give them a job ${icon('arrow')}</a></section>`;
  }
  function renderGuide() {
    document.title='Field guide — GROKER';
    $('#main').innerHTML=pageHeading('THE FIELD GUIDE','Personality up front.<br><span class="muted">Evidence underneath.</span>','What happens when you send in the crew, and what their findings can actually tell you.')+
      `<div class="guide-layout"><aside class="guide-nav"><a href="#how">How it works</a><a href="#scope">Inspection scope</a><a href="#evidence">Reading a receipt</a><a href="#memory">Saved runs</a><a href="#grok">Where Grok fits</a></aside><div class="guide-content">
      <section id="how"><span class="eyebrow">THE WORKFLOW</span><h2>One URL. Five little jobs.</h2><p>Enter a public website address. The crew reads a bounded sample, checks its links and resources, repeats missing responses and puts the observations in a report.</p><div class="guide-pipeline">${crew.map((p,i)=>`<div>${botSvg(p,'',true)}<strong>${p.name}</strong><small>${p.tool}</small></div>`).join('')}</div><p>The workshop reflects the current inspection phase. The characters walk between workstations, carry notebooks and take small breaks. A live inspection changes their routes, tasks and the notes above their heads. You can pause the scene without stopping the inspection.</p></section>
      <section id="scope"><span class="eyebrow">SCOPE, WITHOUT THE SMALL PRINT</span><h2>Small crew. Clear boundaries.</h2><div class="scope-columns"><div><h3>${icon('check')} Checked in this version</h3><ul><li>Up to 8 public HTML pages</li><li>Up to 28 same-origin links</li><li>Up to 16 same-origin resources</li><li>HTTP responses and redirects</li><li>Page titles, descriptions and language</li><li>Image alt attributes and viewport tags</li><li>A repeat request for missing responses</li></ul></div><div><h3>${icon('file')} Outside this inspection</h3><ul><li>Pages behind a login</li><li>Form submissions or checkout flows</li><li>JavaScript-rendered content and layout</li><li>Mobile screenshots or visual comparisons</li><li>Security vulnerabilities and compliance</li><li>Exhaustive coverage of an entire domain</li></ul></div></div><p>A missing viewport tag is a document observation, not proof of a broken mobile layout. A blocked request is marked as limited access. No findings in a sample does not mean a website is error-free.</p></section>
      <section id="evidence"><span class="eyebrow">KEEP THE RECEIPTS</span><h2>Open any finding.</h2><p>Each receipt includes the source URL, the observed condition, the responsible checker and whether a missing response repeated. Severity is a practical review category, not a universal website score.</p><div class="guide-example"><span class="severity-marker error">!</span><div><strong>This link goes nowhere</strong><code>HTTP 404 · linked from the inspected website · repeat HTTP 404</code></div><span class="pill tiny">Rechecked</span></div><p>The demo uses a small fixture website with intentional missing pages and document omissions. It runs through the same inspection logic and is always labelled Demo.</p></section>
      <section id="memory"><span class="eyebrow">A LITTLE MEMORY</span><h2>The work stays on the desk.</h2><p>Completed runs are saved by this local server and can be reopened from Runs. Export any report as JSON. History belongs to this installation and is not synced to a hosted account.</p><a class="inline-link" href="/runs">Open the run archive ${icon('arrow')}</a></section>
      <section id="grok"><span class="eyebrow">THE MODEL'S JOB</span><h2>Code gathers.<br><span class="muted">Grok can explain.</span></h2><p>Collection and checks run in code. If the server is configured with a Grok model API key and model name, Chief sends the collected observations to that model for a final summary. Without configuration, the report uses a deterministic evidence summary.</p><p>This application does not create, control or connect to hosted Grok Bots. The team structure is inspired by specialist bots, shared evidence and explicit handoffs.</p><a class="button primary" href="/">Back to the workbench ${icon('arrow')}</a></section>
      </div></div>`;
  }
  async function updateRunCount() {
    try { currentRuns=await request('/api/runs'); const badge=$('#nav-run-count');badge.hidden=!currentRuns.length;badge.textContent=currentRuns.length; }catch{}
  }
  async function renderRuns() {
    document.title='Runs — GROKER';
    $('#main').innerHTML=pageHeading('THE RUN ARCHIVE','Work done.<br><span class="muted">Receipts kept.</span>','Every finished mission has a paper trail. Pick a run to see what the crew found.',`<a class="button primary" href="/">New inspection ${icon('plus')}</a>`)+
      `<section class="runs-section"><div class="archive-toolbar"><label class="archive-search">${icon('search')}<input id="run-search" type="search" placeholder="Find a website..." aria-label="Search runs"></label><div class="filter-tabs"><button class="active" data-run-filter="all">All runs</button><button data-run-filter="live">Live websites</button><button data-run-filter="demo">Demos</button></div></div><div id="runs-content"><p class="loading-copy">Fetching the paper trail…</p></div></section>`;
    let filter='all';
    try { currentRuns=await request('/api/runs'); }
    catch(exc) { $('#runs-content').innerHTML=`<div class="empty-report"><p>${esc(exc.message)}</p><button class="button secondary" onclick="location.reload()">Try again</button></div>`;return; }
    function paint() {
      const search=$('#run-search').value.trim().toLowerCase();
      const runs=currentRuns.filter(job=>(filter==='all'||(filter==='demo')===job.demo)&&job.url.toLowerCase().includes(search));
      $('#runs-content').innerHTML=runs.length ? `<div class="archive-table-head"><span>WEBSITE / MISSION</span><span>STATUS</span><span>FINDINGS</span><span>FILED</span><span></span></div>${runs.map(job=>`<a class="archive-row" href="/runs/${job.id}"><span class="archive-site"><span class="archive-globe">${icon('globe')}</span><span><strong>${esc(new URL(job.url).hostname)}</strong><small>#${job.id.slice(0,6).toUpperCase()}${job.demo?' · DEMO':''}</small></span></span><span class="archive-status ${job.status}"><span class="status-dot"></span>${job.status==='complete'?'Filed':job.status==='running'?'Working':job.status==='cancelled'?'Stopped':'Could not finish'}</span><span class="archive-findings">${job.report?`${job.report.counts.error} issues <span>· ${job.report.findings.length} total</span>`:'—'}</span><span class="archive-date">${age(job.created_at)}</span><span>↗</span></a>`).join('')}`:
        `<div class="archive-empty">${botSvg(crew[0])}<h2>${search||filter!=='all'?'No matching missions.':'A clean desk. For now.'}</h2><p>${search||filter!=='all'?'Try another search or filter.':'Send the crew to a website. Their first report will land here.'}</p><a class="button primary" href="/">To the workbench ${icon('arrow')}</a></div>`;
    }
    paint(); $('#run-search').addEventListener('input',paint);
    $$('[data-run-filter]').forEach(button=>button.addEventListener('click',()=>{filter=button.dataset.runFilter;$$('[data-run-filter]').forEach(b=>b.classList.toggle('active',b===button));paint();}));
  }
  async function renderRunPage(id) {
    renderDesk();
    $('.desk-intro').innerHTML=`<div class="intro-copy"><a class="inline-link" href="/runs">← All runs</a><div class="eyebrow">MISSION ${esc(id.slice(0,6).toUpperCase())}</div><h1>Here are<br><span class="muted">the receipts.</span></h1></div><div class="run-page-art">${botSvg(crew[4])}</div>`;
    document.title=`Run ${id.slice(0,6).toUpperCase()} — GROKER`;
    try {const job=await request(`/api/runs/${id}`); $('#website-url').value=job.url; if(job.status==='running'){setBusy(true);activeJob=id;await pollJob(id);}else{renderMission(job);if(job.report)renderReport(job.report);} }
    catch(exc){$('#form-error').textContent=exc.message;$('#form-error').hidden=false;}
  }
  if (route==='/crew') renderCrew();
  else if (route==='/guide') renderGuide();
  else if (route==='/runs') renderRuns();
  else if (/^\/runs\/[a-f0-9]{12}$/.test(route)) renderRunPage(route.split('/').at(-1));
  else renderDesk();
  updateRunCount();
  if (location.hash) requestAnimationFrame(()=>$(location.hash)?.scrollIntoView());
})();
