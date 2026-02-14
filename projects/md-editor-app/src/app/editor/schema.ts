import { Schema } from 'prosemirror-model';
import { schema } from 'prosemirror-schema-basic';
import { addListNodes } from 'prosemirror-schema-list';

import { tableNodes } from 'prosemirror-tables';

// Extend the basic schema with list and table nodes
export const mySchema = new Schema({
  nodes: addListNodes(schema.spec.nodes, 'paragraph block*', 'block').append(tableNodes({
    tableGroup: 'block',
    cellContent: 'block+',
    cellAttributes: {
      background: {
        default: null,
        getFromDOM(dom: any) { return dom.style.backgroundColor || null },
        setDOMAttr(value, attrs) { if (value) attrs['style'] = (attrs['style'] || "") + `background-color: ${value};`; }
      }
    }
  })),
  marks: schema.spec.marks
});
