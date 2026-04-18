// dom.js — interactions for dom.html
(function(){
    'use strict';

    // Reveal rows on scroll
    const rows = document.querySelectorAll('.domRow');
    const io = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if(e.isIntersecting) {
                e.target.classList.add('visible');
                io.unobserve(e.target);
            }
        });
    }, {threshold: 0.18});
    rows.forEach(r => io.observe(r));

    // Smooth anchor scrolling for hero
    document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener('click', e => {
            const href = a.getAttribute('href');
            if(href && href.startsWith('#')){
                const el = document.querySelector(href);
                if(el){
                    e.preventDefault();
                    el.scrollIntoView({behavior:'smooth',block:'start'});
                }
            }
        });
    });

    // Lightbox for gallery and image wrappers
    const lightbox = document.getElementById('domLightbox');
    function openLightbox(src, alt){
        lightbox.innerHTML = '';
        const img = document.createElement('img'); img.src = src; img.alt = alt || '';
        lightbox.appendChild(img);
        lightbox.style.display = 'flex';
        lightbox.setAttribute('aria-hidden','false');
    }
    function closeLightbox(){
        lightbox.style.display = 'none';
        lightbox.setAttribute('aria-hidden','true');
        lightbox.innerHTML = '';
    }

    // Open when clicking cards or image wrappers
    document.querySelectorAll('.domCard img, .domImageWrapper img').forEach(img=>{
        img.style.cursor = 'zoom-in';
        img.addEventListener('click', (ev)=>{
            openLightbox(img.src, img.alt);
        });
    });

    lightbox.addEventListener('click', closeLightbox);
    window.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeLightbox(); });

    // Accessibility: allow keyboard opening on focus+Enter
    document.querySelectorAll('.domCard img, .domImageWrapper img').forEach(img=>{
        img.tabIndex = 0;
        img.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ openLightbox(img.src,img.alt); } });
    });

})();
