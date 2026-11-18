document.querySelectorAll('.menu-icon-btn').forEach(button => {
    const navbar = button.closest('.navbar');
    if (!navbar) return;

    button.addEventListener('click', () => {
        const isOpen = navbar.classList.toggle('nav-open');
        button.setAttribute('aria-expanded', String(isOpen));
    });

    navbar.querySelectorAll('.navright a').forEach(link => {
        link.addEventListener('click', () => {
            if (!navbar.classList.contains('nav-open')) return;
            navbar.classList.remove('nav-open');
            button.setAttribute('aria-expanded', 'false');
        });
    });

    navbar.addEventListener('keydown', event => {
        if (event.key !== 'Escape' || !navbar.classList.contains('nav-open')) return;
        navbar.classList.remove('nav-open');
        button.setAttribute('aria-expanded', 'false');
        button.focus();
    });
});

if (document.documentElement.classList.contains('intro-loading')) {
    window.setTimeout(() => {
        document.documentElement.classList.add('intro-loader-dismissed');
        window.setTimeout(() => {
            document.documentElement.classList.remove('intro-loading', 'intro-loader-dismissed');
        }, 1000);
    }, 1800);
}

const galleryGrid = document.querySelector('.gallery-grid');
const galleryViewer = document.querySelector('#gallery-viewer');
const galleryViewerImage = document.querySelector('#gallery-viewer-image');
const galleryViewerDownload = document.querySelector('#gallery-viewer-download');
const galleryActionStatus = document.querySelector('#gallery-action-status');

function setGalleryActionStatus(message) {
    if (galleryActionStatus) galleryActionStatus.textContent = message;
}

async function shareGalleryImage(image) {
    const imageUrl = new URL(image.getAttribute('src'), document.baseURI).href;

    try {
        if (navigator.share) {
            await navigator.share({
                title: image.alt || 'Gallery image',
                text: image.alt || 'Gallery image',
                url: imageUrl
            });
            setGalleryActionStatus('Image shared.');
            return;
        }

        if (!navigator.clipboard?.writeText) {
            throw new Error('Sharing and clipboard access are not supported in this browser.');
        }

        await navigator.clipboard.writeText(imageUrl);
        setGalleryActionStatus('Image link copied to clipboard.');
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        const message = error instanceof Error ? error.message : 'Unknown error';
        setGalleryActionStatus(`Unable to share image: ${message}`);
    }
}

function showGalleryImage(image) {
    if (!galleryViewer || !galleryViewerImage || !galleryViewerDownload) return;

    galleryViewerImage.src = image.src;
    galleryViewerImage.alt = image.alt;
    galleryViewerDownload.href = image.src;
    galleryViewerDownload.download = image.getAttribute('src').split('/').pop() || 'gallery-image';
    galleryViewer.showModal();
}

galleryGrid?.addEventListener('click', event => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest('[data-gallery-action]');
    if (!button) return;

    const item = button.closest('.gallery-item');
    const image = item?.querySelector('img');
    if (!image) return;

    if (button.dataset.galleryAction === 'view') {
        showGalleryImage(image);
    } else if (button.dataset.galleryAction === 'share') {
        shareGalleryImage(image);
    }
});

galleryViewer?.addEventListener('click', event => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest('[data-gallery-action="share-viewer"]');
    if (button && galleryViewerImage?.src) shareGalleryImage(galleryViewerImage);
});
