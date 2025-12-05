// Lazy Loading Utility for MediConnect Pro
// Implements intersection observer-based lazy loading for images and components

(function() {
  'use strict';

  // Configuration
  const config = {
    rootMargin: '50px 0px', // Load images 50px before they enter viewport
    threshold: 0.01, // Trigger when 1% of element is visible
    retryCount: 3, // Number of retries for failed loads
    retryDelay: 1000 // Delay between retries in ms
  };

  // Intersection Observer for lazy loading
  let lazyObserver = null;

  /**
   * Initialize lazy loading
   */
  function initLazyLoading() {
    // Check for IntersectionObserver support
    if (!('IntersectionObserver' in window)) {
      // Fallback: load all images immediately
      loadAllLazyImages();
      return;
    }

    // Create observer
    lazyObserver = new IntersectionObserver(handleIntersection, {
      rootMargin: config.rootMargin,
      threshold: config.threshold
    });

    // Observe all lazy elements
    observeLazyElements();
  }

  /**
   * Handle intersection events
   */
  function handleIntersection(entries, observer) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const element = entry.target;

        if (element.tagName === 'IMG') {
          loadLazyImage(element);
        } else if (element.dataset.lazyComponent) {
          loadLazyComponent(element);
        }

        // Stop observing this element
        observer.unobserve(element);
      }
    });
  }

  /**
   * Observe all lazy elements on the page
   */
  function observeLazyElements() {
    // Images with data-src attribute
    const lazyImages = document.querySelectorAll('img[data-src]');
    lazyImages.forEach(img => lazyObserver.observe(img));

    // Components with data-lazy-component attribute
    const lazyComponents = document.querySelectorAll('[data-lazy-component]');
    lazyComponents.forEach(comp => lazyObserver.observe(comp));
  }

  /**
   * Load a lazy image
   */
  function loadLazyImage(img, retries = 0) {
    const src = img.dataset.src;
    const srcset = img.dataset.srcset;

    if (!src) return;

    // Create new image to preload
    const tempImage = new Image();

    tempImage.onload = function() {
      img.src = src;
      if (srcset) {
        img.srcset = srcset;
      }
      img.classList.remove('lazy');
      img.classList.add('loaded');
      img.removeAttribute('data-src');
      img.removeAttribute('data-srcset');

      // Trigger custom event
      img.dispatchEvent(new CustomEvent('lazyloaded', { bubbles: true }));
    };

    tempImage.onerror = function() {
      if (retries < config.retryCount) {
        setTimeout(() => loadLazyImage(img, retries + 1), config.retryDelay);
      } else {
        img.classList.add('lazy-error');
        console.warn('Failed to load lazy image:', src);
      }
    };

    tempImage.src = src;
  }

  /**
   * Load a lazy component
   */
  function loadLazyComponent(container) {
    const componentName = container.dataset.lazyComponent;
    const componentUrl = container.dataset.componentUrl;

    if (!componentName) return;

    // Show loading state
    container.classList.add('loading');

    if (componentUrl) {
      // Load component HTML via fetch
      fetch(componentUrl)
        .then(response => {
          if (!response.ok) throw new Error('Component load failed');
          return response.text();
        })
        .then(html => {
          container.innerHTML = html;
          container.classList.remove('loading');
          container.classList.add('loaded');

          // Execute any scripts in the loaded content
          const scripts = container.querySelectorAll('script');
          scripts.forEach(script => {
            const newScript = document.createElement('script');
            if (script.src) {
              newScript.src = script.src;
            } else {
              newScript.textContent = script.textContent;
            }
            document.body.appendChild(newScript);
          });

          // Trigger custom event
          container.dispatchEvent(new CustomEvent('componentloaded', {
            bubbles: true,
            detail: { component: componentName }
          }));
        })
        .catch(error => {
          console.error('Failed to load component:', componentName, error);
          container.classList.remove('loading');
          container.classList.add('load-error');
        });
    } else {
      // For components defined inline (e.g., using templates)
      const template = document.getElementById(`template-${componentName}`);
      if (template) {
        container.appendChild(template.content.cloneNode(true));
        container.classList.remove('loading');
        container.classList.add('loaded');
      }
    }
  }

  /**
   * Fallback: load all lazy images immediately
   */
  function loadAllLazyImages() {
    const lazyImages = document.querySelectorAll('img[data-src]');
    lazyImages.forEach(img => loadLazyImage(img));
  }

  /**
   * Manually trigger observation of new elements
   */
  function observeNewElements(container = document) {
    if (!lazyObserver) return;

    const lazyImages = container.querySelectorAll('img[data-src]');
    lazyImages.forEach(img => lazyObserver.observe(img));

    const lazyComponents = container.querySelectorAll('[data-lazy-component]');
    lazyComponents.forEach(comp => lazyObserver.observe(comp));
  }

  /**
   * Preload critical images
   */
  function preloadCriticalImages(urls) {
    urls.forEach(url => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = url;
      document.head.appendChild(link);
    });
  }

  /**
   * Defer non-critical CSS
   */
  function deferNonCriticalCSS(urls) {
    urls.forEach(url => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = url;
      link.media = 'print';
      link.onload = function() {
        this.media = 'all';
      };
      document.head.appendChild(link);
    });
  }

  /**
   * Load script dynamically
   */
  function loadScript(url, callback) {
    const script = document.createElement('script');
    script.src = url;
    script.async = true;

    if (callback) {
      script.onload = callback;
    }

    document.body.appendChild(script);
  }

  /**
   * Resource hints for performance
   */
  function addResourceHints() {
    // DNS prefetch for external domains
    const externalDomains = [];

    externalDomains.forEach(domain => {
      const link = document.createElement('link');
      link.rel = 'dns-prefetch';
      link.href = domain;
      document.head.appendChild(link);
    });
  }

  // Export functions to global scope
  window.LazyLoad = {
    init: initLazyLoading,
    observe: observeNewElements,
    preloadImages: preloadCriticalImages,
    deferCSS: deferNonCriticalCSS,
    loadScript: loadScript
  };

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLazyLoading);
  } else {
    initLazyLoading();
  }

  // Add resource hints
  addResourceHints();

})();
