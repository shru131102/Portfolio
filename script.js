(function () {
    var hasGSAP = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';
    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------------------------------------------------------
       SAFETY NET — page must never get stuck invisible
    --------------------------------------------------------- */
    var revealed = false;
    function forceReveal() {
        if (revealed) return;
        revealed = true;
        document.querySelectorAll('.reveal, .eyebrow.reveal-up, .hero-meta').forEach(function (el) {
            el.style.opacity = '1';
            el.style.transform = 'none';
        });
        document.querySelectorAll('.split-char').forEach(function (el) {
            el.style.opacity = '1';
            el.style.transform = 'none';
        });
        document.querySelectorAll('.growth-line path, #statPath').forEach(function (el) {
            el.style.strokeDashoffset = '0';
        });
        document.querySelectorAll('.stat-num').forEach(function (el) {
            el.textContent = el.getAttribute('data-target') + el.getAttribute('data-suffix');
        });
    }
    var safetyTimer = setTimeout(forceReveal, 2200);

    if (!hasGSAP || reducedMotion) {
        forceReveal();
        clearTimeout(safetyTimer);
        return;
    }

    try {
        gsap.registerPlugin(ScrollTrigger);

        /* -----------------------------------------------------
           SMOOTH SCROLL (Lenis <-> ScrollTrigger)
        ----------------------------------------------------- */
        var lenis = null;
        if (typeof Lenis !== 'undefined') {
            lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
            lenis.on('scroll', ScrollTrigger.update);
            gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
            gsap.ticker.lagSmoothing(0);
        }

        /* -----------------------------------------------------
           SPLIT HERO TEXT INTO CHARACTERS
        ----------------------------------------------------- */
        document.querySelectorAll('[data-line]').forEach(function (line) {
            var text = line.textContent;
            line.textContent = '';
            text.split('').forEach(function (ch) {
                var span = document.createElement('span');
                span.className = 'split-char';
                span.style.display = 'inline-block';
                span.textContent = ch === ' ' ? '\u00A0' : ch;
                line.appendChild(span);
            });
        });

        /* -----------------------------------------------------
           HERO LOAD-IN TIMELINE
        ----------------------------------------------------- */
        var heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } });
        heroTl
            .from('.split-char', { yPercent: 120, opacity: 0, duration: 0.8, stagger: 0.015 })
            .to('.eyebrow.reveal-up', { opacity: 1, duration: 0.5 }, '-=0.5')
            .to('#heroPath', { strokeDashoffset: 0, duration: 1.2, ease: 'power2.inOut' }, '-=0.5')
            .to('.hero-meta', { opacity: 1, duration: 0.5 }, '-=0.7');

        /* -----------------------------------------------------
           GENERIC SCROLL REVEALS
        ----------------------------------------------------- */
        gsap.utils.toArray('.reveal').forEach(function (el) {
            gsap.fromTo(el,
                { y: 24, opacity: 0 },
                {
                    y: 0, opacity: 1, duration: 0.8, ease: 'power3.out',
                    scrollTrigger: { trigger: el, start: 'top 92%', toggleActions: 'play none none reverse' }
                }
            );
        });

        /* -----------------------------------------------------
           STATS — pinned + scroll-scrubbed counters & chart
        ----------------------------------------------------- */
        var statTl = gsap.timeline({
            scrollTrigger: {
                trigger: '.stats-pin',
                start: 'top top',
                end: 'bottom bottom',
                scrub: 0.6
            }
        });
        statTl.to('#statPath', { strokeDashoffset: 0, ease: 'none' }, 0);

        document.querySelectorAll('.stat-num').forEach(function (el) {
            var target = parseFloat(el.getAttribute('data-target'));
            var suffix = el.getAttribute('data-suffix');
            var obj = { val: 0 };
            statTl.to(obj, {
                val: target, ease: 'none',
                onUpdate: function () { el.textContent = Math.round(obj.val) + suffix; }
            }, 0);
        });

        /* -----------------------------------------------------
           EXPERIENCE — sticky rail swap as cards pass center
        ----------------------------------------------------- */
        var railTitle = document.getElementById('railTitle');
        var railSub = document.getElementById('railSub');
        var railDate = document.getElementById('railDate');

        function updateRail(card) {
            var company = card.getAttribute('data-company');
            if (railTitle.textContent === company) return;
            railTitle.textContent = company;
            railSub.innerHTML = card.getAttribute('data-sub');
            railDate.textContent = card.getAttribute('data-date');
            gsap.fromTo([railTitle, railDate], { opacity: 0.3, y: 6 }, { opacity: 1, y: 0, duration: 0.4 });
        }

        var expCards = gsap.utils.toArray('.exp-card');

        function syncRailToScroll() {
            var center = window.innerHeight / 2;
            var closest = null;
            var closestDist = Infinity;
            expCards.forEach(function (card) {
                var rect = card.getBoundingClientRect();
                var cardCenter = rect.top + rect.height / 2;
                var dist = Math.abs(cardCenter - center);
                if (rect.bottom > 0 && rect.top < window.innerHeight && dist < closestDist) {
                    closestDist = dist;
                    closest = card;
                }
            });
            if (closest) updateRail(closest);
        }

        ScrollTrigger.addEventListener('refresh', syncRailToScroll);
        ScrollTrigger.create({
            trigger: '.experience',
            start: 'top bottom',
            end: 'bottom top',
            onUpdate: syncRailToScroll,
            onRefresh: syncRailToScroll
        });
        syncRailToScroll();

        expCards.forEach(function (card) {
            gsap.fromTo(card, { opacity: 0.4, y: 16 }, {
                opacity: 1, y: 0, duration: 0.6, ease: 'power2.out',
                scrollTrigger: { trigger: card, start: 'top 85%', toggleActions: 'play none none reverse' }
            });
        });

        /* -----------------------------------------------------
           CREDENTIALS — vertical wheel -> horizontal scroll
        ----------------------------------------------------- */
        var credRail = document.querySelector('.cred-rail');
        if (credRail) {
            credRail.addEventListener('wheel', function (e) {
                if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                    var atStart = credRail.scrollLeft <= 0 && e.deltaY < 0;
                    var atEnd = credRail.scrollLeft + credRail.clientWidth >= credRail.scrollWidth - 2 && e.deltaY > 0;
                    if (!atStart && !atEnd) {
                        credRail.scrollLeft += e.deltaY;
                        e.preventDefault();
                    }
                }
            }, { passive: false });
        }

        /* -----------------------------------------------------
           MAGNETIC BUTTON
        ----------------------------------------------------- */
        document.querySelectorAll('.magnetic-btn').forEach(function (el) {
            el.addEventListener('mousemove', function (e) {
                var rect = el.getBoundingClientRect();
                var relX = e.clientX - rect.left - rect.width / 2;
                var relY = e.clientY - rect.top - rect.height / 2;
                gsap.to(el, { x: relX * 0.3, y: relY * 0.5, duration: 0.4, ease: 'power2.out' });
            });
            el.addEventListener('mouseleave', function () {
                gsap.to(el, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
            });
        });

        /* -----------------------------------------------------
           SCROLL PROGRESS BAR
        ----------------------------------------------------- */
        gsap.to('#progressFill', {
            scaleX: 1, ease: 'none',
            scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: true }
        });
        gsap.set('#progressFill', { scaleX: 0 });

        /* -----------------------------------------------------
           REFRESH ONCE EVERYTHING (FONTS / ICONS) IS LOADED
        ----------------------------------------------------- */
        window.addEventListener('load', function () {
            ScrollTrigger.refresh();
            clearTimeout(safetyTimer);
            revealed = true;
        });

    } catch (err) {
        console.warn('Animation init failed, falling back to static layout:', err);
        forceReveal();
        clearTimeout(safetyTimer);
    }
})();
