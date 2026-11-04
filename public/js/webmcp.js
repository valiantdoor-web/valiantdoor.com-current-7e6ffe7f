/*
 * Valiant Garage Door - WebMCP tools
 * Exposes client-side "tools" so browser-based AI agents can reliably
 * help visitors get business info, check the service area, request
 * service guidance, open the booking page, or hand off to a dialer. Uses the draft
 * document.modelContext API with feature detection and an idempotency
 * guard so it is safe to load on every page (and more than once).
 *
 * Spec: https://webmachinelearning.github.io/webmcp/
 */
(function () {
  "use strict";

  // Only register once per document, even if loaded twice.
  if (window.__valiantWebMCP) return;

  var mc = typeof document !== "undefined" && document.modelContext;
  // Feature detection: requires a secure context and modelContext support.
  if (!mc || typeof mc.registerTool !== "function") return;

  window.__valiantWebMCP = { registered: [], failed: [] };

  var BUSINESS = {
    name: "Valiant Garage Door",
    phone: "9254094974",
    phoneDisplay: "(925) 409-4974",
    email: "vm@valiantdoor.com",
    license: "CA Contractor License #1160068",
    address: "3588 Pimlico Dr, Pleasanton, CA 94588",
    bookingUrl:
      "https://book.housecallpro.com/book/Valiant-garage-door/ae8e4a137c8c49b4b264073541533a7a?v2=true",
    quoteUrl: "https://www.valiantdoor.com/quote",
    emergency: "Phone and staffed storefront available 24/7. Dispatch depends on technician, route, and parts availability. Appointments at 7:00 PM or later have a $100 service charge before approved parts, repairs, conversions, or upgrades.",
    warranty: "See https://www.valiantdoor.com/warranty for applicable product, labor, and spring coverage and conditions.",
    reviewsUrl: "https://www.valiantdoor.com/reviews-and-proof",
    serviceAreas: [
      "Pleasanton",
      "Dublin",
      "Livermore",
      "Fremont",
      "San Ramon",
      "Danville",
      "Sunol"
    ]
  };

  function text(str) {
    return { content: [{ type: "text", text: str }] };
  }

  // Chrome does not validate inputSchema at execution time. Reject invalid
  // arguments before any navigation, dialog, network or contact side effect.
  function validate(schema, args) {
    if (!args || typeof args !== "object" || Array.isArray(args)) return "Input must be an object.";
    var props = schema.properties || {};
    if (Object.keys(args).some(function (key) { return !Object.prototype.hasOwnProperty.call(props, key); })) return "Unknown input property.";
    if ((schema.required || []).some(function (key) { return !Object.prototype.hasOwnProperty.call(args, key); })) return "Missing required input.";
    var invalid = Object.keys(args).some(function (key) {
      var rule = props[key], value = args[key];
      return typeof value !== rule.type ||
        (rule.type === "string" && (!value.trim() || value.length > (rule.maxLength || 500))) ||
        (rule.enum && rule.enum.indexOf(value) === -1);
    });
    return invalid ? "Invalid input value. Check the tool input schema." : "";
  }

  function register(def) {
    var run = def.execute;
    def.execute = function (args, options) {
      var error = validate(def.inputSchema, args === undefined ? {} : args);
      if (error) return { error: error };
      if (options && options.signal && options.signal.aborted) return { error: "Operation cancelled." };
      return run(args || {});
    };
    def.annotations = def.annotations || { readOnlyHint: true, consequentialHint: false };
    function failed() { window.__valiantWebMCP.failed.push(def.name); }
    try {
      var r = mc.registerTool(def);
      if (r && typeof r.then === "function") {
        r.then(function () { window.__valiantWebMCP.registered.push(def.name); }, failed);
      } else window.__valiantWebMCP.registered.push(def.name);
    } catch (e) { failed(); }
  }

  function confirmed(message) {
    // Hints are metadata, not approval enforcement. Require a real in-page
    // user confirmation as well; fail closed if dialogs are unavailable.
    try {
      return typeof window.confirm === "function" && window.confirm(message) === true;
    } catch (e) {
      return false;
    }
  }

  // 1) Business info -----------------------------------------------------
  register({
    name: "get_valiant_business_info",
    description:
      "Get Valiant Garage Door's contact details, address, hours, service area, review-source link, and warranty policy. Use this to answer questions about the business.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    execute: function () {
      return text(
        [
          BUSINESS.name,
          "Phone: " + BUSINESS.phoneDisplay + " (" + BUSINESS.phone + ")",
          "Email: " + BUSINESS.email,
          "Address: " + BUSINESS.address,
          "Reviews and proof: " + BUSINESS.reviewsUrl,
          "Service area: " + BUSINESS.serviceAreas.join(", ") + " and nearby East Bay communities.",
          "Emergency: " + BUSINESS.emergency,
          "Warranty: " + BUSINESS.warranty,
          "Book online: " + BUSINESS.bookingUrl
        ].join("\n")
      );
    }
  });

  // 2) Service-area check ------------------------------------------------
  register({
    name: "check_valiant_service_area",
    description:
      "Check whether a city is in Valiant Garage Door's core service area. This does not confirm technician availability or book a visit.",
    inputSchema: {
      type: "object",
      properties: {
        city: {
          type: "string", minLength: 1, maxLength: 100,
          description: "The city or town to check, e.g. 'Dublin' or 'Fremont'."
        }
      },
      required: ["city"],
      additionalProperties: false
    },
    execute: function (args) {
      var city = String((args && args.city) || "").trim();
      if (!city) return text("Please provide a city to check.");
      var match = BUSINESS.serviceAreas.filter(function (c) {
        return c.toLowerCase() === city.toLowerCase();
      })[0];
      if (match) {
        return text(
          match +
            " is a core service area for Valiant Garage Door. Dispatch remains subject to technician, route, and parts availability. Book online at " +
            BUSINESS.bookingUrl +
            " or call " +
            BUSINESS.phoneDisplay +
            "."
        );
      }
      return text(
        city +
          " is outside our immediate service areas (" +
          BUSINESS.serviceAreas.join(", ") +
          "), but we may accept nearby East Bay exceptions depending on schedule and route. Call " +
          BUSINESS.phoneDisplay +
          " to confirm."
      );
    }
  });

  // 3) Open the provider booking page; never create a booking here.
  register({
    name: "book_valiant_estimate",
    description: "Open the official booking page after user confirmation. No appointment is created by this tool; the user must complete the provider booking flow.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: false, consequentialHint: true },
    execute: function () {
      if (!confirmed("Open Valiant Garage Door's official booking page? No appointment will be booked until you complete and confirm the booking there.")) {
        return { status: "cancelled", bookingUrl: BUSINESS.bookingUrl, booked: false };
      }
      var opened = false;
      try {
        var tab = window.open("about:blank", "_blank");
        if (tab) { tab.opener = null; tab.location.href = BUSINESS.bookingUrl; opened = true; }
      } catch (e) {}
      return { status: opened ? "booking_page_opened" : "open_not_confirmed", bookingUrl: BUSINESS.bookingUrl, booked: false };
    }
  });

  // 4) A telephone handoff is consequential; never claim call connection.
  register({
    name: "call_valiant",
    description: "Hand off to the phone dialer after explicit user confirmation. This tool cannot confirm that a call connected or that a technician is available.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: false, consequentialHint: true },
    execute: function () {
      if (!confirmed("Open your phone dialer for Valiant Garage Door at " + BUSINESS.phoneDisplay + "?")) return { status: "cancelled", phone: BUSINESS.phoneDisplay, connected: false };
      try {
        window.location.href = "tel:" + BUSINESS.phone;
        return { status: "dialer_handoff_requested", phone: BUSINESS.phoneDisplay, connected: false };
      } catch (e) {
        return { status: "handoff_failed", phone: BUSINESS.phoneDisplay, connected: false };
      }
    }
  });

  // 5) Route guidance only. No lead, customer, message, call, or booking is created.
  register({
    name: "request_valiant_service",
    description: "Prepare service contact guidance for the user to review. This does not send a request, call the business, or book an appointment.",
    inputSchema: {
      type: "object",
      properties: {
        issue: { type: "string", minLength: 1, maxLength: 500, description: "The garage door problem or service needed." },
        city: { type: "string", minLength: 1, maxLength: 100, description: "City where service is needed." },
        urgency: { type: "string", enum: ["emergency", "same_day", "flexible"], default: "flexible", description: "How soon service is requested." }
      },
      required: ["issue"],
      additionalProperties: false
    },
    execute: function (args) {
      return {
        status: "guidance_only", submitted: false, booked: false,
        issue: args.issue.trim(), city: args.city ? args.city.trim() : null,
        urgency: args.urgency || "flexible",
        nextStep: args.urgency === "emergency" ? "User may call to request urgent service; dispatch is not guaranteed." : "User may open the booking page and review available appointments.",
        phone: BUSINESS.phoneDisplay, bookingUrl: BUSINESS.bookingUrl,
        availability: BUSINESS.emergency
      };
    }
  });
})();
