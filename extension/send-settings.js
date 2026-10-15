(async () => {
  await ComposeI18n.initialize();
  const target = document.getElementById('desktopTarget');
  const executable = document.getElementById('desktopExecutable');
  const saved = await messenger.storage.local.get(['desktopTarget', 'desktopExecutable']);
  target.value = ['chatgpt', 'codex', 'custom'].includes(saved.desktopTarget) ? saved.desktopTarget : 'chatgpt';
  executable.value = saved.desktopExecutable || '';
  const render = () => { document.getElementById('desktopCustom').hidden = target.value !== 'custom'; };
  render();
  target.addEventListener('change', async () => { render(); await messenger.storage.local.set({ desktopTarget: target.value }); });
  executable.addEventListener('change', () => messenger.storage.local.set({ desktopExecutable: executable.value.trim() }));
  const choose = document.getElementById('exportDirectoryChoose');
  const clear = document.getElementById('exportDirectoryClear');
  let info;
  const field = document.getElementById('exportDirectory');
  let failure = '', activePort;
  function renderDirectory() {
    document.getElementById('exportDirectoryStatus').textContent = failure ? ComposeI18n.t(failure) : '';
    clear.title = ComposeI18n.t('清空导出文件');
    clear.setAttribute('aria-label', clear.title);
    document.getElementById('exportDirectorySize').textContent = info ? `${ComposeI18n.t('导出文件大小')}：${(info.bytes / 1024 / 1024).toFixed(2)} MB (${info.count})` : '';
    choose.title = ComposeI18n.t('更改导出目录');
    choose.setAttribute('aria-label', choose.title);
  }
  window.addEventListener('compose-language-changed', renderDirectory);
  window.addEventListener('pagehide', () => activePort?.disconnect());
  async function loadDirectory(action) {
    choose.disabled = true; clear.disabled = true; failure = ''; renderDirectory();
    try {
      const result = await new Promise((resolve, reject) => {
        let port, timer, finished = false;
        const finish = (result, error) => {
          if (finished) return;
          finished = true; clearTimeout(timer);
          activePort = null;
          error ? reject(error) : resolve(result);
          port?.disconnect();
        };
        try {
          port = messenger.runtime.connectNative('local.mail_ai_assist'); activePort = port;
          port.onMessage.addListener(message => {
            if (message.id === 1 && !message.event) finish(message.result, message.ok ? null : new Error('export_directory_failed'));
          });
          port.onDisconnect.addListener(() => finish(null, new Error('helper_unavailable')));
          timer = setTimeout(() => finish(null, new Error('timeout')), action === 'desktopExportChoose' ? 310000 : 10000);
          port.postMessage({ id: 1, action, path: field.value });
        } catch (error) { finish(null, error); }
      });
      if (typeof result?.path !== 'string' || !result.path) throw new Error('invalid_directory');
      field.value = result.path;
      if (Number.isFinite(result.bytes)) info = result;
      if (action === 'desktopExportChoose') await loadDirectory('desktopExportInfo');
    } catch {
      failure = action === 'desktopExportClear' ? '无法清空导出文件，请检查文件夹权限并重试。' : action === 'desktopExportChoose' ? '无法更改导出目录，请检查文件夹写入权限及本地辅助程序版本。' : '无法读取导出目录，请确认已安装最新版本的本地辅助程序。';
    } finally { choose.disabled = false; clear.disabled = !info; renderDirectory(); }
  }
  clear.addEventListener('click', () => {
    if (window.confirm(`${ComposeI18n.t('确定清空此目录中的导出文件？删除后无法恢复，请先确认附件上传完成。')}\n${field.value}`)) loadDirectory('desktopExportClear');
  });
  window.addEventListener('focus', () => { if (!activePort) loadDirectory('desktopExportInfo'); });
  choose.addEventListener('click', () => loadDirectory('desktopExportChoose'));
  await loadDirectory('desktopExportInfo');
})();
