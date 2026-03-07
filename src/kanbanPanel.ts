import * as vscode from 'vscode';
import { parseMarkdown, serializeToMarkdown, KanbanBoard, generateId } from './kanbanParser';
import { getWebviewContent } from './webviewContent';

export class KanbanPanel {
  public static readonly viewType = 'mdKanban.boardView';
  private static panels: Map<string, KanbanPanel> = new Map();

  private readonly _panel: vscode.WebviewPanel;
  private readonly _fileUri: vscode.Uri;
  private readonly _context: vscode.ExtensionContext;
  private _board: KanbanBoard;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(context: vscode.ExtensionContext, fileUri: vscode.Uri) {
    const key = fileUri.toString();
    const existing = KanbanPanel.panels.get(key);
    if (existing) {
      existing._panel.reveal(vscode.ViewColumn.One);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      KanbanPanel.viewType,
      'Kanban Board',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    const kanbanPanel = new KanbanPanel(panel, fileUri, context);
    KanbanPanel.panels.set(key, kanbanPanel);
  }

  private constructor(panel: vscode.WebviewPanel, fileUri: vscode.Uri, context: vscode.ExtensionContext) {
    this._panel = panel;
    this._fileUri = fileUri;
    this._context = context;
    this._board = { title: '', columns: [] };

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._panel.webview.onDidReceiveMessage(
      (message) => this._handleMessage(message),
      null,
      this._disposables
    );

    // Watch for external changes to the file
    const watcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(
        vscode.workspace.getWorkspaceFolder(fileUri)!,
        vscode.workspace.asRelativePath(fileUri)
      )
    );
    watcher.onDidChange(() => this._loadAndRefresh());
    this._disposables.push(watcher);

    this._loadAndRefresh();
  }

  private async _loadAndRefresh() {
    try {
      const data = await vscode.workspace.fs.readFile(this._fileUri);
      const content = Buffer.from(data).toString('utf-8');
      this._board = parseMarkdown(content);
    } catch {
      this._board = {
        title: 'Kanban Board',
        columns: [
          { name: 'To Do', tasks: [] },
          { name: 'In Progress', tasks: [] },
          { name: 'Done', tasks: [] },
        ],
      };
    }

    this._panel.title = this._board.title;
    this._panel.webview.html = getWebviewContent(this._panel.webview, this._board);
  }

  private async _save() {
    const md = serializeToMarkdown(this._board);
    await vscode.workspace.fs.writeFile(this._fileUri, Buffer.from(md, 'utf-8'));
  }

  private async _handleMessage(message: { type: string; [key: string]: any }) {
    switch (message.type) {
      case 'addTask': {
        const col = this._board.columns.find(c => c.name === message.column);
        if (col) {
          col.tasks.push({
            id: generateId(),
            title: message.title,
            description: message.description || '',
            tags: message.tags || [],
            priority: message.priority || 'medium',
            workload: message.workload || 'normal',
            dueDate: message.dueDate || '',
            subtasks: message.subtasks || [],
            assignee: message.assignee || '',
            group: message.group || '',
          });
          await this._save();
          this._sendBoardUpdate();
        }
        break;
      }

      case 'editTask': {
        for (const col of this._board.columns) {
          const task = col.tasks.find(t => t.id === message.taskId);
          if (task) {
            task.title = message.title;
            task.description = message.description || '';
            task.tags = message.tags || [];
            task.priority = message.priority || 'medium';
            task.workload = message.workload || 'normal';
            task.dueDate = message.dueDate || '';
            task.subtasks = message.subtasks || [];
            task.assignee = message.assignee || '';
            task.group = message.group || '';
            await this._save();
            this._sendBoardUpdate();
            break;
          }
        }
        break;
      }

      case 'deleteTask': {
        for (const col of this._board.columns) {
          const idx = col.tasks.findIndex(t => t.id === message.taskId);
          if (idx !== -1) {
            col.tasks.splice(idx, 1);
            await this._save();
            this._sendBoardUpdate();
            break;
          }
        }
        break;
      }

      case 'moveTask': {
        const fromCol = this._board.columns.find(c => c.name === message.fromColumn);
        const toCol = this._board.columns.find(c => c.name === message.toColumn);
        if (fromCol && toCol) {
          const taskIdx = fromCol.tasks.findIndex(t => t.id === message.taskId);
          if (taskIdx !== -1) {
            const [task] = fromCol.tasks.splice(taskIdx, 1);
            const insertIdx = Math.min(message.toIndex ?? toCol.tasks.length, toCol.tasks.length);
            toCol.tasks.splice(insertIdx, 0, task);
            await this._save();
            this._sendBoardUpdate();
          }
        }
        break;
      }

      case 'updateTaskGroup': {
        for (const col of this._board.columns) {
          const task = col.tasks.find(t => t.id === message.taskId);
          if (task) {
            task.group = message.group ?? '';
            await this._save();
            this._sendBoardUpdate();
            break;
          }
        }
        break;
      }

      case 'renameGroup': {
        const col = this._board.columns.find(c => c.name === message.column);
        if (col && message.oldName && message.newName) {
          for (const task of col.tasks) {
            if (task.group === message.oldName) {
              task.group = message.newName;
            }
          }
          await this._save();
          this._sendBoardUpdate();
        }
        break;
      }

      case 'addColumn': {
        const colName = (message.name || '').trim();
        if (colName && !this._board.columns.find(c => c.name === colName)) {
          this._board.columns.push({ name: colName, tasks: [] });
          await this._save();
          this._sendBoardUpdate();
        }
        break;
      }

      case 'deleteColumn': {
        const idx = this._board.columns.findIndex(c => c.name === message.name);
        if (idx !== -1) {
          this._board.columns.splice(idx, 1);
          await this._save();
          this._sendBoardUpdate();
        }
        break;
      }

      case 'renameColumn': {
        const col = this._board.columns.find(c => c.name === message.oldName);
        if (col && message.newName.trim()) {
          col.name = message.newName.trim();
          await this._save();
          this._sendBoardUpdate();
        }
        break;
      }

      case 'updateTitle': {
        this._board.title = message.title || 'Kanban Board';
        this._panel.title = this._board.title;
        await this._save();
        break;
      }

      case 'openMarkdown': {
        const doc = await vscode.workspace.openTextDocument(this._fileUri);
        await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
        break;
      }
    }
  }

  private _sendBoardUpdate() {
    this._panel.webview.postMessage({
      type: 'boardUpdate',
      board: this._board,
    });
  }

  public dispose() {
    KanbanPanel.panels.delete(this._fileUri.toString());
    this._panel.dispose();
    while (this._disposables.length) {
      const d = this._disposables.pop();
      if (d) { d.dispose(); }
    }
  }
}
