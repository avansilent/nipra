(function () {
  var doc = document.documentElement;
  if (!doc) {
    return;
  }

  var storedTheme = null;
  try {
    storedTheme = window.localStorage.getItem("nipra-theme-v2");
  } catch (_error) {
    storedTheme = null;
  }

  var theme = storedTheme === "dark" || storedTheme === "light" ? storedTheme : "light";

  doc.dataset.theme = theme;
  doc.classList.toggle("dark", theme === "dark");
})();

(function () {
  var perf = window.performance || {};
  var proto = perf && typeof Object.getPrototypeOf === "function" ? Object.getPrototypeOf(perf) : null;

  function defineNoop(target, key, value) {
    if (!target || typeof target[key] === "function") {
      return;
    }

    try {
      Object.defineProperty(target, key, {
        configurable: true,
        writable: true,
        value: value,
      });
    } catch (_error) {
      try {
        target[key] = value;
      } catch (_assignError) {
        // Ignore write failures on locked browser objects.
      }
    }
  }

  defineNoop(perf, "getEntriesByName", function () {
    return [];
  });
  defineNoop(proto, "getEntriesByName", function () {
    return [];
  });

  defineNoop(perf, "mark", function () {});
  defineNoop(proto, "mark", function () {});

  defineNoop(perf, "measure", function (name) {
    return { name: name || "", entryType: "measure", startTime: 0, duration: 0 };
  });
  defineNoop(proto, "measure", function (name) {
    return { name: name || "", entryType: "measure", startTime: 0, duration: 0 };
  });

  defineNoop(perf, "clearMarks", function () {});
  defineNoop(proto, "clearMarks", function () {});

  defineNoop(perf, "clearMeasures", function () {});
  defineNoop(proto, "clearMeasures", function () {});

  if (!window.performance) {
    window.performance = perf;
  }
})();

(function () {
  var doc = document.documentElement;
  if (!doc) {
    return;
  }

  var nav = window.navigator || {};
  var connection = nav.connection || nav.mozConnection || nav.webkitConnection || null;
  var coarsePointer = false;
  var reducedMotion = false;

  try {
    coarsePointer = !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
    reducedMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  } catch (_error) {
    coarsePointer = false;
    reducedMotion = false;
  }

  var lowMemory = typeof nav.deviceMemory === "number" && nav.deviceMemory <= 4;
  var midMemory = typeof nav.deviceMemory === "number" && nav.deviceMemory <= 6;
  var lowCpu = typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency <= 4;
  var midCpu = typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency <= 8;
  var saveData = !!(connection && connection.saveData);
  var slowConnection = !!(connection && /2g/.test(connection.effectiveType || ""));

  doc.dataset.performanceMode =
    reducedMotion || lowMemory || lowCpu || saveData || slowConnection
      ? "lite"
      : coarsePointer || midMemory || midCpu
        ? "balanced"
        : "full";
})();
