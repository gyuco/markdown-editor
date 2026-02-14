import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { TOOLBAR_ICONS } from './toolbar-icons';
import { EditorService } from '../editor.service';
import { toggleMark, setBlockType } from 'prosemirror-commands';
import { undo, redo } from 'prosemirror-history';
import { mySchema } from '../schema';
import { addColumnAfter, addColumnBefore, deleteColumn, addRowAfter, addRowBefore, deleteRow, deleteTable, mergeCells, splitCell, toggleHeaderColumn, toggleHeaderRow, toggleHeaderCell } from 'prosemirror-tables';
import { EditorState, Transaction } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';

// Prosemirror Command type definition
type Command = (state: EditorState, dispatch?: (tr: Transaction) => void, view?: EditorView) => boolean;

export interface ToolbarItemDef {
  id: string;
  icon: string;
  tooltipKey: keyof ToolbarTranslations;
  action: (view: EditorView) => void;
  isActive?: (state: EditorState) => boolean;
  isVisible?: (state: EditorState) => boolean;
  class?: string;
}

export type ToolbarConfig = string[][];

export interface ToolbarTranslations {
  undo: string;
  redo: string;
  bold: string;
  italic: string;
  paragraph: string;
  h1: string;
  h2: string;
  h3: string;
  h4: string;
  table: string;
  colBefore: string;
  colAfter: string;
  delCol: string;
  rowBefore: string;
  rowAfter: string;
  delRow: string;
  merge: string;
  split: string;
  hCell: string;
  delTable: string;
  rows: string;
  cols: string;
  insert: string;
  cancel: string;
}

export const DEFAULT_TOOLBAR_CONFIG: ToolbarConfig = [
  ['undo', 'redo'],
  ['bold', 'italic'],
  ['paragraph', 'h1', 'h2', 'h3', 'h4'],
  ['table'],
  ['colBefore', 'colAfter', 'delCol', 'rowBefore', 'rowAfter', 'delRow', 'merge', 'split', 'hCell', 'delTable']
];

export const DEFAULT_TOOLBAR_TRANSLATIONS: ToolbarTranslations = {
  undo: 'Undo',
  redo: 'Redo',
  bold: 'Bold',
  italic: 'Italic',
  paragraph: 'Paragraph',
  h1: 'Heading 1',
  h2: 'Heading 2',
  h3: 'Heading 3',
  h4: 'Heading 4',
  table: 'Insert Table',
  colBefore: 'Add Column Before',
  colAfter: 'Add Column After',
  delCol: 'Delete Column',
  rowBefore: 'Add Row Before',
  rowAfter: 'Add Row After',
  delRow: 'Delete Row',
  merge: 'Merge Cells',
  split: 'Split Cell',
  hCell: 'Toggle Header Cell',
  delTable: 'Delete Table',
  rows: 'Rows',
  cols: 'Cols',
  insert: 'Insert',
  cancel: 'Cancel'
};

