import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';

i18n
    .use(HttpBackend)
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        fallbackLng: 'en',
        // supportedLngs: ['en', 'tr', 'de', 'fr', 'it', 'es', 'zh', 'ar', 'ja', 'ru'],
        supportedLngs: ['en', 'tr'],
        ns: ['translation'],
        defaultNS: 'translation',
        backend: {
            loadPath: `${window._env_?.SHYNTR_PATH_PREFIX || '/'}locales/{{lng}}/{{ns}}.json`,
        },
        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage'],
            lookupLocalStorage: 'shyntr-ui-language',
        },
        interpolation: {
            escapeValue: true,
        },
        react: {
            useSuspense: false,
        }
    });

export default i18n;