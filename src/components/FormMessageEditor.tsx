'use client'

import { useMemo, useRef, useState } from 'react'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { useTranslation } from '@/i18n/client'

const paragraph = (children: any[]) => ({ type: 'paragraph', version: 1, children, direction: null, format: '', indent: 0, textFormat: 0, textStyle: '' })
export const emptyMessage = { root: { type: 'root', version: 1, children: [paragraph([])], direction: null, format: '', indent: 0 } }

// Native contenteditable keeps the existing Lexical storage format, without a second editor dependency.
export default function FormMessageEditor({ value, onChange }: { value: any; onChange: (value: any) => void }) {
  const { t } = useTranslation()
  const [initial] = useState(value || emptyMessage)
  const content = useMemo(() => <RichText data={initial} />, [initial])
  const supported = (node: any): boolean => !!node && ['root', 'paragraph', 'text', 'linebreak', 'link', 'list', 'listitem'].includes(node.type) && !node.style && !node.textStyle && !node.indent && node.direction !== 'rtl' && !(node.type === 'list' && node.start > 1) && (!node.format || typeof node.format === 'number' && !(node.format & ~11)) && (!node.fields || node.fields.linkType === 'custom' && !node.fields.newTab) && !(node.type === 'listitem' && node.children?.some((child: any) => child.type === 'list')) && (!node.children || node.children.every(supported))
  const editable = supported(initial.root)
  const editor = useRef<HTMLDivElement>(null)
  const save = () => {
    const inline = (node: Node, format = 0): any[] => {
      if (node.nodeType === Node.TEXT_NODE) return [{ type: 'text', version: 1, text: node.textContent || '', format, detail: 0, mode: 'normal', style: '' }]
      if (!(node instanceof HTMLElement)) return []
      if (node.tagName === 'BR') return [{ type: 'linebreak', version: 1 }]
      if (['B', 'STRONG'].includes(node.tagName)) format |= 1
      if (['I', 'EM'].includes(node.tagName)) format |= 2
      if (node.tagName === 'U') format |= 8
      const children = Array.from(node.childNodes).flatMap(child => inline(child, format))
      if (node.tagName === 'A') {
        const url = node.getAttribute('href') || ''
        if (/^(https?:|mailto:|\/)/i.test(url) && !url.startsWith('//')) return [{ type: 'link', version: 3, children, direction: null, format: '', indent: 0, fields: { linkType: 'custom', url, newTab: false } }]
      }
      return children
    }
    const root = editor.current!
    const container = root.children.length === 1 && root.firstElementChild?.tagName === 'DIV' ? root.firstElementChild : root
    const blocks = Array.from(container.childNodes).flatMap<any>(node => {
      if (node instanceof HTMLElement && ['UL', 'OL'].includes(node.tagName)) return [{ type: 'list', version: 1, listType: node.tagName === 'OL' ? 'number' : 'bullet', tag: node.tagName.toLowerCase(), start: 1, direction: null, format: '', indent: 0, children: Array.from(node.children).map((item, index) => ({ type: 'listitem', version: 1, value: index + 1, children: inline(item), direction: null, format: '', indent: 0 })) }]
      return [paragraph(inline(node))]
    })
    onChange({ root: { ...emptyMessage.root, children: blocks.length ? blocks : [paragraph([])] } })
  }
  const command = (name: string) => { editor.current?.focus(); if (name === 'createLink') { const url = prompt(t('forms.editor.link_url')); if (!url || !/^(https?:|mailto:|\/)/i.test(url) || url.startsWith('//')) return; document.execCommand(name, false, url) } else document.execCommand(name); save() }
  if (!editable) return <div className="space-y-2"><p role="status">{t('forms.editor.advanced_preserved')}</p><RichText data={initial} /></div>
  return <div className="space-y-2"><div className="flex gap-2">{[['bold', 'B'], ['italic', 'I'], ['underline', 'U'], ['insertUnorderedList', '•'], ['createLink', '↗']].map(([name, label]) => <button key={name} type="button" aria-label={t(`forms.editor.format.${name}`)} className="rounded-md border border-input bg-card px-3 py-1.5" onMouseDown={e => e.preventDefault()} onClick={() => command(name)}>{label}</button>)}</div><div ref={editor} className="field" role="textbox" aria-label={t('forms.editor.message')} aria-multiline contentEditable suppressContentEditableWarning onPaste={e => { e.preventDefault(); document.execCommand('insertText', false, e.clipboardData.getData('text/plain')); save() }} onInput={save} onBlur={save}>{content}</div></div>
}
