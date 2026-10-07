(() => {
  'use strict';
  const data = window.SITE_CONTENT;
  if (!data) return;
  const categories = ['published', 'working', 'progress'];
  let language = new URLSearchParams(location.search).get('lang') === 'es' ? 'es' : 'en';
  let filter = 'all';
  let slide = 0;
  const local = value => typeof value === 'object' ? value[language] : value;
  const node = (tag, className, text) => {const el = document.createElement(tag); if(className) el.className = className; if(text !== undefined) el.textContent = text; return el;};
  function renderFeatured() {
    const target = document.getElementById('featured-list');
    target.replaceChildren();
    data.featured.forEach(project => {
      const article = node('article','featured-card');
      const paper = data.papers.find(p => p.id === project.id);
      article.append(node('p','paper-kind',data.languages[language].groupHeadings[categories.indexOf(paper.category)]), node('h3','',project.title), node('p','',project[language]));
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
    document.querySelectorAll('[data-filter]').forEach((button,index) => {button.textContent=texts.filters[index];button.setAttribute('aria-pressed',String(button.dataset.filter===filter));});
    let count=0;
    categories.forEach((category,index) => {
      if(filter !== 'all' && filter !== category) return;
      const papers = data.papers.filter(p => p.category === category);
      const group = node('div','paper-group');
      group.append(node('h3','group-heading',texts.groupHeadings[index]));
      papers.forEach(p => {
        count++;
        const article=node('article','paper-row');
        if(p.id) article.id='paper-'+p.id;
        const content=node('div','paper-content');
        content.append(node('h3','',p.title),node('p','paper-authors',local(p.authors)));
        if(p.venue) content.append(node('p','paper-venue',p.venue));
        article.append(node('span','paper-year',p.year||'—'),content);
        if(p.url){const link=node('a','paper-link',texts.paperLink+' ↗');link.href=p.url;link.target='_blank';link.rel='noopener';article.append(link);}
        group.append(article);
      });
      target.append(group);
    });
    document.getElementById('research-results').textContent=`${count} ${texts.results}`;
  }
  function renderSlide() {
    const photo=data.photos[slide];const texts=data.languages[language];
    const image=document.getElementById('field-photo');
    image.hidden=!photo.image;
    if(photo.image) image.src=photo.image;else image.removeAttribute('src');
    image.alt=local(photo.alt);
    document.getElementById('photo-placeholder').hidden=Boolean(photo.image);
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
    if(dots.children.length!==data.photos.length){dots.replaceChildren();data.photos.forEach((p,i)=>{const b=node('button');b.type='button';b.addEventListener('click',()=>{slide=i;renderSlide();});dots.append(b);});}
    Array.from(dots.children).forEach((button,i)=>{button.setAttribute('aria-pressed',String(i===slide));button.setAttribute('aria-label',`${texts.photoGo} ${i+1}: ${local(data.photos[i].location)}`);});
  }
  function changeSlide(direction){slide=(slide+direction+data.photos.length)%data.photos.length;renderSlide();}
  function render() {
    const texts=data.languages[language];document.documentElement.lang=language;
    document.title=language==='es'?'Mónica Vasco | Economía experimental y redes sociales':'Mónica Vasco | Experimental Economics & Social Networks';
    document.querySelectorAll('[data-text]').forEach(el=>el.textContent=texts[el.dataset.text]);
    document.querySelectorAll('[data-html]').forEach(el=>el.innerHTML=texts[el.dataset.html]);
    document.querySelectorAll('[data-nav]').forEach(el=>el.textContent=texts.nav[Number(el.dataset.nav)]);
    document.getElementById('main-nav').setAttribute('aria-label',language==='es'?'Navegación principal':'Main navigation');
    document.querySelectorAll('[data-language]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.language===language)));
    document.getElementById('cv-link').href=data.cv;
    document.getElementById('email-link').href='mailto:'+data.email;
    document.getElementById('email-link').textContent=data.email+' ↗';
    document.getElementById('orcid-link').href=data.orcid;
    const portrait=document.getElementById('portrait-image');
    portrait.hidden=!data.portrait;
    document.getElementById('portrait-placeholder').hidden=Boolean(data.portrait);
    if(data.portrait) portrait.src=data.portrait;
    document.querySelector('.portrait .caption-sub').hidden=Boolean(data.portrait);
    renderFeatured();renderPapers();renderSlide();
    const teaching=document.getElementById('teaching-list');teaching.replaceChildren();
    data.teaching.forEach(course=>{const article=node('article','teaching-item');article.append(node('h3','',local(course.title)),node('p','course-role',texts[course.role]),node('p','',course.years+' · '+texts[course.language]));teaching.append(article);});
  }
  document.querySelectorAll('[data-language]').forEach(button=>button.addEventListener('click',()=>{language=button.dataset.language;render();try{const url=new URL(location.href);url.searchParams.set('lang',language);history.replaceState(null,'',url);}catch(_){}}));
  document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{filter=button.dataset.filter;renderPapers();}));
  document.getElementById('photo-prev').addEventListener('click',()=>changeSlide(-1));
  document.getElementById('photo-next').addEventListener('click',()=>changeSlide(1));
  const carousel=document.getElementById('carousel');
  carousel.addEventListener('keydown',event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();changeSlide(event.key==='ArrowRight'?1:-1);}});
  let touchStart=null;
  carousel.addEventListener('touchstart',event=>{touchStart={x:event.changedTouches[0].clientX,y:event.changedTouches[0].clientY};},{passive:true});
  carousel.addEventListener('touchend',event=>{if(!touchStart)return;const dx=event.changedTouches[0].clientX-touchStart.x;const dy=event.changedTouches[0].clientY-touchStart.y;if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy))changeSlide(dx<0?1:-1);touchStart=null;},{passive:true});
  render();
})();
