/* ===== CONFIGURAÇÃO (edite aqui) ===== */
// Fotos de palestra: coloque os arquivos na pasta "palestras" e liste os nomes abaixo.
// Exemplo: ["palestra-1.jpg", "palestra-2.jpg"]
const PALESTRAS = ["palestra-1.jpg", "palestra-2.jpg", "palestra-3.jpg"];

// WhatsApp para contratação, só números com DDI. Ex.: "5511999999999". Vazio = botão escondido.
const WHATSAPP = "5513996540972";
const WHATSAPP_MSG = "Oi, vi o media kit de palestras e quero convidar para um evento.";
/* ===================================== */

// temas (acordeão)
document.querySelectorAll('.theme-head').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.parentElement;
    const open = !item.classList.contains('open');
    item.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', open);
  });
});
document.querySelector('.theme')?.classList.add('open');
document.querySelector('.theme-head')?.setAttribute('aria-expanded', 'true');

// galeria
const gal = document.getElementById('gallery');
const lb = document.getElementById('lightbox');
if (PALESTRAS.length) {
  PALESTRAS.forEach(f => {
    const b = document.createElement('button');
    b.type = 'button';
    b.innerHTML = `<img src="/palestrante/palestras/${f}" alt="Palestrante em evento" loading="lazy">`;
    b.onclick = () => { lb.querySelector('img').src = `/palestrante/palestras/${f}`; lb.hidden = false; };
    gal.appendChild(b);
  });
} else {
  for (let i = 0; i < 3; i++) {
    gal.insertAdjacentHTML('beforeend', '<div class="vazio">Foto de palestra<br>(adicione em script.js)</div>');
  }
}
lb.addEventListener('click', () => lb.hidden = true);
document.addEventListener('keydown', e => { if (e.key === 'Escape') lb.hidden = true; });

// WhatsApp
if (WHATSAPP) {
  const a = document.getElementById('btn-wa');
  a.href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(WHATSAPP_MSG)}`;
  a.target = '_blank'; a.rel = 'noopener'; a.hidden = false;
}

// entrada suave
const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}), { threshold: .12 });
document.querySelectorAll('.timeline li, .format, .pull, .theme').forEach(el => {
  el.classList.add('reveal'); io.observe(el);
});