@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="toolbar">
      <ng-container *ngFor="let group of config; let lastGroup = last">
        <ng-container *ngFor="let itemId of group">
          <!-- Special handling for 'table' to include the popover -->
          <div *ngIf="itemId === 'table'" class="table-group" [style.display]="getItemDisplay(itemId)">
             <button
                [innerHTML]="getIcon(itemId)"
                [attr.data-tooltip]="getTooltip(itemId)"
                [class.active]="isActive(itemId) || showTableCreator"
                (click)="execute(itemId)">
            </button>
            
            <div class="table-creator-popover" *ngIf="showTableCreator">
              <div class="input-group">
                <label>{{ t('rows') }}</label>
                <input type="number" [(ngModel)]="newTableRows" min="1" max="10">
              </div>
              <div class="input-group">
                <label>{{ t('cols') }}</label>
                <input type="number" [(ngModel)]="newTableCols" min="1" max="10">
              </div>
              <div class="actions">
                <button (click)="confirmInsertTable()">{{ t('insert') }}</button>
                <button (click)="showTableCreator = false" class="cancel">{{ t('cancel') }}</button>
              </div>
            </div>
          </div>

          <!-- Normal buttons -->
          <button *ngIf="itemId !== 'table'"
            [innerHTML]="getIcon(itemId)" 
            [attr.data-tooltip]="getTooltip(itemId)"
            [class.active]="isActive(itemId)"
            [class]="getItemClass(itemId)"
            [style.display]="getItemDisplay(itemId)"
            (click)="execute(itemId)">
          </button>
        </ng-container>
        
        <!-- Separator between groups, but only if the next group has visible items -->
        <div class="separator" *ngIf="!lastGroup && isGroupVisible(group) && isNextGroupVisible(group)"></div>
      </ng-container>
    </div>
  `,
  styles: [`
    .toolbar {
      padding: 6px 12px;
      border-radius: 24px;
      background: #edf2fa;
      display: flex;
      gap: 2px;
      flex-wrap: wrap;
      align-items: center;
      position: relative;
      width: 100%;
      box-sizing: border-box;
    }
    .separator {
      width: 1px;
      height: 20px;
      background: #c7c7c7;
      margin: 0 6px;
    }
    button {
      padding: 4px 6px;
      min-width: 28px;
      height: 28px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 4px;
      color: #000000;
      transition: all 0.2s;
      position: relative;
    }
    button:hover {
      background-color: rgba(68, 71, 70, 0.08);
      color: #1f1f1f;
    }
    button:active, button.active {
      background-color: #d3e3fd;
      color: #0b57d0;
    }
    button.danger:hover {
      background: #ffebee;
      color: #c62828;
    }

    /* Tooltip Styles */
    button[data-tooltip]:hover::after {
      content: attr(data-tooltip);
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      margin-bottom: 5px;
      padding: 4px 8px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      font-size: 11px;
      border-radius: 4px;
      white-space: nowrap;
      pointer-events: none;
      z-index: 1000;
      opacity: 0; 
      animation: fadeIn 0.2s forwards;
    }
    
    @keyframes fadeIn {
      to { opacity: 1; margin-bottom: 8px; }
    }
    
    /* Table Group for Popover */
    .table-group {
      position: relative;
      display: flex;
      align-items: center;
    }
    
    .table-creator-popover {
      position: absolute;
      top: 100%;
      left: 0;
      margin-top: 8px;
      background: white;
      border: none;
      box-shadow: 0 1px 3px 0 rgba(60,64,67,.3), 0 4px 8px 3px rgba(60,64,67,.15);
      padding: 16px;
      border-radius: 8px;
      z-index: 100;
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-width: 180px;
    }
    
    .table-creator-popover .input-group {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    
    .table-creator-popover label {
      font-size: 13px;
      color: #444746;
      font-weight: 500;
    }
    
    .table-creator-popover input {
      width: 60px;
      padding: 6px;
      border: 1px solid #c7c7c7;
      border-radius: 4px;
      font-size: 13px;
    }

    .table-creator-popover input:focus {
      outline: none;
      border-color: #0b57d0;
      box-shadow: 0 0 0 2px rgba(11, 87, 208, 0.1);
    }
    
    .table-creator-popover .actions {
      display: flex;
      gap: 8px;
      margin-top: 8px;
    }
    
    .table-creator-popover .actions button {
      flex: 1;
      font-size: 13px;
      padding: 6px 12px;
      height: 32px;
      border-radius: 16px;
      font-weight: 500;
    }

    .table-creator-popover .actions button:first-child {
      background-color: #0b57d0;
      color: white;
    }
    
    .table-creator-popover .actions button:first-child:hover {
      background-color: #0b57d0;
      box-shadow: 0 1px 3px 1px rgba(0,0,0,0.15);
    }

    .table-creator-popover .actions button.cancel {
      background: transparent;
      color: #0b57d0;
    }
    
    .table-creator-popover .actions button.cancel:hover {
      background: rgba(11, 87, 208, 0.08);
    }

    /* Style inner SVG */
    :host ::ng-deep button svg {
      width: 18px;
      height: 18px;
      stroke-width: 2px;
    }
  `]
})
export class ToolbarComponent implements OnInit, OnDestroy {
  @Input() config: ToolbarConfig = DEFAULT_TOOLBAR_CONFIG;
  @Input() translations: Partial<ToolbarTranslations> = {};

  // State
  showTableCreator = false;
  newTableRows = 3;
  newTableCols = 3;
  private subs = new Subscription();

  // Command Registry
  private itemDefs: Record<string, ToolbarItemDef> = {};

  // Cache for icons to avoid re-sanitizing
  private iconCache: Record<string, SafeHtml> = {};

  constructor(private editorService: EditorService, private sanitizer: DomSanitizer) {
    this.initItemDefs();
  }

  ngOnInit() {
    // Force Change Detection when editor state changes to update active/visible states
    this.subs.add(this.editorService.stateChange$.subscribe(() => {
      // Angular change detection will handle the bindings in the template
    }));
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  // Helper to get translation
  t(key: keyof ToolbarTranslations): string {
    return this.translations[key] || DEFAULT_TOOLBAR_TRANSLATIONS[key];
  }

  private initItemDefs() {
    const mkCmd = (cmd: Command, icon: string, tooltipKey: keyof ToolbarTranslations, activeMark?: string) => ({
      id: icon, // using icon key as ID simplified
      icon: TOOLBAR_ICONS[icon as keyof typeof TOOLBAR_ICONS],
      tooltipKey,
      action: (view: EditorView) => {
        cmd(view.state, view.dispatch, view);
        view.focus();
      },
      isActive: activeMark ? (state: EditorState) => this.isMarkActive(state, activeMark) : undefined
    });

    const tblCmd = (cmd: Command, icon: string, tooltipKey: keyof ToolbarTranslations, danger = false) => ({
      id: icon,
      icon: TOOLBAR_ICONS[icon as keyof typeof TOOLBAR_ICONS],
      tooltipKey,
      action: (view: EditorView) => {
        cmd(view.state, view.dispatch, view);
        view.focus();
      },
      isVisible: (state: EditorState) => this.isTableActive(state),
      class: danger ? 'danger' : ''
    });

    this.itemDefs = {
      undo: mkCmd(undo, 'undo', 'undo'),
      redo: mkCmd(redo, 'redo', 'redo'),
      bold: mkCmd(toggleMark(mySchema.marks['strong']), 'bold', 'bold', 'strong'),
      italic: mkCmd(toggleMark(mySchema.marks['em']), 'italic', 'italic', 'em'),
      paragraph: mkCmd(setBlockType(mySchema.nodes['paragraph']), 'paragraph', 'paragraph'),
      h1: mkCmd(setBlockType(mySchema.nodes['heading'], { level: 1 }), 'h1', 'h1'),
      h2: mkCmd(setBlockType(mySchema.nodes['heading'], { level: 2 }), 'h2', 'h2'),
      h3: mkCmd(setBlockType(mySchema.nodes['heading'], { level: 3 }), 'h3', 'h3'),
      h4: mkCmd(setBlockType(mySchema.nodes['heading'], { level: 4 }), 'h4', 'h4'),

      // Table creation
      table: {
        id: 'table',
        icon: TOOLBAR_ICONS.table,
        tooltipKey: 'table',
        action: () => this.toggleTableCreator()
      } as ToolbarItemDef,

      // Table Contextual
      colBefore: tblCmd(addColumnBefore, 'colBefore', 'colBefore'),
      colAfter: tblCmd(addColumnAfter, 'colAfter', 'colAfter'),
      delCol: tblCmd(deleteColumn, 'delCol', 'delCol'),
      rowBefore: tblCmd(addRowBefore, 'rowBefore', 'rowBefore'),
      rowAfter: tblCmd(addRowAfter, 'rowAfter', 'rowAfter'),
      delRow: tblCmd(deleteRow, 'delRow', 'delRow'),
      merge: tblCmd(mergeCells, 'merge', 'merge'),
      split: tblCmd(splitCell, 'split', 'split'),
      hCell: tblCmd(toggleHeaderCell, 'hCell', 'hCell'),
      delTable: tblCmd(deleteTable, 'delTable', 'delTable', true),
    };
  }

  // --- Helpers for Template ---

  getTooltip(id: string): string {
    const def = this.itemDefs[id];
    const key = def?.tooltipKey;
    return key ? this.t(key) : '';
  }

  getIcon(id: string): SafeHtml {
    if (!this.iconCache[id]) {
      const svg = this.itemDefs[id]?.icon || '';
      this.iconCache[id] = this.sanitizer.bypassSecurityTrustHtml(svg);
    }
    return this.iconCache[id];
  }

  getItemClass(id: string): string {
    return this.itemDefs[id]?.class || '';
  }

  isActive(id: string): boolean {
    const def = this.itemDefs[id];
    if (def && def.isActive && this.editorService.editorView) {
      return def.isActive(this.editorService.editorView.state);
    }
    return false;
  }

  getItemDisplay(id: string): string {
    const def = this.itemDefs[id];
    if (def && def.isVisible) {
      if (this.editorService.editorView) {
        return def.isVisible(this.editorService.editorView.state) ? 'flex' : 'none';
      }
      return 'none'; // Default hidden for contextual items if view not ready
    }
    return 'flex'; // Default visible
  }

  execute(id: string) {
    const def = this.itemDefs[id];
    if (def && def.action && this.editorService.editorView) {
      def.action(this.editorService.editorView);
    }
  }

  // Helper for separators
  isGroupVisible(group: string[]): boolean {
    // Check if any item in the group is visible
    return group.some(id => this.getItemDisplay(id) !== 'none');
  }

  isNextGroupVisible(currentGroup: string[]): boolean {
    const config = this.config;
    const idx = config.indexOf(currentGroup);
    if (idx === -1 || idx === config.length - 1) return false;

    // Check subsequent groups until one is found visible
    for (let i = idx + 1; i < config.length; i++) {
      if (this.isGroupVisible(config[i])) return true;
    }
    return false;
  }


  // --- Logic Logic ---

  toggleTableCreator() {
    this.showTableCreator = !this.showTableCreator;
  }

  confirmInsertTable() {
    this.insertTable(this.newTableRows, this.newTableCols);
    this.showTableCreator = false;
  }

  isMarkActive(state: EditorState, markName: string): boolean {
    const { from, $from, to, empty } = state.selection;
    const type = mySchema.marks[markName];
    if (!type) return false;
    if (empty) {
      return !!type.isInSet(state.storedMarks || $from.marks());
    } else {
      return state.doc.rangeHasMark(from, to, type);
    }
  }

  isTableActive(state: EditorState): boolean {
    if (!state) return false;
    const { selection } = state;
    let $pos = selection.$from;
    for (let i = $pos.depth; i > 0; i--) {
      if ($pos.node(i).type.name === 'table') {
        return true;
      }
    }
    return false;
  }

  insertTable(rows: number, cols: number) {
    const view = this.editorService.editorView;
    if (view) {
      const { state, dispatch } = view;
      const tr = state.tr;

      const tableRows: any[] = [];
      for (let i = 0; i < rows; i++) {
        const cells: any[] = [];
        for (let j = 0; j < cols; j++) {
          const cell = mySchema.nodes['table_cell'].createAndFill();
          if (cell) cells.push(cell);
        }
        if (cells.length === cols) {
          const row = mySchema.nodes['table_row'].create(null, cells);
          if (row) tableRows.push(row);
        }
      }

      if (tableRows.length === rows) {
        const node = mySchema.nodes['table'].create(null, tableRows);
        if (node) {
          tr.replaceSelectionWith(node);
          dispatch(tr);
          view.focus();
        }
      }
    }
  }
}

