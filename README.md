<img src="./docs/封面-中文.jpg">

# Eagle Video Downloader

[English](./README.en.md) | 中文

从 yt-dlp 支持的网站直接下载视频到 Eagle。基于 [yt-dlp](https://github.com/yt-dlp/yt-dlp) 构建。

## 支持的平台

YouTube、Twitter / X、TikTok、Bilibili、Instagram、Pinterest、Dribbble、Vimeo 以及[更多平台](https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md)。

## 功能特性

支持 yt-dlp 支持的视频网站，首次运行需要在依赖管理页点击安装 yt-dlp，使用 Eagle 官方 FFmpeg 插件合并音视频，下载完成后自动导入到 Eagle 并保存元数据，支持中英文界面，显示实时下载进度。同时支持下载 Pinterest 纯图片 Pin（自动获取高清原图）。

## 新增与改动（3.1.0）

本分支相对上游 3.0.0 的改动如下。

### 下载能力

- 实时进度：下载中显示百分比、速度与剩余时间；合并 / 转码阶段显示估算进度，无法估算时显示不确定进度动画
- 多线程下载：偏好设置新增「下载线程数」（自动 / 8 / 16 / 32 / 64 / 128），映射到 yt-dlp `--concurrent-fragments`，对 HLS / DASH 分片流生效；直链 MP4 仍为单连接
- Twitter / X 受限内容：未登录时 X 对 NSFW / 年龄限制推文返回 TweetTombstone，插件改用公开接口解析直链后交给 yt-dlp 下载，普通推文仍走原有逻辑

### 界面与交互

- 输入框剪贴板按钮：读取系统剪贴板，自动从「文字 + 链接」的混合内容中提取 https 链接，填入后自动点亮下载按钮
- 窗口置顶：右上角图钉按钮，调用 `eagle.window.setAlwaysOnTop`，状态写入 localStorage 并在下次打开时恢复
- 窗口可缩放：最小 360 × 420，缩放停止 300ms 后保存，关闭窗口时立即保存，下次打开恢复上次尺寸
- 删除记录：每个下载项右上角悬停出现 ×，正在下载或解析中的任务不可删除，删除不影响已导入 Eagle 的素材

### 本地桥接

- 插件在 `127.0.0.1:43110` 提供 `GET /ping` 与 `POST /ingest`，供浏览器扩展推送链接
- 仅接受 https 且域名在 x.com / twitter.com / video.twimg.com / pbs.twimg.com 白名单内的链接，请求体上限 16 KB
- 依赖未就绪时返回 503；收到链接后自动入队，并唤起插件窗口

## 浏览器扩展（Edge / Chromium）

配套扩展位于 `edge-extension/`（Manifest V3），在 X / Twitter 的视频与动图下方显示「保存到 Eagle」按钮。

安装步骤：打开 `edge://extensions`，开启「开发人员模式」，点击「加载解压缩的扩展」，选择 `edge-extension/` 目录。

工作方式：

- 内容脚本把「推文链接 + 视频直链」发给后台 service worker
- 后台优先推送到插件桥接端口 `127.0.0.1:43110`，由插件用 yt-dlp 下载（支持 NSFW 与需登录内容）
- 插件未打开或依赖未就绪时，退回 Eagle 本地 API `127.0.0.1:41595` 直接接收直链
- 两者都不可用时，按钮提示「请先打开 Eagle 插件」

注意：走插件桥接需要插件窗口处于打开状态；插件窗口关闭时，仅能借助 Eagle API 下载直链可获取的推文。

## 安装方式

手动安装：下载[最新版本](https://github.com/nyako-cake/eagle-video-downloader/releases)，在 Eagle 中选择 插件 → 开发者选项 → 导入本地项目。

## 首次运行

首次启动时需要在依赖管理页安装 yt-dlp（约 30MB）。ffmpeg 使用 Eagle 官方 FFmpeg 插件；若本地未安装，可在依赖页点击按钮一键跳转至 Eagle 应用商店下载。

## 使用方法

1. 复制视频链接
2. 粘贴到插件输入框
3. 点击下载按钮
4. 下载完成后自动导入到 Eagle

## 常见问题

- 提示「yt-dlp 未安装」：到「依赖管理」页重新安装；若网络无法访问 GitHub，可手动下载 yt-dlp 可执行文件放到插件目录下的 `bin/` 中（Windows 为 `yt-dlp.exe`），重启插件即可
- 下载没有速度或进度不动：优先检查系统代理是否可用，yt-dlp 会沿用系统代理设置
- 浏览器扩展提示「请先打开 Eagle 插件」：插件窗口未打开或依赖未就绪，打开插件窗口后重试
- 受限推文（NSFW / 年龄限制）下载失败：确认插件窗口处于打开状态，插件会通过公开接口解析直链
- 合并阶段百分比跳变：合并进度按输出文件增长估算，小文件可能从 0% 直接跳到 100%

## 开发

```bash
npm install      # 安装依赖
npm run build    # 构建插件
npm run dev      # 开发模式（监听文件变化）
npm run package  # 打包插件
```

项目使用 esbuild 打包，i18next 国际化，yt-dlp 负责视频提取，ffmpeg 由 Eagle 官方 FFmpeg 插件提供。

## 系统要求

Eagle 4.0 或更高版本，需安装 Eagle 官方 FFmpeg 插件，需要网络连接。

## 开源协议

MIT © [fansanqiu](https://github.com/fansanqiu)

本工具仅供个人使用，请遵守视频平台的服务条款和版权法律。

## 致谢

本项目基于 [OlivierEstevez/eagle-twitter-video-downloader](https://github.com/OlivierEstevez/eagle-twitter-video-downloader) 开发，感谢原作者的开创性工作。视频解析与提取由 [yt-dlp](https://github.com/yt-dlp/yt-dlp) 提供支持，音视频合并与转码由 [FFmpeg](https://ffmpeg.org) 提供支持。
