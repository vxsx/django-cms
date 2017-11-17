import $ from 'jquery';
import { $window } from './cms.base';
import { isEqual } from 'lodash';
import measureScrollbar from './scrollbar';
import ls from 'local-storage';

const TRANSITION_TIME = 150;
const storageKey = 'cms-responsive-viewer';

/**
 * hasVerticalScrollbar
 *
 * @public
 * @param {HTMLElement} element
 * @param {Window} [win=window]
 * @returns {Boolean}
 */
function hasVerticalScrollbar (element, win = window) {
    const style = win.getComputedStyle(element);

    return !!(element.scrollTop || (++element.scrollTop && element.scrollTop--))
           && style.overflow !== 'hidden' && style['overflow-y'] !== 'hidden' || style['overflow-y'] === 'scroll';
}

// TODO namespace events
// TODO when toolbar reloads the button is no longer active
export default class Resizer {
    constructor({ frame }) {
        this._buildUI();
        this._setupUI(frame);
        this._events();
        this.currentDevice = ls.get(storageKey) || Resizer.devices[0];
        this.updateButtons($(`.cms-resizer-device[data-name="${this.currentDevice.name}"]`));
        this.changeDevice(this.currentDevice);
    }

    _buildUI() {
        $('#cms-top').append(`
            <div class="cms-resizer">
                <div class="cms-resizer-toolbar">
                    <div class="cms-resizer-devices">
                        ${Resizer.devices.map((device, i) => {
                            return `
                                <a href="javascript: void 0;"
                                    class="cms-resizer-device ${i === 0 ? ' cms-resizer-device-active' : ''}"
                                    data-name="${device.name}"
                                    data-width="${device.width}"
                                    data-height="${device.height}"
                                    >
                                    <span class="cms-resizer-device-name">${device.name}</span>
                                </a>
                            `;
                        }).join('\n')}
                    </div>
                    <div class="cms-resizer-info">
                    </div>
                </div>
                <div class="cms-resizer-container cms-resizer-container-auto">
                    <div class="cms-resizer-preview"></div>
                    <div class="cms-resizer-wrapper">
                        <div class="cms-resizer-handle cms-resizer-handle-e"></div>
                        <div class="cms-resizer-handle cms-resizer-handle-w"></div>
                        <div class="cms-resizer-handle cms-resizer-handle-s"></div>
                        <div class="cms-resizer-handle cms-resizer-handle-se"></div>
                        <div class="cms-resizer-handle cms-resizer-handle-sw"></div>
                    </div>
                </div>
            </div>
        `);
    }

    _setupUI(frame) {
        this.ui = {
            frame,
            resizer: $('.cms-resizer'),
            wrapper: $('.cms-resizer-wrapper'),
            preview: $('.cms-resizer-preview'),
            container: $('.cms-resizer-container'),
            devices: $('.cms-resizer-device'),
            info: $('.cms-resizer-info')
        };
        this.ui.wrapper.prepend(frame);
    }

    _events() {
        this.ui.devices.on('click', e => {
            const button = $(e.target).closest('.cms-resizer-device');
            const data = button.data();

            if (button.hasClass('cms-resizer-device-active')) {
                if (data.width === 'auto') {
                    return;
                }

                this.changeDevice({
                    width: this.currentDevice.height,
                    height: this.currentDevice.width,
                    name: this.currentDevice.name
                });
                return;
            }
            this.updateButtons(button);
            this.changeDevice(data);
        });

        this.ui.devices.on('mouseover', e => {
            const button = $(e.target).closest('.cms-resizer-device');
            let data = button.data();

            if (isEqual(this.currentDevice, data)) {
                data = {
                    width: data.height,
                    height: data.width
                };
            }

            if (data.width === 'auto') {
                this.ui.preview.css({
                    marginTop: -40,
                    width: '100%',
                    height: '100%'
                });
            } else {
                this.ui.preview.css({
                    marginTop: 0,
                    width: data.width,
                    height: data.height
                });
            }
        }).on('mouseleave', () => {
            this.ui.preview.css({
                marginTop: 0,
                width: this.currentDevice.width,
                height: this.currentDevice.height
            });
        });

        $window.on('resize', () => {
            if (!this.currentDevice) {
                return;
            }
            this.updateInfo(this.currentDevice);
        });
    }

    changeDevice({ name, width, height }) {
        ls.set(storageKey, { name, width, height });
        this.updateInfo({ name, width, height });
        clearInterval(this.x);
        this.currentDevice = {
            name,
            width,
            height
        };
        this.ui.wrapper.addClass('cms-resizer-wrapper-transition');

        const frame = $(this.ui.frame);
        const scrollbarWidth = measureScrollbar();

        if (width === 'auto') {
            this.ui.container.addClass('cms-resizer-container-auto');
            this.ui.wrapper.css({
                width: '100%',
                height: '100%'
            });
            this.ui.preview.css({
                marginTop: -40,
                width: '100%',
                height: '100%'
            });
            frame.css({
                width: '100%'
            });
        } else {
            this.ui.container.removeClass('cms-resizer-container-auto');
            this.ui.wrapper.css({
                width,
                height
            });
            this.ui.preview.css({
                marginTop: 0,
                width,
                height
            });
            frame.css({
                width: '100%'
            });

            if (!scrollbarWidth) {
                return;
            }

            // in case there's a scrollbar - account for it
            const html = this.ui.frame.contentDocument.documentElement;
            const win = this.ui.frame.contentWindow;

            setTimeout(() => {
                this.ui.wrapper.removeClass('cms-resizer-wrapper-transition');
                let hasCorrectedWidth = false;

                this.x = setInterval(() => {
                    var hasScrollbar = hasVerticalScrollbar(html, win);

                    if (!hasCorrectedWidth && hasScrollbar) {
                        frame.css({
                            width: width + scrollbarWidth
                        });
                        hasCorrectedWidth = true;
                    } else if (hasCorrectedWidth && !hasScrollbar) {
                        frame.css({
                            width: width
                        });
                        hasCorrectedWidth = false;
                    }
                }, 16); // eslint-disable-line
            }, TRANSITION_TIME);
        }
    }

    updateInfo({ width, height }) {
        let w = width;
        let h = height;

        if (width === 'auto') {
            w = this.ui.container.width();
            h = this.ui.container.height();
        }

        this.ui.info.text(`${w}⨉${h}`);
    }

    updateButtons(button) {
        this.ui.devices.removeClass('cms-resizer-device-active');
        button.addClass('cms-resizer-device-active');
    }

    destroy() {
        this.ui.resizer.remove();
    }
}

Resizer.devices = window._devices || [
    {
        name: 'Auto',
        width: 'auto',
        height: 'auto'
    },
    {
        name: 'iPhone 5',
        width: 320,
        height: 568
    },
    {
        name: 'iPhone 7',
        width: 375,
        height: 667
    },
    {
        name: 'iPhone 7+',
        width: 414,
        height: 736
    },
    {
        name: 'iPad',
        width: 768,
        height: 1024
    },
    {
        name: 'iPad Pro',
        width: 1024,
        height: 1366
    },
    {
        name: 'Widescreen',
        width: 1280,
        height: 800
    }
];
