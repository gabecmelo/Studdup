#pragma once

// clang-format off
#ifdef _WIN32
#include <windows.h>
#include <shellapi.h>
#endif
// clang-format on

#include <cstdlib>
#include <string>

namespace srs::ui {

inline void openUrl(const std::string& url) {
    if (url.empty())
        return;
#ifdef _WIN32
    ShellExecuteA(nullptr, "open", url.c_str(), nullptr, nullptr, SW_SHOWNORMAL);
#else
    std::string cmd = "xdg-open \"" + url + "\" &";
    (void)std::system(cmd.c_str());
#endif
}

}  // namespace srs::ui
