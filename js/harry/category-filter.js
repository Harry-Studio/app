// 通过 search.json 全量渲染并筛选首页卡片，避免只依赖首屏 DOM
document.addEventListener('DOMContentLoaded', function () {
  var categoryItems = document.querySelectorAll('.category-nav-item');
  var tagItems = document.querySelectorAll('.tag-nav-item');
  var yearItems = document.querySelectorAll('.year-nav-item');
  var postContainer = document.querySelector('#recent-posts .recent-post-items') || document.querySelector('#recent-posts');
  if (!postContainer) return;

  var postsPerLoad = 20;
  var allPosts = [];
  var filteredPosts = [];
  var currentCategory = 'all';
  var currentTag = 'all';
  var currentYear = 'all';
  var currentIndex = 0;
  var isLoading = false;
  var renderedKeys = new Set();
  var rootUsed = (window.GLOBAL_CONFIG && window.GLOBAL_CONFIG.root) || (window.CONFIG && window.CONFIG.root) || '/';
  var rootCandidates = [];
  if (rootUsed) rootCandidates.push(rootUsed);
  // 按路径分段猜测根路径，支持 /foo/ 或 /foo/bar/ 这类二级目录
  var segments = window.location.pathname.split('/').filter(Boolean);
  var cumulative = '/';
  segments.forEach(function (seg, idx) {
    cumulative += seg + '/';
    // 只收集前两级，超过两级通常是文章路径
    if (idx < 2) rootCandidates.push(cumulative);
  });
  rootCandidates.push('/');
  rootCandidates = Array.from(new Set(rootCandidates.map(function (r) { return (r || '/').replace(/\/?$/, '/'); })))
    .sort(function (a, b) { return b.length - a.length; }); // 先尝试更深层的路径

  // 隐藏原有分页/加载更多
  var pagination = document.querySelector('.pagination');
  if (pagination) pagination.style.display = 'none';
  var loadMoreWrap = document.querySelector('.load-more-wrap');
  if (loadMoreWrap) loadMoreWrap.style.display = 'none';

  // 加载提示
  var loadingElement = document.createElement('div');
  loadingElement.className = 'loading-more';
  loadingElement.style.cssText = 'text-align: center; padding: 20px; display: none;';
  loadingElement.innerHTML = 'Loading...';
  postContainer.parentNode.insertBefore(loadingElement, postContainer.nextSibling);

  // 初始化时清空老内容
  postContainer.innerHTML = '';

  function stripHtml(html) {
    var tmp = document.createElement('div');
    tmp.innerHTML = html || '';
    return (tmp.textContent || tmp.innerText || '').replace(/\s+/g, ' ').trim();
  }

  function buildPosts(data, base) {
    var seen = new Set();
    var cleanBase = (base || '/').replace(/\/$/, '');
    return data
      .filter(function (item) { return item.url && item.url.indexOf('/p/') !== -1; })
      .map(function (item) {
        if (!item.url) return null;
        var fullUrl;
        if (/^https?:\/\//.test(item.url)) {
          fullUrl = item.url;
        } else if (cleanBase && item.url.indexOf(cleanBase + '/') === 0) {
          // url 已含站点二级目录，避免重复拼接
          fullUrl = item.url;
        } else {
          fullUrl = cleanBase + item.url;
        }
        var key = item.url;
        if (seen.has(key)) return null;
        seen.add(key);
        var ts = item.date ? new Date(item.date).getTime() : 0;
        if (isNaN(ts)) ts = 0;
        var d = ts ? new Date(ts) : null;
        return {
          title: item.title || '未命名',
          url: fullUrl,
          key: key,
          categories: item.categories || [],
          tags: item.tags || [],
          cover: item.cover || '',
          year: d ? String(d.getFullYear()) : '',
          dateText: d ? d.toISOString().slice(0, 10) : '',
          ts: ts,
          excerpt: stripHtml(item.content || '').slice(0, 160)
        };
      })
      .filter(Boolean)
      .sort(function (a, b) {
        var ta = a.ts || 0;
        var tb = b.ts || 0;
        if (tb !== ta) return tb - ta;
        return (a.key || '') > (b.key || '') ? 1 : -1;
      });
  }

  function renderCard(post) {
    var wrapper = document.createElement('div');
    wrapper.className = 'recent-post-item';

    if (post.cover) {
      var coverMatch = post.cover.match(/\/1(\.\w+)$/);
      var hasMultiCovers = !!coverMatch;
      var cover1 = post.cover;
      var cover2 = hasMultiCovers ? cover1.replace(/\/1(\.\w+)$/, '/2$1') : null;
      var cover3 = hasMultiCovers ? cover1.replace(/\/1(\.\w+)$/, '/3$1') : null;
      var layoutMode = hasMultiCovers ? 'horizontal' : 'single';

      var coverWrap = document.createElement('div');
      coverWrap.className = 'post_cover ' + layoutMode;
      var link = document.createElement('a');
      link.href = post.url;
      link.title = post.title;

      if (hasMultiCovers) {
        var multiWrap = document.createElement('div');
        multiWrap.className = 'multi-cover-wrap';

        var img1 = document.createElement('img');
        img1.className = 'post-bg cover-1';
        img1.src = cover1;
        img1.alt = post.title;
        img1.onerror = function() { this.style.display = 'none'; };
        multiWrap.appendChild(img1);

        var img2 = document.createElement('img');
        img2.className = 'post-bg cover-2';
        img2.src = cover2;
        img2.alt = post.title;
        img2.onerror = function() { this.style.display = 'none'; };
        multiWrap.appendChild(img2);

        var img3 = document.createElement('img');
        img3.className = 'post-bg cover-3';
        img3.src = cover3;
        img3.alt = post.title;
        img3.onerror = function() { this.style.display = 'none'; };
        multiWrap.appendChild(img3);

        link.appendChild(multiWrap);
      } else {
        var img = document.createElement('img');
        img.className = 'post-bg';
        img.src = post.cover;
        img.alt = post.title;
        link.appendChild(img);
      }

      coverWrap.appendChild(link);
      wrapper.appendChild(coverWrap);
    }

    var info = document.createElement('div');
    info.className = post.cover ? 'recent-post-info' : 'recent-post-info no-cover';

    var titleLink = document.createElement('a');
    titleLink.className = 'article-title';
    titleLink.href = post.url;
    titleLink.textContent = post.title;
    info.appendChild(titleLink);

    var metaWrap = document.createElement('div');
    metaWrap.className = 'article-meta-wrap';

    if (post.dateText) {
      var dateSpan = document.createElement('span');
      dateSpan.className = 'post-meta-date';
      dateSpan.textContent = post.dateText;
      metaWrap.appendChild(dateSpan);
    }

    if (post.categories.length) {
      var catSpan = document.createElement('span');
      catSpan.className = 'article-meta';
      post.categories.forEach(function (cat, idx) {
        if (idx === 0) {
          var sep = document.createElement('span');
          sep.className = 'article-meta-separator';
          sep.textContent = '|';
          catSpan.appendChild(sep);
        }
        var icon = document.createElement('i');
        icon.className = 'fas fa-inbox';
        catSpan.appendChild(icon);
        var a = document.createElement('a');
        a.className = 'article-meta__categories';
        a.textContent = cat;
        catSpan.appendChild(a);
        if (idx < post.categories.length - 1) {
          var arrow = document.createElement('i');
          arrow.className = 'fas fa-angle-right article-meta-link';
          catSpan.appendChild(arrow);
        }
      });
      metaWrap.appendChild(catSpan);
    }

    if (post.tags.length) {
      var tagSpan = document.createElement('span');
      tagSpan.className = 'article-meta tags';
      var sep2 = document.createElement('span');
      sep2.className = 'article-meta-separator';
      sep2.textContent = '|';
      tagSpan.appendChild(sep2);
      post.tags.forEach(function (tag, idx) {
        var iconTag = document.createElement('i');
        iconTag.className = 'fas fa-tag';
        tagSpan.appendChild(iconTag);
        var aTag = document.createElement('a');
        aTag.className = 'article-meta__tags';
        aTag.textContent = tag;
        tagSpan.appendChild(aTag);
        if (idx < post.tags.length - 1) {
          var dot = document.createElement('span');
          dot.className = 'article-meta-link';
          dot.textContent = '·';
          tagSpan.appendChild(dot);
        }
      });
      metaWrap.appendChild(tagSpan);
    }

    info.appendChild(metaWrap);

    if (post.excerpt) {
      var content = document.createElement('div');
      content.className = 'content';
      content.textContent = post.excerpt;
      info.appendChild(content);
    }

    wrapper.appendChild(info);
    return wrapper;
  }

  function applyFilters() {
    filteredPosts = allPosts.filter(function (post) {
      var c = currentCategory === 'all' || post.categories.indexOf(currentCategory) !== -1;
      var t = currentTag === 'all' || post.tags.indexOf(currentTag) !== -1;
      var y = currentYear === 'all' || post.year === currentYear;
      return c && t && y;
    });
    filteredPosts.sort(function (a, b) {
      var ta = a.ts || 0;
      var tb = b.ts || 0;
      if (tb !== ta) return tb - ta;
      return (a.key || '') > (b.key || '') ? 1 : -1;
    });
    // 再次基于 url 去重，确保列表唯一
    var seenKeys = new Set();
    filteredPosts = filteredPosts.filter(function (post) {
      if (seenKeys.has(post.key)) return false;
      seenKeys.add(post.key);
      return true;
    });
    currentIndex = 0;
    renderedKeys = new Set();
    postContainer.innerHTML = '';
    loadingElement.style.display = 'none';
    if (!filteredPosts.length) {
      var empty = document.createElement('div');
      empty.className = 'no-posts-message';
      empty.textContent = 'No related items found';
      postContainer.appendChild(empty);
      return;
    }
    appendMore();
    fillViewport();
  }

  function appendMore() {
    if (isLoading) return;
    if (currentIndex >= filteredPosts.length) {
      loadingElement.style.display = 'none';
      return;
    }
    isLoading = true;
    loadingElement.style.display = 'block';
    var start = currentIndex;
    var end = Math.min(start + postsPerLoad, filteredPosts.length);
    currentIndex = end; // 先推进游标，避免异步重复
    var fragment = document.createDocumentFragment();
    for (var i = start; i < end; i++) {
      var post = filteredPosts[i];
      if (renderedKeys.has(post.key)) continue;
      renderedKeys.add(post.key);
      fragment.appendChild(renderCard(post));
    }
    postContainer.appendChild(fragment);
    isLoading = false;
    loadingElement.style.display = currentIndex >= filteredPosts.length ? 'none' : 'block';
  }

  function fillViewport() {
    if (isLoading) return;
    if (currentIndex < filteredPosts.length && loadingElement.getBoundingClientRect().top < window.innerHeight + 120) {
      appendMore();
      setTimeout(fillViewport, 60);
    }
  }

  function onScroll() {
    var near = loadingElement.getBoundingClientRect().top < window.innerHeight + 200;
    if (near) appendMore();
  }

  function bindFilters() {
    categoryItems.forEach(function (item) {
      item.addEventListener('click', function () {
        categoryItems.forEach(function (c) { c.classList.remove('active'); });
        this.classList.add('active');
        currentCategory = this.dataset.category || 'all';
        tagItems.forEach(function (t) { t.classList.remove('active'); });
        if (tagItems[0]) tagItems[0].classList.add('active');
        currentTag = 'all';
        yearItems.forEach(function (y) { y.classList.remove('active'); });
        if (yearItems[0]) yearItems[0].classList.add('active');
        currentYear = 'all';
        applyFilters();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });

    tagItems.forEach(function (item) {
      item.addEventListener('click', function () {
        tagItems.forEach(function (t) { t.classList.remove('active'); });
        this.classList.add('active');
        currentTag = this.dataset.tag || 'all';
        categoryItems.forEach(function (c) { c.classList.remove('active'); });
        if (categoryItems[0]) categoryItems[0].classList.add('active');
        currentCategory = 'all';
        yearItems.forEach(function (y) { y.classList.remove('active'); });
        if (yearItems[0]) yearItems[0].classList.add('active');
        currentYear = 'all';
        applyFilters();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });

    yearItems.forEach(function (item) {
      item.addEventListener('click', function () {
        yearItems.forEach(function (y) { y.classList.remove('active'); });
        this.classList.add('active');
        currentYear = this.dataset.year || 'all';
        categoryItems.forEach(function (c) { c.classList.remove('active'); });
        if (categoryItems[0]) categoryItems[0].classList.add('active');
        currentCategory = 'all';
        tagItems.forEach(function (t) { t.classList.remove('active'); });
        if (tagItems[0]) tagItems[0].classList.add('active');
        currentTag = 'all';
        applyFilters();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  }

  function init() {
    bindFilters();
    loadingElement.style.display = 'block';
    (function tryRoot(idx) {
      if (idx >= rootCandidates.length) {
        loadingElement.textContent = 'Loading failed';
        return;
      }
      var r = rootCandidates[idx];
      fetch(r + 'search.json', { credentials: 'same-origin' })
        .then(function (res) {
          if (!res.ok) throw new Error(res.status);
          return res.json();
        })
        .then(function (data) {
          rootUsed = r;
          allPosts = buildPosts(data || [], rootUsed);
          applyFilters();
          window.addEventListener('scroll', onScroll, { passive: true });
        })
        .catch(function () {
          tryRoot(idx + 1);
        });
    })(0);
  }

  init();
});
