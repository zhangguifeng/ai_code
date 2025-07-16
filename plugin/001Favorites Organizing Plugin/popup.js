class BookmarkManager {
    constructor() {
        this.bookmarks = [];
        this.filteredBookmarks = [];
        this.init();
    }

    async init() {
        await this.loadBookmarksFromStorage();
        this.bindEvents();
        this.updateUI();
    }

    bindEvents() {
        document.getElementById('syncBtn').addEventListener('click', () => this.syncBookmarks());
        document.getElementById('searchInput').addEventListener('input', (e) => this.searchBookmarks(e.target.value));
    }

    async syncBookmarks() {
        const syncBtn = document.getElementById('syncBtn');
        const originalText = syncBtn.textContent;
        
        try {
            syncBtn.textContent = '🔄 同步中...';
            syncBtn.disabled = true;

            // 获取所有收藏夹
            const bookmarkTree = await chrome.bookmarks.getTree();
            this.bookmarks = this.flattenBookmarks(bookmarkTree);
            
            // 保存到本地存储
            await this.saveBookmarksToStorage();
            
            // 更新界面
            this.filteredBookmarks = [...this.bookmarks];
            this.updateUI();
            this.updateLastSyncTime();
            
            // 显示成功消息
            this.showMessage('同步成功！', 'success');
            
        } catch (error) {
            console.error('同步收藏夹失败:', error);
            this.showMessage('同步失败，请重试', 'error');
        } finally {
            syncBtn.textContent = originalText;
            syncBtn.disabled = false;
        }
    }

    flattenBookmarks(nodes, folder = '') {
        let bookmarks = [];
        
        for (const node of nodes) {
            if (node.children) {
                // 这是一个文件夹
                const folderName = node.title || '根目录';
                bookmarks = bookmarks.concat(
                    this.flattenBookmarks(node.children, folderName)
                );
            } else if (node.url) {
                // 这是一个书签
                bookmarks.push({
                    id: node.id,
                    title: node.title,
                    url: node.url,
                    folder: folder,
                    dateAdded: node.dateAdded
                });
            }
        }
        
        return bookmarks;
    }

    async saveBookmarksToStorage() {
        const data = {
            bookmarks: this.bookmarks,
            lastSync: Date.now()
        };
        await chrome.storage.local.set(data);
    }

    async loadBookmarksFromStorage() {
        try {
            const result = await chrome.storage.local.get(['bookmarks', 'lastSync']);
            this.bookmarks = result.bookmarks || [];
            this.filteredBookmarks = [...this.bookmarks];
            
            if (result.lastSync) {
                this.updateLastSyncTime(result.lastSync);
            }
        } catch (error) {
            console.error('加载收藏夹失败:', error);
        }
    }

    searchBookmarks(query) {
        if (!query.trim()) {
            this.filteredBookmarks = [...this.bookmarks];
        } else {
            const searchTerm = query.toLowerCase();
            this.filteredBookmarks = this.bookmarks.filter(bookmark => 
                bookmark.title.toLowerCase().includes(searchTerm) ||
                bookmark.url.toLowerCase().includes(searchTerm) ||
                bookmark.folder.toLowerCase().includes(searchTerm)
            );
        }
        
        this.updateBookmarksList();
        this.updateStats();
    }

    updateUI() {
        this.updateStats();
        this.updateBookmarksList();
        
        // 隐藏加载消息
        document.getElementById('loadingMsg').style.display = 'none';
        
        // 显示或隐藏空状态
        const emptyMsg = document.getElementById('emptyMsg');
        emptyMsg.style.display = this.bookmarks.length === 0 ? 'block' : 'none';
    }

    updateStats() {
        document.getElementById('totalCount').textContent = `总计: ${this.bookmarks.length} 个收藏`;
        
        const filteredCount = document.getElementById('filteredCount');
        const searchInput = document.getElementById('searchInput');
        
        if (searchInput.value.trim() && this.filteredBookmarks.length !== this.bookmarks.length) {
            filteredCount.textContent = `找到: ${this.filteredBookmarks.length} 个`;
            filteredCount.style.display = 'inline';
        } else {
            filteredCount.style.display = 'none';
        }
    }

    updateBookmarksList() {
        const bookmarksList = document.getElementById('bookmarksList');
        bookmarksList.innerHTML = '';
        
        this.filteredBookmarks.forEach(bookmark => {
            const bookmarkElement = this.createBookmarkElement(bookmark);
            bookmarksList.appendChild(bookmarkElement);
        });
    }

    createBookmarkElement(bookmark) {
        const div = document.createElement('a');
        div.className = 'bookmark-item';
        div.href = bookmark.url;
        div.target = '_blank';
        
        // 获取网站图标
        const favicon = this.getFaviconUrl(bookmark.url);
        
        // 高亮搜索关键词
        const searchTerm = document.getElementById('searchInput').value.trim();
        const highlightedTitle = this.highlightText(bookmark.title, searchTerm);
        const highlightedUrl = this.highlightText(bookmark.url, searchTerm);
        
        // 创建图标元素
        const img = document.createElement('img');
        img.className = 'bookmark-favicon';
        img.src = favicon;
        img.alt = '';
        
        // 添加错误处理
        img.addEventListener('error', () => {
            img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#666" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>';
        });
        
        // 创建内容容器
        const contentDiv = document.createElement('div');
        contentDiv.className = 'bookmark-content';
        
        const titleDiv = document.createElement('div');
        titleDiv.className = 'bookmark-title';
        titleDiv.innerHTML = highlightedTitle;
        
        const urlDiv = document.createElement('div');
        urlDiv.className = 'bookmark-url';
        urlDiv.innerHTML = highlightedUrl;
        
        contentDiv.appendChild(titleDiv);
        contentDiv.appendChild(urlDiv);
        
        // 组装元素
        div.appendChild(img);
        div.appendChild(contentDiv);
        
        // 添加文件夹标签
        if (bookmark.folder) {
            const folderSpan = document.createElement('span');
            folderSpan.className = 'bookmark-folder';
            folderSpan.textContent = bookmark.folder;
            div.appendChild(folderSpan);
        }
        
        return div;
    }

    getFaviconUrl(url) {
        try {
            const domain = new URL(url).hostname;
            return `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
        } catch {
            return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#666" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>';
        }
    }

    highlightText(text, searchTerm) {
        if (!searchTerm) return text;
        
        const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<span class="highlight">$1</span>');
    }

    updateLastSyncTime(timestamp = null) {
        const lastSyncElement = document.getElementById('lastSyncTime');
        const time = timestamp || Date.now();
        const date = new Date(time);
        const formattedTime = date.toLocaleString('zh-CN', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        lastSyncElement.textContent = `最后同步: ${formattedTime}`;
    }

    showMessage(message, type = 'info') {
        // 创建临时消息提示
        const messageDiv = document.createElement('div');
        messageDiv.textContent = message;
        messageDiv.className = `message-toast message-${type}`;
        
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 2000);
    }
}

// CSS动画已移至popup.css文件中

// 初始化应用
new BookmarkManager();