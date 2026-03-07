import * as vscode from 'vscode';
import { KanbanBoard } from './kanbanParser';

export function getWebviewContent(webview: vscode.Webview, board: KanbanBoard): string {
  const boardJson = JSON.stringify(board).replace(/</g, '\\u003c');

  return /*html*/ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';" />
  <title>Kanban Board</title>
  <style>
    :root {
      --bg: var(--vscode-editor-background);
      --fg: var(--vscode-editor-foreground);
      --col-bg: var(--vscode-sideBar-background, #1e1e1e);
      --card-bg: var(--vscode-editorWidget-background, #252526);
      --card-border: var(--vscode-editorWidget-border, #3c3c3c);
      --accent: var(--vscode-button-background, #0e639c);
      --accent-hover: var(--vscode-button-hoverBackground, #1177bb);
      --input-bg: var(--vscode-input-background, #3c3c3c);
      --input-border: var(--vscode-input-border, #3c3c3c);
      --input-fg: var(--vscode-input-foreground, #ccc);
      --badge-bg: var(--vscode-badge-background, #4d4d4d);
      --badge-fg: var(--vscode-badge-foreground, #fff);
      --danger: #c74e4e;
      --danger-hover: #d65c5c;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      background: var(--bg);
      color: var(--fg);
      overflow-x: auto;
      min-height: 100vh;
    }

    .toolbar {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 20px;
      border-bottom: 1px solid var(--card-border);
      flex-wrap: wrap;
    }

    .toolbar h1 {
      font-size: 18px;
      font-weight: 600;
      cursor: pointer;
      padding: 2px 6px;
      border-radius: 3px;
    }

    .toolbar h1:hover { background: var(--input-bg); }

    .toolbar-actions {
      display: flex;
      gap: 8px;
      margin-left: auto;
    }

    button {
      background: var(--accent);
      color: #fff;
      border: none;
      padding: 5px 12px;
      border-radius: 3px;
      cursor: pointer;
      font-size: 12px;
      font-family: inherit;
    }

    button:hover { background: var(--accent-hover); }

    button.secondary {
      background: var(--input-bg);
      color: var(--fg);
    }

    button.secondary:hover { background: var(--card-border); }

    button.danger { background: var(--danger); }
    button.danger:hover { background: var(--danger-hover); }

    .board {
      display: flex;
      gap: 16px;
      padding: 20px;
      align-items: flex-start;
      min-height: calc(100vh - 60px);
    }

    .column {
      min-width: 280px;
      max-width: 320px;
      background: var(--col-bg);
      border-radius: 6px;
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
    }

    .column-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 14px 8px;
      gap: 8px;
    }

    .column-title {
      font-weight: 600;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      cursor: pointer;
      padding: 2px 4px;
      border-radius: 3px;
      flex: 1;
    }

    .column-title:hover { background: var(--input-bg); }

    .column-count {
      background: var(--badge-bg);
      color: var(--badge-fg);
      border-radius: 10px;
      padding: 1px 8px;
      font-size: 11px;
      font-weight: 600;
    }

    .column-actions {
      display: flex;
      gap: 4px;
    }

    .column-actions button {
      padding: 2px 6px;
      font-size: 14px;
      background: transparent;
      color: var(--fg);
      opacity: 0.5;
    }

    .column-actions button:hover {
      opacity: 1;
      background: var(--input-bg);
    }

    .column-body {
      flex: 1;
      padding: 4px 10px 10px;
      min-height: 60px;
    }

    .column-body.drag-over {
      background: rgba(14, 99, 156, 0.1);
      border-radius: 4px;
    }

    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 5px;
      padding: 10px 12px;
      margin-bottom: 8px;
      cursor: grab;
      transition: box-shadow 0.15s, transform 0.15s;
      position: relative;
    }

    .card:hover {
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }

    .card.dragging {
      opacity: 0.4;
      transform: rotate(2deg);
    }

    .card-title {
      font-weight: 600;
      margin-bottom: 4px;
      font-size: 13px;
      word-break: break-word;
    }

    .card-desc {
      font-size: 12px;
      opacity: 0.8;
      margin-bottom: 6px;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .card-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .tag {
      background: var(--badge-bg);
      color: var(--badge-fg);
      padding: 1px 7px;
      border-radius: 3px;
      font-size: 11px;
    }

    /* Priority colors */
    .priority-badge, .workload-badge {
      display: inline-block;
      padding: 1px 7px;
      border-radius: 3px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .priority-critical { background: #d32f2f; color: #fff; }
    .priority-high { background: #f57c00; color: #fff; }
    .priority-medium { background: #5c6bc0; color: #fff; }
    .priority-low { background: #66bb6a; color: #fff; }

    .workload-easy { background: #4caf50; color: #fff; }
    .workload-normal { background: #2196f3; color: #fff; }
    .workload-hard { background: #ff9800; color: #fff; }
    .workload-extreme { background: #e53935; color: #fff; }

    .card-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-bottom: 6px;
      align-items: center;
    }

    .card-due {
      font-size: 11px;
      opacity: 0.7;
      margin-bottom: 4px;
    }
    .card-due.overdue { color: #e53935; opacity: 1; }

    .card-subtasks {
      font-size: 11px;
      margin-bottom: 6px;
    }

    .card-subtasks .subtask-item {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 1px 0;
      opacity: 0.85;
    }

    .card-subtasks .subtask-item.done {
      text-decoration: line-through;
      opacity: 0.5;
    }

    .subtask-progress {
      font-size: 10px;
      opacity: 0.6;
      margin-bottom: 3px;
    }

    .card-assignee {
      font-size: 11px;
      opacity: 0.7;
      margin-bottom: 4px;
    }

    .card-group-badge {
      display: inline-block;
      background: #6a1b9a;
      color: #fff;
      padding: 1px 7px;
      border-radius: 3px;
      font-size: 10px;
      font-weight: 600;
    }

    /* Task groups */
    .task-group {
      margin-bottom: 6px;
    }

    .group-header {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 5px 8px;
      background: rgba(106, 27, 154, 0.15);
      border: 1px solid rgba(106, 27, 154, 0.3);
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 4px;
      user-select: none;
    }

    .group-header:hover {
      background: rgba(106, 27, 154, 0.25);
    }

    .group-chevron {
      font-size: 10px;
      transition: transform 0.15s;
    }

    .group-chevron.collapsed {
      transform: rotate(-90deg);
    }

    .group-count {
      background: var(--badge-bg);
      color: var(--badge-fg);
      border-radius: 10px;
      padding: 0 6px;
      font-size: 10px;
      margin-left: auto;
    }

    .group-edit-btn {
      padding: 0 5px;
      font-size: 12px;
      background: transparent;
      color: var(--fg);
      opacity: 0.4;
      border: none;
      cursor: pointer;
      flex-shrink: 0;
    }
    .group-edit-btn:hover {
      opacity: 1;
      background: var(--input-bg);
    }

    .group-body {
      padding-left: 4px;
    }

    .group-body.collapsed {
      display: none;
    }

    .group-body.drag-over {
      background: rgba(106, 27, 154, 0.12);
      border-radius: 4px;
    }

    .ungrouped-zone {
      min-height: 8px;
    }

    .ungrouped-zone.drag-over {
      background: rgba(14, 99, 156, 0.1);
      border-radius: 4px;
    }

    /* Modal enhancements */
    .modal select {
      width: 100%;
      background: var(--input-bg);
      color: var(--input-fg);
      border: 1px solid var(--input-border);
      border-radius: 3px;
      padding: 6px 8px;
      font-size: 13px;
      font-family: inherit;
      margin-bottom: 12px;
    }

    .form-row {
      display: flex;
      gap: 12px;
    }
    .form-row .form-col {
      flex: 1;
    }

    .subtasks-list {
      margin-bottom: 8px;
    }

    .subtask-row {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 4px;
    }

    .subtask-row input[type="checkbox"] {
      width: auto;
      margin: 0;
    }

    .subtask-row input[type="text"] {
      flex: 1;
      margin: 0;
    }

    .subtask-row button {
      padding: 2px 6px;
      font-size: 12px;
      background: var(--danger);
      flex-shrink: 0;
    }

    .add-subtask-btn {
      background: transparent;
      color: var(--fg);
      border: 1px dashed var(--card-border);
      padding: 4px 10px;
      font-size: 12px;
      opacity: 0.7;
      margin-bottom: 12px;
    }
    .add-subtask-btn:hover {
      opacity: 1;
      border-color: var(--accent);
      color: var(--accent);
      background: transparent;
    }

    .priority-dot {
      width: 4px;
      border-radius: 3px 0 0 3px;
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
    }
    .priority-dot-critical { background: #d32f2f; }
    .priority-dot-high { background: #f57c00; }
    .priority-dot-medium { background: #5c6bc0; }
    .priority-dot-low { background: #66bb6a; }

    .card-overlay {
      position: absolute;
      top: 6px;
      right: 6px;
      display: none;
      gap: 2px;
    }

    .card:hover .card-overlay { display: flex; }

    .card-overlay button {
      padding: 1px 5px;
      font-size: 12px;
      background: var(--input-bg);
      color: var(--fg);
      border-radius: 3px;
    }

    .add-card-btn {
      width: 100%;
      background: transparent;
      color: var(--fg);
      border: 1px dashed var(--card-border);
      padding: 8px;
      border-radius: 5px;
      cursor: pointer;
      opacity: 0.6;
      margin-top: 4px;
    }

    .add-card-btn:hover {
      opacity: 1;
      border-color: var(--accent);
      color: var(--accent);
      background: transparent;
    }

    .add-column-placeholder {
      min-width: 280px;
      display: flex;
      align-items: flex-start;
      padding-top: 12px;
      flex-shrink: 0;
    }

    .add-column-placeholder button {
      width: 100%;
      background: transparent;
      color: var(--fg);
      border: 2px dashed var(--card-border);
      padding: 14px;
      border-radius: 6px;
      cursor: pointer;
      opacity: 0.5;
      font-size: 13px;
    }

    .add-column-placeholder button:hover {
      opacity: 1;
      border-color: var(--accent);
      color: var(--accent);
      background: transparent;
    }

    /* Modal */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal {
      background: var(--col-bg);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 20px;
      width: 400px;
      max-width: 90vw;
      max-height: 80vh;
      overflow-y: auto;
    }

    .modal h2 {
      margin-bottom: 16px;
      font-size: 16px;
    }

    .modal label {
      display: block;
      margin-bottom: 4px;
      font-size: 12px;
      font-weight: 600;
    }

    .modal input, .modal textarea {
      width: 100%;
      background: var(--input-bg);
      color: var(--input-fg);
      border: 1px solid var(--input-border);
      border-radius: 3px;
      padding: 6px 8px;
      font-size: 13px;
      font-family: inherit;
      margin-bottom: 12px;
    }

    .modal textarea {
      resize: vertical;
      min-height: 60px;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 8px;
    }

    /* Drop indicator */
    .drop-indicator {
      height: 3px;
      background: var(--accent);
      border-radius: 2px;
      margin: 2px 0;
      transition: opacity 0.15s;
    }
  </style>
</head>
<body>

<div id="app"></div>

<script>
(function() {
  const vscode = acquireVsCodeApi();
  let board = ${boardJson};
  let dragData = null;
  const collapsedGroups = {};

  function render() {
    const app = document.getElementById('app');
    app.innerHTML = '';

    // Toolbar
    const toolbar = el('div', 'toolbar');
    const h1 = el('h1');
    h1.textContent = board.title;
    h1.title = 'Click to rename board';
    h1.onclick = () => renameBoard();
    toolbar.appendChild(h1);

    const actions = el('div', 'toolbar-actions');
    const mdBtn = el('button', 'secondary');
    mdBtn.textContent = '📄 View Markdown';
    mdBtn.onclick = () => vscode.postMessage({ type: 'openMarkdown' });
    actions.appendChild(mdBtn);
    toolbar.appendChild(actions);
    app.appendChild(toolbar);

    // Board
    const boardEl = el('div', 'board');

    for (const column of board.columns) {
      boardEl.appendChild(renderColumn(column));
    }

    // Add column placeholder
    const addColDiv = el('div', 'add-column-placeholder');
    const addColBtn = el('button');
    addColBtn.textContent = '+ Add Column';
    addColBtn.onclick = () => addColumn();
    addColDiv.appendChild(addColBtn);
    boardEl.appendChild(addColDiv);

    app.appendChild(boardEl);
  }

  function renderColumn(column) {
    const colEl = el('div', 'column');

    // Header
    const header = el('div', 'column-header');

    const title = el('span', 'column-title');
    title.textContent = column.name;
    title.title = 'Click to rename';
    title.onclick = () => renameColumn(column.name);
    header.appendChild(title);

    const count = el('span', 'column-count');
    count.textContent = String(column.tasks.length);
    header.appendChild(count);

    const colActions = el('div', 'column-actions');
    const delColBtn = el('button');
    delColBtn.textContent = '✕';
    delColBtn.title = 'Delete column';
    delColBtn.onclick = () => {
      if (column.tasks.length > 0) {
        if (!confirm('Delete column "' + column.name + '" and all its tasks?')) return;
      }
      vscode.postMessage({ type: 'deleteColumn', name: column.name });
    };
    colActions.appendChild(delColBtn);
    header.appendChild(colActions);
    colEl.appendChild(header);

    // Body
    const body = el('div', 'column-body');
    body.dataset.column = column.name;

    body.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      body.classList.add('drag-over');
      updateDropIndicator(body, e.clientY);
    });

    body.addEventListener('dragleave', (e) => {
      if (!body.contains(e.relatedTarget)) {
        body.classList.remove('drag-over');
        removeDropIndicators(body);
      }
    });

    body.addEventListener('drop', (e) => {
      e.preventDefault();
      body.classList.remove('drag-over');
      removeDropIndicators(body);

      if (!dragData) return;
      const toIndex = getDropIndex(body, e.clientY);

      vscode.postMessage({
        type: 'moveTask',
        taskId: dragData.taskId,
        fromColumn: dragData.fromColumn,
        toColumn: column.name,
        toIndex: toIndex,
      });
    });

    // Group tasks
    const grouped = {};
    const ungrouped = [];
    for (const task of column.tasks) {
      if (task.group) {
        if (!grouped[task.group]) grouped[task.group] = [];
        grouped[task.group].push(task);
      } else {
        ungrouped.push(task);
      }
    }

    // Render grouped tasks
    const groupNames = Object.keys(grouped).sort();
    for (const gName of groupNames) {
      const groupEl = el('div', 'task-group');

      const gHeader = el('div', 'group-header');
      const chevron = el('span', 'group-chevron');
      chevron.textContent = '▼';
      gHeader.appendChild(chevron);

      const gLabel = el('span');
      gLabel.textContent = gName;
      gHeader.appendChild(gLabel);

      const gCount = el('span', 'group-count');
      gCount.textContent = String(grouped[gName].length);
      gHeader.appendChild(gCount);

      const gBody = el('div', 'group-body');
      gBody.dataset.group = gName;
      gBody.dataset.column = column.name;

      // Group drop target: dropping here assigns the group + handles reorder
      gBody.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
        gBody.classList.add('drag-over');
        updateDropIndicator(gBody, e.clientY);
      });
      gBody.addEventListener('dragleave', (e) => {
        if (!gBody.contains(e.relatedTarget)) {
          gBody.classList.remove('drag-over');
          removeDropIndicators(gBody);
        }
      });
      gBody.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        gBody.classList.remove('drag-over');
        removeDropIndicators(gBody);
        if (!dragData) return;
        const dropIdx = getDropIndex(gBody, e.clientY);
        // Find absolute index in column.tasks for the group
        const groupTaskIds = grouped[gName].map(t => t.id);
        let absoluteIdx = 0;
        if (dropIdx < groupTaskIds.length) {
          absoluteIdx = column.tasks.findIndex(t => t.id === groupTaskIds[dropIdx]);
        } else if (groupTaskIds.length > 0) {
          absoluteIdx = column.tasks.findIndex(t => t.id === groupTaskIds[groupTaskIds.length - 1]) + 1;
        }
        vscode.postMessage({
          type: 'moveTask',
          taskId: dragData.taskId,
          fromColumn: dragData.fromColumn,
          toColumn: column.name,
          toIndex: absoluteIdx,
        });
        // Assign group
        vscode.postMessage({
          type: 'updateTaskGroup',
          taskId: dragData.taskId,
          group: gName,
        });
      });

      // Also make the group header a drop target
      gHeader.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
        gHeader.style.background = 'rgba(106, 27, 154, 0.35)';
      });
      gHeader.addEventListener('dragleave', (e) => {
        if (!gHeader.contains(e.relatedTarget)) {
          gHeader.style.background = '';
        }
      });
      gHeader.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        gHeader.style.background = '';
        if (!dragData) return;
        if (dragData.fromColumn !== column.name) {
          vscode.postMessage({
            type: 'moveTask',
            taskId: dragData.taskId,
            fromColumn: dragData.fromColumn,
            toColumn: column.name,
            toIndex: column.tasks.length,
          });
        }
        vscode.postMessage({
          type: 'updateTaskGroup',
          taskId: dragData.taskId,
          group: gName,
        });
      });

      for (const task of grouped[gName]) {
        gBody.appendChild(renderCard(task, column.name));
      }

      // Restore collapsed state
      const stateKey = column.name + '::' + gName;
      const isCollapsed = collapsedGroups[stateKey];
      if (isCollapsed) {
        chevron.classList.add('collapsed');
        gBody.classList.add('collapsed');
      }

      // Group edit button
      const gEditBtn = el('button', 'group-edit-btn');
      gEditBtn.textContent = '✎';
      gEditBtn.title = 'Rename group';
      gEditBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        ev.preventDefault();
        const newName = prompt('Rename group:', gName);
        if (newName && newName.trim() && newName.trim() !== gName) {
          vscode.postMessage({ type: 'renameGroup', oldName: gName, newName: newName.trim(), column: column.name });
        }
      });
      gHeader.appendChild(gEditBtn);

      gHeader.addEventListener('click', (ev) => {
        if (gEditBtn.contains(ev.target)) return;
        const nowCollapsed = !gBody.classList.contains('collapsed');
        gBody.classList.toggle('collapsed');
        chevron.classList.toggle('collapsed');
        collapsedGroups[stateKey] = nowCollapsed;
      });

      groupEl.appendChild(gHeader);
      groupEl.appendChild(gBody);
      body.appendChild(groupEl);
    }

    // Ungrouped drop zone: dropping here removes the group + handles reorder
    const ungroupedZone = el('div', 'ungrouped-zone');

    ungroupedZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'move';
      ungroupedZone.classList.add('drag-over');
      updateDropIndicator(ungroupedZone, e.clientY);
    });
    ungroupedZone.addEventListener('dragleave', (e) => {
      if (!ungroupedZone.contains(e.relatedTarget)) {
        ungroupedZone.classList.remove('drag-over');
        removeDropIndicators(ungroupedZone);
      }
    });
    ungroupedZone.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      ungroupedZone.classList.remove('drag-over');
      removeDropIndicators(ungroupedZone);
      if (!dragData) return;
      const dropIdx = getDropIndex(ungroupedZone, e.clientY);
      // Find absolute index in column.tasks for ungrouped area
      const ungroupedIds = ungrouped.map(t => t.id);
      let absoluteIdx = column.tasks.length;
      if (dropIdx < ungroupedIds.length) {
        absoluteIdx = column.tasks.findIndex(t => t.id === ungroupedIds[dropIdx]);
      }
      vscode.postMessage({
        type: 'moveTask',
        taskId: dragData.taskId,
        fromColumn: dragData.fromColumn,
        toColumn: column.name,
        toIndex: absoluteIdx,
      });
      // Clear group
      vscode.postMessage({
        type: 'updateTaskGroup',
        taskId: dragData.taskId,
        group: '',
      });
    });

    for (const task of ungrouped) {
      ungroupedZone.appendChild(renderCard(task, column.name));
    }
    body.appendChild(ungroupedZone);

    // Add task button
    const addBtn = el('button', 'add-card-btn');
    addBtn.textContent = '+ Add Task';
    addBtn.onclick = () => openTaskModal(null, column.name);
    body.appendChild(addBtn);

    colEl.appendChild(body);
    return colEl;
  }

  function renderCard(task, columnName) {
    const card = el('div', 'card');
    card.draggable = true;
    card.dataset.taskId = task.id;
    card.style.position = 'relative';
    card.style.paddingLeft = '16px';

    // Priority color strip
    const dot = el('div', 'priority-dot priority-dot-' + (task.priority || 'medium'));
    card.appendChild(dot);

    card.addEventListener('dragstart', (e) => {
      dragData = { taskId: task.id, fromColumn: columnName };
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      dragData = null;
      document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
      document.querySelectorAll('.drop-indicator').forEach(el => el.remove());
    });

    const titleEl = el('div', 'card-title');
    titleEl.textContent = task.title;
    card.appendChild(titleEl);

    // Meta badges row (priority + workload)
    const meta = el('div', 'card-meta');
    if (task.priority && task.priority !== 'medium') {
      const pb = el('span', 'priority-badge priority-' + task.priority);
      pb.textContent = task.priority;
      meta.appendChild(pb);
    }
    if (task.workload && task.workload !== 'normal') {
      const wb = el('span', 'workload-badge workload-' + task.workload);
      wb.textContent = task.workload;
      meta.appendChild(wb);
    }
    if (meta.childNodes.length > 0) card.appendChild(meta);

    // Due date
    if (task.dueDate) {
      const due = el('div', 'card-due');
      const today = new Date(); today.setHours(0,0,0,0);
      const dueDate = new Date(task.dueDate + 'T00:00:00');
      const isOverdue = dueDate < today;
      if (isOverdue) due.classList.add('overdue');
      due.textContent = '📅 ' + task.dueDate + (isOverdue ? ' (overdue)' : '');
      card.appendChild(due);
    }

    if (task.description) {
      const desc = el('div', 'card-desc');
      desc.textContent = task.description;
      card.appendChild(desc);
    }

    // Assignee
    if (task.assignee) {
      const assigneeEl = el('div', 'card-assignee');
      assigneeEl.textContent = '👤 ' + task.assignee;
      card.appendChild(assigneeEl);
    }

    // Subtasks - only show progress count
    if (task.subtasks && task.subtasks.length > 0) {
      const doneCount = task.subtasks.filter(s => s.done).length;
      const prog = el('div', 'subtask-progress');
      prog.textContent = '✓ ' + doneCount + '/' + task.subtasks.length + ' subtasks';
      card.appendChild(prog);
    }

    if (task.tags && task.tags.length > 0) {
      const tagsEl = el('div', 'card-tags');
      for (const tag of task.tags) {
        const tagEl = el('span', 'tag');
        tagEl.textContent = tag;
        tagsEl.appendChild(tagEl);
      }
      card.appendChild(tagsEl);
    }

    // Overlay actions
    const overlay = el('div', 'card-overlay');
    const editBtn = el('button');
    editBtn.textContent = '✎';
    editBtn.title = 'Edit task';
    editBtn.onclick = (e) => { e.stopPropagation(); openTaskModal(task, columnName); };
    overlay.appendChild(editBtn);

    const delBtn = el('button');
    delBtn.textContent = '✕';
    delBtn.title = 'Delete task';
    delBtn.onclick = (e) => {
      e.stopPropagation();
      vscode.postMessage({ type: 'deleteTask', taskId: task.id });
    };
    overlay.appendChild(delBtn);

    card.appendChild(overlay);
    return card;
  }

  function getDropIndex(body, clientY) {
    const cards = Array.from(body.querySelectorAll('.card'));
    for (let i = 0; i < cards.length; i++) {
      const rect = cards[i].getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) {
        return i;
      }
    }
    return cards.length;
  }

  function updateDropIndicator(body, clientY) {
    removeDropIndicators(body);
    const cards = Array.from(body.querySelectorAll('.card'));
    const indicator = el('div', 'drop-indicator');

    for (let i = 0; i < cards.length; i++) {
      const rect = cards[i].getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) {
        body.insertBefore(indicator, cards[i]);
        return;
      }
    }
    // Insert before the add button
    const addBtn = body.querySelector('.add-card-btn');
    if (addBtn) {
      body.insertBefore(indicator, addBtn);
    } else {
      body.appendChild(indicator);
    }
  }

  function removeDropIndicators(container) {
    container.querySelectorAll('.drop-indicator').forEach(el => el.remove());
  }

  // --- Modals ---

  function openTaskModal(existingTask, columnName) {
    const overlay = el('div', 'modal-overlay');
    const modal = el('div', 'modal');

    const heading = el('h2');
    heading.textContent = existingTask ? 'Edit Task' : 'Add Task';
    modal.appendChild(heading);

    modal.appendChild(labelEl('Title'));
    const titleInput = el('input');
    titleInput.type = 'text';
    titleInput.value = existingTask ? existingTask.title : '';
    titleInput.placeholder = 'Task title...';
    modal.appendChild(titleInput);

    modal.appendChild(labelEl('Description'));
    const descInput = el('textarea');
    descInput.value = existingTask ? existingTask.description : '';
    descInput.placeholder = 'Optional description...';
    modal.appendChild(descInput);

    // Assignee & Group row
    const row0 = el('div', 'form-row');

    const assCol = el('div', 'form-col');
    assCol.appendChild(labelEl('Assignee'));
    const assigneeInput = el('input');
    assigneeInput.type = 'text';
    assigneeInput.value = existingTask ? (existingTask.assignee || '') : '';
    assigneeInput.placeholder = 'Username...';
    assCol.appendChild(assigneeInput);
    row0.appendChild(assCol);

    const grpCol = el('div', 'form-col');
    grpCol.appendChild(labelEl('Group'));
    const groupInput = el('input');
    groupInput.type = 'text';
    groupInput.value = existingTask ? (existingTask.group || '') : '';
    groupInput.placeholder = 'e.g. login, auth...';
    grpCol.appendChild(groupInput);
    row0.appendChild(grpCol);

    modal.appendChild(row0);

    // Priority & Workload row
    const row1 = el('div', 'form-row');

    const priCol = el('div', 'form-col');
    priCol.appendChild(labelEl('Priority'));
    const priSelect = document.createElement('select');
    [{v:'critical',l:'🔴 Critical'},{v:'high',l:'🟠 High'},{v:'medium',l:'🔵 Medium'},{v:'low',l:'🟢 Low'}].forEach(o => {
      const opt = document.createElement('option');
      opt.value = o.v; opt.textContent = o.l;
      priSelect.appendChild(opt);
    });
    priSelect.value = existingTask ? (existingTask.priority || 'medium') : 'medium';
    priCol.appendChild(priSelect);
    row1.appendChild(priCol);

    const wlCol = el('div', 'form-col');
    wlCol.appendChild(labelEl('Workload'));
    const wlSelect = document.createElement('select');
    [{v:'easy',l:'🟢 Easy'},{v:'normal',l:'🔵 Normal'},{v:'hard',l:'🟠 Hard'},{v:'extreme',l:'🔴 Extreme'}].forEach(o => {
      const opt = document.createElement('option');
      opt.value = o.v; opt.textContent = o.l;
      wlSelect.appendChild(opt);
    });
    wlSelect.value = existingTask ? (existingTask.workload || 'normal') : 'normal';
    wlCol.appendChild(wlSelect);
    row1.appendChild(wlCol);

    modal.appendChild(row1);

    // Due date
    modal.appendChild(labelEl('Due Date'));
    const dueDateInput = el('input');
    dueDateInput.type = 'date';
    dueDateInput.value = existingTask ? (existingTask.dueDate || '') : '';
    modal.appendChild(dueDateInput);

    // Subtasks
    modal.appendChild(labelEl('Subtasks'));
    const subtasksList = el('div', 'subtasks-list');
    let subtasks = existingTask ? (existingTask.subtasks || []).map(s => ({...s})) : [];

    function renderSubtasks() {
      subtasksList.innerHTML = '';
      subtasks.forEach((st, i) => {
        const row = el('div', 'subtask-row');
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = st.done;
        cb.onchange = () => { subtasks[i].done = cb.checked; };
        row.appendChild(cb);

        const inp = document.createElement('input');
        inp.type = 'text';
        inp.value = st.title;
        inp.placeholder = 'Subtask...';
        inp.oninput = () => { subtasks[i].title = inp.value; };
        row.appendChild(inp);

        const delBtn = el('button', 'danger');
        delBtn.textContent = '✕';
        delBtn.onclick = () => { subtasks.splice(i, 1); renderSubtasks(); };
        row.appendChild(delBtn);

        subtasksList.appendChild(row);
      });
    }
    renderSubtasks();
    modal.appendChild(subtasksList);

    const addStBtn = el('button', 'add-subtask-btn');
    addStBtn.textContent = '+ Add Subtask';
    addStBtn.onclick = () => {
      subtasks.push({ title: '', done: false });
      renderSubtasks();
      const inputs = subtasksList.querySelectorAll('input[type="text"]');
      if (inputs.length > 0) inputs[inputs.length - 1].focus();
    };
    modal.appendChild(addStBtn);

    modal.appendChild(labelEl('Tags (comma-separated)'));
    const tagsInput = el('input');
    tagsInput.type = 'text';
    tagsInput.value = existingTask ? existingTask.tags.join(', ') : '';
    tagsInput.placeholder = 'bug, feature, urgent';
    modal.appendChild(tagsInput);

    const actions = el('div', 'modal-actions');
    const cancelBtn = el('button', 'secondary');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.onclick = () => overlay.remove();
    actions.appendChild(cancelBtn);

    const saveBtn = el('button');
    saveBtn.textContent = existingTask ? 'Save' : 'Add';
    saveBtn.onclick = () => {
      const title = titleInput.value.trim();
      if (!title) { titleInput.focus(); return; }
      const tags = tagsInput.value
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);
      const validSubtasks = subtasks.filter(s => s.title.trim().length > 0)
        .map(s => ({ title: s.title.trim(), done: s.done }));

      if (existingTask) {
        vscode.postMessage({
          type: 'editTask',
          taskId: existingTask.id,
          title,
          description: descInput.value.trim(),
          tags,
          priority: priSelect.value,
          workload: wlSelect.value,
          dueDate: dueDateInput.value,
          subtasks: validSubtasks,
          assignee: assigneeInput.value.trim(),
          group: groupInput.value.trim(),
        });
      } else {
        vscode.postMessage({
          type: 'addTask',
          column: columnName,
          title,
          description: descInput.value.trim(),
          tags,
          priority: priSelect.value,
          workload: wlSelect.value,
          dueDate: dueDateInput.value,
          subtasks: validSubtasks,
          assignee: assigneeInput.value.trim(),
          group: groupInput.value.trim(),
        });
      }
      overlay.remove();
    };
    actions.appendChild(saveBtn);
    modal.appendChild(actions);

    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    setTimeout(() => titleInput.focus(), 50);
  }

  function renameBoard() {
    const newTitle = prompt('Board title:', board.title);
    if (newTitle && newTitle.trim()) {
      vscode.postMessage({ type: 'updateTitle', title: newTitle.trim() });
      board.title = newTitle.trim();
      render();
    }
  }

  function renameColumn(oldName) {
    const newName = prompt('Column name:', oldName);
    if (newName && newName.trim() && newName.trim() !== oldName) {
      vscode.postMessage({ type: 'renameColumn', oldName, newName: newName.trim() });
    }
  }

  function addColumn() {
    const name = prompt('New column name:');
    if (name && name.trim()) {
      vscode.postMessage({ type: 'addColumn', name: name.trim() });
    }
  }

  // --- Helpers ---

  function el(tag, className) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    return e;
  }

  function labelEl(text) {
    const l = el('label');
    l.textContent = text;
    return l;
  }

  // Listen for board updates from extension
  window.addEventListener('message', (event) => {
    const msg = event.data;
    if (msg.type === 'boardUpdate') {
      board = msg.board;
      render();
    }
  });

  // Initial render
  render();
})();
</script>
</body>
</html>`;
}
