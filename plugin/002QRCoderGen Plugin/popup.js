// QR Code Generator Plugin JavaScript

class QRCodeGenerator {
    constructor() {
        this.qrCode = null;
        this.initializeElements();
        this.bindEvents();
    }

    initializeElements() {
        this.textInput = document.getElementById('textInput');
        this.sizeSelect = document.getElementById('sizeSelect');
        this.errorLevel = document.getElementById('errorLevel');
        this.colorForeground = document.getElementById('colorForeground');
        this.colorBackground = document.getElementById('colorBackground');
        this.generateBtn = document.getElementById('generateBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.copyBtn = document.getElementById('copyBtn');
        this.qrContainer = document.getElementById('qrContainer');
        this.qrPlaceholder = document.getElementById('qrPlaceholder');
        this.qrCanvas = document.getElementById('qrCanvas');
    }

    bindEvents() {
        this.generateBtn.addEventListener('click', () => this.generateQRCode());
        this.clearBtn.addEventListener('click', () => this.clearInput());
        this.downloadBtn.addEventListener('click', () => this.downloadQRCode());
        this.copyBtn.addEventListener('click', () => this.copyToClipboard());
        
        // 实时生成二维码（当参数改变时）
        this.sizeSelect.addEventListener('change', () => this.regenerateIfHasContent());
        this.errorLevel.addEventListener('change', () => this.regenerateIfHasContent());
        this.colorForeground.addEventListener('change', () => this.regenerateIfHasContent());
        this.colorBackground.addEventListener('change', () => this.regenerateIfHasContent());
        
        // 回车键生成二维码
        this.textInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.generateQRCode();
            }
        });
    }

    generateQRCode() {
        const text = this.textInput.value.trim();
        
        if (!text) {
            this.showMessage('请输入要生成二维码的内容', 'error');
            return;
        }

        try {
            // 清除之前的二维码
            this.clearQRCode();
            
            // 获取设置参数
            const size = parseInt(this.sizeSelect.value);
            const errorCorrectionLevel = this.getErrorCorrectionLevel();
            const colorDark = this.colorForeground.value;
            const colorLight = this.colorBackground.value;

            // 创建二维码配置
            const qrConfig = {
                text: text,
                width: size,
                height: size,
                colorDark: colorDark,
                colorLight: colorLight,
                correctLevel: errorCorrectionLevel
            };

            // 生成二维码
            this.qrCode = new QRCode(this.qrContainer, qrConfig);
            
            // 隐藏占位符，显示二维码
            this.qrPlaceholder.style.display = 'none';
            this.qrContainer.classList.add('has-qr');
            
            // 启用下载和复制按钮
            this.downloadBtn.disabled = false;
            this.copyBtn.disabled = false;
            
            this.showMessage('二维码生成成功！', 'success');
            
        } catch (error) {
            console.error('生成二维码时出错:', error);
            this.showMessage('生成二维码失败，请重试', 'error');
        }
    }

    getErrorCorrectionLevel() {
        const level = this.errorLevel.value;
        switch (level) {
            case 'L': return QRCode.CorrectLevel.L;
            case 'M': return QRCode.CorrectLevel.M;
            case 'Q': return QRCode.CorrectLevel.Q;
            case 'H': return QRCode.CorrectLevel.H;
            default: return QRCode.CorrectLevel.M;
        }
    }

    clearQRCode() {
        // 清除容器内容
        while (this.qrContainer.firstChild) {
            this.qrContainer.removeChild(this.qrContainer.firstChild);
        }
        
        // 重新添加占位符
        this.qrContainer.appendChild(this.qrPlaceholder);
        this.qrPlaceholder.style.display = 'block';
        this.qrContainer.classList.remove('has-qr');
        
        // 禁用按钮
        this.downloadBtn.disabled = true;
        this.copyBtn.disabled = true;
        
        this.qrCode = null;
    }

    clearInput() {
        this.textInput.value = '';
        this.clearQRCode();
        this.textInput.focus();
    }

    regenerateIfHasContent() {
        if (this.textInput.value.trim() && this.qrCode) {
            this.generateQRCode();
        }
    }

    downloadQRCode() {
        if (!this.qrCode) {
            this.showMessage('请先生成二维码', 'error');
            return;
        }

        try {
            // 查找生成的canvas或img元素
            const canvas = this.qrContainer.querySelector('canvas');
            const img = this.qrContainer.querySelector('img');
            
            if (canvas) {
                this.downloadFromCanvas(canvas);
            } else if (img) {
                this.downloadFromImage(img);
            } else {
                this.showMessage('无法找到二维码图像', 'error');
            }
        } catch (error) {
            console.error('下载二维码时出错:', error);
            this.showMessage('下载失败，请重试', 'error');
        }
    }

    downloadFromCanvas(canvas) {
        const link = document.createElement('a');
        link.download = `qrcode_${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        this.showMessage('二维码下载成功！', 'success');
    }

    downloadFromImage(img) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = img.width;
        canvas.height = img.height;
        
        ctx.drawImage(img, 0, 0);
        
        const link = document.createElement('a');
        link.download = `qrcode_${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        this.showMessage('二维码下载成功！', 'success');
    }

    async copyToClipboard() {
        if (!this.qrCode) {
            this.showMessage('请先生成二维码', 'error');
            return;
        }

        try {
            const canvas = this.qrContainer.querySelector('canvas');
            const img = this.qrContainer.querySelector('img');
            
            if (canvas) {
                await this.copyCanvasToClipboard(canvas);
            } else if (img) {
                await this.copyImageToClipboard(img);
            } else {
                this.showMessage('无法找到二维码图像', 'error');
                return;
            }
            
            this.showMessage('二维码已复制到剪贴板！', 'success');
        } catch (error) {
            console.error('复制到剪贴板时出错:', error);
            this.showMessage('复制失败，请重试', 'error');
        }
    }

    async copyCanvasToClipboard(canvas) {
        return new Promise((resolve, reject) => {
            canvas.toBlob(async (blob) => {
                try {
                    await navigator.clipboard.write([
                        new ClipboardItem({ 'image/png': blob })
                    ]);
                    resolve();
                } catch (error) {
                    reject(error);
                }
            }, 'image/png');
        });
    }

    async copyImageToClipboard(img) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        await this.copyCanvasToClipboard(canvas);
    }

    showMessage(message, type = 'info') {
        // 创建消息提示
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-${type}`;
        messageDiv.textContent = message;
        
        // 添加样式
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 6px;
            color: white;
            font-weight: 500;
            z-index: 1000;
            animation: slideIn 0.3s ease;
            max-width: 300px;
            word-wrap: break-word;
        `;
        
        // 根据类型设置背景色
        switch (type) {
            case 'success':
                messageDiv.style.background = 'linear-gradient(135deg, #4CAF50, #45a049)';
                break;
            case 'error':
                messageDiv.style.background = 'linear-gradient(135deg, #f44336, #da190b)';
                break;
            default:
                messageDiv.style.background = 'linear-gradient(135deg, #2196F3, #0b7dda)';
        }
        
        document.body.appendChild(messageDiv);
        
        // 3秒后自动移除
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => {
                    if (messageDiv.parentNode) {
                        messageDiv.parentNode.removeChild(messageDiv);
                    }
                }, 300);
            }
        }, 3000);
    }
}

// 添加动画样式
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// 当DOM加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new QRCodeGenerator();
});