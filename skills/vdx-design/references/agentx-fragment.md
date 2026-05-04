# AgentX fragment output

This is the **default output mode** of vdx-design. The skill exists to dress up `view/index.html` files inside services scaffolded by `create-agentic-service`. Those files are not standalone web pages — the AgentX runtime injects them into a host page via `innerHTML`, so the rules below are non-negotiable.

## What you are generating

A single HTML *fragment* that:

- Starts with `<section data-vdx-theme="<theme-id>">` and ends with `</section>`. No `<!DOCTYPE>`, no `<html>`, no `<head>`, no `<body>`.
- Loads its own scoped CSS via two `<link>` tags as the first children of the section.
- Contains no `<script>`, no inline `onclick=`/`onsubmit=`, no inline event handlers of any kind.
- Drives all behavior through `data-bind` / `data-bind-html` / `data-action` / `data-tool` / `data-args` attributes (the AgentX runtime owns the event delegation).

## Required skeleton

```html
<section data-vdx-theme="samsung-kr">
  <link rel="stylesheet" href="theme/tokens.css">
  <link rel="stylesheet" href="theme/components.css">

  <!-- your sections here -->
</section>
```

The two stylesheets must already exist under the service's `view/theme/` directory. They are produced by `node ../vdx-design/lib/export-for-agentx.js --theme <id> --target view`, which scopes every selector to `[data-vdx-theme="<id>"]` so the theme cannot leak into the AgentX host page.

## Behavior contract

The AgentX runtime walks the inserted DOM and wires these attributes:

| Attribute | What the runtime does |
| --- | --- |
| `data-bind="key"` | Replaces `textContent` of the element with `data[key]`. |
| `data-bind-html="key"` | Replaces `innerHTML` of the element with `data[key]`. The HTML must be script-free. |
| `data-action="tool_call"` + `data-tool="<service-id>.<tool-name>"` | Calls the tool when the element is clicked. |
| `data-args='{"key":"value"}'` | JSON arguments for `data-action`. Use this for inline buttons that aren't inside a form. |
| `<form>` containing `data-action="tool_call"` | Arguments are gathered from the form's named `<input>`/`<select>`/`<textarea>` values. |

Update events the runtime sends back:

- `show_template` — full screen replacement. Carries `{ requestId, html, data }`.
- `data_update` — patches changed keys only. Use this for refresh ticks.
- `tool_result` — feedback for a clicked button. Carries `{ requestId, tool, status, message, data }`.
- `event_message`, `tool_feedback`, `updated_at` — surface as `data-bind` keys to keep the user informed.

If the service declares `dynamicUiRefresh` in its `harness.json`, the runtime polls a refresh tool and applies the resulting `data_update`. The fragment doesn't need any code to support this — it just needs `data-bind` keys that match what the refresh tool emits.

## What the section can use

Every class in the theme's `components.css` is available — `.btn`, `.btn-primary`, `.btn-ghost`, `.card`, `.input`, `.label`, `.badge`, `.product-card`, the `.grid`/`.grid-2`/`.grid-3` layout helpers, `.stack`/`.stack-lg`, the `.display-*`/`.body-*`/`.caption` typography helpers, `.text-muted`, `.surface-inverse`, etc. Reference `references/component-library.md` for the full catalog.

A few classes from the desktop theme do not earn their keep inside an AgentX panel — `.hero`, `.nav-bar`, `.footer`, `.container-wide`. They still render, but the panel is typically 600–900px wide so full-bleed components feel awkward. Prefer card- and form-driven layouts.

## Token usage rules (unchanged)

- Reference tokens by CSS variable: `color: var(--vdx-colors-text-primary);`. Never literal hex/px values.
- Spacing comes from `--vdx-spacing-1` through `--vdx-spacing-24`.
- Type sizes come from `--vdx-typography-font-size-{caption,bodyS..bodyL,h4..h1,displayM..displayXL}`.

## Common patterns

### Status panel + action form

```html
<section data-vdx-theme="samsung-kr">
  <link rel="stylesheet" href="theme/tokens.css">
  <link rel="stylesheet" href="theme/components.css">

  <header class="stack">
    <p class="caption" data-bind="status_label">대기 중</p>
    <h1 class="display-m" data-bind="page_title">Service title</h1>
  </header>

  <div class="grid grid-2" style="margin-top: var(--vdx-spacing-8);">
    <article class="card">
      <h3>현재 상태</h3>
      <div data-bind-html="status_panel">
        <p class="text-muted">아직 데이터가 없습니다.</p>
      </div>
    </article>

    <form class="card stack">
      <h3>실행</h3>
      <label class="label" for="query">요청</label>
      <input class="input" id="query" name="query" placeholder="원하는 작업">
      <div class="row">
        <button class="btn btn-primary" data-action="tool_call" data-tool="my-svc.run">실행</button>
        <button class="btn btn-ghost" type="reset">초기화</button>
      </div>
      <p class="caption" data-bind="tool_feedback"></p>
    </form>
  </div>
</section>
```

### Row-level inline buttons (via `data-bind-html`)

When a tool produces a table HTML snippet, embed `data-action`/`data-tool`/`data-args` directly in each row's button:

```html
<table class="card">
  <tbody data-bind-html="rows">
    <!-- Server emits something like:
      <tr><td>foo</td><td>
        <button class="btn btn-sm btn-ghost"
          data-action="tool_call"
          data-tool="my-svc.delete"
          data-args='{"id":"foo"}'>삭제</button>
      </td></tr>
    -->
  </tbody>
</table>
```

### Auto-refresh

Don't poll inside a tool handler. Declare it in `harness.json`:

```json
"dynamicUiRefresh": [
  { "tool": "my-svc.refresh-status", "intervalMs": 5000 }
]
```

The refresh tool runs `ctx.updateData({ requestId, data: { status_panel: "..." } })` and the existing `data-bind-html="status_panel"` element updates in place.

## Self-check before delivering

- The output is one `<section data-vdx-theme="…">` and nothing else at the top level.
- Two `<link rel="stylesheet">` tags reference `theme/tokens.css` and `theme/components.css`.
- No `<!DOCTYPE>`, `<html>`, `<head>`, `<body>`, `<script>`, or inline event handlers.
- All colors/sizes/spacing reference `var(--vdx-…)` — no literal hex or px.
- Every dynamic value has a `data-bind` or `data-bind-html`. Every action button has `data-action` + `data-tool` (and `data-args` if not inside a form).
- For action buttons inside `<form>`: form fields with `name` attributes carry the arguments. For buttons inserted via `data-bind-html`: each button has its own `data-args`.
- The `<service-id>` placeholder in `data-tool` is replaced with the real service id from `harness.json`.
