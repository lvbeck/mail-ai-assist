# Mail AI Assist

[English](README.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · [Italiano](README.it.md) · [Español](README.es.md) · [Português](README.pt.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

Mail AI Assist는 Thunderbird에서 선택한 메일의 요약, 번역, 태그 제안, 로컬 내보내기를 지원하며, 새 메일이나 답장을 작성할 때 선택한 문구를 다시 작성할 수 있습니다. 전체 메일함을 임의로 스캔하지 않습니다. 자동 요약과 자동 태그는 사용자가 각 기능을 명시적으로 켠 계정의 받은편지함에 도착하는 새 메일에만 적용됩니다.

## 기능

- **메일 요약:** 선택한 메일의 핵심 내용과 해야 할 일을 정리합니다. 요약 언어는 인터페이스 및 번역 언어와 별도로 설정하며, 기본값은 시스템 언어 따르기입니다.
- **메일 번역:** 원문과 대상 언어를 선택하거나 원문 언어를 자동으로 감지합니다. 자신의 API 키로 Google Cloud Translation, Microsoft Azure Translator, DeepL을 설정할 수 있습니다. 번역 서비스를 설정하지 않으면 선택한 AI 모델을 사용합니다.
- **태그 제안과 별칭:** Thunderbird의 기존 태그를 우선 사용하여 유사한 태그의 중복 생성을 줄입니다. 수동 제안은 편집한 후 확인하여 적용합니다. 예를 들어 `ZUB Helena`와 `Helena Ultra`를 기존 `Helena` 태그에 연결할 수 있습니다. 별칭은 전체 이름으로 비교하며 대소문자와 불필요한 공백을 무시합니다.
- **선택한 문구 다시 작성:** 새 메일 또는 답장 창에서 문구를 선택하고 결과를 미리 본 뒤 교체를 확인합니다. 확장 기능은 메일을 자동으로 보내지 않습니다.
- **로컬 메일 내보내기:** TXT는 메일 내용을 내보내며 인용된 답장과 전달 내용을 제외할 수 있습니다. EML은 원본 메일 전체, 인코딩, 헤더, 서식, 첨부파일을 보존하며 인용 내용을 제외하지 않습니다. 내보내기 자체는 AI를 호출하거나 토큰을 소비하지 않습니다. 저장 폴더와 데스크톱 앱을 선택할 수 있으며, 파일 탐색기에서 내보낸 파일을 선택해 줍니다. 채팅에 끌어 놓거나 첨부하는 작업은 직접 수행하며, 자동 첨부나 전송은 하지 않습니다. 대화상자를 닫아도 파일은 유지됩니다.
- **영구 캐시:** 다시 열 때 일치하는 요약과 번역을 재사용하며 Thunderbird를 재시작해도 유지됩니다. 재시도를 누르면 새 결과를 요청하고 캐시를 갱신합니다. 설정에서 사용량 확인, 폴더 열기, 캐시 삭제가 가능하며 내보낸 파일은 별도로 정리합니다.
- **10가지 인터페이스 언어:** 영어, 독일어, 프랑스어, 이탈리아어, 스페인어, 포르투갈어, 중국어 간체 및 번체, 일본어, 한국어.

## 새 메일 자동 처리 (선택 사항)

모든 계정의 자동 요약과 자동 태그는 **기본적으로 꺼져 있습니다**. Thunderbird에서 계정을 마우스 오른쪽 버튼으로 클릭하고 AI 도우미 메뉴에서 각각 켤 수 있습니다. 활성화한 계정의 받은편지함에 새로 도착한 메일만 처리하며, 과거 메일을 스캔하지 않고 이미 스팸으로 표시된 메일은 건너뜁니다.

자동 요약은 나중에 볼 수 있도록 캐시에 저장됩니다. 자동 태그는 기존 태그와 별칭 규칙에 따라 직접 적용되며, 수동 제안과 달리 메일마다 확인하지 않습니다. 선택한 제공업체, 모델, 해당 출력 언어를 사용하며 메일 내용을 서비스에 전송하고 이용 한도를 소비합니다. 자동 요약의 기본 제한은 계정당 하루 100회 시도이며 설정에서 변경할 수 있습니다. 실패하거나 취소한 시도도 포함됩니다. 이 제한은 자동 태그에는 적용되지 않습니다.

요약, 번역, 태그 기능은 메일 제목과 본문을 처리하며 첨부파일 내용은 읽지 않습니다. AI 결과에는 오류가 있을 수 있으므로 사용 전에 확인하세요.

## 제공업체 및 개인정보

ChatGPT 인증, Gemini API 또는 Claude API를 선택할 수 있습니다. 번역은 Google Cloud Translation, Azure Translator 및 DeepL을 지원합니다. 번역 서비스를 선택하거나 설정하지 않으면 선택한 AI 모델을 사용합니다. 서비스 실패 시 다른 제공업체로 자동 전환하지 않습니다. 이용 자격과 요금은 제공업체에 따라 다릅니다. 관련 메일 내용은 Windows 도우미를 통해 선택한 서비스로 전송됩니다. 인증 정보는 Windows DPAPI로 보호합니다. 캐시와 내보낸 파일은 읽을 수 있는 로컬 파일입니다. [개인정보 처리방침](publication/PRIVACY.md)을 확인하세요.

## 설치 및 내보내기

Windows x64 도우미가 필요합니다. [GitHub Releases](https://github.com/lvbeck/mail-ai-assist/releases)에서 MSI를 다운로드하여 설치하고 Thunderbird를 다시 시작하세요. 부가 기능은 ATN에 게시된 후 설치하거나, 부가 기능 관리자에서 로컬 XPI를 직접 설치할 수 있습니다. manifest의 최소 버전은 Thunderbird 128입니다. 실제 사용하는 버전에서 테스트하세요. 이 링크가 ATN 또는 GitHub에 이미 게시되었음을 의미하지는 않습니다. TXT는 인용문을 제외하여 본문을 내보낼 수 있고 EML은 원본 메일과 첨부 파일을 유지합니다. 설정에서 내보내기 폴더를 선택할 수 있습니다. 수동 첨부를 위해 폴더에서 파일을 표시하며 창을 닫아도 유지됩니다. 설정에서 이 부가 기능이 관리하는 내보낸 파일을 지울 수 있습니다.

## 업데이트 및 이전

ATN은 부가 기능 업데이트를 관리하고 GitHub Releases는 도우미 MSI와 서명된 helper-updates.json을 제공합니다. 각 릴리스는 vVERSION 태그를 사용하며 최신 릴리스에도 이 매니페스트를 첨부해야 합니다. GitHub 다운로드는 이 저장소 내 및 release-assets.githubusercontent.com으로 향하는 횟수가 제한된 HTTPS 리디렉션만 허용합니다. RSA 서명, 크기 및 SHA-256 검사는 필수입니다. 이전 도우미는 새 주소나 리디렉션 지원을 자동으로 얻지 못하므로 새 MSI를 한 번 직접 설치하세요. 자체 배포 부가 기능에서 ATN 버전으로 이전할 때는 같은 ID의 XPI를 사용해야 합니다. 설정 유지 여부는 Thunderbird 동작에 따릅니다. 다른 ID의 부가 기능에서는 설정이 자동 이전되지 않습니다. 현재 ID는 `mail-ai-assist@lvbeck.github.com`입니다. 이후 도우미 업데이트도 기존의 현재 사용자/모든 사용자 설치 방식을 유지합니다.

## 개발

소스 구성: extension/(부가 기능), helper/(네이티브 호스트), tests/, installer/, scripts/, publication/. dist/에는 결과물을, work/에는 임시 파일을 저장하며 둘 다 커밋하지 않습니다. Node.js 22 이상과 Python 3.10 이상을 사용하세요. 테스트와 XPI 패키징에는 npm 의존성이 필요하지 않습니다. 아이콘을 다시 생성할 때만 npm install과 npm run icons를 실행하세요.

```powershell
node scripts/test.mjs
python tests/atn-packaging.test.py
python scripts/build-xpi.py --channel atn
python scripts/build-review-bundle.py
```

## MSI 빌드

Windows x64, Windows SDK가 포함된 MSVC C++ Build Tools, UI/Util 확장이 포함된 WiX 4.0.6 및 node.exe와 NODE-LICENSE.txt가 있는 독립 Node 런타임 폴더가 필요합니다. 저장소 루트에서 실행하세요. WIX_EXE와 VCVARS64로 도구 자동 검색을 재정의할 수 있습니다. 아래 경로를 본인의 런타임과 기존 DPAPI 서명 키에 맞게 변경하세요. 기존 설치를 위한 서명 키를 새로 생성하지 마세요.

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

## 게시

단일 ZIP이 아니라 dist/github-release/v0.12.24/ 안의 파일들을 각각 릴리스 자산으로 업로드하세요. ATN XPI는 'On this site'를 선택하여 별도로 제출합니다. [검토자 안내](publication/REVIEW-NOTES.md), [등록 정보](publication/LISTING.md), [릴리스 절차](publication/GITHUB-RELEASE.md)를 확인하세요. 스크립트는 자동으로 푸시, 업로드 또는 설치하지 않습니다. 키, 인증 정보, 메일 및 캐시를 Git에 포함하지 마세요. .gitignore는 이미 커밋된 비밀 정보를 제거하지 않습니다. MIT 라이선스: [LICENSE](LICENSE).
