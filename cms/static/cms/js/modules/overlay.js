import $ from 'jquery';
import { uniq, findIndex, isNaN, debounce } from 'lodash';
import { Helpers, $window, uid } from './cms.base';

/**
 * getOverlayCoordinates
 *
 * @public
 * @param {jQuery} els elements to create overlay over
 * @param {Object} [options]
 * @param {jQuery} [options.html=$('html')]
 * @param {Object} [options.withMargins=true]
 * @returns {Object}
 */
export function getOverlayCoordinates(els, { html = $('html'), withMargins = true } = {}) {
    var coordinates = {};
    var positions = [];

    els.each(function() {
        var el = $(this);
        var offset = el.offset();
        let ml = parseInt(el.css('margin-left'), 10);
        let mr = parseInt(el.css('margin-right'), 10);
        let mt = parseInt(el.css('margin-top'), 10);
        let mb = parseInt(el.css('margin-bottom'), 10);

        if (!withMargins || isNaN(ml)) {
            ml = 0;
        }
        if (!withMargins || isNaN(mr)) {
            mr = 0;
        }
        if (!withMargins || isNaN(mt)) {
            mt = 0;
        }
        if (!withMargins || isNaN(mb)) {
            mb = 0;
        }

        positions.push({
            x1: offset.left - ml,
            x2: offset.left + el.outerWidth() + mr,
            y1: offset.top - mt,
            y2: offset.top + el.outerHeight() + mb
        });
    });

    // turns out that offset calculation will be off by toolbar height if
    // position is set to "relative" on html element.
    var htmlMargin = html.css('position') === 'relative' ? parseInt(html.css('margin-top'), 10) : 0;

    coordinates.left = Math.min(...positions.map(pos => pos.x1));
    coordinates.top = Math.min(...positions.map(pos => pos.y1)) - htmlMargin;
    coordinates.width = Math.max(...positions.map(pos => pos.x2)) - coordinates.left;
    coordinates.height = Math.max(...positions.map(pos => pos.y2)) - coordinates.top - htmlMargin;

    return coordinates;
}

/**
 * isInsideCoordinates
 *
 * @public
 * @param {Event} event mouse event
 * @param {Number} event.pageX
 * @param {Number} event.pageY
 * @param {Object} coordinates
 * @param {Number} coordinates.left
 * @param {Number} coordinates.top
 * @param {Number} coordinates.width
 * @param {Number} coordinates.height
 * @returns {Boolean}
 */
export function isInsideCoordinates({ pageX, pageY }, { left, top, width, height }) {
    if (pageX >= left && pageX <= left + width && pageY >= top && pageY <= top + height) {
        return true;
    }
    return false;
}

let overlays = [];

class Overlay {
    constructor(plugin, options) {
        this.plugin = plugin;

        overlays.push(this);

        this.ui = {
            overlay: $(),
            html: options.html || $('html')
        };
        this._initialized = false;
        this.visible = false;
        this.uid = uid();
    }

    init() {
        this.updateCoordinates();
        this.events();
        this._initialized = true;
    }

