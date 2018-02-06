import $ from 'jquery';
import 'modules/jquery.transition';
import md5 from 'blueimp-md5';

const SPEED = 200;

export default class Toolbar {
    constructor() {
        this.initAvatar();
        this.events();
    }

    events() {
        $('.cms-toolbar-trigger').on('click', e => {
            e.preventDefault();
            this.open();
        });
        $('.cms-toolbar-action-close').on('click', e => {
            e.preventDefault();
            this.close();
        });
    }

    initAvatar() {
        const hash = md5(CMS.config.email.toLowerCase());
        const gravatar = `https://www.gravatar.com/avatar/${hash}?s=60`;

        $('.cms-toolbar-avatar').css({
            'background-image': `url(${gravatar})`
        });
    }

    open() {
        $('.cms-toolbar')
            .addClass('cms-toolbar-opening')
            .one('cmsTransitionEnd', () => {
                $('.cms-toolbar').removeClass('cms-toolbar-opening');
            })
            .emulateTransitionEnd(SPEED)
            .removeClass('cms-toolbar-closed');
    }

    close() {
        $('.cms-toolbar')
            .addClass('cms-toolbar-closing')
            .one('cmsTransitionEnd', () => {
                $('.cms-toolbar').removeClass('cms-toolbar-closing');
            })
            .emulateTransitionEnd(SPEED)
            .addClass('cms-toolbar-closed');
    }
}

/**
 * initToolbar
 *
 * @public
 */
export function initToolbar() {
    new Toolbar();
}
