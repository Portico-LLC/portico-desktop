Desktop builds of Portico.

| Platform | File |
| --- | --- |
| Windows 10/11 (64-bit) | `Portico-Setup.exe` |
| macOS 12+ (Apple Silicon) | `Portico-arm64.dmg` |

**First launch on macOS.** This build is not notarized. If macOS reports the app
as damaged, clear the quarantine attribute once:

```
xattr -cr /Applications/Portico.app
```
