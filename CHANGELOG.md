# Changelog

## 3.6.1

新增功能：

- 偏好设置新增「小红书标签」开关：开启时把笔记话题写入 Eagle 标签（默认），关闭后小红书下载不带任何标签

体验优化：

- 该开关只影响小红书，其他站点仍按原逻辑写入平台标签

## 3.6.0

新增功能：

- 小红书（xiaohongshu.com）：支持笔记图片与视频下载，可识别 /explore/、/discovery/item/ 链接与 xhslink.com 短链
- 标题作为文件名：笔记标题自动用作保存文件名，多图按标题_1、标题_2 编号
- 正文作为注释：笔记正文自动写入 Eagle 注释，注释上限由 500 字符提高到 5000 字符
- 话题作为标签：笔记话题自动写入 Eagle 标签，不再只写站点名
- 图片原图：优先下载原图；HEIC 原图自动改用 CDN 转码的全尺寸 JPEG，并按实际文件头修正扩展名（PNG / WebP 等）
- 视频直链：自动选择体积最大的一档（同体积优先 h264）下载
- 局域网接收：允许通过局域网发送小红书笔记链接
- 浏览器扩展：小红书笔记页右下角新增「保存到 Eagle」浮动按钮，扩展清单版本 1.1.0；局域网发送同样支持小红书链接

注意事项：

- 未登录读取笔记需要链接携带 xsec_token，请从 App 分享菜单或浏览器地址栏复制完整链接；只有笔记 ID 的链接会提示无法读取

## 3.5.1

新增功能：

- 局域网发送：插件桥接改为监听 0.0.0.0:43110，并新增 `/peers` 扫描同网段内运行本插件的设备
- 浏览器扩展弹窗新增「局域网设备」区域，可扫描、选择设备并发送当前页面链接，本机不下载
- 推文操作栏新增分享按钮，可把推文链接直接发送到局域网设备
- 推文分享菜单内也注入「分享到局域网设备」选项
- 局域网设备列表与选择结果会保存，下次打开扩展弹窗无需重新扫描和选择

体验优化：

- 下载去重：同一条推文或 Sankaku 投稿在 24 小时内只会下载一次，扩展推送与自动抓取不会重复入队
- 下载成功后会同步标记为已处理，自动抓取不会再抓到同一条内容


## 3.5.0

新增功能：

- Twitter / X 账号 Cookie 配置：填入 auth_token 与 ct0 后，账号页会常驻显示头像、昵称与用户名
- 自动获取新增点赞与收藏：可分别勾选「抓取点赞」「抓取收藏」，按所选时间（2 分钟至 3 小时）定时抓取并自动加入下载队列
- 新增「抓取测试」按钮，点击后立即执行一次抓取
- 启动时自动补抓上次关闭后新增的内容，翻页直到覆盖上次检查时间
- 账号资料、监控开关、时间选择与抓取记录按 Eagle 资源库隔离，切换资源库自动跟随

体验优化：

- Sankaku 账号输入框改为密码框，与推特账号一致
- 修复一条推文包含多个视频时只下载第一个的问题，现在逐个抓取每个视频的直链
- 修复监控状态栏时间显示为 NaN 的问题
- 账号页布局调整：两个 Cookie 输入框并排、时间选择与来源复选框同排对齐


## 3.4.0

新增功能：

- 浏览器扩展：点赞或收藏帖子时自动推送链接到 Eagle，扩展弹窗内可分别开关
- 推送时若 Eagle 插件未打开，扩展会通过 Eagle 本地接口主动唤醒插件窗口，就绪后再推送
- 插件设置新增「账号」分页，用于集中存放各站点账号与 Cookie
- 账号 Cookie 输入框会随内容自动增高，不再出现滚动条

体验优化：

- yt-dlp 后处理失败（ffmpeg 报 Invalid data found）时，自动改用直链或单一最佳格式重试
- 浏览器扩展描述与弹窗文案更新为当前支持的能力


## 3.3.0

适配站点：

