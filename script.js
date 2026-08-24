// ---------- Data kept in the browser for this session ----------
let items = [];        // { id, type, text, who, due, dept, done }
let idCounter = 0;
let meetingsLogged = 0;

function loadSample(){
  document.getElementById('deptInput').value = "Marketing";
  document.getElementById('dateInput').value = new Date().toISOString().slice(0,10);
  document.getElementById('notesInput').value =
`Priya: Good morning everyone. Let's start with the campaign update.
Raj: Sure. We decided to launch the new campaign on Friday.
Priya: Great. Raj will send the budget report by Monday.
Sam: I discussed vendor pricing but we have not finalized anything yet.
Priya: Also, we decided to move the product photoshoot to next week.
Sam will follow up with the vendor by Wednesday.
Priya: Anything else? Ok, meeting adjourned.`;
}

// STEP 1: send the meeting text to the Flask backend
// STEP 2: backend sends back { decisions: [...], actions: [...] }
// STEP 3: we turn that into cards on the board
async function analyze(){
  const text = document.getElementById('notesInput').value.trim();
  if (!text) return;
  const dept = document.getElementById('deptInput').value || 'General';
  const date = document.getElementById('dateInput').value || new Date().toISOString().slice(0,10);

  const response = await fetch('/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, dept, date })
  });
  const data = await response.json();

  data.decisions.forEach(text => {
    items.push({ id: idCounter++, type:'decision', text, dept, done:false });
  });
  data.actions.forEach(a => {
    items.push({ id: idCounter++, type:'action', text:a.text, who:a.who, due:a.due, dept, done:false });
  });

  meetingsLogged++;
  render();
}

function isOverdue(dueLabel){
  if (!dueLabel) return false;
  const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  const today = new Date().getDay();
  const dayIndex = days.indexOf(dueLabel.toLowerCase());
  if (dayIndex === -1) return false;
  return dayIndex < today; // simple demo heuristic
}

function toggleDone(id){
  const item = items.find(i => i.id === id);
  if (item) item.done = !item.done;
  render();
}

function render(){
  const query = document.getElementById('searchInput').value.toLowerCase();
  const decisionsList = document.getElementById('decisionsList');
  const actionsList = document.getElementById('actionsList');
  decisionsList.innerHTML = '';
  actionsList.innerHTML = '';

  const filtered = items.filter(i =>
    !query || i.text.toLowerCase().includes(query) || (i.who || '').toLowerCase().includes(query)
  );

  const decisions = filtered.filter(i => i.type === 'decision');
  const actions = filtered.filter(i => i.type === 'action');

  if (decisions.length === 0) decisionsList.innerHTML = '<p class="empty">No decisions yet — analyze a meeting to fill this in.</p>';
  if (actions.length === 0) actionsList.innerHTML = '<p class="empty">No action items yet.</p>';

  decisions.forEach(d => {
    const div = document.createElement('div');
    div.className = 'card' + (d.done ? ' done' : '');
    div.innerHTML = `
      <div class="txt">${escapeHtml(d.text)}</div>
      <div class="tag-row">
        <span class="pill">${escapeHtml(d.dept)}</span>
        <label class="done-toggle"><input type="checkbox" ${d.done?'checked':''} onchange="toggleDone(${d.id})"> Recorded</label>
      </div>`;
    decisionsList.appendChild(div);
  });

  actions.forEach(a => {
    const overdue = !a.done && isOverdue(a.due);
    const div = document.createElement('div');
    div.className = 'card action' + (overdue ? ' overdue' : '') + (a.done ? ' done' : '');
    div.innerHTML = `
      <div class="txt">${escapeHtml(a.text)}</div>
      <div class="tag-row">
        <span>
          ${a.who ? `<span class="pill who">${escapeHtml(a.who)}</span>` : ''}
          ${a.due ? `<span class="pill ${overdue?'overdue-pill':'due'}">${overdue ? 'overdue · ' : 'by '}${escapeHtml(a.due)}</span>` : ''}
        </span>
        <label class="done-toggle"><input type="checkbox" ${a.done?'checked':''} onchange="toggleDone(${a.id})"> Done</label>
      </div>`;
    actionsList.appendChild(div);
  });

  document.getElementById('statMeetings').textContent = meetingsLogged;
  document.getElementById('statDecisions').textContent = items.filter(i=>i.type==='decision').length;
  document.getElementById('statActions').textContent = items.filter(i=>i.type==='action').length;
  document.getElementById('statOverdue').textContent = items.filter(i=>i.type==='action' && !i.done && isOverdue(i.due)).length;
}

function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

render();