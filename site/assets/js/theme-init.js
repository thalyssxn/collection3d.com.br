// Aplica o tema salvo antes de desenhar a página (evita piscar). Padrão do site: claro.
(function () {
  var t = 'light';
  try { var s = localStorage.getItem('c3d_theme_site'); if (s === 'light' || s === 'dark') t = s; } catch (e) { /* modo privado */ }
  document.documentElement.setAttribute('data-theme', t);
  document.documentElement.style.colorScheme = t;
})();