- Sankaku（sankaku.app / sankakucomplex.com）：投稿页视频与图片下载，支持 NSFW 与仅登录可见的投稿
- Twitter / X 图片：图片推文下载，多图按原图尺寸保存

新增功能：

- 设置页新增「Sankaku 账号」，粘贴 accessToken / Cookie 即可下载仅登录可见的投稿
- 推文与投稿下载时，把正文写入 Eagle 的注释字段
- 点击输入框左侧的粘贴按钮后直接开始下载，无需再点一次下载按钮
- 浏览器扩展支持 Sankaku；推文下载按钮注入到操作栏（分享按钮旁），图片推文同样可用

优化：

- 媒体解析改走站点公开接口，直链失效时自动回退到备用方案
- 图片下载改由 yt-dlp 执行，继承系统代理，解决部分网络下图片直连超时
- 下载完成后的合并/转码阶段显示估算进度
- 偏好设置支持下载线程数与窗口尺寸记忆


## 3.2.0

新增 Sankaku（sankaku.app）支持：

- 支持 sankaku.app / sankakucomplex.com 投稿页的视频与图片下载
- 通过站点公开 API 按投稿 ID 解析，自动把带签名的 CDN 直链与 Referer 交给 yt-dlp
- 需要登录或受限的投稿会给出明确提示，不会卡在解析阶段


## 3.1.0

界面与交互：

- 新增浏览器扩展 `edge-extension/`：在 X / Twitter 的视频与动图下方一键推送到 Eagle 自动下载
- 输入框新增剪贴板粘贴按钮，自动从混合文本中提取链接
- 右上角新增窗口置顶按钮，状态持久化
- 窗口可调整大小（最小 360 × 420），并记住关闭前的尺寸
- 下载列表支持删除单条记录，正在下载的任务不可删除

下载能力：

- 新增「下载线程数」偏好（自动 / 8 / 16 / 32 / 64 / 128），映射到 yt-dlp `--concurrent-fragments`，仅对 HLS / DASH 分片生效
- 下载列表实时显示百分比、速度、剩余时间；合并 / 转码阶段显示估算进度
- Twitter 适配器：NSFW / 年龄限制推文返回 TweetTombstone 时，回退到公开接口取直链再交给 yt-dlp 下载

本地桥接：

- 插件在 `127.0.0.1:43110` 提供 `/ping` 与 `/ingest` 接口，仅接受 https 且域名在白名单内的链接
- 请求体上限 16 KB，未就绪返回 503


## 3.0.0

全新 3.0.0 界面规范：
- 重构主面板、下载队列卡片与底部输入栏
- 新增「偏好设置」与「依赖管理」分栏
- 版本更新提示改由设置齿轮红点徽标接管（替代原顶部横幅）

新增偏好设置：
- 可配置清晰度上限（最高 / 4K / 1080P 等）与帧率上限（最高 / 60fps / 30fps 等），无对应规格时自动向下匹配
- 可选择是否将原始网页链接写入 Eagle 数据来源（默认开启）

新增 Pinterest 支持：
- 支持 Pinterest 图钉下载；转存内容自动提取第三方源（Instagram、YouTube、TikTok、Vimeo）并优先下载源视频
- 纯图片 Pin 自动获取高清原图

新增 Dribbble 支持：
- 支持 Dribbble 作品页面视频与设计图片解析下载，自动提取 CDN 高清 MP4 直链与原图

错误提示与体验优化：
- 针对不支持的网站或链接提供友好的本地化提示与下载指引，替代底层命令行报错

依赖管理调整：
- FFmpeg 改为依赖 Eagle 官方 FFmpeg 插件，未安装时可一键跳转应用商店（不再自行下载 FFmpeg）
- yt-dlp 锁定官方发布版本 2026.08.19 并强制 SHA-256 完整性校验
- 移除下载源选择（镜像加速 / GitHub 直连），统一走 GitHub 官方源

