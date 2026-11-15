const stateKey = Symbol.for('cordis-unload-hygiene-phase3.state')
const emitterKey = Symbol.for('cordis-unload-hygiene-phase3.emitter')
export default function phase3Plugin(ctx) {
  const state = globalThis[stateKey] ??= { applied: 0, disposed: 0 }
  const emitter = globalThis[emitterKey]
  state.applied += 1
  ctx.effect(() => () => { state.disposed += 1 })
  const listener = () => {}
  const interval = setInterval(() => {}, 60000)
  const timeout = setTimeout(() => {}, 60000)
  emitter.on('fixture', listener)
  if (process.env.CORDIS_UNLOAD_FIXTURE_MODE === 'g3') {
    ctx.effect(() => () => {
      clearInterval(interval)
      clearTimeout(timeout)
      emitter.off('fixture', listener)
    })
  } else if (process.env.CORDIS_UNLOAD_FIXTURE_MODE !== 'l3') {
    throw new Error('Invalid fixture mode')
  }
}
