(() => {
  const language = document.getElementById("language");
  if (!language) return;
  window.appLanguage = language.value || "en";
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input, init = {}) => {
    if (
      init.body &&
      init.headers &&
      init.headers["Content-Type"] === "application/json"
    ) {
      try {
        const body = JSON.parse(init.body);
        if (!body.language) body.language = window.appLanguage;
        init = { ...init, body: JSON.stringify(body) };
      } catch (_) {}
    }
    return nativeFetch(input, init);
  };

  const text = {
    en: {
      ".header-note": "A little perspective, written in the stars.",
      "#entry .eyebrow": "YOUR PERSONAL BIRTH CHART",
      "#entry h1": "Start with your story.",
      "#entry .intro p":
        "Enter your birth details to explore your charts\nand the traditional meanings behind them.",
      'label[for="name"]': "Name optional",
      'label[for="date"]': "Date of birth",
      'label[for="time"]': "Time of birth",
      'label[for="place"]': "Place of birth",
      "#find-place": "Find place",
      "#generate": "Generate my reading ↗",
      ".privacy":
        "Your details stay in this local session. Place searches use an online location service.",
      "#entry .disclaimer":
        "A traditional perspective for reflection, not a prediction of certain events.",
      "#results .eyebrow": "YOUR PERSONAL READING",
      "#new-reading": "New reading",
      ".section-heading h2": "Your key charts",
      ".section-heading span": "South Indian layout · signs fixed",
      "#divisional-charts > summary": "Explore all 17 divisional charts",
      "#divisional-charts label": "Choose a chart",
      ".reading .eyebrow": "THE BIG PICTURE",

      "#references summary": "References and calculation settings",
      ".result-details section:first-child h2": "Planetary details",
      ".result-details section:last-child h2": "Your current period",
      ".chat h2": "Keep exploring",
      ".chat p.small": "Your birth chart is calculated once. Open chat and ask as many follow-up questions as you like about the selected chart.",
      "#ask": "Ask ↗",
      "#results > .disclaimer":
        "Astrology is not scientifically validated. Readings are symbolic interpretations, not medical or financial advice.",
      "footer span": "Calculated with Lahiri ayanamsa · Whole-sign houses",
    },
    hi: {
      ".header-note": "सितारों में लिखी एक छोटी-सी दृष्टि।",
      "#entry .eyebrow": "आपकी व्यक्तिगत जन्म कुंडली",
      "#entry h1": "अपनी कहानी से शुरुआत करें।",
      "#entry .intro p":
        "अपनी कुंडली और उनके पारंपरिक अर्थों को समझने के लिए\nजन्म विवरण दर्ज करें।",
      'label[for="name"]': "नाम (वैकल्पिक)",
      'label[for="date"]': "जन्म तिथि",
      'label[for="time"]': "जन्म समय",
      'label[for="place"]': "जन्म स्थान",
      "#find-place": "स्थान खोजें",
      "#generate": "मेरी रीडिंग तैयार करें ↗",
      ".privacy":
        "आपका विवरण इसी स्थानीय सत्र में रहता है। स्थान खोज ऑनलाइन सेवा का उपयोग करती है।",
      "#entry .disclaimer":
        "यह आत्म-चिंतन के लिए पारंपरिक दृष्टिकोण है, निश्चित भविष्यवाणी नहीं।",
      "#results .eyebrow": "आपकी व्यक्तिगत रीडिंग",
      "#new-reading": "नई रीडिंग",
      ".section-heading h2": "आपकी मुख्य कुंडलियाँ",
      ".section-heading span": "दक्षिण भारतीय प्रारूप · राशियाँ स्थिर",
      "#divisional-charts > summary": "सभी 17 विभागीय कुंडलियाँ देखें",
      "#divisional-charts label": "कुंडली चुनें",
      ".reading .eyebrow": "समग्र दृष्टि",

      "#references summary": "संदर्भ और गणना सेटिंग्स",
      ".result-details section:first-child h2": "ग्रहों का विवरण",
      ".result-details section:last-child h2": "आपकी वर्तमान दशा",
      ".chat h2": "आगे जानें",
      ".chat p.small": "आपकी जन्म कुंडली एक बार बनती है। चैट खोलें और चुनी हुई कुंडली पर जितने चाहें सवाल पूछें।",
      "#ask": "पूछें ↗",
      "#results > .disclaimer":
        "ज्योतिष वैज्ञानिक रूप से प्रमाणित नहीं है। रीडिंग प्रतीकात्मक व्याख्याएँ हैं, चिकित्सीय या वित्तीय सलाह नहीं।",
      "footer span": "लाहिड़ी अयनांश · पूर्ण राशि भाव",
    },
  };

  const terms = {
    "Birth chart": "जन्म कुंडली",
    Hora: "होरा",
    Drekkana: "द्रेष्काण",
    Chaturthamsa: "चतुर्थांश",
    Saptamsa: "सप्तांश",
    Navamsa: "नवांश",
    Dasamsa: "दशांश",
    Ascendant: "लग्न",
    "Moon sign": "चंद्र राशि",
    Nakshatra: "नक्षत्र",
    Pada: "पाद",
    rising: "लग्न",
    Mahadasha: "महादशा",
    Antardasha: "अंतरदशा",
    Planet: "ग्रह",
    "Sign / degree": "राशि / अंश",
    House: "भाव",
    Aries: "मेष",
    Taurus: "वृषभ",
    Gemini: "मिथुन",
    Cancer: "कर्क",
    Leo: "सिंह",
    Virgo: "कन्या",
    Libra: "तुला",
    Scorpio: "वृश्चिक",
    Sagittarius: "धनु",
    Capricorn: "मकर",
    Aquarius: "कुंभ",
    Pisces: "मीन",
    "Birth-time sensitive within ±1 minute.":
      "जन्म समय ±1 मिनट के भीतर संवेदनशील है।",
    "Ascendant stable at sampled ±1-minute times.":
      "नमूने में ±1 मिनट पर लग्न स्थिर है।",
    "No match. Try the nearest city and country.":
      "कोई परिणाम नहीं मिला। निकटतम शहर और देश आज़माएँ।",
    "Find and select your birthplace first.":
      "पहले अपना जन्म स्थान खोजकर चुनें।",
    "Preparing your charts…": "आपकी कुंडलियाँ तैयार की जा रही हैं…",
    "The request took too long. Please try again.":
      "अनुरोध में बहुत समय लगा। कृपया फिर प्रयास करें।",
    "Basic symbolic reading": "मूल प्रतीकात्मक रीडिंग",
    "AI-assisted interpretation": "AI-सहायित व्याख्या",
    "Real-time Hindi translation": "रियल-टाइम हिंदी अनुवाद",
    "verify important details": "महत्वपूर्ण विवरण सत्यापित करें",
    "Next:": "अगला:",
    "Dates shown in UTC; Vimshottari year = 365.25 days.":
      "तिथियाँ UTC में हैं; विंशोत्तरी वर्ष = 365.25 दिन।",
    "No reviewed corpus passage was used for this explanation.":
      "इस व्याख्या के लिए कोई समीक्षित कॉर्पस अंश उपयोग नहीं हुआ।",
    "Request failed": "अनुरोध विफल हुआ",
    "Your birth chart": "आपकी जन्म कुंडली",
    " birth chart": " जन्म कुंडली",
    " ascendant changes near your entered birth time. Minute-rounded times make these charts provisional.":
      " आपके दर्ज जन्म समय के आसपास लग्न बदलता है। मिनट तक दर्ज समय के कारण ये कुंडलियाँ अस्थायी हैं।",
    "Calculations use the entered minute and locality coordinates. Higher divisional charts need precise birth details.":
      "गणना दर्ज मिनट और स्थान के निर्देशांकों पर आधारित है। उच्च विभागीय कुंडलियों के लिए सटीक जन्म विवरण आवश्यक हैं।",
    "Dates shown in UTC; Vimshottari year = 365.25 days.":
      "तिथियाँ UTC में हैं; विंशोत्तरी वर्ष = 365.25 दिन।",
    "Traditional topic labels in the basic reading are editorial summaries, not a complete yoga or planetary-strength assessment. No transits are calculated.":
      "मूल रीडिंग में विषय लेबल संपादकीय सारांश हैं, पूर्ण योग या ग्रह-बल आकलन नहीं। गोचर की गणना नहीं की गई है।",
    "Place: ": "स्थान: ",
    "AI interpretation; factual and citation support has not been independently verified.":
      "AI व्याख्या; तथ्यों और संदर्भों का स्वतंत्र सत्यापन नहीं किया गया है।",
    "The language model is unavailable. Showing the calculated chart and basic explanation.":
      "भाषा मॉडल उपलब्ध नहीं है। गणना की गई कुंडली और मूल व्याख्या दिखाई जा रही है।",
  };

  function applyStatic(lang) {
    Object.entries(text[lang]).forEach(([selector, value]) => {
      const node = document.querySelector(selector);
      if (node) node.textContent = value;
    });
    document.getElementById("name").placeholder =
      lang === "hi" ? "अपना नाम" : "Your name";
    document.getElementById("place").placeholder =
      lang === "hi"
        ? "शहर या स्थान, जैसे प्रयागराज"
        : "City or locality, e.g. Prayagraj";
    document.getElementById("question").placeholder =
      lang === "hi"
        ? "मेरी कुंडली करियर के बारे में क्या कहती है?"
        : "What does my chart say about career?";
    document.documentElement.lang = lang;
  }

  function applyTerms(lang) {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
    );
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      if (node.parentElement.closest("#language, #chat-language, #answer, #messages, #reading-mode, #chat-scope, #chat-translation-status, #selected-reading-title, #suggested-questions, #assessment, .chart-summary")) return;
      let value = node.nodeValue;
      Object.entries(terms).forEach(([english, hindi]) => {
        const bilingual = `${english} / ${hindi}`;
        if (lang === "hi")
          value = value.split(bilingual).join(hindi).split(english).join(hindi);
        else
          value = value
            .split(bilingual)
            .join(english)
            .split(hindi)
            .join(english);
      });
      if (value !== node.nodeValue) node.nodeValue = value;
    });
  }

  function setLanguage(lang) {
    lang = lang === "hi" ? "hi" : "en";
    window.appLanguage = lang;
    applyStatic(lang);
    applyTerms(lang);
    language.value = lang;
    document.dispatchEvent(new CustomEvent("languagechange", { detail: lang }));
  }

  language.addEventListener("change", () => setLanguage(language.value));
  new MutationObserver(() => applyTerms(language.value)).observe(
    document.body,
    { childList: true, subtree: true, characterData: true },
  );
  setLanguage("en");
})();