安全与隐私加强：
- 移除所有第三方镜像源与不安全的 SSL 校验跳过逻辑
- 插件自身发起的请求限定 HTTPS，阻断本地地址、私有 IP、非标准端口与含凭证（user:pass@host）的链接
- 传递给 yt-dlp 的派生目标 URL 严格限制在已批准平台域名范围内（该边界不覆盖 yt-dlp 子进程自身的 DNS 解析与请求）
- 网络异常与安全阻断分类提示，错误文案本地化

---

Redesigned UI & UX to 3.0.0 Specification:
- Rebuilt main view, download queue cards, and bottom input bar
- Added dedicated Preferences and Dependency Management tabs
- Update notifications replaced by badge indicator on the settings icon (previously a top banner)

New Preferences:
- Configurable maximum resolution (Auto / 4K / 1080P, etc.) and framerate cap (Auto / 60fps / 30fps, etc.), with automatic fallback to the highest available quality
- Option to save the original webpage URL as the Eagle item source (enabled by default)

New Pinterest Support:
- Download Pinterest pins (video & image); automatically extracts embedded third-party sources (Instagram, YouTube, TikTok, Vimeo) and downloads from the original source when available
- Automatically fetches full-resolution images for image-only Pins

New Dribbble Support:
- Extract and download videos and artwork images from Dribbble shot pages, automatically fetching direct high-res MP4 files and original images

Error Handling & UX Improvements:
- Clear localized guidance and actionable tips for unsupported sites and error states instead of raw CLI errors

Dependency Management Changes:
- FFmpeg now requires the Eagle Official FFmpeg Plugin; a one-click link to the store is shown if it is not installed (no longer downloads FFmpeg automatically)
- yt-dlp is pinned to the official release 2026.08.19 with mandatory SHA-256 integrity verification
- Removed download source selection (mirror / GitHub direct); now always downloads from the official GitHub release

