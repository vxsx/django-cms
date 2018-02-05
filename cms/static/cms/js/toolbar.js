// polyfills
import './polyfills/function.prototype.bind';
import './polyfills/domparser';
import initHelpShortcuts from './modules/shortcuts';

// jquery plugins
import './libs/pep';

import './modules/dropdown';

// CMS Core
import { Helpers, KEYS } from './modules/cms.base';
import $ from 'jquery';
import Class from 'classjs';

// exposing globals for backwards compatibility
import Messages from './modules/cms.messages';
import ChangeTracker from './modules/cms.changetracker';
import Modal from './modules/cms.modal';
import Sideframe from './modules/cms.sideframe';
import Clipboard from './modules/cms.clipboard';
import Plugin from './modules/cms.plugins';
import StructureBoard from './modules/cms.structureboard';
import Tooltip from './modules/cms.tooltip';


// NEW
import initLogin from 'components/login';

// CMS by this time is a global that has `_plugins` property
CMS.Messages = Messages;
CMS.ChangeTracker = ChangeTracker;
CMS.Modal = Modal;
CMS.Sideframe = Sideframe;
CMS.Clipboard = Clipboard;
CMS.Plugin = Plugin;
CMS.StructureBoard = StructureBoard;
// CMS.Toolbar = Toolbar;
CMS.Tooltip = Tooltip;

CMS.API = {
    Helpers
};
CMS.KEYS = KEYS;
CMS.$ = $;
CMS.Class = Class;

initHelpShortcuts();

window.CMS = CMS;


// NEW
initLogin();
