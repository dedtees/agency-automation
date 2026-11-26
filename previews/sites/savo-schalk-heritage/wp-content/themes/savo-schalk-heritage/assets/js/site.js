(function(){var b=document.body,t=document.querySelector('.ss-menu-toggle');
if(t){t.addEventListener('click',function(){var o=b.classList.toggle('ss-menu-open');t.setAttribute('aria-expanded',String(o));});
document.querySelectorAll('.ss-nav a').forEach(function(l){l.addEventListener('click',function(){b.classList.remove('ss-menu-open');t.setAttribute('aria-expanded','false');});});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&b.classList.contains('ss-menu-open')){b.classList.remove('ss-menu-open');t.setAttribute('aria-expanded','false');t.focus();}});}
var s=function(){b.classList.toggle('is-scrolled',window.scrollY>8);};window.addEventListener('scroll',s,{passive:true});s();})();
