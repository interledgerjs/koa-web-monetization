const path = require('path')
const fs = require('fs-extra')
const Koa = require('koa')
const app = new Koa()
const compose = require('koa-compose')
const router = require('koa-router')()
const { WebMonetizationMiddleWare, KoaWebMonetization } = require('..')
const monetizer = new KoaWebMonetization()

// const monetization = new WebMonetization()
router.get(monetizer.receiverEndpointUrl, monetizer.receive.bind(monetizer))

router.get('/content/', async ctx => {
  await monetizer.awaitBalance(ctx.cookies.get(monetizer.cookieName), 100)
  monetizer.spend(ctx.cookies.get(monetizer.cookieName), 100)

  ctx.body = await fs.readFile(path.resolve(__dirname, 'example.png'))
})

router.get('/client.js', async ctx => {
  ctx.body = await fs.readFile(path.resolve(__dirname, '../client.js'))
})

router.get('/', async ctx => {
  ctx.set('content-type', 'text/html')
  ctx.body = fs.readFileSync(path.resolve(__dirname, 'index.html'))
})

app
  .use(compose([WebMonetizationMiddleWare(monetizer), router.middleware()]))
  .use(router.routes())
  .use(router.allowedMethods())
  .listen(8080)
