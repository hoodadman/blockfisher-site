(function () {
  var root = document.documentElement;
  var themeButton = document.querySelector("[data-theme-toggle]");

  function applyTheme(theme) {
    root.dataset.theme = theme;
    if (themeButton) {
      var light = theme === "light";
      themeButton.setAttribute("aria-pressed", String(light));
      themeButton.setAttribute("aria-label", light ? "Switch to dark colours" : "Switch to light colours");
    }
  }

  applyTheme(root.dataset.theme || "dark");

  var glow = document.querySelector(".page-glow, .hero-glow");
  if (!glow) {
    glow = document.createElement("div");
    glow.className = "page-glow";
    glow.setAttribute("aria-hidden", "true");
  }
  document.body.prepend(glow);
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduceMotion) {
    window.addEventListener("pointermove", function (event) {
      if (event.pointerType === "touch") return;
      glow.style.left = event.clientX + "px";
      glow.style.top = event.clientY + "px";
    });
  }

  if (themeButton) {
    themeButton.addEventListener("click", function () {
      var next = root.dataset.theme === "light" ? "dark" : "light";
      applyTheme(next);
      try { localStorage.setItem("blockfisher-theme", next); } catch (e) {}
    });
  }

  var menuToggle = document.querySelector(".menu-toggle");
  var nav = document.getElementById("site-nav");
  if (menuToggle && nav) {
    menuToggle.addEventListener("click", function () {
      var open = document.body.classList.toggle("nav-open");
      menuToggle.setAttribute("aria-expanded", String(open));
    });
    nav.addEventListener("click", function (event) {
      if (event.target.closest("a")) {
        document.body.classList.remove("nav-open");
        menuToggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  document.querySelectorAll(".dropdown").forEach(function (dropdown) {
    var button = dropdown.querySelector(".menu-button");
    if (!button) return;
    button.addEventListener("click", function (event) {
      event.stopPropagation();
      var open = dropdown.classList.toggle("open");
      button.setAttribute("aria-expanded", String(open));
    });
  });

  document.addEventListener("click", function () {
    document.querySelectorAll(".dropdown.open").forEach(function (dropdown) {
      dropdown.classList.remove("open");
      var button = dropdown.querySelector(".menu-button");
      if (button) button.setAttribute("aria-expanded", "false");
    });
  });

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    document.querySelectorAll(".dropdown.open").forEach(function (dropdown) {
      dropdown.classList.remove("open");
      var button = dropdown.querySelector(".menu-button");
      if (button) button.setAttribute("aria-expanded", "false");
    });
    document.body.classList.remove("nav-open");
    if (menuToggle) menuToggle.setAttribute("aria-expanded", "false");
  });

  document.querySelectorAll("[data-open]").forEach(function (button) {
    button.addEventListener("click", function () {
      var name = button.getAttribute("data-open");
      var dialog = document.getElementById(name === "extension" ? "extension-dialog" : name);
      if (dialog && dialog.showModal) dialog.showModal();
    });
  });

  var tool = document.querySelector("[data-tool]");
  if (tool) {
    var ports = String(tool.getAttribute("data-ports") || "").split(",").map(function (port) {
      return port.trim();
    }).filter(Boolean);
    var missing = document.getElementById("tool-missing");

    function themeNow() {
      return root.dataset.theme === "light" ? "light" : "dark";
    }

    function tellTool() {
      if (!tool.contentWindow) return;
      tool.contentWindow.postMessage({ type: "blockfisher-theme", theme: themeNow() }, "*");
    }

    var remote = tool.getAttribute("data-src");

    function mountSrc(src) {
      tool.hidden = false;
      if (missing) missing.hidden = true;
      var url = new URL(src, location.href);
      url.searchParams.set("embed", "1");
      url.searchParams.set("theme", themeNow());
      tool.src = url.toString();
    }

    function giveUp() {
      tool.removeAttribute("src");
      tool.hidden = true;
      if (missing) missing.hidden = false;
    }

    function probe(src) {
      var ctrl = new AbortController();
      var timer = setTimeout(function () { ctrl.abort(); }, 2500);
      return fetch(src, { mode: "no-cors", signal: ctrl.signal })
        .finally(function () { clearTimeout(timer); });
    }

    function attempt(index) {
      if (index >= ports.length) {
        giveUp();
        return;
      }
      probe("http://127.0.0.1:" + ports[index] + "/").then(function () {
        mountSrc("http://127.0.0.1:" + ports[index] + "/");
      }).catch(function () { attempt(index + 1); });
    }

    if (remote) {
      mountSrc(remote);
    } else {
      attempt(0);
    }
    tool.addEventListener("load", tellTool);
    if (themeButton) themeButton.addEventListener("click", function () { setTimeout(tellTool, 0); });
  }

  var form = document.getElementById("book-form");
  if (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var error = document.getElementById("form-error");
      var data = new FormData(form);
      var name = String(data.get("name") || "").trim();
      var email = String(data.get("email") || "").trim();
      var story = String(data.get("story") || "").trim();
      var terms = form.querySelector('[name="terms"]').checked;
      if (!name || !email || !story || !terms || !email.includes("@")) {
        error.hidden = false;
        error.textContent = "Add your name, a real email, what happened, and confirm this is a request rather than a promise.";
        return;
      }
      error.hidden = true;
      var card = form.parentElement;
      card.innerHTML = '<h3>Request noted on this page only</h3><p class="success">Nothing was sent. When investigations are open, this form is the only place that booking lives: your name, what happened, and which parts of the case you ticked.</p>';
    });
  }
})();
