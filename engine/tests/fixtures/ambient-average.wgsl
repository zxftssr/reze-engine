#particles 1

// The entire effect is injected into simulation as well as rendering. A call
// used only by particleShade must therefore resolve in the unlit module too.
fn particleInit(id: u32, seed: f32) -> Particle {
  var p: Particle;
  p.life = 1.0;
  p.size = 0.1;
  return p;
}
fn particleStep(p: Particle, dt: f32) -> Particle { return p; }
fn particleShade(p: Particle, uv: vec2f) -> vec4f {
  return vec4f(rzWorldAmbientAvg(), 1.0);
}
