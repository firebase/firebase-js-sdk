export function loadScript(url) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.onerror = reject;
    script.onload = resolve;
    document.head.appendChild(script);
  });
}

export function loadCss(url) {
  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.type = 'text/css';
    link.rel = 'stylesheet';
    link.href = url;
    link.onerror = reject;
    link.onload = resolve;
    document.head.appendChild(link);
  });
}