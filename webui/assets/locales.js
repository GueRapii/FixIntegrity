const rtlLang = [
  'ar',  // Arabic
  'fa',  // Persian
  'he',  // Hebrew
  'ur',  // Urdu
  'ps',  // Pashto
  'sd',  // Sindhi
  'ku',  // Kurdish
  'yi',  // Yiddish
  'dv',  // Dhivehi
];

export let translations = {};
let baseTranslations = {};
let availableLanguages = ['en'];
let languageNames = {};

/**
 * Parse XML translation file into a JavaScript object
 * @param {string} xmlText - The XML content as string
 * @returns {Object} - Parsed translations
 */
function parseTranslationsXML(xmlText) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    const strings = xmlDoc.getElementsByTagName('string');
    const translations = {};

    for (let i = 0; i < strings.length; i++) {
        const string = strings[i];
        const name = string.getAttribute('name');
        const value = string.textContent;
        translations[name] = value;
    }

    return translations;
}

/**
 * Detect user's default language
 * @returns {Promise<string>} - Detected language code
 */
async function detectUserLanguage() {
    const userLang = navigator.language || navigator.userLanguage;
    const langCode = userLang.split('-')[0];

    try {
        // Fetch available languages
        const availableResponse = await fetch('locales/languages.json');
        const availableData = await availableResponse.json();
        availableLanguages = Object.keys(availableData);
        languageNames = availableData;

        // Check if preferred language is valid
        if (availableLanguages.includes(userLang)) {
            return userLang;
        } else if (availableLanguages.includes(langCode)) {
            return langCode;
        } else {
            return 'en';
        }
    } catch (e) {
        return 'en';
    }
}

/**
 * Load translations dynamically based on the selected language
 * @returns {Promise<void>}
 */
export async function loadTranslations() {
    try {
        // load Englsih as base translations
        const baseResponse = await fetch('./locales/strings/en.xml');
        const baseXML = await baseResponse.text();
        baseTranslations = parseTranslationsXML(baseXML);

        // load user's language if available
        const lang = await detectUserLanguage();
        if (lang !== 'en') {
            const response = await fetch(`locales/strings/${lang}.xml`);
            const userXML = await response.text();
            const userTranslations = parseTranslationsXML(userXML);
            translations = { ...baseTranslations, ...userTranslations };
        } else {
            translations = baseTranslations;
        }

        // Support for rtl language
        const isRTL = rtlLang.includes(lang.split('-')[0]);
        document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
    } catch (error) {
        translations = baseTranslations;
    }
    applyTranslations();
}

/**
 * Apply translations to all elements with data-i18n attributes
 * @returns {void}
 */
function applyTranslations() {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
        const key = el.getAttribute("data-i18n");
        const translation = translations[key];
        if (translation) {
            if (el.hasAttribute("placeholder")) {
                el.setAttribute("placeholder", translation);
            } else if (el.hasAttribute("label")) {
                el.setAttribute("label", translation);
            } else {
                el.textContent = translation;
            }
        }
    });
}
