# Web Monetization Accountant
> Charge for resources and API calls with web monetization

```js
const Koa = require('koa')
const app = new Koa()

const router = require('koa-router')()
const Accountant = require('ilp-web-monetization-accountant')
const accountant = new Accountant()

// This is the SPSP endpoint that lets you receive ILP payments.  Money that
// comes in is associated with the :id
router.get('/pay/:id', accountant.receiver())

// This endpoint charges 100 units to the user with :id
router.get('/content/:id/:content_id/', accountant.paid({ price: 100 }), async ctx => {
  // load content by :content_id
})

router.get('/', async ctx => {
  // load index page
})

app
  .use(router.routes())
  .use(router.allowedMethods())
  .listen(8080)
```