    events() {
        $window.on(`resize.cms-plugin-overlay-${this.plugin.options.plugin_id}-${this.uid}`, () =>
            this.updateCoordinates()
        );

        this.getOrCreateOverlay()
            .find('.js-delete')
            // FIXME separate methods, namespaced events
            .on('click', e => {
                if ($(e.currentTarget).is('.cms-btn-disabled')) {
                    return;
                }
                var that = this.plugin; // eslint-disable-line

                that.deletePlugin(
                    Helpers.updateUrlWithPath(that.options.urls.delete_plugin),
                    that.options.plugin_name,
                    that._getPluginBreadcrumbs()
                );
            })
            .end()
            .find('.js-move-up')
            .on('click', e => {
                if ($(e.currentTarget).is('.cms-btn-disabled')) {
                    return;
                }
                const newPluginOrder = Object.assign([], this.pluginOrder, {
                    [this.pluginIndex]: this.pluginOrder[this.pluginIndex - 1],
                    [this.pluginIndex - 1]: this.pluginOrder[this.pluginIndex]
                });
                var data = {
                    placeholder_id: this.plugin.options.placeholder_id,
                    plugin_id: this.plugin.options.plugin_id,
                    plugin_parent: '',
                    target_language: CMS.config.request.language,
                    plugin_order: newPluginOrder,
                    csrfmiddlewaretoken: CMS.config.csrf,
                    move_a_copy: false
                };

                this.plugin._makeMovePluginRequest(data).done(() => {
                    this.pluginOrder = newPluginOrder;
                    this.pluginIndex = this.pluginIndex - 1;
                });
            })
            .end()
            .find('.js-move-down')
            .on('click', e => {
                if ($(e.currentTarget).is('.cms-btn-disabled')) {
                    return;
                }
                const newPluginOrder = Object.assign([], this.pluginOrder, {
                    [this.pluginIndex]: this.pluginOrder[this.pluginIndex + 1],
                    [this.pluginIndex + 1]: this.pluginOrder[this.pluginIndex]
                });
                var data = {
                    placeholder_id: this.plugin.options.placeholder_id,
                    plugin_id: this.plugin.options.plugin_id,
                    plugin_parent: '',
                    target_language: CMS.config.request.language,
                    plugin_order: newPluginOrder,
                    csrfmiddlewaretoken: CMS.config.csrf,
                    move_a_copy: false
                };

                this.plugin._makeMovePluginRequest(data).done(() => {
                    this.pluginOrder = newPluginOrder;
                    this.pluginIndex = this.pluginIndex + 1;
                });
            })
            .end();
    }

    getOrCreateOverlay() {
        if (this.ui.overlay.length) {
            return this.ui.overlay;
        }

        this.pluginOrder = uniq(
            $(`.cms-plugin.cms-placeholder-${this.plugin.options.placeholder_id}`)
                .toArray()
                .map(el => $(el).data('cms'))
                .map(arr => arr[arr.length - 1])
                .map(({ plugin_id }) => plugin_id)
                .map(n => Number(n))
        );
        this.pluginIndex = findIndex(this.pluginOrder, id => id === Number(this.plugin.options.plugin_id));

        this.ui.overlay = $(
            `
            <div class="
                cms-editable-plugin-overlay
                cms-editable-plugin-overlay-${this.plugin.options.plugin_id}
            "
            style="z-index: 9999"
            >
                <div class="cms-overlay-controls cms">
                    <span role="button"
                        class="js-move-up cms-btn cms-btn-dark${this.pluginIndex === 0 ? ' cms-btn-disabled' : ''}">
                        <span class="cms-icon cms-icon-arrow"></span>
                    </span><!--
                    --><span role="button" class="js-delete cms-btn cms-btn-dark">
                        <span class="cms-icon cms-icon-bin" title="Delete"></span>
                    </span><!--
                    --><span role="button" class="js-move-down cms-btn
                        cms-btn-dark${this.pluginIndex === this.pluginOrder.length - 1 ? ' cms-btn-disabled' : ''}">
                        <span class="cms-icon cms-icon-arrow-right"></span>
                    </span>
                </div>
            </div>
        `
        );

        this.ui.controls = this.ui.overlay.find('.cms-overlay-controls');

        return this.ui.overlay;
    }

    updateCoordinates() {
        const coordinates = getOverlayCoordinates(this.plugin.ui.container, { withMargins: false });

        this.coordinates = {
            left: Math.max(coordinates.left - Overlay.PADDING, 0),
            top: Math.max(coordinates.top - Overlay.PADDING, 0),
            width: Math.min(coordinates.width + Overlay.PADDING * 2, $(window).width()),
            height: coordinates.height + Overlay.PADDING * 2
        };

        this.getOrCreateOverlay().css(this.coordinates);
    }

