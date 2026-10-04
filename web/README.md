# Demo resource modes

`next dev` loads models, animations and audio from `public/`. Production builds
use `assets.reze.one` by default to preserve the deployed site's CDN delivery.
The CDN must allow the deployment's origin through CORS; its production policy
does not allow localhost.

For a local production preview, build with local resources:

```sh
NEXT_PUBLIC_LOCAL_ASSETS=1 npm run build -- --webpack
npm run start -- -H 127.0.0.1 -p 14003
```

Keep `public/models/reze`, `public/animations`, `public/audios`, and the tutorial
assets in `public/models` with the build. This option is embedded at build time;
setting it only when starting the server does not change an existing build.
Rebuild without the flag to use the CDN again. A deployment using local assets
serves their traffic from its own host.

## 本地格温演示

在 `web` 目录运行 `npm run dev`，打开 `http://localhost:4001/gwen`，
或从首页点击「切换到格温」。拖动旋转视角，滚轮缩放；底部按钮可以
切换站立、IRIS OUT、Soda Pop 和鸣人舞，支持暂停/继续以及重置视角。
Soda Pop 附约 14 秒配乐，动作跟随音频进度；可通过播放器拖动进度和调节音量。
鸣人舞约 28 秒，保留作者提供的 0.8 倍速动作，不含音乐。
这些是通用 MMD 动作，并非为格温专门制作，可能出现局部穿模。

新增动作保存在 `public/models/gwen/dances/`，随格温目录一起被 Git 忽略。
Soda Pop 动作作者为 SdemonSS，鸣人舞作者为「さうるす」；来源与使用说明
保存在该目录的 `SOURCES.txt`。Soda Pop 的镜头文件也已保留，当前页面
使用可手动旋转的视角。

格温加载时会在内存中适配物理碰撞：补充前臂和手部碰撞体、扩大躯干与卷发
的碰撞范围，并给裙摆和卷发关节增加小幅摆动空间及回弹阻尼。切换动作、
循环回到开头或跳转进度时会重置物理惯性。原始 PMX 文件不修改。
这能缓解物理拉扯和穿插，但通用动作中的贴身手势仍可能需要逐帧调整。

模型来自 [N1ghtinGalez 的 Gwen Rift ver](https://www.deviantart.com/n1ghtingalez/art/MMD-FBX-Gwen-Rift-ver-DL-947722078)。
原角色资源：Riot Games / CHOWZ；绑定：N1ghtinGalez。作者要求署名且禁止转载。
将压缩包内 `Gwen WildRift` 目录中的 `gwen.pmx` 和全部 JPG/DDS 贴图
放在 `web/public/models/gwen/`，保留文件名与相对位置；不需要 FBX。
本机已导入。该目录已被 Git 忽略，克隆仓库后需要自行取得模型。
`/gwen` 始终使用本地模型及 `public/animations/` 中的动作资源。
不要将此本地资源目录随站点构建一起公开发布。

## 新增本地角色

`/gwen` 顶部可切换普通格温、斗魂觉醒格温、好歌剧（原版/休闲服）和
名将怒涛（原版/休闲服）。角色链接使用完整页面导航，以释放旧角色的 GPU、
音频和物理资源。未知 `model` 参数回到普通格温。新增资源在
`public/models/local-characters/`，已加入 Git 忽略；不得随公开部署分发。
模型来源及署名见页面链接。原包中的 MME `.fx` 已保留，但 WebGPU 查看器
不执行这些着色器，所以光照、眼睛和脸部效果可能不同于原作者预览。
普通格温专用碰撞修正不会套用到其他角色。所有角色可选择现有四组动作，
通用动作不保证与每个角色完全匹配。东海帝皇下载包目前只有语音，未接入模型。

待兼诗歌剧（Matikanetannhauser / マチカネタンホイザ）已单独加入：
`/gwen?model=machitan` 为截图中的蓝白帽、红色束腰、蓝裙胜负服，
`/gwen?model=machitan-casual` 为休闲服。来源：
https://www.deviantart.com/arty789456zx12/art/1329901000 。
原先错写为“诗歌剧”的 T.M. Opera O 已更正为“好歌剧”；两者是不同角色。
新文件保存在已忽略的 `public/models/local-characters/machitan/` 下，
作者署名和使用说明见该目录 `SOURCE.txt`。
