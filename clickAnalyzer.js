(function() {
  console.log('✨ Improved Click Analyzer Activated');

  const STYLE_PROPS = [
    'display',
    'position',
    'top',
    'left',
    'width',
    'height',
    'background-color',
    'color',
    'font-size',
    'z-index'
  ];

  let lastEventTime = 0;
  const DEBOUNCE_MS = 100;

  document.addEventListener('click', async function(event) {
    const now = Date.now();
    if (now - lastEventTime < DEBOUNCE_MS) return;
    lastEventTime = now;

    const el = event.target;
    const computed = window.getComputedStyle(el);
    const keyStyles = STYLE_PROPS.reduce((acc, prop) => {
      acc[prop] = computed.getPropertyValue(prop);
      return acc;
    }, {});

    const info = {
      tag: el.tagName.toLowerCase(),
      id: el.id || null,
      classes: el.className ? el.className.split(/\s+/) : [],
      text: (el.innerText || el.textContent || '').trim().slice(0, 200),
      attributes: Array.from(el.attributes).reduce((o, {name, value}) => {
        o[name] = value; return o;
      }, {}),
      position: {
        clientX: event.clientX,
        clientY: event.clientY,
        pageX: event.pageX,
        pageY: event.pageY,
      },
      styles: keyStyles,
      hierarchy: getPath(event),
      selector: buildCssSelector(el),
      outerHTML: el.outerHTML.slice(0, 500)  // не более 500 символов
    };

    console.log('===== CLICK ANALYZER =====');
    console.log(JSON.stringify(info, null, 2));
    console.log('==========================');

    try {
      await navigator.clipboard.writeText(info.selector);
      console.log('✅ CSS selector copied:', info.selector);
    } catch (err) {
      console.warn('❌ Clipboard API failed, selector:', info.selector);
    }
  }, true);

  function getPath(event) {
    return (event.composedPath ? event.composedPath() : [])
      .filter(node => node.nodeType === Node.ELEMENT_NODE)
      .map(el => ({
        tag: el.tagName.toLowerCase(),
        id: el.id || null,
        classes: el.className ? el.className.split(/\s+/) : [],
        selector: buildCssSelector(el)
      }));
  }

  function buildCssSelector(el) {
    if (el.id) return `#${el.id}`;
    const parts = [];
    while (el && el.nodeType === Node.ELEMENT_NODE && el !== document.body) {
      let part = el.tagName.toLowerCase();
      if (el.className) {
        const cls = el.className.trim().split(/\s+/).join('.');
        part += `.${cls}`;
      }
      const parent = el.parentNode;
      if (parent) {
        const siblings = Array.from(parent.children)
          .filter(e => e.tagName === el.tagName);
        if (siblings.length > 1) {
          const idx = siblings.indexOf(el) + 1;
          part += `:nth-of-type(${idx})`;
        }
      }
      parts.unshift(part);
      el = parent;
    }
    parts.unshift('body');
    return parts.join(' > ');
  }
})();
