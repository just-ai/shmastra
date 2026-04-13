(function(){
  var t = window.matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', t);
  window.matchMedia('(prefers-color-scheme:dark)').addEventListener('change', function(e) {
    document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
  });
})();
