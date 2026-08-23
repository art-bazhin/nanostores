import * as moduleApi from 'node:module'

import { resolve } from './loader.mjs'

if (typeof moduleApi.registerHooks === 'function') {
  moduleApi.registerHooks({ resolve })
} else {
  // Node <22.15 has no synchronous hooks. Keep the development command
  // usable there without exposing the deprecated API to current type checks.
  let register = Reflect.get(moduleApi, 'register')
  register('./loader.mjs', import.meta.url)
}
