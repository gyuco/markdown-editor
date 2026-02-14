import { Injectable, ElementRef, OnDestroy, NgZone } from '@angular/core';
import { EditorState, Transaction } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { Schema, DOMParser, DOMSerializer } from 'prosemirror-model';
import { schema } from 'prosemirror-schema-basic';
import { addListNodes } from 'prosemirror-schema-list';

import { keymap } from 'prosemirror-keymap';
import { history } from 'prosemirror-history';
import { baseKeymap } from 'prosemirror-commands';
import { dropCursor } from 'prosemirror-dropcursor';
import { gapCursor } from 'prosemirror-gapcursor';
import { mySchema } from './schema';
import { Subject, Observable } from 'rxjs';
import { defaultMarkdownParser, defaultMarkdownSerializer, MarkdownParser, MarkdownSerializer } from 'prosemirror-markdown';
import { tableEditing, columnResizing } from 'prosemirror-tables';

// @ts-ignore
import MarkdownIt from 'markdown-it';

const tokenizer = MarkdownIt('commonmark', { html: false });
// Enable GFM tables
tokenizer.enable('table');

const tableTokens = {
    table: { block: "table" },
    thead: { ignore: true },
    tbody: { ignore: true },
    tr: { block: "table_row" },
    th: { block: "table_header" },
    td: { block: "table_cell" }
};

// Combine default tokens with table tokens
const tokens = {
    ...(defaultMarkdownParser as any).tokens,
    ...tableTokens
};

export const myMarkdownParser = new MarkdownParser(
    mySchema,
    tokenizer,
    tokens
);

const tableSerializer = {
    table(state: any, node: any) {
        state.renderContent(node);
    },
    table_row(state: any, node: any) {
        state.write("|");
        node.forEach((cell: any, _: any, i: number) => {
            state.render(cell, node, i);
            state.write("|");
        });
        state.ensureNewLine();
    },
    table_cell(state: any, node: any) {
        state.renderInline(node);
    },
    table_header(state: any, node: any) {
        state.renderInline(node);
    }
};

// We need to extend the default serializer. 
// Since nodes and marks are properties of the serializer class instance, we can't just spread them easily if they are not exposed.
// However, ProseMirror's defaultMarkdownSerializer exposes `nodes` and `marks`.
export const myMarkdownSerializer = new MarkdownSerializer(
    {
        ...(defaultMarkdownSerializer.nodes),
        ...tableSerializer
    },
    {
        ...(defaultMarkdownSerializer.marks)
    }
);
// We need to patch the table_row to handle the header separator line if it's the first row
// But standard GFM table serialization is a bit more complex (alignment, etc.)
// For a simple implementation, we can try to rely on a library or write a slightly smarter serializer.
// Let's improve table_row to print the separator after the first row (headers).

(myMarkdownSerializer.nodes as any).table_row = function (state: any, node: any) {
    state.write("|");
    node.forEach((cell: any, _: any, i: number) => {
        state.render(cell, node, i);
        state.write("|");
    });
    state.ensureNewLine();
    // If this is the header row (first row of table), print separator
    if (node.child(0).type.name === 'table_header') {
        state.write("|");
        node.forEach((cell: any) => {
            state.write("---|");
        });
        state.ensureNewLine();
    }
}

@Injectable({
    providedIn: 'root'
})
export class EditorService implements OnDestroy {
    private view!: EditorView;
    private stateChangeSubject = new Subject<EditorState>();

    public stateChange$: Observable<EditorState> = this.stateChangeSubject.asObservable();

    constructor(private ngZone: NgZone) { }

    initEditor(element: ElementRef, content: string, format: 'html' | 'markdown' = 'html'): void {
        const plugins = [
            columnResizing(),
            tableEditing(),
            history(),
            keymap(baseKeymap),
            dropCursor(),
            gapCursor()
        ];

        let doc;
        if (format === 'markdown') {
            try {
                doc = myMarkdownParser.parse(content);
            } catch (e) {
                console.warn('Failed to parse markdown', e);
                // Fallback to empty doc or text
                doc = mySchema.node('doc', null, [mySchema.node('paragraph', null, [mySchema.text(content || ' ')])]);
            }
        } else {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = content;
            doc = DOMParser.fromSchema(mySchema).parse(tempDiv);
        }

        this.ngZone.runOutsideAngular(() => {
            this.view = new EditorView(element.nativeElement, {
                state: EditorState.create({
                    schema: mySchema,
                    doc: doc as any, // Parser might return a Node from a different schema instance, but structure should match
                    plugins: plugins
                }),
                dispatchTransaction: (tr: Transaction) => {
                    const newState = this.view.state.apply(tr);
                    this.view.updateState(newState);
                    this.ngZone.run(() => {
                        this.stateChangeSubject.next(newState);
                    });
                }
            });
        });
    }

    setContent(content: string, format: 'html' | 'markdown' = 'html'): void {
        if (!this.view) return;

        let doc;
        if (format === 'markdown') {
            doc = myMarkdownParser.parse(content);
        } else {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = content;
            doc = DOMParser.fromSchema(mySchema).parse(tempDiv);
        }

        // Replace valid range
        const tr = this.view.state.tr.replaceWith(0, this.view.state.doc.content.size, doc as any);
        this.view.dispatch(tr);
    }

    getContent(format: 'html' | 'markdown'): string {
        if (!this.view) return '';

        if (format === 'markdown') {
            return myMarkdownSerializer.serialize(this.view.state.doc);
        } else {
            const div = document.createElement('div');
            const fragment = DOMSerializer.fromSchema(mySchema).serializeFragment(this.view.state.doc.content);
            div.appendChild(fragment);
            return div.innerHTML;
        }
    }

    get editorView(): EditorView {
        return this.view;
    }

    destroy(): void {
        if (this.view) {
            this.view.destroy();
        }
    }

    ngOnDestroy(): void {
        this.destroy();
    }
}
