// 服务工作者 - 处理插件后台逻辑

// 插件安装时的初始化
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        console.log('收藏夹整理助手已安装');
        
        // 设置默认配置
        chrome.storage.local.set({
            autoSync: false,
            syncInterval: 24 * 60 * 60 * 1000, // 24小时
            lastSync: null
        });
    } else if (details.reason === 'update') {
        console.log('收藏夹整理助手已更新');
    }
});

// 监听收藏夹变化（可选功能 - 实时同步）
chrome.bookmarks.onCreated.addListener((id, bookmark) => {
    console.log('新增收藏夹:', bookmark);
    // 可以在这里实现实时同步功能
});

chrome.bookmarks.onRemoved.addListener((id, removeInfo) => {
    console.log('删除收藏夹:', id);
    // 可以在这里实现实时同步功能
});

chrome.bookmarks.onChanged.addListener((id, changeInfo) => {
    console.log('收藏夹变更:', id, changeInfo);
    // 可以在这里实现实时同步功能
});

// 处理来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case 'getBookmarks':
            handleGetBookmarks(sendResponse);
            return true; // 保持消息通道开放
            
        case 'syncBookmarks':
            handleSyncBookmarks(sendResponse);
            return true;
            
        default:
            sendResponse({ error: '未知操作' });
    }
});

// 获取收藏夹数据
async function handleGetBookmarks(sendResponse) {
    try {
        const bookmarkTree = await chrome.bookmarks.getTree();
        const flatBookmarks = flattenBookmarks(bookmarkTree);
        
        sendResponse({ 
            success: true, 
            bookmarks: flatBookmarks,
            count: flatBookmarks.length
        });
    } catch (error) {
        console.error('获取收藏夹失败:', error);
        sendResponse({ 
            success: false, 
            error: error.message 
        });
    }
}

// 同步收藏夹到本地存储
async function handleSyncBookmarks(sendResponse) {
    try {
        const bookmarkTree = await chrome.bookmarks.getTree();
        const flatBookmarks = flattenBookmarks(bookmarkTree);
        
        // 保存到本地存储
        await chrome.storage.local.set({
            bookmarks: flatBookmarks,
            lastSync: Date.now(),
            syncCount: flatBookmarks.length
        });
        
        sendResponse({ 
            success: true, 
            message: '同步成功',
            count: flatBookmarks.length
        });
    } catch (error) {
        console.error('同步收藏夹失败:', error);
        sendResponse({ 
            success: false, 
            error: error.message 
        });
    }
}

// 扁平化收藏夹树结构
function flattenBookmarks(nodes, folder = '') {
    let bookmarks = [];
    
    for (const node of nodes) {
        if (node.children) {
            // 这是一个文件夹
            const folderName = node.title || '根目录';
            bookmarks = bookmarks.concat(
                flattenBookmarks(node.children, folderName)
            );
        } else if (node.url) {
            // 这是一个书签
            bookmarks.push({
                id: node.id,
                title: node.title || '无标题',
                url: node.url,
                folder: folder,
                dateAdded: node.dateAdded,
                parentId: node.parentId
            });
        }
    }
    
    return bookmarks;
}

// 定期清理存储（可选）
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'cleanupStorage') {
        cleanupOldData();
    }
});

// 清理旧数据
async function cleanupOldData() {
    try {
        const result = await chrome.storage.local.get(['lastSync']);
        const lastSync = result.lastSync;
        
        if (lastSync) {
            const daysSinceSync = (Date.now() - lastSync) / (1000 * 60 * 60 * 24);
            
            // 如果超过30天未同步，清理数据
            if (daysSinceSync > 30) {
                await chrome.storage.local.clear();
                console.log('已清理过期的收藏夹数据');
            }
        }
    } catch (error) {
        console.error('清理数据失败:', error);
    }
}

// 设置定期清理任务
chrome.alarms.create('cleanupStorage', {
    delayInMinutes: 60, // 1小时后开始
    periodInMinutes: 24 * 60 // 每24小时执行一次
});

// 错误处理
chrome.runtime.onSuspend.addListener(() => {
    console.log('收藏夹整理助手服务工作者暂停');
});

chrome.runtime.onStartup.addListener(() => {
    console.log('收藏夹整理助手服务工作者启动');
});