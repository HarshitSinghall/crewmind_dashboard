'use client'

/**
 * PDF export via the browser's own print-to-PDF. Deliberately not a server-side
 * PDF renderer: this works offline, needs no dependency, and produces a file he
 * can forward to his partner from his phone. The print stylesheet in
 * globals-print.css strips the chrome.
 */
export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="focusable px-2.5 py-1.5 text-[12px] font-medium rounded-[4px] border print:hidden"
      style={{ borderColor: 'var(--line)', color: 'var(--fg-2)' }}
    >
      Save as PDF
    </button>
  )
}
