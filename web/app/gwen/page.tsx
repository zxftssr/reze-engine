"use client"

import { useEffect, useRef, useState } from "react"
import { Engine, Model, PmxLoader, Vec3 } from "reze-engine"
import { fitGwenColliders } from "@/lib/gwen-fit"

const CHARACTERS = [
  { id: "machitan", label: "待兼诗歌剧 · 胜负服", path: "/models/local-characters/machitan/Original/1062_Matikanetannhauser.pmx", credit: "Cygames · arty789456Zx12 / fukuumocha", source: "https://www.deviantart.com/arty789456zx12/art/1329901000" },
  { id: "machitan-casual", label: "待兼诗歌剧 · 休闲服", path: "/models/local-characters/machitan/Casual/1062_Matikanetannhauser.pmx", credit: "Cygames · arty789456Zx12 / fukuumocha", source: "https://www.deviantart.com/arty789456zx12/art/1329901000" },
  { id: "gwen", label: "格温 · 灵罗娃娃", path: "/models/gwen/gwen.pmx", credit: "Riot Games / CHOWZ · N1ghtinGalez", source: "https://www.deviantart.com/n1ghtingalez/art/MMD-FBX-Gwen-Rift-ver-DL-947722078" },
  { id: "soul-gwen", label: "格温 · 斗魂觉醒", path: "/models/local-characters/soul-gwen/Gwen.pmx", credit: "Riot Games · N1ghtinGalez", source: "https://www.deviantart.com/n1ghtingalez/art/MMD-Soul-Fighter-Gwen-DL-972868902" },
  { id: "opera", label: "好歌剧 · 原版", path: "/models/local-characters/opera/T.M. Opera O Apose.pmx", credit: "Cygames · arty789456Zx12 / fukuumocha", source: "https://www.deviantart.com/arty789456zx12/art/1266974485" },
  { id: "opera-casual", label: "好歌剧 · 休闲服", path: "/models/local-characters/opera-casual/T.M. Opera O Casual.pmx", credit: "Cygames · photon56", source: "https://www.deviantart.com/photon56/art/1380367790" },
  { id: "doto", label: "名将怒涛 · 原版", path: "/models/local-characters/doto/Meisho Doto Apose.pmx", credit: "Cygames · arty789456Zx12 / fukuumocha", source: "https://www.deviantart.com/arty789456zx12/art/1266974485" },
  { id: "doto-casual", label: "名将怒涛 · 休闲服", path: "/models/local-characters/doto-casual/Meisho doto Casual.pmx", credit: "Cygames · photon56", source: "https://www.deviantart.com/photon56/art/1380367790" },
]

const MOTIONS = [
  { id: "stand", label: "站立", url: "/animations/1017ui@ui_stand.vmd" },
  { id: "dance", label: "IRIS OUT", url: "/animations/IRIS OUT.vmd" },
  { id: "soda", label: "Soda Pop ♪", url: "/models/gwen/dances/soda-pop.vmd" },
  { id: "naruto", label: "鸣人舞", url: "/models/gwen/dances/naruto.vmd" },
]

