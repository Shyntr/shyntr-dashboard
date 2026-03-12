import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { Button } from '../ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '../ui/dropdown-menu';

const LANGUAGES = [
    { code: 'en', label: 'English', dir: 'ltr' },
    { code: 'tr', label: 'Türkçe', dir: 'ltr' },
    // { code: 'de', label: 'Deutsch', dir: 'ltr' },
    // { code: 'fr', label: 'Français', dir: 'ltr' },
    // { code: 'it', label: 'Italiano', dir: 'ltr' },
    // { code: 'es', label: 'Español', dir: 'ltr' },
    // { code: 'zh', label: '中文 (Chinese)', dir: 'ltr' },
    // { code: 'ar', label: 'العربية (Arabic)', dir: 'rtl' },
    // { code: 'ja', label: '日本語 (Japanese)', dir: 'ltr' },
    // { code: 'ru', label: 'Русский (Russian)', dir: 'ltr' },
];

export function LanguageSwitcher() {
    const { i18n } = useTranslation();

    useEffect(() => {
        const currentLang = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];
        document.documentElement.dir = currentLang.dir;
        document.documentElement.lang = currentLang.code;
    }, [i18n.language]);

    const changeLanguage = (code) => {
        i18n.changeLanguage(code);
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" data-testid="language-switcher-btn">
                    <Globe className="h-5 w-5 text-muted-foreground" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-card border-border/40">
                {LANGUAGES.map((lang) => (
                    <DropdownMenuItem
                        key={lang.code}
                        onClick={() => changeLanguage(lang.code)}
                        className={`cursor-pointer ${i18n.language === lang.code ? 'bg-primary/10 text-primary font-medium' : ''}`}
                    >
                        {lang.label}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}