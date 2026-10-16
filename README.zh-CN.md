# Mail AI Assist

[English](README.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · [Italiano](README.it.md) · [Español](README.es.md) · [Português](README.pt.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

Mail AI Assist 为 Thunderbird 中用户选中的邮件提供摘要、翻译、标签建议和本地导出，并支持改写新建或回复邮件时选中的文字。插件不会主动扫描整个邮箱；只有在用户明确为某个账户启用相应功能后，才会为该账户收件箱中新收到的邮件自动生成摘要或添加标签。

## 功能介绍

- **邮件摘要：** 对选中的邮件生成重点概述和待办事项。摘要语言独立于界面语言及翻译语言，默认跟随系统，也可在设置中指定。
- **邮件翻译：** 可指定原文及目标语言，或自动识别原文语言。支持使用自己的 API Key 配置谷歌翻译 API、微软翻译（Azure）或 DeepL；未配置翻译服务时使用当前 AI 模型。
- **标签建议与别名：** 优先复用 Thunderbird 中已有的标签，减少近似标签重复创建。手动生成的建议可编辑，确认后才添加。在设置中可将 `Project Alpha`、`Project Beta` 等别名映射到已有的 `Projects` 标签；规则忽略大小写及多余空格，按完整名称匹配。
- **选中文字改写：** 在新建或回复邮件窗口中选择文字，生成改写结果并预览，由你确认后替换选区。插件不会自动发送邮件。
- **本地邮件导出：** TXT 导出邮件内容，可排除引用回复和转发内容；EML 保留完整原始邮件、编码、邮件头、排版及附件，不过滤引用。导出本身不调用 AI、不消耗 Token。可选择导出目录和目标桌面应用，导出后在文件夹中选中文件，由你手动拖入或附加到聊天；插件不自动附加或发送文件。关闭对话框后保留导出文件。
- **持久缓存：** 再次打开摘要或翻译时优先显示匹配的缓存，重启 Thunderbird 后仍有效。点击“重试”才请求重新生成并更新缓存。设置中可查看缓存占用、打开缓存文件夹或清除缓存；导出文件另有独立清理功能。
- **十种界面语言：** 英语、德语、法语、意大利语、西班牙语、葡萄牙语、简体中文、繁体中文、日语和韩语。

## 可选的新邮件自动处理

所有账户的自动摘要和自动标签均**默认关闭**。右键点击 Thunderbird 中的账户名称，在“AI 助手”菜单中分别开启所需功能。仅处理已启用账户收件箱中新收到的邮件，不回扫历史邮件，并跳过已标记为垃圾邮件的邮件。

自动摘要保存在缓存中，供之后打开查看。自动标签会依据已有标签及别名规则直接应用到邮件，无需像手动标签建议一样逐封确认。自动处理使用当前选择的服务商、模型及相应输出语言，会将邮件内容发送到所选服务并消耗额度。自动摘要默认每账户每天最多尝试 100 次，可在设置中调整；失败或取消的尝试也计入次数。此限额仅用于自动摘要，不适用于自动标签。

摘要、翻译和标签功能处理邮件主题及正文，不读取附件内容。AI 结果可能有误，使用前请核对。

## 服务商与隐私

支持 ChatGPT 授权、Gemini API、Claude API。翻译可选谷歌翻译 API、Azure Translator、DeepL；未选择或未配置翻译服务时使用当前 AI 模型，服务失败不自动切换。账户资格和费用以服务商为准。相关邮件内容通过 Windows 辅助程序发送到所选服务商；凭据使用 Windows DPAPI，缓存和导出文件在本机可读。详见[隐私政策](publication/PRIVACY.md)。

## 安装与导出

Windows 和 macOS 使用同一个 Thunderbird XPI，另外安装适合操作系统的辅助程序。

- Windows x64：安装 MSI。
- macOS Apple Silicon：构建并安装 arm64 PKG。
- macOS Intel：构建并安装 x64 PKG。

安装辅助程序后重启 Thunderbird。公开下载位于 [GitHub Releases](https://github.com/lvbeck/mail-ai-assist/releases)。0.12.26 新增 macOS 源码支持；签名 PKG 和 Mac 实机验证尚未完成，因此目前还没有公开的 Mac 安装包。

扩展发布到 ATN 后可从商店安装；也可在附加组件管理器中手动安装本地 XPI。manifest 最低版本为 Thunderbird 128，部署前需测试实际版本；这些链接不表示已经发布。TXT 可排除引用内容；EML 保留原始邮件及附件。在设置中选择导出目录，导出后选中文件供手动附加。关闭窗口不删除文件，可在设置中清理本插件导出。

## 更新与迁移

ATN 管理扩展更新，GitHub Releases 托管 MSI 和签名的 helper-updates.json。发布标签采用 vVERSION，最新发布必须包含该更新清单。GitHub 下载只允许有限次数的 HTTPS 重定向，目标限制为本仓库和 release-assets.githubusercontent.com；保留 RSA 签名、大小和 SHA-256 校验。旧辅助程序不会自动获得新地址或重定向能力，须手动安装一次新版 MSI。旧自托管扩展应安装同 ID 的 ATN XPI 接管更新，设置保留情况取决于 Thunderbird。后续辅助程序更新继续沿用当前用户／所有用户安装流程。

## 开发

源码目录：extension/ 扩展、helper/ 辅助程序、tests/、installer/、scripts/、publication/。dist/ 为产物，work/ 为临时文件，均不提交。需要 Node.js 22+、Python 3.10+；测试和 XPI 打包无需 npm 依赖。仅重建图标时运行 npm install 和 npm run icons。

```powershell
node scripts/test.mjs
python tests/atn-packaging.test.py
python scripts/build-xpi.py --channel atn
python scripts/build-review-bundle.py
```

## MSI 构建

需要 Windows x64、MSVC C++ Build Tools 和 Windows SDK、WiX 4.0.6 的 UI／Util 扩展，以及包含 node.exe 和 NODE-LICENSE.txt 的独立 Node 运行时目录。从仓库根目录执行；可用 WIX_EXE 和 VCVARS64 指定工具。请将以下路径替换为本机运行时和已有 DPAPI 私钥路径，不要为已有安装重新生成签名密钥。

```powershell
dotnet tool install wix --version 4.0.6 --tool-path work/wix-tools
.\work\wix-tools\wix.exe extension add WixToolset.UI.wixext/4.0.6
.\work\wix-tools\wix.exe extension add WixToolset.Util.wixext/4.0.6
$env:MAIL_AI_RUNTIME_DIR = 'D:\build-tools\mail-ai-runtime'
$env:MAIL_AI_SIGNING_KEY_FILE = 'D:\private\update-signing-key.dpapi'
python installer/build-release.py
python installer/finalize-release.py
node installer/verify-release.mjs
```

## 发布

将 dist/github-release/v0.12.26/ 内的文件分别作为 Release 附件上传，不要只上传 ZIP。ATN XPI 单独提交，选择 On this site。阅读[审核说明](publication/REVIEW-NOTES.md)、[商店介绍](publication/LISTING.md)和[发布流程](publication/GITHUB-RELEASE.md)。脚本不会自动推送、上传或安装。私钥、凭据、邮件和缓存不得入库；.gitignore 不会移除已提交秘密。MIT，见 [LICENSE](LICENSE)。

## macOS 支持（0.12.26，尚未发布）

源码已加入 Apple Silicon（arm64）和 Intel（x64）辅助程序支持：Keychain 凭据保护、Finder 选中导出文件和独立签名 PKG 更新。现有 Windows MSI 与更新流程保留。macOS 需要单独构建辅助程序，只有 XPI 不足以运行。公开提供 Mac 版前仍须完成 PKG 签名、公证及 Mac 实机验证。参见 [macOS 构建和测试说明](installer/macos/README.md)。
