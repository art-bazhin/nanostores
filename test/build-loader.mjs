let sourceRoot = new URL('../src/', import.meta.url).href
let distRoot = new URL('../dist/', import.meta.url).href

// Run the source test suite against the actual published modules.
export async function resolve(specifier, context, nextResolve) {
  let resolved = await nextResolve(specifier, context)
  if (
    resolved.url.startsWith(sourceRoot) &&
    !resolved.url.endsWith('.test.ts')
  ) {
    return {
      shortCircuit: true,
      url: resolved.url.replace(sourceRoot, distRoot).replace(/\.ts$/, '.js')
    }
  }
  return resolved
}
