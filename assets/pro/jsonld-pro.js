/* JSON-LD Studio — Pro ($19).
   Mounts a second studio on the page with the six schema types the free tier
   does not cover, reusable presets, and a bulk checker — and hands the buyer a
   single .html file containing the whole thing, which runs with no internet.

   The free studio above is untouched: this is additive, and it keeps its own
   state under its own storage keys. */
(function () {
  "use strict";

  var JB = window.JB;
  if (!JB || !JB.pro) return;
  var esc = JB.pro.escapeHtml;

  var PRESET_KEY = "jbt.jsonld.pro.presets";
  var STATE_KEY = "jbt.jsonld.pro.state";

  /* ---------------- the six Pro types ---------------- */

  var FIELDS = {
    Organization: [
      { id: "name", label: "Organization name *", chip: "name", ph: "Acme Inc.", required: true },
      { id: "url", label: "Website", chip: "url", type: "url", ph: "https://acme.com" },
      { id: "logo", label: "Logo URL", chip: "logo", type: "url", ph: "https://acme.com/logo.png" },
      { id: "description", label: "What does it do?", chip: "description", type: "textarea" },
      { id: "email", label: "Contact email", chip: "email", type: "email", ph: "hello@acme.com" },
      { id: "telephone", label: "Contact phone", chip: "telephone", ph: "+1 555 123 4567" },
      { id: "founded", label: "Year founded", chip: "foundingDate", ph: "2019" },
      { id: "sameAs", label: "Profile links (one per line)", chip: "sameAs", type: "textarea", ph: "https://linkedin.com/company/acme" }
    ],
    Article: [
      { id: "headline", label: "Headline *", chip: "headline", ph: "How we cut our build time in half", required: true },
      { id: "description", label: "Standfirst / summary", chip: "description", type: "textarea" },
      { id: "author", label: "Author name *", chip: "author.name", ph: "Jane Doe", required: true },
      { id: "publisher", label: "Publisher", chip: "publisher.name", ph: "Acme Inc." },
      { id: "datePublished", label: "Published", chip: "datePublished", type: "date", required: true },
      { id: "dateModified", label: "Last updated", chip: "dateModified", type: "date" },
      { id: "image", label: "Lead image URL", chip: "image", type: "url", ph: "https://acme.com/post.jpg" },
      { id: "url", label: "Article URL", chip: "mainEntityOfPage", type: "url", ph: "https://acme.com/blog/post" }
    ],
    Event: [
      { id: "name", label: "Event name *", chip: "name", ph: "Spring Tasting", required: true },
      { id: "startDate", label: "Starts *", chip: "startDate", type: "datetime-local", required: true },
      { id: "endDate", label: "Ends", chip: "endDate", type: "datetime-local" },
      { id: "mode", label: "How do people attend?", chip: "eventAttendanceMode", type: "select", options: [["Offline", "In person"], ["Online", "Online"], ["Mixed", "Both"]] },
      { id: "venue", label: "Venue name", chip: "location.name", ph: "The Old Hall" },
      { id: "street", label: "Street address", chip: "location.streetAddress", ph: "123 Main St" },
      { id: "city", label: "City", chip: "location.addressLocality", ph: "Portland" },
      { id: "region", label: "State / region", chip: "location.addressRegion", ph: "OR" },
      { id: "country", label: "Country", chip: "location.addressCountry", ph: "US" },
      { id: "onlineUrl", label: "Joining link (online events)", chip: "location.url", type: "url", ph: "https://acme.com/live" },
      { id: "price", label: "Ticket price", chip: "offers.price", ph: "25.00" },
      { id: "currency", label: "Currency", chip: "offers.priceCurrency", ph: "USD", value: "USD" },
      { id: "ticketUrl", label: "Where to buy tickets", chip: "offers.url", type: "url", ph: "https://acme.com/tickets" }
    ],
    HowTo: [
      { id: "name", label: "What does it teach? *", chip: "name", ph: "How to season a cast iron pan", required: true },
      { id: "description", label: "Summary", chip: "description", type: "textarea" },
      { id: "totalTime", label: "How long does it take?", chip: "totalTime", ph: "45 minutes" },
      { id: "supply", label: "Things you need (one per line)", chip: "supply", type: "textarea", ph: "Cast iron pan\nFlaxseed oil" },
      { id: "tool", label: "Tools (one per line)", chip: "tool", type: "textarea", ph: "Oven\nLint-free cloth" },
      { id: "steps", label: "Steps, one per line *", chip: "step", type: "textarea", ph: "Scrub the pan clean and dry it fully.\nRub a thin coat of oil over every surface.", required: true }
    ],
    BreadcrumbList: [
      { id: "trail", label: "Trail, one per line *", chip: "itemListElement", type: "textarea", ph: "Home | https://acme.com\nShop | https://acme.com/shop\nMugs | https://acme.com/shop/mugs", required: true, help: "Name | URL — in order, from the home page down to this page." }
    ],
    WebSite: [
      { id: "name", label: "Site name *", chip: "name", ph: "Acme", required: true },
      { id: "url", label: "Site URL *", chip: "url", type: "url", ph: "https://acme.com", required: true },
      { id: "description", label: "One-line description", chip: "description", type: "textarea" },
      { id: "publisher", label: "Published by", chip: "publisher.name", ph: "Acme Inc." },
      { id: "searchUrl", label: "Search results URL pattern", chip: "potentialAction", type: "url", ph: "https://acme.com/search?q={search_term_string}", help: "Include {search_term_string} where the query goes. Leave blank if the site has no search." }
    ]
  };

  var TYPE_NOTES = {
    Organization: "The identity block for a company or non-profit. One per site, usually on the home page.",
    Article: "For a blog post or news story. Google reads headline, author, and dates.",
    Event: "For anything with a start time and a place — a class, a tasting, a gig.",
    HowTo: "For step-by-step instructions. Each step becomes its own entry.",
    BreadcrumbList: "The trail of pages above this one. Search engines show it instead of a bare URL.",
    WebSite: "Site-level identity, plus the search box some engines show under your result."
  };

  function lines(v) {
    return String(v || "").split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function isoFromLocal(v) {
    return v ? String(v).trim() : "";
  }

  /* ---------------- builders ---------------- */

  var BUILD = {
    Organization: function (f) {
      if (!f.name) return null;
      var d = { "@context": "https://schema.org", "@type": "Organization", name: f.name };
      if (f.url) d.url = f.url;
      if (f.logo) d.logo = f.logo;
      if (f.description) d.description = f.description;
      if (f.founded) d.foundingDate = f.founded;
      if (f.email || f.telephone) {
        d.contactPoint = { "@type": "ContactPoint", contactType: "customer support" };
        if (f.email) d.contactPoint.email = f.email;
        if (f.telephone) d.contactPoint.telephone = f.telephone;
      }
      var same = lines(f.sameAs);
      if (same.length) d.sameAs = same;
      return d;
    },
    Article: function (f) {
      if (!f.headline || !f.author || !f.datePublished) return null;
      var d = {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: f.headline,
        author: { "@type": "Person", name: f.author },
        datePublished: f.datePublished
      };
      if (f.description) d.description = f.description;
      if (f.dateModified) d.dateModified = f.dateModified;
      if (f.image) d.image = f.image;
      if (f.publisher) d.publisher = { "@type": "Organization", name: f.publisher };
      if (f.url) d.mainEntityOfPage = { "@type": "WebPage", "@id": f.url };
      return d;
    },
    Event: function (f) {
      if (!f.name || !f.startDate) return null;
      var d = {
        "@context": "https://schema.org",
        "@type": "Event",
        name: f.name,
        startDate: isoFromLocal(f.startDate)
      };
      if (f.endDate) d.endDate = isoFromLocal(f.endDate);
      var mode = f.mode || "Offline";
      d.eventAttendanceMode = "https://schema.org/" + mode + "EventAttendanceMode";
      if (mode === "Online") {
        if (f.onlineUrl) d.location = { "@type": "VirtualLocation", url: f.onlineUrl };
      } else {
        var addr = { "@type": "PostalAddress" };
        if (f.street) addr.streetAddress = f.street;
        if (f.city) addr.addressLocality = f.city;
        if (f.region) addr.addressRegion = f.region;
        if (f.country) addr.addressCountry = f.country;
        if (f.venue || Object.keys(addr).length > 1) {
          d.location = { "@type": "Place" };
          if (f.venue) d.location.name = f.venue;
          if (Object.keys(addr).length > 1) d.location.address = addr;
        }
        if (mode === "Mixed" && f.onlineUrl) {
          d.location = [d.location, { "@type": "VirtualLocation", url: f.onlineUrl }].filter(Boolean);
        }
      }
      if (f.price) {
        d.offers = { "@type": "Offer", price: f.price, priceCurrency: f.currency || "USD" };
        if (f.ticketUrl) d.offers.url = f.ticketUrl;
      }
      return d;
    },
    HowTo: function (f) {
      var steps = lines(f.steps);
      if (!f.name || !steps.length) return null;
      var d = { "@context": "https://schema.org", "@type": "HowTo", name: f.name };
      if (f.description) d.description = f.description;
      if (f.totalTime) d.totalTime = f.totalTime;
      var supply = lines(f.supply);
      if (supply.length) d.supply = supply.map(function (s) { return { "@type": "HowToSupply", name: s }; });
      var tool = lines(f.tool);
      if (tool.length) d.tool = tool.map(function (s) { return { "@type": "HowToTool", name: s }; });
      d.step = steps.map(function (s, i) {
        return { "@type": "HowToStep", position: i + 1, text: s };
      });
      return d;
    },
    BreadcrumbList: function (f) {
      var rows = lines(f.trail).map(function (l) {
        var parts = l.split("|").map(function (p) { return p.trim(); });
        return { name: parts[0], url: parts[1] || "" };
      }).filter(function (r) { return r.name; });
      if (!rows.length) return null;
      return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: rows.map(function (r, i) {
          var item = { "@type": "ListItem", position: i + 1, name: r.name };
          if (r.url) item.item = r.url;
          return item;
        })
      };
    },
    WebSite: function (f) {
      if (!f.name || !f.url) return null;
      var d = { "@context": "https://schema.org", "@type": "WebSite", name: f.name, url: f.url };
      if (f.description) d.description = f.description;
      if (f.publisher) d.publisher = { "@type": "Organization", name: f.publisher };
      if (f.searchUrl && f.searchUrl.indexOf("{search_term_string}") >= 0) {
        d.potentialAction = {
          "@type": "SearchAction",
          target: { "@type": "EntryPoint", urlTemplate: f.searchUrl },
          "query-input": "required name=search_term_string"
        };
      }
      return d;
    }
  };

  /* ---------------- bulk checker (all ten types) ---------------- */

  var TYPE_RULES = {
    Product: [
      ["name", true, "Add a \"name\" — it becomes the product title in search."],
      ["offers", true, "Add an \"offers\" object with price and priceCurrency."],
      ["image", false, "An image is recommended for product results."]
    ],
    LocalBusiness: [["name", true, "Add the business name."], ["address", false, "An address is recommended."], ["telephone", false, "A phone number is recommended."]],
    Organization: [["name", true, "Add the organization name."], ["url", false, "A url is recommended."], ["logo", false, "A logo is recommended."]],
    Person: [["name", true, "Add a \"name\"."]],
    Article: [["headline", true, "Add a \"headline\"."], ["author", true, "Add an \"author\" with a name."], ["datePublished", true, "Add \"datePublished\" as an ISO date."], ["image", false, "A lead image is recommended."]],
    Event: [["name", true, "Add the event name."], ["startDate", true, "Add \"startDate\" as an ISO datetime."], ["location", true, "Add a \"location\" — a Place, or a VirtualLocation for online events."]],
    HowTo: [["name", true, "Add a \"name\"."], ["step", true, "Add a \"step\" array of HowToStep entries."]],
    WebSite: [["name", true, "Add the site name."], ["url", true, "Add the site url."]]
  };

  function checkNode(node, sharedContext) {
    var out = [];
    if (!node || typeof node !== "object" || Array.isArray(node)) {
      return [{ sev: "fail", label: "Node is a JSON object", detail: "Expected a single object.", fix: "Each block should be one JSON object, or an array of them." }];
    }
    var ctx = node["@context"] || sharedContext;
    var ctxStr = typeof ctx === "string" ? ctx : (ctx && ctx["@vocab"]) || (ctx ? JSON.stringify(ctx) : "");
    if (ctx && String(ctxStr).indexOf("schema.org") !== -1) out.push({ sev: "pass", label: "@context includes schema.org" });
    else out.push({ sev: "fail", label: "@context includes schema.org", detail: ctx ? "@context does not reference schema.org." : "No @context found.", fix: "Add \"@context\": \"https://schema.org\" at the top level." });

    var type = node["@type"];
    if (!type) {
      out.push({ sev: "fail", label: "@type is set", detail: "No @type on this node.", fix: "Add an \"@type\"." });
      return out;
    }
    var types = Array.isArray(type) ? type : [type];
    out.push({ sev: "pass", label: "@type is set", detail: types.join(", ") });

    var matched = false;
    types.forEach(function (t) {
      if (t === "FAQPage") {
        matched = true;
        var q = Array.isArray(node.mainEntity) ? node.mainEntity : null;
        var ok = q && q.length && q.every(function (i) {
          return i && i["@type"] === "Question" && i.name && i.acceptedAnswer && i.acceptedAnswer.text;
        });
        out.push(ok
          ? { sev: "pass", label: "mainEntity is Questions with acceptedAnswer.text" }
          : { sev: "fail", label: "mainEntity is Questions with acceptedAnswer.text", fix: "Every entry needs \"@type\": \"Question\", a name, and acceptedAnswer.text." });
        return;
      }
      if (t === "BreadcrumbList") {
        matched = true;
        var items = Array.isArray(node.itemListElement) ? node.itemListElement : null;
        var good = items && items.length && items.every(function (i) { return i && i.name && i.position; });
        out.push(good
          ? { sev: "pass", label: "itemListElement has positioned ListItems" }
          : { sev: "fail", label: "itemListElement has positioned ListItems", fix: "Each entry needs a position and a name." });
        return;
      }
      var rules = TYPE_RULES[t];
      if (!rules) return;
      matched = true;
      rules.forEach(function (r) {
        var present = node[r[0]] !== undefined && node[r[0]] !== null && node[r[0]] !== "";
        if (present) out.push({ sev: "pass", label: "Has " + r[0] + (r[1] ? "" : " (recommended)") });
        else out.push({ sev: r[1] ? "fail" : "warn", label: (r[1] ? "Has " : "") + r[0] + (r[1] ? "" : " is missing (recommended)"), fix: r[1] ? r[2] : "", detail: r[1] ? "" : r[2] });
      });
      if (t === "Product" && node.offers) {
        var offers = Array.isArray(node.offers) ? node.offers : [node.offers];
        var priced = offers.every(function (o) { return o && o.price !== undefined && o.priceCurrency; });
        out.push(priced
          ? { sev: "pass", label: "offers has price + priceCurrency" }
          : { sev: "fail", label: "offers has price + priceCurrency", fix: "Add priceCurrency (e.g. \"USD\") next to price." });
      }
    });
    if (!matched) out.push({ sev: "warn", label: "Unrecognized type — only structural checks ran", detail: types.join(", ") + " gets the @context and @type checks only." });
    return out;
  }

  /* Pulls every JSON-LD block out of a paste: raw JSON, an array, an @graph, or
     a whole page of <script type="application/ld+json"> tags. */
  function extractBlocks(raw) {
    var text = String(raw || "").trim();
    if (!text) return [];
    var blocks = [];
    var re = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    var m;
    while ((m = re.exec(text))) blocks.push(m[1].trim());
    if (!blocks.length) blocks.push(text);

    var nodes = [];
    blocks.forEach(function (b, i) {
      var parsed;
      try {
        parsed = JSON.parse(b);
      } catch (e) {
        nodes.push({ error: e.message, index: i + 1 });
        return;
      }
      var shared = (parsed && !Array.isArray(parsed)) ? parsed["@context"] : null;
      var list;
      if (parsed && !Array.isArray(parsed) && Array.isArray(parsed["@graph"])) list = parsed["@graph"];
      else if (Array.isArray(parsed)) list = parsed;
      else list = [parsed];
      list.forEach(function (n) { nodes.push({ node: n, context: shared, index: i + 1 }); });
    });
    return nodes;
  }

  /* ---------------- presets ---------------- */

  function loadPresets() {
    try { return JSON.parse(localStorage.getItem(PRESET_KEY) || "[]") || []; } catch (e) { return []; }
  }
  function savePresets(list) {
    try { localStorage.setItem(PRESET_KEY, JSON.stringify(list)); } catch (e) { /* ignore */ }
  }

  /* ---------------- the Pro studio UI ---------------- */

  var STYLE =
    "#jsonld-pro .pro-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:1.4rem;align-items:start}" +
    "@media(max-width:900px){#jsonld-pro .pro-grid{grid-template-columns:1fr}}" +
    "#jsonld-pro .pro-out pre{margin:0;padding:1.1rem 1.3rem;overflow:auto;max-height:30rem;font-size:.8rem;line-height:1.55;white-space:pre-wrap;word-break:break-word}" +
    "#jsonld-pro .pro-row{display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:1rem}" +
    "#jsonld-pro .pro-tabs{display:flex;gap:4px;padding:4px;margin-bottom:1.1rem;background:var(--bg-deep);border:1px solid var(--line-strong);border-radius:10px}" +
    "#jsonld-pro .pro-tab{flex:1;font-family:var(--font-mono);font-size:.72rem;letter-spacing:.06em;padding:9px 10px;border-radius:7px;border:1px solid transparent;background:transparent;color:var(--ink-dim);cursor:pointer;text-transform:uppercase}" +
    "#jsonld-pro .pro-tab.active{background:var(--accent);color:#14100a;font-weight:600}" +
    "#jsonld-pro .pro-note{color:var(--ink-faint);font-size:.82rem}" +
    "#jsonld-pro .bulk-row{display:flex;gap:10px;align-items:flex-start;padding:9px 0;border-bottom:1px solid var(--line)}" +
    "#jsonld-pro .bulk-row:last-child{border-bottom:0}" +
    "#jsonld-pro .bulk-row .tag{flex:0 0 54px;text-align:center}";

  var state = { type: "Organization", values: {}, tab: "generate" };

  try {
    var saved = JSON.parse(localStorage.getItem(STATE_KEY) || "null");
    if (saved && FIELDS[saved.type]) state = { type: saved.type, values: saved.values || {}, tab: "generate" };
  } catch (e) { /* ignore */ }

  function persist() {
    try { localStorage.setItem(STATE_KEY, JSON.stringify({ type: state.type, values: state.values })); } catch (e) { /* ignore */ }
  }

  function currentValues() {
    var out = {};
    (FIELDS[state.type] || []).forEach(function (f) {
      var el = document.getElementById("pro_" + f.id);
      out[f.id] = el ? el.value.trim() : "";
    });
    return out;
  }

  function fieldHtml(f) {
    var v = (state.values[state.type] || {})[f.id];
    if (v === undefined) v = f.value || "";
    var chip = f.chip ? '<span class="code-chip">' + esc(f.chip) + "</span>" : "";
    var input;
    if (f.type === "textarea") {
      input = '<textarea id="pro_' + f.id + '" rows="4" placeholder="' + esc(f.ph || "") + '">' + esc(v) + "</textarea>";
    } else if (f.type === "select") {
      input = '<select id="pro_' + f.id + '">' + f.options.map(function (o) {
        return '<option value="' + esc(o[0]) + '"' + (o[0] === v ? " selected" : "") + ">" + esc(o[1]) + "</option>";
      }).join("") + "</select>";
    } else {
      input = '<input type="' + (f.type || "text") + '" id="pro_' + f.id + '" placeholder="' + esc(f.ph || "") + '" value="' + esc(v) + '">';
    }
    return '<label class="field"><span class="lab">' + esc(f.label) + chip + "</span>" + input +
      (f.help ? '<div class="help">' + esc(f.help) + "</div>" : "") + "</label>";
  }

  function snippetFor(data) {
    return '<script type="application/ld+json">\n' + JSON.stringify(data, null, 2) + "\n<\/script>";
  }

  var lastSnippet = "";

  function renderOutput() {
    var out = document.getElementById("proOut");
    if (!out) return;
    var values = currentValues();
    state.values[state.type] = values;
    persist();
    var data = BUILD[state.type](values);
    if (!data) {
      lastSnippet = "";
      var required = (FIELDS[state.type] || []).filter(function (f) { return f.required; })
        .map(function (f) { return f.chip || f.id; }).join(", ");
      out.innerHTML = '<div style="padding:1.3rem" class="pro-note">Fill in the required fields (' + esc(required) + ") to generate JSON-LD.</div>";
      return;
    }
    lastSnippet = snippetFor(data);
    out.innerHTML = "<pre></pre>";
    out.querySelector("pre").textContent = lastSnippet;
  }

  function renderFields() {
    var host = document.getElementById("proFields");
    if (!host) return;
    host.innerHTML = (FIELDS[state.type] || []).map(fieldHtml).join("");
    (FIELDS[state.type] || []).forEach(function (f) {
      var el = document.getElementById("pro_" + f.id);
      if (el) el.addEventListener(f.type === "select" ? "change" : "input", renderOutput);
    });
    var note = document.getElementById("proTypeNote");
    if (note) note.textContent = TYPE_NOTES[state.type] || "";
    renderOutput();
  }

  function renderPresetList() {
    var sel = document.getElementById("proPresetList");
    if (!sel) return;
    var list = loadPresets();
    sel.innerHTML = '<option value="">— saved presets —</option>' + list.map(function (p, i) {
      return '<option value="' + i + '">' + esc(p.name) + " · " + esc(p.type) + "</option>";
    }).join("");
    sel.disabled = !list.length;
  }

  function runBulk() {
    var input = document.getElementById("proBulkInput");
    var out = document.getElementById("proBulkOut");
    if (!input || !out) return;
    var nodes = extractBlocks(input.value);
    if (!nodes.length) {
      out.innerHTML = '<p class="pro-note" style="padding:1rem 1.3rem">Paste one or more JSON-LD blocks — or a whole page of HTML — and press Check all.</p>';
      return;
    }
    var html = '<p class="pro-note" style="padding:1rem 1.3rem 0">' + nodes.length + " node" + (nodes.length === 1 ? "" : "s") + " found.</p><div style=\"padding:0 1.3rem 1.3rem\">";
    nodes.forEach(function (entry, i) {
      var title = "Node " + (i + 1) + (entry.node && entry.node["@type"] ? " — " + [].concat(entry.node["@type"]).join(", ") : "");
      html += '<h3 style="font-size:1rem;margin:1.2rem 0 .4rem">' + esc(title) + "</h3>";
      var items = entry.error
        ? [{ sev: "fail", label: "Valid JSON", detail: entry.error, fix: "Fix the syntax in block " + entry.index + "." }]
        : checkNode(entry.node, entry.context);
      items.forEach(function (it) {
        var cls = it.sev === "pass" ? "ok" : (it.sev === "warn" ? "warn" : "bad");
        var label = it.sev === "pass" ? "PASS" : (it.sev === "warn" ? "WARN" : "FAIL");
        html += '<div class="bulk-row"><span class="tag ' + cls + '">' + label + "</span><div>" +
          '<div style="font-size:.92rem">' + esc(it.label) + "</div>" +
          (it.detail ? '<div class="pro-note">' + esc(it.detail) + "</div>" : "") +
          (it.sev === "fail" && it.fix ? '<div class="pro-note">Fix: ' + esc(it.fix) + "</div>" : "") +
          "</div></div>";
      });
    });
    out.innerHTML = html + "</div>";
  }

  function mountStudio() {
    if (document.getElementById("jsonld-pro")) return;

    var style = document.createElement("style");
    style.textContent = STYLE;
    document.head.appendChild(style);

    var section = document.createElement("section");
    section.className = "section wrap";
    section.id = "jsonld-pro";
    section.innerHTML =
      '<div class="kicker">Pro studio</div>' +
      '<h2 style="margin-bottom:.4rem">Six more types, presets, and bulk checking</h2>' +
      '<p class="lede" style="margin-bottom:1.6rem">The free studio above still works exactly as it did. This is the Pro half.</p>' +
      '<div class="pro-tabs" role="tablist">' +
      '<button class="pro-tab active" type="button" data-tab="generate">Generate</button>' +
      '<button class="pro-tab" type="button" data-tab="bulk">Bulk check</button>' +
      "</div>" +
      '<div id="proGeneratePanel"><div class="pro-grid">' +
      '<div class="panel" style="padding:1.4rem">' +
      '<label class="field"><span class="lab">Schema type<span class="code-chip">@type</span></span>' +
      '<select id="proType">' + Object.keys(FIELDS).map(function (t) {
        return '<option value="' + t + '"' + (t === state.type ? " selected" : "") + ">" + t + "</option>";
      }).join("") + "</select>" +
      '<div class="help" id="proTypeNote"></div></label>' +
      '<div id="proFields"></div>' +
      '<div class="pro-row" style="margin-top:1rem">' +
      '<select id="proPresetList" style="flex:1;min-width:12rem"></select>' +
      '<button class="btn btn-sm" type="button" id="proPresetLoad">Load</button>' +
      '<button class="btn btn-sm" type="button" id="proPresetSave">Save as preset</button>' +
      '<button class="btn btn-sm" type="button" id="proPresetDelete">Delete</button>' +
      "</div></div>" +
      '<div class="panel pro-out" style="padding:0">' +
      '<div class="bench-head"><span><span class="dot"></span>Output</span>' +
      '<div class="bench-actions">' +
      '<button class="btn btn-sm" type="button" id="proCopy">Copy code</button>' +
      '<button class="btn btn-sm" type="button" id="proDownload">Download file</button>' +
      "</div></div><div id=\"proOut\"></div></div>" +
      "</div></div>" +
      '<div id="proBulkPanel" style="display:none"><div class="pro-grid">' +
      '<div class="panel" style="padding:1.4rem">' +
      '<label class="field"><span class="lab">Paste blocks, or a whole page of HTML<span class="code-chip">bulk</span></span>' +
      '<textarea id="proBulkInput" rows="14" placeholder="Paste several &lt;script type=&quot;application/ld+json&quot;&gt; blocks, a JSON array, or an @graph."></textarea>' +
      '<div class="help">Every block on the page is pulled out and checked separately.</div></label>' +
      '<button class="btn btn-primary" type="button" id="proBulkRun">Check all</button></div>' +
      '<div class="panel" style="padding:0"><div class="bench-head"><span><span class="dot"></span>Report</span></div>' +
      '<div id="proBulkOut"></div></div>' +
      "</div></div>";

    var anchor = document.querySelector(".pricing");
    anchor = anchor ? anchor.closest("section") : null;
    var deliver = document.getElementById("pro-delivery");
    var before = deliver || anchor;
    if (before && before.parentNode) before.parentNode.insertBefore(section, before);
    else document.querySelector("main").appendChild(section);

    section.querySelectorAll(".pro-tab").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var tab = btn.getAttribute("data-tab");
        section.querySelectorAll(".pro-tab").forEach(function (b) { b.classList.toggle("active", b === btn); });
        document.getElementById("proGeneratePanel").style.display = tab === "generate" ? "" : "none";
        document.getElementById("proBulkPanel").style.display = tab === "bulk" ? "" : "none";
      });
    });

    document.getElementById("proType").addEventListener("change", function () {
      state.type = this.value;
      renderFields();
      persist();
    });

    document.getElementById("proCopy").addEventListener("click", function () {
      if (!lastSnippet) { JB.toast("Fill in the required fields first"); return; }
      JB.copy(lastSnippet, "JSON-LD copied — paste it into your page's <head>");
    });
    document.getElementById("proDownload").addEventListener("click", function () {
      if (!lastSnippet) { JB.toast("Fill in the required fields first"); return; }
      JB.download("json-ld-" + state.type.toLowerCase() + ".html", lastSnippet, "text/html;charset=utf-8");
    });

    document.getElementById("proPresetSave").addEventListener("click", function () {
      var values = currentValues();
      if (!BUILD[state.type](values)) { JB.toast("Fill in the required fields before saving a preset"); return; }
      var name = window.prompt("Name this preset", state.type + " — " + (values.name || values.headline || "preset"));
      if (!name) return;
      var list = loadPresets();
      list.unshift({ name: name.slice(0, 60), type: state.type, values: values, at: new Date().toISOString() });
      savePresets(list.slice(0, 50));
      renderPresetList();
      JB.toast("Preset saved in this browser");
    });
    document.getElementById("proPresetLoad").addEventListener("click", function () {
      var sel = document.getElementById("proPresetList");
      var p = loadPresets()[parseInt(sel.value, 10)];
      if (!p) { JB.toast("Pick a preset first"); return; }
      state.type = p.type;
      state.values[p.type] = p.values;
      document.getElementById("proType").value = p.type;
      renderFields();
      JB.toast("Preset loaded");
    });
    document.getElementById("proPresetDelete").addEventListener("click", function () {
      var sel = document.getElementById("proPresetList");
      var idx = parseInt(sel.value, 10);
      var list = loadPresets();
      if (isNaN(idx) || !list[idx]) { JB.toast("Pick a preset first"); return; }
      list.splice(idx, 1);
      savePresets(list);
      renderPresetList();
      JB.toast("Preset deleted");
    });

    document.getElementById("proBulkRun").addEventListener("click", runBulk);

    renderFields();
    renderPresetList();
    runBulk();
  }

  /* ---------------- delivery ---------------- */

  function readmeTxt() {
    return [
      "JSON-LD Studio — Pro",
      "Built " + new Date().toLocaleString(),
      "",
      "  json-ld-studio-pro.html   The whole studio in one file. Open it in any browser.",
      "                            It works with no internet connection: free generator,",
      "                            checker, the six Pro types, presets, and bulk checking.",
      "  presets.json              Your saved presets, exported. Keep it as a backup.",
      "",
      "The offline copy stores its presets in the browser you open it in, the same way",
      "the site does. Nothing it holds is sent anywhere.",
      "",
      "Types covered: LocalBusiness, Product, FAQPage, Person (free studio) plus",
      "Organization, Article, Event, HowTo, BreadcrumbList, WebSite (Pro studio).",
      "",
      "Questions: contact@nymrel.com",
      ""
    ].join("\n");
  }

  JB.pro.register("jsonld-pro", {
    label: "JSON-LD Studio Pro",
    filenameLabel: "the studio",
    summary: "The Pro studio is now open on this page, and the same thing is yours as one offline file.",
    contents: [
      "json-ld-studio-pro.html — the whole studio in a single file that runs with no internet",
      "All ten types: the four free ones plus Organization, Article, Event, HowTo, BreadcrumbList, WebSite",
      "Reusable presets — save a filled-in form and load it on the next page",
      "Bulk check — paste a whole page of HTML and every JSON-LD block in it gets its own report",
      "presets.json — an export of whatever presets you have saved"
    ],
    onRender: mountStudio,
    build: function () {
      return JB.pro.buildOfflineApp({
        title: "JSON-LD Studio Pro — offline",
        module: "jsonld-pro",
        note: "Offline copy — JSON-LD Studio Pro. No internet needed."
      }).then(function (html) {
        return {
          filename: "json-ld-studio-pro.zip",
          toast: "Studio downloaded — open json-ld-studio-pro.html in any browser",
          files: [
            { name: "json-ld-studio-pro.html", text: html },
            { name: "presets.json", text: JSON.stringify(loadPresets(), null, 2) + "\n" },
            { name: "README.txt", text: readmeTxt() }
          ]
        };
      });
    }
  });

  /* In the offline copy there is no checkout, so mount straight away. */
  if (window.JB_PRO_OFFLINE) mountStudio();
})();
