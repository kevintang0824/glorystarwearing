(() => {
  'use strict';
  const config = JSON.parse(document.getElementById('gsw-locale-data').textContent);
  const u = config.ui;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normalize = value => String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().trim();
  const catalog = document.querySelector('[data-native-catalog]');
  if(catalog) {
    const search = catalog.querySelector('[data-native-search]');
    const category = catalog.querySelector('[data-native-category]');
    const grid = catalog.querySelector('[data-native-grid]');
    const status = catalog.querySelector('[data-native-count]');
    const more = catalog.querySelector('[data-native-more]');
    const empty = catalog.querySelector('[data-native-empty]');
    let products, loading, limit=24, revision=0;
    let group = new URLSearchParams(location.search).get('category') || '';
    search.value = new URLSearchParams(location.search).get('q') || '';
    if(Array.from(category.options).some(o=>o.value===group)) { category.value=group; group=''; }
    const load = () => {
      if(products) return Promise.resolve(products);
      if(loading) return loading;
      status.textContent=u.loading;
      loading=fetch(catalog.dataset.feed).then(response=>{
        if(!response.ok) throw new Error('Catalogue unavailable');
        return response.json();
      }).then(data=>{
        if(!Array.isArray(data)) throw new Error('Invalid catalogue');
        const prefix=`${config.base}/products/`;
        products=data.filter(p=>p.route?.startsWith(prefix) && /^\/(?:wp-content\/uploads\/catalog|assets)\//.test(p.image?.path||''));
        return products;
      }).finally(()=>{loading=null;});
      return loading;
    };
    const card = p => `<article class="catalog-card" data-native-product><a class="catalog-card__link" href="${escape(p.route)}"><div class="catalog-card__media"><img loading="lazy" decoding="async" src="${escape(p.image.path)}" width="${Number(p.image.width)||900}" height="${Number(p.image.height)||900}" alt="${escape(p.title)}"><span class="catalog-card__badge">${escape(p.primaryLabel)}</span></div><div class="catalog-card__body"><p class="catalog-card__meta">${escape(p.sku)}</p><h2 class="catalog-card__title">${escape(p.title)}</h2><span class="catalog-card__arrow">${u.view} →</span></div></a></article>`;
    const update = async () => {
      const request=++revision;
      more.disabled=true;
      try {
        const all=await load();
        if(request!==revision) return;
        const query=normalize(search.value);
        const matches=all.filter(p=>(!category.value || p.primaryLabel===category.value) && (!group || p.groups.includes(group)) && (!query || normalize(`${p.title} ${p.sku} ${p.primaryLabel}`).includes(query)));
        const visible=matches.slice(0,limit);
        grid.innerHTML=visible.map(card).join('');
        status.textContent=u.count.replace('{shown}',visible.length).replace('{total}',matches.length);
        empty.hidden=matches.length>0;
        more.hidden=limit>=matches.length;
        more.textContent=u.more;
        const url=new URL(location.href);
        const selected=group||category.value;
        if(selected) url.searchParams.set('category',selected); else url.searchParams.delete('category');
        if(search.value) url.searchParams.set('q',search.value); else url.searchParams.delete('q');
        history.replaceState({},'',url.pathname+url.search+url.hash);
      } catch {
        if(request!==revision) return;
        status.textContent=u.error;
        more.hidden=false;
        more.textContent=u.retry;
      } finally { if(request===revision) more.disabled=false; }
    };
    let debounce;
    search.addEventListener('input',()=>{limit=24;clearTimeout(debounce);debounce=setTimeout(update,180);});
    category.addEventListener('change',()=>{limit=24;group='';update();});
    more.addEventListener('click',()=>{limit+=24;update();});
    if(group || category.value || search.value) update();
  }
  const form=document.querySelector('[data-native-inquiry]');
  if(form) {
    form.hidden=false;
    const query=new URLSearchParams(location.search);
    const sku=(query.get('sku')||'').slice(0,100);
    const product=(query.get('product')||'').slice(0,200);
    const requestedSource=query.get('source')||'';
    const source=/^\/(?:fr\/|es\/|pt\/|ru\/|zh-cn\/)?products\/[a-z0-9-]+\/$/.test(requestedSource) ? new URL(requestedSource,location.origin).href : '';
    form.elements.product.value=[product,sku].filter(Boolean).join(' · ');
    const context=document.querySelector('[data-native-product-context]');
    if(product || sku) {context.textContent=`${u.product}: ${[product,sku].filter(Boolean).join(' · ')}`;context.hidden=false;}
    form.addEventListener('submit',event=>{
      event.preventDefault();
      if(!form.reportValidity() || form.dataset.submitting==='true') return;
      form.dataset.submitting='true';
      const button=form.querySelector('[type="submit"]');
      button.disabled=true;button.setAttribute('aria-busy','true');
      const lines=[u.greeting,''];
      for(const field of form.querySelectorAll('input,textarea')) if(field.value.trim()) lines.push(`${field.dataset.label}: ${field.value.trim()}`);
      if(sku) lines.push(`${u.reference}: ${sku}`);
      if(source) lines.push(`${u.source}: ${source}`);
      const url=`https://wa.me/8618020755949?text=${encodeURIComponent(lines.join('\n'))}`;
      const destination=window.open('','_blank');
      if(destination) {destination.opener=null;destination.location.replace(url);setTimeout(()=>{form.dataset.submitting='false';button.disabled=false;button.removeAttribute('aria-busy');},2500);}
      else location.assign(url);
    });
  }
})();
