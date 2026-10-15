# Mail AI Assist

[English](README.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · [Italiano](README.it.md) · [Español](README.es.md) · [Português](README.pt.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

Mail AI Assist 为 Thunderbird 提供摘要、翻译、标签建议、选中文字改写和本地邮件导出。0.12.24 将辅助程序下载迁移到 GitHub，扩展更新交给 ATN。

## 功能

摘要语言可独立设置。摘要和翻译长期缓存，点击重试才重新生成。自动摘要和自动标签默认关闭，可按账户启用，仅处理收件箱新邮件；自动摘要默认每账户每天最多尝试 100 次。标签优先复用已有标签，支持别名规则。改写先预览，再确认替换选中文字，不会自动发送邮件。

## 服务商与隐私

支持 ChatGPT 授权、Gemini API、Claude API。翻译可选谷歌翻译 API、Azure Translator、DeepL；未选择或未配置翻译服务时使用当前 AI 模型，服务失败不自动切换。账户资格和费用以服务商为准。相关邮件内容通过 Windows 辅助程序发送到所选服务商；凭据使用 Windows DPAPI，缓存和导出文件在本机可读。详见[隐私政策](publication/PRIVACY.md)。

## 安装与导出

需要 Windows x64 辅助程序。从 [GitHub Releases](https://github.com/lvbeck/mail-ai-assist/releases) 下载 MSI，安装后重启 Thunderbird。扩展发布到 ATN 后可从商店安装；也可在附加组件管理器中手动安装本地 XPI。manifest 最低版本为 Thunderbird 128，部署前需测试实际版本；这些链接不表示已经发布。TXT 可排除引用内容；EML 保留原始邮件及附件。在设置中选择导出目录，导出后选中文件供手动附加。关闭窗口不删除文件，可在设置中清理本插件导出。

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

将 dist/github-release/v0.12.24/ 内的文件分别作为 Release 附件上传，不要只上传 ZIP。ATN XPI 单独提交，选择 On this site。阅读[审核说明](publication/REVIEW-NOTES.md)、[商店介绍](publication/LISTING.md)和[发布流程](publication/GITHUB-RELEASE.md)。脚本不会自动推送、上传或安装。私钥、凭据、邮件和缓存不得入库；.gitignore 不会移除已提交秘密。MIT，见 [LICENSE](LICENSE)。
