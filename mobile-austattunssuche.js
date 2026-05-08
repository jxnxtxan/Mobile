// ==UserScript==
// @name         Mobile.de Ausstattungssuche mit modernem Popup & Import/Export (Generalisiertes Merging mit Merge-Konfiguration)
// @namespace    http://tampermonkey.net/
// @version      2.0.5
// @author       jxnxtxan
// @description  Sucht bestimmte Ausstattungen & Technische Daten auf mobile.de. Token-basierte Match-Engine mit Wortgrenzen, Quellen-Gewichtung (Feature-Liste vs. Beschreibung), SPA-Robustheit, Konfig-Popup mit Filter, Drag&Drop, Reset, Backup und Schema-Versionierung.
// @match        http://suchen.mobile.de/fahrzeuge/details.html*
// @match        https://suchen.mobile.de/fahrzeuge/details.html*
// @match        http://suchen.mobile.de/auto-inserat/*
// @match        https://suchen.mobile.de/auto-inserat/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function() {
    'use strict';

    // ============================================================
    // Konstanten / Schema
    // ============================================================
    const SCHEMA_VERSION = 4;
    const STORAGE_KEYS = {
        config:        'mobilede_config',
        techConfig:    'mobilede_techconfig',
        mergeGroups:   'mobilede_mergeGruppen',
        version:       'mobilede_config_version',
        backupPrefix:  'mobilede_config_backup_'
    };

    // ============================================================
    // 1) GM_*-Speicherhilfen
    // ============================================================
    function ladeConfig(key) {
        try {
            const str = GM_getValue(key, null);
            if (!str) return null;
            return JSON.parse(str);
        } catch (e) {
            console.warn('Fehler beim Laden der Konfiguration:', key, e);
            return null;
        }
    }
    function speichereConfig(key, data) {
        try {
            GM_setValue(key, JSON.stringify(data));
        } catch (e) {
            console.error('Fehler beim Speichern der Konfiguration:', key, e);
        }
    }

    // ============================================================
    // 2) Default-Konfigurationen (bereinigt)
    //    - umlauts und diakritika dürfen vorkommen, werden bei
    //      cleanText() / tokenize() normalisiert.
    //    - 'nurInFeatures: true' ignoriert Treffer aus Beschreibung.
    //    - 'compound: true' erlaubt Substring-Match an beliebiger
    //      Stelle im Token (selten nötig).
    // ============================================================
    const suchKonfigurationenDefault = [
        { begriffe: ['4wd', 'allrad'], anzeige: 'Allrad', farbe: 'orange', aktiv: true },
        { begriffe: ['quattro'], anzeige: 'Quattro / Allrad', farbe: 'orange', aktiv: true },
        { begriffe: ['ambiente beleuchtung', 'ambiente licht', 'stimmungslicht'], anzeige: 'Ambiente-Beleuchtung', aktiv: true },
        { begriffe: ['scheiben abgedunk', 'abgedunk scheib'], anzeige: 'Abgedunkelte Scheiben', aktiv: true },
        { begriffe: ['akustikverglasung', 'akustik verglasung', 'frontscheibe akus'], anzeige: 'Akustikverglasung', aktiv: true },
        { begriffe: ['seitenscheibe akus', 'türscheiben akus', 'seitenscheibe verglasung'], anzeige: 'Seitenscheiben Akustikverglasung', aktiv: true },
        { begriffe: ['adapt kurv licht', 'kurvenlicht adaptiv'], anzeige: 'Adaptives Kurvenlicht', aktiv: false },
        { begriffe: ['tempomat abstand', 'adapt temp', 'acc'], anzeige: 'Abstandstempomat', farbe: 'orange', aktiv: true },
        { begriffe: ['abstands warn', 'distance warn'], anzeige: 'Abstandswarner', aktiv: false },
        { begriffe: ['anhängevorrichtung', 'anhängerkupplung', 'ahk'], anzeige: 'Anhängerkupplung', farbe: 'red', aktiv: true, nurInFeatures: true },
        { begriffe: ['anhängevorrichtung schwenkbar', 'anhängerkupplung schwenkbar'], anzeige: 'Anhängerkupplung schwenkbar', aktiv: true },
        { begriffe: ['armlehne'], anzeige: 'Armlehne', aktiv: false },
        { begriffe: ['apple carplay', 'apple car play'], anzeige: 'Apple Carplay', aktiv: true },
        { begriffe: ['android auto'], anzeige: 'Android Auto', aktiv: true },
        { begriffe: ['außenspiegel elek verst', 'elek spiegel'], anzeige: 'Außenspiegel elektr. verstellbar', aktiv: true },
        { begriffe: ['außenspiegel heizung', 'außenspiegel beheiz', 'außenspiegel heiz'], anzeige: 'Außenspiegel beheizbar', aktiv: true },
        { begriffe: ['bang & olufsen', 'b&o', 'bang olufsen'], anzeige: 'Bang & Olufsen Sound System', farbe: 'red', aktiv: true, nurInFeatures: true },
        { begriffe: ['beats'], anzeige: 'Beats Sound System', farbe: 'red', aktiv: true, nurInFeatures: true },
        { begriffe: ['blendfrei fernlicht', 'anti blend licht', 'fernlicht assist', 'auto fernlicht'], anzeige: 'Fernlicht Assistent', farbe: 'orange', aktiv: true },
        { begriffe: ['brems assist', 'brake assist'], anzeige: 'Bremsassistent', aktiv: true },
        { begriffe: ['berganfahrassist', 'berganfahr', 'hill start', 'hill hold', 'anfahrassist'], anzeige: 'Berganfahrassistent', aktiv: false },
        { begriffe: ['business paket professional', 'business paket'], anzeige: 'Business Paket', aktiv: true },
        { begriffe: ['burmester'], anzeige: 'Burmester Sound System', farbe: 'red', aktiv: true, nurInFeatures: true },
        { begriffe: ['canton'], anzeige: 'Canton Sound System', farbe: 'red', aktiv: true, nurInFeatures: true },
        { begriffe: ['dachhimmel anth', 'himmel anth', 'dachhimmel schwarz', 'dachhim schwarz'], anzeige: 'Dachhimmel Anthrazit / Schwarz', aktiv: true },
        { begriffe: ['dachhimmel alcantara', 'himmel alcant'], anzeige: 'Dachhimmel Alcantara', aktiv: true },
        { begriffe: ['elek fenst'], anzeige: 'Elektr. Fensterheber', aktiv: false },
        { begriffe: ['elek heckklappe'], anzeige: 'Elektr. Heckklappe', aktiv: false },
        { begriffe: ['sitz elek verstell', 'sitzeinstellung', 'sitz einstellung', 'elektr sitz'], anzeige: 'Elektr. Sitzeinstellung', aktiv: true },
        { begriffe: ['memory sitz', 'sitz memory', 'sitz elek verstell memory'], anzeige: 'Elektr. Sitzeinstellung mit Memory-Funktion', farbe: 'red', aktiv: true },
        { begriffe: ['garantie'], anzeige: 'Garantie', aktiv: false },
        { begriffe: ['head up', 'head-up', 'hud'], anzeige: 'Head-Up Display', farbe: 'red', aktiv: true },
        { begriffe: ['heckantrieb', 'antrieb heck'], anzeige: 'Heckantrieb', aktiv: false },
        { begriffe: ['harman kardon', 'h&k', 'harman'], anzeige: 'Harman Kardon Sound System', farbe: 'red', aktiv: true, nurInFeatures: true },
        { begriffe: ['induktiv laden', 'induktion laden', 'induktionsladen', 'wireless charge'], anzeige: 'Induktionsladeschale für Smartphone (Wireless Charging)', aktiv: false },
        { begriffe: ['innenspiegel abblend', 'inne spiegel auto'], anzeige: 'Innenspiegel autom. abblendend', aktiv: true },
        { begriffe: ['lenkradheizung', 'beheizbares lenkrad', 'lenkrad heizung', 'lenkrad beheiz'], anzeige: 'Lenkradheizung', aktiv: true },
        { begriffe: ['lederlenkrad', 'leder lenkrad'], anzeige: 'Lederlenkrad', aktiv: false },
        { begriffe: ['matrix led', 'matrix scheinwerfer', 'matrix beam', 'matrix licht'], anzeige: 'Matrix Scheinwerfer', farbe: 'red', aktiv: true },
        { begriffe: ['panorama', 'panoramadach', 'glas dach'], anzeige: 'Panoramadach', farbe: 'orange', aktiv: true },
        { begriffe: ['park assist', 'park hilfe'], anzeige: 'Parkassistent', aktiv: true },
        { begriffe: ['pdc', 'park dist contr'], anzeige: 'Park-Distance-Control', aktiv: true },
        { begriffe: ['reifen druck', 'druck kontrolle'], anzeige: 'Reifendruck Kontrollsystem', aktiv: true },
        { begriffe: ['rückfahrkamera', 'rückfahrkamerasystem'], anzeige: 'Rückfahrkamera', aktiv: true },
        { begriffe: ['seiten airbag', 'airbag seite'], anzeige: 'Seitenairbag', aktiv: false },
        { begriffe: ['spiegel klappbar', 'elek spiegel klapp', 'außenspiegel anklappbar', 'außenspiegel klappbar'], anzeige: 'Außenspiegel anklappbar', aktiv: true },
        { begriffe: ['scheckheft gepflegt', 'scheckheft'], anzeige: 'Scheckheftgepflegt', farbe: 'red', aktiv: true },
        { begriffe: ['keyless', 'schlüssel frei', 'schlüssellose zentral'], anzeige: 'Schlüssellose Zentralverriegelung (Keyless)', farbe: 'orange', aktiv: true },
        { begriffe: ['servoschließung tür', 'soft close', 'softclose'], verboten: ['pedal', 'virtuell'], anzeige: 'Softclose', aktiv: true },
        { begriffe: ['sonnenschutzverglasung'], anzeige: 'Sonnenschutzverglasung', aktiv: true },
        { begriffe: ['sonnenschutzverglasung abgedunkelt'], anzeige: 'Sonnenschutzverglasung abgedunkelt', aktiv: true },
        { begriffe: ['spurhalte assist', 'lane assist'], anzeige: 'Spurhalteassistent', aktiv: true },
        { begriffe: ['standheizung', 'standhei'], anzeige: 'Standheizung', aktiv: true },
        { begriffe: ['standbelüf'], anzeige: 'Standbelüftung', aktiv: true },
        { begriffe: ['start stop', 'auto stop'], anzeige: 'Start/Stopp-Automatik', aktiv: false },
        { begriffe: ['sitzheizung', 'sitz heizung', 'heizung sitz'], anzeige: 'Sitzheizung', farbe: 'orange', aktiv: true },
        { begriffe: ['sitzbelüftung', 'sitz belüftung', 'sitzkühlung', 'sitz kühlung'], anzeige: 'Sitzbelüftung', farbe: 'red', aktiv: true },
        { begriffe: ['totwinkel', 'blind spot'], anzeige: 'Totwinkel-Assistent', aktiv: true },
        { begriffe: ['traction control', 'traktio kontr'], anzeige: 'Traktionskontrolle', aktiv: false },
        { begriffe: ['360 grad', '360 kamera', '360 cam', 'umfeld kamera', 'surround cam'], anzeige: '360 Grad Kamera', farbe: 'red', aktiv: true },
        { begriffe: ['verkehrszeichen', 'road sign'], anzeige: 'Verkehrszeichenerkennung', aktiv: true },
        { begriffe: ['digital cockpit', 'virtual cockpit', 'volldigit kombiinstrument', 'kombiinstrument digital'], anzeige: 'Volldigitales Kombiinstrument', aktiv: true },
        { begriffe: ['winter paket', 'kalt paket'], anzeige: 'Winterpaket', aktiv: true },
        { begriffe: ['zentral verriegelung', 'central lock', 'zentralverriegelung'], anzeige: 'Zentralverriegelung', aktiv: true }
    ];

    const techDataKonfigurationenDefault = [
        { begriff: 'Fahrzeugzustand',    aktiv: true },
        { begriff: 'Erstzulassung',      aktiv: true },
        { begriff: 'Innenausstattung',   aktiv: true },
        { begriff: 'Farbe (Hersteller)', aktiv: true },
        { begriff: 'Farbe',              aktiv: true }
    ];

    const mergeGruppenConfigDefault = [
        { basis: 'außenspiegel', order: ['elektr. verstellbar', 'beheizbar', 'anklappbar', 'klappbar', 'auto. abblend.'] }
    ];

    // ============================================================
    // 3) Migration & Konfig-Laden
    // ============================================================
    /**
     * Vereint die begriffe-Listen einer User-Config mit den aktuellen
     * Defaults (per anzeige-Schlüssel). Neue Begriffsvarianten aus den
     * Defaults werden additiv ergänzt, User-eigene begriffe bleiben.
     * Andere Felder (anzeige, farbe, aktiv, verboten, …) werden NICHT
     * angerührt.
     */
    function unionBegriffeMitDefaults(userConfig, defaults) {
        if (!Array.isArray(userConfig)) return userConfig;
        const defaultByAnzeige = new Map();
        defaults.forEach(d => {
            if (d && d.anzeige) defaultByAnzeige.set(d.anzeige.trim().toLowerCase(), d);
        });
        let added = 0;
        const merged = userConfig.map(item => {
            const key = (item.anzeige || '').trim().toLowerCase();
            const def = defaultByAnzeige.get(key);
            if (!def || !Array.isArray(def.begriffe)) return item;
            const existing = new Set((item.begriffe || []).map(b => String(b).toLowerCase().trim()));
            const additions = def.begriffe.filter(b => !existing.has(String(b).toLowerCase().trim()));
            if (additions.length === 0) return item;
            added += additions.length;
            return { ...item, begriffe: [...(item.begriffe || []), ...additions] };
        });
        if (added > 0) {
            console.info(`mobilede: ${added} neue Default-Begriffe in User-Config integriert.`);
        }
        return merged;
    }

    /**
     * Renamings für Anzeige-Texte zwischen Schema-Versionen.
     * key (lowercase, getrimmt) -> neue Anzeige.
     */
    const ANZEIGE_RENAMES = {
        'seitenspiegel anklappbar': 'Außenspiegel anklappbar'
    };

    function applyAnzeigeRenames(userConfig) {
        if (!Array.isArray(userConfig)) return userConfig;
        let renamed = 0;
        userConfig.forEach(item => {
            const key = (item.anzeige || '').trim().toLowerCase();
            if (ANZEIGE_RENAMES[key]) {
                item.anzeige = ANZEIGE_RENAMES[key];
                renamed++;
            }
        });
        if (renamed > 0) console.info(`mobilede: ${renamed} Anzeige-Text(e) auf neuen Default umbenannt.`);
        return userConfig;
    }

    function addMissingDefaultEntries(userConfig, defaults) {
        if (!Array.isArray(userConfig)) return userConfig;
        const userKeys = new Set(
            userConfig.map(c => (c.anzeige || '').trim().toLowerCase()).filter(Boolean)
        );
        const missing = defaults.filter(d => {
            const k = (d.anzeige || '').trim().toLowerCase();
            return k && !userKeys.has(k);
        });
        if (missing.length === 0) return userConfig;
        console.info(
            `mobilede: ${missing.length} neue Default-Eintraege ergaenzt: `
            + missing.map(m => m.anzeige).join(', ')
        );
        return [...userConfig, ...missing.map(d => JSON.parse(JSON.stringify(d)))];
    }

    function migrateMergeGroups(userMerge, defaults) {
        if (!Array.isArray(userMerge)) return userMerge;
        let updated = false;
        const byBasis = new Map(defaults.map(g => [g.basis.toLowerCase(), g]));
        const merged = userMerge.map(g => {
            const def = byBasis.get((g.basis || '').toLowerCase());
            if (!def) return g;
            const existingOrder = new Set((g.order || []).map(o => o.toLowerCase()));
            const additions = (def.order || []).filter(o => !existingOrder.has(o.toLowerCase()));
            if (additions.length === 0) return g;
            updated = true;
            return { ...g, order: [...(g.order || []), ...additions] };
        });
        if (updated) console.info('mobilede: Merge-Gruppen-Reihenfolge mit neuen Default-Modifiern ergaenzt.');
        return merged;
    }

    function migrateIfNeeded() {
        const stored = ladeConfig(STORAGE_KEYS.version);
        if (stored === SCHEMA_VERSION) return;

        // Ausstattungs-Config: rename, union begriffe, add missing
        const userConfig = ladeConfig(STORAGE_KEYS.config);
        if (Array.isArray(userConfig)) {
            let next = applyAnzeigeRenames(userConfig);
            next = unionBegriffeMitDefaults(next, suchKonfigurationenDefault);
            next = addMissingDefaultEntries(next, suchKonfigurationenDefault);
            speichereConfig(STORAGE_KEYS.config, next);
        }

        // Merge-Gruppen: neue Order-Modifier additiv ergänzen
        const userMerge = ladeConfig(STORAGE_KEYS.mergeGroups);
        if (Array.isArray(userMerge)) {
            const next = migrateMergeGroups(userMerge, mergeGruppenConfigDefault);
            speichereConfig(STORAGE_KEYS.mergeGroups, next);
        }

        speichereConfig(STORAGE_KEYS.version, SCHEMA_VERSION);
    }
    migrateIfNeeded();

    let suchKonfigurationen     = ladeConfig(STORAGE_KEYS.config)      || suchKonfigurationenDefault;
    let techDataKonfigurationen = ladeConfig(STORAGE_KEYS.techConfig)  || techDataKonfigurationenDefault;
    let mergeGruppenConfig      = ladeConfig(STORAGE_KEYS.mergeGroups) || mergeGruppenConfigDefault;

    // ============================================================
    // 4) Textaufbereitung & Tokenisierung
    // ============================================================
    function cleanText(text) {
        if (!text) return '';
        return text
            .replace(/ä/g, 'ae').replace(/Ä/g, 'Ae')
            .replace(/ö/g, 'oe').replace(/Ö/g, 'Oe')
            .replace(/ü/g, 'ue').replace(/Ü/g, 'Ue')
            .replace(/ß/g, 'ss')
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[–—\-]+/g, ' ')
            .replace(/[\n\r\t]+/g, ' ')
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .replace(/[,;:|()\[\]"']/g, ' ')
            .replace(/\s{2,}/g, ' ')
            .trim()
            .toLowerCase();
    }

    function tokenize(text) {
        const cleaned = cleanText(text);
        if (!cleaned) return [];
        return cleaned.split(/\s+/).filter(Boolean);
    }

    function escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // ============================================================
    // 5) Match-Engine
    //    - tokenMatches: exakt, Prefix oder Suffix (>= 4 Zeichen),
    //      Substring nur bei compound: true.
    //    - matchInTokens: Sliding-Window über Trefferpositionen,
    //      O(n log n) statt kartesischem Produkt.
    // ============================================================
    const MAX_WORD_GAP = { 1: 0, 2: 3, 3: 6, 4: 10, 5: 14 };
    function getMaxWordGap(parts) {
        return MAX_WORD_GAP[parts] || (parts > 5 ? parts * 3 : 0);
    }

    function tokenMatches(token, part, compound) {
        if (!token || !part) return false;
        if (token === part) return true;
        if (part.length < 4) return false;
        if (compound) return token.includes(part);
        if (token.startsWith(part) || token.endsWith(part)) return true;
        // Mid-substring nur ab 5 Zeichen erlauben, um false-positives bei
        // 4-Zeichen-Patterns (head, glas, heiz, ende, …) zu vermeiden.
        if (part.length >= 5 && token.includes(part)) return true;
        return false;
    }

    function findPositions(tokens, part, compound) {
        const positions = [];
        for (let i = 0; i < tokens.length; i++) {
            if (tokenMatches(tokens[i], part, compound)) positions.push(i);
        }
        return positions;
    }

    /**
     * Sucht ein Fenster in `tokens`, das alle `parts` enthält und
     * dabei höchstens maxGap Wörter Differenz zwischen erstem und
     * letztem getroffenen Token hat.
     * Gibt {startIdx, endIdx} oder null zurück.
     */
    function matchInTokens(tokens, parts, maxGap, compound) {
        if (parts.length === 0 || tokens.length === 0) return null;
        if (parts.length === 1) {
            const pos = findPositions(tokens, parts[0], compound);
            if (pos.length === 0) return null;
            return { startIdx: pos[0], endIdx: pos[0] };
        }
        const positionLists = parts.map(p => findPositions(tokens, p, compound));
        for (const list of positionLists) {
            if (list.length === 0) return null;
        }
        // Pointer pro Liste -> sliding window
        const pointers = new Array(positionLists.length).fill(0);
        let best = null;
        while (true) {
            const current = positionLists.map((list, i) => list[pointers[i]]);
            const min = Math.min(...current);
            const max = Math.max(...current);
            if (max - min <= maxGap) {
                if (!best || (max - min) < (best.endIdx - best.startIdx)) {
                    best = { startIdx: min, endIdx: max };
                    if (max - min === parts.length - 1) return best;
                }
            }
            // bewege den Pointer mit dem kleinsten Wert weiter
            const minListIdx = current.indexOf(min);
            pointers[minListIdx]++;
            if (pointers[minListIdx] >= positionLists[minListIdx].length) break;
        }
        return best;
    }

    function isForbiddenInWindow(tokens, window, verboten) {
        if (!verboten || verboten.length === 0) return false;
        const slice = tokens.slice(window.startIdx, window.endIdx + 1).join(' ');
        const pattern = new RegExp(verboten.map(escapeRegex).join('|'), 'i');
        return pattern.test(slice);
    }

    // ============================================================
    // 6) Quellen-Extraktion (lazy, mit heuristischem Fallback)
    // ============================================================
    function getFeatureItems() {
        return Array.from(document.querySelectorAll("ul[data-testid='vip-features-list'] li"));
    }
    function getDescriptionEl() {
        return document.querySelector("div[data-testid='vip-vehicle-description-text']");
    }
    function getTechDataDl() {
        return document.querySelector("article[data-testid='vip-technical-data-box'] dl");
    }
    /**
     * Heuristik-Fallback für den ehemaligen ".GOIOV fqe3L EevEz"-Block:
     * sucht ein Geschwister-Element zur Beschreibung, das zusätzliche
     * Texte enthält (Verkäufer-Hinweise etc.). Bei Layout-Änderung
     * von mobile.de bleibt das Skript funktional.
     */
    function getZusatzEl() {
        const desc = getDescriptionEl();
        if (!desc) return null;
        const candidate = desc.parentElement && desc.parentElement.nextElementSibling;
        if (candidate && candidate.textContent && candidate.textContent.trim().length > 20) {
            return candidate;
        }
        return null;
    }

    /**
     * Heuristik: erkennt einen Beschreibungs-Block, der in Wahrheit eine
     * Komma-getrennte Feature-Liste ist (typischer mobile.de-Block). Wenn
     * ja, wird der Block als 'high' confidence eingestuft, sodass auch
     * Einträge mit nurInFeatures: true ihn berücksichtigen.
     */
    function classifyDescription(rawText) {
        if (!rawText) return 'low';
        const items = rawText.split(/,/).map(s => s.trim()).filter(Boolean);
        // Eindeutige Komma-Liste: viele Items → strukturierte Ausstattung.
        if (items.length >= 12) return 'high';
        if (items.length >= 6) {
            // Anteil kurzer Items zählen statt nur Mittelwert (robuster gegen
            // einzelne lange Items wie "Multi-Media-Interface MMI Navigation").
            const shortRatio = items.filter(it => it.split(/\s+/).length <= 5).length / items.length;
            if (shortRatio >= 0.6) return 'high';
        }
        return 'low';
    }

    /**
     * Liefert eine Liste von Quellen mit confidence:
     *   - features    -> high
     *   - tech        -> high
     *   - description -> high (wenn Komma-Liste) sonst low
     *   - zusatz      -> low
     */
    function extractSources() {
        const sources = [];

        const featureItems = getFeatureItems();
        if (featureItems.length > 0) {
            const text = featureItems.map(li => li.textContent.trim()).filter(Boolean).join(' | ');
            sources.push({ id: 'features', confidence: 'high', text, tokens: tokenize(text) });
        }

        const techDl = getTechDataDl();
        if (techDl) {
            const text = techDl.textContent.replace(/\s+/g, ' ').trim();
            sources.push({ id: 'tech', confidence: 'high', text, tokens: tokenize(text) });
        }

        const desc = getDescriptionEl();
        if (desc) {
            const rawText = desc.textContent.replace(/\s+/g, ' ').trim();
            const confidence = classifyDescription(rawText);
            const text = rawText.replace(/,/g, ' ');
            sources.push({ id: 'description', confidence, text, tokens: tokenize(text) });
        }

        const zusatz = getZusatzEl();
        if (zusatz) {
            const text = zusatz.textContent.trim();
            sources.push({ id: 'zusatz', confidence: 'low', text, tokens: tokenize(text) });
        }
        return sources;
    }

    // ============================================================
    // 7) Begriffs-Suche (ersetzt sucheBegriffe)
    // ============================================================
    function sucheBegriffe() {
        const sources = extractSources();
        if (sources.length === 0) return [];
        const gefundene = [];

        suchKonfigurationen.forEach(cfg => {
            if (!cfg.aktiv) return;
            if (!Array.isArray(cfg.begriffe) || cfg.begriffe.length === 0) return;

            const onlyHigh = cfg.nurInFeatures === true;
            const compound = cfg.compound === true;

            for (const src of sources) {
                if (onlyHigh && src.confidence !== 'high') continue;

                let matched = false;
                for (const begriff of cfg.begriffe) {
                    const parts = tokenize(begriff);
                    if (parts.length === 0) continue;
                    const maxGap = getMaxWordGap(parts.length);
                    const window = matchInTokens(src.tokens, parts, maxGap, compound);
                    if (!window) continue;
                    if (cfg.verboten && cfg.verboten.length > 0) {
                        const forbiddenParts = cfg.verboten
                            .map(v => cleanText(v))
                            .filter(Boolean);
                        if (isForbiddenInWindow(src.tokens, window, forbiddenParts)) {
                            console.debug('Verbotenes Token im Fenster für', cfg.anzeige, '→ skip');
                            continue;
                        }
                    }
                    const snippetTokens = src.tokens.slice(
                        Math.max(0, window.startIdx - 2),
                        Math.min(src.tokens.length, window.endIdx + 3)
                    );
                    gefundene.push({
                        anzeige: cfg.anzeige,
                        farbe: (cfg.farbe || '#66ff66').toLowerCase(),
                        source: src.id,
                        confidence: src.confidence,
                        snippet: snippetTokens.join(' '),
                        begriff
                    });
                    matched = true;
                    break;
                }
                if (matched) break;
            }
        });

        // Dedup: gleiche anzeige nur einmal, dabei beste confidence behalten
        const byAnzeige = new Map();
        for (const item of gefundene) {
            const existing = byAnzeige.get(item.anzeige);
            if (!existing) { byAnzeige.set(item.anzeige, item); continue; }
            const existingHigh = existing.confidence === 'high';
            const itemHigh = item.confidence === 'high';
            if (!existingHigh && itemHigh) byAnzeige.set(item.anzeige, item);
        }
        let unique = [...byAnzeige.values()];
        unique.sort((a, b) => a.anzeige.localeCompare(b.anzeige));

        // Substring-Dedup: kürzeren Eintrag entfernen, wenn ein längerer
        // Eintrag existiert, der ALLE Tokens des kürzeren als komplette
        // Tokens enthält (kein Prefix-Hack mehr).
        unique = subsetDedup(unique);

        // Generalisiertes Merging
        unique = generalizedMergeEntries(unique, mergeGruppenConfig);

        // Endgültige alphabetische Sortierung
        unique.sort((a, b) => a.anzeige.localeCompare(b.anzeige));
        console.debug('Gefundene Begriffe:', unique.map(i => `${i.anzeige} [${i.source}]`));
        return unique;
    }

    function subsetDedup(entries) {
        const tokenSets = entries.map(e => new Set(tokenize(e.anzeige)));
        const result = [];
        for (let i = 0; i < entries.length; i++) {
            const a = tokenSets[i];
            let dropped = false;
            for (let j = 0; j < entries.length; j++) {
                if (i === j) continue;
                const b = tokenSets[j];
                if (b.size <= a.size) continue;
                let containsAll = true;
                for (const t of a) {
                    if (!b.has(t)) { containsAll = false; break; }
                }
                if (containsAll) { dropped = true; break; }
            }
            if (!dropped) result.push(entries[i]);
        }
        return result;
    }

    function generalizedMergeEntries(entries, gruppen) {
        if (!Array.isArray(gruppen) || gruppen.length === 0) return entries;
        let result = [...entries];
        gruppen.forEach(group => {
            if (!group || !group.basis) return;
            const basis = group.basis.toLowerCase();
            const order = (group.order || []).map(item => item.toLowerCase());
            const matching = result.filter(e => e.anzeige.toLowerCase().includes(basis));
            if (matching.length <= 1) return;
            result = result.filter(e => !e.anzeige.toLowerCase().includes(basis));
            let modifiers = matching
                .map(e => e.anzeige.toLowerCase().replace(basis, '').trim())
                .filter(Boolean);
            modifiers = Array.from(new Set(modifiers));
            modifiers.sort((a, b) => {
                let ia = order.findIndex(key => a.includes(key.replace(/\./g, '').trim()));
                let ib = order.findIndex(key => b.includes(key.replace(/\./g, '').trim()));
                if (ia === -1) ia = 999;
                if (ib === -1) ib = 999;
                return ia - ib;
            });
            const basisCap = group.basis.charAt(0).toUpperCase() + group.basis.slice(1);
            const merged = basisCap + (modifiers.length ? ' ' + modifiers.join(', ') : '');
            // beste confidence der Gruppe übernehmen
            const bestConf = matching.some(e => e.confidence === 'high') ? 'high' : 'low';
            const sources = [...new Set(matching.map(e => e.source))].join(',');
            result.push({
                anzeige: merged,
                farbe: matching[0].farbe,
                source: sources,
                confidence: bestConf
            });
        });
        return result;
    }

    // ============================================================
    // 8) Suche nach Technischen Daten
    // ============================================================
    function sucheTechnischeDaten() {
        const techDataBereich = getTechDataDl();
        if (!techDataBereich) return [];
        const dtElements = techDataBereich.querySelectorAll('dt');
        const daten = [];
        techDataKonfigurationen.forEach(cfg => {
            if (!cfg.aktiv) return;
            for (const dt of dtElements) {
                if (dt.textContent.trim().toLowerCase() === cfg.begriff.toLowerCase()) {
                    const dd = dt.nextElementSibling;
                    if (dd && dd.tagName.toLowerCase() === 'dd') {
                        daten.push({ title: cfg.begriff, value: dd.textContent.trim() });
                    }
                    break;
                }
            }
        });
        return daten;
    }

    function technischeDatenHinzufuegen(parentElement) {
        const technischeDaten = sucheTechnischeDaten();
        if (technischeDaten.length === 0) return;
        const techArticle = document.createElement('article');
        techArticle.className = 'A3G6X lAeeF vTKPY HaBLt ku0Os mobilede-tech-article';
        techArticle.style.marginBottom = '10px';
        const techContainer = document.createElement('div');
        Object.assign(techContainer.style, {
            border: '1px solid #8a2be2',
            padding: '10px',
            backgroundColor: '#1e1f24',
            color: 'white',
            width: '100%',
            textAlign: 'left',
            boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
            fontSize: '14px',
            lineHeight: '1.5',
            display: 'block'
        });
        const title = document.createElement('div');
        title.textContent = 'Technische Daten:';
        title.style.color = 'white';
        title.style.marginBottom = '5px';
        techContainer.appendChild(title);
        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        technischeDaten.forEach(d => {
            const tr = document.createElement('tr');
            const tdKey = document.createElement('td');
            tdKey.textContent = d.title + ':';
            Object.assign(tdKey.style, { color: 'white', paddingRight: '20px', whiteSpace: 'nowrap', verticalAlign: 'top' });
            const tdValue = document.createElement('td');
            tdValue.textContent = d.value;
            Object.assign(tdValue.style, { color: 'white', width: '100%', verticalAlign: 'top' });
            tr.appendChild(tdKey);
            tr.appendChild(tdValue);
            table.appendChild(tr);
        });
        techContainer.appendChild(table);
        techArticle.appendChild(techContainer);
        parentElement.parentNode.insertBefore(techArticle, parentElement);
    }

    // ============================================================
    // 9) Render: Ergebnis-Article einfügen
    // ============================================================
    function ergebnisHinzufuegen() {
        if (document.querySelector('#ergebnisBereich')) return;
        const zielBereich = document.querySelector("article[data-testid='vip-key-features-box']");
        if (!zielBereich) return;

        const gefundeneTexte = sucheBegriffe();

        const article = document.createElement('article');
        article.className = 'A3G6X lAeeF vTKPY HaBLt ku0Os mobilede-result-article';
        const ergebnisBereich = document.createElement('div');
        ergebnisBereich.id = 'ergebnisBereich';
        Object.assign(ergebnisBereich.style, {
            border: '1px solid #8a2be2',
            padding: '10px',
            marginTop: '10px',
            backgroundColor: '#1e1f24',
            color: 'white',
            width: '100%',
            textAlign: 'left',
            boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
            fontSize: '14px',
            lineHeight: '1.5',
            display: 'flex',
            flexWrap: 'wrap'
        });
        article.appendChild(ergebnisBereich);

        const title = document.createElement('div');
        title.style.color = 'white';
        title.style.marginBottom = '5px';
        title.style.width = '100%';
        title.textContent = 'Gefundene Begriffe:';
        ergebnisBereich.appendChild(title);

        if (gefundeneTexte.length > 0) {
            gefundeneTexte.forEach(item => {
                const el = document.createElement('div');
                const isLow = item.confidence === 'low';
                el.style.width = '50%';
                // Tooltip + Help-Cursor liegen NUR auf dem inneren Span,
                // sodass der Cursor außerhalb des Textes normal bleibt.
                const span = document.createElement('span');
                span.textContent = `- ${item.anzeige}${isLow ? ' *' : ''}`;
                span.style.color = item.farbe;
                span.style.cursor = 'help';
                const sourceLabel = isLow
                    ? `Nur in Beschreibung gefunden (Quelle: ${item.source})`
                    : `Quelle: ${item.source}`;
                const trigger = item.begriff ? `\nTrigger: "${item.begriff}"` : '';
                const snippet = item.snippet ? `\nKontext: …${item.snippet}…` : '';
                span.title = sourceLabel + trigger + snippet;
                if (isLow) {
                    span.style.fontStyle = 'italic';
                    span.style.opacity = '0.85';
                }
                el.appendChild(span);
                ergebnisBereich.appendChild(el);
            });
            const hasLow = gefundeneTexte.some(i => i.confidence === 'low');
            if (hasLow) {
                const legend = document.createElement('div');
                legend.style.width = '100%';
                legend.style.fontSize = '11px';
                legend.style.opacity = '0.7';
                legend.style.marginTop = '6px';
                legend.textContent = '* = nur in Beschreibungstext gefunden (geringere Sicherheit)';
                ergebnisBereich.appendChild(legend);
            }
        } else {
            const keine = document.createElement('div');
            keine.textContent = 'Keine der gesuchten Begriffe gefunden.';
            keine.style.color = 'white';
            ergebnisBereich.appendChild(keine);
        }

        zielBereich.parentNode.insertBefore(article, zielBereich.nextSibling);
        technischeDatenHinzufuegen(article);
    }

    function clearResults() {
        document.querySelectorAll('.mobilede-result-article, .mobilede-tech-article').forEach(el => el.remove());
    }

    // ============================================================
    // 10) Lifecycle: Observer + SPA-Navigation
    // ============================================================
    let observer = null;
    let triggerTimer = null;
    function trigger() {
        clearTimeout(triggerTimer);
        triggerTimer = setTimeout(() => {
            try { ergebnisHinzufuegen(); } catch (e) { console.error(e); }
        }, 300);
    }

    function startObserver() {
        if (observer) observer.disconnect();
        // Wir lassen den Observer dauerhaft laufen; trigger() ist debounced
        // und ergebnisHinzufuegen() bricht früh ab, wenn bereits eingefügt.
        // Bei SPA-Re-Renders (DOM ohne URL-Wechsel) wird so neu gerendert.
        observer = new MutationObserver(() => trigger());
        observer.observe(document.body, { childList: true, subtree: true });
    }

    let lastUrl = location.href;
    function onUrlChange() {
        if (location.href === lastUrl) return;
        lastUrl = location.href;
        clearResults();
        startObserver();
        trigger();
        // Konfig-Button neu setzen, falls Parent re-rendered wurde
        setTimeout(() => {
            if (!document.querySelector('#mobilede-config-btn')) erstelleKonfigButton();
        }, 1500);
    }

    window.addEventListener('popstate', onUrlChange);
    window.addEventListener('hashchange', onUrlChange);
    setInterval(onUrlChange, 1000);

    startObserver();
    trigger();

    // ============================================================
    // 11) Konfig-Popup
    // ============================================================
    function oeffneKonfigPopup() {
        if (document.querySelector('#mobilede-config-overlay')) return;

        let aktuelleAusstattungsKonfig = JSON.parse(JSON.stringify(suchKonfigurationen));
        let aktuelleTechKonfigurationen = JSON.parse(JSON.stringify(techDataKonfigurationen));
        let aktuelleMergeGruppen = JSON.parse(JSON.stringify(mergeGruppenConfig));

        // Body-Scroll sperren, damit der mobile.de-Header nicht in den
        // Sichtbereich rutscht und nichts verdeckt.
        const prevBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const overlay = document.createElement('div');
        overlay.id = 'mobilede-config-overlay';
        Object.assign(overlay.style, {
            position: 'fixed', top: '0', left: '0', right: '0', bottom: '0',
            width: '100vw', height: '100vh',
            // Maximaler z-index, damit der sticky Header von mobile.de
            // nicht über das Overlay rutscht.
            zIndex: '2147483647',
            backgroundColor: 'rgba(0, 0, 0, 0.85)', opacity: '0',
            transition: 'opacity 0.3s ease',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px',
            boxSizing: 'border-box'
        });
        document.body.appendChild(overlay);

        function escListener(e) { if (e.key === 'Escape') removeOverlay(); }
        document.addEventListener('keydown', escListener);
        function removeOverlay() {
            document.removeEventListener('keydown', escListener);
            document.body.style.overflow = prevBodyOverflow;
            overlay.remove();
        }
        // Klick auf den dunklen Hintergrund schließt das Popup.
        overlay.addEventListener('click', e => {
            if (e.target === overlay) removeOverlay();
        });

        const popup = document.createElement('div');
        Object.assign(popup.style, {
            // Per Flex zentriert (nicht mehr per absolute/translate),
            // dadurch ist Position immer im Viewport, egal wie der
            // Header von mobile.de sich verhält.
            position: 'relative',
            width: '100%', maxWidth: '900px',
            maxHeight: '100%',
            overflowY: 'auto', backgroundColor: '#2e2f35', color: '#fff',
            borderRadius: '10px', boxShadow: '0 4px 15px rgba(0, 0, 0, 0.6)',
            border: 'none', padding: '20px', fontFamily: 'Arial, sans-serif',
            opacity: '0', transition: 'opacity 0.3s ease',
            boxSizing: 'border-box'
        });

        const title = document.createElement('h2');
        title.textContent = 'Konfiguration';
        title.style.marginTop = '0';
        title.style.fontWeight = 'normal';
        popup.appendChild(title);

        // ===== A) Ausstattung =====
        const ausstattungTitle = document.createElement('h3');
        ausstattungTitle.textContent = 'Ausstattungs-Konfiguration';
        ausstattungTitle.style.borderBottom = '1px solid #444';
        ausstattungTitle.style.paddingBottom = '4px';
        ausstattungTitle.style.marginTop = '16px';
        popup.appendChild(ausstattungTitle);

        const filterRow = document.createElement('div');
        filterRow.style.display = 'flex';
        filterRow.style.gap = '8px';
        filterRow.style.margin = '8px 0';

        const filterInput = document.createElement('input');
        filterInput.type = 'text';
        filterInput.placeholder = 'Filter (Anzeigetext oder Begriff)…';
        Object.assign(filterInput.style, {
            flex: '1', padding: '6px 8px', borderRadius: '4px',
            border: '1px solid #555', background: '#3b3c42', color: '#fff'
        });

        const onlyActive = document.createElement('label');
        onlyActive.style.display = 'flex';
        onlyActive.style.alignItems = 'center';
        onlyActive.style.gap = '4px';
        const onlyActiveCb = document.createElement('input');
        onlyActiveCb.type = 'checkbox';
        onlyActive.appendChild(onlyActiveCb);
        const onlyActiveSpan = document.createElement('span');
        onlyActiveSpan.textContent = 'nur aktive';
        onlyActive.appendChild(onlyActiveSpan);

        filterRow.appendChild(filterInput);
        filterRow.appendChild(onlyActive);
        popup.appendChild(filterRow);

        const ausstattungContainer = document.createElement('div');
        popup.appendChild(ausstattungContainer);

        let draggedAusstattungIndex = null;

        function ausstattungSichtbar(item) {
            const f = filterInput.value.trim().toLowerCase();
            if (onlyActiveCb.checked && !item.aktiv) return false;
            if (!f) return true;
            if ((item.anzeige || '').toLowerCase().includes(f)) return true;
            if ((item.begriffe || []).some(b => b.toLowerCase().includes(f))) return true;
            return false;
        }

        function renderAusstattung() {
            ausstattungContainer.innerHTML = '';
            aktuelleAusstattungsKonfig.forEach((item, index) => {
                if (!ausstattungSichtbar(item)) return;
                const divItem = document.createElement('div');
                Object.assign(divItem.style, {
                    border: '1px solid #444', borderRadius: '6px',
                    padding: '10px', marginBottom: '8px', backgroundColor: '#3b3c42',
                    cursor: 'grab'
                });
                divItem.draggable = true;
                divItem.addEventListener('dragstart', e => {
                    draggedAusstattungIndex = index;
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', String(index));
                });
                divItem.addEventListener('dragover', e => e.preventDefault());
                divItem.addEventListener('drop', e => {
                    e.preventDefault();
                    if (draggedAusstattungIndex === null || draggedAusstattungIndex === index) return;
                    const moved = aktuelleAusstattungsKonfig[draggedAusstattungIndex];
                    aktuelleAusstattungsKonfig.splice(draggedAusstattungIndex, 1);
                    const insertAt = draggedAusstattungIndex < index ? index - 1 : index;
                    aktuelleAusstattungsKonfig.splice(insertAt, 0, moved);
                    draggedAusstattungIndex = null;
                    renderAusstattung();
                });

                const row1 = document.createElement('div');
                Object.assign(row1.style, { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' });

                const checkAktiv = document.createElement('input');
                checkAktiv.type = 'checkbox';
                checkAktiv.checked = item.aktiv === true;
                checkAktiv.addEventListener('change', () => { item.aktiv = checkAktiv.checked; });

                const lblAktiv = document.createElement('label');
                lblAktiv.textContent = 'aktiv';

                const inputAnzeige = document.createElement('input');
                inputAnzeige.type = 'text';
                inputAnzeige.value = item.anzeige || '';
                inputAnzeige.placeholder = 'Anzeigetext';
                Object.assign(inputAnzeige.style, { flex: '1', minWidth: '150px' });
                inputAnzeige.addEventListener('input', () => { item.anzeige = inputAnzeige.value; });

                const inputFarbe = document.createElement('input');
                inputFarbe.type = 'text';
                inputFarbe.value = item.farbe || '';
                inputFarbe.placeholder = '#66ff66';
                inputFarbe.style.width = '100px';
                inputFarbe.addEventListener('input', () => { item.farbe = inputFarbe.value; });

                const featuresOnlyLabel = document.createElement('label');
                featuresOnlyLabel.style.display = 'flex';
                featuresOnlyLabel.style.alignItems = 'center';
                featuresOnlyLabel.style.gap = '4px';
                featuresOnlyLabel.title = 'Treffer aus Beschreibungstext ignorieren (nur strukturierte Listen)';
                const featuresOnlyCb = document.createElement('input');
                featuresOnlyCb.type = 'checkbox';
                featuresOnlyCb.checked = item.nurInFeatures === true;
                featuresOnlyCb.addEventListener('change', () => { item.nurInFeatures = featuresOnlyCb.checked; });
                featuresOnlyLabel.appendChild(featuresOnlyCb);
                const featuresOnlyText = document.createElement('span');
                featuresOnlyText.textContent = 'nur Features';
                featuresOnlyText.style.fontSize = '11px';
                featuresOnlyLabel.appendChild(featuresOnlyText);

                const compoundLabel = document.createElement('label');
                compoundLabel.style.display = 'flex';
                compoundLabel.style.alignItems = 'center';
                compoundLabel.style.gap = '4px';
                compoundLabel.title = 'Substring an beliebiger Stelle erlauben (für deutsche Komposita)';
                const compoundCb = document.createElement('input');
                compoundCb.type = 'checkbox';
                compoundCb.checked = item.compound === true;
                compoundCb.addEventListener('change', () => { item.compound = compoundCb.checked; });
                compoundLabel.appendChild(compoundCb);
                const compoundText = document.createElement('span');
                compoundText.textContent = 'compound';
                compoundText.style.fontSize = '11px';
                compoundLabel.appendChild(compoundText);

                const btnLoeschen = document.createElement('button');
                btnLoeschen.textContent = 'Löschen';
                Object.assign(btnLoeschen.style, {
                    cursor: 'pointer', padding: '4px 8px', border: 'none',
                    borderRadius: '4px', backgroundColor: '#a33', color: '#fff'
                });
                btnLoeschen.addEventListener('click', () => {
                    aktuelleAusstattungsKonfig.splice(index, 1);
                    renderAusstattung();
                });

                row1.appendChild(checkAktiv);
                row1.appendChild(lblAktiv);
                row1.appendChild(inputAnzeige);
                row1.appendChild(inputFarbe);
                row1.appendChild(featuresOnlyLabel);
                row1.appendChild(compoundLabel);
                row1.appendChild(btnLoeschen);

                const txtBegriffe = document.createElement('textarea');
                txtBegriffe.value = (item.begriffe || []).join(', ');
                Object.assign(txtBegriffe.style, { width: '100%', height: '40px', marginTop: '6px' });
                txtBegriffe.placeholder = 'Suchbegriffe, Komma-getrennt';
                txtBegriffe.addEventListener('input', () => {
                    item.begriffe = txtBegriffe.value.split(',').map(s => s.trim()).filter(Boolean);
                });

                const txtVerboten = document.createElement('textarea');
                txtVerboten.value = (item.verboten || []).join(', ');
                Object.assign(txtVerboten.style, { width: '100%', height: '30px', marginTop: '4px' });
                txtVerboten.placeholder = 'Verbotene Wörter, Komma-getrennt';
                txtVerboten.addEventListener('input', () => {
                    item.verboten = txtVerboten.value.split(',').map(s => s.trim()).filter(Boolean);
                });

                divItem.appendChild(row1);
                divItem.appendChild(txtBegriffe);
                divItem.appendChild(txtVerboten);
                ausstattungContainer.appendChild(divItem);
            });
        }
        renderAusstattung();
        filterInput.addEventListener('input', renderAusstattung);
        onlyActiveCb.addEventListener('change', renderAusstattung);

        const btnNeuAusstattung = document.createElement('button');
        btnNeuAusstattung.textContent = 'Neuen Ausstattungseintrag hinzufügen';
        Object.assign(btnNeuAusstattung.style, {
            cursor: 'pointer', padding: '6px 10px', border: 'none',
            borderRadius: '4px', backgroundColor: '#4caf50', color: '#fff',
            marginTop: '8px', marginRight: '8px'
        });
        btnNeuAusstattung.addEventListener('click', () => {
            aktuelleAusstattungsKonfig.unshift({ begriffe: [], anzeige: '', farbe: '#66ff66', aktiv: true });
            filterInput.value = '';
            onlyActiveCb.checked = false;
            renderAusstattung();
        });
        popup.appendChild(btnNeuAusstattung);

        const btnResetAusstattung = document.createElement('button');
        btnResetAusstattung.textContent = 'Standard wiederherstellen';
        Object.assign(btnResetAusstattung.style, {
            cursor: 'pointer', padding: '6px 10px', border: 'none',
            borderRadius: '4px', backgroundColor: '#666', color: '#fff', marginTop: '8px'
        });
        btnResetAusstattung.addEventListener('click', () => {
            if (!confirm('Ausstattungs-Konfiguration auf Defaults zurücksetzen? Aktueller Stand wird vorher gesichert.')) return;
            speichereConfig(STORAGE_KEYS.backupPrefix + Date.now() + '_config', aktuelleAusstattungsKonfig);
            aktuelleAusstattungsKonfig = JSON.parse(JSON.stringify(suchKonfigurationenDefault));
            renderAusstattung();
        });
        popup.appendChild(btnResetAusstattung);

        // ===== B) Tech =====
        const techTitle = document.createElement('h3');
        techTitle.textContent = 'Technische Daten-Konfiguration';
        techTitle.style.borderBottom = '1px solid #444';
        techTitle.style.paddingBottom = '4px';
        techTitle.style.marginTop = '16px';
        popup.appendChild(techTitle);

        const techContainer = document.createElement('div');
        popup.appendChild(techContainer);

        function renderTechData() {
            techContainer.innerHTML = '';
            let draggedTechItemIndex = null;
            aktuelleTechKonfigurationen.forEach((item, index) => {
                const divItem = document.createElement('div');
                Object.assign(divItem.style, {
                    border: '1px solid #444', borderRadius: '6px',
                    padding: '10px', marginBottom: '8px', backgroundColor: '#3b3c42',
                    cursor: 'grab'
                });
                divItem.draggable = true;
                divItem.addEventListener('dragstart', e => {
                    draggedTechItemIndex = index;
                    e.dataTransfer.setData('text/plain', '');
                    e.dataTransfer.effectAllowed = 'move';
                });
                divItem.addEventListener('dragover', e => e.preventDefault());
                divItem.addEventListener('drop', e => {
                    e.preventDefault();
                    if (draggedTechItemIndex === null || draggedTechItemIndex === index) return;
                    const moved = aktuelleTechKonfigurationen[draggedTechItemIndex];
                    aktuelleTechKonfigurationen.splice(draggedTechItemIndex, 1);
                    const insertAt = draggedTechItemIndex < index ? index - 1 : index;
                    aktuelleTechKonfigurationen.splice(insertAt, 0, moved);
                    draggedTechItemIndex = null;
                    renderTechData();
                });

                const row = document.createElement('div');
                Object.assign(row.style, { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' });

                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.checked = item.aktiv === true;
                cb.addEventListener('change', () => { item.aktiv = cb.checked; });

                const lbl = document.createElement('label');
                lbl.textContent = 'aktiv';

                const input = document.createElement('input');
                input.type = 'text';
                input.value = item.begriff;
                input.placeholder = 'z.B. Fahrzeugzustand';
                Object.assign(input.style, { flex: '1', minWidth: '200px' });
                input.addEventListener('input', () => { item.begriff = input.value; });

                const btnDel = document.createElement('button');
                btnDel.textContent = 'Löschen';
                Object.assign(btnDel.style, {
                    cursor: 'pointer', padding: '4px 8px', border: 'none',
                    borderRadius: '4px', backgroundColor: '#a33', color: '#fff'
                });
                btnDel.addEventListener('click', () => {
                    aktuelleTechKonfigurationen.splice(index, 1);
                    renderTechData();
                });

                row.appendChild(cb);
                row.appendChild(lbl);
                row.appendChild(input);
                row.appendChild(btnDel);
                divItem.appendChild(row);
                techContainer.appendChild(divItem);
            });
        }
        renderTechData();

        const btnNeuTech = document.createElement('button');
        btnNeuTech.textContent = 'Neuen Tech-Parameter hinzufügen';
        Object.assign(btnNeuTech.style, {
            cursor: 'pointer', padding: '6px 10px', border: 'none',
            borderRadius: '4px', backgroundColor: '#4caf50', color: '#fff',
            marginTop: '8px', marginRight: '8px'
        });
        btnNeuTech.addEventListener('click', () => {
            aktuelleTechKonfigurationen.push({ begriff: '', aktiv: true });
            renderTechData();
        });
        popup.appendChild(btnNeuTech);

        const btnResetTech = document.createElement('button');
        btnResetTech.textContent = 'Standard wiederherstellen';
        Object.assign(btnResetTech.style, {
            cursor: 'pointer', padding: '6px 10px', border: 'none',
            borderRadius: '4px', backgroundColor: '#666', color: '#fff', marginTop: '8px'
        });
        btnResetTech.addEventListener('click', () => {
            if (!confirm('Tech-Konfiguration auf Defaults zurücksetzen? Aktueller Stand wird vorher gesichert.')) return;
            speichereConfig(STORAGE_KEYS.backupPrefix + Date.now() + '_techconfig', aktuelleTechKonfigurationen);
            aktuelleTechKonfigurationen = JSON.parse(JSON.stringify(techDataKonfigurationenDefault));
            renderTechData();
        });
        popup.appendChild(btnResetTech);

        // ===== C) Merge-Gruppen =====
        const mergeTitle = document.createElement('h3');
        mergeTitle.textContent = 'Merge-Gruppen Konfiguration';
        mergeTitle.style.borderBottom = '1px solid #444';
        mergeTitle.style.paddingBottom = '4px';
        mergeTitle.style.marginTop = '16px';
        popup.appendChild(mergeTitle);

        const mergeContainer = document.createElement('div');
        popup.appendChild(mergeContainer);

        function renderMergeConfig() {
            mergeContainer.innerHTML = '';
            aktuelleMergeGruppen.forEach((group, index) => {
                const divGroup = document.createElement('div');
                Object.assign(divGroup.style, {
                    border: '1px solid #444', borderRadius: '6px',
                    padding: '10px', marginBottom: '8px', backgroundColor: '#3b3c42',
                    display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap'
                });

                const inputBasis = document.createElement('input');
                inputBasis.type = 'text';
                inputBasis.value = group.basis || '';
                inputBasis.placeholder = 'Basis (z.B. außenspiegel)';
                inputBasis.style.width = '40%';
                inputBasis.addEventListener('input', () => { group.basis = inputBasis.value; });

                const inputOrder = document.createElement('input');
                inputOrder.type = 'text';
                inputOrder.value = (group.order || []).join(', ');
                inputOrder.placeholder = 'Reihenfolge, Komma-getrennt';
                inputOrder.style.flex = '1';
                inputOrder.addEventListener('input', () => {
                    group.order = inputOrder.value.split(',').map(s => s.trim()).filter(Boolean);
                });

                const btnDel = document.createElement('button');
                btnDel.textContent = 'Löschen';
                Object.assign(btnDel.style, {
                    cursor: 'pointer', padding: '4px 8px', border: 'none',
                    borderRadius: '4px', backgroundColor: '#a33', color: '#fff'
                });
                btnDel.addEventListener('click', () => {
                    aktuelleMergeGruppen.splice(index, 1);
                    renderMergeConfig();
                });

                divGroup.appendChild(inputBasis);
                divGroup.appendChild(inputOrder);
                divGroup.appendChild(btnDel);
                mergeContainer.appendChild(divGroup);
            });
        }
        renderMergeConfig();

        const btnNewMergeGroup = document.createElement('button');
        btnNewMergeGroup.textContent = 'Neue Merge-Gruppe hinzufügen';
        Object.assign(btnNewMergeGroup.style, {
            cursor: 'pointer', padding: '6px 10px', border: 'none',
            borderRadius: '4px', backgroundColor: '#4caf50', color: '#fff',
            marginTop: '8px', marginRight: '8px'
        });
        btnNewMergeGroup.addEventListener('click', () => {
            aktuelleMergeGruppen.push({ basis: '', order: [] });
            renderMergeConfig();
        });
        popup.appendChild(btnNewMergeGroup);

        const btnResetMerge = document.createElement('button');
        btnResetMerge.textContent = 'Standard wiederherstellen';
        Object.assign(btnResetMerge.style, {
            cursor: 'pointer', padding: '6px 10px', border: 'none',
            borderRadius: '4px', backgroundColor: '#666', color: '#fff', marginTop: '8px'
        });
        btnResetMerge.addEventListener('click', () => {
            if (!confirm('Merge-Gruppen auf Defaults zurücksetzen? Aktueller Stand wird vorher gesichert.')) return;
            speichereConfig(STORAGE_KEYS.backupPrefix + Date.now() + '_mergeGruppen', aktuelleMergeGruppen);
            aktuelleMergeGruppen = JSON.parse(JSON.stringify(mergeGruppenConfigDefault));
            renderMergeConfig();
        });
        popup.appendChild(btnResetMerge);

        // ===== D) Import / Export =====
        const ieTitle = document.createElement('h3');
        ieTitle.textContent = 'Import / Export';
        ieTitle.style.borderBottom = '1px solid #444';
        ieTitle.style.paddingBottom = '4px';
        ieTitle.style.marginTop = '16px';
        popup.appendChild(ieTitle);

        const ieContainer = document.createElement('div');
        popup.appendChild(ieContainer);

        const exportLabel = document.createElement('div');
        exportLabel.textContent = 'Aktuelle Konfiguration (Export-JSON):';
        exportLabel.style.marginTop = '8px';
        ieContainer.appendChild(exportLabel);

        const exportArea = document.createElement('textarea');
        Object.assign(exportArea.style, {
            width: '100%', height: '100px', marginTop: '4px',
            backgroundColor: '#3b3c42', color: '#fff'
        });
        exportArea.readOnly = true;
        ieContainer.appendChild(exportArea);

        const btnGenerateExport = document.createElement('button');
        btnGenerateExport.textContent = 'Export aktualisieren';
        Object.assign(btnGenerateExport.style, {
            cursor: 'pointer', padding: '6px 10px', border: 'none',
            borderRadius: '4px', backgroundColor: '#333', color: '#fff',
            marginTop: '4px', marginRight: '10px'
        });
        btnGenerateExport.addEventListener('click', () => {
            const obj = {
                __version: SCHEMA_VERSION,
                suchKonfigurationen: aktuelleAusstattungsKonfig,
                techDataKonfigurationen: aktuelleTechKonfigurationen,
                mergeGruppenConfig: aktuelleMergeGruppen
            };
            exportArea.value = JSON.stringify(obj, null, 2);
        });
        ieContainer.appendChild(btnGenerateExport);

        const btnCopyExport = document.createElement('button');
        btnCopyExport.textContent = 'In Zwischenablage kopieren';
        Object.assign(btnCopyExport.style, {
            cursor: 'pointer', padding: '6px 10px', border: 'none',
            borderRadius: '4px', backgroundColor: '#555', color: '#fff', marginTop: '4px'
        });
        btnCopyExport.addEventListener('click', async () => {
            const text = exportArea.value || '';
            try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(text);
                } else {
                    exportArea.select();
                    document.execCommand('copy');
                }
                btnCopyExport.textContent = 'Kopiert!';
                setTimeout(() => { btnCopyExport.textContent = 'In Zwischenablage kopieren'; }, 1200);
            } catch (e) {
                console.warn('Clipboard-Fehler:', e);
                exportArea.select();
                try { document.execCommand('copy'); } catch (_) {}
            }
        });
        ieContainer.appendChild(btnCopyExport);

        const importLabel = document.createElement('div');
        importLabel.textContent = 'Konfiguration importieren (füge JSON hier ein):';
        importLabel.style.marginTop = '12px';
        ieContainer.appendChild(importLabel);

        const importArea = document.createElement('textarea');
        Object.assign(importArea.style, {
            width: '100%', height: '100px', marginTop: '4px',
            backgroundColor: '#3b3c42', color: '#fff'
        });
        ieContainer.appendChild(importArea);

        const btnImport = document.createElement('button');
        btnImport.textContent = 'Import durchführen';
        Object.assign(btnImport.style, {
            cursor: 'pointer', padding: '6px 10px', border: 'none',
            borderRadius: '4px', backgroundColor: '#333', color: '#fff', marginTop: '4px'
        });
        btnImport.addEventListener('click', () => {
            const text = importArea.value.trim();
            if (!text) return;
            try {
                const obj = JSON.parse(text);
                // Backup vorher
                const ts = Date.now();
                speichereConfig(STORAGE_KEYS.backupPrefix + ts + '_config',      aktuelleAusstattungsKonfig);
                speichereConfig(STORAGE_KEYS.backupPrefix + ts + '_techconfig',  aktuelleTechKonfigurationen);
                speichereConfig(STORAGE_KEYS.backupPrefix + ts + '_mergeGruppen', aktuelleMergeGruppen);

                if (Array.isArray(obj.suchKonfigurationen))     aktuelleAusstattungsKonfig    = obj.suchKonfigurationen;
                if (Array.isArray(obj.techDataKonfigurationen)) aktuelleTechKonfigurationen   = obj.techDataKonfigurationen;
                if (Array.isArray(obj.mergeGruppenConfig))      aktuelleMergeGruppen          = obj.mergeGruppenConfig;
                renderAusstattung();
                renderTechData();
                renderMergeConfig();
                alert('Import erfolgreich. Bitte ggf. noch "Speichern" klicken.\nBackup wurde erstellt mit Timestamp ' + ts);
            } catch (e) {
                alert('Fehler beim Import. Ungültiges JSON?\n' + e);
            }
        });
        ieContainer.appendChild(btnImport);

        // ===== E) Validierung-Anzeige =====
        const validationBar = document.createElement('div');
        validationBar.style.marginTop = '12px';
        validationBar.style.fontSize = '12px';
        validationBar.style.color = '#ffae42';
        popup.appendChild(validationBar);

        function validate() {
            const issues = [];
            const seenAnzeige = new Map();
            aktuelleAusstattungsKonfig.forEach((item, idx) => {
                if (!item.anzeige || !item.anzeige.trim()) issues.push(`Eintrag #${idx + 1}: leerer Anzeigetext.`);
                if (!Array.isArray(item.begriffe) || item.begriffe.length === 0) issues.push(`"${item.anzeige || '(leer)'}": keine Begriffe.`);
                const key = (item.anzeige || '').trim().toLowerCase();
                if (key) {
                    if (seenAnzeige.has(key)) issues.push(`Doppelte Anzeige: "${item.anzeige}"`);
                    else seenAnzeige.set(key, idx);
                }
            });
            return issues;
        }

        // ===== F) Save/Cancel =====
        const buttonBar = document.createElement('div');
        buttonBar.style.textAlign = 'right';
        buttonBar.style.marginTop = '20px';

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Abbrechen';
        Object.assign(cancelBtn.style, {
            cursor: 'pointer', padding: '6px 10px', border: 'none',
            borderRadius: '4px', backgroundColor: '#555', color: '#fff', marginRight: '10px'
        });
        cancelBtn.addEventListener('click', removeOverlay);

        const saveBtn = document.createElement('button');
        saveBtn.textContent = 'Speichern';
        Object.assign(saveBtn.style, {
            cursor: 'pointer', padding: '6px 10px', border: 'none',
            borderRadius: '4px', backgroundColor: '#2196F3', color: '#fff'
        });
        saveBtn.addEventListener('click', () => {
            const issues = validate();
            if (issues.length > 0) {
                if (!confirm('Es gibt Hinweise:\n\n' + issues.slice(0, 8).join('\n') + (issues.length > 8 ? `\n…und ${issues.length - 8} weitere` : '') + '\n\nTrotzdem speichern?')) {
                    validationBar.textContent = issues.join(' • ');
                    return;
                }
            }
            aktuelleAusstattungsKonfig.sort((a, b) => (a.anzeige || '').trim().localeCompare((b.anzeige || '').trim()));
            aktuelleMergeGruppen.sort((a, b) => (a.basis || '').localeCompare(b.basis || ''));

            speichereConfig(STORAGE_KEYS.config, aktuelleAusstattungsKonfig);
            speichereConfig(STORAGE_KEYS.techConfig, aktuelleTechKonfigurationen);
            speichereConfig(STORAGE_KEYS.mergeGroups, aktuelleMergeGruppen);
            speichereConfig(STORAGE_KEYS.version, SCHEMA_VERSION);

            suchKonfigurationen = aktuelleAusstattungsKonfig;
            techDataKonfigurationen = aktuelleTechKonfigurationen;
            mergeGruppenConfig = aktuelleMergeGruppen;

            removeOverlay();
            clearResults();
            trigger();
        });

        buttonBar.appendChild(cancelBtn);
        buttonBar.appendChild(saveBtn);
        popup.appendChild(buttonBar);

        overlay.appendChild(popup);
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            popup.style.opacity = '1';
        });
    }

    // ============================================================
    // 12) Konfig-Button & Tampermonkey-Menü
    // ============================================================
    function erstelleKonfigButton() {
        if (document.querySelector('#mobilede-config-btn')) return;
        const targetDiv = document.querySelector('.Va7Gr')
            || document.querySelector("article[data-testid='vip-key-features-box']");
        if (!targetDiv) return;
        const button = document.createElement('button');
        button.id = 'mobilede-config-btn';
        button.innerText = 'Konfiguration';
        Object.assign(button.style, {
            cursor: 'pointer', padding: '8px 12px', border: 'none',
            borderRadius: '4px', background: '#333', color: '#fff',
            fontFamily: 'Arial, sans-serif',
            boxShadow: '0px 2px 5px rgba(0,0,0,0.3)'
        });
        button.addEventListener('click', oeffneKonfigPopup);
        targetDiv.appendChild(button);
    }
    setTimeout(erstelleKonfigButton, 3000);

    if (typeof GM_registerMenuCommand === 'function') {
        try {
            GM_registerMenuCommand('Mobile.de Ausstattungssuche – Konfiguration', oeffneKonfigPopup);
        } catch (e) { /* ignore */ }
    }
})();
