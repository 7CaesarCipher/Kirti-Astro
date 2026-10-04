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
function southIndianGrid(c, isTransit = false) {
  const grid = el("div", undefined, "chart-grid");
  grid.setAttribute(
    "aria-label",
    (isTransit ? "Transit" : "Birth") + " D" + c.division + " chart; natal ascendant " + c.ascendant,
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
      cell.append(el("div", (isTransit ? "Birth Asc " : "Asc ") + angle(c.ascendant_mapping.mapped_degree), "planet-names"));
    }
    c.planets.filter(p => p.sign_index === i).forEach(p => {
      const placement = el("div", abbreviations[p.name] + (p.retrograde ? " ℞" : "") + " " + angle(p.mapping.mapped_degree), "planet-names");
      placement.title = p.name + (p.retrograde ? " — retrograde (apparent backward motion)" : "") + (isTransit ? "; transit zodiac: " : "; natal: ") + p.mapping.natal_position;
      cell.append(placement);
    });
    grid.append(cell);
  });
  const center = el("div", (isTransit ? "Transit D" : "D") + c.division, "center");
  center.append(el("small", c.ascendant + (isTransit ? " natal rising" : " rising")));
  grid.append(center);
  return grid;
}
function northIndianChart(c, isTransit = false) {
  const ns = "http://www.w3.org/2000/svg";
  const panel = el("div", undefined, "north-indian-chart");
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 400 400"); svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", (isTransit ? "Transit " : "Birth ") + "D" + c.division + " North Indian chart; fixed houses; natal Lagna " + c.ascendant);
  const title = document.createElementNS(ns, "title"); title.textContent = "D" + c.division + " · " + c.ascendant + " Lagna"; svg.append(title);
  const path = document.createElementNS(ns, "path");
  path.setAttribute("d", "M1 1H399V399H1Z M1 1L399 399 M399 1L1 399 M200 1L399 200L200 399L1 200Z");
  path.setAttribute("fill", "#fafbf7"); path.setAttribute("stroke", "#344c3d"); svg.append(path);
  const centers = [[200,75],[100,30],[35,95],[85,190],[35,285],[100,350],[200,305],[300,350],[365,285],[315,190],[365,95],[300,30]];
  centers.forEach(([x,y],i) => {
    const signIndex = (c.ascendant_index+i)%12;
    const planets = c.planets.filter(p => p.house === i+1);
    const group = document.createElementNS(ns,"text"); group.setAttribute("x",x);group.setAttribute("y",y);group.setAttribute("text-anchor","middle");group.setAttribute("font-size",i%3===0 ? "10" : "8");
    const label = document.createElementNS(ns,"tspan"); label.setAttribute("x",x);label.setAttribute("font-weight","600");label.textContent = "H"+(i+1)+" · "+(signIndex+1)+" "+signs[signIndex].slice(0,3);group.append(label);
    const addLine = (text,description) => { const line=document.createElementNS(ns,"tspan");line.setAttribute("x",x);line.setAttribute("dy",11);line.setAttribute("font-size",i%3===0 ? "9" : "7");line.textContent=text;if(description){const tooltip=document.createElementNS(ns,"title");tooltip.textContent=description;line.append(tooltip);}group.append(line); };
    if(i===0) addLine((isTransit ? "Birth " + (c.referenceLabel || "Asc") + " " : (c.referenceLabel || "Asc") + " ")+angle(c.ascendant_mapping?.mapped_degree ?? c.ascendant_degree),c.referenceLabel ? "Natal " + c.referenceLabel + " reference" : "Natal Lagna reference");
    planets.forEach(p => addLine(abbreviations[p.name]+(p.retrograde ? " ℞" : "")+" "+angle(p.mapping?.mapped_degree ?? p.degree),p.name+": "+p.sign+", house "+(i+1)+(p.mapping ? "; original zodiac position: "+p.mapping.natal_position : "")));
    svg.append(group);
  });
  panel.append(svg);
  panel.append(el("p", "North Indian style · houses stay fixed; numbers 1–12 identify zodiac signs. "+(isTransit ? "Transit houses use the natal Lagna." : (c.referenceLabel ? c.referenceLabel + " reference is in the top diamond." : "Lagna is in the top diamond.")), "small"));
  return panel;
}
function zodiacGrid(c, isTransit = false) { return northIndianChart(c, isTransit); }
function chartView(c) {
  const card = el("section", undefined, "card chart-card");
  card.append(el("h3", c.label || "D" + c.division + " · " + names[c.division]));
  card.append(el("p", c.description || chartSummaries[c.division], "chart-summary"));
  if (c.birthplace) {
    const place = c.birthplace;
    const coordinates = el("div", undefined, "birthplace-coordinates");
    coordinates.append(el("p", place.label, "small"));
    coordinates.append(el("p", "Birthplace latitude: " + place.latitude + "° · longitude: " + place.longitude + "°", "small"));
    coordinates.append(el("p", "Timezone: " + place.timezone + " · Source: " + place.provider, "small"));
    const source = el("a", "View location source"); source.href = place.source; source.target = "_blank"; source.rel = "noopener"; coordinates.append(source);
    card.append(coordinates);
  }
  const grid = zodiacGrid(c);
  card.append(grid);
  if (c.transit) {
    const separate = el("details", undefined, "transit-chart-panel");
    separate.append(el("summary","Transit chart"));
    separate.append(el("h4", "Transit chart · D" + c.division));
    separate.append(el("p", utcTime(c.transit.as_of) + " · houses relative to the natal ascendant", "small"));
    separate.append(zodiacGrid({ ...c, planets: c.transit.planets }, true));
    separate.append(el("p", c.transit.coordinate_note, "small"));
    const transitSummary = el("details", undefined, "transit-chart-summary");
    transitSummary.append(el("summary", "Transit chart summary"));
    c.transit.planets.forEach(p => transitSummary.append(el("p", p.name + ": " + p.sign + " " + angle(p.degree) + ", natal house " + p.house + (p.retrograde ? " · ℞" : ""), "small")));
    separate.append(transitSummary); card.append(separate);
    const transit = el("details", undefined, "chart-transits");
    transit.append(el("summary", "Transit zodiac · " + c.transit.as_of.slice(0, 10) + " UTC"));
    transit.append(el("p", "Snapshot: " + utcTime(c.transit.as_of) + ". Houses counted from " + c.transit.house_reference + ".", "small"));
    transit.append(el("p", c.transit.coordinate_note, "small"));
    const wrap = el("div", undefined, "table-wrap");
    const table = el("table");
    const head = el("tr");
    ["Planet", "Transit zodiac", "D" + c.division + " sign / angle", "Natal house"].forEach(text => head.append(el("th", text)));
    const thead = el("thead"); thead.append(head); table.append(thead);
    const body = el("tbody");
    c.transit.planets.forEach(p => {
      const row = el("tr");
      [p.name + (p.retrograde ? " ℞" : ""), p.mapping.natal_position, p.sign + " " + angle(p.degree), String(p.house)].forEach(text => row.append(el("td", text)));
      body.append(row);
    });
    table.append(body); wrap.append(table); transit.append(wrap);
    transit.append(el("p", "℞ means apparent backward motion. This snapshot is cached with your reading; generate a new reading to update it.", "small"));
    card.append(transit);
  }

  const angleHelp=el("details"); angleHelp.append(el("summary","Degrees and retrograde"));
  angleHelp.append(el("p", "℞ = retrograde: apparent backward motion as viewed from Earth. Each sign spans 0°–30°. " + (c.division === 1 ? "Angles show natal positions." : "Angles show progress through the natal subdivision scaled to 0°–30°; they are derived chart coordinates."), "small"));
  card.append(angleHelp);
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
  $("reading-mode").textContent = uiNotice(a.notice);

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
  reportEpoch++; reportBasePromise = new Map(); $("report-choice").value = "basic"; $("report-content").replaceChildren(); $("report-content").hidden = true; $("dashboard-content").hidden = false;
  $("calculation-mode").value="existing"; $("pyjhora-mode").hidden=true; $("existing-report-picker").hidden=false;
  jhoraReport = null; $("jhora-report").replaceChildren(); $("jhora-status").textContent = ""; $("jhora-print").hidden = true; $("jhora-export").hidden = true; $("jhora-year").value = Math.max(Number(current.generated_at.slice(0,4)), Number(current.profile.date.slice(0,4)) + 1);
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
  chooseReport().catch(error=>$("report-content").append(el("p",error.message)));
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
  const missing=(language==="both"?["en","hi"]:[language]).filter(lang=>!translations[lang]);
  if(missing.length) {
    entry.node.append(el("p",entry.streaming?"Translating…":uiNotice(entry.answer.notice)||"Translation unavailable. Original message shown.","small"));
    if(!entry.streaming&&!entry.generating){const retry=el("button","Retry translation","secondary");retry.type="button";retry.onclick=()=>updateChatReply(entry,$("chat-language").value,chatLanguageEpoch,token).catch(error=>{entry.streaming=false;entry.answer.notice=error.message;drawChatReply(entry,$("chat-language").value);});entry.node.append(retry);}
  } else if(uiNotice(entry.answer.notice))entry.node.append(el("p",uiNotice(entry.answer.notice),"small"));
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
    entry.answer.translations = {...translations,...result.translations};
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
      try { await updateChatReply(entry, language, epoch, sessionToken); } catch(error) { entry.streaming=false;entry.answer.notice=error.message;drawChatReply(entry,language); }
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
    await updateChatReply(userEntry, requestedLanguage, chatLanguageEpoch, chatToken);
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
    if($("chat-language").value!==requestedLanguage)await updateChatReply(userEntry, $("chat-language").value, chatLanguageEpoch, chatToken);
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

// Advanced reports use authenticated cached calculations, never model prose.
let jhoraReport = null;
const jhoraPredefined = [1,2,3,4,5,6,7,8,9,10,11,12,16,20,24,27,30,40,45,60,81,108,144];
jhoraPredefined.forEach(n => { const option = el("option", "D" + n + (names[n] ? " · " + names[n] : "")); option.value = n; $("jhora-division").append(option); });
function reportTable(headers, rows) {
  const wrap = el("div", undefined, "table-wrap"), table = el("table"), thead = el("thead"), header = el("tr");
  const format = value => Array.isArray(value) ? value.map(format).join(" / ") : typeof value === "number" ? (Number.isInteger(value) ? String(value) : value.toFixed(6)) : String(value ?? "");
  headers.forEach(text => header.append(el("th", text))); thead.append(header); table.append(thead);
  const body = el("tbody"); rows.forEach(values => { const row = el("tr"); values.forEach(value => row.append(el("td", format(value)))); body.append(row); }); table.append(body); wrap.append(table); return wrap;
}
function advancedChart(c) {
  const panel = el("section", undefined, "advanced-chart"); panel.append(el("h3", c.label));
  const p = c.birthplace; panel.append(el("p", p.label + " · latitude " + p.latitude + "° · longitude " + p.longitude + "°", "small"));
  const style = $("jhora-style").value;
  if (style === "south") {
    panel.append(southIndianGrid({ ...c, ascendant_mapping: { mapped_degree: c.ascendant_degree }, planets: c.planets.map(p => ({ ...p, mapping: { mapped_degree: p.degree, natal_position: p.sign + " " + angle(p.degree) } })) }));
  } else if (style === "north") {
    panel.append(northIndianChart(c));
  }
  panel.append(reportTable(["Planet","Zodiac sign","Angle","Whole-sign house",...(c.division===1 ? ["Longitude 0–360°","Nakshatra","Pada"] : [])],c.planets.map(p=>[(jhoraReport?.settings.language!=="en" ? p.display_name : p.name),(jhoraReport?.settings.language!=="en" ? p.display_sign : p.sign),p.degree,p.house,...(c.division===1 ? [p.longitude,p.nakshatra,p.pada] : [])])));
  panel.append(el("p",c.summary,"small")); return panel;
}
function renderJhoraReport(data, printAll = false) {
  const panel=$("jhora-report");panel.replaceChildren();
  panel.append(el("p",data.engine+" · "+data.settings.ayanamsa+" · mean nodes · birth-location timezone", "small"));
  panel.append(advancedChart(data.selected));
  appendChakraSelector(panel,data);
  const all=el("details");all.append(el("summary","All 23 predefined charts"));data.predefined.forEach(c=>{const detail=el("details");detail.append(el("summary",c.label+" · "+c.ascendant+" rising"));detail.append(advancedChart(c));all.append(detail);});panel.append(all);
  const chakraBox=el("section",undefined,"chakra-browser");chakraBox.append(el("h3","Chakras"));
  const selector=el("select");selector.setAttribute("aria-label","Choose PyJHora chakra");
  const available=[["Sudarshana","Sudarshana · Lagna / Moon / Sun"],["SapthaNaadi","Saptha Naadi"],["PanchaShalaka","Pancha Shalaka"],["SapthaShalaka","Saptha Shalaka"],["ChandraKalanala","Chandra Kalanala"],["Tripataki","Tripataki"],["SuryaKalanala","Surya Kalanala"],["Shoola","Shoola"],["Sarvatobadra","Sarvatobhadra"],["KaalaChakra","Kaala Chakra"],["KotaChakra","Kota Chakra"]];
  const empty=el("option","Choose a chakra");empty.value="";selector.append(empty);
  available.forEach(([value,label])=>{const option=el("option",label);option.value=value;selector.append(option);});
  const output=el("div");let request=0;
  const skyMode=el("select");skyMode.setAttribute("aria-label","Chakra time mode");
  [["natal","Birth chart"],["selected","Selected UTC time"],["live","Live sky · updates each minute"]].forEach(([value,label])=>{const o=el("option",label);o.value=value;skyMode.append(o);});
  const when=el("input");when.type="datetime-local";when.step="1";when.value=new Date().toISOString().slice(0,19);when.setAttribute("aria-label","Chakra UTC date and time");when.hidden=true;
  const update=async()=>{
    const id=++request,sessionToken=token;if(!selector.value){output.replaceChildren();return;}
    output.replaceChildren(el("p","Preparing chakra…"));
    try {const result=await api("/api/chakra",{name:selector.value,ayanamsa:data.settings.ayanamsa,language:data.settings.language,year:data.settings.year,...(skyMode.value!=="natal"?{moment:skyMode.value==="live"?new Date().toISOString():when.value+"Z"}:{})});
      if(id!==request||sessionToken!==token||!output.isConnected)return;
      output.replaceChildren();
      if(result.charts){output.append(sudarshanaWheel(result.charts));}
      else {
        const doc=new DOMParser().parseFromString(result.svg,"image/svg+xml");const svg=doc.documentElement;
        if(svg.localName!=="svg"||doc.querySelector("parsererror"))throw Error("Invalid chakra diagram.");
        svg.querySelectorAll("script,foreignObject,image").forEach(node=>node.remove());
        svg.querySelectorAll("*").forEach(node=>{for(const attr of [...node.attributes])if(attr.name.startsWith("on")||attr.name.includes("href"))node.removeAttribute(attr.name);});
        svg.setAttribute("role","img");svg.setAttribute("aria-label",selector.selectedOptions[0].textContent);svg.style.maxWidth="100%";svg.style.height="auto";output.append(document.importNode(svg,true));
      }
      output.append(el("p",(skyMode.value==="natal"?"Birth chart":"Current sky")+" · "+utcTime(result.as_of),"small"));
      output.append(reportTable(["Planet","Sign","Degree","House"],result.positions.map(p=>[p.name,p.sign,angle(p.degree),p.house])));
    }catch(error){if(id===request&&output.isConnected)output.replaceChildren(el("p",error.message));}
  };
  selector.addEventListener("change",update);when.addEventListener("change",update);
  skyMode.addEventListener("change",()=>{when.hidden=skyMode.value!=="selected";update();});
  const timer=setInterval(()=>{if(!chakraBox.isConnected){clearInterval(timer);return;}if(skyMode.value==="live"&&document.visibilityState==="visible"&&$("calculation-mode").value==="pyjhora")update();},60000);
  chakraBox.append(selector,skyMode,when,output);panel.append(chakraBox);
  if(data.annual)panel.append(advancedChart(data.annual));
  data.sections.forEach(section=>{const detail=el("details");detail.append(el("summary",section.name));if(section.status!=="calculated")detail.append(el("p","Not calculated: "+section.reason));else { const rows=section.rows;let shown=0;const container=el("div");const more=el("button","Show next 100 rows");more.type="button";const page=()=>{container.append(reportTable(section.headers,rows.slice(shown,shown+(printAll ? rows.length : 100))));shown+=(printAll ? rows.length : 100);more.hidden=shown>=rows.length;};page();more.addEventListener("click",page);detail.append(el("p",rows.length+" calculated rows", "small"),container,more);}panel.append(detail);});
  const calendar=el("details");calendar.append(el("summary","Gochara calendar · monthly BAV / SAV samples"));calendar.append(el("p","One sample per month for seven classical planets. Color indicates SAV points, not an event probability.","small"));
  const table=el("table"),head=el("tr");["Planet",...Array.from(new Set(data.transit_calendar.map(p=>p.date.slice(0,7))))].forEach(v=>head.append(el("th",v)));table.append(head);
  ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"].forEach(name=>{const row=el("tr");row.append(el("th",name));data.transit_calendar.filter(p=>p.planet===name).forEach(p=>{const cell=el("td",p.sign+" "+angle(p.degree)+(p.retrograde?" ℞":"")+" · H"+p.natal_house+" · BAV "+p.bav+" / SAV "+p.sav);cell.style.backgroundColor=p.sav>=30?"#e8f1e7":p.sav>=25?"#f4f1df":"#f5e9e5";cell.title=utcTime(p.date);row.append(cell);});table.append(row);});const wrap=el("div",undefined,"table-wrap");wrap.append(table);calendar.append(wrap);panel.append(calendar);
  data.limitations.forEach(text=>panel.append(el("p",text,"small")));$("jhora-print").hidden=false;$("jhora-export").hidden=false;
}
$("jhora-form").addEventListener("submit",async event=>{event.preventDefault();if(!current)return;const tokenAtStart=token;$("jhora-status").textContent="Calculating advanced report…";const button=event.currentTarget.querySelector('button[type="submit"]');button.disabled=true;try{const data=await api("/api/jhora",{division:$("jhora-custom").value||$("jhora-division").value,custom:Boolean($("jhora-custom").value),ayanamsa:$("jhora-ayanamsa").value,houses:$("jhora-houses").value,depth:$("jhora-depth").value,year:$("jhora-year").value,language:$("jhora-language").value});if(token!==tokenAtStart)return;jhoraReport=data;renderJhoraReport(data);$("jhora-status").textContent="Report calculated. "+data.sections.filter(s=>s.status!=="calculated").length+" sections could not be calculated.";}catch(error){$("jhora-status").textContent=error.message;}finally{button.disabled=false;}});
$("jhora-style").addEventListener("change",()=>{if(jhoraReport)renderJhoraReport(jhoraReport);});
$("jhora-print").addEventListener("click",()=>{if(!jhoraReport)return;const panel=$("jhora-workbench");panel.open=true;renderJhoraReport(jhoraReport,true);panel.classList.add("printing-report");panel.querySelectorAll("details").forEach(d=>d.open=true);window.print();panel.classList.remove("printing-report");renderJhoraReport(jhoraReport);});
$("jhora-export").addEventListener("click",()=>{if(!jhoraReport)return;const url=URL.createObjectURL(new Blob([JSON.stringify(jhoraReport,null,2)],{type:"application/json"}));const a=el("a");a.href=url;a.download="calculated-astro-report.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});

let reportEpoch = 0, reportBasePromise = new Map();
const reportGroups = [
  ["Birth chart and coordinates", [
    ["basic", "Basic Details"],
    ["nirayana", "Nirayana Longitudes · Lagna/Rasi, Moon/Chandra, Navamsa, Bhav Chalit"],
    ["d1", "Lagna / Rasi / Ascendant Kundli · D1"],
    ["moon", "Moon / Chandra Kundli"],
    ["d9", "Navamsa Kundli · D9"],
    ["bhava", "Nirayana Bhav Chalit · centred houses"],
    ["sayana", "Sayana Longitudes and Angular Aspects"],
    ["aspects", "Interpretation of Aspects · Page 1"],
    ["aspects2", "Interpretation of Aspects · Page 2"],
    ["aspects3", "Interpretation of Aspects · Page 3"],
    ["aspects4", "Interpretation of Aspects · Page 4"]
  ]],
  ["Shodashvarga", [
    ["varga1", "Shodashvarga Page 1 · Rasi, Hora, Drekkana, Chaturthamsa"],
    ["varga2", "Shodashvarga Page 2 · Saptamsa, Navamsa, Dasamsa, Dwadasamsa"],
    ["varga3", "Shodashvarga Page 3 · Shodasamsa, Vimsamsa, Chaturvimsamsa, Saptavimsamsa"],
    ["varga4", "Shodashvarga Page 4 · Trimsamsa, Khavedamsa, Akshavedamsa, Shashtiamsa"],
    ["varga-table", "Shodashvarga Table · compare all 16 charts"]
  ]],
  ["Strength, points and combinations", [["shadbala","Shadbala · six planetary strengths"],["ashtakavarga","Ashtakavarga · BAV, SAV, reductions and Pindas"],["yogas","Yoga combinations · D1"],["vimsopaka","Vimsopaka Bala"],["states","Planetary states · Baladi"]]],
  ["Dasha reports", [["vim-major","Vimshottari Mahadasha"],["vimshottari","Vimshottari Antardasha"],["vim-pratyantar","Vimshottari Pratyantar Dasha"],["yogini","Yogini Dasha"],["kalachakra","Kalachakra Dasha"],["narayana","Narayana Dasha"]]],
  ["General Predictions", [["general1","General Predictions Part 1 · personality and natal foundations"],["general2","General Predictions Part 2 · relationships, learning and home"],["general3","General Predictions Part 3 · career, money and timing"]]],
  ["Advanced and annual reports", [["arudha","Arudha Padas"],["karakas","Chara Karakas"],["lagnas","Special Lagnas"],["panchanga","Birth Panchanga and sunrise/sunset"],["varsh1","Varshphal · Page 1 · annual chart"],["varsh2","Varshphal · Page 2 · annual houses and placements"],["varsh3","Varshphal · Page 3 · solar and lunar return times"],["annual","Tajaka annual chart and Tithi Pravesha"],["transits","Gochara · transit scoring calendar"],["advanced","Advanced charts · 23 divisions and custom D1–D300"],["reading","Your selected chart reading"],["chat","Keep exploring · chart chat"]]]
];
reportGroups.forEach(([title,items])=>{const group=el("optgroup");group.label=title;items.forEach(([value,label])=>{const option=el("option",label);option.value=value;group.append(option);});$("report-choice").append(group);});
const vargaPages = {varga1:[1,2,3,4],varga2:[7,9,10,12],varga3:[16,20,24,27],varga4:[30,40,45,60]};
function natalReportChart(type) {
  const base=current.charts["1"];
  if(type==="moon") {
    const moon=base.planets.find(p=>p.name==="Moon");
    const planets=base.planets.map(p=>({...p,house:(p.sign_index-moon.sign_index+12)%12+1}));
    return {...base,label:"Moon / Chandra Kundli",referenceLabel:"Moon",description:"Signs and longitudes stay as in D1. Houses are counted from the natal Moon sign, not from the birth Lagna.",ascendant:moon.sign,ascendant_index:moon.sign_index,ascendant_mapping:moon.mapping,sensitive:false,transit:null,planets,summary:{text:"Chandra chart: "+moon.sign+" is the Moon reference in house 1.",placements:planets.map(p=>p.name+": "+p.sign+", Moon-reference house "+p.house)}};
  }
  const bhava=current.assessment.bhava_chalit;
  if(!bhava||bhava.status!=="calculated")return null;
  const planets=base.planets.map(p=>{const index=bhava.houses.findIndex(row=>((p.longitude-row[1][0]+360)%360)<((row[1][2]-row[1][0]+360)%360));if(index<0)throw Error("Unable to assign a Bhava house.");return {...p,house:index+1};});
  return {...base,label:"Nirayana Bhav Chalit",description:bhava.method+". Original D1 zodiac signs remain unchanged; house placement follows the package's Bhava boundaries.",transit:null,planets,summary:{text:"Bhav Chalit uses the same natal longitudes as D1, with "+bhava.method+".",placements:planets.map(p=>p.name+": "+p.sign+", Bhava house "+p.house)}};
}
function reportLongitudes(planets, tropical=false) {
  return reportTable(["Planet","Longitude 0–360°","Zodiac position",...(tropical?[]:["D1 house","Nakshatra","Pada"])],planets.map(p=>[p.name+(p.retrograde?" ℞":""),p.longitude,p.sign+" "+angle(p.degree),...(tropical?[]:[p.house,p.nakshatra,p.pada])]));
}
async function baseAdvancedReport(depth=2,year=Math.max(Number(current.generated_at.slice(0,4)),Number(current.profile.date.slice(0,4))+1)) {
  const key=depth+":"+year;
  if(!reportBasePromise.has(key)) {
    const cache=reportBasePromise;
    const promise=api("/api/jhora",{division:1,custom:false,depth,year,ayanamsa:"LAHIRI",houses:"W",language:"en"});
    cache.set(key,promise);promise.catch(()=>{if(cache.get(key)===promise)cache.delete(key);});
  }
  return reportBasePromise.get(key);
}
function appendReportSection(panel, section) {
  panel.append(el("h3",section.name));
  if(section.status!=="calculated"){panel.append(el("p","Not calculated: "+section.reason));return;}
  panel.append(reportTable(section.headers,section.rows));
}
async function chooseReport() {
  if(!current||$("calculation-mode").value!=="existing")return;
  const value=$("report-choice").value,epoch=++reportEpoch;
  const selected=$("report-choice").selectedOptions[0];
  const panel=$("report-content");panel.replaceChildren();
  const dashboard=["advanced","reading","chat"].includes(value);
  $("dashboard-content").hidden=!dashboard;panel.hidden=dashboard;
  if(dashboard) {
    if(value==="advanced"){$("calculation-mode").value="pyjhora";switchChartMode();return;}
    if(value==="reading")$("selected-reading-title").scrollIntoView({behavior:"smooth"});
    if(value==="chat"){$("explore-chat").open=true;$("explore-chat").scrollIntoView({behavior:"smooth"});}
    return;
  }
  panel.append(el("h2",selected.textContent));
  const place=current.profile.place;
  panel.append(el("p",current.profile.date+" · "+current.profile.time+" · "+place.label+" · latitude "+place.latitude+"° · longitude "+place.longitude+"°","small"));

  const charts=items=>{const grid=el("div",undefined,"report-chart-grid");items.forEach(c=>{if(c)grid.append(chartView(c));});panel.append(grid);};
  if(value==="basic") {
    const moon=current.planets.find(p=>p.name==="Moon");
    panel.append(reportTable(["Birth detail","Recorded / calculated value"],[
      ["Name",current.profile.name||"Not provided"],["Birth date",current.profile.date],["Birth time",current.profile.time],["Birthplace",place.label],["Latitude",place.latitude],["Longitude",place.longitude],["Timezone",place.timezone],["Birth Lagna",current.charts["1"].ascendant],["Moon sign",moon.sign],["Moon Nakshatra / Pada",moon.nakshatra+" / "+moon.pada]
    ]));
    const layout=el("div",undefined,"basic-chart-columns");
    const pairs=[[[current.charts["1"],"D1 · Main birth chart"],[natalReportChart("moon"),"Chandra · Moon chart"]],[[current.charts["9"],"D9 · Navamsa chart"],[natalReportChart("bhava"),"Nirayana Bhav Chalit"]]];
    pairs.forEach(pair=>{const column=el("div",undefined,"basic-chart-column");pair.forEach(([c,title])=>{const card=el("section",undefined,"card basic-chart-card");card.append(el("h3",title));if(c){card.dataset.chart=title;card.append(northIndianChart(c));if(c.description)card.append(el("p",c.description,"small"));}else card.append(el("p","Generate a new reading to include Bhav Chalit."));column.append(card);});layout.append(column);});
    panel.append(layout);appendChartFocus(panel,1,epoch);return;
  }

  if(value==="nirayana") {panel.append(reportLongitudes(current.planets));charts([current.charts["1"],natalReportChart("moon"),current.charts["9"],natalReportChart("bhava")]);return;}
  if(value==="d1"||value==="d9"){$("division").value=value.slice(1);$("division").dispatchEvent(new Event("change"));charts([current.charts[value.slice(1)]]);appendChartFocus(panel,Number(value.slice(1)),epoch);return;}
  if(value==="moon"||value==="bhava") {const c=natalReportChart(value);if(c)charts([c]);else panel.append(el("p","This Bhava calculation is unavailable in this reading. Generate a new reading."));return;}
  if(vargaPages[value]){charts(vargaPages[value].map(n=>current.charts[String(n)]));return;}
  if(value==="varga-table") {const divisions=Object.values(vargaPages).flat();panel.append(reportTable(["Planet / reference",...divisions.map(n=>"D"+n)],[["Ascendant",...divisions.map(n=>{const c=current.charts[String(n)];return c.ascendant+" "+angle(c.ascendant_mapping.mapped_degree);})],...current.planets.map(p=>[p.name,...divisions.map(n=>{const target=current.charts[String(n)].planets.find(q=>q.name===p.name);return target.sign+" "+angle(target.mapping.mapped_degree);})])]));return;}
  if(value==="sayana") {
    if(!current.tropical_planets){panel.append(el("p","Generate a new reading to include package-calculated Sayana positions."));return;}
    panel.append(el("p","Sayana uses tropical zodiac longitudes from Swiss Ephemeris. Nirayana uses the Lahiri sidereal zodiac. These coordinate systems are shown separately."));panel.append(reportLongitudes(current.tropical_planets,true));
    const planets=current.tropical_planets.filter(p=>!['Rahu','Ketu'].includes(p.name)),rows=[];
    for(let i=0;i<planets.length;i++)for(let j=i+1;j<planets.length;j++){const distance=Math.abs(((planets[i].longitude-planets[j].longitude+540)%360)-180);[[0,"Conjunction"],[60,"Sextile"],[90,"Square"],[120,"Trine"],[180,"Opposition"]].forEach(([target,name])=>{if(Math.abs(distance-target)<=5)rows.push([planets[i].name,planets[j].name,name,distance,Math.abs(distance-target)]);});}
    panel.append(el("h3","Geometric angular aspects · 5° orb"));panel.append(reportTable(["Planet","Planet","Aspect","Separation","Orb"],rows));return;
  }
  const a=current.assessment;
  if(value==="shadbala"){const order=a.shadbala.component_order;panel.append(reportTable(["Planet",...order,"Total virupas","Rupas"],a.shadbala.planets.map(p=>[p.planet,...order.map(k=>p.components_virupas[k]),p.total_virupas,p.total_rupas])));panel.append(el("p",a.shadbala.method,"small"));return;}
  if(value==="ashtakavarga"){const v=a.ashtakavarga;panel.append(reportTable(["Contributor",...signs],Object.entries(v.bav).map(([name,row])=>[name,...row]).concat([["SAV",...v.sav]])));[["Trikona reduction",v.trikona_reduced],["Ekadhipatya reduction",v.ekadhipatya_reduced]].forEach(([title,rows])=>{panel.append(el("h3",title),reportTable(["Planet",...signs],rows.slice(0,7).map((r,i)=>[a.shadbala.planets[i].planet,...r])));});panel.append(reportTable(["Planet","Rasi Pinda","Graha Pinda","Shodhya Pinda"],v.pindas.map(p=>[p.planet,p.rasi_pinda,p.graha_pinda,p.shodhya_pinda])));return;}
  if(value==="yogas"){panel.append(el("p",a.yogas.scope));panel.append(reportTable(["Yoga","Status","Rule"],a.yogas.checks.filter(y=>y.status!=="absent").map(y=>[y.name,y.status,y.rule])));return;}
  const pending=el("p","Loading calculated report…");panel.append(pending);
  try {
    if(value.startsWith("general")) {
      const result=await api("/api/report-reading",{part:Number(value.slice(-1))});
      if(epoch!==reportEpoch)return;pending.remove();
      panel.append(el("p","Fixed traditional interpretation from the stored D1 chart. Timing periods are symbolic candidates, not guaranteed event dates.","small"));
      result.text.split("\n").filter(Boolean).forEach(line=>panel.append(el("p",line)));
      return;
    }
    if(value.startsWith("varsh")) {
      const now=new Date(),birthYear=Number(current.profile.date.slice(0,4));
      let year=Math.max(now.getFullYear(),birthYear+1);
      let active=await baseAdvancedReport(2,year);
      if(!active.annual?.period_start)throw Error("Annual solar return dates could not be calculated.");
      if(new Date(active.annual.period_start)>now&&year>birthYear+1){year--;active=await baseAdvancedReport(2,year);}
      const periods=[];
      for(const [label,y] of [["Previous",year-1],["Current",year],["Next",year+1]]) {
        if(y<=birthYear||y>2100)continue;
        periods.push([label,y===year?active:await baseAdvancedReport(2,y)]);
      }
      if(epoch!==reportEpoch)return;pending.remove();
      panel.append(el("p","Tajaka annual periods run from one calculated solar return to the next. Reference location: "+place.label+". Dates below use UTC. D1 remains the birth-chart reference."));
      const picker=el("select");picker.setAttribute("aria-label","Choose annual period");
      periods.forEach(([label,d],i)=>{const option=el("option",label+" · "+utcTime(d.annual?.period_start)+" → "+utcTime(d.annual?.period_end));option.value=i;option.selected=label==="Current";picker.append(option);});
      const body=el("div");panel.append(picker,body);
      const render=()=>{
        body.replaceChildren();const [label,d]=periods[Number(picker.value)],c=d.annual;
        if(!c){body.append(el("p","Annual calculation unavailable."));return;}
        body.append(el("h3",label+" annual period"),el("p",utcTime(c.period_start)+" → "+utcTime(c.period_end)));
        if(value==="varsh1")body.append(advancedChart(c));
        if(value==="varsh2")body.append(reportTable(["Planet","Annual sign","Angle","Annual house","Natal D1 house"],c.planets.map(p=>[p.name,p.sign,angle(p.degree),p.house,current.charts["1"].planets.find(n=>n.name===p.name)?.house])));
        if(value==="varsh3")d.sections.filter(s=>s.name.startsWith("Tajaka")||s.name.startsWith("Tithi Pravesha")).forEach(s=>appendReportSection(body,s));
        body.append(el("h3","Annual chart summary"),el("p",c.summary));
        const location=c.calculation_location||place;
        body.append(el("p","Calculation location: "+location.label+" · latitude "+location.latitude+"° · longitude "+location.longitude+"° · "+location.timezone,"small"));
        if(c.reading) {
          body.append(el("p",c.reading.method,"small"));
          c.reading.topics.forEach(item=>{
            body.append(el("h4",item.topic),el("p",item.interpretation));
            const evidence=el("details");evidence.append(el("summary","Why this reading"));
            item.evidence.forEach(fact=>evidence.append(el("p",fact)));body.append(evidence);
          });
          body.append(el("p",c.reading.limitation,"small"));
        } else body.append(el("p","Detailed annual reading unavailable. Generate a fresh reading."));
      };picker.addEventListener("change",render);render();return;
    }
    const depth=value==="vim-major"?1:value==="vim-pratyantar"?3:2;
    const data=await baseAdvancedReport(depth);if(epoch!==reportEpoch)return;pending.remove();
    if(value.startsWith("aspects")) {
      const section=data.sections.find(s=>s.name.startsWith("Graha aspects"));
      const groups={aspects:["Sun","Moon","Mars"],aspects2:["Mercury","Jupiter","Venus"],aspects3:["Saturn","Rahu","Ketu"]};
      panel.append(el("p","D1 traditional Graha Drishti. Pages 1–3 group the planets; Page 4 gathers the complete aspect table. Interpretations describe symbolic relationships, not event predictions."));
      if(!section){panel.append(el("p","Aspect calculation unavailable."));return;}
      if(section.status!=="calculated"){appendReportSection(panel,section);return;}
      const rows=groups[value]?section.rows.filter(row=>groups[value].includes(row[0])):section.rows;
      appendReportSection(panel,{...section,rows});
      rows.forEach(([planet,signs,houses,targets])=>{
        const natal=current.charts["1"].planets.find(p=>p.name===planet);
        if(!natal)return;
        panel.append(el("p",planet+" is in "+natal.sign+" "+angle(natal.degree)+", D1 house "+natal.house+". Its traditional aspect reaches "+(houses.length?"house(s) "+houses.join(", "):"no listed houses")+". "+(targets.length?"Planets receiving this aspect: "+targets.join(", ")+". These placements are considered together in a traditional reading.":"No other planet receives this sign-based aspect.")));
      });
      return;
    }
    if(value==="transits"){panel.append(el("p","Monthly samples, not continuous transit windows. BAV and SAV are traditional point scores."));panel.append(reportTable(["UTC sample","Planet","Sign","Angle","Natal house","BAV","SAV"],data.transit_calendar.map(p=>[utcTime(p.date),p.planet,p.sign,p.degree,p.natal_house,p.bav,p.sav])));return;}
    if(value==="annual"){if(data.annual)panel.append(advancedChart(data.annual));data.sections.filter(s=>s.name.startsWith('Tajaka')||s.name.startsWith('Tithi Pravesha')).forEach(s=>appendReportSection(panel,s));return;}
    const prefixes={aspects:"Graha aspects",vimsopaka:"Vimsopaka",states:"Baladi",vimshottari:"Vimshottari","vim-major":"Vimshottari","vim-pratyantar":"Vimshottari",yogini:"Yogini",kalachakra:"Kalachakra",narayana:"Narayana",arudha:"Arudha",karakas:"Chara",lagnas:"Special",panchanga:"Birth Panchanga"};
    data.sections.filter(s=>s.name.startsWith(prefixes[value])).forEach(s=>appendReportSection(panel,s));

  } catch(error){if(epoch===reportEpoch){pending.remove();panel.append(el("p",error.message));}}
}
$("report-choice").addEventListener("change",()=>{chooseReport().catch(error=>{$("report-content").append(el("p",error.message));});});
$("print-selected-report").addEventListener("click",()=>{document.body.classList.add("printing-selected-report");const details=[...$("report-content").querySelectorAll("details")],states=details.map(d=>d.open);details.forEach(d=>d.open=true);window.print();details.forEach((d,i)=>d.open=states[i]);document.body.classList.remove("printing-selected-report");});

function appendChartFocus(panel,division,epoch) {
  const box=el("section",undefined,"chart-focus");
  box.append(el("h3","Key chart facts"));
  const cards=el("div",undefined,"focus-cards");
  const c=current.charts[String(division)];
  const render=items=>{cards.replaceChildren();items.forEach(item=>{const card=el("div",undefined,"stat");card.append(el("small",item.title),el("strong",item.text));cards.append(card);});};
  render([{title:"Lagna",text:c.ascendant},...c.planets.filter(p=>["Moon","Sun"].includes(p.name)).map(p=>({title:p.name,text:p.sign+" "+angle(p.mapping.mapped_degree)+" · house "+p.house}))]);
  box.append(cards);panel.insertBefore(box,panel.children[2]||null);
  api("/api/ui-focus",{division}).then(result=>{
    if(epoch!==reportEpoch)return;render(result.items);
  }).catch(()=>{});
}

function utcTime(value) {
  if(!value)return "Unavailable";
  const date=new Date(value);
  return Number.isNaN(date.getTime())?String(value):date.toISOString().slice(0,19).replace("T"," ")+" UTC";
}

$("pyjhora-mode").append($("jhora-workbench"));
function switchChartMode() {
  const packageMode=$("calculation-mode").value==="pyjhora";
  reportEpoch++;
  $("pyjhora-mode").hidden=!packageMode;
  $("existing-report-picker").hidden=packageMode;
  if(packageMode) {
    $("dashboard-content").hidden=true;$("report-content").hidden=true;
    $("jhora-workbench").open=true;
    if(current&&!jhoraReport&&!$("jhora-form").querySelector('button[type="submit"]').disabled)$("jhora-form").requestSubmit();
  } else {
    if($("report-choice").value==="advanced")$("report-choice").value="basic";
    chooseReport().catch(error=>{$("report-content").append(el("p",error.message));});
  }
}
$("calculation-mode").addEventListener("change",switchChartMode);

function appendChakraSelector(panel,data) {
  const section=el("section",undefined,"chakra-selector");
  section.append(el("h3","Chakras"));
  const button=el("button","Load all PyJHora chakras");button.type="button";
  const status=el("p",""),body=el("div");section.append(button,status,body);panel.append(section);
  button.addEventListener("click",async()=>{
    button.disabled=true;status.textContent="Preparing chakra views…";const startToken=token;
    try {
      const result=await api("/api/chakras",data.settings);if(token!==startToken||!section.isConnected)return;
      const picker=el("select");picker.setAttribute("aria-label","Choose a chakra");
      result.chakras.forEach((c,i)=>{const option=el("option",c.name);option.value=i;picker.append(option);});
      const view=el("div");body.replaceChildren(picker,view);
      const render=()=>{
        view.replaceChildren();const c=result.chakras[Number(picker.value)];view.append(el("h4",c.name));
        if(c.status!=="calculated"){view.append(el("p","Unavailable: "+c.reason));return;}
        if(c.image){const img=el("img");img.src=c.image;img.alt=c.name+" · D"+result.division;img.style.maxWidth="100%";img.style.height="auto";view.append(img);}
        if(c.charts){view.append(sudarshanaWheel(c.charts));const details=el("details");details.append(el("summary","Planet positions"));c.charts.forEach(chart=>details.append(reportTable([chart.label,"Sign","Degrees","House"],chart.planets.map(p=>[p.name,p.sign,angle(p.degree),p.house]))));view.append(details);}
        if(c.details)Object.entries(c.details).forEach(([key,value])=>view.append(el("p",key+": "+value)));
      };picker.addEventListener("change",render);render();
      status.textContent=result.chakras.filter(c=>c.status==="calculated").length+" of "+result.chakras.length+" chakra views available · D"+result.division;
      button.hidden=true;
    } catch(error){status.textContent=error.message;button.disabled=false;}
  });
}

function sudarshanaWheel(charts) {
  const ns="http://www.w3.org/2000/svg",svg=document.createElementNS(ns,"svg");
  svg.setAttribute("viewBox","0 0 1000 1000");svg.setAttribute("role","img");svg.setAttribute("aria-label","360 degree Sudarshana Chakra: concentric Lagna, Moon and Sun house rings");
  svg.style.width="100%";svg.style.maxWidth="950px";svg.style.background="#fff";
  const node=(tag,attrs,text)=>{const n=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));if(text!==undefined)n.textContent=text;svg.append(n);return n;};
  const point=(radius,degrees)=>[500+radius*Math.sin(degrees*Math.PI/180),500-radius*Math.cos(degrees*Math.PI/180)];
  const text=(radius,degrees,value,size=13,color="#243e32")=>{const [x,y]=point(radius,degrees);return node("text",{x,y,"text-anchor":"middle","dominant-baseline":"middle","font-size":size,fill:color},value);};
  const radii=[160,260,360,460];
  radii.forEach(r=>node("circle",{cx:500,cy:500,r,fill:"none",stroke:"#728475","stroke-width":1}));
  for(let h=0;h<12;h++){const a=point(160,h*30),b=point(460,h*30);node("line",{x1:a[0],y1:a[1],x2:b[0],y2:b[1],stroke:"#728475"});text(480,h*30,h*30+"°",12);}
  charts.forEach((chart,ring)=>{
    const inner=radii[ring],outer=radii[ring+1];
    for(let h=1;h<=12;h++) {
      const mid=(h-1)*30+15,sign=signs[(chart.ascendant_index+h-1)%12];
      text(outer-16,mid,"H"+h+" "+sign.slice(0,3),12);
      const planets=chart.planets.filter(p=>p.house===h);
      planets.forEach((p,i)=>{
        const degrees=(h-1)*30+p.degree;
        const radius=inner+22+(i%3)*18;
        const label=text(radius,degrees,p.name.slice(0,2)+" "+angle(p.degree),10,ring===0?"#285c40":ring===1?"#3159a1":"#a45622");
        const tooltip=document.createElementNS(ns,"title");tooltip.textContent=chart.label+": "+p.name+" · "+p.sign+" "+angle(p.degree)+" · house "+p.house;label.append(tooltip);
      });
    }
  });
  node("text",{x:500,y:460,"text-anchor":"middle","font-size":22,fill:"#243e32"},"Sudarshana Chakra");
  ["Inner: Lagna","Middle: Moon","Outer: Sun"].forEach((v,i)=>node("text",{x:500,y:495+i*26,"text-anchor":"middle","font-size":17,fill:"#243e32"},v));
  const panel=el("div");panel.append(svg,el("p","12 houses × 30° in each reference ring. Rings count houses from Lagna, Moon and Sun; signs and planetary degrees come from the selected PyJHora chart.","small"));return panel;
}

function sudarshanaWheel(charts) {
  const ns="http://www.w3.org/2000/svg",svg=document.createElementNS(ns,"svg");
  svg.setAttribute("viewBox","0 0 800 800");svg.setAttribute("role","img");svg.setAttribute("aria-label","360 degree Sudarshana Chakra: concentric Lagna, Moon and Sun reference rings");svg.style.maxWidth="100%";
  const node=(tag,attrs,text)=>{const n=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));if(text!==undefined)n.textContent=text;return n;};
  svg.append(node("title",{},"Sudarshana Chakra · 360° · inner Lagna, middle Moon, outer Sun"));
  const point=(r,angle)=>{const a=(angle-90)*Math.PI/180;return [400+r*Math.cos(a),400+r*Math.sin(a)];};
  const text=(r,angle,value,size=12,color="#253e31")=>{const [x,y]=point(r,angle);svg.append(node("text",{x,y,"text-anchor":"middle","dominant-baseline":"middle","font-size":size,fill:color},value));};
  svg.append(node("circle",{cx:400,cy:400,r:374,fill:"#fafbf7",stroke:"#344c3d"}));
  [85,180,275,370].forEach(r=>svg.append(node("circle",{cx:400,cy:400,r,fill:"none",stroke:"#344c3d"})));
  for(let h=0;h<12;h++){const [x1,y1]=point(85,h*30),[x2,y2]=point(370,h*30);svg.append(node("line",{x1,y1,x2,y2,stroke:"#839687"}));text(387,h*30,h*30+"°",10);}
  charts.forEach((c,ring)=>{
    const start=85+ring*95;
    for(let h=0;h<12;h++){
      const sign=signs[(c.ascendant_index+h)%12];
      text(start+15,h*30+15,"H"+(h+1)+" · "+sign.slice(0,3),ring===0?10:12);
      const planets=c.planets.filter(p=>p.house===h+1);
      planets.forEach((p,i)=>{
        const r=start+37+(i%4)*13,a=h*30+Math.max(3,Math.min(27,p.degree));
        const [x,y]=point(r,a),label=node("text",{x,y,"text-anchor":"middle","dominant-baseline":"middle","font-size":ring===0?9:11,fill:"#783b23"},p.name.slice(0,2)+(p.retrograde?" ℞":""));
        label.append(node("title",{},c.referenceLabel+" ring · "+p.name+" · "+p.sign+" "+angle(p.degree)+" · house "+p.house));svg.append(label);
      });
    }
  });
  svg.append(node("text",{x:400,y:375,"text-anchor":"middle","font-size":16,"font-weight":600},"Sudarshana"));
  ["Inner: Lagna","Middle: Moon","Outer: Sun"].forEach((label,i)=>svg.append(node("text",{x:400,y:397+i*18,"text-anchor":"middle","font-size":12},label)));
  const wrap=el("section",undefined,"sudarshana-wheel");wrap.append(svg,el("p","360° house-reference wheel · each sector spans 30°. Zodiac signs are counted separately from Lagna, Moon and Sun; hover over a planet for its exact degree.","small"));return wrap;
}

function uiNotice(notice) {
  if(!notice)return "";
  if(/AI interpretation|Fixed summary|Local Hindi translation; verify|हिंदी में गणना की गई कुंडली का सरल सार/i.test(notice))return "";
  if(/language model|OLLAMA_MODEL/i.test(notice))return "Showing the basic chart reading.";
  return notice;
}
