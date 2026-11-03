/* Adage latin du jour */
(() => {
  const ADAGES = [
    ['Pacta sunt servanda', 'Les conventions doivent être respectées.'],
    ['Nemo auditur propriam turpitudinem allegans', 'Nul ne peut se prévaloir de sa propre turpitude.'],
    ['Nullum crimen, nulla poena sine lege', 'Pas de crime, pas de peine sans loi.'],
    ['Specialia generalibus derogant', 'Les règles spéciales dérogent aux règles générales.'],
    ['Lex posterior derogat priori', 'La loi postérieure déroge à la loi antérieure.'],
    ['Audi alteram partem', 'Entends l’autre partie.'],
    ['In dubio pro reo', 'Le doute profite à l’accusé.'],
    ['Non bis in idem', 'Nul ne peut être poursuivi deux fois pour les mêmes faits.'],
    ['Actori incumbit probatio', 'La preuve incombe au demandeur.'],
    ['Error communis facit jus', 'L’erreur commune fait le droit.'],
    ['Fraus omnia corrumpit', 'La fraude corrompt tout.'],
    ['Accessorium sequitur principale', 'L’accessoire suit le principal.'],
    ['Res judicata pro veritate habetur', 'La chose jugée est tenue pour vérité.'],
    ['Infans conceptus pro nato habetur', 'L’enfant conçu est tenu pour né chaque fois qu’il y va de son intérêt.'],
    ['Nemo plus juris ad alium transferre potest quam ipse habet', 'Nul ne peut transférer à autrui plus de droits qu’il n’en a lui-même.'],
    ['Dura lex, sed lex', 'La loi est dure, mais c’est la loi.'],
    ['Ubi lex non distinguit, nec nos distinguere debemus', 'Là où la loi ne distingue pas, il ne faut pas distinguer.'],
    ['Exceptio est strictissimae interpretationis', 'Les exceptions sont d’interprétation stricte.'],
    ['Nemo judex in causa sua', 'Nul ne peut être juge et partie.'],
    ['Contra non valentem agere non currit praescriptio', 'La prescription ne court pas contre celui qui ne peut agir.'],
    ['Res perit domino', 'La chose périt pour son propriétaire.'],
    ['Pater is est quem nuptiae demonstrant', 'Le père est celui que le mariage désigne.'],
    ['Electa una via, non datur recursus ad alteram', 'Une voie choisie, on ne peut recourir à l’autre.'],
    ['Mors omnia solvit', 'La mort dissout tout.'],
    ['Nemo censetur ignorare legem', 'Nul n’est censé ignorer la loi.'],
    ['Ad impossibilia nemo tenetur', 'À l’impossible nul n’est tenu.'],
    ['Lex mitior', 'La loi pénale plus douce s’applique immédiatement.'],
    ['A maiori ad minus', 'Qui peut le plus peut le moins.'],
    ['Ubi societas, ibi jus', 'Là où il y a une société, il y a du droit.'],
    ['Jura novit curia', 'Le juge connaît le droit.'],
  ];

  App.register({
    id: 'maxim', title: 'Adage', icon: 'quote', size: 'M',
    defaults: { offset: 0 },
    mount(ctx) {
      const d = ctx.data;
      const dayIndex = () => Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000);
      ctx.addAction('shuffle', 'Un autre', () => { d.offset++; ctx.save(); draw(true); });
      function draw(anim) {
        const [la, fr] = ADAGES[(dayIndex() + d.offset) % ADAGES.length];
        const box = h('button', { class: 'maxim', 'aria-label': 'Afficher la traduction' },
          h('p', { class: 'la', text: la }),
          h('p', { class: 'fr', text: fr }));
        box.addEventListener('click', () => box.classList.toggle('reveal'));
        ctx.body.innerHTML = '';
        ctx.body.append(box);
        if (anim) box.animate([{ opacity: 0, transform: 'translateY(8px)', filter: 'blur(4px)' }, { opacity: 1, transform: 'none', filter: 'none' }], { duration: 500, easing: 'cubic-bezier(.2,.8,.2,1)' });
      }
      draw();
    },
  });
})();
