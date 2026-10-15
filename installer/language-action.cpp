#define UNICODE
#define _UNICODE
#include <windows.h>
#include <msi.h>
#include <msiquery.h>
#include <string>

struct TextBinding { const wchar_t* name; const wchar_t* value; };
struct Language {
    const wchar_t *id, *name, *title, *next, *cancel, *downgrade, *windows64, *otherScope, *openGuide;
    int lcid;
    const TextBinding* texts;
    size_t count;
};
#include "language-data.h"

static std::wstring property(MSIHANDLE session, const wchar_t* name) {
    DWORD size = 0;
    MsiGetPropertyW(session, name, L"", &size);
    std::wstring value(size + 1, L'\0');
    ++size;
    if (MsiGetPropertyW(session, name, value.data(), &size) != ERROR_SUCCESS) return L"";
    value.resize(size);
    return value;
}
static const Language* findLanguage(const std::wstring& value) {
    for (const auto& language : languages) if (value == language.id) return &language;
    return nullptr;
}
static UINT populate(MSIHANDLE session, const Language& language) {
    const std::wstring id = language.id;
    MsiSetPropertyW(session, L"DefaultUIFont", id == L"zh-CN" ? L"MailAI_Font_SC" : id == L"zh-TW" ? L"MailAI_Font_TC" : id == L"ja" ? L"MailAI_Font_JA" : id == L"ko" ? L"MailAI_Font_KO" : L"WixUI_Font_Normal");
    // Only session properties change. Native dialogs and fonts are never removed.
    for (size_t i = 0; i < language.count; ++i) {
        PMSIHANDLE record = MsiCreateRecord(0);
        MsiRecordSetStringW(record, 0, language.texts[i].value);
        DWORD size = 0;
        MsiFormatRecordW(session, record, L"", &size);
        std::wstring value(size + 1, L'\0'); ++size;
        UINT status = MsiFormatRecordW(session, record, value.data(), &size);
        if (status != ERROR_SUCCESS) return status;
        if ((status = MsiSetPropertyW(session, language.texts[i].name, value.c_str())) != ERROR_SUCCESS) return status;
    }
    for (size_t i = 0; i < _countof(languages); ++i) {
        const auto key = L"MAILAI_LANG_NAME_" + std::to_wstring(i);
        MsiSetPropertyW(session, key.c_str(), languages[i].name);
    }
    MsiSetPropertyW(session, L"ProductLanguage", std::to_wstring(language.lcid).c_str());
    MsiSetPropertyW(session, L"MAILAILANGUAGE", language.id);
    MsiSetPropertyW(session, L"MAILAI_SELECTOR_TITLE", language.title);
    MsiSetPropertyW(session, L"MAILAI_SELECTOR_NEXT", language.next);
    MsiSetPropertyW(session, L"MAILAI_SELECTOR_CANCEL", language.cancel);
    MsiSetPropertyW(session, L"MAILAI_DOWNGRADE", language.downgrade);
    MsiSetPropertyW(session, L"MAILAI_WINDOWS64", language.windows64);
    MsiSetPropertyW(session, L"MAILAI_OTHER_SCOPE", language.otherScope);
    MsiSetPropertyW(session, L"WIXUI_EXITDIALOGOPTIONALCHECKBOXTEXT", language.openGuide);
    MsiSetPropertyW(session, L"MAILAI_UI_LOADED", L"1");
    return ERROR_SUCCESS;
}
extern "C" __declspec(dllexport) UINT __stdcall InitializeLanguage(MSIHANDLE session) {
    if (!property(session, L"REMOVE").empty()) return ERROR_SUCCESS;
    auto* language = findLanguage(property(session, L"MAILAILANGUAGE"));
    if (!language) language = findLanguage(property(session, property(session, L"MSIINSTALLPERUSER").empty() ? L"MACHINE_LANGUAGE" : L"USER_LANGUAGE"));
    if (!language) {
        const LANGID id = GetUserDefaultUILanguage();
        for (const auto& candidate : languages) if (candidate.lcid == id) language = &candidate;
        if (!language && PRIMARYLANGID(id) == LANG_CHINESE) {
            const auto sublanguage = SUBLANGID(id);
            language = findLanguage(sublanguage == 1 || sublanguage == 3 || sublanguage == 5 ? L"zh-TW" : L"zh-CN");
        }
        if (!language) for (const auto& candidate : languages) if (PRIMARYLANGID(candidate.lcid) == PRIMARYLANGID(id)) { language = &candidate; break; }
    }
    if (!language) language = &languages[0];
    return populate(session, *language);
}
extern "C" __declspec(dllexport) UINT __stdcall ApplyLanguage(MSIHANDLE session) {
    // Nested major-upgrade removal may omit the UI language property.
    if (!property(session, L"REMOVE").empty()) return ERROR_SUCCESS;
    const auto* language = findLanguage(property(session, L"MAILAILANGUAGE"));
    if (!language) return InitializeLanguage(session);
    return populate(session, *language);
}
