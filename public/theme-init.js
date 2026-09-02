(function () {
  try {
    var savedTheme = localStorage.getItem("theme");
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle(
      "dark",
      savedTheme === "dark" || (!savedTheme && prefersDark),
    );
  } catch {
    // Keep the server-rendered light theme when storage is unavailable.
  }
})();
