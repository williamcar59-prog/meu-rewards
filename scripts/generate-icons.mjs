// Gera os ícones PNG (192, 512, maskable-512) a partir do SVG — necessário para PWA/APK
import { Resvg } from '@resvg/resvg-js'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pub = join(root, 'public')
const outDir = join(pub, 'icons')
mkdirSync(outDir, { recursive: true })

// Lê o SVG normal (fundo azul com cantos arredondados) e o maskable (fundo chapado)
const svgAny = readFileSync(join(pub, 'icon.svg'), 'utf8')
const svgMask = readFileSync(join(pub, 'icon-maskable.svg'), 'utf8')

function render(svg, size, filename) {
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: size } })
  const png = resvg.render().asPng()
  writeFileSync(join(outDir, filename), png)
  console.log(`${filename}  ${size}x${size}  ${png.length} B`)
}

render(svgAny, 192, 'icon-192.png')
render(svgAny, 512, 'icon-512.png')
render(svgMask, 512, 'icon-maskable-512.png')
console.log('OK — ícones gerados em public/icons/')
