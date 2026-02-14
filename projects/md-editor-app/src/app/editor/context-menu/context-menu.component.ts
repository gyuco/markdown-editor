import { Component, Input, Output, EventEmitter, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EditorService } from '../editor.service';
import { toggleMark } from 'prosemirror-commands';
import { mySchema } from '../schema';

@Component({
    selector: 'app-context-menu',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="context-menu" [style.top.px]="y" [style.left.px]="x">
      <button (click)="toggleBold()">Bold</button>
      <button (click)="toggleItalic()">Italic</button>
    </div>
  `,
    styles: [`
    .context-menu {
      position: fixed;
      background: white;
      border: 1px solid #ccc;
      box-shadow: 2px 2px 5px rgba(0,0,0,0.2);
      z-index: 1000;
      display: flex;
      flex-direction: column;
      padding: 5px 0;
      border-radius: 4px;
    }
    button {
      background: none;
      border: none;
      padding: 8px 15px;
      text-align: left;
      cursor: pointer;
      font-size: 14px;
    }
    button:hover {
      background-color: #f0f0f0;
    }
  `]
})
export class ContextMenuComponent {
    @Input() x = 0;
    @Input() y = 0;
    @Output() actionExecuted = new EventEmitter<void>();

    constructor(private editorService: EditorService, private elementRef: ElementRef) { }

    toggleBold() {
        this.execCommand(toggleMark(mySchema.marks['strong']));
        this.actionExecuted.emit();
    }

    toggleItalic() {
        this.execCommand(toggleMark(mySchema.marks['em']));
        this.actionExecuted.emit();
    }

    private execCommand(command: any) {
        const view = this.editorService.editorView;
        if (view) {
            command(view.state, view.dispatch, view);
            view.focus();
        }
    }
}
