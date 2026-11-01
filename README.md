<img src="./docs/封面-中文.jpg">

# Eagle Video Downloader

[English](./README.en.md) | 中文

从 yt-dlp 支持的网站直接下载视频到 Eagle。基于 [yt-dlp](https://github.com/yt-dlp/yt-dlp) 构建。

## 支持的平台

YouTube、Twitter / X、TikTok、Bilibili、Instagram、Pinterest、Dribbble、Vimeo 以及[更多平台](https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md)。

## 功能特性

支持 yt-dlp 支持的视频网站，首次运行需要在依赖管理页点击安装 yt-dlp，使用 Eagle 官方 FFmpeg 插件合并音视频，下载完成后自动导入到 Eagle 并保存元数据，支持中英文界面，显示实时下载进度。同时支持下载 Pinterest 纯图片 Pin（自动获取高清原图）。

## 安装方式

通过 [Eagle 社区](https://community-cn.eagle.cool/plugins) 安装，或在 Eagle 应用的插件中心搜索安装。

手动安装：下载[最新版本](https://github.com/fansanqiu/eagle-video-downloader/releases)，在 Eagle 中选择 插件 → 开发者选项 → 导入本地项目。

## 首次运行

首次启动时需要在依赖管理页安装 yt-dlp（约 30MB）。ffmpeg 使用 Eagle 官方 FFmpeg 插件；若本地未安装，可在依赖页点击按钮一键跳转至 Eagle 应用商店下载。

## 使用方法

1. 复制视频链接
2. 粘贴到插件输入框
3. 点击下载按钮
4. 下载完成后自动导入到 Eagle

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

## 浏览器扩展（Edge / Chromium）

仓库内 `edge-extension/` 是配套的浏览器扩展（Manifest V3）：在 X / Twitter 的视频与动图下方显示「保存到 Eagle」按钮，点击后把推文链接推送给本机插件自动下载。

- 内容脚本把「推文链接 + 视频直链」发给后台 service worker
- 后台优先推送到插件桥接端口 `127.0.0.1:43110`，由插件用 yt-dlp 下载（支持 NSFW 与需登录内容）
- 插件未打开或依赖未就绪时，退回 Eagle 本地 API `127.0.0.1:41595` 直接接收直链
- 两者都不可用时按钮提示「请先打开 Eagle 插件」

安装：打开 `edge://extensions`，开启「开发人员模式」，选择「加载解压缩的扩展」，指向 `edge-extension/` 目录。
