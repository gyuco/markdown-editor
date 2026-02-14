import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, ViewEncapsulation, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EditorService } from './editor.service';
import { ToolbarComponent, ToolbarConfig, DEFAULT_TOOLBAR_CONFIG, ToolbarTranslations } from './toolbar/toolbar.component';
import { ContextMenuComponent } from './context-menu/context-menu.component';
import { EditorState } from 'prosemirror-state';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-editor',
    standalone: true,
    imports: [CommonModule, ToolbarComponent, ContextMenuComponent],
    template: `
    <div class="editor-wrapper" (contextmenu)="onContextMenu($event)">
      <app-toolbar [config]="toolbarConfig" [translations]="toolbarTranslations"></app-toolbar>
      <div #editorContainer class="editor-container"></div>
      <app-context-menu *ngIf="contextMenuVisible" 
                        [x]="contextMenuX" 
                        [y]="contextMenuY"
                        (actionExecuted)="closeContextMenu()">
      </app-context-menu>
    </div>
  `,
    styleUrls: ['./editor.component.scss'],
    encapsulation: ViewEncapsulation.None,
    providers: [EditorService]
})
export class EditorComponent implements AfterViewInit, OnDestroy, OnChanges {
    @ViewChild('editorContainer') editorContainer!: ElementRef;

    @Input() value: string = '';
    @Input() outputFormat: 'html' | 'markdown' = 'html';
    @Input() toolbarConfig: ToolbarConfig = DEFAULT_TOOLBAR_CONFIG;
    @Input() toolbarTranslations: Partial<ToolbarTranslations> = {};
    @Output() valueChange = new EventEmitter<string>();

    private stateSubscription: Subscription | null = null;
    private isInitializing = true;

    contextMenuVisible = false;
    contextMenuX = 0;
    contextMenuY = 0;

    constructor(private editorService: EditorService, private eRef: ElementRef) { }

    ngAfterViewInit(): void {
        this.editorService.initEditor(this.editorContainer, this.value, this.outputFormat);
        this.isInitializing = false;

        this.stateSubscription = this.editorService.stateChange$.subscribe((state) => {
            const content = this.editorService.getContent(this.outputFormat);
            this.valueChange.emit(content);
        });
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['value'] && !changes['value'].firstChange && !this.isInitializing) {
            const currentContent = this.editorService.getContent(this.outputFormat);
            if (currentContent !== changes['value'].currentValue) {
                this.editorService.setContent(changes['value'].currentValue, this.outputFormat);
            }
        }
    }

    onContextMenu(event: MouseEvent) {
        event.preventDefault();
        this.contextMenuVisible = true;
        this.contextMenuX = event.clientX;
        this.contextMenuY = event.clientY;
    }

    closeContextMenu() {
        this.contextMenuVisible = false;
    }

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent) {
        if (this.contextMenuVisible && !this.eRef.nativeElement.contains(event.target)) {
            this.closeContextMenu();
        }
        // Also close if clicked inside but not on the menu itself (which is handled by actionExecuted)
        // But for now, let's keep it simple: click anywhere closes it if logic dictates.
        // Actually, if we click inside the menu buttons, they emit actionExecuted which closes it.
        // If we click elsewhere, we want to close it.
        this.closeContextMenu();
    }

    ngOnDestroy(): void {
        if (this.stateSubscription) {
            this.stateSubscription.unsubscribe();
        }
    }
}
