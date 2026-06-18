const ADMIN_CSS = [
  'https://cdnjs.cloudflare.com/ajax/libs/bootstrap/4.6.2/css/bootstrap.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/admin-lte/3.2.0/css/adminlte.min.css',
]

const ADMIN_JS = [
  'https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.4/jquery.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/bootstrap/4.6.2/js/bootstrap.bundle.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/admin-lte/3.2.0/js/adminlte.min.js',
]

function loadLink(href) {
  return new Promise((resolve) => {
    if (document.querySelector(`link[data-admin][href="${href}"]`)) { resolve(); return }
    const el = document.createElement('link')
    el.rel = 'stylesheet'
    el.href = href
    el.setAttribute('data-admin', '1')
    el.onload = resolve
    el.onerror = resolve
    document.head.appendChild(el)
  })
}

function loadScript(src) {
  return new Promise((resolve) => {
    if (document.querySelector(`script[data-admin][src="${src}"]`)) { resolve(); return }
    const el = document.createElement('script')
    el.src = src
    el.setAttribute('data-admin', '1')
    el.onload = resolve
    el.onerror = resolve
    document.body.appendChild(el)
  })
}

let promise = null

export async function loadAdminAssets() {
  if (promise) return promise
  promise = (async () => {
    await Promise.all(ADMIN_CSS.map(loadLink))
    // JS phải load tuần tự: jQuery → Bootstrap → AdminLTE
    for (const src of ADMIN_JS) {
      await loadScript(src)
    }
  })()
  return promise
}