export default function GwenPage() {
  const [character, setCharacter] = useState(CHARACTERS[2])
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<Engine | null>(null)
  const modelRef = useRef<Model | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const motionRef = useRef("stand")
  const [ready, setReady] = useState(false)
  const [error, setError] = useState("")
  const [motion, setMotion] = useState("stand")
  const [paused, setPaused] = useState(false)
  const [audioError, setAudioError] = useState("")

  useEffect(() => {
    if (!canvasRef.current) return
    const selected = CHARACTERS.find(item => item.id === new URLSearchParams(window.location.search).get("model")) ?? CHARACTERS[2]
    setCharacter(selected)
    const engine = new Engine(canvasRef.current, {
      camera: { distance: 38, target: new Vec3(0, 10, 0) },
      background: new Vec3(0.12, 0.18, 0.28),
      sun: { strength: 1.5, direction: new Vec3(0.4, -0.5, 0.8) },
    })
    let cancelled = false
    let loading = true
    engineRef.current = engine
    const load = async () => {
      try {
        await engine.init()
        if (cancelled) return
        const model = await PmxLoader.load(selected.path)
        if (cancelled) return
        if (selected.id === "gwen") fitGwenColliders(model)
        await engine.addModel(model, selected.path, selected.id)
        if (cancelled) return
        for (const clip of MOTIONS) {
          await model.loadVmd(clip.id, clip.url)
          if (cancelled) return
        }
        engine.setOutlineEnabled(true)
        model.play("stand", { loop: true })
        modelRef.current = model
        let previousTime = 0
        let previousMotion = "stand"
        engine.runRenderLoop(() => {
          // Audio is the clock for Soda Pop, including seeking and looping.
          if (motionRef.current === "soda" && audioRef.current) {
            model.seek(audioRef.current.currentTime)
          }
          const time = model.getAnimationProgress().current
          // A loop, seek or clip switch teleports the pose. Discard the old
          // cloth/hair momentum rather than pulling it through the new pose.
          if (motionRef.current !== previousMotion || time < previousTime || time - previousTime > 0.5) {
            engine.resetPhysics()
          }
          previousTime = time
          previousMotion = motionRef.current
        })
        setReady(true)
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : String(cause))
      } finally {
        loading = false
        if (cancelled) engine.dispose()
      }
    }
    void load()
    return () => {
      cancelled = true
      modelRef.current = null
      engineRef.current = null
      audioRef.current?.pause()
      // Wait for an in-flight load before releasing its GPU resources.
      if (!loading) engine.dispose()
    }
  }, [])

  const play = (name: string) => {
    audioRef.current?.pause()
    if (audioRef.current) audioRef.current.currentTime = 0
    motionRef.current = name
    // Equal-priority clips queue behind a loop unless it is stopped first.
    modelRef.current?.stop()
    modelRef.current?.play(name, { loop: true })
    engineRef.current?.resetPhysics()
    setMotion(name)
    setPaused(false)
    setAudioError("")
    if (name === "soda") {
      modelRef.current?.pause()
      setPaused(true)
      void audioRef.current?.play().catch(() => {
        if (motionRef.current === "soda") setAudioError("音乐未能播放，请点击下方音频播放器重试。")
      })
    }
  }

  const togglePause = () => {
    if (motionRef.current === "soda") {
      const audio = audioRef.current
      if (!audio) return
      if (audio.paused) void audio.play().catch(() => setAudioError("音乐未能播放，请重试。"))
      else audio.pause()
    } else {
      if (paused) modelRef.current?.play()
      else modelRef.current?.pause()
      setPaused(!paused)
    }
  }

  return (
    <main className="fixed inset-0 overflow-hidden bg-slate-900 text-white">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none" />
      <header className="absolute left-6 right-6 top-6 flex items-start justify-between gap-4">
        <div><h1 className="text-2xl font-semibold">{character.label}</h1><p className="mt-1 text-sm text-white/60">本地 MMD 模型演示</p><nav aria-label="切换角色" className="mt-3 flex max-w-xl flex-wrap gap-2">{CHARACTERS.map(item => <a key={item.id} href={`/gwen?model=${item.id}`} aria-current={character.id === item.id ? "page" : undefined} className="rounded-lg bg-black/50 px-3 py-2 text-sm aria-[current=page]:bg-cyan-700">{item.label}</a>)}</nav></div>
        <a href="/" className="rounded-full bg-black/40 px-4 py-2 text-sm">返回蕾塞 →</a>
      </header>
      {!ready && <div role="status" className="absolute inset-0 flex items-center justify-center p-8 pointer-events-none"><div className="max-w-lg rounded-2xl bg-black/70 p-6">{error ? <>加载失败：{error}<p className="mt-3 text-sm">请使用支持 WebGPU 的浏览器，并确认本地模型及贴图完整。</p></> : `正在加载${character.label}和动作…`}</div></div>}
      <footer className="absolute bottom-6 left-6 right-6 flex flex-col items-center gap-3 text-center">
        <div className="flex flex-wrap justify-center gap-2 rounded-2xl bg-black/50 p-3">
          {MOTIONS.map(({ id, label }) => <button key={id} disabled={!ready} aria-pressed={motion === id} onClick={() => play(id)} className="rounded-xl px-4 py-2 aria-pressed:bg-cyan-700 disabled:opacity-40">{label}</button>)}
          <button disabled={!ready} onClick={togglePause} className="rounded-xl px-4 py-2 disabled:opacity-40">{paused ? "继续" : "暂停"}</button>
          <button disabled={!ready} onClick={() => { const engine = engineRef.current; if (engine) { engine.setCameraTarget(new Vec3(0, 10, 0)); engine.setCameraDistance(38); engine.setCameraAlpha(Math.PI); engine.setCameraBeta(Math.PI / 2) } }} className="rounded-xl px-4 py-2 disabled:opacity-40">重置视角</button>
        </div>
        <audio ref={audioRef} controls loop preload="auto" src="/models/gwen/dances/soda-pop.wav" className={motion === "soda" ? "h-9 max-w-full" : "hidden"} onPlay={() => { setPaused(false); setAudioError("") }} onPause={() => { if (motionRef.current === "soda") setPaused(true) }} />
        {motion === "soda" && audioError && <p role="status" className="text-sm text-amber-200">{audioError}</p>}
        <p className="text-sm text-white/70">拖动旋转视角 · 滚轮缩放 · {motion === "soda" ? "Soda Pop：约 14 秒，含配乐 · 动作：SdemonSS" : motion === "naruto" ? "鸣人舞：约 28 秒，无配乐 · 动作：さうるす" : "通用 MMD 动作，无配乐"}</p>
        <p className="text-xs text-white/50">模型：{character.credit} · <a className="underline" href={character.source} target="_blank" rel="noreferrer">来源与使用规则</a> · 仅本地使用</p>
      </footer>
    </main>
  )
}
