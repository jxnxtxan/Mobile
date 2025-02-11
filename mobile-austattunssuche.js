// ==UserScript==
// @name         Mobile.de Ausstattungssuche mit modernem Popup & Import/Export
// @namespace    http://tampermonkey.net/
// @version      1.1.2
// @description  Sucht bestimmte Ausstattungen & Technische Daten auf mobile.de
// @match        https://suchen.mobile.de/fahrzeuge/details.html*
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==   

(function() {
    'use strict';

    // ***********************************************************************
    // *** 1) Hilfsfunktionen zum Speichern/Laden (GM_getValue / GM_setValue)
    // ***********************************************************************
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

    // ***********************************************************************
    // *** 2) Standard-Konfig (Fallback), falls nichts in GM_getValue ********
    // ***********************************************************************
    let suchKonfigurationenDefault = [
        { begriffe: ['4wd', 'allrad'], anzeige: 'Allrad', farbe: 'orange', aktiv: true },
        { begriffe: ['quattro'], anzeige: 'Quattro / Allrad', farbe: 'orange', aktiv: true },
        { begriffe: ['Ambiente-Beleuchtung', 'ambiente beleuchtung'], anzeige: 'Ambiente-Beleuchtung', aktiv: false },
        { begriffe: ['scheiben abgedunk', 'abgedunk scheib'], anzeige: 'Abgedunkelte Scheiben', aktiv: true },
        { begriffe: ['akustik glas', 'frontscheibe akus'], anzeige: 'Akustikverglasung', aktiv: true },
        { begriffe: ['seitenscheibe akus', 'Türscheiben akus'], anzeige: 'Seitenscheiben Akustikverglasung', aktiv: true },
        { begriffe: ['adapt kurv licht', 'kurvenlicht adaptiv'], anzeige: 'Adaptives Kurvenlicht', aktiv: false },
        { begriffe: ['tempomat abstand', 'adapt temp', 'acc'], anzeige: 'Abstandstempomat', farbe: 'orange', aktiv: true },
        { begriffe: ['abstands warn', 'distance warn'], anzeige: 'Abstandswarner', aktiv: false },
        { begriffe: ['ambiente licht', 'stimmungslicht'], anzeige: 'Ambiente-Beleuchtung', aktiv: true },
        { begriffe: ['Anhängevorrichtung', 'Anhängerkupplung', 'Anhaengerkupplung', 'Anhaengevorrichtung', 'ahk'], anzeige: 'Anhängerkupplung', farbe: 'red', aktiv: true },
        { begriffe: ['Anhängevorrichtung schwenkbar', 'Anhaengevorrichtung schwenkbar', 'Anhängerkupplung schwenkbar', 'Anhaengerkupplung schwenkbar'], anzeige: 'Anhängerkupplung schwenkbar', aktiv: true },
        { begriffe: ['armlehne', 'lehne'], anzeige: 'Armlehne', aktiv: false },
        { begriffe: ['apple carplay'], anzeige: 'Apple Carplay', aktiv: true },
        { begriffe: ['android auto'], anzeige: 'Android Auto', aktiv: true },
        { begriffe: ['außenspiegel elek verst', 'elek spiegel'], anzeige: 'Außenspiegel elektr. verstellbar', aktiv: true },
        { begriffe: ['außenspiegel heiz'], anzeige: 'Außenspiegel beheizbar', aktiv: true },
        { begriffe: ['Bang & Olufsen', 'b&o', 'Bang Olufsen'], anzeige: 'Bang & Olufsen Sound System', farbe: 'red', aktiv: true },
        { begriffe: ['Beats'], anzeige: 'Beats Sound System', farbe: 'red', aktiv: true },
        { begriffe: ['blendfrei fernlicht', 'anti blend licht', 'fernlicht assist', 'auto fernlicht'], anzeige: 'Fernlicht Assistent', farbe: 'orange', aktiv: true },
        { begriffe: ['brems assist', 'brake assist'], anzeige: 'Bremsassistent', aktiv: true },
        { begriffe: ['Business-Paket Professional', 'busin', 'Business', 'Busin paket profess'], anzeige: 'Business Paket', aktiv: true },
        { begriffe: ['Burmester', 'burme'], anzeige: 'Burmester Sound System', farbe: 'red', aktiv: true },
        { begriffe: ['canton'], anzeige: 'Canton Sound System', farbe: 'red', aktiv: true },
        { begriffe: ['dachhimmel anth', 'himmel anth', 'Dachhimmel schwarz', 'Dachhimmel Stoff schwarz', 'dachhim schwarz'], anzeige: 'Dachhimmel Anthrazit / Schwarz', aktiv: true },
        { begriffe: ['dachhimmel alcantara', 'himmel alcant'], anzeige: 'Dachhimmel Alcantara', aktiv: true },
        { begriffe: ['elek fenst'], anzeige: 'Elektr. Fensterheber', aktiv: false },
        { begriffe: ['elek heckklappe'], anzeige: 'Elektr. Heckklappe', aktiv: false },
        { begriffe: ['sitz elek verstell'], anzeige: 'Elektr. Sitzeinstellung', aktiv: true },
        { begriffe: ['memory sitz', 'sitz memory', 'sitz elek verstell memory'], anzeige: 'Elektr. Sitzeinstellung mit Memory-Funktion', farbe: 'red', aktiv: true },
        { begriffe: ['garantie'], anzeige: 'Garantie', aktiv: false },
        { begriffe: ['head up', 'HUD', 'head'], anzeige: 'Head-Up Display', farbe: 'red', aktiv: true },
        { begriffe: ['heckantrieb', 'antrieb heck'], anzeige: 'Heckantrieb', aktiv: false },
        { begriffe: ['harman kardon', 'h&k', 'harman', 'kardon'], anzeige: 'Harman Kardon Sound System', farbe: 'red', aktiv: true },
        { begriffe: ['induktiv laden', 'wireless charge'], anzeige: 'Induktionsladeschale für Smartphone (Wireless Charging)', aktiv: false },
        { begriffe: ['innenspiegel abblend', 'inne spiegel auto'], anzeige: 'Innenspiegel autom. abblendend', aktiv: true },
        { begriffe: ['lenkradheizung', 'Beheizbares Lenkrad', 'lenk heiz'], anzeige: 'Lenkradheizung', aktiv: true },
        { begriffe: ['matrix led', 'matrix scheinwerfer', 'matrix beam', 'matrix licht'], anzeige: 'Matrix Scheinwerfer', farbe: 'red', aktiv: true },
        { begriffe: ['panorama', 'panoramadach', 'glas dach'], anzeige: 'Panoramadach', farbe: 'orange', aktiv: true },
        { begriffe: ['park assist', 'park hilfe'], anzeige: 'Parkassistent', aktiv: true },
        { begriffe: ['pdc', 'park dist contr'], anzeige: 'Park-Distance-Control', aktiv: true },
        { begriffe: ['reifen druck', 'druck kontrolle'], anzeige: 'Reifendruck Kontrollsystem', aktiv: true },
        { begriffe: ['Rückfahrkamera', 'Rückfahrkamerasystem', 'Rueckfahrkamera'], anzeige: 'Rückfahrkamera', aktiv: true },
        { begriffe: ['seiten airbag', 'airbag seite'], anzeige: 'Seitenairbag', aktiv: false },
        { begriffe: ['spiegel klappbar', 'elek spiegel klapp'], anzeige: 'Seitenspiegel anklappbar', aktiv: true },
        { begriffe: ['scheckheft gepflegt', 'scheckheft'], anzeige: 'Scheckheftgepflegt', farbe: 'red', aktiv: true },
        { begriffe: ['keyless', 'schlüssel frei', 'schlüssellose zentral'], anzeige: 'Schlüssellose Zentralverriegelung (Keyless)', farbe: 'orange', aktiv: true },
        { begriffe: ['Servoschließung tür', 'soft close', 'softclose'], verboten: ['pedal', 'virtuell'], anzeige: 'Softclose', aktiv: true },
        { begriffe: ['Sonnenschutzverglasung'], anzeige: 'Sonnenschutzverglasung', aktiv: true },
        { begriffe: ['Sonnenschutzverglasung abgedunkelt'], anzeige: 'Sonnenschutzverglasung abgedunkelt', aktiv: true },
        { begriffe: ['spurhalte assist', 'lane assist'], anzeige: 'Spurhalteassistent', aktiv: true },
        { begriffe: ['Standheizung', 'standhei'], anzeige: 'Standheizung', aktiv: true },
        { begriffe: ['standbelüf'], anzeige: 'Standbelüftung', aktiv: true },
        { begriffe: ['start stop', 'auto stop'], anzeige: 'Start/Stopp-Automatik', aktiv: false },
        { begriffe: ['sitz heiz', 'heizung sitz'], anzeige: 'Sitzheizung', farbe: 'orange', aktiv: true },
        { begriffe: ['sitz belüft', 'sitz kühl'], anzeige: 'Sitzbelüftung', farbe: 'red', aktiv: true },
        { begriffe: ['totwinkel', 'blind spot'], anzeige: 'Totwinkel-Assistent', aktiv: true },
        { begriffe: ['traction control', 'traktio kontr'], anzeige: 'Traktionskontrolle', aktiv: false },
        { begriffe: ['360 grad', '360 kamera', '360 cam', 'umfeld kamera', 'surround cam'], anzeige: '360 Grad Kamera', farbe: 'red', aktiv: true },
        { begriffe: ['verkehrszeichen', 'road sign'], anzeige: 'Verkehrszeichenerkennung', aktiv: true },
        { begriffe: ['digital cockpit', 'digi kombi'], anzeige: 'Volldigitales Kombiinstrument', aktiv: true },
        { begriffe: ['winter paket', 'kalt paket'], anzeige: 'Winterpaket', aktiv: true },
        { begriffe: ['zentral verriegelung', 'central lock', 'Zentralverriegelung'], anzeige: 'Zentralverriegelung', aktiv: true },
    ];
    let techDataKonfigurationenDefault = [
        { begriff: 'Fahrzeugzustand', aktiv: true },
        { begriff: 'Erstzulassung', aktiv: true },
        { begriff: 'Innenausstattung', aktiv: true },
        { begriff: 'Farbe (Hersteller)', aktiv: true },
        { begriff: 'Farbe', aktiv: true },
    ];

    // ***********************************************************************
    // *** 3) Aktuelle Konfigurationen laden *********************************
    // ***********************************************************************
    let suchKonfigurationen = ladeConfig('mobilede_config');
    if (!suchKonfigurationen) {
        suchKonfigurationen = suchKonfigurationenDefault;
    }

    let techDataKonfigurationen = ladeConfig('mobilede_techconfig');
    if (!techDataKonfigurationen) {
        techDataKonfigurationen = techDataKonfigurationenDefault;
    }

    // ***********************************************************************
    // *** 4) DOM-Auswahl & Textaufbereitung *********************************
    // ***********************************************************************
    const ausstattungsListe = document.querySelectorAll("ul[data-testid='vip-features-list'] li");
    const beschreibungsBereich = document.querySelector("div[data-testid='vip-vehicle-description-text']");
    const zusatzBereich = document.querySelector("div.GOIOV.fqe3L.EevEz");
    const techDataBereich = document.querySelector("article[data-testid='vip-technical-data-box'] dl.XCaEv");

    // --- Hilfsfunktion, um typografische Striche & Co. zu normalisieren
    function cleanText(text) {
        return text
            // Typische Striche (Halbgeviert, Geviert, ASCII-Bindestrich) in Leerzeichen umwandeln
            .replace(/[–—\-]+/g, ' ')
            // Zeilenumbrüche, Tabs -> Leerzeichen
            .replace(/[\n\r\t]+/g, ' ')
            // Mehrfache Leerzeichen reduzieren
            .replace(/\s{2,}/g, ' ')
            // CamelCase ggf. auftrennen
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .trim()
            .toLowerCase();
    }

    function getGesamtText() {
        let textParts = [];

        ausstattungsListe.forEach(li => {
            let txt = li.textContent.trim();
            if (txt) {
                txt = cleanText(txt);
                textParts.push(txt);
            }
        });

        if (beschreibungsBereich) {
            let txt = beschreibungsBereich.textContent.replace(/,/g, ' ').trim();
            if (txt) {
                txt = cleanText(txt);
                textParts.push(txt);
            }
        }

        if (zusatzBereich) {
            let txt = zusatzBereich.textContent.trim();
            if (txt) {
                txt = cleanText(txt);
                textParts.push(txt);
            }
        }

        // Debug-Ausgabe
        console.log("Bereinigter Gesamter Text:", textParts.join(' | '));
        return textParts;
    }

    // ***********************************************************************
    // *** NEU: Hilfsfunktion, um x Wörter (1..4) mit max. 30 Zeichen Distanz
    // *** in beliebiger Reihenfolge in einer Zeile zu erkennen.
    // ***********************************************************************
    function allWordsWithinDistance(line, words, distance = 30) {
        // Finde alle Vorkommen jedes Wortes:
        // positions[i] = Liste der Fundstellen für words[i].
        let positions = [];
        for (let w of words) {
            const posList = [];
            let startIndex = 0;
            while (true) {
                let idx = line.indexOf(w, startIndex);
                if (idx === -1) break;
                posList.push(idx);
                startIndex = idx + 1;
            }
            // Falls ein Wort gar nicht in der Zeile vorkommt:
            if (posList.length === 0) {
                return false;
            }
            positions.push(posList);
        }

        // Bei nur 1 Wort reicht es, dass wir es gefunden haben:
        if (words.length === 1) {
            return positions[0].length > 0; // schon oben geprüft, also true
        }

        // Für 2+ Wörter müssen wir schauen, ob es eine Kombination der Fundstellen gibt,
        // bei der die minimale und maximale Position innerhalb "distance" liegen.
        //
        // Wir erzeugen das kartesische Produkt aller Listen => jede mögliche Kombination
        // (Achtung: für 4 Wörter kann das größer werden, aber noch überschaubar).
        function cartesian(arr) {
            return arr.reduce((acc, val) => {
                let res = [];
                acc.forEach(a => {
                    val.forEach(b => {
                        res.push(a.concat(b));
                    });
                });
                return res;
            }, [[]]);
        }

        const combos = cartesian(positions);

        // Prüfe jede Kombination
        for (let combo of combos) {
            const minPos = Math.min(...combo);
            const maxPos = Math.max(...combo);
            if (maxPos - minPos <= distance) {
                return true;
            }
        }
        return false;
    }

    // ***********************************************************************
    // *** 5) Suche nach Begriffen *******************************************
    // ***********************************************************************
    function sucheBegriffe() {
        const gefundene = [];
        const textZeilen = getGesamtText();

        // Wir gehen jede Konfiguration durch
        suchKonfigurationen.forEach(cfg => {
            if (!cfg.aktiv) return;
            let gefunden = false;

            // Wir durchlaufen jede "Zeile" (also jeden Array-Eintrag)
            for (let zeile of textZeilen) {
                // zeile ist bereits "cleanText"
                const zeileLower = zeile;

                // Probiere alle hinterlegten begriffe
                for (let begriff of (cfg.begriffe || [])) {
                    const begriffLower = begriff.toLowerCase().trim();
                    // Split in Teilwörter
                    const teilbegriffe = begriffLower.split(/\s+/).filter(x => x);

                    if (teilbegriffe.length === 0) {
                        continue;
                    }

                    // Prüfe, ob alle (1..n) Teilbegriffe innerhalb distance liegen
                    if (allWordsWithinDistance(zeileLower, teilbegriffe, 30)) {
                        // Ggf. "verbotene" Wörter prüfen?
                        if (cfg.verboten && Array.isArray(cfg.verboten)) {
                            // Falls in dem Zeilen-Text ein "verbotenes" Vorkommt => ignorieren
                            let ignorieren = false;
                            for (let v of cfg.verboten) {
                                if (zeileLower.includes(v.toLowerCase())) {
                                    ignorieren = true;
                                    break;
                                }
                            }
                            if (ignorieren) {
                                continue; // dieses Treffer ignorieren
                            }
                        }

                        // Gefunden
                        gefundene.push({ anzeige: cfg.anzeige, farbe: (cfg.farbe || '#66ff66').toLowerCase() });
                        gefunden = true;
                        break;
                    }
                }
                if (gefunden) break;
            }
        });

        // Duplikate filtern, sortieren
        const uniqueMap = new Map();
        gefundene.forEach(obj => uniqueMap.set(obj.anzeige, obj));
        const uniqueGefundene = [...uniqueMap.values()];
        uniqueGefundene.sort((a, b) => a.anzeige.localeCompare(b.anzeige));
        console.log("Gefundene Stichwörter:", uniqueGefundene.map(item => item.anzeige));
        return uniqueGefundene;
    }

    // ***********************************************************************
    // *** 6) Suche nach Technischen Daten ***********************************
    // ***********************************************************************
    function sucheTechnischeDaten() {
        if (!techDataBereich) return [];
        const daten = [];
        const dtElements = techDataBereich.querySelectorAll("dt");

        techDataKonfigurationen.forEach(cfg => {
            if (!cfg.aktiv) return;
            for (let dt of dtElements) {
                const dtText = dt.textContent.trim();
                if (dtText.toLowerCase() === cfg.begriff.toLowerCase()) {
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
        techArticle.className = 'A3G6X lAeeF vTKPY HaBLt ku0Os';
        techArticle.style.marginBottom = "10px";

        const techContainer = document.createElement('div');
        techContainer.style.border = "1px solid #8a2be2";
        techContainer.style.padding = "10px";
        techContainer.style.backgroundColor = "#1e1f24";
        techContainer.style.color = "white";
        techContainer.style.width = "100%";
        techContainer.style.textAlign = "left";
        techContainer.style.boxShadow = "0px 2px 4px rgba(0, 0, 0, 0.1)";
        techContainer.style.fontSize = "14px";
        techContainer.style.lineHeight = "1.5";
        techContainer.style.display = "block";

        const title = document.createElement('div');
        title.textContent = "Technische Daten:";
        title.style.color = "white";
        title.style.marginBottom = "5px";
        techContainer.appendChild(title);

        const table = document.createElement('table');
        table.style.width = "100%";
        table.style.borderCollapse = "collapse";

        technischeDaten.forEach(d => {
            const tr = document.createElement('tr');
            const tdKey = document.createElement('td');
            tdKey.textContent = d.title + ":";
            tdKey.style.color = "white";
            tdKey.style.paddingRight = "20px";
            tdKey.style.whiteSpace = "nowrap";
            tdKey.style.verticalAlign = "top";

            const tdValue = document.createElement('td');
            tdValue.textContent = d.value;
            tdValue.style.color = "white";
            tdValue.style.width = "100%";
            tdValue.style.verticalAlign = "top";

            tr.appendChild(tdKey);
            tr.appendChild(tdValue);
            table.appendChild(tr);
        });

        techContainer.appendChild(table);
        techArticle.appendChild(techContainer);

        parentElement.parentNode.insertBefore(techArticle, parentElement);
    }

    // ***********************************************************************
    // *** 7) Ergebnisse zusammenfassen **************************************
    // ***********************************************************************
    function ergebnisHinzufuegen() {
        const gefundeneTexte = sucheBegriffe();

        const zielBereich = document.querySelector("article[data-testid='vip-key-features-box']");
        if (!zielBereich) return;

        // Falls schon erstellt, nicht noch mal
        if (document.querySelector("#ergebnisBereich")) {
            return;
        }

        const article = document.createElement('article');
        article.className = 'A3G6X lAeeF vTKPY HaBLt ku0Os';

        const ergebnisBereich = document.createElement('div');
        ergebnisBereich.id = "ergebnisBereich";
        ergebnisBereich.style.border = "1px solid #8a2be2";
        ergebnisBereich.style.padding = "10px";
        ergebnisBereich.style.marginTop = "10px";
        ergebnisBereich.style.backgroundColor = "#1e1f24";
        ergebnisBereich.style.color = "white";
        ergebnisBereich.style.width = "100%";
        ergebnisBereich.style.textAlign = "left";
        ergebnisBereich.style.boxShadow = "0px 2px 4px rgba(0, 0, 0, 0.1)";
        ergebnisBereich.style.fontSize = "14px";
        ergebnisBereich.style.lineHeight = "1.5";
        ergebnisBereich.style.display = "flex";
        ergebnisBereich.style.flexWrap = "wrap";
        article.appendChild(ergebnisBereich);

        const title = document.createElement('div');
        title.style.color = "white";
        title.style.marginBottom = "5px";
        title.style.width = '100%';
        title.textContent = 'Gefundene Begriffe:';
        ergebnisBereich.appendChild(title);

        if (gefundeneTexte.length > 0) {
            gefundeneTexte.forEach(item => {
                const textElement = document.createElement('div');
                textElement.textContent = `- ${item.anzeige}`;
                textElement.style.color = item.farbe;
                textElement.style.width = '50%';
                ergebnisBereich.appendChild(textElement);
            });
        } else {
            const keineTexte = document.createElement('div');
            keineTexte.textContent = "Keine der gesuchten Begriffe gefunden.";
            keineTexte.style.color = "white";
            ergebnisBereich.appendChild(keineTexte);
        }

        zielBereich.parentNode.insertBefore(article, zielBereich.nextSibling);
        technischeDatenHinzufuegen(article);
    }

    // MutationObserver, um Dynamik abzufangen
    const observer = new MutationObserver(() => {
        if (!document.querySelector("#ergebnisBereich")) {
            setTimeout(ergebnisHinzufuegen, 1000);
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Initialer Aufruf nach Seitenaufbau
    setTimeout(ergebnisHinzufuegen, 2000);

    // ***********************************************************************
    // *** 8) Popup-Fenster mit Import/Export ********************************
    // ***********************************************************************
    function oeffneKonfigPopup() {
        // Kopien anlegen (damit wir erst bei "Speichern" wirklich übernehmen)
        let aktuelleAusstattungsKonfig = JSON.parse(JSON.stringify(suchKonfigurationen));
        let aktuelleTechKonfig = JSON.parse(JSON.stringify(techDataKonfigurationen));

        // Overlay
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.zIndex = '999999';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.3s ease';
        document.body.appendChild(overlay);

        // ESC schließen - Event-Listener
        function escListener(e) {
            if (e.key === 'Escape') {
                // entspricht "Abbrechen"
                removeOverlay();
            }
        }
        document.addEventListener('keydown', escListener);
    
        function removeOverlay() {
            // Overlay und ESC-Listener entfernen => "Abbrechen"
            document.removeEventListener('keydown', escListener);
            overlay.remove();
        }

        // Popup
        const popup = document.createElement('div');
        popup.style.position = 'absolute';
        popup.style.top = '50%';
        popup.style.left = '50%';
        popup.style.transform = 'translate(-50%, -50%)';
        popup.style.zIndex = '2147483647';
        popup.style.width = '80%';
        popup.style.maxWidth = '900px';
        popup.style.maxHeight = '80%';
        popup.style.overflowY = 'auto';
        popup.style.backgroundColor = '#2e2f35';
        popup.style.color = '#fff';
        popup.style.borderRadius = '10px';
        popup.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.6)';
        popup.style.border = 'none';
        popup.style.padding = '20px';
        popup.style.fontFamily = 'Arial, sans-serif';
        popup.style.opacity = '0'; // fade-in
        popup.style.transition = 'opacity 0.3s ease';

        // Titel
        const title = document.createElement('h2');
        title.textContent = 'Konfiguration';
        title.style.marginTop = '0';
        title.style.fontWeight = 'normal';
        popup.appendChild(title);

        // -------------------------------
        // A) AUSSTATTUNG EDITIEREN
        // -------------------------------
        const ausstattungTitle = document.createElement('h3');
        ausstattungTitle.textContent = 'Ausstattungs-Konfiguration';
        ausstattungTitle.style.borderBottom = '1px solid #444';
        ausstattungTitle.style.paddingBottom = '4px';
        ausstattungTitle.style.marginTop = '16px';
        popup.appendChild(ausstattungTitle);

        const ausstattungContainer = document.createElement('div');
        popup.appendChild(ausstattungContainer);

        function renderAusstattung() {

            // Erst nach "anzeige" sortieren (A-Z)
            aktuelleAusstattungsKonfig.sort((a, b) => {
                return (a.anzeige || '').localeCompare(b.anzeige || '');
            });

            ausstattungContainer.innerHTML = '';
            aktuelleAusstattungsKonfig.forEach((item, index) => {
                const divItem = document.createElement('div');
                divItem.style.border = '1px solid #444';
                divItem.style.borderRadius = '6px';
                divItem.style.padding = '10px';
                divItem.style.marginBottom = '8px';
                divItem.style.backgroundColor = '#3b3c42';

                const row1 = document.createElement('div');
                row1.style.display = 'flex';
                row1.style.flexWrap = 'wrap';
                row1.style.alignItems = 'center';

                // aktiv
                const checkAktiv = document.createElement('input');
                checkAktiv.style.marginRight = '5px';
                checkAktiv.type = 'checkbox';
                checkAktiv.checked = item.aktiv === true;
                checkAktiv.addEventListener('change', () => {
                    item.aktiv = checkAktiv.checked;
                });

                const lblAktiv = document.createElement('label');
                lblAktiv.textContent = ' aktiv';
                lblAktiv.style.marginRight = '10px';

                // anzeige
                const inputAnzeige = document.createElement('input');
                inputAnzeige.type = 'text';
                inputAnzeige.value = item.anzeige;
                inputAnzeige.placeholder = 'Anzeigetext';
                inputAnzeige.style.flex = '1';
                inputAnzeige.style.minWidth = '150px';
                inputAnzeige.style.marginRight = '10px';
                inputAnzeige.addEventListener('input', () => {
                    item.anzeige = inputAnzeige.value;
                });

                // farbe
                const inputFarbe = document.createElement('input');
                inputFarbe.type = 'text';
                inputFarbe.value = item.farbe || '';
                inputFarbe.placeholder = '#66ff66';
                inputFarbe.style.marginRight = '10px';
                inputFarbe.style.width = '100px';
                inputFarbe.addEventListener('input', () => {
                    item.farbe = inputFarbe.value;
                });

                // löschen
                const btnLoeschen = document.createElement('button');
                btnLoeschen.textContent = 'Löschen';
                btnLoeschen.style.cursor = 'pointer';
                btnLoeschen.style.padding = '4px 8px';
                btnLoeschen.style.marginTop = '4px';
                btnLoeschen.style.border = 'none';
                btnLoeschen.style.borderRadius = '4px';
                btnLoeschen.style.backgroundColor = '#a33';
                btnLoeschen.style.color = '#fff';
                btnLoeschen.addEventListener('click', () => {
                    aktuelleAusstattungsKonfig.splice(index, 1);
                    renderAusstattung();
                });

                row1.appendChild(checkAktiv);
                row1.appendChild(lblAktiv);
                row1.appendChild(inputAnzeige);
                row1.appendChild(inputFarbe);
                row1.appendChild(btnLoeschen);

                // begriffe
                const txtBegriffe = document.createElement('textarea');
                txtBegriffe.value = (item.begriffe || []).join(', ');
                txtBegriffe.style.width = '100%';
                txtBegriffe.style.height = '40px';
                txtBegriffe.style.marginTop = '6px';
                txtBegriffe.placeholder = 'Suchbegriffe, Komma-getrennt (z.B. "elek sitz, elek verstell sitz heiz")';
                txtBegriffe.addEventListener('input', () => {
                    item.begriffe = txtBegriffe.value
                        .split(',')
                        .map(s => s.trim())
                        .filter(s => s.length > 0);
                });

                divItem.appendChild(row1);
                divItem.appendChild(txtBegriffe);
                ausstattungContainer.appendChild(divItem);
            });
        }
        renderAusstattung();

        const btnNeuAusstattung = document.createElement('button');
        btnNeuAusstattung.textContent = 'Neuen Ausstattungseintrag hinzufügen';
        btnNeuAusstattung.style.cursor = 'pointer';
        btnNeuAusstattung.style.padding = '6px 10px';
        btnNeuAusstattung.style.border = 'none';
        btnNeuAusstattung.style.borderRadius = '4px';
        btnNeuAusstattung.style.backgroundColor = '#4caf50';
        btnNeuAusstattung.style.color = '#fff';
        btnNeuAusstattung.style.marginTop = '8px';
        btnNeuAusstattung.addEventListener('click', () => {
            aktuelleAusstattungsKonfig.push({
                begriffe: [],
                anzeige: '',
                farbe: '#66ff66',
                aktiv: true
            });
            renderAusstattung();
        });
        popup.appendChild(btnNeuAusstattung);

        // -------------------------------
        // B) TECHNISCHE DATEN EDITIEREN
        // -------------------------------
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
            aktuelleTechKonfig.forEach((item, index) => {
                const divItem = document.createElement('div');
                divItem.style.border = '1px solid #444';
                divItem.style.borderRadius = '6px';
                divItem.style.padding = '10px';
                divItem.style.marginBottom = '8px';
                divItem.style.backgroundColor = '#3b3c42';

                const row1 = document.createElement('div');
                row1.style.display = 'flex';
                row1.style.flexWrap = 'wrap';
                row1.style.alignItems = 'center';

                const checkAktiv = document.createElement('input');
                checkAktiv.style.marginRight = '5px';
                checkAktiv.type = 'checkbox';
                checkAktiv.checked = item.aktiv === true;
                checkAktiv.addEventListener('change', () => {
                    item.aktiv = checkAktiv.checked;
                });

                const lblAktiv = document.createElement('label');
                lblAktiv.textContent = ' aktiv';
                lblAktiv.style.marginRight = '10px';

                const inputBegriff = document.createElement('input');
                inputBegriff.type = 'text';
                inputBegriff.value = item.begriff;
                inputBegriff.placeholder = 'z.B. Fahrzeugzustand';
                inputBegriff.style.flex = '1';
                inputBegriff.style.minWidth = '200px';
                inputBegriff.style.marginRight = '10px';
                inputBegriff.addEventListener('input', () => {
                    item.begriff = inputBegriff.value;
                });

                const btnLoeschen = document.createElement('button');
                btnLoeschen.textContent = 'Löschen';
                btnLoeschen.style.cursor = 'pointer';
                btnLoeschen.style.padding = '4px 8px';
                btnLoeschen.style.border = 'none';
                btnLoeschen.style.borderRadius = '4px';
                btnLoeschen.style.backgroundColor = '#a33';
                btnLoeschen.style.color = '#fff';
                btnLoeschen.addEventListener('click', () => {
                    aktuelleTechKonfig.splice(index, 1);
                    renderTechData();
                });

                row1.appendChild(checkAktiv);
                row1.appendChild(lblAktiv);
                row1.appendChild(inputBegriff);
                row1.appendChild(btnLoeschen);

                divItem.appendChild(row1);
                techContainer.appendChild(divItem);
            });
        }
        renderTechData();

        const btnNeuTech = document.createElement('button');
        btnNeuTech.textContent = 'Neuen Tech-Parameter hinzufügen';
        btnNeuTech.style.cursor = 'pointer';
        btnNeuTech.style.padding = '6px 10px';
        btnNeuTech.style.border = 'none';
        btnNeuTech.style.borderRadius = '4px';
        btnNeuTech.style.backgroundColor = '#4caf50';
        btnNeuTech.style.color = '#fff';
        btnNeuTech.style.marginTop = '8px';
        btnNeuTech.addEventListener('click', () => {
            aktuelleTechKonfig.push({
                begriff: '',
                aktiv: true
            });
            renderTechData();
        });
        popup.appendChild(btnNeuTech);

        // -------------------------------
        // C) IMPORT / EXPORT
        // -------------------------------
        const importExportTitle = document.createElement('h3');
        importExportTitle.textContent = 'Import / Export';
        importExportTitle.style.borderBottom = '1px solid #444';
        importExportTitle.style.paddingBottom = '4px';
        importExportTitle.style.marginTop = '16px';
        popup.appendChild(importExportTitle);

        const importExportContainer = document.createElement('div');
        popup.appendChild(importExportContainer);

        // --- Export (JSON) ---
        const exportLabel = document.createElement('div');
        exportLabel.textContent = 'Aktuelle Konfiguration (Export-JSON):';
        exportLabel.style.marginTop = '8px';
        importExportContainer.appendChild(exportLabel);

        const exportArea = document.createElement('textarea');
        exportArea.style.width = '100%';
        exportArea.style.height = '100px';
        exportArea.style.marginTop = '4px';
        exportArea.style.backgroundColor = '#3b3c42';
        exportArea.style.color = '#fff';
        exportArea.readOnly = true;
        importExportContainer.appendChild(exportArea);

        // Button: Export erzeugen
        const btnGenerateExport = document.createElement('button');
        btnGenerateExport.textContent = 'Export aktualisieren';
        btnGenerateExport.style.cursor = 'pointer';
        btnGenerateExport.style.padding = '6px 10px';
        btnGenerateExport.style.border = 'none';
        btnGenerateExport.style.borderRadius = '4px';
        btnGenerateExport.style.backgroundColor = '#333';
        btnGenerateExport.style.color = '#fff';
        btnGenerateExport.style.marginTop = '4px';
        btnGenerateExport.style.marginRight = '10px';
        btnGenerateExport.addEventListener('click', () => {
            // Objekt zusammenbauen
            const configObj = {
                suchKonfigurationen: aktuelleAusstattungsKonfig,
                techDataKonfigurationen: aktuelleTechKonfig
            };
            exportArea.value = JSON.stringify(configObj, null, 2);
        });
        importExportContainer.appendChild(btnGenerateExport);

        // Button: Copy to Clipboard
        const btnCopyExport = document.createElement('button');
        btnCopyExport.textContent = 'In Zwischenablage kopieren';
        btnCopyExport.style.cursor = 'pointer';
        btnCopyExport.style.padding = '6px 10px';
        btnCopyExport.style.border = 'none';
        btnCopyExport.style.borderRadius = '4px';
        btnCopyExport.style.backgroundColor = '#555';
        btnCopyExport.style.color = '#fff';
        btnCopyExport.style.marginTop = '4px';
        btnCopyExport.addEventListener('click', () => {
            exportArea.select();
            document.execCommand('copy');
        });
        importExportContainer.appendChild(btnCopyExport);

        // --- Import (JSON) ---
        const importLabel = document.createElement('div');
        importLabel.textContent = 'Konfiguration importieren (füge JSON hier ein):';
        importLabel.style.marginTop = '12px';
        importExportContainer.appendChild(importLabel);

        const importArea = document.createElement('textarea');
        importArea.style.width = '100%';
        importArea.style.height = '100px';
        importArea.style.marginTop = '4px';
        importArea.style.backgroundColor = '#3b3c42';
        importArea.style.color = '#fff';
        importExportContainer.appendChild(importArea);

        const btnImport = document.createElement('button');
        btnImport.textContent = 'Import durchführen';
        btnImport.style.cursor = 'pointer';
        btnImport.style.padding = '6px 10px';
        btnImport.style.border = 'none';
        btnImport.style.borderRadius = '4px';
        btnImport.style.backgroundColor = '#333';
        btnImport.style.color = '#fff';
        btnImport.style.marginTop = '4px';
        btnImport.addEventListener('click', () => {
            const text = importArea.value.trim();
            if (!text) return;
            try {
                const obj = JSON.parse(text);
                if (obj.suchKonfigurationen && Array.isArray(obj.suchKonfigurationen)) {
                    aktuelleAusstattungsKonfig = obj.suchKonfigurationen;
                }
                if (obj.techDataKonfigurationen && Array.isArray(obj.techDataKonfigurationen)) {
                    aktuelleTechKonfig = obj.techDataKonfigurationen;
                }
                // Neu rendern
                renderAusstattung();
                renderTechData();
                alert('Import erfolgreich. Bitte ggf. noch "Speichern" klicken, um endgültig zu übernehmen.');
            } catch (e) {
                alert('Fehler beim Import. Ungültiges JSON?\n' + e);
            }
        });
        importExportContainer.appendChild(btnImport);

        // -------------------------------
        // D) BUTTON-BAR (SPEICHERN / ABBRECHEN)
        // -------------------------------
        const buttonBar = document.createElement('div');
        buttonBar.style.textAlign = 'right';
        buttonBar.style.marginTop = '20px';

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Abbrechen';
        cancelBtn.style.cursor = 'pointer';
        cancelBtn.style.padding = '6px 10px';
        cancelBtn.style.border = 'none';
        cancelBtn.style.borderRadius = '4px';
        cancelBtn.style.backgroundColor = '#555';
        cancelBtn.style.color = '#fff';
        cancelBtn.style.marginRight = '10px';
        cancelBtn.addEventListener('click', () => {
            removeOverlay();
        });

        const saveBtn = document.createElement('button');
        saveBtn.textContent = 'Speichern';
        saveBtn.style.cursor = 'pointer';
        saveBtn.style.padding = '6px 10px';
        saveBtn.style.border = 'none';
        saveBtn.style.borderRadius = '4px';
        saveBtn.style.backgroundColor = '#2196F3';
        saveBtn.style.color = '#fff';
        saveBtn.addEventListener('click', () => {
            // Speichern in GM-Storage
            speichereConfig('mobilede_config', aktuelleAusstattungsKonfig);
            speichereConfig('mobilede_techconfig', aktuelleTechKonfig);

            // Globale Variablen sofort aktualisieren
            suchKonfigurationen = aktuelleAusstattungsKonfig;
            techDataKonfigurationen = aktuelleTechKonfig;

            removeOverlay();
        });

        buttonBar.appendChild(cancelBtn);
        buttonBar.appendChild(saveBtn);
        popup.appendChild(buttonBar);

        // Alles ins Overlay
        overlay.appendChild(popup);

        // "Fade-in"
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            popup.style.opacity = '1';
        });
    }

    // ***********************************************************************
    // *** 9) Konfig-Button einfügen *****************************************
    // ***********************************************************************
    function erstelleKonfigButton() {
        const targetDiv = document.querySelector('.Va7Gr');
        if (!targetDiv) return;

        const button = document.createElement('button');
        button.innerText = 'Konfiguration';
        button.style.cursor = 'pointer';
        button.style.marginLeft = '8px';
        button.style.padding = '8px 12px';
        button.style.border = 'none';
        button.style.borderRadius = '4px';
        button.style.background = '#333';
        button.style.color = '#fff';
        button.style.fontFamily = 'Arial, sans-serif';
        button.style.boxShadow = '0px 2px 5px rgba(0,0,0,0.3)';

        button.addEventListener('click', () => {
            oeffneKonfigPopup();
        });

        targetDiv.appendChild(button);
    }

    setTimeout(erstelleKonfigButton, 3000);

})();