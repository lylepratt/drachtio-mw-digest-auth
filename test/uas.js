const test = require('blue-tape');
const { output, sippUac } = require('./sipp')('test_testbed');
const Uas = require('./scripts/uas');
const parseUri = require('drachtio-srf').parseUri;

//const debug = require('debug')('drachtio:test');
const allowedDomains = ['drachtio.org'];

function getDomainFromRequestUri(req) {
  const domain = parseUri(req.uri).host;
  if (allowedDomains.includes(domain)) return domain;
  return null;
}
process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

test('digest auth', (t) => {
  t.timeoutAfter(35000);

  let uas;

  Promise.resolve()

    // success case: valid credentials
    .then(() => {
      uas = new Uas();
      return uas.authInvite('dhorton', 'pass123', getDomainFromRequestUri);
    })
    .then((uas) => {
      return sippUac('uac-auth-invite-success.xml');
    })
    .then(() => {
      t.pass('successful authentication of INVITE');
      return uas.disconnect();
    })

    // 403 Forbidden: invalid password
    .then(() => {
      uas = new Uas();
      return uas.authInvite('dhorton', 'badpass', getDomainFromRequestUri);
    })
    .then((uas) => {
      return sippUac('uac-auth-invite-fail.xml');
    })
    .then(() => {
      t.pass('403 Forbidden response to INVITE when invalid credentials supplied');
      return uas.disconnect();
    })

    // 403 Forbidden: unknown username
    .then(() => {
      uas = new Uas();
      return uas.authInvite('jdoe', 'badpass', getDomainFromRequestUri);
    })
    .then((uas) => {
      return sippUac('uac-auth-invite-fail-unknown-user.xml');
    })
    .then(() => {
      t.pass('401 when unknown user supplied');
      return uas.disconnect();
    })

    // success case: valid credentials
    .then(() => {
      uas = new Uas();
      return uas.authRegister('dhorton', 'pass123');    // realm defaults to request-uri
    })
    .then((uas) => {
      return sippUac('uac-auth-register-success.xml');
    })
    .then(() => {
      t.pass('successful authentication of REGISTER');
      return uas.disconnect();
    })

    // 403 Forbidden: invalid credentials
    .then(() => {
      uas = new Uas();
      return uas.authRegister('dhorton', 'pass123', getDomainFromRequestUri);
    })
    .then((uas) => {
      return sippUac('uac-auth-register-fail.xml');
    })
    .then(() => {
      t.pass('403 Forbidden response to REGISTER when invalid credentials supplied');
      return uas.disconnect();
    })

    // 403 Forbidden: invalid domain
    .then(() => {
      uas = new Uas();
      return uas.authRegister('dhorton', 'pass123', getDomainFromRequestUri);
    })
    .then((uas) => {
      return sippUac('uac-auth-register-fail-invalid-domain.xml');
    })
    .then(() => {
      t.pass('403 Forbidden response to REGISTER when invalid domain supplied');
      return uas.disconnect();
    })

    // success case: valid credentials
    .then(() => {
      uas = new Uas();
      return uas.authSubscribe('dhorton', 'pass123');
    })
    .then((uas) => {
      return sippUac('uac-auth-subscribe-success.xml');
    })
    .then(() => {
      t.pass('successful authentication of SUBSCRIBE');
      return uas.disconnect();
    })

    // 403 Forbidden: invalid credentials
    .then(() => {
      uas = new Uas();
      return uas.authSubscribe('dhorton', 'pass123');
    })
    .then((uas) => {
      return sippUac('uac-auth-subscribe-fail.xml');
    })
    .then(() => {
      t.pass('403 Forbidden response to SUBSCRIBE when invalid credentials supplied');
      return uas.disconnect();
    })

    // success case: valid credentials for proxy
    .then(() => {
      uas = new Uas();
      return uas.authInvite('dhorton', 'pass123', getDomainFromRequestUri, true);
    })
    .then((uas) => {
      return sippUac('uac-auth-invite-proxy-success.xml');
    })
    .then(() => {
      t.pass('successful authentication of INVITE as proxy (sends 407)');
      return uas.disconnect();
    })

    // success case: realm provided as a function returning a string
    .then(() => {
      uas = new Uas();
      return uas.authInvite('dhorton', 'pass123', (req) => {
        return 'drachtio.com';
      });
    })
    .then((uas) => {
      return sippUac('uac-auth-invite-success.xml');
    })
    .then(() => {
      t.pass('realm provided as a function returning a string');
      return uas.disconnect();
    })

    // success case: realm provided as a function returning a string
    .then(() => {
      uas = new Uas();
      return uas.authInvite('dhorton', 'pass123', (req) => {
        return Promise.resolve('dracht.io');
      });
    })
    .then((uas) => {
      return sippUac('uac-auth-invite-success.xml');
    })
    .then(() => {
      t.pass('realm provided as a function returning a Promise');
      return uas.disconnect();
    })

    // 401 Unauthorized: Authorization header with empty nonce and response
    .then(() => {
      uas = new Uas();
      return uas.authRegister('dhorton', 'pass123', 'drachtio.org');
    })
    .then((uas) => {
      return sippUac('uac-auth-register-bria-weirdness.xml');
    })
    .then(() => {
      t.pass('401 response to REGISTER when empty credentials supplied');
      return uas.disconnect();
    })

    .then(() => {
      return t.end();
    })
    .catch((err) => {
      console.log(`error received: ${err}`);
      if (uas) uas.disconnect();
      console.log(output());
      t.error(err);
      t.end();
    });
});
