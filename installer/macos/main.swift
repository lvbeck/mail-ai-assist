import Foundation
import AppKit
import Security

enum NativeError: Error { case invalidRequest, keychain(OSStatus), operationFailed }

func credentialKey(create: Bool) throws -> Data {
    let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword,
        kSecAttrService as String: "local.mail_ai_assist", kSecAttrAccount as String: "credential-encryption-key",
        kSecReturnData as String: true, kSecMatchLimit as String: kSecMatchLimitOne]
    var result: CFTypeRef?
    let status = SecItemCopyMatching(query as CFDictionary, &result)
    if status == errSecSuccess, let data = result as? Data, data.count == 32 { return data }
    guard status == errSecItemNotFound && create else { throw NativeError.keychain(status) }
    var bytes = [UInt8](repeating: 0, count: 32)
    let randomStatus = SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes)
    guard randomStatus == errSecSuccess else { throw NativeError.keychain(randomStatus) }
    let key = Data(bytes)
    let attributes: [String: Any] = [kSecClass as String: kSecClassGenericPassword,
        kSecAttrService as String: "local.mail_ai_assist", kSecAttrAccount as String: "credential-encryption-key",
        kSecAttrLabel as String: "Mail AI Assist credentials", kSecValueData as String: key]
    let added = SecItemAdd(attributes as CFDictionary, nil)
    if added == errSecDuplicateItem { return try credentialKey(create: false) }
    guard added == errSecSuccess else { throw NativeError.keychain(added) }
    return key
}

func fileURL(_ request: [String: Any], _ field: String = "path", directory: Bool) throws -> URL {
    guard let path = request[field] as? String, path.hasPrefix("/"), !path.contains("\0") else { throw NativeError.invalidRequest }
    var isDirectory: ObjCBool = false
    guard FileManager.default.fileExists(atPath: path, isDirectory: &isDirectory), isDirectory.boolValue == directory else { throw NativeError.invalidRequest }
    return URL(fileURLWithPath: path)
}

func handle(_ request: [String: Any]) throws -> [String: Any] {
    guard let action = request["action"] as? String else { throw NativeError.invalidRequest }
    switch action {
    case "credentialKey":
        return ["ok": true, "key": try credentialKey(create: request["create"] as? Bool == true).base64EncodedString()]
    case "browser":
        guard let value = request["url"] as? String, let url = URL(string: value), url.scheme == "https",
              url.host == "auth.openai.com", url.user == nil, url.password == nil,
              url.port == nil || url.port == 443 else { throw NativeError.invalidRequest }
        guard NSWorkspace.shared.open(url) else { throw NativeError.operationFailed }
    case "chooseFolder":
        let app = NSApplication.shared
        app.setActivationPolicy(.accessory)
        app.activate(ignoringOtherApps: true)
        let panel = NSOpenPanel()
        panel.canChooseDirectories = true; panel.canChooseFiles = false
        panel.allowsMultipleSelection = false; panel.canCreateDirectories = true
        if let current = try? fileURL(request, directory: true) { panel.directoryURL = current }
        guard panel.runModal() == .OK, let url = panel.url else { return ["ok": true, "cancelled": true] }
        return ["ok": true, "cancelled": false, "path": url.path]
    case "folder":
        guard NSWorkspace.shared.open(try fileURL(request, directory: true)) else { throw NativeError.operationFailed }
    case "reveal":
        NSWorkspace.shared.activateFileViewerSelecting([try fileURL(request, directory: false)])
    case "install":
        let url = try fileURL(request, directory: false)
        guard url.pathExtension == "pkg", NSWorkspace.shared.open(url) else { throw NativeError.invalidRequest }
    case "open":
        let url: URL
        if request["target"] as? String == "custom" {
            url = try fileURL(request, "executable", directory: true)
            guard url.pathExtension.lowercased() == "app" else { throw NativeError.invalidRequest }
        } else {
            let identifiers = ["chatgpt": "com.openai.chat", "codex": "com.openai.codex"]
            guard let target = request["target"] as? String, let identifier = identifiers[target],
                  let application = NSWorkspace.shared.urlForApplication(withBundleIdentifier: identifier) else { throw NativeError.operationFailed }
            url = application
        }
        guard NSWorkspace.shared.open(url) else { throw NativeError.operationFailed }
    default: throw NativeError.invalidRequest
    }
    return ["ok": true]
}

do {
    let input = FileHandle.standardInput.readDataToEndOfFile()
    guard input.count <= 65536, let request = try JSONSerialization.jsonObject(with: input) as? [String: Any] else { throw NativeError.invalidRequest }
    let output = try JSONSerialization.data(withJSONObject: handle(request))
    FileHandle.standardOutput.write(output)
} catch {
    // Never disclose secrets, paths or Keychain error details to the extension.
    FileHandle.standardOutput.write(Data("{\"ok\":false}".utf8))
    exit(1)
}
