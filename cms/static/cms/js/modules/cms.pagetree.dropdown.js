var $ = require('jquery');
var Class = require('classjs');

/**
 * Dropdowns in the pagetree.
 * Have to be delegated, since pagetree nodes can be
 * lazy loaded.
 *
 * @class PageTreeDropdowns
 * @namespace CMS
 */
var PageTreeDropdowns = new Class({
    options: {
        dropdownSelector: '.js-cms-pagetree-dropdown',
        triggerSelector: '.js-cms-pagetree-dropdown-trigger',
        menuSelector: '.js-cms-pagetree-dropdown-menu',
        openCls: 'cms-pagetree-dropdown-menu-open'
    },

    initialize: function initialize(options) {
        this.options = $.extend(true, {}, this.options, options);
        this.click = 'click.cms.pagetree.dropdown';

        this._setupUI();
        this._events();
    },

    /**
     * @method _setupUI
     * @private
     */
    _setupUI: function _setupUI() {
        this.ui = {
            container: this.options.container,
            document: $(document)
        };
    },

    /**
     * Event handlers.
     *
     * @method _events
     * @private
     */
    _events: function _events() {
        var that = this;

        // attach event to the trigger
        this.ui.container.on(this.click, this.options.triggerSelector, function (e) {
            e.preventDefault();
            e.stopImmediatePropagation();

            that._toggleDropdown(this);
        });

        // stop propagation on the element
        this.ui.container.on(this.click, that.options.menuSelector, function (e) {
            e.stopImmediatePropagation();
        });

        this.ui.container.on(this.click, that.options.menuSelector + ' a', function () {
            that.closeAllDropdowns();
        });

        this.ui.document.on(this.click, function () {
            that.closeAllDropdowns();
        });
    },

    /**
     * @method _toggleDropdown
     * @param {jQuery} trigger trigger clicked
     * @private
     * @returns {Boolean|void}
     */
    _toggleDropdown: function _toggleDropdown(trigger) {
        var triggers = $(this.options.triggerSelector);
        var dropdowns = $(this.options.dropdownSelector);
        var index = triggers.index(trigger);
        var currentDropdown = dropdowns.eq(index);

        // cancel if opened tooltip is triggered again
        if (currentDropdown.hasClass(this.options.openCls)) {
            dropdowns.removeClass(this.options.openCls);
            return false;
        }

        // otherwise show the dropdown
        dropdowns.removeClass(this.options.openCls);
        currentDropdown.addClass(this.options.openCls);

        this._loadContent(currentDropdown);
    },

    /**
     * @method _loadContent
     * @private
     * @param {jQuery} dropdown
     * @returns {Boolean|$.Deferred} false if not lazy or already loaded or promise
     */
    _loadContent: function _loadContent(dropdown) {
        var data = dropdown.data();

        if (!data.lazyUrl || data.loaded) {
            return false;
        }

        $.ajax({
            url: data.lazyUrl
        }).done(function (response) {
            dropdown.find('.js-cms-pagetree-dropdown-menu').html('hello darkness my old friend');
            dropdown.data('loaded', true);
        });
    },

    /**
     * @method closeAllDropdowns
     * @public
     */
    closeAllDropdowns: function closeAllDropdowns() {
        $(this.options.dropdownSelector).removeClass(this.options.openCls);
    }
});

module.exports = PageTreeDropdowns;
