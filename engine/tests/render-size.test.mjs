import { test } from "node:test"
import assert from "node:assert/strict"
import { Engine } from "../dist/engine.js"

// Stop at the first allocation: exercise the real resize entry point, including
// canvas mutation, without mocking the entire renderer's unrelated GPU setup.
globalThis.window = { devicePixelRatio: 1 }
globalThis.GPUTextureUsage = { RENDER_ATTACHMENT: 16 }
const allocated = new Error("first texture allocation")
function renderer(width, height, limit = 8192) {
  const sizes = []
  const engine = Object.assign(Object.create(Engine.prototype), {
    canvas: { clientWidth: width, clientHeight: height, width: 10, height: 10 },
    device: { limits: { maxTextureDimension2D: limit }, createTexture: (desc) => { sizes.push(desc.size); throw allocated } },
    fixedRenderSize: null,
    initPipelineJobs: null,
  })
  return { engine, sizes }
}
function resize(t, engine, dpr = 1) {
  window.devicePixelRatio = dpr
  assert.throws(() => engine.handleResize(), (e) => e === allocated)
}

test("high-DPI landscape and portrait canvases fit the GPU limit proportionally", (t) => {
  for (const [w, h, expected] of [[4800, 2400, [8192, 4096]], [2400, 4800, [4096, 8192]]]) {
    const { engine, sizes } = renderer(w, h)
    resize(t, engine, 2)
    assert.deepEqual(sizes, [expected])
    assert.deepEqual([engine.canvas.width, engine.canvas.height], expected)
  }
})

test("normal, fractional-DPI, hidden and lower-limit canvases allocate valid dimensions", (t) => {
  for (const [w, h, dpr, limit, expected] of [
    [1280, 720, 2, 8192, [2560, 1440]],
    [801, 601, 1.25, 8192, [1001, 751]],
    [0, 0, 2, 8192, [1, 1]],
    [4800, 2400, 2, 4096, [4096, 2048]],
  ]) {
    const { engine, sizes } = renderer(w, h, limit)
    resize(t, engine, dpr)
    assert.deepEqual(sizes, [expected])
  }
})

test("unsupported explicit export dimensions fail before changing the active size or allocating", () => {
  const { engine, sizes } = renderer(1280, 720)
  engine.fixedRenderSize = { width: 1920, height: 1080 }
  for (const [w, h] of [[9600, 4800], [100, 9000], [NaN, 10], [10, Infinity], [-Infinity, 10]]) {
    assert.throws(() => engine.setRenderSize(w, h), RangeError)
    assert.deepEqual(engine.fixedRenderSize, { width: 1920, height: 1080 })
    assert.deepEqual([engine.canvas.width, engine.canvas.height], [10, 10])
    assert.deepEqual(sizes, [])
  }
})

test("pre-init requests are retained, then checked against the actual device before allocation", (t) => {
  const { engine, sizes } = renderer(1280, 720)
  const device = engine.device
  engine.device = null
  engine.setRenderSize(9600, 4800)
  assert.deepEqual(engine.fixedRenderSize, { width: 9600, height: 4800 })
  engine.device = device
  window.devicePixelRatio = 2
  assert.throws(() => engine.handleResize(), RangeError)
  assert.deepEqual(sizes, [])
})

test("supported fixed output stays exact and clearing it restores CSS tracking", (t) => {
  const { engine, sizes } = renderer(1280, 720)
  window.devicePixelRatio = 2
  assert.throws(() => engine.setRenderSize(4096, 2160), (e) => e === allocated)
  assert.deepEqual(sizes.pop(), [4096, 2160])
  assert.throws(() => engine.setRenderSize(null), (e) => e === allocated)
  assert.deepEqual(sizes.pop(), [2560, 1440])
})

test("picking maps CSS clicks into capped or fixed textures while retaining callback coordinates", () => {
  const { engine } = renderer(4800, 2400)
  engine.onRaycast = () => {}
  engine.modelInstances = new Map([["model", {}]])
  let rect = { width: 4800, height: 2400 }
  engine.canvas.getBoundingClientRect = () => rect
  engine.pickTexture = { width: 8192, height: 4096, createView: () => ({}) }
  engine.pickDepthTexture = { createView: () => ({}) }
  engine.forEachInstance = () => {}
  const pass = { setPipeline() {}, setBindGroup() {}, end() {} }
  const copies = []
  const encoder = { beginRenderPass: () => pass, copyTextureToBuffer: (source) => copies.push(source.origin) }
  for (const [x, y, expected] of [[2400, 1200, { x: 4096, y: 2048 }], [4799, 2399, { x: 8190, y: 4094 }], [4800, 2400, { x: 8191, y: 4095 }], [-1, -1, { x: 0, y: 0 }]]) {
    engine.performRaycast(x, y)
    assert.deepEqual(engine.pendingPick, { x, y })
    engine.renderPickPass(encoder)
    assert.deepEqual(copies.pop(), expected)
  }
  // Resizing between input and rendering uses the current displayed size.
  engine.performRaycast(1200.5, 600.25)
  rect = { width: 2401, height: 1200.5 }
  engine.pickTexture.width = 1920
  engine.pickTexture.height = 1080
  engine.renderPickPass(encoder)
  assert.deepEqual(copies.pop(), { x: 960, y: 540 })
  assert.deepEqual(engine.pendingPick, { x: 1200.5, y: 600.25 })
})
