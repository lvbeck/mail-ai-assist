const names = ['en', 'de', 'fr', 'it', 'es', 'pt', 'zh-CN', 'zh-TW', 'ja', 'ko'];
const text = {
  en: ['Invalid authorization callback.', 'Authorization was not completed. Return to Thunderbird.', 'Authorization received. Return to Thunderbird to check the connection status.'],
  de: ['Ungültige Autorisierungsantwort.', 'Die Autorisierung wurde nicht abgeschlossen. Kehren Sie zu Thunderbird zurück.', 'Autorisierung empfangen. Prüfen Sie den Verbindungsstatus in Thunderbird.'],
  fr: ['Réponse d’autorisation invalide.', 'L’autorisation n’a pas été terminée. Revenez à Thunderbird.', 'Autorisation reçue. Revenez à Thunderbird pour vérifier la connexion.'],
  it: ['Risposta di autorizzazione non valida.', 'L’autorizzazione non è stata completata. Torna a Thunderbird.', 'Autorizzazione ricevuta. Torna a Thunderbird per verificare lo stato della connessione.'],
  es: ['Respuesta de autorización no válida.', 'No se ha completado la autorización. Vuelve a Thunderbird.', 'Autorización recibida. Vuelve a Thunderbird para comprobar la conexión.'],
  pt: ['Resposta de autorização inválida.', 'A autorização não foi concluída. Regresse ao Thunderbird.', 'Autorização recebida. Regresse ao Thunderbird para verificar a ligação.'],
  'zh-CN': ['授权回调无效。', '授权未完成，请返回 Thunderbird。', '已收到授权，请返回 Thunderbird 查看连接状态。'],
  'zh-TW': ['授權回呼無效。', '授權未完成，請返回 Thunderbird。', '已收到授權，請返回 Thunderbird 查看連接狀態。'],
  ja: ['認証コールバックが無効です。', '認証が完了しませんでした。Thunderbird に戻ってください。', '認証を受け付けました。Thunderbird に戻って接続状態を確認してください。'],
  ko: ['인증 콜백이 올바르지 않습니다.', '인증이 완료되지 않았습니다. Thunderbird로 돌아가세요.', '인증을 받았습니다. Thunderbird로 돌아가 연결 상태를 확인하세요.']
};
export function authorizationMessage(index, language, accepted = '') {
  if (!names.includes(language)) {
    for (const item of String(accepted).split(',')) {
      const tag = item.split(';')[0].trim().replaceAll('_', '-').toLowerCase();
      const candidate = tag.startsWith('zh') ? (/hant|tw|hk|mo/.test(tag) ? 'zh-TW' : 'zh-CN') : tag.split('-')[0];
      if (names.includes(candidate)) { language = candidate; break; }
    }
  }
  return (text[language] || text.en)[index];
}
