'use strict';

const Koa = require('koa');
const fetch = require('node-fetch');
const bodyParser = require('koa-bodyparser');

const app = new Koa();
app.use(bodyParser({
    detectJSON: () => true // if we ever get a body that's not json, we'll die ungracefully
}));

const ep = 'http://localhost:3000';

app.use(async ctx => {
    ctx.status = 202;
    console.log('Request body:', ctx.request.body);
    console.log('Request headers:', ctx.headers);
    if (ctx.method === 'GET') {
        const opts = {
            method: 'PUT',
            headers: {
                'Date': (new Date()).toISOString(),
                'FSPIOP-Source': ctx.headers['fspiop-destination'],
                'FSPIOP-Destination': ctx.headers['fspiop-source'],
                'Accept': 'application/vnd.interoperability.parties+json;version=1.0',
                'Content-Type': 'application/vnd.interoperability.parties+json;version=1.0'
            },
            body: JSON.stringify({
                party: {
                    partyIdInfo: {
                        partyIdType: 'zRoK',
                        partyIdentifier: 'jbr',
                        partySubIdOrType: 'hBnGCDsuOLJ',
                        fspId: 'soGQSsUVrE'
                    },
                    merchantClassificationCode: 'qoR',
                    name: 'Of',
                    personalInfo: {
                        complexName: {
                            firstName: 'KDQjMmQQFLT',
                            middleName: 'UsS',
                            lastName: 'kkC'
                        },
                        dateOfBirth: 'DMMEtsstg'
                    }
                }
            })
        };

        const res = await fetch(`${ep}${ctx.url}`, opts);
        console.log('Response:', res.ok);
    }
});

const port = 3001
app.listen(port, () => console.log(`Server running on https://localhost:${port}`));
