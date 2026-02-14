# PRD — Editor WYSIWYG Avanzato (Angular + ProseMirror)

## 1. Overview

### 1.1 Scopo del prodotto
Realizzare un **editor WYSIWYG avanzato** integrato in Angular, basato su **[ProseMirror](chatgpt://generic-entity?number=0)**, con forte separazione tra:
- **core editor**
- **UI**
- **logica applicativa**

L’editor deve essere:
- modulare
- estendibile
- controllabile
- adatto a contesti enterprise (CMS, backoffice, documentazione, email, knowledge base)

---

### 1.2 Obiettivi principali
- Fornire un’esperienza WYSIWYG moderna e stabile
- Consentire **personalizzazione completa di comandi e icone**
- Supportare **tabelle avanzate**
- Esporre **menu contestuali (click destro)**
- Consentire output **HTML e/o Markdown**
- Integrare l’editor in Angular senza accoppiamenti rigidi

---

### 1.3 Non obiettivi
- Non è un editor “plug & play”
- Non è un page builder visuale
- Non è un sostituto di Word / Google Docs

---

## 2. Stakeholder

| Ruolo | Responsabilità |
|-----|----------------|
| Product Owner | Definizione requisiti |
| Frontend Dev | Integrazione Angular |
| UX/UI Designer | Toolbar, menu, icone |
| Backend Dev | Persistenza contenuti |
| Security | Sanitizzazione output |

---

## 3. Target utenti

- Utenti business (backoffice, CMS)
- Redattori di contenuti
- Team tecnici (documentazione)
- Amministratori di sistema

---

## 4. Stack Tecnologico

### 4.1 Frontend
- Angular (>= 16)
- ProseMirror core
- prosemirror-state
- prosemirror-view
- prosemirror-model
- prosemirror-commands
- prosemirror-history
- prosemirror-tables

### 4.2 UI
- Angular Components
- Angular CDK Overlay (menu contestuali)
- SVG Icons / Design System custom

### 4.3 Output
- HTML
- Markdown (subset controllato)

---

## 5. Architettura

### 5.1 Principi architetturali
- Headless editor
- UI completamente separata
- Command-driven architecture
- No dipendenze Angular nel core editor

---

### 5.2 Componenti principali

---

## 6. Feature funzionali

### 6.1 Editing di base
- Paragrafi
- Heading (H1–H6)
- Bold / Italic / Underline
- Strike
- Inline code
- Code block
- Blockquote

---

### 6.2 Liste
- Liste ordinate
- Liste non ordinate
- Liste annidate

---

### 6.3 Tabelle
- Inserimento tabella (NxM)
- Aggiunta/rimozione righe
- Aggiunta/rimozione colonne
- Celle header
- Merge / split celle
- Navigazione con tastiera (Tab, Enter)

> Nota: alcune feature possono essere limitate in caso di output Markdown.

---

### 6.4 Link e media
- Inserimento link
- Modifica / rimozione link
- Immagini come blocchi
- Attributi immagine (alt, title)

---

### 6.5 Menu contestuali (click destro)
- Attivazione su:
  - testo
  - link
  - tabelle
  - celle
  - immagini
- Menu dinamici in base al contesto
- Override opzionale del menu nativo browser

---

### 6.6 Toolbar
- Toolbar principale
- Toolbar contestuale (bubble menu)
- Toolbar configurabile per:
  - ruolo utente
  - tipo documento
  - output (HTML / Markdown)

---

### 6.7 Comandi custom
- Registry centralizzato dei comandi
- Ogni comando definisce:
  - id
  - label
  - icona
  - shortcut
  - visibilità
  - abilitazione
  - handler

---

### 6.8 Scorciatoie da tastiera
- Shortcut standard (Ctrl+B, Ctrl+I, ecc.)
- Shortcut custom
- Disabilitazione per contesto

---

## 7. Output e serializzazione

### 7.1 HTML
- Output semantico
- HTML pulito e consistente
- Sanitizzazione XSS

### 7.2 Markdown
- Serializer custom
- Subset controllato:
  - no merge celle
  - no HTML inline non supportato
- Fallback automatici

---

## 8. Integrazione Angular

### 8.1 API del componente

```ts
@Input() value: string;
@Input() outputFormat: 'html' | 'markdown';
@Input() config: EditorConfig;

@Output() valueChange: EventEmitter<string>;