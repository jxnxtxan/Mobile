// ==UserScript==
// @name         Mobile.de Ausstattungssuche
// @namespace    http://tampermonkey.net/
// @version      1.7
// @author       Huibu5678 / Querslider
// @match        https://suchen.mobile.de/fahrzeuge/details.html*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Suchkonfigurationen mit Farb-Attribut
    const suchKonfigurationen = [
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
        { begriffe: ['außenspiegel elek verst', 'elek spiegel', 'seitenspiegel'], anzeige: 'Außenspiegel elektr. verstellbar', aktiv: true },
        { begriffe: ['außenspiegel elek heiz', 'außenspiegel heiz'], anzeige: 'Außenspiegel elektr. verstell- und heizbar', aktiv: true },
        { begriffe: ['Bang & Olufsen', 'b&o', 'Bang Olufsen'], anzeige: 'Bang & Olufsen Sound System', farbe: 'red', aktiv: true },
        { begriffe: ['blendfrei fernlicht', 'anti blend licht', 'fernlicht assist', 'auto fernlicht'], anzeige: 'Fernlicht Assistent', farbe: 'orange', aktiv: true },
        { begriffe: ['brems assist', 'brake assist'], anzeige: 'Bremsassistent', aktiv: true },
        { begriffe: ['Business-Paket Professional', 'busin', 'Business', 'Buisn paket profess'], anzeige: 'Business Paket', aktiv: true },
        { begriffe: ['Burmester', 'burme'], anzeige: 'Burmester Sound System', farbe: 'red', aktiv: true },
        { begriffe: ['canton'], anzeige: 'Canton Sound System', farbe: 'red', aktiv: true },
        { begriffe: ['dachhimmel anth', 'himmel anth', 'Dachhimmel schwarz', 'Dachhimmel Stoff  schwarz', 'Dachhimmel Stoff, schwarz', 'dachhim schwarz'], anzeige: 'Dachhimmel Anthrazit / Schwarz', aktiv: true },
        { begriffe: ['dachhimmel alcantara', 'himmel alcant'], anzeige: 'Dachhimmel Alcantara', aktiv: true },
        { begriffe: ['elek fenst'], anzeige: 'Elektr. Fensterheber', aktiv: false },
        { begriffe: ['elek heckklappe'], anzeige: 'Elektr. Heckklappe', aktiv: false },
        { begriffe: ['sitz elek', 'sitz elek verstell'], anzeige: 'Elektr. Sitzeinstellung', aktiv: true },
        { begriffe: ['memory sitz', 'sitz memory', 'sitz elek verstell memo'], anzeige: 'Elektr. Sitzeinstellung mit Memory-Funktion', farbe: 'red', aktiv: true },
        { begriffe: ['garantie'], anzeige: 'Garantie', aktiv: false },
        { begriffe: ['head up', 'HUD', 'head'], anzeige: 'Head-Up Display', aktiv: true },
        { begriffe: ['heckantrieb', 'antrieb heck'], anzeige: 'Heckantrieb', aktiv: false },
        { begriffe: ['harman kardon', 'h&k'], anzeige: 'Harman Kardon Sound System', farbe: 'red', aktiv: true },
        { begriffe: ['induktiv laden', 'wireless charge'], anzeige: 'Induktionsladeschale für Smartphone (Wireless Charging)', aktiv: false },
        { begriffe: ['innenspiegel abblend', 'inne spiegel auto'], anzeige: 'Innenspiegel autom. abblendend', aktiv: true },
        { begriffe: ['lenkradheizung', 'Beheizbares Lenkrad', 'lenk heiz'], anzeige: 'Lenkradheizung', aktiv: true },
        { begriffe: ['matrix led', 'matrix scheinwer', 'matrix beam', 'matrix licht'], anzeige: 'Matrix Scheinwerfer', farbe: 'red', aktiv: true },
        { begriffe: ['panorama', 'panoramadach', 'glas dach'], anzeige: 'Panoramadach', farbe: 'orange', aktiv: true },
        { begriffe: ['park assist', 'park hilfe'], anzeige: 'Parkassistent', aktiv: true },
        { begriffe: ['pdc', 'park dist contr'], anzeige: 'Park-Distance-Control', aktiv: true },
        { begriffe: ['reifen druck', 'druck kontrolle'], anzeige: 'Reifendruck Kontrollsystem', aktiv: true },
        { begriffe: ['Rückfahrkamera', 'Rückfahrkamerasystem', 'Rueckfahrkamera'], anzeige: 'Rückfahrkamera', aktiv: true },
        { begriffe: ['seiten airbag', 'airbag seite'], anzeige: 'Seitenairbag', aktiv: false },
        { begriffe: ['spiegel klappbar', 'elek spiegel klapp'], anzeige: 'Seitenspiegel anklappbar', aktiv: true },
        { begriffe: ['scheckheft gepflegt', 'scheckheft'], anzeige: 'Scheckheftgepflegt', farbe: 'red', aktiv: true },
        { begriffe: ['keyless', 'schlüssel frei', 'schlüssellose zentral'], anzeige: 'Schlüssellose Zentralverriegelung (Keyless)', farbe: 'orange', aktiv: true },
        { begriffe: ['Servoschließung tür', 'soft close'], verboten: ['pedal', 'virtuell'], anzeige: 'Softclose', aktiv: true },
        { begriffe: ['Sonnenschutzverglasung'], anzeige: 'Sonnenschutzverglasung', aktiv: true },
        { begriffe: ['Sonnenschutzverglasung abgedunkelt'], anzeige: 'Sonnenschutzverglasung abgedunkelt', aktiv: true },
        { begriffe: ['spurhalte assist', 'lane assist'], anzeige: 'Spurhalteassistent', aktiv: true },
        { begriffe: ['Standheizung', 'standhei'], anzeige: 'Standheizung', aktiv: true },
        { begriffe: ['start stop', 'auto stop'], anzeige: 'Start/Stopp-Automatik', aktiv: true },
        { begriffe: ['sitz heiz', 'heizung sitz'], anzeige: 'Sitzheizung', farbe: 'orange', aktiv: true },
        { begriffe: ['sitz belüft', 'sitz kühl'], anzeige: 'Sitzbelüftung ', farbe: 'red', aktiv: true },
        { begriffe: ['totwinkel', 'blind spot'], anzeige: 'Totwinkel-Assistent', aktiv: true },
        { begriffe: ['traction control', 'traktio kontr'], anzeige: 'Traktionskontrolle', aktiv: false },
        { begriffe: ['360 grad', '360 kamera', '360 cam', 'umfeld kamera'], anzeige: '360 Grad Kamera', farbe: 'red', aktiv: true },
        { begriffe: ['verkehrszeichen', 'road sign'], anzeige: 'Verkehrszeichenerkennung', aktiv: true },
        { begriffe: ['digital cockpit', 'digi kombi'], anzeige: 'Volldigitales Kombiinstrument', aktiv: true },
        { begriffe: ['winter paket', 'kalt paket'], anzeige: 'Winterpaket', aktiv: true },
        { begriffe: ['zentral verriegelung', 'central lock'], anzeige: 'Zentralverriegelung', aktiv: true },
    ];

    const techDataKonfigurationen = [
        { begriff: 'Fahrzeugzustand', aktiv: true },
        { begriff: 'Erstzulassung', aktiv: true },
        { begriff: 'Innenausstattung', aktiv: true },
        { begriff: 'Farbe (Hersteller)', aktiv: true },
        { begriff: 'Farbe', aktiv: true }
    ];

    // Definiere deine Suchbereiche für die Ausstattung wie gehabt
    const ausstattungsListe = document.querySelectorAll("ul[data-testid='vip-features-list'] li");
    const beschreibungsBereich = document.querySelector("div[data-testid='vip-vehicle-description-text']");
    const zusatzBereich = document.querySelector("div.GOIOV.fqe3L.EevEz");

    // Definiere eigenen Suchbereich für technische Daten
    const techDataBereich = document.querySelector("article[data-testid='vip-technical-data-box'] dl.XCaEv");


    function getGesamtText() {
        console.log("[Debug] getGesamtText aufgerufen.");
        let textParts = [];

        ausstattungsListe.forEach(li => {
            const txt = li.textContent.trim();
            if (txt) {
                console.log("[Debug] Ausstattungseintrag gefunden:", txt);
                textParts.push(txt);
            }
        });

        if (beschreibungsBereich) {
            const txt = beschreibungsBereich.textContent.replace(/,/g, ' ').trim();
            if (txt) {
                console.log("[Debug] Beschreibungstext gefunden:", txt);
                textParts.push(txt);
            }
        }

        if (zusatzBereich) {
            const txt = zusatzBereich.textContent.trim();
            if (txt) {
                console.log("[Debug] Zusatzbereichstext gefunden:", txt);
                textParts.push(txt);
            }
        }

        console.log("[Debug] Gesamter Text zusammengestellt:", textParts);
        return textParts;
    }


    function sucheBegriffe() {
        const gefundene = [];
        const textZeilen = getGesamtText();

        suchKonfigurationen.forEach(cfg => {
            if (!cfg.aktiv) return;

            let gefunden = false;

            for (let zeile of textZeilen) {
                const zeileLower = zeile.toLowerCase();

                for (let begriff of cfg.begriffe) {
                    const begriffLower = begriff.toLowerCase().trim();

                    if (begriffLower.includes(" ")) {
                        const teilbegriffe = begriffLower.split(" ");
                        let indices = [];
                        let allFound = true;
                        for (let tb of teilbegriffe) {
                            let idx = zeileLower.indexOf(tb);
                            if (idx === -1) {
                                allFound = false;
                                break;
                            }
                            indices.push(idx);
                        }

                        if (allFound) {
                            const minIndex = Math.min(...indices);
                            const maxIndex = Math.max(...indices);
                            if ((maxIndex - minIndex) <= 20) {
                                gefundene.push({ anzeige: cfg.anzeige, farbe: (cfg.farbe || '#66ff66').toLowerCase() });
                                gefunden = true;
                                break;
                            }
                        }

                    } else {
                        let idx = zeileLower.indexOf(begriffLower);
                        if (idx !== -1) {
                            gefundene.push({ anzeige: cfg.anzeige, farbe: (cfg.farbe || '#66ff66').toLowerCase() });
                            gefunden = true;
                            break;
                        }
                    }
                }

                if (gefunden) break;
            }
        });

        const uniqueMap = new Map();
        gefundene.forEach(obj => uniqueMap.set(obj.anzeige, obj));
        const uniqueGefundene = [...uniqueMap.values()];

        uniqueGefundene.sort((a, b) => a.anzeige.localeCompare(b.anzeige));

        return uniqueGefundene;
    }

    // Suche in definiertem Suchbereich für technische Daten
    function sucheTechnischeDaten() {
        if (!techDataBereich) return [];

        const daten = [];
        // Für jeden konfigurierten Eintrag nach dt suchen und den nächsten dd auslesen
        techDataKonfigurationen.forEach(cfg => {
            if (!cfg.aktiv) return;
            const dtElements = techDataBereich.querySelectorAll("dt");
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
        title.textContent = `Technische Daten:`;
        title.style.color = "white";
        title.style.marginBottom = "5px";
        techContainer.appendChild(title);

        // Erstelle eine Tabelle für die technischen Daten
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

        // Vor dem Ergebnisbereich einfügen
        parentElement.parentNode.insertBefore(techArticle, parentElement);
    }

    function ergebnisHinzufuegen() {
        const gefundeneTexte = sucheBegriffe();

        console.log("[Debug] Versuch, Ergebnisbereich hinzuzufuegen.");
        const zielBereich = document.querySelector("article[data-testid='vip-key-features-box']");

        if (!zielBereich) {
            console.error("[Debug] Zielbereich konnte nicht gefunden werden!");
            return;
        }
        console.log("[Debug] Zielbereich gefunden:", zielBereich);

        if (document.querySelector("#ergebnisBereich")) {
            console.log("[Debug] Ergebnisbereich existiert bereits. Abbruch.");
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
        ergebnisBereich.style.flexWrap= "wrap";
        article.appendChild(ergebnisBereich);

        const title = document.createElement('div');
        title.style.color = "white";
        title.style.marginBottom = "5px";
        title.style.width = '100%';
        title.textContent = 'Gefundene Begriffe:';
        ergebnisBereich.appendChild(title);

        if (gefundeneTexte.length > 0) {
            gefundeneTexte.forEach(item => {
                console.log(`[Debug] Hinzufügen von gefundenem Text: "${item.anzeige}"`);
                const textElement = document.createElement('div');
                textElement.textContent = `- ${item.anzeige}`;
                textElement.style.color = item.farbe;
                textElement.style.width = '50%';
                ergebnisBereich.appendChild(textElement);
            });
        } else {
            console.log("[Debug] Keine Begriffe gefunden. Hinzufügen von Standardmeldung.");
            const keineTexte = document.createElement('div');
            keineTexte.textContent = "Keine der gesuchten Begriffe gefunden.";
            keineTexte.style.color = "white";
            ergebnisBereich.appendChild(keineTexte);
        }

        zielBereich.parentNode.insertBefore(article, zielBereich.nextSibling)

        // Technische Daten oberhalb von "Gefundene Begriffe" einfügen
        technischeDatenHinzufuegen(article);

        console.log("[Debug] Ergebnisbereich erfolgreich hinzugefügt.");
    }

    const observer = new MutationObserver(() => {
        if (!document.querySelector("#ergebnisBereich")) {
            console.log("Mutation erkannt. Ergebnisbereich wird hinzugefügt...");
            setTimeout(ergebnisHinzufuegen, 1000);
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(ergebnisHinzufuegen, 2000);
})();
