(function () {
    const FILES_ENDPOINT = '/shmastra/api/files';
    let uploadsInProgress = 0;
    const uploadedUrls = new WeakMap();

    const origCreateObjectURL = URL.createObjectURL.bind(URL);
    URL.createObjectURL = function (obj) {
        const url = uploadedUrls.get(obj);
        if (url) return url;
        return origCreateObjectURL(obj);
    };

    // Override FileReader to return a URL instead of base64 for uploaded images
    const OrigFileReader = window.FileReader;
    const origReadAsDataURL = OrigFileReader.prototype.readAsDataURL;
    OrigFileReader.prototype.readAsDataURL = function (blob) {
        const url = uploadedUrls.get(blob);
        if (url) {
            // Simulate successful read with the server URL as result
            setTimeout(() => {
                Object.defineProperty(this, 'result', { value: url, writable: true, configurable: true });
                Object.defineProperty(this, 'readyState', { value: 2, writable: true, configurable: true });
                this.onload?.({ target: this });
            }, 0);
            return;
        }
        return origReadAsDataURL.call(this, blob);
    };

    const origAppendChild = document.body.appendChild.bind(document.body);

    const style = document.createElement('style');
    style.textContent = `
        @keyframes upload-spin {
            to { transform: rotate(360deg); }
        }
        .upload-spinner {
            width: 20px;
            height: 20px;
            border: 2px solid currentColor;
            border-top-color: transparent;
            border-radius: 50%;
            animation: upload-spin 0.6s linear infinite;
        }
        .file-input-wrapper {
            position: relative;
            display: inline-block;
            width: 100%;
        }
        .file-upload-spinner {
            display: none;
            position: absolute;
            right: 8px;
            top: 50%;
            transform: translateY(-50%);
            width: 16px;
            height: 16px;
            border: 2px solid currentColor;
            border-top-color: transparent;
            border-radius: 50%;
            animation: upload-spin 0.6s linear infinite;
            pointer-events: none;
        }
    `;
    document.head.appendChild(style);

    document.body.appendChild = function (node) {
        if (node.nodeName === 'INPUT' && node.type === 'file' && node.hidden) {
            node.removeAttribute('accept');

            const origClick = node.click.bind(node);
            node.click = function () {
                Promise.resolve().then(() => {
                    const originalOnChange = node.onchange;
                    node.onchange = async (e) => {
                        const files = Array.from(node.files);
                        if (!files.length) {
                            if (originalOnChange) originalOnChange.call(node, e);
                            return;
                        }

                        uploadsInProgress++;
                        updateSendButton();

                        const fakeFiles = [];
                        for (const file of files) {
                            try {
                                const res = await uploadFile(file);
                                const mimeType = getAcceptableMimeType(file.type);
                                const fakeFile = new File([], res.fileName, { type: mimeType });
                                if (file.type.startsWith('image/')) {
                                    uploadedUrls.set(fakeFile, res.url);
                                }
                                fakeFiles.push(fakeFile);
                            } catch (err) {
                                alert(`Upload failed: ${file.name}: ${err.message}`);
                                uploadsInProgress--;
                                updateSendButton();
                                return;
                            }
                        }

                        uploadsInProgress--;
                        updateSendButton();

                        const dt = new DataTransfer();
                        fakeFiles.forEach(f => dt.items.add(f));
                        node.files = dt.files;

                        if (originalOnChange) originalOnChange.call(node, e);
                    };

                    origClick();
                });
            };
        }

        return origAppendChild(node);
    };

    function updateSendButton() {
        const sendBtn = document.querySelector('button[aria-label="Send"]');
        if (!sendBtn) return;

        if (uploadsInProgress > 0) {
            sendBtn.disabled = true;
            sendBtn.style.opacity = '0.4';
            sendBtn.style.pointerEvents = 'none';
            if (!sendBtn.querySelector('.upload-spinner')) {
                sendBtn._originalHTML = sendBtn.innerHTML;
                sendBtn.innerHTML = '<div class="upload-spinner"></div>';
            }
        } else {
            sendBtn.disabled = false;
            sendBtn.style.opacity = '';
            sendBtn.style.pointerEvents = '';
            if (sendBtn._originalHTML) {
                sendBtn.innerHTML = sendBtn._originalHTML;
                sendBtn._originalHTML = null;
            }
        }
    }

    function getAcceptableMimeType(type) {
        if (type.startsWith('image/')) return type;
        return 'text/plain';
    }

    // Replace workflow form inputs with id starting with "file" with file upload inputs
    function replaceFileInputs() {
        document.querySelectorAll('input[id^="file_field_"]').forEach((input) => {
            if (input.dataset.fileUploadHandled) return;
            input.dataset.fileUploadHandled = 'true';

            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.className = input.className;
            fileInput.style.cssText = input.style.cssText;

            fileInput.addEventListener('change', async (e) => {
                const file = fileInput.files?.[0];
                if (!file) return;

                fileInput.disabled = true;
                const wrapper = fileInput.closest('.file-input-wrapper');
                const spinner = wrapper.querySelector('.file-upload-spinner');
                spinner.style.display = 'block';
                try {
                    const res = await uploadFile(file);
                    spinner.style.display = 'none';
                    // Use React's native setter + reset value tracker to trigger onChange
                    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                        HTMLInputElement.prototype, 'value'
                    ).set;
                    nativeInputValueSetter.call(input, res.fileName);
                    const tracker = input._valueTracker;
                    if (tracker) tracker.setValue('');
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                } catch (err) {
                    spinner.style.display = 'none';
                    alert(`Upload failed: ${file.name}: ${err.message}`);
                } finally {
                    fileInput.disabled = false;
                }
            });

            // Hide original input visually but keep it as text so React's value tracker works
            input.style.display = 'none';
            // Wrap file input with a relative container for the spinner
            const wrapper = document.createElement('div');
            wrapper.className = 'file-input-wrapper';
            const spinner = document.createElement('div');
            spinner.className = 'file-upload-spinner';
            wrapper.appendChild(fileInput);
            wrapper.appendChild(spinner);
            input.parentElement.insertBefore(wrapper, input.nextSibling);
        });
    }

    // Observe DOM for dynamically added workflow form inputs
    const fileInputObserver = new MutationObserver(() => replaceFileInputs());
    fileInputObserver.observe(document.body, { childList: true, subtree: true });
    // Also run once on load
    replaceFileInputs();

    async function uploadFile(file) {
        const form = new FormData();
        form.append('file', file);
        const res = await fetch(FILES_ENDPOINT, { method: 'POST', body: form });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        return {
            fileName: json.fileName,
            url: `${FILES_ENDPOINT}/${json.fileName}`
        }
    }
})();