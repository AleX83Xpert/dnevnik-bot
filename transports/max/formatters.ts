// MAX message formatting helpers
// MAX supports HTML format: <b>, <i>, <s>, <u>, <a>, <br>
// See: https://dev.max.ru/docs-api

export function escHtml (text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function boldHtml (text: string): string {
  return `<b>${text}</b>`
}
