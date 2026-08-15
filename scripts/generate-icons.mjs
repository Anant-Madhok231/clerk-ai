// Regenerates every raster icon from apps/desktop/build/icon.svg (and the
// tray template) — run with `npm run generate:icons` after editing the
// master SVG. macOS-only for the .icns step (uses the system `iconutil`).
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import pngToIco from 'png-to-ico'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..')
const desktopBuild = join(repoRoot, 'apps/desktop/build')
const masterSvg = readFileSync(join(desktopBuild, 'icon.svg'))
const traySvg = readFileSync(join(desktopBuild, 'icon-tray-template.svg'))

const PNG_SIZES = [16, 24, 32, 48, 64, 128, 256, 512, 1024]

async function renderPng(svgBuffer, size, outPath) {
  mkdirSync(dirname(outPath), { recursive: true })
  await sharp(svgBuffer).resize(size, size).png().toFile(outPath)
}

async function generatePngSet() {
  const outDir = join(desktopBuild, 'icons')
  for (const size of PNG_SIZES) {
    await renderPng(masterSvg, size, join(outDir, `${size}x${size}.png`))
  }
  console.log(`✓ PNG set (${PNG_SIZES.join(', ')}) -> ${outDir}`)
}

async function generateIcns() {
  const iconset = mkdtempSync(join(tmpdir(), 'clerk-icon-')) + '.iconset'
  mkdirSync(iconset)
  const nameFor = (size, scale) => (scale === 2 ? `icon_${size}x${size}@2x.png` : `icon_${size}x${size}.png`)

  for (const size of [16, 32, 128, 256, 512]) {
    await renderPng(masterSvg, size, join(iconset, nameFor(size, 1)))
    await renderPng(masterSvg, size * 2, join(iconset, nameFor(size, 2)))
  }

  try {
    execFileSync('iconutil', ['-c', 'icns', iconset, '-o', join(desktopBuild, 'icon.icns')])
    console.log('✓ icon.icns')
  } catch (error) {
    console.warn('⚠ Skipped .icns (iconutil unavailable on this platform):', error.message)
  } finally {
    rmSync(iconset, { recursive: true, force: true })
  }
}

async function generateIco() {
  const pngPaths = []
  const tmp = mkdtempSync(join(tmpdir(), 'clerk-ico-'))
  for (const size of [16, 32, 48, 64, 128, 256]) {
    const p = join(tmp, `${size}.png`)
    await renderPng(masterSvg, size, p)
    pngPaths.push(p)
  }
  const icoBuffer = await pngToIco(pngPaths)
  writeFileSync(join(desktopBuild, 'icon.ico'), icoBuffer)
  rmSync(tmp, { recursive: true, force: true })
  console.log('✓ icon.ico')
}

async function generateTrayIcons() {
  const outDir = join(repoRoot, 'apps/desktop/resources/tray')
  await renderPng(traySvg, 22, join(outDir, 'trayIconTemplate.png'))
  await renderPng(traySvg, 44, join(outDir, 'trayIconTemplate@2x.png'))
  console.log('✓ tray icons ->', outDir)
}

await generatePngSet()
await generateIcns()
await generateIco()
await generateTrayIcons()
console.log('Done.')
