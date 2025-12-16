document.addEventListener('DOMContentLoaded', function() {
    // 通用处理函数
    function handleMoreClick(moreBtn, itemSelector) {
      if (!moreBtn) return;
      
      const items = document.querySelectorAll(itemSelector);
      const moreText = moreBtn.querySelector('.more-text');
      const lessText = moreBtn.querySelector('.less-text');
      let isExpanded = false;
  
      moreBtn.addEventListener('click', function() {
        isExpanded = !isExpanded;
        
        items.forEach((item, index) => {
          if (index >= 9) {
            item.style.display = isExpanded ? 'flex' : 'none';
          }
        });
        
        moreText.classList.toggle('hidden');
        lessText.classList.toggle('hidden');
      });
    }
  
    // 处理分类
    handleMoreClick(
      document.querySelector('.category-more'),
      '.category-nav-item:not(.active)'
    );
  
    // 处理标签
    handleMoreClick(
      document.querySelector('.tag-more'),
      '.tag-nav-item:not(.active)'
    );
  
    // 处理年份
    handleMoreClick(
      document.querySelector('.year-more'),
      '.year-nav-item:not(.active)'
    );
  });