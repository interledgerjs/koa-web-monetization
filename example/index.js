const path = require('path')
const fs = require('fs-extra')
const Koa = require('koa')
const app = new Koa()

const router = require('koa-router')()
const WebMonetization = require('..')
const monetization = new WebMonetization()

router.get('/pay/:id', monetization.receiver())

router.get('/content/:id', monetization.paid({ price: 100, awaitBalance: true }), async ctx => {
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
  .use(router.routes())
  .use(router.allowedMethods())
  .listen(8080)
