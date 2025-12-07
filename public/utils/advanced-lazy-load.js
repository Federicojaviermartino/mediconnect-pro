// Advanced Lazy Loading Utility for MediConnect Pro
// Implements code splitting, async module loading, and progressive enhancement

(function() {
  'use strict';

  // Module cache for preventing duplicate loads
  const moduleCache = new Map();
  const pendingModules = new Map();

  /**
   * Lazy load JavaScript module dynamically
   * @param {string} moduleName - Name of the module
   * @param {string} moduleUrl - URL to load the module from
   * @returns {Promise} Promise that resolves when module is loaded
   */
  async function loadModule(moduleName, moduleUrl) {
    // Check cache first
    if (moduleCache.has(moduleName)) {
      return moduleCache.get(moduleName);
    }

    // Check if module is currently being loaded
    if (pendingModules.has(moduleName)) {
      return pendingModules.get(moduleName);
    }

    // Create loading promise
    const loadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = moduleUrl;
      script.async = true;

      script.onload = () => {
        const module = window[moduleName];
        moduleCache.set(moduleName, module);
        pendingModules.delete(moduleName);
        resolve(module);
      };

      script.onerror = () => {
        pendingModules.delete(moduleName);
        reject(new Error(`Failed to load module: ${moduleName}`));
      };

      document.body.appendChild(script);
    });

    pendingModules.set(moduleName, loadPromise);
    return loadPromise;
  }

  /**
   * Lazy load multiple modules in parallel
   * @param {Array<{name: string, url: string}>} modules
   * @returns {Promise<Object>} Object with module names as keys
   */
  async function loadModules(modules) {
    const promises = modules.map(mod =>
      loadModule(mod.name, mod.url).then(result => ({ name: mod.name, module: result }))
    );

    const results = await Promise.all(promises);
    return results.reduce((acc, { name, module }) => {
      acc[name] = module;
      return acc;
    }, {});
  }

  /**
   * Lazy load and execute a function when an element enters viewport
   * @param {HTMLElement} element - Target element
   * @param {Function} callback - Function to execute
   * @param {Object} options - IntersectionObserver options
   */
  function onInView(element, callback, options = {}) {
    const defaultOptions = {
      root: null,
      rootMargin: '50px',
      threshold: 0.1
    };

    const observerOptions = { ...defaultOptions, ...options };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          callback(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    observer.observe(element);
    return observer;
  }

  /**
   * Prefetch resources during idle time
   * @param {Array<string>} urls - URLs to prefetch
   * @param {string} type - Resource type ('script', 'style', 'image', 'fetch')
   */
  function prefetchResources(urls, type = 'fetch') {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        urls.forEach(url => {
          const link = document.createElement('link');
          link.rel = 'prefetch';
          link.href = url;

          if (type === 'script') {
            link.as = 'script';
          } else if (type === 'style') {
            link.as = 'style';
          } else if (type === 'image') {
            link.as = 'image';
          }

          document.head.appendChild(link);
        });
      });
    }
  }

  /**
   * Load CSS asynchronously
   * @param {string} href - CSS file URL
   * @returns {Promise} Promise that resolves when CSS is loaded
   */
  function loadCSS(href) {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;

      link.onload = () => resolve();
      link.onerror = () => reject(new Error(`Failed to load CSS: ${href}`));

      document.head.appendChild(link);
    });
  }

  /**
   * Code splitting: Load feature only when needed
   * @param {string} featureName - Name of the feature
   * @param {Function} loadFunction - Function that loads the feature
   */
  const featureLoaders = new Map();

  function registerFeature(featureName, loadFunction) {
    featureLoaders.set(featureName, loadFunction);
  }

  async function loadFeature(featureName, ...args) {
    const loader = featureLoaders.get(featureName);
    if (!loader) {
      throw new Error(`Feature not registered: ${featureName}`);
    }

    if (moduleCache.has(featureName)) {
      return moduleCache.get(featureName);
    }

    const feature = await loader(...args);
    moduleCache.set(featureName, feature);
    return feature;
  }

  /**
   * Progressive image loading with blur-up effect
   * @param {HTMLImageElement} img - Image element
   * @param {string} lowQualitySrc - Low quality placeholder image
   * @param {string} highQualitySrc - High quality image
   */
  function progressiveImageLoad(img, lowQualitySrc, highQualitySrc) {
    // Load low quality first
    img.src = lowQualitySrc;
    img.style.filter = 'blur(10px)';
    img.classList.add('loading');

    // Preload high quality
    const highQualityImg = new Image();
    highQualityImg.src = highQualitySrc;

    highQualityImg.onload = function() {
      img.src = highQualitySrc;
      img.style.filter = 'blur(0px)';
      img.classList.remove('loading');
      img.classList.add('loaded');
    };
  }

  /**
   * Defer execution until browser is idle
   * @param {Function} callback - Function to defer
   * @param {number} timeout - Maximum wait time in ms
   */
  function runWhenIdle(callback, timeout = 2000) {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(callback, { timeout });
    } else {
      setTimeout(callback, 1);
    }
  }

  /**
   * Virtual scrolling for large lists
   * @param {HTMLElement} container - Container element
   * @param {Array} items - Array of items to render
   * @param {Function} renderItem - Function to render each item
   * @param {Object} options - Configuration options
   */
  function createVirtualScroll(container, items, renderItem, options = {}) {
    const {
      itemHeight = 50,
      bufferSize = 3,
      containerHeight = container.clientHeight
    } = options;

    const totalHeight = items.length * itemHeight;
    const visibleCount = Math.ceil(containerHeight / itemHeight);

    let scrollTop = 0;
    let startIndex = 0;

    // Create spacer elements
    const spacerTop = document.createElement('div');
    const spacerBottom = document.createElement('div');
    const contentContainer = document.createElement('div');

    container.appendChild(spacerTop);
    container.appendChild(contentContainer);
    container.appendChild(spacerBottom);

    function updateView() {
      startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - bufferSize);
      const endIndex = Math.min(
        items.length,
        startIndex + visibleCount + bufferSize * 2
      );

      // Update spacers
      spacerTop.style.height = `${startIndex * itemHeight}px`;
      spacerBottom.style.height = `${(items.length - endIndex) * itemHeight}px`;

      // Render visible items
      contentContainer.innerHTML = '';
      for (let i = startIndex; i < endIndex; i++) {
        const itemElement = renderItem(items[i], i);
        contentContainer.appendChild(itemElement);
      }
    }

    container.addEventListener('scroll', () => {
      scrollTop = container.scrollTop;
      requestAnimationFrame(updateView);
    });

    updateView();

    return {
      update: (newItems) => {
        items = newItems;
        updateView();
      },
      scrollToIndex: (index) => {
        container.scrollTop = index * itemHeight;
      }
    };
  }

  /**
   * Intersection-based infinite scroll
   * @param {HTMLElement} sentinel - Element to observe for triggering load
   * @param {Function} loadMore - Function to call when more items should load
   * @param {Object} options - Observer options
   */
  function infiniteScroll(sentinel, loadMore, options = {}) {
    let isLoading = false;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !isLoading) {
          isLoading = true;

          loadMore().then(() => {
            isLoading = false;
          }).catch(error => {
            console.error('Failed to load more items:', error);
            isLoading = false;
          });
        }
      });
    }, {
      root: null,
      rootMargin: '100px',
      threshold: 0.1,
      ...options
    });

    observer.observe(sentinel);

    return {
      disconnect: () => observer.disconnect()
    };
  }

  /**
   * Adaptive loading based on network and device conditions
   */
  const adaptiveLoading = {
    // Check if user prefers reduced data
    shouldReduceData() {
      return (
        navigator.connection?.saveData ||
        navigator.connection?.effectiveType === 'slow-2g' ||
        navigator.connection?.effectiveType === '2g'
      );
    },

    // Check if device has limited memory
    hasLimitedMemory() {
      return navigator.deviceMemory && navigator.deviceMemory < 4;
    },

    // Get optimal image quality based on conditions
    getImageQuality() {
      if (this.shouldReduceData() || this.hasLimitedMemory()) {
        return 'low';
      }
      if (navigator.connection?.effectiveType === '4g') {
        return 'high';
      }
      return 'medium';
    },

    // Decide whether to load a heavy feature
    shouldLoadFeature() {
      return !this.shouldReduceData() && !this.hasLimitedMemory();
    }
  };

  // Export to global scope
  window.AdvancedLazyLoad = {
    loadModule,
    loadModules,
    onInView,
    prefetchResources,
    loadCSS,
    registerFeature,
    loadFeature,
    progressiveImageLoad,
    runWhenIdle,
    createVirtualScroll,
    infiniteScroll,
    adaptiveLoading
  };

  // Register common features for MediConnect Pro
  registerFeature('aiAssistant', async () => {
    await loadCSS('/styles/ai-assistant.css');
    return await loadModule('AIAssistant', '/ai-assistant.js');
  });

  registerFeature('vitalsMonitor', async () => {
    return await loadModule('VitalsMonitor', '/vitals-monitor.js');
  });

  registerFeature('insuranceManager', async () => {
    return await loadModule('InsuranceManager', '/insurance-manager.js');
  });

  // Prefetch critical resources during idle time
  runWhenIdle(() => {
    if (!adaptiveLoading.shouldReduceData()) {
      prefetchResources([
        '/dashboard-styles.css',
        '/dashboard-interactive.js'
      ], 'fetch');
    }
  });

})();
