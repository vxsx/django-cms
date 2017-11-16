import $ from 'jquery';
import srcDoc from 'srcdoc-polyfill';
import { $window, $document } from './cms.base';
import Resizer from './cms.resizer';

let markupPromise;
const getCurrentMarkup = () => {
    var newDoc = new DOMParser().parseFromString(document.documentElement.outerHTML, 'text/html');

    $(newDoc)
        .find('html')
        .css('margin-top', '0')
        .removeClass(
            'cms-overflow cms-responsive-overflow ' +
            'cms-structure-mode-content cms-structure-mode-structure cms-toolbar-expanded cms-ready'
        )
        .find('#cms-top, [data-cms]').remove();
    return Promise.resolve(newDoc.documentElement.outerHTML);
    // TODO reset back to ?edit afterwards
    // return $.ajax({
    //     url: window.location.pathname + '?toolbar_off'
    // }).then(markup => markup);
};
const getOrAddFrame = () => {
    let frame = $('.cms-responsive-preview-frame');

    if (frame.length) {
        return frame[0];
    }

    frame = $('<iframe class="cms-responsive-preview-frame"></iframe>');

    return frame[0];
};
const preventScrolling = () => $('html').addClass('cms-responsive-overflow');
const allowScrolling = () => $('html').removeClass('cms-responsive-overflow');

class ResponsivePreview {
    constructor() {
        this.isOpen = false;

        this._setupUI();
        this._events();
    }

    _setupUI() {
        this.ui = {
            trigger: $('.cms-responsive-view')
        };
    }

    _events() {
        this.ui.trigger.on(ResponsivePreview.click, () => this.toggleResponsiveView());

        $window.on('cms-content-refresh', () => {
            markupPromise = null;
            this._loadMarkup().then(markup => {
                const frame = getOrAddFrame();

                srcDoc.set(frame, markup);
            });
        });
    }

    toggleResponsiveView() {
        if (this.isOpen) {
            this.isOpen = false;
            this.ui.trigger.removeClass('cms-btn-active');
            return this._destroyUI();
        }

        this.isOpen = true;
        this.ui.trigger.addClass('cms-btn-active');
        return this._loadMarkup()
            .then(this._buildUI.bind(this));
    }

    _loadMarkup() {
        if (!markupPromise) {
            CMS.API.Toolbar.showLoader();
            markupPromise = getCurrentMarkup().then(r => {
                CMS.API.Toolbar.hideLoader();
                return r;
            });
        }
        return markupPromise;
    }

    _buildUI(markup) {
        const frame = getOrAddFrame();

        preventScrolling();
        srcDoc.set(frame, markup);

        this.resizer = new Resizer({
            frame: frame
        });

        $(frame).on('load', () => {
            setTimeout(() => {
                $(frame.contentDocument.documentElement)
                    .on('pointerover.cms pointerout.cms touchstart.cms click.cms dblclick.cms', '.cms-plugin', e => {
                        e.preventDefault();
                        if (e.type !== 'click') {
                            e.stopPropagation();
                        }
                        var event = new $.Event(e.type);

                        if (!e.currentTarget.className) {
                            return;
                        }

                        let xAdjustment = this.resizer.ui.wrapper.offset().left;
                        let yAdjustment = this.resizer.ui.wrapper.offset().top;
                        // FIXME nested plugins are not highlighted

                        event.target = $('.' + e.currentTarget.className.split(/\s+/g).join('.'))[0];
                        event.originalEvent = {
                            pageX: e.clientX + xAdjustment,
                            pageY: e.clientY + yAdjustment
                        };

                        $document.trigger(event);
                    })
                    // .on('click dblclick', '.cms-plugin', e => {
                    //     $('.' + e.currentTarget.className.split(/\s+/g).join('.')).trigger(e.type);
                    // });
                    .find('body')
                    .on('mousemove', e => {
                        var event = new $.Event(e.type);

                        let xAdjustment = this.resizer.ui.wrapper.offset().left;
                        let yAdjustment = this.resizer.ui.wrapper.offset().top;

                        event.target = e.target;
                        event.pageX = e.clientX + xAdjustment;
                        event.pageY = e.clientY + yAdjustment;

                        $document.find('body').trigger(event);
                    });
            }, 50); // eslint-disable-line no-magic-numbers
        });
    }

    _destroyUI() {
        this.resizer.destroy();
        this.resizer = null;
        allowScrolling();

        return Promise.resolve();
    }
}

const cancelIfLoadedInsideAnIframe = () => {
    // FIXME check the window name, no need to break out of all iframes
    if (window.parent && window.parent !== window) {
        window.top.location.href = window.location.href;
    }
};

cancelIfLoadedInsideAnIframe();

ResponsivePreview.click = 'click.cms.responsive';

export default ResponsivePreview;
