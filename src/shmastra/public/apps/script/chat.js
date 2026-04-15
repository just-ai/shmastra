import { html } from 'htm/preact';
import { useState, useRef, useEffect, useCallback } from 'preact/hooks';
import { mastra, abort, uploadFile } from './client.js';

const SEND_ICON = html`<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>`;
const STOP_ICON = html`<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>`;
const NEW_ICON = html`<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z"/></svg>`;
const PLUS_ICON = html`<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>`;
const CLOSE_ICON = html`<svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;
const CHEVRON_LEFT = html`<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>`;
const CHEVRON_RIGHT = html`<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>`;


// Load chat styles once
if (!document.getElementById('sc-chat-css')) {
  const link = document.createElement('link');
  link.id = 'sc-chat-css';
  link.rel = 'stylesheet';
  link.href = '/shmastra/public/apps/style/chat.css';
  document.head.appendChild(link);
}

let md = (t) => t;
try {
  const { marked } = await import('https://esm.sh/marked@12');
  marked.setOptions({ breaks: true, gfm: true });
  const embedHtml = (html) => html.replace(
    /<a\s+href="(\/[^"]+\.html)"([^>]*)>([^<]*)<\/a>/g,
    (match, url, attrs, text) =>
      `${match}<iframe class="sc-embed" src="${url}" loading="lazy"></iframe>`
  );
  md = (t) => { try { return embedHtml(marked.parse(t)); } catch { return t; } };
} catch {}

/**
 * Props:
 *
 * Content:
 *   agentId       - required, Mastra agent ID
 *   title         - agent name, shown in empty state and panel tab (default 'AI Assistant')
 *   subtitle      - empty state description (default 'Ask me anything')
 *   placeholder   - input placeholder (default 'Message...')
 *   suggestions   - array of strings for quick-start buttons
 *
 * Memory:
 *   resource      - memory resource id (default 'app')
 *   threadId      - fixed thread id (default: auto-generated per session)
 *
 * Layout:
 *   height        - CSS height for non-panel mode (default '100vh')
 *   class         - extra CSS class on the root element
 *   style         - CSS variables object to override theme, e.g. { '--sc-bg': '#1a1a2e', '--sc-panel-bg': '#16163a' }
 *
 * Panel mode:
 *   panel         - 'right' | 'left' | false (default false)
 *   panelWidth    - initial width in px (default 480)
 *   panelMinWidth - minimum resize width in px (default 320)
 *   panelMaxWidth - maximum resize width in px (default 800, capped at 50% viewport)
 *
 *
 * Callbacks:
 *   onResize      - (width) => void, called when panel width changes or collapses (width=0)
 *   onMessage     - (message) => void, called after each message { role, content }
 *   onError       - (error) => void, called on stream errors
 *   onNewChat     - () => void, called when new chat is started
 *
 * Custom renderers:
 *   renderMessage - (message, index) => vnode, custom message renderer
 *   renderEmpty   - () => vnode, replace default empty state
 *   renderHeader  - () => vnode, render custom content above messages
 */
export function AgentChat(props) {
  const {
    agentId,
    title = 'AI Assistant',
    subtitle = 'Ask me anything',
    placeholder = 'Message...',
    suggestions = [],
    resource = 'app',
    height = '100vh',
    class: className,
    style: styleVars,
    panel = false,
    panelWidth = 480,
    panelMinWidth = 320,
    panelMaxWidth = 800,
    onResize,
    onMessage,
    onError,
    onNewChat,
    renderMessage,
    renderEmpty,
    renderHeader,
  } = props;

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState('');
  const [files, setFiles] = useState([]);
  const [collapsed, setCollapsed] = useState(false);
  const storageKey = panel ? `chat-width-${agentId}` : null;
  const savedWidth = storageKey && parseInt(localStorage.getItem(storageKey));
  const [width, setWidth] = useState(savedWidth || (typeof panelWidth === 'number' ? panelWidth : parseInt(panelWidth) || 480));
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const fileRef = useRef(null);
  const threadRef = useRef(props.threadId || getSessionThread(agentId));
  const dragging = useRef(false);
  const widthRef = useRef(width);
  widthRef.current = width;

  // Build inline style string from styleVars object
  const cssVars = styleVars
    ? Object.entries(styleVars).map(([k, v]) => `${k}:${v}`).join(';')
    : '';

  const scroll = useCallback(() => {
    requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }));
  }, []);

  useEffect(() => { scroll(); }, [messages, streaming]);
  useEffect(() => { if (!collapsed) inputRef.current?.focus(); }, [collapsed]);
  useEffect(() => { if (!loading) inputRef.current?.focus(); }, [loading]);

  // Load message history on mount
  useEffect(() => {
    mastra.listThreadMessages(threadRef.current, { agentId }).then(res => {
      const raw = res?.messages || (Array.isArray(res) ? res : []);
      const msgs = raw
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => {
          const c = m.content;
          const text = typeof c === 'string' ? c : c?.content || '';
          return { role: m.role, content: text };
        })
        .filter(m => m.content);
      if (msgs.length) setMessages(msgs);
    }).catch(() => {});
  }, []);

  // Notify parent of width changes
  useEffect(() => {
    if (panel && onResize) onResize(collapsed ? 0 : width);
  }, [width, collapsed, panel]);

  // Drag-to-resize
  const onDragStart = useCallback((e) => {
    if (!panel) return;
    e.preventDefault();
    dragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const maxW = Math.max(panelMaxWidth, Math.floor(window.innerWidth / 2));
    const onMove = (ev) => {
      if (!dragging.current) return;
      const x = ev.clientX;
      const newW = panel === 'right'
        ? Math.min(maxW, Math.max(panelMinWidth, window.innerWidth - x))
        : Math.min(maxW, Math.max(panelMinWidth, x));
      setWidth(newW);
    };
    const onUp = () => {
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      if (storageKey) localStorage.setItem(storageKey, String(widthRef.current));
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [panel, panelMinWidth, panelMaxWidth, storageKey]);

  const toggleCollapse = useCallback(() => setCollapsed(c => !c), []);

  const onFiles = async (fileList) => {
    for (const file of fileList) {
      const entry = { name: file.name, fileName: null, uploading: true };
      setFiles(prev => [...prev, entry]);
      try {
        const fileName = await uploadFile(file);
        setFiles(prev => prev.map(f => f === entry ? { ...f, fileName, uploading: false } : f));
      } catch {
        setFiles(prev => prev.filter(f => f !== entry));
      }
    }
  };

  const removeFile = (entry) => setFiles(prev => prev.filter(f => f !== entry));

  const send = async (text) => {
    if ((!text.trim() && files.length === 0) || loading) return;
    const attachedFiles = files.filter(f => f.fileName);
    const fileNames = attachedFiles.map(f => f.fileName);
    const msgContent = text.trim() + (fileNames.length ? '\n\nAttached files: ' + fileNames.join(', ') : '');
    const userMsg = { role: 'user', content: text.trim(), files: attachedFiles.map(f => f.name) };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setFiles([]);
    setLoading(true);
    setStreaming('');
    onMessage?.(userMsg);

    try {
      const agent = mastra.getAgent(agentId);
      const response = await agent.stream(
        [{ role: 'user', content: msgContent }],
        { memory: { thread: threadRef.current, resource } }
      );
      let full = '';
      await response.processDataStream({
        onChunk(chunk) {
          if (chunk.type === 'text-delta' && chunk.payload?.text) {
            full += chunk.payload.text;
            setStreaming(full);
          }
        },
      });
      setStreaming('');
      const asstMsg = { role: 'assistant', content: full };
      setMessages(prev => [...prev, asstMsg]);
      onMessage?.(asstMsg);
    } catch (err) {
      if (err?.name !== 'AbortError') {
        const errMsg = { role: 'assistant', content: `Error: ${err?.message || 'Unknown error'}` };
        setMessages(prev => [...prev, errMsg]);
        onError?.(err);
      }
    }
    setLoading(false);
  };

  const newChat = () => {
    abort();
    setMessages([]); setStreaming(''); setLoading(false);
    threadRef.current = genThreadId(agentId);
    inputRef.current?.focus();
    onNewChat?.();
  };

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); }
  };

  const empty = messages.length === 0 && !streaming;

  // Panel mode: collapsible + resizable wrapper
  if (panel) {
    const side = panel;
    const collapseIcon = side === 'right' ? CHEVRON_RIGHT : CHEVRON_LEFT;

    return html`
      ${collapsed && html`
        <button class="sc-panel-tab sc-panel-tab-${side}" onClick=${toggleCollapse} title=${title}>
          <span class="sc-panel-tab-label">${title}</span>
        </button>
      `}
      <div class="sc-chat sc-panel sc-panel-${side} ${collapsed ? 'sc-panel-collapsed' : ''} ${className || ''}" style="width:${width}px;${cssVars}">
        <div class="sc-panel-resize sc-panel-resize-${side}" onMouseDown=${onDragStart} />
        ${!collapsed && html`
          <button class="sc-panel-collapse" onClick=${toggleCollapse} title="Close chat">
            ${collapseIcon}
          </button>
        `}
        ${!collapsed && html`${renderChatBody()}`}
      </div>
    `;
  }

  return html`${renderChatBody()}`;

  function renderChatBody() {
    return html`
    <div class="sc-chat ${className || ''}" style="${panel ? 'height:100%' : `height:${height}`};${!panel ? cssVars : ''}">
      ${renderHeader?.() || null}
      <div class="sc-messages">
        <div class="sc-messages-inner">
          ${empty && (renderEmpty
            ? renderEmpty()
            : html`
              <div class="sc-empty">
                <h3>${title}</h3>
                <p>${subtitle}</p>
                ${suggestions.length > 0 && html`
                  <div class="sc-suggestions">
                    ${suggestions.map(s => html`
                      <button class="sc-suggest-btn" onClick=${() => send(s)}>
                        ${s}
                      </button>
                    `)}
                  </div>
                `}
              </div>
            `
          )}

          ${messages.map((m, i) => renderMessage
            ? renderMessage(m, i)
            : m.role === 'user'
              ? html`
                <div key=${i} class="sc-msg sc-msg-user">
                  <div class="sc-user-bubble">
                    ${m.files?.length > 0 && html`
                      <div class="sc-msg-files">
                        ${m.files.map(f => html`<span class="sc-msg-file">📎 ${f}</span>`)}
                      </div>
                    `}
                    ${m.content}
                  </div>
                </div>
              `
              : html`
                <div key=${i} class="sc-msg sc-msg-asst">
                  <div class="sc-asst-body" dangerouslySetInnerHTML=${{ __html: md(m.content) }} />
                </div>
              `
          )}

          ${streaming && html`
            <div class="sc-msg sc-msg-asst">
              <div class="sc-asst-body" dangerouslySetInnerHTML=${{ __html: md(streaming) }} />
            </div>
          `}

          ${loading && !streaming && html`
            <div class="sc-msg sc-msg-asst">
              <div class="sc-asst-body">
                <div class="sc-dots"><span class="sc-dot"/><span class="sc-dot"/><span class="sc-dot"/></div>
              </div>
            </div>
          `}

          <div ref=${endRef} />
        </div>
      </div>

      <div class="sc-input-wrap">
        ${files.length > 0 && html`
          <div class="sc-files">
            ${files.map(f => html`
              <div class="sc-file-chip ${f.uploading ? 'sc-file-uploading' : ''}">
                <span>📎 ${f.name}</span>
                ${!f.uploading && html`<button onClick=${() => removeFile(f)}>${CLOSE_ICON}</button>`}
                ${f.uploading && html`<span>…</span>`}
              </div>
            `)}
          </div>
        `}
        <input type="file" ref=${fileRef} multiple style="display:none"
          onChange=${(e) => { onFiles(e.target.files); e.target.value = ''; }} />
        <div class="sc-input-inner">
          <button class="sc-btn sc-btn-plus" onClick=${() => fileRef.current?.click()} title="Attach files" disabled=${loading}>${PLUS_ICON}</button>
          <textarea
            ref=${inputRef}
            class="sc-textarea"
            placeholder=${placeholder}
            value=${input}
            onInput=${(e) => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
            onKeyDown=${onKey}
            disabled=${loading}
            rows="1"
          />
          ${loading
            ? html`<button class="sc-btn sc-btn-stop" onClick=${() => abort()}>${STOP_ICON}</button>`
            : input.trim()
              ? html`<button class="sc-btn sc-btn-send" onClick=${() => send(input)}>${SEND_ICON}</button>`
              : messages.length > 0
                ? html`<button class="sc-btn sc-btn-new" onClick=${newChat} title="New chat">${NEW_ICON}</button>`
                : null
          }
        </div>
      </div>
    </div>
  `;
  }
}

function getSessionThread(agentId) {
  const key = `chat-thread-${agentId}`;
  return sessionStorage.getItem(key) || genThreadId(agentId);
}

function genThreadId(agentId) {
  const key = `chat-thread-${agentId}`;
  const id = `${agentId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  sessionStorage.setItem(key, id);
  return id;
}
