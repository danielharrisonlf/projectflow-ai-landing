/* ============================================================
   ProjectFlow AI — inicialização
   ============================================================ */
(function () {
  "use strict";

  // tema persistido antes do primeiro paint
  var mode = PF.db.settings.theme;
  if (mode && mode !== "system") document.documentElement.setAttribute("data-theme", mode);

  window.addEventListener("hashchange", function () {
    PF.closeMenu();
    PF.closeOverlays();
    PF.renderApp();
  });

  // tema do sistema mudou e preferimos "system"
  if (window.matchMedia) {
    try {
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () {
        if (PF.db.settings.theme === "system") PF.refresh();
      });
    } catch (e) { /* navegadores antigos */ }
  }

  // atalho: "n" cria tarefa quando não há campo focado
  document.addEventListener("keydown", function (e) {
    if (e.key === "n" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      var tag = (document.activeElement && document.activeElement.tagName) || "";
      if (["INPUT", "TEXTAREA", "SELECT"].indexOf(tag) >= 0) return;
      if (document.querySelector(".modal, .drawer")) return;
      if (PF.can("task.create")) { e.preventDefault(); PF.ui.taskModal(); }
    }
  });

  if (!location.hash) location.hash = "#/dashboard";
  PF.renderApp();
})();
