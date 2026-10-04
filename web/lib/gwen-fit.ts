import { Mat4, Model, Quat, Vec3, RigidbodyShape, RigidbodyType } from "reze-engine"

/** Local Gwen collision fit. Apply before addModel creates the physics world. */
export function fitGwenColliders(model: Model) {
  // PMX parsing has not evaluated world matrices yet.
  model.update(0, false)
  const bodies = model.getRigidbodies()
  // The source torso capsules cover only the skeleton's centre, not its surface.
  const torsoRadii: Record<string, number> = { 下半身: 0.9, 上半身: 1.1, 上半身2: 1.2, 頭: 0.95 }
  for (const body of bodies) {
    if (body.name in torsoRadii) body.size.x = torsoRadii[body.name]
    // Voluminous curls need more clearance than the thin source bone capsules.
    if (/^Hair[LR][2-5]$/.test(body.name)) body.size.x = Math.max(body.size.x, 0.65)
    if (/^(Hair[LR]|Dress)/.test(body.name)) body.angularDamping = 0.85
  }
  // Source dress joints lock both swing axes; collision cannot lift the panels
  // away from legs/hands. Allow a modest swing and restore their rest shape.
  for (const joint of model.getJoints()) {
    if (!/^(Hair[LR]|Dress)/.test(joint.name)) continue
    const swing = joint.name.startsWith("Dress") ? 0.35 : 0.25
    joint.rotationMin.x = Math.min(joint.rotationMin.x, -swing)
    joint.rotationMax.x = Math.max(joint.rotationMax.x, swing)
    joint.rotationMin.z = Math.min(joint.rotationMin.z, -swing)
    joint.rotationMax.z = Math.max(joint.rotationMax.z, swing)
    joint.springRotation = new Vec3(8, 8, 8)
  }
  const bones = model.getSkeleton().bones
  for (const side of ["左", "右"]) {
    const elbow = model.getBoneWorldPosition(`${side}ひじ`)
    const wrist = model.getBoneWorldPosition(`${side}手首`)
    if (!elbow || !wrist) continue
    const dx = wrist.x - elbow.x, dy = wrist.y - elbow.y, dz = wrist.z - elbow.z
    const length = Math.hypot(dx, dy, dz)
    const rotation = Quat.toEulerOrder(Quat.fromUnitVectors(new Vec3(0, 1, 0), new Vec3(dx / length, dy / length, dz / length)), "XYZ")
    for (const hand of [false, true]) {
      bodies.push({
        name: `${side}${hand ? "手" : "前腕"}_GwenCollision`, englishName: "",
        boneIndex: bones.findIndex(b => b.name === `${side}${hand ? "手首" : "ひじ"}`),
        group: 0, collisionMask: 0xfffe,
        shape: hand ? RigidbodyShape.Sphere : RigidbodyShape.Capsule,
        size: new Vec3(hand ? 0.65 : 0.5, hand ? 0 : Math.max(0, length - 1), 0),
        shapePosition: hand ? new Vec3(wrist.x, wrist.y, wrist.z) : new Vec3((elbow.x + wrist.x) / 2, (elbow.y + wrist.y) / 2, (elbow.z + wrist.z) / 2),
        shapeRotation: hand ? new Vec3(0, 0, 0) : rotation,
        mass: 0, linearDamping: 0.5, angularDamping: 0.5, restitution: 0, friction: 0.5,
        type: RigidbodyType.Static, bodyOffsetMatrixInverse: Mat4.identity(),
      })
    }
  }
}
