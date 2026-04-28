# Localization Guideline

## Add a new langauge

1. [Fork](https://github.com/KOWX712/PlayIntegrityFix/fork) this repository.
2. Copy `webui/public/locales/template.xml` to strings folder.
3. Rename `template.xml` to `{language-code}.xml` by refering [language codes standard](https://support.crowdin.com/developer/language-codes).
4. Add language entrance in `webui/public/locales/languages.json`, format: "language-code": "Language name in your language".
    ```json
    {
        "en": "English",
        "fr": "Français", // Your language, keep alphabetical order
        "zh-CN": "简体中文"
    }
   ```
5. Do translation to all the string value or update existing string value.
6. Add your info to `webui/public/locales/CONTRIBUTOR.md`.
7. Open pull request.

## Update existing langauge

- Same with adding a new language, skip step 2 to 4.

---

## QnA

- **How to switch language?**

- Not supported in user end, it will follow system locales for now.
- You can set it manully with browser console: 
  ```javascript
  loadTranslations('zh-CN');
  ```

## Future plan

- Crowdin integration if many language added.