Security & Privacy Hardening:
- Removed all third-party mirror sources and insecure SSL bypass logic
- The plugin's own requests are limited to HTTPS and block local addresses, private IPs, non-standard ports, and URLs with embedded credentials
- Derived target URLs passed to yt-dlp are strictly limited to approved platform domains (this boundary does not cover yt-dlp's own DNS resolution or requests)
- Network errors and security blocks are reported separately with localized messages


## 2.3.0

- 新增依赖管理页面：可查看 yt-dlp 与 ffmpeg 的安装状态和版本，支持一键安装、更新、重装、卸载
- 首次使用时若 yt-dlp 或 ffmpeg 未就绪，自动锁定在依赖管理页（门槛模式），装齐后自动进入主界面
- 新增 ffmpeg 自动安装：macOS 从 eagle-plugin-ffmpeg 官方仓库下载，Windows 从 BtbN 静态构建下载，无需手动操作
- 新增下载源选择：自动（直连优先、失败切镜像）、镜像加速（国内网络推荐）、GitHub 直连（已配置代理/VPN）
- 新增 yt-dlp 启动版本检查，发现新版本时在主界面顶部显示更新横幅，一键更新
- 新增依赖安装/更新失败时的错误提示与重试按钮
- 修复 yt-dlp 因拷贝/恢复等操作丢失执行权限后无法运行的问题（EACCES）
- 修复 yt-dlp 二进制文件损坏（Mach-O 格式错误等）导致无法执行的问题，自动删除并重新下载
- 修复更新或重装 yt-dlp/ffmpeg 时，若下载失败会误删当前可用旧版本的问题
- 修复 Bilibili 视频下载失败的问题（HTTP 412），自动补充必要请求头并在失败时重试
- 优化依赖页加载体验：进入页面瞬间即显示安装状态与操作按钮，版本号和更新状态由后台异步补充
- 优化安装/更新完成后的状态显示，避免出现多余的"检查更新中"提示

---

- Added dependency management page: view installation status and version of yt-dlp and ffmpeg, with one-click install, update, reinstall, and uninstall
- On first use, if yt-dlp or ffmpeg is missing, the app locks onto the dependency page (gated mode) until both are installed, then opens the main view automatically
- Added ffmpeg auto-install: downloads from eagle-plugin-ffmpeg (macOS) or BtbN static builds (Windows) automatically
- Added download source selection: Automatic (direct first, falls back to mirrors), Mirror (recommended for Mainland China), or GitHub Direct (if using a proxy/VPN)
- Added yt-dlp version check on startup; shows an update banner in the main UI when a newer version is available
- Added error message and retry button when a dependency install/update fails
- Fixed yt-dlp losing execute permission after file copy or restore operations (EACCES)
- Fixed yt-dlp failing to run when its binary was corrupted (e.g. Mach-O format error); now automatically re-downloads it
- Fixed updating/reinstalling yt-dlp or ffmpeg deleting the existing working binary if the new download failed
- Fixed Bilibili download failures (HTTP 412) by adding required request headers and auto-retrying on failure
- Improved dependency page load experience: installation status and action buttons appear instantly; version number and update status are filled in asynchronously
- Improved post-install/update status display, removing a redundant "checking for updates" flash

## 2.2.0

- 修复 macOS 下 yt-dlp 因系统隔离属性（quarantine）导致无法执行的问题
- 新增 yt-dlp 自动版本检查，启动时后台静默更新至最新版
- 下载出错时新增"复制错误"按钮，方便用户复制完整错误信息反馈问题
- 优化错误提示，区分文件不存在（ENOENT）与权限不足（EACCES）两种情况
- 修复下载 Twitter / X 视频时因 SSL 握手异常（UNEXPECTED_EOF）导致的失败，遇到 SSL 错误时自动重试
- 修复 yt-dlp 下载与版本检查中的 SSL 兼容性问题，并补全 307 / 308 重定向支持

---

- Fixed yt-dlp execution failure on macOS caused by system quarantine attribute
- Added automatic yt-dlp version check; silently updates to the latest version on startup
- Added "Copy Error" button on failed download items for easier bug reporting
- Improved error messages to distinguish between missing binary (ENOENT) and permission denied (EACCES)
- Fixed SSL handshake failure (UNEXPECTED_EOF) when downloading Twitter / X videos; now automatically retries with SSL verification relaxed
- Fixed SSL compatibility in yt-dlp download and version check requests; added support for 307 / 308 redirects

## 2.1.0

- 移除运行时下载 ffmpeg 的逻辑，改为直接使用 Eagle 内置 ffmpeg
- 修复 Windows 平台因 ffmpeg 资源不存在导致初始化失败的问题
- 修复插件内容无法显示的问题（补全缺失的 i18next 依赖）
- 项目更名为 eagle-video-downloader，反映其全平台视频下载能力

---

- Removed runtime ffmpeg download; now uses Eagle's built-in ffmpeg directly
- Fixed initialization failure on Windows caused by missing ffmpeg asset
- Fixed blank plugin UI caused by missing i18next dependency
- Renamed project to eagle-video-downloader to reflect support for sites backed by yt-dlp

## 2.0.0

- 重构为通用视频下载器，底层由 yt-dlp 驱动，支持 yt-dlp 支持的视频网站
- 重构项目结构，源码迁移至 Plugin/ 目录，引入 esbuild 构建流程
- 重构下载逻辑，支持多视频批量下载（autonumber 模板）
- 重构 UI，引入下载队列模式，显示实时下载进度
- 重构国际化系统，引入 i18next，支持中英文切换
- 新增初始化流程，首次运行自动下载 yt-dlp

---

- Rebuilt as a universal video downloader powered by yt-dlp, supporting sites backed by yt-dlp
- Restructured project layout; source moved to Plugin/ with esbuild bundling
- Added multi-video batch download support
- Redesigned UI with download queue and real-time progress display
- Introduced i18next for Chinese/English internationalization
- Added first-run initialization flow to auto-download yt-dlp

## 1.0.0

- 初始版本，支持从 Twitter / X 下载视频并导入 Eagle

---

- Initial release with Twitter / X video download and Eagle import support
