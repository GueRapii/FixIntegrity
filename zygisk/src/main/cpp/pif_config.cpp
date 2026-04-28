#include "pif_config.hpp"

#include <array>
#include <cstdint>
#include <unistd.h>
#include <vector>

namespace pif {
    namespace {
        ssize_t xread(int fd, void *buffer, size_t countToRead) {
            ssize_t totalRead = 0;
            char *currentBuf = static_cast<char *>(buffer);
            size_t remainingBytes = countToRead;

            while (remainingBytes > 0) {
                const ssize_t ret = TEMP_FAILURE_RETRY(read(fd, currentBuf, remainingBytes));
                if (ret < 0) {
                    return -1;
                }
                if (ret == 0) {
                    break;
                }

                currentBuf += ret;
                totalRead += ret;
                remainingBytes -= ret;
            }

            return totalRead;
        }

        ssize_t xwrite(int fd, const void *buffer, size_t countToWrite) {
            ssize_t totalWritten = 0;
            const char *currentBuf = static_cast<const char *>(buffer);
            size_t remainingBytes = countToWrite;

            while (remainingBytes > 0) {
                const ssize_t ret = TEMP_FAILURE_RETRY(write(fd, currentBuf, remainingBytes));
                if (ret < 0) {
                    return -1;
                }
                if (ret == 0) {
                    break;
                }

                currentBuf += ret;
                totalWritten += ret;
                remainingBytes -= ret;
            }

            return totalWritten;
        }

        bool readExact(int fd, void *buffer, size_t size) {
            return xread(fd, buffer, size) == static_cast<ssize_t>(size);
        }

        bool writeExact(int fd, const void *buffer, size_t size) {
            return xwrite(fd, buffer, size) == static_cast<ssize_t>(size);
        }

        std::string trim(std::string_view value) {
            const auto start = value.find_first_not_of(" \t\r\n");
            if (start == std::string_view::npos) {
                return {};
            }

            const auto end = value.find_last_not_of(" \t\r\n");
            return std::string(value.substr(start, end - start + 1));
        }

        bool parseBool(std::string_view value) {
            return value == "1" || value == "true";
        }

        std::vector<std::string> splitFingerprint(std::string_view fingerprint) {
            std::vector<std::string> parts;
            std::string current;
            current.reserve(fingerprint.size());

            for (const char ch : fingerprint) {
                if (ch == '/' || ch == ':') {
                    parts.emplace_back(current);
                    current.clear();
                    continue;
                }

                current.push_back(ch);
            }

            parts.emplace_back(current);
            return parts;
        }

        void expandFingerprint(Config &config, std::string_view fingerprint) {
            const auto parts = splitFingerprint(fingerprint);
            static constexpr std::array<std::string_view, 8> keys = {
                "BRAND",
                "PRODUCT",
                "DEVICE",
                "RELEASE",
                "ID",
                "INCREMENTAL",
                "TYPE",
                "TAGS",
            };

            for (size_t i = 0; i < keys.size(); ++i) {
                config.propMap[std::string(keys[i])] = i < parts.size() ? parts[i] : "";
            }
        }

        bool writeVector(int fd, const std::vector<uint8_t> &buffer) {
            const uint32_t size = static_cast<uint32_t>(buffer.size());
            if (!writeExact(fd, &size, sizeof(size))) {
                return false;
            }
            return size == 0 || writeExact(fd, buffer.data(), size);
        }

        bool readVector(int fd, std::vector<uint8_t> &buffer) {
            uint32_t size = 0;
            if (!readExact(fd, &size, sizeof(size))) {
                return false;
            }

            buffer.resize(size);
            return size == 0 || readExact(fd, buffer.data(), size);
        }

        bool writeString(int fd, const std::string &value) {
            const std::vector<uint8_t> bytes(value.begin(), value.end());
            return writeVector(fd, bytes);
        }

        bool readString(int fd, std::string &value) {
            std::vector<uint8_t> bytes;
            if (!readVector(fd, bytes)) {
                return false;
            }

            value.assign(bytes.begin(), bytes.end());
            return true;
        }
    }

