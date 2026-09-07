import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * onnxruntime-web は `new URL('ort-wasm-simd-threaded.wasm', import.meta.url)` を
 * 持つため、Vite が dist/assets/ にも同じ WASM (約13.9MB) を出力してしまう。
 * 本アプリは ort.env.wasm.wasmPaths = '/ort-wasm/' を指定しており、実行時は
 * public/ort-wasm/ 側だけを読み込むので、重複する assets 側の出力を削除する。
 */
function dropDuplicateOrtWasmAsset(): Plugin {
  return {
    name: 'drop-duplicate-ort-wasm-asset',
    apply: 'build',
    generateBundle(_options, bundle) {
      for (const fileName of Object.keys(bundle)) {
        if (/^assets\/ort-wasm-simd-threaded.*\.wasm$/.test(fileName)) {
          delete bundle[fileName]
          this.warn(
            `[drop-duplicate-ort-wasm-asset] ${fileName} を削除しました (public/ort-wasm/ から配信するため)`
          )
        }
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    dropDuplicateOrtWasmAsset()
  ],
  server: {
    host: true, // 同一Wi-Fi内のスマートフォンからアクセス可能にする
    port: 5188,
  },
})
