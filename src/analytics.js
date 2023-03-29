var mixpanel = require('mixpanel-browser');
if (process.env.NODE_ENV != 'production') {
  mixpanel.init("a50f6d89645478cd812c2b922e402fb6");
} else {
  mixpanel.init("299edcdd4810b747cc76780ae986b5b1");
}

export default mixpanel;
