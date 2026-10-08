(() => {
  'use strict';
  const data = window.SITE_CONTENT;
  if (!data) return;
  const categories = ['published','submitted','to-submit','writing','collecting','collected'];
  const researchStageLabels = {
    en:['Published','Submitted','To be submitted','In writing','Data collection ongoing','Data collected'],
    es:['Publicados','Enviados','Pendientes de envío','En redacción','Recogiendo datos','Datos recogidos']
  };
  const boundFilterButtons = new WeakSet();
  let language = new URLSearchParams(location.search).get('lang') === 'es' ? 'es' : 'en';
  let filter = 'all';
  let slide = 0;
  let academicSlide = 0;
  const players = {field:null,academic:null};
  const photoStates = new WeakMap();
  const local = value => typeof value === 'object' ? value[language] : value;
  const node = (tag, className, text) => {const el = document.createElement(tag); if(className) el.className = className; if(text !== undefined) el.textContent = text; return el;};
  // Link institutional names while preserving the wording in content.js.
  const institutionLinks = new Map([
    ['University of Southern California (USC)','https://www.usc.edu/'],
    ['University of Southern California','https://www.usc.edu/'],
    ['Universidad del Sur de California','https://www.usc.edu/'],
    ['USC','https://www.usc.edu/'],
    ['LABEL',data.labelUrl || 'https://label-laboratory.org/'],
    ['Loyola Behavioral Lab','https://loyolabehlab.org/'],
    ['LoyolaBehLab','https://loyolabehlab.org/'],
    ['LoyolaBehLAB','https://loyolabehlab.org/'],
    ['Loyola Andalucía University','https://www.uloyola.es/'],
    ['Universidad Loyola Andalucía','https://www.uloyola.es/'],
    ['Universidad Loyola Andalucia','https://www.uloyola.es/'],
    ['Loyola','https://www.uloyola.es/'],
    ['University of the Basque Country','https://www.ehu.eus/en/en-home'],
    ['Universidad del País Vasco','https://www.ehu.eus/en/en-home'],
    ['University of Essex','https://www.essex.ac.uk/'],
    ['Universidad de Essex','https://www.essex.ac.uk/'],
    ['Fundación Cotec','https://cotec.es/'],
    ['FPU','https://www.ciencia.gob.es/Universidades/FPU.html'],
    ['Caltech','https://www.caltech.edu/']
  ]);
  const institutionPattern = new RegExp(
    Array.from(institutionLinks.keys()).sort((a,b)=>b.length-a.length)
      .map(name=>name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'gu'
  );
  function linkInstitutions(container) {
    const walker=document.createTreeWalker(container,NodeFilter.SHOW_TEXT);
    const textNodes=[];
    while(walker.nextNode()) {
      if(!walker.currentNode.parentElement.closest('a')) textNodes.push(walker.currentNode);
    }
    const isWord=character=>Boolean(character && /[\p{L}\p{N}_]/u.test(character));
    textNodes.forEach(textNode=>{
      const original=textNode.data;
      const matches=Array.from(original.matchAll(institutionPattern)).filter(match=>
        !isWord(original[match.index-1]) && !isWord(original[match.index+match[0].length])
      );
      if(!matches.length) return;
      const fragment=document.createDocumentFragment();let cursor=0;
      matches.forEach(match=>{
        fragment.append(document.createTextNode(original.slice(cursor,match.index)));
        const link=node('a','inline-resource',match[0]);
        link.href=institutionLinks.get(match[0]);link.target='_blank';link.rel='noopener';
        fragment.append(link);cursor=match.index+match[0].length;
      });
      fragment.append(document.createTextNode(original.slice(cursor)));
      textNode.replaceWith(fragment);
    });
  }
  function updatePhoto(image,placeholder,path,description,position='50% 50%') {
    image.alt=description||'';
    const setState=loaded=>{image.hidden=!loaded;placeholder.hidden=loaded;};
    if(path && image.getAttribute('src')===path){
      image.style.objectPosition=position;
      if(image.complete) setState(image.naturalWidth>0);
      return;
    }
    const stage=image.parentElement;
    const layers=Array.from(stage.querySelectorAll('.carousel-outgoing'));
    const source=image.complete && image.naturalWidth>0?image:layers[0];
    const fade=Boolean(path && source && stage.classList.contains('photo-stage') && !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const outgoing=fade?source.cloneNode(false):null;
    layers.forEach(layer=>layer.remove());
    const state={outgoing};photoStates.set(image,state);
    const current=()=>photoStates.get(image)===state;
    if(outgoing){
      outgoing.removeAttribute('id');outgoing.alt='';outgoing.hidden=false;
      outgoing.setAttribute('aria-hidden','true');outgoing.classList.add('carousel-outgoing');
      outgoing.style.opacity='1';stage.append(outgoing);
    }
    image.style.objectPosition=position;
    image.style.opacity=outgoing?'0':'1';
    image.onload=()=>{
      if(!current())return;
      setState(true);
      if(!outgoing){image.style.opacity='1';return;}
      window.requestAnimationFrame(()=>window.requestAnimationFrame(()=>{
        if(!current())return;
        image.style.opacity='1';outgoing.style.opacity='0';
        window.setTimeout(()=>outgoing.remove(),500);
      }));
    };
    image.onerror=()=>{
      if(!current())return;
      if(outgoing)outgoing.remove();
      image.style.opacity='1';setState(false);
    };
    if(!path){if(outgoing)outgoing.remove();image.removeAttribute('src');setState(false);return;}
    image.hidden=false;placeholder.hidden=Boolean(outgoing);image.src=path;
  }
  function renderFixedPhotos() {
    document.querySelectorAll('[data-fixed-photo]').forEach(figure=>{
      const photo=data.fixedPhotos[figure.dataset.fixedPhoto];
      if(!photo){figure.hidden=true;return;}
      if(!figure.children.length){
        const frame=node('div','fixed-photo-frame');
        const image=node('img');image.loading='lazy';image.decoding='async';
        const placeholder=node('div','fixed-photo-placeholder');placeholder.setAttribute('aria-hidden','true');
        frame.append(image,placeholder);figure.append(frame,node('figcaption'));
      }
      figure.querySelector('figcaption').textContent=local(photo.caption);
      const placeholder=figure.querySelector('.fixed-photo-placeholder');
      placeholder.textContent=local(photo.caption);
      updatePhoto(figure.querySelector('img'),placeholder,photo.image,local(photo.alt),photo.position);
    });
  }
  function createAutoplay(carouselId,buttonId,countId,advance) {
    const carousel=document.getElementById(carouselId);
    const button=document.getElementById(buttonId);
    const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
    let enabled=!motion.matches;
    let inView=!('IntersectionObserver' in window);
    let timer=null;
    function repaint(){
      const texts=data.languages[language];
      button.textContent=enabled?texts.photoPause:texts.photoPlay;
      button.setAttribute('aria-label',enabled?texts.photoPauseLabel:texts.photoPlayLabel);
      document.getElementById(countId).setAttribute('aria-live',enabled?'off':'polite');
    }
    function updateTimer(){
      if(timer!==null){window.clearInterval(timer);timer=null;}
      if(enabled && inView && document.visibilityState!=='hidden') timer=window.setInterval(()=>advance(1,false),data.slideshowInterval||5000);
    }
    function pause(){enabled=false;repaint();updateTimer();}
    button.addEventListener('click',()=>{enabled=!enabled;repaint();updateTimer();});
    carousel.addEventListener('focusin',event=>{if(event.target!==button)pause();});
    document.addEventListener('visibilitychange',updateTimer);
    const motionChange=()=>{if(motion.matches)pause();};
    if(motion.addEventListener)motion.addEventListener('change',motionChange);else motion.addListener(motionChange);
    if('IntersectionObserver' in window){
      const observer=new IntersectionObserver(entries=>{inView=entries.some(entry=>entry.isIntersecting && entry.intersectionRatio>=.15);updateTimer();},{threshold:[0,.15]});
      observer.observe(carousel);
    }
    repaint();updateTimer();
    return {pause,render:repaint};
  }
  function researchHeadings() {
    const headings=data.languages[language].groupHeadings;
    // Earlier content.js files have three groups; use the six updated defaults.
    return Array.isArray(headings) && headings.length===categories.length ? headings : researchStageLabels[language];
  }
  function researchStageLabel(category) {
    return researchHeadings()[categories.indexOf(category)] || '';
  }
  function renderResearchFilters() {
    const container=document.querySelector('.filters');
    const keys=['all',...categories];
    const existing=Array.from(container.children);
    if(existing.length!==keys.length || existing.some((button,index)=>button.dataset.filter!==keys[index])) {
      container.replaceChildren();
      keys.forEach(key=>{
        const button=node('button');button.type='button';button.dataset.filter=key;
        container.append(button);
      });
    }
    const texts=data.languages[language];
    const labels=Array.isArray(texts.filters) && texts.filters.length===keys.length
      ? texts.filters : [texts.filters?.[0] || (language==='es'?'Todos':'All research'),...researchHeadings()];
    container.setAttribute('aria-label',language==='es'?'Filtrar investigación por estado':'Filter research by status');
    Array.from(container.children).forEach((button,index)=>{
      button.textContent=labels[index];
      button.setAttribute('aria-pressed',String(button.dataset.filter===filter));
      if(!boundFilterButtons.has(button)) {
        button.addEventListener('click',()=>{filter=button.dataset.filter;renderPapers();});
        boundFilterButtons.add(button);
      }
    });
  }
  function renderFeatured() {
    const target = document.getElementById('featured-list');
    target.replaceChildren();
    data.featured.forEach(project => {
      const article = node('article','featured-card');
      const paper = data.papers.find(p => p.id === project.id);
      article.append(node('p','paper-kind',researchStageLabel(paper.category)), node('h3','',paper.title), node('p','',project[language]));
      const link = node('a','',`${data.languages[language].nav[1]} ↗`);
      link.href = '#paper-' + project.id;
      link.addEventListener('click', () => {filter = 'all';renderPapers();});
      article.append(link);target.append(article);
    });
  }
  function renderPapers() {
    const target = document.getElementById('paper-list');
    const texts = data.languages[language];
    target.replaceChildren();
    renderResearchFilters();
    let count=0;
    categories.forEach((category,index) => {
      if(filter !== 'all' && filter !== category) return;
      const papers = data.papers.filter(p => p.category === category);
      if(!papers.length) return;
      const group = node('div','paper-group');
      group.append(node('h3','group-heading',researchStageLabel(category)));
      papers.forEach(p => {
        count++;
        const article=node('article','paper-row');
        if(p.id) article.id='paper-'+p.id;
        const content=node('div','paper-content');
        content.append(node('h3','',p.title),node('p','paper-authors',local(p.authors)));
        if(p.venue) content.append(node('p','paper-venue',p.venue));
        article.append(node('span','paper-year',p.year||'—'),content);
        const earlierBullyingVersion=!p.url && p.id==='bullying';
        const paperUrl=p.url || (earlierBullyingVersion?'https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4912811':'');
        const linkLabel=p.linkLabel?local(p.linkLabel):(earlierBullyingVersion?(language==='es'?'Versión anterior (SSRN)':'Earlier version (SSRN)'):texts.paperLink);
        if(paperUrl){const link=node('a','paper-link',linkLabel+' ↗');link.href=paperUrl;link.target='_blank';link.rel='noopener';article.append(link);}
        group.append(article);
      });
      target.append(group);
    });
    document.getElementById('research-results').textContent=`${count} ${texts.results}`;
  }
  function renderSlide() {
    const photo=data.photos[slide];const texts=data.languages[language];
    const image=document.getElementById('field-photo');
    updatePhoto(image,document.getElementById('photo-placeholder'),photo.image,local(photo.alt),photo.position);
    document.getElementById('photo-place').textContent=local(photo.location);
    document.getElementById('photo-subject').textContent=local(photo.topic);
    document.getElementById('slide-location').textContent=local(photo.location);
    document.getElementById('slide-topic').textContent=local(photo.topic);
    document.getElementById('slide-description').textContent=local(photo.caption);
    document.getElementById('slide-count').textContent=`${slide+1} ${texts.photoOf} ${data.photos.length}`;
    document.getElementById('carousel').setAttribute('aria-label',texts.photoRegion);
    document.getElementById('photo-prev').setAttribute('aria-label',texts.photoPrev);
    document.getElementById('photo-next').setAttribute('aria-label',texts.photoNext);
    const dots=document.getElementById('slide-dots');
    if(dots.children.length!==data.photos.length){dots.replaceChildren();data.photos.forEach((p,i)=>{const b=node('button');b.type='button';b.addEventListener('click',()=>{players.field?.pause();slide=i;renderSlide();});dots.append(b);});}
    Array.from(dots.children).forEach((button,i)=>{button.setAttribute('aria-pressed',String(i===slide));button.setAttribute('aria-label',`${texts.photoGo} ${i+1}: ${local(data.photos[i].location)}`);});
  }
  function changeSlide(direction,manual=true){if(manual)players.field?.pause();slide=(slide+direction+data.photos.length)%data.photos.length;renderSlide();}
  function academicEvent(photo) {
    const event=data.conferences.find(item=>item.id===photo.event);
    return event || {
      title:photo.title || (language==='es'?'Actividad académica':'Academic activity'),
      location:photo.location,
      date:photo.date,
      role:photo.role,
      roles:photo.roles
    };
  }
  function conferenceDate(event) {
    if(!event.date) return '';
    return new Intl.DateTimeFormat(language==='es'?'es-ES':'en-US',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(event.date+'-01T12:00:00Z'));
  }
  function conferencePlace(event) {
    return [event.venue,local(event.location)].filter(Boolean).join(' · ');
  }
  // Support several roles per event and the earlier single-role format.
  function renderEventRoles(target,event) {
    const defaults={
      en:{coorganizer:'Co-organizer',oral:'Oral presentation',poster:'Poster presentation'},
      es:{coorganizer:'Coorganizadora',oral:'Presentación oral',poster:'Presentación de póster'}
    };
    const roles=Array.isArray(event.roles)?event.roles:(event.role?[event.role]:[]);
    const texts=data.languages[language];
    target.replaceChildren();
    target.classList.remove('event-role');
    target.classList.add('event-roles');
    Array.from(new Set(roles)).forEach(role=>{
      const label=texts[role] || defaults[language][role];
      if(label) target.append(node('span','event-role',local(label)));
    });
    target.hidden=!target.children.length;
  }
  function renderAcademicSlide() {
    const photo=data.academicPhotos[academicSlide];
    const event=academicEvent(photo);
    const texts=data.languages[language];
    const image=document.getElementById('academic-photo');
    const placeholder=document.getElementById('academic-placeholder');
    updatePhoto(image,placeholder,photo.image,local(photo.alt),photo.position);
    document.getElementById('academic-placeholder-title').textContent=local(event.title);
    document.getElementById('academic-placeholder-location').textContent=conferencePlace(event);
    const date=document.getElementById('academic-slide-date');
    date.textContent=conferenceDate(event);date.hidden=!event.date;
    document.getElementById('academic-slide-title').textContent=local(event.title);
    const place=document.getElementById('academic-slide-location');
    place.textContent=conferencePlace(event);place.hidden=!place.textContent;
    renderEventRoles(document.getElementById('academic-slide-role'),event);
    document.getElementById('academic-count').textContent=`${academicSlide+1} ${texts.photoOf} ${data.academicPhotos.length}`;
    document.getElementById('academic-carousel').setAttribute('aria-label',texts.activitiesRegion);
    document.getElementById('academic-prev').setAttribute('aria-label',texts.photoPrev);
    document.getElementById('academic-next').setAttribute('aria-label',texts.photoNext);
    const dots=document.getElementById('academic-dots');
    if(dots.children.length!==data.academicPhotos.length){
      dots.replaceChildren();
      data.academicPhotos.forEach((item,index)=>{const button=node('button');button.type='button';button.addEventListener('click',()=>{players.academic?.pause();academicSlide=index;renderAcademicSlide();});dots.append(button);});
    }
    Array.from(dots.children).forEach((button,index)=>{
      const item=academicEvent(data.academicPhotos[index]);
      button.setAttribute('aria-pressed',String(index===academicSlide));
      button.setAttribute('aria-label',`${texts.photoGo} ${index+1}: ${local(item.title)}`);
    });
    linkInstitutions(document.getElementById('academic-slide-title'));
    linkInstitutions(document.getElementById('academic-slide-location'));
  }
  function changeAcademicSlide(direction,manual=true){if(manual)players.academic?.pause();academicSlide=(academicSlide+direction+data.academicPhotos.length)%data.academicPhotos.length;renderAcademicSlide();}
  function renderActivities() {
    const target=document.getElementById('conference-list');
    target.replaceChildren();
    document.querySelector('.conference-total').textContent=`(${data.conferences.length})`;
    data.conferences.forEach(event=>{
      const item=node('li','conference-item');
      const date=node('time','conference-date',conferenceDate(event));date.dateTime=event.date;
      const content=node('div','conference-content');
      content.append(node('h3','',event.title),node('p','',conferencePlace(event)));
      const roles=node('div','event-roles');
      renderEventRoles(roles,event);
      if(!roles.hidden) content.append(roles);
      item.append(date,content);target.append(item);
    });
    renderAcademicSlide();
  }
  function render() {
    const texts=data.languages[language];document.documentElement.lang=language;
    document.title=language==='es'?'Mónica Vasco | Economía experimental y redes sociales':'Mónica Vasco | Experimental Economics & Social Networks';
    document.querySelectorAll('[data-text]').forEach(el=>el.textContent=texts[el.dataset.text]);
    document.querySelectorAll('[data-html]').forEach(el=>el.innerHTML=texts[el.dataset.html]);
    document.querySelectorAll('[data-nav]').forEach(el=>el.textContent=texts.nav[Number(el.dataset.nav)]);
    document.querySelectorAll('.hero-copy .intro,.hero-copy .hero-detail,.background [data-text="background"],.background [data-html="background"],.background [data-text="serviceText"],.background [data-html="serviceText"]').forEach(linkInstitutions);
    document.getElementById('main-nav').setAttribute('aria-label',language==='es'?'Navegación principal':'Main navigation');
    document.querySelectorAll('[data-language]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.language===language)));
    document.getElementById('cv-link').href=data.cv;
    document.getElementById('label-link').href=data.labelUrl;
    document.getElementById('email-link').href='mailto:'+data.email;
    document.getElementById('email-link').textContent=data.email+' ↗';
    document.getElementById('orcid-link').href=data.orcid;
    const portrait=document.getElementById('portrait-image');
    updatePhoto(portrait,document.getElementById('portrait-placeholder'),data.portrait,'Mónica Vasco');
    renderFixedPhotos();renderFeatured();renderPapers();renderSlide();renderActivities();
    document.querySelectorAll('.fixed-photo figcaption').forEach(linkInstitutions);
    players.field?.render();players.academic?.render();
    const teaching=document.getElementById('teaching-list');teaching.replaceChildren();
    data.teaching.forEach(course=>{const article=node('article','teaching-item');article.append(node('h3','',local(course.title)),node('p','course-role',texts[course.role]),node('p','',course.years+' · '+texts[course.language]));teaching.append(article);});
  }
  document.querySelectorAll('[data-language]').forEach(button=>button.addEventListener('click',()=>{language=button.dataset.language;render();try{const url=new URL(location.href);url.searchParams.set('lang',language);history.replaceState(null,'',url);}catch(_){}}));
  document.getElementById('photo-prev').addEventListener('click',()=>changeSlide(-1));
  document.getElementById('photo-next').addEventListener('click',()=>changeSlide(1));
  const carousel=document.getElementById('carousel');
  carousel.addEventListener('keydown',event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();changeSlide(event.key==='ArrowRight'?1:-1);}});
  let touchStart=null;
  carousel.addEventListener('touchstart',event=>{touchStart={x:event.changedTouches[0].clientX,y:event.changedTouches[0].clientY};},{passive:true});
  carousel.addEventListener('touchend',event=>{if(!touchStart)return;const dx=event.changedTouches[0].clientX-touchStart.x;const dy=event.changedTouches[0].clientY-touchStart.y;if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy))changeSlide(dx<0?1:-1);touchStart=null;},{passive:true});
  document.getElementById('academic-prev').addEventListener('click',()=>changeAcademicSlide(-1));
  document.getElementById('academic-next').addEventListener('click',()=>changeAcademicSlide(1));
  const academicCarousel=document.getElementById('academic-carousel');
  academicCarousel.addEventListener('keydown',event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();changeAcademicSlide(event.key==='ArrowRight'?1:-1);}});
  let academicTouchStart=null;
  academicCarousel.addEventListener('touchstart',event=>{academicTouchStart={x:event.changedTouches[0].clientX,y:event.changedTouches[0].clientY};},{passive:true});
  academicCarousel.addEventListener('touchend',event=>{if(!academicTouchStart)return;const dx=event.changedTouches[0].clientX-academicTouchStart.x;const dy=event.changedTouches[0].clientY-academicTouchStart.y;if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy))changeAcademicSlide(dx<0?1:-1);academicTouchStart=null;},{passive:true});
  players.field=createAutoplay('carousel','photo-play','slide-count',changeSlide);
  players.academic=createAutoplay('academic-carousel','academic-play','academic-count',changeAcademicSlide);
  render();
})();