    Config parseConfig(std::string_view content) {
        Config config;
        std::unordered_map<std::string, std::string> rawMap;

        size_t lineStart = 0;
        while (lineStart <= content.size()) {
            const auto lineEnd = content.find('\n', lineStart);
            const auto rawLine = content.substr(lineStart, lineEnd == std::string_view::npos
                                                            ? content.size() - lineStart
                                                            : lineEnd - lineStart);

            auto line = rawLine;
            if (const auto comment = line.find('#'); comment != std::string_view::npos) {
                line = line.substr(0, comment);
            }

            const auto trimmed = trim(line);
            if (!trimmed.empty()) {
                const auto eq = trimmed.find('=');
                if (eq != std::string::npos) {
                    rawMap.emplace(trim(trimmed.substr(0, eq)), trim(trimmed.substr(eq + 1)));
                }
            }

            if (lineEnd == std::string_view::npos) {
                break;
            }
            lineStart = lineEnd + 1;
        }

        if (const auto it = rawMap.find("spoofVendingSdk"); it != rawMap.end()) {
            config.spoofVendingSdk = parseBool(it->second);
            rawMap.erase(it);
        }
        if (const auto it = rawMap.find("spoofVendingBuild"); it != rawMap.end()) {
            config.spoofVendingBuild = parseBool(it->second);
            rawMap.erase(it);
        }
        if (const auto it = rawMap.find("DEVICE_INITIAL_SDK_INT"); it != rawMap.end()) {
            config.deviceInitialSdkInt = it->second;
            rawMap.erase(it);
        }
        if (const auto it = rawMap.find("spoofBuild"); it != rawMap.end()) {
            config.spoofBuild = parseBool(it->second);
            rawMap.erase(it);
        }
        if (const auto it = rawMap.find("spoofProvider"); it != rawMap.end()) {
            config.spoofProvider = parseBool(it->second);
            rawMap.erase(it);
        }
        if (const auto it = rawMap.find("spoofProps"); it != rawMap.end()) {
            config.spoofProps = parseBool(it->second);
            rawMap.erase(it);
        }
        if (const auto it = rawMap.find("spoofSignature"); it != rawMap.end()) {
            config.spoofSignature = parseBool(it->second);
            rawMap.erase(it);
        }
        if (const auto it = rawMap.find("DEBUG"); it != rawMap.end()) {
            config.debug = parseBool(it->second);
            rawMap.erase(it);
        }
        if (const auto it = rawMap.find("FINGERPRINT"); it != rawMap.end()) {
            expandFingerprint(config, it->second);
        }
        if (const auto it = rawMap.find("SECURITY_PATCH"); it != rawMap.end()) {
            config.securityPatch = it->second;
        }
        if (const auto it = rawMap.find("ID"); it != rawMap.end()) {
            config.buildId = it->second;
        } else if (const auto it = config.propMap.find("ID"); it != config.propMap.end()) {
            config.buildId = it->second;
        }

        config.propMap = std::move(rawMap);
        if (const auto it = config.propMap.find("FINGERPRINT"); it != config.propMap.end()) {
            expandFingerprint(config, it->second);
        }
        if (config.buildId.empty()) {
            if (const auto it = config.propMap.find("ID"); it != config.propMap.end()) {
                config.buildId = it->second;
            }
        }

        return config;
    }

    bool writeConfig(int fd, const Config &config) {
        bool ok = writeExact(fd, &config.spoofBuild, sizeof(config.spoofBuild));
        ok = ok && writeExact(fd, &config.spoofProps, sizeof(config.spoofProps));
        ok = ok && writeExact(fd, &config.spoofProvider, sizeof(config.spoofProvider));
        ok = ok && writeExact(fd, &config.spoofSignature, sizeof(config.spoofSignature));
        ok = ok && writeExact(fd, &config.debug, sizeof(config.debug));
        ok = ok && writeString(fd, config.deviceInitialSdkInt);
        ok = ok && writeString(fd, config.securityPatch);
        ok = ok && writeString(fd, config.buildId);
        ok = ok && writeExact(fd, &config.spoofVendingSdk, sizeof(config.spoofVendingSdk));
        ok = ok && writeExact(fd, &config.spoofVendingBuild, sizeof(config.spoofVendingBuild));

        const uint32_t propCount = static_cast<uint32_t>(config.propMap.size());
        ok = ok && writeExact(fd, &propCount, sizeof(propCount));
        for (const auto &[key, value] : config.propMap) {
            ok = ok && writeString(fd, key);
            ok = ok && writeString(fd, value);
        }

        return ok;
    }

    bool readConfig(int fd, Config &config) {
        Config parsed;
        bool ok = readExact(fd, &parsed.spoofBuild, sizeof(parsed.spoofBuild));
        ok = ok && readExact(fd, &parsed.spoofProps, sizeof(parsed.spoofProps));
        ok = ok && readExact(fd, &parsed.spoofProvider, sizeof(parsed.spoofProvider));
        ok = ok && readExact(fd, &parsed.spoofSignature, sizeof(parsed.spoofSignature));
        ok = ok && readExact(fd, &parsed.debug, sizeof(parsed.debug));
        ok = ok && readString(fd, parsed.deviceInitialSdkInt);
        ok = ok && readString(fd, parsed.securityPatch);
        ok = ok && readString(fd, parsed.buildId);
        ok = ok && readExact(fd, &parsed.spoofVendingSdk, sizeof(parsed.spoofVendingSdk));
        ok = ok && readExact(fd, &parsed.spoofVendingBuild, sizeof(parsed.spoofVendingBuild));

        uint32_t propCount = 0;
        ok = ok && readExact(fd, &propCount, sizeof(propCount));
        for (uint32_t i = 0; ok && i < propCount; ++i) {
            std::string key;
            std::string value;
            ok = readString(fd, key);
            ok = ok && readString(fd, value);
            if (ok) {
                parsed.propMap.emplace(std::move(key), std::move(value));
            }
        }

        if (!ok) {
            return false;
        }

        config = std::move(parsed);
        return true;
    }
}