    show() {
        this.visible = true;
        this.getOrCreateOverlay().appendTo(this.ui.html.find('body'));

        const htmlMargin = this.ui.html.css('position') === 'relative'
            ? parseInt(this.ui.html.css('margin-top'), 10)
            : 0;

        this.controlsSize = {
            width: this.ui.controls.width(),
            height: this.ui.controls.height()
        };

        this.ui.html.find('body').on(
            `mousemove.cms-plugin-overlay-${this.plugin.options.plugin_id}-${this.uid}`,
            debounce(e => {
                if (!this.isInBounds(e, htmlMargin)) {
                    this.hide();
                    this.ui.html.find('body').off(`mousemove.cms-plugin-overlay-${this.plugin.options.plugin_id}`);
                }
            }, 0)
        );

        if (!this._initialized) {
            this.init();
        }
    }

    isInBounds(e, htmlMargin) {
        let { width, height, top, left } = this.coordinates;

        return isInsideCoordinates(e, {
            width,
            height,
            left,
            top: top + htmlMargin
        }) || isInsideCoordinates(e, {
            width: this.controlsSize.width,
            height: this.controlsSize.height,
            left: this.coordinates.left + this.coordinates.width / 2 - this.controlsSize.width / 2,
            top: this.coordinates.top + this.coordinates.height + htmlMargin - this.controlsSize.height / 2
        });
    }

    hide() {
        this.visible = false;
        this.getOrCreateOverlay().detach();
    }

    destroy() {
        this.ui.overlay.empty().remove();
        this.ui.html.find('body').off(`mousemove.cms-plugin-overlay-${this.plugin.options.plugin_id}-${this.uid}`);
        $window.off(`resize.cms-plugin-overlay-${this.plugin.options.plugin_id}-${this.uid}`);
        this.plugin.overlay = null;
    }

    static destroyAll() {
        overlays.forEach(overlay => overlay.destroy());
        overlays = [];
        $('.cms-editable-plugin-overlay').remove();
    }
}

Overlay.PADDING = 1;

export class PlaceholderOverlay extends Overlay {
    getOrCreateOverlay() {
        if (this.ui.overlay.length) {
            return this.ui.overlay;
        }

        this.ui.overlay = $(
            `
            <div class="
                cms-placeholder-overlay
                cms-placeholder-overlay-${this.plugin.options.placeholder_id}
            "
            style="z-index: 9999"
            >
                <div class="cms-overlay-controls cms">
                    <span role="button" class="js-add cms-btn cms-btn-dark cms-placeholder-control-add-plugin">
                        <span>+ Add plugin</span>
                    </span>
                </div>
            </div>
        `
        );

        this.ui.controls = this.ui.overlay.find('.cms-overlay-controls');

        return this.ui.overlay;
    }

    updateCoordinates() {
        const coordinates = getOverlayCoordinates(this.plugin.ui.container);

        this.coordinates = {
            left: Math.max(coordinates.left - PlaceholderOverlay.PADDING, 0),
            top: Math.max(coordinates.top - PlaceholderOverlay.PADDING, 0),
            width: Math.min(coordinates.width + PlaceholderOverlay.PADDING * 2, $(window).width()),
            height: coordinates.height + PlaceholderOverlay.PADDING * 2
        };
        this.controlsSize = {
            width: this.ui.controls.width(),
            height: this.ui.controls.height()
        };

        this.getOrCreateOverlay().css(this.coordinates);
    }

    events() {
        $window.on(`resize.cms-plugin-overlay-${this.plugin.options.plugin_id}-${this.uid}`, () =>
            this.updateCoordinates()
        );

        this.getOrCreateOverlay().find('.js-add').on('click', () => {
            this.plugin._openAddPluginModal();
        });
    }
}

PlaceholderOverlay.PADDING = 0;

export default Overlay;
