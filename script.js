(function () {
      "use strict";

      /* ---------------- storage ---------------- */
      const STORAGE_KEY = 'pauta_tasks_v1';

      function loadTasks() {
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          return raw ? JSON.parse(raw) : [];
        } catch (e) {
          console.error('Erro ao ler localStorage', e);
          return [];
        }
      }
      function saveTasks() {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
        } catch (e) {
          console.error('Erro ao salvar localStorage', e);
          showToast('Não foi possível salvar. Espaço de armazenamento cheio?');
        }
      }

      let tasks = loadTasks();
      let currentFilter = 'all';
      let searchQuery = '';
      const openSubtaskGroups = new Set(); // ids de tarefas com etapas expandidas
      let editingTaskId = null;
      let editorSubtasks = []; // etapas em edição dentro do modal

      /* ---------------- helpers ---------------- */
      function uid() {
        return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
      }

      function todayStr() {
        const d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      }

      function parseDue(dateStr, timeStr) {
        if (!dateStr) return null;
        return new Date(dateStr + 'T' + (timeStr || '23:59') + ':00');
      }

      function formatDatePretty(dateStr) {
        if (!dateStr) return '';
        const [y, m, d] = dateStr.split('-');
        return `${d}/${m}/${y}`;
      }

      function nextOccurrence(dateStr, repeat) {
        let d = new Date(dateStr + 'T00:00:00');
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        do {
          d.setDate(d.getDate() + (repeat === 'weekly' ? 7 : 1));
        } while (d < now);
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      }

      function getTimerInfo(dateStr, timeStr, completed) {
        if (completed) {
          return { label: 'Concluída', cls: 'done' };
        }
        if (!dateStr) return null;
        const due = parseDue(dateStr, timeStr);
        const now = new Date();
        const diffMs = due - now;
        const diffH = diffMs / 3600000;

        if (diffMs < 0) {
          const overdueDays = Math.floor(-diffMs / 86400000);
          return { label: overdueDays > 0 ? `Atrasada há ${overdueDays}d` : 'Atrasada', cls: 'danger' };
        }
        if (diffH < 24) {
          return { label: timeStr ? `Hoje às ${timeStr}` : 'Hoje', cls: 'warn' };
        }
        const days = Math.ceil(diffH / 24);
        return { label: `Em ${days} dia${days > 1 ? 's' : ''}`, cls: 'ok' };
      }

      function isDueToday(dateStr) {
        return dateStr === todayStr();
      }
      function isDueThisWeek(dateStr) {
        if (!dateStr) return false;
        const d = new Date(dateStr + 'T00:00:00');
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const in7 = new Date(now);
        in7.setDate(in7.getDate() + 7);
        return d >= now && d <= in7;
      }

      let toastTimer = null;
      function showToast(msg) {
        const t = document.getElementById('toast');
        t.textContent = msg;
        t.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
      }

      /* ---------------- icons (reused strings) ---------------- */
      const ICON_EDIT = '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
      const ICON_TRASH = '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>';
      const ICON_CHEVRON = '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
      const ICON_CLOCK = '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>';
      const ICON_REPEAT = '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>';
      const ICON_CLIPBOARD = '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>';
      const ICON_X = '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>';
      const ICON_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';

      function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
      }

      /* ---------------- rendering ---------------- */
      const listEl = document.getElementById('taskList');
      const titleEl = document.getElementById('viewTitle');
      const subtitleEl = document.getElementById('viewSubtitle');

      const VIEW_META = {
        all: { title: 'Todas as tarefas', subtitle: 'Organize a faculdade e o dia a dia num só lugar.' },
        today: { title: 'Hoje', subtitle: 'O que precisa da sua atenção agora.' },
        week: { title: 'Esta semana', subtitle: 'Tarefas com vencimento nos próximos 7 dias.' },
        recurring: { title: 'Recorrentes', subtitle: 'Tarefas e etapas que se repetem diária ou semanalmente.' },
        completed: { title: 'Concluídas', subtitle: 'Um retrospecto do que já foi feito.' }
      };

      function getFilteredTasks() {
        let list = tasks.slice();

        if (currentFilter === 'today') {
          list = list.filter(t => isDueToday(t.dueDate) || t.subtasks.some(s => isDueToday(s.dueDate)));
        } else if (currentFilter === 'week') {
          list = list.filter(t => isDueThisWeek(t.dueDate) || t.subtasks.some(s => isDueThisWeek(s.dueDate)));
        } else if (currentFilter === 'recurring') {
          list = list.filter(t => t.repeat !== 'none' || t.subtasks.some(s => s.repeat !== 'none'));
        } else if (currentFilter === 'completed') {
          list = list.filter(t => t.completed);
        }

        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase();
          list = list.filter(t =>
            t.title.toLowerCase().includes(q) ||
            (t.description || '').toLowerCase().includes(q) ||
            t.subtasks.some(s => s.title.toLowerCase().includes(q))
          );
        }

        return list.sort((a, b) => {
          if (a.completed !== b.completed) return a.completed ? 1 : -1;
          const ad = a.dueDate ? new Date(a.dueDate + 'T' + (a.dueTime || '23:59')) : new Date('2999-12-31');
          const bd = b.dueDate ? new Date(b.dueDate + 'T' + (b.dueTime || '23:59')) : new Date('2999-12-31');
          return ad - bd;
        });
      }

      function updateCounts() {
        document.getElementById('cnt-all').textContent = tasks.length;
        document.getElementById('cnt-today').textContent = tasks.filter(t => isDueToday(t.dueDate) || t.subtasks.some(s => isDueToday(s.dueDate))).length;
        document.getElementById('cnt-week').textContent = tasks.filter(t => isDueThisWeek(t.dueDate) || t.subtasks.some(s => isDueThisWeek(s.dueDate))).length;
        document.getElementById('cnt-recurring').textContent = tasks.filter(t => t.repeat !== 'none' || t.subtasks.some(s => s.repeat !== 'none')).length;
        document.getElementById('cnt-completed').textContent = tasks.filter(t => t.completed).length;
      }

      function renderBadge(info) {
        if (!info) return '';
        const icon = info.cls === 'done' ? ICON_CHECK : ICON_CLOCK;
        return `<span class="badge ${info.cls}">${icon}${escapeHtml(info.label)}</span>`;
      }

      function renderRepeatBadge(repeat) {
        if (repeat === 'none' || !repeat) return '';
        const label = repeat === 'daily' ? 'Diária' : 'Semanal';
        return `<span class="badge repeat">${ICON_REPEAT}${label}</span>`;
      }

      function renderTaskCard(t) {
        const timerInfo = getTimerInfo(t.dueDate, t.dueTime, t.completed);
        const doneCount = t.subtasks.filter(s => s.completed).length;
        const total = t.subtasks.length;
        const isOpen = openSubtaskGroups.has(t.id);

        const subtasksHtml = t.subtasks.map(s => {
          const sInfo = getTimerInfo(s.dueDate, s.dueTime, s.completed);
          return `
        <div class="subtask-row ${s.completed ? 'completed' : ''}">
          <input type="checkbox" class="checkbox sm" ${s.completed ? 'checked' : ''} data-action="toggle-subtask" data-task="${t.id}" data-subtask="${s.id}">
          <span class="subtask-title">${escapeHtml(s.title)}</span>
          ${renderRepeatBadge(s.repeat)}
          ${renderBadge(sInfo)}
        </div>`;
        }).join('');

        return `
    <div class="task-card ${t.completed ? 'completed' : ''}" data-id="${t.id}">
      <div class="task-row">
        <input type="checkbox" class="checkbox" ${t.completed ? 'checked' : ''} data-action="toggle-task" data-task="${t.id}">
        <div class="task-main">
          <div class="task-title-row">
            <span class="task-title">${escapeHtml(t.title)}</span>
            ${renderRepeatBadge(t.repeat)}
            ${renderBadge(timerInfo)}
          </div>
          ${t.description ? `<p class="task-desc">${escapeHtml(t.description)}</p>` : ''}
          <div class="task-meta-row">
            ${total > 0 ? `
              <button class="icon-btn rotate ${isOpen ? 'open' : ''}" data-action="toggle-subtasks" data-task="${t.id}" title="Ver etapas">
                ${ICON_CHEVRON}
              </button>
              <span class="progress-pill">${doneCount}/${total} etapas</span>
            ` : ''}
          </div>
        </div>
        <div class="task-actions">
          <button class="icon-btn" data-action="edit-task" data-task="${t.id}" title="Editar">${ICON_EDIT}</button>
          <button class="icon-btn danger" data-action="delete-task" data-task="${t.id}" title="Excluir">${ICON_TRASH}</button>
        </div>
      </div>
      ${total > 0 ? `<div class="subtasks ${isOpen ? '' : 'hidden'}" data-subtasks-of="${t.id}">${subtasksHtml}</div>` : ''}
    </div>`;
      }

      function render() {
        const meta = VIEW_META[currentFilter];
        titleEl.textContent = meta.title;
        subtitleEl.textContent = meta.subtitle;

        const list = getFilteredTasks();
        updateCounts();

        if (list.length === 0) {
          const hasAnyTasks = tasks.length > 0;
          listEl.innerHTML = `
        <div class="empty-state">
          <div class="mark">${ICON_CLIPBOARD}</div>
          <h3>${hasAnyTasks ? 'Nada por aqui' : 'Sua lista está vazia'}</h3>
          <p>${hasAnyTasks
              ? 'Nenhuma tarefa corresponde a este filtro ou busca.'
              : 'Que tal criar sua primeira tarefa? Você pode adicionar etapas, descrição e um lembrete recorrente.'}</p>
          <button class="btn btn-primary" id="emptyStateBtn">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
            Nova tarefa
          </button>
        </div>`;
          const btn = document.getElementById('emptyStateBtn');
          if (btn) btn.addEventListener('click', () => openModal());
          return;
        }

        listEl.innerHTML = list.map(renderTaskCard).join('');
      }

      /* ---------------- CRUD actions ---------------- */
      function toggleTaskComplete(taskId) {
        const t = tasks.find(x => x.id === taskId);
        if (!t) return;
        t.completed = !t.completed;

        if (t.completed) {
          if (t.repeat !== 'none' && t.dueDate) {
            // fica marcada como concluída pelo resto do dia; a virada de data acontece
            // automaticamente após 00:00 (ver rolloverRecurringItems)
            t.dueDate = todayStr();
            t.completedDate = todayStr();
            t.subtasks.forEach(s => {
              s.completed = true;
              s.completedDate = todayStr();
              if (s.repeat !== 'none') s.dueDate = todayStr();
            });
            showToast('Concluída por hoje — será reiniciada após a meia-noite.');
          }
        } else {
          t.completedDate = null;
          if (t.repeat !== 'none') {
            t.subtasks.forEach(s => { s.completed = false; s.completedDate = null; });
          }
        }
        saveTasks();
        render();
      }

      function toggleSubtaskComplete(taskId, subId) {
        const t = tasks.find(x => x.id === taskId);
        if (!t) return;
        const s = t.subtasks.find(x => x.id === subId);
        if (!s) return;
        s.completed = !s.completed;

        if (s.completed) {
          if (s.repeat !== 'none' && s.dueDate) {
            s.dueDate = todayStr();
            s.completedDate = todayStr();
            showToast('Etapa concluída por hoje — será reiniciada após a meia-noite.');
          }
        } else {
          s.completedDate = null;
        }
        saveTasks();
        render();
      }

      // Roda no carregamento e periodicamente: desmarca tarefas/etapas recorrentes
      // que foram concluídas em um dia anterior e avança a data para a próxima ocorrência.
      function rolloverRecurringItems() {
        const today = todayStr();
        let changed = false;

        tasks.forEach(t => {
          let parentRolled = false;
          if (t.repeat !== 'none' && t.completed && t.completedDate && t.completedDate !== today) {
            t.dueDate = nextOccurrence(t.completedDate, t.repeat);
            t.completed = false;
            t.completedDate = null;
            parentRolled = true;
            changed = true;
          }
          t.subtasks.forEach(s => {
            if (s.repeat !== 'none' && s.completed && s.completedDate && s.completedDate !== today) {
              s.dueDate = nextOccurrence(s.completedDate, s.repeat);
              s.completed = false;
              s.completedDate = null;
              changed = true;
            } else if (parentRolled && s.completed) {
              // etapa "arrastada" junto da tarefa mãe: some quando a mãe vira o dia
              s.completed = false;
              s.completedDate = null;
              changed = true;
            }
          });
        });

        if (changed) saveTasks();
      }

      function deleteTask(taskId) {
        const t = tasks.find(x => x.id === taskId);
        if (!t) return;
        if (!confirm(`Excluir a tarefa "${t.title}"? Isso também remove suas etapas.`)) return;
        tasks = tasks.filter(x => x.id !== taskId);
        saveTasks();
        render();
      }

      /* ---------------- modal / editor ---------------- */
      const overlay = document.getElementById('overlay');
      const modalTitle = document.getElementById('modalTitle');
      const fTitle = document.getElementById('fTitle');
      const fDesc = document.getElementById('fDesc');
      const fDate = document.getElementById('fDate');
      const fTime = document.getElementById('fTime');
      const fRepeat = document.getElementById('fRepeat');
      const subtaskEditorsEl = document.getElementById('subtaskEditors');

      function renderSubtaskEditors() {
        subtaskEditorsEl.innerHTML = editorSubtasks.map((s, idx) => `
      <div class="subtask-editor" data-idx="${idx}">
        <div class="se-top">
          <input type="text" placeholder="Título da etapa" value="${escapeHtml(s.title)}" data-field="title" data-idx="${idx}">
          <button type="button" class="icon-btn danger" data-action="remove-subtask" data-idx="${idx}" title="Remover etapa">${ICON_X}</button>
        </div>
        <div class="se-grid">
          <input type="date" data-field="dueDate" data-idx="${idx}" value="${s.dueDate || ''}">
          <input type="time" data-field="dueTime" data-idx="${idx}" value="${s.dueTime || ''}">
          <select data-field="repeat" data-idx="${idx}">
            <option value="none" ${s.repeat === 'none' ? 'selected' : ''}>Não repetir</option>
            <option value="daily" ${s.repeat === 'daily' ? 'selected' : ''}>Diariamente</option>
            <option value="weekly" ${s.repeat === 'weekly' ? 'selected' : ''}>Semanalmente</option>
          </select>
        </div>
      </div>
    `).join('');
      }

      subtaskEditorsEl.addEventListener('input', (e) => {
        const idx = e.target.getAttribute('data-idx');
        const field = e.target.getAttribute('data-field');
        if (idx === null || !field) return;
        editorSubtasks[idx][field] = e.target.value;
      });
      subtaskEditorsEl.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action="remove-subtask"]');
        if (!btn) return;
        const idx = Number(btn.getAttribute('data-idx'));
        editorSubtasks.splice(idx, 1);
        renderSubtaskEditors();
      });

      document.getElementById('btnAddSubtask').addEventListener('click', () => {
        editorSubtasks.push({ id: uid(), title: '', completed: false, completedDate: null, dueDate: '', dueTime: '', repeat: 'none' });
        renderSubtaskEditors();
        const inputs = subtaskEditorsEl.querySelectorAll('input[data-field="title"]');
        if (inputs.length) inputs[inputs.length - 1].focus();
      });

      function openModal(taskId) {
        editingTaskId = taskId || null;
        if (taskId) {
          const t = tasks.find(x => x.id === taskId);
          modalTitle.textContent = 'Editar tarefa';
          fTitle.value = t.title;
          fDesc.value = t.description || '';
          fDate.value = t.dueDate || '';
          fTime.value = t.dueTime || '';
          fRepeat.value = t.repeat || 'none';
          editorSubtasks = t.subtasks.map(s => ({ ...s }));
        } else {
          modalTitle.textContent = 'Nova tarefa';
          fTitle.value = '';
          fDesc.value = '';
          fDate.value = '';
          fTime.value = '';
          fRepeat.value = 'none';
          editorSubtasks = [];
        }
        renderSubtaskEditors();
        overlay.classList.add('show');
        setTimeout(() => fTitle.focus(), 60);
      }

      function closeModal() {
        overlay.classList.remove('show');
        editingTaskId = null;
      }

      function saveTask() {
        const title = fTitle.value.trim();
        if (!title) {
          showToast('Dê um título para a tarefa antes de salvar.');
          fTitle.focus();
          return;
        }
        const cleanSubtasks = editorSubtasks
          .map(s => ({
            id: s.id || uid(),
            title: (s.title || '').trim(),
            completed: !!s.completed,
            completedDate: s.completedDate || null,
            dueDate: s.dueDate || '',
            dueTime: s.dueTime || '',
            repeat: s.repeat || 'none'
          }))
          .filter(s => s.title.length > 0);

        if (editingTaskId) {
          const t = tasks.find(x => x.id === editingTaskId);
          t.title = title;
          t.description = fDesc.value.trim();
          t.dueDate = fDate.value || '';
          t.dueTime = fTime.value || '';
          t.repeat = fRepeat.value;
          t.subtasks = cleanSubtasks;
          showToast('Tarefa atualizada.');
        } else {
          tasks.push({
            id: uid(),
            title,
            description: fDesc.value.trim(),
            dueDate: fDate.value || '',
            dueTime: fTime.value || '',
            repeat: fRepeat.value,
            completed: false,
            completedDate: null,
            createdAt: Date.now(),
            subtasks: cleanSubtasks
          });
          showToast('Tarefa criada.');
        }
        saveTasks();
        closeModal();
        render();
      }

      /* ---------------- event wiring ---------------- */
      document.getElementById('btnNewTask').addEventListener('click', () => openModal());
      document.getElementById('btnCloseModal').addEventListener('click', closeModal);
      document.getElementById('btnCancel').addEventListener('click', closeModal);
      document.getElementById('btnSave').addEventListener('click', saveTask);
      overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && overlay.classList.contains('show')) closeModal(); });

      document.querySelectorAll('.side-item').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.side-item').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          currentFilter = btn.getAttribute('data-filter');
          render();
        });
      });

      document.getElementById('search').addEventListener('input', (e) => {
        searchQuery = e.target.value;
        render();
      });

      listEl.addEventListener('click', (e) => {
        const editBtn = e.target.closest('[data-action="edit-task"]');
        if (editBtn) { openModal(editBtn.getAttribute('data-task')); return; }

        const delBtn = e.target.closest('[data-action="delete-task"]');
        if (delBtn) { deleteTask(delBtn.getAttribute('data-task')); return; }

        const toggleSub = e.target.closest('[data-action="toggle-subtasks"]');
        if (toggleSub) {
          const id = toggleSub.getAttribute('data-task');
          if (openSubtaskGroups.has(id)) openSubtaskGroups.delete(id);
          else openSubtaskGroups.add(id);
          render();
          return;
        }
      });

      listEl.addEventListener('change', (e) => {
        const taskCb = e.target.closest('[data-action="toggle-task"]');
        if (taskCb) { toggleTaskComplete(taskCb.getAttribute('data-task')); return; }

        const subCb = e.target.closest('[data-action="toggle-subtask"]');
        if (subCb) { toggleSubtaskComplete(subCb.getAttribute('data-task'), subCb.getAttribute('data-subtask')); return; }
      });

      /* rollover diário + atualização periódica dos rótulos de tempo relativo */
      rolloverRecurringItems();
      setInterval(() => { rolloverRecurringItems(); render(); }, 60000);

      render();
    })();