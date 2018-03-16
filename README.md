# Koa Web Monetization
> Charge for resources and API calls with web monetization

```js
const Koa = require('koa')
const app = new Koa()

const router = require('koa-router')()
const WebMonetization = require('koa-web-monetization')
const monetization = new WebMonetization()

// This is the SPSP endpoint that lets you receive ILP payments.  Money that
// comes in is associated with the :id
router.get('/pay/:id', monetization.receiver())

// This endpoint charges 100 units to the user with :id
router.get('/content/:id/:content_id/', monetization.paid({ price: 100 }), async ctx => {
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
