type Segment =
    | { kind: 'raw'; text: string }
    | { kind: 'kv'; key: string; value: string }

const KEY_RE = /^[A-Za-z_][A-Za-z0-9_]*$/

export function isValidEnvKey(key: string): boolean {
    return KEY_RE.test(key) && key !== 'undefined' && key !== 'null'
}

export function formatEnvValue(raw: string): string {
    if (/[\n\r"\\#]|^\s|\s$/.test(raw)) {
        const escaped = raw
            .replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
        return `"${escaped}"`
    }
    return raw
}

function parseSegments(content: string): Segment[] {
    const body = content.endsWith('\n') ? content.slice(0, -1) : content
    const lines = body.length ? body.split('\n') : []
    const segments: Segment[] = []
    const seen = new Set<string>()
    for (const line of lines) {
        const match = line.match(/^([^#=]+)=(.*)$/)
        if (!match) { segments.push({ kind: 'raw', text: line }); continue }
        const key = match[1].trim()
        let value = match[2].trim()
        if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
            value = value.slice(1, -1).replace(/\\(.)/g, (_, c) =>
                c === 'n' ? '\n' : c === 'r' ? '\r' : c,
            )
        } else {
            value = value.replace(/\s+#.*$/, '')
        }
        if (seen.has(key)) continue
        seen.add(key)
        segments.push({ kind: 'kv', key, value })
    }
    return segments
}

export function updateEnvContent(
    existing: string,
    vars: Record<string, unknown>,
): string {
    const segments = parseSegments(existing)
    const output: Segment[] = []
    const written = new Set<string>()

    for (const seg of segments) {
        if (seg.kind === 'raw') { output.push(seg); continue }
        if (!isValidEnvKey(seg.key)) continue
        const hasOverride = Object.prototype.hasOwnProperty.call(vars, seg.key)
        if (hasOverride && vars[seg.key] == null) continue
        const value = hasOverride ? String(vars[seg.key]) : seg.value
        output.push({ kind: 'kv', key: seg.key, value })
        written.add(seg.key)
    }
    for (const [k, v] of Object.entries(vars)) {
        if (written.has(k) || v == null || !isValidEnvKey(k)) continue
        output.push({ kind: 'kv', key: k, value: String(v) })
    }

    if (output.length === 0) return ''
    return output.map(seg =>
        seg.kind === 'raw' ? seg.text : `${seg.key}=${formatEnvValue(seg.value)}`,
    ).join('\n') + '\n'
}
