import $ from 'jquery';
import Modal from 'modules/cms.modal';

export default function initLogin() {
    const modal = new Modal({
        resizable: false,
        maximizable: false,
        minimizable: false
    });

    $('.js-cms-login-trigger').on('click', () => {
        // $('.cms-login-form').toggleClass('cms-login-form-open');

        modal.open({
            title: 'Login', // TODO i18n
            html: $('.cms-login-form-placeholder').html(),
            width: 540,
            height: 360
        });
    });
}
