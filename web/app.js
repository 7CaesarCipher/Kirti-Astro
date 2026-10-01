const $ = (id) => document.getElementById(id);
let selected = null,
  token = null,
  current = null;
let lookup = 0;
let readingRequest = 0;
let chatLanguageEpoch = 0;
let chatReplies = [];
const names = {
  1: "Birth chart",
  2: "Hora",
  3: "Drekkana",
  4: "Chaturthamsa",
  7: "Saptamsa",
  9: "Navamsa",
  10: "Dasamsa",
  12: "Dwadasamsa",
  16: "Shodasamsa",
  20: "Vimsamsa",
  24: "Siddhamsa",
  27: "Bhamsa",
  30: "Trimsamsa",
  40: "Khavedamsa",
  45: "Akshavedamsa",
  60: "Shashtiamsa",
  81: "Nava-Navamsa",
};
const chartSummaries = {
  1: "Birth chart / जन्म कुंडली — overall life themes / जीवन की समग्र दिशा",
  2: "Hora / होरा — wealth and resources / धन और संसाधन",
  3: "Drekkana / द्रेष्काण — siblings, courage and effort / भाई-बहन, साहस और प्रयास",
  4: "Chaturthamsa / चतुर्थांश — home, property and foundations / घर, संपत्ति और आधार",
  7: "Saptamsa / सप्तांश — children and creativity / संतान और रचनात्मकता",
  9: "Navamsa / नवांश — partnerships, dharma and inner strength / साझेदारी, धर्म और आंतरिक शक्ति",
  10: "Dasamsa / दशांश — career and public work / करियर और सार्वजनिक कार्य",
  12: "Dwadasamsa / द्वादशांश — family line and parents / परिवार की परंपरा और माता-पिता",
  16: "Shodasamsa / षोडशांश — comforts, vehicles and happiness / सुख-सुविधाएँ, वाहन और प्रसन्नता",
  20: "Vimsamsa / विंशांश — spiritual practice / आध्यात्मिक साधना",
  24: "Siddhamsa / चतुर्विंशांश — learning and education / शिक्षा और अध्ययन",
  27: "Bhamsa / सप्तविंशांश — strengths and weaknesses / शक्तियाँ और कमजोरियाँ",
  30: "Trimsamsa / त्रिंशांश — difficulties and challenges / कठिनाइयाँ और चुनौतियाँ",
  40: "Khavedamsa / चत्वारिंशांश — auspicious traditional themes / शुभ पारंपरिक संकेत",
  45: "Akshavedamsa / पंचचत्वारिंशांश — character and conduct / चरित्र और आचरण",
  60: "Shashtiamsa / षष्ट्यांश — fine traditional influences / सूक्ष्म पारंपरिक प्रभाव",
  81: "Nava-Navamsa / नव-नवांश — Navamsa × Navamsa / नवांश × नवांश; fine traditional themes / सूक्ष्म पारंपरिक संकेत",
};
const signs = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
];
const abbreviations = {
  Sun: "Su",
  Moon: "Mo",
  Mercury: "Me",
  Venus: "Ve",
  Mars: "Ma",
  Jupiter: "Ju",
  Saturn: "Sa",
  Rahu: "Ra",
  Ketu: "Ke",
};
function el(tag, text, cls) {
  const e = document.createElement(tag);
  if (text !== undefined) e.textContent = text;
  if (cls) e.className = cls;
  return e;
}
async function api(path, body) {
  const headers = {};
  if (body) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = "Bearer " + token;
  const c = new AbortController();
  const timer = setTimeout(() => c.abort(), 190000);
  try {
    const r = await fetch(path, {
      method: body ? "POST" : "GET",
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: c.signal,
    });
    const d = await r.json();
    if (!r.ok) throw Error(d.error || "Request failed");
    return d;
  } finally {
    clearTimeout(timer);
  }
}
async function apiStream(path, body, onEvent) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 360000);
  try {
    const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token }, body: JSON.stringify(body), signal: controller.signal });
    if (!response.ok) { const error = await response.json(); throw Error(error.error || "Request failed"); }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let pending = "", answer = null;
    const consume = line => {
      if (!line.trim()) return;
      const event = JSON.parse(line);
      if (event.type === "error") throw Error(event.text);
      if (event.type === "done") answer = event.answer;
      onEvent(event);
    };
    while (true) {
      const { value, done } = await reader.read();
      pending += decoder.decode(value, { stream: !done });
      const lines = pending.split("\n"); pending = lines.pop();
      lines.forEach(consume);
      if (done) break;
    }
    consume(pending);
    if (!answer) throw Error("Reply ended before completion. Please retry.");
    return answer;
  } finally { clearTimeout(timer); }
}
$("date").max = new Date().toISOString().slice(0, 10);
$("place").oninput = () => {
  lookup++;
  selected = null;
  $("selected-place").textContent = "";
  $("places").replaceChildren();
};
$("find-place").onclick = async () => {
  const id = ++lookup;
  $("find-place").disabled = true;
  $("form-error").textContent = "";
  try {
    const d = await api(
      "/api/places?q=" + encodeURIComponent($("place").value),
    );
    if (id !== lookup) return;
    $("places").replaceChildren();
    if (!d.places.length)
      $("form-error").textContent =
        "No match. Try the nearest city and country.";
    d.places.forEach((p) => {
      const b = el("button", p.label, "place-option");
      b.type = "button";
      b.onclick = () => {
        selected = p;
        $("place").value = p.label;
        $("selected-place").textContent = "✓ " + p.label;
        $("places").replaceChildren();
      };
      $("places").append(b);
    });
  } catch (e) {
    $("form-error").textContent = e.message;
  } finally {
    $("find-place").disabled = false;
  }
};
function angle(degree) {
  const seconds = Math.min(107999, Math.max(0, Math.round(degree * 3600)));
  return Math.floor(seconds / 3600) + "°" + String(Math.floor(seconds % 3600 / 60)).padStart(2, "0") + "′" + String(seconds % 60).padStart(2, "0") + "″";
}
function chartView(c) {
  const card = el("section", undefined, "card chart-card");
  card.append(el("h3", "D" + c.division + " · " + names[c.division]));
  card.append(el("p", chartSummaries[c.division], "chart-summary"));
  const grid = el("div", undefined, "chart-grid");
  grid.setAttribute(
    "aria-label",
    "D" + c.division + " chart; ascendant " + c.ascendant,
  );
  const loc = [
    [1, 2],
    [1, 3],
    [1, 4],
    [2, 4],
    [3, 4],
    [4, 4],
    [4, 3],
    [4, 2],
    [4, 1],
    [3, 1],
    [2, 1],
    [1, 1],
  ];
  signs.forEach((s, i) => {
    let cell = el("div", undefined, "sign-cell");
    cell.style.gridRow = loc[i][0];
    cell.style.gridColumn = loc[i][1];
    cell.append(el("div", s, "sign-name"));
    if (c.ascendant_index === i) {
      cell.append(el("div", "Asc " + angle(c.ascendant_mapping.mapped_degree), "planet-names"));
    }
    c.planets.filter(p => p.sign_index === i).forEach(p => {
      const placement = el("div", abbreviations[p.name] + (p.retrograde ? " ℞" : "") + " " + angle(p.mapping.mapped_degree), "planet-names");
      placement.title = p.name + (p.retrograde ? " — retrograde (apparent backward motion)" : "") + "; natal: " + p.mapping.natal_position;
      cell.append(placement);
    });
    grid.append(cell);
  });
  const center = el("div", "D" + c.division, "center");
  center.append(el("small", c.ascendant + " rising"));
  grid.append(center);
  card.append(grid);
  card.append(el("p", "℞ = retrograde: apparent backward motion as viewed from Earth. Each sign spans 0°–30°. " + (c.division === 1 ? "Angles show natal positions." : "Angles show progress through the natal subdivision scaled to 0°–30°; they are derived chart coordinates."), "small"));
  const details = el("details");
  details.append(el("summary", "How the 30° sign is divided"));
  details.append(el("p", c.mapping_rule));
  details.append(el("p", "Each zodiac sign spans 30°. Boundaries include the start and exclude the end. Positions below are natal positions, followed by the mapped divisional sign."));
  const mappings = [ ["Ascendant", c.ascendant_mapping], ...c.planets.map(p => [p.name, p.mapping]) ];
  mappings.forEach(([name, m]) => {
    if (!m) return;
    details.append(el("p", name + ": " + m.natal_position + " → part " + m.segment + "/" + m.segment_count + " [" + m.segment_start_degree.toFixed(6) + "°, " + m.segment_end_degree.toFixed(6) + "°) → " + m.mapped_sign + " " + angle(m.mapped_degree)));
  });
  card.append(details);
  card.append(
    el(
      "p",
      c.sensitive
        ? "Birth-time sensitive within ±1 minute."
        : "Ascendant stable at sampled ±1-minute times.",
      "small",
    ),
  );
  return card;
}
function appendInline(parent, text) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  parts.forEach((part) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      parent.append(el("strong", part.slice(2, -2)));
    } else if (part.startsWith("`") && part.endsWith("`")) {
      parent.append(el("code", part.slice(1, -1)));
    } else if (part) {
      parent.append(document.createTextNode(part));
    }
  });
}
function renderMarkdown(target, markdown) {
  target.replaceChildren();
  let list = null;
  let listType = null;
  const closeList = () => {
    if (list) target.append(list);
    list = null;
    listType = null;
  };
  String(markdown || "")
    .split(/\r?\n/)
    .forEach((line) => {
      const heading = line.match(/^#{1,6}\s+(.+)$/);
      const bullet = line.match(/^\s*[-*]\s+(.+)$/);
      const numbered = line.match(/^\s*\d+[.)]\s+(.+)$/);
      if (!line.trim()) {
        closeList();
      } else if (heading) {
        closeList();
        const h = el("h3", undefined, "answer-heading");
        appendInline(h, heading[1]);
        target.append(h);
      } else if (bullet || numbered) {
        const type = bullet ? "ul" : "ol";
        if (!list || listType !== type) {
          closeList();
          list = document.createElement(type);
          listType = type;
        }
        const item = el("li");
        appendInline(item, (bullet || numbered)[1]);
        list.append(item);
      } else {
        closeList();
        const paragraph = el("p");
        appendInline(paragraph, line);
        target.append(paragraph);
      }
    });
  closeList();
}
function showAnswer(a) {
  renderMarkdown($("answer"), a.text);
  $("reading-mode").textContent =
    a.mode === "llm"
      ? "AI-assisted interpretation · verify important details"
      : a.mode === "translation"
        ? "Real-time Hindi translation · verify important details"
        : "Basic symbolic reading";
  if (a.notice) $("reading-mode").textContent += " · " + a.notice;
}
function renderAssessment(data) {
  const panel = $("assessment"); panel.replaceChildren();
  if (!data) { panel.append(el("p", "Assessment unavailable in this session.")); return; }
  panel.append(el("p", data.engine + " " + data.version + " · D1 · calculated once per birth session"));
  panel.append(el("p", "All six Shadbala categories and the pinned yoga catalogue are calculated under stated conventions. Independent validation remains outstanding. These are traditional calculations, not event guarantees."));
  const table = (headers, rows) => {
    const wrap = el("div", undefined, "table-wrap"); const t = el("table"), head = el("tr");
    headers.forEach(h => head.append(el("th", h))); const thead = el("thead"); thead.append(head); t.append(thead);
    const body = el("tbody"); rows.forEach(values => { const row = el("tr"); values.forEach(v => row.append(el("td", String(v)))); body.append(row); }); t.append(body); wrap.append(t); panel.append(wrap);
  };
  panel.append(el("h3", "Shadbala · virupas (60 = 1 rupa)"));
  const order = data.shadbala.component_order;
  table(["Planet", ...order, "Total", "Rupas"], data.shadbala.planets.map(p => [p.planet, ...order.map(k => p.components_virupas[k]), p.total_virupas, p.total_rupas]));
  panel.append(el("p", data.shadbala.method, "small"));
  panel.append(el("h3", "Ashtakavarga · BAV and SAV"));
  table(["Planet", ...data.ashtakavarga.signs], Object.entries(data.ashtakavarga.bav).map(([name, row]) => [name, ...row]).concat([["SAV", ...data.ashtakavarga.sav]]));
  panel.append(el("p", "SAV total: " + data.ashtakavarga.sav_total + " · " + data.ashtakavarga.occupancy_convention, "small"));
  panel.append(el("h3", "Shodhya Pindas · after both reductions"));
  table(["Planet", "Rasi", "Graha", "Shodhya"], data.ashtakavarga.pindas.map(p => [p.planet, p.rasi_pinda, p.graha_pinda, p.shodhya_pinda]));
  [ ["Trikona reduction",data.ashtakavarga.trikona_reduced], ["Ekadhipatya reduction",data.ashtakavarga.ekadhipatya_reduced] ].forEach(([title, rows]) => {
    panel.append(el("h3", title)); table(["Planet", ...signs], rows.slice(0,7).map((row,i) => [data.shadbala.planets[i].planet,...row]));
  });
  panel.append(el("h3", "D1 yogas · " + data.yogas.present_count + " present / " + data.yogas.catalogue_size + " checked; " + data.yogas.not_evaluated_count + " unevaluated"));
  data.yogas.checks.filter(y => y.status !== "absent").forEach(y => {
    const details = el("details"); details.append(el("summary", y.name + " · " + y.status)); details.append(el("p", y.rule));
    (y.corpus_candidates || []).forEach(source => details.append(el("p", "Corpus research: " + source.source_id + " · " + source.locator + " · " + source.chunk_id + " · " + (source.approved ? "approved passage" : "unreviewed OCR") + "\n" + source.excerpt, "small")));
    panel.append(details);
  });
  panel.append(el("p", data.yogas.scope, "small"));
  const sources = el("details"); sources.append(el("summary", "Local corpus references · review required"));
  [...data.corpus.strength_candidates, ...data.corpus.ashtakavarga_candidates].forEach(source => sources.append(el("p", source.source_id + " · " + source.locator + " · " + source.chunk_id + " · " + (source.approved ? "approved passage" : "unreviewed OCR") + "\n" + source.excerpt, "small")));
  panel.append(sources);
}
function show(r) {
  readingRequest++;
  $("selected-reading-title").textContent = "Your reading · D1";
  $("explore-chat").open = false;
  $("chat-scope").textContent = "Chatting about D1 · Birth chart";
  chatLanguageEpoch++;
  chatReplies = [];
  $("chat-translation-status").textContent = "";
  $("chat-language").value = window.appLanguage || "en";
  current = r.chart;
  renderAssessment(current.assessment);
  token = r.token;
  $("entry").hidden = true;
  $("results").hidden = false;
  const c = current;
  $("reading-title").textContent =
    (c.profile.name ? c.profile.name + "’s" : "Your") + " birth chart";
  $("birth-summary").textContent =
    c.profile.date + " · " + c.profile.time + " · " + c.profile.place.label;
  let moon = c.planets.find((p) => p.name === "Moon");
  $("summary-cards").replaceChildren();
  [
    ["Ascendant", c.ascendant.sign],
    ["Moon sign", moon.sign],
    ["Nakshatra", moon.nakshatra],
    ["Pada", String(moon.pada)],
  ].forEach(([label, value]) => {
    let d = el("div", undefined, "stat");
    d.append(el("small", label), el("strong", value));
    $("summary-cards").append(d);
  });
  let sensitive = ["9", "10", "60"]
    .filter((k) => c.charts[k].sensitive)
    .map((k) => "D" + k);
  $("uncertainty").textContent = sensitive.length
    ? sensitive.join(", ") +
      " ascendant changes near your entered birth time. Minute-rounded times make these charts provisional."
    : "Calculations use the entered minute and locality coordinates. Higher divisional charts need precise birth details.";
  $("key-charts").replaceChildren(
    ...["1", "9", "10"].map((k) => chartView(c.charts[k])),
  );
  $("division").replaceChildren(
    ...Object.keys(c.charts).map((k) => {
      let o = el("option", "D" + k + " · " + names[k]);
      o.value = k;
      return o;
    }),
  );
  $("extra-chart").replaceChildren(chartView(c.charts["1"]));
  $("planet-table").replaceChildren(
    ...c.planets.map((p) => {
      let row = el("tr");
      row.append(
        el("td", p.name + (p.retrograde ? " ℞" : "")),
        el("td", p.sign + " " + p.degree.toFixed(2) + "°"),
        el("td", p.house),
      );
      return row;
    }),
  );
  $("periods").replaceChildren();
  let period = c.dashas.current;
  if (period) {
    let sub = period.subperiods.find((s) => s.current);
    let d = el("div", undefined, "period");
    d.append(
      el("strong", period.lord + " Mahadasha"),
      el("small", period.start.slice(0, 10) + " – " + period.end.slice(0, 10)),
    );
    $("periods").append(d);
    if (sub) {
      let x = el("div", undefined, "period");
      x.append(
        el("strong", sub.lord + " Antardasha"),
        el("small", sub.start.slice(0, 10) + " – " + sub.end.slice(0, 10)),
      );
      $("periods").append(x);
    }
  }
  c.dashas.timeline.slice(1, 3).forEach((p) => {
    let d = el("div", undefined, "period");
    d.append(
      el("strong", "Next: " + p.lord),
      el("small", p.start.slice(0, 10) + " – " + p.end.slice(0, 10)),
    );
    $("periods").append(d);
  });
  $("periods").append(
    el("p", "Dates shown in UTC; Vimshottari year = 365.25 days.", "small"),
  );
  showAnswer(r.answer);
  $("reference-content").replaceChildren(
    el(
      "p",
      Object.entries(c.settings)
        .map(([k, v]) => k + ": " + v)
        .join(" · "),
      "small",
    ),
    el(
      "p",
      "Place: " +
        c.profile.place.provider +
        " · " +
        c.profile.place.latitude +
        ", " +
        c.profile.place.longitude +
        " · " +
        c.profile.place.timezone,
      "small",
    ),
    el(
      "p",
      "Traditional topic labels in the basic reading are editorial summaries, under the stated conventions; the assessment panel includes six Shadbala categories, Ashtakavarga and the pinned D1 yoga catalogue. Timing analysis uses monthly Jupiter/Saturn transit samples and unvalidated editorial rules; no exact event dates or probabilities are calculated.",
      "small",
    ),
  );
  let refs = r.answer.references || [];
  if (!refs.length)
    $("reference-content").append(
      el(
        "p",
        "No reviewed corpus passage was used for this explanation.",
        "small",
      ),
    );
  refs.forEach((x) => {
    let a = el("a", x.title + " — " + x.locator);
    a.href = x.url;
    a.target = "_blank";
    a.rel = "noopener";
    $("reference-content").append(a);
  });
  $("messages").replaceChildren();
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (window.appLanguage === "hi") {
    setTimeout(
      () =>
        document.dispatchEvent(
          new CustomEvent("languagechange", { detail: "hi" }),
        ),
      0,
    );
  }
}
$("division").onchange = async () => {
  $("extra-chart").replaceChildren(
    chartView(current.charts[$("division").value]),
  );
  const division = $("division").value;
  $("chat-scope").textContent = "Chatting about D" + division + " · " + names[division];
  const request = ++readingRequest;
  $("selected-reading-title").textContent = "Your reading · D" + division + " · " + names[division];
  $("answer").replaceChildren(el("p", "Preparing your reading…"));
  $("reading-mode").textContent = "";
  try {
    const result = await api("/api/chart-reading", { division });
    if (request === readingRequest && current) showAnswer(result);
  } catch (error) {
    if (request === readingRequest) $("answer").replaceChildren(el("p", error.message));
  }
};
$("birth-form").onsubmit = async (e) => {
  e.preventDefault();
  $("form-error").textContent = "";
  if (!selected) {
    $("form-error").textContent = "Find and select your birthplace first.";
    return;
  }
  $("generate").disabled = true;
  $("generate").textContent = "Preparing your charts…";
  try {
    if (token) await api("/api/forget", {});
    show(
      await api("/api/reading", {
        name: $("name").value,
        date: $("date").value,
        time: $("time").value,
        place_id: selected.id,
      }),
    );
  } catch (e) {
    $("form-error").textContent =
      e.name === "AbortError"
        ? "The request took too long. Please try again."
        : e.message;
  } finally {
    $("generate").disabled = false;
    $("generate").textContent = "Generate my reading ↗";
  }
};
$("new-reading").onclick = async () => {
  try {
    if (token) await api("/api/forget", {});
  } catch (e) {}
  readingRequest++;
  chatLanguageEpoch++;
  chatReplies = [];
  $("chat-translation-status").textContent = "";
  token = null;
  current = null;
  $("results").hidden = true;
  $("entry").hidden = false;
  $("messages").replaceChildren();
  window.scrollTo(0, 0);
};
[
  "Show my marriage timing analysis",
  "When are my money and wealth candidate periods?",
  "Explain my career timing analysis",
  "What does my chart show about learning?",
  "Explain my Moon placement",
  "What does retrograde mean?",
  "Explain my Shadbala planetary strength",
  "Explain my Ashtakavarga points",
  "Which yogas are present in my chart?",
].forEach(question => {
  const button = el("button", question, "secondary");
  button.type = "button";
  button.onclick = () => { $("question").value = question; $("question").focus(); };
  $("suggested-questions").append(button);
});
$("explore-chat").addEventListener("toggle", () => {
  if ($("explore-chat").open) $("question").focus();
});
function drawChatReply(entry, language) {
  entry.node.replaceChildren(el("small", "D" + entry.division + " · " + names[entry.division]));
  const translations = entry.answer.translations || { en: entry.answer.text };
  const languages = language === "both" ? ["en", "hi"] : [language];
  if (!languages.some(lang => translations[lang])) {
    const original = el("div"); renderMarkdown(original, entry.original || entry.answer.text || "Preparing reply…"); entry.node.append(original);
  }
  languages.forEach(lang => {
    const text = translations[lang];
    if (!text) return;
    const content = el("div");
    content.lang = lang;
    if (language === "both") entry.node.append(el("strong", lang === "hi" ? "हिन्दी" : "English"));
    renderMarkdown(content, text);
    entry.node.append(content);
  });
  if ((language === "hi" || language === "both") && !translations.hi) {
    if (language === "hi") {
      const content = el("div");
      content.lang = "en";
      renderMarkdown(content, translations.en || entry.answer.text);
      entry.node.append(content);
    }
    entry.node.append(el("p", entry.answer.notice || (entry.streaming ? "Translating… draft text" : "Hindi translation unavailable. Showing English."), "small"));
  } else if (entry.answer.notice) entry.node.append(el("p", entry.answer.notice, "small"));
  (entry.answer.references || []).forEach(r => {
    const link = el("a", r.id + ": " + r.title + " / " + r.locator);
    link.href = r.url; link.target = "_blank"; link.rel = "noopener";
    entry.node.append(link);
  });
}
async function updateChatReply(entry, language, epoch, sessionToken) {
  const translations = entry.answer.translations || { en: entry.answer.text };
  entry.answer.translations = translations;
  const required = language === "both" ? ["en", "hi"] : [language];
  if (required.some(lang => !translations[lang])) {
    entry.streaming = true;
    const result = await apiStream("/api/translate-stream", { text: entry.original || translations.en, source_language: entry.sourceLanguage || "en", language, question: entry.question || "", division: entry.division, kind: entry.kind || "user-question" }, event => {
      if (epoch !== chatLanguageEpoch || token !== sessionToken) return;
      if (event.type === "delta") { translations[event.language] = event.text; drawChatReply(entry, language); }
      if (event.type === "status") $("chat-translation-status").textContent = event.text;
    });
    if (token !== sessionToken || epoch !== chatLanguageEpoch) return;
    // Remove draft text if final validation rejected the translation.
    entry.answer.translations = result.translations;
    entry.answer.notice = result.notice;
    entry.streaming = false;
  }
  if (epoch === chatLanguageEpoch && token === sessionToken) drawChatReply(entry, language);
}
$("chat-language").onchange = async () => {
  const language = $("chat-language").value;
  const epoch = ++chatLanguageEpoch;
  const sessionToken = token;
  $("question").placeholder = language === "hi" ? "अपनी कुंडली के बारे में पूछें…" : "Ask about your chart…";
  $("chat-translation-status").textContent = "Updating conversation…";
  // Show cached translations immediately, before starting any generation.
  chatReplies.forEach(entry => drawChatReply(entry, language));
  try {
    for (const entry of [...chatReplies].reverse()) {
      if (entry.generating) continue;
      await updateChatReply(entry, language, epoch, sessionToken);
      if (epoch !== chatLanguageEpoch || token !== sessionToken) return;
    }
    if (epoch === chatLanguageEpoch) $("chat-translation-status").textContent = "";
  } catch (error) {
    if (epoch === chatLanguageEpoch) $("chat-translation-status").textContent = error.message;
  }
};
$("chat-form").onsubmit = async (e) => {
  e.preventDefault();
  const q = $("question").value.trim();
  if (!q || $("ask").disabled || !token) return;
  const chatToken = token;
  const division = $("division").value;
  const sourceLanguage = /[\u0900-\u097f]/.test(q) ? "hi" : "en";
  const questionNode = el("div", undefined, "message user");
  const userEntry = { node: questionNode, division, original: q, sourceLanguage, answer: { text: q, translations: { [sourceLanguage]: q } } };
  chatReplies.push(userEntry);
  $("messages").append(questionNode);
  drawChatReply(userEntry, sourceLanguage);
  $("question").value = "";
  $("ask").disabled = true;
  const requestedLanguage = $("chat-language").value;
  $("chat-translation-status").textContent = "Generating a concise answer…";
  const reply = el("div", undefined, "message");
  const entry = { node: reply, division, question: q, kind: "chart-answer", generating: true, streaming: true, answer: { text: "", translations: {} } };
  chatReplies.push(entry);
  $("messages").append(reply);
  try {
    const result = await apiStream("/api/chat-stream", { question: q, division, language: requestedLanguage }, event => {
      if (token !== chatToken) return;
      if (event.type === "status") $("chat-translation-status").textContent = event.text;
      if (event.type === "delta") {
        entry.answer.translations[event.language] = event.text;
        if (event.language === "en") entry.answer.text = event.text;
        drawChatReply(entry, $("chat-language").value);
      }
    });
    if (token !== chatToken) return;
    entry.answer = result; entry.original = result.translations.en;
    entry.generating = false; entry.streaming = false;
    drawChatReply(entry, $("chat-language").value);
    if ($("chat-language").value !== requestedLanguage) await updateChatReply(entry, $("chat-language").value, chatLanguageEpoch, chatToken);
    await updateChatReply(userEntry, $("chat-language").value, chatLanguageEpoch, chatToken);
  } catch (e) {
    if (token === chatToken) $("messages").append(el("div", e.message, "message error"));
  } finally {
    entry.generating = false; entry.streaming = false;
    $("ask").disabled = false;
    if (token === chatToken) $("chat-translation-status").textContent = "";
  }
};
document.addEventListener("languagechange", async (e) => {
  $("chat-language").value = e.detail;
  if (!token) return;
  $("chat-language").onchange();
  $("reading-mode").textContent =
    e.detail === "hi"
      ? "Real-time Hindi translation in progress…"
      : "Switching reading language…";
  const request = ++readingRequest;
  try {
    const result = await api("/api/language", { language: e.detail, division: $("division").value });
    if (request === readingRequest && current) showAnswer(result);
  } catch (error) {
    $("form-error").textContent = error.message;
  }
});
